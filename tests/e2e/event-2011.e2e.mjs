// E2E sự kiện "Tri ân 20/11" (xem trước bằng ?devNow trên localhost, đồng hồ giả chạy nhanh lúc chờ khách):
//   13/11: thẻ sự kiện "Đang diễn ra", Tem tăng khi nấu món đạt Ngon trở lên, chuỗi sự kiện tiến lên bước cuối
//          (save dựng sẵn đã ở gần cuối chuỗi); bước cuối cần 3 ngày thật chơi trong mùa nên hôm nay còn khóa;
//   14/11: ngày thứ 3 → bước cuối mở, nấu đủ món Tuyệt hảo → xong chuỗi → nhận công thức Chè bưởi (nhãn mùa);
//   25/11: sự kiện đã hết (qua cả ân hạn), thẻ sự kiện không còn, Chè bưởi vẫn trong thực đơn, khách gọi và được phục vụ;
//   09/11 với save mới: thẻ "Sắp diễn ra".
// Không bật ?test=1 (Hỗ trợ thao tác giới hạn hạng Ngon) để người chơi tự động nấu được món Tuyệt hảo, khách 5 sao.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, readSave, waitSave, seedSave, enterPrep, playShiftUi, claimCheckinIfShown } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { chainStatus, claimChainReward } from '../../src/core/chains.js'
import { grantReward } from '../../src/core/rewards.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx, vn } from '../helpers/meta-helpers.mjs'

const EV = 'tri_an_20_11'
const CH = 'tri_an_20_11_chuoi'
const CHE = 'che_buoi'
const STEPS = DATA.EVENTS[EV].chain.steps

// Seed 31: chơi 2 ca trong mùa (12/11 và sáng 13/11) bằng người chơi hoàn hảo; ngày 25/11 khách đầu gọi Chè bưởi.
// Gần cuối chuỗi: đã xong bước 1–3 (đã nhận thưởng), bước 4 "khách chấm 5 sao" còn thiếu 1 khách.
function builtSave() {
  const ctx = makeMetaCtx({ at: '2026-11-12T08:00', attach: true })
  const state = defaultState(31, DATA)
  ctx.setState(state)
  state.shopName = 'Xe Tri Ân'
  const ni = () => makeNowInfo(state, ctx.clock.t)
  const claimChains = () => {
    for (const c of chainStatus(state, ni(), ctx)) for (const k of c.claimable) claimChainReward(state, c.id, k.stepIndex, ni(), ctx)
  }
  refreshMeta(state, ni(), ctx)
  playShift(state, ctx)
  claimChains()
  ctx.clock.t = vn('2026-11-13T07:00')
  refreshMeta(state, ni(), ctx)
  playShift(state, ctx)
  claimChains()
  const cs = state.chains[CH]
  assert.ok(cs && cs.step <= 3, 'save dựng sẵn đi quá xa: ' + JSON.stringify(cs))
  for (let k = cs.step; k < 3; k++) grantReward(state, STEPS[k].reward, ctx, { eventId: EV })
  state.chains[CH] = { step: 3, progress: STEPS[3].target - 1, done: false, claimable: [], since: '2026-11-13' }
  assert.deepEqual(state.events[EV].days, ['2026-11-12', '2026-11-13'])
  state.checkin.lastDay = '2026-12-31'   // không bật bảng điểm danh trong test này
  return state
}

const temOf = s => s.events[EV].tem

test('Tri ân 20/11: Tem khi món Ngon, xong chuỗi nhận Chè bưởi, hết mùa vẫn bán Chè bưởi', { timeout: 900000 }, async () => {
  const g = await openGame({ clock: true, name: 'tri-an-20-11' })
  const { page, errors } = g
  try {
    await seedSave(page, builtSave())

    // ---------- 13/11: đang diễn ra ----------
    await enterPrep(g, '?devNow=2026-11-13T09:00')
    await page.waitForSelector(`${T('event-card')}[data-phase="dang_dien_ra"]`)
    assert.match(await page.textContent(T('event-card')), /Đang diễn ra/)
    assert.equal(!!(await page.$(T('prep-dish-' + CHE))), false, 'chưa nhận thì chưa bán Chè bưởi')
    await page.tap(T('open-event'))
    await page.waitForSelector(T('screen-event'))
    const s0 = await readSave(page)
    assert.equal(Number(await page.getAttribute(T('event-tem'), 'data-amount')), temOf(s0))
    assert.equal(await page.getAttribute(T('event-chain-step'), 'data-step'), '3')
    await g.shot('su-kien-13-11')
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('screen-prep'))

    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    // phục vụ tới khi có khách chấm 5 sao (xong bước 4); món đạt Ngon trở lên → Tem tăng
    const stepDone = async () => { await page.waitForTimeout(400); return (await readSave(page)).chains[CH].step === 4 }
    const first = await playShiftUi(g, { useClock: true, until: stepDone })
    assert.ok(first.some(c => c.stars === 5), 'chưa có khách 5 sao')
    const s1 = await waitSave(page, st => temOf(st) > temOf(s0))
    assert.ok(s1.events[EV].temToday > 0 && s1.events[EV].temToday <= DATA.EVENTS[EV].tem.dailyCap)
    const c1 = await waitSave(page, st => st.chains[CH].step === 4)
    assert.deepEqual(c1.chains[CH].claimable, [3])
    assert.equal(c1.chains[CH].done, false)
    // bán hết ca; bước cuối còn khóa (mới 2 ngày thật trong mùa) nên không đếm
    await playShiftUi(g, { useClock: true })
    await page.waitForSelector(T('summary-event-chain'))
    const s2 = await waitSave(page, st => !st.shift)
    assert.equal(s2.chains[CH].step, 4)
    assert.equal(s2.chains[CH].progress, 0, 'bước cuối chưa mở thì chưa đếm')
    assert.deepEqual(s2.events[EV].days, ['2026-11-12', '2026-11-13'])
    await page.tap(T('next-day'))
    await page.waitForSelector(T('screen-prep'))

    // ---------- 14/11: ngày chơi thứ 3 trong mùa → bước cuối mở ----------
    await enterPrep(g, '?devNow=2026-11-14T09:00')
    await page.tap(T('open-event'))
    await page.waitForSelector(T('screen-event'))
    const t0 = temOf(await readSave(page))
    await page.tap(T(`chain-claim-${CH}-3`))
    await page.waitForSelector(T(`chain-claim-${CH}-3`), { state: 'detached' })
    const s3 = await waitSave(page, st => st.chains[CH].claimable.length === 0)
    assert.equal(temOf(s3), t0 + STEPS[3].reward.tem)
    assert.match(await page.textContent(T('event-chain-step')), /Mở hàng một ca hôm nay/)
    await page.tap(T('meta-back'))
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    await playShiftUi(g, { useClock: true })
    await page.waitForSelector(T('summary'))
    const s4 = await waitSave(page, st => !st.shift)
    assert.equal(s4.events[EV].days.length, 3)
    assert.equal(s4.chains[CH].done, true, 'chưa xong chuỗi sự kiện: ' + JSON.stringify(s4.chains[CH]))
    assert.deepEqual(s4.chains[CH].claimable, [4])
    await page.tap(T('next-day'))
    await page.waitForSelector(T('screen-prep'))
    await page.tap(T('open-event'))
    await page.waitForSelector(T(`chain-claim-${CH}-4`))
    await page.tap(T(`chain-claim-${CH}-4`))
    await page.waitForSelector(`${T('event-recipe-' + CHE)}.is-owned`)
    await g.shot('nhan-che-buoi')
    const s5 = await waitSave(page, st => !!st.recipes[CHE])
    assert.equal(s5.eventRecipes[CHE].label, 'Tri ân 20/11 · 2026')
    assert.equal(s5.eventRecipes[CHE].eventId, EV)
    assert.match(await page.textContent(T('event-recipe-' + CHE)), /Tri ân 20\/11 · 2026/)
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('prep-dish-' + CHE))

    // ---------- 25/11: đã hết mùa (và hết ân hạn) ----------
    await enterPrep(g, '?devNow=2026-11-25T09:00')
    await page.waitForSelector(T('prep-dish-' + CHE))
    assert.equal(!!(await page.$(T('event-card'))), false, 'hết mùa thì không còn thẻ sự kiện')
    assert.match(await page.textContent(T('prep-dish-' + CHE)), /Tri ân 20\/11 · 2026/)
    await g.shot('het-mua-van-ban')
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    const served = await playShiftUi(g, { useClock: true, until: order => order.request.some(l => l.recipeId === CHE) })
    const last = served[served.length - 1]
    assert.ok(last.request.some(l => l.recipeId === CHE), 'không có khách gọi Chè bưởi sau sự kiện')
    assert.ok(last.stars >= 4)
    const s6 = await waitSave(page, st => st.recipes[CHE].cooks >= 1)
    assert.ok(s6.recipes[CHE].goodCooks >= 1)
    assert.equal(s6.events[EV].settled, true, 'Tem dư đã tất toán sau ân hạn')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('Tri ân 20/11: save mới ngày 09/11 thấy thẻ "Sắp diễn ra"', { timeout: 120000 }, async () => {
  const g = await openGame({ name: 'tri-an-sap-dien-ra' })
  const { page, errors } = g
  try {
    await page.goto(g.url('/?devNow=2026-11-09T09:00&seed=5'))
    await page.fill(T('shop-name-input'), 'Xe Mới Mở')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    await claimCheckinIfShown(g, 3000)
    await page.waitForSelector(`${T('event-card')}[data-phase="sap_dien_ra"]`)
    const text = await page.textContent(T('event-card'))
    assert.match(text, /Sắp diễn ra/)
    assert.match(text, /Tri ân 20\/11/)
    assert.match(text, /Mở sau 2 ngày/)
    await g.shot('sap-dien-ra')
    await page.tap(T('open-event'))
    await page.waitForSelector(T('screen-event'))
    assert.equal(!!(await page.$(T('event-tem'))), false, 'chưa mở thì chưa có Tem')
    assert.match(await page.textContent(T('screen-event')), /04:00 ngày 12\/11\/2026/)
    const s = await readSave(page)
    assert.equal(s.recipes[CHE], undefined)
    assert.deepEqual(s.events, {}, 'chưa mở sự kiện thì chưa ghi gì')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
