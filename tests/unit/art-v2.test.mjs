// M5 Đợt 0 — bộ hình mẫu SVG mới (src/ui/art/*): đúng quy chuẩn vẽ (docs/tham-khao/m5-thiet-ke.md mục 1.2, 6.1).
// Kiểm: khung <svg>, viewBox (64 cho icon và hình trạng thái, khớp PROP_META cho đạo cụ), không ảnh ngoài / gradient /
// filter / clipPath / mask / pattern / <use>, không giá trị lỗi, thẻ cân bằng, dung lượng, tọa độ làm tròn 1 chữ số,
// chữ trong hình đúng font và cỡ, cặp bẫy nước tương / nước mắm khác dáng, hàng hiếm có sao, đủ danh sách hình,
// đóng băng sâu, artV2/propV2 dự phòng về hình cũ, mã thuần (không DOM, không ngẫu nhiên, không giờ máy).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ICONS_V2, STATES_V2, PROPS, PROP_META, artV2, propV2 } from '../../src/ui/art/v2.js'
import { ICONS, icon, LEGACY_ICONS } from '../../src/ui/art.js'
import * as kit from '../../src/ui/art/kit.js'
import { ING_TUOI, ING_TUOI_STATES } from '../../src/ui/art/ing-tuoi.js'
import { ING_KHO, ING_KHO_STATES } from '../../src/ui/art/ing-kho.js'
import { MON } from '../../src/ui/art/mon.js'
import { TOOLS } from '../../src/ui/art/tools.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const ICON_MAX = 3584        // 3,5 KB mỗi icon / hình trạng thái
const PROP_MAX = 6144        // 6 KB mỗi đạo cụ lớn

const REQUIRED_ICONS = ['dua_leo', 'trung_ga', 'tac', 'hanh_la', 'trung_ga_ta', 'nuoc_tuong', 'nuoc_mam',
  'mon_banh_mi_op_la', 'mon_tra_tac', 'thot', 'dao_thep']
const REQUIRED_STATES = ['dua_leo.lat', 'trung_ga.nut', 'trung_ga.op_la', 'tac.bo_doi']
const REQUIRED_PROPS = ['thot_lon', 'dao_lon', 'tay']

const all = () => [
  ...Object.entries(ICONS_V2).map(([id, s]) => ({ id, s, kind: 'icon' })),
  ...Object.entries(STATES_V2).map(([id, s]) => ({ id, s, kind: 'state' })),
  ...Object.entries(PROPS).map(([id, s]) => ({ id, s, kind: 'prop' }))
]

function isDeepFrozen(o, seen = new Set()) {
  if (!o || typeof o !== 'object' || seen.has(o)) return true
  seen.add(o)
  if (!Object.isFrozen(o)) return false
  return Object.values(o).every(v => isDeepFrozen(v, seen))
}

// Hộp bao (ước lượng) của một path d: gom các điểm neo và điểm điều khiển (đủ để so dáng chai).
function pathBox(d) {
  const toks = d.match(/[A-Za-z]|-?\d*\.?\d+/g)
  let cmd = '', x = 0, y = 0, sx = 0, sy = 0
  const xs = [], ys = []
  const take = n => toks.splice(0, n).map(Number)
  while (toks.length) {
    if (/[A-Za-z]/.test(toks[0])) cmd = toks.shift()
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    if (C === 'Z') { x = sx; y = sy; continue }
    const n = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 }[C]
    const v = take(n)
    const pts = []
    if (C === 'H') pts.push([rel ? x + v[0] : v[0], y])
    else if (C === 'V') pts.push([x, rel ? y + v[0] : v[0]])
    else if (C === 'A') pts.push([rel ? x + v[5] : v[5], rel ? y + v[6] : v[6]])
    else for (let i = 0; i < v.length; i += 2) pts.push([rel ? x + v[i] : v[i], rel ? y + v[i + 1] : v[i + 1]])
    for (const [px, py] of pts) { xs.push(px); ys.push(py) }
    ;[x, y] = pts[pts.length - 1]
    if (C === 'M') { sx = x; sy = y; cmd = rel ? 'l' : 'L' }
  }
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

// Bóng dáng chính của chai = path tô màu đầu tiên (nền của tone3).
const silhouette = s => pathBox(s.match(/<path d="([^"]+)" fill="#(?!3a2618)[0-9a-f]{6}" stroke="none"\/>/)[1])

test('art-v2: đủ danh sách hình yêu cầu (11 icon, 4 hình trạng thái, 3 đạo cụ)', () => {
  for (const id of REQUIRED_ICONS) assert.ok(ICONS_V2[id], `thiếu icon ${id}`)
  for (const id of REQUIRED_STATES) assert.ok(STATES_V2[id], `thiếu hình trạng thái ${id}`)
  for (const id of REQUIRED_PROPS) assert.ok(PROPS[id], `thiếu đạo cụ ${id}`)
  assert.deepEqual(Object.keys(PROPS).sort(), Object.keys(PROP_META).sort(), 'PROPS và PROP_META cùng bộ khóa')
  for (const k of Object.keys(STATES_V2)) assert.match(k, /^[a-z0-9_]+\.[a-z0-9_]+$/, `khóa trạng thái ${k}`)
  for (const k of Object.keys(ICONS_V2)) assert.match(k, /^[a-z0-9_]+$/, `id ${k}`)
})

test('art-v2: SVG hợp lệ, đúng viewBox, không ảnh ngoài / gradient / filter, không giá trị lỗi, thẻ cân bằng', () => {
  for (const { id, s, kind } of all()) {
    assert.equal(typeof s, 'string', id)
    assert.ok(s.startsWith('<svg') && s.endsWith('</svg>'), `${id}: khung svg`)
    const vb = kind === 'prop' ? `0 0 ${PROP_META[id].vb[0]} ${PROP_META[id].vb[1]}` : '0 0 64 64'
    assert.ok(s.includes(`viewBox="${vb}"`), `${id}: viewBox phải là ${vb}`)
    assert.equal((s.match(/viewBox=/g) || []).length, 1, `${id}: một viewBox`)
    assert.ok(!/url\(|href|<use\b|<image\b|base64/i.test(s), `${id}: không ảnh ngoài, không <use>`)
    assert.ok(!/gradient|<filter\b|filter=|clip-?path|<mask\b|mask=|<pattern\b/i.test(s), `${id}: không gradient/filter/clipPath/mask/pattern`)
    assert.ok(!/undefined|NaN|null|Infinity|\[object/.test(s), `${id}: giá trị lỗi`)
    const open = (s.match(/<(svg|g|text)\b/g) || []).length
    const close = (s.match(/<\/(svg|g|text)>/g) || []).length
    assert.equal(open, close, `${id}: thẻ svg/g/text cân bằng`)
    assert.ok(s.includes(`stroke="${kit.INK}"`), `${id}: viền mực ${kit.INK}`)
  }
})

test('art-v2: dung lượng (≤ 3,5 KB icon/trạng thái, ≤ 6 KB đạo cụ)', () => {
  for (const { id, s, kind } of all()) {
    const max = kind === 'prop' ? PROP_MAX : ICON_MAX
    assert.ok(Buffer.byteLength(s) <= max, `${id}: ${Buffer.byteLength(s)} B > ${max} B`)
  }
})

test('art-v2: tọa độ làm tròn 1 chữ số thập phân', () => {
  const geo = /\s(?:d|points|cx|cy|x|y|r|rx|ry|width|height|transform)="([^"]*)"/g
  for (const { id, s } of all()) {
    for (const m of s.matchAll(geo)) {
      const bad = m[1].replace(/scale\([^)]*\)/g, '').match(/\d*\.\d{2,}/g)
      assert.equal(bad, null, `${id}: số quá 1 chữ số thập phân ${bad} trong "${m[1].slice(0, 60)}"`)
    }
  }
})

test('art-v2: icon/trạng thái có bóng đất INK .15 ở y≈58 và điểm sáng trắng', () => {
  for (const { id, s, kind } of all()) {
    if (kind === 'prop') continue
    const g = s.match(/<ellipse cx="[\d.]+" cy="([\d.]+)" rx="[\d.]+" ry="[\d.]+" fill="#3a2618" opacity="\.15" stroke="none"\/>/)
    assert.ok(g, `${id}: thiếu bóng đất`)
    assert.ok(Number(g[1]) >= 55 && Number(g[1]) <= 60, `${id}: bóng đất ở y=${g[1]}`)
    assert.ok(/fill="#fff" opacity="\.\d"|stroke="#fff"/.test(s), `${id}: thiếu điểm sáng trắng`)
  }
  assert.ok(PROPS.thot_lon.includes('opacity=".15"'), 'thớt lớn có bóng đất')
})

test('art-v2: chữ trong hình dùng Baloo 2 đậm 800, cỡ ≥ 9', () => {
  for (const { id, s } of all()) {
    for (const t of s.match(/<text\b[^>]*>/g) || []) {
      assert.ok(t.includes(`font-family="'Baloo 2', system-ui"`), `${id}: font chữ`)
      assert.ok(t.includes('font-weight="800"'), `${id}: chữ đậm 800`)
      assert.ok(Number(t.match(/font-size="([\d.]+)"/)[1]) >= 9, `${id}: cỡ chữ ≥ 9`)
      assert.ok(!/textLength|lengthAdjust/.test(t), `${id}: không ép textLength (tách dấu tiếng Việt)`)
    }
  }
})

test('art-v2: cặp bẫy nước tương / nước mắm khác hình, khác dáng, giữ chữ TƯƠNG và MẮM', () => {
  const t = ICONS_V2.nuoc_tuong, m = ICONS_V2.nuoc_mam
  assert.notEqual(t, m)
  assert.ok(t.includes('TƯƠNG'), 'nước tương có chữ TƯƠNG')
  assert.ok(m.includes('MẮM'), 'nước mắm có chữ MẮM')
  const bt = silhouette(t), bm = silhouette(m)
  const ht = bt.y1 - bt.y0, hm = bm.y1 - bm.y0
  assert.ok(ht - hm >= 10, `chai nước tương phải CAO hơn hẳn (${ht} so với ${hm})`)
  assert.ok((bm.x1 - bm.x0) / hm > (bt.x1 - bt.x0) / ht + 0.3, 'chai nước mắm bè, thấp; chai nước tương thon, cao')
  assert.notEqual(t.match(/<rect[^>]*fill="(#[0-9a-f]{6})"/g).pop(), m.match(/<rect[^>]*fill="(#[0-9a-f]{6})"/g).pop(), 'nắp khác màu')
})

test('art-v2: hàng hiếm trứng gà ta có sao #ffd23f, khác trứng gà; lòng đỏ dùng var(--yolk, …)', () => {
  assert.ok(ICONS_V2.trung_ga_ta.includes('#ffd23f'))
  assert.ok(!ICONS_V2.trung_ga.includes('#ffd23f'), 'hàng thường không có sao')
  assert.notEqual(ICONS_V2.trung_ga_ta, ICONS_V2.trung_ga)
  assert.ok(ICONS_V2.trung_ga_ta.includes('var(--yolk,'), 'trứng gà ta dùng chung khuôn lòng đỏ --yolk')
  assert.ok(STATES_V2['trung_ga.op_la'].includes('var(--yolk,#f6b21a)'))
  assert.ok(ICONS_V2.mon_banh_mi_op_la.includes('var(--yolk,#f6b21a)'), 'món trứng gà ta chỉ cần đặt --yolk')
  assert.ok(kit.rareStar().includes('#ffd23f'))
})

// ---------- Đợt 1, gói B: nguyên liệu tươi (src/ui/art/ing-tuoi.js) ----------
const TUOI_ICONS = ['dua_leo', 'trung_ga', 'tac', 'hanh_la', 'trung_ga_ta', 'trung_vit', 'trung_cut', 'hanh_tay', 'chanh',
  'xoai_xanh', 'rau_ram', 'rau_hung_lui', 'vo_buoi']
const EGG_STATES = ['nut', 'op_la_song', 'op_la', 'op_la_chay', 'long_dao', 'chin_ky']
const TUOI_STATES = ['dua_leo.sach', 'dua_leo.lat', 'dua_leo.soi', 'dua_leo.bao',
  ...EGG_STATES.map(s => 'trung_ga.' + s), ...EGG_STATES.map(s => 'trung_ga_ta.' + s),
  'tac.bo_doi', 'tac.vat', 'trung_cut.boc',
  'xoai_xanh.got', 'xoai_xanh.soi', 'xoai_xanh.lat', 'xoai_xanh.hat_luu',
  'vo_buoi.got', 'vo_buoi.hat_luu', 'vo_buoi.lat', 'vo_buoi.soi', 'vo_buoi.ao_bot', 'vo_buoi.chin']
// Tên trạng thái theo cách sơ chế (method) của bước thái trong recipes.js.
const METHOD_STATE = { thai_lat: 'lat', thai_soi: 'soi', bao: 'bao', hat_luu: 'hat_luu' }
const fillOf = s => s.match(/<path d="[^"]+" fill="(#[0-9a-f]{6})" stroke="none"\/>/)[1]
// d của bóng dáng chính (path tô màu đầu tiên, như silhouette()).
const silhouetteD = s => s.match(/<path d="([^"]+)" fill="#(?!3a2618)[0-9a-f]{6}" stroke="none"\/>/)[1]
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))

test('art-v2 đồ tươi: đủ 13 hình gốc, 29 hình trạng thái; có trong ICONS_V2/STATES_V2; không hình nào trùng', async () => {
  const { INGREDIENTS } = await import('../../src/data/ingredients.js')
  assert.deepEqual(Object.keys(ING_TUOI).sort(), [...TUOI_ICONS].sort())
  assert.deepEqual(Object.keys(ING_TUOI_STATES).sort(), [...TUOI_STATES].sort())
  for (const id of TUOI_ICONS) {
    assert.ok(INGREDIENTS[id], `${id} là nguyên liệu trong dữ liệu`)
    assert.equal(ICONS_V2[id], ING_TUOI[id], `${id} có trong ICONS_V2`)
    assert.equal(artV2(id), ING_TUOI[id])
  }
  for (const k of TUOI_STATES) {
    const [id, st] = k.split('.')
    assert.ok(ING_TUOI[id], `${k}: trạng thái của nguyên liệu tươi`)
    assert.equal(STATES_V2[k], ING_TUOI_STATES[k], `${k} có trong STATES_V2`)
    assert.equal(artV2(id, st), ING_TUOI_STATES[k])
  }
  const all = [...Object.values(ING_TUOI), ...Object.values(ING_TUOI_STATES)]
  assert.equal(new Set(all).size, all.length, 'không có hai hình đồ tươi trùng chuỗi SVG')
})

test('art-v2 đồ tươi: đúng quy tắc vẽ (viewBox 64, ≤ 3,5 KB, không ảnh ngoài / gradient / giá trị lỗi, bóng đất, điểm sáng)', () => {
  for (const [id, s] of [...Object.entries(ING_TUOI), ...Object.entries(ING_TUOI_STATES)]) {
    assert.ok(s.startsWith('<svg') && s.endsWith('</svg>') && s.includes('viewBox="0 0 64 64"'), `${id}: khung svg 64`)
    assert.ok(Buffer.byteLength(s) <= ICON_MAX, `${id}: ${Buffer.byteLength(s)} B > ${ICON_MAX} B`)
    assert.ok(!/url\(|href|<use\b|<image\b|base64|gradient|<filter\b|filter=|clip-?path|<mask\b|mask=|<pattern\b|<text\b/i.test(s), `${id}: phần tử cấm`)
    assert.ok(!/undefined|NaN|null|Infinity|\[object/.test(s), `${id}: giá trị lỗi`)
    assert.ok(s.includes(`stroke="${kit.INK}" stroke-width="3"`), `${id}: viền mực dày 3`)
    assert.ok(/fill="#3a2618" opacity="\.15" stroke="none"/.test(s), `${id}: bóng đất`)
    assert.ok(/fill="#fff" opacity="\.\d"|stroke="#fff"/.test(s), `${id}: điểm sáng`)
  }
})

test('art-v2 đồ tươi: mỗi bước sơ chế nguyên liệu tươi trong recipes.js có hình trạng thái tương ứng', async () => {
  const { RECIPES } = await import('../../src/data/recipes.js')
  const has = (ing, st, where) => assert.ok(ING_TUOI_STATES[`${ing}.${st}`], `${where}: thiếu hình ${ing}.${st}`)
  let n = 0
  for (const r of Object.values(RECIPES)) {
    for (const s of r.steps) {
      if (!s.ing || !ING_TUOI[s.ing]) continue
      const where = `${r.id}/${s.id}`
      for (const m of s.method?.options || []) { assert.ok(METHOD_STATE[m], `${where}: cách ${m} chưa có tên trạng thái`); has(s.ing, METHOD_STATE[m], where); n++ }
      if (s.type === 'got') { has(s.ing, 'got', where); n++ }
      if (s.type === 'cha' && s.id.startsWith('rua')) { has(s.ing, 'sach', where); n++ }
      if (s.type === 'cha' && s.id.startsWith('boc')) { has(s.ing, 'boc', where); n++ }
      if (s.type === 'dap') { has(s.ing, 'nut', where); has(s.ing, 'op_la_song', where); n++ }
      if (s.type === 'lua') { for (const st of ['op_la', 'op_la_chay']) has(s.ing, st, where); n++ }
      if (s.id === 'thai_tac') { has(s.ing, 'bo_doi', where); n++ }
      if (s.id === 'vat_tac') { has(s.ing, 'vat', where); n++ }
      // Ghi chú độ chín vá bước chiên → có hình lòng đào / chín kỹ.
      for (const note of r.notes || []) if (note.group === 'do_chin' && note.patch?.[s.id]) { has(s.ing, note.id, where); n++ }
    }
  }
  assert.ok(n >= 30, `đã đối chiếu ${n} cặp bước/hình`)
  // Áo bột và luộc (nguyên liệu của bước là bột năng) vẫn đổi hình cùi bưởi.
  for (const st of ['ao_bot', 'chin']) assert.ok(ING_TUOI_STATES[`vo_buoi.${st}`])
})

test('art-v2 đồ tươi: cặp bẫy khác chuỗi SVG và khác DÁNG (trứng vịt/gà, tắc/chanh, hành lá/hành tây, rau răm/húng lủi)', () => {
  const T = ING_TUOI
  for (const [a, b] of [['trung_ga', 'trung_vit'], ['tac', 'chanh'], ['hanh_la', 'hanh_tay'], ['rau_ram', 'rau_hung_lui']]) {
    assert.notEqual(T[a], T[b], `${a} / ${b}`)
  }
  // Trứng vịt: quả to hơn hẳn, vỏ trắng xanh; trứng gà: nhỏ hơn, vỏ nâu.
  const area = b => (b.x1 - b.x0) * (b.y1 - b.y0)
  const ga = silhouette(T.trung_ga), vit = silhouette(T.trung_vit)
  assert.ok(area(vit) >= area(ga) * 1.2, `trứng vịt phải to hơn trứng gà (${area(vit)} so với ${area(ga)})`)
  const [vr, vg, vb] = rgb(fillOf(T.trung_vit)), [gr, , gb] = rgb(fillOf(T.trung_ga))
  assert.ok(vg > vr && vb > vr, 'vỏ trứng vịt ngả xanh')
  assert.ok(gr - gb > 60, 'vỏ trứng gà nâu')
  // Tắc: quả tròn (cung tròn A) có lá; chanh: bầu dục có núm (đường cong C), không có lá.
  assert.match(silhouetteD(T.tac), /A/)
  assert.ok(T.tac.includes(kit.PAL.la[0]), 'tắc có lá')
  assert.match(silhouetteD(T.chanh), /^M[^A]*C[^A]*Z$/)
  assert.ok(!T.chanh.includes(kit.PAL.la[0]) && !T.chanh.includes(kit.PAL.la[1]), 'chanh không có lá')
  // Hành lá: bó cọng (nét ống dày, màu lá hành); hành tây: củ tô kín gần tròn, không có cọng lá.
  assert.ok(T.hanh_la.includes('stroke-width="10"') && T.hanh_la.includes(kit.PAL.hanh[1]), 'hành lá là bó cọng')
  const bt = silhouette(T.hanh_tay)
  const ratio = (bt.x1 - bt.x0) / (bt.y1 - bt.y0)
  assert.ok(ratio > 0.75 && ratio < 1.3, `củ hành tây gần tròn (${ratio.toFixed(2)})`)
  assert.ok(!T.hanh_tay.includes(kit.PAL.hanh[0]) && !T.hanh_tay.includes(kit.PAL.hanh[1]), 'hành tây không có cọng lá')
  // Rau răm: lá mũi mác (cung Q nhọn hai đầu), cọng tía, đốm tía giữa lá; húng lủi: lá răng cưa (đa giác ≥ 20 đỉnh), cọng xanh.
  assert.ok(T.rau_ram.includes('#a5436c') && T.rau_ram.includes('#7b2852'), 'rau răm có cọng tía và đốm tía')
  assert.ok(!T.rau_hung_lui.includes('#a5436c') && !T.rau_hung_lui.includes('#7b2852'), 'húng lủi không có màu tía')
  assert.match(silhouetteD(T.rau_ram), /Q/)
  const teeth = [...T.rau_hung_lui.matchAll(/<path d="(M[^"]*z)" fill="#[0-9a-f]{6}" stroke-width="2.2"\/>/g)]
  assert.ok(teeth.length >= 4, `húng lủi có ≥ 4 lá răng cưa (${teeth.length})`)
  for (const [, d] of teeth) {
    const nums = d.match(/-?\d*\.?\d+/g).length
    assert.ok(nums / 2 >= 20, `lá húng có răng cưa (${nums / 2} đỉnh)`)
  }
})

test('art-v2 đồ tươi: trạng thái trứng gà / trứng gà ta dùng --yolk; gà ta có sao, gà thường không', () => {
  for (const st of EGG_STATES) {
    const ga = ING_TUOI_STATES['trung_ga.' + st], ta = ING_TUOI_STATES['trung_ga_ta.' + st]
    assert.ok(ga.includes('var(--yolk,#f6b21a)'), `trung_ga.${st}: lòng đỏ --yolk`)
    assert.ok(!ga.includes('#ffd23f'), `trung_ga.${st}: hàng thường không có sao`)
    assert.ok(ta.includes('var(--yolk,#e8730c)'), `trung_ga_ta.${st}: lòng đỏ cam đậm --yolk`)
    assert.ok(ta.includes('#ffd23f'), `trung_ga_ta.${st}: sao hàng hiếm`)
  }
  assert.notEqual(ING_TUOI_STATES['trung_ga.op_la_chay'], ING_TUOI_STATES['trung_ga.op_la'])
  assert.notEqual(ING_TUOI_STATES['trung_ga.long_dao'], ING_TUOI_STATES['trung_ga.chin_ky'])
})

test('art-v2: đóng băng sâu (bảng hình, PROP_META, bảng màu, các tệp nguồn)', () => {
  for (const o of [ICONS_V2, STATES_V2, PROPS, PROP_META, kit.PAL, ING_TUOI, ING_TUOI_STATES, ING_KHO, ING_KHO_STATES, MON, TOOLS]) {
    assert.ok(isDeepFrozen(o))
  }
  assert.ok(Object.isFrozen(PROP_META.thot_lon.top[0]))
  assert.throws(() => { 'use strict'; ICONS_V2.dua_leo = '' })
})

test('art-v2: PROP_META có điểm mốc nằm trong hộp vẽ', () => {
  const inBox = (id, [x, y]) => {
    const [w, h] = PROP_META[id].vb
    assert.ok(x >= 0 && x <= w && y >= 0 && y <= h, `${id}: điểm (${x}, ${y}) ngoài hộp ${w}×${h}`)
  }
  inBox('tay', PROP_META.tay.tip)
  inBox('dao_lon', PROP_META.dao_lon.tip)
  inBox('dao_lon', PROP_META.dao_lon.grip)
  for (const p of PROP_META.dao_lon.edge) inBox('dao_lon', p)
  for (const p of PROP_META.thot_lon.top) inBox('thot_lon', p)
  inBox('thot_lon', PROP_META.thot_lon.center)
})

test('art-v2: artV2 ưu tiên trạng thái → hình mới → icon cũ; propV2 trả \'\' khi thiếu', () => {
  assert.equal(artV2('dua_leo', 'lat'), STATES_V2['dua_leo.lat'])
  assert.equal(artV2('trung_ga', 'op_la'), STATES_V2['trung_ga.op_la'])
  assert.equal(artV2('dua_leo', 'chua_ve'), ICONS_V2.dua_leo, 'trạng thái chưa vẽ → hình mới')
  assert.equal(artV2('dua_leo'), ICONS_V2.dua_leo)
  assert.equal(artV2('tra_tac'), ICONS_V2.mon_tra_tac, 'nhận id món không kèm mon_')
  // Id chỉ có ở bộ hình cũ (chọn động vì Đợt 1 vẽ thêm dần, vd trung_vit đã có hình mới): chưa có hình mới → icon cũ.
  const oldOnly = Object.keys(ICONS).find(k => k !== 'fallback' && !k.startsWith('mon_') && !ICONS_V2[k] && !ICONS_V2['mon_' + k])
  assert.ok(oldOnly, 'còn ít nhất một id chỉ có ở bộ hình cũ')
  assert.equal(artV2(oldOnly), icon(oldOnly), 'chưa có hình mới → icon cũ')
  assert.equal(artV2(oldOnly, 'nut'), ICONS[oldOnly])
  assert.equal(artV2('trung_vit'), ICONS_V2.trung_vit, 'trứng vịt đã có hình mới (Đợt 1)')
  assert.equal(artV2('trung_vit', 'nut'), ICONS_V2.trung_vit, 'trạng thái chưa vẽ → hình mới')
  // Đợt 1, gói D1: chè bưởi đã có hình mới; id món chỉ có ở bộ hình cũ (món tương lai) vẫn trả icon cũ.
  assert.equal(artV2('mon_che_buoi'), MON.mon_che_buoi, 'chè bưởi đã có hình mới (Đợt 1)')
  const oldMon = Object.keys(ICONS).find(k => k.startsWith('mon_') && !ICONS_V2[k])
  if (oldMon) assert.equal(artV2(oldMon), ICONS[oldMon], 'món chưa có hình mới → icon cũ')
  assert.equal(artV2('khong_co_that'), ICONS.fallback)
  assert.equal(artV2(undefined), ICONS.fallback)
  assert.equal(artV2(null, 'lat'), ICONS.fallback)
  assert.equal(artV2('constructor'), ICONS.fallback, 'không lấy nhầm thuộc tính kế thừa')
  assert.equal(propV2('tay'), PROPS.tay)
  assert.equal(propV2('khong_co'), '')
  assert.equal(propV2(undefined), '')
  assert.equal(propV2('toString'), '')
})

test('art-v2: bộ dựng kit thuần và đúng luật', () => {
  assert.equal(kit.INK, '#3a2618')
  assert.equal(kit.OUTLINE, 3)
  assert.ok(kit.DETAIL >= 1.5 && kit.DETAIL <= 2)
  const s = kit.svg('<circle r="1"/>')
  assert.ok(s.startsWith('<svg') && s.includes('viewBox="0 0 64 64"') && s.includes('stroke-width="3"'))
  assert.ok(kit.svg('', [240, 160]).includes('viewBox="0 0 240 160"'))
  assert.ok(kit.ground().includes('opacity=".15"') && kit.ground().includes(kit.INK))
  assert.ok(kit.hilite(10, 10, 3, 2).includes('fill="#fff"'))
  assert.equal(kit.r1(-0.04), 0)
  assert.equal(Object.is(kit.r1(-0.04), -0), false)
  assert.equal(kit.r1(1.26), 1.3)
  assert.equal(kit.frac(0.5), '.5')
  // tone3: viền vẽ SAU CÙNG (phủ mép mảng tối), mảng tối không viền.
  const t = kit.tone3({ outline: 'M0 0H10V10Z', base: '#111111', dark: '#222222', shade: 'M5 5H10V10Z', shine: 'M1 1H2V2Z' })
  assert.ok(t.endsWith('<path d="M0 0H10V10Z" fill="none"/>'))
  assert.ok(t.includes('<path d="M5 5H10V10Z" fill="#222222" stroke="none"/>'))
  assert.ok(kit.tone3({ outline: 'M0 0Z', base: '#111111', line: 'M0 0H5' }).endsWith('<path d="M0 0H5" fill="none"/>'))
  // Lưỡi liềm của hình tròn nằm ở phía dưới-phải và trong hộp bao của hình.
  const c = kit.crescent(kit.ellipsePts(32, 32, 20, 20, 48), 4, 4)
  const b = pathBox(c)
  assert.ok(b.x0 >= 11.9 && b.x1 <= 52.1 && b.y0 >= 11.9 && b.y1 <= 52.1, 'lưỡi liềm nằm trong hình')
  assert.ok((b.x0 + b.x1) / 2 > 32 && (b.y0 + b.y1) / 2 > 32, 'lưỡi liềm lệch về dưới-phải')
  // ellipseShade: hai mút nằm trên ellipse; cung ngoài là cung lớn đi theo chiều kim đồng hồ, cung trong là cung nhỏ.
  const es = kit.ellipseShade(32, 32, 20, 10)
  const m = es.match(/^M([\d.-]+) ([\d.-]+)A20 10 0 1 1 ([\d.-]+) ([\d.-]+)A20 10 0 0 0 ([\d.-]+) ([\d.-]+)Z$/)
  assert.ok(m, es)
  const onE = (x, y) => Math.abs(((x - 32) / 20) ** 2 + ((y - 32) / 10) ** 2 - 1) < 0.03
  assert.ok(onE(+m[1], +m[2]) && onE(+m[3], +m[4]), 'hai mút trên ellipse')
  assert.equal(+m[5], +m[1]); assert.equal(+m[6], +m[2])
  // Hai mút lệch về trên-phải và dưới-trái (dây cung vuông góc hướng sáng trên-trái → dưới-phải).
  assert.ok(+m[1] > 32 && +m[2] < 32 && +m[3] < 32 && +m[4] > 32, 'mảng tối nằm phía dưới-phải')
  assert.equal(kit.crescent([[0, 0], [1, 0], [1, 1]], 0, 0), '', 'không dời thì không có mảng tối')
  // Chữ: cỡ tối thiểu 9, ép ngang bằng scale chứ không bằng textLength.
  assert.ok(kit.txt(10, 10, 'A', 6, '#000000').includes('font-size="9"'))
  assert.ok(kit.txt(10, 10, 'A', 9, '#000000', 0.8).includes('scale(0.8 1)'))
})

test('art-v2: mã nguồn src/ui/art/* thuần (không DOM, không ngẫu nhiên, không giờ máy, không lệnh xuất ra màn)', () => {
  const dir = path.join(ROOT, 'src', 'ui', 'art')
  for (const f of readdirSync(dir).filter(n => n.endsWith('.js'))) {
    const src = readFileSync(path.join(dir, f), 'utf8')
    assert.ok(!/\b(document|window|navigator|matchMedia|localStorage)\b/.test(src), `${f}: chạm DOM/trình duyệt`)
    assert.ok(!/Math\.random|Date\.now|new Date|performance\.now/.test(src), `${f}: không tất định`)
    assert.ok(!/console\./.test(src), `${f}: còn console`)
  }
})

// ---------- Đợt 1, gói C: đồ khô, chai lọ, bột, đồ uống (src/ui/art/ing-kho.js) ----------
const KHO_ICONS = ['nuoc_tuong', 'nuoc_mam', 'tuong_ot', 'muoi', 'hanh_phi', 'sa_te', 'mat_ong_rung', 'duong', 'duong_phen',
  'ca_phe', 'ca_phe_hoa_tan', 'sua_dac', 'sua_tuoi', 'bot_mi', 'bot_nang', 'cot_dua', 'dua_nao', 'dau_xanh', 'muoi_tom_tay_ninh',
  'ca_phe_bmt', 'banh_mi', 'banh_trang', 'banh_trang_me', 'kho_bo', 'dau_phong', 'kho_muc', 'tra', 'da', 'ly']
const KHO_STATES = ['banh_trang.soi', 'banh_trang.vuong', 'kho_muc.xe', 'banh_mi.nuong', 'da.vien', 'da.mot_vien']
// Cách cắt bánh tráng (method của bước cat_banh_trang) → tên trạng thái; để nguyên thì dùng hình gốc.
const KHO_METHOD_STATE = { cat_soi: 'soi', cat_vuong: 'vuong', de_nguyen: null }
const khoEntries = () => [...Object.entries(ING_KHO), ...Object.entries(ING_KHO_STATES)]
// Các nét viền ngoài dày 3 (path fill="none" không đặt màu riêng) nằm ngoài nhóm xoay: "dáng" của hình.
const khoOutlines = s => [...s.replace(/<g transform="[^"]*">[\s\S]*?<\/g>/g, '').matchAll(/<path d="([^"]+)" fill="none"\/>/g)].map(m => m[1])
const khoAspect = d => { const b = pathBox(d); return (b.y1 - b.y0) / (b.x1 - b.x0) }
const khoCount = (s, re) => (s.match(re) || []).length

test('art-v2 đồ khô: đủ 29 hình gốc, 6 hình trạng thái; có trong ICONS_V2/STATES_V2; cùng đồ tươi phủ kín mọi nguyên liệu', async () => {
  const { INGREDIENTS } = await import('../../src/data/ingredients.js')
  assert.deepEqual(Object.keys(ING_KHO).sort(), [...KHO_ICONS].sort())
  assert.deepEqual(Object.keys(ING_KHO_STATES).sort(), [...KHO_STATES].sort())
  for (const id of KHO_ICONS) {
    assert.ok(INGREDIENTS[id], `${id} là nguyên liệu trong dữ liệu`)
    assert.equal(INGREDIENTS[id].icon, id, `${id}: khóa hình trùng id nguyên liệu`)
    assert.equal(ICONS_V2[id], ING_KHO[id], `${id} có trong ICONS_V2`)
    assert.equal(artV2(id), ING_KHO[id])
  }
  for (const k of KHO_STATES) {
    const [id, st] = k.split('.')
    assert.ok(ING_KHO[id], `${k}: trạng thái của đồ khô`)
    assert.equal(STATES_V2[k], ING_KHO_STATES[k], `${k} có trong STATES_V2`)
    assert.equal(artV2(id, st), ING_KHO_STATES[k])
  }
  // Đồ tươi (gói B) và đồ khô (gói C) không giành nhau một id; mọi nguyên liệu đều thuộc đúng một bên.
  for (const id of Object.keys(ING_KHO)) assert.ok(!(id in ING_TUOI), `${id} nằm ở cả hai tệp`)
  for (const [id, g] of Object.entries(INGREDIENTS)) {
    if (ING_KHO[g.icon]) continue
    assert.ok(ING_TUOI[g.icon], `${id}: chưa có hình mới ở tệp đồ tươi hay đồ khô`)
  }
  const all = khoEntries().map(([, s]) => s)
  assert.equal(new Set(all).size, all.length, 'không có hai hình đồ khô trùng chuỗi SVG')
})

test('art-v2 đồ khô: đúng quy tắc vẽ (viewBox 64, ≤ 3,5 KB, viền mực 3, bóng đất, điểm sáng; chữ chỉ ở TƯƠNG / MẮM)', () => {
  for (const [id, s] of khoEntries()) {
    assert.ok(s.startsWith('<svg') && s.endsWith('</svg>') && s.includes('viewBox="0 0 64 64"'), `${id}: khung svg 64`)
    assert.ok(Buffer.byteLength(s) <= ICON_MAX, `${id}: ${Buffer.byteLength(s)} B > ${ICON_MAX} B`)
    assert.ok(!/url\(|href|<use\b|<image\b|base64|gradient|<filter\b|filter=|clip-?path|<mask\b|mask=|<pattern\b/i.test(s), `${id}: phần tử cấm`)
    assert.ok(!/undefined|NaN|null|Infinity|\[object/.test(s), `${id}: giá trị lỗi`)
    assert.ok(s.includes(`stroke="${kit.INK}" stroke-width="3"`), `${id}: viền mực dày 3`)
    assert.ok(/fill="#3a2618" opacity="\.15" stroke="none"/.test(s), `${id}: bóng đất`)
    assert.ok(/fill="#fff" opacity="\.\d"|stroke="#fff"/.test(s), `${id}: điểm sáng`)
    const open = khoCount(s, /<(svg|g|text)\b/g), close = khoCount(s, /<\/(svg|g|text)>/g)
    assert.equal(open, close, `${id}: thẻ cân bằng`)
    const texts = khoCount(s, /<text\b/g)
    if (id === 'nuoc_tuong' || id === 'nuoc_mam') assert.equal(texts, 1, `${id}: giữ một dòng chữ`)
    else assert.equal(texts, 0, `${id}: không có chữ trong hình (chỉ vẽ)`)
  }
})

test('art-v2 đồ khô: hình trạng thái khớp bước thật trong recipes.js (cắt bánh tráng, xé khô mực, nướng bánh mì, thả đá)', async () => {
  const { RECIPES } = await import('../../src/data/recipes.js')
  const has = (ing, st, where) => assert.ok(ING_KHO_STATES[`${ing}.${st}`], `${where}: thiếu hình ${ing}.${st}`)
  let n = 0
  for (const r of Object.values(RECIPES)) {
    for (const s of r.steps) {
      if (!s.ing || !ING_KHO[s.ing]) continue
      const where = `${r.id}/${s.id}`
      for (const m of s.method?.options || []) {
        assert.ok(m in KHO_METHOD_STATE, `${where}: cách ${m} chưa có tên trạng thái`)
        if (KHO_METHOD_STATE[m]) { has(s.ing, KHO_METHOD_STATE[m], where); n++ }
      }
      if (s.type === 'cha' && s.id.startsWith('xe')) { has(s.ing, 'xe', where); n++ }
      if (s.id.startsWith('nuong')) { has(s.ing, 'nuong', where); n++ }
      if (s.type === 'bay') { has(s.ing, 'vien', where); has(s.ing, 'mot_vien', where); n++ }
    }
  }
  assert.ok(n >= 8, `đã đối chiếu ${n} cặp bước/hình`)
  // Trạng thái nào cũng ứng với ít nhất một bước thật (không vẽ thừa).
  const used = new Set()
  for (const r of Object.values(RECIPES)) for (const s of r.steps) {
    if (!s.ing) continue
    for (const m of s.method?.options || []) if (KHO_METHOD_STATE[m]) used.add(`${s.ing}.${KHO_METHOD_STATE[m]}`)
    if (s.type === 'cha' && s.id.startsWith('xe')) used.add(`${s.ing}.xe`)
    if (s.id.startsWith('nuong')) used.add(`${s.ing}.nuong`)
    if (s.type === 'bay') { used.add(`${s.ing}.vien`); used.add(`${s.ing}.mot_vien`) }
  }
  for (const k of KHO_STATES) assert.ok(used.has(k), `${k}: không ứng với bước nào`)
})

test('art-v2 đồ khô: cặp bẫy khác chuỗi SVG và khác DÁNG (không chỉ đổi màu)', async () => {
  const { INGREDIENTS } = await import('../../src/data/ingredients.js')
  const K = ING_KHO
  const pairs = []
  for (const [id, g] of Object.entries(INGREDIENTS)) {
    for (const t of [g.trapOf, ...(g.traps || [])]) if (t && K[g.icon] && K[INGREDIENTS[t].icon]) pairs.push([g.icon, INGREDIENTS[t].icon])
  }
  assert.ok(pairs.length >= 14, `đủ cặp bẫy đồ khô (${pairs.length})`)
  for (const [a, b] of pairs) {
    assert.notEqual(K[a], K[b], `${a} / ${b}`)
    assert.notDeepEqual(khoOutlines(K[a]), khoOutlines(K[b]), `${a} / ${b}: viền ngoài giống hệt (chỉ đổi màu)`)
  }
  const outline0 = id => khoOutlines(K[id])[0]
  // Đường: bao mở miệng (đống đường vòm + mép bao cuộn), nhãn đỏ; muối: hũ thấp bè nắp xanh, đầy tinh thể;
  // đường phèn: ba cục đa giác (chỉ nét thẳng), không bao, không nắp.
  assert.ok(K.muoi.includes(kit.PAL.xanh_nhan[0]) && !K.duong.includes(kit.PAL.xanh_nhan[0]), 'muối nắp xanh, đường không')
  assert.ok(khoAspect(outline0('muoi')) < 0.9, 'hũ muối thấp bè')
  assert.equal(khoOutlines(K.duong).length, 3, 'bao đường: đống đường, thân bao, mép bao cuộn')
  const lumps = khoOutlines(K.duong_phen)
  assert.equal(lumps.length, 3, 'đường phèn: ba cục')
  for (const d of lumps) assert.match(d, /^M[\d. L]+Z$/, 'cục đường phèn là đa giác cạnh thẳng')
  assert.ok(!/<rect\b/.test(K.duong_phen), 'đường phèn không có nắp hay nhãn')
  // Bánh tráng: xấp ≥ 4 lá; bánh tráng mè: một lá dày rắc ≥ 12 hạt mè đen.
  assert.ok(khoCount(K.banh_trang, /<ellipse cx="32" cy="[\d.]+" rx="25" ry="10.4"/g) >= 4, 'bánh tráng là một xấp lá')
  assert.equal(khoCount(K.banh_trang_me, /<ellipse cx="32" cy="33" rx="27"/g), 1, 'bánh tráng mè là một lá')
  const seeds = K.banh_trang_me.match(/<path d="([^"]+)" fill="none" stroke="#2a1a10"/)
  assert.ok(seeds && khoCount(seeds[1], /M/g) >= 12, 'bánh tráng mè rắc mè đen')
  assert.ok(!K.banh_trang.includes('#2a1a10'), 'bánh tráng thường không có mè')
  // Cà phê phin: một túi đứng có kẹp kẽm; hòa tan: ba gói que xòe; Buôn Ma Thuột: bao bố buộc dây thừng, không kẹp kẽm.
  const sticks = khoCount(K.ca_phe_hoa_tan, /<g transform="rotate\(-?\d+ 32 58\)">/g)
  assert.equal(sticks, 3, 'cà phê hòa tan: ba gói que')
  assert.equal(khoCount(K.ca_phe, /rotate\(-?\d+ 32 58\)/g), 0, 'cà phê phin không phải gói que')
  assert.ok(khoOutlines(K.ca_phe_bmt).length === 2 && !/<rect x="10.6" y="12.4"/.test(K.ca_phe_bmt), 'bao Buôn Ma Thuột buộc túm, không kẹp kẽm')
  assert.ok(/<rect x="10.6" y="12.4"/.test(K.ca_phe), 'túi cà phê phin có kẹp kẽm')
  // Sữa tươi: hộp giấy CAO mái nhọn; sữa đặc: lon THẤP bè có nắp tròn.
  assert.ok(khoAspect(outline0('sua_tuoi')) > 1.3, 'hộp sữa tươi cao')
  assert.ok(khoAspect(outline0('sua_dac')) < 1, 'lon sữa đặc thấp bè')
  assert.ok(/<ellipse cx="32" cy="23.6" rx="20"/.test(K.sua_dac) && !/<ellipse cx="32" cy="23.6"/.test(K.sua_tuoi), 'sữa đặc có nắp lon tròn, sữa tươi không')
  // Bột mì: bao giấy đứng cao kèm bông lúa (≥ 6 hạt lúa); bột năng: túi vải tròn kèm củ khoai mì, không có lúa.
  assert.ok(khoAspect(outline0('bot_mi')) > 1.3, 'bao bột mì đứng cao')
  assert.ok(khoCount(K.bot_mi, /<ellipse[^>]*fill="#ecbd4c"/g) >= 6, 'bột mì có bông lúa')
  assert.ok(!K.bot_nang.includes('#ecbd4c') && K.bot_nang.includes('#8f5a32'), 'bột năng có củ khoai mì, không có lúa')
  assert.ok(!K.bot_mi.includes('#8f5a32'), 'bột mì không có củ khoai mì')
  // Nước cốt dừa: nửa trái dừa vỏ nâu, thấp bè; dừa nạo: đống sợi trên lá chuối, không có vỏ dừa.
  assert.ok(khoAspect(outline0('cot_dua')) < 0.7 && K.cot_dua.includes('#8f5a32'), 'nửa trái dừa vỏ nâu')
  assert.ok(K.dua_nao.includes(kit.PAL.la[0]) && !K.dua_nao.includes('#8f5a32'), 'dừa nạo trên lá, không có vỏ dừa')
  // Hàng hiếm khác dáng hàng thường dễ nhầm.
  assert.ok(K.mat_ong_rung.includes(kit.PAL.do[0]) && khoCount(K.mat_ong_rung, /l3.1 1.8v3.6/g) === 3, 'mật ong: hũ phủ vải, nhãn tổ ong')
  assert.ok(/<rect x="11" y="11.4" width="42"/.test(K.muoi_tom_tay_ninh) && !K.muoi_tom_tay_ninh.includes(kit.PAL.xanh_nhan[0]), 'muối tôm: túi zip, không nắp xanh')
  assert.equal(khoOutlines(K.kho_bo).length, 3, 'khô bò: ba dải thịt')
  for (const d of khoOutlines(K.kho_bo)) assert.match(d, /^M[\d. L]+Z$/, 'dải khô bò cạnh thẳng')
  assert.ok(khoAspect(outline0('kho_muc')) > 1.2 && /stroke-width="5.6"/.test(K.kho_muc), 'khô mực: con mực dựng đứng có râu')
})

test('art-v2 đồ khô: hàng hiếm có sao #ffd23f (cả khô mực xé), hàng thường không', async () => {
  const { INGREDIENTS } = await import('../../src/data/ingredients.js')
  for (const id of KHO_ICONS) {
    if (INGREDIENTS[id].rare) assert.ok(ING_KHO[id].includes('#ffd23f'), `${id}: hàng hiếm có sao`)
    else assert.ok(!ING_KHO[id].includes('#ffd23f'), `${id}: hàng thường không có sao`)
  }
  for (const [k, s] of Object.entries(ING_KHO_STATES)) {
    assert.equal(s.includes('#ffd23f'), !!INGREDIENTS[k.split('.')[0]].rare, `${k}: sao theo hàng hiếm`)
  }
})

// ---------- Đợt 1, gói D1: món và dụng cụ (src/ui/art/mon.js, src/ui/art/tools.js) ----------
const D1_MON = ['mon_banh_mi_op_la', 'mon_tra_tac', 'mon_banh_trang_tron', 'mon_ca_phe_sua_da', 'mon_che_buoi']
// Id dụng cụ của bộ hình cũ (art.js TOOLS): game, nâng cấp, mini-game và màn meta đang dùng; phải giữ đủ.
const D1_LEGACY_TOOLS = ['sua_muoi', 'dao_thep', 'chao_chong_dinh', 'ghe_nhua', 'may_tinh', 'loa_bao_tien', 'muong_vang', 'thot', 'ro', 'sao']
// Biểu tượng thao tác mới (thiết kế mục 1.6): loại bước → icon.
const D1_ACTION = { xoay: 'muong_khuay', got: 'dao_bao', lac: 'binh_lac', bay: 'khay_bay' }
const D1_TOOLS = [...D1_LEGACY_TOOLS, ...Object.values(D1_ACTION)]

test('art-v2 món/dụng cụ: đủ 5 món, 14 dụng cụ; giữ mọi id cũ; có trong ICONS_V2; không hình nào trùng', () => {
  assert.deepEqual(Object.keys(MON).sort(), [...D1_MON].sort())
  assert.deepEqual(Object.keys(TOOLS).sort(), [...D1_TOOLS].sort())
  // So với bộ hình cũ nguyên vẹn (LEGACY_ICONS): ICONS ở mặt tiền art.js đã gộp ICONS_V2 nên không dùng để đối chiếu.
  for (const id of D1_LEGACY_TOOLS) assert.ok(LEGACY_ICONS[id], `${id} là id của bộ hình cũ`)
  for (const id of D1_MON) assert.ok(LEGACY_ICONS[id], `${id} là id món của bộ hình cũ`)
  for (const id of [...D1_MON, ...D1_TOOLS]) assert.equal(ICONS[id], ICONS_V2[id], `${id}: mặt tiền ICONS dùng hình mới`)
  for (const [id, s] of [...Object.entries(MON), ...Object.entries(TOOLS)]) {
    assert.equal(ICONS_V2[id], s, `${id} có trong ICONS_V2`)
    assert.equal(artV2(id), s)
  }
  const all = [...Object.values(MON), ...Object.values(TOOLS)]
  assert.equal(new Set(all).size, all.length, 'không có hai hình món/dụng cụ trùng chuỗi SVG')
  // Vẽ lại theo phong cách mới: không hình nào còn là chuỗi SVG cũ.
  for (const id of [...D1_MON, ...D1_LEGACY_TOOLS]) assert.notEqual(ICONS_V2[id], LEGACY_ICONS[id], `${id}: phải là hình mới`)
})

test('art-v2 món/dụng cụ: đúng quy tắc vẽ (viewBox 64, ≤ 3,5 KB, viền mực 3, bóng đất, điểm sáng, không chữ, không phần tử cấm)', () => {
  for (const [id, s] of [...Object.entries(MON), ...Object.entries(TOOLS)]) {
    assert.ok(s.startsWith('<svg') && s.endsWith('</svg>') && s.includes('viewBox="0 0 64 64"'), `${id}: khung svg 64`)
    assert.ok(Buffer.byteLength(s) <= ICON_MAX, `${id}: ${Buffer.byteLength(s)} B > ${ICON_MAX} B`)
    assert.ok(!/url\(|href|<use\b|<image\b|base64|gradient|<filter\b|filter=|clip-?path|<mask\b|mask=|<pattern\b|<text\b/i.test(s), `${id}: phần tử cấm (kể cả chữ)`)
    assert.ok(!/undefined|NaN|null|Infinity|\[object/.test(s), `${id}: giá trị lỗi`)
    assert.ok(s.includes(`stroke="${kit.INK}" stroke-width="3"`), `${id}: viền mực dày 3`)
    const g = s.match(/<ellipse cx="[\d.]+" cy="([\d.]+)" rx="[\d.]+" ry="[\d.]+" fill="#3a2618" opacity="\.15" stroke="none"\/>/)
    assert.ok(g && +g[1] >= 55 && +g[1] <= 60, `${id}: bóng đất ở y≈58`)
    assert.ok(/fill="#fff" opacity="\.\d"|stroke="#fff"/.test(s), `${id}: điểm sáng trắng`)
    // Nét chi tiết bên trong không dày quá viền ngoài (trừ nét ống có viền: cán muỗng, ống hút, sợi xoài…).
    for (const m of s.matchAll(/stroke-width="([\d.]+)"/g)) assert.ok(+m[1] <= 7, `${id}: nét ${m[1]} quá dày`)
  }
})

test('art-v2 món: món hiếm dùng hình món nền (không vẽ riêng, không sao trên hình); mỗi món có nét nhận diện riêng', async () => {
  const { RECIPES } = await import('../../src/data/recipes.js')
  const used = new Set()
  for (const r of Object.values(RECIPES)) {
    assert.ok(MON[r.icon], `${r.id}: món có hình mới ${r.icon}`)
    assert.equal(artV2(r.icon), MON[r.icon])
    if (r.baseRecipe) assert.equal(artV2(r.icon), MON[RECIPES[r.baseRecipe].icon], `${r.id}: món hiếm dùng hình món nền`)
    used.add(r.icon)
  }
  assert.deepEqual([...used].sort(), [...D1_MON].sort(), 'mỗi hình món đều có món dùng')
  // Huy hiệu ★ "Hiếm" do thành phần hiển thị vẽ; hình món không tự mang sao vàng của hàng hiếm.
  for (const id of D1_MON) assert.ok(!MON[id].includes('#ffd23f'), `${id}: không có sao hàng hiếm`)
  // Nét nhận diện: bánh tráng trộn có trứng cút lòng đỏ, lá rau răm, sợi xoài; cà phê sữa đá có đá, lớp cà phê và lớp sữa;
  // chè bưởi trong chén sứ viền lam, có đậu xanh; trà tắc giữ ống hút đỏ. Bốn món khác hẳn nhau về màu chủ đạo.
  const M = MON
  assert.ok(M.mon_banh_trang_tron.includes('#f6b21a') && M.mon_banh_trang_tron.includes(kit.PAL.la[0]) && M.mon_banh_trang_tron.includes('#cbe27a'))
  assert.ok(M.mon_ca_phe_sua_da.includes(kit.PAL.da_lanh[0]) && M.mon_ca_phe_sua_da.includes('#6e3d20') && M.mon_ca_phe_sua_da.includes('#f6e3b8'))
  assert.ok(M.mon_che_buoi.includes(kit.PAL.xanh_nhan[0]) && M.mon_che_buoi.includes('#f6cf52') && M.mon_che_buoi.includes(kit.PAL.dia[0]))
  assert.ok(M.mon_tra_tac.includes(kit.PAL.do[0]) && M.mon_tra_tac.includes(kit.PAL.tra[0]))
  assert.ok(!M.mon_ca_phe_sua_da.includes(kit.PAL.tra[0]), 'cà phê không lẫn màu trà tắc')
  assert.ok(M.mon_banh_mi_op_la.includes('var(--yolk,#f6b21a)'), 'bánh mì ốp la giữ lòng đỏ --yolk (món trứng gà ta chỉ đặt --yolk)')
})

test('art-v2 dụng cụ: phủ mọi icon nâng cấp, bước, mini-game thuộc bộ dụng cụ; đủ biểu tượng 4 thao tác mới', async () => {
  const { UPGRADES } = await import('../../src/data/upgrades.js')
  const { MINIGAME_TYPES } = await import('../../src/data/minigame-types.js')
  const { RECIPES } = await import('../../src/data/recipes.js')
  for (const u of Object.values(UPGRADES)) assert.ok(TOOLS[u.icon], `nâng cấp ${u.id}: thiếu hình mới ${u.icon}`)
  const legacy = new Set(D1_LEGACY_TOOLS)
  for (const [t, m] of Object.entries(MINIGAME_TYPES)) {
    if (legacy.has(m.icon)) assert.ok(TOOLS[m.icon], `mini-game ${t}: ${m.icon}`)
    for (const sk of Object.values(m.skins || {})) if (legacy.has(sk.icon)) assert.ok(TOOLS[sk.icon], `lớp vỏ ${t}: ${sk.icon}`)
  }
  for (const r of Object.values(RECIPES)) for (const st of r.steps || []) if (legacy.has(st.icon)) assert.ok(TOOLS[st.icon], `${r.id}/${st.id}: ${st.icon}`)
  for (const [type, id] of Object.entries(D1_ACTION)) {
    assert.ok(MINIGAME_TYPES[type], `loại thao tác ${type} có trong dữ liệu`)
    assert.ok(TOOLS[id], `biểu tượng thao tác ${type}: ${id}`)
  }
  // Muỗng Vàng là đơn vị thưởng (hiện ở viên 24px): muỗng vàng, không dùng màu thép.
  assert.ok(!TOOLS.muong_vang.includes(kit.PAL.thep[0]), 'Muỗng Vàng không dùng màu thép')
  // Biểu tượng thao tác khác hình dụng cụ gần nghĩa: dao bào khác dao thép, muỗng khuấy khác Muỗng Vàng, khay bày khác rổ.
  for (const [a, b] of [['dao_bao', 'dao_thep'], ['muong_khuay', 'muong_vang'], ['khay_bay', 'ro'], ['binh_lac', 'sua_muoi']]) {
    assert.notEqual(TOOLS[a], TOOLS[b], `${a} / ${b}`)
  }
})

// ---------- Đợt 1, gói D2: đạo cụ sân khấu lớn (src/ui/art/props.js) ----------
const D2_PROPS = ['thot_lon', 'dao_lon', 'tay', 'chao_lon', 'noi_lon', 'phin_lon', 'ly_lon', 'to_lon', 'chen_lon', 'ro_lon',
  'binh_lac_lon', 'bep_ga', 'dia_lon', 'voi_nuoc']
const D2_NEW = D2_PROPS.slice(3)
// Đạo cụ đặt trên mặt bàn/bếp có bóng đất (vòi nước gắn tường thì không).
const D2_GROUNDED = D2_NEW.filter(id => id !== 'voi_nuoc')
const d2Pair = v => Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number')
const d2Ell = v => v && typeof v === 'object' && !Array.isArray(v) && ['cx', 'cy', 'rx', 'ry'].every(k => typeof v[k] === 'number')
// Gom mọi điểm mốc [x, y] và mọi ellipse {cx, cy, rx, ry} trong PROP_META[id] (trừ vb).
function d2Anchors(o, pts = [], ells = []) {
  for (const [k, v] of Object.entries(o)) {
    if (k === 'vb') continue
    if (d2Pair(v)) pts.push([k, v])
    else if (d2Ell(v)) ells.push([k, v])
    else if (Array.isArray(v)) v.forEach((p, i) => d2Pair(p) ? pts.push([`${k}[${i}]`, p]) : null)
    else if (v && typeof v === 'object') d2Anchors(v, pts, ells)
  }
  return { pts, ells }
}

test('art-v2 đạo cụ: đủ 14 đạo cụ (giữ thớt, dao, tay), cùng bộ khóa với PROP_META, không hình nào trùng', () => {
  assert.deepEqual(Object.keys(PROPS).sort(), [...D2_PROPS].sort())
  assert.deepEqual(Object.keys(PROP_META).sort(), [...D2_PROPS].sort())
  assert.equal(new Set(D2_PROPS.map(id => PROPS[id])).size, D2_PROPS.length, 'mỗi đạo cụ một chuỗi SVG riêng')
  for (const id of D2_PROPS) {
    assert.equal(propV2(id), PROPS[id], `${id}: propV2 trả đúng hình`)
    assert.match(id, /^[a-z0-9_]+$/)
  }
})

test('art-v2 đạo cụ: viewBox khớp PROP_META.vb, không phần tử cấm / giá trị lỗi, thẻ cân bằng, ≤ 6 KB, viền mực 3', () => {
  for (const id of D2_PROPS) {
    const s = PROPS[id], vb = PROP_META[id].vb
    assert.ok(Array.isArray(vb) && vb.length === 2 && vb.every(n => Number.isInteger(n) && n >= 64 && n <= 400), `${id}: vb ${vb}`)
    assert.ok(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + vb[0] + ' ' + vb[1] + '">') && s.endsWith('</g></svg>'), `${id}: khung svg đúng viewBox`)
    assert.equal((s.match(/viewBox=/g) || []).length, 1, `${id}: một viewBox`)
    assert.ok(!/url\(|href|<use\b|<image\b|base64/i.test(s), `${id}: không ảnh ngoài, không <use>`)
    assert.ok(!/gradient|<filter\b|filter=|clip-?path|<mask\b|mask=|<pattern\b|<text\b|<style\b|<script\b|\bon\w+=/i.test(s), `${id}: phần tử cấm`)
    assert.ok(!/undefined|NaN|null|Infinity|\[object/.test(s), `${id}: giá trị lỗi`)
    for (const t of ['svg', 'g']) {
      assert.equal((s.match(new RegExp(`<${t}\\b`, 'g')) || []).length, (s.match(new RegExp(`</${t}>`, 'g')) || []).length, `${id}: thẻ <${t}> cân bằng`)
    }
    // Mọi thẻ hình (path, ellipse, circle, rect) tự đóng; ngoài svg/g không có thẻ mở nào khác.
    for (const m of s.matchAll(/<(\w+)\b[^>]*?(\/?)>/g)) {
      if (m[1] === 'svg' || m[1] === 'g') continue
      assert.ok(['path', 'ellipse', 'circle', 'rect'].includes(m[1]) && m[2] === '/', `${id}: thẻ <${m[1]}> lạ hoặc không tự đóng`)
    }
    assert.ok(Buffer.byteLength(s) <= PROP_MAX, `${id}: ${Buffer.byteLength(s)} B > ${PROP_MAX} B`)
    assert.ok(s.includes(`<g stroke="${kit.INK}" stroke-width="${kit.OUTLINE}" stroke-linejoin="round" stroke-linecap="round">`), `${id}: viền mực INK dày 3, bo tròn`)
  }
  const total = D2_PROPS.reduce((n, id) => n + Buffer.byteLength(PROPS[id]), 0)
  assert.ok(total <= 14 * PROP_MAX, `tổng đạo cụ ${total} B`)
})

test('art-v2 đạo cụ: ba tông (điểm sáng trắng, mảng tối), bóng đất cho đồ đặt trên bàn/bếp', () => {
  for (const id of D2_NEW) {
    const s = PROPS[id]
    assert.ok(/stroke="#fff"|fill="#fff" opacity="\.\d+"/.test(s), `${id}: thiếu điểm sáng trắng`)
    const fills = new Set([...s.matchAll(/fill="(#[0-9a-f]{3,6})"/g)].map(m => m[1]).filter(c => c !== kit.INK))
    assert.ok(fills.size >= 3, `${id}: thiếu mảng màu (nền, tối, sáng…)`)
  }
  for (const id of D2_GROUNDED) {
    const g = PROPS[id].match(/<ellipse cx="([\d.]+)" cy="([\d.]+)" rx="([\d.]+)" ry="([\d.]+)" fill="#3a2618" opacity="\.15" stroke="none"\/>/)
    assert.ok(g, `${id}: thiếu bóng đất`)
    // Bóng đất nằm ở nửa dưới hình (đồ nhìn từ trên: tô, chén thì bóng lệch xuống-phải, cũng qua tâm dưới).
    assert.ok(Number(g[2]) >= PROP_META[id].vb[1] * 0.5, `${id}: bóng đất ở y=${g[2]}`)
  }
})

test('art-v2 đạo cụ: mọi điểm mốc / ellipse trong PROP_META nằm trong hộp vẽ; PROP_META đóng băng sâu', () => {
  for (const id of D2_PROPS) {
    const [w, h] = PROP_META[id].vb
    const { pts, ells } = d2Anchors(PROP_META[id])
    assert.ok(pts.length + ells.length >= 1, `${id}: có ít nhất một điểm mốc`)
    for (const [k, [x, y]] of pts) assert.ok(x >= 0 && x <= w && y >= 0 && y <= h, `${id}.${k}: (${x}, ${y}) ngoài ${w}×${h}`)
    for (const [k, e] of ells) {
      assert.ok(e.rx > 0 && e.ry > 0 && e.cx - e.rx >= 0 && e.cx + e.rx <= w && e.cy - e.ry >= 0 && e.cy + e.ry <= h, `${id}.${k}: ellipse ngoài hộp`)
    }
  }
  assert.ok(isDeepFrozen(PROP_META))
  assert.throws(() => { 'use strict'; PROP_META.ly_lon.mouth.cy = 0 })
  assert.throws(() => { 'use strict'; PROP_META.chao_lon.floor.rx = 1 })
})

test('art-v2 đạo cụ: ly nhựa và ly dưới phin chừa lòng ly trong suốt cho mực nước CSS (mouth/bottom/left/right khớp nhau)', () => {
  for (const [id, cup] of [['ly_lon', PROP_META.ly_lon], ['phin_lon', PROP_META.phin_lon.cup]]) {
    const { mouth, bottom, left, right } = cup
    assert.ok(d2Ell(mouth) && d2Ell(bottom), `${id}: mouth, bottom là ellipse`)
    assert.ok(mouth.cy < bottom.cy, `${id}: miệng ở trên đáy`)
    assert.ok(mouth.rx >= bottom.rx, `${id}: ly loe miệng (hoặc thẳng)`)
    assert.equal(mouth.cx, bottom.cx, `${id}: miệng và đáy cùng trục`)
    // Thành trái/phải: đoạn từ miệng xuống đáy, đối xứng qua trục ly, nằm trong khoảng hai mép.
    for (const side of [left, right]) {
      assert.ok(side.length === 2 && side.every(d2Pair), `${id}: thành ly là 2 điểm`)
      assert.ok(side[0][1] < side[1][1], `${id}: thành ly đi từ trên xuống`)
    }
    assert.ok(left[0][0] < mouth.cx && right[0][0] > mouth.cx && left[1][0] < bottom.cx && right[1][0] > bottom.cx, `${id}: trái < trục < phải`)
    assert.equal(left[0][0] + right[0][0], 2 * mouth.cx, `${id}: đối xứng ở miệng`)
    assert.equal(left[1][0] + right[1][0], 2 * bottom.cx, `${id}: đối xứng ở đáy`)
    assert.ok(Math.abs(left[1][0] - (bottom.cx - bottom.rx)) <= 4 && Math.abs(right[1][1] - bottom.cy) <= 1, `${id}: chân thành ly chạm mép đáy`)
  }
  // Thân ly là lớp trắng mờ (opacity < .5) để nước CSS đặt dưới hình lộ ra; ly nhựa không có mảng tô đặc nào che lòng ly.
  const body = PROPS.ly_lon.match(/<path d="M20 30A80 15 0 0 1 180 30L154 230A54 11 0 0 1 46 230Z" fill="(#[0-9a-f]{6})" stroke="none" opacity="(\.\d+)"\/>/)
  assert.ok(body && Number(body[2]) < 0.5, 'ly nhựa: thân trong suốt')
  const { mouth, bottom } = PROP_META.ly_lon
  for (const m of PROPS.ly_lon.matchAll(/<ellipse cx="([\d.]+)" cy="([\d.]+)" rx="([\d.]+)" ry="([\d.]+)" ([^>]*)\/>/g)) {
    const [cy, rx, attrs] = [Number(m[2]), Number(m[3]), m[5]]
    if (cy > mouth.cy + 2 && cy < bottom.cy - 2 && rx > 20) assert.ok(/fill="none"|opacity="\.[0-4]/.test(attrs), `ly nhựa: ellipse đặc trong lòng ly (${m[0].slice(0, 50)})`)
  }
  // Giọt cà phê rơi từ dưới đĩa phin, ngay trục ly, phía trên đáy ly.
  const P = PROP_META.phin_lon
  assert.equal(P.drip[0], P.cup.mouth.cx)
  assert.ok(P.drip[1] > P.cup.mouth.cy && P.drip[1] < P.cup.bottom.cy, 'phin: điểm nhỏ giọt nằm trong ly')
  assert.ok(P.lid[1] < P.drip[1], 'phin: núm nắp ở trên')
})

test('art-v2 đạo cụ: tô, chén nhìn từ trên (khung vuông, tâm giữa khung, r < lòng < vành) cho cử chỉ khuấy', () => {
  for (const id of ['to_lon', 'chen_lon']) {
    const m = PROP_META[id], [w, h] = m.vb
    assert.equal(w, h, `${id}: khung vuông`)
    assert.deepEqual(m.center, [w / 2, h / 2], `${id}: tâm giữa khung (khớp vùng khuấy CSS canh giữa)`)
    assert.ok(m.bottom < m.r && m.r < m.inner && m.inner < m.rim && m.rim <= w / 2 - 4, `${id}: đáy < r < lòng < vành`)
    // Vùng khuấy CSS của xoay.js (inset 12% → bán kính 0,38 cạnh) nằm gọn trong lòng tô/chén.
    assert.ok(0.38 * w < m.inner, `${id}: mặt khuấy CSS không lấn ra vành`)
    assert.ok(PROPS[id].includes(`<circle cx="${w / 2}" cy="${h / 2}" r="${m.rim}" fill="none"/>`), `${id}: viền vành đúng bán kính`)
  }
  assert.notEqual(PROPS.to_lon, PROPS.chen_lon)
  assert.ok(PROPS.to_lon.includes(kit.PAL.xanh_nhan[0]) && !PROPS.chen_lon.includes(kit.PAL.xanh_nhan[0]), 'tô viền lam, chén men ngọc (khác men)')
  assert.ok(PROP_META.chen_lon.bottom < PROP_META.to_lon.bottom, 'chén lòng sâu hơn (đáy nhỏ hơn)')
})

test('art-v2 đạo cụ: bếp ga có nhóm lửa xanh riêng (data-part="lua") để CSS lắc; điểm đặt nồi/chảo ở trên lửa', () => {
  const s = PROPS.bep_ga
  const g = s.match(/<g data-part="lua">([\s\S]*?)<\/g>/)
  assert.ok(g, 'có nhóm lửa')
  assert.equal((s.match(/data-part=/g) || []).length, 1, 'đúng một nhóm data-part')
  assert.ok(!/<g\b/.test(g[1]), 'nhóm lửa không lồng nhóm khác')
  assert.ok((g[1].match(/<path /g) || []).length >= 10, 'lửa có nhiều lưỡi')
  assert.ok(g[1].includes('fill="#3d86f2"'), 'lửa xanh')
  const m = PROP_META.bep_ga
  assert.ok(m.flame.top < m.flame.base && m.flame.base <= m.burner.cy + m.burner.ry, 'lửa mọc từ đầu đốt lên')
  assert.ok(m.seat[1] <= m.flame.top + 4 && m.seat[1] < m.burner.cy, 'điểm đặt nồi ngay trên ngọn lửa')
  assert.equal(m.seat[0], m.burner.cx)
  assert.equal(m.flame.cx, m.burner.cx)
  // Các đạo cụ khác không có nhóm data-part.
  for (const id of D2_PROPS.filter(i => i !== 'bep_ga')) assert.ok(!PROPS[id].includes('data-part'), `${id}: không có data-part`)
})

test('art-v2 đạo cụ: chảo, nồi, rổ, đĩa: lòng (floor / water / mouth / well) nằm trong vành; base là điểm thấp nhất ở trục', () => {
  const inside = (a, b) => a.cx - a.rx >= b.cx - b.rx && a.cx + a.rx <= b.cx + b.rx && a.cy - a.ry >= b.cy - b.ry && a.cy + a.ry <= b.cy + b.ry
  const C = PROP_META.chao_lon, N = PROP_META.noi_lon, R = PROP_META.ro_lon, D = PROP_META.dia_lon
  assert.ok(inside(C.floor, C.rim), 'chảo: đáy trong vành')
  assert.ok(C.floor.rx >= 80 && C.floor.ry >= 30, 'chảo: lòng rộng đủ hai quả trứng')
  assert.deepEqual(C.center, [C.floor.cx, C.floor.cy])
  assert.ok(inside(N.water, N.rim), 'nồi: mặt nước trong vành')
  assert.ok(R.mouth.rx > 0 && R.mouth.cy > 0 && R.center[1] >= R.mouth.cy, 'rổ: tâm lòng rổ')
  assert.ok(inside(D.well, D.rim), 'đĩa: lòng đĩa trong vành')
  for (const [id, m] of [['chao_lon', C], ['noi_lon', N], ['ro_lon', R], ['dia_lon', D], ['ly_lon', PROP_META.ly_lon],
    ['phin_lon', PROP_META.phin_lon], ['binh_lac_lon', PROP_META.binh_lac_lon]]) {
    assert.ok(d2Pair(m.base) && m.base[1] > m.vb[1] * 0.75, `${id}: base ở đáy hình`)
  }
  // Bình lắc dựng đứng, khung hẹp (khớp khung lắc ~0,62 rộng/cao); rổ nằm ngang (~1,5).
  const ar = id => PROP_META[id].vb[0] / PROP_META[id].vb[1]
  assert.ok(ar('binh_lac_lon') > 0.55 && ar('binh_lac_lon') < 0.7, 'bình lắc: tỉ lệ khung')
  assert.ok(ar('ro_lon') > 1.4 && ar('ro_lon') < 1.6, 'rổ: tỉ lệ khung')
  // Vòi nước: miệng vòi ở dưới tay vặn, có bề rộng dòng nước.
  const V = PROP_META.voi_nuoc
  assert.ok(V.mouth[1] > V.handle[1] && V.mouthW > 0 && V.mouth[0] - V.mouthW / 2 >= 0 && V.mouth[0] + V.mouthW / 2 <= V.vb[0])
})

test('art-v2 đạo cụ: mã nguồn props.js không dùng tên biến chứa từ cấm', () => {
  const src = readFileSync(path.join(ROOT, 'src', 'ui', 'art', 'props.js'), 'utf8').toLowerCase()
  for (const w of ['grab', 'napas', 'ipos', 'momo', 'fabi', 'vnpay', 'zalopay', 'vietqr', 'baemin', 'shopeefood', 'michelin']) {
    assert.ok(!src.includes(w), `props.js chứa "${w}"`)
  }
})

// ---------- Đợt 2, gói Q-F: hình người (src/ui/art/people.js) và cảnh quầy (src/ui/art/scene.js) ----------
const QF_PEOPLE_MAX = 6144       // người bán thân / mặt tròn ≤ 6 KB
const QF_SCENE_MAX = 6144        // hình cảnh lớn ≤ 6 KB
const QF_ICON_MAX = 3584         // biểu tượng 64 ≤ 3,5 KB
const QF_FORBID = /url\(|href|<use\b|<image\b|base64|gradient|<filter\b|filter=|clip-?path|<mask\b|mask=|<pattern\b|<style\b|<script\b|\bon\w+=/i
const QF_BAD = /undefined|NaN|null|Infinity|\[object/

// Kiểm một SVG theo quy chuẩn vẽ: khung, đúng một viewBox, không phần tử cấm / giá trị lỗi, thẻ cân bằng, viền mực, dung
// lượng, tọa độ làm tròn 1 chữ số, không chữ trong hình.
function qfCheckSvg(id, s, vb, max) {
  assert.equal(typeof s, 'string', id)
  assert.ok(s.startsWith('<svg') && s.endsWith('</svg>'), `${id}: khung svg`)
  assert.equal((s.match(/viewBox=/g) || []).length, 1, `${id}: một viewBox`)
  assert.ok(s.includes(`viewBox="${vb}"`), `${id}: viewBox phải là ${vb}`)
  assert.ok(!QF_FORBID.test(s), `${id}: phần tử cấm`)
  assert.ok(!QF_BAD.test(s), `${id}: giá trị lỗi`)
  assert.ok(!/<text\b/.test(s), `${id}: không vẽ chữ trong hình (chữ, số là HTML)`)
  const open = (s.match(/<(svg|g|text)\b/g) || []).length
  const close = (s.match(/<\/(svg|g|text)>/g) || []).length
  assert.equal(open, close, `${id}: thẻ svg/g/text cân bằng`)
  assert.ok(s.includes(`stroke="${kit.INK}" stroke-width="3"`), `${id}: viền mực ${kit.INK} dày 3`)
  assert.ok(Buffer.byteLength(s) <= max, `${id}: ${Buffer.byteLength(s)} B > ${max} B`)
  for (const m of s.matchAll(/\s(?:d|points|cx|cy|x|y|r|rx|ry|width|height|transform)="([^"]*)"/g)) {
    const bad = m[1].replace(/scale\([^)]*\)/g, '').match(/\d*\.\d{2,}/g)
    assert.equal(bad, null, `${id}: số quá 1 chữ số thập phân ${bad} trong "${m[1].slice(0, 60)}"`)
  }
}

test('art-v2 người: đủ 6 kiểu khách × 4 tâm trạng (bán thân 96 × 112 và mặt tròn 64), khớp kiểu khách trong dữ liệu', async () => {
  const P = await import('../../src/ui/art/people.js')
  const { PERSONAS } = await import('../../src/data/customers.js')
  const { MOODS } = await import('../../src/ui/art.js')
  assert.deepEqual([...P.PEOPLE_MOODS], [...MOODS], 'cùng bộ tâm trạng với art.js')
  assert.deepEqual([...P.PERSONA_KEYS].sort(), ['co_chu', 'co_chu_nam', 'cong_nhan', 'hoc_sinh', 'kho_tinh', 'van_phong'])
  for (const p of Object.keys(PERSONAS)) assert.ok(P.PERSONA_KEYS.includes(p), `thiếu kiểu khách ${p}`)
  for (const T of [P.BUSTS, P.HEADS]) {
    assert.deepEqual(Object.keys(T).sort(), [...P.PERSONA_KEYS].sort())
    for (const k of P.PERSONA_KEYS) assert.deepEqual(Object.keys(T[k]).sort(), [...P.PEOPLE_MOODS].sort(), k)
  }
  assert.deepEqual(P.PEOPLE_META.bust.vb, [96, 112])
  assert.deepEqual(P.PEOPLE_META.face.vb, [64, 64])
  for (const k of P.PERSONA_KEYS) {
    for (const m of P.PEOPLE_MOODS) {
      qfCheckSvg(`BUSTS.${k}.${m}`, P.BUSTS[k][m], '0 0 96 112', QF_PEOPLE_MAX)
      qfCheckSvg(`HEADS.${k}.${m}`, P.HEADS[k][m], '0 0 64 64', QF_PEOPLE_MAX)
    }
    // 4 tâm trạng là 4 hình khác nhau; mặt tròn là chính hình bán thân thu về khung 64.
    assert.equal(new Set(P.PEOPLE_MOODS.map(m => P.BUSTS[k][m])).size, 4, `${k}: 4 tâm trạng khác hình`)
    assert.ok(P.HEADS[k].vui.includes(`transform="${P.PEOPLE_META.face.transform}"`), `${k}: mặt tròn cắt từ hình bán thân`)
  }
  // 6 kiểu khách khác hình nhau ở cùng tâm trạng.
  assert.equal(new Set(P.PERSONA_KEYS.map(k => P.BUSTS[k].binh_thuong)).size, 6)
})

test('art-v2 người: biểu cảm rõ (vui cười híp mắt, bực nhăn mày, giận đỏ mặt có khói) và thân áo khác nhau theo kiểu', async () => {
  const P = await import('../../src/ui/art/people.js')
  for (const k of P.PERSONA_KEYS) {
    const B = P.BUSTS[k]
    // vui: mắt híp (cung, không có tròng mắt ellipse) + miệng mở có lưỡi
    assert.ok(/M35 47Q39 42 43 47/.test(B.vui) && !/<ellipse cx="39" cy="45.4" rx="2.8"/.test(B.vui), `${k}: vui mắt híp`)
    assert.ok(B.vui.includes('fill="#9b3a30"') && B.vui.includes('fill="#f08a80"'), `${k}: vui miệng cười mở`)
    // bực: mày nhíu xuống giữa + nét cau giữa hai mày + vệt rối bực bội
    assert.ok(B.buc.includes('M34.6 37.2L43.2 40.6') && B.buc.includes('stroke="#6e5340"'), `${k}: bực nhăn mày`)
    // giận: da đỏ hơn bình thường, nghiến răng, khói nhỏ hai bên đầu
    assert.ok(B.gian.includes('<rect x="40.8" y="54.6"'), `${k}: giận nghiến răng`)
    assert.ok((B.gian.match(/fill="#f3f1ee"/g) || []).length >= 3, `${k}: giận có khói`)
    const skin = s => s.match(/<path d="M24 42A24 23[^"]*" fill="(#[0-9a-f]{6})"/)[1]
    const red = c => parseInt(c.slice(1, 3), 16) - (parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16)) / 2
    assert.ok(red(skin(B.gian)) > red(skin(B.binh_thuong)) + 10, `${k}: giận đỏ mặt`)
  }
  // Thân áo: mỗi kiểu một màu áo nền khác nhau (hoặc chi tiết khác: sơ mi trắng học sinh có khăn quàng, văn phòng có cà vạt).
  assert.ok(P.BUSTS.hoc_sinh.vui.includes('#e2453a'), 'học sinh: khăn quàng đỏ')
  assert.ok(P.BUSTS.cong_nhan.vui.includes('#f28a1e') && P.BUSTS.cong_nhan.vui.includes('#f7c22c'), 'công nhân: áo gile cam, mũ bảo hộ vàng')
  assert.ok(P.BUSTS.van_phong.vui.includes('#2f5fb3'), 'văn phòng: cà vạt')
  assert.ok(P.BUSTS.kho_tinh.vui.includes('#363b48'), 'khó tính: áo vest tối')
  assert.ok(P.BUSTS.co_chu_nam.vui.includes('#5f7f9f'), 'chú: áo thun có cổ')
})

test('art-v2 người: bust()/head() dự phòng an toàn, biến thể nữ, dáng riêng cho khách quen / khách lạ / người bán', async () => {
  const P = await import('../../src/ui/art/people.js')
  const { REGULARS } = await import('../../src/data/customers.js')
  const { STRANGERS, STALLS } = await import('../../src/data/rare.js')
  assert.equal(P.bust('hoc_sinh', 'vui'), P.BUSTS.hoc_sinh.vui)
  assert.equal(P.bust('co_chu', 'gian', { gender: 'nam' }), P.BUSTS.co_chu_nam.gian, 'cô chú nam → chú')
  assert.equal(P.head('kho_tinh', 'buc'), P.HEADS.kho_tinh.buc)
  assert.equal(P.bust('khong_co', 'vui'), P.BUSTS.hoc_sinh.vui, 'kiểu lạ → học sinh')
  assert.equal(P.bust('cong_nhan', 'la_lam'), P.BUSTS.cong_nhan.binh_thuong, 'tâm trạng lạ → bình thường')
  assert.equal(P.bust('constructor', undefined, null), P.BUSTS.hoc_sinh.binh_thuong, 'không lấy thuộc tính kế thừa')
  assert.equal(P.bust(undefined, 'vui', { who: 'toString' }), P.BUSTS.hoc_sinh.vui)
  assert.equal(P.bust('van_phong', 'vui'), P.bust('van_phong', 'vui'), 'ổn định (bộ nhớ đệm)')
  // Ghi đè trực tiếp không lẫn bộ nhớ đệm: da, mũ ('none' bỏ mũ).
  assert.notEqual(P.bust('hoc_sinh', 'vui', { skin: 'dam' }), P.BUSTS.hoc_sinh.vui)
  assert.ok(!P.bust('cong_nhan', 'vui', { hat: 'none' }).includes('#f7c22c') && P.BUSTS.cong_nhan.vui.includes('#f7c22c'))
  // Biến thể nữ khác hình kiểu mặc định (tóc), vẫn đúng quy chuẩn.
  for (const k of ['hoc_sinh', 'cong_nhan', 'van_phong', 'kho_tinh']) {
    for (const m of P.PEOPLE_MOODS) {
      const s = P.bust(k, m, { gender: 'nu' })
      assert.notEqual(s, P.BUSTS[k][m], `${k} nữ khác hình`)
      qfCheckSvg(`${k}.nu.${m}`, s, '0 0 96 112', QF_PEOPLE_MAX)
      qfCheckSvg(`${k}.nu.${m}.head`, P.head(k, m, { gender: 'nu' }), '0 0 64 64', QF_PEOPLE_MAX)
    }
  }
  // Mọi khách quen, khách lạ, người bán trong dữ liệu đều có dáng riêng, khớp kiểu khách và giới tính.
  const people = [...Object.values(REGULARS), ...STRANGERS, ...STALLS.map(s => ({ ...s, id: s.id }))]
  for (const c of people) {
    const w = P.WHO_LOOKS[c.id]
    assert.ok(w, `thiếu dáng riêng cho ${c.id}`)
    assert.equal(w.persona, c.persona, `${c.id}: kiểu khách`)
    assert.equal(w.gender, c.gender, `${c.id}: giới tính`)
    for (const m of P.PEOPLE_MOODS) {
      const s = P.bust(c.persona, m, { who: c.id, gender: c.gender })
      assert.notEqual(s, P.bust(c.persona, m, { gender: c.gender }), `${c.id}: khác khách thường`)
      qfCheckSvg(`${c.id}.${m}`, s, '0 0 96 112', QF_PEOPLE_MAX)
      qfCheckSvg(`${c.id}.${m}.head`, P.head(c.persona, m, { who: c.id, gender: c.gender }), '0 0 64 64', QF_PEOPLE_MAX)
    }
  }
  assert.equal(new Set(Object.keys(P.WHO_LOOKS).map(id => P.bust(P.WHO_LOOKS[id].persona, 'vui', { who: id }))).size, Object.keys(P.WHO_LOOKS).length, 'mỗi người một dáng')
  // Cô Thu như Phòng mẫu: kính, áo tím, chuỗi ngọc.
  const thu = P.bust('co_chu', 'vui', { who: 'co_thu', gender: 'nu' })
  assert.ok(thu.includes('#8a5fb0') && /<circle cx="39" cy="45.4" r="6.2" fill="none"/.test(thu) && thu.includes('fill="#fffaf0" stroke-width="1.1"'), 'Cô Thu: áo tím, kính, chuỗi ngọc')
  // Phụ kiện lạ bị bỏ qua, không lỗi.
  assert.equal(P.bust('hoc_sinh', 'vui', { acc: ['khong_co'] }), P.bust('hoc_sinh', 'vui', { acc: [] }))
  assert.equal(P.lookOf('co_chu', { gender: 'nam' }).key, 'co_chu_nam')
  assert.equal(P.personaKey('co_chu', 'nam'), 'co_chu_nam')
  assert.equal(P.personaKey('la', null), 'hoc_sinh')
})

test('art-v2 người: Dì Sáu đủ 4 mặt (khóa như DI_SAU cũ) + 4 tư thế bán thân; Anh Khoa, Cô Hạnh bán thân', async () => {
  const P = await import('../../src/ui/art/people.js')
  const { DI_SAU, ANH_KHOA, CO_HANH } = await import('../../src/ui/art.js')
  assert.deepEqual(Object.keys(P.DI_SAU_FACES).sort(), Object.keys(DI_SAU).sort())
  assert.deepEqual(Object.keys(P.DI_SAU_POSES).sort(), ['che_mat', 'lau_mo_hoi', 'ngon_cai', 'vo_tay'])
  assert.deepEqual({ ...P.DI_SAU_POSE_MOOD }, { ngon_cai: 'tu_hao', vo_tay: 'vui', lau_mo_hoi: 'lo', che_mat: 'tiec' })
  for (const [k, s] of Object.entries(P.DI_SAU_FACES)) {
    qfCheckSvg(`DI_SAU_FACES.${k}`, s, '0 0 64 64', QF_PEOPLE_MAX)
    assert.ok(s.includes('stroke="#2b2b2b"'), `${k}: khăn rằn trắng đen`)
  }
  assert.equal(new Set(Object.values(P.DI_SAU_FACES)).size, 4, 'Dì Sáu: 4 mặt khác nhau')
  for (const [k, s] of Object.entries(P.DI_SAU_POSES)) {
    qfCheckSvg(`DI_SAU_POSES.${k}`, s, '0 0 96 112', QF_PEOPLE_MAX)
    assert.ok(/<g transform="translate\([\d. -]+\)(?: rotate\(-?[\d.]+\))?(?: scale\(-1 1\))?">/.test(s), `${k}: có bàn tay`)
  }
  assert.equal(new Set(Object.values(P.DI_SAU_POSES)).size, 4, 'Dì Sáu: 4 tư thế khác nhau')
  for (const k of Object.keys(ANH_KHOA)) {
    qfCheckSvg(`ANH_KHOA_FACES.${k}`, P.ANH_KHOA_FACES[k], '0 0 64 64', QF_PEOPLE_MAX)
    qfCheckSvg(`ANH_KHOA_BUSTS.${k}`, P.ANH_KHOA_BUSTS[k], '0 0 96 112', QF_PEOPLE_MAX)
  }
  for (const k of Object.keys(CO_HANH)) {
    qfCheckSvg(`CO_HANH_FACES.${k}`, P.CO_HANH_FACES[k], '0 0 64 64', QF_PEOPLE_MAX)
    qfCheckSvg(`CO_HANH_BUSTS.${k}`, P.CO_HANH_BUSTS[k], '0 0 96 112', QF_PEOPLE_MAX)
  }
  assert.notEqual(P.ANH_KHOA_BUSTS.vui, P.ANH_KHOA_BUSTS.huong_dan)
})

test('art-v2 cảnh: đủ hình cảnh quầy và biểu tượng (4 khâu, 2 tab, HUD, xu tip); viewBox khớp SCENE_META, đúng quy chuẩn', async () => {
  const S = await import('../../src/ui/art/scene.js')
  const { BALANCE } = await import('../../src/data/balance.js')
  const need = ['xe_mat_truoc', 'mai_bat', 'dien_thoai', 'may_pos', 'man_led', 'ket_tien', 'may_in_phieu', 'kep_phieu', 'hu_tip']
  assert.deepEqual(Object.keys(S.SCENE).sort(), need.sort())
  assert.deepEqual(Object.keys(S.SCENE_META).sort(), need.sort(), 'SCENE và SCENE_META cùng bộ khóa')
  for (const [id, s] of Object.entries(S.SCENE)) {
    const [w, h] = S.SCENE_META[id].vb
    qfCheckSvg(id, s, `0 0 ${w} ${h}`, QF_SCENE_MAX)
  }
  const icons = ['dong_xu', 'hud_vi', 'hud_sao', 'hud_gio', 'khau_order', 'khau_thanh_toan', 'khau_tinh_tien', 'khau_lam_do', 'tab_quay', 'tab_bep']
  assert.deepEqual(Object.keys(S.SCENE_ICONS).sort(), icons.sort())
  for (const [id, s] of Object.entries(S.SCENE_ICONS)) {
    qfCheckSvg(id, s, '0 0 64 64', QF_ICON_MAX)
    const g = s.match(/<ellipse cx="[\d.]+" cy="([\d.]+)" rx="[\d.]+" ry="[\d.]+" fill="#3a2618" opacity="\.15" stroke="none"\/>/)
    assert.ok(g && Number(g[1]) >= 55 && Number(g[1]) <= 60, `${id}: bóng đất y≈58`)
    assert.ok(/fill="#fff" opacity="\.\d"|stroke="#fff"/.test(s), `${id}: điểm sáng trắng`)
  }
  assert.equal(new Set(Object.values(S.SCENE_ICONS)).size, icons.length, 'không biểu tượng nào trùng')
  assert.deepEqual(Object.keys(S.STAGE_ICONS), [...BALANCE.stageFlow], 'biểu tượng theo đúng 4 khâu')
  for (const id of [...Object.values(S.STAGE_ICONS), ...Object.values(S.TAB_ICONS), ...Object.values(S.HUD_ICONS)]) assert.ok(S.SCENE_ICONS[id], id)
  assert.notEqual(S.SCENE_ICONS.tab_bep, S.SCENE_ICONS.khau_lam_do, 'tab Bếp khác biểu tượng khâu Làm đồ')
  assert.equal(S.scene('may_pos'), S.SCENE.may_pos)
  assert.equal(S.scene('hud_sao'), S.SCENE_ICONS.hud_sao)
  assert.equal(S.scene('khong_co'), '')
  assert.equal(S.scene('constructor'), '')
})

test('art-v2 cảnh: điểm mốc / ô chèn HTML nằm trong hộp vẽ; két 7 ngăn không chồng nhau; QR vừa màn hình điện thoại', async () => {
  const S = await import('../../src/ui/art/scene.js')
  const M = S.SCENE_META
  const inBox = (id, r) => {
    const [w, h] = M[id].vb
    assert.ok(r.x >= 0 && r.y >= 0 && r.x + (r.w || 0) <= w && r.y + (r.h || 0) <= h, `${id}: ô ${JSON.stringify(r)} ngoài hộp ${w}×${h}`)
  }
  inBox('xe_mat_truoc', M.xe_mat_truoc.sign); inBox('xe_mat_truoc', M.xe_mat_truoc.glass)
  assert.ok(M.xe_mat_truoc.top > 0 && M.xe_mat_truoc.top < M.xe_mat_truoc.vb[1] / 2, 'mặt quầy ở nửa trên hình')
  assert.ok(M.xe_mat_truoc.open[0] >= M.xe_mat_truoc.glass.x + M.xe_mat_truoc.glass.w && M.xe_mat_truoc.open[1] <= M.xe_mat_truoc.vb[0], 'khoảng trống quầy không đè tủ kính')
  inBox('dien_thoai', M.dien_thoai.screen); inBox('dien_thoai', M.dien_thoai.qr); inBox('dien_thoai', M.dien_thoai.note)
  const sc = M.dien_thoai.screen, q = M.dien_thoai.qr
  assert.ok(q.x >= sc.x && q.y >= sc.y && q.x + q.w <= sc.x + sc.w && q.y + q.h <= sc.y + sc.h, 'QR nằm trong màn hình')
  assert.ok(Math.abs(q.w / q.h - 100 / 118) < 0.01, 'QR giữ tỉ lệ 100 × 118')
  inBox('may_pos', M.may_pos.led); inBox('may_pos', M.may_pos.pad); inBox('man_led', M.man_led.led)
  assert.equal(M.ket_tien.slots.length, 7, 'két 7 ngăn')
  for (const s of M.ket_tien.slots) inBox('ket_tien', s)
  M.ket_tien.slots.forEach((a, i) => M.ket_tien.slots.forEach((b, j) => {
    if (i < j) assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `ngăn ${i} chồng ngăn ${j}`)
  }))
  inBox('may_in_phieu', { ...M.may_in_phieu.slot, h: 0 })
  for (const p of [M.kep_phieu.jaw, M.kep_phieu.hang]) inBox('kep_phieu', { x: p[0], y: p[1] })
  const t = M.hu_tip.mouth
  inBox('hu_tip', { x: t.cx - t.rx, y: t.cy - t.ry, w: 2 * t.rx, h: 2 * t.ry })
  assert.equal(M.mai_bat.vb[0] % M.mai_bat.stripe, 0, 'mái bạt: số sọc chẵn khít bề ngang (lặp được)')
  assert.ok(isDeepFrozen(M) && Object.isFrozen(M.ket_tien.slots[0]))
})

test('art-v2 cảnh: phoneQr đặt QR giả vào màn hình (không lồng <svg>, không kế thừa viền), từ chối chuỗi lạ', async () => {
  const S = await import('../../src/ui/art/scene.js')
  const { fakeQrSvg } = await import('../../src/ui/art.js')
  const s = S.phoneQr(fakeQrSvg(1))
  assert.ok(s.startsWith('<svg') && s.endsWith('</svg>'))
  assert.equal((s.match(/<svg\b/g) || []).length, 1, 'không lồng svg')
  assert.equal((s.match(/viewBox=/g) || []).length, 1)
  assert.ok(s.includes('QR GAME'), 'giữ chữ QR GAME')
  assert.ok(!QF_FORBID.test(s) && !QF_BAD.test(s))
  const phone = S.SCENE.dien_thoai.slice(0, -'</svg>'.length)
  assert.ok(s.startsWith(phone) && s.slice(phone.length).startsWith(`<g transform="translate(${S.SCENE_META.dien_thoai.qr.x} ${S.SCENE_META.dien_thoai.qr.y}) scale(.64)">`),
    'QR là nhóm riêng sau nhóm viền mực (không kế thừa nét viền)')
  assert.equal((s.match(/<(svg|g|text)\b/g) || []).length, (s.match(/<\/(svg|g|text)>/g) || []).length)
  for (const bad of [undefined, null, '', 'abc', '<svg viewBox="0 0 10 10"><image href="x"/></svg>', '<svg viewBox="0 0 10 10"><a href="x"/></svg>',
    '<svg viewBox="0 0 10 10"><svg viewBox="0 0 1 1"></svg></svg>', '<svg><rect/></svg>', 42]) {
    assert.equal(S.phoneQr(bad), S.SCENE.dien_thoai, `từ chối ${String(bad).slice(0, 30)}`)
  }
})

test('art-v2 người, cảnh: đóng băng sâu; mã nguồn không chứa từ cấm; tổng src/ui/art/* ≤ 320 KB', async () => {
  const P = await import('../../src/ui/art/people.js')
  const S = await import('../../src/ui/art/scene.js')
  for (const o of [P.BUSTS, P.HEADS, P.PEOPLE_META, P.WHO_LOOKS, P.DI_SAU_FACES, P.DI_SAU_POSES, P.DI_SAU_POSE_MOOD, P.ANH_KHOA_FACES,
    P.ANH_KHOA_BUSTS, P.CO_HANH_FACES, P.CO_HANH_BUSTS, P.CLOTH, P.PEOPLE_MOODS, P.PERSONA_KEYS, P.EXTRA_MOODS,
    S.SCENE, S.SCENE_ICONS, S.SCENE_META, S.STAGE_ICONS, S.TAB_ICONS, S.HUD_ICONS]) assert.ok(isDeepFrozen(o))
  assert.throws(() => { 'use strict'; P.BUSTS.hoc_sinh.vui = '' })
  assert.throws(() => { 'use strict'; S.SCENE_META.ket_tien.slots[0].x = 0 })
  assert.equal(P.mix('#000000', '#ffffff', 0.5), '#808080')
  for (const f of ['people.js', 'scene.js']) {
    const src = readFileSync(path.join(ROOT, 'src', 'ui', 'art', f), 'utf8').toLowerCase()
    for (const w of ['grab', 'napas', 'ipos', 'momo', 'fabi', 'vnpay', 'zalopay', 'vietqr', 'baemin', 'shopeefood', 'michelin', 'cooking mama']) {
      assert.ok(!src.includes(w), `${f} chứa "${w}"`)
    }
  }
  const dir = path.join(ROOT, 'src', 'ui', 'art')
  const total = readdirSync(dir).filter(n => n.endsWith('.js')).reduce((n, f) => n + readFileSync(path.join(dir, f)).length, 0)
  assert.ok(total <= 320 * 1024, `tổng src/ui/art/* = ${total} B > 320 KB`)
})
