<script setup>
import { computed, ref } from 'vue'
import TeacherDashboard from './TeacherDashboard.vue'
import TeacherPaths from './TeacherPaths.vue'
import TeacherGroups from './TeacherGroups.vue'
import GroupDetail from './GroupDetail.vue'
import StageEditor from './StageEditor.vue'
import TeacherProfile from './TeacherProfile.vue'
import { NavIcon } from '../../lib/icons2'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const tab = ref('dash')
const openGroupId = ref(null)
const openStageId = ref(null)

const pathsRef = ref(null)
const groupsRef = ref(null)

const TABS = [
  { key: 'dash', label: 'Bosh', icon: NavIcon.home },
  { key: 'paths', label: 'Yoʼllar', icon: NavIcon.road },
  { key: 'groups', label: 'Guruhlar', icon: NavIcon.profile },
  { key: 'profile', label: 'Profil', icon: NavIcon.profile },
]

const user = computed(() => store.state.user)

const TITLES = {
  dash: () => `Salom, ${(user.value?.name ?? '').split(' ')[0]}`,
  paths: () => 'Yoʼllarim',
  groups: () => 'Guruhlar',
  profile: () => 'Profil',
}

const SUBTITLES = {
  dash: () => 'Ustoz kabineti',
  paths: () => 'Darslar ketma-ketligi',
  groups: () => 'Sinflaringiz',
  profile: () => user.value?.username ? '@' + user.value.username : 'Telegram hisobi',
}

function switchTab(next) {
  tab.value = next
  telegram.haptic()
}
</script>

<template>
  <div class="view active">
    <header class="topbar">
      <div>
        <div class="greeting">{{ TITLES[tab]() }}</div>
        <div class="v-sub">{{ SUBTITLES[tab]() }}</div>
      </div>
      <span class="role-chip">USTOZ</span>
    </header>

    <div class="tabs">
      <section class="tab" :class="{ active: tab === 'dash' }">
        <TeacherDashboard @open-groups="switchTab('groups')" />
      </section>
      <section class="tab" :class="{ active: tab === 'paths' }">
        <TeacherPaths ref="pathsRef" @edit-stage="(id) => (openStageId = id)" />
      </section>
      <section class="tab" :class="{ active: tab === 'groups' }">
        <TeacherGroups ref="groupsRef" @open="(id) => (openGroupId = id)" />
      </section>
      <section class="tab" :class="{ active: tab === 'profile' }">
        <div class="scroll"><TeacherProfile /></div>
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
      @close="() => { openGroupId = null; groupsRef?.load() }"
    />

    <StageEditor
      v-if="openStageId"
      :stage-id="openStageId"
      @close="openStageId = null"
      @saved="() => pathsRef?.load()"
    />
  </div>
</template>

<style scoped>
.role-chip {
  background: var(--ink); color: #fff; border-radius: var(--r-sm);
  padding: 5px 9px; font-family: 'Sora', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: 1px;
}
</style>
