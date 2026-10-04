// E2E M5 Đợt 1 (bản 0.5.0) — Bếp mới và 5 thao tác mới (đập trứng, khuấy, gọt, lắc, bày) trên giao diện thật, ca thật
// (HUD, dải phố, thanh 4 khâu, dây phiếu, thanh tab ở đáy). Save dựng bằng lõi (cookShiftSave của helpers.mjs: 4 ca người
// chơi hoàn hảo, mở ca ngày 5, phiếu đã kẹp, nấu sẵn tới bước cần thử); trang mở bằng đồng hồ giả của Playwright đặt đúng
// giờ ca (không dùng ?devNow nên không có dải "Giờ giả", bố cục như máy thật). Nhóm e2e: G2.
//  (a) Mỗi thao tác mới × 4 khung {360×600 có 3 phiếu trên dây, 320×568, 375×553 có vùng an toàn 47/34 (mô phỏng iPhone,
//      vùng cuộn bị cắt như iOS), 390×844} (+ các lớp vỏ còn lại ở 375×553, + 2 phần ở 390×844): mọi đích thao tác nằm trong
//      khung nhìn, phía trên thanh chân .mg-foot của sân khấu và thanh tab, elementFromPoint tại đích trúng đúng vùng nhận
//      chạm; chế độ tập trung bật đúng khi khung thấp hơn 760px; giải bằng cảm ứng thật qua CDP (touchStart/Move/End, đồng hồ
//      trang đứng yên trong lúc vuốt và chạy đều từng nấc nên điểm không phụ thuộc tốc độ máy chạy test) → ≥ 90 điểm; con
//      dấu kết quả đóng trong 1,2 giây (giờ của trang); lớp hiệu ứng không nhận chạm, ≤ 30 nút, có hạt.
//  (b) Thẻ vào bước đầy đủ (món chưa nấu lần nào) ở 360×600: có ruy băng "Bước k/N" đúng số, tay mẫu đúng cử chỉ của loại
//      bước, nút "Chạm để bắt đầu"; đồng hồ trang đứng yên (thẻ không thể tự chạy) mà chạm thẻ ở góc dưới-phải là vào sân
//      khấu ngay; chỗ vừa chạm giờ là thanh chân (gọt/bày: nút Xong) — cú click của lần chạm đó không rơi xuống sân khấu,
//      bước chưa bị chốt; chơi tiếp đạt ≥ 90.
//  (c) Giảm chuyển động (reducedMotion: 'reduce' của trình duyệt), 5 thao tác ở 375×553: không có hoạt ảnh vô hạn nào đang
//      chạy trên sân khấu, lớp hiệu ứng không có hạt nào suốt bước (kể cả con dấu), con dấu đóng trong 1,2 giây, vẫn ≥ 90.
//  (d) Ra món: chữ % đếm từ 0 lên đúng Q (data-q) rồi bảng tự đóng trong 3 giây (giảm chuyển động: hiện thẳng Q, đóng trong
//      khoảng REVEAL_MS_REDUCED); dòng kết quả món trên dây phiếu đúng Q; giao món được.
//  (e) Chế độ tập trung: ở 360×600 bật khi đang nấu (Thớt, sân khấu), tắt khi về dây phiếu hoặc sang tab Quầy, bật lại khi
//      quay về; ở 390×844 không bao giờ bật.
//  (f) Hồi quy vòng sửa F: người chơi cũ (món đã nấu 5 lần, bản lưu kiểu 0.4.x) chưa xem hướng dẫn của loại thao tác mới
//      vẫn thấy thẻ đầy đủ (tay mẫu) lần đầu gặp loại đó — có tour bep_<loại> khi hướng dẫn tự hiện được (?tour=1); xem xong
//      (hoặc không tự hiện được) thì ghi đã xem, làm lại bước chỉ còn ruy băng gọn.
//  (g) Hồi quy vòng sửa F: chế độ tập trung giữ tới khi màn ra món đóng — thông báo bị hoãn không thả ra đè ruy băng tên món.
//  (h) Hồi quy vòng sửa F: bước Chọn ở khung thấp (375×553 vùng an toàn, 320×568, món hiếm Tây Ninh thẻ dài) — vừa mở đã
//      thấy và bấm được ít nhất một hàng kệ (không phải tự vuốt tìm).
//  (i) Hồi quy vòng sửa G (G1, G2, G6): món nhiều bước nhất (Bánh tráng trộn Tây Ninh 9 bước, Cà phê muối 8 bước) ở 320×568
//      và 360×600 — hàng chấm bước (.g-dots) không lấn viên đồng hồ [mg-time], chấm hiện tại thấy trọn, chạm vào biểu
//      tượng đồng hồ và vạch giờ trúng chính viên đồng hồ, viên đồng hồ không tràn khỏi màn.
//  (j) Hồi quy vòng sửa G (G3): màn ra món của món hiếm tên dài ở 320×568 và 375×553 vùng an toàn — huy hiệu "★ Hiếm"
//      (.g-reveal-rare) nằm trọn trong bảng ra món và khung nhìn, bấm trúng chính nó, không đè chữ tên; tên không bị cắt "…".
//  (k) Hồi quy vòng sửa G (G5): thẻ vào bước ở khung thấp 375×553 vùng an toàn, bước Thả đá — câu hướng dẫn đang hiện
//      (.g-step-card-hint) không bị cắt, ký tự cuối "…bấm Xong." nằm trong khung câu.
//  (l) Hồi quy D1/E3: Thả đá — thả ở tâm vùng thả thì vùng thả báo data-tier="tam" và bước được 100 điểm; thả ở vành ngoài
//      (0,85 bán kính) thì data-tier="mep" và 55 điểm — khớp bayTier / bayPlaceScore.
//  (m) Hồi quy D1/E3: Khuấy — xoay-progress[data-v] làm tròn XUỐNG: vẽ 2,997 vòng (chưa nhấc tay) ghi "2.99" chứ không
//      "3.00", giữ tay thêm 400 ms (giờ trang) trò vẫn chưa xong; vẽ tiếp đủ vòng thì xong ≥ 90.
//  (n) Hồi quy vòng sửa F (F1): người chơi cũ — món đã nấu đúng HINT_HIDE_AFTER_COOKS lần (mốc ẩn thẻ) — lần đầu gặp loại
//      thao tác mới chưa xem hướng dẫn (khuấy, gọt, bày) vẫn thấy thẻ đầy đủ (tay mẫu step-card-demo, nút "Chạm để bắt
//      đầu"); chạm thì vào trò và ghi đã xem hướng dẫn của loại đó.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, seedSave, waitSave, resolveIncidentIfShown, cookShiftSave, COOK_OPEN_MS } from './helpers.mjs'
import { markSeen } from '../../src/core/tour.js'
import { bayPlaceScore } from '../../src/core/minigame-scoring.js'
import { DATA } from '../../src/data/index.js'
import { GESTURE_BY_TYPE, stepProgress } from '../../src/ui/components/step-card.js'
import { REVEAL_MS, REVEAL_MS_REDUCED } from '../../src/ui/components/dish-reveal.js'
import { bayTier } from '../../src/ui/minigames/bay.js'
import { FOCUS_MAX_H } from '../../src/ui/screens/service.js'
import { HINT_HIDE_AFTER_COOKS, stepCardFull } from '../../src/ui/screens/kitchen.js'

// Mô phỏng iPhone có tai thỏ và thanh Home (vùng an toàn 47/34), iOS cắt phần tử nằm ngoài vùng cuộn.
const SAFE_CSS = `:root { --safe-top: 47px !important; --safe-bottom: 34px !important; }
.screen, .panel, .k-main { clip-path: inset(0); }`

const FRAMES = {
  '360x600': { vp: { width: 360, height: 600 }, tickets: 3 },
  '320x568': { vp: { width: 320, height: 568 }, tickets: 1 },
  '375x553': { vp: { width: 375, height: 553 }, tickets: 1, safe: true },
  '390x844': { vp: { width: 390, height: 844 }, tickets: 1 }
}

// Mỗi thao tác × 4 khung (đổi món / lớp vỏ giữa các khung), cộng các lớp vỏ còn lại ở khung chật nhất (375×553 vùng an toàn)
// và 2 phần (tham số nhân đôi theo số phần) ở 390×844.
const CASES = [
  { type: 'dap', frame: '360x600', line: { recipeId: 'banh_mi_op_la', notes: ['them_trung'] }, stepId: 'dap_trung' },
  { type: 'dap', frame: '320x568', line: { recipeId: 'banh_mi_trung_ga_ta' }, stepId: 'dap_trung' },
  { type: 'dap', frame: '375x553', line: { recipeId: 'banh_mi_op_la' }, stepId: 'dap_trung' },
  { type: 'dap', frame: '390x844', line: { recipeId: 'banh_mi_op_la', qty: 2 }, stepId: 'dap_trung' },
  { type: 'xoay', frame: '360x600', line: { recipeId: 'banh_trang_tron_tay_ninh' }, stepId: 'tron' },
  { type: 'xoay', frame: '320x568', line: { recipeId: 'ca_phe_sua_da' }, stepId: 'khuay' },
  { type: 'xoay', frame: '375x553', line: { recipeId: 'banh_trang_tron' }, stepId: 'tron' },
  { type: 'xoay', frame: '375x553', line: { recipeId: 'ca_phe_sua_da' }, stepId: 'khuay' },
  { type: 'xoay', frame: '375x553', line: { recipeId: 'ca_phe_muoi' }, stepId: 'danh_sua_muoi' },
  { type: 'xoay', frame: '390x844', line: { recipeId: 'ca_phe_muoi' }, stepId: 'danh_sua_muoi' },
  { type: 'got', frame: '360x600', line: { recipeId: 'banh_trang_tron_tay_ninh' }, stepId: 'got_xoai' },
  { type: 'got', frame: '320x568', line: { recipeId: 'che_buoi' }, stepId: 'got_vo' },
  { type: 'got', frame: '375x553', line: { recipeId: 'banh_trang_tron' }, stepId: 'got_xoai' },
  { type: 'got', frame: '375x553', line: { recipeId: 'che_buoi' }, stepId: 'got_vo' },
  { type: 'got', frame: '390x844', line: { recipeId: 'che_buoi' }, stepId: 'got_vo' },
  { type: 'lac', frame: '360x600', line: { recipeId: 'tra_tac_mat_ong', notes: ['khong_da'] }, stepId: 'lac' },
  { type: 'lac', frame: '320x568', line: { recipeId: 'che_buoi' }, stepId: 'ao_bot' },
  { type: 'lac', frame: '375x553', line: { recipeId: 'tra_tac' }, stepId: 'lac' },
  { type: 'lac', frame: '375x553', line: { recipeId: 'che_buoi' }, stepId: 'ao_bot' },
  { type: 'lac', frame: '390x844', line: { recipeId: 'tra_tac', qty: 2 }, stepId: 'lac' },
  { type: 'bay', frame: '360x600', line: { recipeId: 'ca_phe_muoi' }, stepId: 'them_da' },
  { type: 'bay', frame: '320x568', line: { recipeId: 'ca_phe_sua_da' }, stepId: 'them_da' },
  { type: 'bay', frame: '375x553', line: { recipeId: 'ca_phe_sua_da', notes: ['it_da'] }, stepId: 'them_da' },
  { type: 'bay', frame: '390x844', line: { recipeId: 'ca_phe_muoi' }, stepId: 'them_da' }
]

// Một ca tiêu biểu cho mỗi thao tác (thẻ vào bước, giảm chuyển động).
const ONE = {
  dap: { line: { recipeId: 'banh_mi_op_la' }, stepId: 'dap_trung' },
  xoay: { line: { recipeId: 'ca_phe_sua_da' }, stepId: 'khuay' },
  got: { line: { recipeId: 'banh_trang_tron' }, stepId: 'got_xoai' },
  lac: { line: { recipeId: 'che_buoi' }, stepId: 'ao_bot' },
  bay: { line: { recipeId: 'ca_phe_sua_da' }, stepId: 'them_da' }
}

const S = type => `${T('minigame-stage')}[data-type="${type}"]`
const lineLabel = l => l.recipeId + (l.qty > 1 ? ` ×${l.qty}` : '') + (l.notes && l.notes.length ? ` (${l.notes.join(',')})` : '')

function openFrame(frame, name, extra = {}) {
  const f = FRAMES[frame]
  return openGame({
    clock: { time: COOK_OPEN_MS }, name, viewport: f.vp,
    initCss: f.safe ? SAFE_CSS : '', ...extra
  })
}

// Mở trang với save dựng sẵn, sang tab Bếp (phiên nấu đang ở Thớt sơ chế).
async function openCook(g, state) {
  const { page } = g
  await seedSave(page, state)
  await page.goto(g.url('/'))
  await page.waitForSelector(T('screen-service'))
  await resolveIncidentIfShown(g, { waitMs: 300 })
  await page.tap(T('tab-kitchen'))
  await page.waitForSelector(T('board'))
}

// Đầu dò trong trang (gắn trước khi chơi):
//  - vfx: số hạt lớn nhất trên canvas của lớp hiệu ứng (data-n), số nút lớn nhất trong lớp, pointer-events của lớp;
//  - con dấu: giờ trang (performance.now, theo đồng hồ giả) lúc step-result hiện trong lớp sân khấu và lúc lớp đóng;
//  - click: mọi cú click lọt tới tài liệu (đích có data-testid gần nhất, có nằm trong sân khấu không).
async function installProbes(page) {
  await page.evaluate(() => {
    const P = window.__m5 = { maxN: 0, maxDom: 0, pe: [], stampAt: null, stampOff: null, clicks: [] }
    const layer = document.querySelector('[data-testid="kitchen"] .k-layer')
    const scan = () => {
      for (const v of document.querySelectorAll('.vfx-layer')) {
        P.maxDom = Math.max(P.maxDom, v.childElementCount)
        const pe = getComputedStyle(v).pointerEvents
        if (!P.pe.includes(pe)) P.pe.push(pe)
        for (const c of v.querySelectorAll('canvas')) P.maxN = Math.max(P.maxN, Number(c.getAttribute('data-n')) || 0)
      }
      if (layer) {
        if (P.stampAt === null && layer.querySelector('[data-testid="step-result"]')) P.stampAt = performance.now()
        if (P.stampAt !== null && P.stampOff === null && layer.hidden) P.stampOff = performance.now()
      }
    }
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-n', 'hidden'] })
    document.addEventListener('click', e => {
      const t = e.target && e.target.closest ? e.target : null
      const id = t && t.closest('[data-testid]')
      P.clicks.push({ id: id ? id.dataset.testid : '', inStage: !!(t && t.closest('[data-testid="minigame-stage"]')) })
    }, true)
    scan()
  })
}
const probes = page => page.evaluate(() => window.__m5)

// Mở một bước trên Thớt: chạm bước (bảng chọn trước bước nếu có → "Tự tay làm").
async function tapBoardStep(page, stepId) {
  await page.tap(T('board-step-' + stepId))
  const sheet = await page.waitForSelector(T('step-sheet'), { timeout: 500 }).catch(() => null)
  if (sheet) await page.tap(T('step-start'))
}

// Đo sân khấu: khung nhìn, thanh chân, thanh tab, chế độ tập trung, các đích của thao tác (khung bao + elementFromPoint tại
// các điểm bộ giải sẽ chạm, phải trúng vùng nhận chạm).
function measureStage(type) {
  const st = document.querySelector(`[data-testid="minigame-stage"][data-type="${type}"]`)
  const R = el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width, h: r.height } }
  const hitIn = (x, y, box) => { const at = document.elementFromPoint(x, y); return !!(at && box && (at === box || box.contains(at))) }
  const q = id => st.querySelector(`[data-testid="${id}"]`)
  const mid = r => [[r.left + r.w / 2, r.top + r.h / 2]]
  const targets = []
  const add = (id, el, kind, pts, box = null) => {
    if (!el) { targets.push({ id, missing: true }); return }
    const r = R(el)
    targets.push({ id, kind, ...r, hits: pts ? pts(r).map(([x, y]) => hitIn(x, y, box || el)) : [] })
  }
  if (type === 'dap') {
    add('dap-egg', q('dap-egg'), 'scene', mid)
    add('dap-meter', q('dap-meter'), 'scene', null)
  } else if (type === 'xoay') {
    // vẽ vòng bán kính 0,32 cạnh quanh tâm tô: tâm và 4 điểm trên vòng đều phải trúng cảnh khuấy
    add('xoay-bowl', q('xoay-bowl'), 'scene', r => {
      const cx = r.left + r.w / 2, cy = r.top + r.h / 2, k = r.w * 0.32
      return [[cx, cy], [cx + k, cy], [cx - k, cy], [cx, cy + k], [cx, cy - k]]
    }, st.querySelector('.xoay-scene'))
  } else if (type === 'got') {
    const scene = st.querySelector('.got-scene')
    for (const b of st.querySelectorAll('[data-testid^="got-band-"]')) {
      add(b.dataset.testid, b, 'scene', r => [[r.left + r.w / 2, r.top + 2], [r.left + r.w / 2, r.top + r.h / 2], [r.left + r.w / 2, r.bottom - 2]], scene)
    }
    add('got-done', q('got-done'), 'foot', mid)
  } else if (type === 'lac') {
    add('lac-shaker', q('lac-shaker'), 'scene', mid)
  } else if (type === 'bay') {
    // bay-target là vùng thả (pointer-events: none): chỉ đo khung, không đo elementFromPoint
    for (const it of st.querySelectorAll('[data-testid^="bay-item-"]')) add(it.dataset.testid, it, 'scene', mid)
    add('bay-target', q('bay-target'), 'scene', null)
    add('bay-done', q('bay-done'), 'foot', mid)
  }
  const svc = document.querySelector('[data-testid="screen-service"]')
  return {
    vw: innerWidth, vh: innerHeight, stage: R(st), foot: R(st.querySelector('.mg-foot')), tab: R(document.querySelector('.tabbar')),
    focus: !!(svc && svc.classList.contains('is-focus')), docSW: document.documentElement.scrollWidth, targets
  }
}

function assertStage(m, label) {
  const e = 0.5
  assert.ok(m.foot.bottom <= m.tab.top + e, `${label}: thanh chân sân khấu nằm trên thanh tab (${m.foot.bottom} > ${m.tab.top})`)
  assert.ok(m.docSW <= m.vw + 1, `${label}: trang không tràn ngang (${m.docSW})`)
  for (const t of m.targets) {
    assert.ok(!t.missing, `${label}: thiếu ${t.id}`)
    const at = `${label}: ${t.id} (${t.left.toFixed(1)},${t.top.toFixed(1)})–(${t.right.toFixed(1)},${t.bottom.toFixed(1)})`
    assert.ok(t.left >= -e && t.right <= m.vw + e && t.top >= -e && t.bottom <= m.vh + e, `${at} nằm trong khung nhìn`)
    assert.ok(t.top >= m.stage.top - e, `${at} không lấn lên trên sân khấu (sân khấu từ ${m.stage.top})`)
    if (t.kind === 'scene') assert.ok(t.bottom <= m.foot.top + e, `${at} nằm trên thanh chân (thanh chân từ ${m.foot.top})`)
    else assert.ok(t.bottom <= m.tab.top + e, `${at} nằm trên thanh tab`)
    assert.ok(t.hits.every(Boolean), `${at}: elementFromPoint trúng đích (${JSON.stringify(t.hits)})`)
  }
}

// ---------- Cảm ứng thật qua CDP, đồng hồ trang đứng yên ----------

const touch = (cdp, type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] })

// Đóng băng đồng hồ trang: từ đây giờ của trang (setTimeout, requestAnimationFrame, performance.now) chỉ chạy khi gọi runFor.
async function freeze(page) {
  // hẹn dừng sau 300 ms: giữa lúc đọc giờ trang và lúc gọi pauseAt, máy chạy nặng có thể trôi quá vài chục ms
  // → pauseAt báo "không thể tua về quá khứ" (cùng cách sửa ở fix-leftovers/iphone-overlays trước đây)
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 300)
}

// Một nét vuốt: touchStart ở điểm đầu, touchMove qua từng điểm — giữa hai điểm giờ trang chạy đúng stepMs (runFor) và chờ
// ~1 khung hình thật để Chromium không gộp mất pointermove. stop() (tùy chọn, kiểm sau mỗi `every` điểm) → nhấc tay sớm.
async function stroke(page, cdp, pts, { stepMs = 16, realMs = 12, stop = null, every = 6 } = {}) {
  await touch(cdp, 'touchStart', pts[0])
  for (let i = 1; i < pts.length; i++) {
    await page.clock.runFor(stepMs)
    await page.waitForTimeout(realMs)
    await touch(cdp, 'touchMove', pts[i])
    if (stop && i % every === 0 && await stop()) break
  }
  await page.clock.runFor(stepMs)
  await touch(cdp, 'touchEnd', null)
}

// Cho giờ trang chạy từng nấc tới khi fn(arg) trong trang đúng.
async function until(page, fn, arg, { stepMs = 20, max = 200, label = 'điều kiện' } = {}) {
  for (let k = 0; k < max; k++) {
    if (await page.evaluate(fn, arg)) return
    await page.clock.runFor(stepMs)
  }
  throw new Error('hết giờ chờ (đồng hồ trang): ' + label)
}

const centerOf = (page, sel) => page.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } })
const attrN = async (page, sel, a) => Number(await page.getAttribute(sel, a))

// Giải từng thao tác bằng cảm ứng (đồng hồ trang đã đóng băng). Đủ lượt thì trò tự xong (bày: chạm Xong).
async function solveTouch(page, cdp, type) {
  const st = S(type)
  if (type === 'dap') {
    const n = await attrN(page, `${st} ${T('dap-count')}`, 'data-n')
    const mid = ((await attrN(page, `${st} ${T('dap-meter')}`, 'data-a')) + (await attrN(page, `${st} ${T('dap-meter')}`, 'data-b'))) / 2
    for (let i = 0; i < n; i++) {
      await until(page, ([s, k]) => { const e = document.querySelector(s); return !!e && e.dataset.state === 'nguyen' && e.dataset.i === String(k) }, [`${st} ${T('dap-egg')}`, i], { label: 'quả trứng ' + i })
      // kim chạy 1,8 đơn vị/giây (mỗi khung 16 ms ≈ 0,03): chờ kim vào ±0,02 quanh giữa vùng xanh
      await until(page, ([s, m]) => Math.abs(Number(document.querySelector(s).dataset.v) - m) <= 0.02, [`${st} ${T('dap-needle')}`, mid], { stepMs: 8, max: 400, label: 'kim lực' })
      const c = await centerOf(page, `${st} ${T('dap-egg')}`)
      const pts = [c]
      for (let k = 1; k <= 6; k++) pts.push({ x: c.x, y: c.y + k * 11 })
      await stroke(page, cdp, pts)
      await page.clock.runFor(40)
    }
  } else if (type === 'xoay') {
    const c = await centerOf(page, `${st} ${T('xoay-bowl')}`)
    const n = await attrN(page, `${st} ${T('xoay-progress')}`, 'data-n')
    const R = c.w * 0.32
    const pts = []
    for (let k = 0; k <= Math.round((n + 0.4) * 24); k++) {
      const a = (k / 24) * Math.PI * 2
      pts.push({ x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a) })
    }
    // 28 ms giờ trang mỗi điểm, 24 điểm/vòng ≈ 1,5 vòng/giây: dưới ngưỡng sánh (2,2 vòng/giây), 3 vòng xong trong ~2 giây.
    // Vẽ trọn n + 0,4 vòng, không nhấc tay sớm theo data-v (số vòng làm tròn 2 chữ số: 2,996 hiện "3.00" mà trò chưa xong).
    await stroke(page, cdp, pts, { stepMs: 28 })
  } else if (type === 'got') {
    const K = await attrN(page, `${st} ${T('got-count')}`, 'data-n')
    for (let i = 0; i < K; i++) {
      const b = await page.$eval(`${st} ${T('got-band-' + i)}`, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, top: r.top, bottom: r.bottom } })
      const pts = []
      for (let k = 0; k <= 8; k++) pts.push({ x: b.x, y: b.top + 2 + ((b.bottom - b.top - 4) * k) / 8 })
      await stroke(page, cdp, pts, { stepMs: 14 })
      await page.clock.runFor(60)
    }
  } else if (type === 'lac') {
    const c = await centerOf(page, `${st} ${T('lac-shaker')}`)
    const n = await attrN(page, `${st} ${T('lac-count')}`, 'data-n')
    const vh = await page.evaluate(() => innerHeight)
    const amp = Math.max(32, Math.min(70, vh - c.y - 6, c.y - 6))
    const pts = [{ x: c.x, y: c.y }]
    for (let k = 0; k <= n + 1; k++) {
      const to = k % 2 ? -amp : amp
      for (let i = 1; i <= 4; i++) pts.push({ x: c.x, y: c.y + (to * i) / 4 })
      for (let i = 3; i >= 0; i--) pts.push({ x: c.x, y: c.y + (to * i) / 4 })
    }
    await stroke(page, cdp, pts, { stepMs: 20, every: 4, stop: async () => (await attrN(page, `${st} ${T('lac-count')}`, 'data-v').catch(() => n)) >= n })
  } else if (type === 'bay') {
    const n = await attrN(page, `${st} ${T('bay-count')}`, 'data-n')
    for (let i = 0; i < n; i++) {
      const from = await centerOf(page, `${st} ${T('bay-item-' + i)}`)
      const tgt = await centerOf(page, `${st} ${T('bay-target')}`)
      const to = { x: tgt.x + (i % 2 ? 6 : -6), y: tgt.y }
      const pts = []
      for (let k = 0; k <= 8; k++) pts.push({ x: from.x + ((to.x - from.x) * k) / 8, y: from.y + ((to.y - from.y) * k) / 8 })
      await stroke(page, cdp, pts)
      await page.clock.runFor(300)
      assert.equal(await page.getAttribute(`${st} ${T('bay-item-' + i)}`, 'data-placed'), '1', `viên ${i} đã thả vào ly`)
    }
    const d = await centerOf(page, `${st} ${T('bay-done')}:not([disabled])`)
    await page.touchscreen.tap(d.x, d.y)
  }
  // trò tự xong sau một nhịp ngắn (220–420 ms giờ trang)
  await page.clock.runFor(600)
}

// Chờ kết quả bước trong save; trả { score, ... }.
async function stepResult(page, stepId) {
  const s = await waitSave(page, st => st.shift && st.shift.cook && st.shift.cook.steps && st.shift.cook.steps[stepId], 8000)
  return s.shift.cook.steps[stepId]
}

// ---------- (a) 5 thao tác × 4 khung ----------

for (const c of CASES) {
  const f = FRAMES[c.frame]
  const label = `${c.frame}${f.safe ? ' vùng an toàn' : ''}${f.tickets > 1 ? ` ${f.tickets} phiếu` : ''} ${lineLabel(c.line)}.${c.stepId}`
  test(`(a) ${c.type} ${label}: đích trong khung, trên thanh chân và thanh tab, bấm trúng; cảm ứng → ≥ 90; con dấu ≤ 1,2 s`, { timeout: 180000 }, async () => {
    const g = await openFrame(c.frame, `m5-${c.type}-${c.frame}-${c.line.recipeId}-${c.stepId}`)
    const { page, errors } = g
    try {
      const { state } = cookShiftSave(c.line, c.stepId, { tickets: f.tickets, cooks: 5 })
      await openCook(g, state)
      await installProbes(page)
      await tapBoardStep(page, c.stepId)
      await page.waitForSelector(`${S(c.type)} .mg-foot`)
      // để trò dựng xong và tự cuộn cảnh lên trên thanh chân (requestAnimationFrame) rồi mới đo
      await page.waitForTimeout(350)
      const m = await page.evaluate(measureStage, c.type)
      await g.shot(c.type)
      assert.equal(m.focus, f.vp.height < FOCUS_MAX_H, `${label}: chế độ tập trung ${m.focus ? 'bật' : 'tắt'} sai (khung cao ${f.vp.height}px)`)
      assertStage(m, label)
      const cdp = await page.context().newCDPSession(page)
      await freeze(page)
      await solveTouch(page, cdp, c.type)
      await page.clock.resume()
      const r = await stepResult(page, c.stepId)
      assert.ok(r.score >= 90, `${label}: giải bằng cảm ứng chỉ được ${r.score} điểm`)
      await page.waitForSelector(`${T('board-step-' + c.stepId)}.is-done`, { timeout: 5000 })
      const p = await probes(page)
      assert.ok(p.stampAt !== null && p.stampOff !== null, `${label}: không thấy con dấu kết quả trên sân khấu`)
      assert.ok(p.stampOff - p.stampAt <= 1200, `${label}: con dấu hiện ${Math.round(p.stampOff - p.stampAt)} ms (> 1,2 giây)`)
      assert.ok(p.maxN > 0, `${label}: lớp hiệu ứng không có hạt nào (đầu dò hỏng?)`)
      assert.ok(p.maxDom <= 30, `${label}: lớp hiệu ứng có ${p.maxDom} nút (> 30)`)
      assert.deepEqual(p.pe, ['none'], `${label}: lớp hiệu ứng phải có pointer-events: none`)
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (b) Thẻ vào bước đầy đủ ----------

for (const [type, c] of Object.entries(ONE)) {
  test(`(b) thẻ vào bước ${type} 360×600 (3 phiếu, món chưa nấu lần nào): "Bước k/N", tay mẫu, chạm là vào sân khấu, chạm không xuyên xuống nút Xong`, { timeout: 180000 }, async () => {
    const g = await openFrame('360x600', `m5-the-buoc-${type}`)
    const { page, errors } = g
    try {
      const { state } = cookShiftSave(c.line, c.stepId, { tickets: 3, cooks: 0 })
      const want = stepProgress(state.shift.cook, c.stepId)
      await openCook(g, state)
      await installProbes(page)
      await tapBoardStep(page, c.stepId)
      await page.waitForSelector(T('step-hint'))
      // đồng hồ trang đứng yên: thẻ không thể tự chạy (1,1 giây) — có sân khấu là nhờ lần chạm
      await freeze(page)
      await page.waitForTimeout(250)
      const card = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="step-hint"]')
        const wrap = el.closest('.k-stage-wrap')
        const R = e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, w: r.width, h: r.height } }
        const demo = el.querySelector('[data-testid="step-card-demo"]')
        const hand = demo && demo.querySelector('.g-demo-hand')
        const go = el.querySelector('[data-testid="step-card-go"]')
        const gr = go && go.getBoundingClientRect()
        const at = gr && document.elementFromPoint(gr.left + gr.width / 2, gr.top + gr.height / 2)
        const p = { x: R(wrap).right - 44, y: R(wrap).bottom - 30 }
        const under = document.elementFromPoint(p.x, p.y)
        return {
          text: el.textContent, ribbon: (el.querySelector('.g-step-card-ribbon') || {}).textContent || '',
          gesture: demo ? demo.dataset.gesture : null, hand: hand ? R(hand) : null, goText: go ? go.textContent : '',
          goHit: !!(at && go.contains(at)), goH: gr ? gr.height : 0, card: R(el), wrap: R(wrap), p, pOnCard: !!(under && el.contains(under)),
          vw: innerWidth, vh: innerHeight
        }
      })
      await g.shot('the-buoc-' + type)
      assert.ok(card.text.includes('Bước'), 'thẻ có chữ "Bước"')
      assert.equal(card.ribbon.trim(), `Bước ${want.index}/${want.total}`, 'ruy băng "Bước k/N" đúng số bước')
      assert.equal(card.gesture, GESTURE_BY_TYPE[type], 'tay mẫu diễn đúng cử chỉ của loại bước')
      assert.ok(card.hand && card.hand.w > 10 && card.hand.h > 10, 'có bàn tay mẫu')
      assert.equal(card.goText.trim(), 'Chạm để bắt đầu')
      assert.ok(card.goHit && card.goH >= 44 - 0.5, 'nút "Chạm để bắt đầu" bấm được, cao ≥ 44px')
      assert.ok(card.card.top >= -0.5 && card.card.bottom <= card.vh + 0.5 && card.card.right <= card.vw + 0.5, 'thẻ nằm trong khung nhìn')
      assert.ok(card.pOnCard, 'thẻ phủ khung sân khấu (góc dưới-phải thuộc thẻ)')
      // chạm thẻ ở góc dưới-phải — đúng chỗ thanh chân (nút Xong) của trò sắp hiện
      await page.touchscreen.tap(card.p.x, card.p.y)
      await page.waitForSelector(`${S(type)} .mg-foot`, { timeout: 3000 })
      await page.clock.runFor(300)
      await page.waitForTimeout(150)
      const after = await page.evaluate(([t, p]) => {
        const st = document.querySelector(`[data-testid="minigame-stage"][data-type="${t}"]`)
        const foot = st.querySelector('.mg-foot').getBoundingClientRect()
        const under = document.elementFromPoint(p.x, p.y)
        const done = st.querySelector('[data-testid$="-done"]')
        return {
          inFoot: p.y >= foot.top - 0.5 && p.y <= foot.bottom + 0.5, underId: under && under.closest('[data-testid]') ? under.closest('[data-testid]').dataset.testid : '',
          done: done ? { id: done.dataset.testid, disabled: done.disabled } : null, card: !!document.querySelector('[data-testid="step-hint"]')
        }
      }, [type, card.p])
      assert.ok(after.inFoot, `chỗ vừa chạm thẻ giờ là thanh chân của trò (dưới ngón: ${after.underId})`)
      if (after.done) {
        assert.equal(after.underId, after.done.id, 'nút Xong nằm ngay dưới chỗ vừa chạm thẻ')
        assert.equal(after.done.disabled, true, 'nút Xong vẫn chờ (chưa bị bấm)')
      }
      assert.equal(after.card, false, 'thẻ đã nhường chỗ cho trò')
      const p0 = await probes(page)
      assert.deepEqual(p0.clicks.filter(k => k.inStage), [], 'cú click của lần chạm thẻ không rơi xuống sân khấu')
      const mid = await waitSave(page, s => s.shift && s.shift.cook && s.shift.cook.activeStepId === c.stepId)
      assert.equal(mid.shift.cook.steps[c.stepId], undefined, 'bước chưa bị chốt')
      // chơi tiếp bằng cảm ứng
      const cdp = await page.context().newCDPSession(page)
      await solveTouch(page, cdp, type)
      await page.clock.resume()
      const r = await stepResult(page, c.stepId)
      assert.ok(r.score >= 90, `${type}: ${r.score} điểm`)
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (c) Giảm chuyển động ----------

for (const [type, c] of Object.entries(ONE)) {
  test(`(c) giảm chuyển động ${type} 375×553 vùng an toàn: không hoạt ảnh vô hạn, lớp hiệu ứng không có hạt, con dấu ≤ 1,2 s, vẫn ≥ 90`, { timeout: 180000 }, async () => {
    const g = await openFrame('375x553', `m5-giam-${type}`, { contextOptions: { reducedMotion: 'reduce' } })
    const { page, errors } = g
    try {
      const { state } = cookShiftSave(c.line, c.stepId, { tickets: 1, cooks: 5 })
      await openCook(g, state)
      await installProbes(page)
      await tapBoardStep(page, c.stepId)
      await page.waitForSelector(`${S(type)} .mg-foot`)
      await page.waitForTimeout(400)
      const inf = await page.evaluate(() => document.getAnimations()
        .filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity)
        .map(a => (a.animationName || a.id || '?') + '@' + ((a.effect.target && a.effect.target.className && a.effect.target.className.baseVal !== undefined ? a.effect.target.className.baseVal : a.effect.target && a.effect.target.className) || '')))
      assert.deepEqual(inf, [], `${type}: còn hoạt ảnh vô hạn khi giảm chuyển động`)
      const m = await page.evaluate(measureStage, type)
      assertStage(m, `${type} giảm chuyển động`)
      const cdp = await page.context().newCDPSession(page)
      await freeze(page)
      await solveTouch(page, cdp, type)
      await page.clock.resume()
      const r = await stepResult(page, c.stepId)
      assert.ok(r.score >= 90, `${type}: ${r.score} điểm`)
      await page.waitForSelector(`${T('board-step-' + c.stepId)}.is-done`, { timeout: 5000 })
      const p = await probes(page)
      assert.equal(p.maxN, 0, `${type}: lớp hiệu ứng có ${p.maxN} hạt khi giảm chuyển động`)
      assert.ok(p.maxDom <= 30)
      assert.ok(p.stampAt !== null && p.stampOff !== null && p.stampOff - p.stampAt <= 1200, `${type}: con dấu ${p.stampOff - p.stampAt} ms`)
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (d) Ra món ----------

// Đầu dò bảng ra món: lúc gắn / gỡ (giờ trang), mọi giá trị chữ % đã hiện, data-q, data-grade.
async function installRevealProbe(page) {
  await page.evaluate(() => {
    const P = window.__rv = { at: null, off: null, vals: [], q: null, grade: null }
    const scan = () => {
      const el = document.querySelector('[data-testid="dish-reveal"]')
      if (el && P.at === null) { P.at = performance.now(); P.q = el.dataset.q; P.grade = el.dataset.grade }
      if (el) {
        const n = el.querySelector('.g-reveal-q-num')
        const v = n ? n.textContent : null
        if (v !== null && P.vals[P.vals.length - 1] !== v) P.vals.push(v)
      } else if (P.at !== null && P.off === null) P.off = performance.now()
    }
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, characterData: true })
  })
}

for (const reduced of [false, true]) {
  const frame = reduced ? '360x600' : '390x844'
  test(`(d) ra món ${frame}${reduced ? ' giảm chuyển động' : ''}: chữ % ${reduced ? 'hiện thẳng' : 'đếm lên'} đúng Q rồi bảng tự đóng trong ${reduced ? 'khoảng 1,4' : '3'} giây; giao món được`, { timeout: 180000 }, async () => {
    const g = await openFrame(frame, `m5-ra-mon${reduced ? '-giam' : ''}`, reduced ? { contextOptions: { reducedMotion: 'reduce' } } : {})
    const { page, errors } = g
    try {
      const { state, ticket } = cookShiftSave({ recipeId: 'ca_phe_sua_da' }, 'all', { tickets: 1, cooks: 5 })
      await openCook(g, state)
      await installRevealProbe(page)
      await page.tap(T('finish-dish'))
      await page.waitForSelector(T('dish-reveal'))
      await page.waitForTimeout(300)
      await g.shot('ra-mon')
      await page.waitForSelector(T('dish-reveal'), { state: 'detached', timeout: 5000 })
      const p = await page.evaluate(() => window.__rv)
      const q = Number(p.q)
      const nums = p.vals.map(Number)
      assert.ok(q > 0 && q <= 100, `Q hợp lệ (${p.q})`)
      assert.ok(nums.every(Number.isFinite), `chữ % là số: ${p.vals.join(',')}`)
      assert.equal(nums[nums.length - 1], q, `chữ % dừng đúng Q (${p.vals.join(',')} ≠ ${q})`)
      for (let i = 1; i < nums.length; i++) assert.ok(nums[i] >= nums[i - 1], `chữ % không đếm lùi (${p.vals.join(',')})`)
      if (reduced) assert.deepEqual(nums, [q], 'giảm chuyển động: hiện thẳng Q, không đếm')
      else assert.ok(nums[0] === 0 && nums.length >= 3, `chữ % đếm từ 0 lên (${p.vals.join(',')})`)
      const shown = p.off - p.at
      const max = reduced ? REVEAL_MS_REDUCED + 250 : 3000
      assert.ok(shown >= (reduced ? REVEAL_MS_REDUCED : REVEAL_MS) - 50 && shown <= max, `bảng ra món hiện ${Math.round(shown)} ms (≤ ${max})`)
      // dây phiếu: dòng kết quả món đúng Q; giao món
      await page.waitForSelector(`${T('dish-result')}[data-q="${q}"]`, { timeout: 3000 })
      await page.tap(`${T('serve-ticket')}[data-ticket-id="${ticket.id}"]`)
      await page.waitForSelector(`${T('score-sheet')}[data-customer-id="${ticket.customerId}"]`, { timeout: 5000 })
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (e) Chế độ tập trung ----------

for (const frame of ['360x600', '390x844']) {
  const low = FRAMES[frame].vp.height < FOCUS_MAX_H
  test(`(e) chế độ tập trung ${frame}: ${low ? 'bật khi nấu, tắt khi về dây phiếu / sang Quầy, bật lại khi quay về' : 'không bao giờ bật'}`, { timeout: 180000 }, async () => {
    const g = await openFrame(frame, `m5-tap-trung-${frame}`)
    const { page, errors } = g
    try {
      const { state } = cookShiftSave({ recipeId: 'tra_tac' }, 'lac', { tickets: 3, cooks: 5 })
      await openCook(g, state)
      const look = () => page.evaluate(() => {
        const svc = document.querySelector('[data-testid="screen-service"]')
        const street = document.querySelector('.street')
        return {
          focus: svc.classList.contains('is-focus'), cook: document.querySelector('.overlay-root').classList.contains('is-cook-focus'),
          street: !!street && getComputedStyle(street).display !== 'none' && street.getBoundingClientRect().height > 0,
          rail: !!document.querySelector('[data-testid="ticket-rail"]') && document.querySelector('[data-testid="ticket-rail"]').getBoundingClientRect().height > 0
        }
      })
      const expect = async (on, where) => {
        const v = await look()
        assert.equal(v.focus, on, `${where}: .service-screen.is-focus`)
        assert.equal(v.cook, on, `${where}: .overlay-root.is-cook-focus`)
        assert.equal(v.street, !on, `${where}: dải phố ${on ? 'ẩn' : 'hiện'}`)
        assert.ok(v.rail, `${where}: dây phiếu vẫn hiện`)
      }
      await expect(low, 'Thớt sơ chế')
      await g.shot('tap-trung-thot')
      await tapBoardStep(page, 'lac')
      await page.waitForSelector(`${S('lac')} .mg-foot`)
      await expect(low, 'sân khấu Lắc')
      await g.shot('tap-trung-san-khau')
      // chơi xong bước bằng cảm ứng → về Thớt, vẫn tập trung
      const cdp = await page.context().newCDPSession(page)
      await page.waitForTimeout(300)
      await freeze(page)
      await solveTouch(page, cdp, 'lac')
      await page.clock.resume()
      await page.waitForSelector(`${T('board-step-lac')}.is-done`, { timeout: 5000 })
      await expect(low, 'Thớt sau bước Lắc')
      await page.tap(T('kitchen-back'))
      await page.waitForSelector('.k-main[data-view="rail"]')
      await expect(false, 'dây phiếu (về từ Thớt)')
      await page.tap(T('cook-resume'))
      await page.waitForSelector(T('board'))
      await expect(low, 'Thớt (làm tiếp)')
      await page.tap(T('tab-counter'))
      await page.waitForTimeout(200)
      await expect(false, 'tab Quầy')
      await resolveIncidentIfShown(g, { waitMs: 300 })
      await page.tap(T('tab-kitchen'))
      await page.waitForSelector(T('board'))
      await expect(low, 'quay lại tab Bếp')
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (f) Người chơi cũ gặp thao tác mới (hồi quy vòng sửa F) ----------

for (const c of [
  { type: 'dap', tour: false, frame: '375x553', line: { recipeId: 'banh_mi_op_la' }, stepId: 'dap_trung' },
  { type: 'lac', tour: true, frame: '390x844', line: { recipeId: 'tra_tac' }, stepId: 'lac' }
]) {
  const id = 'bep_' + c.type
  test(`(f) người chơi cũ (món nấu 5 lần) lần đầu gặp ${c.type} ${c.frame}${c.tour ? ' ?tour=1' : ''}: thẻ đầy đủ${c.tour ? ' + tour ' + id : ''}, ghi đã xem; làm lại bước chỉ còn ruy băng gọn`, { timeout: 180000 }, async () => {
    const g = await openFrame(c.frame, `m5-nguoi-cu-${c.type}`)
    const { page, errors } = g
    try {
      const { state } = cookShiftSave(c.line, c.stepId, { tickets: 1, cooks: 5 })
      markSeen(state, Object.keys(DATA.TOURS).filter(t => t !== id))
      assert.notEqual(state.tour.seen[id], true, 'save dựng sẵn: chưa xem tour của loại thao tác mới')
      await seedSave(page, state)
      await page.goto(g.url(c.tour ? '/?tour=1' : '/'))
      await page.waitForSelector(T('screen-service'))
      await resolveIncidentIfShown(g, { waitMs: 300 })
      await page.tap(T('tab-kitchen'))
      await page.waitForSelector(T('board'))
      await tapBoardStep(page, c.stepId)
      // lần đầu gặp: thẻ đầy đủ (tay mẫu, nút "Chạm để bắt đầu"), không phải ruy băng gọn
      await page.waitForSelector(T('step-card-go'), { timeout: 1000 })
      assert.ok(await page.$(T('step-card-demo')), 'thẻ đầy đủ có tay mẫu')
      assert.ok(!(await page.$(T('step-card-mini'))), 'không phải ruy băng gọn')
      if (c.tour) {
        await page.waitForSelector(`${T('tour')}[data-tour~="${id}"]`, { timeout: 1500 })
        await g.shot('tour-' + id)
        await page.tap(T('tour-skip'))
        await page.waitForSelector(T('tour'), { state: 'detached' })
      }
      await page.waitForSelector(`${S(c.type)} .mg-foot`, { timeout: 5000 })
      await waitSave(page, s => s.tour && s.tour.seen && s.tour.seen[id] === true)
      const cdp = await page.context().newCDPSession(page)
      await page.waitForTimeout(300)
      await freeze(page)
      await solveTouch(page, cdp, c.type)
      await page.clock.resume()
      await stepResult(page, c.stepId)
      await page.waitForSelector(`${T('board-step-' + c.stepId)}.is-done`, { timeout: 5000 })
      // lần sau (làm lại bước): chỉ ruy băng gọn, vào trò ngay
      await page.tap(T('board-step-' + c.stepId))
      await page.tap(T('retry-step'))
      await page.waitForSelector(T('step-card-mini'), { state: 'attached', timeout: 1000 })
      assert.ok(!(await page.$(T('step-card-go'))), 'làm lại: không còn thẻ đầy đủ')
      await page.waitForSelector(`${S(c.type)} .mg-foot`, { timeout: 1000 })
      assert.ok(!(await page.$(T('tour'))), 'tour không hiện lại')
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (g) Thông báo bị hoãn chờ màn ra món đóng (hồi quy vòng sửa F) ----------

for (const frame of ['360x600', '390x844']) {
  const low = FRAMES[frame].vp.height < FOCUS_MAX_H
  test(`(g) ra món ${frame}: thông báo nổi${low ? ' (chế độ tập trung giữ tới khi bảng đóng)' : ''} không hiện đè màn ra món, hiện sau khi bảng đóng`, { timeout: 180000 }, async () => {
    const g = await openFrame(frame, `m5-thong-bao-ra-mon-${frame}`)
    const { page, errors } = g
    try {
      // Cà phê sữa đá Tuyệt hảo: lần ra món này đẩy tiến độ chuỗi "Dì Sáu dặn" (thông báo nổi do chính lần ra món sinh ra)
      const { state } = cookShiftSave({ recipeId: 'ca_phe_sua_da' }, 'all', { tickets: 3, cooks: 5 })
      await openCook(g, state)
      await page.evaluate(() => {
        const P = window.__tb = { during: [], focusDuring: [], seen: false }
        const loop = () => {
          const rv = document.querySelector('[data-testid="dish-reveal"]')
          if (rv) {
            P.seen = true
            P.focusDuring.push(document.querySelector('[data-testid="screen-service"]').classList.contains('is-focus'))
            for (const t of document.querySelectorAll('.toast-stack .toast:not(.hide)')) P.during.push(t.textContent.slice(0, 60))
          }
          requestAnimationFrame(loop)
        }
        requestAnimationFrame(loop)
      })
      await page.tap(T('finish-dish'))
      await page.waitForSelector(T('dish-reveal'))
      await page.waitForTimeout(400)
      await g.shot('thong-bao-ra-mon')
      await page.waitForSelector(T('dish-reveal'), { state: 'detached', timeout: 5000 })
      const p = await page.evaluate(() => window.__tb)
      assert.ok(p.seen, 'đầu dò thấy màn ra món')
      assert.deepEqual([...new Set(p.during)], [], 'không có thông báo nổi nào hiện trong lúc màn ra món còn mở')
      assert.ok(p.focusDuring.every(v => v === low), `chế độ tập trung ${low ? 'giữ' : 'không bật'} suốt lúc màn ra món mở`)
      // bảng đóng: thông báo đang chờ thả ra, chế độ tập trung tắt (về dây phiếu)
      await page.waitForSelector('.toast-stack .toast', { timeout: 2000 })
      assert.equal(await page.evaluate(() => document.querySelector('[data-testid="screen-service"]').classList.contains('is-focus')), false)
      await g.shot('thong-bao-sau-ra-mon')
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (h) Bước Chọn ở khung thấp: vừa mở đã thấy một hàng kệ (hồi quy vòng sửa F) ----------

for (const c of [
  { frame: '375x553', recipeId: 'banh_trang_tron_tay_ninh' },
  { frame: '375x553', recipeId: 'banh_mi_op_la' },
  { frame: '320x568', recipeId: 'banh_trang_tron_tay_ninh' },
  { frame: '360x600', recipeId: 'banh_trang_tron_tay_ninh' }
]) {
  test(`(h) bước Chọn ${c.frame}${FRAMES[c.frame].safe ? ' vùng an toàn' : ''} ${c.recipeId}: vừa mở đã bấm được ít nhất một hàng kệ, nút "‹ Phiếu" và thẻ công thức không khuất`, { timeout: 180000 }, async () => {
    const g = await openFrame(c.frame, `m5-chon-thap-${c.frame}-${c.recipeId}`)
    const { page, errors } = g
    try {
      const { state, ticket } = cookShiftSave({ recipeId: c.recipeId }, null, { tickets: FRAMES[c.frame].tickets, cooks: 5 })
      await seedSave(page, state)
      await page.goto(g.url('/'))
      await page.waitForSelector(T('screen-service'))
      await resolveIncidentIfShown(g, { waitMs: 300 })
      await page.tap(T('tab-kitchen'))
      await page.waitForSelector(T('ticket-' + ticket.id))
      if (!(await page.$(T('cook-line-0')))) await page.tap(T('ticket-' + ticket.id))
      await page.tap(T('cook-line-0'))
      await page.waitForSelector(`${S('chon')} .mg-foot`)
      await page.waitForTimeout(400)
      const m = await page.evaluate(() => {
        const st = document.querySelector('[data-testid="minigame-stage"][data-type="chon"]')
        const foot = st.querySelector('.mg-foot').getBoundingClientRect()
        const panel = document.querySelector('[data-testid="panel-kitchen"]').getBoundingClientRect()
        const cells = [...st.querySelectorAll('.chon-cell')]
        const hit = cells.filter(e => {
          const r = e.getBoundingClientRect()
          const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return r.top >= panel.top - 0.5 && r.bottom <= foot.top + 0.5 && !!at && e.contains(at)
        })
        const R = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height, w: r.width } }
        return {
          cols: Number((st.querySelector('.chon-shelf') || {}).dataset?.cols) || 4, cells: cells.length, hit: hit.length,
          back: R('[data-testid="kitchen-back"]'), card: R('[data-testid="recipe-card"]'), panelTop: panel.top,
          focus: document.querySelector('[data-testid="screen-service"]').classList.contains('is-focus'), docSW: document.documentElement.scrollWidth, vw: innerWidth
        }
      })
      await g.shot('chon-vua-mo')
      assert.equal(m.focus, true, 'chế độ tập trung bật')
      assert.ok(m.hit >= m.cols, `vừa mở chỉ bấm được ${m.hit}/${m.cells} ô kệ (cần ít nhất một hàng ${m.cols} ô)`)
      assert.ok(m.back && m.back.top >= m.panelTop - 0.5 && m.back.h >= 44 - 0.5 && m.back.w >= 44 - 0.5, `nút "‹ Phiếu" trong khung, vùng chạm ≥ 44px (${JSON.stringify(m.back)})`)
      assert.ok(m.card && m.card.top >= m.panelTop - 0.5, 'thẻ công thức không bị cuộn khuất')
      assert.ok(m.docSW <= m.vw + 1, 'trang không tràn ngang')
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (i) Hàng chấm bước không lấn viên đồng hồ ở món nhiều bước nhất (hồi quy vòng sửa G) ----------

// Đo đầu sân khấu: hàng chấm (.g-dots, các .g-dot đang hiện) so với viên đồng hồ [mg-time]; chấm hiện tại thấy trọn trong
// hộp chấm (hộp có thể cắt phần tràn); tâm biểu tượng đồng hồ và tâm vạch giờ phải trúng chính viên đồng hồ.
// DOT_GAP: khoảng hở tối thiểu giữa hàng chấm và viên đồng hồ (vòng sáng của chấm hiện tại nhô ra ngoài hộp chấm vài px —
// bản trước vòng sửa G còn cách 4px là vòng vàng đã chạm đồng hồ; sau sửa cách ≥ 40px ở 320 và 360px).
const DOT_GAP = 8
function measureDots() {
  const st = document.querySelector('[data-testid="minigame-stage"]')
  const R = e => e.getBoundingClientRect()
  const box = st.querySelector('.g-dots')
  const all = [...st.querySelectorAll('.g-dot')]
  const shown = all.filter(d => { const cs = getComputedStyle(d); return cs.display !== 'none' && cs.visibility !== 'hidden' && R(d).width > 0 })
  const tm = st.querySelector('[data-testid="mg-time"]')
  const tR = R(tm), bR = R(box)
  const last = shown.length ? R(shown[shown.length - 1]) : null
  const now = st.querySelector('.g-dot.is-now')
  const nR = now ? R(now) : null
  const hitsTimer = el => {
    if (!el) return null
    const r = R(el)
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return !!(at && tm.contains(at))
  }
  return {
    n: all.length, shown: shown.length, vw: innerWidth, head: st.querySelector('.mg-head').className,
    dotsRight: Math.max(last ? last.right : 0, bR.right), timerLeft: tR.left, timerRight: tR.right,
    nowIn: !!nR && nR.left >= bR.left - 1 && nR.right <= bR.right + 1,
    icoHit: hitsTimer(st.querySelector('.g-time-ico')), trackHit: hitsTimer(st.querySelector('.g-time-track'))
  }
}

for (const c of [
  { frame: '320x568', recipeId: 'banh_trang_tron_tay_ninh', stepId: 'tron' },
  { frame: '320x568', recipeId: 'ca_phe_muoi', stepId: 'danh_sua_muoi' },
  { frame: '360x600', recipeId: 'banh_trang_tron_tay_ninh', stepId: 'tron' },
  { frame: '360x600', recipeId: 'ca_phe_muoi', stepId: 'danh_sua_muoi' }
]) {
  const N = DATA.RECIPES[c.recipeId].steps.length
  const f = FRAMES[c.frame]
  test(`(i) chấm bước ${c.frame}${f.tickets > 1 ? ` ${f.tickets} phiếu` : ''} ${c.recipeId} (${N} bước) .${c.stepId}: hàng chấm không lấn viên đồng hồ, chấm hiện tại thấy trọn, đồng hồ bấm trúng`, { timeout: 180000 }, async () => {
    const g = await openFrame(c.frame, `m5-cham-buoc-${c.frame}-${c.recipeId}`)
    const { page, errors } = g
    try {
      const { state } = cookShiftSave({ recipeId: c.recipeId }, c.stepId, { tickets: f.tickets, cooks: 5 })
      // đã xem mọi hướng dẫn: thẻ vào bước chỉ còn ruy băng gọn, vào sân khấu ngay
      markSeen(state, Object.keys(DATA.TOURS))
      await openCook(g, state)
      await tapBoardStep(page, c.stepId)
      await page.waitForSelector(`${S('xoay')} .mg-foot`)
      // chờ trò dựng xong (ResizeObserver, tự cuộn cảnh) và nhịp nảy vào của chấm
      await page.waitForTimeout(600)
      const m = await page.evaluate(measureDots)
      await g.shot('cham-buoc')
      const label = `${c.frame} ${c.recipeId}`
      assert.equal(m.n, N, `${label}: có đủ ${N} chấm bước (${m.head})`)
      assert.ok(m.shown >= 1, `${label}: hàng chấm đang hiện`)
      assert.ok(m.dotsRight + DOT_GAP <= m.timerLeft, `${label}: hàng chấm ${m.dotsRight > m.timerLeft ? 'lấn' : 'sát'} viên đồng hồ (chấm tới ${m.dotsRight.toFixed(1)}, đồng hồ từ ${m.timerLeft.toFixed(1)}, cần cách ≥ ${DOT_GAP}px; ${m.head})`)
      assert.ok(m.nowIn, `${label}: chấm bước hiện tại bị hộp chấm cắt`)
      assert.equal(m.icoHit, true, `${label}: tâm biểu tượng đồng hồ không trúng viên đồng hồ`)
      assert.equal(m.trackHit, true, `${label}: tâm vạch giờ không trúng viên đồng hồ`)
      assert.ok(m.timerRight <= m.vw + 0.5, `${label}: viên đồng hồ tràn khỏi màn (${m.timerRight.toFixed(1)} > ${m.vw})`)
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (j) Huy hiệu "★ Hiếm" của màn ra món nằm trọn trong màn (hồi quy vòng sửa G) ----------

// Đo hàng tên của màn ra món (đã dừng ở trạng thái nghỉ): huy hiệu hiếm so với bảng ra món, khung nhìn và chữ tên.
function measureRare() {
  const rv = document.querySelector('[data-testid="dish-reveal"]')
  const R = e => e.getBoundingClientRect()
  const vw = innerWidth, vh = innerHeight
  const rvR = R(rv)
  const span = rv.querySelector('.g-reveal-title > span')
  const rare = rv.querySelector('.g-reveal-rare')
  const out = { name: span.textContent, vw, vh, box: [rvR.left, rvR.right, rvR.top, rvR.bottom], cut: span.scrollWidth > span.clientWidth + 1 }
  if (!rare) return out
  const rr = R(rare)
  const at = document.elementFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2)
  // chữ tên: hình bao các dòng chữ, bỏ phần đệm trên (~40% cỡ chữ, chỗ trống trên dấu thanh — hình bao của huy hiệu xoay 7°
  // to hơn hình thật một chút)
  const rg = document.createRange()
  rg.selectNodeContents(span)
  const fs = parseFloat(getComputedStyle(span).fontSize)
  const over = [...rg.getClientRects()].some(r => rr.left < r.right && rr.right > r.left && rr.top < r.bottom && rr.bottom > r.top + fs * 0.4)
  Object.assign(out, {
    rare: rare.textContent.trim(), rr: [rr.left, rr.right, rr.top, rr.bottom], opacity: getComputedStyle(rare).opacity,
    inBox: rr.left >= rvR.left - 0.5 && rr.right <= rvR.right + 0.5 && rr.top >= rvR.top - 0.5,
    inView: rr.left >= -0.5 && rr.right <= vw + 0.5 && rr.top >= -0.5 && rr.bottom <= vh + 0.5,
    hit: !!(at && rare.contains(at)), overName: over
  })
  return out
}

for (const c of [
  { frame: '320x568', recipeId: 'banh_trang_tron_tay_ninh' },
  { frame: '320x568', recipeId: 'tra_tac_mat_ong' },
  { frame: '375x553', recipeId: 'banh_trang_tron_tay_ninh' }
]) {
  const f = FRAMES[c.frame]
  const name = DATA.RECIPES[c.recipeId].name
  test(`(j) ra món ${c.frame}${f.safe ? ' vùng an toàn' : ''} món hiếm "${name}": huy hiệu "★ Hiếm" nằm trọn trong màn, bấm trúng, không đè tên; tên không bị cắt`, { timeout: 180000 }, async () => {
    const g = await openFrame(c.frame, `m5-huy-hieu-hiem-${c.frame}-${c.recipeId}`)
    const { page, errors } = g
    try {
      const { state } = cookShiftSave({ recipeId: c.recipeId }, 'all', { tickets: f.tickets, cooks: 5 })
      await openCook(g, state)
      await page.tap(T('finish-dish'))
      await page.waitForSelector(T('dish-reveal'))
      // giờ trang chạy tới sau mọi nhịp (huy hiệu ở 300 ms) rồi đứng, bảng không tự đóng (2,2 giây); hoạt ảnh CSS hữu hạn của
      // bảng (chạy theo giờ thật) cho về trạng thái cuối
      await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1800)
      await page.waitForTimeout(400)
      await page.evaluate(() => {
        for (const a of document.querySelector('[data-testid="dish-reveal"]').getAnimations({ subtree: true })) {
          if (a.effect && a.effect.getComputedTiming().iterations !== Infinity) { try { a.finish() } catch { /* bỏ qua */ } }
        }
      })
      await page.waitForTimeout(100)
      const m = await page.evaluate(measureRare)
      await g.shot('huy-hieu-hiem')
      const label = `${c.frame} ${name}`
      const at = `${label}: huy hiệu (${m.rr && m.rr.map(v => v.toFixed(1)).join(', ')}), bảng (${m.box.map(v => v.toFixed(1)).join(', ')}), khung ${m.vw}×${m.vh}`
      assert.equal(m.name, name, 'ruy băng ghi đúng tên món')
      assert.equal(m.cut, false, `${label}: tên món bị cắt "…"`)
      assert.equal(m.rare, '★ Hiếm', `${label}: có huy hiệu "★ Hiếm"`)
      assert.equal(m.opacity, '1', `${label}: huy hiệu đã hiện hẳn`)
      assert.ok(m.inBox, `${at} — nằm trong bảng ra món`)
      assert.ok(m.inView, `${at} — nằm trọn trong khung nhìn`)
      assert.ok(m.hit, `${at} — tâm huy hiệu trúng chính huy hiệu (không bị cắt, không bị che)`)
      assert.equal(m.overName, false, `${at} — huy hiệu đè chữ tên`)
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (k) Thẻ vào bước ở khung thấp không cắt mất cuối câu hướng dẫn (hồi quy vòng sửa G) ----------

test('(k) thẻ vào bước 375×553 vùng an toàn, Thả đá (món chưa nấu lần nào): câu hướng dẫn đang hiện không bị cắt, còn đủ "…bấm Xong."', { timeout: 180000 }, async () => {
  const g = await openFrame('375x553', 'm5-the-buoc-khung-thap')
  const { page, errors } = g
  try {
    const { state } = cookShiftSave({ recipeId: 'ca_phe_sua_da' }, 'them_da', { tickets: 1, cooks: 0 })
    await openCook(g, state)
    await tapBoardStep(page, 'them_da')
    await page.waitForSelector(T('step-hint'))
    // đứng giờ trang (thẻ không tự vào bước); vài khung hình để thẻ đo câu (fitHint), rồi chờ hoạt ảnh vào của thẻ
    await freeze(page)
    await page.clock.runFor(100)
    await page.waitForTimeout(400)
    const m = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="step-hint"]')
      const p = card.querySelector('.g-step-card-hint')
      const span = [...p.querySelectorAll('span')].find(s => getComputedStyle(s).display !== 'none') || p
      const text = span.textContent
      // ký tự cuối của câu đang hiện phải nằm trong khung câu (line-clamp cắt thì nó rơi xuống dưới đáy khung)
      const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT)
      let tn = null
      for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent.trim()) tn = n
      const rg = document.createRange()
      rg.setStart(tn, tn.length - 1)
      rg.setEnd(tn, tn.length)
      const lr = rg.getBoundingClientRect(), pr = p.getBoundingClientRect()
      return {
        text, cls: p.className, sh: p.scrollHeight, ch: p.clientHeight, sw: p.scrollWidth, cw: p.clientWidth,
        lastIn: lr.top >= pr.top - 1 && lr.bottom <= pr.bottom + 1 && lr.right <= pr.right + 1,
        last: [lr.top, lr.bottom], box: [pr.top, pr.bottom], vh: innerHeight, fs: parseFloat(getComputedStyle(p).fontSize)
      }
    })
    await g.shot('the-buoc-khung-thap')
    const label = `375×553 Thả đá "${m.text}" (${m.cls})`
    assert.match(m.text, /bấm Xong\.$/, `${label}: câu hướng dẫn đang hiện phải có đủ phần cuối "bấm Xong."`)
    assert.ok(m.sh <= m.ch + 1 && m.sw <= m.cw + 1, `${label}: câu bị cắt (cao ${m.sh} > ${m.ch} hoặc rộng ${m.sw} > ${m.cw})`)
    assert.ok(m.lastIn, `${label}: ký tự cuối (${m.last.map(v => v.toFixed(1))}) nằm ngoài khung câu (${m.box.map(v => v.toFixed(1))})`)
    assert.ok(m.box[0] >= -0.5 && m.box[1] <= m.vh + 0.5, `${label}: câu nằm trong khung nhìn`)
    assert.ok(m.fs >= 13, `${label}: chữ ${m.fs}px (< 13px)`)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// ---------- (l) Thả đá: hồng tâm khớp điểm (hồi quy D1/E3) ----------

for (const c of [
  { where: 'tâm', frac: 0, tier: 'tam', score: 100 },
  { where: 'vành ngoài', frac: 0.85, tier: 'mep', score: 55 }
]) {
  test(`(l) Thả đá 390×844 thả ở ${c.where} vùng thả (${c.frac} bán kính): vùng thả data-tier="${c.tier}", bước được ${c.score} điểm — khớp bayTier / bayPlaceScore`, { timeout: 180000 }, async () => {
    // chính hàm chấm: bậc của chỗ thả và điểm vị trí (hệ số vùng 1)
    assert.equal(bayTier(c.frac).id, c.tier)
    assert.equal(bayPlaceScore(c.frac), c.score)
    const g = await openFrame('390x844', `m5-tha-da-${c.tier}`)
    const { page, errors } = g
    try {
      const { state } = cookShiftSave({ recipeId: 'ca_phe_sua_da' }, 'them_da', { tickets: 1, cooks: 5 })
      markSeen(state, Object.keys(DATA.TOURS))
      await openCook(g, state)
      await tapBoardStep(page, 'them_da')
      await page.waitForSelector(`${S('bay')} .mg-foot`)
      await page.waitForTimeout(350)
      const cdp = await page.context().newCDPSession(page)
      await freeze(page)
      await page.clock.runFor(400)
      const st = S('bay')
      // vùng thả: tâm và bán kính bằng hộp bay-target (hợp đồng e2e của bay.js)
      const tgt = await page.$eval(`${st} ${T('bay-target')}`, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 } })
      const n = await attrN(page, `${st} ${T('bay-count')}`, 'data-n')
      const dirs = [[0, 1], [-1, 0]]
      const tiers = []
      for (let i = 0; i < n; i++) {
        // nhấn giữa viên đá (chỗ thả = tâm viên đá = ngón tay), kéo 10 nấc tới chỗ thả, đọc bậc vùng thả lúc còn giữ tay
        const from = await centerOf(page, `${st} ${T('bay-item-' + i)}`)
        const [dx, dy] = dirs[i % 2]
        const to = { x: tgt.x + dx * c.frac * tgt.R, y: tgt.y + dy * c.frac * tgt.R }
        await touch(cdp, 'touchStart', from)
        for (let k = 1; k <= 10; k++) {
          await page.clock.runFor(16)
          await page.waitForTimeout(12)
          await touch(cdp, 'touchMove', { x: from.x + ((to.x - from.x) * k) / 10, y: from.y + ((to.y - from.y) * k) / 10 })
        }
        await page.clock.runFor(16)
        await page.waitForTimeout(30)
        tiers.push(await page.getAttribute(`${st} ${T('bay-target')}`, 'data-tier'))
        if (i === 0) await g.shot('tha-da-dang-keo')
        await touch(cdp, 'touchEnd', null)
        await page.clock.runFor(400)
        assert.equal(await page.getAttribute(`${st} ${T('bay-item-' + i)}`, 'data-placed'), '1', `viên ${i} đã thả vào ly`)
      }
      assert.deepEqual(tiers, Array(n).fill(c.tier), `vùng thả báo bậc ${tiers.join(',')} (cần ${c.tier})`)
      const d = await centerOf(page, `${st} ${T('bay-done')}:not([disabled])`)
      await page.touchscreen.tap(d.x, d.y)
      await page.clock.runFor(600)
      await page.clock.resume()
      const r = await stepResult(page, 'them_da')
      assert.equal(r.score, c.score, `thả ở ${c.where}: bước được ${r.score} điểm (cần ${c.score} = bayPlaceScore(${c.frac}))`)
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}

// ---------- (m) Khuấy: số vòng làm tròn xuống, chưa đủ vòng thì chưa xong (hồi quy D1/E3) ----------

test('(m) Khuấy 390×844 Cà phê sữa đá: 2,997 vòng ghi xoay-progress[data-v]="2.99" (làm tròn xuống), trò chưa xong; vẽ tiếp đủ vòng thì xong ≥ 90', { timeout: 180000 }, async () => {
  const g = await openFrame('390x844', 'm5-khuay-lam-tron')
  const { page, errors } = g
  try {
    const { state } = cookShiftSave({ recipeId: 'ca_phe_sua_da' }, 'khuay', { tickets: 1, cooks: 5 })
    markSeen(state, Object.keys(DATA.TOURS))
    await openCook(g, state)
    await tapBoardStep(page, 'khuay')
    const st = S('xoay')
    await page.waitForSelector(`${st} .mg-foot`)
    await page.waitForTimeout(350)
    const cdp = await page.context().newCDPSession(page)
    await freeze(page)
    const c = await centerOf(page, `${st} ${T('xoay-bowl')}`)
    const n = await attrN(page, `${st} ${T('xoay-progress')}`, 'data-n')
    const R = c.w * 0.32
    // điểm trên vòng khuấy ở `turns` vòng tính từ điểm đầu (bên phải tâm), chiều kim đồng hồ trên màn
    const at = turns => ({ x: c.x + R * Math.cos(turns * 2 * Math.PI), y: c.y + R * Math.sin(turns * 2 * Math.PI) })
    const short = n - 0.003
    const pts = []
    for (let k = 0; k < n * 24; k++) pts.push(at(k / 24))
    pts.push(at(short))
    // 28 ms giờ trang mỗi điểm (~1,5 vòng/giây, dưới ngưỡng sánh), không nhấc tay
    await touch(cdp, 'touchStart', pts[0])
    for (let i = 1; i < pts.length; i++) {
      await page.clock.runFor(28)
      await page.waitForTimeout(12)
      await touch(cdp, 'touchMove', pts[i])
    }
    await page.clock.runFor(28)
    await page.waitForTimeout(30)
    const read = () => page.evaluate(s => {
      const p = document.querySelector(`${s} [data-testid="xoay-progress"]`)
      return {
        v: p ? p.dataset.v : null, text: p ? p.textContent : '',
        bowl: !!document.querySelector(`${s} [data-testid="xoay-bowl"]`),
        stamp: !!document.querySelector('[data-testid="kitchen"] .k-layer [data-testid="step-result"]')
      }
    }, st)
    const mid = await read()
    await g.shot('khuay-2-99')
    assert.equal(mid.v, (n - 0.01).toFixed(2), `${short} vòng: data-v="${mid.v}" (làm tròn xuống phải là ${(n - 0.01).toFixed(2)}, không phải ${n.toFixed(2)})`)
    assert.ok(Number(mid.v) < n, 'data-v < data-n khi chưa đủ vòng')
    assert.match(mid.text, new RegExp(`${n - 1}/${n}`), `chữ đếm vòng ghi ${n - 1}/${n} (${mid.text})`)
    // giữ tay thêm 400 ms giờ trang (nhịp xong 260 ms chỉ chạy khi đủ hẳn n vòng): trò vẫn chưa xong
    await page.clock.runFor(400)
    await page.waitForTimeout(30)
    const still = await read()
    assert.equal(still.v, mid.v, 'số vòng không đổi khi giữ yên tay')
    assert.ok(still.bowl && !still.stamp, 'chưa đủ vòng mà trò đã xong (có con dấu kết quả)')
    // vẽ tiếp tới n + 0,4 vòng rồi nhấc tay: đủ vòng thì tự xong
    for (let k = 1; k <= 12; k++) {
      await page.clock.runFor(28)
      await page.waitForTimeout(12)
      await touch(cdp, 'touchMove', at(short + (k * (n + 0.4 - short)) / 12))
    }
    await page.clock.runFor(28)
    await touch(cdp, 'touchEnd', null)
    await page.clock.runFor(600)
    await page.clock.resume()
    const r = await stepResult(page, 'khuay')
    assert.ok(r.score >= 90, `khuấy đủ vòng: ${r.score} điểm`)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// ---------- (n) Người chơi cũ ở mốc ẩn thẻ gặp loại thao tác mới (hồi quy vòng sửa F) ----------

for (const c of [
  { type: 'xoay', frame: '360x600', line: { recipeId: 'ca_phe_sua_da' }, stepId: 'khuay' },
  { type: 'got', frame: '320x568', line: { recipeId: 'che_buoi' }, stepId: 'got_vo' },
  { type: 'bay', frame: '375x553', line: { recipeId: 'ca_phe_muoi' }, stepId: 'them_da' }
]) {
  const id = 'bep_' + c.type
  const f = FRAMES[c.frame]
  test(`(n) người chơi cũ (món nấu ${HINT_HIDE_AFTER_COOKS} lần) lần đầu gặp ${c.type} ${c.frame}${f.safe ? ' vùng an toàn' : ''}: thẻ đầy đủ (tay mẫu, "Chạm để bắt đầu"), chạm thì vào trò, ghi đã xem ${id}`, { timeout: 180000 }, async () => {
    const g = await openFrame(c.frame, `m5-nguoi-cu-moc-${c.type}`)
    const { page, errors } = g
    try {
      const { state } = cookShiftSave(c.line, c.stepId, { tickets: f.tickets, cooks: HINT_HIDE_AFTER_COOKS })
      markSeen(state, Object.keys(DATA.TOURS).filter(t => t !== id))
      const step = DATA.RECIPES[c.line.recipeId].steps.find(s => s.id === c.stepId)
      assert.equal(step.type, c.type)
      assert.equal(state.recipes[c.line.recipeId].cooks, HINT_HIDE_AFTER_COOKS, 'save dựng sẵn: món đã nấu tới mốc ẩn thẻ')
      assert.notEqual(state.tour.seen[id], true, 'save dựng sẵn: chưa xem hướng dẫn của loại thao tác mới')
      assert.equal(stepCardFull(step, state, { recipeId: c.line.recipeId }), true, 'lõi: thẻ đầy đủ')
      await openCook(g, state)
      await tapBoardStep(page, c.stepId)
      await page.waitForSelector(T('step-card-go'), { timeout: 1000 })
      // đứng giờ trang: thẻ không tự vào bước trong lúc đo
      await freeze(page)
      await page.waitForTimeout(250)
      const card = await page.evaluate(() => {
        const R = e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height } }
        const demo = document.querySelector('[data-testid="step-card-demo"]')
        const hand = demo && demo.querySelector('.g-demo-hand')
        const go = document.querySelector('[data-testid="step-card-go"]')
        return {
          gesture: demo ? demo.dataset.gesture : null, demo: demo ? R(demo) : null, hand: hand ? R(hand) : null,
          go: go ? go.textContent.trim() : '', mini: !!document.querySelector('[data-testid="step-card-mini"]')
        }
      })
      await g.shot('nguoi-cu-the-day-du')
      assert.equal(card.gesture, GESTURE_BY_TYPE[c.type], 'tay mẫu diễn đúng cử chỉ của loại bước')
      assert.ok(card.demo && card.demo.w > 20 && card.demo.h > 20, `khung tay mẫu đang hiện (${JSON.stringify(card.demo)})`)
      assert.ok(card.hand && card.hand.w > 10 && card.hand.h > 10, 'có bàn tay mẫu')
      assert.equal(card.go, 'Chạm để bắt đầu')
      assert.equal(card.mini, false, 'không phải ruy băng gọn')
      await page.tap(T('step-card-go'))
      await page.clock.resume()
      await page.waitForSelector(`${S(c.type)} .mg-foot`, { timeout: 3000 })
      const s = await waitSave(page, v => v.tour && v.tour.seen && v.tour.seen[id] === true)
      assert.equal(s.recipes[c.line.recipeId].cooks, HINT_HIDE_AFTER_COOKS, 'số lần nấu không đổi khi vào bước')
      assert.deepEqual(errors, [], 'có lỗi console/trang')
    } finally {
      await g.close()
    }
  })
}
