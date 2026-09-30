// E2E hồi quy cho vòng soát lỗi M2 (giao diện thật, Chromium 390×844 cảm ứng):
//   R1   hai tab cùng mở: tab cũ tự khóa, không ghi đè tiến trình của tab mới;
//   R14  ?devNow lưu ở khóa riêng: mở lại bình thường thì save thật không bị khóa lùi giờ;
//   R4/UX-01  trong ân hạn vẫn nhận được thưởng chuỗi sự kiện (Chè bưởi) ở màn sự kiện, thẻ sự kiện có chấm đỏ;
//   UX-03  nút Back của điện thoại ở màn con quay về màn Chuẩn bị, không rời game.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, readSave, seedSave, enterPrep, claimCheckinIfShown } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { decodeSave, SAVE_KEY, DEV_SAVE_KEY } from '../../src/core/save.js'
import { makeMetaCtx, vn } from '../helpers/meta-helpers.mjs'

const EV = 'tri_an_20_11'
const CH = 'tri_an_20_11_chuoi'

async function newGame(g, page, query) {
  await page.goto(g.url('/' + query))
  await page.fill(T('shop-name-input'), 'Xe Hai Tab')
  await page.tap(T('start-button'))
  await page.waitForSelector(T('screen-prep'))
  await claimCheckinIfShown(g, 3000)
}

test('R1: mở game ở tab thứ hai thì tab cũ tự khóa, không ghi đè quà đã nhận ở tab mới', { timeout: 300000 }, async () => {
  const g = await openGame({ name: 'hai-tab' })
  const { page: a, context, errors } = g
  try {
    await newGame(g, a, '?seed=42')
    const s0 = await readSave(a)
    assert.equal(s0.goldSpoons, 10, 'đã điểm danh ô 1')
    // tab B: nhận hết Hộp thư (thư chào mừng: 10 Muỗng Vàng + Phiếu Chợ Sớm)
    const b = await context.newPage()
    await b.goto(g.url('/'))
    await b.tap(T('start-button'))
    await b.waitForSelector(T('screen-prep'))
    await a.waitForSelector(T('tab-lock'), { timeout: 5000 })
    await g.shot('tab-cu-khoa')
    await b.tap(T('open-mail'))
    await b.waitForSelector(T('screen-mail'))
    await b.tap(T('mail-claim-all'))
    await b.waitForFunction(k => {
      const raw = localStorage.getItem(k)
      return raw && raw.length > 0
    }, SAVE_KEY)
    await b.waitForTimeout(500)
    const afterB = await readSave(b)
    assert.equal(afterB.goldSpoons, 20)
    assert.equal(afterB.items.phieu_cho_som, 1)
    await b.close()
    // tab A: bị che, thao tác không lưu được; ẩn tab (flush) cũng không ghi đè
    await a.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await a.evaluate(() => window.dispatchEvent(new Event('pagehide')))
    await a.waitForTimeout(400)
    const still = await readSave(a)
    assert.equal(still.goldSpoons, 20, 'tab cũ không ghi đè')
    assert.equal(still.mail.list.find(m => m.id === 'chao_mung').claimed, true)
    // "Chơi ở tab này" → tải lại bản mới nhất
    await a.tap(T('tab-lock-reload'))
    await a.waitForSelector(T('start-button'))
    await a.tap(T('start-button'))
    await a.waitForSelector(T('screen-prep'))
    assert.equal(await a.getAttribute(T('prep-spoons'), 'data-amount'), '20')
    assert.equal(!!(await a.$(T('tab-lock'))), false)
    assert.deepEqual(errors, [])
  } finally {
    await g.close()
  }
})

test('R14 + UX-03: ?devNow lưu riêng; nút Back ở màn con về màn Chuẩn bị', { timeout: 300000 }, async () => {
  // giờ thật cố định 02/10/2026 (đồng hồ giả của trình duyệt) để so với mốc xem trước 15/11
  const g = await openGame({ name: 'gio-gia-back', clock: { time: vn('2026-10-02T09:00') } })
  const { page, errors } = g
  try {
    // chơi thật hôm nay (30/09) rồi xem trước ngày 15/11 bằng giờ giả
    await newGame(g, page, '?seed=7')
    await page.goto(g.url('/?devNow=2026-11-15T09:00'))
    // đọc save thật sau khi trang cũ đã lưu lúc rời trang; từ đây trang giờ giả không được ghi vào khóa này
    const real0 = await page.evaluate(k => localStorage.getItem(k), SAVE_KEY)
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    assert.match(await page.textContent(T('devnow-banner')), /Giờ giả 15\/11 09:00/)
    await claimCheckinIfShown(g, 2000)
    await page.waitForTimeout(500)
    const dev = await page.evaluate(k => localStorage.getItem(k), DEV_SAVE_KEY)
    assert.ok(dev, 'có save xem trước riêng')
    assert.equal(decodeSave(dev).checkin.lastDay, '2026-11-15')
    // UX-03: vào Chợ Công Thức / Hộp thư rồi bấm Back của trình duyệt → về màn Chuẩn bị
    for (const [open, screen] of [['open-shop', 'screen-shop'], ['open-mail', 'screen-mail'], ['open-quests', 'screen-quests']]) {
      await page.tap(T(open))
      await page.waitForSelector(T(screen))
      await page.goBack()
      await page.waitForSelector(T('screen-prep'), { timeout: 3000 })
    }
    assert.match(page.url(), /devNow/, 'vẫn ở trong game')
    // quay về giờ thật: save thật không bị ghi mốc 15/11, không bị khóa lùi giờ
    assert.equal(await page.evaluate(k => localStorage.getItem(k), SAVE_KEY), real0, 'save thật không đổi khi xem trước')
    await page.goto(g.url('/'))
    const real1 = decodeSave(await page.evaluate(k => localStorage.getItem(k), SAVE_KEY))
    assert.equal(real1.checkin.lastDay, decodeSave(real0).checkin.lastDay)
    assert.ok(real1.clock.maxSeen < Date.parse('2026-11-01T00:00:00+07:00'), 'save thật không có mốc giờ giả')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    assert.equal(!!(await page.$(T('devnow-banner'))), false)
    assert.equal(!!(await page.$(T('rewind-note'))), false, 'không bị khóa lùi giờ')
    assert.deepEqual(errors, [])
  } finally {
    await g.close()
  }
})

// Save: chơi 3 ngày trong mùa, xong cả 5 bước chuỗi ngày cuối mùa nhưng chưa bấm nhận bước 4–5.
function graceSave() {
  const ctx = makeMetaCtx({ at: '2026-11-21T20:00', attach: true })
  const s = defaultState(31, DATA)
  ctx.setState(s)
  s.shopName = 'Xe Ân Hạn'
  s.day = 12
  refreshMeta(s, makeNowInfo(s, ctx.clock.t), ctx)
  s.events[EV].days = ['2026-11-19', '2026-11-20', '2026-11-21']
  s.events[EV].tem = 45
  s.events[EV].temTotal = 120
  s.chains[CH] = { step: 5, progress: 0, done: true, claimable: [3, 4], since: '2026-11-21' }
  s.checkin.lastDay = '2026-11-23'
  return s
}

test('R4/UX-01: trong ân hạn nhận Chè bưởi ở màn sự kiện; thẻ sự kiện có chấm đỏ', { timeout: 300000 }, async () => {
  const g = await openGame({ name: 'an-han' })
  const { page, errors } = g
  try {
    await seedSave(page, graceSave())
    await enterPrep(g, '?devNow=2026-11-23T09:00')
    await claimCheckinIfShown(g, 1500)
    assert.equal(await page.getAttribute(T('event-card'), 'data-phase'), 'an_han')
    assert.equal(await page.getAttribute(T('event-card'), 'data-dot'), '2')
    assert.ok(await page.$(T('event-card-dot')), 'chấm đỏ ở thẻ sự kiện')
    assert.match(await page.textContent(T('event-card')), /chờ nhận/)
    await g.shot('chuan-bi-an-han')
    await page.tap(T('open-event'))
    await page.waitForSelector(T('screen-event'))
    assert.match(await page.textContent(T('event-recipe-che_buoi')), /nhận công thức/)
    assert.ok(await page.$(T('event-grace-chain')))
    await g.shot('su-kien-an-han')
    for (const k of [3, 4]) {
      await page.tap(T(`chain-claim-${CH}-${k}`))
      await page.waitForTimeout(300)
    }
    await page.waitForSelector(`${T('event-recipe-che_buoi')}.is-owned`)
    const s = await readSave(page)
    assert.ok(s.recipes.che_buoi, 'đã nhận Chè bưởi trong ân hạn')
    assert.equal(s.events[EV].tem, 45 + 35 + 40, 'Tem thưởng chuỗi vào sự kiện, còn đổi được ở Quầy đổi')
    assert.deepEqual(s.chains[CH].claimable, [])
    await g.shot('su-kien-da-nhan')
    await page.goBack()
    await page.waitForSelector(T('screen-prep'))
    assert.equal(await page.getAttribute(T('event-card'), 'data-dot'), '0')
    assert.deepEqual(errors, [])
  } finally {
    await g.close()
  }
})
