// Test tích hợp M2: DATA thật + toàn bộ lõi, hệ thống meta nghe bus thật (attachMeta), đồng hồ giả, không giao diện.
// Mô phỏng 5 ngày thật × 3 ca bằng "người chơi hoàn hảo" (tests/helpers/perfect-player.mjs), mỗi ngày: điểm danh,
// Hộp thư, Việc hôm nay + Rương ngày, chuỗi nhiệm vụ; nấu thử rồi mua Bánh tráng trộn và Cà phê sữa đá, mua nâng cấp,
// dùng Phiếu Chợ Sớm, chọn Căng bạt khi mưa. Kiểm tra (docs/can-bang.md mục 10, 11, 13):
//   - người chơi hoàn hảo đủ điều kiện lên Chặng 2 trong ngày thật 2–6; người chơi trung bình (4,2 sao) đạt
//     150 danh tiếng không sớm hơn ca 8 (luật chỉnh ngưỡng ở can-bang mục 13) và đủ điều kiện trước ca 15;
//   - thưởng ngoài bán hàng ≤ 35% tổng Tiền quán nhận mỗi ngày thật (tiền thật; và cả khi quy đổi hiện vật);
//   - bất biến ví từng ca và từng ngày (mọi đồng vào/ra đều có nguồn), không NaN, lưu/tải nguyên vẹn.
// Kịch bản thứ hai chạy trong mùa "Tri ân 20/11" (có quà lễ 20/11 bằng tiền) tới sau ân hạn (26/11): nhận Chè bưởi
// qua chuỗi sự kiện rồi bán được; Tem dư đổi ra Tiền quán ngày 25/11 mà thưởng ngày đó vẫn ≤ 35%.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState, refIncomeFor } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { startShift } from '../../src/core/shift.js'
import { startCook, submitChon, availableSteps, getStep, submitStep, finishDish } from '../../src/core/kitchen.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { checkinStatus, claimCheckin } from '../../src/core/checkin.js'
import { questList, claimQuest, claimDailyChest, rerollQuest } from '../../src/core/quests.js'
import { claimAllMail } from '../../src/core/mail.js'
import { chainStatus, claimChainReward } from '../../src/core/chains.js'
import { shopCatalog, buyShopRecipe, buyShopUpgrade, startTasting, tastingSandbox, finishTasting } from '../../src/core/shop.js'
import {
  dayEventInfo, setDayEventChoice, setMarketCoupon, eventQuestList, claimEventQuest, claimEventCheckin,
  exchangeTem, isEventActive
} from '../../src/core/events.js'
import { checkStageUp } from '../../src/core/progression.js'
import { encodeSave, decodeSave, migrate } from '../../src/core/save.js'
import { playShift, counterStep, cookTicket } from '../helpers/perfect-player.mjs'
import { advance, isShiftOver, endShift } from '../../src/core/shift.js'
import { makeMetaCtx, vn } from '../helpers/meta-helpers.mjs'

const HOUR = 3600 * 1000
const DAY = 24 * HOUR
const SHIFT_HOURS = ['08:00', '12:00', '17:30']   // 3 ca mỗi ngày thật (giờ Việt Nam)
const RATIO_CAP = 0.35
const TARP_VALUE = 20000                          // Bạt che mưa quy đổi = một lần căng bạt (can-bang mục 10.1)
const EV = 'tri_an_20_11'

const upgradePrice = id => DATA.UPGRADES[id].price
const repTarget = DATA.STAGE_UP[2].requirements.find(q => q.kind === 'reputation').target

// Mọi số trong state phải hữu hạn (không NaN/Infinity). Trả danh sách đường dẫn lỗi.
function badNumbers(obj, path = 'state', out = []) {
  if (typeof obj === 'number') { if (!Number.isFinite(obj)) out.push(path); return out }
  if (Array.isArray(obj)) { obj.forEach((v, i) => badNumbers(v, `${path}[${i}]`, out)); return out }
  if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) badNumbers(v, `${path}.${k}`, out)
  return out
}

// Nấu thử một món bằng các hàm bếp trên "hộp cát" (mọi bước 100 điểm, đúng cách sơ chế).
function tasteRecipe(state, ctx, recipeId) {
  const r = startTasting(state, recipeId, ctx)
  assert.ok(r.ok, 'không mở được nấu thử: ' + r.reason)
  const sb = tastingSandbox(state, ctx)
  const cook = startCook(sb.state, 'thu1', 0, sb.ctx)
  assert.ok(cook)
  assert.ok(submitChon(sb.state, requiredIngredients(DATA.RECIPES[recipeId], []).required, 0, sb.ctx).ok)
  let av
  while ((av = availableSteps(sb.state)).length) {
    const st = getStep(sb.state, av[0])
    submitStep(sb.state, av[0], { score: 100, method: st.method ? st.method.correct : undefined }, sb.ctx)
  }
  finishDish(sb.state, sb.ctx)
  return finishTasting(state, ctx)
}

/**
 * Mô phỏng `days` ngày thật × 3 ca từ `start` (giờ Việt Nam, ngày đầu). Trả báo cáo từng ngày thật.
 * Người chơi tốt: chơi hoàn hảo, nhận mọi thưởng, mua món/dụng cụ khi đủ tiền, dùng Phiếu Chợ Sớm, căng bạt khi mưa.
 */
function simulate({ seed, start, days = 5, maxDays = 6, event = false }) {
  const ctx = makeMetaCtx({ at: start + 'T' + SHIFT_HOURS[0], attach: true })
  const state = defaultState(seed, DATA)
  ctx.setState(state)
  state.shopName = 'Xe mô phỏng'
  const dayStart = vn(start + 'T' + SHIFT_HOURS[0])
  const ni = () => makeNowInfo(state, ctx.clock.t)
  const report = { state, ctx, days: [], eligibleAt: null, tasted: null, bought: {}, rerolled: false, exchanged: 0 }
  let cur = null

  // Mọi khoản thưởng đi qua đây: kiểm tiền vào ví đúng bằng phần thưởng, cộng dồn tiền và giá trị quy đổi.
  function granted(fn) {
    const w = state.wallet
    const tarp = (state.items && state.items.bat_che_mua) || 0
    const ups = new Set(Object.keys(state.upgrades))
    const r = fn()
    if (!r || !r.ok) return r
    const money = state.wallet - w
    const rewards = r.rewards ? r.rewards.map(x => x.reward) : [r.reward]
    assert.equal(money, rewards.reduce((s, x) => s + ((x && x.money) || 0), 0), 'tiền thưởng vào ví lệch phần thưởng')
    cur.bonus += money
    cur.value += money
    if (((state.items && state.items.bat_che_mua) || 0) > tarp) cur.value += TARP_VALUE
    for (const id of Object.keys(state.upgrades)) if (!ups.has(id)) cur.value += upgradePrice(id)
    return r
  }

  function spend(fn, price, label) {
    const w = state.wallet
    const r = fn()
    assert.ok(r.ok, `không mua được ${label}: ${r.reason}`)
    assert.equal(w - state.wallet, price, `mua ${label} trừ sai tiền`)
    cur.spent += price
    report.bought[label] = { realDay: cur.realDay, day: state.day }
    return r
  }

  // Nhận mọi thứ đang chờ (như người chơi ở màn Chuẩn bị): Việc hôm nay, Rương ngày, chuỗi, Hộp thư, sự kiện.
  function claimAll() {
    const info = ni()
    for (const q of questList(state, ctx).quests) {
      if (!q.canClaim) continue
      const before = state.reputation
      const r = granted(() => claimQuest(state, q.index, info, ctx))
      assert.ok(r.ok)
      assert.equal(r.reward.money, Math.ceil(0.2 * refIncomeFor(ctx, state.day) / 1000) * 1000)
      assert.equal(state.reputation - before, 5)
      cur.quests += 1
    }
    if (questList(state, ctx).chest.available) {
      assert.ok(granted(() => claimDailyChest(state, info, ctx)).ok)
      cur.chests += 1
    }
    for (const c of chainStatus(state, info, ctx)) {
      for (const k of c.claimable) {
        const r = granted(() => claimChainReward(state, c.id, k.stepIndex, info, ctx))
        assert.ok(r.ok, `không nhận được thưởng chuỗi ${c.id} bước ${k.stepIndex + 1}: ${r.reason}`)
        cur.chainSteps.push(`${c.id}:${k.stepIndex + 1}`)
      }
    }
    const m = granted(() => claimAllMail(state, info, ctx))
    if (m && m.ok) cur.mails.push(...m.rewards.map(x => x.id))
    if (event && isEventActive(EV, info.trusted, ctx)) {
      for (const q of eventQuestList(state, EV, info, ctx)) if (q.done && !q.claimed) assert.ok(claimEventQuest(state, EV, q.id, info, ctx).ok)
      // đổi 50 Tem lấy 10 Muỗng Vàng (Quầy đổi Tem)
      if (state.events[EV].tem >= 50 && report.exchanged < 2 && exchangeTem(state, EV, 'doi_muong_vang', info, ctx).ok) report.exchanged += 1
    }
  }

  // Mua sắm giữa các ca: nấu thử rồi mua Bánh tráng trộn, Dao thép tốt, Cà phê sữa đá; đủ điều kiện lên chặng rồi mới mua Loa.
  function shop() {
    const cat = shopCatalog(state, ctx)
    const btt = cat.recipes.find(r => r.id === 'banh_trang_tron')
    if (!btt.owned && btt.unlocked && !report.tasted) {
      const before = JSON.stringify({ w: state.wallet, r: state.recipes, q: state.daily.quests, sh: state.shift, st: state.stats.dishesCooked })
      const t = tasteRecipe(state, ctx, 'banh_trang_tron')
      assert.ok(t.ok && t.result, 'nấu thử không ra món')
      assert.equal(t.result.grade, 'tuyet_hao')
      assert.equal(JSON.stringify({ w: state.wallet, r: state.recipes, q: state.daily.quests, sh: state.shift, st: state.stats.dishesCooked }), before,
        'nấu thử không được đổi ví, thạo món, Việc hôm nay, ca')
      assert.ok(state.shop.tried.includes('banh_trang_tron'))
      report.tasted = { realDay: cur.realDay, day: state.day }
    }
    if (!btt.owned && btt.canBuy) spend(() => buyShopRecipe(state, 'banh_trang_tron', ctx), btt.shopPrice, 'banh_trang_tron')
    if (state.recipes.banh_trang_tron && !state.upgrades.dao_thep && state.day >= DATA.UPGRADES.dao_thep.fromDay &&
      state.wallet >= upgradePrice('dao_thep')) spend(() => buyShopUpgrade(state, 'dao_thep', ctx), upgradePrice('dao_thep'), 'dao_thep')
    const cp = shopCatalog(state, ctx).recipes.find(r => r.id === 'ca_phe_sua_da')
    if (!cp.owned && cp.canBuy) spend(() => buyShopRecipe(state, 'ca_phe_sua_da', ctx), cp.shopPrice, 'ca_phe_sua_da')
    if (report.eligibleAt && !state.upgrades.loa_bao_tien && state.day >= DATA.UPGRADES.loa_bao_tien.fromDay &&
      state.wallet >= upgradePrice('loa_bao_tien') + 100000) spend(() => buyShopUpgrade(state, 'loa_bao_tien', ctx), upgradePrice('loa_bao_tien'), 'loa_bao_tien')
  }

  // Màn Chuẩn bị: Phiếu Chợ Sớm, lựa chọn của sự kiện ngày (Căng bạt).
  function prep() {
    let coupon = false
    if (state.items.phieu_cho_som > 0) { assert.ok(setMarketCoupon(state, true).ok); coupon = true }
    const info = dayEventInfo(state, state.day, ctx)
    if (info && info.choice && !info.choice.free && info.choice.cost <= state.wallet) assert.ok(setDayEventChoice(state, info.choice.id, ctx).ok)
    return { coupon, dayEvent: info ? info.id : null }
  }

  function playOne(hour) {
    const p = prep()
    const w0 = state.wallet
    const sh = startShift(state, ctx)
    const prepCost = w0 - sh.walletStart
    assert.equal(prepCost, sh.mods.prepCost, 'tiền chuẩn bị (căng bạt) phải trừ trước khi ghi ví đầu ca')
    if (p.coupon) assert.equal(sh.mods.cogsMul, 0.8)
    const walletStart = sh.walletStart
    const evFrom = ctx.events.length
    const { summary } = playShift(state, ctx)
    // khách bỏ đi chỉ có thể là khách trả bằng ảnh chuyển khoản giả bị người chơi từ chối
    const lostReasons = ctx.events.slice(evFrom).filter(e => e.type === 'customer.lost').map(e => e.payload.reason)
    assert.equal(lostReasons.length, summary.lost)
    assert.ok(lostReasons.every(r => r === 'qr_gia'), 'khách bỏ về: ' + lostReasons.join(', '))
    cur.fakeRejected += lostReasons.length
    assert.equal(state.wallet - walletStart, summary.profit - summary.loanRepaid, `bất biến ví ca ${summary.day}`)
    assert.deepEqual(badNumbers(summary, 'summary'), [])
    cur.sales += summary.profit
    cur.loanRepaid += summary.loanRepaid
    cur.prepCost += prepCost
    // Phiếu Chợ Sớm quy đổi = phần giá vốn tiết kiệm được (giá vốn đã giảm 20%)
    if (p.coupon) cur.value += Math.round(summary.cogs / 0.8 * 0.2)
    cur.shifts.push({ day: summary.day, hour, profit: summary.profit, served: summary.served, dayEvent: p.dayEvent, coupon: p.coupon })
  }

  for (let d = 1; d <= maxDays; d++) {
    if (d > days && report.eligibleAt) break
    ctx.clock.t = dayStart + (d - 1) * DAY
    const info = ni()
    cur = { realDay: d, dayKey: info.dayKey, walletStart: state.wallet, sales: 0, bonus: 0, value: 0, spent: 0, prepCost: 0,
      loanRepaid: 0, fakeRejected: 0, quests: 0, chests: 0, chainSteps: [], mails: [], shifts: [], checkin: null }
    // mở game: làm mới meta (như main.js / màn Chuẩn bị), điểm danh, nhận thư
    refreshMeta(state, info, ctx)
    assert.equal(checkinStatus(state, info, ctx).canClaim, true, `ngày thật ${d} phải điểm danh được`)
    const ck = granted(() => claimCheckin(state, info, ctx))
    assert.ok(ck.ok)
    cur.checkin = ck.index
    if (event && isEventActive(EV, info.trusted, ctx)) assert.ok(claimEventCheckin(state, EV, info, ctx).ok)
    assert.equal(questList(state, ctx).quests.length, 3)
    // ngày thật 2: đổi thử 1 việc chưa xong (lần đầu miễn phí)
    if (d === 2 && !report.rerolled) {
      const q = questList(state, ctx).quests.find(x => !x.done)
      const g = state.goldSpoons
      if (q && rerollQuest(state, q.index, info, ctx).ok) { report.rerolled = true; assert.equal(state.goldSpoons, g) }
    }
    claimAll()
    for (let s = 0; s < SHIFT_HOURS.length; s++) {
      const [hh, mm] = SHIFT_HOURS[s].split(':').map(Number)
      ctx.clock.t = dayStart + (d - 1) * DAY + (hh - Number(SHIFT_HOURS[0].slice(0, 2))) * HOUR + mm * 60000
      shop()
      playOne(SHIFT_HOURS[s])
      ctx.clock.t += 40 * 60000
      claimAll()
      if (!report.eligibleAt && checkStageUp(state, ctx).eligible) report.eligibleAt = { realDay: d, shift: state.day - 1, dayKey: cur.dayKey }
    }
    cur.walletEnd = state.wallet
    // bất biến ví theo ngày: mọi đồng vào/ra đều có nguồn
    assert.equal(cur.walletEnd - cur.walletStart, cur.sales - cur.loanRepaid + cur.bonus - cur.spent - cur.prepCost,
      `ngày thật ${d}: ví lệch sổ`)
    cur.ratio = cur.bonus / (cur.sales + cur.bonus)
    cur.ratioValue = cur.value / (cur.sales + cur.value)
    assert.deepEqual(badNumbers(state), [], `ngày thật ${d}: có số không hữu hạn`)
    // lưu/tải nguyên vẹn (có migrate)
    const back = migrate(decodeSave(encodeSave(state)), DATA)
    assert.deepEqual(back, JSON.parse(JSON.stringify(state)), `ngày thật ${d}: lưu/tải làm đổi state`)
    report.days.push(cur)
  }
  return report
}

// META_SIM_LOG=1 npm test: in số liệu từng ngày thật (để chỉnh cân bằng).
function log(title, rep) {
  if (!process.env.META_SIM_LOG) return
  const e = rep.eligibleAt
  console.log(`${title}\n${describe(rep)}\nđủ điều kiện lên Chặng 2: ${e ? `ngày thật ${e.realDay}, ca ${e.shift}` : 'chưa'}; ` +
    `Muỗng Vàng ${rep.state.goldSpoons}; danh tiếng ${rep.state.reputation}; mua ${JSON.stringify(rep.bought)}`)
}

function describe(rep) {
  return rep.days.map(d => `ngày thật ${d.realDay} (${d.dayKey}): lãi ${d.sales}, thưởng ${d.bonus} (quy đổi ${d.value}), ` +
    `tỉ lệ ${(d.ratio * 100).toFixed(1)}% / ${(d.ratioValue * 100).toFixed(1)}%, ví ${d.walletStart}→${d.walletEnd}`).join('\n')
}

for (const seed of [42, 7, 2024]) {
  test(`tích hợp meta: người chơi tốt 5 ngày thật × 3 ca (seed ${seed})`, () => {
    const rep = simulate({ seed, start: '2026-10-05' })
    log(`seed ${seed}`, rep)
    const { state, ctx } = rep
    const msg = '\n' + describe(rep)
    // lên Chặng 2: mục tiêu ca 10–15 / ngày thật 3–4 là của người chơi TRUNG BÌNH (can-bang mục 13, test bên dưới);
    // người chơi hoàn hảo 3 ca/ngày thật được phép sớm hơn (ngày thật 2), nhưng không quá ngày thật 6
    assert.ok(rep.eligibleAt, 'chưa đủ điều kiện lên Chặng 2 sau 6 ngày thật' + msg)
    assert.ok(rep.eligibleAt.realDay >= 2 && rep.eligibleAt.realDay <= 6,
      `đủ điều kiện ở ngày thật ${rep.eligibleAt.realDay} (ca ${rep.eligibleAt.shift}), cần 2–6` + msg)
    assert.equal(state.progression.stageUpReady, true)
    assert.equal(ctx.events.filter(e => e.type === 'stage.ready').length, 1, 'stage.ready phát đúng 1 lần')
    assert.ok(state.reputation >= repTarget)
    // thưởng ngoài bán hàng ≤ 35% Tiền quán nhận mỗi ngày thật (tiền thật, và cả khi quy đổi hiện vật)
    for (const d of rep.days) {
      assert.ok(d.sales > 0, `ngày thật ${d.realDay} lãi bán hàng phải dương`)
      assert.ok(d.ratio <= RATIO_CAP, `ngày thật ${d.realDay}: thưởng ${(d.ratio * 100).toFixed(1)}% > 35%` + msg)
      assert.ok(d.ratioValue <= RATIO_CAP, `ngày thật ${d.realDay}: thưởng quy đổi ${(d.ratioValue * 100).toFixed(1)}% > 35%` + msg)
    }
    // đủ 5 hệ thống meta đã chạy
    assert.deepEqual(rep.days.map(d => d.checkin), rep.days.map((d, i) => i), 'điểm danh mỗi ngày 1 ô, lần lượt')
    assert.ok(rep.days.every(d => d.quests >= 1), 'ngày nào cũng xong và nhận ít nhất 1 việc')
    assert.ok(rep.days.filter(d => d.chests === 1).length >= 3, 'Rương ngày mở được ít nhất 3 ngày')
    assert.ok(rep.days[0].mails.includes('chao_mung'), 'thư chào mừng nhận ngày đầu')
    assert.ok(rep.rerolled, 'đổi việc miễn phí')
    assert.equal(state.chains.ngay_dau_ra_pho.done, true, 'xong chuỗi "Ngày đầu ra phố"')
    assert.ok(state.titles.includes('chu_xe_dau_hem'))
    assert.ok(state.chains.lam_quen_qr && state.chains.lam_quen_qr.step >= 2, 'chuỗi "Làm quen QR" đã qua bước bắt ảnh giả')
    assert.ok(state.stats.fakeQrDetected >= 1)
    // mua sắm: nấu thử trước khi mua, hai món Shop đúng mốc ngày game, nâng cấp
    assert.ok(rep.tasted && rep.tasted.day >= DATA.RECIPES.banh_trang_tron.shopFromDay)
    assert.ok(rep.bought.banh_trang_tron.day >= DATA.RECIPES.banh_trang_tron.shopFromDay)
    assert.ok(rep.bought.ca_phe_sua_da.day >= DATA.RECIPES.ca_phe_sua_da.shopFromDay)
    assert.ok(rep.bought.dao_thep, 'mua Dao thép tốt')
    for (const id of ['banh_trang_tron', 'ca_phe_sua_da']) assert.ok(state.recipes[id].cooks > 0, `khách có gọi ${id}`)
    assert.equal(state.loan, null)
    assert.ok(state.goldSpoons > 0)
  })
}

test('tích hợp meta: mùa "Tri ân 20/11" tới sau ân hạn — Chè bưởi qua chuỗi sự kiện, quà lễ 20/11, Tem dư, thưởng vẫn ≤ 35%', () => {
  const rep = simulate({ seed: 42, start: '2026-11-17', days: 10, maxDays: 10, event: true })
  log('Tri ân 20/11 (seed 42)', rep)
  const { state } = rep
  const msg = '\n' + describe(rep)
  assert.ok(rep.eligibleAt && rep.eligibleAt.realDay >= 2 && rep.eligibleAt.realDay <= 6, 'lên chặng ngoài ngày thật 2–6' + msg)
  for (const d of rep.days) {
    assert.ok(d.ratio <= RATIO_CAP, `ngày thật ${d.realDay}: thưởng ${(d.ratio * 100).toFixed(1)}% > 35%` + msg)
    assert.ok(d.ratioValue <= RATIO_CAP, `ngày thật ${d.realDay}: thưởng quy đổi ${(d.ratioValue * 100).toFixed(1)}% > 35%` + msg)
  }
  // quà lễ 20/11 (có tiền) nhận đúng ngày
  const holiday = rep.days.find(d => d.dayKey === '2026-11-20')
  assert.ok(holiday.mails.includes('le_20_11_2026'), 'chưa nhận quà lễ 20/11')
  // Chè bưởi: nhận qua chuỗi sự kiện (chơi đủ 3 ngày thật trong mùa), có nhãn mùa, được gọi và nấu ngay trong mùa
  const es = state.events[EV]
  assert.ok(es.days.length >= 3)
  assert.equal(state.chains.tri_an_20_11_chuoi.done, true)
  assert.ok(state.recipes.che_buoi, 'chưa nhận công thức Chè bưởi')
  assert.equal(state.eventRecipes.che_buoi.label, 'Tri ân 20/11 · 2026')
  const gotDay = rep.days.find(d => d.chainSteps.includes('tri_an_20_11_chuoi:5'))
  assert.ok(gotDay && gotDay.realDay >= 3, 'món chỉ đến sau 3 ngày thật chơi trong mùa')
  assert.ok(state.recipes.che_buoi.cooks > 0, 'khách chưa gọi Chè bưởi')
  // Tem: từ món tối đa 30/ngày; điểm danh sự kiện mỗi ngày 1 ô trong mùa; có đổi Tem
  assert.ok(es.temToday <= DATA.EVENTS[EV].tem.dailyCap)
  assert.equal(es.checkin.next, rep.days.filter(d => d.dayKey < '2026-11-22').length)
  assert.ok(rep.exchanged >= 1)
  assert.ok(es.temTotal >= 150)
  // hết ân hạn (25/11): Tem dư đổi ra Tiền quán với tỉ lệ thấp, tối đa 1 lần thu nhập tham chiếu, qua Hộp thư
  assert.equal(es.settled, true)
  assert.equal(es.tem, 0)
  const settleDay = rep.days.find(d => d.dayKey === '2026-11-25')
  assert.ok(settleDay.mails.includes(`tem_du:${EV}`), 'chưa nhận thư đổi Tem dư ngày 25/11')
  const du = state.mail.list.find(m => m.id === `tem_du:${EV}`)
  assert.ok(du.reward.money > 0 && du.reward.money <= refIncomeFor(rep.ctx, state.day), `Tem dư đổi ${du.reward.money}đ`)
  assert.ok(state.mail.monthly['2026-11'].value >= du.reward.money, 'thư Tem dư tính vào trần quà tháng')
})

// "Người chơi trung bình" (docs/can-bang.md mục 7, 9): quầy đúng, bếp theo phân bố 40% Tuyệt hảo / 45% Ngon /
// 10% Được / 5% Kém; 3 ca ngày thật 1, 4 ca mỗi ngày sau; nhận mọi thưởng; mua Bánh tráng trộn và Dao thép tốt.
function simulateAverage(seed) {
  const ctx = makeMetaCtx({ at: '2026-10-05T08:00', attach: true })
  const state = defaultState(seed, DATA)
  ctx.setState(state)
  state.shopName = 'Xe trung bình'
  let rs = seed >>> 0
  const rnd = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 2 ** 32 }
  const tiers = [[100, 40], [80, 45], [65, 10], [55, 5]]
  const pickScore = () => { let r = rnd() * 100; for (const [sc, w] of tiers) if ((r -= w) < 0) return sc; return 100 }
  const start = vn('2026-10-05T08:00')
  const out = { hit150: null, eligible: null }
  const claimAll = () => {
    const ni = makeNowInfo(state, ctx.clock.t)
    for (const q of questList(state, ctx).quests) if (q.canClaim) claimQuest(state, q.index, ni, ctx)
    if (questList(state, ctx).chest.available) claimDailyChest(state, ni, ctx)
    for (const c of chainStatus(state, ni, ctx)) for (const k of c.claimable) claimChainReward(state, c.id, k.stepIndex, ni, ctx)
    claimAllMail(state, ni, ctx)
  }
  const perDay = [3, 4, 4, 4, 4, 4]
  for (let d = 0; d < perDay.length && !out.eligible; d++) {
    ctx.clock.t = start + d * DAY
    refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
    claimCheckin(state, makeNowInfo(state, ctx.clock.t), ctx)
    claimAll()
    for (let k = 0; k < perDay[d]; k++) {
      ctx.clock.t = start + d * DAY + k * 3 * HOUR
      const btt = shopCatalog(state, ctx).recipes.find(r => r.id === 'banh_trang_tron')
      if (btt.canBuy) buyShopRecipe(state, 'banh_trang_tron', ctx)
      if (!state.upgrades.dao_thep && state.day >= DATA.UPGRADES.dao_thep.fromDay && state.wallet >= upgradePrice('dao_thep') + 20000) buyShopUpgrade(state, 'dao_thep', ctx)
      startShift(state, ctx)
      let steps = 0
      while (!isShiftOver(state)) {
        if (++steps > 20000) throw new Error('ca không kết thúc')
        while (counterStep(state, ctx)) { /* quầy */ }
        for (const t of state.shift.tickets.slice()) cookTicket(state, ctx, t, { score: pickScore() })
        if (!isShiftOver(state)) advance(state, 0.5, ctx)
      }
      const sum = endShift(state, ctx)
      ctx.clock.t += 40 * 60000
      claimAll()
      if (out.hit150 === null && state.reputation >= repTarget) out.hit150 = sum.day
      if (!out.eligible && checkStageUp(state, ctx).eligible) out.eligible = sum.day
    }
  }
  return out
}

for (const seed of [42, 7, 2024]) {
  test(`cân bằng: người chơi trung bình đạt ngưỡng danh tiếng lên Chặng 2 không trước ca 8, đủ điều kiện trước ca 15 (seed ${seed})`, () => {
    const r = simulateAverage(seed)
    if (process.env.META_SIM_LOG) console.log(`trung bình seed ${seed}: ${repTarget} danh tiếng ở ca ${r.hit150}, đủ điều kiện ở ca ${r.eligible}`)
    assert.equal(repTarget, 150, 'ngưỡng danh tiếng theo can-bang mục 13')
    // luật chỉnh ở can-bang mục 13: chỉ nâng lên 200 nếu người chơi trung bình đủ điều kiện TRƯỚC ca 8
    assert.ok(r.hit150 >= 8, `đạt ${repTarget} danh tiếng ở ca ${r.hit150} (trước ca 8 thì phải nâng ngưỡng)`)
    assert.ok(r.eligible && r.eligible <= 15, `đủ điều kiện ở ca ${r.eligible}, mục tiêu tới ca 15`)
  })
}
