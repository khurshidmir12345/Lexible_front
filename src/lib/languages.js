// The five languages the app translates into. Tajik was in the prototype's
// picker but is out of scope, so it is not listed here.
// Flag markup is taken from the prototype unchanged.

export const LANGUAGES = [
  {
    code: 'uz',
    name: 'Oʼzbekcha',
    short: 'oʼzb',
    flag: `<svg class="flag" viewBox="0 0 30 20" preserveAspectRatio="none"><rect width="30" height="20" fill="#fff"/><rect width="30" height="6" fill="#1eb0d7"/><rect y="14" width="30" height="6" fill="#1eb53a"/><rect y="6" width="30" height="0.7" fill="#ce1126"/><rect y="13.3" width="30" height="0.7" fill="#ce1126"/><circle cx="5" cy="3" r="1.9" fill="#fff"/><circle cx="5.9" cy="2.7" r="1.9" fill="#1eb0d7"/></svg>`,
  },
  {
    code: 'ru',
    name: 'Ruscha',
    short: 'rus',
    flag: `<svg class="flag" viewBox="0 0 30 20" preserveAspectRatio="none"><rect width="30" height="20" fill="#fff"/><rect y="6.66" width="30" height="6.66" fill="#0039a6"/><rect y="13.33" width="30" height="6.67" fill="#d52b1e"/></svg>`,
  },
  {
    code: 'ky',
    name: 'Qirgʼizcha',
    short: 'qirgʼ',
    flag: `<svg class="flag" viewBox="0 0 30 20" preserveAspectRatio="none"><rect width="30" height="20" fill="#e8112d"/><circle cx="15" cy="10" r="4" fill="#ffef00"/><g stroke="#ffef00" stroke-width="0.8"><line x1="15" y1="3.5" x2="15" y2="16.5"/><line x1="8.5" y1="10" x2="21.5" y2="10"/><line x1="10.4" y1="5.4" x2="19.6" y2="14.6"/><line x1="19.6" y1="5.4" x2="10.4" y2="14.6"/></g><circle cx="15" cy="10" r="4" fill="#ffef00"/></svg>`,
  },
  {
    code: 'kk',
    name: 'Qozoqcha',
    short: 'qozoq',
    flag: `<svg class="flag" viewBox="0 0 30 20" preserveAspectRatio="none"><rect width="30" height="20" fill="#00afca"/><rect width="2.4" height="20" fill="#f8c300"/><circle cx="16" cy="9" r="3" fill="#f8c300"/></svg>`,
  },
  {
    code: 'kaa',
    name: 'Qoraqalpoqcha',
    short: 'qoraq',
    flag: `<svg class="flag" viewBox="0 0 30 20" preserveAspectRatio="none"><rect width="30" height="20" fill="#ffd200"/><rect width="30" height="6.2" fill="#0099d8"/><rect y="13.8" width="30" height="6.2" fill="#1eb53a"/><circle cx="5" cy="3.1" r="1.9" fill="#fff"/><circle cx="5.9" cy="2.8" r="1.9" fill="#0099d8"/></svg>`,
  },
]

export const languageName = (code) =>
  LANGUAGES.find((l) => l.code === code)?.name ?? code

export const languageShort = (code) =>
  LANGUAGES.find((l) => l.code === code)?.short ?? code

export const WEEKDAYS = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya']

export const LEVELS = [
  { code: 'A0', value: 'Starter', hint: 'endi boshlayapman' },
  { code: 'A1', value: 'Beginner', hint: 'bir nechta soʼz bilaman' },
  { code: 'A2', value: 'Elementary', hint: 'kundalik soʼzlarni bilaman' },
  { code: 'B1', value: 'Pre-Intermediate', hint: 'gaplasha olaman' },
  { code: 'B2', value: 'Intermediate', hint: 'erkin oʼqiyman' },
  { code: 'C1', value: 'Upper-Intermediate', hint: 'deyarli ravon' },
]

export const GOALS = [
  { value: 5, title: 'Bemalol' },
  { value: 10, title: 'Oddiy' },
  { value: 15, title: 'Jiddiy' },
  { value: 20, title: 'Olov 🔥' },
]

export const TIMES = [
  { value: '08:00', label: 'Ertalab' },
  { value: '13:00', label: 'Tushlik' },
  { value: '19:00', label: 'Kechqurun' },
  { value: '21:00', label: 'Kech' },
]
