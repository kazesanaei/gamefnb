// M5 Đợt 3 (gói M-N): nền chung các màn ngoài ca — phần thuần của src/ui/components/meta-ui.js (mẩu phần thưởng có hình,
// số góc ô, chấm đỏ nảy một lần khi số tăng, hình đầu màn, xe đẩy cel-shading theo đồ thẩm mỹ, NPC bán thân, ánh xạ hiệu
// ứng nhận quà), import trong Node không chạm DOM, và quy ước css/meta.css (lớp g- dùng chung, chữ ≥ 14px, không hoạt ảnh
// vô hạn, giảm chuyển động, thứ tự .ev-grace-note trước .meta-hint).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  rewardParts, rewardLine, partArt, dotBump, headArt, cartArt, cartOptions, DEFAULT_UMBRELLA, rewardFx, npcBust, npcFace,
  durationText, eventCurrency
} from '../../src/ui/components/meta-ui.js'
import { mergeRewards, chainTitle } from '../../src/ui/components/chain-card.js'
import { metaArt, ENTRY_ART } from '../../src/ui/art/meta.js'
import { DI_SAU, ANH_KHOA, CO_HANH, icon } from '../../src/ui/art.js'
import { DI_SAU_POSES, ANH_KHOA_BUSTS, CO_HANH_BUSTS } from '../../src/ui/art/people.js'
import { DATA } from '../../src/data/index.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8')
const FULL = {
  money: 7000, gold: 5, rep: 5, tem: 35, eventId: 'tri_an_20_11', items: { phieu_cho_som: 2 }, recipe: 'che_buoi', cosmetic: 'du_do',
  title: 'chu_xe_dau_hem', unlock: 'the_quan_coc', tipId: 'tra_truoc', tipCount: 3
}

test('rewardParts: chữ giữ nguyên như cũ (rewardLine), thêm art / qty / name cho ô vật phẩm', () => {
  const parts = rewardParts(FULL, DATA)
  const by = Object.fromEntries(parts.map(p => [p.kind, p]))
  assert.deepEqual(parts.map(p => p.kind), ['money', 'gold', 'rep', 'tem', 'item', 'recipe', 'cosmetic', 'title', 'unlock', 'tip'])
  // chữ đầy đủ không đổi
  assert.equal(by.money.text, '+7.000đ')
  assert.equal(by.gold.text, '5 Muỗng Vàng')
  assert.equal(by.rep.text, '+5 danh tiếng')
  assert.equal(by.tem.text, '35 Phấn Trắng')
  assert.equal(by.item.text, 'Phiếu Chợ Sớm ×2')
  assert.equal(by.title.text, 'Danh hiệu "Chủ xe đầu hẻm"')
  assert.equal(by.tip.text, '3 thẻ Mẹo nghề mới')
  // id hình cũ giữ nguyên (bảng điểm danh còn dùng p.icon)
  assert.equal(by.money.icon, 'lanh_luong')
  assert.equal(by.gold.icon, 'muong_vang')
  // ô vật phẩm: số góc dưới, tên ngắn cho hiện vật có tên, hình meta
  assert.equal(by.money.qty, '+7k')
  assert.equal(by.gold.qty, '+5')
  assert.equal(by.rep.qty, '+5')
  assert.equal(by.tem.qty, '+35')
  assert.equal(by.item.qty, '×2')
  assert.equal(by.tip.qty, '×3')
  assert.equal(by.title.qty, '')
  for (const k of ['money', 'gold', 'rep', 'tem']) assert.equal(by[k].name, '', k + ' không có tên cạnh ô')
  assert.equal(by.item.name, 'Phiếu Chợ Sớm')
  assert.equal(by.title.name, 'Chủ xe đầu hẻm')
  assert.equal(by.recipe.name, DATA.RECIPES.che_buoi.name)
  assert.equal(by.money.art, 'xu')
  assert.equal(by.gold.art, 'muong_vang')
  assert.equal(by.rep.art, 'sao_lon')
  assert.equal(by.tem.art, 'phan_trang', 'tiền sự kiện dùng hình currencyId')
  assert.equal(by.tip.art, 'so_tay_nghe')
  assert.equal(by.item.art, 'phieu_cho_som')
  // rewardLine đúng như bản cũ
  assert.equal(rewardLine({ gold: 10, items: { phieu_cho_som: 1 } }, DATA), '10 Muỗng Vàng · Phiếu Chợ Sớm')
  assert.equal(rewardLine({}, DATA), 'Lời nhắn')
  assert.equal(eventCurrency(DATA, null), 'Tem')
})

test('rewardParts: nguyên liệu hiếm, mảnh công thức, nâng cấp; dữ liệu thiếu không ra undefined / NaN', () => {
  const ing = Object.keys(DATA.INGREDIENTS).find(id => DATA.INGREDIENTS[id].rare) || Object.keys(DATA.INGREDIENTS)[0]
  const rec = Object.keys(DATA.RECIPES)[0]
  const parts = rewardParts({ rare: { [ing]: 2 }, fragments: { [rec]: 1 }, upgrade: 'khong_co', money: 1500000 }, DATA)
  const by = Object.fromEntries(parts.map(p => [p.kind, p]))
  assert.equal(by.rare.qty, '×2')
  assert.equal(by.fragment.qty, '×1')
  assert.equal(by.fragment.art, 'manh_cong_thuc')
  assert.equal(by.money.qty, '+1,5tr')
  assert.equal(by.upgrade.name, 'khong_co')
  for (const p of rewardParts({ items: { la_lam: 1 }, title: 'x', recipe: 'y' }, {})) {
    for (const v of Object.values(p)) assert.doesNotMatch(String(v), /undefined|NaN/)
  }
})

test('partArt: mọi mẩu có hình SVG; ưu tiên hình meta.js, không có thì icon() của art.js', () => {
  for (const p of rewardParts(FULL, DATA)) {
    const s = partArt(p)
    assert.match(s, /^<svg /, p.kind)
    if (p.art) assert.equal(s, metaArt(p.art), p.kind)
  }
  const rec = rewardParts({ recipe: 'banh_mi_op_la' }, DATA)[0]
  assert.equal(rec.art, null)
  assert.equal(partArt(rec), icon(DATA.RECIPES.banh_mi_op_la.icon))
})

test('dotBump: chấm nảy MỘT LẦN khi số tăng (hoặc lần đầu), vẽ lại cùng số / giảm số thì không; không key thì không nhớ', () => {
  assert.equal(dotBump('t-a', 1), true, 'lần đầu hiện')
  assert.equal(dotBump('t-a', 1), false, 'vẽ lại cùng số')
  assert.equal(dotBump('t-a', 3), true, 'số tăng')
  assert.equal(dotBump('t-a', 2), false, 'số giảm')
  assert.equal(dotBump('t-a', 0), false, 'hết chấm')
  assert.equal(dotBump('t-a', 1), true, 'hiện lại sau khi hết')
  assert.equal(dotBump('t-b', 0), false)
  assert.equal(dotBump('', 5), false)
  assert.equal(dotBump(null, 5), false)
})

test('headArt: opts.art → hình lối vào theo tên màn → hình cũ opts.icon đổi sang hình meta', () => {
  assert.equal(headArt({ art: 'cup' }), metaArt('cup'))
  assert.equal(headArt({}, 'quests'), metaArt(ENTRY_ART.quests))
  assert.equal(headArt({ icon: 'lich' }, 'quests'), metaArt('viec_hom_nay'))
  assert.equal(headArt({ icon: 'thu' }), metaArt('hop_thu'))
  assert.equal(headArt({ icon: 'ro' }), metaArt('cho_cong_thuc'))
  assert.equal(headArt({ screen: 'notebook' }), metaArt('so_tay_nghe'))
  assert.equal(headArt({}), '')
  assert.equal(headArt({}, 'stage-up'), metaArt('cup'), 'Lên chặng: cúp')
  assert.equal(headArt({}, 'tasting'), '', 'màn không có hình đầu màn')
})

test('cartArt: xe cel-shading theo màu dù, sọc kẹo, viền / đèn biển, chậu hoa; tên xe được thoát ký tự; màu lạ về mặc định', () => {
  const base = cartArt({ name: 'Xe Bánh Mì Cô Ba' })
  assert.match(base, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 240 170">/)
  assert.ok(base.includes(DEFAULT_UMBRELLA.color) && base.includes(DEFAULT_UMBRELLA.alt), 'dù mặc định')
  assert.ok(base.includes('Xe Bánh Mì Cô Ba'))
  assert.doesNotMatch(base, /undefined|NaN|null|url\(|<use|href|<image|base64|Gradient|filter/)
  const red = cartArt({ name: '<b>&"', umbrellaColor: '#d64545', umbrellaAlt: '#ffffff', pattern: 'soc', sign: 'vien', decor: 'chau_hoa' })
  assert.ok(red.includes('#d64545') && red.includes('#e0584a'), 'sọc kẹo xen 3 màu')
  assert.ok(red.includes('&lt;b&gt;&amp;&quot;'), 'tên xe được thoát ký tự')
  assert.ok(red.includes('#f7b928'), 'viền Khai Trương')
  assert.ok(red.includes('#c8813b'), 'chậu hoa')
  assert.ok(cartArt({ sign: 'den' }).includes('#ffe28a'), 'dãy bóng đèn')
  assert.ok(cartArt({ umbrellaColor: 'red', umbrellaAlt: 'x' }).includes(DEFAULT_UMBRELLA.color), 'màu không hợp lệ → mặc định')
  assert.ok(cartArt({ name: 'Bếp Khởi Nghiệp Rất Rất Dài Hơn Hai Mươi Hai Ký Tự' }).includes('…'), 'tên dài được cắt')
  // cartOptions + cartArt: dù sự kiện màu sáng → múi phụ xanh nhạt
  const o = cartOptions({ shopName: 'A', cosmetics: { equipped: { du: 'co_phan_trang', bien: 'bang_den_tri_an' } } }, DATA)
  assert.equal(o.umbrellaAlt, '#9ad0e8')
  assert.equal(o.sign, 'den')
  assert.ok(cartArt(o).includes('#9ad0e8'))
})

test('NPC: mặt tròn giữ như cũ (thông báo), bán thân people.js cho thẻ chuỗi', () => {
  assert.equal(npcFace('di_sau'), DI_SAU.vui)
  assert.equal(npcFace('anh_khoa'), ANH_KHOA.vui)
  assert.equal(npcFace('co_giao'), CO_HANH.vui)
  assert.equal(npcBust('di_sau'), DI_SAU_POSES.ngon_cai)
  assert.equal(npcBust('di_sau', 'claim'), DI_SAU_POSES.vo_tay)
  assert.equal(npcBust('anh_khoa'), ANH_KHOA_BUSTS.huong_dan)
  assert.equal(npcBust('co_giao'), CO_HANH_BUSTS.vui)
  assert.match(npcBust('la'), /viewBox="0 0 96 112"/)
})

test('rewardFx: tiền bay về ví, Muỗng Vàng về viên muỗng, phần còn lại nổ sao tại chỗ', () => {
  assert.deepEqual(rewardFx(FULL, DATA), { money: 7000, gold: 5, other: 8 })
  assert.deepEqual(rewardFx({ money: 5000 }, DATA), { money: 5000, gold: 0, other: 0 })
  assert.deepEqual(rewardFx(null, DATA), { money: 0, gold: 0, other: 0 })
})

test('chain-card + meta-ui: import trong Node không chạm DOM; hàm cũ giữ hành vi', () => {
  assert.equal(chainTitle({ npcName: 'Dì Sáu', npcVerb: 'dặn', name: 'x' }), 'Dì Sáu dặn')
  assert.deepEqual(mergeRewards([{ money: 5000 }, { money: 5000, gold: 2 }]), { money: 10000, gold: 2 })
  assert.equal(durationText(3 * 3600000 + 20 * 60000), '3 giờ 20 phút')
  const src = read('src/ui/components/meta-ui.js') + read('src/ui/components/chain-card.js')
  // không có lệnh DOM ở cấp module (mọi document / window nằm trong hàm)
  for (const line of src.split('\n')) {
    if (/^(const|let|var|export const) /.test(line)) assert.doesNotMatch(line, /document\.|window\./, line)
  }
})

test('css/meta.css: lớp g- dùng chung có đủ, không trùng theme.css, chữ ≥ 14px, không hoạt ảnh vô hạn, giảm chuyển động', () => {
  const css = read('css/meta.css')
  const theme = read('css/theme.css')
  for (const c of ['g-head-meta', 'g-head-bar', 'g-head-sign', 'g-back-meta', 'g-board-meta', 'g-board-meta-in', 'g-board-meta-title',
    'g-paper-meta', 'g-paper-meta--lined', 'g-paper-meta--pin', 'g-envelope-meta', 'g-scroll-meta', 'g-claim-meta', 'g-entry',
    'g-entry-art', 'g-entry-label', 'g-entry-grid', 'g-entry--row', 'g-foot-meta', 'g-art', 'g-pbar']) {
    assert.ok(css.includes('.' + c), 'thiếu lớp .' + c)
    assert.ok(!new RegExp('\\.' + c.replace(/[-]/g, '\\-') + '(?![\\w-])').test(theme), 'trùng lớp ở theme.css: .' + c)
  }
  for (const m of css.matchAll(/font-size:\s*([\d.]+)px/g)) assert.ok(Number(m[1]) >= 14, 'chữ nhỏ hơn 14px: ' + m[0])
  assert.doesNotMatch(css, /infinite/, 'không hoạt ảnh lặp vô hạn')
  assert.match(css, /\.red-dot\.is-bump \{ animation: g-dot-bump [^}]* 1 both/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[^]*\.red-dot\.is-bump \{ animation: none !important; \}/)
  assert.match(css, /html\.reduce-motion \.red-dot\.is-bump \{ animation: none !important; \}/)
  // dòng ân hạn ở màn Sự kiện (p.meta-hint.ev-grace-note) lấy màu .meta-hint: .ev-grace-note phải đứng trước
  assert.ok(css.indexOf('.ev-assist, .ev-grace-note') < css.indexOf('.meta-hint {'), '.ev-grace-note phải đứng trước .meta-hint')
  // vùng chạm nút quay lại và nút "?" trên thanh gỗ ≥ 44px
  assert.match(css, /\.meta-head \.g-back-meta \{[^}]*min-width: 46px; min-height: 46px/)
  assert.match(css, /\.meta-head \.g-head-bar \.help-btn \{[^}]*width: 44px; height: 44px/)
  // đầu màn và thanh gỗ chừa vùng an toàn trên
  assert.match(css, /\.meta-head \.g-head-bar \{[^}]*var\(--safe-top\)/)
})
