<script setup>
import { computed } from 'vue'
import { telegram } from '../../lib/telegram'

const props = defineProps({ duel: Object })
const emit = defineEmits(['close', 'rematch'])

/** My side is in; the rival's is not — no verdict yet. */
const pending = computed(() => props.duel?.status !== 'finished')

const outcome = computed(() => {
  if (pending.value) {
    return { emoji: '⏳', title: 'Kutilmoqda…', tint: 'draw' }
  }
  if (props.duel?.winner === 'me') {
    return { emoji: '🏆', title: 'Gʼalaba!', tint: 'win' }
  }
  if (props.duel?.winner === 'rival') {
    return { emoji: '😔', title: 'Magʼlubiyat', tint: 'loss' }
  }
  return { emoji: '🤝', title: 'Durrang', tint: 'draw' }
})

const subtitle = computed(() => {
  const rival = props.duel?.rival?.name ?? 'Doʼst'
  if (pending.value) {
    const side = props.duel?.rival
    return side?.started
      ? `${rival} hali javob bermoqda — ${side.answered}/${side.total}`
      : `${rival} hali boshlamadi`
  }
  if (props.duel?.winner === 'me') return `${rival} ustidan gʼalaba qozondingiz`
  if (props.duel?.winner === 'rival') return `${rival} bu safar tezroq boʼldi`
  return 'Ball ham, vaqt ham teng'
})

function share() {
  const me = props.duel?.me?.score ?? 0
  const rival = props.duel?.rival?.score ?? 0
  telegram.share(props.duel?.invite_link ?? '', `Duel natijasi: ${me} — ${rival}`)
}
</script>

<template>
  <div class="overlay show res">
    <div class="res-body">
      <div class="crown" :class="outcome.tint">{{ outcome.emoji }}</div>

      <h2 class="res-title">{{ outcome.title }}</h2>
      <p class="res-sub">{{ subtitle }}</p>

      <div class="score">
        <div class="side">
          <span class="av me">{{ duel?.me?.initial }}</span>
          <b class="v-num">{{ duel?.me?.score ?? 0 }}</b>
          <i>Siz</i>
        </div>
        <span class="dash">—</span>
        <div class="side">
          <span class="av rival">{{ duel?.rival?.initial ?? '?' }}</span>
          <b class="v-num">{{ duel?.rival?.score ?? 0 }}</b>
          <i>{{ duel?.rival?.name ?? 'Doʼst' }}</i>
        </div>
      </div>

      <div v-if="duel?.winner === 'me'" class="reward">+{{ duel.reward }} tanga</div>
      <div v-else-if="pending" class="reward soft">Natija raqib tugagach chiqadi</div>
    </div>

    <div class="res-foot">
      <button class="btn btn-soft" @click="share">Ulashish</button>
      <button class="btn btn-primary" @click="$emit('close')">Yopish</button>
    </div>
  </div>
</template>

<style scoped>
.res { background: var(--card); z-index: 26; }

.res-body {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 14px; padding: 30px 26px; text-align: center;
}

.crown {
  width: 96px; height: 96px; border-radius: var(--r-pill);
  display: grid; place-items: center; font-size: 44px;
}

.crown.win { background: #FBF3DE; }
.crown.loss { background: var(--red-soft); }
.crown.draw { background: var(--wash-2); }

.res-title { font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; }
.res-sub { font-size: 13.5px; font-weight: 600; color: var(--muted); }

.score {
  display: flex; align-items: center; justify-content: center;
  gap: 20px; margin-top: 10px;
}

.side { display: flex; flex-direction: column; align-items: center; gap: 6px; }

.av {
  width: 54px; height: 54px; border-radius: var(--r-pill);
  display: grid; place-items: center; color: #fff;
  font-family: 'Sora', sans-serif; font-size: 21px; font-weight: 700;
}

.av.me { background: var(--green); }
.av.rival { background: #2E7CF6; }

.side b { font-size: 26px; }
.side i { font-style: normal; font-size: 12px; font-weight: 600; color: var(--muted); }

.dash { font-family: 'Sora', sans-serif; font-size: 20px; color: var(--faint); }

.reward {
  background: var(--green-soft); color: var(--green-dark);
  border-radius: var(--r-pill); padding: 7px 16px;
  font-size: 13px; font-weight: 800;
}

.reward.soft { background: var(--wash-2); color: var(--muted); }

.res-foot {
  display: flex; gap: 10px;
  padding: 16px 22px 30px;
}

.res-foot .btn { flex: 1; }
</style>
