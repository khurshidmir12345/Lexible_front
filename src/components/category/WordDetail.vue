<script setup>
import { ref, watch } from 'vue'
import ReportSheet from '../ui/ReportSheet.vue'
import { flagIcon, speakerIcon2 } from '../../lib/icons2'
import { speak } from '../../lib/speech'

const props = defineProps({ word: Object })
defineEmits(['close'])

const reporting = ref(false)

watch(() => props.word, () => (reporting.value = false))
</script>

<template>
  <div class="dialog-wrap" :class="{ open: Boolean(word) }">
    <div v-if="word" class="dialog">
      <div class="head">
        <span class="letter">{{ word.en.charAt(0).toLowerCase() }}</span>
        <div style="flex: 1">
          <div class="word">{{ word.en }}</div>
          <div v-if="word.transcription" class="phon">[ {{ word.transcription.replace(/\//g, '') }} ]</div>
        </div>
        <button class="flag" aria-label="Shikoyat yuborish" @click="reporting = true" v-html="flagIcon"></button>
        <button class="say" @click="speak(word.en, word.audio)" v-html="speakerIcon2"></button>
      </div>

      <div class="translation">{{ word.translation ?? '—' }}</div>
      <div v-if="word.pos" class="pos">{{ word.pos }}</div>

      <div v-if="word.example" class="example">
        <div class="example-label">MISOL</div>
        <p>{{ word.example }}</p>
        <p v-if="word.example_translation" class="example-uz">{{ word.example_translation }}</p>
      </div>

      <button class="btn btn-primary" style="margin-top: 18px" @click="$emit('close')">Yopish</button>
    </div>
  </div>

  <ReportSheet v-if="reporting && word" :word="word" @close="reporting = false" />
</template>

<style scoped>
.dialog-wrap {
  position: absolute;
  inset: 0;
  background: rgba(22, 32, 26, .45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 26px;
  opacity: 0;
  pointer-events: none;
  transition: opacity .2s;
  z-index: 30;
}

.dialog-wrap.open {
  opacity: 1;
  pointer-events: auto;
}

.dialog {
  width: 100%;
  background: var(--card);
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0 24px 48px -20px rgba(22, 32, 26, .35);
  max-height: 100%;
  overflow-y: auto;
}

.head {
  display: flex;
  align-items: center;
  gap: 13px;
}

.letter {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: var(--green-soft);
  color: var(--green-dark);
  display: grid;
  place-items: center;
  font-family: 'Sora', sans-serif;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.word {
  font-family: 'Sora', sans-serif;
  font-size: 21px;
  font-weight: 700;
}

.phon {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 1px;
}

.say {
  width: 40px;
  height: 40px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: none;
  color: var(--green-dark);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.flag {
  width: 40px;
  height: 40px;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  background: none;
  color: var(--muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.translation {
  font-family: 'Sora', sans-serif;
  font-size: 19px;
  font-weight: 700;
  color: var(--green);
  margin-top: 16px;
}

.pos {
  font-size: 12px;
  font-weight: 700;
  color: var(--faint);
  margin-top: 2px;
  text-transform: lowercase;
}

.example {
  background: var(--wash-2);
  border-radius: 14px;
  padding: 13px 15px;
  margin-top: 16px;
}

.example-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--faint);
  margin-bottom: 6px;
}

.example p {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.5;
}

.example-uz {
  color: var(--muted);
  margin-top: 4px;
}
</style>
