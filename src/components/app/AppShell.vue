<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Dashboard from './Dashboard.vue'
import RoadMap from './RoadMap.vue'
import Profile from './Profile.vue'
import CategoryView from '../category/CategoryView.vue'
import { NavIcon, bellIcon } from '../../lib/icons2'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const tab = ref('dash')
const openCategoryId = ref(null)

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

onMounted(() => {
  store.refreshDashboard().catch(() => {})
})

// The home tab shows counters a finished round changes.
watch(tab, (next) => {
  if (next === 'dash') store.refreshDashboard().catch(() => {})
})
</script>

<template>
  <div class="view active">
    <header class="topbar">
      <div>
        <div class="greeting">{{ TITLES[tab]() }}</div>
        <div class="sub">{{ SUBTITLES[tab]() }}</div>
      </div>
      <button class="icon-btn" aria-label="Bildirishnomalar">
        <span v-html="bellIcon"></span>
        <span class="dot"></span>
      </button>
    </header>

    <div class="tabs">
      <section class="tab" :class="{ active: tab === 'dash' }"><Dashboard /></section>
      <section class="tab" :class="{ active: tab === 'road' }">
        <RoadMap @open="(id) => (openCategoryId = id)" />
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
  </div>
</template>
