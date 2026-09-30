// M4 bước 5 (docs/tham-khao/m4-thiet-ke.md mục B.3, F.5): tám tình huống trong ca chạy theo dữ liệu qua loại 'chung'
// (src/core/incidents.js) — mỗi tình huống có đúng 1 lựa chọn an toàn (không mất tiền, không chi tiền), xác suất các kết
// quả cộng bằng 1, thiệt hại tối đa ≤ trần (lossCap), tiền thưởng ≤ gainCap và trần ngày thật, kỳ vọng tiền từng lựa
// chọn khớp bảng B.3 (±500đ), kết quả bốc 1 lần lúc mở tình huống (tải lại không đổi), luật nhịp (không 2 tình huống
// xấu liền nhau, mức Ít chỉ loại tốt, không phạt), tỉ lệ thực 3 mức; hàng hiếm (khi có dữ liệu) vào state.rare.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DATA } from '../../src/data/index.js'
import { defaultState, refIncomeFor } from '../../src/core/state.js'
import { startShift, endShift, advance } from '../../src/core/shift.js'
import {
  shiftIncidents, incidentLossCap, incidentGainCap, incidentCandidates, ensureIncidents, openIncident, resolveIncident,
  incidentDue, genericMax, choiceExpectedMoney, rareIngredientIds
} from '../../src/core/incidents.js'
import { eventDayCaps } from '../../src/core/economy.js'
import { waitBudgetFor } from '../../src/core/order.js'
import { drawerTotal } from '../../src/core/money.js'
import { encodeSave, decodeSave, migrate } from '../../src/core/save.js'
import { playShift, counterStep, cookTicket } from '../helpers/perfect-player.mjs'
import { vn } from '../helpers/meta-helpers.mjs'

const GENERIC = ['tien_nghi_gia', 'shipper_chuyen_khoan', 'gas_het', 'khach_quen_vi', 've_chai', 'doan_khach_hoi_duong',
  'khach_que_gui_qua', 'nguoi_ban_dao']

// Bảng B.3: loại, từ ngày, trọng số; thiệt hại / tiền thưởng / tiền mất tối đa; kỳ vọng tiền từng lựa chọn.
const TABLE = {
  tien_nghi_gia: { kind: 'xau', from: 5, w: 0.7, max: [13000, 0, 10000], ev: { soi_ky: 3500, moi_qr: 7000, nhan_luon: -3000 } },
  shipper_chuyen_khoan: { kind: 'chon', from: 5, w: 1.2, max: [6000, 0, 0], ev: { cho_tien_ve: 10500, giao_luon: 9000 } },
  gas_het: { kind: 'xau', from: 5, w: 0.7, max: [12000, 0, 0], ev: { mua_binh: -12000, muon_bep: -3000 } },
  khach_quen_vi: { kind: 'tot', from: 3, w: 1, max: [0, 10000, 0], ev: { cat_giu: 7000, bao_loa: 0 } },
  ve_chai: { kind: 'tot', from: 3, w: 1, max: [0, 8000, 0], ev: { ban: 8000, cho: 0 } },
  doan_khach_hoi_duong: { kind: 'tot', from: 4, w: 1, max: [0, 0, 0], ev: { chi_duong: 0, moi_tra: 14000 } },
  khach_que_gui_qua: { kind: 'tot', from: 3, w: 1, max: [3000, 0, 0], ev: { moi_tra: -3000, nhan: 0 } },
  nguoi_ban_dao: { kind: 'chon', from: 4, w: 1.2, max: [8000, 0, 0], ev: { mua_2: -8000, mua_1: -4000, hen: 0 } }
}

function makeCtx(data = DATA, at = null) {
  const events = []
  const ctx = { data, events, emit: (type, payload) => events.push({ type, payload }) }
  if (at) { ctx.clock = { t: vn(at) }; ctx.now = () => ctx.clock.t }
  return ctx
}

function stateAt(seed, day, freq = 'vua') {
  const s = defaultState(seed, DATA)
  s.shopName = 'Xe thử tình huống M4'
  s.day = day
  s.settings.incidentFrequency = freq
  return s
}

// M4 bước 6 (sửa có chủ ý): dữ liệu thật đã có hàng hiếm (src/data/rare.js). Nhánh "chưa có dữ liệu hàng hiếm" dùng
// bản dữ liệu bỏ nguyên liệu hiếm và công thức hiếm (NORARE); bộ RARE giả dựng trên NORARE với đúng 1 nguyên liệu hiếm,
// 1 công thức hiếm để kết quả không phụ thuộc cách chọn nguyên liệu.
const NORARE = {
  ...DATA, RARE_CONFIG: null,
  INGREDIENTS: Object.fromEntries(Object.entries(DATA.INGREDIENTS).filter(([, g]) => !g.rare)),
  RECIPES: Object.fromEntries(Object.entries(DATA.RECIPES).filter(([, r]) => r.source !== 'hiem'))
}
const RARE = {
  ...NORARE,
  RARE_CONFIG: { stockMax: 6, fragmentsNeed: 3 },
  INGREDIENTS: { ...NORARE.INGREDIENTS, mat_ong_rung: { name: 'Mật ong rừng U Minh', icon: 'duong', cost: 3300, rare: true } },
  RECIPES: { ...NORARE.RECIPES, tra_tac_mat_ong: { ...DATA.RECIPES.tra_tac, id: 'tra_tac_mat_ong', name: 'Trà tắc mật ong rừng', source: 'hiem', baseRecipe: 'tra_tac', rare: { mat_ong_rung: 1 } } }
}

// Ép tình huống `id` cho ca đang mở, xuất hiện sau `after` khách (như planIncidents: có cap và gainCap).
function force(s, ctx, id, after = 0) {
  const sh = s.shift
  sh.incident = { id, kind: DATA.INCIDENTS[id].kind, order: 1, afterClips: after, status: 'cho', rng: (s.seed * 7919 + 13) >>> 0,
    cap: incidentLossCap(s, sh, ctx), gainCap: incidentGainCap(s, sh, ctx), guaranteed: true, detail: null, choice: null, result: null }
  sh.incidentQueue = []
  return sh.incident
}

// Phục vụ quầy tới khi kẹp đủ n phiếu (nấu phiếu cũ khi dây bếp đầy).
function clip(s, ctx, n) {
  let guard = 0
  while ((s.shift.receipts || []).length < n || s.shift.counter) {
    if (++guard > 20000) throw new Error('không kẹp đủ phiếu')
    if (counterStep(s, ctx)) continue
    if (s.shift.tickets.length) { cookTicket(s, ctx, s.shift.tickets[0]); continue }
    advance(s, 0.5, ctx)
  }
}

// Mở tình huống `id` ở ngày `day` (sau `after` khách), ép số bốc kết quả `roll`. Trả { s, view, inc }.
function openAt(id, { seed = 3, day = 9, after = 1, roll = null, data = DATA, prep = null } = {}) {
  const ctx = makeCtx(data)
  const s = stateAt(seed, day)
  if (prep) prep(s)
  startShift(s, ctx)
  const inc = force(s, ctx, id, after)
  clip(s, ctx, after)
  const view = openIncident(s, ctx)
  assert.ok(view, `không mở được ${id}`)
  if (roll !== null) inc.detail.roll = roll
  return { s, ctx, view, inc }
}

// Xử lý lựa chọn trên bản sao (không đổi state gốc). Trả { t, r, before }.
function resolveCopy(s, ctx, choiceId) {
  const t = JSON.parse(JSON.stringify(s))
  const before = { wallet: t.wallet, L: { ...t.shift.ledger }, drawer: drawerTotal(t.shift.drawer), rep: t.shift.reputationGain }
  const r = resolveIncident(t, choiceId, ctx)
  assert.ok(r.ok, `${choiceId}: ${r.reason}`)
  return { t, r, before }
}

// ---------- Dữ liệu ----------

test('dữ liệu: 11 tình huống (8 mới chạy theo dữ liệu), loại/ngày/trọng số theo B.3, tỉ lệ loại ở mức Vừa 44,6 / 42,9 / 12,5%', () => {
  const I = DATA.INCIDENTS
  assert.equal(Object.keys(I).length, 11)
  for (const [id, x] of Object.entries(TABLE)) {
    assert.equal(I[id].generic, true, id)
    assert.deepEqual([I[id].kind, I[id].fromDay, I[id].w], [x.kind, x.from, x.w], id)
  }
  assert.deepEqual([I.khach_mo_hang.kind, I.ghi_no.kind, I.doi_y.kind], ['tot', 'chon', 'chon'])
  assert.deepEqual([I.khach_mo_hang.w, I.ghi_no.w, I.doi_y.w], [1, 1.2, 1.2])
  const by = { tot: 0, chon: 0, xau: 0 }
  for (const d of Object.values(I)) by[d.kind] += d.w
  const all = by.tot + by.chon + by.xau
  assert.equal(Math.round(by.tot / all * 1000) / 10, 44.6)
  assert.equal(Math.round(by.chon / all * 1000) / 10, 42.9)
  assert.equal(Math.round(by.xau / all * 1000) / 10, 12.5)
  // mức Ít: 5 loại tốt
  assert.deepEqual(Object.values(I).filter(d => d.kind === 'tot').map(d => d.id).sort(),
    ['doan_khach_hoi_duong', 'khach_mo_hang', 'khach_que_gui_qua', 'khach_quen_vi', 've_chai'])
  // thẻ Mẹo nghề mới
  const tip = t => DATA.TIPS.find(x => x.trigger === t)
  assert.equal(tip(I.tien_nghi_gia.tipTrigger).id, 'soi_tien')
  assert.equal(tip(I.shipper_chuyen_khoan.tipTrigger).id, 'cho_tien_ve')
  assert.equal(tip('kiem_hang').group, 'kho')
  assert.equal(tip('lan_chiem').id, 'giu_loi_di')
})

test('mỗi tình huống có đúng 1 lựa chọn an toàn (không mất tiền, không chi tiền); xác suất kết quả cộng bằng 1; có câu kết quả; tiền bội 1.000đ/500đ', () => {
  for (const d of Object.values(DATA.INCIDENTS)) {
    const safe = d.choices.filter(c => c.safe)
    assert.equal(safe.length, 1, `${d.id}: cần đúng 1 lựa chọn an toàn`)
    if (!d.generic) continue
    for (const c of d.choices) {
      const sum = c.outcomes.reduce((a, o) => a + o.p, 0)
      assert.ok(Math.abs(sum - 1) < 1e-9, `${d.id}/${c.id}: tổng xác suất ${sum}`)
      for (const o of c.outcomes) {
        assert.ok(o.p > 0 && o.result && /[à-ỹ]/i.test(o.result), `${d.id}/${c.id}`)
        if (typeof o.money === 'number') assert.equal(o.money % 1000, 0)
        if (o.money && typeof o.money === 'object') assert.ok(o.money.perSold % 1000 === 0 && o.money.max % 1000 === 0)
        if (o.fine) assert.equal(o.fine % 500, 0)
        if (o.spend) assert.equal(o.spend % 500, 0)
      }
      assert.ok(/[à-ỹ]/i.test(c.label) && /[à-ỹ]/i.test(c.cost), `${d.id}/${c.id}: chữ có dấu`)
    }
    for (const o of safe[0].outcomes) assert.ok(!o.fine && !o.spend, `${d.id}: lựa chọn an toàn không được mất/chi tiền`)
  }
  // nội dung nhạy cảm: không hối lộ, cờ bạc, vé số, bốc thăm; tiền giả chỉ nêu cách nhận biết
  const text = readFileSync(new URL('../../src/data/incidents.js', import.meta.url), 'utf8') +
    readFileSync(new URL('../../src/data/day-events.js', import.meta.url), 'utf8')
  for (const w of ['hối lộ', 'cờ bạc', 'vé số', 'bốc thăm', 'đánh bạc', 'lô đề']) assert.ok(!text.toLowerCase().includes(w), w)
  assert.match(DATA.INCIDENTS.tien_nghi_gia.note, /nhận biết/)
})

test('trần: thiệt hại / tiền thưởng / tiền mất tối đa khớp B.3; tình huống được bốc luôn có maxLoss ≤ lossCap và maxGain ≤ gainCap', () => {
  const ctx = makeCtx()
  const s = stateAt(3, 9)
  const sh = startShift(s, ctx)
  for (const [id, x] of Object.entries(TABLE)) {
    const m = genericMax(ctx, sh, DATA.INCIDENTS[id])
    assert.deepEqual([m.maxLoss, m.maxGain, m.maxFine], x.max, id)
  }
  let planned = 0
  for (let seed = 1; seed <= 300; seed++) {
    for (const day of [3, 5, 7, 9, 12]) {
      const t = stateAt(seed, day, 'nhieu')
      t.incidents.since = 5
      if (day >= 4) t.recipes.banh_trang_tron = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 }
      const shx = startShift(t, ctx)
      for (const p of shiftIncidents(shx)) {
        const d = DATA.INCIDENTS[p.id]
        if (!d.generic) continue
        planned++
        const m = genericMax(ctx, shx, d)
        assert.ok(m.maxLoss <= p.cap, `${p.id} ngày ${day}: ${m.maxLoss} > trần ${p.cap}`)
        assert.ok(m.maxGain <= p.gainCap, `${p.id}: ${m.maxGain} > gainCap ${p.gainCap}`)
        assert.ok(day >= d.fromDay)
      }
    }
  }
  assert.ok(planned > 500, `${planned}`)
})

test('kỳ vọng tiền từng lựa chọn khớp bảng B.3 (±500đ)', () => {
  const ctx = makeCtx()
  const s = stateAt(3, 9)
  const sh = startShift(s, ctx)
  for (const [id, x] of Object.entries(TABLE)) {
    for (const [cid, ev] of Object.entries(x.ev)) {
      const got = choiceExpectedMoney(ctx, sh, DATA.INCIDENTS[id], cid, id === 've_chai' ? 8 : null)
      assert.ok(Math.abs(got - ev) <= 500, `${id}/${cid}: ${got} ≠ ${ev}`)
    }
  }
  // cô ve chai: 1.000đ mỗi phần đã bán, tối đa 8.000đ
  assert.equal(choiceExpectedMoney(ctx, sh, DATA.INCIDENTS.ve_chai, 'ban', 5), 5000)
  assert.equal(choiceExpectedMoney(ctx, sh, DATA.INCIDENTS.ve_chai, 'ban', 12), 8000)
})

// ---------- Từng tình huống ----------

test('Tờ tiền nghi giả: soi kỹ (tiền thật bán được, tiền giả từ chối 0đ), mời QR, nhận luôn (tiền giả mất 10.000đ + 3.000đ giá vốn); mở thẻ Soi tiền', () => {
  const real = openAt('tien_nghi_gia', { roll: 0.2 })
  assert.equal(real.view.art.bill, 20000)
  assert.match(real.view.note, /nhận biết tiền thật/)
  for (const cid of ['soi_ky', 'nhan_luon']) {
    const { t, r, before } = resolveCopy(real.s, real.ctx, cid)
    assert.equal(r.effects.money, 10000)
    assert.equal(r.effects.cost, 3000)
    assert.equal(r.effects.loss, 0)
    assert.equal(t.shift.ledger.cash - before.L.cash, 10000)
    assert.equal(drawerTotal(t.shift.drawer) - before.drawer, 10000, 'tiền mặt vào két đúng số')
    assert.equal(t.wallet, before.wallet - 3000)
    assert.equal(r.tipId, 'soi_tien')
  }
  const qr = resolveCopy(real.s, real.ctx, 'moi_qr')
  assert.equal(qr.t.shift.ledger.qr - qr.before.L.qr, 10000)
  const fake = openAt('tien_nghi_gia', { roll: 0.8 })
  const a = resolveCopy(fake.s, fake.ctx, 'soi_ky')
  assert.deepEqual([a.r.effects.money, a.r.effects.cost, a.r.effects.fine, a.r.effects.loss], [0, 0, 0, 0])
  assert.equal(a.t.wallet, a.before.wallet)
  const b = resolveCopy(fake.s, fake.ctx, 'nhan_luon')
  assert.deepEqual([b.r.effects.money, b.r.effects.cost, b.r.effects.fine, b.r.effects.loss], [0, 3000, 10000, 13000])
  assert.equal(b.t.wallet, b.before.wallet - 13000, 'tiền mất trừ ví ngay')
  assert.equal(b.t.shift.ledger.eventOut - b.before.L.eventOut, 10000)
  assert.match(b.r.text, /tiền giả/)
  // tổng kết ca: tình huống ghi tiền mất; bất biến ví
  const w0 = b.t.shift.walletStart
  const ctx = makeCtx()
  let guard = 0
  while (guard++ < 20000 && !(Object.values(b.t.shift.customers).every(c => c.status === 'roi_di' || c.status === 'bo_ve') && !b.t.shift.tickets.length && !b.t.shift.counter)) {
    if (counterStep(b.t, ctx)) continue
    for (const tk of b.t.shift.tickets.slice()) cookTicket(b.t, ctx, tk)
    advance(b.t, 0.5, ctx)
  }
  const sum = endShift(b.t, ctx)
  assert.equal(sum.incidents[0].fine, 10000)
  assert.equal(sum.eventOut, 10000)
  assert.equal(b.t.wallet - w0, sum.profit - sum.loanRepaid)
  const notes = sum.eventNotes.filter(n => n.id === 'tien_nghi_gia')
  assert.ok(notes.length && notes.every(n => n.source === 'incident'), 'tiền của tình huống ghi nguồn tình huống (Tổng kết không lặp lại)')
})

test('Người giao hàng nói đã chuyển khoản: chờ tiền về (75% bán được, 25% không mất gì), giao luôn (25% mất 6.000đ); có Loa báo tiền thì lựa chọn xanh', () => {
  const ok = openAt('shipper_chuyen_khoan', { roll: 0.5 })
  for (const cid of ['cho_tien_ve', 'giao_luon']) {
    const { t, r, before } = resolveCopy(ok.s, ok.ctx, cid)
    assert.equal(r.effects.money, 20000)
    assert.equal(r.effects.cost, 6000)
    assert.equal(t.shift.qrBalance - ok.s.shift.qrBalance, 20000)
    assert.equal(t.shift.ledger.qr - before.L.qr, 20000)
    assert.equal(r.tipId, 'cho_tien_ve')
  }
  const no = openAt('shipper_chuyen_khoan', { roll: 0.9 })
  assert.deepEqual([resolveCopy(no.s, no.ctx, 'cho_tien_ve').r.effects.loss, resolveCopy(no.s, no.ctx, 'giao_luon').r.effects.loss], [0, 6000])
  // không có Loa: không có lời nhắc xanh; có Loa: có
  assert.equal(no.view.choices.find(c => c.id === 'cho_tien_ve').green, false)
  const loa = openAt('shipper_chuyen_khoan', { roll: 0.9, prep: s => { s.upgrades.loa_bao_tien = true } })
  const c = loa.view.choices.find(x => x.id === 'cho_tien_ve')
  assert.equal(c.green, true)
  assert.match(c.hint, /Loa báo tiền/)
  // cần QR: trước ngày có mã QR thì không bốc
  const ctx = makeCtx()
  const early = stateAt(2, 3)
  const sh = startShift(early, ctx)
  assert.ok(!incidentCandidates(early, sh, ctx).some(d => d.id === 'shipper_chuyen_khoan'))
})

test('Bình gas hết: mua bình mới −12.000đ (chi mua, không vào trần phạt ngày); mượn bếp −3.000đ giá vốn, +1 danh tiếng, chờ món ×0,9 tới cuối ca', () => {
  const o = openAt('gas_het', { after: 1 })
  const a = resolveCopy(o.s, o.ctx, 'mua_binh')
  assert.deepEqual([a.r.effects.spend, a.r.effects.fine, a.r.effects.loss], [12000, 0, 12000])
  assert.equal(a.t.wallet, a.before.wallet - 12000)
  assert.equal(a.t.incidents.day.loss, 0, 'tiền tự chi mua không tính vào trần phạt ngày')
  const b = resolveCopy(o.s, o.ctx, 'muon_bep')
  assert.deepEqual([b.r.effects.cost, b.r.effects.rep, b.r.effects.loss], [3000, 1, 3000])
  assert.equal(b.t.shift.waitBudgetMul, 0.9)
  // phiếu kẹp sau đó: ngân sách chờ ×0,9
  const ctx = makeCtx()
  const n0 = b.t.shift.receipts.length
  clip(b.t, ctx, n0 + 1)
  const rc = b.t.shift.receipts[n0]
  const cust = Object.values(b.t.shift.customers).find(c => c.receipt && c.receipt.no === rc.no)
  assert.equal(cust.waitBudget, waitBudgetFor({ waitBudgetMul: 0.9 }, cust.request, DATA.RECIPES, ctx))
  assert.ok(cust.waitBudget < waitBudgetFor({}, cust.request, DATA.RECIPES, ctx))
  // chỉ bốc khi thực đơn có món nấu bằng bếp gas (bánh mì ốp la có bước chiên)
  const ctx2 = makeCtx()
  const s2 = stateAt(4, 9)
  delete s2.recipes.banh_mi_op_la
  const sh2 = startShift(s2, ctx2)
  assert.ok(!incidentCandidates(s2, sh2, ctx2).some(d => d.id === 'gas_het'))
})

test('Khách quên ví: cất giữ (70% +10.000đ cảm ơn, luôn +2 danh tiếng); báo loa (+1, 60% quà hàng hiếm — chưa có dữ liệu hàng hiếm thì chỉ cảm ơn)', () => {
  const back = openAt('khach_quen_vi', { roll: 0.5, data: NORARE })
  const a = resolveCopy(back.s, back.ctx, 'cat_giu')
  assert.deepEqual([a.r.effects.gain, a.r.effects.rep, a.r.effects.loss], [10000, 2, 0])
  assert.equal(a.t.wallet, a.before.wallet, 'tiền thưởng vào ví lúc tất toán')
  assert.equal(a.t.shift.ledger.eventIn - a.before.L.eventIn, 10000)
  const gone = openAt('khach_quen_vi', { roll: 0.85, data: NORARE })
  const b = resolveCopy(gone.s, gone.ctx, 'cat_giu')
  assert.deepEqual([b.r.effects.gain, b.r.effects.rep], [0, 2])
  assert.match(b.r.text, /công an phường/)
  // chưa có dữ liệu hàng hiếm: câu giá và câu kết quả không hứa hàng hiếm
  assert.equal(rareIngredientIds(back.ctx).length, 0)
  const loa = back.view.choices.find(c => c.id === 'bao_loa')
  assert.ok(!/hiếm/.test(loa.cost), loa.cost)
  const c = resolveCopy(back.s, back.ctx, 'bao_loa')
  assert.deepEqual([c.r.effects.rep, c.r.effects.rare.length], [1, 0])
  assert.ok(!/hiếm/.test(c.r.text))
  // có dữ liệu hàng hiếm: 60% gửi 1 phần vào kho
  const r = openAt('khach_quen_vi', { roll: 0.3, data: RARE })
  const d = resolveCopy(r.s, r.ctx, 'bao_loa')
  assert.deepEqual(d.r.effects.rare, [{ id: 'mat_ong_rung', name: 'Mật ong rừng U Minh', n: 1 }])
  assert.equal(d.t.rare.stock.mat_ong_rung, 1)
  assert.match(d.r.text, /mật ong rừng/)
})

test('Cô ve chai: chỉ bật khi ca đã bán từ 3 phần; bán (+1.000đ mỗi phần, tối đa 8.000đ) hoặc cho (+3 danh tiếng)', () => {
  const ctx = makeCtx()
  const s = stateAt(5, 9)
  startShift(s, ctx)
  force(s, ctx, 've_chai', 1)
  clip(s, ctx, 1)
  const sold = () => s.shift.receipts.reduce((a, r) => a + r.lines.reduce((b, l) => b + l.qty, 0), 0)
  if (sold() < 3) assert.equal(incidentDue(s, ctx), false, 'chưa bán đủ 3 phần')
  let guard = 0
  while (sold() < 3 && guard++ < 20) clip(s, ctx, s.shift.receipts.length + 1)
  assert.equal(incidentDue(s, ctx), true)
  const view = openIncident(s, ctx)
  const n = sold()
  assert.match(view.text, new RegExp(`đã bán ${n} phần`))
  const a = resolveCopy(s, ctx, 'ban')
  assert.equal(a.r.effects.gain, Math.min(8000, 1000 * n))
  assert.equal(resolveCopy(s, ctx, 'cho').r.effects.rep, 3)
})

test('Đoàn khách hỏi đường: chỉ đường (+2 danh tiếng) hoặc mời mua 2 ly trà tắc (+20.000đ tiền mặt, −6.000đ giá vốn)', () => {
  const o = openAt('doan_khach_hoi_duong')
  const a = resolveCopy(o.s, o.ctx, 'moi_tra')
  assert.deepEqual([a.r.effects.money, a.r.effects.cost, a.r.effects.gain], [20000, 6000, 0])
  assert.equal(a.t.shift.ledger.cash - a.before.L.cash, 20000)
  assert.equal(a.t.shift.ledger.sales - a.before.L.sales, 20000)
  assert.equal(resolveCopy(o.s, o.ctx, 'chi_duong').r.effects.rep, 2)
})

test('Hàng hiếm (khi có dữ liệu): khách quê gửi quà và chị bán dạo chỉ bốc khi kho còn chỗ / đã có công thức hiếm; hàng vào state.rare; tiền mua là chi mua', () => {
  const ctx = makeCtx(NORARE)
  const s = stateAt(3, 9)
  const sh = startShift(s, ctx)
  const ids = () => incidentCandidates(s, sh, ctx).map(d => d.id)
  assert.ok(!ids().includes('khach_que_gui_qua') && !ids().includes('nguoi_ban_dao'), 'chưa có dữ liệu hàng hiếm')
  const rctx = makeCtx(RARE)
  const t = stateAt(3, 9)
  const sht = startShift(t, rctx)
  const rids = () => incidentCandidates(t, sht, rctx).map(d => d.id)
  assert.ok(rids().includes('khach_que_gui_qua'))
  assert.ok(!rids().includes('nguoi_ban_dao'), 'chưa có công thức hiếm')
  t.recipes.tra_tac_mat_ong = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 }
  assert.ok(rids().includes('nguoi_ban_dao'))
  t.rare = { stock: { mat_ong_rung: 6 }, fragments: {} }
  assert.ok(!rids().includes('khach_que_gui_qua') && !rids().includes('nguoi_ban_dao'), 'kho đầy')
  // khách quê gửi quà
  const q = openAt('khach_que_gui_qua', { data: RARE })
  assert.match(q.view.text, /mật ong rừng/)
  const a = resolveCopy(q.s, q.ctx, 'nhan')
  assert.equal(a.t.rare.stock.mat_ong_rung, 1)
  const b = resolveCopy(q.s, q.ctx, 'moi_tra')
  assert.deepEqual([b.r.effects.cost, b.r.effects.rep, b.t.rare.stock.mat_ong_rung], [3000, 2, 1])
  // chị bán dạo: mua 2 phần −8.000đ (chi mua), mua 1 phần −4.000đ; kho chỉ còn 1 chỗ thì không mua được 2
  const own = s2 => { s2.recipes.tra_tac_mat_ong = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 } }
  const v = openAt('nguoi_ban_dao', { data: RARE, prep: own })
  const m2 = resolveCopy(v.s, v.ctx, 'mua_2')
  assert.deepEqual([m2.r.effects.spend, m2.t.rare.stock.mat_ong_rung], [8000, 2])
  assert.equal(m2.t.wallet, m2.before.wallet - 8000)
  assert.equal(m2.t.incidents.day.loss, 0)
  const almost = openAt('nguoi_ban_dao', { data: RARE, prep: s2 => { own(s2); s2.rare = { stock: { mat_ong_rung: 5 }, fragments: {} } } })
  const ch = Object.fromEntries(almost.view.choices.map(c => [c.id, c.available]))
  assert.deepEqual(ch, { mua_2: false, mua_1: true, hen: true })
  assert.equal(resolveIncident(JSON.parse(JSON.stringify(almost.s)), 'mua_2', almost.ctx).reason, 'khong_duoc')
  // lưu/tải giữ kho hàng hiếm
  const back = migrate(decodeSave(encodeSave(m2.t)), RARE)
  assert.deepEqual(back.rare, m2.t.rare)
})

// ---------- Tất định, trần ngày thật ----------

test('kết quả bốc 1 lần lúc mở tình huống: tải lại trang không đổi kết quả; mọi lựa chọn dùng chung số bốc', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const o = openAt('tien_nghi_gia', { seed })
    const back = migrate(decodeSave(encodeSave(o.s)), DATA)
    assert.deepEqual(back.shift.incident.detail, o.inc.detail)
    const a = resolveIncident(JSON.parse(JSON.stringify(o.s)), 'nhan_luon', o.ctx)
    const b = resolveIncident(back, 'nhan_luon', o.ctx)
    assert.deepEqual(a.effects, b.effects)
    assert.equal(a.text, b.text)
    // tờ tiền thật hay giả không phụ thuộc cách chọn
    const soi = resolveIncident(JSON.parse(JSON.stringify(o.s)), 'soi_ky', o.ctx)
    assert.equal(soi.effects.money > 0, a.effects.money > 0)
  }
  // tỉ lệ thật: khoảng 50% tiền thật, 75% tiền về, 70% khách quay lại (luồng ngẫu nhiên của tình huống)
  const rate = (id, cid, pred) => {
    let hit = 0
    for (let seed = 1; seed <= 300; seed++) {
      const o = openAt(id, { seed, day: 9 })
      if (pred(resolveIncident(o.s, cid, o.ctx).effects)) hit++
    }
    return hit / 300
  }
  assert.ok(Math.abs(rate('tien_nghi_gia', 'nhan_luon', e => e.money > 0) - 0.5) < 0.09)
  assert.ok(Math.abs(rate('shipper_chuyen_khoan', 'cho_tien_ve', e => e.money > 0) - 0.75) < 0.09)
  assert.ok(Math.abs(rate('khach_quen_vi', 'cat_giu', e => e.gain > 0) - 0.7) < 0.09)
})

test('trần ngày thật: tiền mất vượt trần thì Dì Sáu đỡ giùm; tiền thưởng vượt trần không cộng; gainCap của tình huống', () => {
  const at = '2026-10-09T08:00'
  const ctx = makeCtx(DATA, at)
  const caps = eventDayCaps(ctx, 9)
  const o = openAt('tien_nghi_gia', { roll: 0.8 })
  const t = JSON.parse(JSON.stringify(o.s))
  t.incidents.day = { key: t.shift.dayKey || 'ngay-9', loss: caps.loss - 4000, gain: 0 }
  const r = resolveIncident(t, 'nhan_luon', o.ctx)
  assert.deepEqual([r.effects.fine, r.effects.spared], [4000, 6000])
  assert.match(r.text, /Dì Sáu đỡ giùm/)
  const g = openAt('khach_quen_vi', { roll: 0.2 })
  const u = JSON.parse(JSON.stringify(g.s))
  u.incidents.day = { key: u.shift.dayKey || 'ngay-9', loss: 0, gain: caps.gain - 3000 }
  const r2 = resolveIncident(u, 'cat_giu', g.ctx)
  assert.deepEqual([r2.effects.gain, r2.effects.capped], [3000, 7000])
  // gainCap của tình huống
  const v = JSON.parse(JSON.stringify(g.s))
  v.shift.incident.gainCap = 6000
  const r3 = resolveIncident(v, 'cat_giu', g.ctx)
  assert.deepEqual([r3.effects.gain, r3.effects.capped], [6000, 4000])
  assert.equal(refIncomeFor(ctx, 9), caps.gain)
})

// ---------- Nhịp và tỉ lệ (dữ liệu thật) ----------

// Mô phỏng nhiều ca liên tiếp (mỗi ca một ngày game): bốc kế hoạch ở startShift rồi coi như đã xử lý (giống resolveIncident).
function simulate(freq, seeds, perSeed, onShift) {
  const ctx = makeCtx()
  let withAny = 0, total = 0
  const seq = []
  for (const seed of seeds) {
    const s = stateAt(seed, 3, freq)
    const S = ensureIncidents(s)
    for (let k = 0; k < perSeed; k++) {
      s.day = 3 + k
      if (s.day >= 4) s.recipes.banh_trang_tron = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 }
      const sh = startShift(s, ctx)
      const list = shiftIncidents(sh)
      total++
      if (onShift) onShift(sh, list, s)
      if (list.length) {
        withAny++
        S.since = 0
        for (const x of list) { S.recent.push(x.id); seq.push({ seed, day: sh.day, kind: x.kind, id: x.id }) }
        if (S.recent.length > 10) S.recent.splice(0, S.recent.length - 10)
        S.lastKind = list[list.length - 1].kind
        S.lastLoss = 0
      } else S.since += 1
      s.shift = null
    }
  }
  return { rate: withAny / total, total, seq }
}

test('nhịp với dữ liệu thật: không 2 tình huống xấu liền nhau, không 2 xấu trong ca, không trước ngày 5; mức Ít chỉ loại tốt (không phạt); tỉ lệ thực Nhiều ≈ 80%, Vừa ≈ 60%, Ít ≈ 40%', () => {
  const res = {}
  for (const freq of ['nhieu', 'vua', 'it']) {
    res[freq] = simulate(freq, [11, 12, 13], 400, (sh, list) => {
      assert.ok(list.filter(x => x.kind === 'xau').length <= 1)
      for (const x of list) {
        if (x.kind === 'xau') assert.ok(sh.day >= 5)
        assert.ok(sh.day >= (DATA.INCIDENTS[x.id].fromDay || 3))
        if (freq === 'it') {
          assert.equal(x.kind, 'tot')
          assert.equal(genericMax({ data: DATA }, sh, DATA.INCIDENTS[x.id]).maxFine, 0, 'mức Ít không có tiền phạt')
        }
      }
    })
    const seq = res[freq].seq
    let bads = 0
    for (let i = 1; i < seq.length; i++) {
      if (seq[i].seed !== seq[i - 1].seed) continue
      if (seq[i].kind === 'xau') bads++
      assert.ok(!(seq[i].kind === 'xau' && seq[i - 1].kind === 'xau'), `${freq}: 2 tình huống xấu liền nhau`)
    }
    if (freq !== 'it') assert.ok(bads > 30, `${freq}: ${bads} tình huống xấu`)
  }
  assert.ok(res.nhieu.rate >= 0.75 && res.nhieu.rate <= 0.85, `Nhiều ${res.nhieu.rate}`)
  assert.ok(res.vua.rate >= 0.55 && res.vua.rate <= 0.65, `Vừa ${res.vua.rate}`)
  assert.ok(res.it.rate >= 0.33 && res.it.rate <= 0.45, `Ít ${res.it.rate}`)
  // luật "nhẹ nhàng": tình huống trước là loại xấu → không bốc loại xấu
  const ctx = makeCtx()
  const s = stateAt(21, 9)
  const sh = startShift(s, ctx)
  s.incidents.lastKind = 'xau'
  assert.ok(!incidentCandidates(s, sh, ctx).some(d => d.kind === 'xau'))
  s.incidents.lastKind = 'tot'
  assert.ok(incidentCandidates(s, sh, ctx).some(d => d.kind === 'xau'))
})

test('chơi thật mức Nhiều, chọn ngẫu nhiên (không chỉ cách an toàn): bất biến ví, tiền thưởng bội 1.000đ, tiền mất/chi bội 500đ, tổng kết và lịch sử khớp', () => {
  let seen = new Set()
  for (const seed of [3, 8, 14, 27]) {
    const ctx = makeCtx(DATA, '2026-10-12T08:00')
    const s = stateAt(seed, 5, 'nhieu')
    s.recipes.banh_trang_tron = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 }
    let k = 0
    for (let i = 0; i < 8; i++) {
      const r = playShift(s, ctx, { incident: v => { const av = v.choices.filter(c => c.available); return av[(k++) % av.length].id } })
      for (const x of r.incidents) seen.add(x.view.id)
      const sum = r.summary
      assert.equal(r.walletAfter - r.walletBefore, sum.profit - sum.loanRepaid, `seed ${seed} ngày ${sum.day}`)
      assert.equal(sum.eventIn % 1000, 0)
      assert.equal(sum.eventOut % 500, 0)
      assert.equal(s.wallet % 500, 0)
      for (const inc of sum.incidents) {
        assert.ok(inc.loss <= incLossCapOf(r, inc.id) + 0, `${inc.id}: lỗ ${inc.loss}`)
        assert.ok(['tot', 'chon', 'xau'].includes(inc.kind))
      }
      const back = migrate(decodeSave(encodeSave(s)), DATA)
      assert.deepEqual(back, JSON.parse(JSON.stringify(s)))
      ctx.clock.t += 3 * 3600 * 1000
    }
  }
  assert.ok([...seen].filter(id => GENERIC.includes(id)).length >= 4, [...seen].join(', '))
})

// trần thiệt hại của tình huống `id` trong lần chơi r (lấy từ kế hoạch của ca)
function incLossCapOf(r, id) {
  const x = r.incidents.find(y => y.view.id === id)
  return x ? x.view.cap : Infinity
}
