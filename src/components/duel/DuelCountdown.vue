<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { telegram } from '../../lib/telegram'

const props = defineProps({ me: Object, rival: Object })
const emit = defineEmits(['done'])

const seconds = window.LEXIBLE?.duel?.countdown_seconds ?? 3
const value = ref(seconds)
let timer = null

onMounted(() => {
  telegram.haptic('medium')

  timer = setInterval(() => {
    value.value -= 1
    telegram.haptic(value.value > 0 ? 'medium' : 'heavy')

    if (value.value < 0) {
      clearInterval(timer)
      emit('done')
    }
  }, 900)
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="overlay show cd">
    <div class="faces">
      <div class="face">
        <span class="av me">{{ me?.initial ?? 'S' }}</span>
        <b>Siz</b>
      </div>
      <span class="vs">VS</span>
      <div class="face">
        <span class="av rival">{{ rival?.initial ?? '?' }}</span>
        <b>{{ rival?.name ?? 'Doʼst' }}</b>
      </div>
    </div>

    <div :key="value" class="tick">{{ value > 0 ? value : 'Start!' }}</div>
    <p class="ready">Tayyor boʼling…</p>
  </div>
</template>

<style scoped>
.cd {
  background: var(--card);
  z-index: 24;
  align-items: center;
  justify-content: center;
  gap: 26px;
}

.faces { display: flex; align-items: center; gap: 22px; }

.face { display: flex; flex-direction: column; align-items: center; gap: 7px; }

.face b { font-size: 13.5px; font-weight: 700; }

.av {
  width: 62px; height: 62px; border-radius: var(--r-pill);
  display: grid; place-items: center;
  font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; color: #fff;
}

.av.me { background: var(--green); }
.av.rival { background: #2E7CF6; }

.vs { font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 700; color: var(--faint); }

.tick {
  font-family: 'Sora', sans-serif;
  font-size: 76px;
  font-weight: 700;
  color: var(--green);
  animation: pulse .85s ease;
  line-height: 1;
}

@keyframes pulse {
  0% { transform: scale(.55); opacity: 0; }
  55% { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.ready { font-size: 13.5px; font-weight: 600; color: var(--muted); }
</style>
