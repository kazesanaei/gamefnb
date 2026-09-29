// Âm thanh tổng hợp bằng WebAudio (bản tối thiểu): tiếng bíp ngắn cho click/coin/ding/error.

const SOUNDS = {
  click: [{ f: 660, d: 0.04, type: 'square', v: 0.05 }],
  coin: [{ f: 1318, d: 0.06, type: 'triangle', v: 0.09 }, { f: 1760, d: 0.1, type: 'triangle', v: 0.08, at: 0.06 }],
  ding: [{ f: 1046, d: 0.18, type: 'sine', v: 0.12 }, { f: 1568, d: 0.25, type: 'sine', v: 0.07, at: 0.02 }],
  error: [{ f: 196, d: 0.12, type: 'sawtooth', v: 0.06 }, { f: 165, d: 0.16, type: 'sawtooth', v: 0.06, at: 0.1 }],
  bell: [{ f: 880, d: 0.12, type: 'sine', v: 0.1 }, { f: 1175, d: 0.2, type: 'sine', v: 0.08, at: 0.12 }],
  paper: [{ f: 420, d: 0.05, type: 'triangle', v: 0.06 }, { f: 520, d: 0.05, type: 'triangle', v: 0.05, at: 0.05 }]
}

/** createAudio(isEnabled) → { play(name) }. isEnabled() đọc settings.sound tại thời điểm phát. */
export function createAudio(isEnabled = () => true) {
  let ctx = null
  // Trình duyệt chỉ cho mở AudioContext sau thao tác đầu tiên của người chơi.
  let unlocked = false
  if (typeof window !== 'undefined') {
    const unlock = () => {
      unlocked = true
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
  }
  const activated = () => unlocked || !!(typeof navigator !== 'undefined' && navigator.userActivation && navigator.userActivation.hasBeenActive)
  const getCtx = () => {
    if (ctx) return ctx
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!AC) return null
    try { ctx = new AC() } catch { ctx = null }
    return ctx
  }
  return {
    play(name) {
      if (!isEnabled() || !activated()) return
      const notes = SOUNDS[name]
      if (!notes) return
      const ac = getCtx()
      if (!ac) return
      try {
        if (ac.state === 'suspended') ac.resume()
        const t0 = ac.currentTime + 0.01
        for (const n of notes) {
          const osc = ac.createOscillator()
          const gain = ac.createGain()
          osc.type = n.type
          osc.frequency.value = n.f
          const s = t0 + (n.at || 0)
          gain.gain.setValueAtTime(0.0001, s)
          gain.gain.exponentialRampToValueAtTime(n.v, s + 0.01)
          gain.gain.exponentialRampToValueAtTime(0.0001, s + n.d)
          osc.connect(gain).connect(ac.destination)
          osc.start(s)
          osc.stop(s + n.d + 0.02)
        }
      } catch { /* bỏ qua lỗi âm thanh */ }
    }
  }
}
