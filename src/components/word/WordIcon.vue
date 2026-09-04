<script setup>
/**
 * The picture that stands for a word everywhere in the app.
 *
 * Preference order is the 3D library icon, then the emoji stand-in, then the
 * word's first letter. Every list row and tile used to re-implement this
 * chain by hand with a different fallback each time; they now share it.
 * `large` asks for the 512px rendering — only worth it above ~64px.
 */
import { computed } from 'vue'

const props = defineProps({
  word: { type: Object, required: true },
  size: { type: Number, default: 38 },
  large: { type: Boolean, default: false },
})

const src = computed(() =>
  props.large ? props.word.icon_large || props.word.icon || null : props.word.icon || null,
)

const emoji = computed(() => props.word.emoji || null)
const letter = computed(() => (props.word.en || props.word.word || '?').charAt(0).toLowerCase())
</script>

<template>
  <span class="w-ic" :class="{ 'has-img': src }" :style="{ '--s': size + 'px' }">
    <img v-if="src" :src="src" alt="" draggable="false" loading="lazy" />
    <span v-else-if="emoji" class="w-ic-em">{{ emoji }}</span>
    <span v-else class="w-ic-letter">{{ letter }}</span>
  </span>
</template>

<style scoped>
.w-ic {
  width: var(--s);
  height: var(--s);
  border-radius: calc(var(--s) * 0.32);
  background: var(--wash-2);
  color: var(--muted);
  display: grid;
  place-items: center;
  flex: none;
  overflow: hidden;
}

/* a 3D render sits on a white plate so its shading reads on any wash */
.w-ic.has-img {
  background: var(--card);
  border: 1px solid var(--line);
}

.w-ic img {
  width: 84%;
  height: 84%;
  object-fit: contain;
  pointer-events: none;
}

.w-ic-em {
  font-size: calc(var(--s) * 0.55);
  line-height: 1;
}

.w-ic-letter {
  font-family: 'Sora', sans-serif;
  font-size: calc(var(--s) * 0.37);
  font-weight: 700;
}
</style>
