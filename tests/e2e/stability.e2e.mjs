// E2E ổn định khi ráp nối M1 + M2 + M3 (Chromium 390×844 cảm ứng):
// chuyển qua lại thật nhanh giữa màn Chuẩn bị và các màn con (Sổ tay nghề, Sổ công thức + chi tiết món, Cài đặt +
// Giới thiệu, Chợ Công Thức, Việc hôm nay, Hộp thư, bảng điểm danh) 20 vòng bằng thao tác trong trang:
// - không bao giờ rời trang (trước đây: bấm "‹ Chuẩn bị" rồi mở ngay màn con khác khi history.back() chưa xong làm
//   lệch sổ lịch sử, vài vòng sau game lùi ra khỏi trang);
// - nút Back của điện thoại vẫn đưa màn con về màn Chuẩn bị;
// - không rò: số bộ nghe trên bus, trên window/document, phần tử bị tách khỏi trang còn giữ trong bộ nhớ (sau khi dọn
//   rác), số vòng requestAnimationFrame đang chạy ở màn Chuẩn bị giữ nguyên.
// Bộ nghe bus được đếm bằng cách thay nội dung src/core/bus.js ngay trong phiên thử (page.route), không sửa game.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame } from './helpers.mjs'

const ROUNDS = 20

async function measure(page, cdp) {
  await cdp.send('HeapProfiler.collectGarbage')
  const inPage = await page.evaluate(async () => {
    // số vòng rAF đang chạy = lượt gọi requestAnimationFrame / số khung hình (đếm bằng rAF gốc)
    const r = window.__rafProbe
    const c0 = r.calls
    let frames = 0
    await new Promise(res => {
      const t0 = performance.now()
      const tick = () => { frames++; if (performance.now() - t0 < 600) r.orig(tick); else res() }
      r.orig(tick)
    })
    return {
      dom: document.getElementsByTagName('*').length,
      bus: (globalThis.__bknBuses || []).map(b => Object.values(b.h).reduce((a, l) => a + l.length, 0)),
      raf: frames ? (r.calls - c0) / frames : 0
    }
  })
  const listeners = {}
  for (const expr of ['window', 'document']) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: expr })
    listeners[expr] = (await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId })).listeners.length
    await cdp.send('Runtime.releaseObject', { objectId: result.objectId })
  }
  const { result: proto } = await cdp.send('Runtime.evaluate', { expression: 'Element.prototype' })
  const { objects } = await cdp.send('Runtime.queryObjects', { prototypeObjectId: proto.objectId })
  const { result: cnt } = await cdp.send('Runtime.callFunctionOn', {
    objectId: objects.objectId, returnByValue: true,
    functionDeclaration: 'function () { const ok = e => { try { e.isConnected; return true } catch { return false } }; return this.filter(ok).filter(e => !e.isConnected).length }'
  })
  await cdp.send('Runtime.releaseObject', { objectId: objects.objectId })
  await cdp.send('Runtime.releaseObject', { objectId: proto.objectId })
  return { ...inPage, ...listeners, detached: cnt.value }
}

// n vòng đi qua các màn con, bấm bằng script trong trang (không giữ ElementHandle của Playwright, nên phần tử cũ
// được dọn rác nếu game không giữ lại), không chờ hiệu ứng: bấm ngay khi nút xuất hiện.
function cycle(page, n) {
  return page.evaluate(async n => {
    const wait = (sel, gone = false) => new Promise((res, rej) => {
      const t0 = performance.now()
      const f = () => {
        const el = document.querySelector(sel)
        if (gone ? !el : el) return res(el)
        if (performance.now() - t0 > 8000) return rej(new Error('quá giờ chờ ' + sel))
        requestAnimationFrame(f)
      }
      f()
    })
    const q = id => `[data-testid="${id}"]`
    const tap = async id => (await wait(q(id))).click()
    for (let i = 0; i < n; i++) {
      for (const [open, scr] of [['open-notebook', 'screen-notebook'], ['open-recipe-book', 'screen-recipe-book'], ['open-settings', 'screen-settings'],
        ['open-shop', 'screen-shop'], ['open-quests', 'screen-quests'], ['open-mail', 'screen-mail']]) {
        await tap(open)
        await wait(q(scr))
        if (scr === 'screen-recipe-book') {
          await tap('book-open-banh_mi_op_la'); await wait(q('recipe-detail'))
          await tap('recipe-detail-close'); await wait(q('recipe-detail'), true)
          await tap('recipe-book-tab-tu'); await wait(q('dialect-list'))
        }
        if (scr === 'screen-settings') {
          await tap('open-about'); await wait(q('about-modal'))
          await tap('about-close'); await wait(q('about-modal'), true)
        }
        await tap('meta-back')
        await wait(q('screen-prep'))
      }
      await tap('open-checkin'); await wait(q('checkin-popup'))
      await tap('checkin-close'); await wait(q('checkin-popup'), true)
    }
    return location.href
  }, n)
}

test(`chuyển màn nhanh ${ROUNDS} vòng: không rời trang, Back về Chuẩn bị, không rò bộ nghe / phần tử / vòng rAF`, { timeout: 240000 }, async t => {
  const g = await openGame({ name: 'on-dinh' })
  const { page, context, errors } = g
  try {
    await page.route('**/src/core/bus.js', async route => {
      const resp = await route.fetch()
      const body = (await resp.text()).replace('let handlers = Object.create(null)',
        'let handlers = Object.create(null); (globalThis.__bknBuses = globalThis.__bknBuses || []).push({ get h() { return handlers } })')
      await route.fulfill({ response: resp, body })
    })
    await page.addInitScript(() => {
      const orig = window.requestAnimationFrame.bind(window)
      const probe = { calls: 0, orig }
      window.__rafProbe = probe
      window.requestAnimationFrame = cb => { probe.calls++; return orig(cb) }
    })
    const cdp = await context.newCDPSession(page)
    await page.goto(g.url('/?seed=6'))
    await page.waitForSelector(T('shop-name-input'))
    await page.fill(T('shop-name-input'), 'Xe Ổn Định')
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    const pop = await page.waitForSelector(T('checkin-popup'), { timeout: 3000 }).catch(() => null)
    if (pop) { await page.tap(T('checkin-claim')); await page.waitForSelector(T('checkin-popup'), { state: 'detached' }) }
    await page.waitForTimeout(3500)   // thông báo thư mới tự tắt
    const url0 = page.url()

    await cycle(page, 2)
    const a = await measure(page, cdp)
    assert.ok(a.bus.length >= 1 && a.bus[0] > 0, 'đếm được bộ nghe bus')
    const href = await cycle(page, ROUNDS)
    assert.equal(href, url0, 'vẫn ở trang game')
    await page.waitForTimeout(300)
    const b = await measure(page, cdp)
    t.diagnostic(`trước: ${JSON.stringify(a)}`)
    t.diagnostic(`sau ${ROUNDS} vòng: ${JSON.stringify(b)}`)
    assert.equal(page.url(), url0)
    assert.equal(await page.getAttribute('#screen', 'data-screen'), 'prep')
    assert.deepEqual(b.bus, a.bus, `bộ nghe bus: ${a.bus} → ${b.bus}`)
    assert.equal(b.window, a.window, `bộ nghe window: ${a.window} → ${b.window}`)
    assert.equal(b.document, a.document, `bộ nghe document: ${a.document} → ${b.document}`)
    assert.ok(Math.abs(b.dom - a.dom) <= 20, `số phần tử màn Chuẩn bị: ${a.dom} → ${b.dom}`)
    assert.ok(b.detached <= a.detached + 60, `phần tử tách rời còn giữ: ${a.detached} → ${b.detached}`)
    assert.ok(Math.round(b.raf) === 1, `số vòng rAF ở màn Chuẩn bị: ${b.raf}`)

    // Back của điện thoại: màn con → Chuẩn bị, vẫn ở trong game
    for (const [open, scr] of [['open-shop', 'screen-shop'], ['open-notebook', 'screen-notebook'], ['open-settings', 'screen-settings']]) {
      await page.tap(T(open))
      await page.waitForSelector(T(scr))
      await page.goBack()
      await page.waitForSelector(T('screen-prep'))
      assert.equal(page.url(), url0)
    }
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
