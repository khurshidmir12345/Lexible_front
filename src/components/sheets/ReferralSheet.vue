<script setup>
import { computed } from 'vue'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

defineEmits(['close'])

const link = computed(() => telegram.miniAppLink(`ref_${store.state.user?.telegram_id}`))

const reward = 50

function copy() {
  telegram.copy(link.value)
  store.toast('🔗 Havola nusxalandi')
}

function share() {
  telegram.share(link.value, 'Lexible — ingliz tili soʼzlarini oʼyin orqali yodlang')
}
</script>

<template>
  <div class="dialog-wrap open">
    <div class="dialog">
      <div class="gift">🎁</div>
      <h2>Doʼstlarni taklif qiling</h2>
      <p>
        Har bir qoʼshilgan doʼst uchun
        <b>{{ reward }} tanga</b> bonus.
      </p>

      <div class="link">{{ link.replace('https://', '') }}</div>

      <div class="actions">
        <button class="btn btn-primary" @click="copy">Nusxalash</button>
        <button class="btn btn-soft" @click="share">Ulashish</button>
      </div>

      <button class="btn btn-ghost" style="margin-top: 6px" @click="$emit('close')">Yopish</button>
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
  width: 100%; background: var(--card); border-radius: 20px; padding: 26px 22px 18px;
  box-shadow: 0 24px 48px -20px rgba(22, 32, 26, .35);
  text-align: center;
}

.gift { font-size: 46px; }

h2 { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 700; margin-top: 10px; }

p { font-size: 13.5px; font-weight: 600; color: var(--muted); margin-top: 6px; }
p b { color: var(--gold); font-weight: 800; }

.link {
  border: 1.5px dashed #C3CEC5; border-radius: 14px; padding: 13px;
  margin-top: 16px; font-size: 13px; font-weight: 700;
  color: #2E7CF6; word-break: break-all;
}

.actions { display: flex; gap: 10px; margin-top: 14px; }
.actions .btn { flex: 1; }
</style>
