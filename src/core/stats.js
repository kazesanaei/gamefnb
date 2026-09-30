// Dịch sự kiện miền trên bus thành "tín hiệu" meta (nhiệm vụ, chuỗi, Tem sự kiện đọc chung) và
// cập nhật bộ đếm stats M2. Hàm thuần: nhận state, sửa state.track/state.stats/state.progression.
//
// Tín hiệu: served, five_star, change_correct, change_wrong, change_optimal, readback_clean, qr_ok,
// fake_detected, perfect_step, perfect_thai, perfect_lua, dish_good, dish_excellent, dish_clean,
// dish_new_recipe (n = số phần), dish_portions (mọi món, n = số phần, kèm recipeId), good_rating (khách từ 4 sao:
// tín hiệu thay thế cho five_star khi bật Hỗ trợ thao tác), shift_no_loss (không tính khách dùng ảnh chuyển khoản
// giả đã bị bắt), revenue (n = doanh thu ca).

export const SIGNALS = Object.freeze(['served', 'five_star', 'good_rating', 'change_correct', 'change_wrong', 'change_optimal',
  'readback_clean', 'qr_ok', 'fake_detected', 'perfect_step', 'perfect_thai', 'perfect_lua', 'dish_good',
  'dish_excellent', 'dish_clean', 'dish_new_recipe', 'dish_portions', 'shift_no_loss', 'revenue'])

const GOOD = ['ngon', 'tuyet_hao']
// mã lỗi nguyên liệu trong DishResult.errors (qua ING_ERROR_REVIEW của scoring.js)
const ING_ERROR_CODES = ['thieu_nguyen_lieu', 'thua_nguyen_lieu', 'bay_nguyen_lieu', 'sai_ghi_chu']

// Bản tổng kết rút gọn của ca vừa kết thúc (state.history) để lấy doanh thu, review muộn.
export function lastHistory(state, day) {
  const h = state.history || []
  const last = h[h.length - 1]
  return last && (day === undefined || last.day === day) ? last : null
}

function bump(state, key, n = 1) {
  if (!state.stats) return
  state.stats[key] = (Number(state.stats[key]) || 0) + n
}

function track(state) {
  if (!state.track || typeof state.track !== 'object') state.track = { rbCustomer: null, rbFirst: false }
  return state.track
}

function prog(state) {
  const p = state.progression || (state.progression = {})
  if (!p.records) p.records = { bestProfit: null, mostFiveStars: 0, longestStreak: 0 }
  if (!p.cur) p.cur = { fiveStars: 0 }
  return p
}

// Món mua trong `days` ngày game gần nhất tính tới ngày game `atDay` (mặc định ngày hiện tại; boughtDay > 0).
export function isRecentRecipe(state, recipeId, days = 3, atDay = state.day) {
  const p = state.recipes && state.recipes[recipeId]
  return !!p && p.boughtDay > 0 && atDay - p.boughtDay >= 0 && atDay - p.boughtDay < days
}

// Trả mảng [{sig, n, recipeId?}] cho một sự kiện miền. Cập nhật stats/track/kỷ lục.
// Payload giữ đúng hợp đồng M1; thông tin thêm đọc từ state lúc sự kiện phát (quầy, phiên bếp, lịch sử ca),
// hoặc từ trường bổ sung của payload nếu có (due, attempt, qty, ingErrors, counterStreak, revenue).
export function signalsFor(state, type, payload = {}) {
  const out = []
  const p = payload || {}
  const sh = state.shift
  switch (type) {
    case 'counter.begin': {
      const t = track(state)
      t.rbCustomer = p.customerId ?? null
      t.rbFirst = true
      break
    }
    case 'order.readback': {
      const t = track(state)
      if (t.rbFirst) {
        t.rbFirst = false
        if ((p.errorsFound || 0) + (p.errorsMissed || 0) === 0) {
          out.push({ sig: 'readback_clean', n: 1 })
          bump(state, 'readbackClean')
        }
      }
      break
    }
    case 'change.given': {
      // chỉ tính lần đưa đầu và khi thật sự phải thối (due > 0)
      const c = sh && sh.counter
      const attempt = p.attempt ?? (c ? c.changeAttempts : 1)
      const due = p.due ?? (c ? c.changeDue : 0)
      if (attempt !== 1 || !(due > 0)) break
      if (p.correct) {
        out.push({ sig: 'change_correct', n: 1 })
        if (p.optimal) { out.push({ sig: 'change_optimal', n: 1 }); bump(state, 'changeOptimal') }
      } else {
        out.push({ sig: 'change_wrong', n: 1 })
      }
      break
    }
    case 'qr.confirmed': {
      if (!p.fake) out.push({ sig: 'qr_ok', n: 1 })
      else if (p.blocked) { out.push({ sig: 'fake_detected', n: 1 }); bump(state, 'fakeQrDetected') }
      break
    }
    case 'qr.rejected': {
      // bị Loa chặn đã tính ở qr.confirmed {blocked}; ở đây chỉ tính người chơi tự từ chối ảnh giả
      if (p.fake && !p.blocked) { out.push({ sig: 'fake_detected', n: 1 }); bump(state, 'fakeQrDetected') }
      break
    }
    case 'step.done': {
      if (!p.auto && (Number(p.score) || 0) >= 90) {
        out.push({ sig: 'perfect_step', n: 1 })
        if (p.type === 'thai') { out.push({ sig: 'perfect_thai', n: 1 }); bump(state, 'perfectThai') }
        if (p.type === 'lua') { out.push({ sig: 'perfect_lua', n: 1 }); bump(state, 'perfectLua') }
      }
      break
    }
    case 'dish.done': {
      const rid = p.recipeId
      const res = sh && sh.cook && sh.cook.result && sh.cook.result.recipeId === rid ? sh.cook.result : null
      const qty = p.qty ?? (res ? res.qty : 1)
      const ingErrors = p.ingErrors ?? (res ? (res.ingErrors || []).length : (p.errors || []).filter(e => ING_ERROR_CODES.includes(e)).length)
      if (GOOD.includes(p.grade)) { out.push({ sig: 'dish_good', n: 1, recipeId: rid }); bump(state, 'goodDishes') }
      if (p.grade === 'tuyet_hao') { out.push({ sig: 'dish_excellent', n: 1, recipeId: rid }); bump(state, 'excellentDishes') }
      if (ingErrors === 0 && p.grade !== 'hong') out.push({ sig: 'dish_clean', n: 1, recipeId: rid })
      if (rid && isRecentRecipe(state, rid, 3)) out.push({ sig: 'dish_new_recipe', n: Math.max(1, Number(qty) || 1), recipeId: rid })
      if (rid) out.push({ sig: 'dish_portions', n: Math.max(1, Number(qty) || 1), recipeId: rid })
      break
    }
    case 'customer.rated': {
      out.push({ sig: 'served', n: 1 })
      if (p.stars >= 4) out.push({ sig: 'good_rating', n: 1 })
      if (p.stars === 5) {
        out.push({ sig: 'five_star', n: 1 })
        bump(state, 'fiveStarCustomers')
        prog(state).cur.fiveStars = (prog(state).cur.fiveStars || 0) + 1
      }
      break
    }
    case 'ticket.clipped': {
      // Hỗ trợ tính tiền: chuỗi "Quầy chuẩn" không được đếm, không ghi kỷ lục
      if (state.settings && state.settings.assistCash) break
      const pr = prog(state)
      const streak = Number(p.counterStreak ?? (sh ? sh.counterStreak : 0)) || 0
      if (streak > (pr.records.longestStreak || 0)) pr.records.longestStreak = streak
      break
    }
    case 'shift.started': {
      prog(state).cur.fiveStars = 0
      break
    }
    case 'shift.ended': {
      const h = lastHistory(state, p.day)
      // khách trả bằng ảnh chuyển khoản giả bị bắt (người chơi từ chối hoặc Loa chặn) là làm đúng, không tính "bỏ về"
      const scam = Number(p.scamCaught ?? (h ? h.scamCaught : 0)) || 0
      if ((p.served || 0) > 0 && Math.max(0, (p.lost || 0) - scam) === 0) out.push({ sig: 'shift_no_loss', n: 1 })
      const revenue = p.revenue ?? (h ? (h.cashSales || 0) + (h.qrSales || 0) : 0)
      if (revenue > 0) out.push({ sig: 'revenue', n: revenue })
      const pr = prog(state)
      if (typeof p.profit === 'number' && (pr.records.bestProfit === null || p.profit > pr.records.bestProfit)) pr.records.bestProfit = p.profit
      const five = pr.cur.fiveStars || 0
      if (five > (pr.records.mostFiveStars || 0)) pr.records.mostFiveStars = five
      pr.cur.fiveStars = 0
      break
    }
    case 'recipe.bought': bump(state, 'recipesBought'); break
    case 'upgrade.bought': bump(state, 'upgradesBought'); break
    default: break
  }
  return out
}
