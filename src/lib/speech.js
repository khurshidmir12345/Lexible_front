/**
 * Pronounces an English word.
 *
 * Prefers the recording the dictionary API gave us — a real human voice beats
 * the device's synthesiser — and falls back to speech synthesis when a word has
 * no audio file, which is most of them.
 */
let current = null

export function speak(word, audioUrl = null) {
  stop()

  if (audioUrl) {
    current = new Audio(audioUrl)
    current.play().catch(() => speakSynth(word))
    return
  }

  speakSynth(word)
}

function speakSynth(word) {
  try {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
  } catch {
    /* the device has no voices — silence is acceptable here */
  }
}

export function stop() {
  if (current) {
    current.pause()
    current = null
  }

  try {
    speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}
