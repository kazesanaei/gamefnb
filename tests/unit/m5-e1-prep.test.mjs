// Vòng sửa E1 (M5 Đợt 1): Gọt vỏ và kệ Chọn.
// - Gọt: nhát hợp lệ vuốt lại chỗ đã gọt (kể cả dải đã sạch) không phải nhát hụt; nhát ngoài thân quả mới là hụt;
//   lớp "đã gọt" bỏ các dải vỏ cuộn vẽ sẵn (phóng to trên sân khấu thành "con sâu xanh" đè lên quả và bong bóng).
// - Kệ Chọn: hình tối thiểu 36px; nhãn tên nằm dưới chân món, xuống dòng chứ không cắt "…"; lời nhắc rổ trống không cắt
//   dấu (line-height ≥ 18px, không kẹp dòng); viên "còn n" không chồng dấu ✓; thiếu chỗ thì bỏ đầu sân khấu (.is-tight).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gotStroke, dropCurls, dropGround, trimArt, GOT_POSE, GOT_STROKE_MIN, GOT_DONE_AT } from '../../src/ui/minigames/got.js'
import { shelfIconSize, SHELF_ICON_MIN, SHELF_ICON_MAX, BASKET_HINT, BASKET_HINT_SHORT } from '../../src/ui/minigames/chon.js'
import { artV2 } from '../../src/ui/art/v2.js'

test('gotStroke: nhát đầu trên dải là nhát gọt; vuốt lại dải đã sạch là "lai" (không hụt); nhát ngoài thân quả là hụt', () => {
  const lo = 0.1, hi = 0.9
  const segs = []
  const s1 = gotStroke(segs, 0.05, 0.95, lo, hi)
  assert.equal(s1.kind, 'got')
  assert.equal(s1.cov, 1)
  assert.deepEqual(segs, [], 'không đổi segs của dải')
  segs.push([0.05, 0.95])
  // vuốt lại y hệt lên dải đã sạch (bằng chứng: điểm 100 → 92 vì −8)
  const again = gotStroke(segs, 0.05, 0.95, lo, hi)
  assert.equal(again.kind, 'lai')
  assert.equal(again.cov, 1)
  assert.ok(again.cov >= GOT_DONE_AT)
  // nhát trùng phần lớn chỗ đã gọt, gọt thêm < 4%: vẫn chỉ là vuốt lại
  const half = [[0.1, 0.5]]
  assert.equal(gotStroke(half, 0.12, 0.51, lo, hi).kind, 'lai')
  // gọt thêm đủ nhiều: nhát gọt
  const more = gotStroke(half, 0.3, 0.9, lo, hi)
  assert.equal(more.kind, 'got')
  assert.equal(more.cov, 1)
  // nhát nằm ngoài đoạn cần gọt (trên đầu quả / dưới đáy quả): hụt, độ phủ không đổi
  const out1 = gotStroke(half, 0, 0.1, lo, hi)
  assert.equal(out1.kind, 'ngoai')
  assert.equal(out1.cov, 0.5)
  assert.equal(gotStroke([], 0.91, 1, lo, hi).kind, 'ngoai')
  // chạm mép thân quả quá ít (< GOT_STROKE_MIN của đoạn): hụt
  assert.equal(gotStroke([], 0, lo + (hi - lo) * GOT_STROKE_MIN * 0.5, lo, hi).kind, 'ngoai')
  // đầu vào lỗi: segs không phải mảng → coi như dải trống
  assert.equal(gotStroke(null, 0.2, 0.8, lo, hi).kind, 'got')
})

test('dropCurls: bỏ dải vỏ cuộn vẽ quanh hình đã gọt (xoài, bưởi), giữ thân quả; không phải chuỗi thì giữ nguyên', () => {
  const triple = /<path d="([^"]+)" fill="none"[^>]*\/><path d="\1" fill="none"[^>]*\/><path d="\1" fill="none"[^>]*\/>/
  for (const id of Object.keys(GOT_POSE)) {
    const raw = artV2(id, GOT_POSE[id].peeled)
    assert.ok(typeof raw === 'string' && raw !== artV2(id), `${id}: có hình đã gọt riêng`)
    assert.match(raw, triple, `${id}: hình gốc có dải vỏ cuộn (bộ ba nét cùng đường)`)
    const out = dropGround(dropCurls(trimArt(raw, GOT_POSE[id].trimPeeled)))
    assert.doesNotMatch(out, triple, `${id}: không còn dải vỏ cuộn`)
    assert.ok(out.startsWith('<svg') && out.endsWith('</svg>'), `${id}: vẫn là SVG trọn`)
    assert.ok(out.length > raw.length * 0.4, `${id}: thân quả còn nguyên`)
    assert.equal(dropCurls(out), out, `${id}: chạy lại không đổi`)
  }
  assert.equal(dropCurls(null), null)
  assert.equal(dropCurls('<svg></svg>'), '<svg></svg>')
})

test('kệ Chọn: cỡ hình kẹp trong [36, max theo cột] — khung thấp không còn hình 30px', () => {
  assert.ok(SHELF_ICON_MIN >= 32 && SHELF_ICON_MIN <= 36, 'sàn 32–36px (thiết kế M5 mục 3.6)')
  assert.equal(shelfIconSize(Infinity, 3, 200, 4), SHELF_ICON_MAX[4])
  assert.equal(shelfIconSize(Infinity, 3, 200, 3), SHELF_ICON_MAX[3])
  assert.equal(shelfIconSize(Infinity, 3, 60, 4), 50, 'theo bề ngang cột (colW − 10)')
  for (const h of [0, 40, 90, 120, -50, NaN]) assert.ok(shelfIconSize(h, 3, 82, 4) >= SHELF_ICON_MIN, `chỗ ${h}px: không dưới sàn`)
  assert.equal(shelfIconSize(20, 3, 30, 4), SHELF_ICON_MIN)
})

test('lời nhắc rổ trống: bản ngắn vừa 2 dòng ở rổ hẹp, cùng nghĩa với bản đủ', () => {
  assert.ok(BASKET_HINT_SHORT.length < BASKET_HINT.length)
  assert.ok(BASKET_HINT_SHORT.length <= 40, 'câu ngắn vừa 2 dòng ở rổ ~180px, chữ 13px')
  for (const w of ['bỏ vào rổ', 'lấy ra']) {
    assert.ok(BASKET_HINT.includes(w))
    assert.ok(BASKET_HINT_SHORT.includes(w))
  }
})

test('css/mg-prep.css: nhãn tên không cắt "…", lời nhắc rổ không cắt dấu, viên "còn n" không chồng ✓, .is-tight bỏ đầu sân khấu', () => {
  const css = readFileSync(new URL('../../css/mg-prep.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const block = sel => { const i = css.indexOf('\n' + sel + ' {'); assert.ok(i >= 0, 'thiếu ' + sel); return css.slice(i, css.indexOf('}', i)) }
  const px = (b, prop) => { const m = b.match(new RegExp('(?:^|[;{\\s])' + prop + ':\\s*([\\d.]+)px')); return m ? Number(m[1]) : null }
  // nhãn tên: dưới chân món (trong dòng chảy, không tuyệt đối đè lên hình), xuống dòng, chữ ≥ 13px
  const label = block('.chon-label')
  assert.doesNotMatch(label, /text-overflow:\s*ellipsis/)
  assert.doesNotMatch(label, /white-space:\s*nowrap/)
  assert.doesNotMatch(label, /position:\s*absolute/)
  assert.ok(px(label, 'font-size') >= 13)
  const lift = label.match(/margin-top:\s*-([\d.]+)px/)
  assert.ok(!lift || Number(lift[1]) <= 4, 'nhãn chồng lên hình không quá 4px')
  assert.doesNotMatch(css, /\.chon-label \{[^}]*-webkit-line-clamp/)
  // lời nhắc rổ trống: dòng đủ cao cho dấu chồng tầng (để, lấy, rổ), không kẹp dòng / cắt tràn
  const hint = block('.chon-basket-empty')
  assert.ok(px(hint, 'font-size') >= 13)
  assert.ok(px(hint, 'line-height') >= 18, 'line-height ≥ 18px')
  assert.doesNotMatch(hint, /line-clamp|overflow:\s*hidden/)
  assert.doesNotMatch(css, /\.chon-basket-empty \{[^}]*-webkit-line-clamp/)
  // viên "còn n": góc dưới-trái của hình (dấu ✓ ở góc trên-phải), đáy viên không lấn nhãn tên
  const left = block('.chon-left')
  assert.doesNotMatch(left, /(?:^|[;{\s])right:/, 'không còn ở góc trên-phải (chỗ dấu ✓)')
  assert.match(left, /left:\s*\d/)
  const top = left.match(/top:\s*calc\(var\(--pad-top\) \+ var\(--ico\) - ([\d.]+)px\)/)
  assert.ok(top, 'neo theo chân hình')
  const pillH = px(left, 'line-height') + 2 * Number((left.match(/border:\s*([\d.]+)px/) || [0, 0])[1])
  assert.ok(Number(top[1]) - pillH >= 3, 'đáy viên ở trên mép nhãn (nhãn lấn lên hình 3px)')
  const check = block('.chon-check')
  assert.match(check, /right:\s*-?\d/)
  assert.match(check, /top:\s*-?\d/)
  // khung bếp cao nhưng thiếu chỗ ở cỡ hình sàn: chon.js gắn .is-tight → bỏ đầu sân khấu
  assert.match(css, /\.k-main \.mg-stage\.g-frame2\.mg-chon\.is-tight > \.mg-head\.g-head2 \{ display: none; \}/)
})
