<script setup>
/** UT-00 «Kim sifatida kirasiz?» — the first question, asked once. */
import { ref } from 'vue'
import { TeacherIcon } from '../../lib/icons2'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['chosen'])

const role = ref('student')
const saving = ref(false)

const ROLES = [
  {
    key: 'student',
    icon: TeacherIcon.student,
    title: 'Oʼquvchiman',
    hint: 'Soʼz yodlayman, yoʼl boʼylab oʼsaman',
  },
  {
    key: 'teacher',
    icon: TeacherIcon.board,
    title: 'Ustozman',
    hint: 'Yoʼl tuzaman, guruhlarimni boshqaraman',
  },
]

async function confirm() {
  if (!role.value || saving.value) return

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
    <div class="body">
      <div class="intro">
        <h1>Kim sifatida kirasiz?</h1>
        <p>Buni keyin profildan oʼzgartira olasiz.</p>
      </div>

      <div class="cards">
        <button
          v-for="option in ROLES"
          :key="option.key"
          class="role"
          :class="{ on: role === option.key }"
          @click="role = option.key"
        >
          <span class="radio" :class="{ on: role === option.key }"></span>
          <span class="ic" v-html="option.icon"></span>
          <span class="text">
            <b>{{ option.title }}</b>
            <i>{{ option.hint }}</i>
          </span>
        </button>
      </div>
    </div>

    <div class="foot">
      <button class="btn btn-primary" :disabled="saving" @click="confirm">
        {{ saving ? 'Saqlanmoqda…' : 'Davom etish' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.picker { background: var(--card); }

.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
  padding: 0 22px;
}

.intro { text-align: center; margin-bottom: 8px; }

.intro h1 { font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; }
.intro p { font-size: 13.5px; font-weight: 600; color: var(--muted); margin-top: 6px; }

.cards { display: flex; flex-direction: column; gap: 14px; }

.role {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 20px;
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
  color: var(--ink);
}

.role.on { border: 1.5px solid var(--green); background: var(--wash-3); }

.radio {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 20px;
  height: 20px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--line-4);
}

.radio.on { border: 6px solid var(--green); }

.ic {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: var(--wash-2);
  color: var(--muted);
  display: grid;
  place-items: center;
  flex: none;
}

.role.on .ic {
  background: var(--card);
  border: 1px solid var(--green-pale);
  color: var(--green);
}

.text { flex: 1; min-width: 0; }
.text b { display: block; font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700; }
.text i {
  display: block;
  font-style: normal;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 3px;
  line-height: 1.5;
}

.role.on .text i { color: var(--green-dark); }

.foot { padding: 14px 22px calc(14px + var(--lx-foot)); flex: none; }
</style>
