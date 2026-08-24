# Lexible — frontend

Telegram Mini App uchun interfeys. Vue 3 + Vite.

## Ishga tushirish

```bash
npm install
npm run dev          # http://localhost:5173, /api so'rovlari 127.0.0.1:8123 ga uzatiladi
```

Backend alohida repoda: [Lexible_back](https://github.com/taqseemuz/Lexible_back)

## Yig'ish

```bash
npm run build        # dist/ papkasiga yig'adi
```

`dist/` serverda `/var/www/lexible/frontend/dist` bo'lib turadi va nginx uni
`/app-assets/` manzilida beradi. Laravel faqat `dist/.vite/manifest.json`
faylini o'qib, fayl nomlarini biladi — shuning uchun ikkala loyiha bir-biridan
mustaqil deploy qilinadi.

## Tuzilma

```
src/
  lib/         telegram.js, api.js, store.js, speech.js, icons.js, languages.js
  styles/      app.css  (prototip dizayni, o'zgarishsiz)
               mount.css (Vue mount nuqtasi uchun tuzatish)
  components/
    onboarding/  Onboarding.vue
    app/         AppShell, RoadMap, Dashboard, Profile
    category/    CategoryView, AddWords, WordDetail, MasteryDetail, TestPicker
    test/        TestRunner.vue
    ui/          Mascot, Modal, Toast
```

## Dizayn

`src/styles/app.css` — tasdiqlangan prototipdan o'zgarishsiz ko'chirilgan.
Rang va shriftlarni o'zgartirish kerak bo'lsa, shu fayldagi `:root`
o'zgaruvchilaridan boshlang.
