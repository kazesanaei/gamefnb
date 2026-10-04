// E2E "Vừa màn" — gói L4, BẾP vừa một màn điện thoại (đặc tả "Vừa màn" mục 3.2, 5.7, 9 "Bếp · …").
// 10 khung (6 khung chính + 4 khung nhỏ; vùng an toàn giả bằng --safe-top / --safe-bottom, khung iOS thêm clip-path: inset(0)
// như iOS cắt vùng cuộn). Ca thật dựng sẵn bằng lõi (cookShiftSave: Bánh tráng trộn Tây Ninh + Trà tắc, 3 phiếu, món đã nấu
// 5 lần) — món nhiều bước nhất (Thớt 8 bước, 7 trạm, 4 nguyên liệu sẵn sàng). Mỗi khung đi một lượt:
//   1. Bếp · dây phiếu: data-cook rỗng; khung chính: cả 3 phiếu thấy không cuộn; khung nhỏ: phiếu đầu thấy.
//   2. Phiếu mở: các nút "Làm món này" (cook-line-*) thấy không cuộn.
//   3. Bước Chọn: data-cook "chon", dải mặt khách ẩn; khung chính: mọi ô kệ (shelf-*), rổ, nút Xong, "‹ Phiếu", thẻ công
//      thức thấy không cuộn, hình món trên kệ ≥ 48px, khung bếp không tràn (kệ không bị thu về sàn); khung nhỏ: nút Xong,
//      một hàng kệ, "‹ Phiếu".
//   4. Thớt sơ chế: data-cook "thot"; khung chính: thớt, MỌI bước (board-step-*), Ra món, Bỏ món thấy không cuộn (bước nằm
//      trên thanh dính), hình nguyên liệu ≥ 48px; khung nhỏ: Ra món + một bước đang làm được; mọi khung: dòng trạng thái của
//      bước làm được không bị cắt "…".
//   5. Sân khấu một bước (Bóc trứng cút — Chà, không có bảng chọn cách): data-cook "stage"; vùng chơi + thanh chân thấy.
// "Thấy không cuộn": không gọi cuộn nào; phần tử đang hiện, hộp nằm trọn trong khung nhìn của .k-main (đã trừ thanh dính
// đáy nếu phần tử không thuộc thanh đó) và trong [0, innerWidth]; nút: elementFromPoint ở tâm trúng chính nút, cạnh ngắn
// ≥ 44px. Không lỗi console / trang. Biến môi trường: VUA_MAN_KHUNG=402x874,360x600 (chỉ chạy các khung này),
// SHOT_DIR=<thư mục> (chụp ảnh từng trạng thái).
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, cookShiftSave, resolveIncidentIfShown, COOK_OPEN_MS } from './helpers.mjs'
import { requiredIngredients } from '../../src/core/scoring.js'
import { DATA } from '../../src/data/index.js'

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
const RUN = ONLY.length ? FRAMES.filter(f => ONLY.includes(f.name)) : FRAMES
const RECIPE = 'banh_trang_tron_tay_ninh'
const STAGE_STEP = 'boc_trung_cut'

const cssOf = f => `:root { --safe-top: ${f.top}px !important; --safe-bottom: ${f.bottom}px !important; }` +
  (f.ios ? '\n.screen, .panel, .k-main { clip-path: inset(0); }' : '')

// Đo trong trang: mỗi bộ chọn → danh sách phần tử, mỗi phần tử: có hiện, nằm trọn khung nhìn của .k-main (trừ thanh dính đáy
// .k-toolbar / .mg-chon .mg-foot nếu phần tử không thuộc thanh), elementFromPoint ở tâm (nút), cạnh ngắn.
function audit(sels) {
  const main = document.querySelector('[data-testid="kitchen"] .k-main')
  const mr = main.getBoundingClientRect()
  const bar = main.querySelector(':scope > .k-toolbar, .mg-chon > .mg-foot')
  const barTop = bar ? bar.getBoundingClientRect().top : Infinity
  const out = { scrollTop: main.scrollTop, client: main.clientHeight, scroll: main.scrollHeight, items: {} }
  for (const sel of sels) {
    out.items[sel] = [...document.querySelectorAll(sel)].map(e => {
      const r = e.getBoundingClientRect()
      const cs = getComputedStyle(e)
      const shown = cs.display !== 'none' && cs.visibility !== 'hidden' && e.getClientRects().length > 0 && r.width > 0 && r.height > 0
      const inBar = bar && bar.contains(e)
      const bottomLimit = inBar ? mr.bottom : Math.min(mr.bottom, barTop)
      const inside = r.top >= mr.top - 0.5 && r.bottom <= bottomLimit + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5
      let hit = true
      if (e.matches('button, [role="button"]') && shown) {
        const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        hit = !!t && (t === e || e.contains(t))
      }
      return { id: e.dataset.testid || e.className, shown, inside, hit, short: Math.min(r.width, r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }
    })
  }
  return out
}

function screenProbe() {
  const s = document.querySelector('[data-testid="screen-service"]')
  const st = s.querySelector(':scope > .street')
  return { tab: s.dataset.tab, cook: s.dataset.cook || '', fit: s.dataset.fit, focus: s.classList.contains('is-focus'), street: !!st && getComputedStyle(st).display !== 'none' }
}

// Kiểm "thấy không cuộn" cho danh sách bộ chọn: mỗi bộ chọn phải có ít nhất một phần tử; all = mọi phần tử (không thì chỉ
// cần một phần tử thấy).
function checkSeen(f, label, a, sel, { all = true, button = false } = {}) {
  const list = a.items[sel]
  assert.ok(list && list.length, `${f.name} ${label}: thiếu ${sel}`)
  const bad = list.filter(x => !x.shown || !x.inside || !x.hit || (button && x.short < 44 - 0.5))
  if (all) assert.equal(bad.length, 0, `${f.name} ${label}: ${sel} khuất / bị che / nhỏ: ${JSON.stringify(bad.slice(0, 4))} (k-main ${a.client}/${a.scroll}, cuộn ${a.scrollTop})`)
  else assert.ok(bad.length < list.length, `${f.name} ${label}: không ${sel} nào thấy: ${JSON.stringify(list.slice(0, 3))}`)
}

const errorsOf = g => g.errors.filter(e => !/favicon|ERR_ABORTED/.test(e))

test.describe('Vừa màn (L4): Bếp vừa một màn ở khung chính, nút chính thấy ở khung nhỏ', { concurrency: 3 }, () => {
  for (const f of RUN) {
    test(`${f.name}: dây phiếu → phiếu mở → Chọn → Thớt → sân khấu`, { timeout: 150000 }, async () => {
      const g = await openGame({ clock: { time: COOK_OPEN_MS }, name: 'vua-man-bep', viewport: { width: f.w, height: f.h }, initCss: cssOf(f) })
      const { page } = g
      try {
        const sv = cookShiftSave({ recipeId: RECIPE, extra: ['tra_tac'] }, null, { tickets: 3, cooks: 5, name: 'Xe Bếp Vừa Màn' })
        await seedSave(page, sv.state)
        await page.goto(g.url('/'))
        await page.waitForSelector(T('screen-service'))
        await resolveIncidentIfShown(g, { waitMs: 300 })
        await page.tap(T('tab-kitchen'))
        await page.waitForSelector('.k-ticket')
        await page.clock.runFor(700)

        // 1. Dây phiếu
        let s = await page.evaluate(screenProbe)
        assert.equal(s.tab, 'kitchen')
        assert.equal(s.cook, '', 'dây phiếu: data-cook rỗng')
        let a = await page.evaluate(audit, ['.k-ticket'])
        assert.equal(a.items['.k-ticket'].length, 3)
        checkSeen(f, 'dây phiếu', a, '.k-ticket', { all: f.main })
        await g.shot('day-phieu')

        // 2. Phiếu mở
        await page.tap(`${T('ticket-' + sv.ticket.id)}`)
        await page.waitForSelector(T('cook-line-0'))
        await page.clock.runFor(300)
        a = await page.evaluate(audit, ['[data-testid^="cook-line-"]'])
        checkSeen(f, 'phiếu mở', a, '[data-testid^="cook-line-"]', { all: f.main, button: true })
        await g.shot('phieu-mo')

        // 3. Chọn
        await page.tap(T('cook-line-0'))
        await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
        await page.clock.runFor(900)
        s = await page.evaluate(screenProbe)
        assert.equal(s.cook, 'chon', 'bước Chọn: data-cook "chon"')
        assert.equal(s.street, false, 'bước Chọn: dải mặt khách ẩn ở mọi khung')
        const chonSels = ['[data-testid^="shelf-"].chon-cell', T('chon-basket'), T('chon-done'), T('kitchen-back'), T('recipe-card')]
        a = await page.evaluate(audit, chonSels)
        checkSeen(f, 'Chọn', a, T('chon-done'), { button: true })
        checkSeen(f, 'Chọn', a, T('kitchen-back'), { button: true })
        checkSeen(f, 'Chọn', a, '[data-testid^="shelf-"].chon-cell', { all: f.main })
        if (f.main) {
          checkSeen(f, 'Chọn', a, T('chon-basket'))
          checkSeen(f, 'Chọn', a, T('recipe-card'))
          assert.ok(a.scroll <= a.client + 1, `${f.name} Chọn: khung bếp tràn ${a.scroll - a.client}px (kệ bị thu nhỏ về sàn)`)
          const ico = await page.$$eval('.chon-icon', els => Math.min(...els.map(e => e.getBoundingClientRect().width)))
          assert.ok(ico >= 48 - 0.5, `${f.name} Chọn: hình kệ ${ico}px < 48`)
        }
        await g.shot('chon')

        // 4. Thớt
        const recipe = DATA.RECIPES[RECIPE]
        for (const id of requiredIngredients(recipe, []).required) await page.tap(T('shelf-' + id))
        await page.tap(T('chon-done'))
        await page.waitForSelector(T('board'))
        await page.clock.runFor(2500)
        s = await page.evaluate(screenProbe)
        assert.equal(s.cook, 'thot', 'Thớt: data-cook "thot"')
        const thotSels = [T('board'), '[data-testid^="board-step-"]', '[data-testid^="board-step-"].is-available', T('finish-dish'), T('abandon-dish')]
        a = await page.evaluate(audit, thotSels)
        assert.ok(a.items['[data-testid^="board-step-"]'].length >= 8, 'Thớt món này có 8 bước')
        checkSeen(f, 'Thớt', a, T('finish-dish'), { button: true })
        checkSeen(f, 'Thớt', a, '[data-testid^="board-step-"].is-available', { all: f.main })
        if (f.main) {
          checkSeen(f, 'Thớt', a, T('board'))
          checkSeen(f, 'Thớt', a, '[data-testid^="board-step-"]')
          checkSeen(f, 'Thớt', a, T('abandon-dish'), { button: true })
          const art = await page.$$eval('.k-ing-art', els => Math.min(...els.map(e => e.getBoundingClientRect().width)))
          assert.ok(art >= 48 - 0.5, `${f.name} Thớt: hình nguyên liệu ${art}px < 48`)
        }
        // dòng trạng thái của bước làm được: không cắt "…" (bản gọn "Chạm" / "Chọn" khi ô chữ hẹp)
        const cut = await page.$$eval('.k-step.is-available .k-step-st', els => els.filter(e => e.scrollWidth > e.clientWidth + 0.5).map(e => e.textContent))
        assert.deepEqual(cut, [], `${f.name} Thớt: trạng thái bước bị cắt`)
        await g.shot('thot')

        // 5. Sân khấu một bước
        await page.tap(T('board-step-' + STAGE_STEP))
        await page.clock.runFor(300)
        if (await page.$(T('step-start'))) { await page.tap(T('step-start')); await page.clock.runFor(300) }
        const hint = await page.$(T('step-hint'))
        if (hint) { await hint.dispatchEvent('pointerdown'); await page.clock.runFor(400) }
        await page.waitForSelector(`${T('minigame-stage')}[data-type="cha"] .mg-foot`)
        await page.clock.runFor(400)
        s = await page.evaluate(screenProbe)
        assert.equal(s.cook, 'stage', 'sân khấu: data-cook "stage"')
        const stage = await page.evaluate(() => {
          const st = document.querySelector('[data-testid="minigame-stage"]')
          const foot = st.querySelector('.mg-foot')
          const area = st.querySelector('[data-testid="cha-area"]')
          const tab = document.querySelector('.tabbar').getBoundingClientRect().top
          const fr = foot.getBoundingClientRect()
          const ar = area ? area.getBoundingClientRect() : null
          return { footTop: fr.top, footBottom: fr.bottom, tab, areaTop: ar && ar.top, areaBottom: ar && ar.bottom }
        })
        assert.ok(stage.footBottom <= stage.tab + 0.5, `${f.name} sân khấu: thanh chân dưới thanh tab`)
        if (f.main) assert.ok(stage.areaBottom !== null && stage.areaBottom <= stage.footTop + 0.5, `${f.name} sân khấu: vùng chà lấn thanh chân`)
        await g.shot('san-khau')
        assert.deepEqual(errorsOf(g), [], 'lỗi trang / console')
      } finally {
        await g.close()
      }
    })
  }
})
