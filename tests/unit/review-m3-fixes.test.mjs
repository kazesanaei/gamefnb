// Hồi quy vòng soát lỗi M3 (DATA thật):
// - save v1/v2 có ví lẻ (giá vốn lẻ của M1/M2) → migrate làm tròn lên bội 500đ, kể cả khi đang dở ca (bất biến ví ca giữ);
// - ca dở không chơi tiếp được (bản game khác đổi cấu trúc ca) → hủy ca, hoàn giá vốn đã trừ, báo qua report;
// - mã sao lưu từ bản mới hơn → readCode cảnh báo 'ban_moi_hon' kèm phần sẽ mất; chuỗi có bước vượt dữ liệu → kẹp, không ném lỗi;
// - bản lưu không đọc được → cất nguyên chuỗi sang '<khóa save>.hong.<ms>' (không trùng, cất lỗi thì báo, không ghi đè);
// - tắt công tắc "Mẹo nghề" vẫn mở thẻ vào Sổ tay nghề;
// - ly trà "mở hàng" khi ca sau đã đủ 8 khách → danh tiếng thay cho khách thêm (không mất tiền mà không được gì).
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState, unlockTip } from '../../src/core/state.js'
import { startShift, advance, customerCount } from '../../src/core/shift.js'
import {
  encodeSave, decodeSave, migrate, readCode, exportCode, loadFrom, archiveUnreadable, unreadableSaves, countBrokenArchives,
  brokenPrefix, DEV_KEYS, SAVE_KEY, BACKUP_KEY
} from '../../src/core/save.js'
import { refreshMeta } from '../../src/core/meta.js'
import { chainStatus } from '../../src/core/chains.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { openIncident, resolveIncident, incidentLossCap, incidentView } from '../../src/core/incidents.js'
import { playShift, counterStep, cookTicket } from '../helpers/perfect-player.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'

function makeCtx() {
  const events = []
  return { data: DATA, events, emit: (type, payload) => events.push({ type, payload }) }
}

function memStorage(init = {}) {
  const m = new Map(Object.entries(init))
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)) }, keys: () => m.keys(), _m: m }
}

// Save kiểu M1 (version 1, chưa có trường meta M2/M3) với ví lẻ.
function m1Save(extra = {}) {
  return {
    version: 1, seed: 6, shopName: 'Xe Cũ M1', day: 4, chang: 1, wallet: 437250, reputation: 56, goldSpoons: 0,
    ratings: [5, 5, 5, 5, 5], reviews: [], recipes: { banh_mi_op_la: { cooks: 9 }, tra_tac: { cooks: 7 } }, upgrades: {},
    tipsSeen: [], stats: { shiftsPlayed: 3 }, loan: null, settings: { sound: true }, history: [], shift: null, clock: { maxSeen: 0 },
    ...extra
  }
}

test('save v1/v2 ví lẻ 437.250đ → migrate làm tròn LÊN bội 500đ (437.500đ); chạy lại không đổi; báo qua report', () => {
  for (const version of [1, 2]) {
    const report = {}
    const s = migrate(decodeSave(encodeSave(m1Save({ version }))), DATA, report)
    assert.equal(s.wallet, 437500, `v${version}`)
    assert.deepEqual(report.walletRounded, { from: 437250, to: 437500 })
    const again = {}
    assert.equal(migrate(JSON.parse(JSON.stringify(s)), DATA, again).wallet, 437500, 'bội 500đ thì không đổi')
    assert.equal(again.walletRounded, undefined)
  }
  // ví âm lẻ: làm tròn lên (có lợi cho người chơi), không ra -0
  assert.equal(migrate(m1Save({ wallet: -1250 }), DATA).wallet, -1000)
  assert.ok(Object.is(migrate(m1Save({ wallet: -250 }), DATA).wallet, 0))
  // kỷ lục lãi ca lẻ → bội 500đ; nợ Dì Sáu lẻ → làm tròn xuống bội 500đ; quà thư chưa nhận → bội 1.000đ
  const s = migrate(m1Save({
    version: 2, progression: { records: { bestProfit: 81250, mostFiveStars: 4, longestStreak: 3 } },
    loan: { amount: 240000, remaining: 150250 },
    mail: { list: [{ id: 'a', kind: 'le', title: 'Quà', body: '', reward: { money: 10500 }, claimed: false },
      { id: 'b', kind: 'le', title: 'Quà', body: '', reward: { money: 10500 }, claimed: true }], pushed: ['a', 'b'] }
  }), DATA)
  assert.equal(s.progression.records.bestProfit, 81500)
  assert.equal(s.loan.remaining, 150000)
  assert.equal(s.mail.list[0].reward.money, 11000)
  assert.equal(s.mail.list[1].reward.money, 10500, 'thư đã nhận giữ nguyên')
})

test('save cũ dở ca với ví lẻ: ví làm tròn và mốc ví đầu ca dời theo → chơi hết ca, ví bội 500đ, bất biến ví ca giữ', () => {
  const ctx = makeCtx()
  const s = defaultState(11, DATA)
  s.shopName = 'Xe Dở Ca'
  startShift(s, ctx)
  // phục vụ một ít rồi giả lập giá vốn lẻ của M1/M2 (nguyên liệu 250đ)
  let guard = 0
  while (!s.shift.served.length && ++guard < 4000) {
    while (counterStep(s, ctx)) { /* quầy */ }
    for (const t of s.shift.tickets.slice()) cookTicket(s, ctx, t)
    advance(s, 0.5, ctx)
  }
  s.wallet -= 250
  s.shift.ledger.cogs += 250
  assert.notEqual(s.wallet % 500, 0)
  const raw = decodeSave(encodeSave(s))
  const m = migrate(raw, DATA)
  assert.ok(m.shift, 'ca dở giữ nguyên')
  assert.equal(m.wallet % 500, 0)
  assert.equal(m.wallet - s.wallet, 250)
  assert.equal(m.shift.walletStart - s.shift.walletStart, 250, 'mốc ví đầu ca dời theo')
  assert.equal(raw.shift.walletStart, s.shift.walletStart, 'không sửa object thô đầu vào')
  const walletStart = m.shift.walletStart
  const r = playShift(m, ctx)
  assert.equal(m.wallet % 500, 0)
  assert.equal(m.wallet - walletStart, r.summary.profit - r.summary.loanRepaid, 'bất biến ví ca')
})

test('ca dở không đủ cấu trúc (bản khác đổi cấu trúc ca): hủy ca, hoàn giá vốn/hao hụt đã trừ, báo shiftDropped', () => {
  const ctx = makeCtx()
  const s = defaultState(7, DATA)
  s.shopName = 'Xe Đổi Bản'
  startShift(s, ctx)
  let guard = 0
  while (s.shift.ledger.cogs === 0 && ++guard < 4000) {
    while (counterStep(s, ctx)) { /* quầy */ }
    for (const t of s.shift.tickets.slice()) cookTicket(s, ctx, t)
    advance(s, 0.5, ctx)
  }
  s.shift.ledger.waste += 1500
  s.wallet -= 1500
  const spent = s.shift.ledger.cogs + s.shift.ledger.waste
  assert.ok(spent > 0)
  const raw = decodeSave(encodeSave(s))
  raw.shift.plan = { khac: true }           // cấu trúc ca của bản khác
  const report = {}
  const m = migrate(raw, DATA, report)
  assert.equal(m.shift, null)
  assert.equal(m.day, s.day, 'ngày game giữ nguyên, bán lại ngày đó')
  assert.equal(m.wallet, s.wallet + spent)
  assert.equal(m.wallet, s.shift.walletStart, 'như chưa mở ca')
  assert.deepEqual(report.shiftDropped, { day: s.day, refund: spent })
  // ca đủ cấu trúc: không hoàn gì
  const ok = {}
  migrate(decodeSave(encodeSave(s)), DATA, ok)
  assert.equal(ok.shiftDropped, undefined)
  // loadFrom chuyển report
  const rep2 = {}
  const st = memStorage({ [SAVE_KEY]: encodeSave(raw) })
  assert.equal(loadFrom(st, DATA, { report: rep2 }).shift, null)
  assert.equal(rep2.from, SAVE_KEY)
  assert.equal(rep2.shiftDropped.refund, spent)
})

test('readCode: mã từ bản mới hơn (version 3, món/nâng cấp lạ) → warn ban_moi_hon + phần sẽ mất; mã thường không cảnh báo', () => {
  const s = defaultState(3, DATA)
  s.shopName = 'Xe Bản Mới'
  const normal = readCode(exportCode(s), DATA)
  assert.equal(normal.ok, true)
  assert.equal(normal.warn, null)
  assert.deepEqual(normal.lost, { recipes: [], upgrades: [] })
  const newer = { ...JSON.parse(JSON.stringify(s)), version: 3 }
  newer.recipes.pho_bo_moi = { cooks: 3 }
  newer.upgrades = { dao_thep: true, xe_moi_toanh: true }
  const r = readCode(exportCode(newer), DATA)
  assert.equal(r.ok, true)
  assert.equal(r.warn, 'ban_moi_hon')
  assert.deepEqual(r.lost, { recipes: ['pho_bo_moi'], upgrades: ['xe_moi_toanh'] })
  assert.ok(!r.state.recipes.pho_bo_moi)
  assert.equal(r.state.upgrades.dao_thep, true)
  // chỉ version lớn hơn cũng cảnh báo
  assert.equal(readCode(exportCode({ ...JSON.parse(JSON.stringify(s)), version: 3 }), DATA).warn, 'ban_moi_hon')
})

test('chuỗi có bước vượt số bước trong dữ liệu (mã sửa tay/bản khác): migrate kẹp, refreshMeta/chainStatus không ném lỗi', () => {
  const s = defaultState(5, DATA)
  s.shopName = 'Xe Chuỗi Dài'
  s.day = 5
  const raw = JSON.parse(JSON.stringify(s))
  raw.chains = {
    ngay_dau_ra_pho: { step: 7, progress: 2, done: false, claimable: [3, 9], since: '2026-10-01' },
    lam_quen_qr: { step: 99, progress: 0, done: false, claimable: [], since: '' },
    chuoi_la: { step: 4, progress: 0, done: false, claimable: [1], since: '' }
  }
  const m = migrate(decodeSave(encodeSave(raw)), DATA)
  assert.deepEqual(m.chains.ngay_dau_ra_pho, { step: 7, progress: 0, done: true, claimable: [3], since: '2026-10-01' })
  assert.equal(m.chains.lam_quen_qr.step, 3)
  assert.equal(m.chains.lam_quen_qr.done, true)
  assert.ok(m.chains.chuoi_la, 'chuỗi không có trong dữ liệu: giữ nguyên (không xóa dữ liệu)')
  const ctx = makeMetaCtx({ at: '2026-10-06T08:00', attach: true, state: m })
  const info = makeNowInfo(m, ctx.clock.t)
  assert.doesNotThrow(() => refreshMeta(m, info, ctx))
  const st = chainStatus(m, info, ctx).find(c => c.id === 'ngay_dau_ra_pho')
  assert.equal(st.done, true)
  assert.deepEqual(st.claimable.map(c => c.stepIndex), [3])
  // state sống bị sửa tay (không qua migrate): refreshMeta vẫn không ném lỗi
  m.chains.ngay_dau_ra_pho = { step: 12, progress: 0, done: false, claimable: [], since: '' }
  assert.doesNotThrow(() => refreshMeta(m, info, ctx))
  assert.equal(m.chains.ngay_dau_ra_pho.done, true)
})

test('bản lưu không đọc được: cất nguyên chuỗi sang <khóa save>.hong.<ms>, không trùng, bản đọc được không đụng tới', () => {
  const good = encodeSave(Object.assign(defaultState(2, DATA), { shopName: 'Xe Tốt' }))
  const i = Math.floor(good.length / 2)
  const bad = good.slice(0, i) + (good[i] === 'A' ? 'B' : 'A') + good.slice(i + 1)
  // cả hai khóa cùng chuỗi hỏng → cất 1 bản
  const st = memStorage({ [SAVE_KEY]: bad, [BACKUP_KEY]: bad, 'bkn.save.old.5': 'x' })
  assert.equal(unreadableSaves(st, DATA).length, 1)
  const r = archiveUnreadable(st, 1000, DATA)
  assert.deepEqual(r, { ok: true, archived: ['bkn.save.hong.1000'] })
  assert.equal(st.getItem('bkn.save.hong.1000'), bad)
  assert.equal(st.getItem(SAVE_KEY), bad, 'không sửa khóa gốc')
  assert.equal(countBrokenArchives(st), 1)
  // gọi lại (mở game lần sau khi bản dự phòng vẫn hỏng): không cất trùng
  assert.deepEqual(archiveUnreadable(st, 2000, DATA), { ok: true, archived: [] })
  // chuỗi lạ khác (không phải save) cũng được cất; khóa đã có thì lùi thêm 1 ms
  st.setItem(SAVE_KEY, 'dữ liệu lạ của chương trình khác')
  const r2 = archiveUnreadable(st, 1000, DATA)
  assert.deepEqual(r2.archived, ['bkn.save.hong.1001'])
  // bản đọc được: không cất gì
  assert.deepEqual(archiveUnreadable(memStorage({ [SAVE_KEY]: good, [BACKUP_KEY]: good }), 5, DATA), { ok: true, archived: [] })
  // khóa giờ giả: tiền tố riêng
  assert.equal(brokenPrefix({ keys: DEV_KEYS }), 'bkn.save.dev.hong.')
  const dev = memStorage({ 'bkn.save.dev': bad })
  assert.deepEqual(archiveUnreadable(dev, 7, DATA, { keys: DEV_KEYS }).archived, ['bkn.save.dev.hong.7'])
  // bộ nhớ đầy: báo lỗi để giao diện không ghi đè
  const full = memStorage({ [SAVE_KEY]: bad })
  full.setItem = () => { throw new Error('QuotaExceededError') }
  assert.deepEqual(archiveUnreadable(full, 9, DATA), { ok: false, reason: 'loi_ghi', archived: [] })
})

test('tắt công tắc "Mẹo nghề": thẻ vẫn mở và vào Sổ tay nghề khi chơi (chỉ không nổi lên)', () => {
  for (const tips of [true, false]) {
    const ctx = makeCtx()
    const s = defaultState(11, DATA)
    s.shopName = 'Xe Mẹo'
    s.settings.tips = tips
    playShift(s, ctx)
    assert.ok(s.tipsSeen.length >= 3, `tips=${tips}: ${s.tipsSeen.length} thẻ`)
    assert.ok(ctx.events.some(e => e.type === 'tip.unlocked'))
  }
  const s = defaultState(1, DATA)
  s.settings.tips = false
  assert.equal(unlockTip(s, 'first_readback', makeCtx()), 'doc_lai_order')
})

// Ép tình huống khách mở hàng cho ca đang mở.
function forceMoHang(s, ctx) {
  const sh = s.shift
  sh.incident = { id: 'khach_mo_hang', afterClips: 0, status: 'cho', rng: 12345, cap: incidentLossCap(s, sh, ctx), guaranteed: true, detail: null, choice: null, result: null }
}

test('ly trà "mở hàng": ca sau đã đủ 8 khách → lựa chọn ghi rõ và cho +2 danh tiếng thay khách thêm', () => {
  const ctx = makeCtx()
  const s = defaultState(4, DATA)
  s.shopName = 'Xe Đông Khách'
  s.day = 9
  assert.equal(customerCount(s, ctx, 10), 8)
  startShift(s, ctx)
  forceMoHang(s, ctx)
  const v = openIncident(s, ctx)
  const tang = v.choices.find(c => c.id === 'tang')
  assert.match(tang.cost, /ca sau đã đủ 8 khách nên thay bằng \+2 danh tiếng/)
  const rep0 = s.shift.reputationGain
  const r = resolveIncident(s, 'tang', ctx)
  assert.ok(r.ok)
  assert.equal(r.effects.bonus, 0)
  assert.equal(r.effects.rep, 2)
  assert.equal(s.shift.reputationGain, rep0 + 2)
  assert.equal(s.incidents.bonus, null, 'không hứa khách thêm')
  assert.match(r.text, /khen xe/)
  // ngày còn chỗ: vẫn là khách thêm, chữ cái giá ghi rõ trần
  const q = defaultState(4, DATA)
  q.shopName = 'Xe Vắng'
  q.day = 3
  startShift(q, ctx)
  forceMoHang(q, ctx)
  assert.equal(incidentView(q, ctx), null, 'chưa mở')
  const v2 = openIncident(q, ctx)
  assert.match(v2.choices.find(c => c.id === 'tang').cost, /ca sau thêm 1 khách \(ca đã đủ 8 khách thì \+2 danh tiếng\)/)
  const r2 = resolveIncident(q, 'tang', ctx)
  assert.equal(r2.effects.bonus, 1)
  assert.equal(r2.effects.rep, 0)
  assert.deepEqual(q.incidents.bonus, { day: 4, customers: 1, rep: 2 })
})

test('khách thêm đã hứa nhưng tới ca đó đã đủ khách (Chợ phiên, sao cao) → +2 danh tiếng, ghi sh.bonusNote', () => {
  const ctx = makeCtx()
  const s = defaultState(4, DATA)
  s.shopName = 'Xe Đủ Khách'
  s.day = 10
  s.incidents.bonus = { day: 10, customers: 1, rep: 2 }
  const sh = startShift(s, ctx)
  assert.equal(Object.keys(sh.customers).length, 8)
  assert.equal(sh.reputationGain, 2)
  assert.deepEqual(sh.bonusNote, { customers: 0, rep: 2 })
  assert.equal(s.incidents.bonus, null)
  // còn chỗ: thêm khách, không cộng danh tiếng
  const q = defaultState(4, DATA)
  q.shopName = 'Xe Còn Chỗ'
  q.day = 4
  const n0 = Object.keys(startShift(JSON.parse(JSON.stringify(q)), ctx).customers).length
  q.incidents.bonus = { day: 4, customers: 1, rep: 2 }
  const sh2 = startShift(q, ctx)
  assert.equal(Object.keys(sh2.customers).length, n0 + 1)
  assert.equal(sh2.reputationGain, 0)
  assert.deepEqual(sh2.bonusNote, { customers: 1, rep: 0 })
  // save cũ chưa có rep: migrate thêm rep 0
  assert.deepEqual(migrate({ ...JSON.parse(JSON.stringify(q)), incidents: { bonus: { day: 5, customers: 1 } } }, DATA).incidents.bonus, { day: 5, customers: 1, rep: 0 })
})

test('lớp vỏ mini-game: phin cà phê, nồi luộc, tô rưới có nhãn và gợi ý riêng (không nhắc "chảo", không mở thẻ cháy chảo dầu)', async () => {
  const { hintFor, skinFor } = await import('../../src/ui/minigames/index.js')
  const { dishComment } = await import('../../src/ui/screens/kitchen.js')
  const steps = Object.values(DATA.RECIPES).flatMap(r => r.steps.map(s => ({ ...s, recipeId: r.id })))
  // mọi skin khai báo trong công thức đều có trong MINIGAME_TYPES
  for (const s of steps.filter(x => x.skin)) {
    assert.ok(DATA.MINIGAME_TYPES[s.type].skins[s.skin], `${s.recipeId}.${s.id}: skin ${s.skin}`)
  }
  const find = (rid, sid) => DATA.RECIPES[rid].steps.find(s => s.id === sid)
  const phin = find('ca_phe_sua_da', 'u_phin')
  assert.equal(phin.skin, 'phin')
  assert.doesNotMatch(hintFor(phin, DATA).text, /chảo/i)
  assert.equal(skinFor(phin, DATA).act, 'Nhấc phin')
  assert.equal(skinFor(phin, DATA).over, 'Quá đặc')
  assert.equal(skinFor(find('che_buoi', 'luoc'), DATA).act, 'Vớt ra')
  assert.equal(skinFor(find('banh_trang_tron', 'rot_dau_hanh'), DATA).act, 'Giữ để rưới')
  // bước không khai báo skin: lớp vỏ mặc định (chảo, ly)
  const chien = find('banh_mi_op_la', 'chien_trung')
  assert.equal(skinFor(chien, DATA).act, 'Nhấc')
  assert.match(hintFor(chien, DATA).text, /chảo/)
  // lời nhắc khi quá lửa theo lớp vỏ
  const dish = { q: 40, steps: { u_phin: { score: 0, tag: 'chay' } }, ingErrors: [] }
  assert.doesNotMatch(dishComment(dish, DATA.RECIPES.ca_phe_sua_da, DATA), /cháy/)
  // quá lửa ở phin không mở thẻ "Chảo dầu bốc cháy"
  const { startCook, submitChon, submitStep, availableSteps } = await import('../../src/core/kitchen.js')
  const { requiredIngredients } = await import('../../src/core/scoring.js')
  const ctx = makeCtx()
  const s = defaultState(9, DATA)
  s.recipes.ca_phe_sua_da = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 }
  startShift(s, ctx)
  s.shift.tickets.push({ id: 'tx', no: '#099', customerId: 'k1', lines: [{ recipeId: 'ca_phe_sua_da', qty: 1, notes: [] }], createdAt: 0, status: 'cho', done: [null] })
  assert.ok(startCook(s, 'tx', 0, ctx))
  assert.ok(submitChon(s, requiredIngredients(DATA.RECIPES.ca_phe_sua_da, []).required, 0, ctx).ok)
  for (const id of ['rot_nuoc']) submitStep(s, id, { score: 90 }, ctx)
  assert.ok(availableSteps(s).includes('u_phin'))
  const r = submitStep(s, 'u_phin', { score: 0, details: { value: 1.1 } }, ctx)
  assert.equal(r.tag, 'chay')
  assert.ok(!s.tipsSeen.includes('chao_dau_boc_chay'), 'không mở thẻ cháy chảo dầu cho phin cà phê')
})
