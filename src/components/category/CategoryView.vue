<script setup>
import { computed, onMounted, ref } from 'vue'
import AddWords from './AddWords.vue'
import MasteryDetail from './MasteryDetail.vue'
import TestPicker from './TestPicker.vue'
import WordDetail from './WordDetail.vue'
import Modal from '../ui/Modal.vue'
import TestRunner from '../test/TestRunner.vue'
import DuelFlow from '../duel/DuelFlow.vue'
import { backIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({ categoryId: Number })
const emit = defineEmits(['close'])

const category = ref(null)
const words = ref([])
const masteryByType = ref({})
const loading = ref(true)

const naming = ref(false)
const titleDraft = ref('')
const addingWords = ref(false)
const detailWord = ref(null)
const masteryModal = ref(null)
const scopeModal = ref(false)
const picker = ref(false)
const pendingScope = ref('all')
const running = ref(null)
const removing = ref(null)
const duelCode = ref(null)
const duelIntent = ref(false)

const learnedAt = window.LEXIBLE?.mastery?.learned_at ?? 70
const midAt = window.LEXIBLE?.mastery?.mid_at ?? 40

/** One column per exercise type; the exact percent sits above each bar. */
const typeRows = computed(() =>
  [
    ['card', 'Karta'],
    ['uz2en', 'U→E'],
    ['en2uz', 'E→U'],
    ['spell', 'Imlo'],
    ['image', 'Rasm'],
    ['match', 'Juft'],
  ].map(([key, label]) => ({
    key,
    label,
    value: masteryByType.value[key] ?? 0,
  })),
)

const overall = computed(() =>
  words.value.length
    ? Math.round(words.value.reduce((sum, w) => sum + w.overall, 0) / words.value.length)
    : 0,
)

const weakWords = computed(() => words.value.filter((w) => w.overall < learnedAt))

/** Meter colour is the app's usual verdict scale: green / amber / red. */
function meterColour(value) {
  if (value >= learnedAt) return 'var(--green)'
  if (value >= midAt) return '#DFA32E'
  return 'var(--red)'
}

const pillClass = (value) => (value >= learnedAt ? 'high' : value >= midAt ? 'mid' : 'low')

async function load() {
  loading.value = true
  try {
    const data = await api.category(props.categoryId)
    category.value = data.category
    words.value = data.words
    masteryByType.value = data.mastery_by_type

    if (!category.value.title && category.value.editable !== false) {
      titleDraft.value = ''
      naming.value = true
    }
  } catch (error) {
    store.toast(error.message)
    emit('close')
  } finally {
    loading.value = false
  }
}

async function saveTitle() {
  const title = titleDraft.value.trim()
  if (title.length < 2) return

  try {
    await api.renameCategory(props.categoryId, title)
    category.value.title = title
    store.patchNode(props.categoryId, { title })
    naming.value = false

    // A freshly named stage has no vocabulary yet — go straight to the
    // dictionary search so the player picks their own words.
    if (words.value.length === 0) addingWords.value = true
  } catch (error) {
    store.toast(error.message)
  }
}

function cancelNaming() {
  naming.value = false
  emit('close')
}

function openCategoryMastery() {
  masteryModal.value = {
    title: `${category.value.title} — ${overall.value}%`,
    subtitle: 'Har bir test turi boʼyicha oʼzlashtirish',
    mastery: masteryByType.value,
    mode: 'bars',
  }
}

function openWordMastery(word) {
  masteryModal.value = {
    title: `${word.en} — ${word.overall}%`,
    subtitle: 'Oxirgi javob boʼyicha: topdingizmi yoki yoʼqmi',
    mastery: word.mastery,
    states: word.answers,
    mode: 'flags',
  }
}

async function confirmRemove() {
  try {
    await api.removeWord(props.categoryId, removing.value.id)
    await load()
  } catch (error) {
    store.toast(error.message)
  } finally {
    removing.value = null
  }
}

function startTest() {
  telegram.haptic()

  // Repeating a category offers to drill only what is still weak.
  if (category.value.practiced && weakWords.value.length > 0) {
    scopeModal.value = true
    return
  }

  pendingScope.value = 'all'
  picker.value = true
}

function chooseScope(scope) {
  pendingScope.value = scope
  scopeModal.value = false
  picker.value = true
}

/** The VS button reuses the exercise picker, then opens a lobby. */
async function startDuel(types) {
  picker.value = false
  duelIntent.value = false

  try {
    const { duel } = await api.createDuel(props.categoryId, types)
    duelCode.value = duel.code
  } catch (error) {
    store.toast(error.message)
  }
}

async function begin(types) {
  picker.value = false
  try {
    const { session_id, questions } = await api.startTest(props.categoryId, types, pendingScope.value)
    running.value = { sessionId: session_id, questions }
  } catch (error) {
    store.toast(error.message)
  }
}

async function onTestFinished(result) {
  running.value = null
  store.patchNode(props.categoryId, { progress: result.category_progress, practiced: true })

  if (result.unlocked_position) {
    await store.refreshRoad()
    store.toast('✅ Bajarildi — keyingi bosqich ochildi!')
  }

  await load()
  store.refreshDashboard().catch(() => {})
}

/** The 3D icon when we have one, else the emoji, else the first letter. */
const initial = (word) => word.emoji || word.en.charAt(0).toLowerCase()

/**
 * A stage handed down by a teacher belongs to the class: the player studies
 * it and is ranked on it, but cannot rename it or touch its vocabulary.
 */
const editable = computed(() => category.value?.editable !== false)
const fromGroup = computed(() => Boolean(category.value?.from_group))

onMounted(load)
</script>

<template>
  <div class="overlay show cat">
    <header class="cat-head">
      <button class="cat-back" @click="$emit('close')" v-html="backIcon"></button>
      <div style="flex: 1">
        <div class="cat-title">
          <template v-if="fromGroup">{{ category.position }}-bosqich · </template>{{ category?.title ?? 'Kategoriya' }}
        </div>
        <div class="cat-sub">
          {{ words.length }} ta soʼz<template v-if="fromGroup"> · {{ category.group?.teacher }}</template>
        </div>
      </div>
      <span class="cat-pct v-num">{{ overall }}%</span>
    </header>

    <div class="c-body">
      <template v-if="!loading && words.length">
        <div v-if="fromGroup" class="taught">
          <span class="taught-badge">{{ category.group?.badge }}</span>
          <span class="taught-text">
            <b>{{ category.group?.title }}</b>
            <i>Ustoz tuzgan bosqich — lugʼat oʼzgarmaydi</i>
          </span>
        </div>

        <div class="actions">
          <button class="btn btn-primary play" @click="startTest">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M7 4.5v15l12-7.5z" /></svg>
            Boshlash
          </button>
          <button class="vs" @click="() => { duelIntent = true; picker = true }">VS</button>
        </div>

        <div class="panel chart" @click="openCategoryMastery">
          <div class="panel-title">Test turlari boʼyicha</div>
          <div class="bars">
            <div v-for="row in typeRows" :key="row.key" class="bar-col">
              <b class="bar-val v-num" :class="{ zero: row.value === 0 }">{{ row.value }}%</b>
              <span class="bar-track">
                <i
                  v-if="row.value > 0"
                  :style="{ height: Math.max(row.value, 6) + '%', background: meterColour(row.value) }"
                ></i>
              </span>
              <span class="bar-cap">{{ row.label }}</span>
            </div>
          </div>
        </div>

        <div class="word-card">
          <div v-for="word in words" :key="word.id" class="word-row">
            <span class="tile-letter" @click="detailWord = word">{{ initial(word) }}</span>
            <span class="word-text" @click="detailWord = word">
              <b>{{ word.en }}</b>
              <i>{{ word.translation ?? '—' }}{{ word.pos ? ' · ' + word.pos : '' }}</i>
            </span>
            <button class="pct-pill" :class="pillClass(word.overall)" @click="openWordMastery(word)">
              {{ word.overall }}%
            </button>
            <button v-if="editable" class="drop" @click="removing = word">×</button>
          </div>
        </div>

        <button v-if="editable" class="add-more" @click="addingWords = true">+ Yana lugʼat qoʼshish</button>
      </template>

      <div v-else-if="!loading" class="cat-empty">
        <div class="empty-tile">📖</div>
        <h3>Soʼz topilmadi</h3>
        <p>Lugʼatdagi soʼzlar tugadi — oʼzingiz qidirib qoʼshishingiz mumkin.</p>
        <button class="btn btn-primary" @click="addingWords = true">Lugʼat qoʼshish</button>
      </div>
    </div>

    <Modal :open="naming" title="Bosqichga nom bering" text="Bu bosqichga nom yozing.">
      <input v-model="titleDraft" class="modal-input" placeholder="Masalan: Taomlar" autocomplete="off" />
      <template #actions>
        <button class="btn btn-soft" @click="cancelNaming">Bekor</button>
        <button class="btn btn-primary" :disabled="titleDraft.trim().length < 2" @click="saveTitle">Saqlash</button>
      </template>
    </Modal>

    <Modal
      :open="Boolean(removing)"
      title="Oʼchirilsinmi?"
      :text="removing ? `«${removing.en}» soʼzi roʼyxatdan olib tashlanadi.` : ''"
    >
      <template #actions>
        <button class="btn btn-soft" @click="removing = null">Bekor</button>
        <button class="btn btn-danger" @click="confirmRemove">Oʼchirish</button>
      </template>
    </Modal>

    <Modal :open="scopeModal" title="Qaytadan mashq" text="Bu bosqichni avval ishlagansiz.">
      <div class="scope-list">
        <button class="scope" @click="chooseScope('all')">
          <b>Hammasi</b><i>{{ words.length }} ta soʼzni qaytarish</i>
        </button>
        <button class="scope" @click="chooseScope('wrong')">
          <b>Faqat zaiflari</b><i>{{ weakWords.length }} ta soʼz ({{ learnedAt }}% dan past)</i>
        </button>
      </div>
      <template #actions>
        <button class="btn btn-soft" @click="scopeModal = false">Bekor</button>
      </template>
    </Modal>

    <TestPicker
      :open="picker"
      @close="() => { picker = false; duelIntent = false }"
      @start="(types) => (duelIntent ? startDuel(types) : begin(types))"
      @duel="startDuel"
    />

    <DuelFlow v-if="duelCode" :code="duelCode" @close="() => { duelCode = null; load() }" />

    <WordDetail :word="detailWord" @close="detailWord = null" />

    <MasteryDetail
      v-if="masteryModal"
      open
      :title="masteryModal.title"
      :subtitle="masteryModal.subtitle"
      :mastery="masteryModal.mastery"
      :states="masteryModal.states ?? null"
      :mode="masteryModal.mode"
      @close="masteryModal = null"
    />

    <AddWords
      v-if="addingWords"
      :category-id="categoryId"
      :chosen="words.map((w) => w.id)"
      @close="() => { addingWords = false; load() }"
    />

    <TestRunner
      v-if="running"
      :session-id="running.sessionId"
      :questions="running.questions"
      @finished="onTestFinished"
      @exit="running = null"
    />
  </div>
</template>

<style scoped>
.cat {
  background: var(--canvas);
}

.cat-head {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 10px 22px 9px;
  background: var(--card);
  border-bottom: 1px solid var(--wash);
  flex: none;
}

.cat-back {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: none;
  color: var(--ink);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.cat-title {
  font-family: 'Sora', sans-serif;
  font-size: 19px;
  font-weight: 700;
}

.cat-sub {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--faint);
}

.cat-pct {
  font-size: 17px;
  color: var(--green);
}

.c-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.c-body > * {
  flex: none;
}

.actions {
  display: flex;
  gap: 10px;
}

.play {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.vs {
  width: 52px;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 14px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: .5px;
  cursor: pointer;
}

.panel-title {
  font-size: 13.5px;
  font-weight: 700;
  margin-bottom: 12px;
}

.panel.chart {
  cursor: pointer;
}

.bars {
  display: flex;
  gap: 9px;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

/* The number is the reading; the bar just makes it comparable at a glance. */
.bar-val {
  font-size: 10px;
  color: var(--ink);
}

.bar-val.zero {
  color: var(--faint);
}

.bar-track {
  width: 100%;
  height: 46px;
  border-radius: 7px;
  background: var(--wash-2);
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.bar-track > i {
  display: block;
  width: 100%;
  border-radius: 7px 7px 0 0;
  transition: height .3s;
}

.bar-cap {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--faint);
}

.word-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.word-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--wash);
}

.word-row:last-child {
  border-bottom: none;
}

.taught {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--gold-soft);
  border: 1px solid var(--gold-line);
  border-radius: var(--r-lg);
  padding: 12px 14px;
}

.taught-badge {
  width: 36px;
  height: 36px;
  border-radius: var(--r-md);
  background: var(--card);
  color: var(--gold);
  display: grid;
  place-items: center;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  flex: none;
}

.taught-text { flex: 1; min-width: 0; }
.taught-text b { display: block; font-size: 13.5px; font-weight: 800; color: var(--gold-text); }
.taught-text i {
  display: block;
  font-style: normal;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--gold-text);
  opacity: .8;
  margin-top: 2px;
}

.tile-letter {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--wash-2);
  color: var(--muted);
  display: grid;
  place-items: center;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  cursor: pointer;
}

.word-text {
  flex: 1;
  cursor: pointer;
}

.word-text b {
  display: block;
  font-size: 14.5px;
  font-weight: 800;
}

.word-text i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--faint);
}

.pct-pill {
  border: none;
  border-radius: var(--r-pill);
  padding: 4px 10px;
  font-family: 'Manrope', sans-serif;
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
}

.pct-pill.high {
  background: var(--green-soft);
  color: var(--green-dark);
}

.pct-pill.mid {
  background: #FFF6E3;
  color: var(--gold);
}

.pct-pill.low {
  background: var(--red-soft);
  color: var(--red-dark);
}

.drop {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: var(--faint);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.add-more {
  border: 1px dashed var(--line-4);
  background: none;
  border-radius: 14px;
  padding: 13px;
  font-family: 'Manrope', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}

.cat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 40px 20px;
}

.empty-tile {
  font-size: 44px;
  margin-bottom: 4px;
}

.cat-empty h3 {
  font-family: 'Sora', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.cat-empty p {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  max-width: 260px;
  margin-bottom: 10px;
}

.modal-input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px 15px;
  margin-top: 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  font-weight: 700;
  outline: none;
}

.modal-input:focus {
  border-color: var(--green);
}

.scope-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: 14px;
}

.scope {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px 15px;
  background: none;
  text-align: left;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
}

.scope b {
  display: block;
  font-size: 14.5px;
  font-weight: 700;
}

.scope i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--faint);
}
</style>
