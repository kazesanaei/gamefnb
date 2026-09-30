// E2E M4 hàng hiếm (giao diện thật, Chromium 390×844, ?devNow=…T12:00 giờ Việt Nam trên localhost):
//  save ngày 4 dựng sẵn (tests/helpers/m4-saves.mjs builtRareSave: đủ 3 mảnh Trà tắc mật ong rừng + 1 phần mật ong từ
//  thư 0.4.0) → thẻ phiên hàng "Xe ba gác trưa" đang mở → Lựa hàng (lựa đúng 2 món hàng hiếm, bỏ qua hàng thường dễ nhầm)
//  → kho tăng đúng số phần nhận → tải lại trang: phiên đã ghé, không nhận lần 2 → nấu thử mở món hiếm (không tốn hàng
//  hiếm) → Sổ công thức nhóm "Công thức hiếm" → mở ca: khách đầu gọi món ★, quầy hiện "★ còn n", kệ bếp hiện "còn n"
//  → nấu, Ra món → kho giảm đúng số phần khách gọi.
// Seed 3 (`node tools/tim-seed.mjs mon-hiem`): khách đầu tiên của ca gọi 2 ly Trà tắc mật ong rừng.
import test from 'node:test'
import assert from 'node:assert/strict'
import { T, openGame, readSave, waitSave, seedSave, enterPrep, playBoard, waitCustomerOrEnd, serveAtCounter, cookAndServe } from './helpers.mjs'
import { DATA } from '../../src/data/index.js'
import { requiredIngredients } from '../../src/core/scoring.js'
import { builtRareSave, RARE_AT, playedSave, vnStamp } from '../helpers/m4-saves.mjs'
import { newRecipeProgress } from '../../src/core/state.js'

const SEED = 3
const RID = 'tra_tac_mat_ong'
const ING = 'mat_ong_rung'
const STALL = 'ba_gac_trua'

// Cuộn phần tử vào giữa màn (để chụp ảnh) rồi chờ vẽ lại.
async function center(page, sel, block = 'center') {
  await page.evaluate(([s, b]) => { const el = document.querySelector(s); if (el) el.scrollIntoView({ block: b }) }, [sel, block])
  await page.waitForTimeout(200)
}

test('hàng hiếm: phiên hàng 12:00 → Lựa hàng → kho tăng; tải lại không nhận lần 2; nấu thử mở món; khách gọi món ★ → kho giảm đúng', { timeout: 600000 }, async () => {
  const g = await openGame({ clock: true, name: 'hang-hiem' })
  const { page, errors } = g
  try {
    await seedSave(page, builtRareSave(SEED))
    await enterPrep(g, `?devNow=${RARE_AT}`)
    const s0 = await waitSave(page, st => st.day === 4)
    const stock0 = { ...s0.rare.stock }

    // ---- Màn Chuẩn bị: thẻ phiên hàng đang mở + kho hàng hiếm ----
    const card = await page.waitForSelector(T('stall-card'))
    assert.equal(await card.getAttribute('data-state'), 'open')
    assert.equal(await card.getAttribute('data-stall'), STALL)
    const cardText = await card.textContent()
    assert.match(cardText, /Xe ba gác trưa · Chú Tư/)
    assert.match(cardText, /Xe ba gác trưa 11:00–13:30 · đang mở/)
    assert.match(cardText, /Chợ sớm 05:00–09:00/)
    assert.match(cardText, /Gánh đặc sản tối 17:30–21:00/)
    assert.equal(Number(await page.getAttribute(T('rare-stock-' + ING), 'data-n')), stock0[ING] || 0)
    assert.equal(await page.getAttribute(T('rare-fragments-' + RID), 'data-status'), 'ready')
    await center(page, T('stall-card'))
    await g.shot('the-phien-hang')

    // ---- Lựa hàng ----
    await page.tap(T('open-market'))
    await page.waitForSelector(T('market-intro'))
    assert.equal(await page.getAttribute(T('market-intro'), 'data-stall'), STALL)
    await g.shot('phien-hang-gioi-thieu')
    await page.tap(T('stall-start'))
    await page.waitForSelector(`${T('market-stage')} ${T('minigame-stage')}[data-type="chon"]`)
    const goods = DATA.STALLS.find(s => s.id === STALL).goods
    // kệ 9 ô: hàng hiếm + hàng thường dễ nhầm (bẫy)
    assert.equal((await page.$$('[data-testid^="shelf-"].chon-cell')).length, 9)
    for (const trap of DATA.INGREDIENTS[ING].traps) assert.ok(await page.$(T('shelf-' + trap)), 'kệ có hàng dễ nhầm ' + trap)
    for (const id of goods) await page.click(T('shelf-' + id))
    await g.shot('lua-hang')
    await page.click(T('chon-done'))
    const res = await page.waitForSelector(T('market-result'))
    assert.equal(await res.getAttribute('data-score'), '100')
    const got = Number(await res.getAttribute('data-got'))
    assert.equal(got, 2, 'lựa đúng 100 điểm: 1 phần + 1 phần thưởng')
    const s1 = await waitSave(page, st => (st.rare.today.stalls || []).includes(STALL) && !st.rare.pendingStall)
    let added = 0
    for (const id of goods) {
      const n = (s1.rare.stock[id] || 0) - (stock0[id] || 0)
      added += n
      if (n > 0) assert.match(await page.textContent(T('market-got-' + id)), new RegExp(`\\+${n} phần ${DATA.INGREDIENTS[id].name}`))
    }
    assert.equal(added, got, 'kho tăng đúng số phần nhận')
    assert.equal(s1.wallet, s0.wallet, 'hàng hiếm không trừ Tiền quán')
    await g.shot('lua-hang-ket-qua')
    await page.tap(T('market-done'))
    await page.waitForSelector(T('screen-prep'))
    assert.equal(Number(await page.getAttribute(T('rare-stock-' + ING), 'data-n')), s1.rare.stock[ING])
    assert.equal(await page.getAttribute(T('stall-card'), 'data-state'), 'done')

    // ---- Tải lại trang: phiên đã ghé hôm nay, không nhận lần 2 ----
    await page.reload()
    await page.waitForSelector(T('start-button'))
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    const card2 = await page.waitForSelector(T('stall-card'))
    assert.equal(await card2.getAttribute('data-state'), 'done')
    assert.match(await card2.textContent(), /Hôm nay đã ghé/)
    assert.equal(!!(await card2.$(T('open-market'))), false, 'không còn nút vào phiên đã ghé')
    const s2 = await readSave(page)
    assert.deepEqual(s2.rare.stock, s1.rare.stock, 'tải lại không đổi kho')
    assert.deepEqual(s2.rare.today.stalls, [STALL])
    await center(page, T('rare-stock-card'), 'start')
    await g.shot('kho-hang-hiem')

    // ---- Nấu thử mở món hiếm (hộp cát: không tốn hàng hiếm, không tốn Tiền quán) ----
    const recipe = DATA.RECIPES[RID]
    let unlocked = false
    await page.tap(T('rare-taste-' + RID))
    await page.waitForSelector(T('screen-tasting'))
    for (let attempt = 0; attempt < 3 && !unlocked; attempt++) {
      await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
      for (const id of requiredIngredients(recipe, []).required) await page.click(T('shelf-' + id))
      await page.click(T('chon-done'))
      await page.waitForSelector(T('board'))
      await playBoard(g, recipe)
      await page.click(T('finish-dish'))
      await page.waitForSelector(T('tasting-result'), { timeout: 10000 })
      unlocked = !!(await page.waitForSelector(`${T('tasting-unlocked')}, ${T('tasting-not-yet')}`)
        .then(el => el.getAttribute('data-testid')).then(id => id === 'tasting-unlocked'))
      if (!unlocked) await page.tap(T('tasting-retry'))
    }
    assert.ok(unlocked, 'nấu thử đạt hạng Được là mở món')
    await g.shot('nau-thu-mo-mon')
    const s3 = await waitSave(page, st => !!st.recipes[RID] && !st.tasting)
    assert.equal(s3.rare.fragments[RID], undefined, 'mảnh đã dùng để mở món')
    assert.deepEqual(s3.rare.stock, s1.rare.stock, 'nấu thử không trừ kho hàng hiếm')
    assert.equal(s3.wallet, s0.wallet)
    await page.tap(T('tasting-back'))
    await page.waitForSelector(T('screen-prep'))
    const N = s3.rare.stock[ING]
    assert.match(await page.textContent(T('rare-left-' + RID)), new RegExp(`★ còn ${N} phần`))

    // ---- Sổ công thức: nhóm "Công thức hiếm" ----
    await page.tap(T('open-recipe-book'))
    await page.waitForSelector(T('screen-recipe-book'))
    assert.equal(await page.getAttribute(T('book-recipe-' + RID), 'data-status'), 'owned')
    assert.match(await page.textContent(T('book-recipe-' + RID)), /Công thức hiếm/)
    for (const id of Object.keys(DATA.RECIPES).filter(k => DATA.RECIPES[k].source === 'hiem' && k !== RID)) {
      assert.ok(await page.$(T('book-recipe-' + id)), 'Sổ công thức có món hiếm ' + id)
    }
    await center(page, T('book-recipe-' + RID))
    await g.shot('so-cong-thuc-mon-hiem-da-mo')
    // món hiếm chưa mở: tiến độ mảnh + món nền cần có
    const locked = await page.$('[data-testid^="book-rare-"]')
    assert.ok(locked, 'món hiếm chưa mở hiện tiến độ mảnh')
    assert.match(await locked.textContent(), /Mảnh \d\/3/)
    await center(page, '[data-testid^="book-rare-"]')
    await g.shot('so-cong-thuc-hiem')
    await page.tap(T('meta-back'))
    await page.waitForSelector(T('screen-prep'))

    // ---- Mở ca: khách gọi món ★ → quầy "còn n" → bếp "còn n" → Ra món trừ kho ----
    await page.tap(T('open-shift'))
    await page.waitForSelector(T('screen-service'))
    const sh0 = await waitSave(page, st => !!st.shift)
    assert.deepEqual(sh0.shift.rareMenu, [RID], 'món hiếm chốt vào thực đơn lúc mở ca')
    assert.equal(await waitCustomerOrEnd(g, { useClock: true }), 'customer')
    const request = JSON.parse(await page.getAttribute(T('speech-bubble'), 'data-request'))
    const line = request.find(l => l.recipeId === RID)
    assert.ok(line, 'khách đầu gọi món hiếm')
    assert.ok(line.qty <= N, 'đơn không vượt tồn kho')
    await page.waitForSelector(`${T('progress-4')}[data-stage="order"]`)
    assert.equal(await page.getAttribute(T('menu-item-' + RID), 'data-left'), String(N))
    assert.equal((await page.textContent(T('rare-left-' + RID))).trim(), `★ còn ${N}`)
    await g.shot('quay-mon-hiem')
    const order = await serveAtCounter(g)
    const sClip = await waitSave(page, st => st.shift && st.shift.tickets.some(t => t.id === order.ticketId))
    assert.equal(sClip.rare.stock[ING], N, 'kẹp phiếu chưa trừ kho (trừ lúc Ra món)')
    let shelfChecked = false
    const out = await cookAndServe(g, order.ticketId, {
      shots: false,
      onChon: async (l) => {
        if (l.recipeId !== RID) return
        assert.equal((await page.textContent(T('shelf-left-' + ING))).trim(), `còn ${N}`)
        await center(page, T('shelf-' + ING))
        await g.shot('bep-mon-hiem')
        shelfChecked = true
      }
    })
    assert.ok(shelfChecked, 'kệ bếp của món hiếm hiện "còn n"')
    const sServed = await waitSave(page, st => st.shift && st.shift.customers[out.customerId].status === 'roi_di')
    assert.equal(sServed.rare.stock[ING], N - line.qty, `Ra món trừ đúng ${line.qty} phần mật ong`)
    assert.ok(out.stars >= 3, `khách chấm ${out.stars} sao`)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// Vòng soát lỗi M4 (M4R-02): lựa hàng dở, đã chọn nhầm hàng thường → tải lại trang → "Lựa tiếp" khôi phục đúng rổ và
// lần nhầm (trước đây tải lại là được lượt mới sạch, luôn 100 điểm).
test('lựa hàng dở: chọn nhầm → tải lại trang → "Lựa tiếp" giữ rổ và lần nhầm; điểm 85, có thẻ Mẹo "Kiểm hàng", chỉ 1 phần', { timeout: 300000 }, async () => {
  const g = await openGame({ clock: true, name: 'lua-tiep' })
  const { page, errors } = g
  try {
    await seedSave(page, builtRareSave(SEED))
    await enterPrep(g, `?devNow=${RARE_AT}`)
    const s0 = await waitSave(page, st => st.day === 4)
    await page.tap(T('open-market'))
    await page.tap(T('stall-start'))
    await page.waitForSelector(`${T('market-stage')} ${T('minigame-stage')}[data-type="chon"]`)
    const goods = DATA.STALLS.find(s => s.id === STALL).goods
    const trap = DATA.INGREDIENTS[goods[0]].traps[0]
    await page.click(T('shelf-' + trap))
    await page.click(T('shelf-' + goods[0]))
    const mid = await waitSave(page, st => st.rare.pendingStall && st.rare.pendingStall.mistakes === 1 && (st.rare.pendingStall.picked || []).length === 2)
    assert.deepEqual(mid.rare.pendingStall.picked.slice().sort(), [trap, goods[0]].sort())
    // tải lại trang giữa lượt
    await page.reload()
    await page.waitForSelector(T('start-button'))
    await page.tap(T('start-button'))
    await page.waitForSelector(T('screen-prep'))
    assert.equal(await page.getAttribute(T('stall-card'), 'data-state'), 'pending')
    await page.tap(T('open-market'))
    assert.match(await page.textContent(T('stall-start')), /Lựa tiếp/)
    await page.tap(T('stall-start'))
    await page.waitForSelector(`${T('market-stage')} ${T('minigame-stage')}[data-type="chon"]`)
    // rổ khôi phục: hàng nhầm và món đúng đã chọn vẫn nằm trong rổ
    assert.equal(await page.getAttribute(T('shelf-' + trap), 'aria-pressed'), 'true')
    assert.equal(await page.getAttribute(T('shelf-' + goods[0]), 'aria-pressed'), 'true')
    await g.shot('lua-tiep-khoi-phuc')
    await page.click(T('shelf-' + trap))           // bỏ hàng nhầm ra (lần nhầm vẫn tính)
    await page.click(T('shelf-' + goods[1]))
    await page.click(T('chon-done'))
    const res = await page.waitForSelector(T('market-result'))
    assert.equal(await res.getAttribute('data-score'), '85')
    assert.equal(await res.getAttribute('data-got'), '1', 'dưới 90 điểm: không có phần thưởng thêm')
    assert.ok(await page.$(T('market-tip')), 'thẻ Mẹo nghề "Kiểm hàng"')
    await g.shot('lua-tiep-ket-qua')
    const s1 = await waitSave(page, st => !st.rare.pendingStall && (st.rare.today.stalls || []).includes(STALL))
    const added = goods.reduce((a, id) => a + (s1.rare.stock[id] || 0) - (s0.rare.stock[id] || 0), 0)
    assert.equal(added, 1)
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})

// Vòng soát lỗi M4 (UX-02): màn 360×740, bước Nêm nhiều chai của món hiếm mới (Bánh tráng trộn Tây Ninh, 3 chai) — các chai
// nằm một hàng, không đè chữ hướng dẫn, bấm được nút Xong ở tâm nút (trước đây lưới chai tràn xuống che nút Xong).
test('màn 360×740: bước Nêm 3 chai (món hiếm) không che nút Xong, không đè chữ hướng dẫn, bấm Xong được', { timeout: 300000 }, async () => {
  const g = await openGame({ clock: true, name: 'nem-360', viewport: { width: 360, height: 740 } })
  const { page, errors } = g
  const RID2 = 'banh_trang_tron_tay_ninh'
  try {
    const { state, next } = playedSave(11, 3, { name: 'Xe Nêm Nhỏ' })
    const base = DATA.RECIPES[RID2].baseRecipe
    if (!state.recipes[base]) state.recipes[base] = newRecipeProgress(0)
    state.rare.fragments[RID2] = 3
    await seedSave(page, state)
    await enterPrep(g, `?devNow=${vnStamp(next + 2 * 3600 * 1000)}`)
    for (let i = 0; i < 3; i++) {
      const popup = await page.$(T('checkin-popup'))
      if (popup) { await page.click(T('checkin-claim')); await page.waitForSelector(T('checkin-popup'), { state: 'detached' }) }
      const later = await page.$(T('stage-up-later'))
      if (later) { await later.tap(); await page.waitForTimeout(300) }
    }
    await center(page, T('rare-taste-' + RID2))
    await page.tap(T('rare-taste-' + RID2))
    await page.waitForSelector(`${T('minigame-stage')}[data-type="chon"]`)
    for (const id of requiredIngredients(DATA.RECIPES[RID2], []).required) await page.click(T('shelf-' + id))
    await page.click(T('chon-done'))
    await page.waitForSelector(T('board'))
    const step = DATA.RECIPES[RID2].steps.find(x => x.type === 'cham' && x.params && x.params.mode === 'targets')
    await page.click(T('board-step-' + step.id))
    const sheet = await page.waitForSelector(T('step-sheet'), { timeout: 800 }).catch(() => null)
    if (sheet) await page.click(T('step-start'))
    const hint = await page.waitForSelector(T('step-hint'), { timeout: 800 }).catch(() => null)
    if (hint) await hint.tap().catch(() => {})
    await page.waitForSelector(T('cham-done'))
    await page.waitForTimeout(300)
    const m = await page.evaluate(() => {
      const st = document.querySelector('[data-testid="minigame-stage"]')
      const done = st.querySelector('[data-testid="cham-done"]').getBoundingClientRect()
      const at = document.elementFromPoint(done.left + done.width / 2, done.top + done.height / 2)
      const sub = st.querySelector('.mg-sub').getBoundingClientRect()
      const bottles = [...st.querySelectorAll('.cham-bottle')].map(b => b.getBoundingClientRect())
      return { hitDone: !!(at && at.closest('[data-testid="cham-done"]')), subBottom: sub.bottom, doneTop: done.top,
        tops: bottles.map(b => Math.round(b.top)), top: Math.min(...bottles.map(b => b.top)), bottom: Math.max(...bottles.map(b => b.bottom)),
        right: Math.max(...bottles.map(b => b.right)), vw: innerWidth }
    })
    assert.equal(m.tops.length, Object.keys(step.params.targets).length)
    assert.equal(new Set(m.tops).size, 1, 'các chai nằm một hàng')
    assert.ok(m.top >= m.subBottom, 'chai không đè chữ hướng dẫn')
    assert.ok(m.bottom <= m.doneTop, 'chai không che nút Xong')
    assert.ok(m.right <= m.vw, 'không tràn ngang')
    assert.ok(m.hitDone, 'tâm nút Xong bấm được')
    await g.shot('nem-3-chai')
    for (const [id, n] of Object.entries(step.params.targets)) for (let k = 0; k < n; k++) await page.tap(T('cham-bottle-' + id))
    await page.click(T('cham-done'), { timeout: 3000 })
    await page.waitForSelector(`${T('board-step-' + step.id)}.is-done, ${T('step-result')}`, { timeout: 5000 })
    assert.deepEqual(errors, [], 'có lỗi console/trang')
  } finally {
    await g.close()
  }
})
