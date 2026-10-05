// M5 Đợt 0 — nền móng hiệu ứng: hàm thuần của src/ui/vfx.js (easing, Bézier, kế hoạch hạt, mô phỏng hạt),
// giới hạn VFX_LIMITS, import vfx.js / motion.js trong Node không chạm DOM, isReduced(app) theo Cài đặt,
// và quy ước css/theme.css (font Baloo 2 tự lưu, chỉ biến --g-*, chỉ lớp g- / vfx-, giảm chuyển động).
// M5 Đợt 2 (gói Q-G, cuối tệp): luồng xu (coinCount, coinShares, lịch bay coinFlight có dừng giữa đường 120 ms, onArrive
// từng xu), bộ đếm số countValue / countUp cho ví HUD, chống chồng chữ nổi (floatRise, floatSlot, floatText).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  VFX_LIMITS, VFX_KINDS, GRAVITY, easeOutBack, easeOutCubic, bezier, particlePlan, spawnParticles, stepParticles, createVfx,
  COIN_LIMITS, COIN_TIMING, coinCount, coinShares, coinFlight, countValue, countUp, isCounting, FLOAT_MS, floatRise, floatSlot
} from '../../src/ui/vfx.js'
import { isReduced, EASE } from '../../src/ui/motion.js'
import { SOUND_NAMES } from '../../src/ui/audio.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8')
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps

// Bộ sinh số giả ngẫu nhiên cố định cho test.
function seeded(seed = 7) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

test('VFX_LIMITS: 30 nút DOM, 150 hạt, DPR tối đa 2; đóng băng', () => {
  assert.deepEqual({ ...VFX_LIMITS }, { dom: 30, particles: 150, dpr: 2 })
  assert.ok(Object.isFrozen(VFX_LIMITS))
  assert.deepEqual([...VFX_KINDS], ['sparkle', 'crumb', 'drop', 'oil', 'smoke', 'star', 'peel', 'coin', 'confetti'])
  assert.ok(GRAVITY > 0)
})

test('easing: biên 0 và 1 đúng, ngoài khoảng được kẹp, easeOutBack có vượt đích, easeOutCubic tăng dần', () => {
  assert.equal(easeOutBack(0), 0)
  assert.equal(easeOutBack(1), 1)
  assert.equal(easeOutCubic(0), 0)
  assert.equal(easeOutCubic(1), 1)
  assert.equal(easeOutBack(-3), 0)
  assert.equal(easeOutBack(9), 1)
  assert.equal(easeOutCubic(NaN), 0)
  let peak = 0
  let prev = -1
  for (let i = 0; i <= 100; i++) {
    const t = i / 100
    peak = Math.max(peak, easeOutBack(t))
    const c = easeOutCubic(t)
    assert.ok(c >= prev, 'easeOutCubic phải không giảm')
    prev = c
  }
  assert.ok(peak > 1.05 && peak < 1.2, 'easeOutBack vượt đích khoảng 10%: ' + peak)
  assert.ok(near(easeOutCubic(0.5), 0.875))
})

test('bezier bậc hai: t=0 → p0, t=1 → p2, t=.5 = p0/4 + p1/2 + p2/4; nhận số hoặc điểm {x,y}', () => {
  assert.equal(bezier(0, 10, 20, 0), 0)
  assert.equal(bezier(0, 10, 20, 1), 20)
  assert.equal(bezier(0, 40, 0, 0.5), 20)
  const a = { x: 0, y: 100 }, c = { x: 50, y: -100 }, b = { x: 100, y: 100 }
  assert.deepEqual(bezier(a, c, b, 0), { x: 0, y: 100 })
  assert.deepEqual(bezier(a, c, b, 1), { x: 100, y: 100 })
  assert.deepEqual(bezier(a, c, b, 0.5), { x: 50, y: 0 })
  assert.deepEqual(bezier(a, c, b, 7), { x: 100, y: 100 }, 't ngoài khoảng được kẹp')
})

test('particlePlan: mọi loại hợp lệ (số hạt, màu, vận tốc, tuổi thọ); loại lạ dùng sparkle', () => {
  for (const kind of VFX_KINDS) {
    const p = particlePlan(kind, false)
    assert.equal(p.kind, kind)
    assert.ok(Object.isFrozen(p))
    assert.ok(Number.isInteger(p.n) && p.n >= 1 && p.n <= VFX_LIMITS.particles, kind + ' số hạt')
    assert.ok(Array.isArray(p.colors) && p.colors.length >= 1, kind + ' màu')
    for (const c of p.colors) assert.match(c, /^#[0-9a-f]{6}$/i, kind + ' màu hex')
    assert.ok(p.speed[0] >= 0 && p.speed[1] >= p.speed[0] && p.speed[1] > 0, kind + ' vận tốc')
    assert.ok(p.life[0] > 0 && p.life[1] >= p.life[0] && p.life[1] <= 2000, kind + ' tuổi thọ ≤ 2 s')
    assert.ok(p.size[0] > 0 && p.size[1] >= p.size[0], kind + ' cỡ')
    assert.equal(p.trajectory, true)
    assert.equal(typeof p.shape, 'string')
  }
  // số hạt theo thiết kế: lấp lánh 8–14, dầu 6–10, vụn 3–6, pháo giấy 30–40
  assert.ok(particlePlan('sparkle').n >= 8 && particlePlan('sparkle').n <= 14)
  assert.ok(particlePlan('oil').n >= 6 && particlePlan('oil').n <= 10)
  assert.ok(particlePlan('crumb').n >= 3 && particlePlan('crumb').n <= 6)
  assert.ok(particlePlan('confetti').n >= 30 && particlePlan('confetti').n <= 40)
  assert.equal(particlePlan('khong_co').kind, 'sparkle')
  assert.equal(particlePlan(undefined).kind, 'sparkle')
})

test('particlePlan giảm chuyển động: ≤ 3 hạt, không quỹ đạo (vận tốc 0, không trọng lực, không xoay)', () => {
  for (const kind of VFX_KINDS) {
    const p = particlePlan(kind, true)
    assert.ok(p.n >= 0 && p.n <= 3, kind + ': ' + p.n)
    assert.equal(p.trajectory, false)
    assert.deepEqual([...p.speed], [0, 0])
    assert.equal(p.gravity, 0)
    assert.equal(p.spin, 0)
    assert.equal(p.drag, 0)
  }
  assert.equal(particlePlan('confetti', true).n, 0, 'không pháo giấy khi giảm chuyển động')
  assert.equal(particlePlan('smoke', true).n, 0)
  // hạt sinh ra từ kế hoạch giảm chuyển động đứng yên
  const still = spawnParticles(particlePlan('sparkle', true), { x: 10, y: 20 }, seeded(3))
  assert.ok(still.length <= 3)
  for (const p of still) { assert.equal(p.vx, 0); assert.equal(p.vy, 0) }
})

test('spawnParticles: đúng số hạt, vận tốc trong khoảng, tâm tỏa theo kích thước đích, kẹp ≤ 150', () => {
  const plan = particlePlan('sparkle')
  const list = spawnParticles(plan, { x: 100, y: 200, w: 80, h: 40 }, seeded(11))
  assert.equal(list.length, plan.n)
  for (const p of list) {
    const sp = Math.hypot(p.vx, p.vy)
    assert.ok(sp >= plan.speed[0] - 1e-6 && sp <= plan.speed[1] + 1e-6, 'vận tốc ' + sp)
    assert.ok(Math.abs(p.x - 100) <= 40 * plan.jitter + 1e-9 && Math.abs(p.y - 200) <= 20 * plan.jitter + 1e-9)
    assert.ok(p.life >= plan.life[0] && p.life <= plan.life[1])
    assert.ok(plan.colors.includes(p.color))
    assert.equal(p.age, 0)
  }
  assert.equal(spawnParticles(plan, { x: 0, y: 0 }, seeded(1), 999).length, VFX_LIMITS.particles)
  assert.equal(spawnParticles(plan, { x: 0, y: 0 }, seeded(1), 0).length, 0)
  assert.deepEqual(spawnParticles(null, {}), [])
  // cùng hạt giống thì cùng kết quả
  assert.deepEqual(spawnParticles(plan, { x: 5, y: 5 }, seeded(42)), spawnParticles(plan, { x: 5, y: 5 }, seeded(42)))
})

test('stepParticles: trọng lực kéo xuống, hãm theo drag, cộng tuổi (ms), bỏ hạt hết tuổi; dt lỗi coi như 0', () => {
  const mk = over => ({ x: 0, y: 0, vx: 100, vy: 0, age: 0, life: 1000, g: 1, drag: 0, rot: 0, vr: 2, ...over })
  // rơi tự do: sau 0,1 s vận tốc dọc = g·0,1, vị trí dọc = vy·dt (Euler bán ẩn)
  let list = stepParticles([mk()], 0.1, 1000)
  assert.equal(list.length, 1)
  assert.ok(near(list[0].vy, 100))
  assert.ok(near(list[0].y, 10))
  assert.ok(near(list[0].x, 10))
  assert.ok(near(list[0].age, 100))
  assert.ok(near(list[0].rot, 0.2))
  // hệ số trọng lực âm (khói) bay lên; p.g = 0 không rơi
  assert.ok(stepParticles([mk({ g: -0.5 })], 0.1, 1000)[0].vy < 0)
  assert.equal(stepParticles([mk({ g: 0 })], 0.1, 1000)[0].vy, 0)
  // drag: vận tốc giảm theo e^(−drag·dt)
  const d = stepParticles([mk({ drag: 2, g: 0 })], 0.5, 1000)[0]
  assert.ok(near(d.vx, 100 * Math.exp(-1)))
  // hết tuổi thì bỏ
  list = stepParticles([mk({ life: 50 }), mk({ life: 500 })], 0.1, 1000)
  assert.equal(list.length, 1)
  assert.equal(list[0].life, 500)
  // dt lỗi / âm: không đổi trạng thái, hạt còn sống vẫn giữ
  const p = mk()
  assert.equal(stepParticles([p], NaN, 1000).length, 1)
  assert.equal(stepParticles([p], -1, 1000).length, 1)
  assert.equal(p.y, 0)
  assert.equal(p.age, 0)
  assert.deepEqual(stepParticles(null, 0.1), [])
  // mô phỏng trọn vòng đời một chùm lấp lánh: hết hạt trước 1 s (60 khung)
  let sp = spawnParticles(particlePlan('sparkle'), { x: 0, y: 0 }, seeded(5))
  for (let i = 0; i < 60 && sp.length; i++) sp = stepParticles(sp, 1 / 60)
  assert.equal(sp.length, 0)
})

test('import vfx.js / motion.js trong Node không lỗi; createVfx không có DOM thì mọi hàm an toàn', async () => {
  const fx = createVfx({ host: null, reduced: () => false })
  for (const fn of ['burst', 'floatText', 'ripple', 'shake', 'squash', 'pop', 'hitstop', 'fly', 'coins', 'confetti', 'stats', 'clear', 'destroy']) {
    assert.equal(typeof fx[fn], 'function', 'thiếu ' + fn)
  }
  assert.equal(fx.layer, null, 'không có document thì không tạo lớp')
  assert.deepEqual(fx.stats(), { dom: 0, particles: 0 })
  assert.equal(fx.burst({ x: 10, y: 10 }, 'sparkle'), 0)
  assert.equal(fx.confetti({ x: 10, y: 10 }), 0)
  assert.equal(fx.floatText({ x: 1, y: 1 }, 'Chuẩn!'), null)
  assert.equal(fx.ripple(1, 1), null)
  assert.equal(fx.shake(null, 2), null)
  assert.equal(await fx.fly({ x: 0, y: 0 }, { x: 10, y: 10 }), false)
  assert.equal(await fx.coins({ x: 0, y: 0 }, { x: 10, y: 10 }, 6), 0)
  const t0 = Date.now()
  await fx.hitstop(30)
  assert.ok(Date.now() - t0 >= 25, 'hitstop chờ đúng thời gian')
  assert.doesNotThrow(() => fx.clear())
  assert.doesNotThrow(() => fx.destroy())
  assert.doesNotThrow(() => fx.destroy())
})

test('createVfx: giảm chuyển động thì không bay, không rung, không pháo giấy (kể cả khi có phần tử giả)', async () => {
  const calls = []
  const el = { animate: (...a) => { calls.push(a); return { addEventListener() {}, cancel() {} } }, classList: { add() {}, remove() {} }, style: {} }
  const fx = createVfx({ host: null, reduced: () => true })
  assert.equal(fx.squash(el), null)
  assert.equal(fx.shake(el, 3), null)
  assert.equal(fx.confetti({ x: 0, y: 0 }), 0)
  assert.equal(await fx.fly({ x: 0, y: 0 }, { x: 5, y: 5 }), false)
  assert.equal(await fx.coins({ x: 0, y: 0 }, { x: 5, y: 5 }, 8), 0)
  assert.equal(calls.length, 0, 'không gọi WAAPI khi giảm chuyển động (trừ mờ dần của pop)')
  // reduced nhận cả giá trị boolean; hàm reduced lỗi thì coi như không giảm và không ném lỗi
  assert.equal(createVfx({ reduced: true }).confetti({ x: 0, y: 0 }), 0)
  assert.doesNotThrow(() => createVfx({ reduced: () => { throw new Error('x') } }).burst({ x: 0, y: 0 }))
})

// DOM giả tối thiểu cho createVfx (Node không có DOM): cây nút, hình chữ nhật, WAAPI giả, rAF chạy tay, canvas 2D rỗng.
function fakeDom({ width = 390, height = 844 } = {}) {
  const rafs = new Map()
  let rafId = 0
  const docListeners = new Map()
  const ctx2d = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
    set: (t, k, v) => { t[k] = v; return true }
  })
  const win = {
    devicePixelRatio: 3,
    requestAnimationFrame(cb) { rafs.set(++rafId, cb); return rafId },
    cancelAnimationFrame(id) { rafs.delete(id) },
    getComputedStyle: () => ({ transform: 'none' })
  }
  class Anim {
    constructor(el) { this.el = el; this.ls = { finish: [], cancel: [] }; this.playState = 'running' }
    addEventListener(t, f) { (this.ls[t] || (this.ls[t] = [])).push(f) }
    finish() { if (this.playState !== 'running') return; this.playState = 'finished'; this.el._anims.delete(this); for (const f of this.ls.finish) f({}) }
    cancel() { if (this.playState === 'idle') return; this.playState = 'idle'; this.el._anims.delete(this); for (const f of this.ls.cancel) f({}) }
    pause() {}
    play() {}
  }
  let doc = null
  class El {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase()
      this.children = []
      this.parentNode = null
      this.className = ''
      this.style = {}
      this.attrs = {}
      this.text = ''
      this._anims = new Set()
      this._rect = null
      this.hiddenBox = false
      this.width = 0
      this.height = 0
      const cls = () => this.className.split(/\s+/).filter(Boolean)
      this.classList = {
        add: c => { if (!cls().includes(c)) this.className = [...cls(), c].join(' ') },
        remove: c => { this.className = cls().filter(x => x !== c).join(' ') },
        contains: c => cls().includes(c)
      }
    }
    get rect() {
      if (this._rect) return this._rect
      if (this.className === 'vfx-layer' && this.parentNode) return this.parentNode.rect
      return { left: 0, top: 0, width: 0, height: 0 }
    }
    set rect(r) { this._rect = r }
    get ownerDocument() { return doc }
    get isConnected() { for (let n = this; n; n = n.parentNode) if (n === doc.body) return true; return false }
    get childElementCount() { return this.children.length }
    get firstChild() { return this.children[0] || null }
    get lastElementChild() { return this.children[this.children.length - 1] || null }
    get clientWidth() { return this.rect.width }
    get clientHeight() { return this.rect.height }
    appendChild(c) { return this.insertBefore(c, null) }
    insertBefore(c, ref) {
      if (c.parentNode) c.parentNode.removeChild(c)
      c.parentNode = this
      const i = ref ? this.children.indexOf(ref) : -1
      if (i < 0) this.children.push(c); else this.children.splice(i, 0, c)
      return c
    }
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c }
    remove() { if (this.parentNode) this.parentNode.removeChild(this) }
    setAttribute(k, v) { this.attrs[k] = String(v) }
    getAttribute(k) { return this.attrs[k] ?? null }
    removeAttribute(k) { delete this.attrs[k] }
    get textContent() { return this.text }
    set textContent(v) { for (const c of this.children) c.parentNode = null; this.children = []; this.text = String(v) }
    set innerHTML(v) { this.textContent = v }
    getBoundingClientRect() { return this.isConnected && !this.hiddenBox ? { ...this.rect } : { left: 0, top: 0, width: 0, height: 0 } }
    getClientRects() { return this.isConnected && !this.hiddenBox ? [this.rect] : [] }
    animate() { const a = new Anim(this); this._anims.add(a); return a }
    getAnimations() { return [...this._anims] }
    getContext(kind) { return this.tagName === 'CANVAS' && kind === '2d' ? ctx2d : null }
    cloneNode() { return new El(this.tagName) }
    querySelectorAll() { return [] }
  }
  doc = {
    visibilityState: 'visible',
    defaultView: win,
    createElement: t => new El(t),
    addEventListener(t, f) { if (!docListeners.has(t)) docListeners.set(t, new Set()); docListeners.get(t).add(f) },
    removeEventListener(t, f) { if (docListeners.has(t)) docListeners.get(t).delete(f) },
    querySelectorAll: () => []
  }
  doc.body = new El('body')
  doc.body.rect = { left: 0, top: 0, width, height }
  const host = doc.body.appendChild(new El('div'))
  host.className = 'overlay-root'
  host.rect = { left: 0, top: 0, width, height }
  const box = (left, top, w, h) => { const e = doc.body.appendChild(new El('button')); e.rect = { left, top, width: w, height: h }; return e }
  // chạy các khung rAF đang chờ, mỗi khung cách 50 ms; trả số khung đã chạy
  let ts = 0
  const frames = (max = 200) => {
    let n = 0
    while (rafs.size && n < max) {
      const cbs = [...rafs.values()]
      rafs.clear()
      ts += 50
      for (const cb of cbs) cb(ts)
      n++
    }
    return n
  }
  const setHidden = v => {
    doc.visibilityState = v ? 'hidden' : 'visible'
    for (const f of docListeners.get('visibilitychange') || []) f({ type: 'visibilitychange' })
  }
  return { doc, win, host, box, frames, setHidden, El, pendingRaf: () => rafs.size }
}

test('createVfx (DOM giả): hết hạt thì canvas rời lớp → stats().dom về 0; nổ lại thì gắn lại canvas, DPR ≤ 2', () => {
  const D = fakeDom()
  const fx = createVfx({ host: D.host, reduced: () => false })
  const a = D.box(150, 400, 90, 48)
  assert.equal(fx.burst(a, 'sparkle'), particlePlan('sparkle').n)
  const cv = fx.layer.children.find(e => e.className === 'vfx-canvas')
  assert.ok(cv, 'có canvas khi đang nổ')
  assert.equal(cv.width, 390 * VFX_LIMITS.dpr, 'DPR kẹp ở 2 (máy giả 3)')
  assert.equal(cv.getAttribute('data-n'), String(particlePlan('sparkle').n))
  assert.ok(fx.stats().dom >= 1 && fx.stats().particles > 0)
  // vòng sáng là nút DOM: cho hoạt ảnh xong
  for (const e of [...fx.layer.children]) for (const an of e.getAnimations()) an.finish()
  D.frames()
  assert.equal(D.pendingRaf(), 0, 'rAF dừng khi hết hạt')
  assert.deepEqual(fx.stats(), { dom: 0, particles: 0 }, 'lớp về 0 nút khi đứng yên')
  assert.equal(cv.parentNode, null, 'canvas đã gỡ khỏi lớp')
  assert.equal(cv.width, 0, 'nhả bộ nhớ canvas')
  assert.equal(cv.getAttribute('data-n'), '0')
  // nổ lại: dùng lại đúng canvas cũ, gắn ở đáy lớp
  assert.equal(fx.confetti(a), 36)
  assert.equal(fx.layer.children[0], cv)
  assert.equal(fx.stats().dom, 1)
  assert.equal(fx.stats().particles, 36)
  fx.clear()
  assert.deepEqual(fx.stats(), { dom: 0, particles: 0 }, 'clear() cũng gỡ canvas')
  fx.destroy()
})

test('createVfx (DOM giả): clear() chỉ đưa nút của vfx vào pool; nút lạ chỉ bị gỡ, không tái dùng, không bị xóa nội dung', () => {
  const D = fakeDom()
  const fx = createVfx({ host: D.host, reduced: () => false })
  const foreign = new D.El('section')
  foreign.className = 'co-pad-ghost'
  foreign.textContent = 'phiếu'
  const anim = foreign.animate()
  let cancelled = false
  anim.addEventListener('cancel', () => { cancelled = true })
  fx.layer.appendChild(foreign)
  const own = fx.floatText({ x: 200, y: 300 }, 'Chuẩn!')
  assert.ok(own)
  fx.clear()
  assert.equal(foreign.parentNode, null, 'nút lạ được gỡ khỏi lớp')
  assert.equal(foreign.textContent, 'phiếu', 'không xóa nội dung nút lạ')
  assert.equal(foreign.className, 'co-pad-ghost')
  assert.equal(cancelled, false, 'không hủy hoạt ảnh của module chủ')
  const seen = new Set()
  for (let i = 0; i < 4; i++) {
    const el = fx.floatText({ x: 200, y: 300 }, 'Ngon!')
    assert.notEqual(el, foreign, 'không cấp nút lạ cho hiệu ứng mới')
    seen.add(el)
  }
  assert.ok(seen.has(own), 'nút của vfx được dùng lại từ pool')
  fx.destroy()
})

test('createVfx (DOM giả): đích đã rời DOM hoặc không hiển thị thì không có hiệu ứng (không nổ ở góc 0,0)', async () => {
  const D = fakeDom()
  const fx = createVfx({ host: D.host, reduced: () => false })
  const ok = D.box(150, 400, 90, 48)
  const gone = D.box(200, 500, 60, 60)
  gone.remove()
  const hidden = D.box(40, 60, 60, 40)
  hidden.hiddenBox = true // display: none → getClientRects() rỗng
  for (const t of [gone, hidden]) {
    assert.equal(fx.burst(t, 'sparkle'), 0)
    assert.equal(fx.confetti(t), 0)
    assert.equal(fx.floatText(t, 'X'), null)
    assert.equal(fx.ripple(t), null)
    assert.equal(await fx.fly(t, ok), false)
    assert.equal(await fx.fly(ok, t), false)
    assert.equal(await fx.coins(t, ok, 4), 0)
    assert.equal(await fx.coins(ok, t, 4), 0)
  }
  assert.deepEqual(fx.stats(), { dom: 0, particles: 0 })
  // hình chữ nhật / điểm vẫn nhận bình thường
  assert.ok(fx.floatText({ x: 100, y: 200 }, 'Chuẩn!'))
  fx.destroy()
})

test('createVfx (DOM giả): trang ẩn thì clear() và không nhận hiệu ứng mới; hiện lại thì chạy tiếp', async () => {
  const D = fakeDom()
  const fx = createVfx({ host: D.host, reduced: () => false })
  const a = D.box(150, 400, 90, 48)
  const b = D.box(40, 60, 60, 40)
  fx.burst(a, 'sparkle')
  const flight = fx.fly(a, b)
  const coinRun = fx.coins(a, b, 3)
  assert.ok(fx.stats().dom > 0 && fx.stats().particles > 0)
  D.setHidden(true)
  assert.deepEqual(fx.stats(), { dom: 0, particles: 0 }, 'ẩn trang thì dọn sạch')
  assert.equal(await flight, false, 'bay bị dọn giữa chừng → false')
  assert.equal(await coinRun, 0, 'xu bị dọn giữa chừng không tính')
  // đang ẩn: không hạt, không nút, không rung
  assert.equal(fx.burst(a, 'sparkle'), 0)
  assert.equal(fx.confetti(a), 0)
  assert.equal(fx.floatText(a, 'X'), null)
  assert.equal(fx.ripple(a), null)
  assert.equal(fx.shake(a, 2), null)
  assert.equal(fx.squash(a), null)
  assert.equal(fx.pop(a), null)
  assert.equal(await fx.fly(a, b), false)
  assert.equal(await fx.coins(a, b, 4), 0)
  assert.deepEqual(fx.stats(), { dom: 0, particles: 0 })
  assert.equal(D.pendingRaf(), 0, 'không xin rAF khi ẩn')
  assert.equal(a.getAnimations().length, 0)
  // hiện lại
  D.setHidden(false)
  assert.equal(fx.burst(a, 'star'), particlePlan('star').n)
  const again = fx.fly(a, b)
  const fl = fx.layer.children.find(e => e.className === 'vfx-fly')
  fl.getAnimations()[0].finish()
  assert.equal(await again, true, 'bay hết hành trình → true')
  fx.destroy()
})

test('vfx.js không phát sự kiện lên bus miền và không chạm DOM ở cấp module', () => {
  const src = read('src/ui/vfx.js')
  assert.ok(!/\bemit\s*\(/.test(src), 'vfx.js không được gọi emit()')
  assert.ok(!/\bbus\b\s*\./.test(src), 'vfx.js không dùng bus')
  assert.ok(!/Math\.random\(\)\s*\*\s*0\b/.test(src))
  // dòng ở cấp module (không thụt lề) không gọi document/window/matchMedia
  for (const file of ['src/ui/vfx.js', 'src/ui/motion.js']) {
    const top = read(file).split('\n').filter(l => /^\S/.test(l) && !/^\/\//.test(l))
    for (const l of top) assert.ok(!/\b(document|window|matchMedia|navigator)\b/.test(l), file + ': ' + l)
  }
})

test('isReduced(app): theo app.settings.reducedMotion (đối tượng hoặc hàm) và app.state.settings; Node không lỗi', () => {
  assert.equal(isReduced({ settings: { reducedMotion: true } }), true)
  assert.equal(isReduced({ settings: { reducedMotion: false } }), false)
  assert.equal(isReduced({ settings: () => ({ reducedMotion: true }) }), true)
  assert.equal(isReduced({ settings: () => ({}) , state: { settings: { reducedMotion: true } } }), true)
  assert.equal(isReduced({ settings: () => { throw new Error('x') } }), false)
  assert.equal(isReduced(), false)
  assert.equal(isReduced(null), false)
  assert.deepEqual({ ...EASE }, {
    outBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    outCubic: 'cubic-bezier(0.33, 1, 0.68, 1)'
  })
  assert.ok(Object.isFrozen(EASE))
})

test('isReduced: lớp reduce-motion trên <html> và prefers-reduced-motion (môi trường giả)', () => {
  const hadDoc = 'document' in globalThis, hadWin = 'window' in globalThis
  const oldDoc = globalThis.document, oldWin = globalThis.window
  try {
    let cls = false
    let os = false
    globalThis.document = { documentElement: { classList: { contains: c => cls && c === 'reduce-motion' } } }
    globalThis.window = { matchMedia(q) { assert.equal(this, globalThis.window, 'gọi matchMedia qua window'); return { matches: os && /reduce/.test(q) } } }
    assert.equal(isReduced({ settings: { reducedMotion: false } }), false)
    cls = true
    assert.equal(isReduced({ settings: { reducedMotion: false } }), true, 'lớp trên <html>')
    cls = false
    os = true
    assert.equal(isReduced(), true, 'hệ điều hành')
  } finally {
    if (hadDoc) globalThis.document = oldDoc; else delete globalThis.document
    if (hadWin) globalThis.window = oldWin; else delete globalThis.window
  }
})

test('css/theme.css: font Baloo 2 800 tự lưu (latin + tiếng Việt, swap), chỉ biến --g-*, chỉ lớp g- / vfx-', () => {
  const css = read('css/theme.css')
  const faces = css.match(/@font-face\s*\{[^}]*\}/g) || []
  assert.equal(faces.length, 2)
  for (const f of faces) {
    assert.match(f, /font-family:\s*'Baloo 2'/)
    assert.match(f, /font-weight:\s*800/)
    assert.match(f, /font-display:\s*swap/)
    assert.match(f, /unicode-range:/)
  }
  assert.ok(faces.some(f => f.includes("url('../fonts/baloo2-800-latin.woff2')") && f.includes('U+0000-00FF')))
  assert.ok(faces.some(f => f.includes("url('../fonts/baloo2-800-vi.woff2')") && f.includes('U+1EA0-1EF9') && f.includes('U+20AB')))
  // biến khai báo đều có tiền tố --g-
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const declared = [...noComments.matchAll(/(^|[;{\s])(--[\w-]+)\s*:/g)].map(m => m[2])
  assert.ok(declared.length > 20)
  const bad = declared.filter(v => !v.startsWith('--g-'))
  assert.deepEqual(bad, [], 'biến không có tiền tố --g-')
  // mọi lớp được dùng trong bộ chọn đều là g- / vfx- (trừ .overlay-root, .reduce-motion đã có của game)
  const selectors = noComments.replace(/@font-face\s*\{[^}]*\}/g, '').replace(/\{[^{}]*\}/g, '{}').replace(/@media[^{]*\{/g, '')
  const classes = [...selectors.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1])
  const foreign = [...new Set(classes)].filter(c => !/^(g|vfx)-/.test(c) && !['overlay-root', 'reduce-motion'].includes(c))
  assert.deepEqual(foreign, [], 'lớp không có tiền tố g- / vfx-')
  // các lớp chính có mặt
  for (const c of ['g-btn', 'g-btn--primary', 'g-btn--go', 'g-btn--gold', 'g-btn--ghost', 'g-btn--small', 'g-paper', 'g-paper--torn',
    'g-wood', 'g-chalk', 'g-title', 'g-badge', 'g-ribbon', 'g-pill', 'vfx-layer', 'vfx-p', 'vfx-text']) {
    assert.ok(classes.includes(c), 'thiếu lớp .' + c)
  }
  // nút: vùng chạm ≥ 48px (nhỏ ≥ 44px), lớp hiệu ứng không nhận chạm, z-index 25
  assert.match(css, /\.g-btn \{[^}]*min-height: 48px/)
  assert.match(css, /\.g-btn--small \{[^}]*min-height: 44px/)
  assert.match(css, /\.overlay-root > \.vfx-layer \{[^}]*pointer-events: none[^}]*\}/)
  assert.match(css, /\.vfx-layer,\s*\.overlay-root > \.vfx-layer \{[^}]*z-index: 25/)
  // giảm chuyển động: có cả media query lẫn html.reduce-motion tắt hoạt ảnh lặp
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /html\.reduce-motion \.g-bob/)
  // không ghi đè biến cũ của game
  for (const old of ['--bg:', '--ink:', '--brick:', '--paper:', '--tap:', '--font:']) assert.ok(!noComments.includes(old), 'ghi đè ' + old)
  // hoạt ảnh chỉ đổi transform/opacity
  for (const kf of noComments.match(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) || []) {
    const props = [...kf.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1])
    assert.deepEqual(props.filter(p => !['transform', 'opacity'].includes(p)), [], 'keyframes đổi thuộc tính khác: ' + kf.slice(0, 40))
  }
})

test('âm M5 Đợt 0 có trong SOUND_NAMES: stamp, sparkle, fanfare, tick, whoosh (giữ đủ âm cũ)', () => {
  for (const n of ['stamp', 'sparkle', 'fanfare', 'tick', 'whoosh']) assert.ok(SOUND_NAMES.includes(n), 'thiếu âm ' + n)
  for (const n of ['click', 'coin', 'cash', 'ding', 'bell', 'chop', 'sizzle', 'pour', 'error', 'nudge', 'chest', 'paper']) assert.ok(SOUND_NAMES.includes(n))
  assert.equal(new Set(SOUND_NAMES).size, SOUND_NAMES.length, 'không trùng tên âm')
})

// ---------- M5 Đợt 1 (gói G): app.vfx dùng chung ----------

test('app.js tạo app.vfx đúng một lần trên lớp nổi gốc, giảm chuyển động hỏi isReduced(app); dọn khi đổi màn và khi bật Giảm chuyển động', () => {
  const src = read('src/ui/app.js')
  assert.match(src, /import \{ createVfx \} from '\.\/vfx\.js'/)
  assert.match(src, /import \{ isReduced \} from '\.\/motion\.js'/)
  const made = src.match(/createVfx\(/g) || []
  assert.equal(made.length, 1, 'chỉ tạo một hệ hiệu ứng')
  assert.match(src, /app\.vfx = createVfx\(\{ host: overlay, reduced: \(\) => isReduced\(app\) \}\)/)
  // đổi màn: dọn hiệu ứng của màn cũ trước khi router dựng màn mới
  const go = src.slice(src.indexOf('go(name, params) {'), src.indexOf('toast(text, opts) {'))
  assert.ok(go.indexOf('app.vfx.clear()') >= 0 && go.indexOf('app.vfx.clear()') < go.indexOf('app.router.go'), 'go() phải clear() trước router.go')
  // bật Giảm chuyển động trong Cài đặt: dừng ngay hiệu ứng đang bay
  const apply = src.slice(src.indexOf('applySettings() {'), src.indexOf('// Âm thanh: đọc Cài đặt'))
  assert.match(apply, /reducedMotion && app\.vfx\) app\.vfx\.clear\(\)/)
  // vfx tạo sau overlay (lớp nổi gốc) và trước router (màn đầu tiên đã có app.vfx)
  assert.ok(src.indexOf("const overlay = h('div'") < src.indexOf('app.vfx = createVfx'))
  assert.ok(src.indexOf('app.vfx = createVfx') < src.indexOf('app.router = createRouter'))
  // các màn và thành phần dùng app.vfx (hoặc ctx.vfx), không tự tạo hệ hiệu ứng riêng
  const offenders = []
  const walk = dir => {
    for (const n of readdirSync(path.join(ROOT, dir))) {
      const rel = dir + '/' + n
      if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel)
      else if (n.endsWith('.js') && rel !== 'src/ui/vfx.js' && rel !== 'src/ui/app.js' && /\bcreateVfx\(/.test(read(rel))) offenders.push(rel)
    }
  }
  walk('src')
  assert.deepEqual(offenders, [], 'tự tạo hệ hiệu ứng riêng: ' + offenders.join(', '))
})

test('app.vfx theo công tắc "Giảm chuyển động" ngay lúc chạy (reduced: () => isReduced(app)), không cần tạo lại', () => {
  const D = fakeDom()
  const s = { reducedMotion: false }
  const app = { settings: () => s }
  const fx = createVfx({ host: D.host, reduced: () => isReduced(app) })
  const a = D.box(150, 400, 90, 48)
  assert.equal(fx.burst(a, 'sparkle'), particlePlan('sparkle').n, 'chưa bật: có hạt bay')
  fx.clear()
  s.reducedMotion = true
  assert.equal(fx.burst(a, 'sparkle'), 0, 'vừa bật: không hạt bay')
  assert.equal(fx.stats().particles, 0)
  assert.ok(fx.layer.children.every(e => e.className === 'vfx-p'), 'chỉ còn dấu tĩnh (mờ dần)')
  assert.equal(fx.confetti(a), 0)
  assert.equal(fx.shake(a, 2), null)
  assert.ok(a.classList.contains('vfx-alert'), 'thay rung bằng chớp viền đỏ tĩnh')
  fx.clear()
  s.reducedMotion = false
  assert.equal(fx.confetti(a), 36, 'tắt lại: pháo giấy như thường')
  fx.destroy()
})

// ---------- M5 Đợt 2 (gói Q-G): luồng xu, bộ đếm ví HUD, chống chồng chữ nổi ----------

const sleep = ms => new Promise(r => setTimeout(r, ms))
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }

test('coinCount: 6–12 xu theo số tiền (tăng theo log, không giảm khi tiền tăng), trần cứng 12; 0 / âm / lỗi → 0', () => {
  assert.deepEqual({ ...COIN_LIMITS }, { min: 6, max: 12, lo: 5000, hi: 200000 })
  assert.ok(Object.isFrozen(COIN_LIMITS) && Object.isFrozen(COIN_TIMING))
  assert.equal(coinCount(1000), 6)
  assert.equal(coinCount(5000), 6)
  assert.equal(coinCount(20000), 8)
  assert.equal(coinCount(50000), 10)
  assert.equal(coinCount(200000), 12)
  assert.equal(coinCount(5e7), 12, 'có trần')
  for (const bad of [0, -5000, NaN, null, undefined, 'abc']) assert.equal(coinCount(bad), 0, String(bad))
  let prev = 0
  for (let a = 1000; a <= 400000; a += 1000) {
    const n = coinCount(a)
    assert.ok(n >= 6 && n <= 12, a + ' → ' + n)
    assert.ok(n >= prev, 'không giảm khi tiền tăng: ' + a)
    prev = n
  }
  // xu tip: dải riêng nhỏ hơn; max lớn hơn 12 vẫn bị kẹp ở 12
  assert.equal(coinCount(5000, { min: 3, max: 6 }), 3)
  assert.ok(coinCount(100000, { min: 3, max: 6 }) <= 6)
  assert.equal(coinCount(1e9, { max: 40 }), 12)
})

test('coinShares: các phần cộng lại đúng số tiền, là bội của unit, phần lẻ dồn vào xu cuối', () => {
  for (const [amt, n, unit] of [[25000, 9, 1], [25000, 9, 1000], [15000, 6, 500], [7, 3, 1], [3, 5, 1], [99999, 12, 1000], [-7000, 3, 1000]]) {
    const s = coinShares(amt, n, unit)
    assert.equal(s.length, n)
    assert.equal(s.reduce((a, b) => a + b, 0), amt, `${amt}/${n}`)
    for (const v of s.slice(0, -1)) assert.equal(Math.abs(v) % unit, 0, `phần ${v} không là bội của ${unit}`)
    assert.ok(s.every(v => Math.sign(v) === Math.sign(amt) || v === 0))
  }
  assert.deepEqual(coinShares(25000, 9, 1000), [3000, 3000, 3000, 3000, 3000, 3000, 3000, 2000, 2000])
  assert.deepEqual(coinShares(0, 3), [0, 0, 0])
  assert.deepEqual(coinShares(5000, 0), [])
  assert.ok(!coinShares(-3, 3).some(v => Object.is(v, -0)), 'không có -0')
})

test('coinFlight (lịch xu): so le 40 ms (cả đàn trễ ≤ 480 ms), DỪNG GIỮA ĐƯỜNG đúng 120 ms tại điểm tỏa, tỏa ra như quạt, khung cuối đúng đích', () => {
  const rand = seeded(11)
  const from = { x: 200, y: 520 }, to = { x: 330, y: 28 }
  const plan = coinFlight(8, { from, to, rand })
  assert.equal(plan.length, 8)
  const move = COIN_TIMING.out + COIN_TIMING.fly
  for (const c of plan) {
    assert.equal(c.delay, c.index * COIN_TIMING.stagger, 'so le 40 ms')
    assert.equal(c.duration, move + COIN_TIMING.hold)
    assert.equal(c.arriveAt, c.delay + c.duration)
    const f = c.frames
    assert.equal(f[0].offset, 0)
    assert.equal(f[f.length - 1].offset, 1)
    for (let i = 1; i < f.length; i++) assert.ok(f[i].offset > f[i - 1].offset, 'offset tăng dần')
    assert.equal(f[0].opacity, 0, 'xu hiện dần từ nguồn')
    assert.deepEqual([f[0].x, f[0].y], [from.x, from.y])
    assert.deepEqual([f[f.length - 1].x, f[f.length - 1].y], [to.x, to.y], 'khung cuối đúng đích')
    // hai khung liền nhau cùng đứng ở điểm tỏa, cách nhau đúng 120 ms
    let held = null
    for (let i = 1; i < f.length; i++) {
      if (near(f[i].x, f[i - 1].x) && near(f[i].y, f[i - 1].y) && near(f[i].x, c.mid.x) && near(f[i].y, c.mid.y)) held = (f[i].offset - f[i - 1].offset) * c.duration
    }
    assert.ok(held !== null && Math.abs(held - 120) < 1e-6, 'dừng giữa đường 120 ms: ' + held)
    // điểm tỏa ở gần nguồn (48–84 px, hai vòng xen kẽ), lệch lên trên
    const r = Math.hypot(c.mid.x - from.x, c.mid.y - from.y)
    assert.ok(r >= 48 && r <= 84, 'bán kính tỏa ' + r)
    assert.ok(c.mid.y < from.y + 1e-9 || Math.abs(c.mid.x - from.x) > 30, 'tỏa lên hoặc sang ngang, không rơi xuống')
  }
  // tỏa ra như quạt: góc trải rộng > 1,6 rad, xu liền nhau không cùng hướng (không xếp hàng thẳng)
  const angs = plan.map(c => Math.atan2(c.mid.y - from.y, c.mid.x - from.x))
  assert.ok(Math.max(...angs) - Math.min(...angs) > 1.6, 'cung tỏa hẹp quá')
  assert.equal(new Set(plan.map(c => Math.round(c.mid.x))).size, 8, 'mỗi xu một điểm tỏa')
  assert.ok(Math.abs(angs[1] - angs[0]) > 0.1, 'xu thứ hai không bay cùng hướng xu đầu')
  // 12 xu: độ trễ tự co để cả đàn không quá 480 ms; n kẹp [0, 12]
  const big = coinFlight(40, { from, to, rand })
  assert.equal(big.length, 12)
  assert.ok(big[11].delay <= COIN_TIMING.spread)
  assert.deepEqual(coinFlight(0, { from, to }), [])
  // ms là thời gian chuyển động, không tính hold; hold 0 thì không có khung đứng yên
  const fast = coinFlight(1, { from, to, ms: 450, hold: 0, rand })
  assert.equal(fast[0].duration, 450)
  assert.equal(coinFlight(1, { from, to, ms: 99999 })[0].duration, 1500 + 120, 'ms kẹp ≤ 1500')
})

test('countValue: from → to theo easeOutCubic, làm tròn theo step, luôn nằm giữa hai đầu; t ≥ 1 đúng to; lỗi an toàn', () => {
  assert.equal(countValue(10000, 35000, 0), 10000)
  assert.equal(countValue(10000, 35000, 1), 35000)
  assert.equal(countValue(10000, 35000, 7), 35000)
  assert.equal(countValue(10000, 35000, NaN), 35000, 't lỗi → số cuối (không kẹt)')
  assert.equal(countValue(10000, 35000, -1), 10000)
  let prev = -Infinity
  for (let i = 0; i <= 50; i++) {
    const v = countValue(10000, 35000, i / 50, 100)
    assert.ok(v >= prev, 'đơn điệu')
    assert.ok(v >= 10000 && v <= 35000)
    assert.equal(v % 100, 0, 'bội của step')
    prev = v
  }
  assert.ok(countValue(0, 1000, 0.5) > 500, 'easeOutCubic: nửa thời gian đã quá nửa đường')
  // đếm xuống cũng được
  assert.ok(countValue(5000, 1000, 0.5) < 5000 && countValue(5000, 1000, 0.5) > 1000)
  assert.equal(countValue(null, 800, 0.5), 800, 'from lỗi → coi như to')
  assert.equal(countValue(300, 'x', 0.5), 300, 'to lỗi → giữ from')
})

test('countUp (rời): giảm chuyển động → ghi ngay số cuối + một nhịp sáng; không giảm → đếm dần đơn điệu tới đúng to; không đụng data-*', async () => {
  const fmt = v => v.toLocaleString('vi-VN') + 'đ'
  const el = { textContent: '1.000đ', dataset: { amount: '9000' } }
  const glows = []
  const h = countUp(el, 1000, 9000, 600, fmt, { reduced: true, glow: e => glows.push(e) })
  assert.equal(el.textContent, fmt(9000), 'cập nhật ngay')
  assert.equal(glows.length, 1, 'một nhịp sáng')
  assert.equal(isCounting(el), false)
  assert.equal(await h.done, true)
  assert.equal(el.dataset.amount, '9000', 'không đụng data-amount')
  // không giảm chuyển động (Node: không có rAF → hẹn giờ 16 ms)
  const seen = []
  const el2 = { textContent: '' }
  const h2 = countUp(el2, 0, 5000, 120, v => { seen.push(v); return String(v) }, { reduced: false, glow: () => glows.push('x') })
  assert.equal(isCounting(el2), true)
  assert.equal(await h2.done, true)
  assert.equal(el2.textContent, '5000')
  assert.equal(seen[0], 0)
  assert.equal(seen[seen.length - 1], 5000)
  assert.ok(seen.length >= 3, 'có các số ở giữa: ' + seen.join(','))
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1], 'đơn điệu')
  assert.equal(glows.length, 1, "glow 'auto': đếm thường thì không nhịp sáng")
  assert.equal(isCounting(el2), false)
})

test('countUp: gọi lại trên cùng phần tử thì nối tiếp từ số đang hiện (xu tới liên tiếp), bộ cũ dừng (done → false); finish() / cancel()', async () => {
  const el = { textContent: '' }
  const nums = []
  const fmt = v => { nums.push(v); return String(v) }
  const h1 = countUp(el, 0, 1000, 400, fmt, { reduced: false })
  await sleep(80)
  const mid = h1.value
  assert.ok(mid > 0 && mid < 1000, 'đang đếm dở: ' + mid)
  const at = nums.length
  const h2 = countUp(el, null, 3000, 100, fmt, { reduced: false })
  assert.equal(await h1.done, false, 'bộ cũ bị thay')
  assert.equal(nums[at], mid, 'nối tiếp từ số đang hiện, không giật về 0')
  assert.equal(await h2.done, true)
  assert.equal(el.textContent, '3000')
  for (let i = 1; i < nums.length; i++) assert.ok(nums[i] >= nums[i - 1], 'không giật lùi')
  // finish(): nhảy tới số cuối; cancel(): giữ số đang hiện
  const h3 = countUp(el, 3000, 9000, 1000, null, { reduced: false })
  h3.finish()
  assert.equal(el.textContent, '9000')
  assert.equal(await h3.done, true)
  const h4 = countUp(el, 9000, 20000, 1000, null, { reduced: false })
  h4.cancel()
  assert.equal(await h4.done, false)
  assert.equal(el.textContent, '9000')
  // bộ đếm cũ đã xong: from = null đếm tiếp từ số nó ghi lần cuối (chữ chưa bị ai ghi đè)…
  const seen6 = []
  await countUp(el, null, 9400, 60, v => { seen6.push(v); return String(v) }, { reduced: false }).done
  assert.equal(seen6[0], 9000, 'tiếp từ số đã hiện, không nhảy cóc')
  // …còn chữ đã bị bên khác ghi đè (vd HUD tự cập nhật) thì không tin số cũ: hiện thẳng số cuối
  el.textContent = '12345'
  const seen7 = []
  await countUp(el, null, 15000, 60, v => { seen7.push(v); return String(v) }, { reduced: false }).done
  assert.deepEqual(seen7, [15000])
  // giảm chuyển động + from = null: chữ đổi thì vẫn có một nhịp sáng
  const glows = []
  countUp(el, null, 16000, 600, null, { reduced: true, glow: () => glows.push(1) })
  assert.equal(el.textContent, '16000')
  assert.equal(glows.length, 1)
  countUp(el, null, 16000, 600, null, { reduced: true, glow: () => glows.push(1) })
  assert.equal(glows.length, 1, 'số không đổi thì không chớp sáng')
  // không có bộ đếm cũ và from = null → hiện thẳng số cuối; to lỗi → không ghi
  const el5 = { textContent: '?' }
  await countUp(el5, null, 700, 600, null, { reduced: false }).done
  assert.equal(el5.textContent, '700')
  assert.equal(await countUp(el5, 0, NaN, 600, null, { reduced: false }).done, false)
  assert.equal(el5.textContent, '700')
  assert.doesNotThrow(() => countUp(null, 0, 10, 50, null, { reduced: false }))
})

test('floatRise khớp đường bay của chữ nổi (10 → −46 px trong 820 ms; giảm chuyển động đứng yên)', () => {
  assert.deepEqual({ ...FLOAT_MS }, { normal: 820, reduced: 700 })
  assert.equal(floatRise(0), 10)
  assert.ok(near(floatRise(0.18 * 820), -4))
  assert.ok(near(floatRise(0.32 * 820), -10))
  assert.ok(near(floatRise(0.8 * 820), -34))
  assert.equal(floatRise(820), -46)
  assert.equal(floatRise(5000), -46)
  assert.equal(floatRise(300, true), 0)
  let prev = Infinity
  for (let a = 0; a <= 820; a += 10) { assert.ok(floatRise(a) <= prev + 1e-9); prev = floatRise(a) }
})

// Mô phỏng: hai chữ nổi (tâm-đáy x, y; rộng w, cao h; hiện lúc t) có chồng lên nhau ở thời điểm nào không (bước 10 ms).
function floatsOverlap(a, b, { gap = 0, live = 0.88 } = {}) {
  const t0 = Math.max(a.t, b.t)
  const end = Math.min(a.t + FLOAT_MS.normal * live, b.t + FLOAT_MS.normal * live)
  if (Math.abs(a.x - b.x) >= (a.w + b.w) / 2) return null
  for (let T = t0; T < end; T += 10) {
    const ba = a.y + floatRise(T - a.t), bb = b.y + floatRise(T - b.t)
    if (ba > bb - b.h - gap && ba - a.h < bb + gap) return T
  }
  return null
}

test('floatSlot: chữ nổi liên tiếp gần cùng chỗ ("Giữa ly!" hai lần ở bước Thả đá) được dời lên, so le, không chồng suốt lúc bay', () => {
  const W = 90, Hh = 24
  // không có chữ nào / chữ ở xa / chữ đã mờ: giữ nguyên chỗ
  assert.deepEqual(floatSlot([], { x: 200, y: 300, w: W, h: Hh, text: 'A' }, { now: 0 }), { x: 200, y: 300, lift: 0, merge: null })
  const far = [{ x: 40, y: 300, w: W, h: Hh, t: 0, text: 'B' }]
  assert.equal(floatSlot(far, { x: 300, y: 300, w: W, h: Hh, text: 'A' }, { now: 100 }).lift, 0)
  const faded = [{ x: 200, y: 300, w: W, h: Hh, t: 0, text: 'B' }]
  assert.equal(floatSlot(faded, { x: 200, y: 300, w: W, h: Hh, text: 'A' }, { now: 760 }).lift, 0, 'chữ đang mờ hẳn không tính')
  // lỗi ghi nhận: thả hai viên đá cách nhau 300 ms, cùng chữ "Giữa ly!" cùng chỗ
  for (const dt of [170, 250, 300, 400, 500]) {
    const first = { x: 200, y: 300, w: W, h: Hh, t: 1000, text: 'Giữa ly!' }
    const s = floatSlot([first], { x: 200, y: 300, w: W, h: Hh, text: 'Giữa ly!' }, { now: 1000 + dt })
    assert.equal(s.merge, null, dt + ' ms: không gộp (mỗi viên một chữ)')
    const second = { x: s.x, y: s.y, w: W, h: Hh, t: 1000 + dt }
    assert.equal(floatsOverlap(first, second), null, dt + ' ms: hai chữ chồng nhau')
    if (s.lift) {
      assert.ok(s.y < 300, 'dời LÊN trên')
      assert.notEqual(s.x, 200, 'so le ngang')
    }
  }
  // ba chữ dồn dập (mỗi 120 ms): đôi một không chồng
  const list = []
  for (let i = 0; i < 3; i++) {
    const s = floatSlot(list, { x: 200, y: 400, w: W, h: Hh, text: 'Chuẩn ' + i }, { now: i * 120 })
    assert.equal(s.merge, null)
    list.push({ x: s.x, y: s.y, w: W, h: Hh, t: i * 120, text: 'Chuẩn ' + i })
  }
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.equal(floatsOverlap(list[i], list[j]), null, `chữ ${i} và ${j} chồng nhau`)
  assert.ok(list[1].y < list[0].y && list[2].y < list[1].y, 'xếp tầng lên trên')
  assert.ok(list[1].x !== list[2].x, 'so le trái / phải')
  // giảm chuyển động: chữ đứng yên → tầng trên cách đủ một chiều cao chữ
  const r = floatSlot([{ x: 200, y: 300, w: W, h: Hh, t: 0, text: 'A', reduced: true }], { x: 200, y: 300, w: W, h: Hh, text: 'B' }, { now: 50, reduced: true })
  assert.ok(near(r.y, 300 - Hh - 4), 'giảm chuyển động: dời lên đúng một tầng ' + r.y)
})

test('floatSlot: trùng chữ trùng chỗ trong 160 ms → gộp vào chữ cũ; hết chỗ phía trên → gộp thay vì đè', () => {
  const old = { x: 200, y: 300, w: 90, h: 24, t: 0, text: 'Giữa ly!' }
  const m = floatSlot([old], { x: 204, y: 296, w: 90, h: 24, text: 'Giữa ly!' }, { now: 100 })
  assert.equal(m.merge, old)
  assert.ok(near(m.y + floatRise(0), old.y + floatRise(100)), 'chữ gộp hiện đúng chỗ chữ cũ đang đứng')
  // khác chữ thì không gộp kiểu "×2" mà dời lên
  assert.equal(floatSlot([old], { x: 200, y: 300, w: 90, h: 24, text: 'Hơi lệch' }, { now: 100 }).merge, null)
  // sát mép trên (minY): không còn chỗ dời lên → gộp
  const top = { x: 200, y: 50, w: 90, h: 24, t: 0, text: 'A' }
  const s = floatSlot([top], { x: 200, y: 52, w: 90, h: 24, text: 'B' }, { now: 200, minY: 40 })
  assert.equal(s.merge, top)
})

test('createVfx (DOM giả): floatText liên tiếp cùng chỗ không đè nhau (dời lên, so le); trùng hẳn → "×2"; clear() quên chữ cũ', async () => {
  const D = fakeDom()
  const fx = createVfx({ host: D.host, reduced: () => false })
  const at = { x: 200, y: 420 }
  const a = fx.floatText(at, 'Giữa ly!', { tone: 'good', size: 'small' })
  await sleep(200)
  const b = fx.floatText(at, 'Giữa ly!', { tone: 'good', size: 'small' })
  assert.ok(a && b && a !== b)
  const ya = parseFloat(a.style.top), yb = parseFloat(b.style.top)
  assert.ok(yb < ya - 15, `chữ sau phải dời lên trên: ${ya} → ${yb}`)
  assert.notEqual(a.style.left, b.style.left, 'so le ngang')
  assert.equal(b.textContent, 'Giữa ly!')
  // trùng chữ, trùng chỗ, cùng lúc → gộp: chữ cũ rời lớp, chữ mới ghi "×2"
  const c1 = fx.floatText({ x: 120, y: 700 }, 'Chuẩn!')
  const before = fx.stats().dom
  const c2 = fx.floatText({ x: 120, y: 700 }, 'Chuẩn!')
  assert.equal(c2.textContent, 'Chuẩn! ×2')
  assert.equal(fx.stats().dom, before, 'gộp: không thêm nút')
  assert.ok(c1 === c2 || c1.parentNode === null)
  assert.equal(fx.floatText({ x: 120, y: 700 }, 'Chuẩn!').textContent, 'Chuẩn! ×3')
  // clear(): chữ cũ không còn làm chữ mới phải dời
  fx.clear()
  const d = fx.floatText(at, 'Giữa ly!', { size: 'small' })
  assert.equal(parseFloat(d.style.top), ya, 'sau clear() chữ về đúng chỗ gốc')
  fx.destroy()
})

// Ghi lại khung WAAPI của mọi hoạt ảnh trong DOM giả.
function recordAnims(D) {
  const orig = D.El.prototype.animate
  D.El.prototype.animate = function (kf, opts) { const a = orig.call(this); a.kf = kf; a.opts = opts; return a }
  return () => { D.El.prototype.animate = orig }
}

test('createVfx (DOM giả): coins theo số tiền — số xu theo coinCount, so le, dừng giữa đường, onArrive mỗi xu, tổng cuối đúng số tiền', async () => {
  const D = fakeDom()
  const undo = recordAnims(D)
  try {
    const fx = createVfx({ host: D.host, reduced: () => false })
    const src = D.box(120, 560, 120, 60)
    const wallet = D.box(250, 10, 110, 30)
    const calls = []
    const run = fx.coins(src, wallet, { amount: 25000, unit: 1000, onArrive: i => calls.push(i) })
    const flying = fx.layer.children.filter(e => e.className === 'vfx-coin')
    assert.equal(flying.length, coinCount(25000), 'số xu theo số tiền')
    const anims = flying.map(e => e.getAnimations()[0])
    for (const [i, an] of anims.entries()) {
      assert.equal(an.opts.delay, i * 40, 'so le 40 ms')
      assert.equal(an.opts.duration, COIN_TIMING.out + COIN_TIMING.hold + COIN_TIMING.fly)
      for (const k of an.kf) assert.deepEqual(Object.keys(k).filter(p => !['offset', 'opacity', 'transform'].includes(p)), [], 'chỉ transform / opacity')
    }
    assert.equal(calls.length, 0, 'chưa xu nào tới')
    // xu tới lần lượt
    for (const an of anims) an.finish()
    await flush()
    assert.equal(await run, flying.length)
    assert.equal(calls.length, flying.length, 'mỗi xu một lần onArrive')
    assert.deepEqual(calls.map(c => c.index), [...calls.keys()])
    for (let i = 1; i < calls.length; i++) assert.ok(calls[i].sum >= calls[i - 1].sum, 'tổng tăng dần')
    assert.equal(calls.filter(c => c.last).length, 1)
    assert.equal(calls[calls.length - 1].last, true)
    assert.equal(calls[calls.length - 1].sum, 25000, 'tổng cuối đúng số tiền')
    assert.ok(calls.every(c => c.share % 1000 === 0 && c.amount === 25000 && c.count === flying.length && !c.cut && !c.skipped))
    assert.ok(wallet.getAnimations().length <= 1, 'ví nảy (một hoạt ảnh nảy, cái sau thay cái trước)')
    // API cũ vẫn chạy: coins(from, to, n) không có tiền
    const old = fx.coins(src, wallet, 3)
    const three = fx.layer.children.filter(e => e.className === 'vfx-coin')
    assert.equal(three.length, 3)
    for (const e of three) e.getAnimations()[0].finish()
    assert.equal(await old, 3)
    fx.destroy()
  } finally { undo() }
})

test('createVfx (DOM giả): coins không bay được (giảm chuyển động, đích ẩn) → 0 xu nhưng onArrive giao gộp một lần; clear() giữa chừng → giao nốt (cut)', async () => {
  const D = fakeDom()
  const src = D.box(120, 560, 120, 60)
  const wallet = D.box(250, 10, 110, 30)
  // giảm chuyển động
  const red = createVfx({ host: D.host, reduced: () => true })
  const calls = []
  const p = red.coins(src, wallet, { amount: 12000, onArrive: i => calls.push(i) })
  assert.equal(calls.length, 0, 'không gọi đồng bộ trong lời gọi coins')
  assert.equal(await p, 0)
  await flush()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].sum, 12000)
  assert.equal(calls[0].last, true)
  assert.equal(calls[0].skipped, true)
  assert.equal(red.stats().dom, 0)
  red.destroy()
  // đích ẩn
  const fx = createVfx({ host: D.host, reduced: () => false })
  const hidden = D.box(10, 10, 40, 40)
  hidden.hiddenBox = true
  const c2 = []
  assert.equal(await fx.coins(src, hidden, 4, { amount: 3000, onArrive: i => c2.push(i) }), 0)
  await flush()
  assert.equal(c2.length, 1)
  assert.equal(c2[0].sum, 3000)
  // clear() giữa chừng: 2 xu đã tới, phần còn lại giao gộp trong lần cuối (cut)
  const c3 = []
  const run = fx.coins(src, wallet, 5, { amount: 10000, onArrive: i => c3.push(i) })
  const coinsEl = fx.layer.children.filter(e => e.className === 'vfx-coin')
  coinsEl[0].getAnimations()[0].finish()
  coinsEl[1].getAnimations()[0].finish()
  await flush()
  assert.equal(c3.length, 2)
  fx.clear()
  assert.equal(await run, 2, 'chỉ đếm xu đã tới')
  await flush()
  assert.equal(c3.length, 3)
  const last = c3[2]
  assert.equal(last.cut, true)
  assert.equal(last.last, true)
  assert.equal(last.sum, 10000, 'tổng vẫn đúng số tiền')
  assert.equal(last.share, 10000 - c3[1].sum)
  assert.deepEqual(fx.stats(), { dom: 0, particles: 0 })
  // onArrive lỗi không làm hỏng luồng xu
  const bad = fx.coins(src, wallet, 2, { amount: 2000, onArrive: () => { throw new Error('x') } })
  for (const e of fx.layer.children.filter(x => x.className === 'vfx-coin')) e.getAnimations()[0].finish()
  assert.equal(await bad, 2)
  fx.destroy()
})

test('createVfx (DOM giả): vfx.countUp — giảm chuyển động: số ngay + nhịp sáng chỉ đổi opacity; đếm thường: counting(el), clear() nhảy tới số cuối', async () => {
  const D = fakeDom()
  const undo = recordAnims(D)
  try {
    const wallet = D.box(250, 10, 110, 30)
    wallet.dataset = { amount: '45000' }
    const fmt = v => v + 'đ'
    const red = createVfx({ host: D.host, reduced: () => true })
    red.countUp(wallet, 20000, 45000, 600, fmt)
    assert.equal(wallet.textContent, '45000đ', 'cập nhật ngay')
    const g = red.layer.children.find(e => e.getAttribute('data-kind') === 'glow')
    assert.ok(g, 'có một nhịp sáng trong lớp hiệu ứng')
    const kf = g.getAnimations()[0].kf
    assert.ok(kf.every(k => !('transform' in k)), 'giảm chuyển động: nhịp sáng chỉ đổi opacity')
    assert.ok(kf.some(k => k.opacity > 0.5), 'có sáng lên')
    assert.equal(wallet.dataset.amount, '45000')
    red.destroy()
    // đếm thường
    const fx = createVfx({ host: D.host, reduced: () => false })
    const h = fx.countUp(wallet, 45000, 60000, 600, fmt)
    assert.equal(fx.counting(wallet), true)
    assert.equal(wallet.textContent, '45000đ', 'bắt đầu từ số cũ')
    assert.equal(fx.layer.children.filter(e => e.getAttribute('data-kind') === 'glow').length, 0, 'đếm thường: không nhịp sáng')
    D.frames(2)
    fx.clear()
    assert.equal(wallet.textContent, '60000đ', 'clear() cho bộ đếm nhảy tới số cuối')
    assert.equal(await h.done, true)
    assert.equal(fx.counting(wallet), false)
    // trang ẩn: ghi thẳng số cuối, không nhịp sáng
    D.setHidden(true)
    fx.countUp(wallet, 60000, 70000, 600, fmt)
    assert.equal(wallet.textContent, '70000đ')
    assert.equal(fx.stats().dom, 0)
    D.setHidden(false)
    // nhịp sáng gọi thẳng; đích ẩn → null
    assert.ok(fx.glow(wallet))
    const hid = D.box(0, 0, 10, 10)
    hid.hiddenBox = true
    assert.equal(fx.glow(hid), null)
    fx.destroy()
  } finally { undo() }
})

test('createVfx không có DOM: countUp / counting / glow / coins có onArrive vẫn an toàn', async () => {
  const fx = createVfx({ host: null, reduced: () => false })
  for (const fn of ['countUp', 'counting', 'glow']) assert.equal(typeof fx[fn], 'function', 'thiếu ' + fn)
  assert.equal(fx.glow({ x: 1, y: 1 }), null)
  const el = { textContent: '' }
  const h = fx.countUp(el, 0, 300, 60)
  assert.equal(await h.done, true)
  assert.equal(el.textContent, '300')
  const got = []
  assert.equal(await fx.coins({ x: 0, y: 0 }, { x: 10, y: 10 }, { amount: 5000, onArrive: i => got.push(i) }), 0)
  await flush()
  assert.equal(got.length, 1)
  assert.equal(got[0].sum, 5000)
  fx.destroy()
})

// ---------- M5 Đợt 3 (gói M-N): quà, rương, điểm danh ----------
import { REWARD_FX, rewardBurstPlan, rewardBurst, chestOpen } from '../../src/ui/vfx.js'

// Hệ hiệu ứng giả: ghi lại lời gọi API công khai (rewardBurst / chestOpen chỉ dùng API đó).
function fakeFx() {
  const calls = []
  return {
    calls,
    burst: (t, kind, o) => { calls.push(['burst', kind, o && o.n]); return 3 },
    coins: (from, to, n, o) => { calls.push(['coins', n, o && o.amount, to.id]); return Promise.resolve(n) },
    fly: (from, to, o) => { calls.push(['fly', to.id, o.ms, from.width]); return Promise.resolve(true) },
    glow: t => { calls.push(['glow', t.id]); return {} },
    squash: el => { calls.push(['squash', el.id]); return {} }
  }
}
const SRC = { left: 100, top: 300, width: 120, height: 44 }

test('rewardBurstPlan: số mảnh bay theo loại (xu theo số tiền, muỗng ceil(n/5) trong 2–5, sao 1–3), không đích / giảm chuyển động thì 0, tổng ≤ 27', () => {
  assert.ok(Object.isFrozen(REWARD_FX))
  assert.deepEqual({ ...REWARD_FX }, { maxSpoons: 5, maxStars: 3, stagger: 70, flyMs: 540 })
  const to = { id: 'vi' }
  const p = rewardBurstPlan([
    { kind: 'coin', amount: 5000, to }, { kind: 'coin', amount: 200000, to }, { kind: 'coin', n: 99, to }, { kind: 'coin', to },
    { kind: 'spoon', n: 5, to }, { kind: 'spoon', n: 15, to }, { kind: 'spoon', n: 99, to },
    { kind: 'star', n: 9, to }, { kind: 'item', to }, { kind: 'la', n: 2, to }, { kind: 'star', n: 3 }
  ])
  // trần tổng 27 (= 30 − canvas − 2 vòng sáng): 6 + 12 rồi mục thứ ba chỉ còn 9, các mục sau hết chỗ
  assert.deepEqual(p.items.map(i => i.n), [6, 12, 9, 0, 0, 0, 0, 0, 0, 0, 0])
  // từng mục (không tính trần tổng)
  const one = it => rewardBurstPlan([it]).items[0].n
  assert.equal(one({ kind: 'coin', amount: 5000, to }), 6)
  assert.equal(one({ kind: 'coin', amount: 200000, to }), 12)
  assert.equal(one({ kind: 'coin', n: 99, to }), 12)
  assert.equal(one({ kind: 'coin', to }), 8)
  assert.equal(one({ kind: 'spoon', n: 5, to }), 2)
  assert.equal(one({ kind: 'spoon', n: 15, to }), 3)
  assert.equal(one({ kind: 'spoon', n: 99, to }), 5)
  assert.equal(one({ kind: 'star', n: 9, to }), 3)
  assert.equal(one({ kind: 'item', to }), 1)
  assert.equal(rewardBurstPlan([{ kind: 'la', n: 2, to }]).items[0].kind, 'star', 'loại lạ → sao')
  assert.equal(one({ kind: 'star', n: 3 }), 0, 'không đích: không bay')
  // trần tổng: chừa canvas + 2 vòng sáng trong VFX_LIMITS.dom
  assert.ok(p.dom <= VFX_LIMITS.dom - 3, 'tổng ' + p.dom)
  assert.equal(p.dom, p.items.reduce((a, i) => a + i.n, 0))
  const red = rewardBurstPlan([{ kind: 'coin', amount: 5000, to }, { kind: 'spoon', n: 10, to }], { reduced: true })
  assert.equal(red.reduced, true)
  assert.deepEqual(red.items.map(i => i.n), [0, 0])
  assert.deepEqual(rewardBurstPlan(null).items, [])
})

test('rewardBurst: nổ sao tại nguồn, xu qua fx.coins, muỗng bay so le qua fx.fly (ô 34px), nhịp sáng ở mỗi đích', async () => {
  const fx = fakeFx()
  const r = await rewardBurst(fx, SRC, [
    { kind: 'coin', amount: 20000, to: { id: 'vi' } }, { kind: 'spoon', n: 10, to: { id: 'muong' }, html: '<svg viewBox="0 0 64 64"></svg>' },
    { kind: 'star', n: 2 }
  ], { reduced: false })
  assert.deepEqual(r, { coins: 8, flown: 2 })
  const kinds = fx.calls.map(c => c[0])
  assert.deepEqual(fx.calls.filter(c => c[0] === 'burst').map(c => c[1]), ['star', 'sparkle'])
  assert.deepEqual(fx.calls.find(c => c[0] === 'coins'), ['coins', 8, 20000, 'vi'])
  const flies = fx.calls.filter(c => c[0] === 'fly')
  assert.equal(flies.length, 2)
  assert.ok(flies.every(c => c[1] === 'muong' && c[3] === 34), 'mảnh bay là ô 34px, không kéo giãn theo nút')
  assert.ok(flies[1][2] > flies[0][2], 'mảnh sau bay lâu hơn một chút (so le)')
  assert.deepEqual(fx.calls.filter(c => c[0] === 'glow').map(c => c[1]).sort(), ['muong', 'vi'])
  assert.ok(kinds.indexOf('burst') < kinds.indexOf('coins'), 'nổ tại nguồn trước rồi mới bay')
})

test('rewardBurst giảm chuyển động: chỉ dấu tĩnh tại nguồn + một nhịp sáng ở mỗi đích, không bay; nguồn lỗi → không làm gì', async () => {
  const fx = fakeFx()
  const r = await rewardBurst(fx, SRC, [{ kind: 'coin', amount: 5000, to: { id: 'vi' } }, { kind: 'spoon', n: 5, to: { id: 'muong' } }], { reduced: true })
  assert.deepEqual(r, { coins: 0, flown: 0 })
  assert.deepEqual(fx.calls.map(c => c[0]).sort(), ['burst', 'glow', 'glow'])
  assert.equal(fx.calls.filter(c => c[0] === 'burst').length, 1, 'không lấp lánh thêm')
  const fx2 = fakeFx()
  assert.deepEqual(await rewardBurst(fx2, null, [{ kind: 'coin', to: { id: 'vi' } }]), { coins: 0, flown: 0 })
  assert.deepEqual(await rewardBurst(null, SRC, []), { coins: 0, flown: 0 })
  assert.deepEqual(fx2.calls, [])
  // phần tử nguồn đã rời trang (isConnected false) → bỏ qua
  const gone = { isConnected: false, getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }) }
  assert.deepEqual(await rewardBurst(fx2, gone, [{ kind: 'coin', to: { id: 'vi' } }]), { coins: 0, flown: 0 })
  assert.deepEqual(fx2.calls, [])
})

test('chestOpen: rương nảy squash rồi bung sao + xu; giảm chuyển động chỉ một nhịp sáng; phần tử đã rời trang → false', async () => {
  const fx = fakeFx()
  assert.equal(await chestOpen(fx, { id: 'ruong' }, { reduced: false }), true)
  assert.deepEqual(fx.calls.map(c => c.slice(0, 2)), [['squash', 'ruong'], ['burst', 'star'], ['burst', 'coin']])
  const fx2 = fakeFx()
  assert.equal(await chestOpen(fx2, { id: 'ruong' }, { reduced: true }), true)
  assert.deepEqual(fx2.calls, [['glow', 'ruong']])
  const fx3 = fakeFx()
  assert.equal(await chestOpen(fx3, { isConnected: false, getBoundingClientRect() {} }), false)
  assert.equal(await chestOpen(null, { id: 'x' }), false)
  assert.deepEqual(fx3.calls, [])
})

test('rewardBurst + createVfx thật không có DOM: không lỗi, không nút, Promise kết thúc', async () => {
  const fx = createVfx({ host: null, reduced: () => false })
  const r = await rewardBurst(fx, SRC, [{ kind: 'coin', amount: 5000, to: { left: 0, top: 0, width: 20, height: 20 } }], { reduced: false })
  assert.equal(typeof r.coins, 'number')
  assert.equal(fx.stats().dom, 0)
  assert.equal(await chestOpen(fx, { left: 1, top: 1, width: 4, height: 4 }, { reduced: true }), true)
  fx.destroy()
})
