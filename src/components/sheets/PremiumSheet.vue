<script setup>
defineEmits(['close'])

const perks = [
  ['🎙', 'AI talaffuz tekshiruvi'],
  ['📚', 'Cheksiz soʼz va kategoriyalar'],
  ['📊', 'Kengaytirilgan statistika'],
  ['🚫', 'Reklamasiz'],
]
</script>

<template>
  <div class="dialog-wrap open">
    <div class="dialog">
      <div class="crest">✦</div>
      <h2>Bayoz Premium</h2>

      <div class="perks">
        <div v-for="[emoji, label] in perks" :key="label" class="perk">
          <span>{{ emoji }}</span>{{ label }}
        </div>
      </div>

      <div class="mvp-note">
        <b>🚧 Ilova hozir MVP (sinov) holatida ishlamoqda</b>
        <span>Obuna tez orada joriy qilinadi. Hozircha barcha imkoniyatlar bepul — tangalar bilan ham ochiladi.</span>
      </div>

      <button class="btn btn-primary" @click="$emit('close')">Tushunarli</button>
    </div>
  </div>
</template>

<style scoped>
.dialog-wrap {
  position: absolute; inset: 0; background: rgba(22, 32, 26, .45);
  display: flex; align-items: center; justify-content: center;
  padding: 26px; z-index: 30;
}

.dialog {
  width: 100%; background: var(--ink); color: #fff;
  border-radius: 20px; padding: 26px 22px 18px;
  box-shadow: 0 24px 48px -20px rgba(22, 32, 26, .5);
  text-align: center;
}

.crest {
  width: 54px; height: 54px; border-radius: 16px;
  background: rgba(255, 255, 255, .1);
  display: grid; place-items: center; margin: 0 auto;
  font-size: 24px; color: var(--gold-mid);
}

h2 {
  font-family: 'Sora', sans-serif; font-size: 21px; font-weight: 700;
  margin-top: 12px;
}

.perks { display: flex; flex-direction: column; gap: 9px; margin-top: 18px; }

.perk {
  display: flex; align-items: center; gap: 10px;
  background: rgba(255, 255, 255, .07); border-radius: 12px;
  padding: 11px 13px; font-size: 13px; font-weight: 700;
  text-align: left;
}

.price { margin-top: 18px; }

.price b { font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; }
.price i { font-style: normal; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, .6); margin-left: 5px; }

.mvp-note {
  display: flex; flex-direction: column; gap: 6px;
  margin: 18px 0 16px; padding: 13px 14px;
  border-radius: 14px; text-align: left;
  background: rgba(255, 196, 61, .14);
  border: 1px solid rgba(255, 196, 61, .35);
}

.mvp-note b { font-size: 13.5px; color: var(--gold-mid); }
.mvp-note span { font-size: 12.5px; font-weight: 600; color: rgba(255, 255, 255, .8); line-height: 1.45; }
</style>
