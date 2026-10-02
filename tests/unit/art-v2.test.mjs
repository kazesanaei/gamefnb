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
import { ICONS, icon } from '../../src/ui/art.js'
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
  assert.equal(artV2('trung_vit'), icon('trung_vit'), 'chưa có hình mới → icon cũ')
  assert.equal(artV2('trung_vit', 'nut'), ICONS.trung_vit)
  assert.equal(artV2('mon_che_buoi'), ICONS.mon_che_buoi)
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
