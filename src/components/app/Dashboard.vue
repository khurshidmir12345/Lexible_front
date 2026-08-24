<script setup>
import { computed } from 'vue'
import { Ic } from '../../lib/icons'
import { WEEKDAYS } from '../../lib/languages'
import { store } from '../../lib/store'

const data = computed(() => store.state.dashboard)

// Bars are drawn relative to the busiest day, with a floor so an empty day is
// still a visible stub rather than nothing at all.
const peak = computed(() => Math.max(...(data.value?.week ?? [0]), 1))

function barHeight(value) {
  return `${Math.max((value / peak.value) * 78, 5)}px`
}

/** Monday is index 0 in the API response; highlight whichever day today is. */
const todayIndex = computed(() => (new Date().getDay() + 6) % 7)
</script>

<template>
  <div v-if="data">
    <div class="hello">Salom, {{ data.name }}! 👋</div>

    <div class="streak">
      <div class="flame">🔥</div>
      <div>
        <div class="sbig">{{ data.streak_days }} kun</div>
        <div class="ssub">
          {{ data.streak_days > 0 ? "ketma-ket yodlayapsiz — zoʼr sur'at!" : 'bugun boshlang — seriya shu yerdan boshlanadi' }}
        </div>
      </div>
    </div>

    <div class="dcard">
      <div class="drow"><b>Bu hafta</b><span>{{ data.week_total }} soʼz</span></div>
      <div class="wk">
        <div class="wk-bars">
          <div v-for="(value, index) in data.week" :key="index" class="col">
            <span class="v">{{ value }}</span>
            <div class="bar" :class="{ today: index === todayIndex }" :style="{ height: barHeight(value) }"></div>
          </div>
        </div>
        <div class="wk-days"><span v-for="day in WEEKDAYS" :key="day">{{ day }}</span></div>
      </div>
    </div>

    <div class="dgrid">
      <div class="stat">
        <div class="ic-lg" v-html="Ic.book"></div>
        <div class="big">{{ data.words_learned }}</div>
        <div class="lbl">Jami yodlangan soʼz</div>
      </div>
      <div class="stat">
        <div class="ic-lg" style="background: #eaf3fd; color: var(--blue)" v-html="Ic.cal"></div>
        <div class="big">{{ data.month_total }}</div>
        <div class="lbl">Bu oy</div>
      </div>
    </div>

    <div v-if="data.week_total > 0" class="dcard proj">
      <div class="ic-lg" style="background: #eaf3fd; color: var(--blue)" v-html="Ic.trend"></div>
      <div>
        <div class="sbig" style="color: var(--blue-d)">≈ {{ data.projection_90d }} soʼz</div>
        <div class="ssub">shu sur'atda 3 oydan keyin yodlab boʼlasiz</div>
      </div>
    </div>

    <div class="dcard">
      <div class="drow">
        <b>Doʼstlar bilan duel</b>
        <span>{{ data.duel.win_rate }}% gʼalaba</span>
      </div>
      <div class="duelrow">
        <div class="duelhalf win">
          <span v-html="Ic.trophy"></span>
          <div><b>{{ data.duel.wins }}</b><span>gʼalaba</span></div>
        </div>
        <div class="duelhalf loss">
          <span v-html="Ic.flag"></span>
          <div><b>{{ data.duel.losses }}</b><span>magʼlubiyat</span></div>
        </div>
      </div>
    </div>
  </div>
</template>
