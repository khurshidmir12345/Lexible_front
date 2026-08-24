<script setup>
defineProps({
  open: Boolean,
  title: String,
  text: String,
})
</script>

<template>
  <div class="modal" :class="{ show: open }">
    <div class="modal-card">
      <h2 v-if="title">{{ title }}</h2>
      <p v-if="text">{{ text }}</p>
      <slot />
      <div v-if="$slots.actions" class="modal-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
