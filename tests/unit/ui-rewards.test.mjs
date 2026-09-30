// Hồi quy ráp nối M3 (docs/kien-truc.md mục 18.3): thông báo nhận thưởng nhiều bước chuỗi cùng lúc phải gộp gọn
// (cộng tiền, Muỗng Vàng, đếm thẻ Mẹo nghề) thay vì nối từng bước thành chuỗi dài.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeRewards } from '../../src/ui/components/chain-card.js'
import { rewardLine } from '../../src/ui/components/meta-ui.js'
import { DATA } from '../../src/data/index.js'

test('gộp thưởng nhiều bước chuỗi: cộng tiền/Muỗng Vàng, đếm thẻ Mẹo nghề, giữ danh hiệu và mở thẻ', () => {
  const steps = [
    { money: 5000, tipId: 'tra_truoc' }, { money: 5000, tipId: 'dem_hai_lan' }, { money: 15000, tipId: 'thot_rieng' },
    { money: 30000, tipId: 'dinh_luong_chuan' }, { money: 30000, gold: 5, tipId: 'nem_tu_it' },
    { gold: 20, title: 'chu_xe_dau_hem', unlock: 'the_quan_coc', tipId: 'ty_le_gia_von' }
  ]
  const m = mergeRewards(steps)
  assert.equal(m.money, 85000)
  assert.equal(m.gold, 25)
  assert.equal(m.tipCount, 6)
  const line = rewardLine(m, DATA)
  assert.match(line, /^\+85\.000đ · 25 Muỗng Vàng · Danh hiệu "Chủ xe đầu hẻm" · Mở thẻ ".+" · 6 thẻ Mẹo nghề mới$/)
  assert.equal((line.match(/Mẹo nghề/g) || []).length, 1, 'không lặp "Thẻ Mẹo nghề mới"')
})

test('gộp thưởng: hiện vật cộng theo số lượng, một thẻ Mẹo nghề ghi như cũ', () => {
  const m = mergeRewards([{ items: { phieu_cho_som: 1 } }, { items: { phieu_cho_som: 2 }, tipId: 'x' }])
  assert.deepEqual(m.items, { phieu_cho_som: 3 })
  assert.match(rewardLine(m, DATA), /Phiếu Chợ Sớm ×3 · Thẻ Mẹo nghề mới$/)
})
