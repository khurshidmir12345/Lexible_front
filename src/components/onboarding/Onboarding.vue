<script setup>
import { computed, ref } from 'vue'
import { StepIcon, backIcon } from '../../lib/icons2'
import { GOALS, LANGUAGES, LEVELS, TIMES, WEEKDAYS } from '../../lib/languages'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['enter'])

/**
 * The artboards open with a login and a signup screen. Inside Telegram the
 * player is already identified, so onboarding starts at the first real
 * question and the step counter is six, not seven.
 */
const STEPS = ['lang', 'days', 'time', 'level', 'goal', 'teacher']

const screen = ref('welcome')
const saving = ref(false)
const failure = ref(null)

const answers = ref({
  native_lang: store.state.user?.native_lang ?? null,
  study_days: [],
  reminder_at: null,
  cefr_level: null,
  daily_goal: null,
  teacher_code: null,
})

const teacherInput = ref('')
const teacherSent = ref(false)
const customTime = ref('')

const firstName = computed(() => (store.state.user?.name ?? 'doʼst').split(' ')[0])
const stepIndex = computed(() => STEPS.indexOf(screen.value))
const progress = computed(() => ((stepIndex.value + 1) / STEPS.length) * 100)

const HERO = {
  lang: { icon: StepIcon.globe, title: 'Soʼzlar qaysi tilga tarjima qilinsin?', sub: 'Keyin sozlamalardan oʼzgartirishingiz mumkin.' },
  days: { icon: StepIcon.calendar, title: 'Qaysi kunlari yodlaysiz?', sub: 'Tanlangan kunlarda eslatma yuboramiz.' },
  time: { icon: StepIcon.clock, title: 'Qachon eslataylik?', sub: 'Tanlangan kunlarda shu vaqtda xabar keladi.' },
  level: { icon: StepIcon.stairs, title: 'Hozirgi darajangiz?', sub: 'Sizga mos soʼzlardan boshlaymiz.' },
  goal: { icon: StepIcon.target, title: 'Kunlik maqsadingiz?', sub: 'Har bosqichda shuncha soʼz beriladi.' },
  teacher: { icon: StepIcon.teacher, title: 'Ustozingiz bormi?', sub: 'ID kiritsangiz, uning guruhiga soʼrov yuboriladi.' },
}

function go(next) {
  screen.value = next
  telegram.haptic()
}

function back() {
  const i = STEPS.indexOf(screen.value)
  go(i <= 0 ? 'welcome' : STEPS[i - 1])
}

const next = () => go(STEPS[stepIndex.value + 1] ?? 'teacher')

function toggleDay(day) {
  const days = answers.value.study_days
  answers.value.study_days = days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
  telegram.haptic()
}

function pickTime(value) {
  answers.value.reminder_at = value
  customTime.value = ''
  telegram.haptic()
}

const orderedDays = () => WEEKDAYS.filter((d) => answers.value.study_days.includes(d))

const canContinue = computed(() => ({
  lang: Boolean(answers.value.native_lang),
  days: answers.value.study_days.length > 0,
  time: Boolean(answers.value.reminder_at),
  level: Boolean(answers.value.cefr_level),
  goal: Boolean(answers.value.daily_goal),
  teacher: true,
}[screen.value]))

function sendTeacher() {
  answers.value.teacher_code = teacherInput.value.trim()
  teacherSent.value = true
  telegram.notify('success')
}

const summary = computed(() => {
  const language = LANGUAGES.find((l) => l.code === answers.value.native_lang)
  const level = LEVELS.find((l) => l.code === answers.value.cefr_level)

  return [
    ['Til', language?.name ?? '—'],
    ['Daraja', level ? `${level.code} · ${level.value}` : '—'],
    ['Kunlar', orderedDays().join(' · ') || '—'],
    ['Eslatish', answers.value.reminder_at ?? '—'],
    ['Kunlik maqsad', `${answers.value.daily_goal ?? '—'} ta soʼz`],
    ['Ustoz', answers.value.teacher_code || 'mustaqil'],
  ]
})

async function finish() {
  saving.value = true
  failure.value = null

  try {
    await store.completeOnboarding({ ...answers.value, study_days: orderedDays() })
    telegram.notify('success')
    go('done')
  } catch (error) {
    failure.value = error.message
    telegram.notify('error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="view active ob">
    <!-- WELCOME -->
    <section v-if="screen === 'welcome'" class="ob-screen ob-center">
      <div class="hello-cloud">
        <span>hello</span>
        <span class="alt">salom</span>
      </div>
      <div class="ob-wordmark">Lexible<b>.</b></div>
      <h1 class="ob-title" style="text-align: center">Soʼzlarni oʼyin orqali yodlang</h1>
      <p class="ob-sub" style="text-align: center">
        Har kuni bir necha yangi soʼz. Yoʼl xaritasi boʼylab koʼtarilib, lugʼatingizni mustahkamlang.
      </p>
      <div class="ob-grow"></div>
      <button class="btn btn-primary" @click="go('lang')">Boshlash</button>
    </section>

    <!-- DONE -->
    <section v-else-if="screen === 'done'" class="ob-screen">
      <div class="ob-grow"></div>
      <div class="done-mark">🎉</div>
      <h1 class="ob-title" style="text-align: center">Tayyor, {{ firstName }}!</h1>
      <p class="ob-sub" style="text-align: center">Birinchi kategoriyani yarating va boshlang.</p>
      <div class="ob-summary">
        <div v-for="[label, value] in summary" :key="label" class="ob-summary-row">
          <span>{{ label }}</span><b>{{ value }}</b>
        </div>
      </div>
      <div class="ob-grow"></div>
      <button class="btn btn-primary" @click="emit('enter')">Yoʼlni boshlash</button>
    </section>

    <!-- QUESTIONS -->
    <section v-else class="ob-screen">
      <div class="ob-head">
        <button class="ob-back" @click="back" v-html="backIcon"></button>
        <div class="ob-track"><i :style="{ width: progress + '%' }"></i></div>
        <span class="ob-count">{{ stepIndex + 1 }}/{{ STEPS.length }}</span>
      </div>

      <div class="ob-hero">
        <span class="hero-ic" v-html="HERO[screen].icon"></span>
        <h1 class="ob-title">{{ HERO[screen].title }}</h1>
        <p class="ob-sub">{{ HERO[screen].sub }}</p>
      </div>

      <div class="ob-body">
        <!-- Language -->
        <template v-if="screen === 'lang'">
          <button
            v-for="language in LANGUAGES"
            :key="language.code"
            class="pick"
            @click="answers.native_lang = language.code"
          >
            <span class="flag-round">
              <i v-for="(stripe, i) in language.stripes" :key="i" :style="{ background: stripe }"></i>
              <b v-if="language.dot" :style="{ background: language.dot }"></b>
            </span>
            <span class="pick-label">{{ language.name }}</span>
            <span class="radio" :class="{ on: answers.native_lang === language.code }"></span>
          </button>
        </template>

        <!-- Days -->
        <template v-else-if="screen === 'days'">
          <div class="day-row">
            <button
              v-for="day in WEEKDAYS"
              :key="day"
              class="day-cell"
              :class="{ on: answers.study_days.includes(day) }"
              @click="toggleDay(day)"
            >
              {{ day }}
            </button>
          </div>
          <p class="ob-hint">
            {{ answers.study_days.length ? `${answers.study_days.length} kun tanlandi` : 'Kamida bitta kun tanlang' }}
          </p>
        </template>

        <!-- Time -->
        <template v-else-if="screen === 'time'">
          <div class="time-grid">
            <button
              v-for="time in TIMES"
              :key="time.value"
              class="time-card"
              :class="{ on: answers.reminder_at === time.value && !customTime }"
              @click="pickTime(time.value)"
            >
              <b>{{ time.value }}</b>
              <span>{{ time.label }}</span>
            </button>
          </div>
          <label class="custom-time">
            <span>Boshqa vaqt</span>
            <input v-model="customTime" type="time" @change="answers.reminder_at = customTime || answers.reminder_at" />
          </label>
        </template>

        <!-- Level -->
        <template v-else-if="screen === 'level'">
          <button
            v-for="level in LEVELS"
            :key="level.code"
            class="pick boxed"
            :class="{ on: answers.cefr_level === level.code }"
            @click="answers.cefr_level = level.code"
          >
            <span class="badge">{{ level.code }}</span>
            <span class="pick-two">
              <b>{{ level.value }}</b>
              <i>{{ level.ob-hint }}</i>
            </span>
            <span class="radio" :class="{ on: answers.cefr_level === level.code }"></span>
          </button>
        </template>

        <!-- Goal -->
        <template v-else-if="screen === 'goal'">
          <button
            v-for="goal in GOALS"
            :key="goal.value"
            class="pick boxed"
            :class="{ on: answers.daily_goal === goal.value }"
            @click="answers.daily_goal = goal.value"
          >
            <span class="goal-num">{{ goal.value }}</span>
            <span class="pick-two">
              <b>{{ goal.title }}</b>
              <i>kuniga {{ goal.value }} ta soʼz</i>
            </span>
            <span class="radio" :class="{ on: answers.daily_goal === goal.value }"></span>
          </button>
        </template>

        <!-- Teacher -->
        <template v-else>
          <label class="ob-field">
            <span>USTOZ ID SI</span>
            <input v-model="teacherInput" placeholder="Masalan: TCHR-2381" autocomplete="off" />
          </label>
          <p v-if="teacherSent" class="ob-note">✓ Soʼrov yuborildi. Kutmasdan ham oʼrganishingiz mumkin.</p>
          <button
            class="btn btn-soft"
            style="margin-top: 12px"
            :disabled="teacherInput.trim().length < 4 || teacherSent"
            @click="sendTeacher"
          >
            {{ teacherSent ? 'Soʼrov yuborildi ✓' : 'Soʼrov yuborish' }}
          </button>
        </template>

        <p v-if="failure" class="ob-hint" style="color: var(--red)">{{ failure }}</p>
      </div>

      <div class="ob-foot">
        <button
          v-if="screen !== 'teacher'"
          class="btn btn-primary"
          :disabled="!canContinue"
          @click="next"
        >
          Davom etish
        </button>
        <template v-else>
          <button class="btn btn-primary" :disabled="saving" @click="finish">
            {{ saving ? 'Saqlanmoqda...' : 'Tayyor' }}
          </button>
          <button class="btn btn-ghost" :disabled="saving" @click="finish">
            Hozircha oʼzim oʼrganaman
          </button>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ob {
  background: var(--card);
}

.ob-screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--card);
}

.ob-screen.ob-center {
  padding: 22px;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.ob-grow {
  flex: 1;
  min-height: 12px;
}

.ob-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 22px 0;
  flex: none;
}

.ob-back {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: none;
  color: var(--ink);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  cursor: pointer;
}

.ob-track {
  flex: 1;
  height: 4px;
  border-radius: var(--r-pill);
  background: var(--line-3);
  overflow: hidden;
}

.ob-track > i {
  display: block;
  height: 100%;
  border-radius: var(--r-pill);
  background: var(--green);
  transition: width .3s;
}

.ob-count {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--faint);
}

.ob-hero {
  padding: 26px 22px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: none;
}

.hero-ic {
  width: 56px;
  height: 56px;
  border-radius: var(--r-lg);
  background: var(--green-soft);
  display: grid;
  place-items: center;
  margin-bottom: 8px;
}

.ob-title {
  font-family: 'Sora', sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
}

.ob-sub {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--muted);
}

.ob-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 22px 8px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.ob-foot {
  padding: 12px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: none;
}

/* --- pickers --- */

.pick {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 2px;
  border: none;
  border-bottom: 1px solid var(--wash);
  background: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  text-align: left;
}

.pick.boxed {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
}

.pick.boxed.on {
  border-color: var(--green);
  background: var(--wash-3);
}

.pick-label {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.pick-two {
  flex: 1;
}

.pick-two b {
  display: block;
  font-size: 14.5px;
  font-weight: 700;
}

.pick-two i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--faint);
}

.radio {
  width: 20px;
  height: 20px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--line-4);
  flex-shrink: 0;
  transition: border-width .1s;
}

.radio.on {
  border: 6px solid var(--green);
}

.flag-round {
  width: 22px;
  height: 22px;
  border-radius: var(--r-pill);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  outline: 1px solid rgba(22, 32, 26, .08);
  outline-offset: -1px;
  position: relative;
}

.flag-round i {
  flex: 1;
}

.flag-round b {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 8px;
  height: 8px;
  border-radius: var(--r-pill);
}

.badge {
  font-family: 'Sora', sans-serif;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  border: 1px solid var(--line);
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.pick.on .badge {
  border-color: var(--green);
  color: var(--green-dark);
}

.goal-num {
  font-family: 'Sora', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--faint);
  width: 40px;
  text-align: center;
  flex-shrink: 0;
}

.pick.on .goal-num {
  color: var(--green);
}

/* --- days --- */

.day-row {
  display: flex;
  gap: 7px;
  margin-top: 8px;
}

.day-cell {
  flex: 1;
  height: 48px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: none;
  color: var(--muted);
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.day-cell.on {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.ob-hint {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--faint);
  text-align: center;
  margin-top: 12px;
}

/* --- time --- */

.time-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}

.time-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px 14px;
  background: none;
  text-align: left;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
}

.time-card.on {
  border-color: var(--green);
  background: var(--wash-3);
}

.time-card b {
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}

.time-card span {
  font-size: 12px;
  font-weight: 600;
  color: var(--faint);
}

.custom-time {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}

.custom-time input {
  border: none;
  background: none;
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
}

/* --- teacher --- */

.ob-field span {
  display: block;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--faint);
  margin-bottom: 7px;
}

.ob-field input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  outline: none;
}

.ob-field input:focus {
  border-color: var(--green);
}

.ob-note {
  background: var(--green-soft);
  border: 1px solid var(--green-pale);
  color: var(--green-dark);
  border-radius: 12px;
  padding: 11px 13px;
  font-size: 12.5px;
  font-weight: 700;
  margin-top: 10px;
}

/* --- welcome & done --- */

.hello-cloud {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}

.hello-cloud span {
  background: var(--wash-2);
  border-radius: var(--r-pill);
  padding: 7px 15px;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}

.hello-cloud .alt {
  background: var(--green-soft);
  color: var(--green-dark);
}

.ob-wordmark {
  font-family: 'Sora', sans-serif;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -1px;
  margin-bottom: 10px;
}

.ob-wordmark b {
  color: var(--green);
}

.done-mark {
  font-size: 56px;
  text-align: center;
  margin-bottom: 6px;
}

.ob-summary {
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  margin: 20px 22px 0;
  overflow: hidden;
}

.ob-summary-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--wash);
  font-size: 13.5px;
  font-weight: 700;
}

.ob-summary-row:last-child {
  border-bottom: none;
}

.ob-summary-row span {
  color: var(--muted);
  font-weight: 600;
}

.ob-screen.ob-center .btn {
  max-width: 340px;
}
</style>
