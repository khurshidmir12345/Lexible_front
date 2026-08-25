<script setup>
import { onMounted, ref } from 'vue'
import Modal from '../ui/Modal.vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'

const emit = defineEmits(['edit-stage'])

const paths = ref([])
const active = ref(null)
const loading = ref(true)
const creating = ref(false)
const draft = ref({ title: '', subtitle: '' })

async function load() {
  loading.value = true
  try {
    paths.value = (await api.teacher.paths()).paths
    if (!active.value || !paths.value.some((p) => p.id === active.value)) {
      active.value = paths.value[0]?.id ?? null
    }
  } catch (error) {
    store.toast(error.message)
  } finally {
    loading.value = false
  }
}

async function createPath() {
  if (draft.value.title.trim().length < 2) return

  try {
    const { path } = await api.teacher.createPath(draft.value.title.trim(), draft.value.subtitle.trim() || null)
    creating.value = false
    draft.value = { title: '', subtitle: '' }
    await load()
    active.value = path.id
  } catch (error) {
    store.toast(error.message)
  }
}

async function addStage() {
  try {
    const { stage } = await api.teacher.addStage(active.value, null)
    await load()
    emit('edit-stage', stage.id)
  } catch (error) {
    store.toast(error.message)
  }
}

const current = () => paths.value.find((p) => p.id === active.value)

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div class="scroll">
    <div class="path-tabs">
      <button
        v-for="path in paths"
        :key="path.id"
        class="path-tab"
        :class="{ on: active === path.id }"
        @click="active = path.id"
      >
        {{ path.title }}
      </button>
      <button class="path-add" @click="creating = true">+</button>
    </div>

    <div v-if="loading" class="note">Yuklanmoqda...</div>

    <template v-else-if="current()">
      <p class="hint">Bosqichlar cheksiz. Kartani bosing — lugʼat tahriri.</p>

      <div class="stages">
        <button
          v-for="stage in [...current().stages].reverse()"
          :key="stage.id"
          class="stage"
          :class="{ exam: stage.type === 'exam' }"
          @click="emit('edit-stage', stage.id)"
        >
          <span class="num v-num">{{ stage.position }}</span>
          <span class="stage-text">
            <b>{{ stage.title ?? 'Nomsiz bosqich' }}</b>
            <i>{{ stage.words_count }} soʼz</i>
          </span>
        </button>

        <button class="stage add" @click="addStage">
          <span class="plus">+</span>
          <span class="stage-text"><b>Bosqich qoʼshish</b><i>yangi dars</i></span>
        </button>
      </div>
    </template>

    <div v-else class="empty">
      <div class="empty-emoji">🗺</div>
      <h3>Hali yoʼl yoʼq</h3>
      <p>Yoʼl — bu darslar ketma-ketligi. Yarating va bosqich qoʼshing.</p>
      <button class="btn btn-primary" @click="creating = true">Yoʼl yaratish</button>
    </div>

    <Teleport to="#lx-overlays">
      <Modal :open="creating" title="Yangi yoʼl" text="Masalan: 5-sinf, IELTS.">
        <label class="field">
          <span>YOʼL NOMI</span>
          <input v-model="draft.title" placeholder="5-sinf" />
        </label>
        <label class="field">
          <span>IZOH</span>
          <input v-model="draft.subtitle" placeholder="Ingliz tili" />
        </label>
        <template #actions>
          <button class="btn btn-soft" @click="creating = false">Bekor</button>
          <button class="btn btn-primary" :disabled="draft.title.trim().length < 2" @click="createPath">Yaratish</button>
        </template>
      </Modal>
    </Teleport>
  </div>
</template>

<style scoped>
.path-tabs { display: flex; gap: 7px; overflow-x: auto; padding-bottom: 2px; }

.path-tab {
  border: 1px solid var(--line); background: var(--card);
  border-radius: var(--r-pill); padding: 7px 14px;
  font-family: 'Manrope', sans-serif; font-size: 12.5px; font-weight: 700;
  color: var(--muted); cursor: pointer; white-space: nowrap;
}

.path-tab.on { background: var(--ink); border-color: var(--ink); color: #fff; }

.path-add {
  width: 32px; height: 32px; border-radius: var(--r-pill);
  border: 1.5px dashed #C3CEC5; background: none;
  color: var(--muted); font-size: 17px; font-weight: 700;
  cursor: pointer; flex-shrink: 0;
}

.hint { font-size: 12px; font-weight: 600; color: var(--faint); text-align: center; margin: 4px 0; }

.stages { display: flex; flex-direction: column; gap: 9px; }

.stage {
  display: flex; align-items: center; gap: 13px;
  background: var(--card); border: 1px solid var(--line);
  border-radius: 14px; padding: 13px 15px;
  cursor: pointer; text-align: left; font-family: 'Manrope', sans-serif;
}

.stage.exam { border-color: var(--gold-mid); background: #FFFBF0; }

.num {
  width: 38px; height: 38px; border-radius: 12px;
  background: var(--green-soft); color: var(--green-dark);
  display: grid; place-items: center; font-size: 15px;
  flex-shrink: 0;
}

.stage-text { flex: 1; }
.stage-text b { display: block; font-size: 14.5px; font-weight: 700; }
.stage-text i { display: block; font-style: normal; font-size: 12px; font-weight: 600; color: var(--faint); }

.stage.add { border-style: dashed; background: none; }

.plus {
  width: 38px; height: 38px; border-radius: 12px;
  border: 1.5px dashed #C3CEC5; display: grid; place-items: center;
  font-size: 18px; font-weight: 700; color: var(--muted); flex-shrink: 0;
}

.empty {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 6px; padding: 50px 20px;
}

.empty-emoji { font-size: 42px; }
.empty h3 { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700; }
.empty p { font-size: 13px; font-weight: 600; color: var(--muted); max-width: 250px; margin-bottom: 10px; }

.note { text-align: center; font-size: 13px; font-weight: 600; color: var(--faint); padding: 30px; }

.field { display: block; margin-top: 12px; }

.field span {
  display: block; font-size: 10.5px; font-weight: 800; letter-spacing: 1px;
  color: var(--faint); margin-bottom: 6px;
}

.field input {
  width: 100%; border: 1px solid var(--line); border-radius: 12px;
  padding: 12px 14px; font-family: 'Manrope', sans-serif;
  font-size: 14px; font-weight: 700; color: var(--ink); outline: none;
}

.field input:focus { border-color: var(--green); }
</style>
