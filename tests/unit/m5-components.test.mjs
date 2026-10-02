// Thành phần bếp M5 (Đợt 0, gói 0-C): thẻ vào bước, con dấu, Dì Sáu phản ứng, màn ra món, khung sân khấu mới, Thái kiểu mới.
// Chỉ kiểm phần thuần và việc import trong Node (không DOM); phần giao diện kiểm bằng e2e trang mẫu.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { BALANCE } from '../../src/data/balance.js'
import { DIALOGUE } from '../../src/data/dialogue.js'

const MODULES = [
  '../../src/ui/components/step-card.js',
  '../../src/ui/components/stamp.js',
  '../../src/ui/components/dish-reveal.js',
  '../../src/ui/components/disau-react.js',
  '../../src/ui/minigames/_frame.js',
  '../../src/ui/minigames/thai.js'
]

test('các module thành phần M5 import được trong Node (không chạm document/window ở cấp module)', async () => {
  assert.equal(typeof globalThis.document, 'undefined')
  for (const m of MODULES) {
    const mod = await import(m)
    assert.ok(Object.keys(mod).length > 0, `${m} không export gì`)
  }
})

test('stepCardModel: ruy băng "Bước k/N", động từ có "!", nguyên liệu, cử chỉ, câu hướng dẫn', async () => {
  const { stepCardModel, GESTURE_BY_TYPE } = await import('../../src/ui/components/step-card.js')
  const R = DATA.RECIPES.banh_mi_op_la
  const step = R.steps.find(s => s.id === 'thai_dua')
  const m = stepCardModel(step, { index: 3, total: 6, data: DATA, recipe: R })
  assert.equal(m.ribbon, 'Bước 3/6')
  assert.equal(m.verb, 'Thái dưa leo!')
  assert.equal(m.ingId, 'dua_leo')
  assert.equal(m.gesture, 'drag-cut')
  assert.equal(m.gesture, GESTURE_BY_TYPE.thai)
  assert.equal(m.hint, DATA.MINIGAME_TYPES.thai.hint)
  // không truyền data vẫn có câu hướng dẫn
  assert.equal(stepCardModel(step, { index: 1, total: 2 }).hint, DATA.MINIGAME_TYPES.thai.hint)
  // k kẹp trong [1, N]
  assert.equal(stepCardModel(step, { index: 9, total: 4 }).ribbon, 'Bước 4/4')
  assert.equal(stepCardModel(step, { index: 0, total: 4 }).ribbon, 'Bước 1/4')
  // bước không có nguyên liệu: hình món
  const noIng = stepCardModel({ type: 'lua', label: 'Nướng giòn bánh mì' }, { index: 2, total: 5, recipe: R })
  assert.equal(noIng.ingId, R.icon)
  assert.equal(noIng.gesture, 'tap-zone')
})

test('động từ thẻ bước gọn (≤ 4 chữ + "!") cho mọi bước trong công thức', async () => {
  const { stepVerb } = await import('../../src/ui/components/step-card.js')
  assert.equal(stepVerb('Bóp muối, xả cho hết đắng'), 'Bóp muối!')
  assert.equal(stepVerb('Chế nước sôi vào phin'), 'Chế nước sôi!')
  assert.equal(stepVerb('Đập trứng gà ta vào chảo'), 'Đập trứng gà ta!')
  for (const r of Object.values(DATA.RECIPES)) {
    for (const s of r.steps) {
      const v = stepVerb(s.label)
      assert.ok(v.endsWith('!'), `${r.id}.${s.id}: ${v}`)
      assert.ok(v.slice(0, -1).trim().split(/\s+/).length <= 4, `${r.id}.${s.id}: "${v}" quá dài`)
    }
  }
})

test('GESTURE_BY_TYPE có đủ 11 loại thao tác (6 cũ + 5 mới), loại trong dữ liệu đều có cử chỉ', async () => {
  const { GESTURE_BY_TYPE } = await import('../../src/ui/components/step-card.js')
  for (const t of ['chon', 'cha', 'thai', 'cham', 'lua', 'rot', 'dap', 'xoay', 'got', 'lac', 'bay']) {
    assert.equal(typeof GESTURE_BY_TYPE[t], 'string', `thiếu cử chỉ ${t}`)
  }
  for (const t of Object.keys(DATA.MINIGAME_TYPES)) assert.ok(GESTURE_BY_TYPE[t], `thiếu cử chỉ ${t}`)
})

test('gradeKey: biên 49/50/69/70/89/90 theo BALANCE.stepLabels', async () => {
  const { gradeKey, gradeText } = await import('../../src/ui/components/stamp.js')
  const L = BALANCE.stepLabels
  assert.equal(gradeKey(49, L), 'hong')
  assert.equal(gradeKey(50, L), 'dat')
  assert.equal(gradeKey(69, L), 'dat')
  assert.equal(gradeKey(70, L), 'tot')
  assert.equal(gradeKey(89, L), 'tot')
  assert.equal(gradeKey(90, L), 'hoan_hao')
  assert.equal(gradeKey(100), 'hoan_hao')
  assert.equal(gradeKey(0), 'hong')
  assert.equal(gradeKey('abc'), 'hong')
  assert.equal(gradeKey(-5), 'hong')
  // khớp nhãn lõi trả về (submitStep dùng cùng bảng)
  for (const [min, label] of L) assert.equal(gradeText(gradeKey(min, L), L), label)
})

test('stampSvg: 4 hạng khác hình (không chỉ khác màu), không có url/href/null/NaN', async () => {
  const { stampSvg, GRADE_KEYS } = await import('../../src/ui/components/stamp.js')
  const shapes = new Set()
  for (const k of GRADE_KEYS) {
    const s = stampSvg(k)
    assert.match(s, /^<svg [^>]*viewBox="0 0 120 120"/)
    for (const bad of ['url(', 'href', 'null', 'NaN', 'undefined']) assert.ok(!s.includes(bad), `${k}: có "${bad}"`)
    shapes.add(s.match(/<path d="([^"]+)" fill="[^"]+" stroke=/)[1])
  }
  assert.equal(shapes.size, GRADE_KEYS.length, 'mỗi hạng một hình dấu riêng')
})

test('revealPlan: thường ≤ 2.200 ms, giảm chuyển động ≤ 1.400 ms; nhịp nằm trong tổng; sao theo hạng', async () => {
  const { revealPlan, REVEAL_MS, REVEAL_MS_REDUCED, COUNT_MS, STAR_GAP_MS, starsOf, DISH_GRADES } = await import('../../src/ui/components/dish-reveal.js')
  assert.equal(REVEAL_MS, 2200)
  assert.equal(REVEAL_MS_REDUCED, 1400)
  const expectStars = { tuyet_hao: 5, ngon: 4, duoc: 3, kem: 2, hong: 1 }
  for (const grade of DISH_GRADES) {
    assert.equal(starsOf(grade), expectStars[grade])
    for (const flawless of [false, true]) {
      for (const levelUp of [false, true]) {
        const dish = { grade, q: 77, flawless, mastery: levelUp ? { levelUp: true } : null }
        const p = revealPlan(dish, { reduced: false })
        assert.ok(p.totalMs <= 2200)
        assert.equal(p.stars, expectStars[grade])
        assert.equal(p.q, 77)
        for (let i = 1; i < p.beats.length; i++) assert.ok(p.beats[i].at >= p.beats[i - 1].at, 'nhịp tăng dần')
        for (const b of p.beats) assert.ok(b.at >= 0 && b.at < p.totalMs, `${grade} ${b.kind} ở ${b.at}`)
        const count = p.beats.find(b => b.kind === 'count')
        assert.ok(count && count.at + COUNT_MS <= p.totalMs, 'đếm % xong trước khi hết giờ')
        const stars = p.beats.filter(b => b.kind === 'star')
        assert.equal(stars.length, 5)
        assert.equal(stars.filter(b => b.on).length, expectStars[grade])
        for (let i = 1; i < stars.length; i++) assert.equal(stars[i].at - stars[i - 1].at, STAR_GAP_MS)
        assert.equal(p.beats.some(b => b.kind === 'ribbon'), flawless)
        assert.equal(p.beats.some(b => b.kind === 'confetti'), levelUp)
        const r = revealPlan(dish, { reduced: true })
        assert.ok(r.totalMs <= 1400)
        assert.ok(r.beats.every(b => b.at === 0), 'giảm chuyển động: hiện thẳng')
        assert.ok(!r.beats.some(b => b.kind === 'confetti' || b.kind === 'sparkle'), 'giảm chuyển động: không pháo giấy, không hạt')
      }
    }
  }
  // hạng cao mới có kèn
  assert.equal(revealPlan({ grade: 'tuyet_hao', q: 95 }).high, true)
  assert.equal(revealPlan({ grade: 'ngon', q: 80 }).high, true)
  assert.equal(revealPlan({ grade: 'kem', q: 45 }).high, false)
  // q kẹp 0–100, hạng lạ coi như Được
  assert.equal(revealPlan({ grade: 'x', q: 140 }).q, 100)
  assert.equal(revealPlan({ grade: 'x', q: 140 }).grade, 'duoc')
})

test('reactLine: đủ 4 hạng, mỗi hạng 3–5 câu tự viết, chọn theo rand, hạng lạ dùng câu Đạt', async () => {
  const { reactLine, MOOD_BY_KEY } = await import('../../src/ui/components/disau-react.js')
  const table = DIALOGUE.diSau.stepReact
  for (const key of ['hoan_hao', 'tot', 'dat', 'hong']) {
    const lines = table[key]
    assert.ok(Array.isArray(lines) && lines.length >= 3 && lines.length <= 5, `${key}: ${lines && lines.length} câu`)
    assert.equal(reactLine(key, () => 0), lines[0])
    assert.equal(reactLine(key, () => 0.999), lines[lines.length - 1])
    assert.ok(lines.includes(reactLine(key)))
    assert.ok(lines.includes(reactLine(key, () => 0.5, DATA)))
    for (const s of lines) {
      assert.ok(s.trim().length > 4 && s.length <= 48, `câu quá dài/ngắn: ${s}`)
      assert.ok(!/sửa giùm|sửa dùm/i.test(s), `tránh kiểu câu "để dì sửa giùm": ${s}`)
    }
    assert.ok(MOOD_BY_KEY[key])
  }
  assert.equal(reactLine('khong_co', () => 0), table.dat[0])
})

test('buildFrame2: chấm bước (xong/hiện tại/chưa) và hạng của bước đã xong', async () => {
  const { stepDots } = await import('../../src/ui/minigames/_frame.js')
  const d = stepDots({ index: 3, total: 5, grades: ['hoan_hao', 'hong'] })
  assert.deepEqual(d.map(x => x.state), ['done', 'done', 'now', 'todo', 'todo'])
  assert.deepEqual(d.map(x => x.grade), ['hoan_hao', 'hong', null, null, null])
  assert.equal(stepDots({ index: 7, total: 3 }).filter(x => x.state === 'now')[0].n, 3)
  assert.equal(stepDots({ index: 1, total: 1, grades: ['la'] })[0].grade, null)
})

test('Thái kiểu mới: lát tách đều 8px, tư thế dưa leo có hình thái lát, giữ hằng số cũ', async () => {
  const { sliceOffsets, SLICE_GAP_PX, CUT_POSE, KNIFE_OFFSET_PX, MIN_FOOD_WIDTH, cutLabel } = await import('../../src/ui/minigames/thai.js')
  const { STATES_V2, PROP_META } = await import('../../src/ui/art/v2.js')
  assert.equal(SLICE_GAP_PX, 8)
  assert.equal(KNIFE_OFFSET_PX, 40)
  assert.equal(MIN_FOOD_WIDTH, 280)
  assert.equal(cutLabel(100), 'Chuẩn!')
  assert.deepEqual(sliceOffsets(0), [0])
  for (const m of [1, 3, 5]) {
    const o = sliceOffsets(m)
    assert.equal(o.length, m + 1)
    for (let i = 1; i < o.length; i++) assert.equal(o[i] - o[i - 1], 8)
    assert.equal(o[0], -o[m], 'tách đối xứng quanh giữa')
  }
  const pose = CUT_POSE.dua_leo
  assert.ok(STATES_V2['dua_leo.' + pose.state], 'có hình dua_leo.lat')
  const [x0, y0, x1, y1] = pose.box
  assert.ok(x0 >= 0 && y0 >= 0 && x1 <= 64 && y1 <= 64 && x1 > x0 && y1 > y0)
  assert.ok(PROP_META.thot_lon && PROP_META.dao_lon && PROP_META.dao_lon.tip, 'cần mốc thớt và mũi dao')
})

// Chặn click ma của thẻ bước (sửa lỗi vòng kiểm chứng: chạm thẻ bằng tay thì click rơi xuống nút "Xong" của sân khấu mới).
const ev = (type, extra = {}) => Object.assign(new Event(type, { cancelable: true, bubbles: true }), extra)
const sleep = ms => new Promise(r => setTimeout(r, ms))

test('guardNextClick: nuốt đúng MỘT click của lần chạm vào bước, click sau đó đi bình thường', async () => {
  const { guardNextClick } = await import('../../src/ui/components/step-card.js')
  const win = new EventTarget()
  let clicks = 0
  guardNextClick(win, { pointerId: 7, afterUpMs: 30, maxMs: 500 })
  // nút "Xong" (EventTarget của Node không có cây phần tử: bộ chặn ở pha capture của window chạy trước nút trong trình duyệt,
  // ở đây đăng ký sau để giữ đúng thứ tự đó)
  win.addEventListener('click', () => { clicks++ })
  win.dispatchEvent(ev('pointerup', { pointerId: 7 }))
  const c1 = ev('click')
  win.dispatchEvent(c1)
  assert.equal(c1.defaultPrevented, true, 'click của chính lần chạm bị chặn')
  assert.equal(clicks, 0, 'không tới nút bên dưới')
  const c2 = ev('click')
  win.dispatchEvent(c2)
  assert.equal(c2.defaultPrevented, false, 'click kế tiếp không bị chặn')
  assert.equal(clicks, 1)
})

test('guardNextClick: lần chạm mới hoặc hết hạn sau khi nhấc ngón thì thôi chặn; ngón khác nhấc không tính', async () => {
  const { guardNextClick } = await import('../../src/ui/components/step-card.js')
  // lần chạm mới (pointerdown) → thôi chặn: click của nó tới nút
  const a = new EventTarget()
  guardNextClick(a, { pointerId: 1, afterUpMs: 30, maxMs: 500 })
  a.dispatchEvent(ev('pointerdown', { pointerId: 2 }))
  const ca = ev('click')
  a.dispatchEvent(ca)
  assert.equal(ca.defaultPrevented, false)
  // nhấc ngón mà không có click (vuốt / nhấn giữ) → sau afterUpMs thì thôi chặn
  const b = new EventTarget()
  guardNextClick(b, { pointerId: 1, afterUpMs: 20, maxMs: 500 })
  b.dispatchEvent(ev('pointerup', { pointerId: 1 }))
  await sleep(40)
  const cb = ev('click')
  b.dispatchEvent(cb)
  assert.equal(cb.defaultPrevented, false)
  // ngón khác nhấc lên không làm hết hạn sớm; click của ngón đang chạm vẫn bị chặn
  const c = new EventTarget()
  guardNextClick(c, { pointerId: 1, afterUpMs: 20, maxMs: 500 })
  c.dispatchEvent(ev('pointerup', { pointerId: 9 }))
  await sleep(40)
  const cc = ev('click')
  c.dispatchEvent(cc)
  assert.equal(cc.defaultPrevented, true)
  // quá maxMs thì tự gỡ; off() gỡ ngay; target thiếu thì không lỗi
  const d = new EventTarget()
  guardNextClick(d, { maxMs: 20 })
  await sleep(40)
  const cd = ev('click')
  d.dispatchEvent(cd)
  assert.equal(cd.defaultPrevented, false)
  const e = new EventTarget()
  const off = guardNextClick(e, { maxMs: 500 })
  off()
  const ce = ev('click')
  e.dispatchEvent(ce)
  assert.equal(ce.defaultPrevented, false)
  assert.equal(typeof guardNextClick(null), 'function')
})

test('con dấu và màn ra món gọi âm bằng tên viết thẳng sound(\'…\') (audio.test kiểm được), không qua hàm bọc', async () => {
  const { readFileSync } = await import('node:fs')
  const { SOUND_NAMES } = await import('../../src/ui/audio.js')
  const root = new URL('../../src/ui/components/', import.meta.url)
  const need = { 'stamp.js': ['stamp', 'sparkle'], 'dish-reveal.js': ['tick', 'whoosh', 'stamp', 'fanfare', 'error', 'ding'] }
  for (const [file, names] of Object.entries(need)) {
    const text = readFileSync(new URL(file, root), 'utf8')
    const used = new Set([...text.matchAll(/\bsound\(\s*'([a-z_]+)'\s*\)/g)].map(m => m[1]))
    for (const n of names) {
      assert.ok(used.has(n), `${file}: thiếu sound('${n}')`)
      assert.ok(SOUND_NAMES.includes(n), `${file}: âm ${n} không có trong SOUND_NAMES`)
    }
    assert.ok(!/\bplay1?\(\s*'/.test(text), `${file}: còn gọi âm qua hàm bọc play()/play1()`)
  }
})

// ---------- Đợt 1 (gói G): tiến độ "Bước k/N", cử chỉ đủ 11 loại, chế độ gọn, kết quả bước trên sân khấu thật ----------

test('stepProgress: N = số bước Thớt + 1 (bước Chọn), k = số bước đã xong + 1; làm lại không tự đếm mình; hạng theo thứ tự làm', async () => {
  const { stepProgress } = await import('../../src/ui/components/step-card.js')
  const board = [{ id: 'a', type: 'thai' }, { id: 'b', type: 'cha' }, { id: 'c', type: 'lua' }, { id: 'd', type: 'cham' }, { id: 'e', type: 'rot' }]
  // đang ở bước Chọn: chưa xong gì
  assert.deepEqual(stepProgress({ phase: 'chon', board: null, steps: {} }), { index: 1, total: 1, done: 0, grades: [] })
  assert.equal(stepProgress({ phase: 'chon', board, steps: {} }).index, 1)
  assert.equal(stepProgress({ phase: 'chon', board, steps: {} }).total, 6)
  // vừa sang Thớt: bước Chọn đã xong → Bước 2/6
  const c1 = { phase: 'thot', chonScore: 85, board, steps: {} }
  assert.deepEqual(stepProgress(c1, 'a'), { index: 2, total: 6, done: 1, grades: ['tot'] })
  // xong 2 bước (thứ tự ghi vào cook.steps là thứ tự làm) → Bước 4/6, chấm bước theo hạng
  const c2 = { phase: 'thot', chonScore: 100, board, steps: { b: { score: 55, grade: 'Đạt' }, a: { score: 92, grade: 'Hoàn hảo' } } }
  assert.deepEqual(stepProgress(c2, 'c'), { index: 4, total: 6, done: 3, grades: ['hoan_hao', 'dat', 'hoan_hao'] })
  // làm lại bước a (đã có kết quả): không tính a là đã xong → vẫn ở vị trí của a
  assert.deepEqual(stepProgress(c2, 'a'), { index: 3, total: 6, done: 2, grades: ['hoan_hao', 'dat'] })
  // nhãn lạ thì suy hạng từ điểm; điểm hỏng
  const c3 = { phase: 'thot', chonScore: 30, board, steps: { a: { score: 75, grade: 'x' }, b: { score: 'abc' } } }
  assert.deepEqual(stepProgress(c3, 'c').grades, ['hong', 'tot', null])
  // xong hết: k kẹp ở N
  const all = { phase: 'thot', chonScore: 90, board, steps: Object.fromEntries(board.map(s => [s.id, { score: 100, grade: 'Hoàn hảo' }])) }
  assert.equal(stepProgress(all).index, 6)
  assert.equal(stepProgress(all).done, 6)
  // bảng lỡ có bước Chọn: không đếm hai lần; kết quả của bước không còn trên bảng: bỏ qua
  const c4 = { phase: 'thot', chonScore: 90, board: [{ id: 'chon', type: 'chon' }, ...board], steps: { zz: { score: 100 } } }
  assert.equal(stepProgress(c4).total, 6)
  assert.equal(stepProgress(c4).index, 2)
  // thiếu phiên nấu
  assert.deepEqual(stepProgress(null), { index: 1, total: 1, done: 0, grades: [] })
})

test('stepCardModel({ cook }): "Bước k/N" tự tính từ phiên nấu thật của lõi; index/total truyền vào vẫn được ưu tiên', async () => {
  const { stepCardModel } = await import('../../src/ui/components/step-card.js')
  const { effectiveSteps } = await import('../../src/core/kitchen.js')
  const R = DATA.RECIPES.banh_mi_op_la
  const { requiredIngredients } = await import('../../src/core/scoring.js')
  const board = effectiveSteps(R, [], requiredIngredients(R, []).required, 1).filter(s => s.type !== 'chon')
  assert.ok(board.length >= 3)
  const N = board.length + 1
  const first = board[0]
  const cook = { phase: 'thot', chonScore: 100, board, steps: {} }
  assert.equal(stepCardModel(first, { cook, data: DATA, recipe: R }).ribbon, `Bước 2/${N}`)
  cook.steps[first.id] = { score: 80, grade: 'Tốt' }
  const second = board[1]
  assert.equal(stepCardModel(second, { cook, data: DATA, recipe: R }).ribbon, `Bước 3/${N}`)
  // làm lại bước đầu: vẫn là Bước 2/N
  assert.equal(stepCardModel(first, { cook, data: DATA, recipe: R }).ribbon, `Bước 2/${N}`)
  // index/total tường minh thắng phiên nấu
  assert.equal(stepCardModel(second, { cook, index: 5, total: 9 }).ribbon, 'Bước 5/9')
  assert.equal(stepCardModel(second, { cook, total: 9 }).ribbon, 'Bước 3/9')
})

test('GESTURE_BY_TYPE: đúng 11 loại, 5 loại mới có cử chỉ riêng (chạm-rồi-vuốt, vòng, vuốt xuống, lắc, kéo thả); đóng băng', async () => {
  const { GESTURE_BY_TYPE } = await import('../../src/ui/components/step-card.js')
  assert.deepEqual(Object.keys(GESTURE_BY_TYPE).sort(), ['bay', 'cha', 'cham', 'chon', 'dap', 'got', 'lac', 'lua', 'rot', 'thai', 'xoay'])
  assert.equal(GESTURE_BY_TYPE.dap, 'tap-swipe')
  assert.equal(GESTURE_BY_TYPE.xoay, 'circle')
  assert.equal(GESTURE_BY_TYPE.got, 'swipe-down')
  assert.equal(GESTURE_BY_TYPE.lac, 'shake')
  assert.equal(GESTURE_BY_TYPE.bay, 'drag')
  assert.ok(Object.isFrozen(GESTURE_BY_TYPE))
  // mỗi cử chỉ có hoạt ảnh tay mẫu riêng trong css/fx.css (trừ chạm thường dùng nhịp chạm mặc định)
  const { readFileSync } = await import('node:fs')
  const css = readFileSync(new URL('../../css/fx.css', import.meta.url), 'utf8')
  for (const g of new Set(Object.values(GESTURE_BY_TYPE))) {
    if (g === 'tap' || g === 'tap-zone') continue
    assert.match(css, new RegExp(`\\.g-step-card-demo\\[data-gesture="${g}"\\] \\.g-demo-path \\{[^}]*animation-name: g-demo-`), `thiếu hoạt ảnh tay mẫu cho ${g}`)
  }
})

// DOM giả tối giản (đủ cho h(), svgBox(), thẻ bước, con dấu, Dì Sáu, màn ra món; không cần trình duyệt).
function miniDom() {
  let doc = null
  const kebab = k => String(k).replace(/[A-Z]/g, c => '-' + c.toLowerCase())
  class N {
    constructor() { this.ownerDocument = doc; this.parentNode = null; this.childNodes = [] }
    get children() { return this.childNodes.filter(c => c instanceof E) }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === doc.documentElement }
    appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); this.childNodes.push(c); c.parentNode = this; return c }
    insertBefore(c, ref) { if (!ref) return this.appendChild(c); if (c.parentNode) c.parentNode.removeChild(c); this.childNodes.splice(this.childNodes.indexOf(ref), 0, c); c.parentNode = this; return c }
    removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c }
    remove() { if (this.parentNode) this.parentNode.removeChild(this) }
    append(...ns) { for (const n of ns) this.appendChild(n) }
    get textContent() { return this.childNodes.map(c => c.textContent).join('') }
    set textContent(v) { this.childNodes.length = 0; if (v !== '') this.appendChild(new T(v)) }
  }
  class T extends N { constructor(s) { super(); this.data = String(s) } get textContent() { return this.data } set textContent(v) { this.data = String(v) } }
  class E extends N {
    constructor(tag) {
      super()
      const self = this
      this.tagName = tag.toUpperCase()
      this.attrs = new Map()
      this.listeners = {}
      this.hidden = false
      this.style = { setProperty(k, v) { this[k] = v } }
      this.dataset = new Proxy({}, {
        get: (_, k) => self.attrs.get('data-' + kebab(k)),
        set: (_, k, v) => { self.attrs.set('data-' + kebab(k), String(v)); return true }
      })
      const put = s => self.attrs.set('class', [...s].join(' '))
      this.classList = {
        add: (...c) => { const s = self.cls(); c.forEach(x => s.add(x)); put(s) },
        remove: (...c) => { const s = self.cls(); c.forEach(x => s.delete(x)); put(s) },
        toggle: (c, on) => { const s = self.cls(); const w = on === undefined ? !s.has(c) : !!on; if (w) s.add(c); else s.delete(c); put(s); return w },
        contains: c => self.cls().has(c)
      }
    }
    cls() { return new Set((this.attrs.get('class') || '').split(/\s+/).filter(Boolean)) }
    get className() { return this.attrs.get('class') || '' }
    set className(v) { this.attrs.set('class', String(v)) }
    setAttribute(k, v) { this.attrs.set(k, String(v)) }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null }
    removeAttribute(k) { this.attrs.delete(k) }
    set innerHTML(v) { this.childNodes.length = 0; this.html = String(v) }
    addEventListener(t, f) { (this.listeners[t] ||= []).push(f) }
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter(x => x !== f) }
    fire(t, extra = {}) { const e = { type: t, button: 0, pointerId: 1, preventDefault() {}, stopPropagation() {}, ...extra }; for (const f of [...(this.listeners[t] || [])]) f(e) }
    // bộ chọn đơn giản: ".a.b" hoặc '[data-testid="x"]'
    matches(sel) {
      const m = /^\[([\w-]+)="([^"]*)"\]$/.exec(sel)
      if (m) return this.attrs.get(m[1]) === m[2]
      const need = sel.split('.').filter(Boolean)
      const have = this.cls()
      return need.every(c => have.has(c))
    }
    querySelectorAll(sel) { const out = []; const walk = n => { for (const c of n.children) { if (c.matches(sel)) out.push(c); walk(c) } }; walk(this); return out }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null }
    closest(sel) { let n = this; while (n instanceof E) { if (n.matches(sel)) return n; n = n.parentNode } return null }
    animate() { return { finished: Promise.resolve(), cancel() {}, addEventListener() {} } }
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 } }
  }
  const listeners = {}
  doc = {
    visibilityState: 'visible',
    createElement: t => new E(t),
    createTextNode: s => new T(s),
    addEventListener(t, f) { (listeners[t] ||= []).push(f) },
    removeEventListener(t, f) { listeners[t] = (listeners[t] || []).filter(x => x !== f) },
    fire(t, extra = {}) { const e = { type: t, pointerId: 1, preventDefault() { this.defaultPrevented = true }, stopPropagation() {}, ...extra }; for (const f of [...(listeners[t] || [])]) f(e); return e }
  }
  doc.documentElement = new E('html')
  doc.body = doc.documentElement.appendChild(new E('body'))
  return { doc, Node: N }
}

async function withMiniDom(fn) {
  const { doc, Node } = miniDom()
  const keep = { document: globalThis.document, Node: globalThis.Node }
  globalThis.document = doc
  globalThis.Node = Node
  try { return await fn(doc) } finally {
    if (keep.document === undefined) delete globalThis.document; else globalThis.document = keep.document
    if (keep.Node === undefined) delete globalThis.Node; else globalThis.Node = keep.Node
  }
}

test('createStepCard đầy đủ: [step-hint] + tay mẫu theo cử chỉ (mũi tên, vòng đích, món đi theo tay) + tự chạy; hold(on) dừng/chạy tiếp', async () => {
  const { createStepCard, stepCardModel } = await import('../../src/ui/components/step-card.js')
  await withMiniDom(async doc => {
    const extraOf = { dap: 'g-demo-arrow--swipe', xoay: 'g-demo-orbit-head', got: 'g-demo-arrow--down', lac: 'g-demo-arrow--updown', bay: 'g-demo-target' }
    for (const [type, cls] of Object.entries(extraOf)) {
      const card = createStepCard(stepCardModel({ type, label: 'Thử', ing: 'trung_ga' }, { index: 2, total: 5 }), { full: true, autoMs: 0, reduced: false })
      assert.equal(card.el.getAttribute('data-testid'), 'step-hint')
      const demo = card.el.querySelector('[data-testid="step-card-demo"]')
      assert.ok(demo, type + ': thiếu tay mẫu')
      assert.equal(demo.dataset.gesture, { dap: 'tap-swipe', xoay: 'circle', got: 'swipe-down', lac: 'shake', bay: 'drag' }[type])
      assert.ok(demo.querySelector('.' + cls), `${type}: thiếu .${cls}`)
      assert.ok(card.el.querySelector('[data-testid="step-card-go"]'), type + ': thiếu nút Chạm để bắt đầu')
      assert.ok(card.el.textContent.includes('Bước 2/5'))
      assert.equal(card.waiting, true)
      card.destroy()
      assert.equal(card.waiting, false)
    }
    // kéo thả: món nhỏ đi theo tay (nằm trong đường chạy của tay mẫu)
    const bay = createStepCard(stepCardModel({ type: 'bay', label: 'Thả đá vào ly', ing: 'da' }, { index: 1, total: 2 }), { full: true, autoMs: 0, reduced: false })
    assert.ok(bay.el.querySelector('.g-demo-path').querySelector('.g-demo-carry'))
    bay.destroy()
    // tự chạy sau autoMs; hold(true) giữ lại, hold(false) chạy tiếp phần còn lại (≥ 300 ms)
    let started = 0
    const card = createStepCard(stepCardModel({ type: 'xoay', label: 'Trộn đều' }), { full: true, autoMs: 40, reduced: true, onStart: () => started++ })
    doc.body.appendChild(card.el)
    card.hold(true)
    await sleep(80)
    assert.equal(started, 0, 'đang giữ thì không tự vào bước')
    assert.equal(card.held, true)
    assert.ok(card.el.classList.contains('is-held'))
    card.hold(false)
    await sleep(360)
    assert.equal(started, 1, 'thôi giữ thì tự vào bước')
    assert.equal(card.started, true)
    assert.equal(card.waiting, false)
    card.start()
    assert.equal(started, 1, 'onStart đúng 1 lần')
    // chạm thẻ (pointerdown) = vào ngay, cú click kế tiếp bị nuốt (guardNextClick trên document)
    let s2 = 0
    const c2 = createStepCard(stepCardModel({ type: 'dap', label: 'Đập trứng' }), { full: true, autoMs: 5000, reduced: true, onStart: () => s2++ })
    doc.body.appendChild(c2.el)
    c2.el.fire('pointerdown')
    assert.equal(s2, 1)
    doc.fire('pointerup')
    const click = doc.fire('click')
    assert.equal(click.defaultPrevented, true, 'click ma của lần chạm vào bước bị nuốt')
    c2.destroy()
  })
})

test('createStepCard gọn: không chờ (vào bước ở khung hình kế), ruy băng chuyển vào đầu sân khấu .mg-head, không nhận chạm, tự gỡ', async () => {
  const { createStepCard, stepCardModel } = await import('../../src/ui/components/step-card.js')
  await withMiniDom(async doc => {
    const wrap = doc.createElement('div')
    doc.body.appendChild(wrap)
    const stage = doc.createElement('div')
    stage.className = 'mg-stage'
    wrap.appendChild(stage)
    let started = 0
    const card = createStepCard(stepCardModel({ type: 'lac', label: 'Lắc đều' }, { index: 4, total: 6 }), {
      full: false, reduced: true,
      // trò chơi dựng đầu sân khấu ngay trong onStart (như playStep)
      onStart: () => { started++; const head = doc.createElement('div'); head.className = 'mg-head g-head2'; stage.appendChild(head) }
    })
    assert.equal(card.el.getAttribute('data-testid'), 'step-card-mini')
    assert.equal(card.el.getAttribute('aria-hidden'), 'true')
    assert.equal(card.el.getAttribute('data-testid') === 'step-hint', false, 'bản gọn không phải thẻ chờ chạm')
    assert.equal(card.waiting, false)
    wrap.appendChild(card.el)
    assert.equal(started, 0)
    await sleep(5)
    assert.equal(started, 1, 'bản gọn tự vào bước ngay (không chờ autoMs)')
    const head = stage.querySelector('.mg-head')
    assert.equal(card.el.parentNode, head, 'ruy băng nằm trong đầu sân khấu')
    assert.ok(head.classList.contains('g-head-dock'))
    assert.ok(card.el.classList.contains('is-docked'))
    assert.ok(card.el.textContent.includes('Bước 4/6'))
    card.hold(true)
    assert.equal(card.held, false, 'bản gọn không giữ')
    await sleep(950)
    assert.equal(card.el.parentNode, null, 'tự gỡ sau khi trôi qua (giảm chuyển động: 900 ms)')
    // không có đầu sân khấu: ruy băng ở lại khung chứa
    const wrap2 = doc.createElement('div')
    doc.body.appendChild(wrap2)
    const c2 = createStepCard(stepCardModel({ type: 'got', label: 'Gọt vỏ' }), { full: false, reduced: true })
    wrap2.appendChild(c2.el)
    await sleep(5)
    assert.equal(c2.el.parentNode, wrap2)
    c2.destroy()
    // ruy băng lỡ gắn vào chính sân khấu (playStep dọn sân khấu lúc dựng): truyền stage thì vẫn vào được đầu sân khấu
    const st3 = doc.createElement('div')
    doc.body.appendChild(st3)
    const c3 = createStepCard(stepCardModel({ type: 'bay', label: 'Thả đá vào ly' }), {
      full: false, reduced: true, stage: () => st3,
      onStart: () => { st3.textContent = ''; const hd = doc.createElement('div'); hd.className = 'mg-head'; st3.appendChild(hd) }
    })
    st3.appendChild(c3.el)
    await sleep(5)
    assert.equal(c3.el.parentNode, st3.querySelector('.mg-head'))
    c3.destroy()
  })
})

test('showStepResult: con dấu + Dì Sáu vào lớp .mg-fx của sân khấu (thiếu thì tạo), giữ 700/500 ms, theo phần sân khấu đang thấy', async () => {
  const { showStepResult, RESULT_HOLD_MS, RESULT_HOLD_MS_REDUCED, resultHoldMs, stageFx } = await import('../../src/ui/components/stamp.js')
  assert.equal(RESULT_HOLD_MS, 700)
  assert.equal(RESULT_HOLD_MS_REDUCED, 500)
  assert.equal(resultHoldMs(true), 500)
  assert.equal(resultHoldMs(false), 700)
  await withMiniDom(async doc => {
    // sân khấu buildFrame2: có .mg-fx và chấm bước hiện tại
    const stage = doc.createElement('div')
    stage.className = 'mg-stage g-frame2'
    doc.body.appendChild(stage)
    const fx = doc.createElement('div')
    fx.className = 'mg-fx'
    const dot = doc.createElement('li')
    dot.className = 'g-dot is-now'
    stage.append(dot, fx)
    const sounds = []
    const calls = []
    const vfx = { hitstop: async () => calls.push('hitstop'), burst: (el, k) => calls.push('burst:' + k), fly: (a, b) => calls.push('fly:' + (b === dot)), shake: el => calls.push('shake:' + (el === stage)) }
    const r = showStepResult(stage, { score: 95, label: 'Hoàn hảo', vfx, sound: n => sounds.push(n), reduced: false, rand: () => 0, data: DATA })
    assert.equal(r.holdMs, 700)
    assert.equal(r.stamp.parentNode, fx)
    assert.equal(r.stamp.getAttribute('data-testid'), 'step-result')
    assert.equal(r.stamp.dataset.score, '95')
    assert.equal(r.stamp.dataset.grade, 'hoan_hao')
    assert.equal(r.react.parentNode, fx)
    assert.equal(r.react.dataset.grade, 'hoan_hao')
    assert.equal(r.react.textContent, DIALOGUE.diSau.stepReact.hoan_hao[0])
    await r.played
    assert.deepEqual(sounds, ['stamp', 'sparkle'])
    assert.ok(calls.includes('hitstop') && calls.includes('burst:sparkle') && calls.includes('fly:true'), calls.join(','))
    assert.ok(stage.classList.contains('has-result'), 'sân khấu đánh dấu đã có kết quả (ẩn thẻ hướng dẫn)')
    // gọi lại (vd làm lại bước): dấu cũ bị thay, không chồng
    const r2 = showStepResult(stage, { score: 20, vfx, sound: () => {}, reduced: true, react: false })
    assert.equal(r2.holdMs, 500)
    assert.equal(r2.react, null)
    assert.equal(fx.children.filter(c => c.classList.contains('g-stamp')).length, 1)
    assert.equal(fx.children.filter(c => c.classList.contains('g-disau-react')).length, 0)
    assert.equal(r2.stamp.dataset.grade, 'hong')
    await r2.played
    assert.ok(!calls.includes('shake:true'), 'giảm chuyển động: không rung')
    // khung cũ (không có .mg-fx): tự tạo lớp hiệu ứng; sân khấu đang cuộn thì lớp dời theo phần đang thấy
    const old = doc.createElement('div')
    old.className = 'mg-stage'
    old.scrollTop = 120
    old.clientHeight = 300
    doc.body.appendChild(old)
    const made = stageFx(old)
    assert.ok(made && made.classList.contains('mg-fx'))
    assert.equal(made.parentNode, old)
    assert.equal(made.style.top, '120px')
    assert.equal(made.style.height, '300px')
    assert.equal(stageFx(old), made, 'không tạo trùng')
    assert.equal(showStepResult(null, { score: 50 }), null)
  })
})

test('createDishReveal trong game: data-grade/data-q ghi ngay giá trị cuối, có .k-bubble, chạm = bỏ qua (đóng) và nuốt click ma; revealMs', async () => {
  const { createDishReveal, revealMs, REVEAL_MS, REVEAL_MS_REDUCED } = await import('../../src/ui/components/dish-reveal.js')
  assert.equal(revealMs(false), REVEAL_MS)
  assert.equal(revealMs(true), REVEAL_MS_REDUCED)
  await withMiniDom(async doc => {
    const R = DATA.RECIPES.banh_mi_op_la
    let closed = 0
    const r = createDishReveal({
      dish: { grade: 'ngon', q: 83, flawless: false }, recipe: R, name: R.name, comment: 'Ngon, nhớ nêm vừa tay nha.',
      data: DATA, reduced: true, onClose: () => closed++
    })
    assert.equal(r.el.getAttribute('data-testid'), 'dish-reveal')
    assert.equal(r.el.dataset.grade, 'ngon')
    assert.equal(r.el.dataset.q, '83')
    const bubble = r.el.querySelector('.k-bubble')
    assert.ok(bubble, 'thiếu .k-bubble (e2e đọc lời góp ý)')
    assert.equal(bubble.textContent, 'Ngon, nhớ nêm vừa tay nha.')
    assert.equal(r.plan.totalMs, REVEAL_MS_REDUCED)
    doc.body.appendChild(r.el)
    r.play({ sound: () => {} })
    assert.ok(r.el.textContent.includes('83'), 'giảm chuyển động: % hiện thẳng giá trị cuối')
    r.el.fire('pointerdown')
    assert.equal(closed, 1)
    doc.fire('pointerup')
    assert.equal(doc.fire('click').defaultPrevented, true, 'click của lần chạm đóng màn ra món không rơi xuống nút bên dưới')
    r.el.fire('pointerdown')
    assert.equal(closed, 1, 'đóng một lần')
    r.destroy()
  })
})

test('stepCardModel: hình to bỏ qua id chưa có hình (không ra "?"), đạo cụ theo lớp vỏ cho khuấy / lắc / bày', async () => {
  const { stepCardModel, PROP_BY_SKIN } = await import('../../src/ui/components/step-card.js')
  const R = DATA.RECIPES.banh_trang_tron
  assert.equal(stepCardModel({ type: 'xoay', label: 'Trộn đều', skin: 'to', icon: 'khong_co_hinh_nay' }, { recipe: R }).ingId, R.icon)
  assert.equal(stepCardModel({ type: 'got', label: 'Gọt vỏ xoài', ing: 'xoai_xanh' }, { recipe: R }).ingId, 'xoai_xanh')
  assert.equal(stepCardModel({ type: 'xoay', label: 'Trộn đều', skin: 'to' }, { recipe: R }).propId, 'to_lon')
  assert.equal(stepCardModel({ type: 'xoay', label: 'Khuấy đều', skin: 'ly' }).propId, 'ly_lon')
  assert.equal(stepCardModel({ type: 'lac', label: 'Lắc rổ', skin: 'ro' }).propId, 'ro_lon')
  assert.equal(stepCardModel({ type: 'lac', label: 'Lắc đều' }).propId, 'binh_lac_lon')
  assert.equal(stepCardModel({ type: 'bay', label: 'Thả đá vào ly', skin: 'ly', ing: 'da' }).propId, 'ly_lon')
  assert.equal(stepCardModel({ type: 'thai', label: 'Thái dưa leo', ing: 'dua_leo' }).propId, null)
  assert.ok(Object.isFrozen(PROP_BY_SKIN))
  // mọi bước thật của 5 loại mới đều có hình to thật (nguyên liệu, hình riêng hoặc hình món)
  const { artV2 } = await import('../../src/ui/art/v2.js')
  const fallback = artV2('\u0000')
  for (const r of Object.values(DATA.RECIPES)) {
    for (const s of r.steps) {
      if (!['dap', 'xoay', 'got', 'lac', 'bay'].includes(s.type)) continue
      const m = stepCardModel(s, { recipe: r, data: DATA })
      assert.notEqual(artV2(m.ingId), fallback, `${r.id}.${s.id}: hình to là "?"`)
    }
  }
})

test('css/fx.css: hoạt ảnh chỉ đổi transform/opacity; lớp hiệu ứng sân khấu không nhận chạm; hoạt ảnh lặp tắt khi giảm chuyển động', async () => {
  const { readFileSync } = await import('node:fs')
  const css = readFileSync(new URL('../../css/fx.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const kfs = css.match(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) || []
  assert.ok(kfs.length >= 20)
  for (const kf of kfs) {
    const props = [...kf.replace(/^@keyframes[^{]*\{/, '').matchAll(/([a-z-]+)\s*:/g)].map(m => m[1])
    assert.deepEqual(props.filter(p => p !== 'transform' && p !== 'opacity'), [], 'keyframes đổi thuộc tính khác: ' + kf.slice(0, 40))
  }
  assert.match(css, /\.mg-fx \{[^}]*pointer-events: none/)
  assert.match(css, /\.mg-fx \* \{ pointer-events: none !important; \}/)
  assert.match(css, /\.g-step-mini \{[^}]*pointer-events: none/)
  // mọi hoạt ảnh lặp vô hạn nằm trong phần tử mà khối giảm chuyển động tắt hẳn
  const reducedBlock = css.slice(css.lastIndexOf('html.reduce-motion :is('))
  for (const sel of ['.g-step-card *', '.g-reveal *', '.g-dot', '.g-step-mini']) assert.ok(reducedBlock.includes(sel), 'khối giảm chuyển động thiếu ' + sel)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
})

// ---------- Vòng sửa gói G (M5 Đợt 1): chấm bước món nhiều bước, huy hiệu món hiếm, dọn chữ nổi lúc hiện dấu, câu hướng dẫn
// ở khung thấp ----------

test('thẻ bước: câu hướng dẫn ngắn cho khung thấp (dòng hướng dẫn của sân khấu), giữ ý "bấm Xong" của bước Bày', async () => {
  const { stepCardModel, shortHint } = await import('../../src/ui/components/step-card.js')
  const T = DATA.MINIGAME_TYPES
  const step = (rid, sid) => DATA.RECIPES[rid].steps.find(s => s.id === sid)
  const themDa = stepCardModel(step('ca_phe_sua_da', 'them_da'), { data: DATA })
  assert.equal(themDa.hint, T.bay.skins.ly.hint)
  assert.equal(themDa.hintShort, T.bay.skins.ly.sub)
  assert.ok(themDa.hint.includes('bấm Xong') && themDa.hintShort.includes('bấm Xong'), 'câu ngắn của Thả đá vẫn dặn bấm Xong')
  assert.equal(stepCardModel(step('banh_mi_op_la', 'dap_trung'), { data: DATA }).hintShort, T.dap.sub)
  // không có dòng hướng dẫn riêng (Chạm nhanh): câu ngắn chính là câu đầy đủ
  const vat = stepCardModel(step('tra_tac', 'vat_tac'), { data: DATA })
  assert.equal(vat.hintShort, vat.hint)
  // không truyền data vẫn ra cùng kết quả (dữ liệu mặc định)
  assert.equal(stepCardModel(step('ca_phe_sua_da', 'them_da')).hintShort, T.bay.skins.ly.sub)
  assert.equal(shortHint({ type: 'khong_co' }, T, ''), '')
  // mọi bước thật: câu ngắn có chữ, không dài hơn câu đầy đủ; bước Bày luôn còn "Xong"
  for (const r of Object.values(DATA.RECIPES)) {
    for (const s of r.steps) {
      const m = stepCardModel(s, { data: DATA, recipe: r })
      assert.ok(m.hintShort && m.hintShort.length <= m.hint.length, `${r.id}.${s.id}: câu ngắn "${m.hintShort}"`)
      if (s.type === 'bay') assert.ok(m.hintShort.includes('Xong'), `${r.id}.${s.id}: câu ngắn thiếu "Xong"`)
    }
  }
})

test('createStepCard: câu hướng dẫn có cả câu đầy đủ và câu ngắn; fitHint đổi sang câu ngắn khi câu đầy đủ bị cắt', async () => {
  const { createStepCard, stepCardModel, fitHint } = await import('../../src/ui/components/step-card.js')
  await withMiniDom(async doc => {
    const step = DATA.RECIPES.ca_phe_sua_da.steps.find(s => s.id === 'them_da')
    const m = stepCardModel(step, { data: DATA, index: 2, total: 6 })
    const card = createStepCard(m, { full: true, autoMs: 0, reduced: true })
    const p = card.el.querySelector('.g-step-card-hint')
    assert.ok(p && p.classList.contains('has-short'))
    assert.equal(p.querySelector('.g-step-card-hint-full').textContent, m.hint)
    assert.equal(p.querySelector('.g-step-card-hint-short').textContent, m.hintShort)
    // câu đầy đủ bị cắt (khung thấp chỉ cho 2 dòng) → câu ngắn; vừa thì giữ câu đầy đủ
    Object.assign(p, { scrollHeight: 50, clientHeight: 33, scrollWidth: 300, clientWidth: 300 })
    assert.equal(fitHint(p), true)
    assert.ok(p.classList.contains('use-short'))
    Object.assign(p, { scrollHeight: 33 })
    assert.equal(fitHint(p), false)
    assert.ok(!p.classList.contains('use-short'))
    card.destroy()
    // câu ngắn trùng câu đầy đủ: chỉ một câu, không đổi
    const vat = createStepCard(stepCardModel(DATA.RECIPES.tra_tac.steps.find(s => s.id === 'vat_tac'), { data: DATA }), { full: true, autoMs: 0, reduced: true })
    const p2 = vat.el.querySelector('.g-step-card-hint')
    assert.ok(p2 && !p2.classList.contains('has-short'))
    assert.equal(p2.querySelector('.g-step-card-hint-short'), null)
    Object.assign(p2, { scrollHeight: 50, clientHeight: 33 })
    assert.equal(fitHint(p2), false)
    vat.destroy()
    assert.equal(fitHint(null), false)
  })
})

test('createDishReveal: món hiếm có huy hiệu "★ Hiếm" (lớp is-rare, bật vào ở nhịp huy hiệu hạng); tên dài có is-long-name', async () => {
  const { createDishReveal, isLongName, LONG_NAME } = await import('../../src/ui/components/dish-reveal.js')
  assert.equal(LONG_NAME, 22)
  assert.equal(isLongName('Bánh tráng trộn Tây Ninh'), true)
  assert.equal(isLongName('Trà tắc mật ong rừng'), false)
  assert.equal(isLongName(''), false)
  await withMiniDom(async () => {
    const R = DATA.RECIPES.banh_trang_tron_tay_ninh
    const r = createDishReveal({ dish: { grade: 'tuyet_hao', q: 97 }, recipe: R, name: R.name, data: DATA, reduced: false })
    assert.ok(r.el.classList.contains('is-rare'))
    assert.ok(r.el.classList.contains('is-long-name'))
    const badge = r.el.querySelector('.g-reveal-rare')
    assert.ok(badge, 'thiếu huy hiệu món hiếm')
    assert.equal(badge.textContent, '★ Hiếm')
    assert.equal(badge.parentNode, r.el.querySelector('.g-reveal-name'), 'huy hiệu dán ở hàng tên (góc ruy băng)')
    const beat = r.plan.beats.find(b => b.kind === 'badge')
    assert.equal(badge.style['--at'], beat.at + 'ms')
    assert.equal(r.el.querySelector('.g-reveal-title').textContent, R.name)
    r.destroy()
    // món thường: không huy hiệu, không lớp
    const N = DATA.RECIPES.banh_mi_op_la
    const n = createDishReveal({ dish: { grade: 'ngon', q: 80 }, recipe: N, name: N.name, data: DATA, reduced: true })
    assert.ok(!n.el.classList.contains('is-rare') && !n.el.classList.contains('is-long-name'))
    assert.equal(n.el.querySelector('.g-reveal-rare'), null)
    n.destroy()
    // món hiếm tên ngắn: có huy hiệu, không thu chữ
    const M = DATA.RECIPES.ca_phe_muoi
    const m = createDishReveal({ dish: { grade: 'duoc', q: 60 }, recipe: M, name: M.name, data: DATA, reduced: true })
    assert.ok(m.el.classList.contains('is-rare') && !m.el.classList.contains('is-long-name'))
    m.destroy()
  })
})

test('showStepResult: gỡ ruy băng gọn còn neo, làm mờ chữ nổi vfx đang bay trên sân khấu (chữ ngoài sân khấu giữ nguyên), dấu neo theo thanh chân thật', async () => {
  const { showStepResult, clearStageChatter, anchorStampToFoot } = await import('../../src/ui/components/stamp.js')
  await withMiniDom(async doc => {
    const box = (left, top, width, height) => () => ({ left, top, width, height, right: left + width, bottom: top + height })
    const stage = doc.createElement('div')
    stage.className = 'mg-stage g-frame2'
    doc.body.appendChild(stage)
    const head = doc.createElement('div')
    head.className = 'mg-head g-head2 g-head-dock'
    const mini = doc.createElement('div')
    mini.className = 'g-step-mini is-docked'
    head.appendChild(mini)
    const foot = doc.createElement('div')
    foot.className = 'mg-foot g-foot2'
    foot.getBoundingClientRect = box(0, 230, 320, 70)   // thanh chân cao 70px (nút "Nhấc" to), mép trên 230
    const fx = doc.createElement('div')
    fx.className = 'mg-fx'
    fx.getBoundingClientRect = box(0, 0, 320, 300)
    stage.append(head, foot, fx)
    // lớp vfx chung: một chữ nổi trong sân khấu, một chữ ở ngoài (vd HUD)
    const layer = doc.createElement('div')
    layer.className = 'vfx-layer'
    doc.body.appendChild(layer)
    const fades = []
    const mk = (rect, name) => {
      const t = doc.createElement('div')
      t.className = 'vfx-text'
      t.getBoundingClientRect = rect
      t.animate = (kf, opts) => { fades.push({ name, kf, opts }); return { finished: Promise.resolve(), cancel() {} } }
      layer.appendChild(t)
      return t
    }
    mk(box(100, 60, 60, 24), 'trong')
    mk(box(500, 60, 60, 24), 'ngoai')
    const vfx = { layer, hitstop: async () => {}, burst: () => 0, fly: () => {}, shake: () => {} }
    const r = showStepResult(stage, { score: 92, label: 'Hoàn hảo', vfx, sound: () => {}, reduced: false, rand: () => 0, data: DATA })
    await r.played
    await sleep(30)
    assert.equal(mini.parentNode, null, 'ruy băng gọn đã gỡ khỏi đầu sân khấu')
    const inStage = fades.filter(f => f.name === 'trong')
    assert.ok(inStage.length >= 1, 'chữ nổi trong sân khấu được làm mờ')
    assert.equal(inStage[0].kf[inStage[0].kf.length - 1].opacity, 0)
    assert.ok(inStage[0].opts.duration <= 150, 'mờ nhanh')
    assert.equal(fades.filter(f => f.name === 'ngoai').length, 0, 'chữ nổi ngoài sân khấu không bị đụng')
    assert.equal(fx.style['--g-foot-h'], '70px', 'dấu neo theo mép trên thật của thanh chân')
    // không có thanh chân / không đo được: giữ giá trị CSS
    const bare = doc.createElement('div')
    assert.equal(anchorStampToFoot(bare, fx), null)
    assert.equal(clearStageChatter(null, null, null), 0)
  })
})

test('css/fx.css (vòng sửa G): thanh giờ luôn trên hàng chấm; chấm xong khít lại ở đầu sân khấu hẹp; huy hiệu hiếm ngoài dòng chảy; thẻ bước khung thấp 2 dòng', async () => {
  const { readFileSync } = await import('node:fs')
  const css = readFileSync(new URL('../../css/fx.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const block = sel => { const i = css.indexOf(sel + ' {'); assert.ok(i >= 0, 'thiếu ' + sel); return css.slice(i, css.indexOf('}', i)) }
  const at = head => { const i = css.indexOf(head); assert.ok(i >= 0, 'thiếu ' + head); let d = 0; for (let j = css.indexOf('{', i); j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}' && --d === 0) return css.slice(i, j) } return '' }
  const time = block('.mg-stage.g-frame2 .g-head2 > .mg-time.g-time')
  assert.match(time, /position: relative/)
  assert.match(time, /z-index: 2/)
  assert.match(at('@container g-head (max-width: 300px)'), /\.is-lots \.g-dot\.is-done \+ \.g-dot\.is-done \{ margin-left: -\d+px; \}/)
  const rare = block('.g-reveal-rare')
  assert.match(rare, /position: absolute/)
  assert.match(css, /\.g-reveal\.is-skipped :is\([^)]*\.g-reveal-rare/)
  assert.match(at('@container g-reveal (max-width: 340px)'), /\.g-reveal\.is-long-name \.g-reveal-title/)
  const low = at('@container g-card (max-height: 320px)')
  assert.match(low, /\.g-step-card-hint \{[^}]*-webkit-line-clamp: 2/)
  assert.match(low, /\.use-short \.g-step-card-hint-short \{ display: inline; \}/)
  assert.doesNotMatch(css, /\.g-step-card-hint \{[^}]*-webkit-line-clamp: 1/)
  assert.match(block('.g-step-card-hint-short'), /display: none/)
})
