// Sự kiện có thời hạn "Tri ân 20/11" (biên thời gian, Tem, chuỗi tặng Chè bưởi, giữ món sau sự kiện, Quầy đổi Tem,
// Tem dư) và sự kiện ngày (ảnh hưởng sinh khách, ρ ≤ 0,9).
import test from 'node:test'
import assert from 'node:assert/strict'
import { isEventActive, eventPhase, eventsOverview, awardDishTem, markEventDay, ensureEventQuests, eventQuestList,
  claimEventQuest, claimEventCheckin, eventCheckinStatus, exchangeTem, exchangeList, settleEvents,
  rollDayEvent, dayEventInfo, setDayEventChoice, setMarketCoupon } from '../../src/core/events.js'
import { handleMetaEvent, refreshMeta } from '../../src/core/meta.js'
import { claimChainReward, chainStatus } from '../../src/core/chains.js'
import { orderableRecipes, makeRequest } from '../../src/core/customer.js'
import { startShift, loadFactor, customerCount } from '../../src/core/shift.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx, newState, at, vn, DATA } from '../helpers/meta-helpers.mjs'

const EV = 'tri_an_20_11'
const CH = 'tri_an_20_11_chuoi'

test('isEventActive: biên thời gian đầu/cuối theo 04:00 giờ Việt Nam; thẻ "Sắp diễn ra" từ 3 ngày trước', () => {
  assert.equal(isEventActive(EV, vn('2026-11-12T03:59:59.999')), false)
  assert.equal(isEventActive(EV, vn('2026-11-12T04:00')), true)
  assert.equal(isEventActive(EV, vn('2026-11-22T03:59:59.999')), true)
  assert.equal(isEventActive(EV, vn('2026-11-22T04:00')), false)
  assert.equal(isEventActive('khong_co', vn('2026-11-15T04:00')), false)
  const ev = DATA.EVENTS[EV]
  assert.equal(eventPhase(ev, vn('2026-11-09T03:59')), 'chua_toi')
  assert.equal(eventPhase(ev, vn('2026-11-09T04:00')), 'sap_dien_ra')
  assert.equal(eventPhase(ev, vn('2026-11-15T12:00')), 'dang_dien_ra')
  assert.equal(eventPhase(ev, vn('2026-11-24T12:00')), 'an_han')
  assert.equal(eventPhase(ev, vn('2026-11-25T04:00')), 'da_ket_thuc')
  const ctx = makeMetaCtx()
  const s = newState(1)
  const o = eventsOverview(s, at(s, '2026-11-10T09:00'), ctx)
  assert.equal(o.length, 1)
  assert.equal(o[0].phase, 'sap_dien_ra')
  assert.equal(o[0].currencyName, 'Phấn Trắng')
  assert.equal(o[0].msToStart, vn('2026-11-12T04:00') - vn('2026-11-10T09:00'))
  const s0 = newState(9)
  assert.equal(eventsOverview(s0, at(s0, '2026-11-01T09:00'), ctx).length, 0)
  // thời điểm tin cậy: lùi giờ về trong mùa không mở lại sự kiện đã hết
  const s2 = newState(2)
  makeNowInfo(s2, vn('2026-11-26T09:00'))
  const back = makeNowInfo(s2, vn('2026-11-15T09:00'))
  assert.equal(isEventActive(EV, back.trusted), false)
})

test('Tem: món Ngon trở lên +1, món lễ +2 thêm, trần 30 Tem/ngày; ngoài mùa không có Tem', () => {
  const ctx = makeMetaCtx()
  const s = newState(3)
  let ni = at(s, '2026-11-13T09:00')
  assert.equal(awardDishTem(s, 'banh_mi_op_la', 'ngon', ni, ctx), 1)
  assert.equal(awardDishTem(s, 'banh_mi_op_la', 'duoc', ni, ctx), 0)
  assert.equal(awardDishTem(s, 'che_buoi', 'tuyet_hao', ni, ctx), 3)
  for (let i = 0; i < 20; i++) awardDishTem(s, 'che_buoi', 'ngon', ni, ctx)
  assert.equal(s.events[EV].temToday, 30)
  assert.equal(s.events[EV].tem, 30)
  assert.equal(awardDishTem(s, 'banh_mi_op_la', 'ngon', ni, ctx), 0)
  ni = at(s, '2026-11-14T04:00')
  assert.equal(awardDishTem(s, 'banh_mi_op_la', 'ngon', ni, ctx), 1)
  assert.equal(s.events[EV].tem, 31)
  const s2 = newState(4)
  assert.equal(awardDishTem(s2, 'che_buoi', 'ngon', at(s2, '2026-11-23T09:00'), ctx), 0)
})

test('chuỗi sự kiện 5 bước (150 Tem) tặng công thức Chè bưởi; chơi 3 ngày bất kỳ là đủ; giữ món sau sự kiện', () => {
  const ctx = makeMetaCtx()
  const s = newState(5)
  const R = DATA.RECIPES
  // trước khi sở hữu: không ai gọi Chè bưởi, kể cả trong mùa
  assert.ok(!orderableRecipes(s, ctx).includes('che_buoi'))
  const inSeason = at(s, '2026-11-13T09:00')
  s.day = 5
  const shIn = startShift(s, { ...ctx, now: () => vn('2026-11-13T09:00') })
  for (const c of Object.values(shIn.customers)) for (const l of c.request) assert.notEqual(l.recipeId, 'che_buoi')
  s.shift = null
  const play = (dayStr, fn) => {
    const ni = at(s, dayStr)
    handleMetaEvent(s, 'shift.started', { day: s.day }, ctx, ni)
    fn(ni)
    return ni
  }
  const rated = { customerId: 'k', stars: 5, counterErrors: [], kitchenErrors: [] }
  const good = { recipeId: 'banh_mi_op_la', grade: 'ngon', q: 80, flawless: false, errors: [] }
  const exc = { recipeId: 'banh_mi_op_la', grade: 'tuyet_hao', q: 95, flawless: true, errors: [] }
  const chg = { correct: true, optimal: true, diff: 0, due: 10000, attempt: 1 }
  // ngày chơi 1 (13/11)
  play('2026-11-13T09:00', ni => {
    for (let i = 0; i < 5; i++) handleMetaEvent(s, 'customer.rated', rated, ctx, ni)
    for (let i = 0; i < 3; i++) handleMetaEvent(s, 'dish.done', good, ctx, ni)
    // bước 3 cần ngày chơi thứ 2: chưa đếm
    for (let i = 0; i < 3; i++) handleMetaEvent(s, 'change.given', chg, ctx, ni)
    assert.equal(s.chains[CH].step, 2)
    assert.equal(s.chains[CH].progress, 0)
    assert.equal(chainStatus(s, ni, ctx).find(c => c.id === CH).gateLocked, true)
  })
  // nghỉ vài ngày, ngày chơi 2 (16/11)
  play('2026-11-16T09:00', ni => {
    for (let i = 0; i < 3; i++) handleMetaEvent(s, 'change.given', chg, ctx, ni)
    for (let i = 0; i < 3; i++) handleMetaEvent(s, 'customer.rated', rated, ctx, ni)
    for (let i = 0; i < 2; i++) handleMetaEvent(s, 'dish.done', exc, ctx, ni)
    assert.equal(s.chains[CH].step, 4)
    assert.equal(s.chains[CH].progress, 0)
  })
  // ngày chơi 3 (20/11)
  const ni3 = play('2026-11-20T09:00', ni => {
    for (let i = 0; i < 2; i++) handleMetaEvent(s, 'dish.done', exc, ctx, ni)
  })
  assert.equal(s.chains[CH].done, true)
  const temBefore = s.events[EV].tem
  for (let k = 0; k < 5; k++) assert.equal(claimChainReward(s, CH, k, ni3, ctx).ok, true)
  assert.equal(s.events[EV].tem - temBefore, 150)
  assert.ok(s.recipes.che_buoi)
  assert.equal(s.eventRecipes.che_buoi.label, 'Tri ân 20/11 · 2026')
  assert.ok(orderableRecipes(s, ctx).includes('che_buoi'))
  // trong mùa món lễ được gọi nhiều hơn; giá không đổi
  assert.equal(R.che_buoi.price, 15000)
  const count = (now) => {
    let n = 0, all = 0
    for (let d = 0; d < 60; d++) {
      const st = JSON.parse(JSON.stringify(s)); st.shift = null; st.day = 10 + d
      st.recipes.che_buoi.boughtDay = 0
      const sh = startShift(st, { ...ctx, now: () => now })
      for (const c of Object.values(sh.customers)) for (const l of c.request) { all++; if (l.recipeId === 'che_buoi') n++ }
    }
    return n / all
  }
  const inRate = count(vn('2026-11-20T09:00'))
  const afterRate = count(vn('2027-03-01T09:00'))
  assert.ok(afterRate > 0, 'sau sự kiện vẫn bán Chè bưởi quanh năm')
  assert.ok(inRate > afterRate * 1.15, `${inRate} ≤ ${afterRate}`)
  // sau sự kiện: vẫn giữ món, không mất khi tải lại
  const late = at(s, '2027-01-10T09:00')
  refreshMeta(s, late, ctx)
  assert.ok(s.recipes.che_buoi)
  assert.equal(isEventActive(EV, late.trusted), false)
  assert.ok(inSeason)
})

test('bắt đầu muộn: ngày cuối mùa vẫn làm được mọi bước (gộp bước) để kịp nhận món', () => {
  const ctx = makeMetaCtx()
  const s = newState(6)
  const ni = at(s, '2026-11-21T20:00')
  handleMetaEvent(s, 'shift.started', { day: 1 }, ctx, ni)
  const rated = { customerId: 'k', stars: 5, counterErrors: [], kitchenErrors: [] }
  const exc = { recipeId: 'banh_mi_op_la', grade: 'tuyet_hao', q: 95, flawless: true, errors: [] }
  const chg = { correct: true, optimal: true, diff: 0, due: 10000, attempt: 1 }
  for (let i = 0; i < 5; i++) handleMetaEvent(s, 'customer.rated', rated, ctx, ni)
  for (let i = 0; i < 3; i++) handleMetaEvent(s, 'dish.done', exc, ctx, ni)
  for (let i = 0; i < 3; i++) handleMetaEvent(s, 'change.given', chg, ctx, ni)
  for (let i = 0; i < 3; i++) handleMetaEvent(s, 'customer.rated', rated, ctx, ni)
  for (let i = 0; i < 2; i++) handleMetaEvent(s, 'dish.done', exc, ctx, ni)
  assert.equal(s.chains[CH].done, true)
  // hết mùa mà chưa nhận: trong ân hạn vẫn nhận (Tem vào sự kiện, đổi được ở Quầy đổi)
  const grace = at(s, '2026-11-23T09:00')
  const temDish = s.events[EV].tem           // Tem từ món Tuyệt hảo trong ca
  assert.equal(claimChainReward(s, CH, 0, grace, ctx).ok, true)
  assert.equal(s.events[EV].tem - temDish, 20)
  // hết ân hạn: Tem của các bước chưa nhận cộng vào phần Tem dư rồi đổi chung ra Tiền quán; công thức qua Hộp thư
  const res = refreshMeta(s, at(s, '2026-11-26T09:00'), ctx)
  assert.deepEqual(s.chains[CH].claimable, [])
  const m = s.mail.list.find(x => x.id === `chuoi:${CH}:4`)
  assert.ok(m)
  assert.equal(m.reward.recipe, 'che_buoi')
  assert.equal(m.reward.tem, undefined, 'thư sau khi tất toán không mang Tem (sẽ mất)')
  for (const k of [1, 2, 3]) assert.equal(s.mail.list.find(x => x.id === `chuoi:${CH}:${k}`), undefined, 'bước chỉ có Tem không cần thư')
  const du = s.mail.list.find(x => x.id === `tem_du:${EV}`)
  assert.ok(du, 'Tem dư (gồm Tem thưởng chuỗi chưa nhận) được đổi ra tiền')
  // việc sự kiện ngày 21/11 đã xong mà chưa nhận: tự cộng 30 Tem trước khi tất toán (lỡ ngày không mất gì)
  assert.deepEqual(res.eventQuestsAuto, [{ eventId: EV, tem: 30, dayKey: '2026-11-21' }])
  // (Tem từ món + 30 Tem việc sự kiện + 20 + 130 Tem thưởng chuỗi) ÷ 100 × 0,2 × 20.000đ, làm tròn xuống bội 1.000đ
  assert.equal(du.reward.money, Math.floor((temDish + 30 + 150) / 100 * 4000 / 1000) * 1000)
  assert.ok(res.newMail.includes(`chuoi:${CH}:4`) && res.newMail.includes(`tem_du:${EV}`), 'thư mới được báo')
})

test('nhiệm vụ sự kiện (10 Tem), điểm danh sự kiện (15 Tem/ô), Quầy đổi Tem, Tem dư đổi ra Tiền quán sau ân hạn', () => {
  const ctx = makeMetaCtx()
  const s = newState(7)
  const ni = at(s, '2026-11-12T09:00')
  ensureEventQuests(s, ni, ctx)
  markEventDay(s, ni, ctx)
  assert.equal(eventQuestList(s, EV, ni, ctx).length, 3)
  for (let i = 0; i < 4; i++) handleMetaEvent(s, 'customer.rated', { customerId: 'k', stars: 4, counterErrors: [], kitchenErrors: [] }, ctx, ni)
  assert.equal(claimEventQuest(s, EV, 'ev_phuc_vu', ni, ctx).ok, true)
  assert.equal(claimEventQuest(s, EV, 'ev_phuc_vu', ni, ctx).reason, 'da_nhan')
  assert.equal(claimEventQuest(s, EV, 'ev_nam_sao', ni, ctx).reason, 'chua_xong')
  assert.equal(s.events[EV].tem, 10)
  // điểm danh sự kiện
  assert.equal(claimEventCheckin(s, EV, ni, ctx).ok, true)
  assert.equal(claimEventCheckin(s, EV, ni, ctx).reason, 'da_nhan')
  assert.equal(eventCheckinStatus(s, EV, { ...at(s, '2026-11-13T09:00'), rewind: true }, ctx).reason, 'lui_gio')
  assert.equal(claimEventCheckin(s, EV, at(s, '2026-11-13T09:00'), ctx).ok, true)
  assert.equal(s.events[EV].tem, 40)
  assert.equal(claimEventCheckin(s, EV, at(s, '2026-10-01T09:00'), ctx).ok, false)
  // Quầy đổi: 50 Tem → 10 Muỗng Vàng, tối đa 5 lần
  s.events[EV].tem = 400
  const n2 = at(s, '2026-11-14T09:00')
  for (let i = 0; i < 5; i++) assert.equal(exchangeTem(s, EV, 'doi_muong_vang', n2, ctx).ok, true)
  assert.equal(exchangeTem(s, EV, 'doi_muong_vang', n2, ctx).reason, 'het_luot')
  assert.equal(s.goldSpoons, 50)
  assert.equal(s.events[EV].tem, 150)
  assert.equal(exchangeTem(s, EV, 'chau_hoa_tri_an', n2, ctx).reason, 'thieu_tem')
  assert.equal(exchangeTem(s, EV, 'bang_den_tri_an', n2, ctx).ok, true)
  assert.ok(s.cosmetics.owned.includes('bang_den_tri_an'))
  assert.equal(exchangeList(s, EV, ctx).find(x => x.id === 'bang_den_tri_an').left, 0)
  // Tem dư: ân hạn 3 ngày vẫn đổi được; sau đó tự đổi ra Tiền quán qua Hộp thư
  s.events[EV].tem = 250
  assert.equal(exchangeTem(s, EV, 'doi_muong_vang', at(s, '2026-11-24T09:00'), ctx).reason, 'het_luot')
  assert.deepEqual(settleEvents(s, at(s, '2026-11-24T09:00'), ctx), [])
  const ids = settleEvents(s, at(s, '2026-11-25T04:00'), ctx)
  assert.deepEqual(ids, [`tem_du:${EV}`])
  assert.equal(s.events[EV].tem, 0)
  const m = s.mail.list.find(x => x.id === `tem_du:${EV}`)
  assert.equal(m.reward.money, 10000)     // 250 Tem ÷ 100 × 0,2 × 20.000đ (ngày game 1), tỉ lệ thấp
  assert.equal(m.kind, 'su_kien')
  assert.deepEqual(settleEvents(s, at(s, '2026-11-26T09:00'), ctx), [])
  assert.equal(exchangeTem(s, EV, 'chau_hoa_tri_an', at(s, '2026-11-26T09:00'), ctx).reason, 'het_su_kien')
})

// ---------- Sự kiện ngày ----------

// dữ liệu thật nhưng tắt sự kiện ngày (để so sánh)
const NONE = { ...DATA, DAY_EVENTS: null }
const only = (id, extra = {}) => ({ ...DATA, DAY_EVENT_CONFIG: { ...DATA.DAY_EVENT_CONFIG, fromDay: 1, chance: 1, ...extra },
  DAY_EVENTS: { [id]: DATA.DAY_EVENTS[id] } })

test('sự kiện ngày: tất định theo seed + ngày, từ ngày game 3, khoảng 30%', () => {
  const ctx = makeMetaCtx()
  let hit = 0, total = 0
  for (let seed = 1; seed <= 100; seed++) {
    const s = newState(seed)
    assert.equal(rollDayEvent(s, 1, ctx), null)
    assert.equal(rollDayEvent(s, 2, ctx), null)
    for (let d = 3; d <= 12; d++) {
      const a = rollDayEvent(s, d, ctx)
      assert.equal(a, rollDayEvent(newState(seed), d, ctx))
      if (a) { hit++; assert.ok(DATA.DAY_EVENTS[a]) }
      total++
    }
  }
  assert.ok(hit / total > 0.22 && hit / total < 0.38, String(hit / total))
})

test('Trời mưa: khách ×0,8, kiên nhẫn ×1,2; Căng bạt 20.000đ còn ×0,95; có Bạt che mưa thì miễn phí', () => {
  const data = only('troi_mua')
  const ctx = makeMetaCtx({ data })
  const base = newState(10); base.day = 9
  const plain = makeMetaCtx({ data: NONE })
  const N = customerCount(base, plain, 9)
  assert.equal(N, 8)
  const s = newState(10); s.day = 9
  const info = dayEventInfo(s, 9, ctx)
  assert.equal(info.name, 'Trời mưa')
  assert.equal(info.choice.cost, 20000)
  const sh = startShift(s, ctx)
  assert.equal(sh.plan.length, Math.round(8 * 0.8))
  const shPlain = startShift((() => { const x = newState(10); x.day = 9; return x })(), plain)
  const c0 = Object.values(sh.customers)[0]
  const p0 = Object.values(shPlain.customers)[0]
  assert.equal(c0.persona, p0.persona)
  assert.ok(Math.abs(c0.patienceSec - p0.patienceSec * 1.2) < 0.2)
  // căng bạt
  const t = newState(10); t.day = 9
  assert.equal(setDayEventChoice(t, 'cang_bat', ctx).ok, true)
  const w = t.wallet
  const sh2 = startShift(t, ctx)
  assert.equal(t.wallet, w - 20000)
  assert.equal(sh2.walletStart, w - 20000)
  assert.equal(sh2.plan.length, Math.round(8 * 0.95))
  assert.equal(sh2.mods.dayEvent.choice, 'cang_bat')
  // có Bạt che mưa: tự căng, miễn phí
  const u = newState(10); u.day = 9; u.items.bat_che_mua = 1
  assert.equal(dayEventInfo(u, 9, ctx).choice.free, true)
  const w2 = u.wallet
  const sh3 = startShift(u, ctx)
  assert.equal(u.wallet, w2)
  assert.equal(sh3.plan.length, 8)
  // sàn 3 khách
  const v = newState(10); v.day = 1
  assert.ok(startShift(v, ctx).plan.length >= 3)
})

test('Nắng nóng: Trà tắc được gọi ×2, thêm ghi chú ít đường; +1 khách trong trần 8', () => {
  const ctx = makeMetaCtx({ data: only('nang_nong') })
  const plain = makeMetaCtx({ data: NONE })
  let tra = 0, all = 0, traP = 0, allP = 0, itDuong = 0, itDuongP = 0
  for (let seed = 1; seed <= 150; seed++) {
    const a = newState(seed); a.day = 6
    const b = newState(seed); b.day = 6
    const sa = startShift(a, ctx), sb = startShift(b, plain)
    assert.equal(sa.plan.length, Math.min(8, sb.plan.length + 1))
    // đếm đơn 1 dòng (đơn nhiều dòng luôn gồm đủ các món nên không cho thấy trọng số)
    for (const c of Object.values(sa.customers)) if (c.request.length === 1) for (const l of c.request) { all++; if (l.recipeId === 'tra_tac') { tra++; if (l.notes.includes('it_duong')) itDuong++ } }
    for (const c of Object.values(sb.customers)) if (c.request.length === 1) for (const l of c.request) { allP++; if (l.recipeId === 'tra_tac') { traP++; if (l.notes.includes('it_duong')) itDuongP++ } }
  }
  assert.ok(tra / all > (traP / allP) * 1.2, `${tra / all} vs ${traP / allP}`)
  assert.ok(itDuong / tra > (itDuongP / traP) * 1.5, `${itDuong / tra} vs ${itDuongP / traP}`)
})

test('Ngày lãnh lương: tip ×1,5 nhưng vẫn là bội 5.000đ', () => {
  const ctx = makeMetaCtx({ data: only('lanh_luong') })
  const s = newState(12); s.day = 3
  const r = playShift(s, ctx)
  const tips = r.sheets.map(x => x.tip).filter(t => t > 0)
  assert.ok(tips.length > 0)
  for (const t of tips) { assert.equal(t % 5000, 0); assert.ok(t >= 10000, String(t)) }
  assert.equal(r.walletAfter - r.walletBefore, r.summary.profit - r.summary.loanRepaid)
})

test('Chợ phiên: khách ×1,3 (trần 10) mà hệ số tải vẫn ≤ 0,9 nhờ giãn giờ ca; mọi sự kiện đều giữ ρ ≤ 0,9', () => {
  const ctx = makeMetaCtx({ data: only('cho_phien') })
  for (let seed = 1; seed <= 30; seed++) {
    for (let day = 1; day <= 14; day++) {
      const s = newState(seed); s.day = day
      const sh = startShift(s, ctx)
      const base = customerCount(newState(seed), ctx, day)
      // sự kiện ngày có từ ngày game 3
      assert.equal(sh.plan.length, day >= 3 ? Math.min(10, Math.round(base * 1.3)) : base)
      assert.ok(loadFactor(sh) <= 0.9 + 1e-9, `seed ${seed} ngày ${day}: ${loadFactor(sh)}`)
    }
  }
  // dữ liệu thật: mọi ngày, mọi seed
  const real = makeMetaCtx()
  for (let seed = 1; seed <= 40; seed++) for (let day = 1; day <= 14; day++) {
    const s = newState(seed); s.day = day
    const sh = startShift(s, real)
    assert.ok(loadFactor(sh) <= 0.9 + 1e-9)
    assert.ok(sh.plan.length >= 3 && sh.plan.length <= 10)
  }
})

test('Phiếu Chợ Sớm: giá vốn −20% trong 1 ca, dùng xong mất phiếu', () => {
  const ctx = makeMetaCtx()
  const a = newState(13), b = newState(13)
  b.items.phieu_cho_som = 1
  assert.equal(setMarketCoupon(a, true).reason, 'khong_co')
  assert.equal(setMarketCoupon(b, true).ok, true)
  const ra = playShift(a, ctx), rb = playShift(b, ctx)
  assert.equal(b.items.phieu_cho_som, 0)
  // M3: giá vốn mỗi lượt nấu làm tròn tới bội 500đ (gần nhất) nên tổng lệch ×0,8 tối đa 250đ mỗi lượt nấu
  const cooks = rb.sheets.reduce((n, sh) => n + ((sh && sh.dishes) || []).length, 0)
  assert.ok(rb.summary.cogs < ra.summary.cogs)
  assert.ok(Math.abs(rb.summary.cogs - ra.summary.cogs * 0.8) <= 250 * cooks, `${rb.summary.cogs} ≉ ${ra.summary.cogs} × 0,8`)
  assert.equal(rb.summary.cogs % 500, 0)
  assert.equal(rb.walletAfter - rb.walletBefore, rb.summary.profit)
  // ca sau không còn giảm giá
  assert.equal(playShift(b, ctx).summary.cogs, playShift(a, ctx).summary.cogs)
})
