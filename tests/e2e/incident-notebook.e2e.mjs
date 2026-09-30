// E2E M3 nội dung (giao diện thật, Chromium, đồng hồ giả chạy nhanh lúc chờ khách):
//  1. Tình huống giữa hai khách: save ngày 5 dựng sẵn (seed 6, tần suất Nhiều + bảo hiểm đủ 3 ca → chắc chắn có
//     tình huống "Khách quen xin ghi nợ" sau khách thứ nhất). Không hiện khi khách đang ở quầy; hiện ngay khi kẹp phiếu,
//     quầy trống, thời gian ca (kiên nhẫn) đứng yên; mỗi lựa chọn ghi rõ cái giá, có 1 cách an toàn; chọn "Cho nợ"
//     → ví trừ giá vốn, sổ ghi nợ; chơi hết ca → Tổng kết ghi nhận; hôm sau màn Chuẩn bị hiện sổ ghi nợ.
//     Sau đó: Sổ tay nghề (4 nhóm, thẻ chưa mở có gợi ý, nhận thưởng đủ nhóm 1 lần) và Sổ công thức (số liệu món,
//     chi tiết không lộ bẫy, Sổ từ vùng miền).
//  2. Màn hẹp 360×740: lưới lối vào 7 ô + "Mở hàng" luôn thấy, Sổ tay nghề, Sổ công thức, hộp "Khách mở hàng bằng tờ
//     500.000đ" (hiện trước khách đầu tiên): không tràn ngang, vùng chạm ≥ 44px, chữ ≥ 14px.
//  3. "Khách đổi ý sau khi đã thanh toán" (seed 25) → "Đổi món": dây phiếu chung + thẻ phiếu trong Bếp vẽ lại theo món mới,
//     tiền chênh vào sổ, yêu cầu thật đổi theo, nấu món mới → khách hài lòng.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, readSave, waitSave, seedSave, enterPrep, waitCustomerOrEnd, serveAtCounter, cookAndServe, playShiftUi } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'

// Save đã bán 4 ca (ngày 1–4, mỗi ca một ngày thật từ 26/09) → đang ở ngày game 5.
// Tần suất "Nhiều" + bảo hiểm (3 ca liền chưa gặp tình huống) → ca ngày 5 chắc chắn có tình huống, bốc theo seed.
function builtSave(seed) {
  const ctx = makeMetaCtx({ at: '2026-09-26T08:00', attach: true })
  const state = defaultState(seed, DATA)
  ctx.setState(state)
  state.shopName = 'Xe Tình Huống'
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  for (let i = 0; i < 4; i++) {
    playShift(state, ctx)
    ctx.clock.t += 24 * 3600 * 1000
  }
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  state.settings.incidentFrequency = 'nhieu'
  state.incidents.since = 3
  state.checkin.lastDay = '2026-12-31'     // không bật bảng điểm danh trong test này
  return state
}

// Soát bố cục màn hiện tại (như m2-ui.e2e.mjs): tràn ngang, chữ < 14px, nút/ô chạm < 44px (chỉ phần tử đang hiện).
// scope (tùy chọn): chỉ soát chữ/nút bên trong phần tử này (vd hộp thoại nằm trên màn ca bán M1).
async function layoutIssues(page, scope = null) {
  return page.evaluate(scope => {
    const rootEl = scope ? document.querySelector(scope) : document.body
    const out = []
    const s = document.getElementById('screen')
    const ov = Math.max(document.documentElement.scrollWidth - window.innerWidth, s ? s.scrollWidth - s.clientWidth : 0)
    if (ov > 0) out.push('tràn ngang ' + ov + 'px')
    const vis = el => {
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false
      const b = el.getBoundingClientRect()
      return b.width > 0 && b.height > 0
    }
    const name = el => (el.dataset && el.dataset.testid) || String(el.className || el.tagName).split(' ')[0]
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT)
    const seen = new Set()
    while (walker.nextNode()) {
      const t = walker.currentNode
      const el = t.parentElement
      if (!t.textContent.trim() || !el || el.closest('svg') || seen.has(el)) continue
      seen.add(el)
      if (!vis(el)) continue
      const fs = parseFloat(getComputedStyle(el).fontSize)
      if (fs < 14) out.push(`chữ ${fs}px ở ${name(el)}: "${t.textContent.trim().slice(0, 30)}"`)
    }
    for (const el of rootEl.querySelectorAll('button, a, input, select, [role=button], summary')) {
      if (!vis(el) || el.type === 'checkbox') continue
      const b = el.getBoundingClientRect()
      if (b.height < 43.5 || b.width < 43.5) out.push(`vùng chạm ${Math.round(b.width)}×${Math.round(b.height)} ở ${name(el)}`)
    }
    return out
  }, scope)
}

const NAV = ['open-shop', 'open-quests', 'open-checkin', 'open-mail', 'open-recipe-book', 'open-notebook', 'open-settings']

// "Mở hàng" nằm trọn trong khung nhìn (dính đáy màn Chuẩn bị) dù đang cuộn ở đâu.
async function openShiftVisible(page) {
  return page.evaluate(() => {
    const b = document.querySelector('[data-testid="open-shift"]').getBoundingClientRect()
    return b.top >= 0 && b.bottom <= window.innerHeight + 0.5 && b.height >= 44
  })
}

test('tình huống giữa hai khách → chọn "Cho nợ" → Tổng kết ghi nhận; Sổ tay nghề và Sổ công thức', { timeout: 600000 }, async () => {
  const g = await openGame({ clock: true, name: 'tinh-huong' })
  const { page, errors } = g
  try {
    const built = builtSave(6)
    // đã mở đủ 2 thẻ nhóm "Phục vụ, Quản lý" → nhóm đó chờ nhận thưởng
    for (const t of DATA.TIPS.filter(x => x.group === 'phuc_vu')) if (!built.tipsSeen.includes(t.id)) built.tipsSeen.push(t.id)
    await seedSave(page, built)
    await enterPrep(g, '?devNow=2026-09-30T09:00')

    // ---- Màn Chuẩn bị gọn: 7 ô lối vào có chấm đỏ, "Mở hàng" luôn thấy ----
    for (const id of NAV) {
      const el = await page.waitForSelector(T(id))
      assert.ok(await el.isVisible(), id)
      assert.ok(await el.getAttribute('data-dot') !== null, id + ' có data-dot')
    }
    assert.equal(await page.getAttribute(T('open-notebook'), 'data-dot'), '1', 'nhóm Mẹo nghề đủ thẻ → chấm đỏ')
    assert.ok(await openShiftVisible(page))
    await page.evaluate(() => { document.getElementById('screen').scrollTop = 99999 })
    assert.ok(await openShiftVisible(page), '"Mở hàng" vẫn thấy khi cuộn xuống cuối')
    await g.shot('chuan-bi')
    await page.evaluate(() => { document.getElementById('screen').scrollTop = 0 })

    // ---- Mở ca: kế hoạch tình huống (tất định theo seed) ----
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    const s0 = await waitSave(page, st => !!st.shift)
    assert.equal(s0.shift.day, 5)
    assert.equal(s0.shift.incident.id, 'ghi_no')
    assert.equal(s0.shift.incident.afterClips, 1, 'xuất hiện sau khách thứ nhất')
    assert.equal(await waitCustomerOrEnd(g, { useClock: true }), 'customer')
    // khách đang ở quầy: chưa có tình huống
    assert.equal(!!(await page.$(T('incident-modal'))), false, 'không chen vào khi khách đang ở quầy')
    const first = await serveAtCounter(g)

    // ---- Kẹp phiếu xong → tình huống hiện giữa hai khách ----
    await page.waitForSelector(T('incident-modal'))
    assert.equal(await page.getAttribute(`${T('incident-modal')} .incident`, 'data-incident'), 'ghi_no')
    assert.equal(await page.getAttribute(T('counter-panel'), 'data-stage'), '', 'quầy trống: khách kế chưa bước lên')
    assert.match(await page.textContent(T('incident-text')), /quên ví, xin ghi sổ nợ/)
    const choices = await page.$$('[data-testid^="incident-choice-"]')
    assert.equal(choices.length, 3)
    const safe = await page.$$(`${T('incident-modal')} [data-safe="true"]`)
    assert.equal(safe.length, 1, 'đúng 1 cách an toàn')
    assert.equal(await safe[0].getAttribute('data-choice'), 'tu_choi')
    for (const c of choices) assert.ok((await c.textContent()).length > 20, 'mỗi lựa chọn ghi rõ cái giá')
    assert.match(await page.textContent(T('incident-choice-cho_no')), /6\.000đ giá vốn/)
    assert.match(await page.textContent(T('incident-choice-tang')), /\+5 danh tiếng/)
    // thời gian ca (và kiên nhẫn khách) đứng yên khi hộp thoại mở
    const t1 = await page.getAttribute(T('screen-service'), 'data-t')
    await page.clock.runFor(3000)
    await page.waitForTimeout(400)
    assert.equal(await page.getAttribute(T('screen-service'), 'data-t'), t1, 'thời gian ca phải tạm dừng')
    await g.shot('tinh-huong-ghi-no')
    const w0 = (await readSave(page)).wallet
    await page.tap(T('incident-choice-cho_no'))
    await page.waitForSelector(T('incident-result'))
    assert.match(await page.textContent(T('incident-effects')), /Sổ ghi nợ: (Cô Thu|Bạn Nam) 20\.000đ/)
    await g.shot('tinh-huong-ket-qua')
    await page.tap(T('incident-ok'))
    await page.waitForSelector(T('incident-modal'), { state: 'detached' })
    const s1 = await waitSave(page, st => st.shift && st.shift.incident && st.shift.incident.status === 'xong')
    assert.equal(s1.shift.incident.choice, 'cho_no')
    assert.equal(s1.wallet, w0 - 6000, 'giá vốn 2 ly trà trừ vào Tiền quán')
    assert.equal(s1.incidents.debts.length, 1)
    assert.equal(s1.incidents.debts[0].amount, 20000)
    // thời gian ca chạy lại
    await page.clock.runFor(2000)
    await page.waitForFunction(t => document.querySelector('[data-testid="screen-service"]').dataset.t !== t, t1)

    // ---- Bán hết ca → Tổng kết ghi nhận ----
    await cookAndServe(g, first.ticketId, { shots: false })
    await page.click(T('tab-counter'))
    await playShiftUi(g, { useClock: true })
    await page.waitForSelector(T('summary-incident'))
    assert.equal(await page.getAttribute(T('summary-incident'), 'data-incident'), 'ghi_no')
    assert.equal(await page.getAttribute(T('summary-incident'), 'data-choice'), 'cho_no')
    const sumText = await page.textContent(T('summary-incident'))
    assert.match(sumText, /Khách quen xin ghi nợ 20\.000đ/)
    assert.match(sumText, /Cho nợ, ghi vào sổ/)
    assert.match(sumText, /Ghi sổ nợ: (Cô Thu|Bạn Nam) 20\.000đ/)
    assert.match(sumText, /Danh tiếng: \+2/)
    const s2 = await waitSave(page, st => !st.shift)
    assert.deepEqual(s2.history[s2.history.length - 1].incidents, [{ id: 'ghi_no', choice: 'cho_no' }])
    assert.equal(s2.incidents.since, 0)
    await page.evaluate(() => document.querySelector('[data-testid="summary-incident"]').scrollIntoView({ block: 'center' }))
    await g.shot('tong-ket-tinh-huong')
    await page.tap(T('next-day'))
    await page.waitForSelector(T('screen-prep'))
    assert.match(await page.textContent(T('prep-debts')), /Sổ ghi nợ: (Cô Thu|Bạn Nam) 20\.000đ/)

    // ---- Sổ tay nghề ----
    await page.tap(T('open-notebook'))
    await page.waitForSelector(T('screen-notebook'))
    const s3 = await readSave(page)
    const seen = s3.tipsSeen.filter(id => DATA.TIPS.some(t => t.id === id)).length
    assert.equal(await page.getAttribute(T('notebook-progress'), 'data-total'), '20')
    assert.equal(await page.getAttribute(T('notebook-progress'), 'data-unlocked'), String(seen))
    for (const gid of Object.keys(DATA.TIP_GROUPS)) assert.ok(await page.$(T('notebook-tab-' + gid)), gid)
    // mở sẵn nhóm có thưởng chờ nhận
    await page.waitForSelector(T('notebook-group-phuc_vu'))
    await g.shot('so-tay-nghe')
    const gold0 = s3.goldSpoons
    await page.tap(T('notebook-claim-phuc_vu'))
    await page.waitForSelector(T('notebook-claimed-phuc_vu'))
    const s4 = await waitSave(page, st => st.notebook.claimed.includes('phuc_vu'))
    assert.equal(s4.goldSpoons, gold0 + 20)
    assert.ok(s4.titles.includes('chu_quan_tu_te'))
    assert.equal(await page.getAttribute(T('notebook-tab-phuc_vu'), 'data-dot'), '0', 'nhận xong hết chấm đỏ')
    // nhóm còn thẻ khóa: bóng mờ + gợi ý cách mở
    const lockedGroup = DATA.TIPS.find(t => !s4.tipsSeen.includes(t.id)).group
    await page.tap(T('notebook-tab-' + lockedGroup))
    const locked = await page.waitForSelector(`${T('notebook-group-' + lockedGroup)} [data-unlocked="false"]`)
    assert.match(await locked.textContent(), /Cách mở: /)
    await g.shot('so-tay-nghe-khoa')
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('screen-prep'))

    // ---- Sổ công thức ----
    await page.tap(T('open-recipe-book'))
    await page.waitForSelector(T('screen-recipe-book'))
    const bm = s4.recipes.banh_mi_op_la
    assert.equal(await page.getAttribute(T('book-recipe-banh_mi_op_la'), 'data-status'), 'owned')
    assert.equal(await page.getAttribute(T('book-recipe-banh_mi_op_la'), 'data-cooks'), String(bm.cooks))
    assert.equal(await page.getAttribute(T('book-recipe-banh_mi_op_la'), 'data-best'), String(bm.best))
    assert.equal(await page.getAttribute(T('book-recipe-banh_mi_op_la'), 'data-flawless'), String(bm.flawless > 0))
    assert.match(await page.textContent(T('book-recipe-banh_mi_op_la')), /Có sẵn/)
    assert.match(await page.textContent(T('book-recipe-che_buoi')), /Tri ân 20\/11 · 2026/)
    assert.equal(await page.getAttribute(T('book-recipe-goi_cuon'), 'data-status'), 'teaser')
    await g.shot('so-cong-thuc')
    await page.tap(T('book-open-banh_mi_op_la'))
    await page.waitForSelector(T('recipe-detail'))
    for (const i of DATA.RECIPES.banh_mi_op_la.ingredients) assert.ok(await page.$(T('recipe-detail-ing-' + i.id)), i.id)
    for (const d of DATA.RECIPES.banh_mi_op_la.decoys) assert.equal(!!(await page.$(T('recipe-detail-ing-' + d))), false, 'lộ bẫy ' + d)
    assert.ok(await page.$(T('recipe-detail-step-chien_trung')))
    await g.shot('so-cong-thuc-chi-tiet')
    await page.tap(T('recipe-detail-close'))
    await page.waitForSelector(T('recipe-detail'), { state: 'detached' })
    await page.tap(T('recipe-book-tab-tu'))
    await page.waitForSelector(T('dialect-list'))
    assert.match(await page.textContent(T('dialect-tra_tac')), /trà tắc[\s\S]*trà quất/)
    assert.match(await page.textContent(T('dialect-ca_phe_sua_da')), /nâu đá/)
    await g.shot('so-tu-vung-mien')
    // Back của điện thoại về màn Chuẩn bị
    await page.goBack()
    await page.waitForSelector(T('screen-prep'))
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('màn hẹp 360×740: lưới lối vào, Sổ tay nghề, Sổ công thức, hộp "Khách mở hàng" không tràn, chạm ≥ 44px, chữ ≥ 14px', { timeout: 300000 }, async () => {
  const g = await openGame({ clock: true, name: 'm3-hep', viewport: { width: 360, height: 740 } })
  const { page, errors } = g
  const problems = []
  const check = async (label, scope = null) => {
    await page.waitForTimeout(200)
    for (const p of await layoutIssues(page, scope)) problems.push(`${label}: ${p}`)
  }
  try {
    // seed 3: ca ngày 5 bốc "Khách mở hàng bằng tờ 500.000đ" (hiện trước khách đầu tiên)
    await seedSave(page, builtSave(3))
    await enterPrep(g, '?devNow=2026-09-30T09:00')
    await page.waitForTimeout(2500)   // chờ thông báo thư tắt
    await check('Chuẩn bị')
    assert.ok(await openShiftVisible(page))
    // 7 ô lối vào nằm gọn trong bề ngang, 4 ô một hàng
    const tops = await page.$$eval('.icon-grid .icon-tile', els => els.map(e => Math.round(e.getBoundingClientRect().top)))
    assert.equal(tops.length, 7)
    assert.equal(new Set(tops.slice(0, 4)).size, 1, '4 ô đầu cùng một hàng')
    await page.tap(T('open-notebook'))
    await page.waitForSelector(T('screen-notebook'))
    await check('Sổ tay nghề')
    await page.tap(T('meta-back'))
    await page.tap(T('open-recipe-book'))
    await page.waitForSelector(T('screen-recipe-book'))
    await check('Sổ công thức')
    await page.tap(T('book-open-tra_tac'))
    await page.waitForSelector(T('recipe-detail'))
    await check('Chi tiết món')
    await page.tap(T('recipe-detail-close'))
    await page.waitForSelector(T('recipe-detail'), { state: 'detached' })
    await page.tap(T('recipe-book-tab-tu'))
    await check('Sổ từ vùng miền')
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('screen-prep'))

    // Khách mở hàng: hiện ngay khi mở ca, trước khách đầu tiên
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('incident-modal'))
    assert.equal(await page.getAttribute(`${T('incident-modal')} .incident`, 'data-incident'), 'khach_mo_hang')
    assert.match(await page.textContent(T('incident-text')), /500\.000đ/)
    // két đầu ca 200.000đ không đủ thối → nút khóa, ghi lý do; ngày 5 đã có QR
    assert.equal(await page.isDisabled(T('incident-choice-thoi_het')), true)
    assert.match(await page.textContent(T('incident-choice-thoi_het')), /không đủ thối 490\.000đ/)
    assert.equal(await page.isDisabled(T('incident-choice-moi_qr')), false)
    assert.equal(await page.getAttribute(T('incident-choice-tang'), 'data-safe'), 'true')
    // (màn ca bán phía sau là giao diện M1: chỉ soát hộp thoại)
    await check('Hộp khách mở hàng', '[data-testid="incident-modal"]')
    await g.shot('khach-mo-hang')
    const w0 = (await readSave(page)).wallet
    await page.tap(T('incident-choice-moi_qr'))
    await page.waitForSelector(T('incident-result'))
    assert.match(await page.textContent(T('incident-effects')), /\+10\.000đ tiền bán/)
    await check('Kết quả tình huống', '[data-testid="incident-modal"]')
    await page.tap(T('incident-ok'))
    await page.waitForSelector(T('incident-modal'), { state: 'detached' })
    const s = await waitSave(page, st => st.shift && st.shift.incident.status === 'xong')
    assert.equal(s.shift.ledger.qr, 10000)
    assert.equal(s.wallet, w0 - 3000, 'giá vốn ly trà trừ vào Tiền quán')
    assert.ok(s.tipsSeen.includes('du_tien_le') || s.shift.tipsShown >= 1)
    // khách đầu tiên tới quầy bình thường sau tình huống
    assert.equal(await waitCustomerOrEnd(g, { useClock: true }), 'customer')
    assert.deepEqual(problems, [], 'lỗi bố cục:\n' + problems.join('\n'))
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('khách đổi ý sau khi thanh toán → đổi món: phiếu trên dây và trong Bếp đổi theo, tiền chênh vào sổ, khách nhận đúng món mới', { timeout: 300000 }, async () => {
  const g = await openGame({ clock: true, name: 'doi-y' })
  const { page, errors } = g
  const R = DATA.RECIPES
  try {
    // seed 25: ca ngày 5 bốc "Khách đổi ý sau khi đã thanh toán" ngay sau khách thứ nhất
    await seedSave(page, builtSave(25))
    await enterPrep(g, '?devNow=2026-09-30T09:00')
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    const s0 = await waitSave(page, st => !!st.shift)
    assert.equal(s0.shift.incident.id, 'doi_y')
    assert.equal(s0.shift.incident.afterClips, 1)
    assert.equal(await waitCustomerOrEnd(g, { useClock: true }), 'customer')
    const first = await serveAtCounter(g)

    await page.waitForSelector(T('incident-modal'))
    assert.equal(await page.getAttribute(`${T('incident-modal')} .incident`, 'data-incident'), 'doi_y')
    const s1 = await waitSave(page, st => st.shift && st.shift.incident && !!st.shift.incident.detail)
    const det = s1.shift.incident.detail
    assert.equal(det.ticketId, first.ticketId, 'đổi món của phiếu vừa kẹp')
    const onlyLine = s1.shift.tickets.find(t => t.id === first.ticketId).lines.length === 1
    const railText = () => page.textContent(T('rail-ticket-' + first.ticketId))
    assert.match(await railText(), new RegExp(R[det.fromId].name))
    assert.equal(await page.getAttribute(T('incident-choice-doi_mon'), 'data-safe'), 'true')
    await page.tap(T('incident-choice-doi_mon'))
    await page.waitForSelector(T('incident-result'))
    await page.tap(T('incident-ok'))
    await page.waitForSelector(T('incident-modal'), { state: 'detached' })

    // dây phiếu chung vẽ lại theo món mới (trước đây vẫn hiện món cũ tới khi phiếu đổi trạng thái)
    await page.waitForFunction(([sel, name]) => document.querySelector(sel).textContent.includes(name),
      [T('rail-ticket-' + first.ticketId), R[det.toId].name], { timeout: 3000 })
    if (onlyLine) assert.doesNotMatch(await railText(), new RegExp(R[det.fromId].name))
    const s2 = await waitSave(page, st => st.shift.incident.status === 'xong')
    const tk = s2.shift.tickets.find(t => t.id === first.ticketId)
    assert.equal(tk.lines[det.lineIndex].recipeId, det.toId)
    const cust = s2.shift.customers[tk.customerId]
    assert.ok(cust.request.some(l => l.recipeId === det.toId), 'yêu cầu thật của khách đổi theo')
    if (det.diff > 0) assert.equal(s2.shift.ledger.sales, s1.shift.ledger.sales + det.diff, 'thu thêm tiền chênh')
    else if (det.diff < 0) assert.equal(s2.shift.ledger.refunds, s1.shift.ledger.refunds - det.diff, 'hoàn tiền chênh')

    // Bếp: phiếu hiện món mới; nấu đúng món mới → khách hài lòng
    await page.tap(T('tab-kitchen'))
    await page.waitForSelector(T('ticket-' + first.ticketId))
    assert.match(await page.textContent(T('ticket-' + first.ticketId)), new RegExp(R[det.toId].name))
    const res = await cookAndServe(g, first.ticketId, { shots: false })
    assert.ok(res.stars >= 4, `khách đổi ý chấm ${res.stars} sao`)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
