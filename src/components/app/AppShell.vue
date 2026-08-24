<script setup>
import { onMounted, ref, watch } from 'vue'
import Dashboard from './Dashboard.vue'
import RoadMap from './RoadMap.vue'
import Profile from './Profile.vue'
import CategoryView from '../category/CategoryView.vue'
import { Nav } from '../../lib/icons'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const tab = ref('road')
const openCategoryId = ref(null)

const TABS = [
  { key: 'dash', label: 'Bosh', icon: Nav.dash },
  { key: 'road', label: 'Yoʼl', icon: Nav.road },
  { key: 'profile', label: 'Profil', icon: Nav.profile },
]

function switchTab(next) {
  tab.value = next
  telegram.haptic()
}

onMounted(() => {
  store.refreshDashboard().catch(() => {})
})

// The home tab shows counters that a finished round changes, so it is
// refetched whenever the player comes back to it.
watch(tab, (next) => {
  if (next === 'dash') store.refreshDashboard().catch(() => {})
})
</script>

<template>
  <div class="view active">
    <div class="tabs">
      <section class="tab" :class="{ active: tab === 'dash' }">
        <div class="bar">
          <span class="title">Bosh sahifa</span>
        </div>
        <div class="tabscroll"><Dashboard /></div>
      </section>

      <section class="tab" :class="{ active: tab === 'road' }">
        <div class="bar">
          <span class="title">Yoʼl</span>
        </div>
        <RoadMap @open="(id) => (openCategoryId = id)" />
      </section>

      <section class="tab" :class="{ active: tab === 'profile' }">
        <div class="bar"><span class="title">Profil</span></div>
        <div class="tabscroll"><Profile /></div>
      </section>
    </div>

    <nav class="bnav">
      <button
        v-for="item in TABS"
        :key="item.key"
        :class="{ on: tab === item.key }"
        @click="switchTab(item.key)"
      >
        <span v-html="item.icon"></span>{{ item.label }}
      </button>
    </nav>

    <CategoryView
      v-if="openCategoryId"
      :category-id="openCategoryId"
      @close="openCategoryId = null"
    />
  </div>
</template>
