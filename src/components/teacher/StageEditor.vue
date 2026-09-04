<script setup>
/**
 * UT-02 «Bosqich tahriri» — the vocabulary comes from the shared dictionary.
 *
 * The teacher never types word pairs: they search the dictionary (same base
 * the students study from) or take a random batch matched to a level. There
 * is no cap — a stage holds as many words as the lesson needs.
 */
import { computed, onMounted, ref, watch } from 'vue'
import Modal from '../ui/Modal.vue'
import WordIcon from '../word/WordIcon.vue'
import { TeacherIcon } from '../../lib/icons2'
import { LEVELS } from '../../lib/languages'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({ stageId: Number })
const emit = defineEmits(['close', 'saved'])

const stage = ref(null)
const title = ref('')
const isExam = ref(false)
const words = ref([])           // [{id, en, translation}]
const loading = ref(true)
const saving = ref(false)

/* dictionary search */
const query = ref('')
const results = ref([])
const searching = ref(false)
const searchField = ref(null)
let debounce = null
let inflight = null

const minWords = window.LEXIBLE?.minWords ?? 5
let skipSearch = false

/* random batch */
const randomOpen = ref(false)
const randomLevel = ref('A1')
const randomCount = ref(10)
const randomBusy = ref(false)

const COUNTS = [5, 10, 15, 20]

const chosenIds = computed(() => new Set(words.value.map((w) => w.id)))

/** What a chosen row keeps: the pair plus its picture, so the list stays visual. */
const pickFields = (w) => ({
  id: w.id,
  en: w.en,
  translation: w.translation ?? '',
  emoji: w.emoji ?? null,
  icon: w.icon ?? null,
  icon_large: w.icon_large ?? null,
})

async function load() {
  loading.value = true

  try {
    const { stage: data } = await api.teacher.stage(props.stageId)
    stage.value = data
    title.value = data.title ?? ''
    isExam.value = data.type === 'exam'
    words.value = data.words.map(pickFields)
  } catch (error) {
    store.toast(error.message)
    emit('close')
  } finally {
    loading.value = false
  }
}

async function search() {
  const q = query.value.trim()
  if (!q) {
    results.value = []
    return
  }

  // Only the latest keystroke's answer may reach the list.
  inflight?.abort()
  const controller = (inflight = new AbortController())

  searching.value = true
  try {
    const { words } = await api.searchWords(q, controller.signal)
    if (controller !== inflight) return
    results.value = words
  } catch (error) {
    if (error.name !== 'AbortError') store.toast(error.message)
  } finally {
    if (controller === inflight) searching.value = false
  }
}

// Let typing settle a little; stale answers are aborted, so this can be short.
watch(query, () => {
  clearTimeout(debounce)
  if (skipSearch) {
    skipSearch = false
    return
  }
  debounce = setTimeout(search, 200)
})

/**
 * Picking a word empties the field without collapsing the list, exactly like
 * the student's add-words screen: siblings stay a tap away, the keyboard
 * stays open, and the next word can be typed at once.
 */
function pick(word) {
  if (chosenIds.value.has(word.id)) {
    words.value = words.value.filter((w) => w.id !== word.id)
    telegram.haptic()
    return
  }

  words.value.push(pickFields(word))
  telegram.haptic()

  if (query.value) {
    skipSearch = true
    query.value = ''
  }
  searchField.value?.focus()
}

function clearQuery() {
  query.value = ''
  results.value = []
  searchField.value?.focus()
}

function drop(index) {
  words.value.splice(index, 1)
  telegram.haptic()
}

async function addRandom() {
  if (randomBusy.value) return

  const count = Math.min(Math.max(parseInt(randomCount.value, 10) || 10, 1), 100)
  randomBusy.value = true

  try {
    const { words: batch } = await api.teacher.randomWords(
      count,
      randomLevel.value,
      words.value.map((w) => w.id),
    )

    if (!batch.length) {
      store.toast('Bu darajada boʼsh soʼz qolmadi')
      return
    }

    words.value.push(...batch.map(pickFields))
    randomOpen.value = false
    telegram.notify('success')
    store.toast(`🎲 ${batch.length} ta soʼz qoʼshildi`)
  } catch (error) {
    store.toast(error.message)
  } finally {
    randomBusy.value = false
  }
}

async function save() {
  if (words.value.length < minWords) {
    store.toast(`Kamida ${minWords} ta soʼz tanlang — yana ${minWords - words.value.length} ta`)
    return
  }

  saving.value = true

  try {
    await api.teacher.saveStage(
      props.stageId,
      title.value.trim() || null,
      words.value.map((w) => w.id),
      isExam.value ? 'exam' : 'normal',
    )
    store.toast('✅ Saqlandi')
    emit('saved')
    emit('close')
  } catch (error) {
    store.toast(error.message)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="overlay show editor">
    <header class="t-head">
      <button class="t-back" aria-label="Orqaga" @click="emit('close')">
        <span v-html="TeacherIcon.chevron" class="flip"></span>
      </button>
      <div class="t-head-main">
        <h1>{{ stage ? `${stage.position}-bosqich` : 'Bosqich' }}{{ title ? ` · ${title}` : '' }}</h1>
        <p>{{ stage?.path?.title }}{{ stage?.path?.subtitle ? ` · ${stage.path.subtitle}` : '' }}</p>
      </div>
      <span class="t-pill" :class="words.length < minWords ? 'amber' : 'green'">
        {{ words.length < minWords ? `${words.length}/${minWords}` : words.length }} soʼz
      </span>
    </header>

    <div class="t-body">
      <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

      <template v-else>
        <label class="t-field"><span>BOSQICH NOMI</span>
          <input v-model="title" placeholder="Masalan: Greetings" maxlength="60" />
        </label>

        <label class="exam">
          <span class="exam-text">
            <b>Imtihon bosqichi</b>
            <i>oldingi bosqichlardan tasodifiy savollar</i>
          </span>
          <input v-model="isExam" type="checkbox" class="sr" />
          <span class="switch" :class="{ on: isExam }"></span>
        </label>

        <!-- Dictionary search + random batch -->
        <div class="pick-row">
          <div class="search">
            <span class="search-ic" v-html="TeacherIcon.search"></span>
            <input
              ref="searchField"
              v-model="query"
              placeholder="Lugʼatdan soʼz qidiring…"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
            />
            <button v-if="query" class="search-x" aria-label="Tozalash" @click="clearQuery">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <button class="dice" @click="randomOpen = true">
            🎲 <span>Random</span>
          </button>
        </div>

        <!-- Search results -->
        <div v-if="query.trim()" class="t-rows sug-list">
          <p v-if="searching && !results.length" class="t-loading slim">Qidirilmoqda…</p>
          <p v-else-if="!results.length" class="t-loading slim">«{{ query }}» topilmadi</p>

          <button
            v-for="word in results"
            :key="word.id"
            class="t-row sug"
            @mousedown.prevent
            @click="pick(word)"
          >
            <WordIcon :word="word" :size="36" />
            <span class="t-row-text">
              <b>{{ word.en }}</b>
              <i>{{ word.translation ?? '—' }}{{ word.pos ? ' · ' + word.pos : '' }}{{ word.level ? ' · ' + word.level : '' }}</i>
            </span>
            <span class="sug-mark" :class="{ on: chosenIds.has(word.id) }">
              {{ chosenIds.has(word.id) ? '✓' : '+' }}
            </span>
          </button>
        </div>

        <!-- Chosen words -->
        <div v-if="words.length" class="t-rows">
          <div v-for="(word, index) in words" :key="word.id" class="t-row chosen">
            <WordIcon :word="word" :size="44" />
            <span class="pair"><i class="num">{{ index + 1 }}</i><b>{{ word.en }}</b> — {{ word.translation }}</span>
            <button class="del" aria-label="Oʼchirish" @click="drop(index)">
              <span v-html="TeacherIcon.trash"></span>
            </button>
          </div>
        </div>

        <div v-else-if="!query.trim()" class="t-empty">
          <span class="t-empty-ic" v-html="TeacherIcon.board"></span>
          <h3>Lugʼat boʼsh</h3>
          <p>Bazadan soʼz qidiring yoki 🎲 Random bilan darajaga mos soʼzlar oling. Kamida {{ minWords }} ta, yuqori chegara yoʼq.</p>
        </div>
      </template>
    </div>

    <div class="t-foot">
      <button class="btn btn-primary" :disabled="saving || loading || words.length < minWords" @click="save">
        {{ saving ? 'Saqlanmoqda…' : words.length < minWords ? `Yana ${minWords - words.length} ta soʼz kerak` : 'Saqlash' }}
      </button>
    </div>

    <!-- Random batch dialog -->
    <Modal :open="randomOpen" title="Random soʼzlar" text="Daraja va sonini tanlang — bazadan tasodifiy soʼzlar olinadi.">
      <div class="lvl-label">DARAJA</div>
      <div class="lvls">
        <button
          v-for="level in LEVELS"
          :key="level.code"
          class="lvl"
          :class="{ on: randomLevel === level.code }"
          @click="randomLevel = level.code"
        >
          <b>{{ level.value }}</b>
          <i>{{ level.code }}</i>
        </button>
      </div>

      <div class="lvl-label">NECHTA SOʼZ</div>
      <div class="counts">
        <button
          v-for="n in COUNTS"
          :key="n"
          class="cnt"
          :class="{ on: Number(randomCount) === n }"
          @click="randomCount = n"
        >{{ n }}</button>
        <input
          v-model="randomCount"
          class="cnt-input"
          type="number"
          min="1"
          max="100"
          inputmode="numeric"
        />
      </div>

      <template #actions>
        <button class="btn btn-soft" @click="randomOpen = false">Bekor</button>
        <button class="btn btn-primary" :disabled="randomBusy" @click="addRandom">
          {{ randomBusy ? 'Tanlanmoqda…' : 'Qoʼshish' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.editor { background: var(--canvas); z-index: 20; }

.flip { display: grid; place-items: center; transform: rotate(180deg); }

/* --------------------------------------------------------------- exam row */

.exam {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 12px 14px;
  cursor: pointer;
}

.exam-text { flex: 1; }
.exam-text b { display: block; font-size: 13.5px; font-weight: 800; }
.exam-text i {
  display: block;
  font-style: normal;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--faint);
  margin-top: 2px;
}

.sr { position: absolute; opacity: 0; pointer-events: none; }

.switch {
  width: 40px;
  height: 24px;
  border-radius: var(--r-pill);
  background: var(--line-3);
  position: relative;
  flex: none;
  transition: background .15s;
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: var(--r-pill);
  background: var(--card);
  box-shadow: 0 1px 3px rgba(22, 32, 26, .2);
  transition: transform .15s;
}

.switch.on { background: var(--green); }
.switch.on::after { transform: translateX(16px); }

/* ------------------------------------------------------- search & random */

.pick-row { display: flex; gap: 9px; }

.search {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 13px;
  padding: 0 12px;
}

.search:focus-within { border-color: var(--green); }

.search-ic { display: grid; place-items: center; color: var(--faint); flex: none; font-size: 13px; }

.search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  padding: 12px 0;
  font-family: 'Manrope', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  outline: none;
}

.search input::placeholder { color: var(--faint); font-weight: 600; }

.search-x {
  width: 22px;
  height: 22px;
  border-radius: var(--r-pill);
  border: none;
  background: var(--wash-2);
  color: var(--muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.dice {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--gold-line);
  background: var(--gold-soft);
  color: var(--gold-text);
  border-radius: 13px;
  padding: 0 14px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  flex: none;
}

/* ----------------------------------------------------------- suggestions */

.sug-list { max-height: 320px; overflow-y: auto; }

.slim { padding: 18px 0; }

button.t-row.sug { cursor: pointer; }

.sug-mark {
  width: 26px;
  height: 26px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  color: var(--muted);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  flex: none;
}

.sug-mark.on { background: var(--green); border-color: var(--green); color: #fff; }

/* ------------------------------------------------------------------ rows */

.t-row.chosen .pair .num {
  display: inline-block;
  min-width: 18px;
  margin-right: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  font-style: normal;
  color: var(--faint);
}

.pair {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--faint);
  overflow: hidden;
  text-overflow: ellipsis;
}

.pair b { font-size: 14px; font-weight: 800; color: var(--ink); }

.del {
  border: none;
  background: none;
  color: var(--line-4);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
  padding: 4px;
}

/* --------------------------------------------------------- random dialog */

.lvl-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--faint);
  margin: 16px 0 8px;
}

.lvls { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

.lvl {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--card);
  padding: 9px 6px;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  color: var(--ink);
}

.lvl b { display: block; font-size: 12px; font-weight: 800; }
.lvl i { display: block; font-style: normal; font-size: 10px; font-weight: 700; color: var(--faint); margin-top: 1px; }

.lvl.on { border: 1.5px solid var(--green); background: var(--wash-3); }
.lvl.on b { color: var(--green-dark); }

.counts { display: flex; gap: 8px; }

.cnt {
  flex: 1;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--card);
  padding: 10px 0;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
}

.cnt.on { border: 1.5px solid var(--green); background: var(--wash-3); color: var(--green-dark); }

.cnt-input {
  width: 64px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--card);
  padding: 10px 0;
  text-align: center;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  outline: none;
  flex: none;
}

.cnt-input:focus { border-color: var(--green); }
</style>
