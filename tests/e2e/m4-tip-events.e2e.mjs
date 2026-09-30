// E2E M4 tip mới + sự kiện thưởng/phạt tiền (giao diện thật, Chromium 390×844, đồng hồ giả chạy nhanh lúc chờ khách):
//  1. Ca ngày 5 đang dở (tests/helpers/m4-saves.mjs tipShiftSave, seed 1: sự kiện ngày "Hội thi Xe đẩy sạch, ngon"):
//     2 phiếu đã nấu xong chờ giao → phiếu chấm 5 sao hóa đơn 20.000đ ghi "Tip: +5.000đ", 5 sao hóa đơn 10.000đ ghi
//     "Tip 0 (hóa đơn dưới 20.000đ)"; bán hết ca qua giao diện: mọi phiếu chấm tip chỉ 0 hoặc 5.000đ, đúng luật; Tổng
//     kết: dòng Tiền tip, dòng tiền Hội thi, sổ lãi lỗ cộng lại đúng bằng lãi và khớp lịch sử.
//  2. Ngày có "Đoàn kiểm tra vệ sinh" lần 2 (builtAttpSave, seed 92: lần 1 ngày 6 đã bị nhắc nhở, lần 2 ngày 18): thẻ
//     sự kiện ở màn Chuẩn bị ghi loại "Có lựa chọn" và dòng cảnh báo tái phạm; không chuẩn bị, cố ý lấy nhầm 1 nguyên
//     liệu → cuối ca bị phạt, Tổng kết có dòng "Phạt, chi sự kiện" và dòng sự kiện; tình huống M4 mới (Khách bỏ quên
//     ví, rồi Bình gas hết) hiện giữa hai khách, đúng 1 cách an toàn, chọn cách an toàn; lãi khớp lịch sử.
// Seed tìm bằng `node tools/tim-seed.mjs tip` và `node tools/tim-seed.mjs attp`.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, readSave, waitSave, seedSave, enterPrep, waitCustomerOrEnd, serveAtCounter, cookAndServe, playShiftUi, readSheetTip } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { tipShiftSave, TIP_AT, builtAttpSave, NEW_INCIDENTS } from '../helpers/m4-saves.mjs'

const TIP_SEED = 1
const ATTP_SEED = 92
const MIN_BILL = DATA.BALANCE.tipMinBill
const TIP = DATA.BALANCE.tipFiveStar

// "−20.000đ" / "+5.000đ" / "20.000đ" → số (dấu trừ Unicode hoặc ASCII).
function money(text) {
  const t = String(text || '').trim()
  const v = Number(t.replace(/[^\d]/g, '')) || 0
  return /^[−-]/.test(t) ? -v : v
}

// Sổ lãi lỗ ở Tổng kết: {rows: [{label, value}], profit}; mọi dòng (đã mang dấu) cộng lại phải bằng lãi.
async function readLedger(page) {
  return page.evaluate(() => {
    const table = document.querySelector('[data-testid="summary"] table.ledger')
    const rows = []
    let profit = null
    for (const tr of table.querySelectorAll('tr')) {
      const [a, b] = tr.querySelectorAll('td')
      if (tr.classList.contains('total')) profit = b.textContent
      else rows.push({ label: a.textContent.trim(), value: b.textContent.trim() })
    }
    return { rows, profit }
  }).then(r => ({ rows: r.rows.map(x => ({ label: x.label, value: money(x.value) })), profit: money(r.profit) }))
}

function rowOf(ledger, label) {
  const r = ledger.rows.find(x => x.label === label)
  assert.ok(r, 'sổ lãi lỗ thiếu dòng ' + label)
  return Math.abs(r.value)
}

async function checkLedger(page, h) {
  const L = await readLedger(page)
  const sum = L.rows.reduce((s, r) => s + r.value, 0)
  assert.equal(sum, L.profit, 'các dòng sổ lãi lỗ cộng lại đúng bằng lãi')
  assert.equal(L.profit, Number(await page.getAttribute(T('summary-profit'), 'data-amount')))
  assert.equal(L.profit, h.profit, 'lãi hiển thị khớp lịch sử')
  assert.equal(rowOf(L, DATA.STRINGS.summary.tips), h.tips)
  assert.equal(rowOf(L, DATA.STRINGS.summary.eventIn), h.eventIn)
  assert.equal(rowOf(L, DATA.STRINGS.summary.eventOut), h.eventOut)
  return L
}

// Luật tip của một phiếu chấm: tip chỉ 0 hoặc 5.000đ; có tip ⇔ 5 sao và hóa đơn ≥ 20.000đ; 5 sao mà hóa đơn dưới mức
// thì phiếu ghi rõ lý do.
function checkTipRule({ stars, tip, tipText, bill, who }) {
  assert.ok(tip === 0 || tip === TIP, `${who}: tip ${tip}`)
  assert.equal(tip, stars === 5 && bill >= MIN_BILL ? TIP : 0, `${who}: ${stars} sao, hóa đơn ${bill}đ, tip ${tip}`)
  if (tip === TIP) assert.equal(tipText, 'Tip: +5.000đ')
  else if (stars === 5) assert.equal(tipText, 'Tip 0 (hóa đơn dưới 20.000đ)')
  else assert.equal(tipText, '', `${who}: dưới 5 sao không có dòng tip`)
}

test('tip: phiếu chấm chỉ 0 hoặc 5.000đ, 5 sao mà hóa đơn dưới 20.000đ ghi "Tip 0 (hóa đơn dưới 20.000đ)"; Hội thi có thưởng', { timeout: 600000 }, async () => {
  const g = await openGame({ clock: true, name: 'tip' })
  const { page, errors } = g
  try {
    const { state, tickets } = tipShiftSave(TIP_SEED)
    assert.equal(state.shift.mods.dayEvent.id, 'hoi_thi_xe_sach')
    const high = tickets.find(t => t.bill >= MIN_BILL)
    const low = tickets.find(t => t.bill > 0 && t.bill < MIN_BILL)
    assert.ok(high && low, 'ca dựng sẵn có phiếu trên và dưới 20.000đ')
    await seedSave(page, state)
    // ca đang dở: mở thẳng màn ca bán (giờ giả vài phút sau lúc mở ca)
    await page.goto(g.url(`/?devNow=${TIP_AT.slice(0, 14)}02`))
    await page.waitForSelector(T('screen-service'))
    await page.tap(T('tab-kitchen'))
    const sheets = []
    for (const tk of [high, low]) {
      const btn = `${T('serve-ticket')}[data-ticket-id="${tk.ticketId}"]`
      await page.waitForSelector(btn)
      await page.click(btn)
      const sheet = await page.waitForSelector(`${T('score-sheet')}[data-customer-id="${tk.customerId}"]`, { timeout: 8000 })
      const stars = Number(await sheet.getAttribute('data-stars'))
      const tipInfo = await readSheetTip(sheet)
      assert.equal(stars, 5, 'món Tuyệt hảo, giao ngay: 5 sao')
      checkTipRule({ stars, ...tipInfo, bill: tk.bill, who: tk.customerId })
      sheets.push({ ...tk, stars, ...tipInfo })
      await page.waitForTimeout(400)
      await g.shot(tk === high ? 'phieu-cham-co-tip' : 'phieu-cham-tip-0')
      await page.waitForSelector(`${T('score-sheet')}[data-customer-id="${tk.customerId}"]`, { state: 'detached', timeout: 8000 })
    }
    assert.equal(sheets[0].tipText, 'Tip: +5.000đ')
    assert.equal(sheets[1].tipText, 'Tip 0 (hóa đơn dưới 20.000đ)')
    const s1 = await waitSave(page, st => st.shift && st.shift.tipJar === TIP)

    // Bán hết ca qua giao diện: mọi phiếu chấm đúng luật tip
    await page.tap(T('tab-counter'))
    const served = await playShiftUi(g, { useClock: true })
    assert.ok(served.length >= 2, 'bán thêm ít nhất 2 khách')
    for (const s of served) checkTipRule({ stars: s.stars, tip: s.tip, tipText: s.tipText, bill: s.total, who: s.name })
    const tips = TIP + served.reduce((a, s) => a + s.tip, 0)
    console.log('Phiếu chấm:', [...sheets.map(s => `${s.customerId} ${s.bill}đ ${s.stars}★ ${s.tipText}`),
      ...served.map(s => `${s.name} ${s.total}đ ${s.stars}★ ${s.tipText || '(không tip)'}`)].join(' | '))

    // Tổng kết
    await page.waitForSelector(T('summary'))
    const s2 = await waitSave(page, st => !st.shift && st.day === s1.day + 1)
    const h = s2.history[s2.history.length - 1]
    assert.equal(h.tips, tips, 'tiền tip = tổng tip trên các phiếu chấm')
    await checkLedger(page, h)
    assert.match(await page.textContent(T('summary-tip-rule')), /Hóa đơn từ 20\.000đ, khách vui \(5 sao\) sẽ bỏ hũ tip 5\.000đ/)
    // Hội thi (sự kiện ngày loại tốt): có giải thì có tiền thưởng, chưa tới 4 sao thì ghi "Chưa có giải"
    const ev = await page.waitForSelector(`${T('summary-event-money')} li[data-event="hoi_thi_xe_sach"]`)
    assert.equal(Number(await ev.getAttribute('data-money')), h.eventIn, 'tiền Hội thi là khoản sự kiện duy nhất của ca')
    assert.equal(h.eventOut, 0)
    if (h.eventIn > 0) assert.match(await ev.textContent(), /Giải (Nhất|Khuyến khích): sao trung bình ca/)
    else assert.match(await ev.textContent(), /Chưa có giải/)
    await page.evaluate(() => document.querySelector('[data-testid="summary"] table.ledger').scrollIntoView({ block: 'start' }))
    await g.shot('tong-ket-hoi-thi')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

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
    assert.ok(rowOf(L, DATA.STRINGS.summary.eventOut) > 0)
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
