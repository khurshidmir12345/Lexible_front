<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'

defineEmits(['close'])

const data = ref(null)

onMounted(async () => {
  try {
    data.value = await api.coins()
  } catch (error) {
    store.toast(error.message)
  }
})
</script>

<template>
  <div class="dialog-wrap open">
    <div class="dialog">
      <div class="head">
        <span class="coin">⭐</span>
        <div>
          <div class="amount">{{ data?.balance ?? 0 }} tanga</div>
          <div class="hint">soʼz yodlab, gʼalaba qozonib yigʼasiz</div>
        </div>
      </div>

      <div class="section">QANDAY YIGʼILADI</div>
      <div class="rules">
        <div v-for="rule in data?.rules ?? []" :key="rule.label" class="rule">
          <span class="rule-emoji">{{ rule.emoji }}</span>
          <span class="rule-label">{{ rule.label }}</span>
          <span class="rule-value">{{ rule.value }}</span>
        </div>
      </div>

      <template v-if="data?.premium">
        <div class="section">PREMIUMGA ALMASHADI</div>
        <div class="ladder">
          <div class="ladder-head">
            <span>{{ data.lifetime }} / {{ data.premium.next_at ?? data.lifetime }}</span>
            <b v-if="data.premium.remaining">keyingi bosqichga {{ data.premium.remaining }} tanga</b>
            <b v-else>barcha bosqichlar ochilgan</b>
          </div>

          <div class="ladder-track">
            <span :style="{ width: data.premium.progress + '%' }"></span>
          </div>

          <div class="tiers">
            <div v-for="tier in data.premium.tiers" :key="tier.coins" class="tier" :class="{ got: tier.unlocked }">
              <span class="dot">
                <svg v-if="tier.unlocked" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2BC876" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 13l5 5L20 7" />
                </svg>
              </span>
              {{ tier.coins }} tanga — {{ tier.days }} kun Premium{{ tier.unlocked ? ' ochildi' : '' }}
            </div>
          </div>
        </div>

        <p v-if="data.premium.active" class="active-note">
          Premium {{ data.premium.until }} gacha faol ✨
        </p>
      </template>

      <button class="btn btn-primary" style="margin-top: 18px" @click="$emit('close')">Yopish</button>
    </div>
  </div>
</template>

<style scoped>
.dialog-wrap {
  position: absolute; inset: 0;
  background: rgba(22, 32, 26, .45);
  display: flex; align-items: center; justify-content: center;
  padding: 26px; z-index: 30;
}

.dialog {
  width: 100%; background: var(--card); border-radius: 20px; padding: 22px;
  box-shadow: 0 24px 48px -20px rgba(22, 32, 26, .35);
  max-height: 100%; overflow-y: auto;
}

.head { display: flex; align-items: center; gap: 12px; }

.coin { font-size: 34px; line-height: 1; filter: drop-shadow(0 3px 4px rgba(0, 0, 0, .2)); }

.amount { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; }
.hint { font-size: 12px; font-weight: 600; color: var(--muted); }

.section {
  font-size: 11px; font-weight: 700; letter-spacing: 1px;
  color: var(--faint); margin-top: 16px;
}

.rules { display: flex; flex-direction: column; gap: 8px; margin-top: 9px; }

.rule {
  display: flex; align-items: center; gap: 10px;
  background: var(--wash-2); border-radius: 12px; padding: 10px 12px;
}

.rule-emoji { font-size: 16px; }
.rule-label { flex: 1; font-size: 12.5px; font-weight: 700; }
.rule-value { font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700; color: var(--green); }

.ladder { background: var(--ink); border-radius: 16px; padding: 14px 15px; margin-top: 9px; }

.ladder-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }

.ladder-head span { font-size: 12.5px; font-weight: 700; color: rgba(255, 255, 255, .85); }
.ladder-head b { font-size: 11px; font-weight: 800; color: #F2C94C; text-align: right; }

.ladder-track {
  height: 7px; border-radius: var(--r-pill);
  background: rgba(255, 255, 255, .15); margin-top: 9px; overflow: hidden;
}

.ladder-track span {
  display: block; height: 100%; border-radius: var(--r-pill);
  background: linear-gradient(90deg, var(--gold-light), var(--gold-mid));
}

.tiers { display: flex; flex-direction: column; gap: 6px; margin-top: 11px; }

.tier {
  display: flex; align-items: center; gap: 8px;
  font-size: 11.5px; font-weight: 700; color: rgba(255, 255, 255, .65);
}

.tier.got { color: var(--green-bright); }

.dot {
  width: 12px; height: 12px; border-radius: var(--r-pill);
  border: 1.5px solid rgba(255, 255, 255, .4);
  flex-shrink: 0; display: grid; place-items: center;
}

.tier.got .dot { border: none; }

.active-note {
  background: var(--green-soft); color: var(--green-dark);
  border-radius: 12px; padding: 10px 12px; margin-top: 10px;
  font-size: 12px; font-weight: 700; text-align: center;
}
</style>
