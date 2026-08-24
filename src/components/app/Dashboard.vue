<script setup>
import { computed } from 'vue'
import { WEEKDAYS } from '../../lib/languages'
import { store } from '../../lib/store'

const data = computed(() => store.state.dashboard)
const user = computed(() => store.state.user)

// Bars are relative to the busiest day; an empty day keeps a visible stub.
const peak = computed(() => Math.max(...(data.value?.week ?? [0]), 1))
const barHeight = (value) => `${Math.max((value / peak.value) * 53, 5)}px`

const todayIndex = computed(() => (new Date().getDay() + 6) % 7)

// The last four days of the streak, newest on the right.
const streakBars = computed(() => (data.value?.week ?? []).slice(-4))

const goalDone = computed(() => Math.min(data.value?.today ?? 0, user.value?.daily_goal ?? 0))
const goalPercent = computed(() => {
  const goal = user.value?.daily_goal || 1
  return Math.min(Math.round((goalDone.value / goal) * 100), 100)
})
</script>

<template>
  <div v-if="data" class="scroll">
    <!-- Streak -->
    <div class="panel panel-row" style="padding: 13px 16px">
      <span class="flame">🔥</span>
      <div style="flex: 1">
        <div class="v-num" style="font-size: 20px">{{ data.streak_days }} kun seriya</div>
        <div class="v-sub-line">rekordingiz — {{ user.best_streak }} kun 🏅</div>
      </div>
      <div class="streak-bars">
        <span
          v-for="(value, index) in streakBars"
          :key="index"
          :style="{
            height: `${14 + index * 6}px`,
            background: value > 0 ? 'var(--green)' : 'var(--green-bar)',
          }"
        ></span>
      </div>
    </div>

    <!-- Daily goal and coins -->
    <div style="display: flex; gap: 12px">
      <div class="tile green">
        <span class="emoji">🎯</span>
        <div class="value">{{ goalDone }} / {{ user.daily_goal }}</div>
        <div class="v-label">bugungi maqsad</div>
        <div class="meter"><i :style="{ width: goalPercent + '%' }"></i></div>
      </div>

      <div class="tile gold">
        <span class="emoji">⭐</span>
        <div class="value">{{ data.coins ?? 0 }}</div>
        <div class="v-label" style="color: var(--gold-muted)">tanga toʼplandi</div>
        <div class="hint-gold">har mashq +1 · duel +10</div>
      </div>
    </div>

    <!-- This week -->
    <div class="panel">
      <div class="panel-head">
        <span>Bu hafta</span>
        <span class="v-num accent">{{ data.week_total }} soʼz</span>
      </div>
      <div class="week-bars">
        <div
          v-for="(value, index) in data.week"
          :key="index"
          :style="{
            height: barHeight(value),
            background: index === todayIndex ? 'var(--green)' : value > 0 ? 'var(--green-bar)' : 'var(--line-3)',
          }"
        ></div>
      </div>
      <div class="week-days">
        <span v-for="day in WEEKDAYS" :key="day">{{ day }}</span>
      </div>
    </div>

    <!-- Totals -->
    <div style="display: flex; gap: 12px">
      <div class="panel v-stat">
        <span class="v-stat-emoji">📚</span>
        <div class="v-num" style="font-size: 20px">{{ data.words_learned }}</div>
        <div class="v-sub-line">Jami yodlangan</div>
      </div>
      <div class="panel v-stat">
        <span class="v-stat-emoji">🗓</span>
        <div class="v-num" style="font-size: 20px">{{ data.month_total }}</div>
        <div class="v-sub-line">Bu oy</div>
      </div>
    </div>

    <!-- Duels -->
    <div class="panel">
      <div class="panel-head">
        <span>Duel natijalari</span>
        <span class="v-num accent">{{ data.duel.win_rate }}% gʼalaba</span>
      </div>
      <div style="display: flex; gap: 11px">
        <div class="duel-half win">
          <span class="duel-emoji">🏆</span>
          <div>
            <div class="v-num" style="font-size: 20px; color: var(--green-dark)">{{ data.duel.wins }}</div>
            <div class="duel-v-label">Gʼalaba</div>
          </div>
        </div>
        <div class="duel-half loss">
          <span class="duel-emoji">🚩</span>
          <div>
            <div class="v-num" style="font-size: 20px; color: var(--red-dark)">{{ data.duel.losses }}</div>
            <div class="duel-v-label">Magʼlubiyat</div>
          </div>
        </div>
      </div>
      <div class="duel-meter">
        <div :style="{ width: data.duel.win_rate + '%' }"></div>
        <div style="flex: 1"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flame {
  font-size: 38px;
  line-height: 1;
  filter: drop-shadow(0 4px 6px rgba(199, 84, 26, .35));
}

.v-sub-line {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.streak-bars {
  display: flex;
  gap: 4px;
  align-items: flex-end;
}

.streak-bars span {
  width: 7px;
  border-radius: var(--r-pill);
  display: block;
}

.hint-gold {
  font-size: 10px;
  font-weight: 800;
  color: var(--gold-muted);
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 14.5px;
  font-weight: 700;
}

.accent {
  font-size: 14px;
  color: var(--green);
}

.week-bars {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 54px;
  border-bottom: 1px solid var(--wash);
}

.week-bars > div {
  flex: 1;
  border-radius: 6px 6px 0 0;
}

.week-days {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.week-days span {
  flex: 1;
  text-align: center;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--faint);
}

.v-stat {
  flex: 1;
  padding: 13px 15px;
}

.v-stat-emoji {
  font-size: 22px;
  line-height: 1;
  display: block;
  margin-bottom: 6px;
}

.duel-half {
  flex: 1;
  border-radius: 14px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  gap: 11px;
}

.duel-half.win {
  background: var(--green-soft);
  border: 1px solid var(--green-pale);
}

.duel-half.loss {
  background: var(--red-soft);
  border: 1px solid var(--red-line);
}

.duel-emoji {
  font-size: 26px;
  line-height: 1;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, .15));
}

.duel-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.duel-meter {
  display: flex;
  height: 6px;
  border-radius: var(--r-pill);
  overflow: hidden;
  margin-top: 11px;
  gap: 2px;
}

.duel-meter > div:first-child {
  background: var(--green);
  border-radius: var(--r-pill);
}

.duel-meter > div:last-child {
  background: #F1C0C3;
  border-radius: var(--r-pill);
}
</style>
