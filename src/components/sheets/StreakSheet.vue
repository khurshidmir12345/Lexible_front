<script setup>
import { onMounted, ref } from 'vue'
import { WEEKDAYS } from '../../lib/languages'
import { api } from '../../lib/api'
import { store } from '../../lib/store'

defineEmits(['close'])

const data = ref(null)

onMounted(async () => {
  try {
    data.value = await api.streak()
  } catch (error) {
    store.toast(error.message)
  }
})
</script>

<template>
  <div class="dialog-wrap open">
    <div class="dialog">
      <div class="head">
        <span class="flame">🔥</span>
        <div>
          <div class="amount">{{ data?.streak_days ?? 0 }} kun seriya</div>
          <div class="hint">{{ data?.since ? `${data.since}dan beri yodlayapsiz` : 'bugun boshlang' }}</div>
        </div>
      </div>

      <div class="week">
        <div v-for="(day, index) in WEEKDAYS" :key="day" class="day" :class="{ on: data?.week?.[index] }">
          {{ day.charAt(0) }}
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <b>{{ data?.best_streak ?? 0 }} kun</b>
          <i>eng uzun seriya 🏅</i>
        </div>
        <div class="stat">
          <b>{{ data?.active_days ?? 0 }} kun</b>
          <i>jami faol kunlar</i>
        </div>
      </div>

      <button class="btn btn-primary" style="margin-top: 18px" @click="$emit('close')">Yopish</button>
    </div>
  </div>
</template>

<style scoped>
.dialog-wrap {
  position: absolute; inset: 0; background: rgba(22, 32, 26, .45);
  display: flex; align-items: center; justify-content: center;
  padding: 26px; z-index: 30;
}

.dialog {
  width: 100%; background: var(--card); border-radius: 20px; padding: 22px;
  box-shadow: 0 24px 48px -20px rgba(22, 32, 26, .35);
}

.head { display: flex; align-items: center; gap: 12px; }

.flame { font-size: 34px; line-height: 1; filter: drop-shadow(0 3px 5px rgba(199, 84, 26, .35)); }

.amount { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; }
.hint { font-size: 12px; font-weight: 600; color: var(--muted); }

.week { display: flex; gap: 7px; margin-top: 18px; }

.day {
  flex: 1; aspect-ratio: 1; border-radius: 12px;
  border: 1px solid var(--line); background: none;
  display: grid; place-items: center;
  font-size: 12.5px; font-weight: 800; color: var(--faint);
}

.day.on { background: var(--green); border-color: var(--green); color: #fff; }

.stats { display: flex; gap: 10px; margin-top: 16px; }

.stat {
  flex: 1; background: var(--wash-2); border-radius: 14px; padding: 13px 14px;
}

.stat b {
  display: block; font-family: 'Sora', sans-serif;
  font-size: 18px; font-weight: 700;
}

.stat i {
  display: block; font-style: normal;
  font-size: 11.5px; font-weight: 600; color: var(--muted); margin-top: 2px;
}
</style>
