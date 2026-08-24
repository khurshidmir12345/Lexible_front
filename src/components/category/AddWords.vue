<script setup>
import { onMounted, ref, watch } from 'vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  categoryId: Number,
  chosen: { type: Array, default: () => [] },   // word ids already in the category
})

const emit = defineEmits(['close', 'changed'])

const query = ref('')
const results = ref([])
const loading = ref(false)
const searching = ref(false)
const inputEl = ref(null)
const selected = ref(new Set(props.chosen))

let debounce = null

async function search() {
  loading.value = true

  try {
    const { words } = await api.searchWords(query.value.trim())
    results.value = words
  } catch (error) {
    store.toast(error.message)
  } finally {
    loading.value = false
    searching.value = false
  }
}

watch(query, () => {
  clearTimeout(debounce)
  searching.value = true
  // A miss triggers a dictionary API call server-side, so typing should settle
  // before we ask.
  debounce = setTimeout(search, 350)
})

async function toggle(word) {
  telegram.haptic()

  try {
    if (selected.value.has(word.id)) {
      await api.removeWord(props.categoryId, word.id)
      selected.value.delete(word.id)
    } else {
      await api.addWord(props.categoryId, word.id)
      selected.value.add(word.id)
    }

    selected.value = new Set(selected.value)   // force reactivity
    emit('changed')
  } catch (error) {
    store.toast(error.message)
  }
}

onMounted(() => {
  search()
  setTimeout(() => inputEl.value?.focus(), 60)
})
</script>

<template>
  <div class="overlay show">
    <div class="search-bar">
      <button class="x" @click="$emit('close')">✕</button>
      <input ref="inputEl" v-model="query" placeholder="Inglizcha soʼz qidiring" />
    </div>

    <div class="suglist">
      <div v-if="loading && !results.length" class="nores">Qidirilmoqda...</div>

      <button
        v-for="word in results"
        :key="word.id"
        class="sugitem"
        :class="{ on: selected.has(word.id) }"
        @click="toggle(word)"
      >
        <div class="thumb">
          <img v-if="word.icon" :src="word.icon" alt="" style="width: 34px; height: 34px" />
          <template v-else>{{ word.emoji || '📘' }}</template>
        </div>
        <div class="wtext">
          <b>{{ word.en }}</b>
          <span>{{ word.translation ?? '—' }}{{ word.pos ? ' · ' + word.pos : '' }}</span>
        </div>
        <span class="sugadd">{{ selected.has(word.id) ? '✓' : '+' }}</span>
      </button>

      <div v-if="!loading && !results.length" class="nores">
        <template v-if="query.trim()">
          "{{ query }}" topilmadi.<br />Boshqa soʼz qidiring.
        </template>
        <template v-else>Qidirish uchun soʼz yozing.</template>
      </div>
    </div>

    <div class="add-foot">
      <button class="btn btn-primary" @click="$emit('close')">
        {{ selected.size }} ta qoʼshildi · Tayyor
      </button>
    </div>
  </div>
</template>
