<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CompetitionBoard from './CompetitionBoard.vue'
import TestRunner from '../test/TestRunner.vue'
import Mascot from '../ui/Mascot.vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({ code: String })
const emit = defineEmits(['close'])

/** waiting → playing → board */
const stage = ref('waiting')
const state = ref(null)
const session = ref(null)
const board = ref(null)
const joining = ref(true)

let poller = null
const POLL = window.LEXIBLE?.competition?.poll_interval_ms ?? 2000

const meId = computed(() => store.state.user?.id ?? null)

function stopPolling() {
  clearInterval(poller)
  poller = null
}

/**
 * The teacher decides when the class starts, so the student sits on this
 * screen until the round flips to `playing`.
 */
function watchLobby() {
  stopPolling()
  poller = setInterval(async () => {
    try {
      const { competition } = await api.competition(props.code)
      state.value = competition

      if (competition.status === 'playing' && stage.value === 'waiting') await begin()
      if (competition.status === 'finished') await showBoard()
    } catch {
      /* a dropped poll is not worth interrupting the wait for */
    }
  }, POLL)
}

async function join() {
  joining.value = true
  try {
    const { competition } = await api.joinCompetition(props.code)
    state.value = competition

    if (competition.status === 'finished') return showBoard()
    if (competition.status === 'playing') return begin()

    watchLobby()
  } catch (error) {
    store.toast(error.message)
    emit('close')
  } finally {
    joining.value = false
  }
}

async function begin() {
  stopPolling()
  try {
    const data = await api.competitionSession(props.code)
    session.value = { id: data.session_id, questions: data.questions }
    state.value = data.competition
    stage.value = 'playing'
    telegram.notify('success')
  } catch (error) {
    store.toast(error.message)
    watchLobby()
  }
}

async function onFinished(result) {
  try {
    await api.finishCompetition(props.code, result.correct, result.total, result.duration_ms)
  } catch (error) {
    store.toast(error.message)
  }

  await showBoard()

  // Classmates may still be answering; the board fills in as they land.
  if (board.value?.status !== 'finished') {
    stopPolling()
    poller = setInterval(async () => {
      await showBoard()
      if (board.value?.status === 'finished') stopPolling()
    }, POLL)
  }
}

async function showBoard() {
  try {
    const { competition } = await api.myCompetitionResults(props.code)
    board.value = competition
    stage.value = 'board'
  } catch (error) {
    store.toast(error.message)
    emit('close')
  }
}

function close() {
  stopPolling()
  store.refreshDashboard().catch(() => {})
  emit('close')
}

onMounted(join)
onBeforeUnmount(stopPolling)
</script>

<template>
  <div v-if="stage === 'waiting'" class="overlay show cf-wait">
    <Mascot />

    <h1>Musobaqa</h1>
    <p v-if="state">{{ state.group }} · {{ state.stage }}-bosqich · {{ state.questions }} savol</p>

    <div class="cf-pulse">
      <span></span><span></span><span></span>
    </div>

    <p class="cf-note">
      Ustoz boshlashini kutmoqdamiz.<br />
      <b v-if="state">{{ state.joined_count }} oʼquvchi qoʼshildi</b>
    </p>

    <button class="btn btn-soft" @click="close">Chiqish</button>
  </div>

  <TestRunner
    v-else-if="stage === 'playing' && session"
    :session-id="session.id"
    :questions="session.questions"
    competition
    @finished="onFinished"
    @exit="close"
  />

  <div v-else-if="stage === 'board' && board" class="overlay show cf-board">
    <CompetitionBoard :board="board" :me-id="meId" @close="close" @again="close" />
  </div>
</template>

<style scoped>
.cf-wait {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 30px 26px calc(30px + env(safe-area-inset-bottom));
  background: var(--canvas);
  text-align: center;
  z-index: 30;
}

.cf-wait h1 {
  font-family: 'Sora', sans-serif;
  font-size: 22px;
  font-weight: 700;
}

.cf-wait p {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}

.cf-note {
  line-height: 1.7;
}

.cf-note b {
  color: var(--green);
  font-weight: 700;
}

.cf-pulse {
  display: flex;
  gap: 8px;
  margin: 4px 0;
}

.cf-pulse span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--green);
  animation: cf-bounce 1.1s infinite ease-in-out;
}

.cf-pulse span:nth-child(2) { animation-delay: .15s; }
.cf-pulse span:nth-child(3) { animation-delay: .3s; }

@keyframes cf-bounce {
  0%, 80%, 100% { opacity: .3; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-6px); }
}

.cf-wait .btn {
  margin-top: 10px;
  min-width: 160px;
}

.cf-board {
  background: var(--canvas);
  z-index: 30;
}
</style>
