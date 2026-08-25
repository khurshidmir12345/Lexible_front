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

  dashboard: () => request('GET', '/dashboard'),
  coins: () => request('GET', '/coins'),
  streak: () => request('GET', '/streak'),
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

  startTest: (categoryId, types, scope) =>
    request('POST', `/categories/${categoryId}/tests`, { types, scope }),
  answer: (sessionId, data) => request('POST', `/tests/${sessionId}/answer`, data),
  finishTest: (sessionId, durationMs) =>
    request('POST', `/tests/${sessionId}/finish`, { duration_ms: durationMs }),
}
