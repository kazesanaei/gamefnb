import test from 'node:test'
import assert from 'node:assert/strict'
import { ingredientErrors, requiredIngredients, dishQuality, customerStars, tipFor, averageRating, customerMultiplier, gradeOf } from '../../src/core/scoring.js'
import { RECIPES, PERSONAS, BALANCE } from '../fixtures/data.mjs'

const BM = RECIPES.banh_mi_op_la
const FULL = ['banh_mi', 'trung_ga', 'dua_leo', 'hanh_la', 'nuoc_tuong']

test('requiredIngredients áp removes/adds', () => {
  assert.deepEqual(requiredIngredients(BM, []).required, FULL)
  assert.deepEqual(requiredIngredients(BM, ['khong_hanh']).required, ['banh_mi', 'trung_ga', 'dua_leo', 'nuoc_tuong'])
  assert.ok(requiredIngredients(BM, ['cay']).required.includes('tuong_ot'))
})

test('ingredientErrors: 1 dòng phạt/nguyên liệu theo thứ tự ưu tiên', () => {
  assert.deepEqual(ingredientErrors(BM, [], FULL), [])
  // lấy hành khi phiếu ghi "Không hành": chỉ trai_ghi_chu (không kèm "thừa")
  const e1 = ingredientErrors(BM, ['khong_hanh'], FULL)
  assert.deepEqual(e1, [{ code: 'trai_ghi_chu', ing: 'hanh_la', cap: 60, starsCap: 2 }])
  // bẫy thay nguyên liệu phụ: bẫy + thiếu (2 nguyên liệu khác nhau)
  const e2 = ingredientErrors(BM, [], ['banh_mi', 'trung_ga', 'dua_leo', 'hanh_la', 'nuoc_mam'])
  assert.deepEqual(e2.map(e => [e.code, e.ing]), [['thieu_phu', 'nuoc_tuong'], ['bay', 'nuoc_mam']])
  assert.equal(e2[0].penalty, 10)
  // tùy chọn không được yêu cầu → thừa −8
  const e3 = ingredientErrors(BM, [], [...FULL, 'tuong_ot'])
  assert.deepEqual(e3, [{ code: 'thua', ing: 'tuong_ot', penalty: 8 }])
  // cay mà quên tương ớt → thiếu phụ
  assert.deepEqual(ingredientErrors(BM, ['cay'], FULL).map(e => e.code), ['thieu_phu'])
  // mỗi nguyên liệu tối đa 1 lỗi
  const e4 = ingredientErrors(BM, ['khong_hanh'], [...FULL, 'hanh_tay', 'tuong_ot'])
  const ings = e4.map(e => e.ing)
  assert.equal(new Set(ings).size, ings.length)
})

test('dishQuality: Q có trọng số, trừ phạt, trần, chí mạng, Không tì vết', () => {
  const steps = [
    { id: 'chon', score: 100 }, { id: 'rua_dua', score: 100 }, { id: 'thai_dua', score: 100 },
    { id: 'thai_hanh', score: 100 }, { id: 'dap_trung', score: 100 }, { id: 'chien_trung', score: 100 }, { id: 'nem', score: 100 }
  ]
  const r = dishQuality(BM, steps, [], { thresholds: BALANCE.gradeThresholds })
  assert.deepEqual(r, { q: 100, grade: 'tuyet_hao', flawless: true, capped: false })
  // w: chien_trung 3, dap_trung 2 → (7×100 − 3×100 + 3×80)/10
  const s2 = steps.map(s => (s.id === 'chien_trung' ? { ...s, score: 80 } : s))
  assert.equal(dishQuality(BM, s2, []).q, 94)
  assert.equal(dishQuality(BM, s2, []).flawless, false)
  // thiếu phụ −10
  assert.equal(dishQuality(BM, steps, [{ code: 'thieu_phu', ing: 'x', penalty: 10 }]).q, 90)
  // bẫy: trần 60
  const b = dishQuality(BM, steps, [{ code: 'bay', ing: 'x', cap: 60 }])
  assert.equal(b.q, 60); assert.equal(b.grade, 'duoc'); assert.equal(b.capped, true); assert.equal(b.flawless, false)
  // bước chí mạng < 50 → Hỏng
  const s3 = steps.map(s => (s.id === 'chien_trung' ? { ...s, score: 0 } : s))
  assert.equal(dishQuality(BM, s3, []).grade, 'hong')
  // tự làm/làm lại → không Không tì vết
  assert.equal(dishQuality(BM, steps.map(s => (s.id === 'nem' ? { ...s, auto: true } : s)), []).flawless, false)
  // Hỗ trợ thao tác: trần Ngon
  const a = dishQuality(BM, steps, [], { assist: true })
  assert.equal(a.grade, 'ngon'); assert.equal(a.flawless, false)
  assert.deepEqual(gradeOf(75), { grade: 'ngon', stars: 4 })
  assert.deepEqual(gradeOf(39.9), { grade: 'hong', stars: 1 })
})

test('customerStars: làm tròn xuống (4 − 0,5 → 3), Hỏng, khó tính, tutorial, trần', () => {
  const dish = (q, grade, extra = {}) => ({ recipeId: 'banh_mi_op_la', qty: 1, q, grade, ingErrors: [], ...extra })
  const c = { penalties: [{ code: 'cho_lau', stars: 0.5, source: 'cho' }] }
  assert.equal(customerStars(c, [dish(80, 'ngon')], RECIPES).stars, 3)
  assert.equal(customerStars({ penalties: [] }, [dish(80, 'ngon')], RECIPES).stars, 4)
  assert.equal(customerStars({ penalties: [] }, [dish(95, 'tuyet_hao')], RECIPES).stars, 5)
  // có món Hỏng → base ≤ 2
  const r = customerStars({ penalties: [] }, [dish(95, 'tuyet_hao'), dish(30, 'hong')], RECIPES)
  assert.equal(r.base, 2)
  // trọng số theo giá: bánh mì 20k Q 95 + trà 10k Q 60 → 83,3 → Ngon
  const mix = [dish(95, 'tuyet_hao'), { recipeId: 'tra_tac', qty: 1, q: 60, grade: 'duoc', ingErrors: [] }]
  assert.equal(customerStars({ penalties: [] }, mix, RECIPES).base, 4)
  // khó tính: có lỗi → −1 thêm
  const strict = { strict: true, penalties: [{ code: 'bao_du', stars: 1, source: 'quay' }] }
  assert.equal(customerStars(strict, [dish(95, 'tuyet_hao')], RECIPES).stars, 3)
  assert.equal(customerStars({ strict: true, penalties: [] }, [dish(95, 'tuyet_hao')], RECIPES).stars, 5)
  // tutorial: không phạt
  const tut = { tutorial: true, strict: true, penalties: [{ code: 'bao_du', stars: 1, source: 'quay' }] }
  assert.equal(customerStars(tut, [dish(95, 'tuyet_hao')], RECIPES).stars, 5)
  // kẹp 1..5
  assert.equal(customerStars({ penalties: [{ code: 'x', stars: 9 }] }, [dish(95, 'tuyet_hao')], RECIPES).stars, 1)
  // xin lỗi +1 nhưng theo trần làm lại (3)
  assert.equal(customerStars({ penalties: [], starCap: 3, apologyBonus: 1 }, [dish(95, 'tuyet_hao')], RECIPES).stars, 3)
  assert.equal(customerStars({ penalties: [], apologyBonus: 1 }, [dish(30, 'hong')], RECIPES).stars, 2)
  // trái ghi chú → sao ≤ 2
  const trai = dish(95, 'tuyet_hao', { ingErrors: [{ code: 'trai_ghi_chu', ing: 'hanh_la', cap: 60, starsCap: 2 }] })
  assert.equal(customerStars({ penalties: [] }, [trai], RECIPES).stars, 2)
})

test('tip, sao trung bình, hệ số khách', () => {
  // M4: tipFor(sao, hóa đơn khách thực trả, balance): 5.000đ duy nhất khi 5 sao và hóa đơn từ 20.000đ
  assert.equal(tipFor(5, 20000, BALANCE), 5000)
  assert.equal(tipFor(5, 15000, BALANCE), 0)
  assert.equal(tipFor(5, 19999, BALANCE), 0)
  assert.equal(tipFor(4, 30000, BALANCE), 0)
  assert.equal(tipFor(5, 100000, BALANCE), 5000, 'không có mức tip cao hơn')
  assert.equal(tipFor(5, 0, BALANCE), 0)
  assert.equal(tipFor(5, 20000), 5000, 'thiếu balance thì theo DEFAULT_BALANCE')
  assert.ok(PERSONAS.kho_tinh.strict)
  assert.equal(averageRating([]), 4)
  assert.equal(averageRating([5, 5]), (5 + 5 + 4 + 4 + 4) / 5)
  assert.equal(averageRating(new Array(40).fill(1).concat(new Array(30).fill(5))), 5)
  assert.equal(customerMultiplier(4.5), 1.15)
  assert.equal(customerMultiplier(4.2), 1.0)
  assert.equal(customerMultiplier(3.5), 0.85)
  assert.equal(customerMultiplier(3.49), 0.7)
})
