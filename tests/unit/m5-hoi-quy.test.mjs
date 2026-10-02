// Hồi quy M5 Đợt 1 (bản 0.5.0): khóa bằng hàm thuần các lỗi đã sửa ở các vòng kiểm chứng; phần giao diện có ca e2e tương
// ứng trong tests/e2e/m5-bep.e2e.mjs, mục (i) đến (n).
//  - Thả đá (D1/E3): bậc vùng thả lúc kéo (bayTier, ghi ra data-tier), vòng hồng tâm vẽ trên vùng thả (bayRings) và điểm vị
//    trí (bayPlaceScore) luôn cùng một bậc, với mọi hệ số vùng.
//  - Thẻ vào bước (F1): món đã nấu đúng HINT_HIDE_AFTER_COOKS lần (mốc ẩn thẻ) thì mọi bước thuộc loại thao tác mới chưa xem
//    hướng dẫn vẫn hiện thẻ đầy đủ; bước kiểu cũ chỉ còn ruy băng gọn; ngay dưới mốc thì mọi bước đều đầy đủ.
//  - Câu hướng dẫn của thẻ ở khung thấp (G5): câu ngắn thay cho câu đầy đủ vẫn giữ lời dặn cuối câu ("bấm Xong", "nhấc tay").
// Import trong Node, không DOM.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { markSeen } from '../../src/core/tour.js'
import { bayPlaceScore } from '../../src/core/minigame-scoring.js'
import { bayTier, bayRings } from '../../src/ui/minigames/bay.js'
import { stepCardModel } from '../../src/ui/components/step-card.js'
import { HINT_HIDE_AFTER_COOKS, NEW_TYPES, stepCardFull } from '../../src/ui/screens/kitchen.js'

const TIER_OF = { 100: 'tam', 80: 'gan', 55: 'mep' }
const MULS = [0.8, 1, 1.104, 1.25, 1.5, 3]

test('Thả đá: bayTier (data-tier của vùng thả) cùng bậc với bayPlaceScore ở mọi khoảng cách và hệ số vùng', () => {
  for (const mul of MULS) {
    for (let i = 0; i <= 1200; i++) {
      const d = i / 1000
      const s = bayPlaceScore(d, mul)
      const t = bayTier(d, mul)
      // ngoài vùng thả: không có bậc (bay.js không nhận viên thả ở đây — viên đá trôi về khay, không vào scoreBay)
      if (d > 1) {
        assert.equal(t, null, `d=${d} mul=${mul}: ngoài vùng thả thì không có bậc`)
        continue
      }
      assert.ok(t, `d=${d} mul=${mul}: trong vùng thả phải có bậc`)
      assert.equal(t.id, TIER_OF[s], `d=${d} mul=${mul}: bậc ${t.id} nhưng điểm ${s}`)
    }
    // khoảng cách âm (lệch về phía nào cũng vậy) như dương
    assert.equal(bayTier(-0.2, mul).id, bayTier(0.2, mul).id)
  }
  // tâm luôn bậc cao nhất 100; vành ngoài (0,85 bán kính, hệ số vùng 1) bậc thấp nhất trong vùng 55 — đúng hai ca e2e (l)
  assert.equal(bayTier(0).id, 'tam')
  assert.equal(bayPlaceScore(0), 100)
  assert.equal(bayTier(0.85).id, 'mep')
  assert.equal(bayPlaceScore(0.85), 55)
  for (const bad of [NaN, Infinity, 'x', undefined]) assert.equal(bayTier(bad), null, String(bad))
})

test('Thả đá: vòng hồng tâm (bayRings) nằm đúng ranh giới điểm 100 / 80 của bayPlaceScore', () => {
  for (const mul of MULS) {
    const { a, b } = bayRings(mul)
    assert.ok(a > 0 && a <= b && b <= 1, `mul=${mul}: 0 < a ≤ b ≤ 1 (${a}, ${b})`)
    assert.equal(bayPlaceScore(a, mul), 100, `mul=${mul}: trên vòng trong vẫn 100`)
    if (a < 1) assert.equal(bayPlaceScore(a + 1e-6, mul), 80, `mul=${mul}: vừa ra ngoài vòng trong là 80`)
    if (b < 1) {
      assert.equal(bayPlaceScore(b, mul), 80, `mul=${mul}: trên vòng giữa vẫn 80`)
      assert.equal(bayPlaceScore(b + 1e-6, mul), 55, `mul=${mul}: vừa ra ngoài vòng giữa là 55`)
    }
  }
  // hệ số vùng lỗi hoặc ≤ 0: vòng như hệ số 1
  assert.deepEqual(bayRings(0), bayRings(1))
  assert.deepEqual(bayRings('x'), bayRings(1))
})

// Mọi bước của mọi món, kèm id món.
const ALL_STEPS = Object.entries(DATA.RECIPES).flatMap(([rid, r]) => r.steps.map(s => ({ rid, s })))

test('Thẻ vào bước: món nấu đúng mốc ẩn thẻ — bước loại mới chưa xem hướng dẫn vẫn đầy đủ, xem rồi thì gọn; bước kiểu cũ gọn', () => {
  assert.ok(HINT_HIDE_AFTER_COOKS >= 1)
  const news = ALL_STEPS.filter(({ s }) => NEW_TYPES.includes(s.type))
  assert.deepEqual([...new Set(news.map(({ s }) => s.type))].sort(), [...NEW_TYPES].sort(), 'mỗi loại thao tác mới có trong ít nhất một món')
  for (const { rid, s } of ALL_STEPS) {
    const st = defaultState(1, DATA)
    if (!st.recipes[rid]) st.recipes[rid] = { cooks: 0 }
    const isNew = NEW_TYPES.includes(s.type)
    const at = `${rid}.${s.id} (${s.type})`
    // ngay dưới mốc: mọi bước đầy đủ
    st.recipes[rid].cooks = HINT_HIDE_AFTER_COOKS - 1
    assert.equal(stepCardFull(s, st, { recipeId: rid }), true, `${at}: nấu ${HINT_HIDE_AFTER_COOKS - 1} lần → đầy đủ`)
    // đúng mốc và trên mốc: loại mới chưa xem → đầy đủ; kiểu cũ → gọn
    for (const cooks of [HINT_HIDE_AFTER_COOKS, HINT_HIDE_AFTER_COOKS + 7]) {
      st.recipes[rid].cooks = cooks
      assert.equal(stepCardFull(s, st, { recipeId: rid }), isNew, `${at}: nấu ${cooks} lần, chưa xem hướng dẫn`)
      // nấu thử (Chợ Công Thức): chỉ theo số lần nấu
      assert.equal(stepCardFull(s, st, { recipeId: rid, tasting: true }), false, `${at}: nấu thử ${cooks} lần`)
    }
    // xem hướng dẫn của đúng loại đó rồi → gọn
    if (isNew) {
      markSeen(st, ['bep_' + s.type])
      assert.equal(stepCardFull(s, st, { recipeId: rid }), false, `${at}: đã xem bep_${s.type}`)
    }
  }
})

test('Thẻ vào bước: câu ngắn cho khung thấp giữ lời dặn cuối câu đầy đủ ("bấm Xong", "nhấc tay") và không dài hơn', () => {
  let checked = 0
  for (const { rid, s } of ALL_STEPS) {
    const m = stepCardModel(s, { data: DATA, recipe: DATA.RECIPES[rid] })
    const at = `${rid}.${s.id}: "${m.hint}" → "${m.hintShort}"`
    assert.ok(m.hintShort, `${rid}.${s.id}: có câu hướng dẫn`)
    assert.ok(m.hintShort.length <= m.hint.length, `${at}: câu ngắn không dài hơn câu đầy đủ`)
    for (const tail of ['bấm Xong', 'nhấc tay']) {
      if (m.hint.includes(tail)) {
        checked++
        assert.ok(m.hintShort.includes(tail), `${at}: câu ngắn mất lời dặn "${tail}"`)
      }
    }
  }
  assert.ok(checked >= 2, `có ít nhất 2 bước dặn "bấm Xong" (đã kiểm ${checked})`)
  // bước Thả đá (ca e2e (k)): câu đầy đủ và câu ngắn đều kết thúc bằng "bấm Xong."
  const them = stepCardModel(DATA.RECIPES.ca_phe_sua_da.steps.find(x => x.id === 'them_da'), { data: DATA })
  assert.match(them.hint, /bấm Xong\.$/)
  assert.match(them.hintShort, /bấm Xong\.$/)
})
