<script setup>
/**
 * UT-04 «Guruh ichi» — the path the class is on, the join code, whoever is
 * waiting for approval, and the leaderboard. Everything deeper (the map, one
 * stage's results, a live game) opens from here.
 */
import { computed, onMounted, ref } from 'vue'
import Modal from '../ui/Modal.vue'
import AddStudentSheet from './AddStudentSheet.vue'
import GroupRoad from './GroupRoad.vue'
import StageMenu from './StageMenu.vue'
import StageEditor from './StageEditor.vue'
import StageResults from './StageResults.vue'
import StudentHistory from './StudentHistory.vue'
import CompetitionHistory from './CompetitionHistory.vue'
import CompetitionLobby from '../competition/CompetitionLobby.vue'
import CompetitionSetup from '../competition/CompetitionSetup.vue'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({ groupId: { type: Number, required: true } })
const emit = defineEmits(['close', 'changed'])

const data = ref(null)
const loading = ref(true)
const stageFilter = ref(null)          // null = overall
const paths = ref([])
const attaching = ref(false)
const editing = ref(false)
const adding = ref(false)
const menu = ref(false)
const showRoad = ref(false)
const resultsStage = ref(null)
/** UT-MD2 over the class map: the tapped stage, with words_count the menu reads. */
const menuStage = ref(null)
const editingStage = ref(null)
// Bumped after an edit so the map behind re-reads its word counts.
const roadKey = ref(0)

function openStageMenu(stage) {
  menuStage.value = { ...stage, words_count: stage.words ?? stage.words_count ?? 0 }
}

function stageSaved() {
  editingStage.value = null
  roadKey.value++
  load()
  emit('changed')
}
const lobby = ref(null)
const setupStage = ref(null)
const historyStudent = ref(null)
const showGames = ref(false)
/** Lobbies and rounds still running in this class: a way back in. */
const liveGames = ref([])
const draft = ref({ title: '', subtitle: '', badge: '' })

const group = computed(() => data.value?.group ?? null)
const stages = computed(() => group.value?.path?.stages ?? [])

const tone = (score) => (score >= 70 ? 'good' : score >= 40 ? 'warn' : 'bad')

async function loadGames() {
  try {
    const { competitions } = await api.teacher.competitions(props.groupId)
    liveGames.value = competitions.filter((c) => c.live)
  } catch {
    liveGames.value = []
  }
}

async function load() {
  loading.value = true
  loadGames()

  try {
    data.value = await api.teacher.group(props.groupId, stageFilter.value)

    // A path swap can drop the stage the board was filtered by.
    if (stageFilter.value && !stages.value.some((s) => s.id === stageFilter.value)) {
      stageFilter.value = null
      data.value = await api.teacher.group(props.groupId, null)
    }
  } catch (error) {
    store.toast(error.message)
    emit('close')
  } finally {
    loading.value = false
  }
}

function pickStage(id) {
  stageFilter.value = id
  load()
}

async function approve(member) {
  try {
    await api.teacher.approve(member.id)
    telegram.notify('success')
    store.toast(`✅ ${member.name} qoʼshildi`)
    await load()
    emit('changed')
  } catch (error) {
    store.toast(error.message)
  }
}

async function reject(member) {
  try {
    await api.teacher.removeMember(member.id)
    await load()
    emit('changed')
  } catch (error) {
    store.toast(error.message)
  }
}

async function openPathPicker() {
  try {
    paths.value = (await api.teacher.paths()).paths
    attaching.value = true
  } catch (error) {
    store.toast(error.message)
  }
}

async function attach(pathId) {
  try {
    await api.teacher.attachPath(props.groupId, pathId)
    attaching.value = false
    store.toast('✅ Yoʼl biriktirildi')
    stageFilter.value = null
    await load()
    emit('changed')
  } catch (error) {
    store.toast(error.message)
  }
}

function startEdit() {
  draft.value = {
    title: group.value?.title ?? '',
    subtitle: group.value?.subtitle ?? '',
    badge: group.value?.badge ?? '',
  }
  menu.value = false
  editing.value = true
}

async function saveGroup() {
  if (draft.value.title.trim().length < 2) return

  try {
    await api.teacher.updateGroup(props.groupId, {
      title: draft.value.title.trim(),
      subtitle: draft.value.subtitle.trim() || null,
      badge: draft.value.badge.trim() || null,
    })
    editing.value = false
    await load()
    emit('changed')
    store.toast('✅ Saqlandi')
  } catch (error) {
    store.toast(error.message)
  }
}

async function removeGroup() {
  if (!confirm(`«${group.value?.title}» guruhi oʼchirilsinmi? Oʼquvchilardagi bosqichlar ham olib tashlanadi.`)) {
    return
  }

  try {
    await api.teacher.deleteGroup(props.groupId)
    store.toast('Guruh oʼchirildi')
    emit('changed')
    emit('close')
  } catch (error) {
    store.toast(error.message)
  }
}

async function removeStudent(row) {
  if (!confirm(`${row.name} guruhdan chiqarilsinmi?`)) return

  try {
    await api.teacher.removeMember(row.member_id ?? row.id)
    await load()
    emit('changed')
  } catch (error) {
    store.toast(error.message)
  }
}

/**
 * A game over the stage currently filtered by, or the first one. The
 * exercises and the clock are asked on the setup sheet first.
 */
function play() {
  const stageId = stageFilter.value ?? stages.value[0]?.id

  if (!stageId) {
    store.toast('Avval yoʼl biriktiring')
    return
  }

  telegram.haptic()
  setupStage.value = stages.value.find((s) => s.id === stageId) ?? { id: stageId }
}

function openLobby(competition) {
  setupStage.value = null
  lobby.value = competition
}

function copyCode() {
  telegram.copy(group.value.code)
  telegram.haptic()
  store.toast('🔗 Kod nusxalandi')
}

onMounted(load)
</script>

<template>
  <div class="overlay show detail">
    <header class="t-head">
      <button class="t-back" aria-label="Orqaga" @click="emit('close')">
        <span class="flip" v-html="TeacherIcon.chevron"></span>
      </button>
      <div class="t-head-main">
        <h1>{{ group?.title ?? 'Guruh' }}</h1>
        <p>{{ group?.members ?? 0 }} oʼquvchi{{ group?.subtitle ? ` · ${group.subtitle}` : '' }}</p>
      </div>
      <button class="t-back menu" aria-label="Menyu" @click="menu = true">
        <span v-html="TeacherIcon.dots"></span>
      </button>
    </header>

    <div class="t-body">
      <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

      <template v-else-if="group">
        <!-- Attached path -->
        <div class="t-card">
          <span class="t-label">BIRIKTIRILGAN YOʼL</span>
          <div class="path">
            <span class="t-icon-sq green" v-html="TeacherIcon.road"></span>
            <span class="path-text">
              <b>{{ group.path?.title ?? 'Yoʼl biriktirilmagan' }}</b>
              <i v-if="group.path">{{ group.path.stages.length }} bosqich — oʼquvchilarga koʼrinadi</i>
              <i v-else>oʼquvchilarga bosqich koʼrinmaydi</i>
            </span>
            <button class="t-action" @click="openPathPicker">
              {{ group.path ? 'Almashtirish' : 'Biriktirish' }}
            </button>
          </div>
        </div>

        <template v-if="group.path">
          <button class="open-road" @click="showRoad = true">
            <span v-html="TeacherIcon.road"></span> Yoʼlni ochish
          </button>
          <p class="under">bosqich ichida — natijalar va oʼyin boshlash</p>
        </template>

        <!-- Join code -->
        <button class="t-code" @click="copyCode">
          <span class="t-code-main">
            <span class="t-label">QOʼSHILISH KODI</span>
            <b>{{ group.code }}</b>
          </span>
          <span class="t-copy"><span v-html="TeacherIcon.copy"></span> Nusxa</span>
        </button>

        <!-- Waiting for approval -->
        <div v-if="data.pending.length" class="t-card gold">
          <span class="t-label warn">TASDIQLASH KUTILMOQDA · {{ data.pending.length }}</span>
          <div v-for="member in data.pending" :key="member.id" class="waiting">
            <span class="t-avatar gold">{{ member.initial }}</span>
            <span class="t-row-text">
              <b>{{ member.name }}</b>
              <i class="gold-i">kod orqali · ID {{ member.telegram_id }}</i>
            </span>
            <button class="t-yes" aria-label="Tasdiqlash" @click="approve(member)">
              <span v-html="TeacherIcon.check"></span>
            </button>
            <button class="t-no" aria-label="Rad etish" @click="reject(member)">
              <span v-html="TeacherIcon.cross"></span>
            </button>
          </div>
        </div>

        <!-- Leaderboard -->
        <div class="t-section">
          <span class="t-label">GURUH REYTINGI · {{ group.members }} OʼQUVCHI</span>
          <button class="t-action" @click="adding = true">
            <span v-html="TeacherIcon.plus"></span> Qoʼshish
          </button>
        </div>

        <div v-if="stages.length" class="t-chips">
          <button class="t-chip" :class="{ on: stageFilter === null }" @click="pickStage(null)">Umumiy</button>
          <button
            v-for="stage in stages"
            :key="stage.id"
            class="t-chip"
            :class="{ on: stageFilter === stage.id }"
            @click="pickStage(stage.id)"
          >{{ stage.position }}-bosqich</button>
        </div>

        <button v-if="stages.length" class="play" @click="play">
          <span class="t-vs">VS</span>
          {{ stageFilter ? 'Shu bosqichda oʼyin boshlash' : 'Oʼyin boshlash' }}
        </button>

        <!-- A round the teacher walked away from is still there -->
        <button v-for="game in liveGames" :key="game.id" class="live-game" @click="lobby = game">
          <span class="live-dot"></span>
          <span class="live-text">
            <b>{{ game.status === 'playing' ? 'Oʼyin davom etmoqda' : 'Lobbi ochiq' }}<template v-if="game.stage"> · {{ game.stage }}-bosqich</template></b>
            <i>{{ game.participants }} oʼquvchi qoʼshilgan — qaytib kirish</i>
          </span>
          <span class="live-cta">Kirish</span>
        </button>

        <button class="games" @click="showGames = true">
          <span v-html="TeacherIcon.trophy"></span>
          Oʼyinlar tarixi
          <span class="chev" v-html="TeacherIcon.chevron"></span>
        </button>

        <p class="under">oʼquvchini bossangiz — uning barcha natijalari</p>

        <div v-if="data.leaderboard.length" class="t-rows">
          <div v-for="row in data.leaderboard" :key="row.id" class="t-row tap" @click="historyStudent = row">
            <span class="t-rank" :class="row.rank <= 3 ? `g${row.rank}` : ''">{{ row.rank }}</span>
            <span class="t-avatar">
              <img v-if="row.photo" :src="row.photo" alt="" />
              <template v-else>{{ row.initial }}</template>
            </span>
            <span class="t-row-text">
              <b>{{ row.name }}</b>
              <i>🔥 {{ row.streak }} kun</i>
            </span>
            <b class="pct v-num" :class="tone(row.score)">{{ row.score }}%</b>
            <button class="kick" aria-label="Chiqarish" @click.stop="removeStudent(row)">
              <span v-html="TeacherIcon.cross"></span>
            </button>
          </div>
        </div>

        <div v-else class="t-empty">
          <span class="t-empty-ic" v-html="TeacherIcon.group"></span>
          <h3>Hali oʼquvchi qoʼshilmagan</h3>
          <p>Kodni ulashing yoki ID orqali oʼzingiz qoʼshing.</p>
          <button class="btn btn-primary" @click="adding = true">Oʼquvchi qoʼshish</button>
        </div>
      </template>
    </div>

    <!-- Deeper screens -->
    <GroupRoad
      v-if="showRoad"
      :key="roadKey"
      :group-id="groupId"
      @close="showRoad = false"
      @stage="openStageMenu"
    />

    <!-- Tapping a card on the class map: edit its words, run a game, or read results. -->
    <StageMenu
      v-if="menuStage"
      :stage="menuStage"
      :group-id="groupId"
      :allowed="group?.path?.types ?? null"
      @close="menuStage = null"
      @edit="(id) => { menuStage = null; editingStage = id }"
      @results="(id) => { menuStage = null; showRoad = false; resultsStage = id }"
      @play="(c) => { menuStage = null; showRoad = false; lobby = c }"
      @deleted="() => { menuStage = null; roadKey++; load(); emit('changed') }"
    />

    <StageEditor
      v-if="editingStage"
      :stage-id="editingStage"
      @close="editingStage = null"
      @saved="stageSaved"
    />

    <StageResults
      v-if="resultsStage"
      :group-id="groupId"
      :stage-id="resultsStage"
      @close="() => { resultsStage = null; load() }"
      @competition="(c) => { resultsStage = null; lobby = c }"
    />

    <CompetitionSetup
      v-if="setupStage"
      :stage-id="setupStage.id"
      :group-id="groupId"
      :allowed="group?.path?.types ?? null"
      :stage-label="setupStage.position ? `${setupStage.position}-bosqich · ${setupStage.title || 'Nomsiz'}` : ''"
      @close="setupStage = null"
      @created="openLobby"
      @resume="openLobby"
    />

    <CompetitionLobby
      v-if="lobby"
      :competition-id="lobby.id"
      :group-id="groupId"
      :stage-id="lobby.stage_id ?? stageFilter ?? stages[0]?.id ?? null"
      @close="() => { lobby = null; load() }"
    />

    <CompetitionHistory v-if="showGames" :group-id="groupId" @close="() => { showGames = false; loadGames() }" />

    <StudentHistory
      v-if="historyStudent"
      :group-id="groupId"
      :student-id="historyStudent.id"
      @close="historyStudent = null"
    />

    <AddStudentSheet
      v-if="adding"
      :group-id="groupId"
      :code="group?.code ?? ''"
      @close="adding = false"
      @added="() => { load(); emit('changed') }"
    />

    <Teleport to="#lx-overlays">
      <Modal :open="attaching" title="Yoʼlni tanlang" text="Bosqichlar oʼquvchilarga koʼchiriladi.">
        <div class="picker">
          <button
            v-for="path in paths"
            :key="path.id"
            class="option"
            :class="{ on: group?.path?.id === path.id }"
            @click="attach(path.id)"
          >
            <span class="option-text">
              <b>{{ path.title }}</b>
              <i>{{ path.stages_count }} bosqich · {{ path.words_count }} soʼz</i>
            </span>
            <span class="radio" :class="{ on: group?.path?.id === path.id }"></span>
          </button>
          <p v-if="!paths.length" class="t-more">Avval «Yoʼllar» boʼlimida yoʼl tuzing.</p>
        </div>
        <template #actions>
          <button class="btn btn-soft" @click="attaching = false">Yopish</button>
        </template>
      </Modal>

      <Modal :open="menu" title="Guruh">
        <div class="picker">
          <button class="option" @click="startEdit">
            <span class="option-text"><b>Nomini tahrirlash</b><i>nom, izoh, belgi</i></span>
          </button>
          <button class="option" @click="() => { menu = false; adding = true }">
            <span class="option-text"><b>Oʼquvchi qoʼshish</b><i>ID orqali yoki kod ulashib</i></span>
          </button>
          <button class="option danger" @click="() => { menu = false; removeGroup() }">
            <span class="option-text"><b>Guruhni oʼchirish</b><i>qaytarib boʼlmaydi</i></span>
          </button>
        </div>
        <template #actions>
          <button class="btn btn-soft" @click="menu = false">Bekor</button>
        </template>
      </Modal>

      <Modal :open="editing" title="Guruhni tahrirlash">
        <label class="t-field field"><span>GURUH NOMI</span>
          <input v-model="draft.title" maxlength="60" />
        </label>
        <label class="t-field field"><span>IZOH</span>
          <input v-model="draft.subtitle" maxlength="80" />
        </label>
        <label class="t-field field"><span>QISQA BELGI</span>
          <input v-model="draft.badge" maxlength="4" />
        </label>
        <template #actions>
          <button class="btn btn-soft" @click="editing = false">Bekor</button>
          <button class="btn btn-primary" :disabled="draft.title.trim().length < 2" @click="saveGroup">
            Saqlash
          </button>
        </template>
      </Modal>
    </Teleport>
  </div>
</template>

<style scoped>
.detail { background: var(--canvas); z-index: 18; }

.flip { display: grid; place-items: center; transform: rotate(180deg); }
.menu { border-color: transparent; color: var(--muted); }

/* --------------------------------------------------------------- path row */

.path { display: flex; align-items: center; gap: 12px; margin-top: 9px; }

.t-icon-sq.green { background: var(--green-soft); color: var(--green); }

.path-text { flex: 1; min-width: 0; }
.path-text b { display: block; font-size: 14.5px; font-weight: 800; }
.path-text i {
  display: block;
  font-style: normal;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 1px;
}

.open-road {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 14px;
  background: var(--green);
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.open-road > span { display: grid; place-items: center; }

.under {
  text-align: center;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--faint);
  margin-top: -6px;
}

/* --------------------------------------------------------------- pending */

.waiting { display: flex; align-items: center; gap: 11px; margin-top: 11px; }

.t-avatar.gold { background: var(--card); color: var(--gold); width: 36px; height: 36px; font-size: 13px; }
.gold-i { color: var(--gold-text) !important; }

/* ----------------------------------------------------------- leaderboard */

.play {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 13px;
  background: var(--ink);
  color: var(--card);
  font-family: 'Manrope', sans-serif;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
}

.app.dark .play { background: var(--wash-2); color: var(--ink); }

.live-game {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 1.5px solid var(--blue);
  border-radius: 14px;
  padding: 12px 14px;
  background: var(--blue-soft);
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
  color: var(--ink);
}

.live-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--r-pill);
  background: var(--blue);
  flex: none;
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(36, 128, 182, .45); }
  60% { box-shadow: 0 0 0 7px rgba(36, 128, 182, 0); }
}

.live-text { flex: 1; min-width: 0; }
.live-text b { display: block; font-size: 13.5px; font-weight: 800; color: var(--blue); }
.live-text i { display: block; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--muted); margin-top: 2px; }
.live-cta { font-size: 12px; font-weight: 800; color: var(--blue); flex: none; }

.games {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
  background: var(--card);
  font-family: 'Manrope', sans-serif;
  font-size: 13.5px;
  font-weight: 800;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}

.games > span:first-child { color: var(--gold); display: grid; place-items: center; }
.games .chev { margin-left: auto; color: var(--line-4); display: grid; place-items: center; }

.t-row.tap { cursor: pointer; }

.pct { font-size: 13px; font-weight: 700; flex: none; }
.pct.good { color: var(--green); }
.pct.warn { color: var(--gold); }
.pct.bad { color: var(--red-dark); }

.kick {
  border: none;
  background: none;
  color: var(--line-4);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex: none;
  padding: 4px;
}

/* -------------------------------------------------------------- modals */

.picker { display: flex; flex-direction: column; gap: 9px; margin-top: 14px; }

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px 15px;
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: 'Manrope', sans-serif;
  color: var(--ink);
}

.option.on { border: 1.5px solid var(--green); background: var(--wash-3); }
.option.danger { border-color: var(--red-line); color: var(--red); }

.option-text { flex: 1; min-width: 0; }
.option-text b { display: block; font-size: 14.5px; font-weight: 800; }
.option-text i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: var(--faint);
  margin-top: 2px;
}

.radio {
  width: 20px;
  height: 20px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--line-4);
  flex: none;
}

.radio.on { border: 6px solid var(--green); }

.field { margin-top: 12px; }
</style>
