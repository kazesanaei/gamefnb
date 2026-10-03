// E2E M4 sự kiện phạt tiền + tình huống mới (giao diện thật, Chromium 390×844, đồng hồ giả chạy nhanh lúc chờ khách).
// Tách từ tests/e2e/m4-tip-events.e2e.mjs (ca thứ hai) ở bản 0.5.1: hai ca chung một tệp chạy ~585 giây, sát mốc 10 phút
// mỗi lệnh e2e; mỗi tệp nay một ca.
//  Ngày có "Đoàn kiểm tra vệ sinh" lần 2 (tests/helpers/m4-saves.mjs builtAttpSave, seed 92: lần 1 ngày 6 đã bị nhắc nhở,
//  lần 2 ngày 18): thẻ sự kiện ở màn Chuẩn bị ghi loại "Có lựa chọn" và dòng cảnh báo tái phạm; không chuẩn bị, cố ý lấy
//  nhầm 1 nguyên liệu → cuối ca bị phạt, Tổng kết có dòng "Phạt, chi sự kiện" và dòng sự kiện; tình huống M4 mới (Khách
//  bỏ quên ví, rồi Bình gas hết) hiện giữa hai khách, đúng 1 cách an toàn, chọn cách an toàn; lãi khớp lịch sử.
// Seed tìm bằng `node tools/tim-seed.mjs attp`. Sổ lãi lỗ đọc bằng checkLedger / ledgerRow của helpers.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, readSave, waitSave, seedSave, enterPrep, waitCustomerOrEnd, serveAtCounter, cookAndServe, checkLedger, ledgerRow } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { builtAttpSave, NEW_INCIDENTS } from '../helpers/m4-saves.mjs'

const ATTP_SEED = 92

test('sự kiện ngày có phạt (kiểm tra vệ sinh tái phạm) + tình huống mới chọn cách an toàn → Tổng kết có dòng sự kiện, lãi khớp lịch sử', { timeout: 900000 }, async () => {
  const g = await openGame({ clock: true, name: 'su-kien' })
  const { page, errors } = g
  try {
    const b = builtAttpSave(ATTP_SEED)
    assert.ok(b, 'seed có 2 lần kiểm tra vệ sinh')
    await seedSave(page, b.state)
    await enterPrep(g, `?devNow=${b.at}`)
    const later = await page.waitForSelector(T('stage-up-later'), { timeout: 1500 }).catch(() => null)
    if (later) await later.tap()

    // ---- Màn Chuẩn bị: thẻ sự kiện ngày loại "Có lựa chọn", dòng cảnh báo tái phạm ----
    const card = await page.waitForSelector(T('day-event-card'))
    assert.equal(await card.getAttribute('data-event'), 'kiem_tra_attp')
    assert.equal(await card.getAttribute('data-kind'), 'chon')
    assert.match(await card.textContent(), /Có lựa chọn/)
    assert.match(await page.textContent(T('day-event-warn')), new RegExp(`Ngày ${b.first} đã bị nhắc nhở`))
    assert.ok(await page.$(T('day-event-choice-chuan_bi')), 'có lựa chọn an toàn "Chuẩn bị đón đoàn"')
    await page.waitForTimeout(2500)   // chờ thông báo thư tắt
    await page.evaluate(() => document.querySelector('[data-testid="day-event-card"]').scrollIntoView({ block: 'center' }))
    await g.shot('the-kiem-tra-ve-sinh')

    // ---- Mở ca (không chuẩn bị): kế hoạch tình huống ----
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    const s0 = await waitSave(page, st => !!st.shift)
    assert.equal(s0.shift.mods.dayEvent.id, 'kiem_tra_attp')
    assert.equal(s0.shift.mods.dayEvent.choice, null)
    const plans = [s0.shift.incident, ...(s0.shift.incidentQueue || [])].filter(Boolean)
    assert.ok(plans.length >= 1 && NEW_INCIDENTS.includes(plans[0].id), 'tình huống thứ nhất là tình huống M4 mới')

    // ---- Bán cả ca: tình huống hiện giữa hai khách → cách an toàn; 1 món cố ý lấy nhầm nguyên liệu ----
    const handled = []
    let wrongDone = false
    for (let guard = 0; guard < 14; guard++) {
      const what = await waitCustomerOrEnd(g, { useClock: true })
      if (what === 'summary') break
      const order = await serveAtCounter(g)
      if (order.rejected) continue
      const modal = await page.waitForSelector(T('incident-modal'), { timeout: 1500 }).catch(() => null)
      if (modal && !(await page.$(`.modal-layer.hide ${T('incident-modal')}`))) {
        const id = await page.getAttribute(`${T('incident-modal')} .incident`, 'data-incident')
        const def = DATA.INCIDENTS[id]
        const safe = await page.$$(`${T('incident-modal')} [data-safe="true"]`)
        assert.equal(safe.length, 1, id + ': đúng 1 cách an toàn')
        const safeId = await safe[0].getAttribute('data-choice')
        assert.equal(safeId, def.choices.find(c => c.safe).id)
        assert.equal((await page.$$('[data-testid^="incident-choice-"]')).length, def.choices.length)
        await g.shot('tinh-huong-' + id)
        await safe[0].tap()
        await page.waitForSelector(T('incident-result'))
        const fx = await page.$$eval(`${T('incident-effects')} .incident-fx`, els => els.map(e => e.dataset.fx))
        assert.ok(!fx.includes('fine'), id + ': cách an toàn không mất tiền')
        await g.shot('tinh-huong-ket-qua-' + id)
        await page.tap(T('incident-ok'))
        await page.waitForSelector(T('incident-modal'), { state: 'detached' })
        handled.push({ id, choice: safeId, fx })
        const s = await readSave(page)
        const t = s.shift && s.shift.tickets.find(x => x.id === order.ticketId)
        if (t) order.request = s.shift.customers[t.customerId].request
      }
      await cookAndServe(g, order.ticketId, { shots: false, wrongPick: !wrongDone })
      wrongDone = true
      await page.click(T('tab-counter'), { timeout: 2000 }).catch(() => {})
    }
    await page.waitForSelector(T('summary'), { timeout: 15000 })
    assert.ok(handled.length >= 1 && handled[0].id === plans[0].id, 'gặp tình huống M4 mới: ' + handled.map(x => x.id).join(', '))

    // ---- Tổng kết: phạt kiểm tra vệ sinh, dòng sự kiện, lãi khớp lịch sử ----
    const s2 = await waitSave(page, st => !st.shift && st.day === s0.day + 1)
    const h = s2.history[s2.history.length - 1]
    assert.ok(h.eventOut > 0, 'bị phạt vì tái phạm lỗi vệ sinh')
    assert.equal(s2.incidents.warn.kiem_tra_attp, undefined, 'phạt xong thì xóa lần nhắc nhở')
    // mọi tình huống lên lịch đều hiện và được xử lý bằng cách an toàn (kể cả tình huống bật lúc chờ khách, do helpers xử lý)
    assert.deepEqual(h.incidents.map(x => x.id), plans.map(p => p.id), 'mọi tình huống lên lịch đều hiện')
    for (const x of h.incidents) assert.equal(x.choice, DATA.INCIDENTS[x.id].choices.find(c => c.safe).id, x.id + ': cách an toàn')
    const ev = await page.waitForSelector(`${T('summary-event-money')} li[data-event="kiem_tra_attp"]`)
    assert.equal(Number(await ev.getAttribute('data-money')), -h.eventOut, 'dòng sự kiện ghi đúng số tiền phạt')
    assert.match(await ev.textContent(), /Tái phạm lỗi .*lấy nhầm/i)
    const L = await checkLedger(page, h)
    assert.ok(ledgerRow(L, DATA.STRINGS.summary.eventOut) > 0)
    await page.evaluate(() => document.querySelector('[data-testid="summary"] table.ledger').scrollIntoView({ block: 'start' }))
    await g.shot('tong-ket-phat')
    await page.evaluate(() => document.querySelector('[data-testid="summary-incident"]').scrollIntoView({ block: 'center' }))
    await g.shot('tong-ket-su-kien')
    console.log('Tình huống:', handled.map(x => `${x.id}/${x.choice} [${x.fx.join(',')}]`).join(' | '),
      `· tiền sự kiện +${h.eventIn} −${h.eventOut} · lãi ${h.profit}`)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
