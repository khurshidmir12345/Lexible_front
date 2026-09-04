import { reactive, readonly } from 'vue'
import { api } from './api'
import { telegram } from './telegram'

const state = reactive({
  ready: false,
  error: null,

  user: null,
  road: [],
  paths: [],
  groups: [],
  activePath: 'personal',
  dashboard: null,

  toast: null,
  dark: false,
})

let toastTimer = null

export const store = {
  state: readonly(state),

  async boot() {
    let note = null

    try {
      const { user } = await api.me()
      state.user = user
      this.setDark(user.dark_mode)

      // A duel or class-game link is a student's business. A teacher who
      // taps one — or someone who has not picked a side yet — is moved to
      // the student app before anything renders, so the invite lands in the
      // game instead of on the teacher dashboard. Switching back is one tap
      // in the profile.
      if (telegram.isInvite() && (user.role === 'teacher' || !user.role_chosen)) {
        const wasTeacher = user.role === 'teacher'
        await this.setRole('student')
        if (wasTeacher) note = 'Taklif uchun Oʼquvchi rejimiga oʼtildi'
      }

      if (state.user.onboarded) {
        await this.refreshRoad()
        await this.refreshGroups()
      }
    } catch (error) {
      state.error = error.message
    } finally {
      state.ready = true
    }

    if (note) this.toast(note)
  },

  /** Re-reads the account; the shell in App.vue is derived from it. */
  async refreshUser() {
    const { user } = await api.me()
    state.user = user
    this.setDark(user.dark_mode)
  },

  /**
   * Class memberships, including the ones still waiting on a teacher — a
   * request the student cannot see anywhere reads as if nothing happened.
   */
  async refreshGroups() {
    try {
      state.groups = (await api.myGroups()).groups
    } catch {
      state.groups = []
    }
  },

  async refreshRoad() {
    const { nodes, paths } = await api.road()
    state.road = nodes
    state.paths = paths

    // A path the player just left should not stay selected.
    if (!paths.some((path) => path.id === state.activePath)) {
      state.activePath = 'personal'
    }
  },

  selectPath(id) {
    state.activePath = id
  },

  async refreshDashboard() {
    state.dashboard = await api.dashboard()
  },

  async completeOnboarding(answers) {
    const result = await api.onboard(answers)
    state.user = result.user
    await this.refreshRoad()
    await this.refreshGroups()

    // Carries `teacher_problem` when the ID they typed did not resolve.
    return result
  },

  async setRole(role) {
    const { user } = await api.chooseRole(role)
    state.user = user

    // The student side reads the map straight out of the store, so a teacher
    // stepping across would otherwise land on an empty road.
    if (role === 'student' && user.onboarded) {
      await this.refreshRoad().catch(() => {})
    }
  },

  async updateSettings(patch) {
    const { user } = await api.updateMe(patch)
    state.user = user

    if ('dark_mode' in patch) {
      this.setDark(patch.dark_mode)
    }
  },

  setDark(on) {
    // The root component binds the `dark` class; Telegram's own header and
    // background have to be told separately or the app floats on a pale strip.
    state.dark = Boolean(on)
    telegram.paint(state.dark)
  },

  node(id) {
    return state.road.find((n) => n.id === id) ?? null
  },

  /** Patch one map node in place so the map does not have to be refetched. */
  patchNode(id, changes) {
    const node = state.road.find((n) => n.id === id)
    if (node) Object.assign(node, changes)
  },

  toast(message) {
    state.toast = message
    telegram.haptic()

    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      state.toast = null
    }, 2400)
  },
}
