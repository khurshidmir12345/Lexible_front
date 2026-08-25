<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CompetitionBoard from './CompetitionBoard.vue'
import { backIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  competitionId: Number,
  /** Needed to open a fresh round over the same stage from the result board. */
  groupId: Number,
  stageId: Number,
})

const emit = defineEmits(['close'])

const currentId = ref(props.competitionId)

const lobby = ref(null)
const board = ref(null)
const starting = ref(false)
let timer = null

const joined = computed(() => (lobby.value?.students ?? []).filter((s) => s.joined))
const canStart = computed(() => joined.value.length > 0 && lobby.value?.status === 'lobby')

const LABELS = {
  ready: 'Tayyor',
  playing: 'Oʼynamoqda',
  finished: 'Tugatdi',
  absent: 'Start bosmagan',
}

async function poll() {
  try {
    const { competition, finished } = await api.teacher.competition(currentId.value)
    if (finished) {
      board.value = competition
      stopPolling()
    } else {
      lobby.value = competition
    }
  } catch (error) {
    store.toast(error.message)
    stopPolling()
  }
}

function stopPolling() {
  if (timer) clearInterval(timer)
  timer = null
}

async function start() {
  starting.value = true
  try {
    const { competition } = await api.teacher.startCompetition(currentId.value)
    lobby.value = competition
    telegram.notify('success')
  } catch (error) {
    store.toast(error.message)
  } finally {
    starting.value = false
  }
}

async function close() {
  try {
    const { competition } = await api.teacher.closeCompetition(currentId.value)
    board.value = competition
    stopPolling()
  } catch (error) {
    store.toast(error.message)
  }
}

/** Runs the same stage again with a clean lobby. */
async function again() {
  if (!props.groupId || !props.stageId) {
    emit('close')
    return
  }

  try {
    const { competition } = await api.teacher.openCompetition(props.groupId, props.stageId)
    currentId.value = competition.id
    lobby.value = competition
    board.value = null
    stopPolling()
    timer = setInterval(poll, 2000)
  } catch (error) {
    store.toast(error.message)
    emit('close')
  }
}

function copyLink() {
  const link = lobby.value?.invite_link
  if (!link) return

  telegram.copy(link)
  telegram.haptic()
  store.toast('🔗 Havola nusxalandi')
}

function share() {
  const link = lobby.value?.invite_link
  if (!link) return

  telegram.share(link, `«${lobby.value.group}» — ${lobby.value.stage}-bosqich musobaqasi. Qoʼshiling!`)
}

onMounted(() => {
  poll()
  timer = setInterval(poll, 2000)
})

onBeforeUnmount(stopPolling)
</script>

<template>
  <div class="overlay show c-lobby">
    <CompetitionBoard
      v-if="board"
      :board="board"
      @close="emit('close')"
      @again="again"
    />

    <template v-else>
      <header class="c-head">
        <button class="c-back" @click="emit('close')" v-html="backIcon"></button>
        <div>
          <h1>Musobaqa</h1>
          <p v-if="lobby">{{ lobby.stage }}-bosqich · {{ lobby.group }} · {{ lobby.words }} soʼz</p>
        </div>
        <span class="c-vs">VS</span>
      </header>

      <div class="c-scroll">
        <template v-if="lobby">
          <section class="c-link-card">
            <span class="c-label">MUSOBAQA HAVOLASI</span>
            <button class="c-link" @click="copyLink">{{ lobby.invite_link }}</button>
            <p class="c-hint">
              Havola faqat botga start bosgan oʼquvchilarda ochiladi.
              Start bosmaganlar avval botni ishga tushiradi.
            </p>
            <button class="c-share" @click="share">Telegramda ulashish</button>
          </section>

          <section class="c-list">
            <div class="c-list-head">
              <span class="c-label">QOʼSHILGANLAR · {{ joined.length }}</span>
              <span class="c-live">jonli yangilanadi</span>
            </div>

            <div v-for="student in lobby.students" :key="student.id" class="c-row" :class="student.status">
              <span class="c-avatar">
                <img v-if="student.avatar" :src="student.avatar" alt="" />
                <template v-else>{{ student.name.charAt(0) }}</template>
              </span>
              <b>{{ student.name }}</b>
              <span class="c-state">{{ LABELS[student.status] }}</span>
            </div>
          </section>
        </template>

        <p v-else class="c-loading">Yuklanmoqda…</p>
      </div>

      <div class="c-foot">
        <button v-if="lobby?.status === 'lobby'" class="btn btn-primary" :disabled="!canStart || starting" @click="start">
          Musobaqani boshlash<template v-if="joined.length"> · {{ joined.length }} oʼquvchi</template>
        </button>
        <button v-else class="btn btn-primary" @click="close">Musobaqani yakunlash</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.c-lobby {
  display: flex;
  flex-direction: column;
  background: var(--bg);
  z-index: 30;
}

.c-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--line);
  background: var(--card);
}

.c-back {
  width: 34px;
  height: 34px;
  border-radius: var(--r-sm);
  background: var(--tint);
  color: var(--ink);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.c-head h1 {
  font-family: 'Sora', sans-serif;
  font-size: 17px;
  font-weight: 700;
}

.c-head p {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.c-vs {
  margin-left: auto;
  padding: 6px 12px;
  border-radius: var(--r-pill);
  background: var(--gold);
  color: var(--gold-ink);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .06em;
}

.c-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px 20px;
}

.c-label {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: .1em;
  color: var(--muted);
}

.c-link-card {
  background: var(--card);
  border-radius: var(--r-lg);
  padding: 16px;
  border: 1px solid var(--line);
}

.c-link {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: var(--tint);
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  word-break: break-all;
}

.c-hint {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.5;
  margin-top: 10px;
}

.c-share {
  width: 100%;
  margin-top: 12px;
  padding: 11px;
  border-radius: var(--r-md);
  background: var(--tint);
  color: var(--brand);
  font-size: 13px;
  font-weight: 700;
}

.c-list {
  margin-top: 20px;
}

.c-list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.c-live {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand);
}

.c-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: var(--card);
  border: 1px solid var(--line);
  margin-bottom: 8px;
}

.c-row b {
  font-size: 14px;
  font-weight: 700;
}

.c-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--tint);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  color: var(--brand);
  overflow: hidden;
  flex-shrink: 0;
}

.c-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.c-state {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--muted);
}

.c-row.ready .c-state,
.c-row.finished .c-state {
  color: var(--brand);
}

.c-row.playing .c-state {
  color: var(--gold-deep, var(--brand));
}

.c-row.absent {
  opacity: .6;
}

.c-loading {
  text-align: center;
  padding: 40px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}

.c-foot {
  padding: 14px 18px calc(18px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: var(--card);
}

.c-foot .btn {
  width: 100%;
}

.btn:disabled {
  opacity: .45;
  pointer-events: none;
}
</style>
