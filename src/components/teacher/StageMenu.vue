<script setup>
/**
 * UT-MD2 — what to do with a stage. The middle option is the point of the
 * screen: a game can be run straight off a stage, with or without a class,
 * by handing out the link.
 */
import { ref } from 'vue'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({
  stage: { type: Object, required: true },
  /** Set when the menu is opened from inside a class. */
  groupId: { type: Number, default: null },
})

const emit = defineEmits(['close', 'edit', 'results', 'play', 'deleted'])

const busy = ref(false)

async function play() {
  if (!props.stage.words_count) {
    store.toast('Avval bosqichga soʼz qoʼshing')
    return
  }

  busy.value = true

  try {
    const { competition } = await api.teacher.openStageCompetition(props.stage.id, props.groupId)
    telegram.notify('success')
    emit('play', competition)
  } catch (error) {
    store.toast(error.message)
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!confirm(`${props.stage.position}-bosqich oʼchirilsinmi?`)) return

  busy.value = true

  try {
    await api.teacher.deleteStage(props.stage.id)
    store.toast('Bosqich oʼchirildi')
    emit('deleted')
  } catch (error) {
    store.toast(error.message)
    busy.value = false
  }
}
</script>

<template>
  <Teleport to="#lx-overlays">
    <div class="scrim" @click.self="emit('close')">
      <div class="card">
        <h2>{{ stage.position }}-bosqich · {{ stage.title || 'Nomsiz' }}</h2>
        <p>{{ stage.words_count }} soʼz · nima qilamiz?</p>

        <div class="options">
          <button class="opt" :disabled="busy" @click="emit('edit', stage.id)">
            <span class="ic green" v-html="TeacherIcon.pencil"></span>
            <span class="txt">
              <b>Lugʼatni tahrirlash</b>
              <i>soʼz qoʼshish, oʼchirish</i>
            </span>
            <span class="chev" v-html="TeacherIcon.chevron"></span>
          </button>

          <button class="opt accent" :disabled="busy" @click="play">
            <span class="ic ink"><span class="t-vs">VS</span></span>
            <span class="txt">
              <b>{{ busy ? 'Ochilmoqda…' : 'Oʼyin boshlash — havola' }}</b>
              <i v-if="groupId">guruh oʼquvchilari havola orqali qoʼshiladi</i>
              <i v-else>guruhsiz ham: linkni tarqating, ishtirokchi yigʼing</i>
            </span>
            <span class="chev" v-html="TeacherIcon.chevron"></span>
          </button>

          <button class="opt" :disabled="busy || !groupId" @click="emit('results', stage.id)">
            <span class="ic blue" v-html="TeacherIcon.chart"></span>
            <span class="txt">
              <b>Natijalar</b>
              <i v-if="groupId">kim qancha ishlagan</i>
              <i v-else>guruh ichidan oching — bu yoʼl hali guruhga bogʼlanmagan</i>
            </span>
            <span class="chev" v-html="TeacherIcon.chevron"></span>
          </button>
        </div>

        <button class="danger" :disabled="busy" @click="remove">
          <span v-html="TeacherIcon.trash"></span> Bosqichni oʼchirish
        </button>

        <button class="btn btn-soft cancel" @click="emit('close')">Bekor</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: absolute;
  inset: 0;
  z-index: 32;
  background: rgba(22, 32, 26, .45);
  display: flex;
  align-items: flex-end;
  padding: 0;
}

.card {
  width: 100%;
  background: var(--card);
  border-radius: 24px 24px 0 0;
  padding: 22px 22px calc(24px + var(--lx-foot));
  max-height: 90%;
  overflow-y: auto;
}

h2 { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 700; }
p { font-size: 12.5px; font-weight: 600; color: var(--muted); margin-top: 4px; }

.options { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }

.opt {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px 14px;
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
  color: var(--ink);
}

.opt:disabled { opacity: .5; cursor: default; }

.opt.accent { border: 1.5px solid var(--ink); background: var(--wash-2); }

.ic {
  width: 40px;
  height: 40px;
  border-radius: var(--r-md);
  display: grid;
  place-items: center;
  flex: none;
}

.ic.green { background: var(--green-soft); color: var(--green); }
.ic.blue { background: var(--blue-soft); color: var(--blue); }
.ic.ink { background: var(--ink); color: var(--card); }
.app.dark .ic.ink { background: var(--green); color: #06120B; }

.txt { flex: 1; min-width: 0; }
.txt b { display: block; font-size: 14.5px; font-weight: 800; }
.txt i {
  display: block;
  font-style: normal;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--faint);
  margin-top: 2px;
  line-height: 1.35;
}

.chev { color: var(--line-4); display: grid; place-items: center; flex: none; }

.danger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--red-line);
  border-radius: var(--r-md);
  background: none;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: var(--red);
  cursor: pointer;
}

.danger > span { display: grid; place-items: center; }

.cancel { margin-top: 10px; }
</style>
