<script setup>
/** UT-03 «Guruhlar» — every class, its join code, and who is waiting. */
import { onMounted, ref } from 'vue'
import Modal from '../ui/Modal.vue'
import { TeacherIcon, badgeTint } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['open'])

const groups = ref([])
const paths = ref([])
const loading = ref(true)
const creating = ref(false)
const saving = ref(false)
const draft = ref({ title: '', subtitle: '', badge: '', path_id: null })

async function load() {
  loading.value = true

  try {
    const [{ groups: rows }, { paths: list }] = await Promise.all([
      api.teacher.groups(),
      api.teacher.paths(),
    ])
    groups.value = rows
    paths.value = list
  } catch (error) {
    store.toast(error.message)
  } finally {
    loading.value = false
  }
}

function startCreate() {
  draft.value = { title: '', subtitle: '', badge: '', path_id: paths.value[0]?.id ?? null }
  creating.value = true
}

async function create() {
  const title = draft.value.title.trim()
  if (title.length < 2 || saving.value) return

  saving.value = true

  try {
    await api.teacher.createGroup({
      title,
      subtitle: draft.value.subtitle.trim() || null,
      badge: draft.value.badge.trim() || null,
      path_id: draft.value.path_id,
    })
    creating.value = false
    store.toast('✅ Guruh yaratildi')
    await load()
  } catch (error) {
    store.toast(error.message)
  } finally {
    saving.value = false
  }
}

function copyCode(code) {
  telegram.copy(code)
  telegram.haptic()
  store.toast(`🔗 ${code} nusxalandi`)
}

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div class="scroll">
    <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

    <template v-else-if="groups.length">
      <button
        v-for="(group, index) in groups"
        :key="group.id"
        class="group"
        @click="emit('open', group.id)"
      >
        <div class="head">
          <span class="t-badge" :style="{ background: badgeTint(index).bg, color: badgeTint(index).color }">
            {{ group.badge }}
          </span>
          <span class="head-text">
            <b>{{ group.title }}</b>
            <i>
              {{ group.members }} oʼquvchi ·
              <em :class="{ warn: !group.path }">{{ group.path ?? 'yoʼl biriktirilmagan' }}</em>
            </i>
          </span>
          <span class="chev" v-html="TeacherIcon.chevron"></span>
        </div>

        <div class="foot">
          <span class="t-pill grey code" @click.stop="copyCode(group.code)">Kod: {{ group.code }}</span>
          <span v-if="group.pending" class="t-pill gold">{{ group.pending }} soʼrov kutmoqda</span>
        </div>
      </button>

      <button class="t-dashed" @click="startCreate">
        <span v-html="TeacherIcon.plus"></span> Yangi guruh yaratish
      </button>
    </template>

    <div v-else class="t-empty">
      <span class="t-empty-ic" v-html="TeacherIcon.group"></span>
      <h3>Hali guruh yoʼq</h3>
      <p>Guruh yarating, yoʼlni biriktiring va kodni oʼquvchilaringizga bering.</p>
      <button class="btn btn-primary" @click="startCreate">Guruh yaratish</button>
    </div>

    <Teleport to="#lx-overlays">
      <Modal :open="creating" title="Yangi guruh" text="Oʼquvchilar kod orqali qoʼshiladi.">
        <label class="t-field field"><span>GURUH NOMI</span>
          <input v-model="draft.title" placeholder="Masalan: Beginner guruh" maxlength="60" />
        </label>
        <label class="t-field field"><span>IZOH</span>
          <input v-model="draft.subtitle" placeholder="Kechki guruh · Du-Chor-Ju" maxlength="80" />
        </label>
        <label class="t-field field"><span>QISQA BELGI</span>
          <input v-model="draft.badge" maxlength="4" placeholder="5A" />
        </label>

        <div v-if="paths.length" class="t-field field">
          <span>YOʼL</span>
          <div class="t-chips">
            <button
              v-for="path in paths"
              :key="path.id"
              class="t-chip"
              :class="{ on: draft.path_id === path.id }"
              @click="draft.path_id = draft.path_id === path.id ? null : path.id"
            >{{ path.title }}</button>
          </div>
        </div>

        <p v-else class="t-more hintline">Hali yoʼl yoʼq — guruhni yaratib, keyin yoʼl biriktirasiz.</p>

        <template #actions>
          <button class="btn btn-soft" @click="creating = false">Bekor</button>
          <button
            class="btn btn-primary"
            :disabled="saving || draft.title.trim().length < 2"
            @click="create"
          >{{ saving ? 'Yaratilmoqda…' : 'Yaratish' }}</button>
        </template>
      </Modal>
    </Teleport>
  </div>
</template>

<style scoped>
.group {
  display: block;
  width: 100%;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 16px;
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
  color: var(--ink);
}

.head { display: flex; align-items: center; gap: 13px; }

.head-text { flex: 1; min-width: 0; }
.head-text b { display: block; font-size: 15.5px; font-weight: 800; }
.head-text i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.head-text em { font-style: normal; }
.head-text em.warn { color: var(--gold); font-weight: 700; }

.chev { color: var(--line-4); display: grid; place-items: center; flex: none; }

.foot { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }

.code { cursor: pointer; }

.field { margin-top: 12px; }
.hintline { margin-top: 12px; }
</style>
