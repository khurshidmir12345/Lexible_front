<script setup>
import { onMounted, ref, watch } from 'vue'
import WordDetail from '../category/WordDetail.vue'
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

const level = (value) => (value < midAt ? 'low' : value < learnedAt ? 'mid' : 'high')

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
  <div class="overlay show">
    <div class="bar">
      <button class="back" @click="$emit('close')">‹</button>
      <span class="title">Yodlangan soʼzlar</span>
    </div>

    <div class="cat-body">
      <!-- Two collections: what is finished, and what is still being drilled. -->
      <div class="times" style="margin-top: 0">
        <button class="tcard" :class="{ sel: filter === 'learned' }" @click="select('learned')">
          <span class="tt">{{ counts.learned }}</span>
          <span class="tl">Yodlangan</span>
        </button>
        <button class="tcard" :class="{ sel: filter === 'learning' }" @click="select('learning')">
          <span class="tt">{{ counts.learning }}</span>
          <span class="tl">Oʼrganilmoqda</span>
        </button>
      </div>

      <div v-if="loading" class="cnt" style="margin-top: 18px">Yuklanmoqda...</div>

      <template v-else-if="words.length">
        <div class="cnt">{{ words.length }} ta soʼz</div>
        <div class="wlist">
          <div v-for="word in words" :key="word.id" class="witem">
            <div class="winfo" @click="detail = word">
              <div class="thumb">
                <img v-if="word.icon" :src="word.icon" alt="" style="width: 34px; height: 34px" />
                <template v-else>{{ word.emoji || '📘' }}</template>
              </div>
              <div class="wtext">
                <b>{{ word.en }}</b>
                <span>{{ word.translation ?? '—' }}{{ word.pos ? ' · ' + word.pos : '' }}</span>
              </div>
            </div>
            <button class="mast" :class="`m-${level(word.overall)}`">{{ word.overall }}%</button>
          </div>
        </div>
      </template>

      <div v-else class="empty">
        <div class="etile">📚</div>
        <h3>{{ filter === 'learned' ? 'Hali yodlangan soʼz yoʼq' : 'Boshlangan soʼz yoʼq' }}</h3>
        <p>
          {{
            filter === 'learned'
              ? `Soʼz ${learnedAt}% dan oshganda shu roʼyxatga tushadi.`
              : 'Yoʼl boʼylab bosqichlarni ishlang — soʼzlar shu yerda toʼplanadi.'
          }}
        </p>
      </div>
    </div>

    <WordDetail :word="detail" @close="detail = null" />
  </div>
</template>
