// Tình huống trong ca (M3, src/core/incidents.js + src/data/incidents.js), DATA thật:
// xác suất theo mức Nhiều/Vừa/Ít (Ít chỉ tình huống tích cực), bảo hiểm 3 ca, không lặp 5 loại gần nhất,
// trần thiệt hại, chỉ bật giữa hai khách (không chen mini-game, không khi đang có khách ở quầy), tất định theo seed,
// hiệu ứng từng lựa chọn (khách thêm ca sau, sổ ghi nợ + trả nợ, đổi món sửa phiếu), tổng kết ca + bus.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState, refIncomeFor } from '../../src/core/state.js'
import { startShift, endShift, advance, isShiftOver } from '../../src/core/shift.js'
import { canMakeChange, drawerTotal } from '../../src/core/money.js'
import {
  planIncident, incidentDue, openIncident, resolveIncident, incidentView, incidentLossCap, expectedRevenue,
  incidentChance, miniGameBusy, ensureIncidents, itemCost
} from '../../src/core/incidents.js'
import { encodeSave, decodeSave, migrate } from '../../src/core/save.js'
import { customerStars } from '../../src/core/scoring.js'
import { playShift, counterStep, cookTicket, handleIncident } from '../helpers/perfect-player.mjs'

function makeCtx() {
  const events = []
  return { data: DATA, events, emit: (type, payload) => events.push({ type, payload }) }
}

function stateAt(seed, day, freq = 'vua') {
  const s = defaultState(seed, DATA)
  s.shopName = 'Xe thử tình huống'
  s.day = day
  s.settings.incidentFrequency = freq
  return s
}

// Ép tình huống `id` cho ca đang mở (dùng để kiểm từng loại): kế hoạch như planIncident, xuất hiện sau `after` khách.
function forceIncident(s, ctx, id, after = 0) {
  const sh = s.shift
  sh.incident = { id, afterClips: after, status: 'cho', rng: (s.seed * 7919 + 13) >>> 0, cap: incidentLossCap(s, sh, ctx), guaranteed: true, detail: null, choice: null, result: null }
  return sh.incident
}

// Quầy phục vụ tới khi kẹp đủ `n` phiếu, dừng ngay sau lần kẹp thứ n (phiếu cuối chưa nấu).
// Dây phiếu đầy thì nấu phiếu cũ nhất cho có chỗ.
function clipCustomers(s, ctx, n) {
  let guard = 0
  while ((s.shift.receipts || []).length < n) {
    if (++guard > 20000) throw new Error('không kẹp đủ phiếu')
    if (counterStep(s, ctx)) continue
    const c = s.shift.counter
    if (c && c.stage === 'tinh_tien' && s.shift.tickets.length >= 3) { cookTicket(s, ctx, s.shift.tickets[0]); continue }
    advance(s, 0.5, ctx)
  }
}

test('xác suất có tình huống theo mức Nhiều/Vừa/Ít (50% / 35% / 15%); "Ít" chỉ tình huống tích cực; trước ngày 3 không có', () => {
  const ctx = makeCtx()
  const N = 1200
  for (const [freq, p] of [['nhieu', 0.5], ['vua', 0.35], ['it', 0.15]]) {
    let hit = 0
    const kinds = new Set()
    for (let seed = 1; seed <= N; seed++) {
      const s = stateAt(seed, 5 + (seed % 6), freq)
      assert.equal(incidentChance(s, ctx), p)
      const sh = startShift(s, ctx)
      if (sh.incident) { hit++; kinds.add(sh.incident.id) }
    }
    const rate = hit / N
    assert.ok(Math.abs(rate - p) < 0.045, `${freq}: tỉ lệ ${rate.toFixed(3)} lệch ${p}`)
    if (freq === 'it') assert.deepEqual([...kinds], ['khach_mo_hang'], 'mức Ít chỉ có tình huống tích cực')
    else assert.equal(kinds.size, 3, `${freq}: đủ 3 loại tình huống`)
  }
  for (const day of [1, 2]) {
    for (let seed = 1; seed <= 200; seed++) {
      const s = stateAt(seed, day, 'nhieu')
      s.incidents.since = 5
      assert.equal(startShift(s, ctx).incident, null, 'trước ngày 3 không có tình huống')
    }
  }
  // positive trong dữ liệu: chỉ khách mở hàng
  assert.deepEqual(Object.values(DATA.INCIDENTS).filter(d => d.positive).map(d => d.id), ['khach_mo_hang'])
})

test('bảo hiểm: 3 ca liền không có tình huống thì ca kế chắc chắn có; ca có tình huống đặt lại bộ đếm', () => {
  const ctx = makeCtx()
  for (const freq of ['nhieu', 'vua', 'it']) {
    for (let seed = 1; seed <= 150; seed++) {
      const s = stateAt(seed, 4 + (seed % 7), freq)
      s.incidents.since = 3
      assert.equal(incidentChance(s, ctx), 1)
      const sh = startShift(s, ctx)
      assert.ok(sh.incident, `${freq} seed ${seed}: bảo hiểm phải ra tình huống`)
      assert.equal(sh.incident.guaranteed, true)
    }
  }
  // chơi thật nhiều ca ở mức Ít, luôn xử lý tình huống khi hiện: không bao giờ 4 ca liền (từ ngày 3) không có
  for (const seed of [3, 11, 29]) {
    const s = stateAt(seed, 1, 'it')
    let gap = 0, maxGap = 0, seen = 0
    for (let k = 0; k < 16; k++) {
      const day = s.day
      const r = playShift(s, ctx, { incident: v => v.safeId })
      if (day < 3) { assert.equal(r.incidents.length, 0); continue }
      if (r.incidents.length) { assert.equal(r.incidents.length, 1, 'tối đa 1 tình huống mỗi ca'); seen++; gap = 0; assert.equal(s.incidents.since, 0) } else { gap++; assert.equal(s.incidents.since, gap) }
      maxGap = Math.max(maxGap, gap)
    }
    assert.ok(maxGap <= 3, `seed ${seed}: ${maxGap} ca liền không có tình huống`)
    assert.ok(seen >= 3)
  }
})

test('không lặp 5 tình huống gần nhất khi còn loại khác; hết loại mới thì lấy loại lâu chưa gặp nhất', () => {
  const ctx = makeCtx()
  const pickWith = (recent, seed) => {
    const s = stateAt(seed, 6, 'nhieu')
    s.incidents.since = 3
    s.incidents.recent = recent.slice()
    return startShift(s, ctx).incident.id
  }
  for (let seed = 1; seed <= 60; seed++) {
    assert.equal(pickWith(['khach_mo_hang', 'ghi_no'], seed), 'doi_y')
    assert.equal(pickWith(['doi_y', 'khach_mo_hang', 'ghi_no'], seed), 'doi_y', 'cả 3 đều trong 5 gần nhất → loại lâu nhất')
    const id = pickWith(['ghi_no', 'ghi_no', 'doi_y'], seed)
    assert.ok(id === 'khach_mo_hang', `còn loại chưa gặp thì phải lấy: ${id}`)
  }
  // chơi liên tục mức Nhiều: hai tình huống liền nhau không bao giờ trùng loại (luôn còn ít nhất 2 loại bốc được)
  for (const seed of [5, 17]) {
    const s = stateAt(seed, 3, 'nhieu')
    const seq = []
    for (let k = 0; k < 18; k++) {
      const r = playShift(s, ctx, { incident: v => v.safeId })
      for (const x of r.incidents) seq.push(x.view.id)
    }
    assert.ok(seq.length >= 6, 'có đủ tình huống để kiểm')
    for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i], seq[i - 1], `lặp tình huống: ${seq.join(', ')}`)
    assert.equal(new Set(seq).size, 3)
    assert.deepEqual(s.incidents.recent, seq.slice(-10))
  }
})

test('trần thiệt hại: min(10% doanh thu dự kiến, 0,5 thu nhập tham chiếu); mọi lựa chọn không lỗ quá trần', () => {
  const ctx = makeCtx()
  let checked = 0
  for (let seed = 1; seed <= 80; seed++) {
    const day = 3 + (seed % 9)
    const s = stateAt(seed, day, 'nhieu')
    s.incidents.since = 3
    const sh = startShift(s, ctx)
    const cap = incidentLossCap(s, sh, ctx)
    assert.equal(cap % 500, 0)
    assert.ok(cap <= 0.5 * refIncomeFor(ctx, day) && cap <= 0.1 * expectedRevenue(sh, ctx))
    assert.equal(sh.incident.cap, cap)
    // mọi lựa chọn của tình huống đã bốc: thiệt hại (giá vốn không có tiền bù) ≤ trần
    const inc = sh.incident
    if (inc.afterClips) clipCustomers(s, ctx, inc.afterClips)
    const view0 = openIncident(s, ctx)
    // khách đổi ý mà khách vừa rồi đã gọi đủ mọi món: chờ khách sau (không kiểm ở đây)
    if (!view0) { assert.equal(inc.id, 'doi_y', `seed ${seed}: tình huống ${inc.id} không mở được`); continue }
    const snap = JSON.stringify(s)
    for (const c of view0.choices.filter(x => x.available)) {
      const t = JSON.parse(snap)
      const w0 = t.wallet
      const L0 = { ...t.shift.ledger }
      const r = resolveIncident(t, c.id, ctx)
      assert.ok(r.ok, r.reason)
      assert.ok(r.effects.loss <= cap, `${inc.id}/${c.id}: lỗ ${r.effects.loss} > trần ${cap}`)
      // tiền ra khỏi ví/két ngay (giá vốn) trừ tiền vào không quá trần
      const L = t.shift.ledger
      const net = (L.cash - L0.cash) + (L.qr - L0.qr) - (t.wallet < w0 ? w0 - t.wallet : 0)
      assert.ok(net >= -cap, `${inc.id}/${c.id}: ròng ${net} < −${cap}`)
      checked++
    }
  }
  assert.ok(checked > 120, `chỉ kiểm được ${checked} lựa chọn`)
  // mỗi loại: thiệt hại tối đa khai báo (giá vốn trà tắc) nhỏ hơn trần ở mọi ngày có tình huống
  const s = stateAt(1, 3)
  startShift(s, ctx)
  assert.equal(itemCost(ctx, s.shift, 'tra_tac', 1), 3000)
  assert.equal(itemCost(ctx, s.shift, 'tra_tac', 2), 6000)
})

test('chỉ bật giữa hai khách: không khi có khách ở quầy, không khi đang chơi mini-game; khách mở hàng trước khách đầu', () => {
  const ctx = makeCtx()
  const s = stateAt(9, 5)
  startShift(s, ctx)
  forceIncident(s, ctx, 'ghi_no', 1)
  assert.equal(incidentDue(s, ctx), false, 'chưa đủ 1 khách xong quầy')
  // có khách ở quầy → không bật
  while (!s.shift.counter) advance(s, 0.5, ctx)
  assert.equal(incidentDue(s, ctx), false)
  clipCustomers(s, ctx, 1)
  assert.equal(s.shift.counter, null)
  assert.equal(incidentDue(s, ctx), true, 'vừa kẹp phiếu, quầy trống → bật')
  // đang chơi mini-game (bước Chọn / một bước trên Thớt) → không bật
  s.shift.cook = { ticketId: 'p1', lineIndex: 0, phase: 'chon', steps: {} }
  assert.equal(miniGameBusy(s.shift), true)
  assert.equal(incidentDue(s, ctx), false)
  s.shift.cook = { ticketId: 'p1', lineIndex: 0, phase: 'thot', steps: {}, activeStepId: 'rua_dua' }
  assert.equal(incidentDue(s, ctx), false)
  s.shift.cook = { ticketId: 'p1', lineIndex: 0, phase: 'thot', steps: {}, activeStepId: null, retryPending: null }
  assert.equal(incidentDue(s, ctx), true, 'trên Thớt nhưng không đang chơi bước nào')
  s.shift.cook = null
  // khách kế bước lên quầy → không bật nữa (đợi lần trống sau)
  while (!s.shift.counter) advance(s, 0.5, ctx)
  assert.equal(incidentDue(s, ctx), false)
  assert.equal(openIncident(s, ctx), null)

  // khách mở hàng: chỉ trước khi bán được gì
  const m = stateAt(9, 5)
  startShift(m, ctx)
  forceIncident(m, ctx, 'khach_mo_hang', 0)
  assert.equal(incidentDue(m, ctx), true)
  clipCustomers(m, ctx, 1)
  assert.equal(incidentDue(m, ctx), false, 'đã bán rồi thì không còn là mở hàng')
})

test('tất định theo seed: cùng save → cùng kế hoạch, cùng chi tiết, cùng kết quả ngẫu nhiên (nợ trả hay không, sao)', () => {
  const run = seed => {
    const ctx = makeCtx()
    const s = stateAt(seed, 6, 'nhieu')
    s.incidents.since = 3
    const r = playShift(s, ctx, { incident: v => v.choices.find(c => c.available && !c.safe) ? v.choices.find(c => c.available && !c.safe).id : v.safeId })
    return JSON.stringify({ inc: r.incidents.map(x => [x.view.text, x.res.text, x.res.effects]), debts: s.incidents.debts, wallet: s.wallet })
  }
  for (const seed of [2, 6, 25, 31]) assert.equal(run(seed), run(seed))
  // tải lại giữa ca (lưu/nạp) không đổi tình huống đã bốc
  const ctx = makeCtx()
  const s = stateAt(25, 5, 'nhieu')
  s.incidents.since = 3
  startShift(s, ctx)
  const back = migrate(decodeSave(encodeSave(s)), DATA)
  assert.deepEqual(back.shift.incident, s.shift.incident)
  assert.deepEqual(back.incidents, s.incidents)
})

test('khách mở hàng: thối hết (khi két đủ), mời QR (từ ngày 4), tặng ly trà → ca sau thêm 1 khách; mở thẻ Đủ tiền lẻ', () => {
  const ctx = makeCtx()
  // ngày 3, két đầu ca 200.000đ không thối nổi 490.000đ; chưa có QR → chỉ còn cách tặng (an toàn)
  const s = stateAt(4, 3)
  startShift(s, ctx)
  forceIncident(s, ctx, 'khach_mo_hang', 0)
  const v = openIncident(s, ctx)
  assert.equal(v.id, 'khach_mo_hang')
  assert.match(v.text, /500\.000đ/)
  const by = id => v.choices.find(c => c.id === id)
  assert.equal(by('thoi_het').available, false)
  assert.match(by('thoi_het').reason, /không đủ thối 490\.000đ/)
  assert.equal(by('moi_qr').available, false)
  assert.match(by('moi_qr').reason, /ngày 4/)
  assert.equal(by('tang').safe, true)
  assert.equal(by('tang').available, true)
  assert.match(by('tang').cost, /3\.000đ giá vốn/)
  assert.equal(resolveIncident(s, 'thoi_het', ctx).reason, 'khong_duoc')
  const w0 = s.wallet
  const r = resolveIncident(s, 'tang', ctx)
  assert.ok(r.ok)
  assert.equal(s.wallet, w0 - 3000)
  assert.equal(s.shift.ledger.cogs, 3000)
  // rep: danh tiếng thay thế nếu tới ca sau vẫn đủ trần khách (vòng soát lỗi M3)
  assert.deepEqual(s.incidents.bonus, { day: 3 + 1, customers: 1, rep: 2 })
  assert.ok(s.tipsSeen.includes('du_tien_le'), 'mở thẻ Mẹo nghề "Đủ tiền lẻ đầu ca"')
  assert.equal(r.tipId, 'du_tien_le')
  assert.ok(ctx.events.some(e => e.type === 'incident.resolved' && e.payload.id === 'khach_mo_hang' && e.payload.choice === 'tang' && e.payload.safe === true))
  assert.equal(resolveIncident(s, 'tang', ctx).ok, false, 'mỗi tình huống xử lý 1 lần')
  // ca kế: thêm 1 khách (trong trần 8)
  while (!isShiftOver(s)) {
    while (counterStep(s, ctx)) { /* quầy */ }
    for (const t of s.shift.tickets.slice()) cookTicket(s, ctx, t)
    if (!isShiftOver(s)) advance(s, 0.5, ctx)
  }
  const sum = endShift(s, ctx)
  assert.equal(sum.incidents.length, 1)
  assert.equal(sum.incidents[0].choice, 'tang')
  assert.equal(s.history[s.history.length - 1].incidents[0].id, 'khach_mo_hang')
  const n0 = (() => { const t = JSON.parse(JSON.stringify(s)); t.incidents.bonus = null; return Object.keys(startShift(t, ctx).customers).length })()
  const sh2 = startShift(s, ctx)
  assert.equal(Object.keys(sh2.customers).length, Math.min(8, n0 + 1))
  assert.equal(s.incidents.bonus, null, 'dùng xong thì bỏ')

  // két đủ tiền lẻ + ngày có QR: thối hết (két nhận tờ 500.000đ, trả 490.000đ) và mời QR
  const q = stateAt(4, 6)
  startShift(q, ctx)
  q.shift.drawer = { 5000: 10, 10000: 10, 20000: 10, 50000: 5, 100000: 3, 200000: 0, 500000: 0 }
  q.shift.floatAmount = drawerTotal(q.shift.drawer)
  forceIncident(q, ctx, 'khach_mo_hang', 0)
  const snap = JSON.stringify(q)
  const v2 = openIncident(q, ctx)
  assert.equal(v2.choices.find(c => c.id === 'thoi_het').available, true)
  assert.ok(canMakeChange(490000, q.shift.drawer))
  const before = drawerTotal(q.shift.drawer)
  assert.ok(resolveIncident(q, 'thoi_het', ctx).ok)
  assert.equal(drawerTotal(q.shift.drawer), before + 10000)
  assert.equal(q.shift.drawer[500000], 1)
  assert.equal(q.shift.ledger.cash, 10000)
  const q2 = JSON.parse(snap)
  openIncident(q2, ctx)
  assert.ok(resolveIncident(q2, 'moi_qr', ctx).ok)
  assert.equal(q2.shift.qrBalance, 10000)
  assert.equal(q2.shift.ledger.qr, 10000)
})

test('khách quen xin ghi nợ: cho nợ (+2 danh tiếng, 70% trả trong 3 ca, tiền vào lãi ca đó), từ chối (an toàn), tặng (+5)', () => {
  const ctx = makeCtx()
  let repaid = 0, total = 0
  for (let seed = 1; seed <= 60; seed++) {
    const s = stateAt(seed, 5)
    startShift(s, ctx)
    forceIncident(s, ctx, 'ghi_no', 1)
    clipCustomers(s, ctx, 1)
    const v = openIncident(s, ctx)
    assert.equal(v.id, 'ghi_no')
    assert.ok(['Cô Thu', 'Bạn Nam'].includes(v.who))
    assert.equal(v.safeId, 'tu_choi')
    const rep0 = s.shift.reputationGain
    const r = resolveIncident(s, 'cho_no', ctx)
    assert.ok(r.ok)
    assert.equal(s.shift.reputationGain - rep0, 2)
    assert.equal(r.effects.cost, 6000)
    const debt = s.incidents.debts[0]
    assert.equal(debt.amount, 20000)
    assert.equal(debt.dueDay, 5 + 3)
    total++
    // chơi tiếp tới hết 3 ca sau: nợ trả thì tiền vào đúng ca repayDay, ví = lãi (bất biến)
    const rest = playShift(s, ctx, {}) // (ca hiện tại đã mở: playShift trả lại ca đang dở)
    assert.equal(rest.summary.day, 5)
    for (let k = 0; k < 4; k++) {
      const r2 = playShift(s, ctx)
      assert.equal(r2.walletAfter - r2.walletBefore, r2.summary.profit - r2.summary.loanRepaid)
      if (r2.summary.debtIn) {
        assert.equal(r2.summary.debtIn, 20000)
        assert.equal(debt.repayDay, r2.summary.day)
        assert.ok(r2.summary.day >= 6 && r2.summary.day <= 8)
        repaid++
      }
    }
    const d = s.incidents.debts[0]
    assert.ok(d.status === 'da_tra' || d.status === 'quen', d.status)
    assert.equal(d.status === 'da_tra', !!d.repayDay)
  }
  const rate = repaid / total
  assert.ok(rate > 0.5 && rate < 0.9, `tỉ lệ trả nợ ${rate}`)
  // từ chối: không tốn gì; tặng: −6.000đ, +5 danh tiếng
  const s = stateAt(3, 5)
  startShift(s, ctx)
  forceIncident(s, ctx, 'ghi_no', 1)
  clipCustomers(s, ctx, 1)
  openIncident(s, ctx)
  const snap = JSON.stringify(s)
  const w = s.wallet
  assert.ok(resolveIncident(s, 'tu_choi', ctx).ok)
  assert.equal(s.wallet, w)
  assert.deepEqual(s.incidents.debts, [])
  const t = JSON.parse(snap)
  const rep0 = t.shift.reputationGain
  assert.ok(resolveIncident(t, 'tang', ctx).ok)
  assert.equal(t.wallet, w - 6000)
  assert.equal(t.shift.reputationGain - rep0, 5)
})

test('khách đổi ý: đổi món sửa phiếu bếp + phiếu thu + yêu cầu thật, thu/hoàn phần chênh; từ chối: 50% khách −1 sao', () => {
  const ctx = makeCtx()
  let lost = 0, n = 0
  for (let seed = 1; seed <= 40; seed++) {
    const s = stateAt(seed, 5)
    startShift(s, ctx)
    forceIncident(s, ctx, 'doi_y', 1)
    clipCustomers(s, ctx, 1)
    const v = openIncident(s, ctx)
    // khách gọi đủ mọi món trong thực đơn thì không còn món để đổi (tình huống chờ khách sau)
    if (!v) { assert.equal(incidentDue(s, ctx), false); continue }
    const det = s.shift.incident.detail
    const t0 = s.shift.tickets.find(t => t.id === det.ticketId)
    const cust = s.shift.customers[det.customerId]
    assert.equal(t0.lines[det.lineIndex].recipeId, det.fromId)
    const snap = JSON.stringify(s)
    // đổi món (an toàn)
    const L0 = { ...s.shift.ledger }
    const total0 = cust.receipt.total
    const r = resolveIncident(s, 'doi_mon', ctx)
    assert.ok(r.ok)
    const t1 = s.shift.tickets.find(t => t.id === det.ticketId)
    assert.equal(t1.lines[det.lineIndex].recipeId, det.toId)
    assert.ok(cust.request.some(l => l.recipeId === det.toId), 'yêu cầu thật đổi theo')
    assert.ok(!cust.request.some(l => l.recipeId === det.fromId && l.notes.join() === det.notes.join() && l.qty === det.qty))
    assert.equal(cust.receipt.total, total0 + det.diff)
    assert.equal(cust.receipt.lines[det.lineIndex].recipeId, det.toId)
    if (det.diff > 0) assert.equal((s.shift.ledger.cash - L0.cash) + (s.shift.ledger.qr - L0.qr), det.diff)
    if (det.diff < 0) assert.equal(s.shift.ledger.refunds - L0.refunds, -det.diff)
    // nấu theo phiếu mới → khách hài lòng (món đúng yêu cầu mới)
    const sheet = cookTicket(s, ctx, t1)
    assert.equal(sheet.stars, 5, 'nấu đúng món mới vẫn 5 sao')
    // từ chối lịch sự
    const u = JSON.parse(snap)
    const ru = resolveIncident(u, 'tu_choi', ctx)
    assert.ok(ru.ok)
    const cu = u.shift.customers[det.customerId]
    const pen = cu.penalties.filter(p => p.code === 'tu_choi_doi_mon')
    assert.equal(pen.length, ru.effects.starLoss)
    if (pen.length) {
      lost++
      // khách khó tính không bị trừ thêm vì đây không phải lỗi của quán
      const st = customerStars({ ...cu, strict: true }, [{ recipeId: det.fromId, qty: 1, q: 100, grade: 'tuyet_hao', ingErrors: [] }], DATA.RECIPES)
      assert.equal(st.stars, 4)
    }
    n++
  }
  assert.ok(n >= 20, `chỉ ${n} ca có khách đổi ý`)
  assert.ok(lost / n > 0.25 && lost / n < 0.75, `tỉ lệ phật ý ${lost}/${n}`)
})

test('tổng kết ghi nhận tình huống; bus incident.resolved; ví vẫn khớp lãi; lưu/tải giữ nguyên', () => {
  const kinds = new Set()
  for (let seed = 1; seed <= 40 && kinds.size < 3; seed++) {
    const ctx = makeCtx()
    const s = stateAt(seed, 5, 'nhieu')
    s.incidents.since = 3
    const r = playShift(s, ctx, { incident: v => v.safeId })
    assert.ok(r.incidents.length <= 1, 'tối đa 1 tình huống mỗi ca')
    if (!r.incidents.length) { assert.equal(s.incidents.since, 4); continue }
    kinds.add(r.incidents[0].view.id)
    assert.equal(r.walletAfter - r.walletBefore, r.summary.profit - r.summary.loanRepaid)
    const inc = r.summary.incidents[0]
    assert.equal(inc.id, r.incidents[0].view.id)
    assert.equal(inc.safe, true)
    assert.ok(inc.name && inc.label && inc.text)
    const ev = ctx.events.filter(e => e.type === 'incident.resolved')
    assert.equal(ev.length, 1)
    assert.deepEqual(Object.keys(ev[0].payload).sort(), ['choice', 'cost', 'day', 'id', 'loss', 'money', 'rep', 'safe'])
    assert.equal(s.incidents.total, 1)
    assert.equal(s.incidents.log[0].id, inc.id)
    const back = migrate(decodeSave(encodeSave(s)), DATA)
    assert.deepEqual(back, JSON.parse(JSON.stringify(s)))
  }
  assert.equal(kinds.size, 3, 'đủ 3 loại tình huống hiện ra khi chơi')
  // save cũ (v1/v2, chưa có tình huống, Sổ tay nghề) nạp được với mặc định
  const old = defaultState(1, DATA)
  delete old.incidents
  delete old.notebook
  const m = migrate(JSON.parse(JSON.stringify(old)), DATA)
  assert.deepEqual(m.incidents, { since: 0, recent: [], log: [], debts: [], bonus: null, total: 0 })
  assert.deepEqual(m.notebook, { claimed: [] })
  const bad = migrate({ ...JSON.parse(JSON.stringify(old)), incidents: { since: -4, recent: ['la', 'ghi_no'], debts: [{ id: 'x', amount: 'abc' }, 3], bonus: 'x' } }, DATA)
  assert.equal(bad.incidents.since, 0)
  assert.deepEqual(bad.incidents.recent, ['ghi_no'])
  assert.equal(bad.incidents.debts.length, 1)
  assert.equal(bad.incidents.debts[0].amount, 0)
  assert.equal(bad.incidents.bonus, null)
})

test('dữ liệu tình huống: mỗi loại có đúng 1 lựa chọn an toàn, chữ hiển thị có dấu, không rỗng', () => {
  for (const d of Object.values(DATA.INCIDENTS)) {
    assert.ok(d.name && d.text, d.id)
    assert.equal(d.choices.filter(c => c.safe).length, 1, `${d.id}: cần đúng 1 lựa chọn an toàn`)
    for (const c of d.choices) assert.ok(c.label && c.cost && c.result, `${d.id}/${c.id}`)
    assert.ok(/[à-ỹ]/i.test(d.text), `${d.id}: chữ tiếng Việt có dấu`)
  }
  const C = DATA.INCIDENT_CONFIG
  assert.deepEqual(C.chance, { nhieu: 0.5, vua: 0.35, it: 0.15 })
  assert.equal(C.guaranteeAfter, 3)
  assert.equal(C.noRepeat, 5)
  assert.equal(C.fromDay, 3)
  // lõi không cần tình huống khi dữ liệu thiếu (dữ liệu mẫu của test lõi)
  const s = defaultState(1)
  s.day = 5
  s.incidents.since = 9
  const sh = startShift(s, { data: { ...DATA, INCIDENTS: undefined }, emit() {} })
  assert.equal(sh.incident, null)
  assert.equal(planIncident(s, sh, { data: {} }), null)
  assert.equal(incidentView(s, { data: DATA }), null)
  assert.ok(ensureIncidents({}).recent)
})
