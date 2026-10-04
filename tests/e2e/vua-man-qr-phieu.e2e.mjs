// E2E "Vừa màn" — gói L3: PHIẾU THU (tiền mặt, sau chuyển khoản) vừa một màn điện thoại (đặc tả "Vừa màn" mục 5.4, 5.5, 9).
// Ca bản quầy ngày 5 dựng sẵn bằng lõi (counterShiftSave), đơn 3 DÒNG có ghi chú với tên món dài nhất ("2 × Bánh tráng trộn
// Tây Ninh" cay nhiều + thêm trứng cút + không rau răm, "Trà tắc mật ong rừng" không đá, "Cà phê muối" ít ngọt + ít đá) —
// tờ phiếu cao nhất thường gặp (bộ đo m5-vua-man chỉ có đơn 2 dòng). Ba ca:
//   · tiền mặt (10 khung): Order → Thanh toán → Tính tiền → Phiếu thu;
//   · chuyển khoản (4 khung): chờ tiền về → tiền đã về (ô báo tiền + 2 nút thấy, chạm trúng) → Phiếu thu;
//   · báo thiếu 5.000đ rồi thu tiền mặt (3 khung chính thấp): phiếu thêm hàng "Thu thiếu" (có khi thêm hàng làm tròn khi két
//     hết tiền lẻ) — phiếu tự gọn theo nấc (data-tight) để vẫn trọn trên hàng nút.
// Ở Phiếu thu, mọi khung: nút "Kẹp phiếu bếp" thấy trọn trên thanh tab, elementFromPoint ở tâm trúng nút, cao ≥ 44px; chữ trên
// phiếu ≥ 13px; trang không tràn ngang; đầu phiếu đọc "Phiếu thu #00n". Khung chính thêm: khay (.stage) KHÔNG cuộn, tờ phiếu
// (cả hàng "Cảm ơn quý khách!" + con dấu) nằm trọn trong khay, trên hàng nút dính đáy; con dấu không đè số tiền nào.
// Không gọi cuộn nào trước khi đo. Không lỗi console / trang. Biến môi trường: VUA_MAN_KHUNG=402x680,360x780 (chỉ chạy các
// khung này), SHOT_DIR=<thư mục> (chụp ảnh từng trạng thái).
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, counterShiftSave, lineTotal, giveChangeUi, COOK_OPEN_MS } from './helpers.mjs'

const FRAMES = [
  { name: '402x874', w: 402, h: 874, top: 62, bottom: 34, ios: true, main: true },
  { name: '402x680', w: 402, h: 680, top: 0, bottom: 0, ios: true, main: true },
  { name: '402x760', w: 402, h: 760, top: 0, bottom: 0, ios: true, main: true },
  { name: '390x844', w: 390, h: 844, top: 47, bottom: 34, ios: true, main: true },
  { name: '360x780', w: 360, h: 780, top: 0, bottom: 0, ios: false, main: true },
  { name: '412x915', w: 412, h: 915, top: 0, bottom: 0, ios: false, main: true },
  { name: '375x667', w: 375, h: 667, top: 0, bottom: 0, ios: true, main: false },
  { name: '360x600', w: 360, h: 600, top: 0, bottom: 0, ios: false, main: false },
  { name: '375x553', w: 375, h: 553, top: 47, bottom: 34, ios: true, main: false },
  { name: '320x568', w: 320, h: 568, top: 0, bottom: 0, ios: true, main: false }
]
const ONLY = (process.env.VUA_MAN_KHUNG || '').split(',').map(s => s.trim()).filter(Boolean)

const REQ3 = [
  { recipeId: 'banh_trang_tron_tay_ninh', qty: 2, notes: ['cay_nhieu', 'them_trung_cut', 'khong_rau_ram'] },
  { recipeId: 'tra_tac_mat_ong', qty: 1, notes: ['khong_da'] },
  { recipeId: 'ca_phe_muoi', qty: 1, notes: ['it_ngot', 'it_da'] }
]
const CASES = [
  { id: 'tien-mat', ten: 'tiền mặt, đơn 3 dòng', pay: 'cash', frames: FRAMES.map(f => f.name) },
  { id: 'chuyen-khoan', ten: 'chuyển khoản, đơn 3 dòng', pay: 'qr', frames: ['402x680', '360x780', '390x844', '375x553'] },
  { id: 'thu-thieu', ten: 'báo thiếu 5.000đ, đơn 3 dòng', pay: 'cash', under: 5000, frames: ['402x680', '402x760', '360x780'] }
]

const cssOf = f => `:root { --safe-top: ${f.top}px !important; --safe-bottom: ${f.bottom}px !important; }` +
  (f.ios ? '\n.screen, .panel, .k-main { clip-path: inset(0); }' : '')

// Đo trong trang (không cuộn): khay, tờ phiếu, hàng nút, nút kẹp, thanh tab, chữ nhỏ, con dấu so với số tiền.
function auditReceipt(safeBottom) {
  const paper = document.querySelector('[data-testid="receipt"]')
  const tray = paper.closest('.stage')
  const bar = tray.querySelector('.rc-act')
  const clip = document.querySelector('[data-testid="clip-ticket"]')
  const tab = document.querySelector('.tabbar')
  const R = e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height } }
  const cr = R(clip)
  const hitAt = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === clip || clip.contains(t)) }
  const small = [...paper.querySelectorAll('*')].filter(e => {
    if (!e.getClientRects().length || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return false
    return parseFloat(getComputedStyle(e).fontSize) < 13 - 0.01
  }).map(e => `${e.className}: ${getComputedStyle(e).fontSize}`)
  const stamp = paper.querySelector('.rc-stamp')
  const sr = stamp ? R(stamp) : null
  const amounts = [...paper.querySelectorAll('.rc-row .rc-v, .rc-amt')].filter(e => e.getClientRects().length).map(R)
  const stampOver = sr ? amounts.filter(a => a.bottom > sr.top + 0.5 && a.top < sr.bottom - 0.5 && a.right > sr.left + 0.5 && a.left < sr.right - 0.5).length : 0
  return {
    fit: document.querySelector('[data-testid="screen-service"]').dataset.fit,
    tight: paper.dataset.tight || '',
    tray: { ...R(tray), client: tray.clientHeight, scroll: tray.scrollHeight, scrollTop: tray.scrollTop },
    paper: R(paper),
    barTop: R(bar).top,
    clip: cr,
    clipHit: hitAt(cr.left + cr.width / 2, cr.top + cr.height / 2) && hitAt(cr.left + 8, cr.top + cr.height / 2) && hitAt(cr.right - 8, cr.top + cr.height / 2),
    tabTop: tab ? R(tab).top : innerHeight,
    viewBottom: innerHeight - safeBottom,
    innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    head: (paper.querySelector('.receipt-head span') || {}).textContent || '',
    adjust: !!paper.querySelector('[data-testid="receipt-adjust"]'),
    small,
    stampOver
  }
}

const errorsOf = g => g.errors.filter(e => !/favicon|ERR_ABORTED/.test(e))

async function writeOrder(page, request) {
  for (const line of request) {
    await page.click(T('menu-item-' + line.recipeId))
    await page.waitForSelector(T('order-sheet'))
    for (const n of line.notes || []) await page.click(T('note-chip-' + n))
    for (let q = 1; q < line.qty; q++) await page.click(T('qty-plus'))
    await page.click(T('add-line'))
    await page.waitForSelector(T('order-sheet'), { state: 'detached' })
  }
  await page.click(T('readback'))
  await page.waitForSelector(`${T('confirm-order')}:not([disabled])`)
  await page.click(T('confirm-order'))
}

test.describe('Vừa màn (L3): phiếu thu đơn 3 dòng trọn một màn ở khung chính, nút Kẹp phiếu bếp thấy ở mọi khung', { concurrency: 3 }, () => {
  for (const c of CASES) {
    for (const f of FRAMES.filter(x => c.frames.includes(x.name) && (!ONLY.length || ONLY.includes(x.name)))) {
      test(`${f.name} ${f.main ? '(khung chính)' : '(khung nhỏ)'} · ${c.ten}`, { timeout: 120000 }, async () => {
        const g = await openGame({ clock: { time: COOK_OPEN_MS }, name: 'vua-man-' + c.id, viewport: { width: f.w, height: f.h }, initCss: cssOf(f) })
        const { page } = g
        try {
          const sv = counterShiftSave({ pay: c.pay, request: REQ3, delayOthers: 240, name: 'Xe Vừa Màn' })
          await seedSave(page, sv.state)
          await page.goto(g.url('/'))
          await page.waitForSelector(T('speech-bubble'), { timeout: 20000 })
          const request = JSON.parse(await page.getAttribute(T('speech-bubble'), 'data-request'))
          assert.equal(request.length, 3, 'khách gọi đơn 3 dòng')
          await writeOrder(page, request)

          // Thanh toán: gõ tổng (ca báo thiếu: tổng − 5.000đ), báo tổng
          await page.waitForSelector(T('report-total'))
          await page.waitForTimeout(900)
          const amount = lineTotal(request) - (c.under || 0)
          for (const d of String(amount / 1000)) await page.click(T('numpad-' + d))
          await page.click(T('report-total'))
          await page.waitForSelector(`${T('given-cash')}, ${T('qr-status')}`, { timeout: 10000 })

          if (c.pay === 'qr') {
            // tiền đã về: ô báo tiền + "Từ chối ảnh giả" + "Đã nhận đủ" thấy, chạm trúng (không cuộn)
            await page.waitForSelector(`${T('qr-status')}[data-arrived="true"]`, { timeout: 10000 })
            await page.waitForTimeout(700)
            const qr = await page.evaluate(sb => ['qr-status', 'qr-confirm', 'qr-reject'].map(id => {
              const e = document.querySelector(`[data-testid="${id}"]`)
              const r = e.getBoundingClientRect()
              const tab = document.querySelector('.tabbar').getBoundingClientRect().top
              const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
              return { id, ok: r.top >= 0 && r.bottom <= Math.min(tab, innerHeight - sb) + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5, hit: !!t && (t === e || e.contains(t)) }
            }), f.bottom)
            const bad = qr.filter(x => !x.ok || (x.id !== 'qr-status' && !x.hit))
            assert.deepEqual(bad, [], `${f.name}: khâu chuyển khoản có phần khuất / bị che`)
            await g.shot('tien-ve')
            await page.click(T('qr-confirm'))
          } else {
            await giveChangeUi(g, amount)
          }

          // Phiếu thu: chờ in xong (phiếu trượt + con dấu), không cuộn gì
          await page.waitForSelector(T('receipt'), { timeout: 10000 })
          await page.waitForSelector(`${T('clip-ticket')}:not([disabled])`, { timeout: 10000 })
          await page.waitForTimeout(1300)
          const a = await page.evaluate(auditReceipt, f.bottom)
          await g.shot('phieu-thu')
          const where = `${f.name} ${c.id} (bậc ${a.fit}, gọn ${a.tight || '0'}; khay ${a.tray.client}/${a.tray.scroll})`
          if (process.env.VUA_MAN_LOG) console.log(`# ${where}: phiếu y ${Math.round(a.paper.top)}–${Math.round(a.paper.bottom)}, hàng nút ${Math.round(a.barTop)}`)

          assert.match(a.head, /^Phiếu thu #\d{3}$/, `${where}: đầu phiếu`)
          if (c.under) assert.ok(a.adjust, `${where}: phiếu báo thiếu phải có hàng "Thu thiếu"`)
          assert.ok(a.clip.top >= -0.5 && a.clip.bottom <= Math.min(a.tabTop, a.viewBottom) + 0.5, `${where}: nút Kẹp phiếu bếp khuất (y ${Math.round(a.clip.top)}–${Math.round(a.clip.bottom)}, thanh tab ${Math.round(a.tabTop)})`)
          assert.ok(a.clipHit, `${where}: nút Kẹp phiếu bếp bị che`)
          assert.ok(a.clip.height >= 44 - 0.5, `${where}: nút Kẹp phiếu bếp cao ${a.clip.height}px < 44`)
          assert.deepEqual(a.small, [], `${where}: chữ trên phiếu < 13px`)
          assert.ok(a.pageWidth <= a.innerWidth + 1, `${where}: trang tràn ngang ${a.pageWidth}px`)
          if (f.main) {
            assert.ok(a.tray.scroll <= a.tray.client + 1, `${where}: khay phải cuộn ${a.tray.scroll - a.tray.client}px`)
            assert.ok(a.paper.top >= a.tray.top - 0.5 && a.paper.bottom <= a.barTop + 0.5, `${where}: phiếu khuất (y ${Math.round(a.paper.top)}–${Math.round(a.paper.bottom)}; khay từ ${Math.round(a.tray.top)}, hàng nút ${Math.round(a.barTop)})`)
            assert.ok(a.paper.left >= -0.5 && a.paper.right <= a.innerWidth + 0.5, `${where}: phiếu tràn ngang`)
            assert.equal(a.stampOver, 0, `${where}: con dấu đè số tiền`)
          }

          // Kẹp phiếu: phiếu lên dây bếp
          await page.click(T('clip-ticket'))
          await page.waitForSelector('[data-testid^="rail-ticket-"]', { timeout: 10000 })
          await page.waitForTimeout(800)
          await g.shot('sau-kep')
          assert.deepEqual(errorsOf(g), [], 'lỗi trang / console')
        } finally {
          await g.close()
        }
      })
    }
  }
})
