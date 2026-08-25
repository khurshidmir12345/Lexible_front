<script setup>
import { onMounted, ref } from 'vue'
import Modal from '../ui/Modal.vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['open'])

const groups = ref([])
const loading = ref(true)
const creating = ref(false)
const draft = ref({ title: '', subtitle: '', badge: '' })

async function load() {
  loading.value = true
  try {
    groups.value = (await api.teacher.groups()).groups
  } catch (error) {
    store.toast(error.message)
  } finally {
    loading.value = false
  }
}

async function create() {
  if (draft.value.title.trim().length < 2) return

  try {
    await api.teacher.createGroup({
      title: draft.value.title.trim(),
      subtitle: draft.value.subtitle.trim() || null,
      badge: draft.value.badge.trim() || null,
    })
    creating.value = false
    draft.value = { title: '', subtitle: '', badge: '' }
    store.toast('✅ Guruh yaratildi')
    await load()
  } catch (error) {
    store.toast(error.message)
  }
}

function copyCode(code) {
  telegram.copy(code)
  store.toast(`🔗 ${code} nusxalandi`)
}

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div class="scroll">
    <button class="new-group" @click="creating = true">+ Yangi guruh yaratish</button>

    <div v-if="loading" class="note">Yuklanmoqda...</div>

    <template v-else-if="groups.length">
      <div v-for="group in groups" :key="group.id" class="group" @click="emit('open', group.id)">
        <div class="group-head">
          <span class="badge">{{ group.badge }}</span>
          <span class="group-text">
            <b>{{ group.title }}</b>
            <i>{{ group.members }} oʼquvchi · {{ group.path ?? 'yoʼl biriktirilmagan' }}</i>
          </span>
        </div>

        <div class="group-foot">
          <button class="code" @click.stop="copyCode(group.code)">Kod: {{ group.code }}</button>
          <span v-if="group.pending" class="waiting">{{ group.pending }} soʼrov kutmoqda</span>
        </div>
      </div>
    </template>

    <div v-else class="empty">
      <div class="empty-emoji">👥</div>
      <h3>Hali guruh yoʼq</h3>
      <p>Guruh yarating va kodni oʼquvchilaringizga bering.</p>
    </div>

    <Teleport to="#lx-overlays">
      <Modal :open="creating" title="Yangi guruh" text="Oʼquvchilar kod orqali qoʼshiladi.">
        <label class="field">
          <span>GURUH NOMI</span>
          <input v-model="draft.title" placeholder="Masalan: 5-A sinf" />
        </label>
        <label class="field">
          <span>IZOH</span>
          <input v-model="draft.subtitle" placeholder="5-sinf Ingliz tili" />
        </label>
        <label class="field">
          <span>QISQA BELGI</span>
          <input v-model="draft.badge" maxlength="4" placeholder="5A" />
        </label>
        <template #actions>
          <button class="btn btn-soft" @click="creating = false">Bekor</button>
          <button class="btn btn-primary" :disabled="draft.title.trim().length < 2" @click="create">Yaratish</button>
        </template>
      </Modal>
    </Teleport>
  </div>
</template>

<style scoped>
.new-group {
  border: 1px dashed var(--line-4); background: none; border-radius: 14px;
  padding: 13px; font-family: 'Manrope', sans-serif;
  font-size: 13.5px; font-weight: 700; color: var(--muted); cursor: pointer;
}

.group {
  background: var(--card); border: 1px solid var(--line);
  border-radius: var(--r-lg); padding: 14px 16px; cursor: pointer;
}

.group-head { display: flex; align-items: center; gap: 12px; }

.badge {
  width: 40px; height: 40px; border-radius: 12px;
  background: var(--green-soft); color: var(--green-dark);
  display: grid; place-items: center;
  font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700;
  flex-shrink: 0;
}

.group-text { flex: 1; }
.group-text b { display: block; font-size: 15px; font-weight: 800; }
.group-text i { display: block; font-style: normal; font-size: 12px; font-weight: 600; color: var(--faint); }

.group-foot {
  display: flex; align-items: center; gap: 10px;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--wash);
}

.code {
  border: 1px dashed #C3CEC5; background: none; border-radius: var(--r-pill);
  padding: 6px 12px; font-family: 'Manrope', sans-serif;
  font-size: 12px; font-weight: 800; color: #2E7CF6; cursor: pointer;
}

.waiting {
  margin-left: auto; font-size: 11.5px; font-weight: 800; color: var(--gold);
}

.empty {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 6px; padding: 50px 20px;
}

.empty-emoji { font-size: 42px; }
.empty h3 { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700; }
.empty p { font-size: 13px; font-weight: 600; color: var(--muted); max-width: 240px; }

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
