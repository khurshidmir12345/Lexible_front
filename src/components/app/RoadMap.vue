<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AddPathSheet from '../group/AddPathSheet.vue'
import GroupLeaderboard from '../group/GroupLeaderboard.vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['open', 'exam'])

/**
 * The road lives inside a tab that is `display:none` until selected. Scrolling
 * a hidden element does nothing, so the shell tells us when we become visible
 * and only then do we jump to the player's own step.
 */
const props = defineProps({ active: { type: Boolean, default: true } })

// Geometry from the artboard: 88px nodes inset 26px from either edge,
// stacked 96px apart, alternating sides.
const NODE = 88
const INSET = 26
const GAP = 96
const TOP = 104
const WIDTH = 390

const adding = ref(false)
const showingBoard = ref(false)

const paths = computed(() => store.state.paths)
const activePath = computed(() => store.state.activePath)
const currentPath = computed(() => paths.value.find((p) => p.id === activePath.value))
const isGroupPath = computed(() => currentPath.value?.kind === 'group')

/** OQ-03 — the class is joined and approved, but this month is not paid. */
const awaitingPayment = computed(() => Boolean(currentPath.value?.payment_required))

/** TN-02 draws the map on near-black with a much darker dashed line. */
const linkColour = computed(() => (store.state.dark ? '#313D34' : '#D9D6C8'))

const money = (value) => String(value ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')

function explainPayment() {
  telegram.haptic()
  store.toast('Toʼlov tizimi hali ulanmagan — ustozingizga murojaat qiling')
}

/** Requests the teacher has not answered yet — otherwise they vanish. */
const pendingGroups = computed(() => store.state.groups.filter((g) => g.status === 'pending'))

async function cancelRequest(group) {
  if (!confirm(`«${group.title}» guruhiga soʼrov bekor qilinsinmi?`)) return

  try {
    await api.leaveGroup(group.id)
    await store.refreshGroups()
  } catch (error) {
    store.toast(error.message)
  }
}

/** Newest node on top, so the path reads as climbing away from the start. */
const nodes = computed(() =>
  [...store.state.road]
    .filter((node) => (node.path ?? 'personal') === activePath.value)
    .sort((a, b) => b.position - a.position)
    .map((node, index) => ({
      ...node,
      index,
      side: index % 2 === 0 ? 'left' : 'right',
      top: TOP + index * GAP,
      cx: index % 2 === 0 ? INSET + NODE / 2 : WIDTH - INSET - NODE / 2,
      cy: TOP + index * GAP + NODE / 2,
    })),
)

const canvasHeight = computed(() => TOP + nodes.value.length * GAP + 40)

/**
 * An S-curve between two node centres, the way the artboard draws it: the
 * line leaves upward, swings across, and arrives from below.
 */
const connectors = computed(() =>
  nodes.value.slice(0, -1).map((upper, i) => {
    const lower = nodes.value[i + 1]
    const goingLeft = lower.cx < upper.cx
    const bend = goingLeft ? 22 : -22

    return `M ${lower.cx} ${lower.cy} C ${lower.cx - bend} ${lower.cy - 54}, ` +
      `${upper.cx + bend} ${upper.cy + 66}, ${upper.cx} ${upper.cy}`
  }),
)

function style(node) {
  const base = {
    top: `${node.top}px`,
    [node.side]: `${INSET}px`,
  }

  return base
}

function open(node) {
  if (node.status === 'locked') {
    telegram.notify('warning')
    store.toast(
      node.lock_reason === 'payment'
        ? '🔒 Bu yoʼl toʼlovdan soʼng ochiladi'
        : '🔒 Avval oldingi bosqichni tugating',
    )
    return
  }

  telegram.haptic()

  if (node.type === 'exam') {
    emit('exam', node)
    return
  }

  emit('open', node.id)
}

const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y.slice(2)}`
}

const isCreate = (node) => node.status !== 'locked' && !node.title

const canvasEl = ref(null)

/**
 * The map is taller than the screen and the player's own step usually sits
 * well down it, so open on that step rather than at the top.
 */
async function focusCurrent() {
  if (!props.active) return

  await nextTick()

  const el = canvasEl.value
  const current = nodes.value.find((n) => n.status === 'in_progress') ?? nodes.value[nodes.value.length - 1]

  // A hidden tab has no height to centre against, so retry once it has one.
  if (!el || !current || !el.clientHeight) return

  requestAnimationFrame(() => {
    el.scrollTop = Math.max(0, current.top - el.clientHeight / 2 + NODE / 2)
  })
}

onMounted(focusCurrent)
watch(() => store.state.road.length, focusCurrent)
watch(() => props.active, (on) => { if (on) focusCurrent() })
// Switching between the personal road and a class road re-centres too.
watch(activePath, focusCurrent)
</script>

<template>
  <div class="road">
    <!-- The player's own path, plus one per group they belong to. It rides in
         the shell's top bar rather than above the map, so the map keeps the
         row: one screenful shows more of the road. -->
    <Teleport v-if="active" to="#road-topbar-slot">
      <div class="path-tabs">
        <button
          v-for="path in paths"
          :key="path.id"
          class="path-tab"
          :class="{ on: activePath === path.id, group: path.kind === 'group' }"
          @click="store.selectPath(path.id)"
        >
          <svg v-if="path.kind === 'group'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2.8l2.5 5.3 5.7.7-4.2 4 1.1 5.7-5.1-2.8-5.1 2.8 1.1-5.7-4.2-4 5.7-.7z" />
          </svg>
          {{ path.title }}
        </button>

        <button class="path-add" @click="adding = true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#66736B" stroke-width="2.2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </Teleport>

    <!-- A join request the teacher has not answered yet -->
    <div v-for="group in pendingGroups" :key="group.id" class="waiting">
      <span class="waiting-dot"></span>
      <span class="waiting-text">
        <b>{{ group.title }} — soʼrov yuborildi</b>
        <i>{{ group.teacher }} tasdiqlagach bosqichlar shu yerda chiqadi</i>
      </span>
      <button class="waiting-x" aria-label="Bekor qilish" @click="cancelRequest(group)">×</button>
    </div>

    <!-- Whose path this is, and where the player stands in it -->
    <button v-if="isGroupPath" class="group-bar" @click="showingBoard = true">
      <span class="group-who">
        <b>{{ currentPath.teacher }}</b>
        <i>{{ currentPath.subtitle ?? 'guruh yoʼli' }}</i>
      </span>
      <span class="group-cta">Guruh statistikasi ›</span>
    </button>

    <div ref="canvasEl" class="canvas" :class="{ shut: awaitingPayment }">
      <div class="v-inner" :style="{ height: canvasHeight + 'px' }">
        <svg class="links" :viewBox="`0 0 ${WIDTH} ${canvasHeight}`" preserveAspectRatio="none" fill="none">
          <path
            v-for="(d, i) in connectors"
            :key="i"
            :d="d"
            :stroke="linkColour"
            stroke-width="4.5"
            stroke-linecap="round"
            stroke-dasharray="8 12"
          />
        </svg>

        <template v-for="node in nodes" :key="node.id">
          <span v-if="node.status === 'in_progress' && node.title" class="here" :style="{ top: `${node.top - 26}px`, [node.side === 'left' ? 'left' : 'right']: '14px' }">
            SIZ SHU YERDASIZ
          </span>

          <button
            class="node"
            :class="[
              node.status,
              {
                exam: node.type === 'exam',
                create: isCreate(node),
                taught: node.from_group,
                paywalled: node.lock_reason === 'payment',
              },
            ]"
            :style="style(node)"
            @click="open(node)"
          >
            <!-- Fresh node the player has not named yet -->
            <template v-if="isCreate(node)">
              <span class="ring dashed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98A49C" stroke-width="2.2" stroke-linecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span class="create-label">KATEGORIYA<br />YARATING</span>
            </template>

            <template v-else>
              <span class="head">
                <b class="v-num">{{ node.position }}</b>
                <i>{{ formatDate(node.date) }}</i>
              </span>

              <span class="ring">
                <!-- completed -->
                <svg v-if="node.status === 'completed'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 13l5 5L20 7" />
                </svg>
                <!-- locked -->
                <svg v-else-if="node.status === 'locked'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                  <rect x="5" y="11" width="14" height="9" rx="2.5" />
                  <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
                </svg>
                <!-- in progress -->
                <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>

              <span v-if="node.type === 'exam'" class="tag">
                IMTIHON{{ node.status === 'completed' ? ' ✓' : '' }}
              </span>
              <span v-else-if="node.status === 'completed'" class="pill">✓ BAJARILDI</span>
              <span v-else-if="node.status === 'in_progress'" class="v-pct v-num">{{ node.progress }}%</span>
            </template>
          </button>
        </template>
      </div>
    </div>

    <!-- OQ-03: what is behind the lock, and why -->
    <div v-if="awaitingPayment" class="paywall">
      <span class="paywall-ic">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B4E00" stroke-width="1.8" stroke-linecap="round">
          <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
        </svg>
      </span>
      <h3>Bosqichlar toʼlovdan soʼng ochiladi</h3>
      <p>
        Ustozingiz «oʼquvchi toʼlaydi» rejimini tanlagan.
        Yoʼl uchun oyiga <b>{{ money(currentPath.price) }} soʼm</b>.
      </p>
      <button class="btn btn-primary" @click="explainPayment">
        Toʼlash — {{ money(currentPath.price) }} soʼm/oy
      </button>
      <button class="paywall-ref" @click="adding = true">🎁 Doʼst taklif qiling — 3 kun Premium bepul</button>
    </div>

    <!-- The sheet shows its own confirmation, so closing is the player's call. -->
    <AddPathSheet
      v-if="adding"
      @joined="() => { store.refreshRoad(); store.refreshGroups() }"
      @close="adding = false"
    />

    <GroupLeaderboard
      v-if="showingBoard && isGroupPath"
      :group-id="activePath"
      @close="showingBoard = false"
    />
  </div>
</template>

<style scoped>
.road {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* The paywall card is anchored to the map, not to the whole screen. */
  position: relative;
}

/* Lives in the top bar, so it scrolls sideways instead of wrapping. */
.path-tabs {
  display: flex;
  gap: 7px;
  align-items: center;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 2px 0;
}

.path-tabs::-webkit-scrollbar { display: none; }

.path-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--r-pill);
  padding: 7px 13px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  flex: none;
}

.path-tab {
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--muted);
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
}

.path-tab.on {
  background: var(--ink);
  border-color: var(--ink);
  color: #fff;
}

/* A teacher's path is gold, so it never looks like the player's own. */
.path-tab.group.on {
  background: linear-gradient(165deg, var(--gold-light), var(--gold-mid));
  border-color: var(--gold-deep);
  color: #6B4E00;
}

.group-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 22px;
  padding: 11px 14px;
  border: 1px solid #F0E3C2;
  background: #FFFBF0;
  border-radius: 14px;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  text-align: left;
}

.group-who { flex: 1; }
.group-who b { display: block; font-size: 13.5px; font-weight: 700; color: var(--ink); }
.group-who i { display: block; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--gold-muted); }

.group-cta { font-size: 12px; font-weight: 800; color: var(--gold); white-space: nowrap; }

.node.taught.in_progress {
  background: linear-gradient(165deg, #E8A13A, #C97F1E);
  box-shadow: 0 5px 0 #A9670F;
}

.node.taught.completed {
  background: linear-gradient(165deg, var(--gold-light), var(--gold-mid));
  box-shadow: 0 5px 0 var(--gold-deep);
  color: #6B4E00;
}

.path-add {
  width: 30px;
  height: 30px;
  border-radius: var(--r-pill);
  border: 1.5px dashed #C3CEC5;
  background: none;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  cursor: pointer;
}

.waiting {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 10px 22px;
  padding: 11px 14px;
  background: var(--gold-soft);
  border: 1px solid var(--gold-line);
  border-radius: var(--r-md);
  flex: none;
}

.waiting-dot {
  width: 9px;
  height: 9px;
  border-radius: var(--r-pill);
  background: var(--gold);
  flex: none;
  animation: waitpulse 1.6s ease-in-out infinite;
}

@keyframes waitpulse { 0%, 100% { opacity: 1 } 50% { opacity: .3 } }

.waiting-text { flex: 1; min-width: 0; }
.waiting-text b { display: block; font-size: 12.5px; font-weight: 800; color: var(--gold-text); }
.waiting-text i {
  display: block;
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  color: var(--gold-text);
  opacity: .8;
  margin-top: 2px;
}

.waiting-x {
  border: none;
  background: none;
  color: var(--gold);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  flex: none;
  padding: 0 2px;
}

/* TN-02 — the map is the one surface that does not take its colour from a
   token, so night mode has to restate the whole set. */
.app.dark .canvas { background: #0D1511; }

.canvas.shut { background: #EDDFAF; }
.app.dark .canvas.shut { background: #2A2416; }

.paywall {
  position: absolute;
  left: 22px;
  right: 22px;
  bottom: 16px;
  z-index: 6;
  background: var(--card);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 24px 48px -20px rgba(22, 32, 26, .35);
  text-align: center;
}

.paywall-ic {
  width: 56px;
  height: 56px;
  border-radius: var(--r-pill);
  background: linear-gradient(165deg, var(--gold-light), var(--gold-mid));
  display: grid;
  place-items: center;
  margin: 0 auto;
}

.paywall h3 { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700; margin-top: 10px; }

.paywall p {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 5px;
  line-height: 1.5;
}

.paywall p b { color: var(--ink); font-weight: 800; }
.paywall .btn { margin-top: 13px; }

.paywall-ref {
  display: block;
  width: 100%;
  border: none;
  background: none;
  margin-top: 9px;
  font-family: 'Manrope', sans-serif;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--faint);
  cursor: pointer;
}

.canvas {
  flex: 1;
  overflow-y: auto;
  background: #F3F1EA;
}

.v-inner {
  position: relative;
  width: 100%;
}

.links {
  position: absolute;
  inset: 0;
  width: 100%;
  display: block;
}

.node {
  position: absolute;
  width: 88px;
  height: 88px;
  border: none;
  border-radius: 22px;
  padding: 7px 10px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  color: #fff;
  transition: transform .07s;
}

.node:active {
  transform: translateY(3px);
}

.node.completed {
  background: linear-gradient(165deg, #20B56A, #0F9A50);
  box-shadow: 0 5px 0 var(--green-deep);
}

.node.in_progress {
  background: linear-gradient(165deg, #3D8BFA, #2266DB);
  box-shadow: 0 5px 0 #1B54B8;
}

.node.locked {
  background: linear-gradient(165deg, #E3E7E3, #D2D8D2);
  box-shadow: 0 5px 0 #BEC6BE;
  color: #7E8A81;
}

.app.dark .node.locked {
  background: #3A3322;
  box-shadow: 0 5px 0 #292414;
  color: #9A8F6E;
}

.app.dark .node.in_progress {
  background: linear-gradient(165deg, #3B82F6, #2A6BD8);
  box-shadow: 0 5px 0 #2358B8;
}

.app.dark .node.exam {
  background: #C9A54E;
  box-shadow: 0 5px 0 #97772E;
  color: #3A2E08;
}

/* A create card is also `in_progress`, so its gradient and lift have to be
   cleared or the blue edge shows under the dashed outline. */
.app.dark .node.create,
.node.create {
  background: var(--card);
  box-shadow: none;
}

.app.dark .node.create { border-color: #313D34; color: var(--faint); }

/* Shut for money rather than for progress — OQ-03 draws these in gold so the
   difference is visible at a glance. */
.node.locked.paywalled {
  background: linear-gradient(165deg, #F6ECC4, #E9D794);
  box-shadow: 0 5px 0 #D3BE7C;
  color: #8A7431;
}

.node.exam {
  background: linear-gradient(165deg, var(--gold-light), var(--gold-mid));
  box-shadow: 0 5px 0 var(--gold-deep);
  color: #6B4E00;
}

.node.create {
  background: var(--card);
  border: 2px dashed #B9C7BC;
  box-shadow: none;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--faint);
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.head .v-num {
  font-size: 20px;
  line-height: 1;
}

.head i {
  font-size: 8px;
  font-weight: 700;
  font-style: normal;
  opacity: .85;
}

.ring {
  width: 30px;
  height: 30px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, .28);
  display: grid;
  place-items: center;
  margin: 2px auto 0;
}

.node.exam .ring {
  background: rgba(255, 255, 255, .45);
}

.ring.dashed {
  width: 32px;
  height: 32px;
  background: none;
  border: 2px dashed #B9C7BC;
  margin: 0;
}

.create-label {
  font-size: 7.5px;
  font-weight: 800;
  text-align: center;
  line-height: 1.35;
}

.tag {
  font-family: 'Sora', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-top: auto;
  text-align: center;
}

.pill {
  background: rgba(255, 255, 255, .95);
  color: var(--green-deep);
  border-radius: var(--r-sm);
  padding: 2.5px 7px;
  font-size: 7.5px;
  font-weight: 800;
  margin-top: auto;
  align-self: center;
  letter-spacing: .3px;
}

.v-pct {
  font-size: 12px;
  text-align: center;
  margin-top: auto;
}

.here {
  position: absolute;
  background: var(--green);
  color: #fff;
  border-radius: var(--r-pill);
  padding: 4px 10px;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: .6px;
  box-shadow: 0 3px 8px rgba(18, 138, 77, .35);
  z-index: 2;
  white-space: nowrap;
}
</style>
