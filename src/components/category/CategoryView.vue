<script setup>
import { computed, onMounted, ref } from 'vue'
import AddWords from './AddWords.vue'
import MasteryDetail from './MasteryDetail.vue'
import TestPicker from './TestPicker.vue'
import WordDetail from './WordDetail.vue'
import Modal from '../ui/Modal.vue'
import TestRunner from '../test/TestRunner.vue'
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
const masteryModal = ref(null)      // { title, subtitle, mastery, mode }
const scopeModal = ref(false)
const picker = ref(false)
const pendingScope = ref('all')
const running = ref(null)           // { sessionId, questions }
const removing = ref(null)

const learnedAt = window.LEXIBLE?.mastery?.learned_at ?? 70
const midAt = window.LEXIBLE?.mastery?.mid_at ?? 40

const overall = computed(() =>
  words.value.length
    ? Math.round(words.value.reduce((sum, w) => sum + w.overall, 0) / words.value.length)
    : 0,
)

const weakWords = computed(() => words.value.filter((w) => w.overall < learnedAt))

const level = (value) => (value < midAt ? 'low' : value < learnedAt ? 'mid' : 'high')

async function load() {
  loading.value = true

  try {
    const data = await api.category(props.categoryId)
    category.value = data.category
    words.value = data.words
    masteryByType.value = data.mastery_by_type

    // The stage arrives pre-filled with the player's daily goal; say so, so it
    // does not look like words appeared from nowhere.
    if (data.auto_filled > 0) {
      store.toast(`✨ ${data.auto_filled} ta yangi soʼz tayyorlandi`)
    }

    // A node with no name yet asks for one before showing anything else.
    if (!category.value.title) {
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
  } catch (error) {
    store.toast(error.message)
  }
}

function cancelNaming() {
  naming.value = false
  emit('close')
}

function openWord(word) {
  detailWord.value = word
  telegram.haptic()
}

function openWordMastery(word) {
  masteryModal.value = {
    title: `${word.en} — ${word.overall}%`,
    subtitle: 'Qaysi mashqlarni bilasiz / bilmaysiz',
    mastery: word.mastery,
    mode: 'flags',
  }
}

function openCategoryMastery() {
  masteryModal.value = {
    title: `${category.value.title} — ${overall.value}%`,
    subtitle: 'Qaysi mashqlar zaif — mustahkamlash kerak',
    mastery: masteryByType.value,
    mode: 'bars',
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
  // Repeating a category offers to drill only the words still below threshold.
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

onMounted(load)
</script>

<template>
  <div class="overlay show">
    <div class="bar">
      <button class="back" @click="$emit('close')">‹</button>
      <span class="title">{{ category?.title ?? 'Kategoriya' }}</span>
    </div>

    <div class="cat-body">
      <template v-if="!loading && words.length">
        <button class="start" @click="startTest">
          <svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="#fff" /></svg>
          Boshlash
        </button>

        <div class="cat-overall" @click="openCategoryMastery">
          <div><b>Umumiy oʼzlashtirish</b><small>qaysi mashqlar zaif — bosing</small></div>
          <span class="ov-pct" :class="`m-${level(overall)}`">{{ overall }}%</span>
        </div>

        <div class="cnt">{{ words.length }} ta soʼz</div>

        <div class="wlist">
          <div v-for="word in words" :key="word.id" class="witem">
            <div class="winfo" @click="openWord(word)">
              <div class="thumb">
                <img v-if="word.icon" :src="word.icon" alt="" style="width: 34px; height: 34px" />
                <template v-else>{{ word.emoji || '📘' }}</template>
              </div>
              <div class="wtext">
                <b>{{ word.en }}</b>
                <span>{{ word.translation ?? '—' }}{{ word.pos ? ' · ' + word.pos : '' }}</span>
              </div>
            </div>
            <button class="mast" :class="`m-${level(word.overall)}`" @click="openWordMastery(word)">
              {{ word.overall }}%
            </button>
            <button class="wx" @click="removing = word">×</button>
          </div>
        </div>

        <button class="addmore" @click="addingWords = true">+ Yana lugʼat qoʼshish</button>
      </template>

      <div v-else-if="!loading" class="empty">
        <div class="etile">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9bb3a6" stroke-width="2.5" stroke-linecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <h3>Soʼz topilmadi</h3>
        <p>Lugʼatdagi soʼzlar tugadi — oʼzingiz qidirib qoʼshishingiz mumkin.</p>
        <button class="btn btn-primary" style="max-width: 240px" @click="addingWords = true">
          Lugʼat qoʼshish
        </button>
      </div>
    </div>

    <!-- Naming a fresh node -->
    <Modal
      :open="naming"
      title="Kategoriyaga nom bering"
      text="Avval shu kategoriya uchun nom yozing."
    >
      <input v-model="titleDraft" placeholder="Masalan: Maktab jihozlari" autocomplete="off" />
      <template #actions>
        <button class="btn btn-soft" @click="cancelNaming">Bekor</button>
        <button class="btn btn-primary" :disabled="titleDraft.trim().length < 2" @click="saveTitle">
          Saqlash
        </button>
      </template>
    </Modal>

    <!-- Removing a word -->
    <Modal
      :open="Boolean(removing)"
      title="Oʼchirilsinmi?"
      :text="removing ? `&quot;${removing.en}&quot; soʼzini roʼyxatdan oʼchirmoqchimisiz?` : ''"
    >
      <template #actions>
        <button class="btn btn-soft" @click="removing = null">Bekor</button>
        <button class="btn btn-danger" @click="confirmRemove">Oʼchirish</button>
      </template>
    </Modal>

    <!-- All words or only the weak ones -->
    <Modal
      :open="scopeModal"
      title="Qaytadan mashq"
      text="Bu kategoriyani avval ishlagansiz. Nimani takrorlaymiz?"
    >
      <div style="display: flex; flex-direction: column; gap: 9px; margin-top: 14px">
        <button class="scope-opt" @click="chooseScope('all')">
          <b>Hammasi</b><span>{{ words.length }} ta soʼzni qaytarish</span>
        </button>
        <button class="scope-opt" @click="chooseScope('wrong')">
          <b>Faqat xatolar</b><span>{{ weakWords.length }} ta zaif soʼz ({{ learnedAt }}% dan past)</span>
        </button>
      </div>
      <template #actions>
        <button class="btn btn-soft" @click="scopeModal = false">Bekor</button>
      </template>
    </Modal>

    <TestPicker
      :open="picker"
      @close="picker = false"
      @start="begin"
      @duel="() => { picker = false; store.toast('⚔️ Duel keyingi bosqichda ishga tushadi') }"
    />

    <WordDetail :word="detailWord" @close="detailWord = null" />

    <MasteryDetail
      v-if="masteryModal"
      open
      :title="masteryModal.title"
      :subtitle="masteryModal.subtitle"
      :mastery="masteryModal.mastery"
      :mode="masteryModal.mode"
      @close="masteryModal = null"
    />

    <AddWords
      v-if="addingWords"
      :category-id="categoryId"
      :chosen="words.map((w) => w.id)"
      @close="() => { addingWords = false; load() }"
      @changed="() => {}"
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
