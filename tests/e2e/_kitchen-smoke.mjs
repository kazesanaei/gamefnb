// Chạy thử khâu Bếp trên trang game thật (không nằm trong bộ e2e chính: tên không có đuôi .e2e.mjs).
// Tạo sẵn save có ca đang chạy + phiếu bếp bằng lõi (Node), nạp vào localStorage, rồi chơi mọi mini-game của các phiếu
// (6 loại cũ + 5 thao tác M5: đập trứng, khuấy, gọt, lắc, bày) bằng Chromium 390×844 (hasTouch), chụp ảnh từng bước.
// Chạy: SHOT_DIR=/đường/dẫn node tests/e2e/_kitchen-smoke.mjs
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { startShift, advance } from '../../src/core/shift.js'
import { saveTo, SAVE_KEY } from '../../src/core/save.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { counterStep } from '../helpers/perfect-player.mjs'
import { startServer } from '../helpers/static-server.mjs'
import { playStage as playStageM5 } from './helpers.mjs'

const require = createRequire(import.meta.url)
function loadPlaywright() {
  try { return require('playwright') } catch { return require('/opt/node22/lib/node_modules/playwright') }
}
const { chromium } = loadPlaywright()
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'kitchen-smoke')
mkdirSync(SHOT_DIR, { recursive: true })

// ---- Chuẩn bị save: ca ngày `day`, người chơi hoàn hảo ở quầy cho tới khi có `want` phiếu ----
function prepareSave({ seed = 7, day = 1, want = 2, before = null } = {}) {
  const ctx = { emit() {}, data: DATA }
  const state = defaultState(seed, DATA)
  state.shopName = 'Xe Thử Bếp'
  state.day = day
  if (before) before(state)
  startShift(state, ctx)
  let guard = 0
  while (state.shift.tickets.length < want && guard++ < 4000) {
    advance(state, 0.5, ctx)
    let moved = true
    while (moved) moved = counterStep(state, ctx)
  }
  assert.ok(state.shift.tickets.length >= 1, 'không tạo được phiếu')
  return finalize(state)
}

function finalize(state) {
  const store = new Map()
  saveTo({ getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) }, state)
  return { state, raw: store.get(SAVE_KEY) }
}

const T = id => `[data-testid="${id}"]`

async function openPage(browser, srv, raw) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  await page.addInitScript(([key, value]) => {
    if (!sessionStorage.getItem('smoke.seeded')) {
      localStorage.clear()
      localStorage.setItem(key, value)
      sessionStorage.setItem('smoke.seeded', '1')
    }
  }, [SAVE_KEY, raw])
  await page.goto(srv.url)
  await page.waitForSelector(T('tab-kitchen'))
  return { page, errors }
}

let shotNo = 0
const shotter = page => async name => page.screenshot({ path: path.join(SHOT_DIR, `${String(++shotNo).padStart(2, '0')}-${name}.png`) })

async function run() {
  const srv = await startServer(0)
  const browser = await chromium.launch()
  try {
    await scenarioBasic(browser, srv)
    await scenarioAdvanced(browser, srv)
  } finally {
    await browser.close()
    await srv.close()
  }
  console.log('Ảnh ở:', SHOT_DIR)
}

// Ngày 1: 2 phiếu hướng dẫn, chơi đủ 6 loại mini-game, chuyển tab / tải lại giữa bước.
async function scenarioBasic(browser, srv) {
  const { state, raw } = prepareSave()
  const { page, errors } = await openPage(browser, srv, raw)
  const shot = shotter(page)
  await page.waitForSelector(T('tab-kitchen'))
  await page.click(T('tab-kitchen'))
  await page.waitForSelector(T('kitchen'))
  await shot('rail')

  const results = []
  const tickets = state.shift.tickets.map(t => ({ id: t.id, lines: t.lines }))
  let first = true
  for (const t of tickets) {
    for (let i = 0; i < t.lines.length; i++) {
      const line = t.lines[i]
      const recipe = DATA.RECIPES[line.recipeId]
      await page.click(T('ticket-' + t.id))
      await page.click(T('cook-line-' + i))
      await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
      await shot(`chon-${recipe.id}`)
      const req = requiredIngredients(recipe, line.notes)
      if (first) {
        // thiếu nguyên liệu chính → bị chặn, có thông báo
        await page.click(T('chon-done'))
        const msg = await page.textContent('.chon-msg')
        assert.equal(msg, 'Còn thiếu nguyên liệu chính')
        await shot('chon-thieu-chinh')
        await page.waitForTimeout(1600)
      }
      for (const id of req.required) await page.click(T('shelf-' + id))
      await shot(`chon-picked-${recipe.id}`)
      await page.click(T('chon-done'))
      await page.waitForSelector(T('board'))
      await shot(`board-${recipe.id}`)

      let testedResume = !first
      for (let guard = 0; guard < 20; guard++) {
        const next = await page.$('.k-step.is-available')
        if (!next) break
        const stepId = await next.getAttribute('data-step-id')
        const def = recipe.steps.find(s => s.id === stepId)
        await next.click()
        if (await page.$(T('step-sheet'))) {
          if (def.method) await page.click(T('method-' + def.method.correct))
          else await page.click(T('step-start'))
        }
        const hint = await page.waitForSelector(T('step-hint'), { timeout: 500 }).catch(() => null)
        if (hint) {
          if (guard === 0) await shot(`hint-${stepId}`)
          await hint.dispatchEvent('pointerdown').catch(() => {})
        }
        await page.waitForSelector(`${T('minigame-stage')}[data-type="${def.type}"] .mg-foot`)
        if (!testedResume && ['cha', 'thai'].includes(def.type)) {
          // chuyển tab giữa chừng → quay lại thì chơi lại từ đầu
          testedResume = true
          await page.click(T('tab-counter'))
          await page.click(T('tab-kitchen'))
          const again = await page.waitForSelector(`${T('minigame-stage')}[data-type="${def.type}"] .mg-foot`, { timeout: 3000 }).catch(() => null)
          assert.ok(again, 'bước dở không được chơi lại sau khi chuyển tab')
          // tải lại trang giữa chừng → cũng chơi lại
          await page.reload()
          await page.waitForSelector(T('tab-kitchen'))
          await page.click(T('tab-kitchen'))
          const h2 = await page.waitForSelector(T('step-hint'), { timeout: 1500 }).catch(() => null)
          if (h2) await h2.dispatchEvent('pointerdown').catch(() => {})
          const again2 = await page.waitForSelector(`${T('minigame-stage')}[data-type="${def.type}"] .mg-foot`, { timeout: 3000 }).catch(() => null)
          assert.ok(again2, 'bước dở không được chơi lại sau khi tải lại trang')
        }
        await playStage(page, def, shot)
        await page.waitForSelector('.k-layer', { state: 'hidden', timeout: 15000 })
        await page.waitForSelector(T('board'))
        const st = await page.textContent(T('board-step-' + stepId) + ' .k-step-st')
        results.push({ recipe: recipe.id, step: stepId, type: def.type, status: st })
      }
      await shot(`board-done-${recipe.id}`)
      await page.click(T('finish-dish'))
      await page.waitForSelector(T('dish-reveal'))
      await page.waitForTimeout(250)
      await shot(`reveal-${recipe.id}`)
      await page.waitForSelector(T('dish-reveal'), { state: 'detached', timeout: 3000 })
      first = false
    }
    await page.waitForSelector(T('serve-ticket'))
    await shot(`serve-${t.id}`)
    await page.click(T('serve-ticket'))
    await page.waitForSelector(T('score-sheet'), { timeout: 3000 }).catch(() => null)
    await shot(`served-${t.id}`)
    await page.waitForTimeout(2400)
  }
  console.table(results)
  const dishes = await page.evaluate(k => localStorage.getItem(k) ? 'ok' : 'none', SAVE_KEY)
  console.log('save:', dishes)
  console.log('lỗi trang (cơ bản):', errors.length ? errors : 'không có')
  await page.close()
  assert.deepEqual(errors, [])
  for (const r of results) assert.ok(!/—|Chạm/.test(r.status), `bước ${r.step} chưa có kết quả`)
}

// Ngày 6, bánh mì đã thạo cấp 2: có ghi chú, Tự làm, chọn sai cách, trứng cháy → Làm lại, Ra món sớm, phiếu đỏ.
async function scenarioAdvanced(browser, srv) {
  let prepared = null
  let fallback = null
  for (let seed = 11; seed < 400 && !prepared; seed++) {
    const p = prepareSave({
      seed, day: 6, want: 1,
      before: st => { st.recipes.banh_mi_op_la.goodCooks = 5; st.recipes.banh_mi_op_la.cooks = 6; st.recipes.tra_tac.cooks = 6 }
    })
    const t = p.state.shift.tickets[0]
    const i = t.lines.findIndex(l => l.recipeId === 'banh_mi_op_la' && !(l.notes || []).includes('khong_hanh'))
    if (i < 0) continue
    const l = t.lines[i]
    // ưu tiên dòng có ghi chú hoặc số lượng > 1
    if ((l.notes || []).length || l.qty > 1) prepared = { ...p, ticket: t, lineIndex: i, seed }
    else if (!fallback) fallback = { ...p, ticket: t, lineIndex: i, seed }
  }
  prepared = prepared || fallback
  assert.ok(prepared, 'không tìm được phiếu bánh mì ngày 6')
  // phiếu đã chờ 85% ngân sách → viền đỏ
  const { state, ticket, lineIndex } = prepared
  const cust = state.shift.customers[ticket.customerId]
  cust.waitStart = state.shift.t - 0.85 * cust.waitBudget
  const { raw } = finalize(state)
  const { page, errors } = await openPage(browser, srv, raw)
  const shot = shotter(page)
  const line = ticket.lines[lineIndex]
  const recipe = DATA.RECIPES.banh_mi_op_la
  console.log('Kịch bản nâng cao: seed', prepared.seed, 'dòng', JSON.stringify(line))
  await page.click(T('tab-kitchen'))
  await page.waitForSelector(T('ticket-' + ticket.id))
  assert.equal(await page.getAttribute(T('ticket-' + ticket.id), 'data-wait'), 'red')
  await shot('adv-rail-do')
  await page.click(T('ticket-' + ticket.id))
  await page.click(T('cook-line-' + lineIndex))
  await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
  // lấy nhầm nước mắm (bẫy) thay nước tương
  const req = requiredIngredients(recipe, line.notes).required.filter(id => id !== 'nuoc_tuong')
  for (const id of [...req, 'nuoc_mam']) await page.click(T('shelf-' + id))
  await shot('adv-chon')
  await page.click(T('chon-done'))
  await page.waitForSelector(T('board'))
  assert.equal(!!(await page.$(T('board-step-nem'))), false, 'không lấy nước tương thì không có bước nêm')
  // Tự làm bước rửa dưa (w = 1, thạo cấp 2)
  await page.click(T('board-step-rua_dua'))
  await page.click(T('auto-step'))
  await page.waitForSelector(`${T('board-step-rua_dua')}.is-done`)
  // Thái dưa: chọn sai cách (Thái sợi) → −15
  await page.click(T('board-step-thai_dua'))
  await page.waitForSelector(T('method-thai_soi'))
  await shot('adv-method')
  await page.click(T('method-thai_soi'))
  await page.waitForSelector(`${T('minigame-stage')}[data-type="thai"] .mg-foot`)
  await playStage(page, recipe.steps.find(s => s.id === 'thai_dua'), shot)
  await page.waitForSelector('.k-layer', { state: 'hidden', timeout: 15000 })
  const thaiSt = await page.textContent(T('board-step-thai_dua') + ' .k-step-st')
  assert.match(thaiSt, /85/, 'sai cách phải trừ 15: ' + thaiSt)
  // Đập trứng (M5: thao tác dap — canh kim lực rồi vuốt xuống) rồi để trứng cháy (không bấm Nhấc)
  await page.click(T('board-step-dap_trung'))
  if (await page.$(T('step-sheet'))) await page.click(T('step-start'))
  await page.waitForSelector(`${T('minigame-stage')}[data-type="dap"] .mg-foot`)
  await playStage(page, recipe.steps.find(s => s.id === 'dap_trung'), shot)
  await page.waitForSelector('.k-layer', { state: 'hidden', timeout: 15000 })
  await page.click(T('board-step-chien_trung'))
  if (await page.$(T('step-sheet'))) await page.click(T('step-start'))
  await page.waitForSelector(`${T('minigame-stage')}[data-type="lua"] .mg-foot`)
  await page.waitForSelector(T('critical-prompt'), { timeout: 15000 })
  await shot('adv-chay')
  await page.click(`${T('critical-prompt')} ${T('retry-step')}`)
  await page.waitForSelector(`${T('minigame-stage')}[data-type="lua"] .mg-foot`)
  await playStage(page, recipe.steps.find(s => s.id === 'chien_trung'), shot)
  await page.waitForSelector('.k-layer', { state: 'hidden', timeout: 15000 })
  const luaSt = await page.textContent(T('board-step-chien_trung') + ' .k-step-st')
  assert.match(luaSt, /85/, 'làm lại tối đa 85: ' + luaSt)
  await shot('adv-board')
  // Ra món khi còn bước chưa làm (nếu có) → hỏi xác nhận
  const left = await page.$$('.k-step.is-available')
  await page.click(T('finish-dish'))
  if (left.length) {
    await page.waitForSelector(T('confirm-ok'))
    await shot('adv-confirm')
    await page.click(T('confirm-ok'))
  }
  await page.waitForSelector(T('dish-reveal'))
  await page.waitForTimeout(300)
  await shot('adv-reveal')
  const comment = await page.textContent(`${T('dish-reveal')} .k-bubble`)
  console.log('Dì Sáu góp ý:', comment)
  assert.match(comment, /Nước mắm đâu phải nước tương/)
  await page.waitForSelector(T('dish-reveal'), { state: 'detached', timeout: 3000 })
  await shot('adv-after')

  // Dòng còn lại: thử Bỏ món, rồi làm lại và Ra món sớm (còn bước chưa làm → hỏi xác nhận)
  const other = ticket.lines.findIndex((l, i) => i !== lineIndex)
  if (other >= 0) {
    const ol = ticket.lines[other]
    const orec = DATA.RECIPES[ol.recipeId]
    const oreq = requiredIngredients(orec, ol.notes).required
    const openOther = async () => {
      await page.click(T('ticket-' + ticket.id))
      await page.click(T('cook-line-' + other))
      await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
      for (const id of oreq) await page.click(T('shelf-' + id))
      await page.click(T('chon-done'))
      await page.waitForSelector(T('board'))
    }
    await openOther()
    const walletBefore = await page.textContent(T('hud-wallet')).catch(() => '')
    await page.click(T('abandon-dish'))
    await page.waitForSelector(T('confirm-ok'))
    await shot('adv-bo-mon')
    await page.click(T('confirm-ok'))
    await page.waitForSelector(T('ticket-' + ticket.id))
    console.log('Bỏ món: ví trước', walletBefore, '→ phiếu quay lại dây')
    await openOther()
    await page.click(T('finish-dish'))
    await page.waitForSelector(T('confirm-ok'))
    await shot('adv-ra-mon-som')
    await page.click(T('confirm-ok'))
    await page.waitForSelector(T('dish-reveal'))
    const c2 = await page.textContent(`${T('dish-reveal')} .k-bubble`)
    console.log('Dì Sáu góp ý (ra món sớm):', c2)
    assert.match(c2, /quên/)
    await page.waitForSelector(T('dish-reveal'), { state: 'detached', timeout: 3000 })
    await page.click(T('serve-ticket'))
    await page.waitForTimeout(600)
    await shot('adv-giao')
  }
  console.log('lỗi trang (nâng cao):', errors.length ? errors : 'không có')
  await page.close()
  assert.deepEqual(errors, [])
}

// 5 thao tác M5 (đập trứng, khuấy, gọt, lắc, bày): dùng chung bộ giải của tests/e2e/helpers.mjs (chuột, đọc data-*).
const M5_TYPES = ['dap', 'xoay', 'got', 'lac', 'bay']

// Chơi một mini-game theo loại, dùng data-* của sân khấu.
async function playStage(page, def, shot) {
  if (M5_TYPES.includes(def.type)) {
    await playStageM5({ page, shot: label => shot(label) }, def, { shots: true })
    return
  }
  const S = `${T('minigame-stage')}[data-type="${def.type}"]`
  const stage = await page.$(S)
  const box = await stage.boundingBox()
  const mode = def.params && def.params.mode
  if (def.type === 'cha') {
    const spots = await page.$$(`${S} [data-testid^="cha-spot-"]`)
    if (spots.length) {
      for (const sp of spots) {
        const b = await sp.boundingBox()
        const cx = b.x + b.width / 2, cy = b.y + b.height / 2
        await page.mouse.move(cx - 24, cy)
        await page.mouse.down()
        for (let k = 0; k < 5; k++) { await page.mouse.move(cx + 24, cy, { steps: 4 }); await page.mouse.move(cx - 24, cy, { steps: 4 }) }
        await page.mouse.up()
      }
      await shot('cha-spots')
    } else {
      const area = await (await page.$(`${S} ${T('cha-area')}`)).boundingBox()
      const cx = area.x + area.width / 2, cy = area.y + area.height / 2
      await page.mouse.move(cx, cy)
      await page.mouse.down()
      for (let k = 0; k < (def.params.strokes || 6) + 2; k++) await page.mouse.move(cx + (k % 2 ? -70 : 70), cy, { steps: 5 })
      await shot('cha-strokes')
      await page.mouse.up()
    }
  } else if (def.type === 'thai') {
    const guides = await page.$$eval(`${S} [data-testid^="thai-guide-"]`, els => els.map(e => Number(e.dataset.x)))
    const food = await (await page.$(`${S} .thai-food`)).boundingBox()
    const y = food.y + food.height + 40
    for (const [k, gx] of guides.entries()) {
      const x = box.x + gx + (k === 1 ? 3 : 0)
      await page.mouse.move(x - 30, y)
      await page.mouse.down()
      await page.mouse.move(x, y, { steps: 4 })
      if (k === 0) await shot('thai-aim')
      await page.mouse.up()
    }
  } else if (def.type === 'cham' && mode === 'targets') {
    const bottles = await page.$$(`${S} [data-testid^="cham-bottle-"]`)
    for (const b of bottles) {
      const n = Number(await b.getAttribute('data-target'))
      for (let k = 0; k < n; k++) await b.click()
    }
    await shot('cham-targets')
    await page.click(`${S} ${T('cham-done')}`)
  } else if (def.type === 'cham' && mode === 'min') {
    const pad = await page.$(`${S} ${T('cham-pad')}`)
    const n = Number(await pad.getAttribute('data-n'))
    for (let k = 0; k < n + 1; k++) await pad.click()
    await shot('cham-min')
  } else if (def.type === 'cham') {
    const target = await page.$(`${S} ${T('cham-target')}`)
    const n = Number(await target.getAttribute('data-n'))
    for (let k = 0; k < n; k++) await target.click()
    await shot('cham-exact')
    const done = await page.$(`${S} ${T('cham-done')}`)
    if (done) await done.click()
  } else if (def.type === 'lua') {
    // bấm Nhấc khi kim tới tâm vùng (đo trong trang theo từng khung hình)
    await page.evaluate(sel => new Promise(resolve => {
      const st = document.querySelector(sel)
      const zone = st.querySelector('[data-testid="lua-zone"]')
      const c = (Number(zone.dataset.a) + Number(zone.dataset.b)) / 2
      const tick = () => {
        const v = Number(st.querySelector('[data-testid="lua-needle"]').dataset.v)
        if (v >= c - 0.01) {
          st.querySelector('[data-testid="lua-lift"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, pointerId: 7, button: 0 }))
          resolve(v)
        } else requestAnimationFrame(tick)
      }
      tick()
    }), S)
  } else if (def.type === 'rot') {
    await page.evaluate(sel => new Promise(resolve => {
      const st = document.querySelector(sel)
      const zone = st.querySelector('[data-testid="rot-zone"]')
      const c = (Number(zone.dataset.a) + Number(zone.dataset.b)) / 2
      const btn = st.querySelector('[data-testid="rot-pour"]')
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, pointerId: 9, button: 0 }))
      const tick = () => {
        const v = Number(st.querySelector('[data-testid="rot-level"]').dataset.v)
        if (v >= c) {
          btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, isPrimary: true, pointerId: 9, button: 0 }))
          resolve(v)
        } else requestAnimationFrame(tick)
      }
      tick()
    }), S)
    await shot('rot')
    await page.click(`${S} ${T('rot-done')}`)
  } else {
    throw new Error('Không biết chơi mini-game: ' + def.type)
  }
}

run().catch(err => { console.error(err); process.exit(1) })
