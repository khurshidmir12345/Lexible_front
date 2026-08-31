<script setup>
defineProps({
  open: Boolean,
  title: String,
  text: String,
})
</script>

<template>
  <div class="sheet-wrap" :class="{ open }">
    <div class="sheet-card">
      <span class="grabber"></span>
      <h2 v-if="title">{{ title }}</h2>
      <p v-if="text">{{ text }}</p>
      <slot />
      <div v-if="$slots.actions" class="sheet-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* v2 dialogs rise from the bottom rather than sitting in the middle. */
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
  padding: 12px 22px calc(28px + var(--lx-foot));
  transform: translateY(16px);
  transition: transform .22s;
  max-height: 88%;
  overflow-y: auto;
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

.sheet-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.sheet-actions :deep(.btn) {
  flex: 1;
}
</style>
