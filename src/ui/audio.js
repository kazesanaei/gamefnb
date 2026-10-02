// Âm thanh tổng hợp bằng WebAudio (không dùng file âm thanh).
// Âm: click, coin (tiền vào túi), cash (tiền vào két), ding (Hoàn hảo), bell (chuông ra món / khách tới),
// chop (dao thái "tách"), sizzle (dầu "xèo"), pour (rót nước), error (lỗi), nudge (nhắc nhẹ), chest (mở rương), paper (giấy).
// M5: stamp (con dấu "cộp"), sparkle (lấp lánh), fanfare (kèn mừng ra món), tick (tích đếm số), whoosh (vút bay).
// M5 Đợt 1 (âm thao tác của 5 trò mới): crack (đập trứng "cạch"), stir (muỗng chạm thành tô), peel (gọt vỏ "sột"),
// shake (đá lách cách khi lắc), plop (thả đá "tõm").
// Âm M5 lệch cao độ ngẫu nhiên khoảng ±4% mỗi lần phát để nghe không lặp đều (âm giao diện, được dùng Math.random).
// Giao diện luôn gọi bằng tên viết thẳng sound('…') để test âm (tests/unit/audio.test.mjs) quét được.
// AudioContext chỉ tạo sau thao tác đầu tiên của người chơi; trình duyệt chặn âm thanh thì im lặng, không báo lỗi.
// Mọi âm luôn có tín hiệu hình đi kèm ở giao diện (âm thanh chỉ là phần thêm).

export const SOUND_NAMES = Object.freeze(['click', 'coin', 'cash', 'ding', 'bell', 'chop', 'sizzle', 'pour', 'error', 'nudge', 'chest', 'paper',
  'stamp', 'sparkle', 'fanfare', 'tick', 'whoosh',
  'crack', 'stir', 'peel', 'shake', 'plop'])
// Âm thao tác M5 Đợt 1 (dap → crack, xoay → stir, got → peel, lac → shake, bay → plop).
export const ACTION_SOUNDS = Object.freeze({ dap: 'crack', xoay: 'stir', got: 'peel', lac: 'shake', bay: 'plop' })

// Âm lượng tổng tối đa (trước khi nhân âm lượng trong Cài đặt): tránh chói tai trên loa điện thoại.
const MASTER_MAX = 0.9
const NOISE_SEC = 1.5

// ---------- Khối dựng âm ----------

// Nốt dao động: f (Hz), f2 (trượt tới), type, d (giây), v (âm lượng đỉnh), at (trễ), attack, filter {type, f, q}.
function tone(ac, dest, t0, n) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = n.type || 'sine'
  const s = t0 + (n.at || 0)
  const attack = n.attack ?? 0.008
  osc.frequency.setValueAtTime(n.f, s)
  if (n.f2) osc.frequency.exponentialRampToValueAtTime(n.f2, s + (n.glide ?? n.d))
  gain.gain.setValueAtTime(0.0001, s)
  gain.gain.exponentialRampToValueAtTime(n.v, s + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, s + n.d)
  let node = osc
  if (n.filter) {
    const flt = ac.createBiquadFilter()
    flt.type = n.filter.type || 'lowpass'
    flt.frequency.setValueAtTime(n.filter.f, s)
    if (n.filter.q) flt.Q.setValueAtTime(n.filter.q, s)
    node.connect(flt)
    node = flt
  }
  node.connect(gain)
  gain.connect(dest)
  osc.start(s)
  osc.stop(s + n.d + 0.03)
  return osc
}

// Tiếng ồn trắng qua bộ lọc: filter {type, f, f2 (quét tới), q}, env: 'decay' | 'swell' | 'flat', crackle: lách tách.
function noise(ac, dest, t0, buffer, n) {
  const src = ac.createBufferSource()
  src.buffer = buffer
  const s = t0 + (n.at || 0)
  const flt = ac.createBiquadFilter()
  flt.type = (n.filter && n.filter.type) || 'bandpass'
  flt.frequency.setValueAtTime((n.filter && n.filter.f) || 2000, s)
  if (n.filter && n.filter.f2) flt.frequency.exponentialRampToValueAtTime(n.filter.f2, s + n.d)
  if (n.filter && n.filter.q) flt.Q.setValueAtTime(n.filter.q, s)
  const gain = ac.createGain()
  const attack = n.attack ?? 0.004
  gain.gain.setValueAtTime(0.0001, s)
  if (n.env === 'swell') {
    gain.gain.exponentialRampToValueAtTime(n.v * 0.4, s + attack)
    gain.gain.linearRampToValueAtTime(n.v, s + n.d * 0.6)
  } else if (n.env === 'flat') {
    gain.gain.exponentialRampToValueAtTime(n.v, s + attack)
    gain.gain.setValueAtTime(n.v, s + n.d * 0.7)
  } else {
    gain.gain.exponentialRampToValueAtTime(n.v, s + attack)
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, s + n.d)
  src.connect(flt)
  flt.connect(gain)
  gain.connect(dest)
  // mỗi lần phát bắt đầu ở một đoạn khác của bộ đệm để tiếng không lặp y hệt
  const offset = n.offset ?? Math.random() * Math.max(0, NOISE_SEC - n.d - 0.05)
  src.start(s, offset, n.d + 0.02)
  return src
}

// ---------- Công thức từng âm ----------
// Hệ số lệch cao độ ngẫu nhiên ±4% (âm M5).
const jitter = () => 1 + (Math.random() * 2 - 1) * 0.04

// Mỗi âm là hàm (ac, dest, t0, buf) dựng nút và trả số nút nguồn đã tạo.
const RECIPES = {
  click: (ac, d, t) => [tone(ac, d, t, { f: 720, d: 0.045, type: 'triangle', v: 0.09 })],
  paper: (ac, d, t, buf) => [
    noise(ac, d, t, buf, { d: 0.07, v: 0.1, filter: { type: 'highpass', f: 2500 } }),
    noise(ac, d, t, buf, { d: 0.06, v: 0.07, at: 0.07, filter: { type: 'highpass', f: 3200 } })
  ],
  // tiền vào túi / nhận thưởng: hai nốt leng keng
  coin: (ac, d, t) => [
    tone(ac, d, t, { f: 1318, d: 0.08, type: 'triangle', v: 0.1 }),
    tone(ac, d, t, { f: 1760, d: 0.22, type: 'triangle', v: 0.09, at: 0.07 })
  ],
  // tiền vào két: tiếng ngăn kéo "cạch" + chuông két "keng"
  cash: (ac, d, t, buf) => [
    noise(ac, d, t, buf, { d: 0.05, v: 0.14, filter: { type: 'bandpass', f: 1400, q: 1.2 } }),
    tone(ac, d, t, { f: 2093, d: 0.35, type: 'sine', v: 0.08, at: 0.05 }),
    tone(ac, d, t, { f: 2637, d: 0.3, type: 'sine', v: 0.05, at: 0.06 })
  ],
  // Hoàn hảo: chuông trong, có bồi âm
  ding: (ac, d, t) => [
    tone(ac, d, t, { f: 1046.5, d: 0.5, type: 'sine', v: 0.13 }),
    tone(ac, d, t, { f: 1568, d: 0.4, type: 'sine', v: 0.07, at: 0.015 }),
    tone(ac, d, t, { f: 2093, d: 0.28, type: 'sine', v: 0.04, at: 0.03 })
  ],
  // chuông quầy ra món: bồi âm không điều hòa, ngân dài
  bell: (ac, d, t) => [
    tone(ac, d, t, { f: 1320, d: 0.8, type: 'sine', v: 0.11, attack: 0.003 }),
    tone(ac, d, t, { f: 3643, d: 0.35, type: 'sine', v: 0.035, attack: 0.003 }),
    tone(ac, d, t, { f: 2210, d: 0.5, type: 'sine', v: 0.03, attack: 0.003 })
  ],
  // dao thái "tách": tiếng gõ gỗ ngắn + lưỡi dao
  chop: (ac, d, t, buf) => [
    noise(ac, d, t, buf, { d: 0.035, v: 0.2, filter: { type: 'bandpass', f: 2600, q: 2 }, attack: 0.002 }),
    tone(ac, d, t, { f: 260, f2: 90, d: 0.07, type: 'triangle', v: 0.16, attack: 0.002, glide: 0.05 })
  ],
  // dầu "xèo": ồn cao tần lách tách, nhỏ dần
  sizzle: (ac, d, t, buf) => [
    noise(ac, d, t, buf, { d: 1.1, v: 0.09, env: 'flat', filter: { type: 'highpass', f: 3800, q: 0.7 }, attack: 0.03 }),
    noise(ac, d, t, buf, { d: 0.5, v: 0.07, filter: { type: 'bandpass', f: 6000, f2: 4200, q: 1.5 }, at: 0.02 })
  ],
  // rót nước: ồn dải hẹp quét lên như cốc đầy dần
  pour: (ac, d, t, buf) => [
    noise(ac, d, t, buf, { d: 0.7, v: 0.12, env: 'swell', filter: { type: 'bandpass', f: 500, f2: 1500, q: 4 }, attack: 0.04 }),
    tone(ac, d, t, { f: 420, f2: 900, d: 0.6, type: 'sine', v: 0.025, attack: 0.05 })
  ],
  // lỗi: hai nốt trầm đi xuống, đã lọc bớt gắt
  error: (ac, d, t) => [
    tone(ac, d, t, { f: 220, d: 0.13, type: 'sawtooth', v: 0.07, filter: { type: 'lowpass', f: 900 } }),
    tone(ac, d, t, { f: 165, d: 0.2, type: 'sawtooth', v: 0.07, at: 0.11, filter: { type: 'lowpass', f: 800 } })
  ],
  // nhắc nhẹ: hai nốt mềm
  nudge: (ac, d, t) => [
    tone(ac, d, t, { f: 659, d: 0.14, type: 'sine', v: 0.07 }),
    tone(ac, d, t, { f: 523, d: 0.2, type: 'sine', v: 0.06, at: 0.12 })
  ],
  // mở rương: tiếng nắp bật + chuỗi nốt đi lên lấp lánh
  chest: (ac, d, t, buf) => [
    noise(ac, d, t, buf, { d: 0.08, v: 0.12, filter: { type: 'lowpass', f: 900 } }),
    ...[523.3, 659.3, 784, 1046.5].map((f, i) => tone(ac, d, t, { f, d: 0.22, type: 'triangle', v: 0.08, at: 0.06 + i * 0.07 })),
    tone(ac, d, t, { f: 2093, d: 0.45, type: 'sine', v: 0.05, at: 0.36 }),
    tone(ac, d, t, { f: 3136, d: 0.35, type: 'sine', v: 0.03, at: 0.4 })
  ],
  // ---------- M5 ----------
  // con dấu đập xuống giấy: tiếng "cộp" trầm (ồn lọc thấp 400Hz 60ms) + thân dấu 140Hz
  stamp: (ac, d, t, buf) => {
    const j = jitter()
    return [
      noise(ac, d, t, buf, { d: 0.06, v: 0.24, filter: { type: 'lowpass', f: 400 * j, q: 0.8 }, attack: 0.002 }),
      tone(ac, d, t, { f: 140 * j, f2: 105 * j, d: 0.13, type: 'sine', v: 0.2, attack: 0.002, glide: 0.1 })
    ]
  },
  // lấp lánh: 3 nốt tam giác cao, so le 50ms
  sparkle: (ac, d, t) => {
    const j = jitter()
    return [1568, 2093, 2637].map((f, i) => tone(ac, d, t, { f: f * j, d: 0.2, type: 'triangle', v: 0.06, at: i * 0.05, attack: 0.004 }))
  },
  // kèn mừng ra món: Đô5 - Mi5 - Sol5 - Đô6 so le 90ms, nốt cuối ngân và có bồi âm
  fanfare: (ac, d, t) => {
    const j = jitter()
    const notes = [523.25, 659.25, 783.99, 1046.5]
    return [
      ...notes.map((f, i) => tone(ac, d, t, { f: f * j, d: i === notes.length - 1 ? 0.55 : 0.16, type: 'triangle', v: 0.1, at: i * 0.09, attack: 0.006 })),
      tone(ac, d, t, { f: 2093 * j, d: 0.45, type: 'sine', v: 0.035, at: 0.29, attack: 0.01 })
    ]
  },
  // tích đếm số: 1kHz ngắn 18ms
  tick: (ac, d, t) => [tone(ac, d, t, { f: 1000 * jitter(), d: 0.018, type: 'triangle', v: 0.08, attack: 0.002 })],
  // vút bay: ồn dải hẹp quét 600 → 2400Hz trong 250ms
  whoosh: (ac, d, t, buf) => {
    const j = jitter()
    return [noise(ac, d, t, buf, { d: 0.25, v: 0.13, env: 'swell', filter: { type: 'bandpass', f: 600 * j, f2: 2400 * j, q: 1.4 }, attack: 0.03 })]
  },
  // ---------- M5 Đợt 1: âm thao tác ----------
  // đập trứng "cạch": ồn lọc cao 3kHz 30ms + tiếng click vỏ trứng
  crack: (ac, d, t, buf) => {
    const j = jitter()
    return [
      noise(ac, d, t, buf, { d: 0.03, v: 0.22, filter: { type: 'highpass', f: 3000 * j, q: 0.9 }, attack: 0.001 }),
      tone(ac, d, t, { f: 1900 * j, f2: 1100 * j, d: 0.022, type: 'square', v: 0.05, attack: 0.001, glide: 0.018, filter: { type: 'lowpass', f: 4200 } }),
      noise(ac, d, t, buf, { d: 0.02, v: 0.08, at: 0.018, filter: { type: 'bandpass', f: 5200 * j, q: 2.5 }, attack: 0.001 })
    ]
  },
  // khuấy "keng": muỗng chạm thành tô sứ — hai bồi âm không điều hòa ngắn, tắt nhanh, kèm tiếng gõ nhỏ
  stir: (ac, d, t, buf) => {
    const j = jitter()
    return [
      noise(ac, d, t, buf, { d: 0.015, v: 0.07, filter: { type: 'bandpass', f: 3400 * j, q: 3 }, attack: 0.001 }),
      tone(ac, d, t, { f: 2450 * j, d: 0.11, type: 'sine', v: 0.075, attack: 0.002 }),
      tone(ac, d, t, { f: 3870 * j, d: 0.07, type: 'sine', v: 0.035, attack: 0.002 }),
      tone(ac, d, t, { f: 6120 * j, d: 0.04, type: 'sine', v: 0.015, attack: 0.002 })
    ]
  },
  // gọt vỏ "sột": ồn dải hẹp quét 1,5 → 3kHz trong 120ms
  peel: (ac, d, t, buf) => {
    const j = jitter()
    return [noise(ac, d, t, buf, { d: 0.12, v: 0.15, env: 'swell', filter: { type: 'bandpass', f: 1500 * j, f2: 3000 * j, q: 2.2 }, attack: 0.012 })]
  },
  // lắc bình: 3 tiếng đá chạm nhau lách cách, so le, mỗi tiếng một cao độ
  shake: (ac, d, t, buf) => {
    const j = jitter()
    const hits = [[0, 2900, 0.11], [0.065, 3600, 0.09], [0.125, 3150, 0.1]]
    const out = []
    for (const [at, f, v] of hits) {
      out.push(noise(ac, d, t, buf, { d: 0.022, v: v * 0.9, at, filter: { type: 'bandpass', f: f * 1.7 * j, q: 3 }, attack: 0.001 }))
      out.push(tone(ac, d, t, { f: f * j, d: 0.045, type: 'triangle', v: v * 0.45, at, attack: 0.001 }))
    }
    return out
  },
  // thả viên đá / món "tõm": tiếng trầm trượt 300 → 120Hz + ồn nước ngắn
  plop: (ac, d, t, buf) => {
    const j = jitter()
    return [
      tone(ac, d, t, { f: 300 * j, f2: 120 * j, d: 0.14, type: 'sine', v: 0.2, attack: 0.003, glide: 0.09 }),
      noise(ac, d, t, buf, { d: 0.06, v: 0.06, filter: { type: 'lowpass', f: 1200 * j, q: 0.8 }, attack: 0.002 }),
      noise(ac, d, t, buf, { d: 0.05, v: 0.035, at: 0.05, filter: { type: 'bandpass', f: 2600 * j, q: 1.6 }, attack: 0.004 })
    ]
  }
}

/**
 * createAudio(getSettings, env?) → { play(name) → boolean, unlock(), ready(), names }
 * getSettings() → { sound: boolean, volume: 0..1 } đọc tại thời điểm phát (tôn trọng Cài đặt).
 * env: đối tượng toàn cục (mặc định globalThis; test truyền môi trường giả có AudioContext).
 * play trả true khi đã dựng âm (false: tắt tiếng, chưa có thao tác người chơi, trình duyệt không hỗ trợ/chặn).
 */
export function createAudio(getSettings = () => ({ sound: true, volume: 0.8 }), env = globalThis) {
  const win = env && (env.window || env)
  let ctx = null
  let master = null
  let noiseBuf = null
  let broken = false
  let unlocked = false

  const settings = () => {
    try { return getSettings() || {} } catch { return {} }
  }
  const enabled = () => {
    const s = settings()
    return s.sound !== false && volumeOf(s) > 0
  }
  const activated = () => unlocked || !!(env.navigator && env.navigator.userActivation && env.navigator.userActivation.hasBeenActive)

  function getCtx() {
    if (ctx || broken) return ctx
    const AC = win && (win.AudioContext || win.webkitAudioContext)
    if (!AC) { broken = true; return null }
    try {
      ctx = new AC()
      master = ctx.createGain()
      master.connect(ctx.destination)
      // bộ đệm ồn trắng dùng chung (dầu xèo, rót nước, dao thái)
      const len = Math.floor(ctx.sampleRate * NOISE_SEC)
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
      const ch = noiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1
    } catch {
      ctx = null
      master = null
      broken = true
    }
    return ctx
  }

  function resume() {
    try {
      if (ctx && ctx.state === 'suspended') {
        const p = ctx.resume()
        if (p && typeof p.catch === 'function') p.catch(() => {})
      }
    } catch { /* trình duyệt chặn: bỏ qua */ }
  }

  // Thao tác đầu tiên của người chơi: mở khóa âm thanh (tạo AudioContext nếu đang bật tiếng).
  function unlock() {
    unlocked = true
    if (!enabled()) return
    if (getCtx()) resume()
  }

  // Nghe thao tác của người chơi tới khi AudioContext thật sự chạy (iOS mở khóa không đồng bộ, có khi cần lần chạm sau).
  const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'keydown']
  if (win && typeof win.addEventListener === 'function') {
    const onGesture = () => {
      unlock()
      if (ctx && ctx.state === 'running') for (const t of UNLOCK_EVENTS) win.removeEventListener(t, onGesture, true)
    }
    for (const t of UNLOCK_EVENTS) win.addEventListener(t, onGesture, true)
  }

  return {
    names: SOUND_NAMES,
    unlock,
    ready() { return !!ctx && ctx.state !== 'closed' },
    play(name) {
      const recipe = RECIPES[name]
      if (!recipe || !enabled() || !activated()) return false
      const ac = getCtx()
      if (!ac) return false
      try {
        resume()
        master.gain.setValueAtTime(MASTER_MAX * volumeOf(settings()), ac.currentTime)
        recipe(ac, master, ac.currentTime + 0.005, noiseBuf)
        return true
      } catch {
        return false        // bỏ qua lỗi âm thanh: game vẫn chơi bình thường
      }
    }
  }
}

// Âm lượng trong Cài đặt (0..1, mặc định 0,8).
export function volumeOf(s) {
  const v = Number(s && s.volume)
  if (!Number.isFinite(v)) return 0.8
  return Math.max(0, Math.min(1, v))
}
