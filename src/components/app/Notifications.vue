<script setup>
import { onMounted, ref } from 'vue'
import { backIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'

const emit = defineEmits(['close', 'read'])

const groups = ref([])
const loading = ref(true)

async function load() {
  loading.value = true

  try {
    const data = await api.notifications()
    groups.value = data.groups

    // Opening the screen is the acknowledgement; the badge clears with it.
    if (data.unread > 0) {
      await api.readNotifications()
      emit('read')
    }
  } catch (error) {
    store.toast(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="overlay show notif">
    <header class="notif-head">
      <button class="back" @click="$emit('close')" v-html="backIcon"></button>
      <div class="title">Bildirishnomalar</div>
    </header>

    <div class="notif-body">
      <template v-if="!loading && groups.length">
        <template v-for="group in groups" :key="group.label">
          <div class="day">{{ group.label }}</div>
          <div class="panel items">
            <div v-for="item in group.items" :key="item.id" class="item" :class="{ fresh: !item.is_read }">
              <span class="emoji">{{ item.emoji }}</span>
              <span class="text">
                <b>{{ item.title }}</b>
                <i v-if="item.body">{{ item.body }}</i>
              </span>
              <span class="ago">{{ item.ago }}</span>
            </div>
          </div>
        </template>
      </template>

      <div v-else-if="!loading" class="empty">
        <div class="empty-emoji">🔔</div>
        <h3>Hozircha xabar yoʼq</h3>
        <p>Bosqich ochilganda, duel tugaganda va seriya oʼsganda shu yerda koʼrasiz.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notif { background: var(--canvas); z-index: 24; }

.notif-head {
  display: flex; align-items: center; gap: 13px;
  padding: 10px 22px 9px; background: var(--card);
  border-bottom: 1px solid var(--wash); flex: none;
}

.back {
  width: 36px; height: 36px; border-radius: 12px;
  border: 1px solid var(--line); background: none; color: var(--ink);
  display: grid; place-items: center; cursor: pointer; flex: none;
}

.title { font-family: 'Sora', sans-serif; font-size: 19px; font-weight: 700; }

.notif-body {
  flex: 1; overflow-y: auto; padding: 14px 22px 26px;
  display: flex; flex-direction: column; gap: 8px;
}

.notif-body > * {
  flex: none;
}

.day {
  font-size: 10.5px; font-weight: 800; letter-spacing: 1px;
  color: var(--faint); margin: 8px 0 -2px 4px;
}

.items { padding: 0; overflow: hidden; }

.item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 13px 15px; border-bottom: 1px solid var(--wash);
}

.item:last-child { border-bottom: none; }
.item.fresh { background: var(--wash-3); }

.emoji {
  width: 36px; height: 36px; border-radius: 12px;
  background: var(--wash-2); display: grid; place-items: center;
  font-size: 17px; flex-shrink: 0;
}

.text { flex: 1; min-width: 0; }
.text b { display: block; font-size: 13.5px; font-weight: 700; line-height: 1.35; }
.text i { display: block; font-style: normal; font-size: 12px; font-weight: 600; color: var(--muted); margin-top: 2px; }

.ago { font-size: 11px; font-weight: 700; color: var(--faint); flex-shrink: 0; }

.empty {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 6px; padding: 60px 20px;
}

.empty-emoji { font-size: 44px; }
.empty h3 { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700; }
.empty p { font-size: 13px; font-weight: 600; color: var(--muted); max-width: 260px; }
</style>
