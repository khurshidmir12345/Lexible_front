<script setup>
import { store } from '../../lib/store'
</script>

<template>
  <div class="toast" :class="{ show: store.state.toast }">{{ store.state.toast }}</div>
</template>
