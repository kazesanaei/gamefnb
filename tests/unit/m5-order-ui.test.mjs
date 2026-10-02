// M5 Đợt 0 — màn gọi món mới (gói 0-D): các thành phần import được trong Node (không chạm DOM ở cấp module),
// hàm thuần (mô hình bảng thực đơn, bảng chọn, phiếu order), biểu tượng ghi chú đủ cho mọi ghi chú của công thức,
// nhãn tiếng Việt, SVG sạch (không url(, href, <use, <image, base64, null, NaN, undefined).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RECIPES } from '../../src/data/recipes.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MODULES = ['note-icons', 'menu-board', 'order-bubble', 'order-sheet', 'order-pad']

// Bẫy: ghi lại mọi lần chạm document / window / matchMedia trong lúc import.
async function importGuarded() {
  const touched = []
  const names = ['document', 'window', 'matchMedia', 'navigator', 'requestAnimationFrame']
  const saved = {}
  for (const n of names) {
    saved[n] = Object.getOwnPropertyDescriptor(globalThis, n)
    try {
      Object.defineProperty(globalThis, n, { configurable: true, get() { touched.push(n); return undefined } })
    } catch { /* thuộc tính không cấu hình được: bỏ qua */ }
  }
  const mods = {}
  try {
    for (const m of MODULES) mods[m] = await import(`../../src/ui/components/${m}.js`)
  } finally {
    for (const n of names) {
      try {
        if (saved[n]) Object.defineProperty(globalThis, n, saved[n])
        else delete globalThis[n]
      } catch { /* bỏ qua */ }
    }
  }
  return { mods, touched }
}

const loaded = importGuarded()

function cleanSvg(s, label) {
  assert.equal(typeof s, 'string', label)
  assert.ok(s.startsWith('<svg') && s.endsWith('</svg>'), label + ': không phải chuỗi SVG')
  for (const bad of ['url(', 'href', '<use', '<image', 'base64', 'null', 'NaN', 'undefined', 'Infinity']) {
    assert.ok(!s.includes(bad), `${label}: có "${bad}"`)
  }
  for (const tag of ['svg', 'g']) {
    const open = (s.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length
    const close = (s.match(new RegExp(`</${tag}>`, 'g')) || []).length
    assert.equal(open, close, `${label}: thẻ <${tag}> không cân bằng`)
  }
}

test('5 thành phần gọi món import được trong Node, không chạm document/window/matchMedia ở cấp module', async () => {
  const { mods, touched } = await loaded
  assert.deepEqual(touched, [], 'chạm DOM lúc import: ' + touched.join(', '))
  for (const m of MODULES) assert.ok(mods[m], 'thiếu module ' + m)
  assert.equal(typeof mods['note-icons'].noteIcon, 'function')
  assert.equal(typeof mods['menu-board'].createMenuBoard, 'function')
  assert.equal(typeof mods['order-bubble'].createOrderBubble, 'function')
  assert.equal(typeof mods['order-sheet'].createOrderSheet, 'function')
  assert.equal(typeof mods['order-pad'].createOrderPad, 'function')
})

test('noteIcon: đủ hình cho MỌI ghi chú trong recipes.js, nhãn trùng nhãn công thức, SVG sạch và khác nhau', async () => {
  const { NOTE_ICONS, NOTE_MODS, noteIdsOf, noteIconSvg, noteLabel, noteMeta, noteTone } = (await loaded).mods['note-icons']
  const ids = noteIdsOf(RECIPES)
  assert.ok(ids.length >= 16, 'đọc được quá ít ghi chú: ' + ids.length)
  const missing = ids.filter(id => !NOTE_ICONS[id])
  assert.deepEqual(missing, [], 'ghi chú chưa có hình: ' + missing.join(', '))
  for (const r of Object.values(RECIPES)) {
    for (const n of r.notes || []) {
      assert.equal(NOTE_ICONS[n.id].label, n.label, `nhãn ${n.id} khác recipes.js (${r.id})`)
      assert.equal(noteLabel(n.id, r), n.label)
    }
  }
  const seen = new Map()
  for (const id of Object.keys(NOTE_ICONS)) {
    const s = noteIconSvg(id)
    cleanSvg(s, id)
    assert.ok(s.includes('viewBox="0 0 48 48"'), id + ': viewBox 48')
    assert.ok(s.length <= 3500, `${id}: SVG ${s.length} byte > 3,5 KB`)
    assert.ok(!seen.has(s), `${id} trùng hình với ${seen.get(s)}`)
    seen.set(s, id)
    assert.ok(Object.prototype.hasOwnProperty.call(NOTE_MODS, NOTE_ICONS[id].mod), id + ': dấu bổ nghĩa lạ')
    assert.ok(['bad', 'sky', 'warm', 'go', 'plain'].includes(noteTone(id)))
    assert.equal(noteMeta(id).known, true)
  }
  // ghi chú "không …" có vạch đỏ gạch chéo, "ít …" có mũi tên xuống (huy hiệu xanh trời), "thêm …" có dấu cộng xanh lá
  assert.equal(NOTE_ICONS.khong_hanh.mod, 'khong')
  assert.equal(NOTE_ICONS.it_da.mod, 'it')
  assert.equal(NOTE_ICONS.them_trung.mod, 'them')
  assert.equal(NOTE_ICONS.cay.mod, '')
  assert.ok(noteIconSvg('khong_hanh').includes('#d8392b'), 'Không hành: vạch đỏ')
  assert.ok(noteIconSvg('it_da').includes('#4aa3df'), 'Ít đá: huy hiệu mũi tên xuống')
})

test('noteIcon: ghi chú lạ có hình dự phòng và nhãn đọc được; noteIcon() là hàm tạo DOM (không chạy khi import)', async () => {
  const { noteIconSvg, noteLabel, noteMeta, noteTone } = (await loaded).mods['note-icons']
  cleanSvg(noteIconSvg('mon_moi_toanh'), 'dự phòng')
  cleanSvg(noteIconSvg(undefined), 'dự phòng rỗng')
  assert.equal(noteLabel('it_hanh_phi'), 'It hanh phi')
  assert.equal(noteLabel(''), 'Ghi chú')
  assert.equal(noteLabel('it_hanh_phi', { notes: [{ id: 'it_hanh_phi', label: 'Ít hành phi' }] }), 'Ít hành phi')
  assert.equal(noteMeta('x').known, false)
  assert.equal(noteTone('x'), 'plain')
})

test('menuItems: món hiếm "★ còn n", hết hàng, giá trên tem; món lạ bị bỏ qua', async () => {
  const { menuItems, priceParts, dishStyle, dishSvg, YOLK_BY_RARE } = (await loaded).mods['menu-board']
  const ids = ['banh_mi_op_la', 'tra_tac', 'banh_mi_trung_ga_ta', 'tra_tac_mat_ong', 'khong_co_mon_nay']
  const items = menuItems(RECIPES, ids, { banh_mi_trung_ga_ta: 2, tra_tac_mat_ong: 0 })
  assert.deepEqual(items.map(i => i.id), ids.slice(0, 4))
  const by = Object.fromEntries(items.map(i => [i.id, i]))
  assert.equal(by.banh_mi_op_la.rare, false)
  assert.equal(by.banh_mi_op_la.left, null)
  assert.equal(by.banh_mi_op_la.out, false)
  assert.equal(by.banh_mi_op_la.priceText, '20.000đ')
  assert.equal(by.banh_mi_trung_ga_ta.rare, true)
  assert.equal(by.banh_mi_trung_ga_ta.left, 2)
  assert.equal(by.banh_mi_trung_ga_ta.out, false)
  assert.equal(by.tra_tac_mat_ong.out, true)
  // hàm (id) → số cũng được; số âm kẹp về 0
  const f = menuItems(RECIPES, ['tra_tac_mat_ong'], id => (id === 'tra_tac_mat_ong' ? -3 : 9))
  assert.equal(f[0].left, 0)
  assert.equal(f[0].out, true)
  // chữ ký đổi khi số phần còn đổi (thẻ được dựng lại), giữ nguyên khi không đổi
  assert.equal(menuItems(RECIPES, ['banh_mi_trung_ga_ta'], { banh_mi_trung_ga_ta: 2 })[0].sig, by.banh_mi_trung_ga_ta.sig)
  assert.notEqual(menuItems(RECIPES, ['banh_mi_trung_ga_ta'], { banh_mi_trung_ga_ta: 1 })[0].sig, by.banh_mi_trung_ga_ta.sig)
  assert.deepEqual(priceParts(20000), { big: '20', small: 'k' })
  assert.deepEqual(priceParts(15000), { big: '15', small: 'k' })
  // món trứng gà ta dùng hình món nền với lòng đỏ đậm (--yolk), món thường không đổi biến
  assert.deepEqual(dishStyle(RECIPES.banh_mi_trung_ga_ta), { '--yolk': YOLK_BY_RARE.trung_ga_ta })
  assert.equal(dishStyle(RECIPES.banh_mi_op_la), null)
  for (const r of Object.values(RECIPES)) cleanSvg(dishSvg(r), 'món ' + r.id)
  assert.equal(dishSvg(RECIPES.banh_mi_trung_ga_ta), dishSvg(RECIPES.banh_mi_op_la), 'món hiếm dùng hình món nền')
})

test('bảng chọn: số phần kẹp 1..3 (và theo hàng hiếm còn lại), giá có phụ thu, ghi chú cùng nhóm loại trừ nhau', async () => {
  const { sheetModel, toggleNoteIds, clampQty, QTY_MAX } = (await loaded).mods['order-sheet']
  const R = RECIPES.banh_mi_op_la
  assert.equal(QTY_MAX, 3)
  assert.equal(clampQty(0), 1)
  assert.equal(clampQty(9), 3)
  assert.equal(clampQty('2'), 2)
  assert.equal(clampQty(NaN), 1)
  const m = sheetModel({ recipe: R, qty: 2, notes: ['them_trung'] })
  assert.equal(m.qty, 2)
  assert.equal(m.unit, 25000)
  assert.equal(m.total, 50000)
  assert.equal(m.canMinus, true)
  assert.equal(m.canPlus, true)
  assert.equal(m.editing, false)
  assert.deepEqual(m.notes.map(n => n.id), R.notes.map(n => n.id))
  assert.equal(m.notes.find(n => n.id === 'them_trung').on, true)
  assert.equal(m.notes.find(n => n.id === 'them_trung').surcharge, 5000)
  assert.equal(sheetModel({ recipe: R, qty: 7 }).qty, 3)
  assert.equal(sheetModel({ recipe: R, qty: 3 }).canPlus, false)
  assert.equal(sheetModel({ recipe: R, qty: 1, editIndex: 0 }).editing, true)
  // hàng hiếm: còn 2 phần → trần 2
  const rare = sheetModel({ recipe: RECIPES.banh_mi_trung_ga_ta, qty: 3, rareMax: 2 })
  assert.equal(rare.qtyMax, 2)
  assert.equal(rare.qty, 2)
  assert.equal(rare.rareMax, 2)
  assert.equal(rare.canPlus, false)
  // nhóm do_chin: Lòng đào ↔ Chín kỹ
  const a = ['khong_hanh', 'long_dao']
  const b = toggleNoteIds(R, a, 'chin_ky')
  assert.deepEqual(b, ['khong_hanh', 'chin_ky'])
  assert.deepEqual(a, ['khong_hanh', 'long_dao'], 'không sửa mảng cũ')
  assert.deepEqual(toggleNoteIds(R, b, 'chin_ky'), ['khong_hanh'])
  assert.deepEqual(toggleNoteIds(R, b, 'khong_co'), b)
  assert.deepEqual(toggleNoteIds(R, [], 'cay'), ['cay'])
  // trà tắc: Ít đường ↔ Nhiều đường
  assert.deepEqual(toggleNoteIds(RECIPES.tra_tac, ['it_duong', 'khong_da'], 'nhieu_duong'), ['khong_da', 'nhieu_duong'])
})

test('phiếu order: mô hình dòng (nhãn ghi chú tiếng Việt), dòng khách bắt lỗi, câu lỗi, nhịp hiệu ứng theo đặc tả', async () => {
  const { padModel, padLine, caughtText, ORDER_ERROR_LABELS, PAD_TIMING, STAMP_TEXT } = (await loaded).mods['order-pad']
  const draft = [
    { recipeId: 'banh_mi_op_la', qty: 2, notes: ['khong_hanh', 'cay'] },
    { recipeId: 'tra_tac', qty: 1, notes: ['it_duong'] }
  ]
  const m = padModel({ draft, recipes: RECIPES, caught: [{ index: 1, type: 'sai_ghi_chu' }, { index: null, type: 'thieu_mon', expectedRecipeId: 'banh_mi_trung_ga_ta' }] })
  assert.equal(m.empty, false)
  assert.equal(m.lines.length, 2)
  assert.equal(m.lines[0].name, 'Bánh mì ốp la')
  assert.equal(m.lines[0].qty, 2)
  assert.deepEqual(m.lines[0].notes, [{ id: 'khong_hanh', label: 'Không hành' }, { id: 'cay', label: 'Cay' }])
  assert.equal(m.lines[0].wrong, false)
  assert.equal(m.lines[1].wrong, true)
  assert.deepEqual(m.caught, ['Dòng 2: Sai ghi chú', 'Ghi thiếu món (bánh mì trứng gà ta)'])
  assert.equal(caughtText({ index: 0, type: 'sai_so_luong' }, RECIPES), 'Dòng 1: Ghi sai số lượng')
  assert.equal(ORDER_ERROR_LABELS.thua_mon, 'Khách không gọi món này')
  // chữ ký dòng đổi khi ghi chú đổi (dòng được dựng lại), giữ nguyên khi giống hệt
  const s1 = padLine(draft[0], 0, RECIPES).sig
  assert.equal(padLine({ ...draft[0] }, 0, RECIPES).sig, s1)
  assert.notEqual(padLine({ ...draft[0], notes: ['khong_hanh'] }, 0, RECIPES).sig, s1)
  assert.notEqual(padModel({ draft: [draft[0]], recipes: RECIPES }).draftSig, m.draftSig)
  assert.equal(padModel({ draft: [], recipes: RECIPES }).empty, true)
  // qty lỗi / thiếu → 1; món lạ giữ id làm tên
  assert.equal(padLine({ recipeId: 'mon_la', qty: 0 }, 0, RECIPES).qty, 1)
  assert.equal(padLine({ recipeId: 'mon_la', qty: 0 }, 0, RECIPES).name, 'mon_la')
  assert.equal(STAMP_TEXT, 'ĐÃ CHỐT')
  assert.equal(PAD_TIMING.readStep, 120)
  assert.equal(PAD_TIMING.stampIn, 200)
  assert.equal(PAD_TIMING.fly, 450)
})

test('khách bán thân: SVG sạch cho mọi kiểu khách × tâm trạng, cô chú nam dùng dáng chú; yêu cầu đọc thành chữ tiếng Việt', async () => {
  const { bustSvg, bodyKey, BODY_LOOKS, requestLines, requestText } = (await loaded).mods['order-bubble']
  for (const p of ['hoc_sinh', 'cong_nhan', 'co_chu', 'van_phong', 'kho_tinh']) {
    for (const mood of ['vui', 'binh_thuong', 'buc', 'gian']) {
      const s = bustSvg(p, mood, 'nu')
      cleanSvg(s, `${p}/${mood}`)
      assert.ok(s.includes('viewBox="0 0 64 88"'))
      assert.ok(s.includes(BODY_LOOKS[p].shirt), `${p}: thân áo cùng màu áo trên mặt`)
      assert.ok(s.length <= 6000, `${p}/${mood}: ${s.length} byte`)
    }
  }
  assert.equal(bodyKey('co_chu', 'nam'), 'co_chu_nam')
  assert.equal(bodyKey('co_chu', 'nu'), 'co_chu')
  assert.equal(bodyKey('kieu_moi', 'nam'), 'hoc_sinh')
  assert.ok(bustSvg('co_chu', 'vui', 'nam').includes(BODY_LOOKS.co_chu_nam.shirt))
  const req = [{ recipeId: 'banh_mi_op_la', qty: 2, notes: ['khong_hanh', 'cay'] }, { recipeId: 'tra_tac', qty: 1, notes: [] }, null, { qty: 2 }]
  assert.equal(requestLines(req).length, 2)
  assert.equal(requestText(req, RECIPES), '2 Bánh mì ốp la (Không hành, Cay); 1 Trà tắc')
  assert.equal(requestLines(null).length, 0)
})

test('mã thành phần: chuỗi hiển thị tiếng Việt có dấu, giữ testid quầy cũ, chỉ lớp co- / g- trong counter.css', () => {
  const src = Object.fromEntries(MODULES.map(m => [m, readFileSync(join(ROOT, 'src/ui/components', m + '.js'), 'utf8')]))
  for (const id of ['menu-item-', 'rare-left-']) assert.ok(src['menu-board'].includes(`'${id}'`), 'thiếu testid ' + id)
  for (const id of ['order-sheet', 'sheet-close', 'qty-row', 'qty-minus', 'qty-value', 'qty-plus', 'note-block', 'note-chip-', 'add-line', 'remove-line']) {
    assert.ok(src['order-sheet'].includes(`'${id}'`), 'bảng chọn thiếu testid ' + id)
  }
  for (const id of ['draft', 'order-line-', 'order-line-remove-', 'caught-list', 'readback', 'confirm-order']) {
    assert.ok(src['order-pad'].includes(`'${id}'`), 'phiếu thiếu testid ' + id)
  }
  assert.ok(src['order-bubble'].includes("'speech-bubble'"))
  for (const s of ['Thêm vào phiếu', 'Bỏ dòng', 'Số lượng', 'Ghi chú']) assert.ok(src['order-sheet'].includes(s), 'thiếu chữ ' + s)
  for (const s of ['Đọc lại đơn', 'Chốt order', 'Phiếu order', 'ĐÃ CHỐT']) assert.ok(src['order-pad'].includes(s), 'thiếu chữ ' + s)
  assert.ok(src['menu-board'].includes('HẾT') && src['menu-board'].includes('★ còn'))
  // âm gọi dạng chuỗi viết thẳng (test âm quét được)
  assert.ok(src['order-pad'].includes("sound('stamp')"))
  const css = readFileSync(join(ROOT, 'css/counter.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const classes = new Set([...css.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)].map(m => m[1]))
  const foreign = [...classes].filter(c => !/^(co-|g-|is-|reduce-motion$|vfx-)/.test(c))
  assert.deepEqual(foreign, [], 'counter.css viết luật cho lớp ngoài quy ước: ' + foreign.join(', '))
  const vars = [...css.matchAll(/(^|[\s;{])(--[\w-]+)\s*:/g)].map(m => m[2])
  assert.deepEqual(vars.filter(v => !v.startsWith('--co-') && !v.startsWith('--g-') && v !== '--yolk'), [], 'chỉ khai báo biến --co- / --g-')
  // hoạt ảnh trong counter.css chỉ đổi transform / opacity
  for (const kf of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
    const props = [...kf[2].matchAll(/([a-z-]+)\s*:/g)].map(m => m[1])
    assert.deepEqual(props.filter(p => p !== 'transform' && p !== 'opacity'), [], `@keyframes ${kf[1]} đổi thuộc tính khác transform/opacity`)
  }
})
