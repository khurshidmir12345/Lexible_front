<script setup>
/**
 * UT-06 «Musobaqa lobbi» — the teacher's side. The link is the whole screen:
 * hand it out, watch names arrive, then release the class.
 *
 * A group game lists everybody in the class so the missing names show too; an
 * open game can only list whoever has actually turned up.
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

let timer = null
const POLL = window.LEXIBLE?.competition?.poll_interval_ms ?? 2000

const joined = computed(() => (lobby.value?.students ?? []).filter((s) => s.joined))
const canStart = computed(() => joined.value.length > 0 && lobby.value?.status === 'lobby')
const running = computed(() => lobby.value?.status === 'playing')

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

/** Runs the same stage again with a clean lobby. */
async function again() {
  const stageId = currentStageId.value

  if (!stageId) {
    emit('close')
    return
  }

  try {
    const { competition } = props.groupId
      ? await api.teacher.openCompetition(props.groupId, stageId)
      : await api.teacher.openStageCompetition(stageId, null)

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
    `«${lobby.value.group}» — ${lobby.value.stage}-bosqich musobaqasi. Qoʼshiling!`,
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
          <h1>Musobaqa</h1>
          <p v-if="lobby">
            <template v-if="lobby.stage">{{ lobby.stage }}-bosqich · </template>
            {{ lobby.stage_title || lobby.group }} · {{ lobby.words }} soʼz
          </p>
        </div>
        <span class="vs-tag t-vs">VS</span>
      </header>

      <div class="t-body">
        <template v-if="lobby">
          <!-- The invite -->
          <div class="t-card">
            <span class="t-label">MUSOBAQA HAVOLASI</span>
            <button class="link" @click="copyLink">
              <span>{{ lobby.invite_link }}</span>
              <span class="copy-ic" v-html="TeacherIcon.copy"></span>
            </button>

            <div class="warn">
              <span v-html="TeacherIcon.info"></span>
              <b>
                Havola faqat botga <b>start</b> bosgan oʼquvchilarda ochiladi.
                Start bosmaganlar avval botni ishga tushiradi.
              </b>
            </div>

            <button class="share" @click="share">Telegramda ulashish</button>
          </div>

          <!-- Who is here -->
          <div class="t-section">
            <span class="t-label">QOʼSHILGANLAR · {{ joined.length }}</span>
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
          {{ closing ? 'Yakunlanmoqda…' : running ? 'Musobaqani yakunlash' : 'Natijalarni koʼrish' }}
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
  color: var(--green);
  cursor: pointer;
}

/* ------------------------------------------------------------------ roster */

.live { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--muted); }
.live i { width: 8px; height: 8px; border-radius: var(--r-pill); background: var(--green); }

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
</style>
