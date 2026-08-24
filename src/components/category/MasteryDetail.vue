<script setup>
import { computed } from 'vue'
import { TEST_TYPES } from '../../lib/icons'
import { languageShort } from '../../lib/languages'
import { store } from '../../lib/store'

const props = defineProps({
  open: Boolean,
  title: String,
  subtitle: String,
  mastery: { type: Object, default: () => ({}) },
  /** `flags` shows ✓/✕ per exercise, `bars` shows a percentage bar. */
  mode: { type: String, default: 'bars' },
})

defineEmits(['close'])

const learnedAt = window.LEXIBLE?.mastery?.learned_at ?? 70
const midAt = window.LEXIBLE?.mastery?.mid_at ?? 40

const types = computed(() =>
  TEST_TYPES.map((type) => ({
    ...type,
    label: type.name.replace('{lang}', languageShort(store.state.user?.native_lang)),
    value: props.mastery[type.key] ?? 0,
  })),
)

const colourFor = (value) => (value < midAt ? '#e9606a' : value < learnedAt ? '#e0a800' : '#37c26a')
</script>

<template>
  <div class="modal" :class="{ show: open }">
    <div class="modal-card">
      <h2>{{ title }}</h2>
      <p>{{ subtitle }}</p>
      <div class="mast-list">
        <div v-for="type in types" :key="type.key" class="mast-row">
          <div class="mast-ic" :style="{ background: type.bg, color: type.color }" v-html="type.icon"></div>
          <div class="mast-tx">
            <b>{{ type.label }}</b>
            <div v-if="mode === 'bars'" class="pbar">
              <i :style="{ width: type.value + '%', background: colourFor(type.value) }"></i>
            </div>
          </div>
          <span v-if="mode === 'bars'" class="mast-pct" :style="{ color: colourFor(type.value) }">
            {{ type.value }}%
          </span>
          <span v-else class="mflag" :class="type.value >= learnedAt ? 'ok' : 'no'">
            {{ type.value >= learnedAt ? '✓' : '✕' }}
          </span>
        </div>
      </div>
      <div class="modal-actions" style="margin-top: 16px">
        <button class="btn btn-primary" @click="$emit('close')">Yopish</button>
      </div>
    </div>
  </div>
</template>
