<script setup>
import { onMounted, ref, watch } from 'vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  categoryId: Number,
  chosen: { type: Array, default: () => [] },
})

const emit = defineEmits(['close'])

const query = ref('')
const results = ref([])
const loading = ref(false)
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
  }
}

// Picking a word empties the field for the next one without re-searching, so
// the list stays put and sibling words ("name", "named"…) are still a tap away.
let skipSearch = false

// A miss triggers a dictionary API call server-side, so let typing settle.
watch(query, () => {
  clearTimeout(debounce)
  if (skipSearch) {
    skipSearch = false
    return
  }
  debounce = setTimeout(search, 350)
})

async function toggle(word) {
  telegram.haptic()
  const adding = !selected.value.has(word.id)

  // Optimistic: the tick flips at once and the field is ready for the next
  // word — no waiting on the network, no retyping over a stale filter. The
  // focus call runs inside the tap gesture, which keeps the keyboard open.
  if (adding) {
    selected.value.add(word.id)
    if (query.value) {
      skipSearch = true
      query.value = ''
    }
    inputEl.value?.focus()
  } else {
    selected.value.delete(word.id)
  }
  selected.value = new Set(selected.value)

  try {
    if (adding) await api.addWord(props.categoryId, word.id)
    else await api.removeWord(props.categoryId, word.id)
  } catch (error) {
    adding ? selected.value.delete(word.id) : selected.value.add(word.id)
    selected.value = new Set(selected.value)
    store.toast(error.message)
  }
}

function clearQuery() {
  query.value = ''
  inputEl.value?.focus()
}

const initial = (word) => word.en.charAt(0).toLowerCase()

onMounted(() => {
  search()
  setTimeout(() => inputEl.value?.focus(), 60)
})
</script>

<template>
  <div class="overlay show add">
    <header class="add-head">
      <button class="a-x" @click="$emit('close')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <input ref="inputEl" v-model="query" placeholder="Inglizcha soʼz qidiring" autocomplete="off" autocapitalize="off" spellcheck="false" />
      <button v-if="query" class="a-clear" aria-label="Tozalash" @click="clearQuery">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </header>

    <div class="add-list">
      <div v-if="loading && !results.length" class="add-note">Qidirilmoqda...</div>

      <button
        v-for="word in results"
        :key="word.id"
        class="sug"
        :class="{ picked: selected.has(word.id) }"
        @mousedown.prevent
        @click="toggle(word)"
      >
        <span class="tile-letter">{{ initial(word) }}</span>
        <span class="sug-text">
          <b>{{ word.en }}</b>
          <i>{{ word.translation ?? '—' }}{{ word.pos ? ' · ' + word.pos : '' }}</i>
        </span>
        <span class="mark">{{ selected.has(word.id) ? '✓' : '+' }}</span>
      </button>

      <div v-if="!loading && !results.length" class="add-note">
        <template v-if="query.trim()">«{{ query }}» topilmadi.</template>
        <template v-else>Qidirish uchun soʼz yozing.</template>
      </div>
    </div>

    <div class="a-foot">
      <button class="btn btn-primary" @click="$emit('close')">
        {{ selected.size }} ta qoʼshildi · Tayyor
      </button>
    </div>
  </div>
</template>

<style scoped>
.add {
  background: var(--card);
  z-index: 15;
}

.add-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 22px 9px;
  border-bottom: 1px solid var(--wash);
  flex: none;
}

.a-x {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: none;
  color: var(--muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.add-head input {
  flex: 1;
  border: none;
  background: none;
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  outline: none;
}

.add-head input::placeholder {
  color: var(--faint);
  font-weight: 600;
}

.a-clear {
  width: 26px;
  height: 26px;
  border-radius: var(--r-pill);
  border: none;
  background: var(--wash-2);
  color: var(--muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.add-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 22px 100px;
}

.sug {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border: none;
  border-bottom: 1px solid var(--wash);
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
}

.tile-letter {
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

.sug-text {
  flex: 1;
}

.sug-text b {
  display: block;
  font-size: 14.5px;
  font-weight: 800;
  color: var(--ink);
}

.sug-text i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--faint);
}

.mark {
  width: 28px;
  height: 28px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  color: var(--muted);
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}

.sug.picked .tile-letter {
  background: var(--green-soft);
  color: var(--green-dark);
}

.sug.picked .mark {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.a-foot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px 22px 26px;
  background: var(--card);
  border-top: 1px solid var(--wash);
}

.add-note {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--faint);
  padding: 40px 20px;
}
</style>
