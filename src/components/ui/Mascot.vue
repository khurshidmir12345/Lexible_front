<script setup>
defineProps({ celebrating: { type: Boolean, default: false } })
</script>

<template>
  <svg class="mascot" :class="{ pop: celebrating }" viewBox="0 0 120 120">
    <rect x="14" y="14" width="92" height="92" rx="24" fill="#37c26a" />
    <rect x="14" y="14" width="92" height="92" rx="24" fill="none" stroke="#2aa056" stroke-width="5" />
    <circle cx="45" :cy="celebrating ? 54 : 56" r="11" fill="#fff" />
    <circle cx="75" :cy="celebrating ? 54 : 56" r="11" fill="#fff" />
    <circle :cx="celebrating ? 46 : 48" :cy="celebrating ? 56 : 58" r="5" fill="#1d2a22" />
    <circle :cx="celebrating ? 76 : 78" :cy="celebrating ? 56 : 58" r="5" fill="#1d2a22" />
    <path
      :d="celebrating ? 'M43 74 Q60 90 77 74' : 'M44 78 Q60 92 76 78'"
      stroke="#1d2a22" stroke-width="5" fill="none" stroke-linecap="round"
    />
    <path v-if="celebrating" d="M22 30 l4 8 M98 30 l-4 8" stroke="#ffc53d" stroke-width="4" stroke-linecap="round" />
  </svg>
</template>
