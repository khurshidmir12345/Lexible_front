<script setup>
/**
 * What a game is going to be, asked before the lobby opens — the teacher's
 * counterpart of the student's «Qaysi testlar boʼlsin?» sheet: which
 * exercises are raced on, and whether there is a clock.
 *
 * If a lobby for this stage is still open (the teacher left the screen and
 * the class is waiting in it), the sheet offers that first, so a second tap
 * on «Oʼyin boshlash» walks back in rather than throwing the class out.
 */
import { computed, onMounted, ref } from 'vue'
import { TEST_TYPES } from '../../lib/icons'
import { TeacherIcon } from '../../lib/icons2'
import { languageShort } from '../../lib/languages'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  stageId: { type: Number, required: true },
  /** Null for an open game: no roster, just a link. */
  groupId: { type: Number, default: null },
  /** The exercises the path allows; null means all of them. */
  allowed: { type: Array, default: null },
  stageLabel: { type: String, default: '' },
})

const emit = defineEmits(['close', 'created', 'resume'])

const MINUTES = [null, 1, 2, 3, 5, 10, 15]

/** The flashcard has no right answer to race on, so it is never offered. */
const offered = computed(() =>
  TEST_TYPES.filter((t) => t.key !== 'card' && (!props.allowed?.length || props.allowed.includes(t.key))),
)

const chosen = ref(new Set(offered.value.map((t) => t.key)))
const minutes = ref(null)
const custom = ref('')
const busy = ref(false)
const live = ref(null)
const checking = ref(true)

const rows = computed(() =>
  offered.value.map((type) => ({
    ...type,
    label: type.name.replace('{lang}', languageShort(store.state.user?.native_lang)),
  })),
)

const selected = computed(() => offered.value.filter((t) => chosen.value.has(t.key)).map((t) => t.key))

/** The clock as it will be sent: a chip, or whatever was typed. */
const clock = computed(() => {
  const typed = parseInt(custom.value, 10)
  if (custom.value !== '' && typed > 0) return Math.min(typed, 180)
  return minutes.value
})

function toggle(key) {
  const next = new Set(chosen.value)
  next.has(key) ? next.delete(key) : next.add(key)
  if (!next.size) return
  chosen.value = next
  telegram.haptic()
}

function pickMinutes(value) {
  minutes.value = value
  custom.value = ''
  telegram.haptic()
}

/** A lobby or a running round on this very stage, if the teacher left one. */
async function findLive() {
  try {
    const { competitions } = await api.teacher.competitions(props.groupId)
    live.value = competitions.find((c) => c.live && c.stage_id === props.stageId) ?? null
  } catch {
    live.value = null
  } finally {
    checking.value = false
  }
}

async function create() {
  if (!selected.value.length || busy.value) return
  busy.value = true

  const options = { types: selected.value, duration_minutes: clock.value }

  try {
    const { competition } = props.groupId
      ? await api.teacher.openCompetition(props.groupId, props.stageId, options)
      : await api.teacher.openStageCompetition(props.stageId, null, options)

    telegram.notify('success')
    emit('created', competition)
  } catch (error) {
    store.toast(error.message)
  } finally {
    busy.value = false
  }
}

onMounted(findLive)
</script>

<template>
  <Teleport to="#lx-overlays">
    <div class="scrim" @click.self="emit('close')">
      <div class="card">
        <span class="grabber"></span>
        <h2>Oʼyin sozlamalari</h2>
        <p>{{ stageLabel || 'Bosqich' }} · qaysi mashqlar va qancha vaqt?</p>

        <!-- The class is already waiting somewhere -->
        <button v-if="live" class="live" @click="emit('resume', live)">
          <span class="live-dot"></span>
          <span class="live-text">
            <b>{{ live.status === 'playing' ? 'Oʼyin davom etmoqda' : 'Ochiq lobbi bor' }} · {{ live.participants }} oʼquvchi</b>
            <i>Qaytib kirish — sinf sizni kutmoqda</i>
          </span>
          <span class="chev" v-html="TeacherIcon.chevron"></span>
        </button>

        <span class="t-label">MASHQ TURLARI</span>
        <div class="type-list">
          <button
            v-for="type in rows"
            :key="type.key"
            class="type"
            :class="{ pick: chosen.has(type.key) }"
            @click="toggle(type.key)"
          >
            <span class="type-ic" :style="{ background: type.bg, color: type.color }" v-html="type.icon"></span>
            <span class="type-text">
              <b>{{ type.label }}</b>
              <i>{{ type.desc }}</i>
            </span>
            <span class="check">{{ chosen.has(type.key) ? '✓' : '' }}</span>
          </button>
        </div>

        <span class="t-label">VAQT CHEGARASI</span>
        <div class="chips">
          <button
            v-for="m in MINUTES"
            :key="m ?? 'none'"
            class="t-chip"
            :class="{ on: custom === '' && minutes === m }"
            @click="pickMinutes(m)"
          >{{ m ? `${m} daq` : 'Cheksiz' }}</button>
          <label class="custom" :class="{ on: custom !== '' }">
            <input v-model="custom" type="number" inputmode="numeric" min="1" max="180" placeholder="…" />
            <span>daq</span>
          </label>
        </div>
        <p class="hint">
          <template v-if="clock">
            Vaqt tugaganda hamma yakunlanadi; ulgurmagan soʼzlar notoʼgʼri hisoblanadi.
          </template>
          <template v-else>Vaqtsiz — har kim oʼz tezligida tugatadi.</template>
        </p>

        <div v-if="groupId" class="t-note plain">
          <span v-html="TeacherIcon.info"></span>
          <b>Guruh oʼquvchilariga botdan «Oʼyinga qoʼshilish» tugmali xabar boradi.</b>
        </div>

        <div class="actions">
          <button class="btn btn-soft" @click="emit('close')">Bekor</button>
          <button class="btn btn-primary" :disabled="!selected.length || busy || checking" @click="create">
            {{ busy ? 'Ochilmoqda…' : 'Oʼyinni ochish' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: absolute;
  inset: 0;
  z-index: 34;
  background: rgba(22, 32, 26, .45);
  display: flex;
  align-items: flex-end;
}

.card {
  width: 100%;
  background: var(--card);
  border-radius: 24px 24px 0 0;
  padding: 12px 22px calc(24px + var(--lx-foot));
  max-height: 92%;
  overflow-y: auto;
}

.grabber {
  display: block;
  width: 38px;
  height: 4px;
  border-radius: var(--r-pill);
  background: var(--line);
  margin: 0 auto 16px;
}

h2 { font-family: 'Sora', sans-serif; font-size: 19px; font-weight: 700; }
p { font-size: 12.5px; font-weight: 600; color: var(--muted); margin-top: 4px; }

.t-label { display: block; margin-top: 18px; }

/* --------------------------------------------------------------- resume */

.live {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-top: 14px;
  border: 1.5px solid var(--blue);
  border-radius: 14px;
  padding: 12px 14px;
  background: var(--blue-soft);
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
  color: var(--ink);
}

.live-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--r-pill);
  background: var(--blue);
  flex: none;
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(36, 128, 182, .45); }
  60% { box-shadow: 0 0 0 7px rgba(36, 128, 182, 0); }
}

.live-text { flex: 1; min-width: 0; }
.live-text b { display: block; font-size: 13.5px; font-weight: 800; color: var(--blue); }
.live-text i { display: block; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--muted); margin-top: 2px; }

.chev { color: var(--blue); display: grid; place-items: center; flex: none; }

/* ---------------------------------------------------------------- types */

.type-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }

.type {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 13px;
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
}

.type.pick { border-color: var(--green); background: var(--wash-3); }

.type-ic { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; flex: none; }
.type-ic :deep(svg) { width: 18px; height: 18px; }

.type-text { flex: 1; min-width: 0; }
.type-text b { display: block; font-size: 13.5px; font-weight: 700; color: var(--ink); }
.type-text i { display: block; font-style: normal; font-size: 11px; font-weight: 600; color: var(--faint); }

.check {
  width: 22px;
  height: 22px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--line-4);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  flex: none;
}

.type.pick .check { background: var(--green); border-color: var(--green); }

/* ---------------------------------------------------------------- clock */

.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }

.custom {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  padding: 0 10px 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}

.custom.on { border-color: var(--green); color: var(--green-dark); background: var(--wash-3); }

.custom input {
  width: 44px;
  border: none;
  background: none;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: var(--ink);
  text-align: center;
  outline: none;
}

.hint { margin-top: 8px; font-size: 11.5px; color: var(--faint); }

.t-note { margin-top: 14px; }

.actions { display: flex; gap: 10px; margin-top: 18px; }
.actions .btn { flex: 1; }
</style>
