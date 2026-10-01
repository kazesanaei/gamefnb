// Bước Chà vừa khung ở màn thấp (cha.js): thớt co giãn theo chỗ còn lại của sân khấu, vết theo tọa độ chuẩn hóa 0..1,
// vùng chạm và quãng vuốt theo tỉ lệ → cách chơi và điểm không đổi; vùng chạm mỗi vết ≥ 44px.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  layoutSpots, fitSpotsBox, spotLayout, rubSpots, fitStrokesHeight,
  SPOT_RADIUS, SPOT_HIT, SPOT_NEED_PX, PAD_W, PAD_H, MIN_TAP_PX, MIN_SCALE, STROKE_MIN_H, PAD_MIN_HR
} from '../../src/ui/minigames/cha.js'
import { uiRand } from '../../src/ui/minigames/_util.js'
import { scoreCha } from '../../src/core/minigame-scoring.js'

// chỗ trống (px) đo được ở các khung thật: 360×600 (3 khách chờ, phiếu 3 món + 2 ghi chú / 1 ghi chú), 360×600, 360×640,
// 375×667, 360×740, 390×844, máy tính; cộng vài ca giả định (thấp hơn sàn, hết chỗ)
const ROOMS = [[328, 57], [328, 59], [328, 63], [328, 78], [328, 80], [328, 98], [328, 141], [328, 157], [328, 197], [343, 224],
  [328, 255], [358, 278], [360, 500], [360, 30], [328, 0], [328, -40]]

test('sàn tỉ lệ: vùng chạm mỗi vết ≥ 44px ở mọi cỡ thớt', () => {
  assert.ok(2 * SPOT_HIT * MIN_SCALE >= MIN_TAP_PX - 1e-9)
  assert.equal(SPOT_HIT, SPOT_RADIUS + 10)
  for (const [w, h] of ROOMS) {
    const f = fitSpotsBox(w, h)
    assert.ok(f.k >= MIN_SCALE && f.k <= 1, `${w}×${h}: k = ${f.k}`)
    assert.ok(2 * SPOT_HIT * f.k >= MIN_TAP_PX - 1e-9, `${w}×${h}: vùng chạm ${2 * SPOT_HIT * f.k}px`)
  }
})

test('đủ chỗ: thớt chuẩn 360 × 280 thu theo bề ngang (như cũ); thiếu chỗ: thớt lấp vừa chỗ còn lại, không tràn', () => {
  assert.deepEqual(fitSpotsBox(360, 500), { k: 1, wr: PAD_W, hr: PAD_H })
  assert.deepEqual(fitSpotsBox(400, 900), { k: 1, wr: PAD_W, hr: PAD_H })
  const n = fitSpotsBox(328, 400)
  assert.equal(n.wr, PAD_W)
  assert.equal(n.hr, PAD_H)
  assert.ok(Math.abs(n.k - 328 / 360) < 1e-9)
  // chưa đo được (sân khấu ẩn) → thớt chuẩn
  assert.deepEqual(fitSpotsBox(null, null), { k: 1, wr: PAD_W, hr: PAD_H })
  assert.deepEqual(fitSpotsBox(undefined, undefined), { k: 1, wr: PAD_W, hr: PAD_H })
  assert.equal(fitSpotsBox(328, null).hr, PAD_H)
  // đã đo nhưng hết chỗ (sân khấu thấp hơn đầu + chân, vd xoay ngang): thớt cỡ sàn — không phải thớt to nhất
  for (const h of [0, -20, -360]) {
    const f = fitSpotsBox(328, h)
    assert.equal(f.k, MIN_SCALE, `chỗ còn ${h}px: k sàn`)
    assert.equal(f.hr, PAD_MIN_HR, `chỗ còn ${h}px: khung thấp nhất`)
    assert.ok(Math.abs(f.hr * f.k - MIN_TAP_PX) < 1e-9, 'thớt sàn cao đúng 44px')
  }
  for (const [w, h] of ROOMS) {
    const f = fitSpotsBox(w, h)
    const pw = f.wr * f.k
    const ph = f.hr * f.k
    assert.ok(pw <= Math.min(w, PAD_W) + 1e-6, `${w}×${h}: rộng ${pw}`)
    // chỉ tràn khi chỗ còn lại thấp hơn một hàng vết (sàn) — khi đó sân khấu cuộn như cũ
    if (h >= PAD_MIN_HR * MIN_SCALE) assert.ok(ph <= h + 1e-6, `${w}×${h}: cao ${ph}`)
    else assert.ok(Math.abs(ph - PAD_MIN_HR * MIN_SCALE) < 1e-6, `${w}×${h}: dưới sàn → thớt cỡ sàn (${ph})`)
    // đo lại cùng chỗ trống (ResizeObserver) ra đúng thớt đó
    assert.deepEqual(fitSpotsBox(w, h), f)
  }
})

test('đổi kích thước giữa chừng: thớt lấp lại vừa chỗ mới, vết giữ tọa độ chuẩn hóa nên chà tại chỗ mới vẫn trúng', () => {
  for (const [a, b] of [[[328, 207], [328, 98]], [[328, 98], [328, 255]], [[358, 278], [328, 141]]]) {
    const f0 = fitSpotsBox(...a)
    const spots = spotLayout(5, f0.wr, f0.hr, uiRand(11)).map(p => ({ ...p, clean: 0 }))
    const f1 = fitSpotsBox(...b)
    const w = f1.wr * f1.k
    const h = f1.hr * f1.k
    assert.ok(h <= b[1] + 1e-6, 'thớt mới vừa chỗ còn lại')
    spots.forEach((sp, i) => {
      assert.ok(rubSpots(spots, sp.nx * w, sp.ny * h, 5, { w, h, k: f1.k }, SPOT_NEED_PX).includes(i), `vết ${i} trúng ở chỗ mới`)
    })
    assert.ok(2 * SPOT_HIT * f1.k >= MIN_TAP_PX - 1e-9)
  }
})

test('vết rải trong khung, vùng chạm không lòi ra ngoài thớt, cách nhau đủ xa (kể cả thớt dẹt)', () => {
  for (const [w, h] of ROOMS) {
    const f = fitSpotsBox(w, h)
    for (const n of [3, 4, 5]) {
      for (let seed = 1; seed <= 40; seed++) {
        const pts = spotLayout(n, f.wr, f.hr, uiRand(seed * 7919 + n))
        assert.equal(pts.length, n)
        for (const p of pts) {
          assert.ok(p.nx >= 0 && p.nx <= 1 && p.ny >= 0 && p.ny <= 1)
          const x = p.nx * f.wr
          const y = p.ny * f.hr
          assert.ok(x >= SPOT_HIT && x <= f.wr - SPOT_HIT, `${w}×${h} n=${n}: x ${x}`)
          assert.ok(y >= SPOT_HIT && y <= f.hr - SPOT_HIT, `${w}×${h} n=${n}: y ${y}`)
        }
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const d = Math.hypot((pts[i].nx - pts[j].nx) * f.wr, (pts[i].ny - pts[j].ny) * f.hr)
            assert.ok(d >= 64 * 0.6 - 1e-9, `${w}×${h} n=${n} seed ${seed}: hai vết cách ${d}`)
          }
        }
      }
    }
  }
})

test('thớt chuẩn: bố trí vết giống bố trí gốc (elip 98 × 78,4, cách 64); layoutSpots mặc định không đổi', () => {
  const a = spotLayout(5, PAD_W, PAD_H, uiRand(42))
  const b = layoutSpots(5, PAD_W / 2, PAD_H / 2, 98, 64, uiRand(42))
  assert.deepEqual(a.map(p => [p.nx * PAD_W, p.ny * PAD_H].map(v => Math.round(v * 1e6))), b.map(p => [p.x, p.y].map(v => Math.round(v * 1e6))))
  // bản gốc: y = cy + sin × dist × 0,8
  const old = (n, cx, cy, r, gap, rand) => {
    const pts = []
    let tries = 0
    while (pts.length < n && tries < 600) {
      tries++
      const ang = rand() * Math.PI * 2
      const dist = Math.sqrt(rand()) * r
      const x = cx + Math.cos(ang) * dist
      const y = cy + Math.sin(ang) * dist * 0.8
      const g = tries > 300 ? gap * 0.6 : gap
      if (pts.every(p => Math.hypot(p.x - x, p.y - y) >= g)) pts.push({ x, y })
    }
    while (pts.length < n) pts.push({ x: cx + (rand() - 0.5) * r, y: cy + (rand() - 0.5) * r })
    return pts
  }
  for (const seed of [1, 7, 99]) {
    assert.deepEqual(layoutSpots(8, 160, 140, 90, 50, uiRand(seed)), old(8, 160, 140, 90, 50, uiRand(seed)))
    assert.deepEqual(layoutSpots(30, 100, 100, 50, 64, uiRand(seed)), old(30, 100, 100, 50, 64, uiRand(seed)))
  }
})

// Chà theo một đường vuốt cho trước (tọa độ chuẩn hóa) trên thớt khung box ở tỉ lệ k → độ sạch từng vết.
function rubPath(box, k, spots, path, need) {
  const w = box.wr * k
  const h = box.hr * k
  const sp = spots.map(p => ({ ...p, clean: 0 }))
  let last = null
  for (const [nx, ny] of path) {
    const p = { x: nx * w, y: ny * h }
    if (last) rubSpots(sp, p.x, p.y, Math.hypot(p.x - last.x, p.y - last.y), { w, h, k }, need)
    last = p
  }
  return sp.map(s => s.clean)
}

test('cùng đường vuốt (theo tỉ lệ) sạch như nhau và cùng điểm ở mọi cỡ thớt; quãng vuốt cần tính theo tỉ lệ', () => {
  for (const [w, h] of [[328, 98], [328, 157], [358, 278]]) {
    const box = fitSpotsBox(w, h)
    const spots = spotLayout(5, box.wr, box.hr, uiRand(5))
    // chà qua lại quanh từng vết (± 0,5 bán kính vết theo đơn vị chuẩn), mỗi vết 3 lượt
    const path = []
    for (const s of spots) {
      const dx = (SPOT_RADIUS * 0.5) / box.wr
      for (let i = 0; i < 6; i++) path.push([s.nx + (i % 2 ? dx : -dx), s.ny])
    }
    const need = SPOT_NEED_PX / 1.2
    const ref = rubPath(box, box.k, spots, path, need)
    for (const k of [MIN_SCALE, 0.7, 1]) {
      const got = rubPath(box, k, spots, path, need)
      got.forEach((v, i) => assert.ok(Math.abs(v - ref[i]) < 1e-9, `${w}×${h} k=${k}: vết ${i} ${v} ≠ ${ref[i]}`))
      assert.equal(scoreCha({ spots: got, elapsed: 2, par: 3 }), scoreCha({ spots: ref, elapsed: 2, par: 3 }))
    }
    assert.ok(ref.some(v => v > 0), 'đường vuốt có chà trúng vết')
  }
  // quãng vuốt cần (px) = SPOT_NEED_PX × k: vuốt thẳng qua tâm một vết đúng quãng đó thì sạch hẳn
  const box = { wr: PAD_W, hr: PAD_H }
  for (const k of [MIN_SCALE, 0.8, 1]) {
    const spot = [{ nx: 0.5, ny: 0.5, clean: 0 }]
    const w = box.wr * k
    const h = box.hr * k
    const steps = 40
    const len = SPOT_NEED_PX * k
    const r = SPOT_HIT * k
    let x = w / 2 - r * 0.9
    let dir = 1
    for (let i = 0; i < steps; i++) {
      const seg = len / steps
      let nx2 = x + dir * seg
      if (Math.abs(nx2 - w / 2) > r * 0.9) { dir = -dir; nx2 = x + dir * seg }
      rubSpots(spot, nx2, h / 2, seg, { w, h, k }, SPOT_NEED_PX)
      x = nx2
    }
    assert.ok(Math.abs(spot[0].clean - 1) < 1e-9, `k=${k}: ${spot[0].clean}`)
  }
})

test('vuốt ngoài vùng chạm không tính; vết đã sạch không tăng nữa', () => {
  const k = 0.6
  const spots = [{ nx: 0.5, ny: 0.5, clean: 0 }]
  const box = { w: PAD_W * k, h: PAD_H * k, k }
  assert.deepEqual(rubSpots(spots, box.w / 2 + SPOT_HIT * k + 1, box.h / 2, 30, box, SPOT_NEED_PX), [])
  assert.deepEqual(rubSpots(spots, box.w / 2 + SPOT_HIT * k - 1, box.h / 2, 30, box, SPOT_NEED_PX), [0])
  spots[0].clean = 1
  assert.deepEqual(rubSpots(spots, box.w / 2, box.h / 2, 30, box, SPOT_NEED_PX), [])
})

test('thớt lắc/trộn/bóp cao vừa chỗ còn lại, không quá thớt chuẩn, không dưới mức tối thiểu', () => {
  assert.equal(fitStrokesHeight(360, 500), PAD_H)
  assert.equal(fitStrokesHeight(328, 500), Math.round(PAD_H * 328 / 360))
  assert.equal(fitStrokesHeight(328, 157), 157)
  assert.equal(fitStrokesHeight(328, 98), 98)
  // 360×600, 3 khách chờ, phiếu có ghi chú (Tây Ninh + Thêm trứng cút: 78px; phiếu 3 món + 2 ghi chú: ~75px): vừa khung
  assert.equal(fitStrokesHeight(328, 78), 78)
  assert.equal(fitStrokesHeight(328, 60), 60)
  assert.equal(fitStrokesHeight(328, 40), STROKE_MIN_H)
  // chưa đo được → thớt chuẩn theo bề ngang; đã đo mà hết chỗ → mức tối thiểu (không phải thớt to nhất)
  assert.equal(fitStrokesHeight(328, null), Math.round(PAD_H * 328 / 360))
  assert.equal(fitStrokesHeight(328, undefined), Math.round(PAD_H * 328 / 360))
  assert.equal(fitStrokesHeight(328, 0), STROKE_MIN_H)
  assert.equal(fitStrokesHeight(328, -30), STROKE_MIN_H)
})

test('sàn: thớt lắc và một hàng vết vẫn ≥ 44px (vùng chạm), đủ thấp cho ca đông khách ở 360×600', () => {
  assert.ok(STROKE_MIN_H >= MIN_TAP_PX, `thớt lắc thấp nhất ${STROKE_MIN_H}px`)
  assert.ok(STROKE_MIN_H <= 60, 'sàn thớt lắc không cao hơn chỗ còn lại của ca đông khách có ghi chú')
  assert.ok(PAD_MIN_HR * MIN_SCALE >= MIN_TAP_PX - 1e-9 && PAD_MIN_HR >= 2 * SPOT_HIT, 'khung thấp nhất chứa trọn vùng chạm một vết')
  // thớt sàn (một hàng vết): vết nằm giữa chiều cao, vùng chạm không lòi ra ngoài thớt
  const f = fitSpotsBox(328, 0)
  for (const n of [3, 5, 6]) {
    for (let seed = 1; seed <= 20; seed++) {
      for (const p of spotLayout(n, f.wr, f.hr, uiRand(seed))) {
        assert.ok(Math.abs(p.ny - 0.5) < 1e-9, 'một hàng vết')
        assert.ok(p.nx * f.wr >= SPOT_HIT && p.nx * f.wr <= f.wr - SPOT_HIT)
      }
    }
  }
})
