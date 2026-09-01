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

export const canvasHeight = (count, { top = TOP } = {}) => top + count * GAP + 40

/**
 * Decoration dropped into the gaps between cards — 3D game-map scenery
 * (Fluent Emoji, MIT), not flat symbols: trees, rocks, a fountain…
 */
import treeImg from '../assets/map/tree.png'
import pineImg from '../assets/map/pine.png'
import rockImg from '../assets/map/rock.png'
import fountainImg from '../assets/map/fountain.png'
import mushroomImg from '../assets/map/mushroom.png'
import blossomImg from '../assets/map/blossom.png'
import woodImg from '../assets/map/wood.png'
import trophyImg from '../assets/map/trophy.png'

const STICKERS = [treeImg, rockImg, blossomImg, pineImg, fountainImg, mushroomImg, woodImg, trophyImg]

export function trinkets(nodes) {
  return nodes.slice(0, -1).map((upper, i) => ({
    key: `t${i}`,
    img: STICKERS[i % STICKERS.length],
    top: upper.cy + GAP / 2 - 20,
    left: WIDTH / 2 - 40 + (i % 2 === 0 ? 26 : -26),
  }))
}
