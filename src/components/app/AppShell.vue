<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Dashboard from './Dashboard.vue'
import RoadMap from './RoadMap.vue'
import Profile from './Profile.vue'
import CategoryView from '../category/CategoryView.vue'
import ExamSheet from '../category/ExamSheet.vue'
import TestRunner from '../test/TestRunner.vue'
import DuelFlow from '../duel/DuelFlow.vue'
import CompetitionFlow from '../competition/CompetitionFlow.vue'
import Notifications from './Notifications.vue'
import { api } from '../../lib/api'
import { NavIcon, bellIcon } from '../../lib/icons2'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const tab = ref('dash')
const openCategoryId = ref(null)
const examNode = ref(null)
const examRun = ref(null)
const duelCode = ref(null)
const competitionCode = ref(null)
const showingNotifications = ref(false)
const unread = ref(0)

const TABS = [
  { key: 'dash', label: 'Bosh', icon: NavIcon.home },
  { key: 'road', label: 'Yoʼl', icon: NavIcon.road },
  { key: 'profile', label: 'Profil', icon: NavIcon.profile },
]

const user = computed(() => store.state.user)

const TITLES = {
  dash: () => `Salom, ${(user.value?.name ?? '').split(' ')[0]}`,
  road: () => 'Yoʼl',
  profile: () => 'Profil',
}

const SUBTITLES = {
  dash: () => `Bugun rejada — ${user.value?.daily_goal ?? 0} ta soʼz`,
  road: () => 'Bosqichma-bosqich yodlang',
  profile: () => user.value?.username ? '@' + user.value.username : 'Telegram hisobi',
}

function switchTab(next) {
  tab.value = next
  telegram.haptic()
}

/** The exam sheet has been confirmed — the checkpoint round starts. */
async function startExam(node) {
  try {
    const { session_id, questions } = await api.startTest(node.id, [])
    examNode.value = null
    examRun.value = { sessionId: session_id, questions }
  } catch (error) {
    store.toast(error.message ?? 'Imtihonni boshlab boʼlmadi')
  }
}

async function finishExam(result) {
  examRun.value = null
  // Passing opens the next node, so the map has to be re-read either way.
  await store.refreshRoad()
  if (result?.exam_passed) telegram.notify('success')
}

/**
 * A friend arrives through `t.me/bot/game?startapp=duel_ABC123`, a whole class
 * through `?startapp=comp_VS8K3J`. Telegram hands that payload to the page, so
 * joining is the first thing that happens after the app boots.
 */
async function acceptInvite() {
  const param = telegram.startParam
  if (!param) return

  if (param.startsWith('comp_')) {
    // The competition screen does the joining itself, so it can show why a
    // refusal happened rather than swallowing it into a toast.
    competitionCode.value = param.slice(5).toUpperCase()
    return
  }

  if (!param.startsWith('duel_')) return

  const code = param.slice(5).toUpperCase()

  try {
    await api.joinDuel(code)
    duelCode.value = code
  } catch (error) {
    store.toast(error.message)
  }
}

async function checkBell() {
  try {
    unread.value = (await api.notifications()).unread
  } catch {
    /* the bell is not worth an error message */
  }
}

onMounted(() => {
  store.refreshDashboard().catch(() => {})
  acceptInvite()
  checkBell()
})

// The home tab shows counters a finished round changes.
watch(tab, (next) => {
  if (next === 'dash') store.refreshDashboard().catch(() => {})
})
</script>

<template>
  <div class="view active">
    <header class="v-topbar">
      <div>
        <div class="greeting">{{ TITLES[tab]() }}</div>
        <div class="v-sub">{{ SUBTITLES[tab]() }}</div>
      </div>
      <button class="icon-btn" aria-label="Bildirishnomalar" @click="showingNotifications = true">
        <span v-html="bellIcon"></span>
        <span v-if="unread" class="v-dot"></span>
      </button>
    </header>

    <div class="tabs">
      <section class="tab" :class="{ active: tab === 'dash' }"><Dashboard /></section>
      <section class="tab" :class="{ active: tab === 'road' }">
        <RoadMap @open="(id) => (openCategoryId = id)" @exam="(node) => (examNode = node)" />
      </section>
      <section class="tab" :class="{ active: tab === 'profile' }">
        <div class="scroll"><Profile /></div>
      </section>
    </div>

    <nav class="bottom-nav">
      <button
        v-for="item in TABS"
        :key="item.key"
        :class="{ on: tab === item.key }"
        @click="switchTab(item.key)"
      >
        <span v-html="item.icon"></span>
        {{ item.label }}
        <span v-if="tab === item.key" class="marker"></span>
      </button>
    </nav>

    <CategoryView
      v-if="openCategoryId"
      :category-id="openCategoryId"
      @close="openCategoryId = null"
    />

    <ExamSheet :node="examNode" @close="examNode = null" @start="startExam" />

    <TestRunner
      v-if="examRun"
      :session-id="examRun.sessionId"
      :questions="examRun.questions"
      @finished="finishExam"
      @exit="examRun = null"
    />

    <DuelFlow v-if="duelCode" :code="duelCode" @close="duelCode = null" />

    <CompetitionFlow
      v-if="competitionCode"
      :code="competitionCode"
      @close="competitionCode = null"
    />

    <Notifications
      v-if="showingNotifications"
      @close="showingNotifications = false"
      @read="unread = 0"
    />
  </div>
</template>
