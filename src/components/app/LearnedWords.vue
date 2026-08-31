<script setup>
import { onMounted, ref, watch } from 'vue'
import WordDetail from '../category/WordDetail.vue'
import { backIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

defineEmits(['close'])

const filter = ref('learned')
const words = ref([])
const counts = ref({ learned: 0, learning: 0, total: 0 })
const loading = ref(true)
const detail = ref(null)

const learnedAt = window.LEXIBLE?.mastery?.learned_at ?? 70
const midAt = window.LEXIBLE?.mastery?.mid_at ?? 40

const pillClass = (value) => (value >= learnedAt ? 'high' : value >= midAt ? 'mid' : 'low')

async function load() {
  loading.value = true
  try {
    const data = await api.learned(filter.value)
    words.value = data.words
    counts.value = data.counts
  } catch (error) {
    store.toast(error.message)
  } finally {
    loading.value = false
  }
}

function select(next) {
  filter.value = next
  telegram.haptic()
}

watch(filter, load)
onMounted(load)
</script>

<template>
  <div class="overlay show learned">
    <header class="lw-head">
      <button class="lw-back" @click="$emit('close')" v-html="backIcon"></button>
      <div class="lw-title">Yodlangan soʼzlar</div>
    </header>

    <div class="lw-tabs">
      <button class="lw-tab" :class="{ on: filter === 'learned' }" @click="select('learned')">
        <b>{{ counts.learned }}</b><i>Yodlangan</i>
      </button>
      <button class="lw-tab" :class="{ on: filter === 'learning' }" @click="select('learning')">
        <b>{{ counts.learning }}</b><i>Oʼrganilmoqda</i>
      </button>
    </div>

    <div class="lw-body">
      <div v-if="loading" class="lw-note">Yuklanmoqda...</div>

      <div v-else-if="words.length" class="lw-card">
        <div v-for="word in words" :key="word.id" class="lw-row" @click="detail = word">
          <span class="lw-letter">{{ word.en.charAt(0).toLowerCase() }}</span>
          <span class="lw-text">
            <b>{{ word.en }}</b>
            <i>{{ word.translation ?? '—' }}{{ word.pos ? ' · ' + word.pos : '' }}</i>
          </span>
          <span class="lw-pct" :class="pillClass(word.overall)">{{ word.overall }}%</span>
        </div>
      </div>

      <div v-else class="lw-empty">
        <div class="lw-emoji">📚</div>
        <h3>{{ filter === 'learned' ? 'Hali yodlangan soʼz yoʼq' : 'Boshlangan soʼz yoʼq' }}</h3>
        <p>
          {{
            filter === 'learned'
              ? `Soʼz ${learnedAt}% dan oshganda shu roʼyxatga tushadi.`
              : 'Yoʼl boʼylab bosqichlarni ishlang.'
          }}
        </p>
      </div>
    </div>

    <WordDetail :word="detail" @close="detail = null" />
  </div>
</template>

<style scoped>
.learned {
  background: var(--canvas);
  z-index: 25;
}

.lw-head {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 10px 22px 9px;
  background: var(--card);
  border-bottom: 1px solid var(--wash);
  flex: none;
}

.lw-back {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: none;
  color: var(--ink);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.lw-title {
  font-family: 'Sora', sans-serif;
  font-size: 19px;
  font-weight: 700;
}

.lw-tabs {
  display: flex;
  gap: 10px;
  padding: 14px 22px 4px;
  flex: none;
}

.lw-tab {
  flex: 1;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
}

.lw-tab.on {
  border-color: var(--green);
  background: var(--wash-3);
}

.lw-tab b {
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 20px;
  font-weight: 700;
}

.lw-tab i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--faint);
}

.lw-tab.on i {
  color: var(--green-dark);
}

.lw-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 22px 26px;
}

.lw-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.lw-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--wash);
  cursor: pointer;
}

.lw-row:last-child {
  border-bottom: none;
}

.lw-letter {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--wash-2);
  color: var(--muted);
  display: grid;
  place-items: center;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.lw-text {
  flex: 1;
}

.lw-text b {
  display: block;
  font-size: 14.5px;
  font-weight: 800;
}

.lw-text i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--faint);
}

.lw-pct {
  border-radius: var(--r-pill);
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 800;
}

.lw-pct.high {
  background: var(--green-soft);
  color: var(--green-dark);
}

.lw-pct.mid {
  background: #FFF6E3;
  color: var(--gold);
}

.lw-pct.low {
  background: var(--red-soft);
  color: var(--red-dark);
}

.lw-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 60px 20px;
}

.lw-emoji {
  font-size: 44px;
}

.lw-empty h3 {
  font-family: 'Sora', sans-serif;
  font-size: 17px;
  font-weight: 700;
}

.lw-empty p {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  max-width: 250px;
}

.lw-note {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--faint);
  padding: 40px;
}
</style>
