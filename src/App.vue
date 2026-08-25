<script setup>
import { onMounted, ref } from 'vue'
import Onboarding from './components/onboarding/Onboarding.vue'
import RolePicker from './components/onboarding/RolePicker.vue'
import AppShell from './components/app/AppShell.vue'
import TeacherShell from './components/teacher/TeacherShell.vue'
import Toast from './components/ui/Toast.vue'
import Mascot from './components/ui/Mascot.vue'
import { computed } from 'vue'
import { store } from './lib/store'

const entered = ref(false)
const roleChosen = ref(false)

const isTeacher = computed(() => store.state.user?.role === 'teacher')

onMounted(async () => {
  await store.boot()

  // Anyone already set up goes straight in; the role question is only for
  // someone opening the app for the first time.
  entered.value = Boolean(store.state.user?.onboarded)
  roleChosen.value = entered.value
})
</script>

<template>
  <div class="app" :class="{ dark: store.state.dark }">
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

    <RolePicker
      v-else-if="!roleChosen"
      @chosen="(role) => { roleChosen = true; if (role === 'teacher') entered = true }"
    />

    <TeacherShell v-else-if="isTeacher" />

    <Onboarding v-else-if="!entered" @enter="entered = true" />

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
