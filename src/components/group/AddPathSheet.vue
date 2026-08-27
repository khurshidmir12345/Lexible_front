<script setup>
import { ref } from 'vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['close', 'joined'])

/** `choose` → `code` → (`pick` when the ID covers several classes). */
const step = ref('choose')
const code = ref('')
const joining = ref(false)
const outcome = ref(null)
const classes = ref(null)

/**
 * The teacher hands out one of two things and the student cannot be expected
 * to know which: a group code off the board ("5A-KITOB") or the teacher's own
 * ID from their profile ("TCHR-2381"). Both are accepted here.
 */
async function submit(groupId = null) {
  const value = code.value.trim().toUpperCase()
  if (value.length < 3) return

  joining.value = true

  try {
    const result = await api.joinGroup(value, groupId)

    if (result.status === 'choose') {
      classes.value = result
      step.value = 'pick'
      return
    }

    outcome.value = result
    telegram.notify('success')
    emit('joined')
  } catch (error) {
    store.toast(error.message)
    telegram.notify('error')
  } finally {
    joining.value = false
  }
}

function invite() {
  const bot = window.LEXIBLE?.botUsername ?? 'lexible_test_bot'
  const short = window.LEXIBLE?.miniAppShortName ?? 'game'
  telegram.share(
    `https://t.me/${bot}/${short}?startapp=ref_${store.state.user?.telegram_id}`,
    'Lexible — ingliz tili soʼzlarini oʼyin orqali yodlang',
  )
}
</script>

<template>
  <div class="sheet-wrap open">
    <div class="sheet-card">
      <span class="grabber"></span>

      <!-- Request sent: nothing to do but wait for the teacher -->
      <template v-if="outcome">
        <div class="done">
          <div class="done-mark">📨</div>
          <h2>Soʼrov yuborildi</h2>
          <p>
            <b>{{ outcome.group.title }}</b> — {{ outcome.group.teacher }}.
            Ustoz tasdiqlagach, bosqichlar yoʼlingizda paydo boʼladi va
            bildirishnoma keladi.
          </p>
        </div>
        <button class="btn btn-primary" @click="$emit('close')">Tushunarli</button>
      </template>

      <!-- Entering the code -->
      <template v-else-if="step === 'code'">
        <h2>Ustoz kodi</h2>
        <p>Guruh kodi (<b>5A-KITOB</b>) yoki ustoz ID (<b>TCHR-2381</b>) — ikkalasi ham boʼladi.</p>

        <input
          v-model="code"
          class="code-input"
          placeholder="5A-KITOB"
          autocapitalize="characters"
          autocomplete="off"
          @keyup.enter="submit()"
        />

        <div class="actions">
          <button class="btn btn-soft" @click="step = 'choose'">Orqaga</button>
          <button class="btn btn-primary" :disabled="code.trim().length < 3 || joining" @click="submit()">
            {{ joining ? 'Yuborilmoqda...' : 'Qoʼshilish' }}
          </button>
        </div>
      </template>

      <!-- One teacher ID, several classes: the student says which. -->
      <template v-else-if="step === 'pick'">
        <h2>Qaysi guruh?</h2>
        <p>{{ classes.teacher.name }} — {{ classes.groups.length }} ta guruh yuritadi.</p>

        <div class="options">
          <button
            v-for="group in classes.groups"
            :key="group.id"
            class="option"
            :disabled="joining"
            @click="submit(group.id)"
          >
            <span class="option-emoji">{{ group.badge }}</span>
            <span class="option-text">
              <b>{{ group.title }}</b>
              <i>{{ group.subtitle || `${group.members} oʼquvchi` }}</i>
            </span>
          </button>
        </div>

        <button class="btn btn-soft" @click="step = 'code'">Orqaga</button>
      </template>

      <!-- Choosing how to add a path -->
      <template v-else>
        <h2>Yoʼl qoʼshish</h2>
        <p>Oʼzingiz tuzasizmi yoki ustoz guruhiga qoʼshilasizmi?</p>

        <div class="options">
          <button class="option locked" @click="store.toast('2-shaxsiy yoʼl — Premium rejada')">
            <span class="option-emoji">✍️</span>
            <span class="option-text">
              <b>Oʼzim yarataman</b>
              <i>nom qoʼyaman, oʼzim lugʼat qoʼshaman</i>
            </span>
            <span class="tag">Premium</span>
          </button>

          <button class="option" @click="step = 'code'">
            <span class="option-emoji">🎓</span>
            <span class="option-text">
              <b>Ustoz kodi bilan</b>
              <i>guruh kodini kiritaman</i>
            </span>
          </button>
        </div>

        <button class="referral" @click="invite">
          <span>🎁</span>
          <span>Doʼstingizni taklif qiling — <b>3 kun Premium</b> bepul</span>
        </button>

        <button class="btn btn-ghost" @click="$emit('close')">Yopish</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.sheet-wrap {
  position: absolute; inset: 0; background: rgba(22, 32, 26, .45);
  display: flex; align-items: flex-end; z-index: 30;
}

.sheet-card {
  width: 100%; background: var(--card); border-radius: 24px 24px 0 0;
  padding: 12px 22px 28px; max-height: 90%; overflow-y: auto;
}

.grabber {
  display: block; width: 38px; height: 4px; border-radius: var(--r-pill);
  background: var(--line); margin: 0 auto 16px;
}

h2 { font-family: 'Sora', sans-serif; font-size: 19px; font-weight: 700; }
p { font-size: 13px; font-weight: 600; color: var(--muted); margin-top: 6px; }

.options { display: flex; flex-direction: column; gap: 9px; margin: 16px 0; }

.option {
  display: flex; align-items: center; gap: 13px;
  border: 1px solid var(--line); border-radius: 14px; padding: 13px 15px;
  background: none; cursor: pointer; text-align: left;
  font-family: 'Manrope', sans-serif;
}

.option.locked { opacity: .7; }

.option-emoji {
  width: 40px; height: 40px; border-radius: 12px;
  background: var(--wash-2); display: grid; place-items: center;
  font-size: 20px; flex-shrink: 0;
}

.option-text { flex: 1; }
.option-text b { display: block; font-size: 14.5px; font-weight: 700; color: var(--ink); }
.option-text i { display: block; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--faint); }

.tag {
  background: var(--ink); color: var(--gold-mid); border-radius: var(--r-sm);
  padding: 4px 8px; font-size: 9.5px; font-weight: 800; letter-spacing: .5px;
}

.code-input {
  width: 100%; border: 1.5px dashed #C3CEC5; border-radius: 14px;
  padding: 16px; margin-top: 16px; text-align: center;
  font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 700;
  color: #2E7CF6; letter-spacing: 2px; text-transform: uppercase; outline: none;
}

.code-input:focus { border-color: var(--green); border-style: solid; }

.actions { display: flex; gap: 10px; margin-top: 16px; }
.actions .btn { flex: 1; }

.referral {
  display: flex; align-items: center; gap: 10px;
  background: #FFF6E3; border: 1px solid #F5E3B8; border-radius: 14px;
  padding: 12px 14px; cursor: pointer; margin-bottom: 10px;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 700;
  color: var(--gold-muted); text-align: left;
}

.referral b { color: var(--gold); }

.done { text-align: center; padding: 6px 0 18px; }
.done-mark { font-size: 46px; }
.done h2 { margin-top: 10px; }
.done p { margin-top: 8px; }
.done b { color: var(--ink); }
</style>
