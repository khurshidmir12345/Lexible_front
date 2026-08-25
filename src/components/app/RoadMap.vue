<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['open'])

// Geometry from the artboard: 88px nodes inset 26px from either edge,
// stacked 96px apart, alternating sides.
const NODE = 88
const INSET = 26
const GAP = 96
const TOP = 104
const WIDTH = 390

/** Newest node on top, so the path reads as climbing away from the start. */
const nodes = computed(() =>
  [...store.state.road]
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
    store.toast('🔒 Avval oldingi bosqichni tugating')
    return
  }

  telegram.haptic()
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
  await nextTick()

  const el = canvasEl.value
  const current = nodes.value.find((n) => n.status === 'in_progress') ?? nodes.value[nodes.value.length - 1]
  if (!el || !current) return

  requestAnimationFrame(() => {
    el.scrollTop = Math.max(0, current.top - el.clientHeight / 2 + NODE / 2)
  })
}

onMounted(focusCurrent)
watch(() => store.state.road.length, focusCurrent)
</script>

<template>
  <div class="road">
    <!-- Paths: the personal one today, group paths once they exist. -->
    <div class="path-tabs">
      <span class="path-tab on">
        Yoʼl
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 20l4.5-1L20 7.5a2.1 2.1 0 0 0-3-3L5.5 16z" />
        </svg>
      </span>
      <button class="path-add" @click="store.toast('Guruh yoʼllari keyingi bosqichda')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#66736B" stroke-width="2.2" stroke-linecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>

    <div ref="canvasEl" class="canvas">
      <div class="v-inner" :style="{ height: canvasHeight + 'px' }">
        <svg class="links" :viewBox="`0 0 ${WIDTH} ${canvasHeight}`" preserveAspectRatio="none" fill="none">
          <path
            v-for="(d, i) in connectors"
            :key="i"
            :d="d"
            stroke="#D9D6C8"
            stroke-width="4.5"
            stroke-linecap="round"
            stroke-dasharray="8 12"
          />
        </svg>

        <template v-for="node in nodes" :key="node.id">
          <span v-if="node.status === 'in_progress' && node.title" class="here" :style="{ top: `${node.top - 26}px`, [node.side === 'left' ? 'left' : 'right']: '14px' }">
            SIZ SHU YERDASIZ
          </span>

          <button class="node" :class="[node.status, { exam: node.type === 'exam', create: isCreate(node) }]" :style="style(node)" @click="open(node)">
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
  </div>
</template>

<style scoped>
.road {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.path-tabs {
  display: flex;
  gap: 7px;
  align-items: center;
  padding: 10px 22px 12px;
  background: var(--card);
  border-bottom: 1px solid var(--wash);
  flex: none;
}

.path-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--r-pill);
  padding: 7px 13px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.path-tab.on {
  background: var(--ink);
  color: #fff;
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
