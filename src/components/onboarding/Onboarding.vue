<script setup>
import { computed, ref } from 'vue'
import Mascot from '../ui/Mascot.vue'
import { GOALS, LANGUAGES, LEVELS, TIMES, WEEKDAYS } from '../../lib/languages'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

// The prototype opened with name/phone/password screens. Telegram already
// tells us who the player is, so onboarding starts at the first real question.
const SCREENS = ['welcome', 'lang', 'days', 'time', 'level', 'goal', 'teacher', 'done']
const QUESTIONS = ['lang', 'days', 'time', 'level', 'goal']

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

const progress = computed(() => {
  const index = QUESTIONS.indexOf(screen.value)
  return index === -1 ? 100 : Math.round(((index + 1) / QUESTIONS.length) * 100)
})

function go(next) {
  screen.value = next
  telegram.haptic()
}

function back() {
  const index = SCREENS.indexOf(screen.value)
  if (index > 0) go(SCREENS[index - 1])
}

function pickLang(code) {
  answers.value.native_lang = code
  telegram.haptic()
}

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

function pickCustomTime(event) {
  if (!event.target.value) return
  answers.value.reminder_at = event.target.value
}

const daysHint = computed(() =>
  answers.value.study_days.length
    ? `${answers.value.study_days.length} kun tanlandi`
    : 'Kamida bitta kun tanlang',
)

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
    ['Kunlar', answers.value.study_days.length ? orderedDays().join(', ') : '—'],
    ['Eslatish', answers.value.reminder_at ?? '—'],
    ['Kunlik maqsad', `${answers.value.daily_goal ?? '—'} soʼz`],
    ['Ustoz', answers.value.teacher_code ? `soʼrov: ${answers.value.teacher_code}` : 'mustaqil'],
  ]
})

/** Keep the summary in weekday order however the player tapped them. */
function orderedDays() {
  return WEEKDAYS.filter((d) => answers.value.study_days.includes(d))
}

async function finish() {
  saving.value = true
  failure.value = null

  try {
    await store.completeOnboarding({
      ...answers.value,
      study_days: orderedDays(),
    })
    telegram.notify('success')
    go('done')
  } catch (error) {
    failure.value = error.message
    telegram.notify('error')
  } finally {
    saving.value = false
  }
}

const emit = defineEmits(['enter'])
</script>

<template>
  <div class="view active">
    <!-- WELCOME -->
    <section class="screen" :class="{ active: screen === 'welcome' }">
      <div class="center">
        <Mascot />
        <div class="wordmark">Lexi<b>ble</b></div>
        <h1 style="margin-top: 18px">Soʼzlarni oʼyin orqali yodlang</h1>
        <p class="sub">
          Har kuni bir necha yangi soʼz. Roud map boʼylab koʼtarilib, ingliz tilini mustahkamlang.
        </p>
      </div>
      <div class="stack">
        <button class="btn btn-primary" @click="go('lang')">Boshlash</button>
      </div>
    </section>

    <!-- LANGUAGE -->
    <section class="screen" :class="{ active: screen === 'lang' }">
      <div class="topbar">
        <button class="back" @click="back">‹</button>
        <div class="progress"><i :style="{ width: progress + '%' }"></i></div>
      </div>
      <h1>Soʼzlar qaysi tilga tarjima qilinsin?</h1>
      <p class="sub">Ona tilingizni tanlang. Keyin sozlamalardan oʼzgartirasiz.</p>
      <div class="grid">
        <button
          v-for="language in LANGUAGES"
          :key="language.code"
          class="opt"
          :class="{ sel: answers.native_lang === language.code }"
          @click="pickLang(language.code)"
        >
          <span v-html="language.flag"></span> {{ language.name }}
        </button>
      </div>
      <div class="grow"></div>
      <button class="btn btn-primary" :disabled="!answers.native_lang" @click="go('days')">
        Davom etish
      </button>
    </section>

    <!-- DAYS -->
    <section class="screen" :class="{ active: screen === 'days' }">
      <div class="topbar">
        <button class="back" @click="back">‹</button>
        <div class="progress"><i :style="{ width: progress + '%' }"></i></div>
      </div>
      <h1>Qaysi kunlari yodlaysiz?</h1>
      <p class="sub">Tanlangan kunlarda dastur eslatma yuboradi.</p>
      <div class="days">
        <button
          v-for="day in WEEKDAYS"
          :key="day"
          class="day"
          :class="{ sel: answers.study_days.includes(day) }"
          @click="toggleDay(day)"
        >
          {{ day }}
        </button>
      </div>
      <p class="hint">{{ daysHint }}</p>
      <div class="grow"></div>
      <button class="btn btn-primary" :disabled="!answers.study_days.length" @click="go('time')">
        Davom etish
      </button>
    </section>

    <!-- TIME -->
    <section class="screen" :class="{ active: screen === 'time' }">
      <div class="topbar">
        <button class="back" @click="back">‹</button>
        <div class="progress"><i :style="{ width: progress + '%' }"></i></div>
      </div>
      <h1>Qachon eslataylik?</h1>
      <p class="sub">Tanlangan kunlarda shu vaqtda eslatma keladi.</p>
      <div class="times">
        <button
          v-for="time in TIMES"
          :key="time.value"
          class="tcard"
          :class="{ sel: answers.reminder_at === time.value && !customTime }"
          @click="pickTime(time.value)"
        >
          <span class="tt">{{ time.value }}</span>
          <span class="tl">{{ time.label }}</span>
        </button>
      </div>
      <label class="custom">
        <span>Boshqa vaqt</span>
        <input v-model="customTime" type="time" @change="pickCustomTime" />
      </label>
      <div class="grow"></div>
      <button class="btn btn-primary" :disabled="!answers.reminder_at" @click="go('level')">
        Davom etish
      </button>
    </section>

    <!-- LEVEL -->
    <section class="screen" :class="{ active: screen === 'level' }">
      <div class="topbar">
        <button class="back" @click="back">‹</button>
        <div class="progress"><i :style="{ width: progress + '%' }"></i></div>
      </div>
      <h1>Hozirgi darajangiz?</h1>
      <p class="sub">Sizga mos soʼzlardan boshlaymiz. Keyin oʼzgaradi.</p>
      <div class="list">
        <button
          v-for="level in LEVELS"
          :key="level.code"
          class="item"
          :class="{ sel: answers.cefr_level === level.code }"
          @click="answers.cefr_level = level.code"
        >
          <span class="cef">{{ level.code }}</span>
          <span class="t">{{ level.value }}<small>{{ level.hint }}</small></span>
        </button>
      </div>
      <div class="grow"></div>
      <button class="btn btn-primary" :disabled="!answers.cefr_level" @click="go('goal')">
        Davom etish
      </button>
    </section>

    <!-- GOAL -->
    <section class="screen" :class="{ active: screen === 'goal' }">
      <div class="topbar">
        <button class="back" @click="back">‹</button>
        <div class="progress"><i :style="{ width: progress + '%' }"></i></div>
      </div>
      <h1>Kunlik maqsadingiz?</h1>
      <p class="sub">Har kuni shuncha yangi soʼz. Istalgan vaqt oʼzgartirasiz.</p>
      <div class="list">
        <button
          v-for="goal in GOALS"
          :key="goal.value"
          class="item"
          :class="{ sel: answers.daily_goal === goal.value }"
          @click="answers.daily_goal = goal.value"
        >
          <span class="n">{{ goal.value }}</span>
          <span class="t">{{ goal.title }}<small>kuniga {{ goal.value }} ta soʼz</small></span>
        </button>
      </div>
      <div class="grow"></div>
      <button class="btn btn-primary" :disabled="!answers.daily_goal" @click="go('teacher')">
        Davom etish
      </button>
    </section>

    <!-- TEACHER -->
    <section class="screen" :class="{ active: screen === 'teacher' }">
      <div class="topbar">
        <button class="back" @click="back">‹</button>
        <div class="progress"><i style="width: 100%"></i></div>
      </div>
      <h1>Ustozingiz bormi?</h1>
      <p class="sub">Ustoz ID sini kiritsangiz, uning kurslariga qoʼshilish soʼrovi yuboriladi.</p>
      <div class="field">
        <label>Ustoz ID si</label>
        <input v-model="teacherInput" placeholder="Masalan: TCHR-2381" autocomplete="off" />
      </div>
      <div class="note" :class="{ show: teacherSent }">
        ✓ Soʼrov yuborildi. Ustoz tasdiqlashini kutmasdan ham oʼrganishingiz mumkin.
      </div>
      <button
        class="btn btn-blue"
        style="margin-top: 14px"
        :disabled="teacherInput.trim().length < 4 || teacherSent"
        @click="sendTeacher"
      >
        {{ teacherSent ? 'Soʼrov yuborildi ✓' : 'Soʼrov yuborish' }}
      </button>

      <p v-if="failure" class="hint" style="color: var(--red)">{{ failure }}</p>

      <div class="grow"></div>
      <button class="btn btn-primary" :disabled="saving" @click="finish">
        {{ saving ? 'Saqlanmoqda...' : 'Tayyor' }}
      </button>
      <button class="btn btn-ghost" :disabled="saving" @click="finish">
        Hozircha oʼzim oʼrganaman
      </button>
    </section>

    <!-- DONE -->
    <section class="screen" :class="{ active: screen === 'done' }">
      <div class="center">
        <Mascot celebrating />
        <h1 style="margin-top: 18px">Tayyor, {{ firstName }}! 🎉</h1>
        <p class="sub">Birinchi kategoriyangizni yarating va yodlashni boshlang.</p>
        <div class="summary">
          <div v-for="[label, value] in summary" :key="label" class="li">
            <span>{{ label }}</span><b>{{ value }}</b>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" @click="emit('enter')">Yoʼlni boshlash</button>
    </section>
  </div>
</template>
