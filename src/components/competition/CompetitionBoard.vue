<script setup>
/**
 * UT-07 «Musobaqa yakuni» — podium first, then the rest of the field.
 *
 * Shown to both sides: the teacher gets "Yana oʼtkazish", a student gets a
 * highlighted row and a plain close.
 */
import { computed } from 'vue'
import { TeacherIcon } from '../../lib/icons2'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  board: { type: Object, required: true },
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

/** Everyone who did not make the podium. */
const rest = computed(() => (props.board?.standings ?? []).slice(3))

/** Classmates may still be answering — the podium is provisional until then. */
const live = computed(() => props.board?.status !== 'finished')

function share() {
  const winner = props.board?.podium?.[0]
  if (!winner) return

  telegram.share(
    '',
    `«${props.board.group}» ${props.board.stage}-bosqich musobaqasi — ` +
    `gʼolib ${winner.name} (${winner.score}/${winner.total})`,
  )
}
</script>

<template>
  <div class="cb">
    <header class="cb-head">
      <span class="cup" v-html="TeacherIcon.trophy"></span>
      <h1>{{ live ? 'Natijalar toʼplanmoqda' : 'Musobaqa yakunlandi' }}</h1>
      <p>
        <template v-if="board.stage">{{ board.stage }}-bosqich · </template>
        {{ board.questions }} savol · {{ board.participants }} ishtirokchi
      </p>
    </header>

    <div class="cb-body">
      <section v-if="podium.length" class="podium">
        <div v-for="slot in podium" :key="slot.place" class="slot" :class="`p${slot.place}`">
          <span v-if="slot.place === 1" class="wreath" v-html="TeacherIcon.wreath"></span>
          <span class="face">
            <img v-if="slot.player.avatar" :src="slot.player.avatar" alt="" />
            <template v-else>{{ slot.player.name.charAt(0) }}</template>
          </span>
          <b class="who">{{ slot.player.name.split(' ')[0] }}</b>
          <i class="score">{{ slot.player.score }} toʼgʼri · {{ slot.player.accuracy }}%</i>
          <span class="block v-num">{{ slot.place }}</span>
        </div>
      </section>

      <div
        v-for="row in rest"
        :key="row.id"
        class="row"
        :class="{ me: meId === row.id, dnf: !row.finished }"
      >
        <b class="rank v-num">{{ row.rank }}</b>
        <span class="t-avatar">
          <img v-if="row.avatar" :src="row.avatar" alt="" />
          <template v-else>{{ row.name.charAt(0) }}</template>
        </span>
        <span class="t-row-text">
          <b>{{ row.name }}</b>
          <i v-if="row.finished">{{ row.score }} toʼgʼri · {{ row.duration }}</i>
          <i v-else>Tugatmadi</i>
        </span>
        <b class="pct v-num">{{ row.finished ? `${row.accuracy}%` : '—' }}</b>
      </div>

      <p v-if="!podium.length" class="t-loading">Hali natija yoʼq.</p>
    </div>

    <div class="t-foot">
      <button class="btn btn-outline" @click="share">Ulashish</button>
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
  background: var(--canvas);
}

.cb-head { padding: 30px 22px 0; text-align: center; flex: none; }

.cup {
  width: 76px;
  height: 76px;
  border-radius: var(--r-pill);
  background: var(--gold-soft);
  color: var(--gold);
  display: grid;
  place-items: center;
  margin: 0 auto;
}

.cb-head h1 { font-family: 'Sora', sans-serif; font-size: 23px; font-weight: 700; margin-top: 12px; }
.cb-head p { font-size: 13px; font-weight: 600; color: var(--muted); margin-top: 5px; }

.cb-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.cb-body > * { flex: none; }

/* ----------------------------------------------------------------- podium */

.podium { display: flex; align-items: flex-end; gap: 10px; padding: 2px 4px 6px; }

.slot { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.slot.p1 { flex: 1.08; }

.wreath { color: var(--gold-mid); display: grid; place-items: center; }

.face {
  width: 44px;
  height: 44px;
  border-radius: var(--r-pill);
  background: var(--blue-soft);
  color: var(--blue);
  display: grid;
  place-items: center;
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
}

.face img { width: 100%; height: 100%; object-fit: cover; }

.slot.p1 .face {
  width: 52px;
  height: 52px;
  font-size: 19px;
  background: var(--green-soft);
  color: var(--green-dark);
  border: 2.5px solid var(--gold-mid);
}

.slot.p3 .face { background: var(--violet-soft); color: var(--violet); }

.who { font-size: 12.5px; font-weight: 800; }
.score { font-style: normal; font-size: 10.5px; font-weight: 700; color: var(--muted); text-align: center; }

.block {
  width: 100%;
  border-radius: 14px 14px 0 0;
  display: grid;
  place-items: center;
  font-size: 22px;
  font-weight: 700;
  background: #E9EDEA;
  color: var(--muted);
}

.app.dark .block { background: var(--wash-2); }

.slot.p1 .block {
  height: 92px;
  font-size: 26px;
  background: linear-gradient(165deg, var(--gold-light), var(--gold-mid));
  color: var(--gold-ink);
  box-shadow: 0 4px 0 var(--gold-deep);
}

.slot.p2 .block { height: 60px; }
.slot.p3 .block { height: 44px; background: var(--gold-line); color: var(--gold-text); }

/* ------------------------------------------------------------------- rows */

.row {
  display: flex;
  align-items: center;
  gap: 13px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 14px 16px;
}

.row.me { border-color: var(--green); background: var(--wash-3); }
.row.dnf { opacity: .65; }

.rank { width: 26px; font-size: 18px; font-weight: 700; color: var(--faint); flex: none; }

.t-avatar { width: 38px; height: 38px; font-size: 14px; background: var(--wash-2); color: var(--muted); }

.t-row-text b { font-size: 14.5px; }

.pct { font-size: 16px; font-weight: 700; color: var(--muted); flex: none; }

/* ------------------------------------------------------------------- foot */

.btn-outline {
  border: 1px solid var(--line);
  background: none;
  color: var(--muted);
}
</style>
