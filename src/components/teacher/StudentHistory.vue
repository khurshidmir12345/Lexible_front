<script setup>
/**
 * One player's record: every round they have played, newest first — class
 * games with the place taken, exams with pass or fail, duels, plain
 * practice. The teacher reads it for any student of theirs; the student
 * reads their own from the profile (no `groupId`).
 */
import { computed, onMounted, ref } from 'vue'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'

const props = defineProps({
  /** Together with `studentId`, the teacher's view; alone, nothing. */
  groupId: { type: Number, default: null },
  studentId: { type: Number, default: null },
})

const emit = defineEmits(['close'])

const data = ref(null)
const loading = ref(true)
const filter = ref('all')

const KINDS = {
  competition: { label: 'Musobaqa', tone: 'blue' },
  exam: { label: 'Imtihon', tone: 'gold' },
  duel: { label: 'Duel', tone: 'violet' },
  practice: { label: 'Mashq', tone: 'green' },
}

const FILTERS = [
  { key: 'all', label: 'Hammasi' },
  { key: 'competition', label: 'Oʼyinlar' },
  { key: 'exam', label: 'Imtihonlar' },
  { key: 'practice', label: 'Mashqlar' },
]

const rows = computed(() => {
  const all = data.value?.sessions ?? []
  return filter.value === 'all' ? all : all.filter((s) => s.kind === filter.value)
})

const overall = computed(() => {
  const s = data.value?.summary
  return s?.answers ? Math.round((s.correct / s.answers) * 100) : 0
})

const tone = (accuracy) => (accuracy >= 70 ? 'good' : accuracy >= 40 ? 'warn' : 'bad')

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
    data.value = props.groupId && props.studentId
      ? await api.teacher.studentHistory(props.groupId, props.studentId)
      : await api.history()
  } catch (error) {
    store.toast(error.message)
    emit('close')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="overlay show record">
    <header class="t-head">
      <button class="t-back" aria-label="Orqaga" @click="emit('close')">
        <span class="flip" v-html="TeacherIcon.chevron"></span>
      </button>
      <div class="t-head-main">
        <h1>{{ data?.student?.name ?? 'Natijalar tarixi' }}</h1>
        <p v-if="data?.student">{{ data.student.ref }} · {{ data.summary.sessions }} ta oʼyin</p>
        <p v-else-if="data">{{ data.summary.sessions }} ta oʼyin</p>
      </div>
      <b v-if="data" class="avg v-num" :class="tone(overall)">{{ overall }}%</b>
    </header>

    <div class="t-body">
      <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

      <template v-else-if="data">
        <div class="tiles">
          <div class="t-card tile">
            <b class="v-num">{{ data.summary.competitions }}</b>
            <i>Musobaqa</i>
          </div>
          <div class="t-card tile">
            <b class="v-num">{{ data.summary.exams }}</b>
            <i>Imtihon</i>
          </div>
          <div class="t-card tile">
            <b class="v-num">{{ data.summary.correct }}</b>
            <i>Toʼgʼri javob</i>
          </div>
        </div>

        <div class="t-chips">
          <button
            v-for="f in FILTERS"
            :key="f.key"
            class="t-chip"
            :class="{ on: filter === f.key }"
            @click="filter = f.key"
          >{{ f.label }}</button>
        </div>

        <div v-if="rows.length" class="t-rows">
          <div v-for="row in rows" :key="row.id" class="t-row session">
            <span class="kind" :class="KINDS[row.kind]?.tone">{{ KINDS[row.kind]?.label ?? row.kind }}</span>
            <span class="t-row-text">
              <b>{{ row.title }}</b>
              <i>
                {{ when(row.finished_at) }} · {{ row.correct }}/{{ row.questions || row.answered }} toʼgʼri · ⏱ {{ row.duration }}
                <template v-if="row.rank"> · {{ row.rank }}-oʼrin<template v-if="row.participants">/{{ row.participants }}</template></template>
                <template v-if="row.timed_out"> · vaqt tugadi</template>
                <template v-if="row.passed === true"> · oʼtdi</template>
                <template v-else-if="row.passed === false"> · oʼtmadi</template>
              </i>
            </span>
            <b class="pct v-num" :class="tone(row.accuracy)">{{ row.accuracy }}%</b>
          </div>
        </div>

        <div v-else class="t-empty">
          <span class="t-empty-ic" v-html="TeacherIcon.chart"></span>
          <h3>Hali natija yoʼq</h3>
          <p>Oʼynalgan har bir test, imtihon va musobaqa shu yerda qoladi.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.record { background: var(--canvas); z-index: 28; }

.flip { display: grid; place-items: center; transform: rotate(180deg); }

.avg { font-size: 17px; font-weight: 700; flex: none; }
.avg.good, .pct.good { color: var(--green); }
.avg.warn, .pct.warn { color: var(--gold); }
.avg.bad, .pct.bad { color: var(--red-dark); }

.tiles { display: flex; gap: 10px; }
.tile { flex: 1; padding: 12px 14px; }
.tile b { display: block; font-size: 20px; font-weight: 700; }
.tile i { display: block; font-style: normal; font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 2px; }

.session .t-row-text b { font-size: 13.5px; }
.session .t-row-text i { display: block; font-style: normal; font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 2px; line-height: 1.4; }

.kind {
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .3px;
  flex: none;
  min-width: 62px;
  text-align: center;
}

.kind.blue { background: var(--blue-soft); color: var(--blue); }
.kind.gold { background: var(--gold-soft); color: var(--gold-text); }
.kind.violet { background: var(--violet-soft); color: var(--violet); }
.kind.green { background: var(--green-soft); color: var(--green-dark); }

.pct { font-size: 14px; font-weight: 700; flex: none; }
</style>
