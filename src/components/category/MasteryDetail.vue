<script setup>
import { computed } from 'vue'
import { ExerciseIcon } from '../../lib/icons2'
import { languageShort } from '../../lib/languages'
import { store } from '../../lib/store'

const props = defineProps({
  open: Boolean,
  title: String,
  subtitle: String,
  mastery: { type: Object, default: () => ({}) },
  /** Per-type verdicts: `correct`, `wrong`, or null for a type never played. */
  states: { type: Object, default: null },
  /** `flags` marks each exercise pass/fail, `bars` shows how far along it is. */
  mode: { type: String, default: 'bars' },
})

defineEmits(['close'])

const learnedAt = window.LEXIBLE?.mastery?.learned_at ?? 70
const midAt = window.LEXIBLE?.mastery?.mid_at ?? 40

const NAMES = {
  card: 'Karta',
  uz2en: 'Test · {lang} → ing',
  en2uz: 'Test · ing → {lang}',
  spell: 'Imlo',
  image: 'Rasm',
  match: 'Juftlash',
}

const rows = computed(() =>
  Object.entries(NAMES).map(([key, label]) => ({
    key,
    label: label.replace('{lang}', languageShort(store.state.user?.native_lang)),
    icon: ExerciseIcon[key],
    value: props.mastery[key] ?? 0,
    // The last answer decides; without the states object (older payloads)
    // the stored score stands in for it.
    state: props.states
      ? props.states[key] ?? 'none'
      : (props.mastery[key] ?? 0) >= learnedAt ? 'correct' : 'wrong',
  })),
)

const colourFor = (value) =>
  value >= learnedAt ? 'var(--green)' : value >= midAt ? 'var(--gold)' : 'var(--red)'
</script>

<template>
  <div class="dialog-wrap" :class="{ open }">
    <div class="dialog">
      <div class="dialog-head">
        <span class="dialog-title">{{ title }}</span>
      </div>
      <p class="dialog-sub">{{ subtitle }}</p>

      <div class="rows">
        <div v-for="row in rows" :key="row.key" class="m-row">
          <span class="m-ic" :style="{ background: row.icon.bg, color: row.icon.color }" v-html="row.icon.svg"></span>
          <span class="m-label">{{ row.label }}</span>

          <span v-if="mode === 'bars'" class="m-pct" :style="{ color: colourFor(row.value) }">
            {{ row.value }}%
          </span>
          <template v-else>
            <span v-if="row.state === 'none'" class="m-skip">oʼynalmagan</span>
            <span class="m-flag" :class="row.state">
              <svg v-if="row.state === 'correct'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 13l5 5L20 7" />
              </svg>
              <svg v-else-if="row.state === 'wrong'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
              <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                <path d="M5 12h14" />
              </svg>
            </span>
          </template>
        </div>
      </div>

      <button class="btn btn-primary" style="margin-top: 18px" @click="$emit('close')">Yopish</button>
    </div>
  </div>
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

.dialog-title {
  font-family: 'Sora', sans-serif;
  font-size: 20px;
  font-weight: 700;
}

.dialog-sub {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 4px;
}

.rows {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}

.m-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 2px;
  border-bottom: 1px solid var(--wash);
}

.m-row:last-child {
  border-bottom: none;
}

.m-ic {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.m-label {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
}

.m-pct {
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
}

.m-flag {
  width: 24px;
  height: 24px;
  border-radius: var(--r-pill);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.m-flag.correct {
  background: #22B15F;
}

.m-flag.wrong {
  background: var(--red);
}

.m-flag.none {
  background: var(--wash-2);
  color: var(--faint);
}

.m-skip {
  font-size: 11px;
  font-weight: 700;
  color: var(--faint);
}
</style>
