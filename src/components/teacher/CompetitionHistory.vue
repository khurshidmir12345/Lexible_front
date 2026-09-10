<script setup>
/**
 * Every game the teacher has run — for one class, or across all of them.
 *
 * A lobby or a round still running is listed on top as a door back in: the
 * teacher who closed the screen while the class was waiting finds it here.
 * A finished game opens its board.
 */
import { computed, onMounted, ref } from 'vue'
import CompetitionLobby from '../competition/CompetitionLobby.vue'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  /** Null lists every game the teacher has run. */
  groupId: { type: Number, default: null },
})

const emit = defineEmits(['close'])

const rows = ref([])
const loading = ref(true)
const open = ref(null)

const live = computed(() => rows.value.filter((r) => r.live))
const past = computed(() => rows.value.filter((r) => !r.live))

const STATUS = {
  lobby: 'Lobbi ochiq',
  playing: 'Oʼynalmoqda',
  finished: 'Yakunlangan',
}

const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']

/** "bugun 12:05", "kecha 18:40", "27 avg 10:37". */
function when(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)

  if (date.toDateString() === today.toDateString()) return `bugun ${time}`
  if (date.toDateString() === yesterday.toDateString()) return `kecha ${time}`

  const year = date.getFullYear() === today.getFullYear() ? '' : ` ${date.getFullYear()}`
  return `${date.getDate()} ${MONTHS[date.getMonth()]}${year} ${time}`
}

async function load() {
  loading.value = true

  try {
    rows.value = (await api.teacher.competitions(props.groupId)).competitions
  } catch (error) {
    store.toast(error.message)
  } finally {
    loading.value = false
  }
}

function enter(row) {
  telegram.haptic()
  open.value = row
}

onMounted(load)
</script>

<template>
  <div class="overlay show history">
    <header class="t-head">
      <button class="t-back" aria-label="Orqaga" @click="emit('close')">
        <span class="flip" v-html="TeacherIcon.chevron"></span>
      </button>
      <div class="t-head-main">
        <h1>Oʼyinlar tarixi</h1>
        <p>{{ rows.length }} ta oʼyin</p>
      </div>
    </header>

    <div class="t-body">
      <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

      <template v-else>
        <template v-if="live.length">
          <div class="t-section"><span class="t-label">HOZIR DAVOM ETMOQDA</span></div>
          <button v-for="row in live" :key="row.id" class="game live" @click="enter(row)">
            <span class="dot"></span>
            <span class="game-text">
              <b>{{ row.group ?? 'Ochiq oʼyin' }}<template v-if="row.stage"> · {{ row.stage }}-bosqich</template></b>
              <i>{{ STATUS[row.status] }} · {{ row.participants }} oʼquvchi · {{ when(row.created_at) }}</i>
            </span>
            <span class="cta">Kirish</span>
          </button>
        </template>

        <div class="t-section"><span class="t-label">OʼTKAZILGAN OʼYINLAR</span></div>

        <button v-for="row in past" :key="row.id" class="game" @click="enter(row)">
          <span class="cup" v-html="TeacherIcon.trophy"></span>
          <span class="game-text">
            <b>{{ row.group ?? 'Ochiq oʼyin' }}<template v-if="row.stage"> · {{ row.stage }}-bosqich</template></b>
            <i>
              {{ when(row.finished_at ?? row.created_at) }} · {{ row.participants }} ishtirokchi
              <template v-if="row.duration_minutes"> · {{ row.duration_minutes }} daq</template>
            </i>
            <i v-if="row.winner" class="winner">
              🥇 {{ row.winner.name }} — {{ row.winner.score }}/{{ row.winner.total }} · {{ row.winner.duration }}
            </i>
          </span>
          <span class="chev" v-html="TeacherIcon.chevron"></span>
        </button>

        <div v-if="!rows.length" class="t-empty">
          <span class="t-empty-ic" v-html="TeacherIcon.trophy"></span>
          <h3>Hali oʼyin oʼtkazilmagan</h3>
          <p>Bosqichni oching va «Oʼyin boshlash»ni bosing — natijalar shu yerda qoladi.</p>
        </div>
      </template>
    </div>

    <CompetitionLobby
      v-if="open"
      :competition-id="open.id"
      :group-id="open.group_id"
      :stage-id="open.stage_id"
      @close="() => { open = null; load() }"
    />
  </div>
</template>

<style scoped>
.history { background: var(--canvas); z-index: 26; }

.flip { display: grid; place-items: center; transform: rotate(180deg); }

.game {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 13px 15px;
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
  color: var(--ink);
}

.game.live { border: 1.5px solid var(--blue); background: var(--blue-soft); }

.dot {
  width: 10px;
  height: 10px;
  border-radius: var(--r-pill);
  background: var(--blue);
  flex: none;
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(36, 128, 182, .45); }
  60% { box-shadow: 0 0 0 7px rgba(36, 128, 182, 0); }
}

.cup {
  width: 38px;
  height: 38px;
  border-radius: var(--r-md);
  background: var(--gold-soft);
  color: var(--gold);
  display: grid;
  place-items: center;
  flex: none;
}

.game-text { flex: 1; min-width: 0; }
.game-text b { display: block; font-size: 14px; font-weight: 800; }
.game-text i { display: block; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--muted); margin-top: 2px; }
.game-text .winner { color: var(--gold-text); }

.cta { font-size: 12px; font-weight: 800; color: var(--blue); flex: none; }
.chev { color: var(--line-4); display: grid; place-items: center; flex: none; }
</style>
