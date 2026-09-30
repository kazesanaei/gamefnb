// Test hồi quy cho các phát hiện của vòng soát lỗi M2 (R1–R14, UX-01, UX-02, UX-07, UX-10).
// DATA thật, đồng hồ giả (tests/helpers/meta-helpers.mjs), người chơi hoàn hảo khi cần chơi trọn ca.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState, refIncomeFor } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import {
  SAVE_KEY, DEV_KEYS, writeSave, saveTo, loadFrom, storedRev, encodeSave, decodeSave, migrate
} from '../../src/core/save.js'
import { refreshMeta, handleMetaEvent } from '../../src/core/meta.js'
import { signalsFor } from '../../src/core/stats.js'
import { rollDailyQuests, ensureDaily, questList } from '../../src/core/quests.js'
import { claimMail, pushMail } from '../../src/core/mail.js'
import { chainStatus, claimChainReward } from '../../src/core/chains.js'
import {
  settleEvents, eventState, eventsOverview, exchangeTem, ensureEventQuests, eventQuestList, dayEventInfo,
  dayEventEffects, setDayEventChoice
} from '../../src/core/events.js'
import { resolveReward } from '../../src/core/rewards.js'
import { startTasting, canTaste, shopCatalog, finishTasting } from '../../src/core/shop.js'
import { startShift, advance, isShiftOver, endShift } from '../../src/core/shift.js'
import { startCook, submitChon, availableSteps, getStep, submitStep, finishDish, serveTicket } from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { counterStep, cookTicket, playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx, newState, at, vn } from '../helpers/meta-helpers.mjs'

const EV = 'tri_an_20_11'
const CH = 'tri_an_20_11_chuoi'

function memStorage() {
  const m = {}
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v) }, _m: m }
}

// Chơi trọn 1 ca; mọi bước bếp `score`, riêng bước đầu của mỗi món `firstScore` (89: món Tuyệt hảo nhưng không Không tì vết).
function playCustom(state, ctx, { score = 100, firstScore = 100 } = {}) {
  startShift(state, ctx)
  const sheets = []
  let steps = 0
  while (!isShiftOver(state)) {
    if (++steps > 20000) throw new Error('ca không kết thúc')
    while (counterStep(state, ctx)) { /* quầy */ }
    for (const t of state.shift.tickets.slice()) {
      for (let i = 0; i < t.lines.length; i++) {
        if (t.done[i]) continue
        const cook = startCook(state, t.id, i, ctx)
        submitChon(state, requiredIngredients(DATA.RECIPES[cook.recipeId], cook.notes).required, 0, ctx)
        let av, k = 0
        while ((av = availableSteps(state)).length) {
          const st = getStep(state, av[0])
          submitStep(state, av[0], { score: k++ === 0 ? firstScore : score, method: st.method ? st.method.correct : undefined }, ctx)
        }
        finishDish(state, ctx)
      }
      const cust = state.shift.customers[t.customerId]
      const sheet = serveTicket(state, t.id, ctx)
      sheets.push({ ...sheet, strict: !!(DATA.PERSONAS[cust.persona] && DATA.PERSONAS[cust.persona].strict) })
    }
    if (!isShiftOver(state)) advance(state, 0.5, ctx)
  }
  return { summary: endShift(state, ctx), sheets }
}

// ---------- R1: hai tab ----------

test('R1: tab cũ không ghi đè bản lưu mới hơn của tab khác (state.rev)', () => {
  const st = memStorage()
  const a = defaultState(1, DATA)
  const w0 = writeSave(st, a, { guard: true })
  assert.equal(w0.ok, true)
  assert.equal(a.rev, 1)
  // tab B mở cùng save, nhận quà rồi lưu
  const b = loadFrom(st, DATA)
  assert.equal(b.rev, 1)
  b.goldSpoons = 20
  assert.equal(writeSave(st, b, { guard: true }).ok, true)
  assert.equal(storedRev(st), 2)
  // tab A (vẫn giữ bản cũ trong bộ nhớ) đổi cài đặt rồi lưu: bị chặn, bản mới giữ nguyên
  a.settings.sound = false
  assert.deepEqual(writeSave(st, a, { guard: true, lastCode: w0.code }), { ok: false, reason: 'tab_khac' })
  assert.equal(a.rev, 1, 'không tăng số hiệu khi không ghi')
  assert.equal(loadFrom(st, DATA).goldSpoons, 20)
  // không bật guard (vd test cũ) thì ghi như trước; migrate giữ rev
  assert.equal(saveTo(st, a), true)
  assert.equal(migrate(decodeSave(encodeSave(a)), DATA).rev, a.rev)
  assert.equal(migrate({ version: 1 }, DATA).rev, 0, 'save cũ chưa có rev')
})

// ---------- R14: ?devNow lưu ở khóa riêng ----------

test('R14: save xem trước giờ giả nằm ở khóa riêng, không đụng save thật', () => {
  const st = memStorage()
  const real = defaultState(2, DATA)
  real.shopName = 'Xe thật'
  saveTo(st, real)
  const realCode = st._m[SAVE_KEY]
  // lần đầu xem trước: chưa có bản dev → chép từ bản thật; lưu vào khóa dev
  const dev = loadFrom(st, DATA, { keys: DEV_KEYS }) || loadFrom(st, DATA)
  assert.equal(dev.shopName, 'Xe thật')
  makeNowInfo(dev, vn('2026-11-15T09:00'))
  assert.equal(writeSave(st, dev, { keys: DEV_KEYS, guard: true }).ok, true)
  assert.equal(st._m[SAVE_KEY], realCode, 'save thật không đổi')
  assert.equal(loadFrom(st, DATA).clock.maxSeen, 0, 'save thật không bị ghi mốc giờ giả')
  assert.ok(loadFrom(st, DATA, { keys: DEV_KEYS }).clock.maxSeen > 0)
})

// ---------- R2: Tem dư ----------

test('R2: Tem dư đổi tỉ lệ thấp, trần 1 thu nhập tham chiếu, tính vào trần quà tháng', () => {
  const ctx = makeMetaCtx()
  const s = newState(3)
  s.day = 12
  const ref = refIncomeFor(ctx, s.day)
  eventState(s, EV).tem = 835
  const ids = settleEvents(s, at(s, '2026-11-25T09:00'), ctx)
  assert.deepEqual(ids, [`tem_du:${EV}`])
  const m = s.mail.list.find(x => x.id === `tem_du:${EV}`)
  assert.equal(m.reward.money, ref, '835 Tem × 0,2 = 1,67 thu nhập tham chiếu → trần 1')
  assert.equal(s.mail.monthly['2026-11'].value, ref, 'không phải quà đền bù: tính vào trần tháng')
  // 250 Tem → 0,5 thu nhập tham chiếu
  const s2 = newState(3)
  s2.day = 12
  eventState(s2, EV).tem = 250
  settleEvents(s2, at(s2, '2026-11-25T09:00'), ctx)
  assert.equal(s2.mail.list.find(x => x.id === `tem_du:${EV}`).reward.money, 0.5 * ref)
  // trần tháng còn ít chỗ → đổi ít lại; hết chỗ → chỉ báo, không có quà
  const s3 = newState(3)
  s3.day = 12
  s3.mail = { list: [], pushed: [], monthly: { '2026-11': { count: 1, everyday: 2, value: 3 * ref - 30000 } }, seenVersion: '0.2.0', pendingReviews: [] }
  eventState(s3, EV).tem = 835
  settleEvents(s3, at(s3, '2026-11-25T09:00'), ctx)
  assert.equal(s3.mail.list.find(x => x.id === `tem_du:${EV}`).reward.money, 30000)
  const s4 = newState(3)
  s4.day = 12
  s4.mail = { list: [], pushed: [], monthly: { '2026-11': { count: 1, everyday: 2, value: 3 * ref } }, seenVersion: '0.2.0', pendingReviews: [] }
  eventState(s4, EV).tem = 835
  settleEvents(s4, at(s4, '2026-11-25T09:00'), ctx)
  const m4 = s4.mail.list.find(x => x.id === `tem_du:${EV}`)
  assert.deepEqual(m4.reward, {})
  assert.match(m4.body, /quà tháng này đã đủ/)
})

// ---------- R3: Hỗ trợ thao tác không làm kẹt chuỗi ----------

test('R3: bật Hỗ trợ thao tác, bước chuỗi "Tuyệt hảo"/"5 sao" đếm mức thay thế; việc Tuyệt hảo không bị bốc', () => {
  const ctx = makeMetaCtx()
  const good = { recipeId: 'banh_mi_op_la', grade: 'ngon', q: 85, flawless: false, errors: [] }
  const rated4 = { customerId: 'k', stars: 4, counterErrors: [], kitchenErrors: [] }
  // C1 bước 6 "Nấu 3 món Tuyệt hảo"
  const s = newState(4)
  s.settings.assistMotion = true
  s.chains.ngay_dau_ra_pho = { step: 5, progress: 0, done: false, claimable: [], since: '' }
  const ni = at(s, '2026-10-10T09:00')
  const cs = chainStatus(s, ni, ctx).find(c => c.id === 'ngay_dau_ra_pho')
  assert.match(cs.assistText, /Hỗ trợ thao tác/)
  for (let i = 0; i < 3; i++) handleMetaEvent(s, 'dish.done', good, ctx, ni)
  assert.equal(s.chains.ngay_dau_ra_pho.step, 6, 'bước Tuyệt hảo xong bằng món Ngon khi bật Hỗ trợ')
  // tắt Hỗ trợ thì vẫn đòi Tuyệt hảo
  const s0 = newState(4)
  s0.chains.ngay_dau_ra_pho = { step: 5, progress: 0, done: false, claimable: [], since: '' }
  for (let i = 0; i < 3; i++) handleMetaEvent(s0, 'dish.done', good, ctx, at(s0, '2026-10-10T09:00'))
  assert.equal(s0.chains.ngay_dau_ra_pho.step, 5)
  assert.equal(chainStatus(s0, at(s0, '2026-10-10T09:00'), ctx).find(c => c.id === 'ngay_dau_ra_pho').assistText, '')
  // chuỗi sự kiện bước 4 (khách 5 sao) và bước 5 (Tuyệt hảo) → khách từ 4 sao, món Ngon
  const e = newState(5)
  e.settings.assistMotion = true
  const en = at(e, '2026-11-21T20:00')
  handleMetaEvent(e, 'shift.started', { day: 1 }, ctx, en)
  e.chains[CH] = { step: 3, progress: 0, done: false, claimable: [], since: '' }
  for (let i = 0; i < 3; i++) handleMetaEvent(e, 'customer.rated', rated4, ctx, en)
  assert.equal(e.chains[CH].step, 4)
  for (let i = 0; i < 2; i++) handleMetaEvent(e, 'dish.done', good, ctx, en)
  assert.equal(e.chains[CH].done, true, 'nhận được Chè bưởi khi bật Hỗ trợ')
  // việc sự kiện "khách 5 sao" cũng đếm khách từ 4 sao
  const q = eventQuestList(e, EV, en, ctx).find(x => x.id === 'ev_nam_sao')
  assert.equal(q.progress, 2)
  assert.match(q.assistText, /4 sao/)
  // Việc hôm nay: bật Hỗ trợ thao tác thì không bốc việc Tuyệt hảo / Hoàn hảo khi còn việc khác cùng nhóm
  for (let seed = 1; seed <= 200; seed++) {
    const st = defaultState(seed, DATA)
    st.day = 6
    st.settings.assistMotion = true
    const ids = rollDailyQuests(st, '2026-10-10', { data: DATA }).map(x => x.id)
    for (const id of ['tuyet_hao', 'thai_hoan_hao', 'lua_hoan_hao']) assert.ok(!ids.includes(id), `seed ${seed}: ${id}`)
  }
})

// ---------- R4, R7, UX-01: ân hạn và sau ân hạn ----------

test('R4/UX-01: trong ân hạn thưởng chuỗi sự kiện vẫn nhận được, thẻ sự kiện báo có quà, Tem dùng được ở Quầy đổi', () => {
  const ctx = makeMetaCtx()
  const s = newState(6)
  eventState(s, EV).days = ['2026-11-12', '2026-11-15', '2026-11-21']
  s.chains[CH] = { step: 5, progress: 0, done: true, claimable: [3, 4], since: '2026-11-21' }
  const ni = at(s, '2026-11-22T09:00')
  const ov = eventsOverview(s, ni, ctx).find(x => x.id === EV)
  assert.equal(ov.phase, 'an_han')
  assert.equal(ov.pending, 2, 'chấm đỏ thẻ sự kiện ở màn Chuẩn bị')
  const c = chainStatus(s, ni, ctx).find(x => x.id === CH)
  assert.deepEqual(c.claimable.map(k => k.stepIndex), [3, 4])
  assert.equal(c.claimable[1].reward.eventId, EV)
  assert.equal(claimChainReward(s, CH, 3, ni, ctx).ok, true)
  assert.equal(claimChainReward(s, CH, 4, ni, ctx).ok, true)
  assert.ok(s.recipes.che_buoi)
  assert.equal(s.events[EV].tem, 75)
  assert.equal(exchangeTem(s, EV, 'doi_muong_vang', ni, ctx).ok, true, 'đổi Tem trong ân hạn')
  assert.equal(eventsOverview(s, ni, ctx).find(x => x.id === EV).pending, 0)
})

test('R7: phần thưởng Tem giữ eventId khi đi qua Hộp thư', () => {
  const ctx = makeMetaCtx()
  const s = newState(7)
  const r = resolveReward(s, { tem: 40, recipe: 'che_buoi', eventId: EV }, ctx)
  assert.equal(r.eventId, EV)
  const ni = at(s, '2026-11-15T09:00')
  const p = pushMail(s, { id: 'thu_tem', kind: 'su_kien', title: 't', body: 'b', reward: { tem: 40, eventId: EV } }, ni, ctx, { compensation: true })
  assert.equal(p.mail.reward.eventId, EV)
  assert.equal(claimMail(s, 'thu_tem', ni, ctx).ok, true)
  assert.equal(s.events[EV].tem, 40)
})

// ---------- R5: việc "Nấu n phần món vừa mua" ----------

test('R5: món hợp lệ chốt lúc bốc việc, chơi thêm ca (món hết "mới") vẫn đếm', () => {
  const ctx = makeMetaCtx()
  let seed = 0, s = null
  for (let k = 1; k < 500 && !s; k++) {
    const t = newState(k)
    t.day = 4
    t.recipes.banh_trang_tron = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 2 }
    ensureDaily(t, at(t, '2026-10-07T08:00'), ctx)
    if (t.daily.quests.some(q => q.id === 'mon_vua_mua')) { s = t; seed = k }
  }
  assert.ok(s, 'không tìm được seed có việc món vừa mua')
  const q = () => s.daily.quests.find(x => x.id === 'mon_vua_mua')
  assert.deepEqual(q().recipeIds, ['banh_trang_tron'], `seed ${seed}`)
  s.day = 7                                   // đã qua 3 ca: món không còn "mới"
  const ni = at(s, '2026-10-07T15:00')
  handleMetaEvent(s, 'dish.done', { recipeId: 'tra_tac', grade: 'ngon', q: 80, flawless: false, errors: [] }, ctx, ni)
  assert.equal(q().progress, 0, 'món khác không đếm')
  handleMetaEvent(s, 'dish.done', { recipeId: 'banh_trang_tron', grade: 'ngon', q: 80, flawless: false, errors: [] }, ctx, ni)
  assert.equal(q().progress, 1)
  // save cũ chưa có recipeIds: tính theo ngày game lúc bốc (daily.gameDay)
  delete q().recipeIds
  handleMetaEvent(s, 'dish.done', { recipeId: 'banh_trang_tron', grade: 'ngon', q: 80, flawless: false, errors: [] }, ctx, ni)
  assert.equal(q().progress, 2)
  // migrate giữ danh sách
  const back = migrate(decodeSave(encodeSave({ ...s, daily: { ...s.daily, quests: s.daily.quests.map(x => x.id === 'mon_vua_mua' ? { ...x, recipeIds: ['banh_trang_tron'] } : x) } })), DATA)
  assert.deepEqual(back.daily.quests.find(x => x.id === 'mon_vua_mua').recipeIds, ['banh_trang_tron'])
})

// ---------- R6: Hỗ trợ tính tiền và chuỗi "Quầy chuẩn" ----------

test('R6: bật Hỗ trợ tính tiền thì chuỗi Quầy chuẩn không đếm, không tip 10.000đ theo chuỗi, không ghi kỷ lục', () => {
  const run = assistCash => {
    const ctx = makeMetaCtx({ at: '2026-10-10T08:00', attach: true })
    const s = defaultState(3, DATA)
    ctx.setState(s)
    s.day = 9
    s.settings.assistCash = assistCash
    const streaks = []
    ctx.bus.on('ticket.clipped', () => streaks.push(s.shift.counterStreak))
    // bước đầu 89 điểm: món Tuyệt hảo nhưng không Không tì vết → tip 10.000đ chỉ có thể đến từ chuỗi Quầy chuẩn
    const { sheets } = playCustom(s, ctx, { firstScore: 89 })
    // khách khó tính 5 sao vốn được tip 10.000đ: bỏ ra khỏi phép so
    return { streaks, tips: sheets.filter(x => x.stars === 5 && !x.strict).map(x => x.tip), longest: s.progression.records.longestStreak }
  }
  const off = run(false)
  assert.ok(off.tips.includes(10000), 'không bật Hỗ trợ: chuỗi ≥ 5 có tip 10.000đ')
  assert.ok(off.longest >= 5)
  const on = run(true)
  assert.ok(on.streaks.length >= 5)
  assert.ok(on.streaks.every(x => x === 0), 'chuỗi Quầy chuẩn không đếm')
  assert.ok(on.tips.length && on.tips.every(x => x === 5000), 'tip khách 5 sao chỉ 5.000đ')
  assert.equal(on.longest, 0)
})

// ---------- R8, UX-02: việc sự kiện qua mốc 04:00 ----------

test('R8/UX-02: việc sự kiện xong mà chưa nhận tự cộng Tem khi sang ngày; ca vắt qua 04:00 đếm cho ngày mới', () => {
  const ctx = makeMetaCtx()
  const s = newState(8)
  const d1 = at(s, '2026-11-13T09:00')
  handleMetaEvent(s, 'shift.started', { day: 1 }, ctx, d1)
  const rated = { customerId: 'k', stars: 5, counterErrors: [], kitchenErrors: [] }
  for (let i = 0; i < 4; i++) handleMetaEvent(s, 'customer.rated', rated, ctx, d1)
  assert.ok(ctx.events.some(e => e.type === 'event.quest' && e.payload.id === 'ev_nam_sao' && e.payload.justDone), 'báo việc sự kiện trong ca')
  const tem0 = s.events[EV].tem
  // hôm sau mở game: 2 việc đã xong (phục vụ 4, 2 khách 5 sao) tự cộng 20 Tem, danh sách mới về 0
  const res = refreshMeta(s, at(s, '2026-11-14T09:00'), ctx)
  assert.deepEqual(res.eventQuestsAuto, [{ eventId: EV, tem: 20, dayKey: '2026-11-13' }])
  assert.equal(s.events[EV].tem - tem0, 20)
  assert.equal(s.events[EV].quests.dayKey, '2026-11-14')
  assert.ok(s.events[EV].quests.list.every(q => q.progress === 0 && !q.claimed))
  // ca bắt đầu 03:58 ngày 15/11 (vẫn là ngày 14/11), sau 04:00 đếm cho danh sách ngày 15/11
  s.shift = { day: s.day }                    // đang trong ca (chỉ cần state.shift khác null)
  const before = at(s, '2026-11-15T03:58')
  handleMetaEvent(s, 'customer.rated', rated, ctx, before)
  assert.equal(s.events[EV].quests.dayKey, '2026-11-14')
  const after = at(s, '2026-11-15T04:05')
  handleMetaEvent(s, 'customer.rated', rated, ctx, after)
  assert.equal(s.events[EV].quests.dayKey, '2026-11-15')
  assert.equal(s.events[EV].quests.list.find(q => q.id === 'ev_phuc_vu').progress, 1)
  assert.ok(s.events[EV].days.includes('2026-11-15'), 'chơi qua 04:00 tính là đã chơi ngày mới trong mùa')
})

// ---------- R9: nấu thử ----------

test('R9: đang nấu thử dở món A thì không mở nấu thử món B (mỗi món chỉ 1 lần)', () => {
  const ctx = { data: DATA, emit: () => {} }
  const s = defaultState(5, DATA)
  s.day = 5
  assert.equal(startTasting(s, 'banh_trang_tron', ctx).ok, true)
  assert.deepEqual(startTasting(s, 'ca_phe_sua_da', ctx), { ok: false, reason: 'dang_nau_thu' })
  assert.equal(canTaste(s, 'ca_phe_sua_da', ctx).reason, 'dang_nau_thu')
  const cat = shopCatalog(s, ctx)
  assert.equal(cat.recipes.find(r => r.id === 'ca_phe_sua_da').canTaste, false)
  assert.equal(cat.recipes.find(r => r.id === 'ca_phe_sua_da').tastingOther, true)
  assert.equal(s.tasting.recipeId, 'banh_trang_tron')
  // quay lại món A vẫn được; xong món A thì món B mở
  assert.equal(startTasting(s, 'banh_trang_tron', ctx).ok, true)
  finishTasting(s, ctx)
  assert.equal(startTasting(s, 'banh_trang_tron', ctx).reason, 'da_nau_thu')
  assert.equal(startTasting(s, 'ca_phe_sua_da', ctx).ok, true)
})

// ---------- R10: "Không để khách nào bỏ về" ----------

test('R10: bắt được ảnh chuyển khoản giả không làm hỏng việc "Không để khách nào bỏ về"', () => {
  const ctx = makeMetaCtx({ at: '2026-10-10T08:00', attach: true })
  const s = defaultState(11, DATA)
  ctx.setState(s)
  s.day = 5
  s.chains.lam_quen_qr = { step: 1, progress: 0, done: false, claimable: [], since: '' }  // ép 1 khách ảnh giả
  refreshMeta(s, makeNowInfo(s, ctx.clock.t), ctx)
  const sigs = []
  ctx.bus.on('*', (p, type) => { if (type === 'shift.ended') sigs.push(...signalsFor(JSON.parse(JSON.stringify(s)), type, p).map(x => x.sig)) })
  const { summary } = playShift(s, ctx)
  assert.equal(summary.lost, 1)
  assert.equal(summary.scamCaught, 1)
  assert.equal(s.history[s.history.length - 1].scamCaught, 1)
  assert.ok(sigs.includes('shift_no_loss'))
  // có khách bỏ về thật thì không tính
  assert.equal(signalsFor(s, 'shift.ended', { day: 1, served: 3, lost: 2, scamCaught: 1 }).some(x => x.sig === 'shift_no_loss'), false)
})

// ---------- R11: món lễ thêm danh tiếng trong mùa ----------

test('R11: trong mùa, mỗi phần Chè bưởi đạt Ngon trở lên được +1 danh tiếng', () => {
  const run = when => {
    const ctx = { ...makeMetaCtx(), now: () => vn(when) }
    const s = defaultState(13, DATA)
    s.day = 8
    s.recipes.che_buoi = { cooks: 0, goodCooks: 0, excellent: 0, flawless: 0, best: 0, boughtDay: 0 }
    s.eventRecipes.che_buoi = { eventId: EV, label: 'Tri ân 20/11 · 2026', day: 1 }
    startShift(s, ctx)
    // khách đầu tiên (không phải hướng dẫn) gọi 2 phần Chè bưởi
    const first = s.shift.plan[0].customerId
    s.shift.customers[first].request = [{ recipeId: 'che_buoi', qty: 2, notes: [] }]
    const sheets = []
    let steps = 0
    while (!isShiftOver(s)) {
      if (++steps > 20000) throw new Error('ca không kết thúc')
      while (counterStep(s, ctx)) { /* quầy */ }
      for (const t of s.shift.tickets.slice()) sheets.push(cookTicket(s, ctx, t))
      if (!isShiftOver(s)) advance(s, 0.5, ctx)
    }
    const sheet = sheets.find(x => x.customerId === first)
    const table = DATA.BALANCE.reputationByStars
    const base = (table[sheet.stars] || 0) + (sheet.dishes.some(d => d.flawless) ? 1 : 0)
    return sheet.reputation - base
  }
  assert.equal(run('2026-11-15T09:00'), 2, '2 phần Chè bưởi trong mùa')
  assert.equal(run('2026-12-15T09:00'), 0, 'ngoài mùa không thêm')
})

// ---------- R12, R13: dữ liệu theo đặc tả ----------

test('R12/R13: ô 5 Tuần Khai Trương là 2 Phiếu Chợ Sớm; ngưỡng danh tiếng lên Chặng 2 là 150 (khớp bước 7 chuỗi C1)', () => {
  assert.deepEqual(DATA.CHECKIN.firstRound.rewards[4], { items: { phieu_cho_som: 2 } })
  const rep = DATA.STAGE_UP[2].requirements.find(r => r.kind === 'reputation').target
  assert.equal(rep, 150)
  const last = DATA.CHAINS.ngay_dau_ra_pho.steps[6]
  assert.equal(last.check.reputation, rep)
  assert.match(last.text, /150 danh tiếng/)
})

// ---------- UX-07: hiệu ứng sự kiện ngày theo lựa chọn ----------

test('UX-07: đã chọn Căng bạt (hoặc có Bạt che mưa) thì hiệu ứng hiển thị là của lựa chọn', () => {
  const ctx = { data: DATA, emit: () => {} }
  let s = null
  for (let seed = 1; seed < 2000 && !s; seed++) {
    const t = defaultState(seed, DATA)
    t.day = 5
    const info = dayEventInfo(t, t.day, ctx)
    if (info && info.id === 'troi_mua') s = t
  }
  assert.ok(s)
  assert.equal(dayEventEffects(dayEventInfo(s, s.day, ctx), ctx).customerMul, 0.8)
  assert.equal(setDayEventChoice(s, 'cang_bat', ctx).ok, true)
  assert.equal(dayEventEffects(dayEventInfo(s, s.day, ctx), ctx).customerMul, 0.95)
  const t = JSON.parse(JSON.stringify(s))
  t.prep.dayEventChoice = null
  t.items.bat_che_mua = 1
  assert.equal(dayEventEffects(dayEventInfo(t, t.day, ctx), ctx).customerMul, 0.95)
})

// ---------- UX-10: thư việc quên nhận ----------

test('UX-10: thư việc quên nhận ghi "hôm qua" hoặc ngày cụ thể; nhãn loại thư "Việc chưa nhận"', () => {
  const ctx = makeMetaCtx()
  const mk = () => {
    const s = newState(21)
    ensureDaily(s, at(s, '2026-10-01T09:00'), ctx)
    for (const q of s.daily.quests) q.progress = q.target
    return s
  }
  const a = mk()
  ensureDaily(a, at(a, '2026-10-02T09:00'), ctx)
  const ma = a.mail.list.filter(m => m.kind === 'nhiem_vu')
  assert.equal(ma.length, 4)
  assert.ok(ma.every(m => /hôm qua/i.test(m.title) && /^Hôm qua/.test(m.body)), ma.map(m => m.title + ' | ' + m.body).join('\n'))
  const b = mk()
  ensureDaily(b, at(b, '2026-10-05T09:00'), ctx)
  const mb = b.mail.list.filter(m => m.kind === 'nhiem_vu')
  assert.ok(mb.every(m => /ngày 01\/10/.test(m.title) && /^Ngày 01\/10/.test(m.body) && !/hôm qua/i.test(m.title + m.body)),
    mb.map(m => m.title + ' | ' + m.body).join('\n'))
  assert.equal(b.mail.list.find(m => m.id.startsWith('ruong:')).title, 'Rương ngày 01/10 chưa mở')
  assert.equal(a.mail.list.find(m => m.id.startsWith('ruong:')).title, 'Rương ngày hôm qua chưa mở')
  assert.ok(!/ngày ngày/.test(b.mail.list.map(m => m.title + m.body).join(' ')))
  assert.equal(DATA.MAIL_CONFIG.kinds.nhiem_vu, 'Việc chưa nhận')
  assert.equal(questList(b, ctx).quests.length, 3)
})
