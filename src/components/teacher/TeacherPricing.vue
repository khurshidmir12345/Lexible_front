<script setup>
/**
 * UT-08 / UT-08b «Tariflar» — the same screen under two billing models.
 *
 * Left tab: the teacher buys seats and the class plays free. Right tab: the
 * teacher pays nothing and each student subscribes. Payment capture is not
 * wired up yet, so choosing a paid bundle records the request and the card
 * says it is awaiting payment.
 */
import { computed, onMounted, ref } from 'vue'
import { TeacherIcon } from '../../lib/icons2'
import { api } from '../../lib/api'
import { store } from '../../lib/store'
import { telegram } from '../../lib/telegram'

const emit = defineEmits(['close'])

const plan = ref(null)
const loading = ref(true)
const busy = ref(false)
const tab = ref('teacher')

const plans = computed(() => plan.value?.plans ?? [])
const paidPercent = computed(() => {
  const total = plan.value?.students_total ?? 0
  return total ? Math.round(((plan.value?.students_paid ?? 0) / total) * 100) : 0
})

/** "50 000" — a space, the way prices are written in Uzbek. */
const money = (value) => String(value ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')

async function load() {
  loading.value = true

  try {
    plan.value = (await api.teacher.plan()).plan
    tab.value = plan.value.billing_mode ?? 'teacher'
  } catch (error) {
    store.toast(error.message)
    emit('close')
  } finally {
    loading.value = false
  }
}

async function switchTab(mode) {
  if (tab.value === mode || busy.value) return

  tab.value = mode
  busy.value = true

  try {
    plan.value = (await api.teacher.setBillingMode(mode)).plan
    telegram.haptic()
  } catch (error) {
    store.toast(error.message)
  } finally {
    busy.value = false
  }
}

async function choose(seats) {
  busy.value = true

  try {
    const result = (await api.teacher.choosePlan(seats)).plan
    plan.value = result
    store.toast(
      result.status === 'pending'
        ? '⏳ Toʼlov kutilmoqda — tez orada bogʼlanamiz'
        : '✅ Tarif yangilandi',
    )
  } catch (error) {
    store.toast(error.message)
  } finally {
    busy.value = false
  }
}

async function remind() {
  busy.value = true

  try {
    const { reminded } = await api.teacher.remindUnpaid()
    store.toast(reminded ? `📨 ${reminded} ta eslatma yuborildi` : 'Hamma toʼlagan')
  } catch (error) {
    store.toast(error.message)
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="overlay show pricing">
    <header class="t-head">
      <button class="t-back" aria-label="Orqaga" @click="emit('close')">
        <span class="flip" v-html="TeacherIcon.chevron"></span>
      </button>
      <div class="t-head-main"><h1>Tariflar</h1></div>
    </header>

    <div class="t-body">
      <p v-if="loading" class="t-loading">Yuklanmoqda…</p>

      <template v-else-if="plan">
        <div class="tabs">
          <button :class="{ on: tab === 'teacher' }" @click="switchTab('teacher')">Ustoz toʼlaydi</button>
          <button :class="{ on: tab === 'student' }" @click="switchTab('student')">Oʼquvchi toʼlaydi</button>
        </div>

        <!-- UT-08 -->
        <template v-if="tab === 'teacher'">
          <p class="lede">
            Oʼquvchilar soniga qarab oylik paket — oʼquvchilaringiz yoʼllardan <b>bepul</b>
            foydalanadi. Kontent (yoʼl, bosqich, soʼz) — cheksiz.
          </p>

          <div class="t-card usage">
            <span class="t-label">JOYLAR</span>
            <div class="usage-row">
              <b class="v-num">{{ plan.seats_used }} / {{ plan.seats }}</b>
              <span class="t-meter">
                <i :class="{ bad: plan.over_limit }" :style="{ width: `${Math.min((plan.seats_used / Math.max(plan.seats, 1)) * 100, 100)}%` }"></i>
              </span>
            </div>
            <p v-if="plan.over_limit" class="over">
              Chegaradan oshdi — yangi oʼquvchi qoʼshish uchun tarifni kengaytiring.
            </p>
          </div>

          <div
            v-for="item in plans"
            :key="item.seats"
            class="t-card plan"
            :class="{ current: item.is_current, featured: item.popular }"
          >
            <span v-if="item.popular" class="tag">MASHHUR</span>

            <div class="plan-head">
              <span class="v-num name">{{ item.label }}</span>
              <span class="price v-num">
                {{ item.price ? money(item.price) : '0' }} <i>soʼm{{ item.price ? ' / oy' : '' }}</i>
              </span>
            </div>

            <p class="note">{{ item.note }}</p>

            <div class="perks">
              <span><span v-html="TeacherIcon.check"></span> Kontent cheksiz — yoʼl, bosqich, soʼz</span>
              <span v-if="item.price"><span v-html="TeacherIcon.check"></span> Musobaqa va toʼliq statistika</span>
            </div>

            <div v-if="item.is_current" class="state current-state">Joriy tarif</div>
            <div v-else-if="item.is_requested" class="state pending-state">Toʼlov kutilmoqda</div>
            <button
              v-else
              class="pick"
              :class="{ ghost: !item.popular }"
              :disabled="busy"
              @click="choose(item.seats)"
            >Tanlash</button>
          </div>
        </template>

        <!-- UT-08b -->
        <template v-else>
          <p class="lede">
            Ustoz toʼlamaydi — kontentni cheksiz kiritadi. Yoʼl ochilishi uchun har bir oʼquvchi
            oyiga <b>{{ money(plan.student_price) }} soʼm</b> toʼlaydi.
          </p>

          <div class="t-card ink">
            <div class="ink-head">
              <span class="ink-ic" v-html="TeacherIcon.star"></span>
              <span class="ink-text">
                <b>Oʼquvchi toʼlovi</b>
                <i>bitta yoʼl uchun · har oy</i>
              </span>
              <span class="ink-price">
                <b class="v-num">{{ money(plan.student_price) }}</b>
                <i>soʼm / oy</i>
              </span>
            </div>
            <div class="perks light">
              <span><span v-html="TeacherIcon.check"></span> Ustoz yoʼli toʼliq ochiladi</span>
              <span><span v-html="TeacherIcon.check"></span> Guruh reytingi va musobaqalar</span>
              <span><span v-html="TeacherIcon.check"></span> Shaxsiy statistika</span>
            </div>
          </div>

          <div class="t-card">
            <span class="t-label">GURUHINGIZ HOLATI</span>
            <div class="usage-row">
              <b class="v-num">{{ plan.students_paid }} / {{ plan.students_total }}</b>
              <span class="t-meter"><i :style="{ width: `${paidPercent}%` }"></i></span>
            </div>
            <p class="sub">oʼquvchi toʼlagan</p>

            <div v-if="plan.students_unpaid" class="warnbox">
              <span v-html="TeacherIcon.info"></span>
              <b>{{ plan.students_unpaid }} oʼquvchi hali toʼlamagan — eslatma yuboring.</b>
            </div>

            <button class="pick ghost" :disabled="busy || !plan.students_unpaid" @click="remind">
              Eslatma yuborish
            </button>
          </div>
        </template>

        <p class="disclaimer">
          Toʼlov tizimi hali ulanmagan — tarif tanlanganda soʼrov qayd etiladi va siz bilan
          bogʼlanamiz.
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pricing { background: var(--canvas); z-index: 26; }

.flip { display: grid; place-items: center; transform: rotate(180deg); }

.tabs {
  display: flex;
  background: var(--line-3);
  border-radius: 13px;
  padding: 4px;
}

.tabs button {
  flex: 1;
  border: none;
  background: none;
  border-radius: 10px;
  padding: 10px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}

.tabs button.on {
  background: var(--card);
  color: var(--ink);
  font-weight: 800;
  box-shadow: 0 1px 4px rgba(22, 32, 26, .12);
}

.lede {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.55;
  padding: 0 2px;
}

.lede b { color: var(--ink); font-weight: 800; }

/* ------------------------------------------------------------------ usage */

.usage-row { display: flex; align-items: center; gap: 12px; margin-top: 9px; }
.usage-row b { font-size: 20px; flex: none; }
.usage-row .t-meter { flex: 1; height: 8px; }

.sub { font-size: 12px; font-weight: 600; color: var(--muted); margin-top: 6px; }

.over { font-size: 11.5px; font-weight: 700; color: var(--red-dark); margin-top: 9px; line-height: 1.45; }

.warnbox {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  background: var(--gold-soft);
  border-radius: 12px;
  padding: 11px 13px;
  margin-top: 12px;
}

.warnbox > span { color: var(--gold); display: grid; place-items: center; flex: none; margin-top: 1px; }
.warnbox b { font-size: 11.5px; font-weight: 700; color: var(--gold-text); line-height: 1.5; }

/* ------------------------------------------------------------------ plans */

.plan { position: relative; }

.plan.featured {
  border: 1.5px solid var(--green);
  box-shadow: 0 8px 24px -14px rgba(23, 164, 92, .5);
}

.plan.current { border-color: var(--line-4); }

.tag {
  position: absolute;
  top: -9px;
  left: 16px;
  background: var(--green);
  color: #fff;
  border-radius: var(--r-pill);
  padding: 3px 10px;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: .5px;
}

.plan-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.name { font-size: 16px; font-weight: 700; }
.price { font-size: 16px; font-weight: 700; }
.price i { font-style: normal; font-size: 11px; font-weight: 700; color: var(--faint); }

.note { font-size: 11.5px; font-weight: 600; color: var(--faint); margin-top: 3px; }

.perks { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }

.perks span {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--muted);
}

.perks span > span { color: var(--green); display: grid; place-items: center; flex: none; }

.perks.light span { color: rgba(255, 255, 255, .85); }
.perks.light span > span { color: var(--green-bright); }

.state,
.pick {
  display: block;
  width: 100%;
  border-radius: 12px;
  padding: 12px;
  margin-top: 14px;
  text-align: center;
  font-family: 'Manrope', sans-serif;
  font-size: 13.5px;
  font-weight: 800;
  border: 1px solid var(--line);
  background: none;
  color: var(--muted);
  cursor: pointer;
}

.state { cursor: default; }
.pending-state { border-color: var(--gold-line); background: var(--gold-soft); color: var(--gold-text); }

.pick { background: var(--green); border-color: var(--green); color: #fff; }
.pick.ghost { background: none; border-color: var(--line); color: var(--muted); }
.pick:disabled { opacity: .5; cursor: default; }

/* -------------------------------------------------------------- dark card */

.ink-head { display: flex; align-items: center; gap: 12px; }

.ink-ic {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, .1);
  color: var(--gold-mid);
  display: grid;
  place-items: center;
  flex: none;
}

.ink-text { flex: 1; min-width: 0; }
.ink-text b { display: block; font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; }
.ink-text i {
  display: block;
  font-style: normal;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, .55);
  margin-top: 2px;
}

.ink-price { text-align: right; flex: none; }
.ink-price b { display: block; font-size: 17px; }
.ink-price i {
  display: block;
  font-style: normal;
  font-size: 10.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, .55);
}

.disclaimer {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--faint);
  line-height: 1.5;
  text-align: center;
  padding: 4px 6px;
}
</style>
