<script setup>
import { computed, onMounted, ref } from 'vue'
import { backIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'

const props = defineProps({ groupId: [String, Number] })
defineEmits(['close'])

const group = ref(null)
const loading = ref(true)

const me = computed(() => store.state.user?.id)

async function load() {
  loading.value = true

  try {
    const { groups } = await api.myGroups()
    group.value = groups.find((g) => String(g.id) === String(props.groupId)) ?? null
  } catch (error) {
    store.toast(error.message)
  } finally {
    loading.value = false
  }
}

const rankLabel = computed(() => {
  const rank = group.value?.my_rank
  if (!rank) return 'Hali natija yoʼq'
  return `Siz — ${rank}-oʼrindasiz!`
})

onMounted(load)
</script>

<template>
  <div class="overlay show board">
    <header class="board-head">
      <button class="back" @click="$emit('close')" v-html="backIcon"></button>
      <div style="flex: 1">
        <div class="title">{{ group?.title ?? 'Guruh' }} · Reyting</div>
        <div class="sub-line">
          {{ group?.teacher }}{{ group?.members ? ` · ${group.members} oʼquvchi` : '' }}
        </div>
      </div>
    </header>

    <div class="board-body">
      <template v-if="!loading && group">
        <div class="mine">
          <span class="avatar me">{{ store.state.user?.initial }}</span>
          <div style="flex: 1">
            <b>{{ rankLabel }}</b>
            <i>umumiy {{ group.my_score }}% · davom eting</i>
          </div>
        </div>

        <div v-if="group.leaderboard.length" class="panel rows">
          <div
            v-for="row in group.leaderboard"
            :key="row.id"
            class="row"
            :class="{ mine: row.id === me }"
          >
            <span class="rank" :class="{ top: row.rank <= 3 }">{{ row.rank }}</span>
            <span class="avatar">{{ row.initial }}</span>
            <span class="row-text">
              <b>{{ row.name }}</b>
              <i>🔥 {{ row.streak }} kun</i>
            </span>
            <span v-if="row.id === me" class="you">SIZ</span>
            <span class="pct">{{ row.score }}%</span>
          </div>
        </div>

        <p v-else class="note">Guruhda hali natija yoʼq — birinchi boʼling!</p>
      </template>

      <p v-else-if="!loading" class="note">Guruh topilmadi.</p>
    </div>
  </div>
</template>

<style scoped>
.board { background: var(--canvas); z-index: 18; }

.board-head {
  display: flex; align-items: center; gap: 13px;
  padding: 20px 22px 14px; background: var(--card);
  border-bottom: 1px solid var(--wash); flex: none;
}

.back {
  width: 36px; height: 36px; border-radius: 12px;
  border: 1px solid var(--line); background: none; color: var(--ink);
  display: grid; place-items: center; cursor: pointer; flex: none;
}

.title { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700; }
.sub-line { font-size: 11.5px; font-weight: 600; color: var(--faint); }

.board-body {
  flex: 1; overflow-y: auto; padding: 14px 22px 26px;
  display: flex; flex-direction: column; gap: 12px;
}

.board-body > * {
  flex: none;
}

.mine {
  display: flex; align-items: center; gap: 13px;
  background: var(--green-soft); border: 1px solid var(--green-pale);
  border-radius: var(--r-lg); padding: 15px 16px;
}

.mine b { display: block; font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; }
.mine i { display: block; font-style: normal; font-size: 12px; font-weight: 600; color: var(--muted); margin-top: 2px; }

.rows { padding: 0; overflow: hidden; }

.row {
  display: flex; align-items: center; gap: 11px;
  padding: 12px 15px; border-bottom: 1px solid var(--wash);
}

.row:last-child { border-bottom: none; }
.row.mine { background: var(--wash-3); }

.rank {
  width: 22px; text-align: center;
  font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
  color: var(--faint); flex-shrink: 0;
}

.rank.top { color: var(--gold); }

.avatar {
  width: 36px; height: 36px; border-radius: var(--r-pill);
  background: var(--wash-2); color: var(--muted);
  display: grid; place-items: center;
  font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700;
  flex-shrink: 0;
}

.avatar.me { background: var(--green); color: #fff; width: 44px; height: 44px; font-size: 17px; }

.row-text { flex: 1; min-width: 0; }
.row-text b { display: block; font-size: 14px; font-weight: 700; }
.row-text i { display: block; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--faint); }

.you {
  background: var(--green); color: #fff; border-radius: var(--r-sm);
  padding: 3px 7px; font-size: 9px; font-weight: 800; letter-spacing: .5px;
}

.pct { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700; color: var(--green); }

.note { text-align: center; font-size: 13px; font-weight: 600; color: var(--faint); padding: 30px; }
</style>
