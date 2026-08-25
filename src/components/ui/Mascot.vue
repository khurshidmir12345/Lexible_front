<script setup>
defineProps({ celebrating: { type: Boolean, default: false } })
</script>

<template>
  <svg class="mascot" :class="{ pop: celebrating }" viewBox="0 0 120 120">
    <rect x="14" y="14" width="92" height="92" rx="26" fill="#17A45C" />
    <circle cx="45" :cy="celebrating ? 54 : 56" r="11" fill="#fff" />
    <circle cx="75" :cy="celebrating ? 54 : 56" r="11" fill="#fff" />
    <circle :cx="celebrating ? 46 : 48" :cy="celebrating ? 56 : 58" r="5" fill="#16201A" />
    <circle :cx="celebrating ? 76 : 78" :cy="celebrating ? 56 : 58" r="5" fill="#16201A" />
    <path
      :d="celebrating ? 'M43 74 Q60 90 77 74' : 'M44 78 Q60 92 76 78'"
      stroke="#16201A" stroke-width="5" fill="none" stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.mascot {
  width: 118px;
  height: 118px;
  display: block;
  margin: 0 auto;
  animation: bob 3.4s ease-in-out infinite;
}

@keyframes bob {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-10px) rotate(1.5deg); }
}

.pop {
  animation: pop .5s ease;
}

@keyframes pop {
  0% { transform: scale(.6); opacity: 0; }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
