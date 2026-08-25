<script setup>
import { onMounted, ref } from 'vue'
import { WEEKDAYS } from '../../lib/languages'
import { api } from '../../lib/api'
import { store } from '../../lib/store'

const emit = defineEmits(['open-groups'])

const data = ref(null)

onMounted(async () => {
  try {
    data.value = await api.teacher.dashboard()
  } catch (error) {
    store.toast(error.message)
  }
})

const peak = (week) => Math.max(...(week ?? [0]), 1)
</script>

<template>
  <div v-if="data" class="scroll">
    <div class="tiles">
      <div class="tile-plain">
        <b class="v-num">{{ data.students }}</b>
        <i>Oʼquvchi · {{ data.groups }} guruh</i>
      </div>
      <div class="tile-plain green">
        <b class="v-num">{{ data.active_today }}</b>
        <i>Bugun faol</i>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <span>Guruhlar faolligi · hafta</span>
        <b class="v-num">{{ data.week_total }} test</b>
      </div>
      <div class="bars">
        <div
          v-for="(value, index) in data.week"
          :key="index"
          :style="{ height: `${Math.max((value / peak(data.week)) * 52, 4)}px` }"
        ></div>
      </div>
      <div class="bar-labels">
        <span v-for="day in WEEKDAYS" :key="day">{{ day }}</span>
      </div>
    </div>

    <button v-if="data.pending" class="pending" @click="emit('open-groups')">
      <span class="pending-dot">{{ data.pending }}</span>
      <span>ta qoʼshilish soʼrovi kutmoqda</span>
      <b>Koʼrish</b>
    </button>

    <template v-if="data.top_groups.length">
      <div class="section">ENG FAOL GURUH</div>
      <div class="panel groups">
        <div v-for="group in data.top_groups" :key="group.id" class="group-row">
          <span class="badge">{{ group.badge }}</span>
          <span class="group-text">
            <b>{{ group.title }}</b>
            <i>{{ group.members }} oʼquvchi</i>
          </span>
          <span class="score">{{ group.score }}%</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tiles { display: flex; gap: 12px; }

.tile-plain {
  flex: 1; background: var(--card); border: 1px solid var(--line);
  border-radius: var(--r-lg); padding: 14px 16px;
}

.tile-plain.green { background: var(--green-soft); border-color: var(--green-pale); }

.tile-plain b { display: block; font-size: 24px; }
.tile-plain i { display: block; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--muted); margin-top: 2px; }

.panel-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 14px; font-size: 13.5px; font-weight: 700;
}

.panel-head b { font-size: 13.5px; color: var(--green); }

.bars { display: flex; align-items: flex-end; gap: 9px; height: 52px; }
.bars > div { flex: 1; border-radius: 5px; background: var(--green-bar); }

.bar-labels { display: flex; gap: 9px; margin-top: 7px; }
.bar-labels span { flex: 1; text-align: center; font-size: 9.5px; font-weight: 700; color: var(--faint); }

.pending {
  display: flex; align-items: center; gap: 11px;
  background: #FFF6E3; border: 1px solid #F5E3B8; border-radius: 14px;
  padding: 13px 15px; cursor: pointer; font-family: 'Manrope', sans-serif;
  font-size: 13px; font-weight: 700; color: var(--gold); text-align: left;
}

.pending-dot {
  width: 26px; height: 26px; border-radius: var(--r-pill);
  background: var(--gold); color: #fff; display: grid; place-items: center;
  font-size: 13px; font-weight: 800; flex-shrink: 0;
}

.pending span:nth-child(2) { flex: 1; }
.pending b { color: var(--ink); }

.section {
  font-size: 10.5px; font-weight: 800; letter-spacing: 1px;
  color: var(--faint); margin: 8px 0 -2px 4px;
}

.groups { padding: 0; overflow: hidden; }

.group-row {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 16px; border-bottom: 1px solid var(--wash);
}

.group-row:last-child { border-bottom: none; }

.badge {
  width: 38px; height: 38px; border-radius: 12px;
  background: var(--wash-2); color: var(--muted);
  display: grid; place-items: center;
  font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
  flex-shrink: 0;
}

.group-text { flex: 1; }
.group-text b { display: block; font-size: 14.5px; font-weight: 800; }
.group-text i { display: block; font-style: normal; font-size: 12px; font-weight: 600; color: var(--faint); }

.score { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700; color: var(--green); }
</style>
