// M5 (0.5.0) — trứng đã tách nằm trọn trong lòng chảo ở Đập trứng (dapLayout) và Chiên trứng (lua.js dùng chung
// panEggSlots). Hồi quy: trước đây ca n = 2 đặt hai ô trứng ở floor.cx ± 0,9·floor.rx với cạnh 1,1·floor.rx nên nửa quả
// tràn ra ngoài cả vành chảo.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dapLayout, panEggSlots, eggInFloor, EGG_FOOT, EGG_MAX, EGG_PAD } from '../../src/ui/minigames/dap.js'
import { PROP_META } from '../../src/ui/art/v2.js'

const META = PROP_META.chao_lon
const FL = META.floor
// cỡ khung cảnh đập trứng (px) phủ 4 khung 390×844, 360×600, 320×568, 375×553 (có và không có nhãn ghi chú)
const SCENES = []
for (const W of [280, 296, 320, 343, 358]) for (const H of [160, 200, 240, 300, 350, 470]) SCENES.push([W, H])

// bề ngang hình ốp la (đơn vị khung chảo) của một ô
const eggX = e => [e.cx + e.size * (EGG_FOOT.dx - EGG_FOOT.hw), e.cx + e.size * (EGG_FOOT.dx + EGG_FOOT.hw)]

test('panEggSlots: n = 1…6 quả, mọi hình ốp la nằm trọn trong ellipse lòng chảo (có chừa mép)', () => {
  for (let n = 1; n <= 6; n++) {
    const eggs = panEggSlots(n, FL)
    assert.equal(eggs.length, n, `n = ${n}: đủ số ô`)
    for (const [i, e] of eggs.entries()) {
      assert.ok(e.size > 0.3 * FL.rx, `n = ${n}, ô ${i}: quả không quá bé (${e.size.toFixed(1)})`)
      assert.ok(eggInFloor(e, FL, 1, 720), `n = ${n}, ô ${i}: hình trứng tràn khỏi lòng chảo`)
      assert.ok(eggInFloor(e, FL, EGG_PAD + 0.005, 720), `n = ${n}, ô ${i}: không chừa mép lòng chảo`)
      const [x0, x1] = eggX(e)
      assert.ok(x0 >= FL.cx - FL.rx && x1 <= FL.cx + FL.rx, `n = ${n}, ô ${i}: bề ngang ${x0.toFixed(1)}..${x1.toFixed(1)} vượt lòng chảo`)
    }
  }
})

test('panEggSlots: một quả to giữa chảo; 1–3 quả một hàng không chồng quá nhiều; quả không to hơn khi thêm trứng', () => {
  const [one] = panEggSlots(1, FL)
  assert.equal(one.size, EGG_MAX * FL.rx)
  assert.ok(Math.abs(one.cx + one.size * EGG_FOOT.dx - FL.cx) < 0.01, 'hình trứng canh giữa lòng chảo')
  let prev = Infinity
  for (let n = 1; n <= 6; n++) {
    const eggs = panEggSlots(n, FL)
    assert.ok(eggs[0].size <= prev + 1e-9, `n = ${n}: quả không to hơn khi có ít quả hơn`)
    prev = eggs[0].size
    if (n <= 3) assert.ok(eggs.every(e => e.row === 0), `n = ${n}: một hàng ngang`)
    // cùng hàng: hai quả cạnh nhau chồng nhau không quá 15% bề rộng hình
    for (let i = 1; i < eggs.length; i++) {
      if (eggs[i].row !== eggs[i - 1].row) continue
      const gap = eggs[i].cx - eggs[i - 1].cx
      assert.ok(gap >= 2 * EGG_FOOT.hw * eggs[i].size * 0.85, `n = ${n}: ô ${i - 1}/${i} chồng nhau quá nhiều`)
    }
  }
  // hai quả (mặc định bánh mì ốp la) vẫn to: ít nhất 0,85·floor.rx
  assert.ok(panEggSlots(2, FL)[0].size >= 0.85 * FL.rx)
})

test('dapLayout: ô trứng (px) nằm trọn trong lòng chảo ở mọi cỡ khung cảnh, n = 1…4 (kể cả ca n = 2 từng tràn)', () => {
  for (const [W, H] of SCENES) {
    for (let n = 1; n <= 4; n++) {
      const L = dapLayout(W, H, n, META)
      const s = L.pan.s
      assert.equal(L.slots.length, n)
      const fx0 = L.pan.x + (FL.cx - FL.rx) * s, fx1 = L.pan.x + (FL.cx + FL.rx) * s
      for (const [i, sl] of L.slots.entries()) {
        // đổi ngược về đơn vị khung chảo; cho 1px làm tròn
        const e = { cx: (sl.x - L.pan.x) / s, cy: (sl.y - L.pan.y) / s, size: sl.size / s }
        const tol = 1 + 1 / (FL.ry * s)
        assert.ok(eggInFloor(e, FL, tol, 360), `${W}×${H} n = ${n}, ô ${i}: hình trứng tràn khỏi lòng chảo`)
        const x0 = sl.x + sl.size * (EGG_FOOT.dx - EGG_FOOT.hw), x1 = sl.x + sl.size * (EGG_FOOT.dx + EGG_FOOT.hw)
        assert.ok(x0 >= fx0 - 1 && x1 <= fx1 + 1, `${W}×${H} n = ${n}, ô ${i}: ${x0.toFixed(0)}..${x1.toFixed(0)} ngoài lòng chảo ${fx0.toFixed(0)}..${fx1.toFixed(0)}`)
        assert.ok(sl.z >= 1, 'có lớp xếp chồng')
      }
      // thả hàng ngoài trước: z không tăng theo thứ tự thả
      for (let i = 1; i < L.slots.length; i++) assert.ok(L.slots[i].z <= L.slots[i - 1].z)
    }
  }
  // đúng ca bằng chứng: khung 358×300, n = 2 — trước đây ô trứng 65..151 và 207..293 với vành chảo 78..280
  const L = dapLayout(358, 300, 2, META)
  const rx0 = L.pan.x + (META.rim.cx - META.rim.rx) * L.pan.s, rx1 = L.pan.x + (META.rim.cx + META.rim.rx) * L.pan.s
  for (const sl of L.slots) assert.ok(sl.x - sl.size / 2 >= rx0 && sl.x + sl.size / 2 <= rx1, 'cả ô vuông cũng trong vành chảo')
})

test('Chiên trứng đặt trứng bằng cùng panEggSlots với Đập trứng (chỗ trứng khớp giữa hai bước)', () => {
  const src = readFileSync(new URL('../../src/ui/minigames/lua.js', import.meta.url), 'utf8')
  assert.match(src, /import \{ panEggSlots \} from '\.\/dap\.js'/)
  assert.match(src, /panEggSlots\(eggCount\(step, ctx\), fl\)/)
})
