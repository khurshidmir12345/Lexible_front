<script setup>
import { speakerIcon } from '../../lib/icons'
import { speak } from '../../lib/speech'

const props = defineProps({ word: Object })
defineEmits(['close'])
</script>

<template>
  <div class="modal" :class="{ show: Boolean(word) }">
    <div v-if="word" class="modal-card">
      <div class="wd-card">
        <div class="wd-em">
          <img v-if="word.icon" :src="word.icon" alt="" style="width: 76px; height: 76px" />
          <template v-else>{{ word.emoji || '📘' }}</template>
        </div>
        <div class="wd-word">{{ word.en }}</div>
        <div v-if="word.transcription" class="wd-pron">{{ word.transcription }}</div>
        <button class="audio-btn wd-audio" v-html="speakerIcon" @click="speak(word.en, word.audio)"></button>
        <div class="wd-tr">{{ word.translation }}</div>
        <div v-if="word.pos" class="wd-pos">{{ word.pos }}</div>
        <div v-if="word.example" class="wd-ex">
          <div class="lbl">Misol</div>
          <p>{{ word.example }}</p>
          <p v-if="word.example_translation" class="uz">{{ word.example_translation }}</p>
        </div>
      </div>
      <div class="modal-actions" style="margin-top: 16px">
        <button class="btn btn-primary" @click="$emit('close')">Yopish</button>
      </div>
    </div>
  </div>
</template>
