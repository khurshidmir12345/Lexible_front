<script setup>
/**
 * UT-01 «Yoʼllarim» — the teacher's own curriculum drawn as the same zig-zag
 * map their students walk, plus UT-01b, the sheet that switches between paths.
 *
 * Tapping a stage opens UT-MD2 rather than jumping straight into the editor:
 * from one card a teacher may want the vocabulary, the class results, or a
 * live game.
 */
import { computed, onMounted, ref } from 'vue'
import Modal from '../ui/Modal.vue'
import StageMenu from './StageMenu.vue'
import { canvasHeight, connectors, layout, trinkets, INSET, TOP } from '../../lib/roadmap'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['edit-stage', 'competition'])

/** The shell tells us when this tab is on screen — the switcher rides in its
 *  top bar, and must not show while another tab is open. */
defineProps({ active: { type: Boolean, default: true } })

/**
 * Vue mounts a subtree before inserting it into the document, so a Teleport
 * that resolves its target by selector finds nothing when this tab is the one
 * the shell opens on. Waiting for `mounted` puts the lookup after the insert.
 */
const attached = ref(false)

const paths = ref([])
const activeId = ref(null)
const loading = ref(true)
const switching = ref(false)
const creating = ref(false)
const renaming = ref(false)
const menuStage = ref(null)
const draft = ref({ title: '', subtitle: '' })

const current = computed(() => paths.value.find((p) => p.id === activeId.value) ?? null)

/**
 * The map is drawn from the top down, newest stage first — visually the same
 * road the students walk. The "add" card rides the zig-zag itself, sitting
 * exactly where the next stage will land.
 */
const nodes = computed(() => {
  const stages = current.value?.stages ?? []
  const nextPosition = stages.reduce((max, s) => Math.max(max, s.position), 0) + 1

  return layout([...stages, { id: '__add__', add: true, position: nextPosition }], { top: TOP })
})
const links = computed(() => connectors(nodes.value))
const decor = computed(() => trinkets(nodes.value))
const height = computed(() => canvasHeight(nodes.value.length))

async function load() {
  loading.value = true

  try {
    paths.value = (await api.teacher.paths()).paths

    if (!paths.value.some((p) => p.id === activeId.value)) {
      activeId.value = paths.value[0]?.id ?? null
    }
  } catch (error) {
    store.toast(error.message)
  } finally {
    loading.value = false
  }
}

function pick(id) {
  activeId.value = id
  switching.value = false
  telegram.haptic()
}

async function createPath() {
  const title = draft.value.title.trim()
  if (title.length < 2) return

  try {
    const { path } = await api.teacher.createPath(title, draft.value.subtitle.trim() || null)
    creating.value = false
    switching.value = false
    draft.value = { title: '', subtitle: '' }
    await load()
    activeId.value = path.id
    store.toast('✅ Yoʼl yaratildi')
  } catch (error) {
    store.toast(error.message)
  }
}

async function renamePath() {
  const title = draft.value.title.trim()
  if (title.length < 2 || !current.value) return

  try {
    await api.teacher.renamePath(current.value.id, title, draft.value.subtitle.trim() || null)
    renaming.value = false
    await load()
    store.toast('✅ Saqlandi')
  } catch (error) {
    store.toast(error.message)
  }
}

async function deletePath() {
  if (!current.value) return
  if (!confirm(`«${current.value.title}» yoʼli oʼchirilsinmi?`)) return

  try {
    await api.teacher.deletePath(current.value.id)
    renaming.value = false
    activeId.value = null
    await load()
    store.toast('Yoʼl oʼchirildi')
  } catch (error) {
    store.toast(error.message)
  }
}

/** A new stage lands at the end of the path and opens for filling. */
async function addStage() {
  if (!current.value) return

  try {
    const { stage } = await api.teacher.addStage(current.value.id, null)
    await load()
    emit('edit-stage', stage.id)
  } catch (error) {
    store.toast(error.message)
  }
}

function openStage(stage) {
  telegram.haptic()
  menuStage.value = { ...stage, path: current.value }
}

function startRename() {
  draft.value = { title: current.value?.title ?? '', subtitle: current.value?.subtitle ?? '' }
  renaming.value = true
}

function startCreate() {
  draft.value = { title: '', subtitle: '' }
  creating.value = true
}

/** "8 bosqich · 96 soʼz · 2 guruhga biriktirilgan" — the UT-01b sub-line. */
function summary(path) {
  const parts = [`${path.stages_count} bosqich`, `${path.words_count} soʼz`]
  parts.push(path.groups_count ? `${path.groups_count} guruhga biriktirilgan` : 'biriktirilmagan')

  return parts.join(' · ')
}

onMounted(() => {
  attached.value = true
  load()
})

defineExpose({ load })
</script>

<template>
  <div class="paths">
    <!-- Compact switcher: the active path, its neighbours, and a plus. It sits
         in the shell's top bar in place of the title, so the map keeps the row
         and one screenful shows more of the road. -->
    <Teleport v-if="active && attached" to="#paths-topbar-slot">
      <div class="switcher">
        <!-- Only the chips scroll: the "+" is pinned so a long path name can
             never carry it off the edge of the bar. -->
        <div class="switcher-scroll">
          <button
            v-for="path in paths.slice(0, 3)"
            :key="path.id"
            class="t-chip"
            :class="{ on: activeId === path.id }"
            @click="activeId === path.id ? (switching = true) : pick(path.id)"
          >
            <span class="chip-label">{{ path.title }}</span>
            <span v-if="activeId === path.id" class="caret" v-html="TeacherIcon.chevron"></span>
          </button>
          <button v-if="paths.length > 3" class="t-chip" @click="switching = true">
            +{{ paths.length - 3 }}
          </button>
        </div>
        <button class="t-chip add" aria-label="Yangi yoʼl" @click="startCreate">
          <span v-html="TeacherIcon.plus"></span>
        </button>
      </div>
    </Teleport>

    <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

    <!-- The map itself — the same road the students see. -->
    <div v-else-if="current" class="canvas">
      <div class="inner" :style="{ height: `${height}px` }">
        <svg class="links" :viewBox="`0 0 390 ${height}`" preserveAspectRatio="none" fill="none">
          <path
            v-for="(d, i) in links"
            :key="i"
            :d="d"
            class="road"
            stroke-width="4.5"
            stroke-linecap="round"
            stroke-dasharray="8 12"
          />
        </svg>

        <span
          v-for="item in decor"
          :key="item.key"
          class="trinket"
          :style="{ top: `${item.top}px`, left: `${item.left}px` }"
        >{{ item.emoji }}</span>

        <template v-for="stage in nodes" :key="stage.id">
          <!-- The next stage lands here — drawn like the student's create card. -->
          <button
            v-if="stage.add"
            class="node create"
            :style="{ top: `${stage.top}px`, [stage.side]: `${INSET}px` }"
            @click="addStage"
          >
            <span class="ring dashed">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98A49C" stroke-width="2.2" stroke-linecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span class="create-label">BOSQICH<br />QOʼSHISH</span>
          </button>

          <button
            v-else
            class="node"
            :class="[stage.type === 'exam' ? 'exam' : stage.words_count ? 'filled' : 'empty']"
            :style="{ top: `${stage.top}px`, [stage.side]: `${INSET}px` }"
            @click="openStage(stage)"
          >
            <span class="head">
              <b class="v-num">{{ stage.position }}</b>
              <i>{{ stage.words_count }} soʼz</i>
            </span>

            <span class="ring">
              <!-- exam -->
              <svg v-if="stage.type === 'exam'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2.8l2.5 5.3 5.7.7-4.2 4 1.1 5.7-5.1-2.8-5.1 2.8 1.1-5.7-4.2-4 5.7-.7z" />
              </svg>
              <!-- filled: the lesson is written -->
              <svg v-else-if="stage.words_count" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 13l5 5L20 7" />
              </svg>
              <!-- empty: still to write -->
              <span v-else class="ring-pen" v-html="TeacherIcon.pencil"></span>
            </span>

            <span v-if="stage.type === 'exam'" class="tag">IMTIHON</span>
            <span v-else class="pill">{{ (stage.title || 'NOMSIZ').toUpperCase() }}</span>
          </button>
        </template>
      </div>

      <div class="hint">
        <span v-html="TeacherIcon.info"></span>
        <b>Bosqichlar cheksiz. Kartani bosing — lugʼat tahriri, natijalar yoki oʼyin.</b>
      </div>
    </div>

    <!-- No paths yet -->
    <div v-else class="t-empty">
      <span class="t-empty-ic" v-html="TeacherIcon.road"></span>
      <h3>Hali yoʼl yoʼq</h3>
      <p>Yoʼl — darslar ketma-ketligi. Yarating, keyin bosqich qoʼshib lugʼat kiriting.</p>
      <button class="btn btn-primary" @click="startCreate">Yoʼl yaratish</button>
    </div>

    <StageMenu
      v-if="menuStage"
      :stage="menuStage"
      @close="menuStage = null"
      @edit="(id) => { menuStage = null; emit('edit-stage', id) }"
      @play="(competition) => { menuStage = null; emit('competition', competition) }"
      @deleted="() => { menuStage = null; load() }"
    />

    <Teleport to="#lx-overlays">
      <!-- UT-01b -->
      <Modal :open="switching" title="Yoʼlni tanlang">
        <div class="picker">
          <button
            v-for="path in paths"
            :key="path.id"
            class="option"
            :class="{ on: activeId === path.id }"
            @click="pick(path.id)"
          >
            <span class="option-text">
              <b>{{ path.title }}{{ path.subtitle ? ` · ${path.subtitle}` : '' }}</b>
              <i>{{ summary(path) }}</i>
            </span>
            <span class="radio" :class="{ on: activeId === path.id }"></span>
          </button>

          <button class="option dashed" @click="() => { switching = false; startCreate() }">
            <span v-html="TeacherIcon.plus"></span>
            <b>Yangi yoʼl yaratish</b>
          </button>

          <button v-if="current" class="option dashed" @click="() => { switching = false; startRename() }">
            <span v-html="TeacherIcon.pencil"></span>
            <b>«{{ current.title }}» ni tahrirlash</b>
          </button>
        </div>
        <template #actions>
          <button class="btn btn-soft" @click="switching = false">Yopish</button>
        </template>
      </Modal>

      <Modal :open="creating" title="Yangi yoʼl" text="Masalan: Beginner, Starter, IELTS.">
        <label class="t-field field"><span>YOʼL NOMI</span>
          <input v-model="draft.title" placeholder="Beginner" />
        </label>
        <label class="t-field field"><span>IZOH</span>
          <input v-model="draft.subtitle" placeholder="Boshlangʼich daraja" />
        </label>
        <template #actions>
          <button class="btn btn-soft" @click="creating = false">Bekor</button>
          <button class="btn btn-primary" :disabled="draft.title.trim().length < 2" @click="createPath">
            Yaratish
          </button>
        </template>
      </Modal>

      <Modal :open="renaming" title="Yoʼlni tahrirlash">
        <label class="t-field field"><span>YOʼL NOMI</span>
          <input v-model="draft.title" />
        </label>
        <label class="t-field field"><span>IZOH</span>
          <input v-model="draft.subtitle" />
        </label>
        <button class="danger-row" @click="deletePath">
          <span v-html="TeacherIcon.trash"></span> Yoʼlni oʼchirish
        </button>
        <template #actions>
          <button class="btn btn-soft" @click="renaming = false">Bekor</button>
          <button class="btn btn-primary" :disabled="draft.title.trim().length < 2" @click="renamePath">
            Saqlash
          </button>
        </template>
      </Modal>
    </Teleport>
  </div>
</template>

<style scoped>
.paths {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* Lives in the top bar, so it scrolls sideways rather than owning a row. */
.switcher {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 0;
  min-width: 0;
}

.switcher-scroll {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.switcher-scroll::-webkit-scrollbar { display: none; }

/* This overrides the `display: grid` that centres the plus in `.t-chip.add`,
   so the centring has to be restated here or the glyph sits off to one side. */
.switcher .t-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  /* Long enough to read, short enough to leave room for a second path. */
  max-width: 130px;
}

.chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.caret { display: grid; place-items: center; transform: rotate(90deg) scale(.8); flex: none; }

/* ------------------------------------------------------------------- map */

.canvas {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* The teacher's map sits on a milky-yellow parchment, not office white. */
  background:
    radial-gradient(circle at 20% 12%, rgba(255, 255, 255, .55), transparent 42%),
    radial-gradient(circle at 82% 55%, rgba(255, 233, 170, .35), transparent 45%),
    #FAF3DC;
  position: relative;
}

.app.dark .canvas { background: #141A15; }

/* The map keeps its phone-artboard geometry even inside the wide desktop
   column — otherwise the zig-zag stretches apart and falls to pieces. */
.inner {
  position: relative;
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
}

.links { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

.road { stroke: #DFD3A8; }
.app.dark .road { stroke: #33402F; }

.trinket {
  position: absolute;
  font-size: 26px;
  filter: drop-shadow(0 3px 3px rgba(0, 0, 0, .16));
  pointer-events: none;
}

/* The node cards are drawn exactly the way the student map draws them. */
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

.node:active { transform: translateY(3px); }

.node.filled {
  background: linear-gradient(165deg, #20B56A, #0F9A50);
  box-shadow: 0 5px 0 var(--green-deep);
}

.node.empty {
  background: linear-gradient(165deg, #3D8BFA, #2266DB);
  box-shadow: 0 5px 0 #1B54B8;
}

.node.exam {
  background: linear-gradient(165deg, var(--gold-light), var(--gold-mid));
  box-shadow: 0 5px 0 var(--gold-deep);
  color: #6B4E00;
}

.app.dark .node.exam {
  background: #C9A54E;
  box-shadow: 0 5px 0 #97772E;
  color: #3A2E08;
}

.head { display: flex; justify-content: space-between; align-items: baseline; }

.head .v-num { font-size: 20px; line-height: 1; }

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

.node.exam .ring { background: rgba(255, 255, 255, .45); }

.ring-pen { display: grid; place-items: center; color: currentColor; }
.ring-pen :deep(svg) { width: 13px; height: 13px; }

.ring.dashed {
  width: 32px;
  height: 32px;
  background: none;
  border: 2px dashed #B9C7BC;
  margin: 0;
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
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node.empty .pill { color: #1B54B8; }

.node.create {
  background: var(--card);
  border: 2px dashed #B9C7BC;
  box-shadow: none;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--faint);
}

.app.dark .node.create { border-color: #313D34; }

.create-label {
  font-size: 7.5px;
  font-weight: 800;
  text-align: center;
  line-height: 1.35;
}

.hint {
  position: absolute;
  left: 22px;
  right: 22px;
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 11px 14px;
}

.hint > span { color: var(--green); display: grid; place-items: center; flex: none; }
.hint b { font-size: 12px; font-weight: 700; color: var(--muted); line-height: 1.4; }

/* --------------------------------------------------------------- sheets */

.picker { display: flex; flex-direction: column; gap: 9px; margin-top: 14px; }

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px 14px;
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
  color: var(--ink);
}

.option.on { border: 1.5px solid var(--green); background: var(--wash-3); }

.option-text { flex: 1; min-width: 0; }
.option-text b { display: block; font-size: 14px; font-weight: 800; overflow-wrap: anywhere; }
.option.on .option-text b { color: var(--green-dark); }
.option-text i {
  display: block;
  font-style: normal;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--faint);
  margin-top: 2px;
}

.option.dashed {
  border-style: dashed;
  border-color: var(--line-4);
  justify-content: center;
  color: var(--muted);
  font-size: 13.5px;
  font-weight: 800;
}

/* «…» ni tahrirlash quotes the path name, so the row has to survive a long one. */
.option.dashed b { min-width: 0; overflow-wrap: anywhere; text-align: left; }

.option.dashed > span { display: grid; place-items: center; flex: none; }

.radio {
  width: 20px;
  height: 20px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--line-4);
  flex: none;
}

.radio.on { border: 6px solid var(--green); }

.field { margin-top: 12px; }

.danger-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--red-line);
  border-radius: var(--r-md);
  background: none;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: var(--red);
  cursor: pointer;
}

.danger-row > span { display: grid; place-items: center; }
</style>
