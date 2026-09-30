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
