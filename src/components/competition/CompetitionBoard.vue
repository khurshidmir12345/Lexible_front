<script setup>
import { computed } from 'vue'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  board: Object,
  /** A student sees their own row highlighted and no "run it again". */
  meId: { type: Number, default: null },
})

const emit = defineEmits(['close', 'again'])

/** Second, first, third — the podium reads outward from the winner. */
const podium = computed(() => {
  const [first, second, third] = props.board?.podium ?? []
  return [
    { place: 2, player: second },
    { place: 1, player: first },
    { place: 3, player: third },
  ].filter((slot) => slot.player)
})

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

/** Classmates may still be answering — the podium is provisional until then. */
const live = computed(() => props.board?.status !== 'finished')

function share() {
  const board = props.board
  const winner = board?.podium?.[0]
  if (!winner) return

  telegram.share('', `«${board.group}» ${board.stage}-bosqich musobaqasi — gʼolib ${winner.name} (${winner.score}/${winner.total})`)
}
</script>

<template>
  <div class="cb">
    <header class="cb-head">
      <h1>{{ live ? 'Natijalar toʼplanmoqda' : 'Musobaqa yakunlandi' }}</h1>
      <p>{{ board.stage }}-bosqich · {{ board.questions }} savol · {{ board.participants }} ishtirokchi</p>
    </header>

    <div class="cb-scroll">
      <section v-if="podium.length" class="cb-podium">
        <div v-for="slot in podium" :key="slot.place" class="cb-slot" :class="`p${slot.place}`">
          <span class="cb-medal">{{ MEDALS[slot.place] }}</span>
          <span class="cb-avatar">
            <img v-if="slot.player.avatar" :src="slot.player.avatar" alt="" />
            <template v-else>{{ slot.player.name.charAt(0) }}</template>
          </span>
          <b class="cb-name">{{ slot.player.name }}</b>
          <span class="cb-score">{{ slot.player.score }} toʼgʼri · {{ slot.player.accuracy }}%</span>
          <div class="cb-block"><b class="v-num">{{ slot.place }}</b></div>
        </div>
      </section>

      <section class="cb-rows">
        <div
          v-for="row in board.standings"
          :key="row.id"
          class="cb-row"
          :class="{ me: meId === row.id, dnf: !row.finished }"
        >
          <b class="cb-rank v-num">{{ row.rank }}</b>
          <span class="cb-avatar sm">
            <img v-if="row.avatar" :src="row.avatar" alt="" />
            <template v-else>{{ row.name.charAt(0) }}</template>
          </span>
          <div class="cb-who">
            <b>{{ row.name }}</b>
            <span v-if="row.finished">{{ row.score }} toʼgʼri · {{ row.duration }} · {{ row.accuracy }}%</span>
            <span v-else>Tugatmadi</span>
          </div>
        </div>
      </section>
    </div>

    <div class="cb-foot">
      <button class="btn ghost" @click="share">Ulashish</button>
      <button class="btn btn-primary" @click="emit('again')">
        {{ meId ? 'Yopish' : 'Yana oʼtkazish' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.cb {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
}

.cb-head {
  padding: 22px 18px 16px;
  text-align: center;
  background: var(--card);
  border-bottom: 1px solid var(--line);
}

.cb-head h1 {
  font-family: 'Sora', sans-serif;
  font-size: 20px;
  font-weight: 700;
}

.cb-head p {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 4px;
}

.cb-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 22px 18px;
}

.cb-podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 10px;
  margin-bottom: 26px;
}

.cb-slot {
  flex: 1;
  max-width: 116px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.cb-medal {
  font-size: 20px;
}

.cb-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--tint);
  display: grid;
  place-items: center;
  font-size: 19px;
  font-weight: 800;
  color: var(--brand);
  overflow: hidden;
  margin: 6px 0 8px;
}

.cb-avatar.sm {
  width: 34px;
  height: 34px;
  font-size: 13px;
  margin: 0;
  flex-shrink: 0;
}

.cb-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cb-slot.p1 .cb-avatar {
  width: 64px;
  height: 64px;
  font-size: 23px;
  box-shadow: 0 0 0 3px var(--gold);
}

.cb-name {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.cb-score {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 3px;
  line-height: 1.3;
}

.cb-block {
  width: 100%;
  margin-top: 10px;
  border-radius: var(--r-md) var(--r-md) 0 0;
  background: var(--tint);
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 800;
  color: var(--muted);
}

.cb-slot.p1 .cb-block {
  height: 76px;
  background: var(--gold);
  color: var(--gold-ink);
}

.cb-slot.p2 .cb-block { height: 56px; }
.cb-slot.p3 .cb-block { height: 42px; }

.cb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: var(--r-md);
  background: var(--card);
  border: 1px solid var(--line);
  margin-bottom: 8px;
}

.cb-row.me {
  border-color: var(--brand);
  background: var(--tint);
}

.cb-row.dnf {
  opacity: .6;
}

.cb-rank {
  width: 22px;
  font-size: 14px;
  font-weight: 800;
  color: var(--muted);
  text-align: center;
  flex-shrink: 0;
}

.cb-who b {
  display: block;
  font-size: 13.5px;
  font-weight: 700;
}

.cb-who span {
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.cb-foot {
  display: flex;
  gap: 10px;
  padding: 14px 18px calc(18px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: var(--card);
}

.cb-foot .btn {
  flex: 1;
}
</style>
