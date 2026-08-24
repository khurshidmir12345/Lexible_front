<script setup>
import { computed, ref } from 'vue'
import { TEST_TYPES } from '../../lib/icons'
import { languageShort } from '../../lib/languages'
import { store } from '../../lib/store'

defineProps({ open: Boolean })
const emit = defineEmits(['close', 'start', 'duel'])

// Everything on by default — the prototype starts with all six selected.
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

const selectedKeys = computed(() => TEST_TYPES.filter((t) => chosen.value.has(t.key)).map((t) => t.key))
</script>

<template>
  <div class="modal" :class="{ show: open }">
    <div class="modal-card" style="max-height: 84%; overflow-y: auto">
      <h2>Qaysi testlar boʼlsin?</h2>
      <p>Istalmaganini oʼchiring, soʼng boshlang.</p>

      <div class="tt-list">
        <div
          v-for="type in types"
          :key="type.key"
          class="tt-item"
          :class="{ on: chosen.has(type.key) }"
          @click="toggle(type.key)"
        >
          <div class="tt-ic" :style="{ background: type.bg, color: type.color }" v-html="type.icon"></div>
          <div class="tt-tx"><b>{{ type.label }}</b><span>{{ type.desc }}</span></div>
          <div class="tt-check">{{ chosen.has(type.key) ? '✓' : '' }}</div>
        </div>
      </div>

      <div style="border-top: 1px solid var(--line); margin-top: 14px; padding-top: 13px">
        <button
          class="btn btn-blue btn-duel"
          :disabled="!selectedKeys.length"
          @click="emit('duel', selectedKeys)"
        >
          ⚔️ Doʼstni duelga chaqirish
        </button>
        <div class="modal-actions" style="margin-top: 9px">
          <button class="btn btn-soft" @click="$emit('close')">Bekor</button>
          <button
            class="btn btn-primary"
            :disabled="!selectedKeys.length"
            @click="emit('start', selectedKeys)"
          >
            Boshlash
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
