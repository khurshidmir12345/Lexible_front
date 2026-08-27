<script setup>
/** UT-DB «Bosh sahifa» — the class at a glance, and the two things a teacher
 *  does most: add a stage, start a game. */
import { computed, onMounted, ref } from 'vue'
import { WEEKDAYS } from '../../lib/languages'
import { TeacherIcon, badgeTint } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'

const emit = defineEmits(['open-groups', 'open-paths', 'open-group', 'open-plan'])

const data = ref(null)
const loading = ref(true)
const failed = ref(null)

async function load() {
  loading.value = true
  failed.value = null

  try {
    data.value = await api.teacher.dashboard()
  } catch (error) {
    failed.value = error.message
  } finally {
    loading.value = false
  }
}

/** Bars are scaled against the busiest day, never against a fixed ceiling. */
const peak = computed(() => Math.max(...(data.value?.week ?? [0]), 1))

const barHeight = (value) => `${Math.max(Math.round((value / peak.value) * 68), 4)}px`

/** An empty class has no score to be bad at, so it reads as a dash. */
const tone = (score, members = 1) =>
  !members ? 'none' : score >= 70 ? 'good' : score >= 40 ? 'warn' : 'bad'

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div class="scroll">
    <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

    <div v-else-if="failed" class="t-empty">
      <span class="t-empty-ic" v-html="TeacherIcon.info"></span>
      <h3>Maʼlumot kelmadi</h3>
      <p>{{ failed }}</p>
      <button class="btn btn-primary" @click="load">Qayta urinish</button>
    </div>

    <template v-else-if="data">
      <!-- Two headline numbers -->
      <div class="tiles">
        <div class="t-card stat">
          <span class="stat-ic" v-html="TeacherIcon.group"></span>
          <b class="v-num">{{ data.students }}</b>
          <i>Oʼquvchi · {{ data.groups }} guruh</i>
        </div>
        <div class="t-card stat">
          <span class="stat-ic green" v-html="TeacherIcon.flame"></span>
          <b class="v-num">{{ data.active_today }}</b>
          <i>Bugun faol</i>
        </div>
      </div>

      <!-- Weekly activity -->
      <div class="t-card">
        <div class="chart-head">
          <span>Guruhlar faolligi · hafta</span>
          <b class="v-num">{{ data.week_total }} test</b>
        </div>
        <div class="bars">
          <span
            v-for="(value, index) in data.week"
            :key="index"
            :class="{ today: index === data.today_index, idle: !value }"
            :style="{ height: barHeight(value) }"
          ></span>
        </div>
        <div class="bar-labels">
          <span
            v-for="(day, index) in WEEKDAYS"
            :key="day"
            :class="{ today: index === data.today_index }"
          >{{ day }}</span>
        </div>
      </div>

      <!-- Waiting approvals -->
      <button v-if="data.pending" class="pending" @click="emit('open-groups')">
        <span class="pending-ic" v-html="TeacherIcon.student"></span>
        <b>{{ data.pending }} ta qoʼshilish soʼrovi kutmoqda</b>
        <span class="pending-cta">Koʼrish</span>
      </button>

      <!-- Seat limit -->
      <button v-if="data.plan?.over_limit" class="pending over" @click="emit('open-plan')">
        <span class="pending-ic" v-html="TeacherIcon.star"></span>
        <b>{{ data.plan.seats_used }}/{{ data.plan.seats }} joy band — tarifni kengaytiring</b>
        <span class="pending-cta">Tarif</span>
      </button>

      <!-- Groups by average -->
      <template v-if="data.top_groups?.length">
        <div class="t-section">
          <span class="t-label">ENG FAOL GURUH</span>
          <button class="t-action" @click="emit('open-groups')">Barchasi</button>
        </div>

        <div class="t-card">
          <button
            v-for="(group, index) in data.top_groups"
            :key="group.id"
            class="group"
            @click="emit('open-group', group.id)"
          >
            <span class="t-badge sm" :style="{ background: badgeTint(index).bg, color: badgeTint(index).color }">
              {{ group.badge }}
            </span>
            <span class="group-main">
              <b>{{ group.title }}</b>
              <i>{{ group.members }} oʼquvchi</i>
              <span class="t-meter">
                <i :class="tone(group.score, group.members)" :style="{ width: `${group.members ? group.score : 0}%` }"></i>
              </span>
            </span>
            <span class="pct v-num" :class="tone(group.score, group.members)">
              {{ group.members ? `${group.score}%` : '—' }}
            </span>
          </button>
        </div>
      </template>

      <!-- Best students across every class -->
      <template v-if="data.top_students?.length">
        <div class="t-section"><span class="t-label">ENG FAOL OʼQUVCHILAR</span></div>
        <div class="t-rows">
          <div v-for="row in data.top_students" :key="`${row.id}-${row.group}`" class="t-row">
            <span class="t-rank" :class="`g${row.rank}`">{{ row.rank }}</span>
            <span class="t-avatar">
              <img v-if="row.photo" :src="row.photo" alt="" />
              <template v-else>{{ row.initial }}</template>
            </span>
            <span class="t-row-text">
              <b>{{ row.name }}</b>
              <i>{{ row.group }}</i>
            </span>
            <span class="pct v-num" :class="tone(row.score)">{{ row.score }}%</span>
          </div>
        </div>
      </template>

      <!-- The two verbs -->
      <div class="actions">
        <button class="act green" @click="emit('open-paths')">
          <span v-html="TeacherIcon.plus"></span> Bosqich qoʼshish
        </button>
        <button class="act ink" @click="emit('open-groups')">
          <span class="t-vs">VS</span> Oʼyin boshlash
        </button>
      </div>

      <div v-if="!data.groups" class="t-note plain">
        <span v-html="TeacherIcon.info"></span>
        <b>Avval «Yoʼllar» boʼlimida yoʼl tuzing, soʼng guruh yaratib kodni oʼquvchilaringizga bering.</b>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tiles { display: flex; gap: 12px; }

.stat { flex: 1; display: flex; flex-direction: column; gap: 9px; padding: 15px; }

.stat-ic { color: var(--muted); display: grid; place-items: center; width: 20px; height: 20px; }
.stat-ic.green { color: var(--green); }

.stat b { font-size: 22px; }
.stat i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

/* ------------------------------------------------------------------ chart */

.chart-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 14.5px;
  font-weight: 700;
}

.chart-head b { font-size: 14px; color: var(--green); }

.bars {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 70px;
  border-bottom: 1px solid var(--wash);
}

.bars span {
  flex: 1;
  border-radius: 6px 6px 0 0;
  background: var(--green-bar);
}

.bars span.today { background: var(--green); }
.bars span.idle { background: var(--line-3); }

.bar-labels { display: flex; gap: 10px; margin-top: 8px; }

.bar-labels span {
  flex: 1;
  text-align: center;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--faint);
}

.bar-labels span.today { color: var(--ink); }

/* ---------------------------------------------------------------- banners */

.pending {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: var(--gold-soft);
  border: 1px solid var(--gold-line);
  border-radius: var(--r-lg);
  padding: 13px 15px;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  text-align: left;
}

.pending-ic {
  width: 38px;
  height: 38px;
  border-radius: var(--r-md);
  background: var(--card);
  color: var(--gold);
  display: grid;
  place-items: center;
  flex: none;
}

.pending b { flex: 1; font-size: 13px; font-weight: 800; color: var(--gold-text); }
.pending-cta { font-size: 12px; font-weight: 800; color: var(--gold); flex: none; }

/* -------------------------------------------------------------- group row */

.group {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: none;
  background: none;
  padding: 0;
  margin-top: 12px;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  color: var(--ink);
  text-align: left;
}

.group:first-child { margin-top: 0; }

.group-main { flex: 1; min-width: 0; }
.group-main b { display: block; font-size: 14px; font-weight: 800; }
.group-main i {
  display: block;
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  color: var(--faint);
  margin-top: 1px;
}
.group-main .t-meter { margin-top: 7px; height: 5px; }

.pct { font-size: 14px; font-weight: 700; flex: none; }
.pct.good { color: var(--green); }
.pct.warn { color: var(--gold); }
.pct.bad { color: var(--red); }
.pct.none { color: var(--faint); }

.t-meter > i.good { background: var(--green); }

/* --------------------------------------------------------------- actions */

.actions { display: flex; gap: 10px; margin-top: 2px; }

.act {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 14px;
  padding: 13px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.act > span { display: grid; place-items: center; }

.act.green { background: var(--green); color: #fff; }
.act.ink { background: var(--ink); color: var(--card); }
.app.dark .act.ink { background: var(--wash-2); color: var(--ink); }
</style>
