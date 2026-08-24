<script setup>
import { computed, ref } from 'vue'
import LearnedWords from './LearnedWords.vue'
import Modal from '../ui/Modal.vue'
import { Ic } from '../../lib/icons'
import { LANGUAGES, TIMES, WEEKDAYS, languageName } from '../../lib/languages'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const user = computed(() => store.state.user)

const showLearned = ref(false)
const editing = ref(null)     // 'lang' | 'days' | 'time'
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

async function toggleDark() {
  await store.updateSettings({ dark_mode: !user.value.dark_mode })
}

const daysLabel = computed(() =>
  user.value.study_days?.length ? user.value.study_days.join(', ') : 'tanlanmagan',
)
</script>

<template>
  <div v-if="user">
    <div class="pcard">
      <img v-if="user.photo" class="pav" :src="user.photo" alt="" style="object-fit: cover" />
      <div v-else class="pav">{{ user.initial }}</div>
      <div>
        <div class="pname">{{ user.name }}</div>
        <div class="pphone">{{ user.username ? '@' + user.username : 'Telegram hisobi' }}</div>
      </div>
      <span v-if="user.cefr_level" class="plevel">{{ user.cefr_level }}</span>
    </div>

    <div class="psec">Yodlash</div>

    <div class="prow" @click="showLearned = true">
      <div class="ic" v-html="Ic.book"></div>
      <div class="pt">
        <b>Yodlangan soʼzlar</b>
        <span>{{ user.words_learned }} ta soʼz toʼplandi</span>
      </div>
      <div class="chev" v-html="Ic.chev"></div>
    </div>

    <div class="psec">Sozlamalar</div>

    <div class="prow" @click="openEdit('lang')">
      <div class="ic" v-html="Ic.globe"></div>
      <div class="pt"><b>Til</b><span>{{ languageName(user.native_lang) }}</span></div>
      <div class="chev" v-html="Ic.chev"></div>
    </div>

    <div class="prow" @click="openEdit('days')">
      <div class="ic" v-html="Ic.cal"></div>
      <div class="pt"><b>Yodlash kunlari</b><span>{{ daysLabel }}</span></div>
      <div class="chev" v-html="Ic.chev"></div>
    </div>

    <div class="prow" @click="openEdit('time')">
      <div class="ic" v-html="Ic.clock"></div>
      <div class="pt"><b>Eslatish vaqti</b><span>{{ user.reminder_at ?? 'tanlanmagan' }}</span></div>
      <div class="chev" v-html="Ic.chev"></div>
    </div>

    <div class="prow">
      <div class="ic" v-html="Ic.target"></div>
      <div class="pt"><b>Kunlik maqsad</b><span>{{ user.daily_goal }} soʼz</span></div>
    </div>

    <div class="prow">
      <div class="ic" v-html="Ic.moon"></div>
      <div class="pt"><b>Tungi rejim</b><span>Dark mode</span></div>
      <div class="switch" :class="{ on: user.dark_mode }" @click="toggleDark"></div>
    </div>

    <!-- The prototype had a password row here; Telegram owns the account now. -->

    <LearnedWords v-if="showLearned" @close="showLearned = false" />

    <Modal :open="Boolean(editing)" :title="TITLES[editing]">
      <div v-if="editing === 'lang'" style="margin-top: 8px">
        <button
          v-for="language in LANGUAGES"
          :key="language.code"
          class="opt2"
          :class="{ sel: draftLang === language.code }"
          @click="draftLang = language.code"
        >
          {{ language.name }}
        </button>
      </div>

      <div v-else-if="editing === 'days'" class="days2" style="margin-top: 8px">
        <button
          v-for="day in WEEKDAYS"
          :key="day"
          class="day2"
          :class="{ sel: draftDays.includes(day) }"
          @click="toggleDraftDay(day)"
        >
          {{ day }}
        </button>
      </div>

      <div v-else-if="editing === 'time'" style="margin-top: 8px">
        <div class="times2">
          <button
            v-for="time in TIMES"
            :key="time.value"
            class="t2"
            :class="{ sel: draftTime === time.value && !customTime }"
            @click="(draftTime = time.value), (customTime = '')"
          >
            {{ time.value }}
          </button>
        </div>
        <label class="custom" style="margin-top: 10px">
          <span>Boshqa vaqt</span>
          <input v-model="customTime" type="time" />
        </label>
      </div>

      <template #actions>
        <button class="btn btn-soft" @click="editing = null">Bekor</button>
        <button class="btn btn-primary" @click="save">Saqlash</button>
      </template>
    </Modal>
  </div>
</template>
