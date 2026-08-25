// The five languages the app translates into. Tajik was in the prototype's
// picker but is out of scope, so it is not listed here.
// Flag markup is taken from the prototype unchanged.

/**
 * Round flags, the way the v2 artboards draw them: a 22px circle of
 * horizontal stripes. Two of the five are a solid field with an emblem, so
 * those carry a `dot` instead of a third stripe.
 */
export const LANGUAGES = [
  {
    code: 'uz',
    stripes: ['#0099B5', '#fff', '#1EB53A'],
    dot: null,
    name: 'Oʼzbekcha',
    short: 'oʼzb',
  },
  {
    code: 'ru',
    stripes: ['#fff', '#0039A6', '#D52B1E'],
    dot: null,
    name: 'Ruscha',
    short: 'rus',
  },
  {
    code: 'ky',
    stripes: ['#E8112D'],
    dot: '#FFEF00',
    name: 'Qirgʼizcha',
    short: 'qirgʼ',
  },
  {
    code: 'kk',
    stripes: ['#00AFCA'],
    dot: '#FFEF00',
    name: 'Qozoqcha',
    short: 'qozoq',
  },
  {
    code: 'kaa',
    stripes: ['#0099D8', '#FFD200', '#1EB53A'],
    dot: null,
    name: 'Qoraqalpoqcha',
    short: 'qoraq',
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
