<script setup>
import { computed, ref } from 'vue'
import { TEST_TYPES } from '../../lib/icons'
import { languageShort } from '../../lib/languages'
import { store } from '../../lib/store'

defineProps({ open: Boolean })
const emit = defineEmits(['close', 'start', 'duel'])

// All six on by default, the way the artboard shows it.
const chosen = ref(new Set(TEST_TYPES.map((t) => t.key)))

const types = computed(() =>
  TEST_TYPES.map((type) => ({
    ...type,
    label: type.name.replace('{lang}', languageShort(store.state.user?.native_lang)),
  })),
)

function toggle(key) {
  chosen.value.has(key) ? chosen.value.delete(key) : chosen.value.add(key)
  chosen.value = new Set(chosen.value)
}

const selectedKeys = computed(() =>
  TEST_TYPES.filter((t) => chosen.value.has(t.key)).map((t) => t.key),
)
</script>

<template>
  <div class="sheet-wrap" :class="{ open }">
    <div class="sheet-card">
      <span class="grabber"></span>
      <h2>Qaysi testlar boʼlsin?</h2>
      <p>Istalmaganini oʼchiring, soʼng boshlang.</p>

      <div class="type-list">
        <button
          v-for="type in types"
          :key="type.key"
          class="type"
          :class="{ pick: chosen.has(type.key) }"
          @click="toggle(type.key)"
        >
          <span class="type-ic" :style="{ background: type.bg, color: type.color }" v-html="type.icon"></span>
          <span class="type-text">
            <b>{{ type.label }}</b>
            <i>{{ type.desc }}</i>
          </span>
          <span class="check">{{ chosen.has(type.key) ? '✓' : '' }}</span>
        </button>
      </div>

      <button class="btn duel" :disabled="!selectedKeys.length" @click="emit('duel', selectedKeys)">
        ⚔️ Doʼstni duelga chaqirish
      </button>

      <div class="sheet-actions">
        <button class="btn btn-soft" @click="$emit('close')">Bekor</button>
        <button class="btn btn-primary" :disabled="!selectedKeys.length" @click="emit('start', selectedKeys)">
          Boshlash
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sheet-wrap {
  position: absolute;
  inset: 0;
  background: rgba(22, 32, 26, .45);
  display: flex;
  align-items: flex-end;
  opacity: 0;
  pointer-events: none;
  transition: opacity .2s;
  z-index: 30;
}

.sheet-wrap.open {
  opacity: 1;
  pointer-events: auto;
}

.sheet-card {
  width: 100%;
  background: var(--card);
  border-radius: 24px 24px 0 0;
  padding: 12px 22px 28px;
  max-height: 90%;
  overflow-y: auto;
  transform: translateY(16px);
  transition: transform .22s;
}

.sheet-wrap.open .sheet-card {
  transform: translateY(0);
}

.grabber {
  display: block;
  width: 38px;
  height: 4px;
  border-radius: var(--r-pill);
  background: var(--line);
  margin: 0 auto 16px;
}

h2 {
  font-family: 'Sora', sans-serif;
  font-size: 19px;
  font-weight: 700;
}

p {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 6px;
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0;
}

.type {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 11px 13px;
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
}

.type.pick {
  border-color: var(--green);
  background: var(--wash-3);
}

.type-ic {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.type-ic :deep(svg) {
  width: 19px;
  height: 19px;
}

.type-text {
  flex: 1;
}

.type-text b {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.type-text i {
  display: block;
  font-style: normal;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--faint);
}

.check {
  width: 24px;
  height: 24px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--line-4);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.type.pick .check {
  background: var(--green);
  border-color: var(--green);
}

.duel {
  background: var(--wash-2);
  color: var(--ink);
  border: 1px solid var(--line);
}

.sheet-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.sheet-actions .btn {
  flex: 1;
}
</style>
