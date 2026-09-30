// E2E giao diện M2: Nấu thử ở Chợ Công Thức (Thớt sơ chế + mini-game, không tốn tiền, không tính thạo món),
// sự kiện ngày + Phiếu Chợ Sớm ở màn Chuẩn bị, và soát bố cục các màn M2 ở màn hẹp 360×740
// (không tràn ngang, vùng chạm ≥ 44px, chữ ≥ 14px).
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, readSave, waitSave, playBoard } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { encodeSave, SAVE_KEY } from '../../src/core/save.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { refreshMeta } from '../../src/core/meta.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { playShift } from '../helpers/perfect-player.mjs'
import { makeMetaCtx } from '../helpers/meta-helpers.mjs'

// Save đã chơi `shifts` ca, mỗi ca một ngày thật từ `at`. Seed 3: ngày game 4 là "Trời mưa" (M4 vẫn đúng với sự kiện ngày
// bốc tuần tự, kiểm bằng `node tools/tim-seed.mjs mua-ngay-4`; hàm dựng có bản sao ở tools/tim-seed.mjs).
function builtSave({ seed = 3, shifts = 3, at = '2026-09-26T08:00' } = {}) {
  const ctx = makeMetaCtx({ at, attach: true })
  const state = defaultState(seed, DATA)
  ctx.setState(state)
  state.shopName = 'Xe Kiểm Thử'
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  for (let i = 0; i < shifts; i++) {
    playShift(state, ctx)
    ctx.clock.t += 24 * 3600 * 1000
  }
  refreshMeta(state, makeNowInfo(state, ctx.clock.t), ctx)
  return state
}

async function seedSave(page, state) {
  await page.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('bkn.seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('bkn.seeded', '1') }
  }, [SAVE_KEY, encodeSave(state)])
}

async function enterPrep(g, devNow, extra = '') {
  const { page } = g
  await page.goto(g.url('/?devNow=' + devNow + extra))
  await page.waitForSelector(T('start-button'))
  await page.tap(T('start-button'))
  await page.waitForSelector(T('screen-prep'))
}

// Soát bố cục màn hiện tại: tràn ngang, chữ < 14px, nút/ô chạm < 44px (chỉ phần tử đang hiện).
async function layoutIssues(page) {
  return page.evaluate(() => {
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
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
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
    for (const el of document.querySelectorAll('button, a, input, select, [role=button], summary')) {
      if (!vis(el) || el.type === 'checkbox') continue
      const b = el.getBoundingClientRect()
      if (b.height < 43.5 || b.width < 43.5) out.push(`vùng chạm ${Math.round(b.width)}×${Math.round(b.height)} ở ${name(el)}`)
    }
    return out
  })
}

test('nấu thử: chọn nguyên liệu + Thớt sơ chế, không tốn tiền, không tính thạo món, về Chợ Công Thức', { timeout: 180000 }, async () => {
  const g = await openGame({ name: 'm2-nau-thu' })
  const { page, errors } = g
  try {
    const state = builtSave()
    state.checkin.lastDay = '2026-09-29'
    await seedSave(page, state)
    await enterPrep(g, '2026-09-29T09:00', '&test=1')
    const before = await readSave(page)
    await page.tap(T('open-shop'))
    await page.waitForSelector(T('shop-item-banh_trang_tron'))
    await page.tap(T('shop-trial-banh_trang_tron'))
    await page.waitForSelector(T('screen-tasting'))
    assert.match(await page.textContent(T('tasting-label')), /Nấu thử/)
    // không có nút về dây phiếu / bỏ món trong nấu thử
    await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
    assert.equal(!!(await page.$(T('kitchen-back'))), false)
    const recipe = DATA.RECIPES.banh_trang_tron
    for (const id of requiredIngredients(recipe, []).required) await page.click(T('shelf-' + id))
    await page.click(T('chon-done'))
    await page.waitForSelector(T('board'))
    assert.equal(!!(await page.$(T('abandon-dish'))), false)
    await playBoard(g, recipe)
    await page.click(T('finish-dish'))
    const res = await page.waitForSelector(T('tasting-result'), { timeout: 10000 })
    assert.ok(await res.getAttribute('data-grade'))
    const after = await waitSave(page, s => !s.tasting && (s.shop.tried || []).includes('banh_trang_tron'))
    assert.equal(after.wallet, before.wallet, 'nấu thử không được tốn tiền')
    assert.equal(after.recipes.banh_trang_tron, undefined, 'nấu thử không phải mua món')
    assert.deepEqual(after.recipes.banh_mi_op_la, before.recipes.banh_mi_op_la, 'nấu thử không tính thạo món')
    assert.deepEqual(after.daily.quests.map(q => q.progress), before.daily.quests.map(q => q.progress), 'nấu thử không đếm Việc hôm nay')
    assert.equal(after.shift, null)
    // về Chợ Công Thức: lượt nấu thử miễn phí đã dùng
    await page.tap(T('tasting-back'))
    await page.waitForSelector(T('screen-shop'))
    assert.equal(await page.isDisabled(T('shop-trial-banh_trang_tron')), true)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('sự kiện ngày Trời mưa: chọn Căng bạt + Phiếu Chợ Sớm ở màn Chuẩn bị, ca mở với hiệu ứng và thông báo', { timeout: 120000 }, async () => {
  const g = await openGame({ name: 'm2-su-kien-ngay' })
  const { page, errors } = g
  try {
    const state = builtSave()
    state.checkin.lastDay = '2026-09-29'
    state.items.phieu_cho_som = 1
    await seedSave(page, state)
    await enterPrep(g, '2026-09-29T09:00')
    await page.waitForSelector(`${T('day-event-card')}[data-event="troi_mua"]`)
    await page.tap(T('day-event-choice-cang_bat'))
    await page.waitForSelector(`${T('day-event-choice-cang_bat')}[aria-pressed="true"]`)
    await page.tap(T('use-coupon'))
    await page.waitForSelector(`${T('use-coupon')}[aria-pressed="true"]`)
    const w0 = (await readSave(page)).wallet
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    await page.waitForSelector(T('day-event-toast'))
    const s = await waitSave(page, st => !!st.shift)
    assert.equal(s.shift.mods.dayEvent.id, 'troi_mua')
    assert.equal(s.shift.mods.dayEvent.choice, 'cang_bat')
    assert.equal(s.shift.mods.cogsMul, 0.8)
    assert.equal(s.items.phieu_cho_som, 0)
    assert.equal(s.wallet, w0 - 20000, 'tiền căng bạt trừ lúc mở ca')
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

test('màn M2 ở 360×740: không tràn ngang, vùng chạm ≥ 44px, chữ ≥ 14px', { timeout: 180000 }, async () => {
  const g = await openGame({ name: 'm2-hep', viewport: { width: 360, height: 740 } })
  const { page, errors } = g
  const problems = []
  const check = async label => {
    await page.waitForTimeout(150)
    for (const p of await layoutIssues(page)) problems.push(`${label}: ${p}`)
  }
  try {
    const state = builtSave({ at: '2026-11-12T08:00' })
    state.goldSpoons = 40
    state.items.phieu_cho_som = 1
    await seedSave(page, state)
    // điểm danh tự bật lần đầu trong ngày thật
    await page.goto(g.url('/?devNow=2026-11-15T09:00'))
    await page.tap(T('start-button'))
    await page.waitForSelector(T('checkin-popup'))
    await check('điểm danh')
    await page.tap(T('checkin-claim'))
    await page.waitForSelector(T('checkin-popup'), { state: 'detached', timeout: 5000 })
    await page.waitForSelector(T('event-card'))
    await check('Chuẩn bị')
    for (const tab of ['recipes', 'upgrades', 'spoons']) {
      await page.tap(T('open-shop'))
      await page.tap(T('shop-tab-' + tab))
      await check('Chợ Công Thức ' + tab)
      await page.tap(T('meta-back'))
      await page.waitForSelector(T('screen-prep'))
    }
    for (const [open, screen] of [['open-quests', 'screen-quests'], ['open-mail', 'screen-mail'], ['open-event', 'screen-event']]) {
      await page.tap(T(open))
      await page.waitForSelector(T(screen))
      await check(screen)
      await page.tap(T('meta-back'))
      await page.waitForSelector(T('screen-prep'))
    }
    await page.$eval(T('dream-card'), el => el.scrollIntoView({ block: 'center' }))
    await page.tap(T('dream-card'))
    await page.waitForSelector(T('screen-stage-up'))
    await check('lên chặng')
    assert.deepEqual(problems, [], 'lỗi bố cục:\n' + problems.join('\n'))
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
