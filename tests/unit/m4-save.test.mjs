// M4 bước 7 (docs/tham-khao/m4-thiet-ke.md mục F.4): save lên STATE_VERSION 3.
//   - save THẬT của bản 0.3.0 (v2, đang dở ca, tests/fixtures/save-v2.mjs) → v3: giữ tiến trình, thêm trường M4 mặc định,
//     ca dở chơi tiếp tới hết bằng mã M4 (bất biến ví), nhận thư 0.4.0 (1 mảnh Trà tắc mật ong + 1 phần Mật ong rừng);
//   - save v1 → v3;
//   - dữ liệu M4 hỏng được làm sạch (tình huống, kho hàng hiếm, trường M4 của ca dở);
//   - save v3 đủ mọi trường M4 (ca dở có 2 tình huống, kho hàng hiếm, sổ tiền sự kiện): lưu rồi tải lại không đổi.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { STATE_VERSION, defaultMeta, defaultRare, defaultIncidents, defaultState } from '../../src/core/state.js'
import { encodeSave, decodeSave, migrate, migrateShiftM4, exportCode, readCode } from '../../src/core/save.js'
import { startShift, advance, isShiftOver, endShift } from '../../src/core/shift.js'
import { refreshMeta } from '../../src/core/meta.js'
import { claimMail } from '../../src/core/mail.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { counterStep, cookTicket, handleIncident, playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx, vn } from '../helpers/meta-helpers.mjs'
import { SAVE_V2_MID_SHIFT } from '../fixtures/save-v2.mjs'

const plain = v => JSON.parse(JSON.stringify(v))
const MODS_M4 = { lineCountWeights: null, fixedCostDelta: 0, ingCostMul: {}, noQrSpeaker: false, queueMax: null, queueFine: null,
  bigOrder: null, endCheck: null, rareRolls: 0 }

// Chơi nốt ca đang dở như người chơi hoàn hảo, tình huống chọn cách an toàn. Trả {summary, incidents}.
function finishOpenShift(state, ctx) {
  const sh = state.shift
  const incidents = []
  const tryInc = () => { const r = handleIncident(state, ctx); if (r) incidents.push(r) }
  let steps = 0
  while (!isShiftOver(state)) {
    if (++steps > 20000) throw new Error('ca không kết thúc')
    tryInc()
    while (counterStep(state, ctx)) tryInc()
    for (const t of sh.tickets.slice()) cookTicket(state, ctx, t)
    if (!isShiftOver(state)) advance(state, 0.5, ctx)
  }
  return { summary: endShift(state, ctx), incidents }
}

test('save v2 thật của bản 0.3.0 (đang dở ca) → v3: giữ tiến trình, thêm trường M4 mặc định, không hủy ca', () => {
  const raw = decodeSave(SAVE_V2_MID_SHIFT)
  assert.ok(raw, 'fixture phải giải mã được')
  assert.equal(raw.version, 2)
  // đúng là save trước M4: không có trường M4 nào
  assert.equal(raw.rare, undefined)
  assert.equal(raw.incidents.lastKind, undefined)
  assert.equal(raw.shift.ledger.eventIn, undefined)
  for (const k of ['incidentQueue', 'rareMenu', 'rareRolls', 'eventNotes', 'eventCap', 'dayKey']) assert.equal(raw.shift[k], undefined, k)
  assert.equal(raw.shift.mods.tipMul, 1, 'mods của bản 0.3 còn tipMul')
  const before = plain(raw)
  const report = {}
  const s = migrate(raw, DATA, report)
  assert.deepEqual(raw, before, 'migrate không sửa object đầu vào')
  assert.equal(s.version, STATE_VERSION)
  assert.equal(STATE_VERSION, 3)
  assert.deepEqual(report, {}, 'không làm tròn ví, không hủy ca')
  // tiến trình giữ nguyên
  for (const k of ['seed', 'shopName', 'day', 'wallet', 'reputation', 'goldSpoons', 'ratings', 'recipes', 'upgrades', 'stats',
    'history', 'chains', 'checkin', 'daily', 'titles', 'tipsSeen', 'realDays', 'progression']) {
    assert.deepEqual(s[k], before[k], k)
  }
  assert.equal(s.day, 8)
  assert.equal(s.wallet, 869500)
  assert.equal(s.mail.seenVersion, '0.2.0', 'save 0.3 sẽ nhận thư 0.4.0')
  // tình huống: giữ sổ nợ, nhật ký, bảo hiểm; thêm trường M4 mặc định
  const d = defaultIncidents()
  for (const k of ['since', 'recent', 'log', 'debts', 'bonus', 'total']) assert.deepEqual(s.incidents[k], before.incidents[k], k)
  assert.equal(s.incidents.debts.length, 1)
  assert.deepEqual({ lastKind: s.incidents.lastKind, lastLoss: s.incidents.lastLoss, day: s.incidents.day, warn: s.incidents.warn },
    { lastKind: d.lastKind, lastLoss: d.lastLoss, day: d.day, warn: d.warn })
  assert.deepEqual(Object.keys(s.incidents), Object.keys(d), 'đủ khóa, đúng thứ tự như defaultIncidents')
  // kho hàng hiếm mặc định
  assert.deepEqual(s.rare, defaultRare())
  // ca dở giữ nguyên mọi thứ đã có, chỉ thêm trường M4
  const sh = s.shift
  assert.ok(sh, 'ca dở phải được giữ')
  for (const k of Object.keys(before.shift)) {
    if (k === 'ledger' || k === 'mods') continue
    assert.deepEqual(sh[k], before.shift[k], 'shift.' + k)
  }
  assert.deepEqual(sh.ledger, { ...before.shift.ledger, eventIn: 0, eventOut: 0 })
  assert.deepEqual(sh.mods, { ...before.shift.mods, ...MODS_M4 })
  assert.deepEqual(sh.incidentQueue, [])
  assert.deepEqual(sh.eventNotes, [])
  assert.deepEqual(sh.rareMenu, [], 'ca cũ không có món hiếm')
  assert.deepEqual(sh.rareNotes, [])
  assert.equal(sh.rareRolls, 0)
  assert.equal(sh.eventCostExtra, 0)
  assert.equal(sh.eventMissed, 0)
  assert.equal(sh.dayKey, '')
  assert.equal(sh.eventCap, undefined)
  assert.equal(sh.incident.id, 'ghi_no')
  assert.equal(sh.incident.status, 'cho')
  // lưu rồi tải lại (v3) không đổi
  assert.deepEqual(migrate(decodeSave(encodeSave(s)), DATA), plain(s))
  // mã sao lưu của bản 0.3 (v2) đưa vào bản 0.4: không cảnh báo "bản mới hơn"
  const rc = readCode(exportCode(before), DATA)
  assert.equal(rc.ok, true)
  assert.equal(rc.warn, null)
  assert.equal(rc.state.version, STATE_VERSION)
  assert.deepEqual(rc.state.shift, sh)
})

test('ca dở từ v2 chơi tiếp tới hết bằng mã M4: tình huống đã lên lịch vẫn xảy ra, bất biến ví, ca sau là ca v3 đầy đủ', () => {
  const s = migrate(decodeSave(SAVE_V2_MID_SHIFT), DATA)
  const ctx = makeMetaCtx({ at: '2026-10-06T05:00', attach: true, state: s })
  const walletStart = s.shift.walletStart
  const { summary, incidents } = finishOpenShift(s, ctx)
  assert.ok(summary, 'ca không kết thúc')
  assert.equal(summary.day, 8)
  assert.deepEqual(incidents.map(x => x.view.id), ['ghi_no'], 'tình huống Ghi nợ của bản cũ vẫn xử lý được')
  assert.equal(incidents[0].res.ok, true)
  // bất biến ví: ví sau ca − ví đầu ca = lãi − trả nợ Dì Sáu
  assert.equal(s.wallet - walletStart, summary.profit - summary.loanRepaid)
  assert.equal(s.wallet % 500, 0)
  assert.equal(summary.eventIn, 0)
  assert.equal(summary.eventOut, 0)
  assert.equal(summary.served + summary.lost, 8)
  for (const [k, v] of Object.entries(summary)) if (typeof v === 'number') assert.ok(Number.isFinite(v), 'summary.' + k)
  const h = s.history[s.history.length - 1]
  assert.equal(h.day, 8)
  assert.equal(h.eventIn, 0)
  assert.equal(h.eventOut, 0)
  assert.ok(Array.isArray(h.rare))
  assert.equal(s.shift, null)
  assert.equal(s.day, 9)
  // lịch sử ca cũ (bản 0.3) không có eventIn/eventOut: giữ nguyên, không lỗi
  assert.equal(s.history[0].eventIn, undefined)
  // ca kế tiếp là ca v3 đầy đủ trường M4
  const r = playShift(s, ctx, { incident: v => v.safeId })
  assert.equal(r.walletAfter - r.walletBefore, r.summary.profit - r.summary.loanRepaid)
  assert.equal(s.wallet % 500, 0)
  assert.deepEqual(migrate(decodeSave(encodeSave(s)), DATA), plain(s))
})

test('save v2 → thư phiên bản 0.4.0: luật tip mới, quà làm quen 1 mảnh Trà tắc mật ong + 1 phần Mật ong rừng', () => {
  const s = migrate(decodeSave(SAVE_V2_MID_SHIFT), DATA)
  s.shift = null   // quà có hiện vật chỉ nhận được khi không trong ca
  const ctx = makeMetaCtx({ at: '2026-10-06T08:00', attach: true, state: s })
  const ni = makeNowInfo(s, vn('2026-10-06T08:00'))
  const r = refreshMeta(s, ni, ctx)
  // M5 (sửa có chủ ý): bản 0.5.0 có thêm thư phiên bản 0.5.0 (không quà) → save 0.3 nhận thư 0.4.0 và 0.5.0
  // M5 Đợt 2 (sửa có chủ ý): bản 0.5.1 có thêm thư phiên bản 0.5.1 (không quà) → save 0.3 nhận thư 0.4.0, 0.5.0 và 0.5.1
  assert.deepEqual(r.newMail.filter(id => id.startsWith('phien_ban')), ['phien_ban_0_4_0', 'phien_ban_0_5_0', 'phien_ban_0_5_1'], 'save 0.3 nhận thư 0.4.0, 0.5.0 và 0.5.1')
  assert.equal(s.mail.seenVersion, '0.5.1')
  const m = s.mail.list.find(x => x.id === 'phien_ban_0_4_0')
  // (soát lỗi M4, sửa có chủ ý: câu cũ "hóa đơn … và khách chấm 5 sao sẽ bỏ hũ tip" sai chủ ngữ)
  assert.match(m.body, /hóa đơn từ 20\.000đ mà khách chấm 5 sao thì khách bỏ hũ tip 5\.000đ/i)
  assert.match(m.body, /Chợ sớm 05:00–09:00/)
  assert.match(m.body, /11:00–13:30/)
  assert.match(m.body, /17:30–21:00/)
  assert.deepEqual(m.reward, { fragments: { tra_tac_mat_ong: 1 }, rare: { mat_ong_rung: 1 } })
  const wallet = s.wallet
  const c = claimMail(s, 'phien_ban_0_4_0', ni, ctx)
  assert.equal(c.ok, true)
  assert.equal(s.wallet, wallet, 'quà không có tiền')
  assert.equal(s.rare.stock.mat_ong_rung, 1)
  assert.equal(s.rare.fragments.tra_tac_mat_ong, 1)
  assert.ok(s.rare.seen.includes('mat_ong_rung'))
  // quà cố định của thư không tính vào trần hàng hiếm mỗi ngày thật
  assert.equal(s.rare.today.got, 0)
  assert.equal(s.rare.today.frags, 0)
  // không gửi lại
  refreshMeta(s, makeNowInfo(s, vn('2026-10-07T08:00')), ctx)
  assert.equal(s.mail.list.filter(x => x.id === 'phien_ban_0_4_0').length, 1)
  // save mới không nhận thư phiên bản
  const fresh = defaultState(3, DATA)
  refreshMeta(fresh, makeNowInfo(fresh, vn('2026-10-06T08:00')), makeMetaCtx({ state: fresh }))
  assert.ok(!fresh.mail.list.some(x => x.kind === 'phien_ban'))
  assert.equal(fresh.mail.seenVersion, '0.5.1')
})

test('save v1 → v3: trường meta M2, tình huống M3, trường M4 đều mặc định; nhận thư 0.2.0 và 0.4.0', () => {
  const v1 = decodeSave(SAVE_V2_MID_SHIFT)
  for (const k of [...Object.keys(defaultMeta()), 'incidents', 'notebook', 'backup']) delete v1[k]
  v1.version = 1
  v1.shift = null
  const s = migrate(decodeSave(encodeSave(v1)), DATA)
  assert.equal(s.version, STATE_VERSION)
  assert.equal(s.day, 8)
  assert.equal(s.wallet, 869500)
  assert.deepEqual(s.incidents, defaultIncidents())
  assert.deepEqual(s.rare, defaultRare())
  assert.equal(s.mail.seenVersion, '0.1.0')
  assert.deepEqual(migrate(decodeSave(encodeSave(s)), DATA), plain(s))
  const ctx = makeMetaCtx({ state: s })
  const r = refreshMeta(s, makeNowInfo(s, vn('2026-10-06T08:00')), ctx)
  assert.ok(r.newMail.includes('phien_ban_0_2_0'))
  assert.ok(r.newMail.includes('phien_ban_0_4_0'))
  // chơi được một ca v3 trọn vẹn
  const p = playShift(s, ctx, { incident: v => v.safeId })
  assert.equal(p.walletAfter - p.walletBefore, p.summary.profit - p.summary.loanRepaid)
})

test('dữ liệu M4 hỏng được làm sạch: tình huống, kho hàng hiếm, trường M4 của ca dở; trường hợp lệ giữ nguyên', () => {
  const raw = decodeSave(SAVE_V2_MID_SHIFT)
  raw.version = 3
  raw.incidents = { ...raw.incidents, lastKind: 'rat_xau', lastLoss: 7, day: { key: 123 }, warn: { kiem_tra_attp: -4, trat_tu_do_thi: 12, la_lam: 3, 'X Y': 2 } }
  raw.rare = {
    stock: { mat_ong_rung: 99, kho_muc: -3, trung_ga: 4, ca_phe_bmt: '2' },
    fragments: { tra_tac_mat_ong: 9, tra_tac: 2, ca_phe_muoi: 1 },
    pity: { ing: 'x', frag: 1000 },
    today: { key: 'hôm nay', got: -1, frags: 2, stalls: ['cho_som', 'cho_ma', 7], strangerDay: '2026-10-06' },
    seen: ['mat_ong_rung', 'duong'],
    pendingStall: { id: 'cho_ma', dayKey: '2026-10-06' }
  }
  const sh = raw.shift
  sh.ledger = { ...sh.ledger, eventIn: 'nhiều', eventOut: -500 }
  sh.incidentQueue = 'x'
  sh.eventNotes = null
  sh.rareMenu = [1, 'tra_tac_mat_ong']
  sh.rareNotes = {}
  sh.rareRolls = -2
  sh.eventCostExtra = NaN
  sh.eventMissed = 2
  sh.dayKey = 20261006
  sh.mods = { ...sh.mods, noQrSpeaker: true }
  const s = migrate(decodeSave(encodeSave(raw)), DATA)
  assert.equal(s.version, STATE_VERSION)
  assert.equal(s.incidents.lastKind, null)
  assert.equal(s.incidents.lastLoss, 1)
  assert.deepEqual(s.incidents.day, defaultIncidents().day)
  assert.deepEqual(s.incidents.warn, { trat_tu_do_thi: 12 })
  assert.equal(migrate({ ...raw, incidents: { ...raw.incidents, lastLoss: -2, lastKind: 'xau', day: { key: '2026-10-06', loss: -5, gain: 3000.4 } } }, DATA).incidents.lastLoss, 0)
  const okDay = migrate({ ...raw, incidents: { ...raw.incidents, lastKind: 'xau', day: { key: '2026-10-06', loss: -5, gain: 3000 } } }, DATA).incidents
  assert.equal(okDay.lastKind, 'xau')
  assert.deepEqual(okDay.day, { key: '2026-10-06', loss: 0, gain: 3000 })
  // kho hàng hiếm: id lạ bị bỏ, số kẹp 0..6, mảnh 0..3
  assert.deepEqual(s.rare.stock, { mat_ong_rung: 6, kho_muc: 0, ca_phe_bmt: 2 })
  assert.deepEqual(s.rare.fragments, { tra_tac_mat_ong: 3, ca_phe_muoi: 1 })
  assert.deepEqual(s.rare.pity, { ing: 0, frag: 99 })
  assert.deepEqual(s.rare.today, { key: '', got: 0, frags: 2, stalls: ['cho_som'], strangerDay: '2026-10-06' })
  assert.deepEqual(s.rare.seen, ['mat_ong_rung'])
  assert.equal(s.rare.pendingStall, null)
  // ca dở: trường M4 hỏng về mặc định, trường hợp lệ giữ nguyên
  const out = s.shift
  assert.ok(out, 'ca dở vẫn giữ')
  assert.equal(out.ledger.eventIn, 0)
  assert.equal(out.ledger.eventOut, 0)
  assert.equal(out.ledger.sales, sh.ledger.sales)
  assert.deepEqual(out.incidentQueue, [])
  assert.deepEqual(out.eventNotes, [])
  assert.deepEqual(out.rareMenu, ['tra_tac_mat_ong'])
  assert.deepEqual(out.rareNotes, [])
  assert.equal(out.rareRolls, 0)
  assert.equal(out.eventCostExtra, 0)
  assert.equal(out.eventMissed, 2)
  assert.equal(out.dayKey, '')
  assert.equal(out.mods.noQrSpeaker, true, 'khóa M4 đã có thì giữ')
  assert.equal(out.mods.fixedCostDelta, 0)
  // save hỏng vẫn chơi tiếp được tới hết ca
  const ctx = makeMetaCtx({ at: '2026-10-06T05:00', state: s })
  const walletStart = s.shift.walletStart
  const { summary } = finishOpenShift(s, ctx)
  assert.equal(s.wallet - walletStart, summary.profit - summary.loanRepaid)
})

test('save v3 đủ trường M4 (ca dở có hàng đợi tình huống, kho hàng hiếm, sổ tiền sự kiện): lưu rồi tải lại không đổi', () => {
  let found = 0
  for (let seed = 1; seed <= 60 && found < 3; seed++) {
    const ctx = makeMetaCtx({ at: '2026-10-06T12:00' })
    const s = defaultState(seed, DATA)
    s.day = 9
    s.recipes.tra_tac_mat_ong = { cooks: 2, goodCooks: 2, excellent: 1, flawless: 0, best: 95, boughtDay: 0 }
    s.rare.stock = { mat_ong_rung: 3, kho_muc: 1 }
    s.rare.fragments = { ca_phe_muoi: 2 }
    s.rare.today = { key: '2026-10-06', got: 2, frags: 1, stalls: ['ba_gac_trua'], strangerDay: '2026-10-06' }
    s.rare.seen = ['mat_ong_rung', 'kho_muc']
    s.incidents.lastKind = 'chon'
    s.incidents.lastLoss = 0.25
    s.incidents.day = { key: '2026-10-06', loss: 5000, gain: 10000 }
    s.incidents.warn = { kiem_tra_attp: 7 }
    startShift(s, ctx)
    const sh = s.shift
    if (!(sh.incidentQueue.length >= 1 && sh.rareMenu.length >= 1)) { s.shift = null; continue }
    found++
    assert.equal(sh.dayKey, '2026-10-06')
    assert.deepEqual(migrateShiftM4(sh), sh, 'ca v3 không bị đổi')
    const back = migrate(decodeSave(encodeSave(s)), DATA)
    assert.deepEqual(back, plain(s), `seed ${seed}: lưu/tải làm đổi state`)
    assert.deepEqual(migrate(decodeSave(encodeSave(back)), DATA), back)
  }
  assert.equal(found, 3, 'không dựng đủ 3 ca có 2 tình huống và món hiếm')
})
