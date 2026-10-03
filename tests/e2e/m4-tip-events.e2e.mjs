// E2E M4 tip mới + sự kiện thưởng tiền (giao diện thật, Chromium 390×844, đồng hồ giả chạy nhanh lúc chờ khách):
//  1. Ca ngày 5 đang dở (tests/helpers/m4-saves.mjs tipShiftSave, seed 1: sự kiện ngày "Hội thi Xe đẩy sạch, ngon"):
//     2 phiếu đã nấu xong chờ giao → phiếu chấm 5 sao hóa đơn 20.000đ ghi "Tip: +5.000đ", 5 sao hóa đơn 10.000đ ghi
//     "Tip 0 (hóa đơn dưới 20.000đ)"; bán hết ca qua giao diện: mọi phiếu chấm tip chỉ 0 hoặc 5.000đ, đúng luật; Tổng
//     kết: dòng Tiền tip, dòng tiền Hội thi, sổ lãi lỗ cộng lại đúng bằng lãi và khớp lịch sử.
//  2. (Ca thứ hai của tệp này — "Đoàn kiểm tra vệ sinh" tái phạm bị phạt + tình huống M4 mới — đã tách sang
//     tests/e2e/m4-tip-events-attp.e2e.mjs từ bản 0.5.1: cả tệp chạy ~585 giây, sát mốc 10 phút mỗi lệnh e2e.)
// Seed tìm bằng `node tools/tim-seed.mjs tip`. Sổ lãi lỗ đọc bằng readLedger / checkLedger của helpers.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, waitSave, seedSave, playShiftUi, readSheetTip, checkLedger } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { tipShiftSave, TIP_AT } from '../helpers/m4-saves.mjs'

const TIP_SEED = 1
const MIN_BILL = DATA.BALANCE.tipMinBill
const TIP = DATA.BALANCE.tipFiveStar

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
