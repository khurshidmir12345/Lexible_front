<script setup>
/**
 * The complaint sheet behind every flag button: the player writes what is
 * wrong with a word, it lands in the admin panel, and the bot immediately
 * confirms in the chat that the report arrived.
 */
import { ref } from 'vue'
import Modal from './Modal.vue'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  /** `{ id, en }` — id may be missing when the screen doesn't know it. */
  word: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const text = ref('')
const busy = ref(false)

async function submit() {
  if (busy.value || text.value.trim().length < 3) return

  busy.value = true
  try {
    await api.reportWord({
      word_id: props.word.id ?? null,
      word: props.word.en,
      text: text.value.trim(),
    })
    telegram.notify('success')
    store.toast('✅ Shikoyat yuborildi — javobni botda olasiz')
    emit('close')
  } catch (error) {
    store.toast(error.message)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Modal open title="Shikoyat yuborish" :text="`«${word.en}» soʼzida nima notoʼgʼri?`">
    <textarea
      v-model="text"
      class="report-input"
      rows="4"
      maxlength="500"
      placeholder="Masalan: tarjimasi notoʼgʼri, talaffuzi xato, rasmi mos emas…"
    ></textarea>
    <template #actions>
      <button class="btn btn-soft" @click="emit('close')">Bekor</button>
      <button class="btn btn-primary" :disabled="text.trim().length < 3 || busy" @click="submit">
        Yuborish
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.report-input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px 15px;
  margin-top: 14px;
  background: var(--card);
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  outline: none;
  resize: none;
}

.report-input:focus {
  border-color: var(--green);
}

.report-input::placeholder {
  color: var(--faint);
}
</style>
