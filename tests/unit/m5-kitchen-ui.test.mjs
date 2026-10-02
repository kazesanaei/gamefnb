// M5 Đợt 1, gói F — màn Bếp mới: bảng bước → hình trạng thái (src/ui/art/state-map.js), biểu tượng loại thao tác và dòng
// trạng thái của huy hiệu bước, lời góp ý cho 5 thao tác mới, hằng thời gian; chế độ tập trung (service.js, game.css);
// kitchen.js / service.js import được trong Node và không chạm DOM ở cấp module.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DATA } from '../../src/data/index.js'
import { STATES, ICONS, PROPS } from '../../src/ui/art.js'
import { STEP_STATE, METHOD_STATE, methodState, stepState, activeState, boardStates, statesOfStep } from '../../src/ui/art/state-map.js'
import {
  stepBadge, stepStatus, dishComment, HINT_HIDE_AFTER_COOKS, REVEAL_MS, REVEAL_MS_REDUCED, HINT_MS, FLASH_MS, FLASH_MS_REDUCED,
  NEW_TYPES, newTypeTour, stepCardFull
} from '../../src/ui/screens/kitchen.js'
import { defaultState } from '../../src/core/state.js'
import { markSeen, setToursEnabled } from '../../src/core/tour.js'
import { STEP_CARD_AUTO_MS } from '../../src/ui/components/step-card.js'
import { METHOD_STATE as THAI_METHOD_STATE } from '../../src/ui/minigames/thai.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8')
const R = DATA.RECIPES
const allSteps = () => Object.values(R).flatMap(r => r.steps.map(s => ({ recipe: r, step: s })))

test('state-map: mọi khóa là id bước có thật; mọi hình trạng thái bảng sinh ra đều có trong bộ hình', () => {
  const ids = new Set(allSteps().map(x => x.step.id))
  for (const id of Object.keys(STEP_STATE)) assert.ok(ids.has(id), `${id}: không phải bước trong recipes.js`)
  let n = 0
  for (const { recipe, step } of allSteps()) {
    for (const key of statesOfStep(step)) {
      n++
      assert.ok(STATES[key], `${recipe.id}.${step.id} → ${key}: thiếu hình trạng thái`)
    }
  }
  assert.ok(n >= 20, 'bảng phủ đủ các bước sơ chế có hình')
  // cách sơ chế: trùng bảng của sân khấu Thái (thai.js) — một nguồn ý nghĩa
  for (const [m, s] of Object.entries(THAI_METHOD_STATE)) assert.equal(METHOD_STATE[m], s, m)
  assert.equal(methodState('de_nguyen'), null)
  assert.equal(methodState('khong_co'), undefined)
  // mọi cách sơ chế dùng trong công thức đều biết hình
  for (const { step } of allSteps()) for (const m of (step.method && step.method.options) || []) assert.notEqual(methodState(m), undefined, m)
  assert.ok(Object.isFrozen(STEP_STATE) && Object.isFrozen(STEP_STATE.chien_trung.notes))
})

test('state-map: stepState theo bước, cách sơ chế đã chọn, hạng, nhãn lỗi và ghi chú', () => {
  const step = (rid, id) => R[rid].steps.find(s => s.id === id)
  const bm = id => step('banh_mi_op_la', id)
  assert.deepEqual(stepState(bm('rua_dua'), { score: 100 }), { ing: 'dua_leo', state: 'sach' })
  assert.deepEqual(stepState(bm('thai_dua'), { score: 85, method: 'thai_soi' }), { ing: 'dua_leo', state: 'soi' })
  assert.deepEqual(stepState(bm('thai_dua'), { score: 80, auto: true, method: null }), { ing: 'dua_leo', state: 'lat' }, 'tự làm: cách đúng')
  assert.equal(stepState(step('banh_trang_tron', 'cat_banh_trang'), { score: 85, method: 'de_nguyen' }), null, 'để nguyên: hình gốc')
  assert.deepEqual(stepState(bm('dap_trung'), { score: 100 }), { ing: 'trung_ga', state: 'op_la_song' })
  assert.deepEqual(stepState(bm('chien_trung'), { score: 95 }), { ing: 'trung_ga', state: 'op_la' })
  assert.deepEqual(stepState(bm('chien_trung'), { score: 95 }, { notes: ['long_dao'] }), { ing: 'trung_ga', state: 'long_dao' })
  assert.deepEqual(stepState(bm('chien_trung'), { score: 92 }, { notes: ['chin_ky'] }), { ing: 'trung_ga', state: 'chin_ky' })
  assert.deepEqual(stepState(bm('chien_trung'), { score: 10, tag: 'chay' }), { ing: 'trung_ga', state: 'op_la_chay' })
  assert.deepEqual(stepState(bm('chien_trung'), { score: 20, tag: 'song' }, { notes: ['long_dao'] }), { ing: 'trung_ga', state: 'op_la_song' })
  assert.deepEqual(stepState(bm('chien_trung'), { score: 30 }), { ing: 'trung_ga', state: 'op_la_chay' }, 'Hỏng không nhãn: cháy')
  const ta = step('banh_mi_trung_ga_ta', 'chien_trung')
  assert.deepEqual(stepState(ta, { score: 100 }), { ing: 'trung_ga_ta', state: 'op_la' })
  // chè bưởi: bước có ing bột năng nhưng hình đổi trên cùi bưởi; luộc còn non thì giữ hình áo bột
  assert.deepEqual(stepState(step('che_buoi', 'ao_bot'), { score: 90 }), { ing: 'vo_buoi', state: 'ao_bot' })
  assert.deepEqual(stepState(step('che_buoi', 'luoc'), { score: 90 }), { ing: 'vo_buoi', state: 'chin' })
  assert.equal(stepState(step('che_buoi', 'luoc'), { score: 20, tag: 'song' }), null)
  assert.deepEqual(stepState(step('ca_phe_sua_da', 'them_da'), { score: 100 }), { ing: 'da', state: 'vien' })
  // bước không có hình, chưa xong, đầu vào lỗi
  assert.equal(stepState(bm('nem'), { score: 100 }), null)
  assert.equal(stepState(bm('rua_dua'), null), null)
  assert.equal(stepState(null, { score: 1 }), null)
  assert.deepEqual(activeState(bm('dap_trung')), { ing: 'trung_ga', state: 'nut' })
  assert.equal(activeState(bm('rua_dua')), null)
})

test('state-map: boardStates đi theo thứ tự công thức (bước sau đè bước trước, kể cả khi bước trước làm lại sau)', () => {
  const board = R.che_buoi.steps.filter(s => s.type !== 'chon')
  // thứ tự ghi kết quả: thái cùi trước, gọt vỏ (làm lại) sau
  const results = { thai_cui: { score: 90, method: 'hat_luu' }, got_vo: { score: 85 } }
  assert.deepEqual(boardStates(board, results), { vo_buoi: 'hat_luu' })
  results.ao_bot = { score: 100 }
  assert.deepEqual(boardStates(board, results), { vo_buoi: 'ao_bot' })
  const bm = R.banh_mi_op_la.steps.filter(s => s.type !== 'chon')
  assert.deepEqual(boardStates(bm, { rua_dua: { score: 100 } }, { activeId: 'dap_trung' }), { dua_leo: 'sach', trung_ga: 'nut' })
  assert.deepEqual(boardStates(bm, {}), {})
  assert.deepEqual(boardStates(null, null), {})
})

test('huy hiệu bước: mỗi bước của mọi công thức có biểu tượng thao tác thật (không hình dự phòng "?")', () => {
  for (const { recipe, step } of allSteps()) {
    const b = stepBadge(step)
    if (b.kind === 'icon') {
      assert.ok(ICONS[b.id], `${recipe.id}.${step.id}: icon ${b.id}`)
      if (b.state) assert.ok(STATES[`${b.id}.${b.state}`], `${recipe.id}.${step.id}: ${b.id}.${b.state}`)
    } else if (b.kind === 'prop') assert.ok(PROPS[b.id], `${recipe.id}.${step.id}: đạo cụ ${b.id}`)
    else assert.equal(b.kind, 'glyph', `${recipe.id}.${step.id}`)
  }
  // loại thao tác mới có biểu tượng dụng cụ riêng
  assert.equal(stepBadge({ type: 'xoay' }).id, 'muong_khuay')
  assert.equal(stepBadge({ type: 'got' }).id, 'dao_bao')
  assert.equal(stepBadge({ type: 'lac', skin: 'binh' }).id, 'binh_lac')
  assert.equal(stepBadge({ type: 'lac', skin: 'ro' }).id, 'ro')
  assert.equal(stepBadge({ type: 'bay' }).id, 'khay_bay')
  assert.deepEqual(stepBadge({ type: 'dap', ing: 'trung_ga_ta' }), { kind: 'icon', id: 'trung_ga_ta', state: 'nut' })
  assert.deepEqual(stepBadge({ type: 'cha', id: 'rua_dua' }), { kind: 'glyph', id: 'drop' })
  assert.deepEqual(stepBadge({ type: 'lua' }), { kind: 'glyph', id: 'flame' })
  assert.deepEqual(stepBadge({}), { kind: 'icon', id: 'fallback' })
})

test('dòng trạng thái huy hiệu bước: "Tốt · 85" (e2e đọc số điểm), tự làm, chưa mở, mở', () => {
  assert.deepEqual(stepStatus({ result: { grade: 'Tốt', score: 85 } }), { text: 'Tốt · 85', cls: 'is-done' })
  assert.match(stepStatus({ result: { grade: 'Tốt', score: 80, auto: true } }).text, /80/)
  const byId = new Map([['rua_dua', { label: 'Rửa dưa leo', done: false }], ['a', { label: 'A', done: false }], ['b', { label: 'B', done: true }]])
  assert.equal(stepStatus({ available: false, after: ['rua_dua'] }, byId).text, 'Sau: Rửa dưa leo')
  assert.equal(stepStatus({ available: false, after: ['rua_dua', 'a', 'b'] }, byId).text, 'Sau 2 bước')
  assert.equal(stepStatus({ available: true }).text, 'Chạm để làm')
  assert.equal(stepStatus({ available: true, method: { options: [] } }).text, 'Chọn cách')
})

test('lời góp ý của Dì Sáu cho 5 thao tác mới ghép từ DIALOGUE.diSau.typeTips theo mẫu "<tên bước> <góp ý>"', () => {
  const tips = DATA.DIALOGUE.diSau.typeTips
  const cases = [['banh_mi_op_la', 'dap_trung'], ['banh_trang_tron', 'tron'], ['banh_trang_tron', 'got_xoai'], ['tra_tac', 'lac'], ['ca_phe_sua_da', 'them_da']]
  for (const [rid, sid] of cases) {
    const def = R[rid].steps.find(s => s.id === sid)
    const dish = { q: 70, notes: [], ingErrors: [], steps: { [sid]: { score: 60, grade: 'Đạt' } } }
    assert.equal(dishComment(dish, R[rid], DATA), `${def.label} ${tips[def.type]}`, `${rid}.${sid}`)
  }
})

test('hằng thời gian: thẻ bước 1,1 s; ra món 2,2 s (giảm chuyển động 1,4 s); thẻ đầy đủ dưới 3 lần nấu; con dấu nổi', () => {
  assert.equal(HINT_MS, STEP_CARD_AUTO_MS)
  assert.equal(REVEAL_MS, 2200)
  assert.equal(REVEAL_MS_REDUCED, 1400)
  assert.equal(HINT_HIDE_AFTER_COOKS, 3)
  assert.ok(FLASH_MS >= 1200 && FLASH_MS_REDUCED <= FLASH_MS)
})

// Vòng sửa F (hồi quy): người chơi nâng cấp từ 0.4.x đã nấu Bánh mì ốp la, Trà tắc nhiều lần vẫn phải thấy thẻ đầy đủ (tay
// mẫu) và tour bep_<loại> lần đầu gặp mỗi loại thao tác mới — luật "món nấu < 3 lần" một mình thì không bao giờ thấy.
test('thẻ vào bước đầy đủ: món nấu < 3 lần, HOẶC lần đầu gặp loại thao tác mới (chưa xem tour bep_<loại>) dù món nấu nhiều lần', () => {
  assert.deepEqual([...NEW_TYPES], ['dap', 'xoay', 'got', 'lac', 'bay'])
  for (const t of NEW_TYPES) {
    const id = newTypeTour(t)
    assert.equal(id, 'bep_' + t)
    assert.ok(DATA.TOURS[id], `${id}: có tour`)
    assert.equal(DATA.TOURS[id].spot, 'card-' + t, `${id}: tour chỉ vào thẻ vào bước`)
    assert.ok(!DATA.TOURS[id].veteranDay, `${id}: không có veteranDay (người chơi cũ cũng xem)`)
  }
  for (const t of ['chon', 'cha', 'thai', 'cham', 'lua', 'rot', '', undefined]) assert.equal(newTypeTour(t), null, String(t))
  const st = defaultState(1, DATA)
  const dap = R.banh_mi_op_la.steps.find(s => s.id === 'dap_trung')
  const lac = R.tra_tac.steps.find(s => s.id === 'lac')
  const thai = R.banh_mi_op_la.steps.find(s => s.id === 'thai_dua')
  const full = (step, recipeId, o = {}) => stepCardFull(step, st, { recipeId, ...o })
  // món mới (chưa nấu / nấu 2 lần): thẻ đầy đủ với mọi loại bước
  st.recipes.banh_mi_op_la.cooks = 2
  assert.equal(full(thai, 'banh_mi_op_la'), true)
  assert.equal(full(dap, 'banh_mi_op_la'), true)
  // món nấu 5 lần (người chơi cũ): bước kiểu cũ chỉ ruy băng gọn; loại mới chưa xem → đầy đủ
  st.recipes.banh_mi_op_la.cooks = 5
  st.recipes.tra_tac.cooks = 40
  assert.equal(full(thai, 'banh_mi_op_la'), false)
  assert.equal(full(dap, 'banh_mi_op_la'), true, 'Đập trứng lần đầu: thẻ đầy đủ')
  assert.equal(full(lac, 'tra_tac'), true, 'Lắc lần đầu: thẻ đầy đủ')
  // đã xem tour của loại đó → ruy băng gọn (loại khác chưa xem vẫn đầy đủ)
  markSeen(st, ['bep_dap'])
  assert.equal(full(dap, 'banh_mi_op_la'), false)
  assert.equal(full(lac, 'tra_tac'), true)
  // tắt "Hướng dẫn lần đầu" không ẩn thẻ đầy đủ của loại chưa gặp (bếp tự ghi đã xem sau lần đầu — kitchen.js markTypeSeen)
  setToursEnabled(st, false)
  assert.equal(full(lac, 'tra_tac'), true)
  // nấu thử (Chợ Công Thức, trạng thái hộp cát): chỉ theo số lần nấu
  assert.equal(full(lac, 'tra_tac', { tasting: true }), false)
  st.recipes.tra_tac.cooks = 0
  assert.equal(full(lac, 'tra_tac', { tasting: true }), true)
  // thiếu tiến độ món / bản lưu thiếu trường tour: đầy đủ (an toàn)
  assert.equal(stepCardFull(dap, {}, { recipeId: 'banh_mi_op_la' }), true)
  assert.equal(stepCardFull(dap, { recipes: { banh_mi_op_la: { cooks: 9 } } }, { recipeId: 'banh_mi_op_la' }), true)
  assert.equal(stepCardFull(thai, { recipes: { banh_mi_op_la: { cooks: 9 } } }, { recipeId: 'banh_mi_op_la' }), false)
  // startStep dùng luật này, thẻ đầy đủ vừa vào bước thì ghi đã xem khi tour không tự hiện được
  const k = read('src/ui/screens/kitchen.js')
  const start = k.slice(k.indexOf('function startStep('), k.indexOf('function onStepResult('))
  assert.match(start, /stepCardFull\(step, S\(\)/)
  assert.match(start, /markTypeSeen\(step\.type\)/)
  assert.match(k, /canAuto\(id\)/)
})

test('chế độ tập trung: service.js bật .is-focus (khung < 760px, tab Bếp, bếp đang nấu), game.css ẩn dải khách + thanh 4 khâu', async () => {
  const svc = await import('../../src/ui/screens/service.js')
  assert.equal(svc.FOCUS_MAX_H, 760)
  const src = read('src/ui/screens/service.js')
  assert.match(src, /classList\.toggle\('is-focus'/)
  assert.match(src, /onFocus:/)
  const css = read('css/game.css')
  assert.match(css, /\.service-screen\.is-focus > \.street \{ display: none; \}/)
  assert.match(css, /\.service-screen\.is-focus > \.progress4 \{[^}]*visibility: hidden/)
  // dây phiếu không bị ẩn trong chế độ tập trung
  assert.doesNotMatch(css, /\.is-focus > \.ticket-rail \{[^}]*display: none/)
  // bếp báo trạng thái nấu trước khi dựng mini-game (render → syncFocus trước renderChon; startStep → syncFocus)
  const k = read('src/ui/screens/kitchen.js')
  const render = k.slice(k.indexOf('function render()'), k.indexOf('function diSauLine'))
  assert.ok(render.indexOf('syncFocus()') > 0 && render.indexOf('syncFocus()') < render.indexOf('renderChon()'))
  const start = k.slice(k.indexOf('function startStep('), k.indexOf('function onStepResult('))
  assert.ok(start.indexOf('syncFocus()') > 0 && start.indexOf('syncFocus()') < start.indexOf('playStep('))
})

test('kitchen.js: dùng app.vfx (không tự tạo vfx), giữ lớp móc và testid cho e2e / hướng dẫn', () => {
  const k = read('src/ui/screens/kitchen.js')
  assert.doesNotMatch(k, /createVfx\(/)
  for (const id of ['step-hint', 'board', 'board-ready', 'finish-dish', 'abandon-dish', 'step-sheet', 'step-start', 'auto-step',
    'retry-step', 'critical-prompt', 'prompt-close', 'confirm-ok', 'confirm-cancel', 'kitchen-back', 'cook-resume', 'serve-ticket',
    'dish-result', 'recipe-card', 'sheet-close']) {
    if (id === 'step-hint') continue   // thẻ vào bước (components/step-card.js) giữ testid này
    assert.ok(k.includes(`'${id}'`), id)
  }
  for (const pre of ["'board-step-'", "'method-'", "'cook-line-'", "'ticket-'", "'card-left-'"]) assert.ok(k.includes(pre), pre)
  for (const cls of ["'k-step'", "'is-available'", "'is-done'", "'is-locked'", "'is-critical'", "'has-method'", "'k-step-st'", "'k-ticket'", "'k-line'", "'k-toolbar'", "'k-stage-wrap'"]) {
    assert.ok(k.includes(cls), cls)
  }
  assert.match(k, /createStepCard\(/)
  assert.match(k, /showStepResult\(/)
  assert.match(k, /createDishReveal\(/)
  assert.match(k, /'card-' \+/)
})
