/**
 * The zig-zag map geometry, shared by the student road (AS-02) and the two
 * teacher maps (UT-01 «Yoʼllarim», UT-04b «Guruh yoʼli»).
 *
 * Numbers come straight off the artboards: 88px cards inset 26px from either
 * edge, stacked 96px apart, newest on top.
 */

export const NODE = 88
export const INSET = 26
export const GAP = 96
export const TOP = 104
export const WIDTH = 390

/** Newest first, with the side and centre each card is drawn at. */
export function layout(stages, { top = TOP } = {}) {
  return [...stages]
    .sort((a, b) => b.position - a.position)
    .map((stage, index) => ({
      ...stage,
      index,
      side: index % 2 === 0 ? 'right' : 'left',
      top: top + index * GAP,
      cx: index % 2 === 0 ? WIDTH - INSET - NODE / 2 : INSET + NODE / 2,
      cy: top + index * GAP + NODE / 2,
    }))
}

/**
 * An S-curve between two card centres, drawn the way the artboard does it:
 * the line leaves upward, swings across, and arrives from below.
 */
export function connectors(nodes) {
  return nodes.slice(0, -1).map((upper, i) => {
    const lower = nodes[i + 1]
    const bend = lower.cx < upper.cx ? 22 : -22

    return `M ${lower.cx} ${lower.cy} C ${lower.cx - bend} ${lower.cy - 54}, ` +
      `${upper.cx + bend} ${upper.cy + 66}, ${upper.cx} ${upper.cy}`
  })
}

/** Room below the last card for the trailhead scenery (tent, signpost). */
export const FOOT = 150

export const canvasHeight = (count, { top = TOP } = {}) => top + count * GAP + FOOT

/**
 * The trail between two card centres: drawn twice, a wide sandy band and a
 * thin dashed line down its middle, so it reads as a footpath through the
 * woods rather than a wire between boxes. Same S-curve as `connectors`.
 */
export const trail = connectors

/* ------------------------------------------------------------ the forest */

/** 3D scenery straight from the icon library — same files the word cards use. */
export const sticker = (slug) => `/storage/icons/256/${slug}.webp`

const TREES = [
  'pine-tree', 'tree', 'pine-forest', 'tree', 'pine-tree', 'mountain-hut',
  'pine-forest', 'tree', 'pond', 'pine-tree', 'bridge-basic-footbridge',
  'tree', 'mountain-cabin', 'pine-forest', 'campfire', 'tree',
]
const SMALL = [
  'wild-mushroom', 'rock', 'acorn', 'sunflower', 'amanita-mushroom', 'river-pebble',
  'pine-cone', 'lotus-flower', 'maple-leaf', 'tree-stump', 'leaf', 'rock',
]
const FAUNA = [
  'deer', 'red-fox', 'rabbit', 'owl', 'hedgehog', 'squirrel',
  'butterfly', 'honey-bee', 'bird', 'bear',
]

/** Deterministic wobble so the same road always looks the same. */
const jitter = (i, salt, span) => (((i * 7919 + salt * 104729) % (span * 2 + 1)) - span)

/**
 * Scenery for one road: beside every card, on the side the trail leaves free,
 * a tree, a small find and — every other card — an animal; a treasure and a
 * mountain range above the first card, a trailhead below the last.
 *
 * Every item is a plain lazy-loaded <img>: only what is on screen is fetched,
 * the files are tiny and cached for a month, and there is no per-frame work.
 * `nodes` come from `layout()` (or the student map's equivalent): each has
 * `side`, `top` and `index`.
 */
export function forest(nodes, { width = WIDTH } = {}) {
  const items = []
  const put = (key, slug, size, left, top, extra = {}) =>
    items.push({ key, src: sticker(slug), size, left, top, ...extra })

  nodes.forEach((node, i) => {
    // The free ground is the column along the far edge, level with the card:
    // the card above and the card below on that side leave a band from
    // top-8 to top+96, and the trail only crosses the middle of the map.
    const far = (offset, size) => (node.side === 'left' ? width - offset - size : offset)

    put(`t${i}`, TREES[i % TREES.length], 58, far(18 + jitter(i, 1, 6), 58), node.top + jitter(i, 2, 4))
    put(`s${i}`, SMALL[i % SMALL.length], 28, far(30 + jitter(i, 3, 8), 28), node.top + 62 + jitter(i, 4, 3))

    if (i % 2 === 1) {
      // An animal at the foot of the tree, facing the trail.
      put(`a${i}`, FAUNA[(i >> 1) % FAUNA.length], 36, far(78 + jitter(i, 5, 6), 36), node.top + 52 + jitter(i, 6, 4), { flip: node.side === 'left' })
    } else {
      put(`f${i}`, SMALL[(i + 5) % SMALL.length], 24, far(88 + jitter(i, 7, 8), 24), node.top + 10 + jitter(i, 8, 6))
    }
  })

  const first = nodes[0]
  const last = nodes[nodes.length - 1]

  // Above the top card: where the road is going.
  if (first && first.top >= 96) {
    const y = first.top - 92
    put('goal-range', 'mountain', 66, width / 2 - 96, y - 2)
    put('goal-chest', 'treasure-chest', 58, width / 2 - 26, y + 6)
    put('goal-wood', 'pine-forest', 56, width / 2 + 42, y - 2)
  }

  // Below the bottom card: the trailhead the player set out from.
  if (last) {
    const y = last.top + NODE + 14
    put('start-sign', 'trail-sign', 52, last.side === 'left' ? 120 : width - 172, y)
    put('start-tent', 'camping-tent', 60, last.side === 'left' ? 34 : width - 94, y + 16)
    put('start-fire', 'campfire', 34, last.side === 'left' ? width - 90 : 56, y + 30)
  }

  return items
}

