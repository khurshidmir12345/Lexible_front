<script setup>
import { computed } from 'vue'
import { RowIcon } from '../../lib/icons2'
import { store } from '../../lib/store'

const user = computed(() => store.state.user)

async function becomeStudent() {
  try {
    await store.setRole('student')
    store.toast('Oʼquvchi rejimiga oʼtdingiz')
  } catch (error) {
    store.toast(error.message)
  }
}
</script>

<template>
  <template v-if="user">
    <div class="who">
      <img v-if="user.photo" class="avatar" :src="user.photo" alt="" />
      <div v-else class="avatar">{{ user.initial }}</div>
      <div style="flex: 1">
        <div class="name">{{ user.name }}</div>
        <div class="handle">{{ user.username ? '@' + user.username : 'Telegram hisobi' }}</div>
      </div>
      <span class="chip">USTOZ</span>
    </div>

    <div class="section">SOZLAMALAR</div>

    <div class="rows">
      <button class="v-row" @click="becomeStudent">
        <span class="row-ic" v-html="RowIcon.book"></span>
        <span class="row-t">Oʼquvchi rejimiga oʼtish</span>
        <span class="row-c" v-html="RowIcon.chevron"></span>
      </button>
    </div>

    <p class="note">
      Oʼquvchi rejimida oʼzingiz ham soʼz yodlaysiz. Yoʼl va guruhlaringiz saqlanib qoladi.
    </p>
  </template>
</template>

<style scoped>
.who {
  display: flex; align-items: center; gap: 14px;
  background: var(--card); border: 1px solid var(--line);
  border-radius: var(--r-lg); padding: 16px;
}

.avatar {
  width: 52px; height: 52px; border-radius: var(--r-lg);
  background: var(--green-soft); color: var(--green-dark);
  display: grid; place-items: center;
  font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700;
  object-fit: cover; flex: none;
}

.name { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700; }
.handle { font-size: 12.5px; font-weight: 600; color: var(--muted); margin-top: 2px; }

.chip {
  background: var(--ink); color: #fff; border-radius: var(--r-sm);
  padding: 5px 9px; font-family: 'Sora', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: 1px;
}

.section {
  font-size: 10.5px; font-weight: 800; letter-spacing: 1px;
  color: var(--faint); margin: 8px 0 -2px 4px;
}

.rows {
  background: var(--card); border: 1px solid var(--line);
  border-radius: var(--r-lg); overflow: hidden;
}

.v-row {
  width: 100%; display: flex; align-items: center; gap: 13px;
  padding: 14px 16px; background: none; border: none;
  font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 700;
  color: var(--ink); cursor: pointer; text-align: left;
}

.row-ic {
  width: 34px; height: 34px; border-radius: var(--r-md);
  background: var(--wash-2); color: var(--ink);
  display: grid; place-items: center; flex: none;
}

.row-t { flex: 1; }
.row-c { color: var(--faint); display: grid; place-items: center; }

.note {
  font-size: 12px; font-weight: 600; color: var(--faint);
  text-align: center; padding: 0 10px;
}
</style>
