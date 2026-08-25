<script setup>
import { computed, onMounted, ref } from 'vue'
import { backIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'

const props = defineProps({ stageId: Number })
const emit = defineEmits(['close', 'saved'])

const stage = ref(null)
const title = ref('')
const rows = ref([])
const loading = ref(true)
const saving = ref(false)

const maxWords = computed(() => stage.value?.max_words ?? 20)
const filled = computed(() => rows.value.filter((r) => r.en.trim() && r.translation.trim()).length)

async function load() {
  loading.value = true

  try {
    const data = await api.teacher.stage(props.stageId)
    stage.value = data.stage
    title.value = data.stage.title ?? ''

    rows.value = data.stage.words.map((w) => ({ en: w.en, translation: w.translation ?? '' }))
    ensureBlankRow()
  } catch (error) {
    store.toast(error.message)
    emit('close')
  } finally {
    loading.value = false
  }
}

/** Always leave one empty pair at the bottom to type into. */
function ensureBlankRow() {
  const last = rows.value[rows.value.length - 1]

  if (rows.value.length < maxWords.value && (!last || last.en.trim() || last.translation.trim())) {
    rows.value.push({ en: '', translation: '' })
  }
}

function drop(index) {
  rows.value.splice(index, 1)
  ensureBlankRow()
}

async function save() {
  const words = rows.value
    .map((r) => ({ en: r.en.trim(), translation: r.translation.trim() }))
    .filter((r) => r.en && r.translation)

  if (!words.length) {
    store.toast('Kamida bitta soʼz kiriting')
    return
  }

  saving.value = true

  try {
    await api.teacher.saveStage(props.stageId, title.value.trim() || null, words)
    store.toast('✅ Saqlandi')
    emit('saved')
    emit('close')
  } catch (error) {
    store.toast(error.message)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="overlay show editor">
    <header class="editor-head">
      <button class="back" @click="$emit('close')" v-html="backIcon"></button>
      <div style="flex: 1">
        <div class="title">
          {{ stage ? `${stage.position}-bosqich` : 'Bosqich' }}{{ title ? ` · ${title}` : '' }}
        </div>
        <div class="sub-line">{{ stage?.path?.title }}{{ stage?.path?.subtitle ? ` · ${stage.path.subtitle}` : '' }}</div>
      </div>
      <span class="count">{{ filled }}/{{ maxWords }} soʼz</span>
    </header>

    <div class="editor-body">
      <template v-if="!loading">
        <label class="field">
          <span>BOSQICH NOMI</span>
          <input v-model="title" placeholder="Masalan: Maktab jihozlari" />
        </label>

        <p class="rule">
          Bir bosqichga <b>{{ maxWords }} tagacha</b> soʼz qoʼshiladi. Bosqichlar soni — cheksiz.
        </p>

        <div class="rows">
          <div v-for="(row, index) in rows" :key="index" class="row">
            <span class="num">{{ index + 1 }}</span>
            <input
              v-model="row.en"
              class="en"
              placeholder="yangi soʼz (EN)"
              autocapitalize="off"
              @input="ensureBlankRow"
            />
            <input
              v-model="row.translation"
              class="uz"
              placeholder="tarjima"
              @input="ensureBlankRow"
            />
            <button
              v-if="row.en || row.translation"
              class="drop"
              @click="drop(index)"
            >×</button>
          </div>
        </div>
      </template>
    </div>

    <div class="editor-foot">
      <button class="btn btn-primary" :disabled="saving || !filled" @click="save">
        {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor { background: var(--canvas); z-index: 20; }

.editor-head {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 22px 14px; background: var(--card);
  border-bottom: 1px solid var(--wash); flex: none;
}

.back {
  width: 36px; height: 36px; border-radius: 12px;
  border: 1px solid var(--line); background: none; color: var(--ink);
  display: grid; place-items: center; cursor: pointer; flex: none;
}

.title { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; }
.sub-line { font-size: 11.5px; font-weight: 600; color: var(--faint); }

.count {
  font-family: 'Sora', sans-serif; font-size: 12.5px; font-weight: 700;
  color: var(--green); flex-shrink: 0;
}

.editor-body { flex: 1; overflow-y: auto; padding: 14px 22px 22px; }

.field { display: block; }

.field span {
  display: block; font-size: 10.5px; font-weight: 800; letter-spacing: 1px;
  color: var(--faint); margin-bottom: 6px;
}

.field input {
  width: 100%; border: 1px solid var(--line); border-radius: 12px;
  padding: 12px 14px; font-family: 'Manrope', sans-serif;
  font-size: 14px; font-weight: 700; color: var(--ink); outline: none;
  background: var(--card);
}

.field input:focus { border-color: var(--green); }

.rule {
  font-size: 11.5px; font-weight: 600; color: var(--faint);
  margin: 12px 0; text-align: center;
}

.rule b { color: var(--ink); font-weight: 800; }

.rows { display: flex; flex-direction: column; gap: 8px; }

.row {
  display: flex; align-items: center; gap: 8px;
  background: var(--card); border: 1px solid var(--line);
  border-radius: 12px; padding: 8px 10px;
}

.num {
  width: 20px; text-align: center;
  font-family: 'Sora', sans-serif; font-size: 12px; font-weight: 700;
  color: var(--faint); flex-shrink: 0;
}

.row input {
  border: none; background: none; outline: none;
  font-family: 'Manrope', sans-serif; font-size: 13.5px; font-weight: 700;
  color: var(--ink); min-width: 0;
}

.row .en { flex: 1; }
.row .uz { flex: 1; color: var(--muted); }

.row input::placeholder { color: var(--faint); font-weight: 600; }

.drop {
  width: 22px; height: 22px; border: none; background: none;
  color: var(--faint); font-size: 18px; line-height: 1;
  cursor: pointer; flex-shrink: 0;
}

.editor-foot { padding: 14px 22px 26px; background: var(--card); border-top: 1px solid var(--wash); }
</style>
