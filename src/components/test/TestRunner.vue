<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import { speak, stop as stopSpeech } from '../../lib/speech'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  sessionId: Number,
  questions: Array,
  /** In a duel the header becomes a live scoreboard and there is no solo result. */
  duel: { type: Object, default: null },
  /** A competition ends on the class board, not on the solo result screen. */
  competition: { type: Boolean, default: false },
})

const emit = defineEmits(['finished', 'exit'])

/**
 * Questions arrive grouped by exercise. Playing them stage by stage keeps the
 * round from jumping between modes, and lets a missed word come back inside
 * its own stage rather than at the very end.
 */
const stages = computed(() => {
  const grouped = []
  for (const question of props.questions) {
    const last = grouped[grouped.length - 1]
    if (last && last.type === question.type) last.items.push(question)
    else grouped.push({ type: question.type, items: [question] })
  }
  return grouped
})

const stageIndex = ref(0)
const queue = ref([])
const position = ref(0)

const selected = ref(null)
const typed = ref('')
const flipped = ref(false)
const checked = ref(false)
const feedback = ref(null)
const busy = ref(false)
const result = ref(null)

const matchLeft = ref([])
const matchRight = ref([])
const matchPick = ref(null)
const matchDone = ref(new Set())
const matchBad = ref(null)
const matchResults = ref([])

const spellInput = ref(null)
const startedAt = Date.now()

const current = computed(() => queue.value[position.value] ?? null)

const totalAsked = computed(() => props.questions.length)
const askedSoFar = computed(() => {
  const before = stages.value.slice(0, stageIndex.value).reduce((n, s) => n + s.items.length, 0)
  return Math.min(before + position.value + 1, totalAsked.value)
})
const progress = computed(() => (askedSoFar.value / Math.max(totalAsked.value, 1)) * 100)

const LABEL = {
  card: 'KARTANI ESLANG',
  uz2en: 'TARJIMANI TANLANG',
  en2uz: 'TARJIMANI TANLANG',
  spell: 'INGLIZCHASINI HARFLAB YOZING',
  image: 'TOʼGʼRI RASMNI TANLANG',
  match: 'SOʼZLARNI JUFTLANG',
}

function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function loadStage() {
  const stage = stages.value[stageIndex.value]
  if (!stage) return finish()

  queue.value = shuffle(stage.items)
  position.value = 0
  resetQuestion()
  if (stage.type === 'match') setupMatch()
  if (stage.type === 'spell') nextTick(() => spellInput.value?.focus())
}

function resetQuestion() {
  selected.value = null
  typed.value = ''
  flipped.value = false
  checked.value = false
  feedback.value = null
}

function advance(requeue = false) {
  if (requeue && current.value) queue.value.push(current.value)

  position.value += 1
  resetQuestion()

  if (position.value >= queue.value.length) {
    stageIndex.value += 1
    return loadStage()
  }

  if (current.value?.type === 'match') setupMatch()
  if (current.value?.type === 'spell') nextTick(() => spellInput.value?.focus())
}

async function send(answer) {
  busy.value = true
  try {
    return await api.answer(props.sessionId, {
      question_id: current.value.id,
      answer,
      response_ms: 0,
    })
  } catch (error) {
    store.toast(error.message)
    return null
  } finally {
    busy.value = false
  }
}

/* flashcard */
async function cardAnswer(known) {
  const res = await send(known)
  if (!res) return
  telegram.haptic(known ? 'light' : 'medium')
  advance(!known)
}

/* choice & picture */
async function check() {
  if (selected.value === null || checked.value) return
  checked.value = true

  const res = await send(selected.value)
  if (!res) return (checked.value = false)

  feedback.value = res
  telegram.notify(res.correct ? 'success' : 'error')
}

const optionState = (option) => {
  if (!feedback.value) return selected.value === option ? 'sel' : ''
  if (option === feedback.value.answer) return 'right'
  return selected.value === option ? 'wrong' : ''
}

const imageState = (option) => {
  if (!feedback.value) return selected.value === option.key ? 'sel' : ''
  if (option.label === feedback.value.word?.translation) return 'right'
  return selected.value === option.key ? 'wrong' : ''
}

/* spelling */
const target = computed(() => current.value?.length ?? 0)

function onSpellInput(event) {
  typed.value = event.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, target.value)
  event.target.value = typed.value
}

async function checkSpell() {
  if (!typed.value || checked.value) return
  checked.value = true

  const res = await send(typed.value)
  if (!res) return (checked.value = false)

  feedback.value = res
  telegram.notify(res.correct ? 'success' : 'error')
}

const slotState = (index) => {
  if (!feedback.value) return index === typed.value.length ? 'cur' : ''
  return typed.value[index] === feedback.value.answer?.[index]?.toLowerCase() ? 'ok' : 'bad'
}

/* matching */
function setupMatch() {
  const pairs = current.value?.pairs ?? []
  matchLeft.value = shuffle(pairs)
  matchRight.value = shuffle(pairs)
  matchPick.value = null
  matchDone.value = new Set()
  matchBad.value = null
  matchResults.value = pairs.map((p) => ({ word_id: p.word_id, correct: true }))
}

const markPairWrong = (wordId) => {
  const entry = matchResults.value.find((r) => r.word_id === wordId)
  if (entry) entry.correct = false
}

async function pickMatch(side, index) {
  const item = (side === 'L' ? matchLeft.value : matchRight.value)[index]
  const id = `${side}${index}`
  if (matchDone.value.has(id)) return

  if (!matchPick.value || matchPick.value.side === side) {
    matchPick.value = { side, index, id, item }
    return
  }

  if (matchPick.value.item.word_id === item.word_id) {
    matchDone.value = new Set([...matchDone.value, matchPick.value.id, id])
    matchPick.value = null
    telegram.haptic()

    if (matchDone.value.size === matchLeft.value.length * 2) {
      const res = await send(matchResults.value)
      if (res) {
        feedback.value = { ...res, correct: true }
        telegram.notify('success')
      }
    }
    return
  }

  markPairWrong(matchPick.value.item.word_id)
  markPairWrong(item.word_id)
  matchBad.value = id
  telegram.notify('error')
  matchPick.value = null
  setTimeout(() => (matchBad.value = null), 400)
}

const isPicked = (side, index) => matchPick.value?.id === `${side}${index}`
const isDone = (side, index) => matchDone.value.has(`${side}${index}`)

/* lifecycle */
const continueAfter = () => advance(feedback.value && !feedback.value.correct)

async function finish() {
  stopSpeech()

  try {
    const elapsed = Date.now() - startedAt
    const res = await api.finishTest(props.sessionId, elapsed)
    telegram.notify('success')

    // A duel and a competition both have their own result screen, and the
    // score has to reach the other players.
    if (props.duel || props.competition) {
      emit('finished', { ...res, duration_ms: elapsed })
      return
    }

    result.value = { ...res, duration_ms: elapsed }
  } catch (error) {
    store.toast(error.message)
    emit('exit')
  }
}

function close() {
  const res = result.value
  stopSpeech()
  res ? emit('finished', res) : emit('exit')
}

const verdict = computed(() => {
  const res = result.value
  const accuracy = res?.accuracy ?? 0

  // An exam has a verdict, not a grade: it either opens the next stage or not.
  if (res?.is_exam) {
    return res.exam_passed
      ? 'Imtihondan oʼtdingiz! 🎉'
      : `Imtihon oʼtilmadi — kamida ${res.pass_mark}% kerak`
  }

  if (accuracy >= 90) return 'Test tugadi — ajoyib!'
  if (accuracy >= 70) return 'Test tugadi — yaxshi natija'
  return 'Test tugadi — mashq davom etsin'
})

/** Green for a pass, red for a fail — the ring is the first thing read. */
const ringColor = computed(() =>
  result.value?.is_exam && !result.value.exam_passed ? 'var(--red)' : 'var(--green)')

onMounted(loadStage)
onBeforeUnmount(stopSpeech)
</script>

<template>
  <div class="overlay show runner">
    <!-- RESULT -->
    <div v-if="result" class="result">
      <div class="ring-wrap">
        <svg width="132" height="132" viewBox="0 0 132 132">
          <circle cx="66" cy="66" r="58" fill="none" stroke="var(--line-3)" stroke-width="12" />
          <circle
            cx="66" cy="66" r="58" fill="none" :stroke="ringColor" stroke-width="12"
            stroke-linecap="round" transform="rotate(-90 66 66)"
            :stroke-dasharray="`${(result.accuracy / 100) * 364} 364`"
          />
        </svg>
        <div class="ring-text">
          <b class="v-num">{{ result.accuracy }}%</b>
          <span>aniqlik</span>
        </div>
      </div>

      <h2 class="t-res-title">{{ verdict }}</h2>

      <div class="res-rows">
        <div class="res-row">
          <span>Toʼgʼri javoblar</span>
          <b>{{ result.correct }} / {{ result.total }}</b>
        </div>
        <div class="res-row">
          <span>Seriya</span>
          <b>{{ result.streak_days }} kun 🔥</b>
        </div>
        <div v-if="result.is_exam" class="res-row">
          <span>Oʼtish balli</span>
          <b>{{ result.pass_mark }}%</b>
        </div>
        <div v-else class="res-row">
          <span>Oʼzlashtirish</span>
          <b>{{ result.category_progress }}%</b>
        </div>
      </div>

      <div class="res-foot">
        <button class="btn btn-primary" @click="close">
          {{ result.is_exam && !result.exam_passed ? 'Qaytadan urinish' : 'Davom etish' }}
        </button>
      </div>
    </div>

    <!-- QUESTIONS -->
    <template v-else>
      <div v-if="duel" class="duel-bar">
        <div class="score-pill">
          <span>Siz</span>
          <b class="mine">{{ duel.me.score }}</b>
          <i></i>
          <b class="theirs">{{ duel.rival?.score ?? 0 }}</b>
          <span>{{ duel.rival?.name ?? 'Doʼst' }}</span>
        </div>
        <div class="duel-track"><span :style="{ width: progress + '%' }"></span></div>
        <p v-if="duel.rival && !duel.rival.finished" class="rival-note">
          {{ duel.rival.name }} javob bermoqda…
        </p>
        <p v-else-if="duel.rival?.finished" class="rival-note">
          {{ duel.rival.name }} tugatdi — shoshiling!
        </p>
      </div>

      <div v-else class="runner-head">
        <button class="close" @click="emit('exit')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div class="track"><i :style="{ width: progress + '%' }"></i></div>
        <span class="count">{{ askedSoFar }}/{{ totalAsked }}</span>
      </div>

      <div v-if="current" class="runner-body">
        <div class="kicker">
          {{ duel ? `SAVOL ${askedSoFar} / ${totalAsked}` : LABEL[current.type] }}
        </div>

        <!-- FLASHCARD -->
        <template v-if="current.type === 'card'">
          <button class="flash" :class="{ 't-flip': flipped }" @click="flipped = !flipped">
            <span v-if="current.pos" class="pos">{{ current.pos }}</span>
            <span class="t-flash-word v-num">{{ flipped ? current.translation : current.en }}</span>
            <span v-if="current.transcription && !flipped" class="phon">[ {{ current.transcription.replace(/\//g, '') }} ]</span>
            <span class="flash-hint">
              {{ flipped ? 'Bilsangiz — «Bilaman» bosing' : 'Kartani bosing — tarjima koʼrinadi' }}
            </span>
          </button>
          <button class="listen" @click.stop="speak(current.en, current.audio)">
            🔊 Talaffuzni eshitish
          </button>
        </template>

        <!-- CHOICE -->
        <template v-else-if="current.type === 'uz2en' || current.type === 'en2uz'">
          <h2 class="prompt">
            <template v-if="current.type === 'uz2en'">
              «<em>{{ current.prompt }}</em>» soʼzining inglizchasi?
            </template>
            <template v-else>
              «<em>{{ current.prompt }}</em>» — tarjimasi?
            </template>
          </h2>
          <button
            v-if="current.type === 'en2uz'"
            class="listen"
            @click="speak(current.prompt, current.audio)"
          >
            🔊 Talaffuzni eshitish
          </button>

          <div class="options">
            <button
              v-for="option in current.options"
              :key="option"
              class="option"
              :class="optionState(option)"
              :disabled="checked"
              @click="selected = option"
            >
              <span>{{ option }}</span>
              <span class="radio"></span>
            </button>
          </div>
        </template>

        <!-- SPELLING -->
        <template v-else-if="current.type === 'spell'">
          <h2 class="prompt"><em>{{ current.prompt }}</em></h2>
          <div v-if="current.pos" class="prompt-sub">{{ current.pos }}</div>

          <div class="t-slots" @click="spellInput?.focus()">
            <span v-for="i in target" :key="i" class="t-slot" :class="slotState(i - 1)">
              {{ typed[i - 1] ?? '' }}
            </span>
          </div>
          <input
            ref="spellInput"
            class="ghost-input"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :disabled="checked"
            @input="onSpellInput"
          />
        </template>

        <!-- PICTURE -->
        <template v-else-if="current.type === 'image'">
          <h2 class="prompt">«<em>{{ current.prompt }}</em>» — qaysi rasm?</h2>
          <div class="pics">
            <button
              v-for="option in current.options"
              :key="option.key"
              class="pic"
              :class="imageState(option)"
              :disabled="checked"
              @click="selected = option.key"
            >
              <span class="pic-em">{{ option.emoji || '📘' }}</span>
              <span class="pic-cap">{{ option.label }}</span>
            </button>
          </div>
        </template>

        <!-- MATCHING -->
        <template v-else>
          <div class="t-match">
            <div class="t-col">
              <button
                v-for="(item, index) in matchLeft"
                :key="'L' + index"
                class="t-mitem"
                :class="{ sel: isPicked('L', index), 't-done': isDone('L', index), 't-bad': matchBad === `L${index}` }"
                @click="pickMatch('L', index)"
              >
                {{ item.translation }}
              </button>
            </div>
            <div class="t-col">
              <button
                v-for="(item, index) in matchRight"
                :key="'R' + index"
                class="t-mitem"
                :class="{ sel: isPicked('R', index), 't-done': isDone('R', index), 't-bad': matchBad === `R${index}` }"
                @click="pickMatch('R', index)"
              >
                {{ item.en }}
              </button>
            </div>
          </div>
        </template>
      </div>

      <div class="runner-foot">
        <template v-if="current?.type === 'card'">
          <div class="two">
            <button class="btn btn-soft" :disabled="busy" @click="cardAnswer(false)">Takror</button>
            <button class="btn btn-primary" :disabled="busy" @click="cardAnswer(true)">Bilaman</button>
          </div>
        </template>
        <button
          v-else-if="current?.type === 'spell'"
          class="btn btn-primary"
          :disabled="!typed || checked || busy"
          @click="checkSpell"
        >
          Tekshirish
        </button>
        <button
          v-else-if="current && current.type !== 'match'"
          class="btn btn-primary"
          :disabled="selected === null || checked || busy"
          @click="check"
        >
          Tekshirish
        </button>
      </div>

      <!-- FEEDBACK SHEET -->
      <div v-if="feedback" class="sheet" :class="feedback.correct ? 't-ok' : 'no'">
        <div class="sheet-head">
          <span class="sheet-ic">
            <svg v-if="feedback.correct" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 13l5 5L20 7" />
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </span>
          <div>
            <div class="sheet-title">{{ feedback.correct ? 'Toʼgʼri javob!' : 'Notoʼgʼri javob' }}</div>
            <div class="sheet-sub">
              <template v-if="feedback.correct">
                {{ feedback.word?.en }} — {{ feedback.word?.translation }} · +1 tanga
              </template>
              <template v-else>
                Toʼgʼri javob: <b>{{ feedback.answer }}</b> — {{ feedback.word?.translation }}
              </template>
            </div>
          </div>
        </div>
        <p v-if="!feedback.correct" class="sheet-note">Bu savol test oxirida yana soʼraladi</p>
        <button class="btn" :class="feedback.correct ? 'btn-primary' : 'btn-dark'" @click="continueAfter">
          Davom etish
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.runner {
  background: var(--card);
  z-index: 20;
}

.runner-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 22px 9px;
  flex: none;
}

.close {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: none;
  color: var(--muted);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.track {
  flex: 1;
  height: 5px;
  border-radius: var(--r-pill);
  background: var(--line-3);
  overflow: hidden;
}

.track > i {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  background: var(--green);
  transition: width .3s;
}

.count {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--faint);
}

.runner-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.runner-body > * {
  flex: none;
}

.kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: var(--faint);
}

.prompt {
  font-family: 'Sora', sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
}

.prompt em {
  font-style: normal;
  color: var(--green);
}

.prompt-sub {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--faint);
  margin-top: -12px;
}

.runner-foot {
  padding: 14px 22px calc(14px + env(safe-area-inset-bottom));
  flex: none;
}

.two {
  display: flex;
  gap: 10px;
}

.two .btn {
  flex: 1;
}

/* options */

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 15px 16px;
  background: none;
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
}

.option .radio {
  width: 20px;
  height: 20px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--line-4);
  flex-shrink: 0;
}

.option.sel {
  border: 1.5px solid var(--green);
  background: var(--wash-3);
}

.option.sel .radio {
  border: 6px solid var(--green);
}

.option.right {
  border: 1.5px solid var(--green);
  background: var(--wash-3);
  color: var(--green-dark);
}

.option.right .radio {
  border: 6px solid var(--green);
}

.option.wrong {
  border: 1.5px solid var(--red);
  background: #FDEDEE;
  color: var(--red-dark);
}

.option.wrong .radio {
  border: 1.5px solid var(--red);
}

/* flashcard */

.flash {
  border: 1px solid var(--line);
  border-radius: var(--r-xl);
  background: var(--wash-3);
  padding: 34px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  min-height: 260px;
  justify-content: center;
}

.pos {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--green-dark);
  background: var(--green-soft);
  border-radius: var(--r-sm);
  padding: 4px 9px;
  text-transform: uppercase;
}

.t-flash-word {
  font-size: 32px;
  color: var(--ink);
}

.phon {
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
}

.flash-hint {
  font-size: 12px;
  font-weight: 600;
  color: var(--faint);
  margin-top: 6px;
}

.listen {
  align-self: center;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  background: none;
  padding: 9px 16px;
  font-family: 'Manrope', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}

/* spelling */

.t-slots {
  display: flex;
  gap: 7px;
  justify-content: center;
  flex-wrap: wrap;
}

.t-slot {
  width: 40px;
  height: 48px;
  border: 1px solid var(--line);
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-family: 'Sora', sans-serif;
  font-size: 20px;
  font-weight: 700;
  text-transform: lowercase;
}

.t-slot.cur {
  border-color: var(--green);
  background: var(--wash-3);
}

.t-slot.t-ok {
  border-color: var(--green);
  color: var(--green-dark);
}

.t-slot.t-bad {
  border-color: var(--red);
  color: var(--red-dark);
}

.ghost-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

/* pictures */

.pics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.pic {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 18px 10px;
  background: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
}

.pic-em {
  font-size: 40px;
  line-height: 1;
}

.pic-cap {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--muted);
}

.pic.sel {
  border: 1.5px solid var(--green);
  background: var(--wash-3);
}

.pic.right {
  border: 1.5px solid var(--green);
  background: var(--wash-3);
}

.pic.wrong {
  border: 1.5px solid var(--red);
  background: #FDEDEE;
}

/* matching */

.t-match {
  display: flex;
  gap: 10px;
}

.t-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.t-mitem {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 13px 10px;
  background: none;
  font-family: 'Manrope', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
}

.t-mitem.sel {
  border: 1.5px solid var(--green);
  background: var(--wash-3);
}

.t-mitem.t-done {
  border-color: var(--green-pale);
  background: var(--green-soft);
  color: var(--green-dark);
  opacity: .6;
}

.t-mitem.t-bad {
  border: 1.5px solid var(--red);
  background: #FDEDEE;
}

/* feedback sheet */

.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 24px 24px 0 0;
  padding: 22px 22px 30px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 5;
}

.sheet.t-ok {
  background: var(--wash-3);
  border-top: 1px solid var(--green-pale);
}

.sheet.no {
  background: var(--red-soft);
  border-top: 1px solid var(--red-line);
}

.sheet-head {
  display: flex;
  align-items: center;
  gap: 13px;
}

.sheet-ic {
  width: 44px;
  height: 44px;
  border-radius: var(--r-pill);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.sheet.t-ok .sheet-ic {
  background: var(--green);
}

.sheet.no .sheet-ic {
  background: var(--red);
}

.sheet-title {
  font-family: 'Sora', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.sheet.t-ok .sheet-title {
  color: var(--green-dark);
}

.sheet.no .sheet-title {
  color: var(--red-dark);
}

.sheet-sub {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.sheet-sub b {
  font-weight: 800;
  color: var(--ink);
}

.sheet-note {
  font-size: 12px;
  font-weight: 700;
  color: var(--faint);
  text-align: center;
  margin-top: -6px;
}

.btn-dark {
  background: var(--ink);
  color: #fff;
}

/* duel scoreboard */

.duel-bar {
  padding: 10px 22px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: none;
}

.score-pill {
  align-self: center;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 700;
}

.score-pill b {
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 700;
}

.score-pill .mine { color: var(--green); }
.score-pill .theirs { color: var(--red); }

.score-pill i {
  width: 1px;
  height: 16px;
  background: var(--line);
}

.duel-track {
  height: 5px;
  border-radius: var(--r-pill);
  background: var(--line-3);
  overflow: hidden;
}

.duel-track span {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  background: #DFA32E;
  transition: width .3s;
}

.rival-note {
  text-align: center;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--faint);
}

/* result */

.result {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 30px 26px;
  text-align: center;
}

.ring-wrap {
  position: relative;
  width: 132px;
  height: 132px;
}

.ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-text b {
  font-size: 28px;
}

.ring-text span {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.t-res-title {
  font-family: 'Sora', sans-serif;
  font-size: 20px;
  font-weight: 700;
}

.res-rows {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.res-row {
  display: flex;
  justify-content: space-between;
  padding: 13px 16px;
  border-bottom: 1px solid var(--wash);
  font-size: 13.5px;
  font-weight: 700;
}

.res-row:last-child {
  border-bottom: none;
}

.res-row span {
  color: var(--muted);
  font-weight: 600;
}

.res-foot {
  width: 100%;
  margin-top: 8px;
}
</style>
