<script setup>
import { onMounted, ref } from 'vue'
import Onboarding from './components/onboarding/Onboarding.vue'
import AppShell from './components/app/AppShell.vue'
import Toast from './components/ui/Toast.vue'
import Mascot from './components/ui/Mascot.vue'
import { store } from './lib/store'

const entered = ref(false)

onMounted(async () => {
  await store.boot()
  // A player who already finished onboarding goes straight to the map.
  entered.value = Boolean(store.state.user?.onboarded)
})
</script>

<template>
  <div id="app-root" class="app" :class="{ dark: store.state.dark }">
    <!-- Booting -->
    <div v-if="!store.state.ready" class="view active">
      <div class="center">
        <Mascot />
        <div class="wordmark">Lexi<b>ble</b></div>
      </div>
    </div>

    <!-- Could not reach the backend -->
    <div v-else-if="store.state.error" class="view active">
      <div class="center">
        <div style="font-size: 54px">😕</div>
        <h1 style="margin-top: 14px">Ulanib boʼlmadi</h1>
        <p class="sub">{{ store.state.error }}</p>
      </div>
      <div class="stack">
        <button class="btn btn-primary" @click="() => location.reload()">Qayta urinish</button>
      </div>
    </div>

    <Onboarding v-else-if="!entered" @enter="entered = true" />

    <AppShell v-else />

    <Toast />
  </div>
</template>
