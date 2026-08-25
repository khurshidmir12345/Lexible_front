import { telegram } from './telegram'

const BASE = window.LEXIBLE?.apiUrl ?? '/api'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function request(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      // Re-signed proof of identity on every single call — there is no session.
      'X-Telegram-Init-Data': telegram.initData,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(
      payload.message ?? payload.reason ?? `Xatolik ${response.status}`,
      response.status,
      payload,
    )
  }

  return payload
}

export const api = {
  me: () => request('GET', '/me'),
  onboard: (data) => request('POST', '/onboarding', data),
  updateMe: (data) => request('PATCH', '/me', data),
  chooseRole: (role) => request('POST', '/me/role', { role }),

  joinGroup: (code) => request('POST', '/groups/join', { code }),
  myGroups: () => request('GET', '/groups/mine'),

  teacher: {
    dashboard: () => request('GET', '/teacher/dashboard'),
    paths: () => request('GET', '/teacher/paths'),
    createPath: (title, subtitle) => request('POST', '/teacher/paths', { title, subtitle }),
    addStage: (pathId, title) => request('POST', `/teacher/paths/${pathId}/stages`, { title }),
    stage: (id) => request('GET', `/teacher/stages/${id}`),
    saveStage: (id, title, words) => request('PATCH', `/teacher/stages/${id}`, { title, words }),
    groups: () => request('GET', '/teacher/groups'),
    createGroup: (data) => request('POST', '/teacher/groups', data),
    group: (id, stage) => request('GET', `/teacher/groups/${id}${stage ? `?stage=${stage}` : ''}`),
    attachPath: (id, pathId) => request('PATCH', `/teacher/groups/${id}/path`, { path_id: pathId }),
    approve: (memberId) => request('POST', `/teacher/members/${memberId}/approve`),
    removeMember: (memberId) => request('DELETE', `/teacher/members/${memberId}`),

    openCompetition: (groupId, stageId) =>
      request('POST', `/teacher/groups/${groupId}/competitions`, { path_stage_id: stageId }),
    competition: (id) => request('GET', `/teacher/competitions/${id}`),
    startCompetition: (id) => request('POST', `/teacher/competitions/${id}/start`),
    closeCompetition: (id) => request('POST', `/teacher/competitions/${id}/close`),
    competitionResults: (id) => request('GET', `/teacher/competitions/${id}/results`),
  },

  dashboard: () => request('GET', '/dashboard'),
  coins: () => request('GET', '/coins'),
  streak: () => request('GET', '/streak'),
  notifications: () => request('GET', '/notifications'),
  readNotifications: () => request('POST', '/notifications/read'),
  road: () => request('GET', '/road'),

  category: (id) => request('GET', `/categories/${id}`),
  renameCategory: (id, title) => request('PATCH', `/categories/${id}`, { title }),
  addWord: (id, wordId) => request('POST', `/categories/${id}/words`, { word_id: wordId }),
  removeWord: (id, wordId) => request('DELETE', `/categories/${id}/words/${wordId}`),

  searchWords: (query) => request('GET', `/words/search?q=${encodeURIComponent(query)}`),
  learned: (filter = 'learned') => request('GET', `/learned?filter=${filter}`),

  createDuel: (categoryId, types) => request('POST', `/categories/${categoryId}/duels`, { types }),
  duel: (code) => request('GET', `/duels/${code}`),
  joinDuel: (code) => request('POST', `/duels/${code}/join`),
  playDuel: (code) => request('POST', `/duels/${code}/play`),
  finishDuel: (code, score, durationMs) =>
    request('POST', `/duels/${code}/finish`, { score, duration_ms: durationMs }),

  // Competitions — the teacher drives the lobby, students follow the link.
  competition: (code) => request('GET', `/competitions/${code}`),
  joinCompetition: (code) => request('POST', `/competitions/${code}/join`),
  competitionSession: (code) => request('POST', `/competitions/${code}/session`),
  finishCompetition: (code, score, total, durationMs) =>
    request('POST', `/competitions/${code}/finish`, { score, total, duration_ms: durationMs }),
  myCompetitionResults: (code) => request('GET', `/competitions/${code}/results`),

  examBriefing: (categoryId) => request('GET', `/categories/${categoryId}/exam`),
  startTest: (categoryId, types, scope) =>
    request('POST', `/categories/${categoryId}/tests`, { types, scope }),
  answer: (sessionId, data) => request('POST', `/tests/${sessionId}/answer`, data),
  finishTest: (sessionId, durationMs) =>
    request('POST', `/tests/${sessionId}/finish`, { duration_ms: durationMs }),
}
