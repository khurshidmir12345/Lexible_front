// SVG markup lifted verbatim from the approved prototype so the app matches it
// pixel for pixel. Rendered with v-html.

export const Ic = {
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h13v16H6a2 2 0 0 1-2-2z"/><path d="M18 4v16"/></svg>`,
  cal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>`,
  trend: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
  chev: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>`,
}

/** Bottom navigation. */
export const Nav = {
  dash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>`,
  road: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>`,
  bell: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`,
}

/** Map node badges. */
export const MapIcon = {
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>`,
  play: `<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" fill="#fff"/></svg>`,
  lock: `<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="#fff"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#fff" stroke-width="2.4" fill="none"/></svg>`,
  check: `<svg width="12" height="12" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  wave: `<svg class="wave" viewBox="0 0 102 40" preserveAspectRatio="none"><path d="M0 19 Q17 9 35 17 T70 15 T102 19 V40 H0Z" fill="rgba(255,255,255,.16)"/><path d="M0 27 Q20 18 42 25 T82 24 T102 27 V40 H0Z" fill="rgba(255,255,255,.12)"/></svg>`,
}

/** Test-type icons, used in the picker and the mastery breakdown. */
export const TI = {
  card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="13" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg>`,
  trans: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7"/><path d="M7.5 4c0 4-1.5 7-4 8"/><path d="M5 9c0 2 1.5 3.5 4 4.5"/><path d="M12.5 20l4-9 4 9"/><path d="M14 17h5"/></svg>`,
  spell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7 14h10"/></svg>`,
  img: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 15l-5-4-9 8"/></svg>`,
  match: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6.5" r="2.4"/><circle cx="18" cy="17.5" r="2.4"/><path d="M8.4 6.5H14a3.5 3.5 0 0 1 3.5 3.5v5.1"/></svg>`,
}

export const speakerIcon = `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="#fff"/><path d="M16 8a5 5 0 0 1 0 8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`

/**
 * The six exercises. `key` matches the API and the `m_<key>` mastery columns.
 * Labels adapt to the player's language: "Test · o'zb → ing" reads wrong for a
 * Kazakh speaker, so the native language name is substituted.
 */
export const TEST_TYPES = [
  { key: 'card', name: 'Karta', desc: 'Fleshkartalar — bilaman / bilmayman', icon: TI.card, bg: '#eafaef', color: '#2aa056' },
  { key: 'uz2en', name: 'Test · {lang} → ing', desc: 'Ona tilida berilib, inglizchasi tanlanadi', icon: TI.trans, bg: '#eaf3fd', color: '#2480b6' },
  { key: 'en2uz', name: 'Test · ing → {lang}', desc: 'Inglizcha berilib, tarjimasi tanlanadi', icon: TI.trans, bg: '#eaf3fd', color: '#2480b6' },
  { key: 'spell', name: 'Imlo', desc: 'Inglizchasini harflab yozish', icon: TI.spell, bg: '#fff4d9', color: '#c69400' },
  { key: 'image', name: 'Rasm', desc: "To'g'ri rasmni tanlash", icon: TI.img, bg: '#f1eafe', color: '#7d5ad6' },
  { key: 'match', name: 'Juftlash', desc: "So'z juftlarini moslash", icon: TI.match, bg: '#e6f7f2', color: '#1aa37a' },
]

export const SEASON_EMOJI = {
  spring: ['🌸', '🦋', '🌱'],
  summer: ['☀️', '🌳', '🌻'],
  autumn: ['🍁', '🍂', '🪵'],
  winter: ['❄️', '☃️', '🌨️'],
}

export const FUN_EMOJI = ['🐱', '💎', '⚡', '🎁', '🖼️']
