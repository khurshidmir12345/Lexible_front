<script setup>
import { onBeforeUnmount, ref } from 'vue'
import DuelLobby from './DuelLobby.vue'
import DuelCountdown from './DuelCountdown.vue'
import DuelResult from './DuelResult.vue'
import TestRunner from '../test/TestRunner.vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'

const props = defineProps({ code: String })
const emit = defineEmits(['close'])

/** lobby → countdown → playing → result */
const stage = ref('lobby')
const duel = ref(null)
const session = ref(null)

let poller = null
const POLL = window.LEXIBLE?.duel?.poll_interval_ms ?? 1500

function stopPolling() {
  clearInterval(poller)
  poller = null
}

/** Keeps the rival's score on screen while both are answering. */
function watchRival() {
  stopPolling()
  poller = setInterval(async () => {
    try {
      const { duel: state } = await api.duel(props.code)
      duel.value = state
    } catch {
      /* a dropped poll is not worth interrupting the round for */
    }
  }, POLL)
}

async function begin() {
  try {
    const data = await api.playDuel(props.code)
    session.value = { id: data.session_id, questions: data.questions }
    duel.value = data.duel
    stage.value = 'countdown'
  } catch (error) {
    store.toast(error.message)
    emit('close')
  }
}

function go() {
  stage.value = 'playing'
  watchRival()
}

/** The rival may still be answering; keep watching until they land. */
function watchFinish() {
  stopPolling()
  poller = setInterval(async () => {
    try {
      const { duel: latest } = await api.duel(props.code)
      duel.value = latest
      if (latest.status === 'finished') stopPolling()
    } catch {
      /* a dropped poll is not worth interrupting the result for */
    }
  }, POLL)
}

function showResult(state) {
  stopPolling()
  duel.value = state
  stage.value = 'result'
  if (state.status !== 'finished') watchFinish()
}

async function onFinished(result) {
  stopPolling()

  try {
    const { duel: state } = await api.finishDuel(props.code, result.correct, result.duration_ms)
    showResult(state)
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

onBeforeUnmount(stopPolling)
</script>

<template>
  <DuelLobby v-if="stage === 'lobby'" :code="code" @close="close" @play="begin" @result="showResult" />

  <DuelCountdown
    v-else-if="stage === 'countdown'"
    :me="duel?.me"
    :rival="duel?.rival"
    @done="go"
  />

  <TestRunner
    v-else-if="stage === 'playing' && session"
    :session-id="session.id"
    :questions="session.questions"
    :duel="duel"
    @finished="onFinished"
    @exit="close"
  />

  <DuelResult v-else-if="stage === 'result'" :duel="duel" @close="close" />
</template>
