// Dựng save cho e2e M4 bằng lõi thật (người chơi hoàn hảo, đồng hồ giả). Dùng chung cho tests/e2e/m4-rare.e2e.mjs,
// tests/e2e/m4-tip-events.e2e.mjs và tools/tim-seed.mjs (tìm seed): sửa hàm dựng ở đây thì cả e2e lẫn công cụ tìm seed
// cùng đổi theo, không phải chép tay hai nơi.
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { startShift, advance } from '../../src/core/shift.js'
import { dayEventSeries } from '../../src/core/events.js'
import { startCook, submitChon, availableSteps, getStep, submitStep, finishDish, billOf } from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { playShift, counterStep } from './perfect-player.mjs'
import { makeMetaCtx, vn } from './meta-helpers.mjs'

const DAY_MS = 24 * 3600 * 1000

// 'YYYY-MM-DDTHH:mm' giờ Việt Nam của mốc ms (cho ?devNow).
export function vnStamp(ms) {
  return new Date(ms + 7 * 3600 * 1000).toISOString().slice(0, 16)
}

// Save đã chơi n ca bằng người chơi hoàn hảo, mỗi ca một ngày thật từ `from` (08:00). incident: cách xử lý tình huống
// trong ca (mặc định bỏ qua như perfect-player). freq: mức "Tần suất sự kiện" từ đầu (sự kiện ngày đã báo được chốt nên
// đổi mức sau khi chơi không đổi sự kiện của ngày kế tiếp). Không bật bảng điểm danh (đã điểm danh tới cuối năm).
// Trả { state, next } với next = mốc ms 08:00 của ngày thật kế tiếp (sau ca cuối).
export function playedSave(seed, n, { from = '2026-09-26T08:00', name = 'Xe Kiểm Thử', incident = null, freq = null } = {}) {
  const ctx = makeMetaCtx({ at: from, attach: true })
  const state = defaultState(seed, DATA)
  ctx.setState(state)
  state.shopName = name
  if (freq) state.settings.incidentFrequency = freq
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  for (let i = 0; i < n; i++) {
    playShift(state, ctx, incident ? { incident } : {})
    ctx.clock.t += DAY_MS
  }
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  state.checkin.lastDay = '2026-12-31'
  return { state, next: ctx.clock.t }
}

// Nấu xong mọi dòng của phiếu bằng lõi (điểm 100 mỗi bước) nhưng CHƯA giao: phiếu nằm trên dây ở trạng thái 'xong'.
export function cookOnly(state, ctx, ticket) {
  const R = ctx.data.RECIPES
  for (let i = 0; i < ticket.lines.length; i++) {
    if (ticket.done[i]) continue
    const cook = startCook(state, ticket.id, i, ctx)
    if (!cook) throw new Error('không mở được phiên nấu')
    const r = submitChon(state, requiredIngredients(R[cook.recipeId], cook.notes).required, 0, ctx)
    if (!r.ok) throw new Error('chọn nguyên liệu bị chặn')
    let av
    while ((av = availableSteps(state)).length) {
      const st = getStep(state, av[0])
      submitStep(state, av[0], { score: 100, method: st.method ? st.method.correct : undefined }, ctx)
    }
    finishDish(state, ctx)
  }
}

// ---------- m4-rare: phiên hàng, nấu thử mở món hiếm, món hiếm trong ca ----------

// Giờ mở game: 12:00 giờ Việt Nam → phiên "Xe ba gác trưa" (11:00–13:30) đang mở.
export const RARE_AT = '2026-09-30T12:00'

// Save 3 ca (ngày 26–28/09) → ngày game 4. Người chơi cũ đã nhận thư 0.4.0 (1 mảnh Trà tắc mật ong rừng + 1 phần Mật ong
// rừng) và gom thêm 2 mảnh → đủ 3 mảnh, chờ nấu thử.
export function builtRareSave(seed) {
  const { state } = playedSave(seed, 3, { name: 'Xe Hàng Hiếm' })
  state.rare.fragments.tra_tac_mat_ong = 3
  state.rare.stock.mat_ong_rung = Math.max(1, Number(state.rare.stock.mat_ong_rung) || 0)
  if (!state.rare.seen.includes('mat_ong_rung')) state.rare.seen.push('mat_ong_rung')
  return state
}

// ---------- m4-tip-events (1): phiếu chấm có tip / tip 0 ----------

export const TIP_AT = '2026-09-30T09:00'

// Save 4 ca → ngày game 5, mức tần suất Ít (ca này không có tình huống chen vào). Mở ca lúc TIP_AT, người chơi hoàn hảo
// phục vụ quầy bằng lõi tới khi kẹp 2 phiếu và nấu xong từng phiếu nhưng CHƯA giao: giao diện chỉ việc bấm "Giao cho
// khách" → phiếu chấm 5 sao (món Tuyệt hảo, không lỗi, chờ chưa lâu). Trả { state, tickets: [{ticketId, customerId, bill}] }.
// (Soát lỗi M4: sự kiện ngày của ngày kế tiếp được chốt lúc mở ca trước, nên mức Ít đặt từ đầu, không đổi sau khi chơi.)
export function tipShiftSave(seed) {
  const { state } = playedSave(seed, 4, { name: 'Xe Hũ Tip', freq: 'it' })
  const ctx = makeMetaCtx({ at: TIP_AT, attach: true })
  ctx.setState(state)
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  const sh = startShift(state, ctx)
  let guard = 0
  while (sh.tickets.length < 2) {
    if (++guard > 5000) throw new Error('không kẹp đủ 2 phiếu')
    if (counterStep(state, ctx)) {
      for (const t of sh.tickets) if (t.status !== 'xong') cookOnly(state, ctx, t)
      continue
    }
    advance(state, 0.5, ctx)
  }
  const tickets = sh.tickets.map(t => ({ ticketId: t.id, customerId: t.customerId, bill: billOf(sh.customers[t.customerId], DATA.RECIPES) }))
  return { state, tickets }
}

// ---------- m4-tip-events (2): kiểm tra vệ sinh tái phạm (phạt) + tình huống mới ----------

// Tình huống M4 chạy theo dữ liệu (8 loại mới).
export const NEW_INCIDENTS = Object.freeze(['tien_nghi_gia', 'shipper_chuyen_khoan', 'gas_het', 'khach_quen_vi', 've_chai',
  'doan_khach_hoi_duong', 'khach_que_gui_qua', 'nguoi_ban_dao'])

// Ngày game có "Đoàn kiểm tra vệ sinh an toàn thực phẩm" lần 2 trong 7–14 ngày sau lần 1 (chuỗi sự kiện ngày tất định
// theo seed, mức Vừa/Nhiều như nhau). → { first, second } | null.
export function attpDays(seed, upTo = 20) {
  const probe = defaultState(seed, DATA)
  const days = dayEventSeries(probe, upTo, { data: DATA })
  for (let a = 6; a <= upTo; a++) {
    if (days[a] !== 'kiem_tra_attp') continue
    for (let b = a + 7; b <= Math.min(upTo, a + 14); b++) if (days[b] === 'kiem_tra_attp') return { first: a, second: b }
  }
  return null
}

// Save chơi tới ngày game có lần kiểm tra thứ hai (từ 20/09, chọn cách an toàn ở mọi tình huống). Lần kiểm tra thứ nhất
// đã bị nhắc nhở (state.incidents.warn), nên ca này có lỗi vệ sinh là bị phạt. Tần suất Nhiều + bảo hiểm (since 3) → chắc
// chắn có tình huống. Trả { state, at (?devNow), first, second } | null.
export function builtAttpSave(seed) {
  const d = attpDays(seed)
  if (!d) return null
  const { state, next } = playedSave(seed, d.second - 1, { from: '2026-09-20T08:00', name: 'Xe Vệ Sinh', incident: v => v.safeId })
  state.settings.incidentFrequency = 'nhieu'
  state.incidents.since = 3
  state.incidents.warn = { ...(state.incidents.warn || {}), kiem_tra_attp: d.first }
  return { state, at: vnStamp(next + 3600 * 1000), first: d.first, second: d.second }
}

export { DATA, vn }
