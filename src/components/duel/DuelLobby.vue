<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({ code: String })
const emit = defineEmits(['close', 'play'])

const duel = ref(null)
const error = ref(null)
let poller = null

const POLL = window.LEXIBLE?.duel?.poll_interval_ms ?? 1500

function stopPolling() {
  clearInterval(poller)
  poller = null
}

async function refresh() {
  try {
    const { duel: state } = await api.duel(props.code)
    duel.value = state

    // The moment a rival appears, both sides drop into the countdown.
    if (state.rival) {
      stopPolling()
      setTimeout(() => emit('play'), 900)
    }
  } catch (e) {
    error.value = e.message
    stopPolling()
  }
}

function copy() {
  telegram.copy(duel.value.invite_link)
  store.toast('🔗 Havola nusxalandi')
}

function share() {
  telegram.share(duel.value.invite_link, 'Kel, soʼzlar boʼyicha bellashamiz!')
}

onMounted(() => {
  refresh()
  poller = setInterval(refresh, POLL)
})

onBeforeUnmount(stopPolling)
</script>

<template>
  <div class="overlay show lobby">
    <header class="lobby-head">
      <button class="lobby-x" @click="$emit('close')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div class="lobby-title">Duel</div>
    </header>

    <div class="lobby-body">
      <div class="vs-badge">VS</div>

      <div style="text-align: center">
        <div class="lobby-h1">«{{ duel?.category ?? '—' }}» boʼyicha duel</div>
        <div class="lobby-sub">Havolani doʼstingizga yuboring va bellashing</div>
      </div>

      <div v-if="error" class="lobby-error">{{ error }}</div>

      <template v-else-if="duel">
        <div class="link">{{ duel.invite_link.replace('https://', '') }}</div>

        <div class="lobby-actions">
          <button class="btn btn-primary" @click="copy">Nusxalash</button>
          <button class="btn btn-soft" @click="share">Ulashish</button>
        </div>

        <div class="players">
          <div class="player">
            <span class="avatar me">{{ duel.me.initial }}</span>
            <b>Siz</b>
            <i>tayyor</i>
          </div>

          <span class="vs-small">VS</span>

          <div class="player" :class="{ waiting: !duel.rival }">
            <span class="avatar" :class="{ rival: duel.rival }">{{ duel.rival?.initial ?? '?' }}</span>
            <b>{{ duel.rival?.name ?? 'Doʼst' }}</b>
            <i>{{ duel.rival ? 'qoʼshildi ✓' : 'kutilmoqda…' }}</i>
          </div>
        </div>

        <p class="hint">
          {{ duel.rival ? 'boshlanmoqda…' : `${duel.questions} ta savol · gʼolibga ${duel.reward} tanga` }}
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.lobby { background: var(--card); z-index: 22; }

.lobby-head {
  display: flex; align-items: center; gap: 13px;
  padding: 10px 22px 9px; flex: none;
}

.lobby-x {
  width: 36px; height: 36px; border-radius: 12px;
  border: 1px solid var(--line); background: none; color: var(--muted);
  display: grid; place-items: center; cursor: pointer;
}

.lobby-title { font-family: 'Sora', sans-serif; font-size: 19px; font-weight: 700; }

.lobby-body {
  flex: 1; display: flex; flex-direction: column;
  justify-content: center; gap: 16px; padding: 0 26px 40px;
}

.vs-badge {
  width: 72px; height: 72px; border-radius: 22px;
  background: var(--green-soft); color: var(--green);
  display: grid; place-items: center; align-self: center;
  font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 1px;
}

.lobby-h1 { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; }
.lobby-sub { font-size: 13.5px; font-weight: 600; color: var(--muted); margin-top: 6px; }

.link {
  border: 1.5px dashed #C3CEC5; border-radius: 14px; padding: 14px;
  text-align: center; font-size: 14px; font-weight: 700;
  color: #2E7CF6; letter-spacing: .3px; word-break: break-all;
}

.lobby-actions { display: flex; gap: 10px; }
.lobby-actions .btn { flex: 1; }

.players {
  display: flex; align-items: center; justify-content: center;
  gap: 18px; margin-top: 6px;
}

.player {
  display: flex; flex-direction: column; align-items: center;
  gap: 5px; flex: 1;
}

.player b { font-size: 13.5px; font-weight: 700; }
.player i { font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--muted); }
.player.waiting { opacity: .55; }

.avatar {
  width: 54px; height: 54px; border-radius: var(--r-pill);
  display: grid; place-items: center;
  font-family: 'Sora', sans-serif; font-size: 21px; font-weight: 700;
  background: var(--wash-2); color: var(--muted); border: 1.5px dashed var(--line-4);
}

.avatar.me { background: var(--green); color: #fff; border: none; }
.avatar.rival { background: #2E7CF6; color: #fff; border: none; }

.vs-small { font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700; color: var(--faint); }

.hint { text-align: center; font-size: 12.5px; font-weight: 700; color: var(--faint); }

.lobby-error {
  background: var(--red-soft); border: 1px solid var(--red-line);
  color: var(--red-dark); border-radius: 14px; padding: 13px;
  font-size: 13px; font-weight: 700; text-align: center;
}
</style>
