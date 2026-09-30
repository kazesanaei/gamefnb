// Tìm hạt giống (seed) cho các e2e phụ thuộc sự kiện ngày / tình huống trong ca (M4: đổi tần suất, luật tip, thêm loại
// sự kiện làm các seed cũ đổi kết quả). Chạy bằng lõi thật (Node, không cần trình duyệt), dựng save ĐÚNG như e2e rồi mở
// ca bằng startShift như giao diện (đồng hồ ?devNow của e2e) và kiểm điều kiện của từng kịch bản.
//
//   node tools/tim-seed.mjs                 → kiểm các seed đang dùng trong e2e và tìm seed đầu tiên hợp lệ (1..300)
//   node tools/tim-seed.mjs doi-y 1 500     → chỉ một kịch bản, dải seed [1, 500]
//
// Kịch bản (giữ các hàm dựng save giống hệt e2e tương ứng; sửa e2e thì sửa cả ở đây):
//   mua-ngay-4   tests/e2e/m2-ui.e2e.mjs: save 3 ca (từ 26/09/2026 08:00) → ngày game 4 là "Trời mưa".
//   ghi-no       tests/e2e/incident-notebook.e2e.mjs (1): save 4 ca, mức Nhiều + bảo hiểm → ca ngày 5 có đúng 1 tình
//                huống "Khách quen xin ghi nợ" sau khách thứ nhất (không có tình huống thứ hai, Tổng kết chỉ ghi 1).
//   mo-hang      tests/e2e/incident-notebook.e2e.mjs (2): ca ngày 5 bốc "Khách mở hàng" (trước khách đầu tiên).
//   doi-y        tests/e2e/incident-notebook.e2e.mjs (3): ca ngày 5 bốc "Khách đổi ý" sau khách thứ nhất và tình huống
//                thật sự bật được ngay sau khi kẹp phiếu khách thứ nhất.
//   tip          tests/e2e/m4-tip-events.e2e.mjs (1): ca ngày 5 dựng sẵn 2 phiếu đã nấu xong (tests/helpers/m4-saves.mjs
//                tipShiftSave), giao sau 12 giây game vẫn 5 sao: 1 phiếu hóa đơn < 20.000đ (tip 0), 1 phiếu ≥ 20.000đ (tip 5.000đ).
//   attp         tests/e2e/m4-tip-events.e2e.mjs (2): ngày có "Đoàn kiểm tra vệ sinh" lần 2 trong 7–14 ngày (builtAttpSave),
//                tình huống thứ nhất của ca là tình huống M4 mới, xuất hiện sau khách thứ nhất trở đi và bật được.
//   mon-hiem     tests/e2e/m4-rare.e2e.mjs: ghé "Xe ba gác trưa" 12:00 (lựa đúng hàng, 100 điểm), nấu thử mở Trà tắc mật ong
//                rừng, mở ca → khách đầu tiên gọi món hiếm.
// Ba kịch bản M4 dựng save bằng tests/helpers/m4-saves.mjs (dùng chung với e2e, không phải bản sao).
import { DATA } from '../src/data/index.js'
import { defaultState } from '../src/core/state.js'
import { makeNowInfo } from '../src/core/clock.js'
import { refreshMeta } from '../src/core/meta.js'
import { startShift, advance } from '../src/core/shift.js'
import { dayEventInfo } from '../src/core/events.js'
import { shiftIncidents, incidentDue, openIncident } from '../src/core/incidents.js'
import { serveTicket, startCook, submitChon, availableSteps, getStep, submitStep, finishDish } from '../src/core/kitchen.js'
import { startStall, finishStall } from '../src/core/rare.js'
import { startTasting, tastingSandbox, finishTasting } from '../src/core/shop.js'
import { requiredIngredients } from '../src/core/scoring.js'
import { playShift, counterStep } from '../tests/helpers/perfect-player.mjs'
import { makeMetaCtx, vn } from '../tests/helpers/meta-helpers.mjs'
import { tipShiftSave, TIP_AT, builtAttpSave, NEW_INCIDENTS, builtRareSave, RARE_AT } from '../tests/helpers/m4-saves.mjs'

// --- Dựng save như tests/e2e/m2-ui.e2e.mjs (builtSave) ---
function builtM2({ seed = 3, shifts = 3, at = '2026-09-26T08:00' } = {}) {
  const ctx = makeMetaCtx({ at, attach: true })
  const state = defaultState(seed, DATA)
  ctx.setState(state)
  state.shopName = 'Xe Kiểm Thử'
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  for (let i = 0; i < shifts; i++) {
    playShift(state, ctx)
    ctx.clock.t += 24 * 3600 * 1000
  }
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  return state
}

// --- Dựng save như tests/e2e/incident-notebook.e2e.mjs (builtSave) ---
function builtIncident(seed) {
  const ctx = makeMetaCtx({ at: '2026-09-26T08:00', attach: true })
  const state = defaultState(seed, DATA)
  ctx.setState(state)
  state.shopName = 'Xe Tình Huống'
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  for (let i = 0; i < 4; i++) {
    playShift(state, ctx)
    ctx.clock.t += 24 * 3600 * 1000
  }
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  state.settings.incidentFrequency = 'nhieu'
  state.incidents.since = 3
  state.checkin.lastDay = '2026-12-31'
  return state
}

// Mở ca như giao diện lúc ?devNow=2026-09-30T09:00 (bản sao, không đổi save đã dựng).
function openAt(state, at = '2026-09-30T09:00') {
  const s = JSON.parse(JSON.stringify(state))
  const ctx = { data: DATA, emit() {}, now: () => vn(at) }
  const sh = startShift(s, ctx)
  return { s, sh, ctx }
}

// Phục vụ bằng lõi tới khi kẹp đủ n phiếu (không nấu), trả true nếu tới được.
function clipUntil(s, ctx, n) {
  let guard = 0
  while ((s.shift.receipts || []).length < n) {
    if (++guard > 20000) return false
    if (counterStep(s, ctx)) continue
    if (s.shift.counter && s.shift.counter.stage === 'tinh_tien' && s.shift.tickets.length >= 3) return false
    advance(s, 0.5, ctx)
  }
  return true
}

const SCENARIOS = {
  'mua-ngay-4': {
    current: 3,
    where: 'tests/e2e/m2-ui.e2e.mjs (builtSave, seed mặc định)',
    ok(seed) {
      const st = builtM2({ seed })
      const info = dayEventInfo(st, st.day, { data: DATA })
      return st.day === 4 && info && info.id === 'troi_mua' ? 'ngày 4: Trời mưa' : null
    }
  },
  'ghi-no': {
    current: 93,
    where: 'tests/e2e/incident-notebook.e2e.mjs (1) builtSave(seed)',
    ok(seed) {
      const { s, sh, ctx } = openAt(builtIncident(seed))
      const list = shiftIncidents(sh)
      if (sh.day !== 5 || list.length !== 1 || list[0].id !== 'ghi_no' || list[0].afterClips !== 1) return null
      if (!clipUntil(s, ctx, 1) || !incidentDue(s, ctx)) return null
      const v = openIncident(s, ctx)
      return v && v.id === 'ghi_no' ? 'ghi nợ sau khách 1, không có tình huống thứ hai' : null
    }
  },
  'mo-hang': {
    current: 8,
    where: 'tests/e2e/incident-notebook.e2e.mjs (2) builtSave(seed)',
    ok(seed) {
      const { s, sh, ctx } = openAt(builtIncident(seed))
      const list = shiftIncidents(sh)
      if (sh.day !== 5 || !list.length || list[0].id !== 'khach_mo_hang' || list[0].afterClips !== 0) return null
      if (!incidentDue(s, ctx)) return null
      return `khách mở hàng đầu ca${list.length > 1 ? ` (+ ${list[1].id} sau khách ${list[1].afterClips})` : ''}`
    }
  },
  'doi-y': {
    current: 64,
    where: 'tests/e2e/incident-notebook.e2e.mjs (3) builtSave(seed)',
    ok(seed) {
      const { s, sh, ctx } = openAt(builtIncident(seed))
      const list = shiftIncidents(sh)
      if (sh.day !== 5 || !list.length || list[0].id !== 'doi_y' || list[0].afterClips !== 1) return null
      if (!clipUntil(s, ctx, 1) || !incidentDue(s, ctx)) return null
      const v = openIncident(s, ctx)
      return v && v.id === 'doi_y' ? `khách đổi ý sau khách 1${list.length > 1 ? ` (+ ${list[1].id} sau khách ${list[1].afterClips})` : ''}` : null
    }
  },
  tip: {
    current: 1,
    where: 'tests/e2e/m4-tip-events.e2e.mjs (1) tipShiftSave(seed)',
    ok(seed) {
      const { state } = tipShiftSave(seed)
      // e2e cũng kiểm sự kiện ngày của ca là Hội thi (có thưởng)
      if (!state.shift.mods.dayEvent || state.shift.mods.dayEvent.id !== 'hoi_thi_xe_sach') return null
      const c = JSON.parse(JSON.stringify(state))
      const ctx = { data: DATA, emit() {}, now: () => vn(TIP_AT) }
      advance(c, 12, ctx)
      const sheets = c.shift.tickets.map(t => serveTicket(c, t.id, ctx)).filter(Boolean)
      const low = sheets.find(x => x.stars === 5 && x.bill > 0 && x.bill < 20000 && x.tip === 0)
      const high = sheets.find(x => x.stars === 5 && x.bill >= 20000 && x.tip === 5000)
      return low && high ? `5 sao: hóa đơn ${low.bill}đ tip 0, hóa đơn ${high.bill}đ tip 5.000đ` : null
    }
  },
  attp: {
    current: 92,
    where: 'tests/e2e/m4-tip-events.e2e.mjs (2) builtAttpSave(seed)',
    ok(seed) {
      const b = builtAttpSave(seed)
      if (!b) return null
      // như giao diện: mở game (refreshMeta ở giờ ?devNow) rồi bấm "Mở hàng"
      const s = JSON.parse(JSON.stringify(b.state))
      const ctx = { data: DATA, emit() {}, now: () => vn(b.at) }
      refreshMeta(s, makeNowInfo(s, vn(b.at)), ctx)
      const sh = startShift(s, ctx)
      const list = shiftIncidents(sh)
      if (!sh.mods.dayEvent || sh.mods.dayEvent.id !== 'kiem_tra_attp') return null
      if (!list.length || !NEW_INCIDENTS.includes(list[0].id) || list[0].afterClips < 1) return null
      if (!clipUntil(s, ctx, list[0].afterClips) || !incidentDue(s, ctx)) return null
      const v = openIncident(s, ctx)
      return v && v.id === list[0].id
        ? `ngày ${sh.day} kiểm tra lần 2 (lần 1 ngày ${b.first}), ${list.map(x => `${x.id} sau khách ${x.afterClips}`).join(', ')}, mở ${b.at}`
        : null
    }
  },
  'mon-hiem': {
    current: 3,
    where: 'tests/e2e/m4-rare.e2e.mjs builtRareSave(seed)',
    ok(seed) {
      const s = JSON.parse(JSON.stringify(builtRareSave(seed)))
      const at = vn(RARE_AT)
      const ctx = { data: DATA, emit() {}, now: () => at }
      refreshMeta(s, makeNowInfo(s, at), ctx)
      const st = startStall(s, 'ba_gac_trua', makeNowInfo(s, at), ctx)
      if (!st.ok) return null
      finishStall(s, { score: 100, picked: st.game.goods, mistakes: 0 }, makeNowInfo(s, at), ctx)
      // nấu thử (hộp cát, mọi bước 90 điểm) → mở món
      if (!startTasting(s, 'tra_tac_mat_ong', ctx).ok) return null
      const sb = tastingSandbox(s, ctx)
      const cook = startCook(sb.state, 'thu1', 0, sb.ctx)
      submitChon(sb.state, requiredIngredients(DATA.RECIPES[cook.recipeId], []).required, 0, sb.ctx)
      let av
      while ((av = availableSteps(sb.state)).length) {
        const stp = getStep(sb.state, av[0])
        submitStep(sb.state, av[0], { score: 90, method: stp.method ? stp.method.correct : undefined }, sb.ctx)
      }
      finishDish(sb.state, sb.ctx)
      if (!finishTasting(s, ctx).unlocked) return null
      const sh = startShift(s, ctx)
      const first = sh.customers[sh.plan[0].customerId]
      const line = first.request.find(l => l.recipeId === 'tra_tac_mat_ong')
      if (!line) return null
      return `khách đầu gọi ${line.qty} Trà tắc mật ong rừng, kho mật ong ${s.rare.stock.mat_ong_rung} phần` +
        (shiftIncidents(sh).length ? ` (tình huống: ${shiftIncidents(sh).map(x => x.id + ' sau khách ' + x.afterClips).join(', ')})` : '')
    }
  }
}

const [only, from = '1', to = '300'] = process.argv.slice(2)
const names = only ? [only] : Object.keys(SCENARIOS)
let bad = 0
for (const name of names) {
  const sc = SCENARIOS[name]
  if (!sc) { console.error(`Không có kịch bản "${name}". Có: ${Object.keys(SCENARIOS).join(', ')}`); process.exit(2) }
  const cur = sc.ok(sc.current)
  console.log(`${name} — ${sc.where}`)
  console.log(`  seed đang dùng ${sc.current}: ${cur ? 'HỢP LỆ (' + cur + ')' : 'KHÔNG còn hợp lệ'}`)
  let found = null
  for (let seed = Number(from); seed <= Number(to); seed++) {
    const r = sc.ok(seed)
    if (r) { found = { seed, r }; break }
  }
  console.log(found ? `  seed hợp lệ đầu tiên trong [${from}, ${to}]: ${found.seed} (${found.r})` : `  không tìm thấy seed trong [${from}, ${to}]`)
  if (!cur) bad++
}
process.exitCode = bad ? 1 : 0
