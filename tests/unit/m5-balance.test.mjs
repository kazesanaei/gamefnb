// M5 (0.5.0): bất biến cân bằng khi đổi 15 bước sang 5 thao tác mới (thiết kế M5 mục 0 và 1.6).
// So TỪNG BƯỚC của 9 món với bảng chép từ bản 0.4.1 (git show 2ebfba6:src/data/recipes.js): id, par, w, critical, retryCost,
// ing, after giữ nguyên; chỉ type/params (và skin, nhãn của them_da, ao_bot) đổi ở đúng 15 bước. Tổng par / w / giá / vốn
// theo bảng mục 0; BALANCE và STATE_VERSION không đổi; ghi chú vá tham số vẫn trỏ đúng tham số; effectiveSteps nhân turns,
// strips theo số phần (SCALE_KEYS) và par không đổi so với bản cũ.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { effectiveSteps, linePar } from '../../src/core/kitchen.js'
import { STATE_VERSION } from '../../src/core/state.js'
import { overtimeAt, minLimitSec, MIN_LIMIT } from '../../src/core/minigame-scoring.js'
import { gestureLimitSec } from '../../src/ui/minigames/_gesture.js'

const { RECIPES, BALANCE } = DATA

// Bảng bước bản 0.4.1 (type là loại CŨ).
const V041 = {
  banh_mi_op_la: [
    { id: 'chon', type: 'chon', par: 6, w: 1 },
    { id: 'rua_dua', type: 'cha', par: 3, w: 1, ing: 'dua_leo' },
    { id: 'thai_dua', type: 'thai', par: 4, w: 1, ing: 'dua_leo', after: ['rua_dua'] },
    { id: 'dap_trung', type: 'cham', par: 2, w: 2, ing: 'trung_ga' },
    { id: 'chien_trung', type: 'lua', par: 5, w: 3, critical: true, retryCost: 6000, ing: 'trung_ga', after: ['dap_trung'] },
    { id: 'nem', type: 'cham', par: 2, w: 1, ing: 'nuoc_tuong', after: ['chien_trung'] },
  ],
  tra_tac: [
    { id: 'chon', type: 'chon', par: 5, w: 1 },
    { id: 'thai_tac', type: 'thai', par: 3, w: 1, ing: 'tac' },
    { id: 'vat_tac', type: 'cham', par: 3, w: 1, ing: 'tac', after: ['thai_tac'] },
    { id: 'rot_tra', type: 'rot', par: 3, w: 2, ing: 'tra' },
    { id: 'nem_duong', type: 'cham', par: 2, w: 3, ing: 'duong' },
    { id: 'lac', type: 'cha', par: 2, w: 1, after: ['rot_tra', 'nem_duong', 'vat_tac'] },
  ],
  banh_trang_tron: [
    { id: 'chon', type: 'chon', par: 8, w: 1 },
    { id: 'cat_banh_trang', type: 'thai', par: 4, w: 1, ing: 'banh_trang' },
    { id: 'got_xoai', type: 'cha', par: 3, w: 1, ing: 'xoai_xanh' },
    { id: 'thai_xoai', type: 'thai', par: 4, w: 1, ing: 'xoai_xanh', after: ['got_xoai'] },
    { id: 'boc_trung_cut', type: 'cha', par: 3, w: 1, ing: 'trung_cut' },
    { id: 'nem', type: 'cham', par: 3, w: 2, ing: 'tac' },
    { id: 'rot_dau_hanh', type: 'rot', par: 2, w: 1, ing: 'hanh_phi' },
    { id: 'tron', type: 'cha', par: 4, w: 3, after: ['cat_banh_trang', 'got_xoai', 'thai_xoai', 'boc_trung_cut', 'nem', 'rot_dau_hanh'] },
  ],
  ca_phe_sua_da: [
    { id: 'chon', type: 'chon', par: 5, w: 1 },
    { id: 'rot_nuoc', type: 'rot', par: 3, w: 2, ing: 'ca_phe' },
    { id: 'u_phin', type: 'lua', par: 6, w: 2, ing: 'ca_phe', after: ['rot_nuoc'] },
    { id: 'them_sua', type: 'cham', par: 2, w: 3, ing: 'sua_dac' },
    { id: 'them_da', type: 'cham', par: 2, w: 1, ing: 'da' },
    { id: 'khuay', type: 'cha', par: 2, w: 1, after: ['rot_nuoc', 'u_phin', 'them_sua', 'them_da'] },
  ],
  che_buoi: [
    { id: 'chon', type: 'chon', par: 6, w: 1 },
    { id: 'got_vo', type: 'cha', par: 3, w: 1, ing: 'vo_buoi' },
    { id: 'thai_cui', type: 'thai', par: 4, w: 1, ing: 'vo_buoi', after: ['got_vo'] },
    { id: 'bop_muoi', type: 'cha', par: 3, w: 1, ing: 'muoi', after: ['thai_cui'] },
    { id: 'ao_bot', type: 'cham', par: 4, w: 2, ing: 'bot_nang', after: ['bop_muoi'] },
    { id: 'luoc', type: 'lua', par: 5, w: 3, critical: true, retryCost: 3000, ing: 'bot_nang', after: ['ao_bot'] },
    { id: 'rot_cot_dua', type: 'rot', par: 2, w: 2, ing: 'cot_dua' },
  ],
  tra_tac_mat_ong: [
    { id: 'chon', type: 'chon', par: 5, w: 1 },
    { id: 'thai_tac', type: 'thai', par: 3, w: 1, ing: 'tac' },
    { id: 'vat_tac', type: 'cham', par: 3, w: 1, ing: 'tac', after: ['thai_tac'] },
    { id: 'rot_tra', type: 'rot', par: 3, w: 2, ing: 'tra' },
    { id: 'rot_mat_ong', type: 'rot', par: 3, w: 3, ing: 'mat_ong_rung' },
    { id: 'lac', type: 'cha', par: 2, w: 1, after: ['rot_tra', 'rot_mat_ong', 'vat_tac'] },
  ],
  banh_mi_trung_ga_ta: [
    { id: 'chon', type: 'chon', par: 6, w: 1 },
    { id: 'nuong_banh_mi', type: 'lua', par: 4, w: 1, ing: 'banh_mi' },
    { id: 'rua_dua', type: 'cha', par: 3, w: 1, ing: 'dua_leo' },
    { id: 'thai_dua', type: 'thai', par: 4, w: 1, ing: 'dua_leo', after: ['rua_dua'] },
    { id: 'dap_trung', type: 'cham', par: 2, w: 2, ing: 'trung_ga_ta' },
    { id: 'chien_trung', type: 'lua', par: 5, w: 3, critical: true, retryCost: 6000, ing: 'trung_ga_ta', after: ['dap_trung'] },
    { id: 'nem', type: 'cham', par: 2, w: 1, ing: 'nuoc_tuong', after: ['chien_trung'] },
  ],
  banh_trang_tron_tay_ninh: [
    { id: 'chon', type: 'chon', par: 8, w: 1 },
    { id: 'cat_banh_trang', type: 'thai', par: 4, w: 1, ing: 'banh_trang' },
    { id: 'got_xoai', type: 'cha', par: 3, w: 1, ing: 'xoai_xanh' },
    { id: 'thai_xoai', type: 'thai', par: 4, w: 1, ing: 'xoai_xanh', after: ['got_xoai'] },
    { id: 'boc_trung_cut', type: 'cha', par: 3, w: 1, ing: 'trung_cut' },
    { id: 'xe_kho_muc', type: 'cha', par: 3, w: 2, ing: 'kho_muc' },
    { id: 'nem', type: 'cham', par: 3, w: 2, ing: 'tac' },
    { id: 'rot_dau_hanh', type: 'rot', par: 2, w: 1, ing: 'hanh_phi' },
    { id: 'tron', type: 'cha', par: 4, w: 3, after: ['cat_banh_trang', 'got_xoai', 'thai_xoai', 'boc_trung_cut', 'xe_kho_muc', 'nem', 'rot_dau_hanh'] },
  ],
  ca_phe_muoi: [
    { id: 'chon', type: 'chon', par: 5, w: 1 },
    { id: 'rot_nuoc', type: 'rot', par: 3, w: 2, ing: 'ca_phe_bmt' },
    { id: 'u_phin', type: 'lua', par: 6, w: 2, ing: 'ca_phe_bmt', after: ['rot_nuoc'] },
    { id: 'them_sua', type: 'cham', par: 2, w: 2, ing: 'sua_dac' },
    { id: 'them_da', type: 'cham', par: 2, w: 1, ing: 'da' },
    { id: 'khuay', type: 'cha', par: 2, w: 1, after: ['rot_nuoc', 'u_phin', 'them_sua', 'them_da'] },
    { id: 'danh_sua_muoi', type: 'cha', par: 4, w: 2, ing: 'muoi' },
    { id: 'rot_sua_muoi', type: 'rot', par: 2, w: 3, ing: 'muoi', after: ['khuay', 'danh_sua_muoi'] },
  ]
}

// 15 bước đổi loại (id món → id bước → { type, params, skin? }).
const CHANGED = {
  banh_mi_op_la: { dap_trung: { type: 'dap', params: { n: 2 } } },
  banh_mi_trung_ga_ta: { dap_trung: { type: 'dap', params: { n: 2 } } },
  tra_tac: { lac: { type: 'lac', params: { strokes: 6 }, skin: 'binh' } },
  tra_tac_mat_ong: { lac: { type: 'lac', params: { strokes: 6 }, skin: 'binh' } },
  banh_trang_tron: {
    got_xoai: { type: 'got', params: { strips: 5 } },
    tron: { type: 'xoay', params: { turns: 5 }, skin: 'to' }
  },
  banh_trang_tron_tay_ninh: {
    got_xoai: { type: 'got', params: { strips: 5 } },
    tron: { type: 'xoay', params: { turns: 5 }, skin: 'to' }
  },
  ca_phe_sua_da: {
    them_da: { type: 'bay', params: { n: 2 }, skin: 'ly', label: 'Thả đá vào ly' },
    khuay: { type: 'xoay', params: { turns: 3 }, skin: 'ly' }
  },
  ca_phe_muoi: {
    them_da: { type: 'bay', params: { n: 2 }, skin: 'ly', label: 'Thả đá vào ly' },
    khuay: { type: 'xoay', params: { turns: 3 }, skin: 'ly' },
    danh_sua_muoi: { type: 'xoay', params: { turns: 6, fast: true }, skin: 'chen' }
  },
  che_buoi: {
    got_vo: { type: 'got', params: { strips: 5 } },
    ao_bot: { type: 'lac', params: { strokes: 8 }, skin: 'ro', label: 'Lắc rổ áo bột năng' }
  }
}

// Bảng bất biến mục 0: tổng par, tổng w, giá, vốn.
const TOTALS = {
  banh_mi_op_la: [22, 9, 20000, 9000],
  tra_tac: [18, 9, 10000, 3000],
  banh_trang_tron: [31, 11, 20000, 8000],
  ca_phe_sua_da: [20, 10, 15000, 5000],
  che_buoi: [27, 11, 15000, 5000],
  tra_tac_mat_ong: [19, 9, 15000, 6000],
  banh_mi_trung_ga_ta: [26, 10, 25000, 11000],
  banh_trang_tron_tay_ninh: [34, 13, 25000, 12000],
  ca_phe_muoi: [26, 14, 20000, 6000]
}

test('đủ 9 món như bản 0.4.1', () => {
  assert.deepEqual(Object.keys(RECIPES).sort(), Object.keys(V041).sort())
})

for (const [rid, old] of Object.entries(V041)) {
  test(`${rid}: từng bước giữ id, par, w, critical, retryCost, ing, after; chỉ 15 bước đổi type/params`, () => {
    const steps = RECIPES[rid].steps
    assert.deepEqual(steps.map(s => s.id), old.map(s => s.id), 'thứ tự và id bước')
    for (const o of old) {
      const s = steps.find(x => x.id === o.id)
      const tag = `${rid}.${o.id}`
      assert.equal(s.par, o.par, tag + ' par')
      assert.equal(s.w, o.w, tag + ' w')
      assert.equal(!!s.critical, !!o.critical, tag + ' critical')
      assert.equal(s.retryCost, o.retryCost, tag + ' retryCost')
      assert.equal(s.ing, o.ing, tag + ' ing')
      assert.deepEqual(s.after ? [...s.after] : undefined, o.after, tag + ' after')
      const ch = CHANGED[rid] && CHANGED[rid][o.id]
      if (ch) {
        assert.equal(s.type, ch.type, tag + ' type mới')
        assert.deepEqual({ ...s.params }, ch.params, tag + ' params mới')
        assert.equal(s.skin, ch.skin, tag + ' skin')
        if (ch.label) assert.equal(s.label, ch.label, tag + ' nhãn')
      } else {
        assert.equal(s.type, o.type, tag + ' giữ loại cũ')
      }
    }
  })
}

test('đúng 15 bước đổi loại: dap 2, lac 3, got 3, xoay 5, bay 2', () => {
  const count = {}
  let total = 0
  for (const [rid, m] of Object.entries(CHANGED)) {
    for (const sid of Object.keys(m)) {
      total++
      const t = RECIPES[rid].steps.find(s => s.id === sid).type
      count[t] = (count[t] || 0) + 1
    }
  }
  assert.equal(total, 15)
  assert.deepEqual(count, { dap: 2, lac: 3, got: 3, xoay: 5, bay: 2 })
  // không bước nào khác dùng loại mới
  const all = Object.values(RECIPES).flatMap(r => r.steps.filter(s => ['dap', 'xoay', 'got', 'lac', 'bay'].includes(s.type)))
  assert.equal(all.length, 15)
})

test('tổng par, tổng w, giá, vốn đúng bảng bất biến mục 0', () => {
  for (const [rid, [par, w, price, cost]] of Object.entries(TOTALS)) {
    const r = RECIPES[rid]
    const sp = r.steps.reduce((s, x) => s + x.par, 0)
    const sw = r.steps.reduce((s, x) => s + x.w, 0)
    assert.deepEqual([sp, sw, r.price, r.cost], [par, w, price, cost], rid)
  }
})

test('BALANCE và STATE_VERSION không đổi', () => {
  assert.equal(STATE_VERSION, 3)
  assert.deepEqual(JSON.parse(JSON.stringify({
    stepLabels: BALANCE.stepLabels, gradeThresholds: BALANCE.gradeThresholds, autoStepScore: BALANCE.autoStepScore,
    retryScoreCap: BALANCE.retryScoreCap, zoneMulStage: BALANCE.zoneMulStage, zoneDailyNarrow: BALANCE.zoneDailyNarrow,
    zoneFloor: BALANCE.zoneFloor, zoneMulCap: BALANCE.zoneMulCap, waitBudgetBase: BALANCE.waitBudgetBase,
    waitBudgetParMul: BALANCE.waitBudgetParMul, masteryLevels: BALANCE.masteryLevels, tipFiveStar: BALANCE.tipFiveStar,
    tipMinBill: BALANCE.tipMinBill, startWallet: BALANCE.startWallet, fixedCostPerShift: BALANCE.fixedCostPerShift
  })), {
    stepLabels: [[90, 'Hoàn hảo'], [70, 'Tốt'], [50, 'Đạt'], [0, 'Hỏng']],
    gradeThresholds: [[90, 'tuyet_hao', 5], [75, 'ngon', 4], [60, 'duoc', 3], [40, 'kem', 2], [0, 'hong', 1]],
    autoStepScore: 80, retryScoreCap: 85, zoneMulStage: 1.2, zoneDailyNarrow: 0.02, zoneFloor: 0.75, zoneMulCap: 1.6,
    waitBudgetBase: 30, waitBudgetParMul: 2, masteryLevels: [0, 5, 15], tipFiveStar: 5000, tipMinBill: 20000,
    startWallet: 200000, fixedCostPerShift: 20000
  })
})

test('ghi chú vá tham số còn hợp lệ: Thêm trứng → dap_trung.n = 3, Ít đá → them_da.n = 1', () => {
  const BM = RECIPES.banh_mi_op_la
  const steps = effectiveSteps(BM, ['them_trung'], null, 1)
  assert.deepEqual({ ...steps.find(s => s.id === 'dap_trung').params }, { n: 3 })
  for (const rid of ['ca_phe_sua_da', 'ca_phe_muoi']) {
    const st = effectiveSteps(RECIPES[rid], ['it_da'], null, 1).find(s => s.id === 'them_da')
    assert.equal(st.type, 'bay')
    assert.deepEqual({ ...st.params }, { n: 1 }, rid)
  }
})

test('effectiveSteps nhân turns, strips theo số phần (SCALE_KEYS); fast giữ nguyên; par × (1 + 0,4(qty − 1))', () => {
  const tron = effectiveSteps(RECIPES.banh_trang_tron, [], null, 2).find(s => s.id === 'tron')
  assert.equal(tron.params.turns, 10)
  assert.equal(tron.par, 5.6)
  const got = effectiveSteps(RECIPES.banh_trang_tron, [], null, 2).find(s => s.id === 'got_xoai')
  assert.equal(got.params.strips, 10)
  const danh = effectiveSteps(RECIPES.ca_phe_muoi, [], null, 3).find(s => s.id === 'danh_sua_muoi')
  assert.deepEqual({ ...danh.params }, { turns: 18, fast: true })
  const lac = effectiveSteps(RECIPES.tra_tac, [], null, 2).find(s => s.id === 'lac')
  assert.equal(lac.params.strokes, 12)
  const dap = effectiveSteps(RECIPES.banh_mi_op_la, ['them_trung'], null, 2).find(s => s.id === 'dap_trung')
  assert.equal(dap.params.n, 6)
  const bay = effectiveSteps(RECIPES.ca_phe_sua_da, [], null, 2).find(s => s.id === 'them_da')
  assert.equal(bay.params.n, 4)
})

test('par của dòng phiếu (ngân sách chờ của khách) không đổi so với bản 0.4.1', () => {
  const sum = (rid, qty) => V041[rid].reduce((s, x) => s + Math.round(x.par * (1 + 0.4 * (qty - 1)) * 10) / 10, 0)
  for (const rid of Object.keys(V041)) {
    for (const qty of [1, 2, 3]) {
      const got = linePar(RECIPES[rid], { recipeId: rid, qty, notes: [] })
      // linePar bỏ bước của nguyên liệu tùy chọn không được dặn — 9 món hiện không có bước nào như vậy
      assert.ok(Math.abs(got - sum(rid, qty)) < 1e-9, `${rid} ×${qty}: ${got} ≠ ${sum(rid, qty)}`)
    }
  }
})

test('mốc trừ quá giờ của 5 thao tác mới: không thấp hơn sàn giờ, không vượt giới hạn giờ (mọi bước, 1–3 phần, mọi ghi chú); par không đổi', () => {
  const types = Object.keys(MIN_LIMIT)
  let n = 0
  for (const [rid, r] of Object.entries(RECIPES)) {
    const noteSets = [[], ...(r.notes || []).map(x => [x.id])]
    for (const notes of noteSets) {
      for (const qty of [1, 2, 3]) {
        for (const st of effectiveSteps(r, notes, null, qty)) {
          if (!types.includes(st.type)) continue
          n++
          const tag = `${rid} ${notes.join(',')} ×${qty} ${st.id}`
          const count = st.params[MIN_LIMIT[st.type].key]
          const mark = overtimeAt(st.type, count, st.par)
          assert.ok(mark >= minLimitSec(st.type, st.params) - 1e-9, `${tag}: mốc ${mark} ≥ sàn giờ`)
          assert.ok(mark >= 2 * st.par - 1e-9, `${tag}: mốc ≥ 2 × par`)
          assert.ok(mark <= gestureLimitSec(st) + 1e-9, `${tag}: mốc ${mark} ≤ giới hạn giờ ${gestureLimitSec(st)}`)
          assert.equal(overtimeAt(st.type, count, Infinity), Infinity, `${tag}: nấu thử không trừ`)
        }
      }
    }
  }
  assert.ok(n >= 15 * 3, `đã quét ${n} bước`)
  // bảng mốc trừ 1 phần (giây) — par giữ như bản 0.4.1
  const mark1 = (rid, sid) => {
    const st = RECIPES[rid].steps.find(s => s.id === sid)
    return overtimeAt(st.type, st.params[MIN_LIMIT[st.type].key], st.par)
  }
  assert.deepEqual({
    khuay: mark1('ca_phe_sua_da', 'khuay'), danh_sua_muoi: mark1('ca_phe_muoi', 'danh_sua_muoi'), tron: mark1('banh_trang_tron', 'tron'),
    got_xoai: mark1('banh_trang_tron', 'got_xoai'), got_vo: mark1('che_buoi', 'got_vo'), lac: mark1('tra_tac', 'lac'), ao_bot: mark1('che_buoi', 'ao_bot')
  }, { khuay: 5.2, danh_sua_muoi: 9.4, tron: 8, got_xoai: 7, got_vo: 7, lac: 4, ao_bot: 8 })
})
