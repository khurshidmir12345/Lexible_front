<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { FUN_EMOJI, MapIcon, SEASON_EMOJI } from '../../lib/icons'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['open'])

const mapEl = ref(null)
const innerEl = ref(null)
const connEl = ref(null)
const shaking = ref(null)
const scrolledOnce = ref(false)

// The newest node sits at the top, so the map reads like a path climbing away
// from where the player started.
const nodes = computed(() => [...store.state.road].sort((a, b) => b.position - a.position))

function sideOf(position) {
  return position % 2 === 0 ? 'left' : 'right'
}

function iconOf(node) {
  if (node.status === 'completed') return MapIcon.refresh
  if (node.status === 'in_progress') return MapIcon.play
  return MapIcon.lock
}

function decoration(node, slot) {
  const season = SEASON_EMOJI[node.season] ?? SEASON_EMOJI.winter
  return slot === 1 ? season[node.position % season.length] : FUN_EMOJI[node.position % FUN_EMOJI.length]
}

function formatDate(iso) {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year.slice(2)}`
}

function open(node) {
  if (node.status === 'locked') {
    shaking.value = node.id
    telegram.notify('warning')
    setTimeout(() => (shaking.value = null), 420)
    store.toast('🔒 Avval oldingi bosqichlarni tugating')
    return
  }

  if (node.type === 'exam') {
    store.toast('Imtihon — keyingi bosqichda ochiladi 🎯')
    return
  }

  telegram.haptic()
  emit('open', node.id)
}

/** Rounded right-angle path between two node centres. */
function elbow(x0, y0, x1, y1, radius) {
  const midY = (y0 + y1) / 2
  const direction = x1 >= x0 ? 1 : -1

  return `M ${x0} ${y0} L ${x0} ${midY + radius} Q ${x0} ${midY} ${x0 + direction * radius} ${midY} ` +
    `L ${x1 - direction * radius} ${midY} Q ${x1} ${midY} ${x1} ${midY - radius} L ${x1} ${y1}`
}

function drawConnectors() {
  const inner = innerEl.value
  const svg = connEl.value
  if (!inner || !svg) return

  const bounds = inner.getBoundingClientRect()
  if (!bounds.width) return

  svg.setAttribute('width', inner.clientWidth)
  svg.setAttribute('height', inner.offsetHeight)
  svg.setAttribute('viewBox', `0 0 ${inner.clientWidth} ${inner.offsetHeight}`)

  const cards = [...inner.querySelectorAll('.card')]
  let path = ''

  for (let i = 0; i < cards.length - 1; i++) {
    const upper = cards[i].getBoundingClientRect()
    const lower = cards[i + 1].getBoundingClientRect()

    const x0 = lower.left - bounds.left + lower.width / 2
    const y0 = lower.top - bounds.top
    const x1 = upper.left - bounds.left + upper.width / 2
    const y1 = upper.top - bounds.top + upper.height

    // The segment takes the colour of the node below it — the one the player
    // has to finish before the line leads anywhere.
    const below = nodes.value[i + 1]
    const colour =
      below.status === 'completed' ? '#37c26a' : below.status === 'in_progress' ? '#2d9cdb' : '#c6d2ca'

    path += `<path d="${elbow(x0, y0, x1, y1, 16)}" stroke="${colour}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="9 12"/>`
  }

  svg.innerHTML = path
}

async function refresh() {
  await nextTick()
  requestAnimationFrame(() => {
    drawConnectors()

    // Open the map at the bottom, where the journey starts.
    if (!scrolledOnce.value && mapEl.value) {
      mapEl.value.scrollTop = mapEl.value.scrollHeight
      scrolledOnce.value = true
    }
  })
}

const onResize = () => requestAnimationFrame(drawConnectors)

onMounted(() => {
  refresh()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => window.removeEventListener('resize', onResize))

watch(nodes, refresh, { deep: true })
</script>

<template>
  <div ref="mapEl" class="map">
    <div ref="innerEl" class="inner">
      <svg ref="connEl" class="conn"></svg>
      <div>
        <div
          v-for="node in nodes"
          :key="node.id"
          class="row"
          :class="`row-${sideOf(node.position)}`"
        >
          <div
            class="deco"
            :style="{ [sideOf(node.position) === 'left' ? 'right' : 'left']: '62px', top: '28%' }"
          >
            {{ decoration(node, 1) }}
          </div>
          <div
            v-if="node.position % 2 === 0"
            class="deco"
            :style="{
              [sideOf(node.position) === 'left' ? 'right' : 'left']: '30px',
              top: '64%',
              fontSize: '19px',
            }"
          >
            {{ decoration(node, 2) }}
          </div>

          <div class="slot">
            <button
              class="card"
              :class="[`st-${node.status}`, { ex: node.type === 'exam', shake: shaking === node.id }]"
              @click="open(node)"
            >
              <span class="num">{{ node.position }}</span>
              <span class="date">{{ formatDate(node.date) }}</span>
              <span v-if="node.status === 'in_progress'" v-html="MapIcon.wave"></span>
              <span class="circle" v-html="iconOf(node)"></span>

              <span v-if="node.type === 'exam'" class="label">EXAM</span>
              <span v-else-if="node.status === 'completed'" class="label">
                <span v-html="MapIcon.check"></span> completed
              </span>
              <span v-else-if="node.status === 'in_progress'" class="label pct">
                {{ node.progress }}%
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
