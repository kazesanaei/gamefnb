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
