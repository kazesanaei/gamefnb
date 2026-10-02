// M5 Đợt 0 — nền móng hiệu ứng: hàm thuần của src/ui/vfx.js (easing, Bézier, kế hoạch hạt, mô phỏng hạt),
// giới hạn VFX_LIMITS, import vfx.js / motion.js trong Node không chạm DOM, isReduced(app) theo Cài đặt,
// và quy ước css/theme.css (font Baloo 2 tự lưu, chỉ biến --g-*, chỉ lớp g- / vfx-, giảm chuyển động).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  VFX_LIMITS, VFX_KINDS, GRAVITY, easeOutBack, easeOutCubic, bezier, particlePlan, spawnParticles, stepParticles, createVfx
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
