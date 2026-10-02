// Âm thanh WebAudio tổng hợp (M3): đủ các âm cần có, chỉ tạo AudioContext sau thao tác đầu tiên, tôn trọng Cài đặt
// (tắt tiếng, âm lượng), không lỗi khi trình duyệt không hỗ trợ/chặn; mọi tên âm giao diện gọi đều tồn tại.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAudio, SOUND_NAMES, volumeOf } from '../../src/ui/audio.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

// AudioParam / nút giả ghi lại lời gọi.
function param(v = 0) {
  return {
    value: v, calls: [],
    setValueAtTime(x, t) { this.calls.push(['set', x, t]); this.value = x },
    linearRampToValueAtTime(x, t) { this.calls.push(['lin', x, t]) },
    exponentialRampToValueAtTime(x, t) {
      if (!(x > 0)) throw new RangeError('exponentialRamp cần giá trị dương')
      this.calls.push(['exp', x, t])
    }
  }
}

function fakeEnv({ withAC = true, throwOnCreate = false, resumeRejects = false, state = 'running' } = {}) {
  const log = { contexts: 0, oscillators: 0, sources: 0, filters: 0, gains: [], started: [] }
  const listeners = {}
  class FakeAC {
    constructor() {
      if (throwOnCreate) throw new Error('bị chặn')
      log.contexts++
      this.state = state
      this.currentTime = 1
      this.sampleRate = 8000
      this.destination = { name: 'loa' }
    }
    resume() { this.state = 'running'; return resumeRejects ? Promise.reject(new Error('chặn')) : Promise.resolve() }
    node(extra = {}) { return { connect(n) { return n }, ...extra } }
    createGain() { const g = this.node({ gain: param(1) }); log.gains.push(g); return g }
    createOscillator() {
      log.oscillators++
      return this.node({ type: 'sine', frequency: param(440), start: t => log.started.push(t), stop() {} })
    }
    createBiquadFilter() { log.filters++; return this.node({ type: 'lowpass', frequency: param(350), Q: param(1) }) }
    createBufferSource() {
      log.sources++
      return this.node({ buffer: null, start: (t, off, d) => { assert.ok(off >= 0 && d > 0); log.started.push(t) } })
    }
    createBuffer(ch, len) { const data = new Float32Array(len); return { getChannelData: () => data, length: len } }
  }
  const win = {
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn) },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter(f => f !== fn) },
    fire(type) { for (const fn of [...(listeners[type] || [])]) fn({ type }) },
    listeners
  }
  if (withAC) win.AudioContext = FakeAC
  return { env: { window: win, navigator: {} }, win, log }
}

test('có đủ các âm: click, tiền, Hoàn hảo, chuông ra món, dao thái, dầu xèo, rót nước, lỗi/nhắc, mở rương (≥ 8 âm)', () => {
  for (const n of ['click', 'coin', 'cash', 'ding', 'bell', 'chop', 'sizzle', 'pour', 'error', 'nudge', 'chest']) {
    assert.ok(SOUND_NAMES.includes(n), 'thiếu âm ' + n)
  }
  assert.ok(SOUND_NAMES.length >= 8)
})

test('chưa có thao tác của người chơi: không tạo AudioContext, không phát', () => {
  const { env, log } = fakeEnv()
  const audio = createAudio(() => ({ sound: true, volume: 0.8 }), env)
  assert.equal(audio.play('click'), false)
  assert.equal(log.contexts, 0)
  assert.equal(audio.ready(), false)
})

test('sau thao tác đầu tiên: tạo 1 AudioContext, mọi âm dựng được nút, âm lượng theo Cài đặt', () => {
  const { env, win, log } = fakeEnv({ state: 'suspended' })
  const settings = { sound: true, volume: 0.5 }
  const audio = createAudio(() => settings, env)
  win.fire('pointerdown')
  assert.equal(log.contexts, 1)
  assert.equal(audio.ready(), true)
  assert.equal((win.listeners.pointerdown || []).length, 0, 'gỡ bộ nghe sau lần đầu')
  for (const name of SOUND_NAMES) {
    const before = log.oscillators + log.sources
    assert.equal(audio.play(name), true, name)
    assert.ok(log.oscillators + log.sources > before, name + ' không dựng nút nào')
  }
  assert.equal(log.contexts, 1, 'chỉ 1 AudioContext')
  const master = log.gains[0]
  assert.ok(Math.abs(master.gain.value - 0.9 * 0.5) < 1e-9, 'âm lượng tổng = 0,9 × âm lượng cài đặt')
  settings.volume = 1
  audio.play('ding')
  assert.ok(Math.abs(master.gain.value - 0.9) < 1e-9)
  assert.ok(log.started.every(t => t >= 1), 'mọi nút bắt đầu từ currentTime trở đi')
})

test('tôn trọng Cài đặt: tắt tiếng hoặc âm lượng 0 thì không phát; tên âm lạ bỏ qua', () => {
  const { env, win, log } = fakeEnv()
  const settings = { sound: false, volume: 0.8 }
  const audio = createAudio(() => settings, env)
  win.fire('keydown')
  assert.equal(log.contexts, 0, 'đang tắt tiếng thì chưa tạo AudioContext')
  assert.equal(audio.play('coin'), false)
  settings.sound = true
  settings.volume = 0
  assert.equal(audio.play('coin'), false)
  settings.volume = 0.7
  assert.equal(audio.play('coin'), true, 'bật lại thì phát (người chơi đã thao tác)')
  assert.equal(audio.play('khong_co_am_nay'), false)
  assert.equal(volumeOf({}), 0.8)
  assert.equal(volumeOf({ volume: 2 }), 1)
  assert.equal(volumeOf({ volume: -1 }), 0)
})

test('trình duyệt không hỗ trợ / chặn âm thanh: không ném lỗi', async () => {
  const none = fakeEnv({ withAC: false })
  const a1 = createAudio(() => ({ sound: true }), none.env)
  none.win.fire('pointerdown')
  assert.equal(a1.play('bell'), false)
  const blocked = fakeEnv({ throwOnCreate: true })
  const a2 = createAudio(() => ({ sound: true }), blocked.env)
  blocked.win.fire('pointerdown')
  assert.equal(a2.play('bell'), false)
  const rejecting = fakeEnv({ state: 'suspended', resumeRejects: true })
  const a3 = createAudio(() => ({ sound: true }), rejecting.env)
  rejecting.win.fire('pointerdown')
  assert.doesNotThrow(() => a3.play('chop'))
  // getSettings lỗi cũng không làm hỏng
  const a4 = createAudio(() => { throw new Error('x') }, fakeEnv().env)
  assert.doesNotThrow(() => a4.play('click'))
  // môi trường Node thật (không có window)
  assert.doesNotThrow(() => createAudio(() => ({ sound: true }), {}).play('click'))
  await new Promise(r => setTimeout(r, 5))   // để lời hứa resume bị từ chối (đã bắt) chạy xong
})

test('mọi âm giao diện gọi (app.sound, sound(), feedback của mini-game) đều có trong SOUND_NAMES', () => {
  const files = []
  const walk = dir => {
    for (const n of readdirSync(dir)) {
      const p = path.join(dir, n)
      if (statSync(p).isDirectory()) walk(p)
      else if (n.endsWith('.js')) files.push(p)
    }
  }
  walk(path.join(ROOT, 'src', 'ui'))
  const used = new Set()
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    for (const m of text.matchAll(/\bsound\(\s*'([a-z_]+)'\s*\)/g)) used.add(m[1])
    for (const m of text.matchAll(/\bsound\(\s*[^)]*\?\s*'([a-z_]+)'\s*:\s*(?:[^)]*\?\s*)?'([a-z_]+)'(?:\s*:\s*'([a-z_]+)')?/g)) {
      for (const x of m.slice(1)) if (x) used.add(x)
    }
  }
  // bảng feedback của mini-game: kind → [âm, rung]
  const util = readFileSync(path.join(ROOT, 'src/ui/minigames/_util.js'), 'utf8')
  for (const m of util.matchAll(/\b[a-z]+: \['([a-z_]+)', \d+\]/g)) used.add(m[1])
  assert.ok(used.size >= 8, 'quét được quá ít: ' + [...used].join(', '))
  const missing = [...used].filter(n => !SOUND_NAMES.includes(n))
  assert.deepEqual(missing, [], 'âm chưa có: ' + missing.join(', '))
  for (const n of ['chop', 'sizzle', 'pour', 'chest', 'cash', 'nudge', 'bell', 'ding']) assert.ok(used.has(n), 'chưa gắn âm ' + n + ' vào giao diện')
})

// ---------- M5 Đợt 1: 5 âm thao tác (crack, stir, peel, shake, plop) ----------

// Môi trường âm thanh giả ghi lại từng nút (bộ lọc, dao động, nguồn ồn) cùng các lời gọi tham số của nó.
function recordingEnv() {
  const nodes = []
  const param = v => ({
    value: v, calls: [],
    setValueAtTime(x, t) { this.calls.push(['set', x, t]); this.value = x },
    linearRampToValueAtTime(x, t) { this.calls.push(['lin', x, t]) },
    exponentialRampToValueAtTime(x, t) {
      if (!(x > 0)) throw new RangeError('exponentialRamp cần giá trị dương')
      this.calls.push(['exp', x, t])
    }
  })
  class AC {
    constructor() { this.state = 'running'; this.currentTime = 2; this.sampleRate = 8000; this.destination = {} }
    resume() { return Promise.resolve() }
    mk(kind, extra) { const n = { kind, connect: x => x, ...extra }; nodes.push(n); return n }
    createGain() { return this.mk('gain', { gain: param(1) }) }
    createOscillator() { return this.mk('osc', { type: 'sine', frequency: param(440), start(t) { this.at = t }, stop(t) { this.end = t } }) }
    createBiquadFilter() { return this.mk('filter', { type: 'lowpass', frequency: param(350), Q: param(1) }) }
    createBufferSource() { return this.mk('noise', { buffer: null, start(t, off, d) { assert.ok(off >= 0 && d > 0); this.at = t; this.dur = d } }) }
    createBuffer(ch, len) { const data = new Float32Array(len); return { getChannelData: () => data, length: len } }
  }
  const listeners = {}
  const win = {
    AudioContext: AC,
    addEventListener(t, f) { (listeners[t] ||= []).push(f) },
    removeEventListener(t, f) { listeners[t] = (listeners[t] || []).filter(x => x !== f) },
    fire(t) { for (const f of [...(listeners[t] || [])]) f({ type: t }) }
  }
  const audio = createAudio(() => ({ sound: true, volume: 1 }), { window: win, navigator: {} })
  win.fire('pointerdown')
  // phát một âm, trả các nút mới dựng (bỏ nút âm lượng tổng)
  const play = name => {
    const from = nodes.length
    assert.equal(audio.play(name), true, name)
    return nodes.slice(from)
  }
  return { play }
}
const firstSet = p => p.calls.find(c => c[0] === 'set')[1]
const rampTo = p => (p.calls.find(c => c[0] === 'exp') || [])[1]
const near = (v, base, tol = 0.04) => v >= base * (1 - tol) - 1e-9 && v <= base * (1 + tol) + 1e-9

test('âm thao tác M5 Đợt 1 có trong SOUND_NAMES và ACTION_SOUNDS (đập → crack, khuấy → stir, gọt → peel, lắc → shake, bày → plop)', async () => {
  const { ACTION_SOUNDS } = await import('../../src/ui/audio.js')
  for (const n of ['crack', 'stir', 'peel', 'shake', 'plop']) assert.ok(SOUND_NAMES.includes(n), 'thiếu âm ' + n)
  assert.deepEqual({ ...ACTION_SOUNDS }, { dap: 'crack', xoay: 'stir', got: 'peel', lac: 'shake', bay: 'plop' })
  assert.ok(Object.isFrozen(ACTION_SOUNDS))
  for (const n of ['stamp', 'sparkle', 'fanfare', 'tick', 'whoosh', 'click', 'chop', 'sizzle', 'pour', 'chest', 'cash', 'nudge', 'bell', 'ding']) assert.ok(SOUND_NAMES.includes(n), 'mất âm cũ ' + n)
  assert.equal(new Set(SOUND_NAMES).size, SOUND_NAMES.length)
})

test('crack: ồn lọc cao 3kHz ~30ms + tiếng click; peel: ồn quét 1,5 → 3kHz 120ms (lệch cao độ ≤ ±4%)', () => {
  const env = recordingEnv()
  const crack = env.play('crack')
  const hp = crack.find(n => n.kind === 'filter' && n.type === 'highpass')
  assert.ok(hp, 'crack cần bộ lọc cao')
  assert.ok(near(firstSet(hp.frequency), 3000), 'lọc cao ≈ 3kHz: ' + firstSet(hp.frequency))
  const burst = crack.filter(n => n.kind === 'noise')
  assert.ok(burst.length >= 1 && burst.every(n => n.dur <= 0.06), 'tiếng nứt ngắn (≤ 60ms)')
  assert.ok(Math.abs(burst[0].dur - 0.05) <= 0.021, 'ồn chính ~30ms')
  assert.ok(crack.some(n => n.kind === 'osc'), 'có tiếng click')
  const peel = env.play('peel')
  const bp = peel.find(n => n.kind === 'filter' && n.type === 'bandpass')
  assert.ok(bp)
  const f0 = firstSet(bp.frequency), f1 = rampTo(bp.frequency)
  assert.ok(near(f0, 1500) && near(f1, 3000), `quét ${f0} → ${f1}`)
  assert.ok(Math.abs(f1 / f0 - 2) < 1e-6, 'cùng hệ số lệch cho cả dải quét')
  const src = peel.find(n => n.kind === 'noise')
  assert.ok(Math.abs(src.dur - 0.14) < 0.001, 'dài 120ms (+20ms đuôi)')
})

test('stir: tiếng muỗng chạm thành tô (dao động cao, tắt nhanh); shake: 3 tiếng đá so le; plop: trầm trượt 300 → 120Hz + ồn', () => {
  const env = recordingEnv()
  const stir = env.play('stir')
  const tones = stir.filter(n => n.kind === 'osc')
  assert.ok(tones.length >= 2, 'bồi âm của muỗng')
  assert.ok(tones.some(o => near(firstSet(o.frequency), 2450)), 'nốt chính ≈ 2,45kHz')
  assert.ok(tones.every(o => o.end - o.at <= 0.16), 'tắt nhanh (≤ 160ms)')
  const shake = env.play('shake')
  const starts = [...new Set(shake.filter(n => n.kind === 'osc' || n.kind === 'noise').map(n => Math.round((n.at - 2) * 1000)))].sort((a, b) => a - b)
  assert.equal(starts.length, 3, '3 tiếng đá: ' + starts.join(','))
  assert.ok(starts[2] - starts[0] >= 100 && starts[2] - starts[0] <= 200, 'so le trong ~0,1–0,2 giây')
  const plop = env.play('plop')
  const o = plop.find(n => n.kind === 'osc')
  assert.ok(near(firstSet(o.frequency), 300) && near(rampTo(o.frequency), 120), `trượt ${firstSet(o.frequency)} → ${rampTo(o.frequency)}`)
  assert.ok(plop.some(n => n.kind === 'noise'), 'có tiếng nước')
})

test('âm thao tác lệch cao độ ngẫu nhiên mỗi lần phát, luôn trong ±4%', () => {
  const env = recordingEnv()
  const seen = new Set()
  for (let i = 0; i < 40; i++) {
    const f = firstSet(env.play('crack').find(n => n.kind === 'filter' && n.type === 'highpass').frequency)
    assert.ok(near(f, 3000), 'ngoài ±4%: ' + f)
    seen.add(Math.round(f))
    const p = firstSet(env.play('plop').find(n => n.kind === 'osc').frequency)
    assert.ok(near(p, 300), 'ngoài ±4%: ' + p)
  }
  assert.ok(seen.size > 5, 'cao độ phải đổi giữa các lần phát')
})

test('trò chơi mới gọi đúng âm thao tác của nó (bằng tên viết thẳng), có tệp nào thì kiểm tệp đó', async t => {
  const { ACTION_SOUNDS } = await import('../../src/ui/audio.js')
  const { existsSync } = await import('node:fs')
  const missing = []
  for (const [type, name] of Object.entries(ACTION_SOUNDS)) {
    const file = path.join(ROOT, 'src/ui/minigames', type + '.js')
    if (!existsSync(file)) { missing.push(type); continue }
    const text = readFileSync(file, 'utf8')
    const called = new RegExp(`\\b(?:sound|cue|feedback)\\((?:[^()]*?,\\s*)?'${name}'`).test(text)
    assert.ok(called, `${type}.js chưa gọi âm '${name}'`)
  }
  if (missing.length) t.diagnostic('chưa có trò chơi: ' + missing.join(', '))
})

// ---------- M5 Đợt 2 (gói Q-G): 3 âm Quầy (keng, ting, coin2) ----------

// Mỗi dao động kèm nút âm lượng dựng ngay sau nó (tone(): createOscillator rồi createGain) → âm lượng đỉnh.
const peakOf = (nodes, osc) => {
  const g = nodes[nodes.indexOf(osc) + 1]
  return g && g.kind === 'gain' ? Math.max(...g.gain.calls.filter(c => c[0] === 'exp').map(c => c[1])) : 0
}

test('âm Quầy Đợt 2 có trong SOUND_NAMES: keng (máy tính tiền), ting (QR về), coin2 (xu tip); giữ đủ âm cũ, không trùng', () => {
  for (const n of ['keng', 'ting', 'coin2']) assert.ok(SOUND_NAMES.includes(n), 'thiếu âm ' + n)
  for (const n of ['click', 'coin', 'cash', 'ding', 'bell', 'chop', 'sizzle', 'pour', 'error', 'nudge', 'chest', 'paper',
    'stamp', 'sparkle', 'fanfare', 'tick', 'whoosh', 'crack', 'stir', 'peel', 'shake', 'plop']) assert.ok(SOUND_NAMES.includes(n), 'mất âm cũ ' + n)
  assert.ok(SOUND_NAMES.length >= 25, 'đủ 22 âm cũ + 3 âm Quầy')
  assert.equal(new Set(SOUND_NAMES).size, SOUND_NAMES.length)
  assert.ok(Object.isFrozen(SOUND_NAMES))
})

test('keng: tiếng cần gạt ngắn rồi chuông kim loại ~2,35kHz ngân ≥ 0,7 s, có bồi âm không điều hòa', () => {
  const env = recordingEnv()
  const nodes = env.play('keng')
  const click = nodes.filter(n => n.kind === 'noise')
  assert.ok(click.length >= 1 && click.every(n => n.dur <= 0.08), 'tiếng cạch ngắn')
  assert.ok(Math.min(...click.map(n => n.at)) <= Math.min(...nodes.filter(n => n.kind === 'osc').map(n => n.at)), 'cạch trước, chuông sau')
  const bells = nodes.filter(n => n.kind === 'osc' && firstSet(n.frequency) > 1500)
  const main = bells.find(o => near(firstSet(o.frequency), 2349))
  assert.ok(main, 'nốt chuông chính ≈ 2,35kHz')
  assert.ok(main.end - main.at >= 0.7, 'chuông ngân ≥ 0,7 s')
  const f0 = firstSet(main.frequency)
  const ratios = bells.map(o => firstSet(o.frequency) / f0)
  assert.ok(ratios.some(r => Math.abs(r - Math.round(r)) > 0.2), 'có bồi âm không điều hòa (tiếng kim loại): ' + ratios.map(r => r.toFixed(2)).join(','))
})

test('ting: không có tiếng ồn, nốt mồi thấp rồi nốt chính cao ~2,64kHz ngân, khác âm ding / coin', () => {
  const env = recordingEnv()
  const nodes = env.play('ting')
  assert.equal(nodes.filter(n => n.kind === 'noise').length, 0, 'ting trong, không ồn')
  const osc = nodes.filter(n => n.kind === 'osc').sort((a, b) => a.at - b.at)
  const lead = osc[0]
  const main = osc.find(o => near(firstSet(o.frequency), 2637))
  assert.ok(main, 'nốt chính ≈ 2,64kHz')
  assert.ok(lead.at < main.at && firstSet(lead.frequency) < firstSet(main.frequency), 'đi lên: nốt mồi thấp trước')
  assert.ok(main.end - main.at >= 0.5, 'ngân ≥ 0,5 s')
  // mỗi loại tiền một âm riêng: tần số chính khác ding (Đô6) và coin (Mi6 → La6)
  const mains = name => env.play(name).filter(n => n.kind === 'osc').map(n => Math.round(firstSet(n.frequency)))
  const tingSet = mains('ting')
  for (const other of ['ding', 'coin']) {
    const o = mains(other)
    assert.ok(!tingSet.every(f => o.some(x => Math.abs(x - f) / f < 0.06)), 'ting trùng âm ' + other)
  }
})

test('coin2: 4 tiếng xu chạm so le trong 0,25 s, cao ≥ 3kHz, nhỏ dần — khác âm coin của tiền thường', () => {
  const env = recordingEnv()
  const nodes = env.play('coin2')
  const high = nodes.filter(n => n.kind === 'osc' && firstSet(n.frequency) >= 3000)
  const starts = [...new Set(high.map(o => Math.round((o.at - 2) * 1000)))].sort((a, b) => a - b)
  assert.ok(starts.length >= 4, 'ít nhất 4 tiếng xu: ' + starts.join(','))
  assert.ok(starts[starts.length - 1] - starts[0] <= 250, 'so le trong 0,25 s')
  // tiếng chính của từng lần chạm (nốt thấp nhất trong nhóm cao) nhỏ dần
  const peaks = starts.map(ms => {
    const group = high.filter(o => Math.round((o.at - 2) * 1000) === ms)
    const lowest = group.sort((a, b) => firstSet(a.frequency) - firstSet(b.frequency))[0]
    return peakOf(nodes, lowest)
  })
  for (let i = 1; i < peaks.length; i++) assert.ok(peaks[i] < peaks[i - 1], 'nhỏ dần: ' + peaks.join(','))
  assert.ok(nodes.some(n => n.kind === 'noise'), 'có tiếng gõ kim loại')
  const coin = env.play('coin').filter(n => n.kind === 'osc')
  assert.ok(coin.every(o => firstSet(o.frequency) < 3000), 'coin cũ trầm hơn — hai âm tiền phân biệt được')
})

test('keng / ting / coin2 lệch cao độ ngẫu nhiên mỗi lần phát, luôn trong ±4%', () => {
  const env = recordingEnv()
  const base = { keng: 2349, ting: 2637, coin2: 3520 }
  for (const [name, f] of Object.entries(base)) {
    const seen = new Set()
    for (let i = 0; i < 30; i++) {
      const osc = env.play(name).filter(n => n.kind === 'osc')
      const main = osc.find(o => near(firstSet(o.frequency), f))
      assert.ok(main, `${name}: nốt chính ngoài ±4% của ${f}Hz`)
      seen.add(Math.round(firstSet(main.frequency)))
    }
    assert.ok(seen.size > 5, name + ': cao độ phải đổi giữa các lần phát')
  }
})

test('mọi nút âm lượng của từng nốt im lặng ngay từ lúc tạo (trước mốc bắt đầu) — không lọt một mẫu to "tách" khi nguồn bắt đầu lệch dưới một mẫu', () => {
  const gains = []
  const mkParam = v => {
    const p = { calls: [], _v: v }
    Object.defineProperty(p, 'value', { get() { return this._v }, set(x) { this.calls.push(['value', x]); this._v = x } })
    p.setValueAtTime = function (x, t) { this.calls.push(['set', x, t]); this._v = x }
    p.linearRampToValueAtTime = function (x, t) { this.calls.push(['lin', x, t]) }
    p.exponentialRampToValueAtTime = function (x, t) { this.calls.push(['exp', x, t]) }
    return p
  }
  class AC {
    constructor() { this.state = 'running'; this.currentTime = 3; this.sampleRate = 8000; this.destination = {} }
    resume() { return Promise.resolve() }
    createGain() { const g = { connect: x => x, gain: mkParam(1) }; gains.push(g); return g }
    createOscillator() { return { connect: x => x, type: 'sine', frequency: mkParam(440), start() {}, stop() {} } }
    createBiquadFilter() { return { connect: x => x, type: 'lowpass', frequency: mkParam(350), Q: mkParam(1) } }
    createBufferSource() { return { connect: x => x, buffer: null, start() {} } }
    createBuffer(ch, len) { const data = new Float32Array(len); return { getChannelData: () => data, length: len } }
  }
  const audio = createAudio(() => ({ sound: true, volume: 1 }), { window: { AudioContext: AC }, navigator: {} })
  audio.unlock()
  for (const name of SOUND_NAMES) {
    const from = gains.length
    assert.equal(audio.play(name), true, name)
    const mine = gains.slice(from === 0 ? 1 : from)   // bỏ nút âm lượng tổng (tạo cùng AudioContext)
    assert.ok(mine.length >= 1, name)
    for (const g of mine) assert.deepEqual(g.gain.calls[0], ['value', 0.0001], `${name}: nút âm lượng phải im lặng trước mốc bắt đầu`)
  }
})
