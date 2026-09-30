// Sổ tay nghề (src/core/notebook.js) và Sổ công thức (src/core/recipe-book.js), DATA thật:
// 24 thẻ chia 4 nhóm (M4: 20 → 24), thẻ chưa mở có gợi ý cách mở, đủ nhóm → danh hiệu + 20 Muỗng Vàng đúng 1 lần (không nhận trong ca);
// Sổ công thức: đủ món (đã có / Chợ Công Thức / sự kiện / bóng mờ Chặng 2), giá, giá vốn, số lần nấu, điểm cao nhất,
// cấp thạo và mốc kế, huy hiệu "Không tì vết", nguồn; chi tiết món không lộ bẫy; Sổ từ vùng miền từ SYNONYMS.
import test from 'node:test'
import assert from 'node:assert/strict'
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { notebookStatus, notebookBadge, claimNotebookGroup, randomSeenTip } from '../../src/core/notebook.js'
import { recipeBook, recipeDetail, dialectBook, masteryInfo, sourceLabel } from '../../src/core/recipe-book.js'
import { grantReward } from '../../src/core/rewards.js'
import { encodeSave, decodeSave, migrate } from '../../src/core/save.js'
import { playShift } from '../helpers/perfect-player.mjs'

const ctx = () => {
  const events = []
  return { data: DATA, events, emit: (type, payload) => events.push({ type, payload }) }
}
const tipsOf = g => DATA.TIPS.filter(t => t.group === g).map(t => t.id)

// M4 (sửa có chủ ý): thêm 4 thẻ (Soi tiền, Chờ tiền về → Quầy; Kiểm hàng → Kho; Giữ lối đi → Phục vụ, Quản lý).
test('Sổ tay nghề: 24 thẻ chia Quầy 14 / Bếp 5 / Kho 2 / Phục vụ-Quản lý 3; thẻ chưa mở có gợi ý cách mở', () => {
  const c = ctx()
  const s = defaultState(1, DATA)
  const st = notebookStatus(s, c)
  assert.equal(st.total, 24)
  assert.equal(st.unlocked, 0)
  assert.deepEqual(st.groups.map(g => [g.id, g.total]), [['quay', 14], ['bep', 5], ['kho', 2], ['phuc_vu', 3]])
  assert.equal(st.groups[3].name, 'Phục vụ, Quản lý')
  for (const g of st.groups) {
    assert.equal(g.complete, false)
    assert.equal(g.canClaim, false)
    assert.deepEqual(g.reward, { gold: 20, title: DATA.TIP_GROUP_REWARDS[g.id].title })
    assert.ok(g.title && DATA.TITLES[g.title.id] && g.title.name, 'danh hiệu có tên')
    for (const t of g.tips) {
      assert.equal(t.unlocked, false)
      assert.ok(t.hint && t.hint.length > 10, `thẻ ${t.id} thiếu gợi ý cách mở`)
    }
  }
  // mọi thẻ Mẹo nghề đều có gợi ý, tên danh hiệu khác nhau
  for (const t of DATA.TIPS) assert.ok(typeof t.hint === 'string' && /[à-ỹ]/i.test(t.hint), t.id)
  assert.equal(new Set(Object.values(DATA.TIP_GROUP_REWARDS).map(r => r.title)).size, 4)
  assert.equal(randomSeenTip(s, c, () => 0.5), null)
})

test('Sổ tay nghề: đủ một nhóm → danh hiệu + 20 Muỗng Vàng, nhận đúng 1 lần; không nhận khi chưa đủ hoặc đang trong ca', () => {
  const c = ctx()
  const s = defaultState(2, DATA)
  s.tipsSeen = tipsOf('kho').concat(tipsOf('bep').slice(0, 4))
  let st = notebookStatus(s, c)
  const kho = st.groups.find(g => g.id === 'kho')
  const bep = st.groups.find(g => g.id === 'bep')
  assert.equal(kho.complete, true)
  assert.equal(kho.canClaim, true)
  assert.equal(bep.unlocked, 4)
  assert.equal(bep.canClaim, false)
  assert.equal(notebookBadge(s, c), 1)
  assert.equal(claimNotebookGroup(s, 'bep', c).reason, 'chua_xong')
  assert.equal(claimNotebookGroup(s, 'khong_co', c).reason, 'khong_co')
  s.shift = { day: 1 }
  assert.equal(claimNotebookGroup(s, 'kho', c).reason, 'dang_ban')
  s.shift = null
  const g0 = s.goldSpoons, w0 = s.wallet
  const r = claimNotebookGroup(s, 'kho', c)
  assert.ok(r.ok)
  assert.equal(s.goldSpoons, g0 + 20)
  assert.equal(s.wallet, w0, 'thưởng nhóm không có Tiền quán')
  assert.ok(s.titles.includes('giu_kho_ky_luong'))
  assert.deepEqual(s.notebook.claimed, ['kho'])
  assert.ok(c.events.some(e => e.type === 'notebook.claimed' && e.payload.groupId === 'kho'))
  // lần 2: không nhận nữa
  assert.equal(claimNotebookGroup(s, 'kho', c).reason, 'da_nhan')
  assert.equal(s.goldSpoons, g0 + 20)
  st = notebookStatus(s, c)
  assert.equal(st.groups.find(g => g.id === 'kho').claimed, true)
  assert.equal(notebookBadge(s, c), 0)
  // lưu/tải giữ đã nhận
  const back = migrate(decodeSave(encodeSave(s)), DATA)
  assert.deepEqual(back.notebook, { claimed: ['kho'] })
  assert.equal(claimNotebookGroup(back, 'kho', c).reason, 'da_nhan')
  // mở đủ Bếp sau đó → nhận được Bếp (1 lần), Muỗng Vàng cộng dồn
  s.tipsSeen.push(tipsOf('bep')[4])
  assert.ok(claimNotebookGroup(s, 'bep', c).ok)
  assert.equal(s.goldSpoons, g0 + 40)
  assert.ok(s.titles.includes('tay_bep_can_than'))
  // thẻ mở do thưởng chuỗi (tipId) cũng tính
  const t = defaultState(3, DATA)
  for (const id of tipsOf('phuc_vu')) grantReward(t, { tipId: id }, c)
  assert.equal(notebookStatus(t, c).groups.find(g => g.id === 'phuc_vu').canClaim, true)
  // mẹo đã mở hiện ngẫu nhiên
  assert.equal(randomSeenTip(t, c, () => 0).id, tipsOf('phuc_vu')[0])
  // M4: nhóm Phục vụ, Quản lý có 3 thẻ → rand 0,99 rơi vào thẻ cuối
  assert.equal(randomSeenTip(t, c, () => 0.99).id, tipsOf('phuc_vu')[tipsOf('phuc_vu').length - 1])
})

test('Sổ công thức: đủ món theo nguồn (có sẵn, Chợ Công Thức, sự kiện, bóng mờ Chặng 2); giá, giá vốn, lãi', () => {
  const c = ctx()
  const s = defaultState(4, DATA)
  const b = recipeBook(s, c)
  const byId = id => b.entries.find(e => e.id === id)
  // M4 (sửa có chủ ý): thêm 4 công thức hiếm (nguồn "Công thức hiếm", trạng thái 'hiem', xếp sau món sự kiện)
  assert.equal(b.total, 9)
  assert.equal(b.owned, 2)
  assert.deepEqual(b.entries.map(e => e.status), ['owned', 'owned', 'shop', 'shop', 'event', 'hiem', 'hiem', 'hiem', 'hiem', 'teaser', 'teaser', 'teaser'])
  // món hiếm: "Mảnh 0/3 · Cần …" khi chưa có món nền
  assert.equal(byId('banh_trang_tron_tay_ninh').sourceLabel, 'Công thức hiếm')
  assert.match(byId('banh_trang_tron_tay_ninh').note, /^Mảnh 0\/3 · Cần Bánh tráng trộn$/)
  assert.equal(byId('tra_tac_mat_ong').note, 'Mảnh 0/3')
  assert.deepEqual(byId('banh_trang_tron_tay_ninh').rare.ings.map(x => x.id).sort(), ['kho_muc', 'muoi_tom_tay_ninh'])
  assert.deepEqual(b.entries.filter(e => e.status === 'teaser').map(e => e.id), DATA.SHOP.teasers.map(t => t.id))
  const bm = byId('banh_mi_op_la')
  assert.equal(bm.price, 20000)
  assert.equal(bm.cost, 9000)
  assert.equal(bm.profit, 11000)
  assert.equal(bm.sourceLabel, 'Có sẵn')
  assert.equal(byId('banh_trang_tron').sourceLabel, 'Chợ Công Thức')
  assert.equal(byId('banh_trang_tron').locked, true)
  assert.match(byId('banh_trang_tron').note, /Chợ Công Thức mở bán từ ngày 2/)
  assert.equal(byId('ca_phe_sua_da').shopPrice, 200000)
  assert.equal(byId('che_buoi').status, 'event')
  assert.equal(byId('che_buoi').sourceLabel, 'Tri ân 20/11 · 2026')
  assert.equal(byId('goi_cuon').sourceLabel, 'Cần Quán cóc vỉa hè')
  for (const e of b.entries.filter(x => x.status !== 'teaser')) {
    const r = DATA.RECIPES[e.id]
    assert.equal(e.cost, r.cost, `${e.id}: giá vốn khớp dữ liệu`)
    assert.equal(e.price, r.price)
  }
  // món đã nhận qua sự kiện: nhãn mùa, xếp vào món đang bán
  const t = defaultState(5, DATA)
  grantReward(t, { recipe: 'che_buoi' }, c)
  const tb = recipeBook(t, c)
  const che = tb.entries.find(e => e.id === 'che_buoi')
  assert.equal(che.status, 'owned')
  assert.equal(che.sourceLabel, 'Tri ân 20/11 · 2026')
  assert.equal(sourceLabel(t, DATA.RECIPES.che_buoi, c), 'Tri ân 20/11 · 2026')
  assert.equal(tb.owned, 3)
  // M4: có 2 mảnh + món nền → "Mảnh 2/3"; mở món hiếm → món đang bán, nhãn "Công thức hiếm"
  t.rare.fragments.tra_tac_mat_ong = 2
  assert.equal(recipeBook(t, c).entries.find(e => e.id === 'tra_tac_mat_ong').note, 'Mảnh 2/3')
  grantReward(t, { recipe: 'tra_tac_mat_ong' }, c)
  const rb = recipeBook(t, c).entries.find(e => e.id === 'tra_tac_mat_ong')
  assert.deepEqual([rb.status, rb.sourceLabel, t.recipes.tra_tac_mat_ong.boughtDay], ['owned', 'Công thức hiếm', 0])
})

test('Sổ công thức: số lần nấu, điểm cao nhất, cấp thạo và mốc kế, huy hiệu Không tì vết lấy từ tiến độ thật', () => {
  const c = ctx()
  const s = defaultState(6, DATA)
  s.shopName = 'Xe sổ'
  for (let k = 0; k < 3; k++) playShift(s, c)
  const b = recipeBook(s, c)
  for (const id of ['banh_mi_op_la', 'tra_tac']) {
    const e = b.entries.find(x => x.id === id)
    const p = s.recipes[id]
    assert.equal(e.cooks, p.cooks)
    assert.equal(e.best, p.best)
    assert.equal(e.flawless, p.flawless)
    assert.equal(e.flawlessBadge, p.flawless > 0)
    assert.ok(e.cooks > 0 && e.best === 100 && e.flawlessBadge, 'người chơi hoàn hảo: có huy hiệu Không tì vết')
    assert.equal(e.mastery.goodCooks, p.goodCooks)
  }
  // mốc thạo món 0 / 5 / 15 lần Ngon: cấp 1 → cần 5, cấp 2 → cần 15, cấp 3 → hết mốc
  const m1 = masteryInfo({ goodCooks: 2 }, c)
  assert.deepEqual(m1, { level: 1, name: 'Tập làm', goodCooks: 2, next: { level: 2, name: 'Quen tay', target: 5, need: 3 } })
  const m2 = masteryInfo({ goodCooks: 9 }, c)
  assert.equal(m2.level, 2)
  assert.deepEqual(m2.next, { level: 3, name: 'Thạo', target: 15, need: 6 })
  const m3 = masteryInfo({ goodCooks: 20 }, c)
  assert.equal(m3.level, 3)
  assert.equal(m3.name, 'Thạo')
  assert.equal(m3.next, null)
  // món chưa có: không có số liệu nấu, không cấp thạo
  const shopE = b.entries.find(x => x.id === 'ca_phe_sua_da')
  assert.equal(shopE.cooks, 0)
  assert.equal(shopE.mastery, null)
  assert.equal(shopE.flawlessBadge, false)
})

test('chi tiết món: nguyên liệu cần + các bước, KHÔNG lộ bẫy; Sổ từ vùng miền từ SYNONYMS', () => {
  const c = ctx()
  const s = defaultState(7, DATA)
  for (const r of Object.values(DATA.RECIPES)) {
    const d = recipeDetail(s, r.id, c)
    const ids = d.ingredients.map(i => i.id)
    assert.deepEqual(ids, r.ingredients.map(i => i.id))
    for (const decoy of r.decoys) assert.ok(!ids.includes(decoy), `${r.id}: lộ bẫy ${decoy}`)
    assert.ok(!JSON.stringify(d).includes('"decoys"'))
    assert.equal(d.steps[0].id, 'chon', 'bước Chọn luôn đầu')
    assert.ok(d.steps.length >= 5)
    for (const st of d.steps) assert.ok(st.label && st.typeName, `${r.id}/${st.id}`)
    // bước có chọn cách sơ chế không lộ đáp án
    assert.ok(!JSON.stringify(d.steps).includes('correct'))
    assert.equal(d.cost, r.cost)
  }
  const bm = recipeDetail(s, 'banh_mi_op_la', c)
  const ot = bm.ingredients.find(i => i.id === 'tuong_ot')
  assert.equal(ot.role, 'tuy_chon')
  assert.deepEqual(ot.when, ['Cay'])
  assert.ok(bm.steps.find(x => x.id === 'thai_dua').chooseMethod)
  assert.ok(bm.steps.find(x => x.id === 'chien_trung').critical)
  assert.ok(bm.notes.some(n => n.id === 'them_trung' && n.surcharge === 5000))
  assert.equal(recipeDetail(s, 'goi_cuon', c), null, 'món bóng mờ không có chi tiết')
  // Sổ từ vùng miền: các cặp Nam/Bắc tiêu biểu
  const words = dialectBook(c)
  assert.equal(words.length, DATA.SYNONYMS.length)
  assert.ok(words.length >= 15)
  const has = (nam, bac) => words.some(w => w.nam.includes(nam) && w.bac.includes(bac))
  assert.ok(has('ổ', 'cái'))
  assert.ok(has('trà tắc', 'trà quất'))
  assert.ok(has('cà phê sữa đá', 'nâu đá'))
  assert.ok(has('hổng', 'không'))
  for (const w of words) assert.ok(w.meaning, w.id)
})
