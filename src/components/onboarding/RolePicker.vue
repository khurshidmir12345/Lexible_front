<script setup>
import { ref } from 'vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['chosen'])

const role = ref(null)
const saving = ref(false)

const ROLES = [
  { key: 'student', emoji: '🎒', title: 'Oʼquvchiman', hint: 'Soʼz yodlayman, yoʼl boʼylab oʼsaman' },
  { key: 'teacher', emoji: '🎓', title: 'Ustozman', hint: 'Yoʼl tuzaman, guruhlarimni boshqaraman' },
]

async function confirm() {
  if (!role.value) return
  saving.value = true

  try {
    await store.setRole(role.value)
    telegram.notify('success')
    emit('chosen', role.value)
  } catch (error) {
    store.toast(error.message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="view active picker">
    <div class="picker-body">
      <h1 class="picker-title">Kim sifatida kirasiz?</h1>
      <p class="picker-sub">Buni keyin profildan oʼzgartira olasiz.</p>

      <div class="cards">
        <button
          v-for="option in ROLES"
          :key="option.key"
          class="role"
          :class="{ on: role === option.key }"
          @click="role = option.key"
        >
          <span class="role-emoji">{{ option.emoji }}</span>
          <span class="role-text">
            <b>{{ option.title }}</b>
            <i>{{ option.hint }}</i>
          </span>
          <span class="radio" :class="{ on: role === option.key }"></span>
        </button>
      </div>
    </div>

    <div class="picker-foot">
      <button class="btn btn-primary" :disabled="!role || saving" @click="confirm">
        {{ saving ? 'Saqlanmoqda...' : 'Davom etish' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.picker { background: var(--card); }

.picker-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 26px;
}

.picker-title { font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; }
.picker-sub { font-size: 13.5px; font-weight: 600; color: var(--muted); margin-top: 6px; }

.cards { display: flex; flex-direction: column; gap: 11px; margin-top: 24px; }

.role {
  display: flex; align-items: center; gap: 14px;
  border: 1px solid var(--line); border-radius: 16px;
  padding: 16px; background: none; cursor: pointer;
  text-align: left; font-family: 'Manrope', sans-serif;
}

.role.on { border-color: var(--green); background: var(--wash-3); }

.role-emoji {
  width: 46px; height: 46px; border-radius: 14px;
  background: var(--wash-2); display: grid; place-items: center;
  font-size: 24px; flex-shrink: 0;
}

.role.on .role-emoji { background: var(--green-soft); }

.role-text { flex: 1; }
.role-text b { display: block; font-size: 15.5px; font-weight: 700; }
.role-text i { display: block; font-style: normal; font-size: 12px; font-weight: 600; color: var(--faint); margin-top: 2px; }

.radio {
  width: 20px; height: 20px; border-radius: var(--r-pill);
  border: 1.5px solid var(--line-4); flex-shrink: 0;
}

.radio.on { border: 6px solid var(--green); }

.picker-foot { padding: 12px 26px 26px; }
</style>
