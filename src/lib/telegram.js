/**
 * Wrapper around the Telegram Mini App SDK.
 *
 * Everything degrades to a no-op outside Telegram so the app can still be
 * opened in a plain browser during development.
 */
const tg = window.Telegram?.WebApp ?? null

const platform = tg?.platform ?? 'unknown'
const onPhone = platform === 'android' || platform === 'android_x' || platform === 'ios'

// Desktop and web clients — plus a plain wide browser window during development.
const onDesktop = ['tdesktop', 'macos', 'weba', 'webk', 'web'].includes(platform)
  || (!tg?.initData && window.matchMedia?.('(min-width: 760px) and (pointer: fine)').matches)

/**
 * Fullscreen leaves the page under the status bar and Telegram's own floating
 * controls. The client reports both insets; they are mirrored into CSS
 * variables the stylesheet pads with. Outside fullscreen both are zero, so
 * the rules cost nothing.
 */
function syncInsets() {
  const safe = tg?.safeAreaInset ?? {}
  const content = tg?.contentSafeAreaInset ?? {}
  const root = document.documentElement.style
  root.setProperty('--lx-safe-top', `${(safe.top ?? 0) + (content.top ?? 0)}px`)
  root.setProperty('--lx-safe-bottom', `${safe.bottom ?? 0}px`)
}

export const telegram = {
  available: Boolean(tg?.initData),

  platform,
  isPhone: onPhone,
  isDesktop: onDesktop,

  init() {
    if (!tg) return

    tg.ready()
    tg.expand()
    tg.disableVerticalSwipes?.()      // stops the pull-to-close gesture eating swipes

    tg.onEvent?.('fullscreenChanged', syncInsets)
    tg.onEvent?.('safeAreaChanged', syncInsets)
    tg.onEvent?.('contentSafeAreaChanged', syncInsets)

    // expand() still leaves Telegram's header eating the top of the screen —
    // most visibly on iOS. Bot API 8.0's fullscreen removes it on every
    // phone; fullscreen would then rotate with the device, so the portrait
    // layout locks itself. Desktop waits for the role — see fullscreen().
    if (onPhone) {
      this.fullscreen()
      try { tg.lockOrientation?.() } catch { /* not fatal */ }
    }

    syncInsets()
    this.paint(false)
  },

  /**
   * Called at init on phones, and by App.vue on desktop once the account
   * turns out to be a teacher — the desk layout wants the whole monitor,
   * while a student's phone-shaped column doesn't. Older clients fire
   * fullscreenFailed and simply stay expanded.
   */
  fullscreen() {
    if (!tg?.isVersionAtLeast?.('8.0') || tg.isFullscreen) return
    try { tg.requestFullscreen?.() } catch { /* stays expanded */ }
  },

  /** Keeps Telegram's own chrome in step with the app's theme. */
  paint(dark) {
    const shell = dark ? '#101712' : '#F0F3F0'
    tg?.setHeaderColor?.(shell)
    tg?.setBackgroundColor?.(shell)
  },

  initData: tg?.initData ?? '',

  /**
   * `?startapp=duel_ABC123` arrives here. Telegram's own start_param first;
   * failing that, the page URL — a chat-path invite opens the app through a
   * web_app button whose URL carries the code itself.
   */
  startParam: tg?.initDataUnsafe?.start_param
    ?? new URLSearchParams(window.location.search).get('startapp')
    ?? new URLSearchParams(window.location.search).get('tgWebAppStartParam')
    ?? null,

  /** True while the app was opened through a duel or class-game invite. */
  isInvite() {
    return /^(duel|comp)_[A-Za-z0-9]+$/.test(this.startParam ?? '')
  },

  /**
   * An invite is acted on exactly once. The shell that consumed it clears it,
   * so a later remount (a role switch, a settings change) does not join the
   * same duel a second time.
   */
  clearStartParam() {
    this.startParam = null
  },

  user: tg?.initDataUnsafe?.user ?? null,

  colorScheme: tg?.colorScheme ?? 'light',

  haptic(style = 'light') {
    tg?.HapticFeedback?.impactOccurred?.(style)
  },

  notify(type = 'success') {
    tg?.HapticFeedback?.notificationOccurred?.(type)
  },

  /** The native back arrow, so the app feels like part of Telegram. */
  showBack(handler) {
    if (!tg?.BackButton) return () => {}

    tg.BackButton.show()
    tg.BackButton.onClick(handler)

    return () => {
      tg.BackButton.offClick(handler)
      tg.BackButton.hide()
    }
  },

  /**
   * A direct link into the Mini App. The bot runs a *Main* Mini App, so the
   * form is `t.me/<bot>?startapp=<param>` — no short name in the path. With
   * one (`t.me/<bot>/game?...`) Telegram looks for a separately registered
   * app and, finding none, opens the chat instead of the game.
   */
  miniAppLink(startParam) {
    const bot = window.LEXIBLE?.botUsername ?? 'lexible_test_bot'
    return `https://t.me/${bot}?startapp=${startParam}`
  },

  share(url, text = '') {
    const link = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    tg?.openTelegramLink ? tg.openTelegramLink(link) : window.open(link, '_blank')
  },

  copy(text) {
    navigator.clipboard?.writeText(text).catch(() => {})
  },

  close() {
    tg?.close()
  },
}
