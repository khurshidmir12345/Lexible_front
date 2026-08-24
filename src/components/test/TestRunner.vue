<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { speakerIcon } from '../../lib/icons'
import { api } from '../../lib/api'
import { speak, stop as stopSpeech } from '../../lib/speech'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  sessionId: Number,
  questions: Array,
})

const emit = defineEmits(['finished', 'exit'])

/**
 * Questions arrive grouped by exercise. Playing them stage by stage — all the
 * flashcards, then all the spelling — keeps the round from jumping between
 * modes, and lets a missed word come back inside its own stage.
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
const feedback = ref(null)      // { correct, answer }
const busy = ref(false)

// Matching round state
const matchLeft = ref([])
const matchRight = ref([])
const matchPick = ref(null)
const matchDone = ref(new Set())
const matchBad = ref(null)
const matchResults = ref([])

const spellInput = ref(null)
const startedAt = Date.now()

const current = computed(() => queue.value[position.value] ?? null)
const progress = computed(() =>
  queue.value.length ? Math.min((position.value / queue.value.length) * 100, 100) : 0,
)

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

  if (!stage) {
    finish()
    return
  }

  queue.value = shuffle(stage.items)
  position.value = 0
  resetQuestion()

  if (stage.type === 'match') setupMatch()
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
    loadStage()
    return
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

/* ---- flashcard ---- */

async function cardAnswer(known) {
  const result = await send(known)
  if (!result) return

  telegram.haptic(known ? 'light' : 'medium')
  advance(!known)
}

/* ---- multiple choice & picture ---- */

async function check() {
  if (selected.value === null || checked.value) return

  checked.value = true
  const result = await send(selected.value)

  if (!result) {
    checked.value = false
    return
  }

  feedback.value = result
  telegram.notify(result.correct ? 'success' : 'error')
}

function optionClass(option) {
  if (!feedback.value) return { sel: selected.value === option }

  const isAnswer = option === feedback.value.answer
  return { correct: isAnswer, wrong: !isAnswer && selected.value === option }
}

function imageOptionClass(option) {
  if (!feedback.value) return { sel: selected.value === option.key }

  const isAnswer = option.label === feedback.value.word?.translation
  return { correct: isAnswer, wrong: !isAnswer && selected.value === option.key }
}

/* ---- spelling ---- */

const target = computed(() => current.value?.length ?? 0)

function onSpellInput(event) {
  typed.value = event.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, target.value)
  event.target.value = typed.value
}

async function checkSpell() {
  if (!typed.value || checked.value) return

  checked.value = true
  const result = await send(typed.value)

  if (!result) {
    checked.value = false
    return
  }

  feedback.value = result
  telegram.notify(result.correct ? 'success' : 'error')
}

function slotClass(index) {
  if (!feedback.value) return { cur: index === typed.value.length }

  const expected = feedback.value.answer?.[index]?.toLowerCase()
  return { ok: typed.value[index] === expected, bad: typed.value[index] !== expected }
}

/* ---- matching ---- */

function setupMatch() {
  const pairs = current.value?.pairs ?? []
  matchLeft.value = shuffle(pairs)
  matchRight.value = shuffle(pairs)
  matchPick.value = null
  matchDone.value = new Set()
  matchBad.value = null
  matchResults.value = pairs.map((p) => ({ word_id: p.word_id, correct: true }))
}

function markPairWrong(wordId) {
  const entry = matchResults.value.find((r) => r.word_id === wordId)
  if (entry) entry.correct = false
}

async function pickMatch(side, index) {
  const item = (side === 'L' ? matchLeft.value : matchRight.value)[index]
  const id = `${side}${index}`

  if (matchDone.value.has(id)) return

  if (!matchPick.value) {
    matchPick.value = { side, index, id, item }
    return
  }

  if (matchPick.value.side === side) {
    matchPick.value = { side, index, id, item }
    return
  }

  if (matchPick.value.item.word_id === item.word_id) {
    matchDone.value = new Set([...matchDone.value, matchPick.value.id, id])
    matchPick.value = null
    telegram.haptic()

    if (matchDone.value.size === matchLeft.value.length * 2) {
      const result = await send(matchResults.value)
      if (result) {
        feedback.value = { ...result, correct: true }
        telegram.notify('success')
      }
    }
    return
  }

  // A mismatch counts against both words, then the selection clears.
  markPairWrong(matchPick.value.item.word_id)
  markPairWrong(item.word_id)
  matchBad.value = id
  telegram.notify('error')

  const previous = matchPick.value
  matchPick.value = null

  setTimeout(() => {
    matchBad.value = null
    if (previous) previous.el = null
  }, 400)
}

const isPicked = (side, index) => matchPick.value?.id === `${side}${index}`
const isDone = (side, index) => matchDone.value.has(`${side}${index}`)

/* ---- lifecycle ---- */

function continueAfterFeedback() {
  const wasWrong = feedback.value && !feedback.value.correct
  advance(wasWrong)
}

async function finish() {
  stopSpeech()

  try {
    const result = await api.finishTest(props.sessionId, Date.now() - startedAt)
    telegram.notify('success')
    store.toast(`🎉 Test tugadi — ${result.accuracy}% toʼgʼri`)
    emit('finished', result)
  } catch (error) {
    store.toast(error.message)
    emit('exit')
  }
}

function exit() {
  stopSpeech()
  emit('exit')
}

onMounted(loadStage)
onBeforeUnmount(stopSpeech)
</script>

<template>
  <div class="overlay show" style="z-index: 40">
    <div class="test-top">
      <button class="x" @click="exit">✕</button>
      <div class="tbar"><i :style="{ width: progress + '%' }"></i></div>
    </div>

    <div class="test-body">
      <template v-if="current">
        <!-- FLASHCARD -->
        <div v-if="current.type === 'card'" class="flash-card" :class="{ flip: flipped }" @click="flipped = !flipped">
          <div class="flash-face">
            <div class="flash-em">{{ current.emoji || '📘' }}</div>
            <div class="flash-word">{{ current.en }}</div>
            <button class="audio-btn" v-html="speakerIcon" @click.stop="speak(current.en, current.audio)"></button>
            <div class="flash-pron">kartani bosing — tarjima koʼrinadi</div>
          </div>
          <div class="flash-face flash-back">
            <div class="flash-em">{{ current.emoji || '📘' }}</div>
            <div class="flash-word" style="color: var(--green-d)">{{ current.translation }}</div>
            <div class="flash-pron">{{ current.pos }}</div>
          </div>
        </div>

        <!-- SPELLING -->
        <template v-else-if="current.type === 'spell'">
          <div class="spell-img"><div class="flash-em" style="font-size: 70px">{{ current.emoji || '📘' }}</div></div>
          <div class="qprompt" style="text-align: center; font-size: 20px">{{ current.prompt }}</div>
          <div class="slots" @click="spellInput?.focus()">
            <span v-for="index in target" :key="index" class="slot2" :class="slotClass(index - 1)">
              {{ typed[index - 1] ?? '' }}
            </span>
          </div>
          <input
            ref="spellInput"
            class="spell-input"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :disabled="checked"
            @input="onSpellInput"
          />
        </template>

        <!-- PICTURE -->
        <template v-else-if="current.type === 'image'">
          <div class="qprompt">
            <button class="audio-btn" style="display: inline-grid; vertical-align: middle; margin-right: 8px"
                    v-html="speakerIcon" @click="speak(current.prompt)"></button>
            <b>{{ current.prompt }}</b> — qaysi rasm?
          </div>
          <div class="opts">
            <button
              v-for="option in current.options"
              :key="option.key"
              class="imgopt"
              :class="imageOptionClass(option)"
              :disabled="checked"
              @click="selected = option.key"
            >
              <div class="em">{{ option.emoji || '📘' }}</div>
              <div class="cap">{{ option.label }}</div>
            </button>
          </div>
        </template>

        <!-- MATCHING -->
        <template v-else-if="current.type === 'match'">
          <div class="qprompt" style="font-size: 18px">Soʼzlarni juftlang</div>
          <div class="match">
            <div class="mcol">
              <button
                v-for="(item, index) in matchLeft"
                :key="'L' + index"
                class="mitem"
                :class="{ sel: isPicked('L', index), done: isDone('L', index), bad: matchBad === `L${index}` }"
                @click="pickMatch('L', index)"
              >
                {{ item.translation }}
              </button>
            </div>
            <div class="mcol">
              <button
                v-for="(item, index) in matchRight"
                :key="'R' + index"
                class="mitem"
                :class="{ sel: isPicked('R', index), done: isDone('R', index), bad: matchBad === `R${index}` }"
                @click="pickMatch('R', index)"
              >
                {{ item.en }}
              </button>
            </div>
          </div>
        </template>

        <!-- MULTIPLE CHOICE -->
        <template v-else>
          <div class="qprompt">
            <button
              v-if="current.type === 'en2uz'"
              class="audio-btn"
              style="display: inline-grid; vertical-align: middle; margin-right: 8px"
              v-html="speakerIcon"
              @click="speak(current.prompt, current.audio)"
            ></button>
            <template v-if="current.type === 'uz2en'">«<b>{{ current.prompt }}</b>» soʼzining inglizchasi?</template>
            <template v-else><b>{{ current.prompt }}</b> — tarjimasi?</template>
          </div>
          <button
            v-for="option in current.options"
            :key="option"
            class="choice"
            :class="optionClass(option)"
            :disabled="checked"
            @click="selected = option"
          >
            {{ option }}
          </button>
        </template>
      </template>
    </div>

    <div class="test-foot">
      <div v-if="current?.type === 'card'" class="flash-actions">
        <button class="btn btn-soft" style="flex: 1" :disabled="busy" @click="cardAnswer(false)">↻ Takror</button>
        <button class="btn btn-primary" style="flex: 1" :disabled="busy" @click="cardAnswer(true)">✓ Bilaman</button>
      </div>

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

    <!-- FEEDBACK -->
    <div class="fb" :class="{ show: feedback, ok: feedback?.correct, no: feedback && !feedback.correct }">
      <h3 v-if="feedback">{{ feedback.correct ? 'Toʼgʼri javob! ✅' : 'Notoʼgʼri javob' }}</h3>
      <div v-if="feedback && !feedback.correct && feedback.answer" class="ca">
        Toʼgʼri javob: {{ feedback.answer }}
      </div>
      <button class="fbtn" @click="continueAfterFeedback">Davom etish</button>
    </div>
  </div>
</template>
