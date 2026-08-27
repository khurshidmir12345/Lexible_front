<script setup>
import { computed, ref } from 'vue'
import LearnedWords from './LearnedWords.vue'
import ReferralSheet from '../sheets/ReferralSheet.vue'
import PremiumSheet from '../sheets/PremiumSheet.vue'
import Modal from '../ui/Modal.vue'
import { RowIcon, TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { LANGUAGES, TIMES, WEEKDAYS, languageName } from '../../lib/languages'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const user = computed(() => store.state.user)

const showLearned = ref(false)
const sheet = ref(null)   // 'referral' | 'premium'
const editing = ref(null)          // 'lang' | 'days' | 'time'
const draftLang = ref(null)
const draftDays = ref([])
const draftTime = ref(null)
const customTime = ref('')

const TITLES = { lang: 'Tilni tanlang', days: 'Yodlash kunlari', time: 'Eslatish vaqti' }

function openEdit(kind) {
  editing.value = kind
  draftLang.value = user.value.native_lang
  draftDays.value = [...(user.value.study_days ?? [])]
  draftTime.value = user.value.reminder_at
  customTime.value = ''
  telegram.haptic()
}

function toggleDraftDay(day) {
  draftDays.value = draftDays.value.includes(day)
    ? draftDays.value.filter((d) => d !== day)
    : [...draftDays.value, day]
}

async function save() {
  const patch =
    editing.value === 'lang'
      ? { native_lang: draftLang.value }
      : editing.value === 'days'
        ? { study_days: WEEKDAYS.filter((d) => draftDays.value.includes(d)) }
        : { reminder_at: customTime.value || draftTime.value }

  try {
    await store.updateSettings(patch)
    store.toast('✅ Saqlandi')
  } catch (error) {
    store.toast(error.message)
  } finally {
    editing.value = null
  }
}

const toggleDark = () => store.updateSettings({ dark_mode: !user.value.dark_mode })

/** The way back to the teacher side — App.vue swaps shells off `user.role`. */
const switchingRole = ref(false)

async function becomeTeacher() {
  switchingRole.value = true

  try {
    await store.setRole('teacher')
    telegram.notify('success')
  } catch (error) {
    store.toast(error.message)
  } finally {
    switchingRole.value = false
  }
}

/** null → 'warn' (what is lost) → 'confirm' (the point of no return) */
const closing = ref(null)
const impact = ref(null)
const deleting = ref(false)

async function openClose() {
  telegram.haptic()
  closing.value = 'warn'
  impact.value = null

  try {
    impact.value = (await api.accountImpact()).impact
  } catch (error) {
    store.toast(error.message)
  }
}

async function deleteAccount() {
  deleting.value = true

  try {
    await api.deleteAccount()
    telegram.notify('success')
    // Nothing of theirs is left to render, so the app cannot stay open.
    telegram.close()
    location.reload()
  } catch (error) {
    store.toast(error.message)
    deleting.value = false
    closing.value = null
  }
}

const daysLabel = computed(() => {
  const days = user.value.study_days ?? []
  return days.length ? `${days.length} kun` : 'tanlanmagan'
})

</script>

<template>
  <template v-if="user">
    <!-- Identity -->
    <div class="who">
      <img v-if="user.photo" class="avatar" :src="user.photo" alt="" />
      <div v-else class="avatar">{{ user.initial }}</div>
      <div style="flex: 1">
        <div class="name">{{ user.name }}</div>
        <div class="handle">{{ user.username ? '@' + user.username : 'Telegram hisobi' }}</div>
      </div>
      <span v-if="user.cefr_level" class="level">{{ user.cefr_level }}</span>
    </div>

    <div class="section">SOZLAMALAR</div>

    <div class="rows">
      <button class="v-row" @click="openEdit('lang')">
        <span class="v-row-ic" v-html="RowIcon.globe"></span>
        <span class="v-row-t">Til</span>
        <span class="v-row-v">{{ languageName(user.native_lang) }}</span>
        <span class="v-row-c" v-html="RowIcon.chevron"></span>
      </button>

      <button class="v-row" @click="openEdit('days')">
        <span class="v-row-ic" v-html="RowIcon.calendar"></span>
        <span class="v-row-t">Yodlash kunlari</span>
        <span class="v-row-v">{{ daysLabel }}</span>
        <span class="v-row-c" v-html="RowIcon.chevron"></span>
      </button>

      <button class="v-row" @click="openEdit('time')">
        <span class="v-row-ic" v-html="RowIcon.clock"></span>
        <span class="v-row-t">Eslatish vaqti</span>
        <span class="v-row-v">{{ user.reminder_at ?? 'tanlanmagan' }}</span>
        <span class="v-row-c" v-html="RowIcon.chevron"></span>
      </button>

      <div class="v-row">
        <span class="v-row-ic" v-html="RowIcon.moon"></span>
        <span class="v-row-t">Tungi rejim</span>
        <button class="v-switch" :class="{ on: user.dark_mode }" @click="toggleDark"><i></i></button>
      </div>

      <button class="v-row" @click="showLearned = true">
        <span class="v-row-ic" v-html="RowIcon.book"></span>
        <span class="v-row-t">Yodlangan soʼzlar</span>
        <span class="v-row-v">{{ user.words_learned }} ta</span>
        <span class="v-row-c" v-html="RowIcon.chevron"></span>
      </button>

      <button class="v-row" @click="sheet = 'referral'">
        <span class="v-row-ic" v-html="RowIcon.gift"></span>
        <span class="v-row-t">Doʼstlarni taklif qilish</span>
        <span class="v-row-v gold">+50 tanga</span>
        <span class="v-row-c" v-html="RowIcon.chevron"></span>
      </button>

      <!--
        The role choice must not be a one-way door: someone who has taught
        before keeps their paths and groups, and anyone else can start.
      -->
      <button class="v-row" :disabled="switchingRole" @click="becomeTeacher">
        <span class="v-row-ic" v-html="TeacherIcon.board"></span>
        <span class="v-row-t">
          {{ user.has_teaching ? 'Ustoz rejimiga qaytish' : 'Ustoz boʼlish' }}
        </span>
        <span class="v-row-c" v-html="RowIcon.chevron"></span>
      </button>
    </div>

    <!-- Premium -->
    <button class="premium" @click="sheet = 'premium'">
      <span class="premium-ic" v-html="RowIcon.spark"></span>
      <span style="flex: 1; text-align: left">
        <b>Lexible Premium</b>
        <i>AI talaffuz · cheksiz soʼzlar</i>
      </span>
      <span class="v-row-c" style="color: rgba(255,255,255,.6)" v-html="RowIcon.chevron"></span>
    </button>

    <div class="section danger">HISOB</div>

    <div class="rows">
      <button class="v-row danger-row" @click="openClose">
        <span class="v-row-ic danger-ic" v-html="RowIcon.trash"></span>
        <span class="v-row-t">Akkauntni oʼchirish</span>
        <span class="v-row-c" v-html="RowIcon.chevron"></span>
      </button>
    </div>

    <Teleport to="#lx-overlays">
      <LearnedWords v-if="showLearned" @close="showLearned = false" />
      <ReferralSheet v-if="sheet === 'referral'" @close="sheet = null" />
      <PremiumSheet v-if="sheet === 'premium'" @close="sheet = null" />
    </Teleport>

    <Teleport to="#lx-overlays">
    <Modal :open="Boolean(editing)" :title="TITLES[editing]">
      <div v-if="editing === 'lang'" class="choices">
        <button
          v-for="language in LANGUAGES"
          :key="language.code"
          class="v-choice"
          :class="{ sel: draftLang === language.code }"
          @click="draftLang = language.code"
        >
          {{ language.name }}
        </button>
      </div>

      <div v-else-if="editing === 'days'" class="day-grid">
        <button
          v-for="day in WEEKDAYS"
          :key="day"
          class="v-day-pill"
          :class="{ sel: draftDays.includes(day) }"
          @click="toggleDraftDay(day)"
        >
          {{ day }}
        </button>
      </div>

      <div v-else-if="editing === 'time'">
        <div class="choices" style="flex-direction: row; flex-wrap: wrap">
          <button
            v-for="time in TIMES"
            :key="time.value"
            class="v-choice"
            style="flex: 1 1 40%"
            :class="{ sel: draftTime === time.value && !customTime }"
            @click="(draftTime = time.value), (customTime = '')"
          >
            {{ time.value }}
          </button>
        </div>
        <label class="custom-time">
          <span>Boshqa vaqt</span>
          <input v-model="customTime" type="time" />
        </label>
      </div>

      <template #actions>
        <button class="btn btn-soft" @click="editing = null">Bekor</button>
        <button class="btn btn-primary" @click="save">Saqlash</button>
      </template>
    </Modal>

    <Modal :open="closing === 'warn'" title="Akkauntni oʼchirish">
      <p class="dz-lead">Oʼchirilgandan keyin bu maʼlumotlar qaytmaydi:</p>

      <ul class="dz-list">
        <li><b>{{ impact?.words_learned ?? user.words_learned }}</b> ta yodlangan soʼz</li>
        <li><b>{{ impact?.coins ?? user.coins }}</b> tanga va premium holati</li>
        <li><b>{{ impact?.streak_days ?? user.streak_days }}</b> kunlik seriya va butun xarita</li>
      </ul>

      <p v-if="impact?.groups_taught" class="dz-warn">
        Siz ustozsiz: <b>{{ impact.groups_taught }}</b> ta guruh va ularning yoʼllari ham
        oʼchadi — <b>{{ impact.students_affected }}</b> ta oʼquvchi bosqichlarini yoʼqotadi.
      </p>

      <template #actions>
        <button class="btn btn-soft" @click="closing = null">Bekor</button>
        <button class="btn btn-danger" @click="closing = 'confirm'">Davom etish</button>
      </template>
    </Modal>

    <Modal :open="closing === 'confirm'" title="Aniqmi?">
      <p class="dz-final">
        Bu amalni ortga qaytarib boʼlmaydi. Telegram orqali qayta kirsangiz,
        hammasi noldan boshlanadi.
      </p>

      <template #actions>
        <button class="btn btn-soft" @click="closing = null">Yoʼq, qolsin</button>
        <button class="btn btn-danger" :disabled="deleting" @click="deleteAccount">
          {{ deleting ? 'Oʼchirilmoqda…' : 'Ha, oʼchirilsin' }}
        </button>
      </template>
    </Modal>
    </Teleport>
  </template>
</template>

<style scoped>
.who {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 16px;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: var(--r-lg);
  background: var(--green-soft);
  color: var(--green-dark);
  display: grid;
  place-items: center;
  font-family: 'Sora', sans-serif;
  font-size: 22px;
  font-weight: 700;
  object-fit: cover;
  flex: none;
}

.name {
  font-family: 'Sora', sans-serif;
  font-size: 17px;
  font-weight: 700;
}

.handle {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.level {
  background: var(--green-soft);
  color: var(--green-dark);
  border-radius: var(--r-sm);
  padding: 5px 9px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
}

.section {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--faint);
  margin: 8px 0 -2px 4px;
}

.rows {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.v-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 16px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--wash);
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}

.v-row:last-child {
  border-bottom: none;
}

.v-row-ic {
  width: 34px;
  height: 34px;
  border-radius: var(--r-md);
  background: var(--wash-2);
  color: var(--ink);
  display: grid;
  place-items: center;
  flex: none;
}

.v-row-t {
  flex: 1;
}

.v-row-v {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}

.v-row-v.gold {
  color: var(--gold);
}

.v-row-c {
  color: var(--faint);
  display: grid;
  place-items: center;
}

.v-switch {
  width: 40px;
  height: 24px;
  border-radius: var(--r-pill);
  background: #E1E7E1;
  border: none;
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
  transition: background .15s;
}

.v-switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: var(--r-pill);
  background: #fff;
  box-shadow: 0 1px 3px rgba(22, 32, 26, .25);
  transition: transform .15s;
}

.v-switch.on {
  background: var(--green);
}

.v-switch.on i {
  transform: translateX(16px);
}

.premium {
  display: flex;
  align-items: center;
  gap: 13px;
  background: var(--ink);
  border: none;
  border-radius: var(--r-lg);
  padding: 16px;
  color: #fff;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
}

.premium-ic {
  width: 40px;
  height: 40px;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, .1);
  display: grid;
  place-items: center;
  flex: none;
}

.premium b {
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 700;
}

.premium i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, .6);
  margin-top: 2px;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.v-choice {
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: var(--r-md);
  padding: 12px 14px;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
}

.v-choice.sel {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green-dark);
}

.day-grid {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.v-day-pill {
  flex: 1;
  aspect-ratio: 1;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: var(--r-md);
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 800;
  color: var(--ink);
  cursor: pointer;
}

.v-day-pill.sel {
  border-color: var(--green);
  background: var(--green);
  color: #fff;
}

.custom-time {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  background: var(--wash-2);
  border-radius: var(--r-md);
  padding: 12px 14px;
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

/* ------------------------------------------------------------ danger zone */

.section.danger {
  color: var(--red);
}

.danger-row .v-row-t {
  color: var(--red);
}

.danger-ic {
  background: var(--red-soft);
  color: var(--red);
  border-color: var(--red-line);
}

.dz-lead {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 6px;
}

.dz-list {
  list-style: none;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dz-list li {
  position: relative;
  padding: 11px 14px 11px 30px;
  border-radius: var(--r-md);
  background: var(--red-soft);
  border: 1px solid var(--red-line);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.dz-list li::before {
  content: '';
  position: absolute;
  left: 14px;
  top: 50%;
  width: 5px;
  height: 5px;
  margin-top: -2.5px;
  border-radius: 50%;
  background: var(--red);
}

.dz-list b {
  font-weight: 800;
}

.dz-warn {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: var(--red-soft);
  border: 1px solid var(--red-line);
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.55;
  color: var(--red-dark);
}

.dz-final {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.6;
  color: var(--muted);
  margin-top: 6px;
}

.btn-danger:disabled {
  opacity: .55;
  pointer-events: none;
}
</style>
