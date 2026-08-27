<script setup>
/**
 * UT-MD1 «Oʼquvchi qoʼshish» — two routes into a class: the teacher looks a
 * student up by ID and adds them, or hands out the join code and approves the
 * request that arrives.
 */
import { ref, watch } from 'vue'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  groupId: { type: Number, required: true },
  code: { type: String, default: '' },
})

const emit = defineEmits(['close', 'added'])

const query = ref('')
const results = ref([])
const searching = ref(false)
const adding = ref(null)

let debounce = null

/** Typing an ID should not fire a request per keystroke. */
watch(query, (value) => {
  clearTimeout(debounce)
  const term = value.trim()

  if (term.length < 2) {
    results.value = []
    searching.value = false
    return
  }

  searching.value = true
  debounce = setTimeout(async () => {
    try {
      results.value = (await api.teacher.candidates(props.groupId, term)).students
    } catch (error) {
      store.toast(error.message)
      results.value = []
    } finally {
      searching.value = false
    }
  }, 350)
})

async function add(student) {
  if (student.already_in) return

  adding.value = student.id

  try {
    await api.teacher.addMember(props.groupId, student.id)
    telegram.notify('success')
    store.toast(`✅ ${student.name} qoʼshildi`)
    student.already_in = true
    emit('added')
  } catch (error) {
    store.toast(error.message)
  } finally {
    adding.value = null
  }
}

function copyCode() {
  telegram.copy(props.code)
  telegram.haptic()
  store.toast('🔗 Kod nusxalandi')
}
</script>

<template>
  <Teleport to="#lx-overlays">
    <div class="scrim" @click.self="emit('close')">
      <div class="card">
        <h2>Oʼquvchi qoʼshish</h2>

        <div class="t-field block">
          <span>ID YOKI ISM ORQALI QIDIRISH</span>
          <div class="search" :class="{ on: query.trim().length >= 2 }">
            <span class="ic" v-html="TeacherIcon.search"></span>
            <input v-model="query" placeholder="7231" autocomplete="off" />
          </div>
        </div>

        <p v-if="searching" class="t-more pad">Qidirilmoqda…</p>

        <p v-else-if="query.trim().length >= 2 && !results.length" class="t-more pad">
          Hech kim topilmadi. Oʼquvchi avval botni ishga tushirgan boʼlishi kerak.
        </p>

        <div v-for="student in results" :key="student.id" class="found">
          <span class="t-avatar">{{ student.initial }}</span>
          <span class="found-text">
            <b>{{ student.name }}</b>
            <i>ID {{ student.telegram_id }}{{ student.level ? ` · ${student.level}` : '' }}</i>
          </span>
          <button
            class="add"
            :class="{ done: student.already_in }"
            :disabled="student.already_in || adding === student.id"
            @click="add(student)"
          >
            {{ student.already_in ? 'Guruhda' : adding === student.id ? '…' : 'Qoʼshish' }}
          </button>
        </div>

        <div class="or"><i></i><span>YOKI</span><i></i></div>

        <div class="t-label">KALIT SOʼZ ULASHING</div>
        <p class="explain">Oʼquvchi ilovada shu kodni kiritadi — sizga tasdiqlash soʼrovi keladi.</p>

        <button class="code" @click="copyCode">
          <b>{{ code }}</b>
          <span><span v-html="TeacherIcon.copy"></span> Nusxa</span>
        </button>

        <button class="btn btn-soft close" @click="emit('close')">Yopish</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: absolute;
  inset: 0;
  z-index: 34;
  background: rgba(22, 32, 26, .45);
  display: flex;
  align-items: flex-end;
}

.card {
  width: 100%;
  background: var(--card);
  border-radius: 24px 24px 0 0;
  padding: 22px 22px calc(24px + env(safe-area-inset-bottom));
  max-height: 92%;
  overflow-y: auto;
}

h2 { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; }

.block { margin-top: 14px; }

.search {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 13px;
  padding: 12px 14px;
}

.search.on {
  border: 1.5px solid var(--green);
  box-shadow: 0 0 0 4px var(--green-soft);
}

.search .ic { color: var(--faint); display: grid; place-items: center; flex: none; }

.search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  outline: none;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.pad { padding: 14px 0; }

.found {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--green-pale);
  background: var(--wash-3);
  border-radius: 13px;
  padding: 12px 13px;
  margin-top: 10px;
}

.found-text { flex: 1; min-width: 0; }
.found-text b { display: block; font-size: 13.5px; font-weight: 800; }
.found-text i {
  display: block;
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.add {
  border: none;
  border-radius: 10px;
  background: var(--green);
  color: #fff;
  padding: 8px 13px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  flex: none;
}

.add.done, .add:disabled { background: var(--wash-2); color: var(--faint); cursor: default; }

.or { display: flex; align-items: center; gap: 12px; margin: 18px 0 14px; }
.or i { flex: 1; height: 1px; background: var(--line); }
.or span { font-size: 11px; font-weight: 800; color: var(--faint); }

.explain {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.5;
  margin-top: 5px;
}

.code {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1.5px dashed var(--line-4);
  border-radius: 13px;
  padding: 12px 14px;
  margin-top: 10px;
  background: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
}

.code b {
  flex: 1;
  text-align: left;
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--blue);
  letter-spacing: .5px;
}

.code > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--muted);
}

.close { margin-top: 16px; }
</style>
