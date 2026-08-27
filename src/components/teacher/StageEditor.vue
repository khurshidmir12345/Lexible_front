<script setup>
/**
 * UT-02 «Bosqich tahriri» — the teacher types the pairs themselves.
 *
 * The artboard separates the two jobs: one row at the top to add a word, and
 * a plain numbered list below it to review and delete. That reads far better
 * on a phone than a column of paired inputs that all look editable.
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({ stageId: Number })
const emit = defineEmits(['close', 'saved'])

const stage = ref(null)
const title = ref('')
const isExam = ref(false)
const words = ref([])
const draft = ref({ en: '', translation: '' })
const loading = ref(true)
const saving = ref(false)
const enField = ref(null)

const maxWords = computed(() => stage.value?.max_words ?? 20)
const full = computed(() => words.value.length >= maxWords.value)
const percent = computed(() => Math.min(Math.round((words.value.length / maxWords.value) * 100), 100))
const canAdd = computed(() =>
  Boolean(draft.value.en.trim() && draft.value.translation.trim()) && !full.value,
)

async function load() {
  loading.value = true

  try {
    const { stage: data } = await api.teacher.stage(props.stageId)
    stage.value = data
    title.value = data.title ?? ''
    isExam.value = data.type === 'exam'
    words.value = data.words.map((w) => ({ en: w.en, translation: w.translation ?? '' }))
  } catch (error) {
    store.toast(error.message)
    emit('close')
  } finally {
    loading.value = false
  }
}

function add() {
  if (!canAdd.value) return

  const en = draft.value.en.trim()

  if (words.value.some((w) => w.en.toLowerCase() === en.toLowerCase())) {
    store.toast('Bu soʼz roʼyxatda bor')
    return
  }

  words.value.push({ en, translation: draft.value.translation.trim() })
  draft.value = { en: '', translation: '' }
  telegram.haptic()
  nextTick(() => enField.value?.focus())
}

function drop(index) {
  words.value.splice(index, 1)
  telegram.haptic()
}

async function save() {
  if (!words.value.length) {
    store.toast('Kamida bitta soʼz kiriting')
    return
  }

  saving.value = true

  try {
    await api.teacher.saveStage(
      props.stageId,
      title.value.trim() || null,
      words.value,
      isExam.value ? 'exam' : 'normal',
    )
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
    <header class="t-head">
      <button class="t-back" aria-label="Orqaga" @click="emit('close')">
        <span v-html="TeacherIcon.chevron" class="flip"></span>
      </button>
      <div class="t-head-main">
        <h1>{{ stage ? `${stage.position}-bosqich` : 'Bosqich' }}{{ title ? ` · ${title}` : '' }}</h1>
        <p>{{ stage?.path?.title }}{{ stage?.path?.subtitle ? ` · ${stage.path.subtitle}` : '' }}</p>
      </div>
      <span class="t-pill green">{{ words.length }}/{{ maxWords }} soʼz</span>
    </header>

    <div class="t-body">
      <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

      <template v-else>
        <label class="t-field"><span>BOSQICH NOMI</span>
          <input v-model="title" placeholder="Masalan: Maktab jihozlari" maxlength="60" />
        </label>

        <div class="t-note">
          <span v-html="TeacherIcon.info"></span>
          <b>Bir bosqichga <b>{{ maxWords }} tagacha</b> soʼz qoʼshiladi. Bosqichlar soni — cheksiz.</b>
        </div>

        <label class="exam">
          <span class="exam-text">
            <b>Imtihon bosqichi</b>
            <i>oldingi bosqichlardan tasodifiy savollar</i>
          </span>
          <input v-model="isExam" type="checkbox" class="sr" />
          <span class="switch" :class="{ on: isExam }"></span>
        </label>

        <div class="t-meter"><i :style="{ width: `${percent}%` }"></i></div>

        <!-- Add row -->
        <div class="add" :class="{ off: full }">
          <input
            ref="enField"
            v-model="draft.en"
            placeholder="yangi soʼz (EN)"
            autocapitalize="off"
            autocomplete="off"
            spellcheck="false"
            :disabled="full"
            @keyup.enter="add"
          />
          <input
            v-model="draft.translation"
            placeholder="tarjima (UZ)"
            autocomplete="off"
            :disabled="full"
            @keyup.enter="add"
          />
          <button class="add-btn" :disabled="!canAdd" aria-label="Qoʼshish" @click="add">
            <span v-html="TeacherIcon.plus"></span>
          </button>
        </div>

        <p v-if="full" class="t-more">Chegara toʼldi — yangi soʼzlar uchun yangi bosqich oching.</p>

        <div v-if="words.length" class="t-rows">
          <div v-for="(word, index) in words" :key="`${word.en}-${index}`" class="t-row">
            <span class="idx">{{ index + 1 }}</span>
            <span class="pair"><b>{{ word.en }}</b> — {{ word.translation }}</span>
            <button class="del" aria-label="Oʼchirish" @click="drop(index)">
              <span v-html="TeacherIcon.trash"></span>
            </button>
          </div>
        </div>

        <div v-else class="t-empty">
          <span class="t-empty-ic" v-html="TeacherIcon.board"></span>
          <h3>Lugʼat boʼsh</h3>
          <p>Yuqoridagi maydonlarga inglizcha soʼz va tarjimasini yozib, ➕ ni bosing.</p>
        </div>
      </template>
    </div>

    <div class="t-foot">
      <button class="btn btn-primary" :disabled="saving || loading || !words.length" @click="save">
        {{ saving ? 'Saqlanmoqda…' : 'Saqlash' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor { background: var(--canvas); z-index: 20; }

.flip { display: grid; place-items: center; transform: rotate(180deg); }

/* --------------------------------------------------------------- exam row */

.exam {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 12px 14px;
  cursor: pointer;
}

.exam-text { flex: 1; }
.exam-text b { display: block; font-size: 13.5px; font-weight: 800; }
.exam-text i {
  display: block;
  font-style: normal;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--faint);
  margin-top: 2px;
}

.sr { position: absolute; opacity: 0; pointer-events: none; }

.switch {
  width: 40px;
  height: 24px;
  border-radius: var(--r-pill);
  background: var(--line-3);
  position: relative;
  flex: none;
  transition: background .15s;
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: var(--r-pill);
  background: var(--card);
  box-shadow: 0 1px 3px rgba(22, 32, 26, .2);
  transition: transform .15s;
}

.switch.on { background: var(--green); }
.switch.on::after { transform: translateX(16px); }

/* ---------------------------------------------------------------- add row */

.add { display: flex; gap: 9px; }
.add.off { opacity: .5; }

.add input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 13px;
  padding: 12px 14px;
  font-family: 'Manrope', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  outline: none;
}

.add input::placeholder { color: var(--faint); font-weight: 600; }
.add input:focus { border-color: var(--green); }

.add-btn {
  width: 46px;
  border: none;
  border-radius: 13px;
  background: var(--green);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
}

.add-btn:disabled { opacity: .4; cursor: default; }

/* ------------------------------------------------------------------ rows */

.idx {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--wash-2);
  color: var(--faint);
  display: grid;
  place-items: center;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  flex: none;
}

.pair {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--faint);
  overflow: hidden;
  text-overflow: ellipsis;
}

.pair b { font-size: 14px; font-weight: 800; color: var(--ink); }

.del {
  border: none;
  background: none;
  color: var(--line-4);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
  padding: 4px;
}
</style>
