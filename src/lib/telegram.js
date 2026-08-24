/**
 * Wrapper around the Telegram Mini App SDK.
 *
 * Everything degrades to a no-op outside Telegram so the app can still be
 * opened in a plain browser during development.
 */
const tg = window.Telegram?.WebApp ?? null

export const telegram = {
  available: Boolean(tg?.initData),

  init() {
    if (!tg) return

    tg.ready()
    tg.expand()
    tg.disableVerticalSwipes?.()      // stops the pull-to-close gesture eating swipes
    tg.setHeaderColor?.('#eef2ee')
    tg.setBackgroundColor?.('#eef2ee')
  },

  initData: tg?.initData ?? '',

  /** `?startapp=duel_ABC123` arrives here. */
  startParam: tg?.initDataUnsafe?.start_param ?? null,

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
