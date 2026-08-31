<script setup>
import { computed, onMounted, watch } from 'vue'
import Onboarding from './components/onboarding/Onboarding.vue'
import RolePicker from './components/onboarding/RolePicker.vue'
import AppShell from './components/app/AppShell.vue'
import TeacherShell from './components/teacher/TeacherShell.vue'
import Toast from './components/ui/Toast.vue'
import Mascot from './components/ui/Mascot.vue'
import { store } from './lib/store'
import { telegram } from './lib/telegram'

const user = computed(() => store.state.user)

/*
 * Which shell to show is derived from the account, never from a local flag —
 * that is what lets the profile screens on both sides swap roles and have the
 * app follow immediately.
 */
const askRole = computed(() => Boolean(user.value) && !user.value.role_chosen)
const isTeacher = computed(() => user.value?.role === 'teacher')
const needsOnboarding = computed(() => !isTeacher.value && !user.value?.onboarded)

/*
 * Teachers on a desktop client get the full-window layout (styles/desktop.css)
 * instead of the phone frame — that is where roadmaps get built and results
 * get read. Students keep the phone-shaped column even on a PC.
 */
const desk = computed(() => isTeacher.value && telegram.isDesktop)

// Phones go fullscreen at init; a desktop window only does once the account
// turns out to be a teacher's, so a student's PC keeps the small window.
watch(desk, (on) => on && telegram.fullscreen(), { immediate: true })

onMounted(() => store.boot())
</script>

<template>
  <div class="app" :class="{ dark: store.state.dark, desk }">
    <!--
      Overlays opened from inside a scrolling tab are teleported here. `.tabs`
      clips its children, so an overlay rendered in place would only cover the
      tab box and leave the top bar and nav showing through.
    -->
    <div id="lx-overlays"></div>

    <!-- Booting -->
    <div v-if="!store.state.ready" class="splash">
      <Mascot />
      <div class="mark">Lexible<b>.</b></div>
    </div>

    <!-- Could not reach the backend -->
    <div v-else-if="store.state.error" class="splash">
      <div class="sad">😕</div>
      <h1 class="splash-title">Ulanib boʼlmadi</h1>
      <p class="splash-sub">{{ store.state.error }}</p>
      <button class="btn btn-primary retry" @click="() => location.reload()">Qayta urinish</button>
    </div>

    <RolePicker v-else-if="askRole" />

    <TeacherShell v-else-if="isTeacher" />

    <Onboarding v-else-if="needsOnboarding" @enter="store.refreshUser()" />

    <AppShell v-else />

    <Toast />
  </div>
</template>

<style scoped>
.splash {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 26px;
  text-align: center;
  background: var(--card);
}

.mark {
  font-family: 'Sora', sans-serif;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -1px;
  margin-top: 14px;
}

.mark b {
  color: var(--green);
}

.sad {
  font-size: 52px;
}

.splash-title {
  font-family: 'Sora', sans-serif;
  font-size: 21px;
  font-weight: 700;
  margin-top: 10px;
}

.splash-sub {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--muted);
  max-width: 280px;
}

.retry {
  max-width: 260px;
  margin-top: 18px;
}
</style>
