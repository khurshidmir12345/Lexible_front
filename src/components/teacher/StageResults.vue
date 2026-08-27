<script setup>
/**
 * UT-05 «Bosqich ichi» — one stage, every student, and the exercises they are
 * failing. The point of the screen is the weak-spot chips: a percentage alone
 * tells a teacher someone is behind, not what to reteach.
 */
import { computed, ref, watch } from 'vue'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  groupId: { type: Number, required: true },
  stageId: { type: Number, required: true },
})

const emit = defineEmits(['close', 'competition'])

const data = ref(null)
const loading = ref(true)
const starting = ref(false)
const active = ref(props.stageId)

const siblings = computed(() => data.value?.siblings ?? [])
const index = computed(() => siblings.value.findIndex((s) => s.id === active.value))
const prev = computed(() => (index.value > 0 ? siblings.value[index.value - 1] : null))
const next = computed(() =>
  index.value >= 0 && index.value < siblings.value.length - 1 ? siblings.value[index.value + 1] : null,
)

const tone = (score) => (score >= 70 ? 'good' : score >= 40 ? 'warn' : 'bad')

async function load() {
  loading.value = true

  try {
    data.value = await api.teacher.stageResults(props.groupId, active.value)
  } catch (error) {
    store.toast(error.message)
    emit('close')
  } finally {
    loading.value = false
  }
}

function go(stage) {
  if (!stage) return
  active.value = stage.id
  telegram.haptic()
}

async function play() {
  starting.value = true

  try {
    const { competition } = await api.teacher.openCompetition(props.groupId, active.value)
    telegram.notify('success')
    emit('competition', competition)
  } catch (error) {
    store.toast(error.message)
  } finally {
    starting.value = false
  }
}

watch(active, load, { immediate: true })
</script>

<template>
  <div class="overlay show results">
    <header class="t-head">
      <button class="t-back" aria-label="Orqaga" @click="emit('close')">
        <span class="flip" v-html="TeacherIcon.chevron"></span>
      </button>
      <div class="t-head-main">
        <h1>{{ data?.stage?.position }}-bosqich · {{ data?.stage?.title || 'Nomsiz' }}</h1>
        <p>{{ data?.group?.title }} · {{ data?.group?.members }} oʼquvchi</p>
      </div>
      <b v-if="data" class="avg v-num" :class="tone(data.average)">{{ data.average }}%</b>
    </header>

    <!-- Stage stepper -->
    <div v-if="siblings.length > 1" class="stepper">
      <button class="t-chip" :disabled="!prev" @click="go(prev)">
        <template v-if="prev">‹ {{ prev.position }}-bosqich</template>
        <template v-else>‹</template>
      </button>
      <span class="t-chip on">{{ data?.stage?.position }}-bosqich</span>
      <button class="t-chip" :disabled="!next" @click="go(next)">
        <template v-if="next">{{ next.position }}-bosqich ›</template>
        <template v-else>›</template>
      </button>
    </div>

    <div class="t-body">
      <button class="play" :disabled="starting || !data?.stage?.words" @click="play">
        <span class="t-vs">VS</span>
        {{ starting ? 'Ochilmoqda…' : 'Shu bosqichda oʼyin boshlash' }}
      </button>

      <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

      <template v-else-if="data?.students?.length">
        <div
          v-for="student in data.students"
          :key="student.id"
          class="student"
          :class="{ warn: student.score < 70 && student.score >= 40, bad: student.score < 40 }"
        >
          <div class="student-head">
            <span class="t-avatar">
              <img v-if="student.photo" :src="student.photo" alt="" />
              <template v-else>{{ student.initial }}</template>
            </span>
            <span class="student-text">
              <b>{{ student.name }}</b>
              <i v-if="student.idle_days" class="idle">{{ student.idle_days }} kun kirmagan</i>
              <i v-else-if="!student.started">hali boshlamagan</i>
            </span>
            <b class="pct v-num" :class="tone(student.score)">{{ student.score }}%</b>
          </div>

          <div class="t-meter"><i :class="tone(student.score)" :style="{ width: `${student.score}%` }"></i></div>

          <div v-if="student.weak.length" class="weak">
            <span
              v-for="spot in student.weak"
              :key="spot.key"
              class="spot"
              :class="spot.score < 40 ? 'bad' : 'warn'"
            >{{ spot.label }} {{ spot.score }}%</span>
          </div>
        </div>
      </template>

      <div v-else class="t-empty">
        <span class="t-empty-ic" v-html="TeacherIcon.group"></span>
        <h3>Hali oʼquvchi yoʼq</h3>
        <p>Guruhga oʼquvchi qoʼshilgach natijalar shu yerda chiqadi.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.results { background: var(--canvas); z-index: 24; }

.flip { display: grid; place-items: center; transform: rotate(180deg); }

.avg { font-size: 17px; font-weight: 700; flex: none; }
.avg.good { color: var(--green); }
.avg.warn { color: var(--gold); }
.avg.bad { color: var(--red); }

.stepper {
  display: flex;
  gap: 8px;
  padding: 14px 22px 0;
  flex: none;
}

.stepper .t-chip { flex: 1; text-align: center; }
.stepper .t-chip:disabled { opacity: .4; cursor: default; }

.t-body { padding-top: 14px; gap: 10px; }

.play {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 13px;
  background: var(--ink);
  color: var(--card);
  font-family: 'Manrope', sans-serif;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
}

.app.dark .play { background: var(--green); color: #06120B; }
.play:disabled { opacity: .5; cursor: default; }

.student {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 14px 16px;
}

.student.warn { border: 1.5px solid var(--gold-line); }
.student.bad { border: 1.5px solid var(--red-line); }

.student-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }

.student-head .t-avatar { width: 38px; height: 38px; font-size: 14px; }

.student-text { flex: 1; min-width: 0; }
.student-text b { display: block; font-size: 14px; font-weight: 800; }
.student-text i {
  display: block;
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  color: var(--faint);
  margin-top: 2px;
}

.student-text i.idle { color: var(--red-dark); }

.pct { font-size: 15px; font-weight: 700; flex: none; }
.pct.good { color: var(--green); }
.pct.warn { color: var(--gold); }
.pct.bad { color: var(--red-dark); }

.t-meter { height: 5px; }
.t-meter > i.good { background: var(--green); }

.weak { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }

.spot {
  border-radius: 8px;
  padding: 4px 9px;
  font-size: 10.5px;
  font-weight: 800;
}

.spot.warn { background: var(--gold-soft); color: var(--gold-text); }
.spot.bad { background: var(--red-soft); color: var(--red-dark); }
</style>
