import { reactive, readonly } from 'vue'
import { api } from './api'
import { telegram } from './telegram'

const state = reactive({
  ready: false,
  error: null,

  user: null,
  road: [],
  paths: [],
  activePath: 'personal',
  dashboard: null,

  toast: null,
  dark: false,
})

let toastTimer = null

export const store = {
  state: readonly(state),

  async boot() {
    try {
      const { user } = await api.me()
      state.user = user
      this.setDark(user.dark_mode)

      if (user.onboarded) {
        await this.refreshRoad()
      }
    } catch (error) {
      state.error = error.message
    } finally {
      state.ready = true
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
    const { user } = await api.onboard(answers)
    state.user = user
    await this.refreshRoad()
  },

  async setRole(role) {
    const { user } = await api.chooseRole(role)
    state.user = user
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
