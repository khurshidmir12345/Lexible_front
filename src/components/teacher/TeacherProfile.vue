<script setup>
/** UT-09 «Profil» — who the teacher is, the ID a class joins by, their
 *  numbers, the current plan, and the settings that apply to teaching. */
import { computed, onMounted, ref } from 'vue'
import Modal from '../ui/Modal.vue'
import { LANGUAGES } from '../../lib/languages'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['open-plan'])

const stats = ref(null)
const loading = ref(true)
const picking = ref(false)
const switching = ref(false)

const user = computed(() => store.state.user)
const language = computed(
  () => LANGUAGES.find((l) => l.code === user.value?.native_lang)?.name ?? 'Oʼzbekcha',
)

/** "50 000" — a space, the way prices are written in Uzbek. */
const money = (value) => String(value ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')

async function load() {
  loading.value = true

  try {
    stats.value = await api.teacher.profile()
  } catch (error) {
    store.toast(error.message)
  } finally {
    loading.value = false
  }
}

function copyRef() {
  if (!stats.value?.teacher_ref) return

  telegram.copy(stats.value.teacher_ref)
  telegram.haptic()
  store.toast('🔗 Ustoz ID nusxalandi')
}

async function setLanguage(code) {
  try {
    await store.updateSettings({ native_lang: code })
    picking.value = false
  } catch (error) {
    store.toast(error.message)
  }
}

async function toggleDark() {
  try {
    await store.updateSettings({ dark_mode: !user.value.dark_mode })
  } catch (error) {
    store.toast(error.message)
  }
}

async function becomeStudent() {
  switching.value = true

  try {
    await store.setRole('student')
    store.toast('Oʼquvchi rejimiga oʼtdingiz')
  } catch (error) {
    store.toast(error.message)
  } finally {
    switching.value = false
  }
}

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div class="scroll" v-if="user">
    <!-- Identity -->
    <div class="t-card who">
      <span class="avatar">
        <img v-if="user.photo" :src="user.photo" alt="" />
        <template v-else>{{ user.initial }}</template>
      </span>
      <span class="who-text">
        <b>{{ user.name }}</b>
        <i>{{ user.username ? '@' + user.username : 'Telegram hisobi' }}</i>
      </span>
    </div>

    <!-- Teacher ID -->
    <button v-if="stats?.teacher_ref" class="t-code" @click="copyRef">
      <span class="t-code-main">
        <span class="t-label">USTOZ ID — oʼquvchilar shu bilan qoʼshiladi</span>
        <b>{{ stats.teacher_ref }}</b>
      </span>
      <span class="t-copy"><span v-html="TeacherIcon.copy"></span> Nusxa</span>
    </button>

    <!-- Numbers -->
    <div class="stats">
      <div class="t-card stat"><b class="v-num">{{ stats?.paths ?? 0 }}</b><i>Yoʼl</i></div>
      <div class="t-card stat"><b class="v-num">{{ stats?.groups ?? 0 }}</b><i>Guruh</i></div>
      <div class="t-card stat"><b class="v-num">{{ stats?.students ?? 0 }}</b><i>Oʼquvchi</i></div>
    </div>

    <!-- Plan -->
    <button v-if="stats?.plan" class="t-card ink plan" @click="emit('open-plan')">
      <span class="plan-ic" v-html="TeacherIcon.star"></span>
      <span class="plan-text">
        <b>Joriy tarif — {{ stats.plan.seats }} oʼquvchi</b>
        <i>
          {{ stats.plan.price ? `${money(stats.plan.price)} soʼm/oy · ` : 'Tekin · ' }}
          {{ stats.plan.seats_used }}/{{ stats.plan.seats }} band
        </i>
      </span>
      <span class="plan-cta">Boshqarish</span>
    </button>

    <!-- Settings -->
    <div class="t-section"><span class="t-label">SOZLAMALAR</span></div>

    <div class="t-rows">
      <button class="t-row" @click="picking = true">
        <span class="row-ic" v-html="TeacherIcon.globe"></span>
        <span class="t-row-text"><b>Til</b></span>
        <span class="value">{{ language }}</span>
        <span class="chev" v-html="TeacherIcon.chevron"></span>
      </button>

      <div class="t-row">
        <span class="row-ic" v-html="TeacherIcon.moon"></span>
        <span class="t-row-text"><b>Tungi rejim</b></span>
        <button class="switch" :class="{ on: user.dark_mode }" aria-label="Tungi rejim" @click="toggleDark"></button>
      </div>

      <button class="t-row" :disabled="switching" @click="becomeStudent">
        <span class="row-ic" v-html="TeacherIcon.student"></span>
        <span class="t-row-text">
          <b>Oʼquvchi rejimiga oʼtish</b>
          <i>yoʼl va guruhlaringiz saqlanib qoladi</i>
        </span>
        <span class="chev" v-html="TeacherIcon.chevron"></span>
      </button>
    </div>

    <p class="t-more foot">Ustoz rejimiga profildan istalgan vaqt qaytasiz.</p>

    <Teleport to="#lx-overlays">
      <Modal :open="picking" title="Til" text="Ilova va tarjimalar tili.">
        <div class="langs">
          <button
            v-for="lang in LANGUAGES"
            :key="lang.code"
            class="lang"
            :class="{ on: user.native_lang === lang.code }"
            @click="setLanguage(lang.code)"
          >
            <span class="flag" :style="{ background: lang.stripes[0] }">
              <i v-for="(stripe, i) in lang.stripes.slice(1)" :key="i" :style="{ background: stripe }"></i>
            </span>
            <b>{{ lang.name }}</b>
            <span class="radio" :class="{ on: user.native_lang === lang.code }"></span>
          </button>
        </div>
        <template #actions>
          <button class="btn btn-soft" @click="picking = false">Yopish</button>
        </template>
      </Modal>
    </Teleport>
  </div>
</template>

<style scoped>
.who { display: flex; align-items: center; gap: 14px; }

.avatar {
  width: 54px;
  height: 54px;
  border-radius: var(--r-pill);
  background: var(--ink);
  color: var(--card);
  display: grid;
  place-items: center;
  font-family: 'Sora', sans-serif;
  font-size: 20px;
  font-weight: 700;
  flex: none;
  overflow: hidden;
}

.app.dark .avatar { background: var(--green); color: #06120B; }

.avatar img { width: 100%; height: 100%; object-fit: cover; }

.who-text { flex: 1; min-width: 0; }
.who-text b { display: block; font-family: 'Sora', sans-serif; font-size: 16.5px; font-weight: 700; }
.who-text i {
  display: block;
  font-style: normal;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

/* ------------------------------------------------------------------ stats */

.stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }

.stat { padding: 13px; text-align: center; }
.stat b { display: block; font-size: 20px; }
.stat i {
  display: block;
  font-style: normal;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  margin-top: 2px;
}

/* ------------------------------------------------------------------- plan */

.plan {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  padding: 15px 16px;
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
}

.plan-ic {
  width: 40px;
  height: 40px;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, .1);
  color: var(--gold-mid);
  display: grid;
  place-items: center;
  flex: none;
}

.plan-text { flex: 1; min-width: 0; }
.plan-text b { display: block; font-family: 'Sora', sans-serif; font-size: 14.5px; font-weight: 700; }
.plan-text i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, .55);
  margin-top: 2px;
}

.plan-cta { font-size: 12px; font-weight: 800; color: var(--green-bright); flex: none; }

/* --------------------------------------------------------------- settings */

.t-row { padding: 14px 16px; }
.t-row:disabled { opacity: .6; }

.row-ic { color: var(--muted); display: grid; place-items: center; flex: none; }

.t-row-text b { font-size: 14.5px; font-weight: 700; }

.value { font-size: 13px; font-weight: 600; color: var(--faint); flex: none; }
.chev { color: var(--line-4); display: grid; place-items: center; flex: none; }

.switch {
  width: 40px;
  height: 24px;
  border-radius: var(--r-pill);
  background: var(--line-3);
  border: none;
  position: relative;
  flex: none;
  cursor: pointer;
  transition: background .15s;
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: var(--r-pill);
  background: var(--card);
  box-shadow: 0 1px 3px rgba(22, 32, 26, .2);
  transition: transform .15s;
}

.switch.on { background: var(--green); }
.switch.on::after { transform: translateX(16px); }

.foot { padding: 4px 10px 10px; }

/* ------------------------------------------------------------- languages */

.langs { display: flex; flex-direction: column; gap: 9px; margin-top: 14px; }

.lang {
  display: flex;
  align-items: center;
  gap: 13px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px 15px;
  background: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  color: var(--ink);
}

.lang.on { border: 1.5px solid var(--green); background: var(--wash-3); }
.lang b { flex: 1; text-align: left; font-size: 14.5px; font-weight: 700; }

.flag {
  width: 22px;
  height: 22px;
  border-radius: var(--r-pill);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: none;
}

.flag i { flex: 1; }

.radio {
  width: 20px;
  height: 20px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--line-4);
  flex: none;
}

.radio.on { border: 6px solid var(--green); }
</style>
