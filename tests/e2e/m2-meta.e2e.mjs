// E2E M2: điểm danh qua mốc 04:00 giờ Việt Nam; sự kiện Tri ân 20/11 → nhận Chè bưởi qua chuỗi → hết mùa vẫn giữ món;
// Chợ Công Thức mua món + mua màu dù; Việc hôm nay nhận thưởng. Save dựng sẵn bằng lõi (người chơi hoàn hảo).
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, readSave } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { encodeSave, SAVE_KEY } from '../../src/core/save.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'

// Save đã chơi `shifts` ca (mỗi ca một ngày thật, bắt đầu từ `at`).
function builtSave({ seed = 136, shifts = 3, at = '2026-09-26T08:00' } = {}) {
  const ctx = makeMetaCtx({ at, attach: true })
  const state = defaultState(seed, DATA)
  ctx.setState(state)
  state.shopName = 'Xe Kiểm Thử'
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  for (let i = 0; i < shifts; i++) {
    playShift(state, ctx)
    ctx.clock.t += 24 * 3600 * 1000
  }
  // ngày thật cuối: bốc sẵn Việc hôm nay của ngày đó
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  return state
}

// Nạp save một lần cho cả phiên tab (tải lại / đổi ?devNow không ghi đè).
async function seedSave(page, state) {
  await page.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('bkn.seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('bkn.seeded', '1') }
  }, [SAVE_KEY, encodeSave(state)])
}

async function enterPrep(g, devNow) {
  const { page } = g
  await page.goto(g.url('/?devNow=' + devNow))
  await page.waitForSelector(T('start-button'))
  await page.tap(T('start-button'))
  await page.waitForSelector(T('screen-prep'))
}

async function noOverflow(page) {
  const ov = await page.evaluate(() => {
    const s = document.getElementById('screen')
    return Math.max(document.documentElement.scrollWidth - window.innerWidth, s ? s.scrollWidth - s.clientWidth : 0)
  })
  assert.ok(ov <= 0, 'tràn ngang ' + ov + 'px')
}

test('điểm danh: 03:59 chưa sang ngày, 04:00 hiện bảng và nhận bằng 1 chạm', { timeout: 120000 }, async () => {
  const g = await openGame({ name: 'm2-diem-danh' })
  const { page, errors } = g
  try {
    const state = builtSave()
    state.checkin.lastDay = '2026-09-29'
    state.checkin.next = 1
    state.checkin.total = 1
    await seedSave(page, state)
    await enterPrep(g, '2026-09-30T03:59')
    await page.waitForTimeout(500)
    assert.equal(await page.$(T('checkin-popup')), null, '03:59 vẫn là ngày cũ, không được hiện bảng')
    assert.equal(await page.getAttribute(T('open-checkin'), 'data-dot'), '0')

    await enterPrep(g, '2026-09-30T04:00')
    await page.waitForSelector(T('checkin-popup'))
    await noOverflow(page)
    const before = await readSave(page)
    await page.tap(T('checkin-claim'))
    await page.waitForSelector(T('checkin-popup'), { state: 'detached', timeout: 5000 })
    const after = await readSave(page)
    assert.equal(after.checkin.next, 2)
    assert.equal(after.checkin.lastDay, '2026-09-30')
    // ô 2 Tuần Khai Trương: Phiếu Chợ Sớm
    assert.equal(after.items.phieu_cho_som, (before.items.phieu_cho_som || 0) + 1)
    // mở lại trong ngày: không hiện nữa, nút báo đã nhận
    await page.tap(T('open-checkin'))
    await page.waitForSelector(T('checkin-popup'))
    assert.equal(await page.isDisabled(T('checkin-claim')), true)
    await page.tap(T('checkin-close'))
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('sự kiện Tri ân 20/11: nhận Chè bưởi qua chuỗi, hết mùa vẫn giữ và bán món', { timeout: 120000 }, async () => {
  const g = await openGame({ name: 'm2-su-kien' })
  const { page, errors } = g
  try {
    const state = builtSave({ at: '2026-11-15T08:00' })
    state.checkin.lastDay = '2026-12-05'
    // chuỗi sự kiện đã xong bước cuối, thưởng (công thức Chè bưởi) chờ nhận
    state.chains.tri_an_20_11_chuoi = { step: 5, progress: 0, done: true, claimable: [4], since: '2026-11-18' }
    await seedSave(page, state)
    await enterPrep(g, '2026-11-19T09:00')
    await page.waitForSelector(T('event-card'))
    assert.equal(await page.getAttribute(T('event-card'), 'data-phase'), 'dang_dien_ra')
    assert.equal(await page.$(T('prep-dish-che_buoi')), null, 'chưa nhận mà đã có món')
    await page.tap(T('open-event'))
    await page.waitForSelector(T('screen-event'))
    await page.waitForSelector(T('event-tem'))
    await noOverflow(page)
    await page.tap(T('chain-claim-tri_an_20_11_chuoi-4'))
    await page.waitForSelector(`${T('event-recipe-che_buoi')}.is-owned`)
    const got = await readSave(page)
    assert.ok(got.recipes.che_buoi, 'chưa nhận công thức Chè bưởi')
    assert.equal(got.eventRecipes.che_buoi.label, 'Tri ân 20/11 · 2026')
    assert.ok(got.events.tri_an_20_11.tem >= 40)

    // sau mùa sự kiện (và hết ân hạn): món vẫn trong thực đơn, thẻ sự kiện không còn
    await enterPrep(g, '2026-12-05T09:00')
    await page.waitForSelector(T('prep-dish-che_buoi'))
    assert.equal(await page.$(T('event-card')), null)
    const later = await readSave(page)
    assert.ok(later.recipes.che_buoi)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('Chợ Công Thức mua món, Góc Muỗng Vàng đổi dù; Việc hôm nay nhận thưởng', { timeout: 120000 }, async () => {
  const g = await openGame({ name: 'm2-shop' })
  const { page, errors } = g
  try {
    const state = builtSave()
    state.checkin.lastDay = '2026-09-29'
    state.goldSpoons = 40
    state.daily.quests[2].progress = state.daily.quests[2].target
    await seedSave(page, state)
    await enterPrep(g, '2026-09-29T09:00')

    // Việc hôm nay
    await page.tap(T('open-quests'))
    await page.waitForSelector(T('quest-2'))
    await page.tap(T('quest-claim-2'))
    await page.waitForSelector(`${T('quest-claim-2')}[disabled]`)
    const q = await readSave(page)
    assert.equal(q.daily.quests[2].claimed, true)
    assert.ok(q.wallet > state.wallet)
    await page.tap(T('meta-back'))

    // Kệ Chính
    await page.tap(T('open-shop'))
    await page.waitForSelector(T('shop-item-banh_trang_tron'))
    await noOverflow(page)
    const w0 = (await readSave(page)).wallet
    await page.tap(T('shop-buy-banh_trang_tron'))
    await page.tap(T('confirm-ok'))
    await page.waitForSelector(`${T('shop-item-banh_trang_tron')}.is-owned`)
    const s1 = await readSave(page)
    assert.ok(s1.recipes.banh_trang_tron)
    assert.equal(s1.wallet, w0 - DATA.RECIPES.banh_trang_tron.shopPrice)

    // Góc Muỗng Vàng: mua dù xanh lá, hình xe đổi màu
    await page.tap(T('shop-tab-spoons'))
    await page.tap(T('parasol-du_xanh_la'))
    await page.tap(T('confirm-ok'))
    await page.waitForSelector(`${T('cart-view')}[data-umbrella="du_xanh_la"]`)
    const s2 = await readSave(page)
    assert.equal(s2.goldSpoons, 10)
    assert.equal(s2.cosmetics.equipped.du, 'du_xanh_la')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
