<script setup>
import { onMounted, ref } from 'vue'
import Modal from '../ui/Modal.vue'
import CompetitionLobby from '../competition/CompetitionLobby.vue'
import { backIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const props = defineProps({ groupId: Number })
const emit = defineEmits(['close'])

const data = ref(null)
const loading = ref(true)
const stage = ref(null)          // null = overall
const attaching = ref(false)
const paths = ref([])
const lobbyId = ref(null)

async function load() {
  loading.value = true
  try {
    data.value = await api.teacher.group(props.groupId, stage.value)
  } catch (error) {
    store.toast(error.message)
    emit('close')
  } finally {
    loading.value = false
  }
}

async function approve(member) {
  try {
    await api.teacher.approve(member.id)
    store.toast(`✅ ${member.name} qoʼshildi`)
    await load()
  } catch (error) {
    store.toast(error.message)
  }
}

async function reject(member) {
  try {
    await api.teacher.removeMember(member.id)
    await load()
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
    await load()
  } catch (error) {
    store.toast(error.message)
  }
}

function pickStage(id) {
  stage.value = id
  load()
}

/** Opens a live contest over the stage currently in view. */
async function openCompetition() {
  if (!stage.value) return

  telegram.haptic()
  try {
    const { competition } = await api.teacher.openCompetition(props.groupId, stage.value)
    lobbyId.value = competition.id
  } catch (error) {
    store.toast(error.message)
  }
}

function copyCode() {
  telegram.copy(data.value.group.code)
  store.toast('🔗 Kod nusxalandi')
}

onMounted(load)
</script>

<template>
  <div class="overlay show detail">
    <header class="detail-head">
      <button class="back" @click="$emit('close')" v-html="backIcon"></button>
      <div style="flex: 1">
        <div class="title">{{ data?.group?.title ?? 'Guruh' }}</div>
        <div class="sub-line">{{ data?.group?.members ?? 0 }} oʼquvchi</div>
      </div>
    </header>

    <div class="detail-body">
      <template v-if="!loading && data">
        <div class="section">BIRIKTIRILGAN YOʼL</div>
        <div class="panel path-card">
          <template v-if="data.group.path">
            <div>
              <b>{{ data.group.path.title }}</b>
              <i>{{ data.group.path.stages.length }} bosqich — oʼquvchilarga koʼrinadi</i>
            </div>
            <button class="swap" @click="openPathPicker">Almashtirish</button>
          </template>
          <template v-else>
            <div><b>Yoʼl biriktirilmagan</b><i>oʼquvchilarga bosqich koʼrinmaydi</i></div>
            <button class="swap" @click="openPathPicker">Biriktirish</button>
          </template>
        </div>

        <div class="section">QOʼSHILISH KODI</div>
        <button class="code" @click="copyCode">
          <b>{{ data.group.code }}</b><span>Nusxa</span>
        </button>

        <template v-if="data.pending.length">
          <div class="section warn">TASDIQLASH KUTILMOQDA · {{ data.pending.length }}</div>
          <div class="panel rows">
            <div v-for="member in data.pending" :key="member.id" class="row">
              <span class="avatar">{{ member.initial }}</span>
              <span class="row-text">
                <b>{{ member.name }}</b>
                <i>kod orqali · ID {{ member.telegram_id }}</i>
              </span>
              <button class="no" @click="reject(member)">✕</button>
              <button class="yes" @click="approve(member)">✓</button>
            </div>
          </div>
        </template>

        <div class="section">GURUH REYTINGI · {{ data.group.members }} OʼQUVCHI</div>

        <div v-if="data.group.path" class="stage-tabs">
          <button class="stage-tab" :class="{ on: stage === null }" @click="pickStage(null)">Umumiy</button>
          <button
            v-for="s in data.group.path.stages"
            :key="s.id"
            class="stage-tab"
            :class="{ on: stage === s.id }"
            @click="pickStage(s.id)"
          >
            {{ s.position }}-bosqich
          </button>
        </div>

        <button v-if="stage" class="vs-start" @click="openCompetition">
          <span class="vs-badge">VS</span>
          Shu bosqichda oʼyin boshlash
        </button>

        <div v-if="data.leaderboard.length" class="panel rows">
          <div v-for="row in data.leaderboard" :key="row.id" class="row">
            <span class="rank" :class="{ top: row.rank <= 3 }">{{ row.rank }}</span>
            <span class="avatar">{{ row.initial }}</span>
            <span class="row-text">
              <b>{{ row.name }}</b>
              <i>🔥 {{ row.streak }} kun</i>
            </span>
            <span class="pct">{{ row.score }}%</span>
          </div>
        </div>

        <p v-else class="note">Hali oʼquvchi qoʼshilmagan.</p>
      </template>
    </div>

    <CompetitionLobby
      v-if="lobbyId"
      :competition-id="lobbyId"
      :group-id="groupId"
      :stage-id="stage"
      @close="lobbyId = null"
    />

    <Modal :open="attaching" title="Yoʼlni tanlang" text="Bosqichlar oʼquvchilarga koʼchiriladi.">
      <div class="path-list">
        <button v-for="p in paths" :key="p.id" class="path-option" @click="attach(p.id)">
          <b>{{ p.title }}</b>
          <i>{{ p.stages_count }} bosqich</i>
        </button>
        <p v-if="!paths.length" class="note">Avval «Yoʼllar» boʼlimida yoʼl tuzing.</p>
      </div>
      <template #actions>
        <button class="btn btn-soft" @click="attaching = false">Yopish</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.detail { background: var(--canvas); z-index: 18; }

.vs-start {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  margin: 4px 0 14px;
  padding: 14px;
  border-radius: var(--r-lg);
  background: var(--brand);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.vs-badge {
  padding: 3px 9px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, .22);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .06em;
}

.detail-head {
  display: flex; align-items: center; gap: 13px;
  padding: 20px 22px 14px; background: var(--card);
  border-bottom: 1px solid var(--wash); flex: none;
}

.back {
  width: 36px; height: 36px; border-radius: 12px;
  border: 1px solid var(--line); background: none; color: var(--ink);
  display: grid; place-items: center; cursor: pointer; flex: none;
}

.title { font-family: 'Sora', sans-serif; font-size: 19px; font-weight: 700; }
.sub-line { font-size: 11.5px; font-weight: 600; color: var(--faint); }

.detail-body {
  flex: 1; overflow-y: auto; padding: 14px 22px 26px;
  display: flex; flex-direction: column; gap: 10px;
}

.detail-body > * {
  flex: none;
}

.section {
  font-size: 10.5px; font-weight: 800; letter-spacing: 1px;
  color: var(--faint); margin: 6px 0 -2px 4px;
}

.section.warn { color: var(--gold); }

.path-card { display: flex; align-items: center; gap: 12px; }
.path-card b { display: block; font-size: 14.5px; font-weight: 700; }
.path-card i { display: block; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--faint); }
.path-card > div { flex: 1; }

.swap {
  border: 1px solid var(--line); background: none; border-radius: var(--r-pill);
  padding: 7px 14px; font-family: 'Manrope', sans-serif;
  font-size: 12px; font-weight: 700; color: var(--ink); cursor: pointer;
}

.code {
  display: flex; align-items: center; justify-content: space-between;
  border: 1.5px dashed #C3CEC5; border-radius: 14px; padding: 14px 16px;
  background: none; cursor: pointer; font-family: 'Manrope', sans-serif;
}

.code b { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700; color: #2E7CF6; }
.code span { font-size: 12px; font-weight: 700; color: var(--muted); }

.rows { padding: 0; overflow: hidden; }

.row {
  display: flex; align-items: center; gap: 11px;
  padding: 12px 15px; border-bottom: 1px solid var(--wash);
}

.row:last-child { border-bottom: none; }

.avatar {
  width: 36px; height: 36px; border-radius: var(--r-pill);
  background: var(--wash-2); color: var(--muted);
  display: grid; place-items: center;
  font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700;
  flex-shrink: 0;
}

.row-text { flex: 1; }
.row-text b { display: block; font-size: 14px; font-weight: 700; }
.row-text i { display: block; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--faint); }

.yes, .no {
  width: 32px; height: 32px; border-radius: var(--r-pill);
  border: none; cursor: pointer; font-size: 14px; font-weight: 800;
  flex-shrink: 0;
}

.yes { background: var(--green); color: #fff; }
.no { background: var(--wash-2); color: var(--muted); }

.rank {
  width: 24px; text-align: center;
  font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
  color: var(--faint); flex-shrink: 0;
}

.rank.top { color: var(--gold); }

.pct { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700; color: var(--green); }

.stage-tabs { display: flex; gap: 7px; overflow-x: auto; padding-bottom: 2px; }

.stage-tab {
  border: 1px solid var(--line); background: var(--card);
  border-radius: var(--r-pill); padding: 7px 13px;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 700;
  color: var(--muted); cursor: pointer; white-space: nowrap;
}

.stage-tab.on { background: var(--ink); border-color: var(--ink); color: #fff; }

.note { text-align: center; font-size: 13px; font-weight: 600; color: var(--faint); padding: 24px; }

.path-list { display: flex; flex-direction: column; gap: 9px; margin-top: 12px; }

.path-option {
  border: 1px solid var(--line); border-radius: 14px; padding: 13px 15px;
  background: none; text-align: left; cursor: pointer; font-family: 'Manrope', sans-serif;
}

.path-option b { display: block; font-size: 14.5px; font-weight: 700; }
.path-option i { display: block; font-style: normal; font-size: 12px; font-weight: 600; color: var(--faint); }
</style>
