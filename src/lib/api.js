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

  // Accepts a group code (5A-KITOB) or a teacher ID (TCHR-2381). When the ID
  // covers several classes the reply is {status:'choose', groups:[…]} and the
  // student re-calls with the group they picked.
  joinGroup: (code, groupId = null) =>
    request('POST', '/groups/join', { code, ...(groupId ? { group_id: groupId } : {}) }),
  myGroups: () => request('GET', '/groups/mine'),
  leaveGroup: (id) => request('DELETE', `/groups/${id}/leave`),

  teacher: {
    dashboard: () => request('GET', '/teacher/dashboard'),
    profile: () => request('GET', '/teacher/profile'),

    // Paths and their stages
    paths: () => request('GET', '/teacher/paths'),
    createPath: (title, subtitle) => request('POST', '/teacher/paths', { title, subtitle }),
    renamePath: (id, title, subtitle) => request('PATCH', `/teacher/paths/${id}`, { title, subtitle }),
    deletePath: (id) => request('DELETE', `/teacher/paths/${id}`),
    addStage: (pathId, title) => request('POST', `/teacher/paths/${pathId}/stages`, { title }),
    stage: (id) => request('GET', `/teacher/stages/${id}`),
    randomWords: (count, level, excludeIds = []) =>
      request(
        'GET',
        `/teacher/words/random?count=${count}` +
          (level ? `&level=${level}` : '') +
          (excludeIds.length ? `&exclude=${excludeIds.join(',')}` : ''),
      ),
    saveStage: (id, title, words, type) =>
      request('PATCH', `/teacher/stages/${id}`, { title, words, ...(type ? { type } : {}) }),
    deleteStage: (id) => request('DELETE', `/teacher/stages/${id}`),

    // Groups
    groups: () => request('GET', '/teacher/groups'),
    createGroup: (data) => request('POST', '/teacher/groups', data),
    group: (id, stage) => request('GET', `/teacher/groups/${id}${stage ? `?stage=${stage}` : ''}`),
    updateGroup: (id, data) => request('PATCH', `/teacher/groups/${id}`, data),
    deleteGroup: (id) => request('DELETE', `/teacher/groups/${id}`),
    attachPath: (id, pathId) => request('PATCH', `/teacher/groups/${id}/path`, { path_id: pathId }),
    groupRoad: (id) => request('GET', `/teacher/groups/${id}/road`),
    stageResults: (groupId, stageId) =>
      request('GET', `/teacher/groups/${groupId}/stages/${stageId}/results`),

    // Members
    candidates: (groupId, query) =>
      request('GET', `/teacher/groups/${groupId}/candidates?q=${encodeURIComponent(query)}`),
    addMember: (groupId, userId) =>
      request('POST', `/teacher/groups/${groupId}/members`, { user_id: userId }),
    approve: (memberId) => request('POST', `/teacher/members/${memberId}/approve`),
    removeMember: (memberId) => request('DELETE', `/teacher/members/${memberId}`),

    // Contests — with a class, or open to whoever has the link
    openCompetition: (groupId, stageId) =>
      request('POST', `/teacher/groups/${groupId}/competitions`, { path_stage_id: stageId }),
    openStageCompetition: (stageId, groupId = null) =>
      request('POST', `/teacher/stages/${stageId}/competitions`, { group_id: groupId }),
    competitions: (groupId) =>
      request('GET', groupId ? `/teacher/groups/${groupId}/competitions` : '/teacher/competitions'),
    competition: (id) => request('GET', `/teacher/competitions/${id}`),
    startCompetition: (id) => request('POST', `/teacher/competitions/${id}/start`),
    closeCompetition: (id) => request('POST', `/teacher/competitions/${id}/close`),
    competitionResults: (id) => request('GET', `/teacher/competitions/${id}/results`),

    // Billing — UT-08 / UT-08b
    plan: () => request('GET', '/teacher/plan'),
    choosePlan: (seats) => request('POST', '/teacher/plan', { seats }),
    setBillingMode: (mode) => request('POST', '/teacher/plan/mode', { mode }),
    remindUnpaid: () => request('POST', '/teacher/plan/remind'),
  },

  accountImpact: () => request('GET', '/me/impact'),
  deleteAccount: () => request('DELETE', '/me'),

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
  reportWord: (data) => request('POST', '/words/report', data),
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
