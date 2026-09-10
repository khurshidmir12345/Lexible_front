<script setup>
/**
 * UT-06 «Musobaqa lobbi» — the teacher's side, and then the live board.
 *
 * A class game is called in through the bot: the roster card leads, with
 * how many were messaged and a way to call the stragglers again; the link
 * sits under it for anyone the bot cannot reach. An open game has only the
 * link, so the link leads.
 *
 * Once the round is running, the same list becomes the scoreboard: correct
 * so far, how far through the paper, and each player's clock — refreshed
 * every couple of seconds, best first — with the round's own countdown on
 * top when the teacher set one.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CompetitionBoard from './CompetitionBoard.vue'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  competitionId: { type: Number, required: true },
  /** Both needed to run the same stage again from the result board. */
  groupId: { type: Number, default: null },
  stageId: { type: Number, default: null },
})

const emit = defineEmits(['close'])

const currentId = ref(props.competitionId)
const currentStageId = ref(props.stageId)

const lobby = ref(null)
const board = ref(null)
const starting = ref(false)
const closing = ref(false)
const calling = ref(false)
const now = ref(Date.now())

let timer = null
let ticker = null
const POLL = window.LEXIBLE?.competition?.poll_interval_ms ?? 2000

const joined = computed(() => (lobby.value?.students ?? []).filter((s) => s.joined))
const canStart = computed(() => joined.value.length > 0 && lobby.value?.status === 'lobby')
const running = computed(() => lobby.value?.status === 'playing')
const isClass = computed(() => Boolean(lobby.value?.group_id))

/** Everyone who has a paper, for the live board — best first, as served. */
const players = computed(() => (lobby.value?.students ?? []).filter((s) => s.joined))
const finishedCount = computed(() => players.value.filter((s) => s.status === 'finished').length)

/** The round's countdown, ticking locally between polls. */
const remaining = computed(() => {
  if (!lobby.value?.deadline_at) return null
  return Math.max(0, Math.round((Date.parse(lobby.value.deadline_at) - now.value) / 1000))
})

const elapsed = computed(() => {
  if (!lobby.value?.started_at) return null
  return Math.max(0, Math.round((now.value - Date.parse(lobby.value.started_at)) / 1000))
})

const mmss = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

const LABELS = {
  ready: 'Tayyor',
  playing: 'Oʼynamoqda',
  finished: 'Tugatdi',
  absent: 'Kelmadi',
}

async function poll() {
  try {
    const { competition, finished } = await api.teacher.competition(currentId.value)

    if (finished) {
      board.value = competition
      stopPolling()
    } else {
      lobby.value = competition
      if (competition.stage_id) currentStageId.value = competition.stage_id
    }
  } catch (error) {
    store.toast(error.message)
    stopPolling()
  }
}

function startPolling() {
  stopPolling()
  timer = setInterval(poll, POLL)
  ticker = setInterval(() => (now.value = Date.now()), 500)
}

function stopPolling() {
  if (timer) clearInterval(timer)
  if (ticker) clearInterval(ticker)
  timer = null
  ticker = null
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

async function finish() {
  closing.value = true

  try {
    const { competition } = await api.teacher.closeCompetition(currentId.value)
    board.value = competition
    stopPolling()
  } catch (error) {
    store.toast(error.message)
  } finally {
    closing.value = false
  }
}

/** Messages the classmates who have not come in yet, once more. */
async function callAgain() {
  calling.value = true
  telegram.haptic()

  try {
    const { sent, competition } = await api.teacher.notifyCompetition(currentId.value)
    lobby.value = competition
    store.toast(sent ? `📨 ${sent} oʼquvchiga xabar yuborildi` : 'Hamma allaqachon qoʼshilgan')
  } catch (error) {
    store.toast(error.message)
  } finally {
    calling.value = false
  }
}

/** Runs the same stage again with a clean lobby and the same settings. */
async function again() {
  const stageId = currentStageId.value

  if (!stageId) {
    emit('close')
    return
  }

  const options = {
    types: board.value?.types ?? undefined,
    duration_minutes: board.value?.duration_minutes ?? null,
  }

  try {
    const { competition } = props.groupId || board.value?.group_id
      ? await api.teacher.openCompetition(props.groupId ?? board.value.group_id, stageId, options)
      : await api.teacher.openStageCompetition(stageId, null, options)

    currentId.value = competition.id
    lobby.value = competition
    board.value = null
    startPolling()
  } catch (error) {
    store.toast(error.message)
    emit('close')
  }
}

function copyLink() {
  if (!lobby.value?.invite_link) return

  telegram.copy(lobby.value.invite_link)
  telegram.haptic()
  store.toast('🔗 Havola nusxalandi')
}

function share() {
  if (!lobby.value?.invite_link) return

  telegram.share(
    lobby.value.invite_link,
    `«${lobby.value.group}» — ${lobby.value.stage ? `${lobby.value.stage}-bosqich` : lobby.value.stage_title} musobaqasi. Qoʼshiling!`,
  )
}

onMounted(() => {
  poll()
  startPolling()
})

onBeforeUnmount(stopPolling)
</script>

<template>
  <div class="overlay show lobby">
    <CompetitionBoard v-if="board" :board="board" @close="emit('close')" @again="again" />

    <template v-else>
      <header class="t-head">
        <button class="t-back" aria-label="Yopish" @click="emit('close')">
          <span v-html="TeacherIcon.cross"></span>
        </button>
        <div class="t-head-main">
          <h1>{{ running ? 'Jonli natijalar' : 'Musobaqa' }}</h1>
          <p v-if="lobby">
            <template v-if="lobby.stage">{{ lobby.stage }}-bosqich · </template>
            {{ lobby.stage_title || lobby.group }} · {{ lobby.words }} soʼz
            <template v-if="lobby.duration_minutes"> · {{ lobby.duration_minutes }} daq</template>
          </p>
        </div>
        <span class="vs-tag t-vs">VS</span>
      </header>

      <div class="t-body">
        <template v-if="lobby">
          <!-- ============================================== LOBBY -->
          <template v-if="!running">
            <!-- A class is called in through the bot -->
            <div v-if="isClass" class="t-card roster">
              <span class="t-label">GURUHGA XABAR</span>
              <div class="roster-row">
                <span class="roster-ic" v-html="TeacherIcon.bell"></span>
                <span class="roster-text">
                  <b v-if="lobby.notified_at">Botdan taklif yuborildi</b>
                  <b v-else>Hali xabar yuborilmadi</b>
                  <i>{{ lobby.roster_count }} oʼquvchi · «Oʼyinga qoʼshilish» tugmasi bilan</i>
                </span>
              </div>
              <button class="call" :disabled="calling" @click="callAgain">
                <span v-html="TeacherIcon.bell"></span>
                {{ calling ? 'Yuborilmoqda…' : 'Qoʼshilmaganlarga qayta yuborish' }}
              </button>
            </div>

            <!-- The invite link -->
            <div class="t-card">
              <span class="t-label">{{ isClass ? 'YOKI HAVOLA ORQALI' : 'MUSOBAQA HAVOLASI' }}</span>
              <button class="link" @click="copyLink">
                <span>{{ lobby.invite_link }}</span>
                <span class="copy-ic" v-html="TeacherIcon.copy"></span>
              </button>

              <div v-if="!isClass" class="warn">
                <span v-html="TeacherIcon.info"></span>
                <b>Havola orqali istalgan oʼquvchi qoʼshila oladi — botga <b>start</b> bosgan boʼlsa kifoya.</b>
              </div>

              <button class="share" @click="share">Telegramda ulashish</button>
            </div>

            <!-- Who is here -->
            <div class="t-section">
              <span class="t-label">QOʼSHILGANLAR · {{ joined.length }}<template v-if="lobby.roster_count"> / {{ lobby.roster_count }}</template></span>
              <span class="live"><i></i> jonli yangilanadi</span>
            </div>

            <div v-if="lobby.students.length" class="t-rows">
              <div
                v-for="student in lobby.students"
                :key="student.id"
                class="t-row"
                :class="{ absent: student.status === 'absent' }"
              >
                <span class="t-avatar">
                  <img v-if="student.avatar" :src="student.avatar" alt="" />
                  <template v-else>{{ student.name.charAt(0) }}</template>
                </span>
                <span class="t-row-text"><b>{{ student.name }}</b></span>
                <span class="state" :class="student.status">
                  <i v-if="student.joined"></i>{{ LABELS[student.status] }}
                </span>
              </div>
            </div>

            <div v-else class="t-empty">
              <span class="t-empty-ic" v-html="TeacherIcon.group"></span>
              <h3>Hali hech kim qoʼshilmadi</h3>
              <p>Havolani oʼquvchilarga yuboring — ismlar shu yerda paydo boʼladi.</p>
            </div>
          </template>

          <!-- ========================================= LIVE BOARD -->
          <template v-else>
            <div class="clock-card" :class="{ low: remaining !== null && remaining <= 30 }">
              <span class="clock-text">
                <i>{{ remaining !== null ? 'QOLGAN VAQT' : 'OʼTGAN VAQT' }}</i>
                <b class="v-num">{{ mmss(remaining ?? elapsed ?? 0) }}</b>
              </span>
              <span class="clock-side">
                <b class="v-num">{{ finishedCount }}/{{ players.length }}</b>
                <i>tugatdi</i>
              </span>
            </div>

            <div class="t-section">
              <span class="t-label">JONLI JADVAL</span>
              <span class="live"><i></i> har {{ Math.round(POLL / 1000) }} soniyada</span>
            </div>

            <div class="t-rows">
              <div
                v-for="(student, index) in players"
                :key="student.id"
                class="t-row live-row"
                :class="student.status"
              >
                <span class="t-rank" :class="index < 3 ? `g${index + 1}` : ''">{{ index + 1 }}</span>
                <span class="t-avatar">
                  <img v-if="student.avatar" :src="student.avatar" alt="" />
                  <template v-else>{{ student.name.charAt(0) }}</template>
                </span>
                <span class="t-row-text">
                  <b>{{ student.name }}</b>
                  <i>
                    <template v-if="student.status === 'finished'">
                      Tugatdi · {{ student.duration }}<template v-if="student.timed_out"> · vaqt tugadi</template>
                    </template>
                    <template v-else-if="student.status === 'playing'">
                      {{ student.answered }}/{{ student.total }} savol · {{ student.duration ?? '0:00' }}
                    </template>
                    <template v-else>hali boshlamadi</template>
                  </i>
                  <span class="t-meter">
                    <i :class="student.status" :style="{ width: `${student.total ? (student.answered / student.total) * 100 : 0}%` }"></i>
                  </span>
                </span>
                <b class="score v-num">{{ student.score }}<small>/{{ student.total }}</small></b>
              </div>
            </div>
          </template>
        </template>

        <p v-else class="t-loading">Yuklanmoqda…</p>
      </div>

      <div class="t-foot">
        <button
          v-if="lobby?.status === 'lobby'"
          class="btn btn-primary"
          :disabled="!canStart || starting"
          @click="start"
        >
          {{ starting ? 'Boshlanmoqda…' : 'Musobaqani boshlash' }}
          <template v-if="joined.length"> · {{ joined.length }} oʼquvchi</template>
        </button>
        <button v-else class="btn btn-primary" :disabled="closing" @click="finish">
          {{ closing ? 'Yakunlanmoqda…' : 'Musobaqani yakunlash' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.lobby { background: var(--canvas); z-index: 30; }

.vs-tag {
  background: var(--wash-2);
  color: var(--muted);
  border-radius: 10px;
  padding: 6px 10px;
  flex: none;
}

/* ------------------------------------------------------------------ roster */

.roster { border: 1.5px solid var(--blue); }

.roster-row { display: flex; align-items: center; gap: 12px; margin-top: 10px; }

.roster-ic {
  width: 40px;
  height: 40px;
  border-radius: var(--r-md);
  background: var(--blue-soft);
  color: var(--blue);
  display: grid;
  place-items: center;
  flex: none;
}

.roster-text { flex: 1; min-width: 0; }
.roster-text b { display: block; font-size: 14px; font-weight: 800; }
.roster-text i { display: block; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--muted); margin-top: 2px; }

.call {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  border: none;
  border-radius: var(--r-md);
  background: var(--blue);
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.call > span { display: grid; place-items: center; }
.call:disabled { opacity: .6; }

/* ------------------------------------------------------------------- link */

.link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1.5px dashed var(--line-4);
  border-radius: 13px;
  padding: 12px 14px;
  margin-top: 10px;
  background: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
}

.link > span:first-child {
  flex: 1;
  min-width: 0;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--blue);
  word-break: break-all;
}

.copy-ic { color: var(--muted); display: grid; place-items: center; flex: none; }

.warn { display: flex; align-items: flex-start; gap: 9px; margin-top: 11px; }
.warn > span:first-child { color: var(--gold); display: grid; place-items: center; flex: none; margin-top: 1px; }
.warn b { font-size: 11.5px; font-weight: 700; color: var(--gold-text); line-height: 1.5; }

.share {
  width: 100%;
  margin-top: 12px;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: none;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: var(--muted);
  cursor: pointer;
}

/* ------------------------------------------------------------------ roster */

.live { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--muted); }
.live i { width: 8px; height: 8px; border-radius: var(--r-pill); background: var(--green); animation: blink 1.4s infinite; }

@keyframes blink { 50% { opacity: .3; } }

.t-row.absent { opacity: .7; }

.state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--r-pill);
  padding: 4px 10px;
  font-size: 10.5px;
  font-weight: 800;
  background: var(--wash-2);
  color: var(--faint);
  flex: none;
}

.state i { width: 6px; height: 6px; border-radius: var(--r-pill); background: currentColor; }

.state.ready, .state.finished { background: var(--green-soft); color: var(--green-dark); }
.state.playing { background: var(--blue-soft); color: var(--blue); }

/* -------------------------------------------------------------- live board */

.clock-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--ink);
  color: var(--card);
  border-radius: var(--r-lg);
  padding: 14px 18px;
}

.app.dark .clock-card { background: var(--wash-2); color: var(--ink); }

.clock-card.low { background: var(--red); color: #fff; }

.clock-text i { display: block; font-style: normal; font-size: 10.5px; font-weight: 800; letter-spacing: 1px; opacity: .7; }
.clock-text b { display: block; font-family: 'Sora', sans-serif; font-size: 30px; font-weight: 700; line-height: 1.1; margin-top: 2px; }

.clock-side { text-align: right; }
.clock-side b { display: block; font-size: 18px; font-weight: 700; }
.clock-side i { display: block; font-style: normal; font-size: 11px; font-weight: 700; opacity: .7; }

.live-row .t-row-text i { display: block; font-style: normal; font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 1px; }
.live-row .t-meter { display: block; margin-top: 6px; height: 4px; }
.live-row .t-meter > i.playing { background: var(--blue); }
.live-row .t-meter > i.finished { background: var(--green); }
.live-row.ready { opacity: .6; }

.score { font-size: 17px; font-weight: 700; color: var(--green); flex: none; }
.score small { font-size: 11px; font-weight: 700; color: var(--faint); }
</style>
