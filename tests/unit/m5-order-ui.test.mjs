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

// ---------- DOM giả tối giản (đủ cho h(), noteIcon() và các thành phần gọi món; không cần trình duyệt) ----------
function fakeDom() {
  const kebab = k => String(k).replace(/[A-Z]/g, c => '-' + c.toLowerCase())
  const docListeners = new Map()
  let doc = null
  class FNode {
    constructor() { this.ownerDocument = doc; this.parentNode = null; this.childNodes = [] }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === doc.documentElement }
    get firstChild() { return this.childNodes[0] || null }
    get nextSibling() { const p = this.parentNode; return p ? p.childNodes[p.childNodes.indexOf(this) + 1] || null : null }
    get children() { return this.childNodes.filter(c => c instanceof FEl) }
    get childElementCount() { return this.children.length }
    get lastElementChild() { const c = this.children; return c[c.length - 1] || null }
    get parentElement() { return this.parentNode instanceof FEl ? this.parentNode : null }
    appendChild(c) { return this.insertBefore(c, null) }
    insertBefore(c, ref) {
      if (c.parentNode) c.parentNode.removeChild(c)
      const i = ref ? this.childNodes.indexOf(ref) : -1
      if (i < 0) this.childNodes.push(c)
      else this.childNodes.splice(i, 0, c)
      c.parentNode = this
      return c
    }
    removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c }
    remove() { if (this.parentNode) this.parentNode.removeChild(this) }
    replaceWith(n) { const p = this.parentNode; if (p) { p.insertBefore(n, this); p.removeChild(this) } }
    append(...ns) { for (const n of ns) this.appendChild(typeof n === 'string' ? doc.createTextNode(n) : n) }
    get textContent() { return this.childNodes.map(c => c.textContent).join('') }
    set textContent(v) {
      for (const c of [...this.childNodes]) this.removeChild(c)
      if (v !== '' && v !== null && v !== undefined) this.appendChild(doc.createTextNode(String(v)))
    }
  }
  class FText extends FNode {
    constructor(s) { super(); this.data = String(s) }
    get textContent() { return this.data }
    set textContent(v) { this.data = String(v) }
    [Symbol.for('nodejs.util.inspect.custom')]() { return JSON.stringify(this.data) }
    cloneNode() { return new FText(this.data) }
  }
  class FEl extends FNode {
    constructor(tag) {
      super()
      const self = this
      this.tagName = String(tag).toUpperCase()
      this.attrs = new Map()
      this.html = ''
      this.hidden = false
      this.disabled = false
      this.title = ''
      this.listeners = {}
      this.anims = []
      this.style = { cssText: '', setProperty(k, v) { this[k] = v }, removeProperty(k) { delete this[k] } }
      this.dataset = new Proxy({}, {
        get: (_, k) => self.attrs.get('data-' + kebab(k)),
        set: (_, k, v) => { self.attrs.set('data-' + kebab(k), String(v)); return true },
        deleteProperty: (_, k) => { self.attrs.delete('data-' + kebab(k)); return true },
        has: (_, k) => self.attrs.has('data-' + kebab(k))
      })
      const put = s => { self.className = [...s].join(' ') }
      this.classList = {
        add: (...c) => { const s = self.cls(); c.forEach(x => s.add(x)); put(s) },
        remove: (...c) => { const s = self.cls(); c.forEach(x => s.delete(x)); put(s) },
        toggle: (c, on) => { const s = self.cls(); const want = on === undefined ? !s.has(c) : !!on; if (want) s.add(c); else s.delete(c); put(s); return want },
        contains: c => self.cls().has(c)
      }
    }
    // in gọn khi assert báo lỗi (cây DOM giả có vòng tham chiếu)
    [Symbol.for('nodejs.util.inspect.custom')]() { return `<${this.tagName.toLowerCase()} class="${this.className}">` }
    cls() { return new Set(this.className.split(/\s+/).filter(Boolean)) }
    get className() { return this.attrs.get('class') || '' }
    set className(v) { this.attrs.set('class', String(v)) }
    setAttribute(k, v) { this.attrs.set(k, String(v)) }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null }
    hasAttribute(k) { return this.attrs.has(k) }
    removeAttribute(k) { this.attrs.delete(k) }
    set innerHTML(v) { this.textContent = ''; this.html = String(v) }
    get innerHTML() { return this.html }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f) }
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter(x => x !== f) }
    click() { for (const f of this.listeners.click || []) f({ type: 'click', target: this }) }
    cloneNode(deep) {
      const c = new FEl(this.tagName)
      for (const [k, v] of this.attrs) c.attrs.set(k, v)
      c.html = this.html
      if (deep) for (const ch of this.childNodes) c.appendChild(ch.cloneNode(true))
      return c
    }
    matches(sel) {
      return sel.split(',').some(s0 => {
        const s = s0.trim()
        if (s.startsWith('.')) return this.cls().has(s.slice(1))
        const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(s)
        if (m) return m[2] === undefined ? this.attrs.has(m[1]) : this.attrs.get(m[1]) === m[2]
        return this.tagName === s.toUpperCase()
      })
    }
    querySelectorAll(sel) {
      const out = []
      const walk = n => { for (const c of n.children) { if (c.matches(sel)) out.push(c); walk(c) } }
      walk(this)
      return out
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null }
    // bố cục giả: phần tử còn trong DOM và không ẩn thì có khung 100×50, rời DOM thì khung rỗng ở (0,0) như trình duyệt
    getBoundingClientRect() {
      return this.isConnected && !this.hidden ? { left: 10, top: 10, right: 110, bottom: 60, width: 100, height: 50 }
        : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }
    }
    animate() { const a = { cancelled: false, onfinish: null, cancel() { this.cancelled = true }, addEventListener() {} }; this.anims.push(a); return a }
    getAnimations() { return this.anims.filter(a => !a.cancelled) }
    get offsetWidth() { return 100 }
  }
  doc = {
    visibilityState: 'visible',
    createElement: t => new FEl(t),
    createTextNode: s => new FText(s),
    addEventListener(t, f) { if (!docListeners.has(t)) docListeners.set(t, []); docListeners.get(t).push(f) },
    removeEventListener(t, f) { docListeners.set(t, (docListeners.get(t) || []).filter(x => x !== f)) },
    dispatch(t) { for (const f of [...(docListeners.get(t) || [])]) f({ type: t }) },
    listenerCount: t => (docListeners.get(t) || []).length
  }
  doc.documentElement = new FEl('html')
  doc.body = doc.documentElement.appendChild(new FEl('body'))
  return { doc, Node: FNode }
}

// Gắn DOM giả vào globalThis trong lúc chạy fn, rồi trả lại như cũ.
async function withDom(fn) {
  const { doc, Node } = fakeDom()
  const saved = { document: Object.getOwnPropertyDescriptor(globalThis, 'document'), Node: Object.getOwnPropertyDescriptor(globalThis, 'Node') }
  Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: doc })
  Object.defineProperty(globalThis, 'Node', { configurable: true, writable: true, value: Node })
  try {
    return await fn(doc)
  } finally {
    for (const k of ['document', 'Node']) {
      if (saved[k]) Object.defineProperty(globalThis, k, saved[k])
      else delete globalThis[k]
    }
  }
}

// vfx giả: lớp hiệu ứng thật trong DOM giả, ghi lại mọi lời gọi; clear() gom mọi nút trong lớp như vfx.js (gỡ khỏi lớp).
function fakeVfx(doc) {
  const layer = doc.createElement('div')
  layer.className = 'vfx-layer'
  doc.body.appendChild(layer)
  const log = []
  return {
    layer, log,
    shake: el => { log.push('shake'); return null },
    burst: (el, kind) => { log.push('burst:' + kind + (el.isConnected ? '' : ':roi-dom')); return 6 },
    pop() {}, squash() {},
    fly(from, to, opts = {}) {
      log.push('fly' + (from.isConnected ? '' : ':roi-dom'))
      const f = doc.createElement('div')
      f.className = 'vfx-fly'
      layer.appendChild(f)
      if (opts.node) f.appendChild(opts.node.cloneNode(true))
      const a = f.animate()
      return new Promise(resolve => {
        const id = setTimeout(() => { f.remove(); resolve(true) }, opts.ms || 450)
        a.cancel = () => { a.cancelled = true; clearTimeout(id); f.remove(); log.push('fly-huy'); resolve(true) }
      })
    },
    clear() { for (const c of [...layer.children]) c.remove(); log.push('clear') }
  }
}

const flush = async () => { for (let i = 0; i < 4; i++) await new Promise(r => setImmediate(r)) }
const TWO_LINES = [
  { recipeId: 'banh_mi_op_la', qty: 2, notes: ['khong_hanh', 'cay'] },
  { recipeId: 'tra_tac', qty: 1, notes: ['it_duong'] }
]

// Dựng phiếu 2 dòng đã đọc lại, gắn vào body, kèm đích bay (dây phiếu) và vfx giả.
function padRig(doc, createOrderPad, opts = {}) {
  const vfx = fakeVfx(doc)
  const sounds = []
  const pad = createOrderPad({ draft: TWO_LINES, recipes: RECIPES, canConfirm: true }, { vfx, sound: s => sounds.push(s), reduced: false, ...opts })
  doc.body.appendChild(pad.el)
  doc.body.appendChild(pad.actionsEl)
  const target = doc.body.appendChild(doc.createElement('div'))
  // bản sao tĩnh là con trực tiếp của lớp (bản bay của vfx cũng chứa một bản nhân của nó)
  const ghost = () => vfx.layer.children.find(c => c.classList.contains('co-pad-ghost')) || null
  return { vfx, sounds, pad, target, ghost }
}

test('chốt order: chạy trọn thì dấu đập, hạt sao, phiếu bay tới đích rồi tự gỡ bản sao; không để lại bộ nghe', async t => {
  const { createOrderPad, PAD_TIMING } = (await loaded).mods['order-pad']
  await withDom(async doc => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const { vfx, sounds, pad, target, ghost } = padRig(doc, createOrderPad)
    let res = null
    pad.stamp({ target }).then(v => { res = v })
    assert.ok(ghost(), 'có bản sao phiếu trong lớp hiệu ứng')
    assert.ok(ghost().querySelector('.co-stamp'), 'con dấu nằm trên bản sao')
    assert.equal(doc.listenerCount('visibilitychange'), 1)
    t.mock.timers.tick(PAD_TIMING.stampIn)
    assert.deepEqual(vfx.log, ['shake', 'burst:star'])
    t.mock.timers.tick(PAD_TIMING.stampHold)
    assert.deepEqual(vfx.log, ['shake', 'burst:star', 'fly'])
    assert.equal(ghost(), null, 'bản sao tĩnh gỡ ngay khi bản bay đã nhân bản')
    t.mock.timers.tick(PAD_TIMING.fly)
    await flush()
    assert.equal(res, true)
    assert.deepEqual(sounds, ['stamp', 'whoosh'])
    assert.equal(vfx.layer.childElementCount, 0)
    assert.equal(doc.listenerCount('visibilitychange'), 0, 'gỡ bộ nghe visibilitychange')
  })
})

test('chốt order tự dọn: vfx.clear() giữa chừng (đổi thẻ / rời màn) → không hạt, không âm, không bay, không gỡ nút của vfx', async t => {
  const { createOrderPad, PAD_TIMING } = (await loaded).mods['order-pad']
  await withDom(async doc => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const { vfx, sounds, pad, target, ghost } = padRig(doc, createOrderPad)
    let res = null
    pad.stamp({ target }).then(v => { res = v })
    const g = ghost()
    t.mock.timers.tick(100)
    vfx.clear()
    // vfx cấp lại đúng nút đó cho một hiệu ứng khác (như take() lấy từ pool)
    g.className = 'vfx-ring'
    vfx.layer.appendChild(g)
    t.mock.timers.tick(PAD_TIMING.stampIn + PAD_TIMING.stampHold + PAD_TIMING.fly)
    await flush()
    assert.equal(res, false)
    assert.deepEqual(vfx.log, ['clear'], 'không rung, không hạt, không bay sau khi vfx đã dọn')
    assert.deepEqual(sounds, ['stamp'], 'không phát whoosh')
    assert.ok(g.isConnected && g.className === 'vfx-ring', 'không gỡ nút đang thuộc vfx')
    assert.equal(doc.listenerCount('visibilitychange'), 0)
  })
})

test('chốt order tự dọn: destroy() hủy ngay (gỡ bản sao, Promise → false); keepOnDestroy cho chuỗi sống qua destroy()', async t => {
  const { createOrderPad, PAD_TIMING } = (await loaded).mods['order-pad']
  await withDom(async doc => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const a = padRig(doc, createOrderPad)
    let res = null
    a.pad.stamp({ target: a.target }).then(v => { res = v })
    t.mock.timers.tick(100)
    a.pad.destroy()
    await flush()
    assert.equal(res, false, 'Promise kết thúc ngay khi hủy')
    assert.equal(a.ghost(), null, 'bản sao bị gỡ ngay')
    t.mock.timers.tick(2000)
    await flush()
    assert.deepEqual(a.vfx.log, [])
    assert.deepEqual(a.sounds, ['stamp'])
    // giữ qua destroy: bên gọi dựng lại cả panel ngay sau khi chốt
    a.vfx.layer.remove()
    const b = padRig(doc, createOrderPad)
    let res2 = null
    b.pad.stamp({ target: b.target, keepOnDestroy: true }).then(v => { res2 = v })
    t.mock.timers.tick(100)
    b.pad.destroy()
    t.mock.timers.tick(PAD_TIMING.stampIn + PAD_TIMING.stampHold)
    t.mock.timers.tick(PAD_TIMING.fly)   // hẹn giờ của bản bay đặt trong lúc tick trước: tick riêng
    await flush()
    assert.equal(res2, true)
    assert.deepEqual(b.vfx.log, ['shake', 'burst:star', 'fly'])
  })
})

test('chốt order tự dọn: đích rời DOM → không bay; trang ẩn → dừng ngay; đang bay mà hủy → hủy cả nút bay', async t => {
  const { createOrderPad, PAD_TIMING } = (await loaded).mods['order-pad']
  await withDom(async doc => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    // đích bị gỡ (bấm "Gọi món lại", dây phiếu dựng lại)
    const a = padRig(doc, createOrderPad)
    let r1 = null
    a.pad.stamp({ target: a.target }).then(v => { r1 = v })
    t.mock.timers.tick(300)
    a.target.remove()
    t.mock.timers.tick(PAD_TIMING.stampHold + PAD_TIMING.fly)
    await flush()
    assert.equal(r1, false)
    assert.deepEqual(a.vfx.log, ['shake', 'burst:star'], 'không bay tới đích đã rời DOM')
    assert.deepEqual(a.sounds, ['stamp'])
    assert.equal(a.ghost(), null)
    a.pad.destroy(); a.vfx.layer.remove()
    // trang ẩn
    const b = padRig(doc, createOrderPad)
    let r2 = null
    b.pad.stamp({ target: b.target }).then(v => { r2 = v })
    t.mock.timers.tick(100)
    doc.visibilityState = 'hidden'
    doc.dispatch('visibilitychange')
    await flush()
    assert.equal(r2, false)
    assert.equal(b.ghost(), null)
    t.mock.timers.tick(2000)
    assert.deepEqual(b.vfx.log, [])
    doc.visibilityState = 'visible'
    b.pad.destroy(); b.vfx.layer.remove()
    // đang bay thì phiếu bị hủy: nút bay bị hủy theo (vfx tự trả nút về pool khi hoạt ảnh bị hủy)
    const c = padRig(doc, createOrderPad)
    let r3 = null
    c.pad.stamp({ target: c.target }).then(v => { r3 = v })
    t.mock.timers.tick(PAD_TIMING.stampIn + PAD_TIMING.stampHold + 100)
    assert.equal(c.vfx.layer.querySelectorAll('.vfx-fly').length, 1)
    c.pad.destroy()
    await flush()
    assert.equal(r3, false)
    assert.ok(c.vfx.log.includes('fly-huy'))
    assert.equal(c.vfx.layer.querySelectorAll('.vfx-fly').length, 0)
  })
})

test('phiếu: hàng nút mang lớp is-idle khi phiếu trống (màn thấp thu gọn), bỏ khi có dòng; update giống hệt không dựng lại dòng', async () => {
  const { createOrderPad } = (await loaded).mods['order-pad']
  await withDom(async doc => {
    const pad = createOrderPad({ draft: [], recipes: RECIPES }, { reduced: false })
    doc.body.appendChild(pad.el)
    assert.equal(pad.actionsEl.classList.contains('is-idle'), true)
    assert.equal(pad.actionsEl.querySelector('[data-testid="readback"]').disabled, true)
    pad.update({ draft: TWO_LINES })
    assert.equal(pad.actionsEl.classList.contains('is-idle'), false)
    const li0 = pad.lineEl(0)
    pad.update({ draft: TWO_LINES.map(l => ({ ...l })) })
    assert.equal(pad.lineEl(0), li0, 'cùng dữ liệu: giữ nguyên nút dòng')
    pad.destroy()
  })
})

test('bảng thực đơn: ul > li > button — thẻ món vẫn là NÚT (không role ghi đè), testid giữ nguyên, chạm gọi đúng callback', async () => {
  const { createMenuBoard } = (await loaded).mods['menu-board']
  await withDom(async doc => {
    const picks = []
    const outs = []
    const menu = ['banh_mi_op_la', 'tra_tac', 'banh_mi_trung_ga_ta', 'tra_tac_mat_ong']
    const board = createMenuBoard({ recipes: RECIPES, menu, left: { banh_mi_trung_ga_ta: 2, tra_tac_mat_ong: 0 } },
      { reduced: false, onPick: id => picks.push(id), onOut: id => outs.push(id) })
    doc.body.appendChild(board.el)
    const grid = board.el.querySelector('.co-menu-grid')
    assert.equal(grid.tagName, 'UL')
    assert.equal(grid.getAttribute('role'), 'list')
    assert.deepEqual(grid.children.map(c => c.tagName), ['LI', 'LI', 'LI', 'LI'])
    for (const [i, id] of menu.entries()) {
      const li = grid.children[i]
      assert.equal(li.children.length, 1)
      const btn = li.children[0]
      assert.equal(btn.tagName, 'BUTTON')
      assert.equal(btn.getAttribute('role'), null, id + ': nút không bị role ghi đè')
      assert.equal(btn.dataset.testid, 'menu-item-' + id)
      assert.equal(board.itemEl(id), btn)
    }
    assert.equal(board.itemEl('tra_tac_mat_ong').getAttribute('aria-disabled'), 'true')
    assert.equal(board.itemEl('banh_mi_trung_ga_ta').dataset.left, '2')
    assert.equal(board.el.querySelector('[data-testid="rare-left-banh_mi_trung_ga_ta"]').textContent, '★ còn 2')
    board.itemEl('tra_tac').click()
    board.itemEl('tra_tac_mat_ong').click()
    assert.deepEqual(picks, ['tra_tac'])
    assert.deepEqual(outs, ['tra_tac_mat_ong'])
    // cùng dữ liệu: giữ nguyên ô; đổi số phần còn của món hiếm: chỉ ô đó dựng lại, đúng chỗ
    const cells = [...grid.children]
    board.update({ recipes: RECIPES, menu, left: { banh_mi_trung_ga_ta: 2, tra_tac_mat_ong: 0 } })
    assert.deepEqual([...grid.children], cells)
    board.update({ recipes: RECIPES, menu, left: { banh_mi_trung_ga_ta: 1, tra_tac_mat_ong: 0 } })
    assert.equal(grid.children[0], cells[0])
    assert.notEqual(grid.children[2], cells[2])
    assert.equal(grid.children[2].children[0].dataset.left, '1')
    board.destroy()
  })
})

test('bong bóng khách: chỉ hiện câu ngắn trọn ý (không cắt giữa từ, không ",…"), câu đầy đủ để ở title', async () => {
  const { bubbleLine, SAY_MAX, createOrderBubble } = (await loaded).mods['order-bubble']
  assert.equal(bubbleLine('Như mọi khi nha con! Làm cho cô 2 ổ ốp la không hành, cay, với 1 ly trà tắc ít ngọt nha!'), 'Như mọi khi nha con!')
  assert.equal(bubbleLine('Cho em ly trà tắc!'), 'Cho em ly trà tắc!')
  assert.equal(bubbleLine(''), '')
  assert.equal(bubbleLine(null), '')
  const samples = [
    'Lấy cho cô 2 ổ ốp la không hành, cay, với 1 ly trà tắc ít ngọt nha!',
    'Cháu ơi, cho cô 2 cái bánh mì ốp la không hành hoa, có ớt, và 1 cốc trà quất bớt đường nhé!',
    'Làm cho cô 2 ổ bánh mì trứng không hành, cay, với 1 ly trà tắc ít ngọt nha!',
    'Bán cho cô 2 cái bánh mì ốp la, không hành, có ớt với!'
  ]
  for (const s of samples) {
    const b = bubbleLine(s)
    assert.ok(b.length <= SAY_MAX, `${b}: dài ${b.length}`)
    assert.ok(b.endsWith('…'), b)
    assert.ok(!/[,;:.!?]…$/.test(b), b + ': còn dấu câu trước dấu lửng')
    const body = b.slice(0, -1)
    assert.ok(s.startsWith(body), b + ': không phải phần đầu câu')
    assert.ok(/[\s,]/.test(s[body.length]), b + ': cắt giữa từ')
  }
  await withDom(async doc => {
    const full = 'Như mọi khi nha con! Làm cho cô 2 ổ ốp la không hành, cay, với 1 ly trà tắc ít ngọt nha!'
    const bub = createOrderBubble({ persona: 'co_chu', mood: 'vui', name: 'Thu', regular: true, request: TWO_LINES, speech: full, recipes: RECIPES }, { reduced: false })
    doc.body.appendChild(bub.el)
    const say = bub.el.querySelector('.co-bubble-say')
    assert.equal(say.textContent, '“Như mọi khi nha con!”')
    assert.equal(say.title, full)
    assert.deepEqual(JSON.parse(bub.bubbleEl.dataset.request), TWO_LINES)
    assert.equal(bub.bubbleEl.dataset.testid, 'speech-bubble')
    bub.update({ persona: 'co_chu', mood: 'vui', request: TWO_LINES, speech: full, say: 'Nhanh nha con!', recipes: RECIPES })
    assert.equal(say.textContent, '“Nhanh nha con!”')
    bub.destroy()
  })
})
