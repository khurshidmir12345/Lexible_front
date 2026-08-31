<script setup>
/**
 * The teacher app: four tabs, and every deeper screen opened as an overlay on
 * top of them.
 *
 * Refreshing is push-based — a screen that changed something emits, and the
 * tab behind it reloads — so the numbers on the dashboard never lag behind
 * what the teacher just did.
 */
import { computed, onMounted, ref, watch } from 'vue'
import TeacherDashboard from './TeacherDashboard.vue'
import TeacherPaths from './TeacherPaths.vue'
import TeacherGroups from './TeacherGroups.vue'
import TeacherProfile from './TeacherProfile.vue'
import GroupDetail from './GroupDetail.vue'
import StageEditor from './StageEditor.vue'
import TeacherPricing from './TeacherPricing.vue'
import CompetitionLobby from '../competition/CompetitionLobby.vue'
import Notifications from '../app/Notifications.vue'
import { NavIcon, TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const tab = ref('dash')

const openGroupId = ref(null)
const openStageId = ref(null)
const lobby = ref(null)
const showPlan = ref(false)
const showNotifications = ref(false)
const unread = ref(0)
const activeToday = ref(null)

const dashRef = ref(null)
const pathsRef = ref(null)
const groupsRef = ref(null)
const profileRef = ref(null)

const TABS = [
  { key: 'dash', label: 'Bosh', icon: NavIcon.home },
  { key: 'paths', label: 'Yoʼllar', icon: NavIcon.road },
  { key: 'groups', label: 'Guruhlar', icon: NavIcon.group },
  { key: 'profile', label: 'Profil', icon: NavIcon.profile },
]

const user = computed(() => store.state.user)
const firstName = computed(() => (user.value?.name ?? '').split(' ')[0])

// The paths tab hands its own switcher to the top bar instead of a title, so
// the map gets that row back — hence no `paths` entry here.
const TITLES = {
  dash: () => `Salom, ${firstName.value}`,
  groups: () => 'Guruhlar',
  profile: () => 'Profil',
}

const SUBTITLES = {
  dash: () =>
    activeToday.value === null
      ? 'Ustoz kabineti'
      : `Bugun ${activeToday.value} oʼquvchi faol`,
  groups: () => 'Sinflaringiz',
  profile: () => (user.value?.username ? '@' + user.value.username : 'Telegram hisobi'),
}

function switchTab(next) {
  tab.value = next
  telegram.haptic()
}

/** Everything a change can touch, refreshed together. */
function refreshAll() {
  dashRef.value?.load()
  groupsRef.value?.load()
  pathsRef.value?.load()
  profileRef.value?.load()
}

async function checkBell() {
  try {
    const { unread: count } = await api.notifications()
    unread.value = count
  } catch {
    /* the bell is not worth an error message */
  }
}

/** The greeting line quotes today's active count, so the shell reads it too. */
async function readHeadline() {
  try {
    activeToday.value = (await api.teacher.dashboard()).active_today
  } catch {
    activeToday.value = null
  }
}

onMounted(() => {
  checkBell()
  readHeadline()
})

// Coming back to a tab should not show numbers from ten minutes ago.
watch(tab, (next) => {
  if (next === 'dash') {
    dashRef.value?.load()
    readHeadline()
  }
  if (next === 'groups') groupsRef.value?.load()
  if (next === 'profile') profileRef.value?.load()
})
</script>

<template>
  <div class="view active t-shell">
    <header class="v-topbar">
      <div v-if="tab !== 'paths'" class="head-text">
        <div class="greeting">{{ TITLES[tab]() }}</div>
        <div class="v-sub">{{ SUBTITLES[tab]() }}</div>
      </div>

      <!-- TeacherPaths teleports its path switcher in here while the map is open. -->
      <div id="paths-topbar-slot" class="topbar-slot"></div>

      <div class="head-actions">
        <span class="role-chip">USTOZ</span>
        <button class="icon-btn" aria-label="Bildirishnomalar" @click="showNotifications = true">
          <span v-html="TeacherIcon.bell"></span>
          <span v-if="unread" class="v-dot"></span>
        </button>
      </div>
    </header>

    <div class="tabs">
      <section class="tab" :class="{ active: tab === 'dash' }">
        <TeacherDashboard
          ref="dashRef"
          @open-groups="switchTab('groups')"
          @open-paths="switchTab('paths')"
          @open-group="(id) => { switchTab('groups'); openGroupId = id }"
          @open-plan="showPlan = true"
        />
      </section>

      <section class="tab" :class="{ active: tab === 'paths' }">
        <TeacherPaths
          ref="pathsRef"
          :active="tab === 'paths'"
          @edit-stage="(id) => (openStageId = id)"
          @competition="(c) => (lobby = { id: c.id, groupId: null, stageId: null })"
        />
      </section>

      <section class="tab" :class="{ active: tab === 'groups' }">
        <TeacherGroups ref="groupsRef" @open="(id) => (openGroupId = id)" />
      </section>

      <section class="tab" :class="{ active: tab === 'profile' }">
        <TeacherProfile ref="profileRef" @open-plan="showPlan = true" />
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

    <GroupDetail
      v-if="openGroupId"
      :group-id="openGroupId"
      @close="openGroupId = null"
      @changed="refreshAll"
    />

    <StageEditor
      v-if="openStageId"
      :stage-id="openStageId"
      @close="openStageId = null"
      @saved="refreshAll"
    />

    <!-- A game opened from the path map has no class behind it. -->
    <CompetitionLobby
      v-if="lobby"
      :competition-id="lobby.id"
      :group-id="lobby.groupId"
      :stage-id="lobby.stageId"
      @close="() => { lobby = null; refreshAll() }"
    />

    <TeacherPricing v-if="showPlan" @close="() => { showPlan = false; refreshAll() }" />

    <Notifications
      v-if="showNotifications"
      @close="showNotifications = false"
      @read="unread = 0"
    />
  </div>
</template>

<style scoped>
.head-text { min-width: 0; }

.topbar-slot { flex: 1; min-width: 0; }

/* Nothing teleported in — the bar goes back to title plus actions. */
.topbar-slot:empty { display: none; }

.head-actions { display: flex; align-items: center; gap: 9px; flex: none; }

.role-chip {
  background: var(--ink);
  color: var(--card);
  border-radius: var(--r-pill);
  padding: 5px 11px;
  font-family: 'Sora', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .5px;
}

.app.dark .role-chip { background: var(--green); color: #06120B; }
</style>
