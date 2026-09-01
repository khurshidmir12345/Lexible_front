<script setup>
/**
 * UT-04b «Guruh yoʼli» — the same map the class walks, but every card carries
 * the class average instead of one student's progress. Tapping a card opens
 * UT-05.
 */
import { computed, onMounted, ref } from 'vue'
import { canvasHeight, connectors, layout, trinkets, INSET } from '../../lib/roadmap'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({ groupId: { type: Number, required: true } })
const emit = defineEmits(['close', 'stage'])

const data = ref(null)
const loading = ref(true)

const nodes = computed(() => layout(data.value?.stages ?? [], { top: 40 }))
const links = computed(() => connectors(nodes.value))
const decor = computed(() => trinkets(nodes.value))
const height = computed(() => canvasHeight(nodes.value.length, { top: 40 }))

/** The first card that is neither finished nor untouched gets the flag. */
const currentId = computed(() =>
  [...(data.value?.stages ?? [])].reverse().find((s) => s.status === 'in_progress')?.id ?? null,
)

async function load() {
  loading.value = true

  try {
    data.value = await api.teacher.groupRoad(props.groupId)
  } catch (error) {
    store.toast(error.message)
    emit('close')
  } finally {
    loading.value = false
  }
}

function open(stage) {
  telegram.haptic()
  emit('stage', stage.id)
}

onMounted(load)
</script>

<template>
  <div class="overlay show road">
    <header class="t-head">
      <button class="t-back" aria-label="Orqaga" @click="emit('close')">
        <span class="flip" v-html="TeacherIcon.chevron"></span>
      </button>
      <div class="t-head-main">
        <h1>{{ data?.group?.title ?? 'Guruh' }} · Yoʼl</h1>
        <p>
          {{ data?.group?.path ?? 'yoʼl biriktirilmagan' }}
          <template v-if="data"> · guruh oʼrtachasi {{ data.average }}%</template>
        </p>
      </div>
    </header>

    <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

    <div v-else-if="nodes.length" class="canvas">
      <div class="inner" :style="{ height: `${height}px` }">
        <svg class="links" :viewBox="`0 0 390 ${height}`" preserveAspectRatio="none" fill="none">
          <path
            v-for="(d, i) in links"
            :key="i"
            :d="d"
            stroke="#D9D6C8"
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
          <span
            v-if="stage.id === currentId"
            class="flag"
            :style="{ top: `${stage.top - 26}px`, [stage.side === 'left' ? 'left' : 'right']: '14px' }"
          >DAVOM ETMOQDA</span>

          <button
            class="node"
            :class="stage.status"
            :style="{ top: `${stage.top}px`, [stage.side]: `${INSET}px` }"
            @click="open(stage)"
          >
            <span class="node-head">
              <b class="v-num">{{ stage.position }}</b>
              <span v-if="stage.status === 'locked'" class="lock" v-html="TeacherIcon.lock"></span>
              <i v-else>{{ stage.words }} soʼz</i>
            </span>
            <span class="node-foot">
              {{ stage.title || 'Nomsiz' }}<br />
              <b class="v-num">{{ stage.average }}%</b>
            </span>
          </button>
        </template>
      </div>

      <div class="hint">
        <span v-html="TeacherIcon.info"></span>
        <b>Bosqichni bosing — oʼquvchilar natijalari va oʼyin shu yerda ochiladi.</b>
      </div>
    </div>

    <div v-else class="t-empty">
      <span class="t-empty-ic" v-html="TeacherIcon.road"></span>
      <h3>Yoʼl boʼsh</h3>
      <p>Bu guruhga hali yoʼl biriktirilmagan yoki yoʼlda bosqich yoʼq.</p>
    </div>
  </div>
</template>

<style scoped>
.road {
  background:
    radial-gradient(circle at 20% 12%, rgba(255, 255, 255, .55), transparent 42%),
    #FAF3DC;
  z-index: 22;
}
.app.dark .road { background: #141A15; }

.flip { display: grid; place-items: center; transform: rotate(180deg); }

.t-head { background: var(--card); }

.canvas { flex: 1; min-height: 0; overflow-y: auto; position: relative; }

/* Keep the phone geometry inside the wide desktop column. */
.inner { position: relative; width: 100%; max-width: 430px; margin: 0 auto; }

.links { position: absolute; inset: 0; width: 100%; display: block; }

.trinket {
  position: absolute;
  font-size: 26px;
  filter: drop-shadow(0 3px 3px rgba(0, 0, 0, .16));
  pointer-events: none;
}

.flag {
  position: absolute;
  z-index: 2;
  background: #2E7CF6;
  color: #fff;
  border-radius: var(--r-pill);
  padding: 4px 10px;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: .6px;
  box-shadow: 0 3px 8px rgba(46, 124, 246, .35);
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
  text-align: left;
  transition: transform .07s;
}

.node:active { transform: translateY(3px); }

.node.completed {
  background: linear-gradient(165deg, #20B56A, #0F9A50);
  box-shadow: 0 5px 0 #0C7A3F;
}

.node.in_progress {
  background: linear-gradient(165deg, #3D8BFA, #2266DB);
  box-shadow: 0 5px 0 #1B54B8;
}

.node.locked {
  background: var(--card);
  border: 1.5px solid var(--line);
  box-shadow: 0 5px 0 var(--line-3);
  color: var(--faint);
  opacity: .9;
}

.node-head { display: flex; justify-content: space-between; align-items: baseline; }
.node-head b { font-size: 20px; line-height: 1; }
.node-head i { font-style: normal; font-size: 8px; font-weight: 700; opacity: .85; }
.lock { display: grid; place-items: center; opacity: .9; }

.node-foot {
  margin-top: auto;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.3;
  overflow: hidden;
}

.node-foot b { font-size: 12px; }

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
</style>
