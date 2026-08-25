<script setup>
import { ref, watch } from 'vue'
import { api } from '../../lib/api'
import { telegram } from '../../lib/telegram'
import Modal from '../ui/Modal.vue'

const props = defineProps({ node: Object })
const emit = defineEmits(['close', 'start'])

const brief = ref(null)
const loading = ref(true)

watch(() => props.node, async (node) => {
  if (!node) return
  loading.value = true
  brief.value = null
  try {
    const { exam } = await api.examBriefing(node.id)
    brief.value = exam
  } finally {
    loading.value = false
  }
}, { immediate: true })

function start() {
  telegram.haptic()
  emit('start', props.node)
}
</script>

<template>
  <Modal :open="!!node">
    <div class="ex-badge">IMTIHON</div>

    <h2 class="ex-title">{{ node?.position }}-bosqich imtihoni</h2>

    <p v-if="loading" class="ex-sub">Yuklanmoqda…</p>
    <template v-else-if="brief">
      <p class="ex-sub">
        {{ brief.questions }} ta savol · oʼtish balli {{ brief.pass_mark }}%
      </p>
      <p v-if="brief.covers" class="ex-note">
        {{ brief.covers }} tasodifiy savollar tuziladi.
      </p>
      <p v-else class="ex-note">
        Imtihon uchun avval oldingi bosqichlarni tugating.
      </p>
    </template>

    <template #actions>
      <button class="btn ghost" @click="emit('close')">Bekor</button>
      <button class="btn" :disabled="loading || !brief?.ready" @click="start">
        Boshlash
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.ex-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: var(--r-pill);
  background: var(--gold);
  color: var(--gold-ink);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .1em;
  margin-bottom: 12px;
}

.ex-title {
  font-family: 'Sora', sans-serif;
  font-size: 19px;
  font-weight: 700;
}

.ex-sub {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  margin-top: 6px;
}

.ex-note {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.5;
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: var(--tint);
}

.btn:disabled {
  opacity: .45;
  pointer-events: none;
}
</style>
