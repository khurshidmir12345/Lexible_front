<script setup>
/**
 * Every class the player is in or waiting on, and the way out of one.
 *
 * The road shows a class as a tab and nothing more, so without this a student
 * cannot see who their teacher is, where they stand, or leave a group they
 * joined by mistake.
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['close', 'changed'])

const groups = ref([])
const loading = ref(true)
const leaving = ref(null)

const active = computed(() => groups.value.filter((g) => g.status === 'active'))
const pending = computed(() => groups.value.filter((g) => g.status === 'pending'))

async function load() {
  loading.value = true

  try {
    groups.value = (await api.myGroups()).groups
  } catch (error) {
    store.toast(error.message)
  } finally {
    loading.value = false
  }
}

async function leave(group) {
  const question = group.status === 'pending'
    ? `«${group.title}» guruhiga soʼrov bekor qilinsinmi?`
    : `«${group.title}» guruhidan chiqasizmi? Ustoz bergan bosqichlar yoʼlingizdan olib tashlanadi.`

  if (!confirm(question)) return

  leaving.value = group.id

  try {
    await api.leaveGroup(group.id)
    telegram.haptic()
    await load()
    await store.refreshRoad()
    await store.refreshGroups()
    emit('changed')
  } catch (error) {
    store.toast(error.message)
  } finally {
    leaving.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="overlay show groups">
    <header class="t-head">
      <button class="t-back" aria-label="Orqaga" @click="emit('close')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <div class="t-head-main">
        <h1>Guruhlarim</h1>
        <p>{{ active.length }} ta guruh<template v-if="pending.length"> · {{ pending.length }} soʼrov kutmoqda</template></p>
      </div>
    </header>

    <div class="t-body">
      <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

      <template v-else-if="groups.length">
        <div v-for="group in groups" :key="group.id" class="g-card" :class="group.status">
          <div class="g-head">
            <span class="g-badge">{{ group.badge }}</span>
            <span class="g-text">
              <b>{{ group.title }}</b>
              <i>{{ group.teacher }}<template v-if="group.path"> · {{ group.path }}</template></i>
            </span>
            <b v-if="group.status === 'active' && group.my_rank" class="g-rank v-num">
              {{ group.my_rank }}-oʼrin
            </b>
            <span v-else-if="group.status === 'pending'" class="t-pill gold">kutilmoqda</span>
          </div>

          <div v-if="group.status === 'active'" class="g-stats">
            <span><b class="v-num">{{ group.my_score }}%</b> sizning natijangiz</span>
            <span><b class="v-num">{{ group.members }}</b> oʼquvchi</span>
            <span><b class="v-num">{{ group.stages }}</b> bosqich</span>
          </div>

          <button class="g-leave" :disabled="leaving === group.id" @click="leave(group)">
            {{ group.status === 'pending' ? 'Soʼrovni bekor qilish' : 'Guruhdan chiqish' }}
          </button>
        </div>
      </template>

      <div v-else class="t-empty">
        <span class="t-empty-ic">🎓</span>
        <h3>Hali guruhda emassiz</h3>
        <p>Yoʼl sahifasidagi <b>+</b> tugmasi orqali ustoz kodi yoki ID sini kiriting.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.groups { background: var(--canvas); z-index: 26; }

.g-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 16px;
}

.g-card.pending { border-color: var(--gold-line); background: var(--gold-soft); }

.g-head { display: flex; align-items: center; gap: 12px; }

.g-badge {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--green-soft);
  color: var(--green-dark);
  display: grid;
  place-items: center;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 700;
  flex: none;
}

.g-card.pending .g-badge { background: var(--card); color: var(--gold); }

.g-text { flex: 1; min-width: 0; }
.g-text b { display: block; font-size: 15px; font-weight: 800; }
.g-text i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.g-rank { font-size: 14px; color: var(--green); flex: none; }

.g-stats {
  display: flex;
  gap: 14px;
  margin-top: 13px;
  padding-top: 13px;
  border-top: 1px solid var(--wash);
  flex-wrap: wrap;
}

.g-stats span { font-size: 11.5px; font-weight: 600; color: var(--muted); }
.g-stats b { font-size: 14px; color: var(--ink); margin-right: 4px; }

.g-leave {
  width: 100%;
  margin-top: 13px;
  padding: 11px;
  border: 1px solid var(--red-line);
  border-radius: var(--r-md);
  background: none;
  font-family: 'Manrope', sans-serif;
  font-size: 12.5px;
  font-weight: 800;
  color: var(--red);
  cursor: pointer;
}

.g-leave:disabled { opacity: .5; cursor: default; }

.t-empty-ic { font-size: 34px; background: none; }
</style>
