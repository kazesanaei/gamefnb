// Màn "Gánh hàng quê" (M4, thiết kế mục C.6a): lựa hàng hiếm ở phiên hàng theo giờ thật Việt Nam (Chợ sớm 05:00–09:00,
// Xe ba gác trưa 11:00–13:30, Gánh đặc sản tối 17:30–21:00). Mini-game "Lựa hàng" dùng lại nguyên bước Chọn nguyên liệu
// (MINIGAMES.chon) với kệ 9 ô dựng tạm ở lõi (rare.stallGame): hàng hiếm là món phải lấy, hàng thường dễ nhầm là bẫy.
// Kết quả (rare.finishStall): luôn được ít nhất 1 phần; từ 90 điểm thêm 1 phần; từ 75 điểm có 50% được 1 mảnh công thức.
// Chọn nhầm hàng thường → thẻ Mẹo nghề "Kiểm hàng trước khi nhận". Mỗi phiên 1 lượt mỗi ngày thật, chỉ ở ngoài ca,
// khóa khi giờ máy bị lùi. Rời màn giữa chừng: lượt lựa dở được giữ (rare.pendingStall), quay lại lựa tiếp trong ngày;
// rổ đang chọn và số lần chọn nhầm lưu vào save mỗi lần chạm (rare.saveStallDraft), "Lựa tiếp" khôi phục đúng rổ đó.
// params: { stallId }.
//
// M5 Đợt 3 (gói M-G, bản 0.5.2) — giao diện cảnh chợ quê (chỉ giao diện, luật và phần thưởng giữ nguyên):
//  - Giới thiệu: dây cờ + trời theo buổi của phiên (sáng / trưa / tối), người bán bán thân (people.js, dáng riêng theo
//    phiên: WHO_LOOKS[stall.id]) nói trong bong bóng; đòn gánh hai thúng tre, mỗi thúng đựng một món hàng hiếm (hình to
//    64–72px, sao vàng), dưới thúng là bảng tên giấy (tên ★, quê, kho n/6, hàng dễ nhầm); biển tre "Phiên chợ hôm nay" ba
//    khung giờ thật (đang mở / lựa dở / đã ghé / đã tan / sắp mở); bảng phần thưởng có hình (luôn 1 phần, từ 90 điểm +1
//    phần, từ 75 điểm 50% 1 mảnh) và giá lượt (1 lượt mỗi phiên mỗi ngày, không tốn Tiền quán). Nút chính dính đáy:
//    "Bắt đầu lựa hàng" / "Lựa tiếp"; phiên chưa mở, đã tan, đã ghé hay tạm khóa thì đáy là tấm biển (stall-locked) + nút
//    "Về màn Chuẩn bị". Màn đang mở mà phiên đổi trạng thái theo giờ thật (mở, tan) thì vẽ lại (hẹn 30 giây, như Chuẩn bị).
//  - Lựa hàng: người bán dặn trong bong bóng kèm hình hai món cần lựa; kệ Chọn của bếp (Đợt 1) giữ nguyên luật.
//  - Kết quả: con dấu điểm, mẹt tre đựng hàng vừa lựa (hình to), rương kho hàng hiếm; hiệu ứng CHỈ kích một lần lúc vừa
//    lựa xong (không kích trong render): hàng bay từ rổ lựa xuống mẹt rồi bay vào rương kho (vfx.fly, nhân bản rồi bay),
//    Muỗng Vàng dư bay lên viên Muỗng Vàng ở đầu màn. Giảm chuyển động: không bay, hàng hiện thẳng.
// Hợp đồng e2e / tour giữ nguyên: screen-market, market-intro (data-stall; .npc-talk, .market-goods), stall-start ("Lựa
// tiếp"), stall-locked, market-stage (data-stall), market-result (data-score, data-got, data-fragment), market-got-<id>
// ("+n phần <tên>"), market-fragment, market-tip (.incident-tip), market-done, market-back, confirm-*; export starText.
import { h, svgBox } from '../dom.js'
import { icon, bust, head, DI_SAU } from '../art.js'
import { metaArt } from '../art/meta.js'
import { svg as artSvg, ground, hilite, tone3, PAL } from '../art/kit.js'
import { playStep } from '../minigames/index.js'
import { uiRand, hashKey } from '../minigames/_util.js'
import { stallStatus, startStall, finishStall, rareConfig, rareStock, saveStallDraft } from '../../core/rare.js'
import { screenHead, reasonText, rewindNote } from '../components/meta-ui.js'

// Hình ngôi sao độ hiếm (★1, ★2).
export function starText(n) {
  return '★'.repeat(Math.max(1, Math.min(3, Number(n) || 1)))
}

// ---------- Hàm thuần (không chạm DOM) ----------

/** "HH:MM" → số phút trong ngày (NaN nếu sai dạng). */
export function hhmm(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ''))
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
}

/** "HH:MM" của số phút trong ngày (giờ Việt Nam). */
export function clockText(minutes) {
  const m = ((Math.floor(Number(minutes) || 0) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * Trạng thái một khung giờ trên biển tre: 'pending' (đang lựa dở) | 'done' (hôm nay đã ghé) | 'open' (đang mở) |
 * 'past' (đã tan) | 'soon' (sắp mở). st = stallStatus(...), s = một phần tử của st.stalls.
 */
export function slotState(st, s) {
  if (!s) return 'soon'
  if (st && st.pending === s.id) return 'pending'
  if (s.done) return 'done'
  if (s.open) return 'open'
  const end = hhmm(s.to)
  return st && Number.isFinite(end) && Number(st.minutes) >= end ? 'past' : 'soon'
}

export const SLOT_TEXT = Object.freeze({ pending: 'Lựa dở', done: 'Đã ghé ✓', open: 'Đang mở', past: 'Đã tan', soon: 'Sắp mở' })

/** Buổi của phiên (trời trong cảnh): sáng (trước 10:00), trưa (trước 16:00), tối. */
export function timeOfDay(from) {
  const m = hhmm(from)
  if (!Number.isFinite(m)) return 'trua'
  return m < 600 ? 'sang' : m < 960 ? 'trua' : 'toi'
}

// ---------- Hình riêng của màn (cel-shading như src/ui/art: viền mực, ba tông, không gradient) ----------

const ROM = PAL.rom
const ROPE = '#b98b45'
// Thúng tre treo trên đòn gánh, khung 140 × 140: móc quang ở (70, 10), miệng thúng tâm (70, 82) rx 50 ry 12, đáy y 132.
// Lớp sau: bóng đất, hai dây quang (sau hình món, không đè lên hàng), mép sau vành + lòng thúng. Lớp trước (che chân món
// hàng): thân thúng đan + mép trước vành.
const THUNG_BACK = artSvg(
  ground(70, 135, 56, 4.5) +
  `<path d="M70 10L22 80M70 10L118 80" fill="none" stroke-width="4.2"/>` +
  `<path d="M70 10L22 80M70 10L118 80" fill="none" stroke="${ROPE}" stroke-width="1.8"/>` +
  `<ellipse cx="70" cy="82" rx="48" ry="10.5" fill="#7a4a1c"/>` +
  `<path d="M24 82A46 9 0 0 1 116 82" fill="none" stroke="#5a3312" stroke-width="2.2" opacity=".5"/>` +
  `<path d="M20 82A50 12 0 0 1 120 82" fill="none" stroke-width="8.4"/>` +
  `<path d="M20 82A50 12 0 0 1 120 82" fill="none" stroke="${ROM[2]}" stroke-width="3.6"/>`,
  [140, 140])
const THUNG_FRONT = artSvg(
  tone3({
    outline: 'M20 82A50 12 0 0 0 120 82C120 112 102 132 70 132C38 132 20 112 20 82Z',
    base: ROM[0], dark: ROM[1],
    shade: 'M120 82C120 112 102 132 70 132C90 124 104 108 106 90C112 88 117 86 120 82Z',
    detail: `<path d="M24 98Q70 112 116 98M30 113Q70 124 110 113M44 93Q46 114 54 129M70 95V131M96 93Q94 114 86 129" ` +
      `fill="none" stroke="${ROM[1]}" stroke-width="1.75"/>`,
    shine: hilite(36, 100, 6, 11, 0.45, 18)
  }) +
  `<path d="M20 82A50 12 0 0 0 120 82" fill="none" stroke-width="8.4"/>` +
  `<path d="M20 82A50 12 0 0 0 120 82" fill="none" stroke="${ROM[2]}" stroke-width="3.6"/>`,
  [140, 140])

// Dây cờ đuôi nheo ở mép trên cảnh chợ (khung 360 × 26, lặp màu).
const FLAG_COLORS = ['#e8483a', '#f7b928', '#43a63d', '#4aa3df', '#f28a1e']
const BUNTING = artSvg(
  '<path d="M-4 5Q180 13 364 5" fill="none" stroke-width="2"/>' +
  Array.from({ length: 15 }, (_, i) => {
    const x = 6 + i * 24.4
    const y = 5 + 8 * Math.sin(Math.PI * (x + 4) / 368)
    return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}L${(x + 16).toFixed(1)} ${(y + 0.4).toFixed(1)}L${(x + 8).toFixed(1)} ${(y + 13).toFixed(1)}Z" ` +
      `fill="${FLAG_COLORS[i % FLAG_COLORS.length]}" stroke-width="1.8"/>`
  }).join(''),
  [360, 26]).replace('<svg ', '<svg preserveAspectRatio="none" ')

// ---------- Màn ----------

export default {
  mount(root, app, params = {}) {
    const S = app.data.STRINGS
    const RS = S.rare || {}
    const INGS = app.data.INGREDIENTS || {}
    const el = h('section', { class: 'meta-screen market-screen', testid: 'screen-market' })
    root.appendChild(el)
    let destroyed = false
    let play = null          // { handle } khi đang chơi mini-game
    let result = null        // kết quả finishStall

    const status = () => stallStatus(app.state, app.nowInfo(), app.ctx)
    const stallId = () => {
      const st = status()
      return params.stallId || st.pending || (st.current && st.current.id) || null
    }
    const stallDef = id => (app.data.STALLS || []).find(s => s.id === id) || null
    const ingName = id => (INGS[id] ? INGS[id].name : id)
    const ingArt = id => icon((INGS[id] && INGS[id].icon) || id)
    const sellerArt = (s, mood = 'vui') => bust(s.persona || 'co_chu', mood, { gender: s.gender, who: s.id })
    const sellerHead = (s, mood = 'vui') => head(s.persona || 'co_chu', mood, { gender: s.gender, who: s.id })

    // help: nút "?" (Hướng dẫn) — không đặt trong lúc đang lựa (đồng hồ của bước lựa không dừng theo bảng Hướng dẫn)
    function headEl(sub, help = true) {
      return screenHead(app, { title: S.screens.market || 'Gánh hàng quê', sub, backLabel: '‹ Chuẩn bị', onBack: () => leave(), help })
    }

    // Đầu màn + thân màn (lề 16px hai bên); trả thân màn để gắn thẻ. mode: intro | stage | result (CSS theo màn).
    // Đổi màn con (giới thiệu → lựa → kết quả): cuộn về đầu (vẽ lại cùng màn con, vd theo giờ phiên, thì giữ chỗ cuộn).
    function frame(sub, help = true, mode = 'intro') {
      const prev = el.dataset.mode
      el.textContent = ''
      el.dataset.mode = mode
      if (prev && prev !== mode && root) root.scrollTop = 0
      el.appendChild(headEl(sub, help))
      const body = h('div', { class: 'meta-body market-body' })
      el.appendChild(body)
      return body
    }

    // Một thúng trên đòn gánh: thúng tre đựng món hàng hiếm (hình to, sao vàng) + bảng tên giấy dưới thúng.
    function goodRow(id) {
      const g = INGS[id]
      if (!g) return null
      const C = rareConfig(app.ctx)
      const traps = (g.traps || []).map(t => ingName(t).toLocaleLowerCase('vi-VN'))
      return h('li', { class: 'market-good', dataset: { ing: id } },
        h('div', { class: 'market-thung', 'aria-hidden': 'true' },
          svgBox(THUNG_BACK, 'market-thung-back'),
          svgBox(ingArt(id), 'market-good-icon'),
          svgBox(THUNG_FRONT, 'market-thung-front')),
        h('div', { class: 'market-good-text' },
          h('b', { class: 'market-good-name' }, g.name, ' ', h('span', { class: 'rare-star', 'aria-label': `độ hiếm ${g.star || 1} sao` }, starText(g.star))),
          h('span', { class: 'market-good-meta' },
            g.origin ? h('span', { class: 'market-origin', title: 'Quê ' + g.origin }, g.origin) : null,
            h('span', { class: 'market-stock', title: 'Kho hàng hiếm' }, svgBox(metaArt('kho_hiem'), 'market-stock-ico'),
              `Kho ${rareStock(app.state, id)}/${C.stockMax}`)),
          traps.length ? h('small', { class: 'market-trap' }, 'Dễ nhầm: ' + traps.join(', ')) : null))
    }

    // Cảnh chợ: dây cờ, trời theo buổi, người bán + bong bóng (.npc-talk), đòn gánh hai thúng (.market-goods).
    function sceneEl(stall, { mood = 'vui', line = '', goods = true } = {}) {
      const list = goods ? (stall.goods || []).map(goodRow).filter(Boolean) : []
      return h('div', { class: 'market-scene', dataset: { tod: timeOfDay(stall.from) } },
        svgBox(BUNTING, 'market-bunting'),
        h('div', { class: 'npc-talk market-talk' },
          svgBox(sellerArt(stall, mood), 'market-seller'),
          h('div', { class: 'bubble npc-bubble market-bubble' },
            h('b', null, stall.seller || stall.name), h('p', null, line || stall.hello || stall.desc))),
        list.length ? h('ul', { class: 'market-goods', 'aria-label': 'Hàng hiếm hôm nay' }, list) : null)
    }

    // Biển tre "Phiên chợ hôm nay": ba khung giờ thật, khung đang mở nổi bật.
    function clockEl(st) {
      return h('section', { class: 'market-clock', testid: 'market-clock', 'aria-label': 'Phiên chợ hôm nay' },
        h('div', { class: 'market-clock-head' },
          h('b', { class: 'market-clock-title' }, 'Phiên chợ hôm nay'),
          h('span', { class: 'market-now' }, 'Bây giờ ' + clockText(st.minutes))),
        h('ol', { class: 'market-slots' }, (st.stalls || []).map(s => {
          const key = slotState(st, s)
          return h('li', { class: ['market-slot', 'is-' + key], dataset: { stall: s.id, state: key } },
            h('span', { class: 'market-slot-time' }, `${s.from}–${s.to}`),
            h('span', { class: 'market-slot-name' }, s.name),
            h('span', { class: 'market-slot-state' }, SLOT_TEXT[key]))
        })),
        h('p', { class: 'market-clock-note' }, 'Lỡ phiên không sao, còn phiên khác và khách lạ.'))
    }

    // Bảng phần thưởng có hình + giá lượt.
    function perksEl(stall) {
      const C = rareConfig(app.ctx).stall
      const goods = (stall.goods || []).filter(id => INGS[id])
      const tile = (art, badge, text, cls = '') => h('li', { class: ['market-perk', cls] },
        h('span', { class: 'market-perk-art' }, svgBox(art, 'market-perk-ico'), h('b', { class: 'market-perk-badge' }, badge)),
        h('span', { class: 'market-perk-text' }, text))
      return h('section', { class: 'market-perks', 'aria-label': 'Phần thưởng lựa hàng' },
        h('h2', { class: 'market-perks-title' }, 'Lựa đúng được gì?'),
        h('ul', { class: 'market-perk-list' },
          tile(ingArt(goods[0] || 'ro'), '×' + C.base, `Luôn được ${C.base} phần`),
          tile(ingArt(goods[1] || goods[0] || 'ro'), '+1', `Từ ${C.bonusAt} điểm thêm 1 phần`),
          tile(metaArt('manh_cong_thuc'), Math.round(C.fragmentRate * 100) + '%', `Từ ${C.fragmentAt} điểm: ${Math.round(C.fragmentRate * 100)}% được 1 mảnh công thức hiếm`, 'is-frag')),
        h('p', { class: 'market-price' },
          svgBox(metaArt('xu'), 'market-price-ico'),
          h('span', null, h('b', null, 'Không tốn Tiền quán'), ' · mỗi phiên 1 lượt mỗi ngày. Lựa đúng hàng hiếm, bỏ qua hàng thường dễ nhầm; chạm lần nữa để bỏ ra.')))
    }

    function render() {
      if (destroyed) return
      const ni = app.nowInfo()
      const st = status()
      const id = stallId()
      const stall = id && stallDef(id)
      if (result) return renderResult(stall)
      if (!stall) {
        // không có phiên nào: Dì Sáu báo phiên kế tiếp
        const body = frame('Hiện chưa có phiên nào mở')
        const rw = rewindNote(app, ni)
        if (rw) body.appendChild(rw)
        body.appendChild(h('section', { class: 'market-intro is-empty', testid: 'market-intro' },
          h('div', { class: 'market-scene is-empty', dataset: { tod: 'trua' } },
            svgBox(BUNTING, 'market-bunting'),
            h('div', { class: 'npc-talk market-talk' },
              svgBox(DI_SAU.vui, 'market-seller is-face'),
              h('div', { class: 'bubble npc-bubble market-bubble' }, h('b', null, 'Dì Sáu'), h('p', null, nextText(st))))),
          clockEl(st),
          h('div', { class: 'sticky-foot market-foot' }, backBtn(true))))
        return
      }
      const pending = st.pending === stall.id
      const cur = st.current && st.current.id === stall.id ? st.current : null
      const canStart = pending ? (!st.locked && !st.inShift) : !!(cur && cur.canStart)
      const reason = pending ? (st.locked ? 'lui_gio' : st.inShift ? 'dang_ban' : null)
        : (cur ? cur.reason : 'ngoai_gio')
      const body = frame(`${stall.name} · ${stall.from}–${stall.to}`)
      const rw = rewindNote(app, ni)
      if (rw) body.appendChild(rw)
      const done = reason === 'da_nhan'
      const you = youOf(stall)
      const line = canStart ? (pending ? `Rổ ${you} lựa dở còn giữ nguyên nè, lựa tiếp đi ${you}.` : stall.hello)
        : done ? `Hôm nay ${you} ghé rồi, mai nhớ ghé nữa nghen.`
          : reason === 'ngoai_gio' ? closedLine(stall, st) : (stall.desc || stall.hello)
      const intro = h('section', { class: ['market-intro', canStart ? 'can-start' : 'is-locked', done ? 'is-done' : ''], testid: 'market-intro', dataset: { stall: stall.id } },
        sceneEl(stall, { mood: canStart || done ? 'vui' : 'binh_thuong', line }),
        clockEl(st),
        perksEl(stall),
        stall.desc ? h('p', { class: 'market-desc' }, stall.desc) : null,
        backBtn(false),
        h('div', { class: 'sticky-foot market-foot' },
          canStart
            ? h('button', { class: 'btn btn-primary btn-big market-start', type: 'button', testid: 'stall-start', onclick: () => begin(stall.id) },
              svgBox(metaArt('ganh_hang'), 'market-start-ico'), pending ? 'Lựa tiếp' : 'Bắt đầu lựa hàng')
            : h('p', { class: 'market-locked', testid: 'stall-locked', role: 'status' },
              svgBox(metaArt(done ? 'dau_tick' : 'ganh_hang'), 'market-locked-ico'),
              h('span', null, reasonText(app, reason || 'ngoai_gio') + (reason === 'ngoai_gio' ? ' · ' + nextText(st) : '')))))
      body.appendChild(intro)
    }

    // Người bán gọi người chơi như trong lời chào của phiên ("nè em" → em, còn lại → con).
    function youOf(stall) {
      return /(^|[\s,.!?])em([\s,.!?]|$)/i.test(String(stall.hello || '')) ? 'em' : 'con'
    }

    // Lời người bán khi phiên chưa mở / đã tan.
    function closedLine(stall, st) {
      const from = hhmm(stall.from), to = hhmm(stall.to)
      const you = youOf(stall)
      if (Number.isFinite(to) && st.minutes >= to) return `Phiên ${stall.name.toLocaleLowerCase('vi-VN')} tan rồi ${you}, mai ${stall.from} ghé sớm nha.`
      if (Number.isFinite(from) && st.minutes < from) return `Chưa tới giờ đâu ${you}, ${stall.from} mới mở gánh nha.`
      return stall.desc || stall.hello
    }

    function nextText(st) {
      if (st.next) return `Phiên kế tiếp: ${st.next.name}, ${st.next.from}–${st.next.to}.`
      if (st.tomorrow) return `Hẹn ngày mai: ${st.tomorrow.name}, ${st.tomorrow.from}–${st.tomorrow.to}.`
      return 'Hẹn phiên sau nha.'
    }

    // Nút "Về màn Chuẩn bị" (market-back): primary = nút to rộng hết hàng (màn không có phiên), không thì nút phụ.
    function backBtn(primary) {
      return h('button', { class: ['btn', primary ? 'btn-big market-back-main' : 'btn-ghost market-back-ghost'], type: 'button', testid: 'market-back', onclick: () => leave() }, 'Về màn Chuẩn bị')
    }

    function begin(id) {
      const r = startStall(app.state, id, app.nowInfo(), app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); render(); return }
      app.sound('click')
      app.saveNow()
      const body = frame(`${r.stall.name} · lựa hàng`, false, 'stage')
      const stage = h('div', { class: 'mg-stage' })
      const stall = stallDef(id) || r.stall
      const want = r.game.goods.map(g => h('span', { class: 'market-want' }, svgBox(ingArt(g), 'market-want-ico'), h('b', null, ingName(g))))
      const hint = h('div', { class: 'npc-talk market-hint' },
        svgBox(sellerHead(stall), 'market-hint-face'),
        h('p', { class: 'bubble market-hint-bubble' }, 'Bỏ vào rổ đúng ', ...joinAnd(want), ', rồi bấm Xong.'))
      const wrap = h('section', { class: 'market-stage', testid: 'market-stage', dataset: { stall: id } }, hint, stage)
      body.appendChild(wrap)
      const st = app.state
      const draft = r.draft && (r.draft.picked.length || r.draft.mistakes) ? r.draft : null
      let savedMistakes = draft ? draft.mistakes : 0
      const handle = playStep(stage, r.game.step, {
        app, recipe: r.game.recipe, data: app.data, notes: [], qty: 1, shelf: r.game.shelf,
        assist: !!(st.settings && st.settings.assistMotion),
        basketHint: 'Rổ trống. Chạm món hàng hiếm để bỏ vào rổ, chạm lần nữa để lấy ra.',
        missingText: 'Còn thiếu hàng hiếm cần lấy',
        rand: uiRand(hashKey([st.seed, id, 'lua_hang'].join(':'))),
        // lượt lựa dở: khôi phục rổ và số lần chọn nhầm đã lưu
        initial: draft ? { picked: draft.picked, mistakes: draft.mistakes } : null,
        // mỗi lần chạm: lưu rổ vào save (chọn nhầm thì lưu ngay, để tải lại trang cũng không xóa được lần nhầm)
        onChange: snap => {
          if (destroyed) return
          const saved = saveStallDraft(app.state, snap)
          if (!saved.ok) return
          if (saved.mistakes > savedMistakes) { savedMistakes = saved.mistakes; app.saveNow() } else app.save()
        }
      })
      play = { handle }
      handle.result.then(res => {
        if (!res || destroyed || !play || play.handle !== handle) return
        play = null
        const d = res.details || {}
        const out = finishStall(app.state, { score: res.score, picked: d.picked, mistakes: d.tapMistakes ?? d.mistakes }, app.nowInfo(), app.ctx)
        if (!out.ok) { app.toast(reasonText(app, out.reason), { kind: 'bad' }); render(); return }
        // "nhân bản rồi bay": lấy chỗ các món trong rổ lựa TRƯỚC khi vẽ màn kết quả
        const from = basketSpots(stage)
        result = out
        app.sound(out.score >= 90 ? 'ding' : 'coin')
        app.saveNow()
        render()
        celebrate(from)
      })
    }

    // "A và B" (hai món), "A, B và C"…
    function joinAnd(parts) {
      const out = []
      parts.forEach((p, i) => {
        if (i > 0) out.push(i === parts.length - 1 ? ' và ' : ', ')
        out.push(p)
      })
      return out
    }

    // Chỗ các món trong rổ của kệ Chọn (theo id), và chỗ cả rổ — điểm xuất phát của hàng bay xuống mẹt.
    function basketSpots(stage) {
      const spots = { all: null, by: {} }
      try {
        const basket = stage.querySelector('.chon-basket-wrap') || stage.querySelector('[data-testid="chon-basket"]')
        if (basket && basket.getClientRects().length) spots.all = rectOf(basket)
        for (const n of stage.querySelectorAll('.chon-in')) if (n.dataset.ing && n.getClientRects().length) spots.by[n.dataset.ing] = rectOf(n)
      } catch { /* không đo được: hàng hiện thẳng */ }
      return spots
    }
    function rectOf(n) {
      const r = n.getBoundingClientRect()
      return { left: r.left, top: r.top, width: r.width, height: r.height }
    }

    function renderResult(stall) {
      const r = result
      const C = rareConfig(app.ctx)
      const tips = Array.isArray(app.data.TIPS) ? app.data.TIPS : []
      const tip = r.wrong ? tips.find(t => t.trigger === 'kiem_hang') : null
      const body = frame(`${r.name || (stall && stall.name) || ''} · kết quả`, true, 'result')
      const got = r.got.filter(x => x.n > 0)
      const total = got.reduce((s, x) => s + x.n, 0)
      const grade = r.score >= 90 ? 'Lựa khéo!' : r.score >= 75 ? 'Lựa được!' : 'Cố lên!'
      const item = (testid, art, text, cls, data) => h('li', { class: ['market-got-item', cls], testid, dataset: data },
        svgBox(art, 'market-got-icon'), h('span', { class: 'market-got-text' }, text))
      const recipeArt = r.fragment ? icon(((app.data.RECIPES || {})[r.fragment.recipeId] || {}).icon || 'thu') : ''
      body.appendChild(h('section', { class: 'market-result', testid: 'market-result',
        dataset: { score: String(r.score), got: String(total), fragment: r.fragment ? r.fragment.recipeId : '' } },
      h('div', { class: ['market-score', r.score >= 90 ? 'is-top' : r.score >= 75 ? 'is-ok' : 'is-low'] },
        h('span', { class: 'market-score-label' }, 'Điểm lựa hàng'),
        h('b', { class: 'market-score-num' }, String(r.score)),
        h('span', { class: 'market-score-grade' }, grade)),
      h('div', { class: 'market-haul' },
        h('ul', { class: 'market-got', 'aria-label': 'Hàng vừa lựa' },
          got.map(x => item('market-got-' + x.id, ingArt(x.id), `+${x.n} phần ${x.name}`, 'is-ing', { ing: x.id })),
          r.fragment ? h('li', { class: 'market-got-item is-frag', testid: 'market-fragment' },
            h('span', { class: 'market-got-icon market-frag-art', 'aria-hidden': 'true' },
              svgBox(metaArt('manh_cong_thuc'), 'market-frag-paper'), svgBox(recipeArt, 'market-frag-dish')),
            h('span', { class: 'market-got-text' }, `+${r.fragment.n} mảnh công thức ${r.fragment.name}`)) : null,
          r.spoons > 0 ? item(null, icon('muong_vang'), `+${r.spoons} Muỗng Vàng (kho hoặc mức hôm nay đã đủ)`, 'is-spoon', { spoon: '1' }) : null),
        // rương kho hàng hiếm đặt ở góc trên-phải mẹt (đích hàng bay vào; khung thấp vẫn thấy, không nằm dưới nút dính đáy)
        got.length || r.fragment ? svgBox(metaArt('kho_hiem'), 'market-kho-icon', { title: 'Kho hàng hiếm' }) : null),
      got.length ? h('div', { class: 'market-kho' },
        h('b', null, 'Đã cất vào kho hàng hiếm'),
        h('span', { class: 'market-kho-list' }, got.map(x => h('span', { class: 'market-kho-pill', dataset: { ing: x.id } },
          svgBox(ingArt(x.id), 'market-kho-pill-ico'), `${rareStock(app.state, x.id)}/${C.stockMax}`)))) : null,
      h('div', { class: 'npc-talk market-disau' }, svgBox(r.score >= 90 ? DI_SAU.tu_hao : DI_SAU.vui, 'npc-face small'),
        h('div', { class: 'bubble npc-bubble' }, h('b', null, 'Dì Sáu'),
          h('p', null, r.score >= 90 ? 'Lựa khéo quá con! Hàng thật, đúng món, cất kho dùng dần nha.'
            : r.wrong ? 'Có món lấy nhầm hàng thường rồi con. Nhận hàng phải coi kỹ từng món.'
              : 'Được rồi con, lần sau lựa nhanh tay hơn chút nữa.'))),
      tip ? h('div', { class: 'incident-tip market-tip', testid: 'market-tip' }, svgBox(metaArt('so_tay_nghe'), 'market-tip-ico'),
        h('div', { class: 'market-tip-text' }, h('b', null, 'Mẹo nghề: ' + tip.title), h('p', null, tip.text))) : null,
      h('p', { class: 'small muted market-note' }, (RS.stockNote || '').replace('{max}', String(C.stockMax)).replace('{gold}', String(C.overflowGold))),
      h('div', { class: 'sticky-foot market-foot' },
        h('button', { class: 'btn btn-primary btn-big', type: 'button', testid: 'market-done', onclick: () => leave(true) }, 'Về màn Chuẩn bị'))))
    }

    // Hiệu ứng một lần lúc vừa lựa xong (gọi ngay sau render() của màn kết quả, KHÔNG gọi trong render):
    // con dấu điểm bật vào; mỗi món bay từ rổ lựa xuống mẹt (món trên mẹt ẩn tới khi bản sao chạm tới), rồi bản sao bay
    // tiếp vào rương kho (rương nảy, lấp lánh, chữ "+n phần"); Muỗng Vàng dư bay lên viên Muỗng Vàng ở đầu màn.
    // Giảm chuyển động / không có vfx: fly trả false ngay → món hiện luôn, không bay.
    function celebrate(from) {
      const fx = app.vfx
      if (!fx || destroyed) return
      const res = el.querySelector('[data-testid="market-result"]')
      if (!res) return
      const stamp = res.querySelector('.market-score')
      try { if (stamp) fx.pop(stamp) } catch { /* bỏ qua */ }
      const kho = res.querySelector('.market-kho-icon')
      const spoonPill = el.querySelector('[data-testid="meta-spoons"]')
      const items = [...res.querySelectorAll('.market-got-item')]
      let landed = 0
      // chữ nổi trên rương: số phần hàng hiếm vừa cất (không có phần nào thì số mảnh công thức)
      const portions = result ? result.got.reduce((s, x) => s + Math.max(0, x.n), 0) : 0
      const label = portions > 0 ? `+${portions} phần` : result && result.fragment ? `+${result.fragment.n} mảnh` : ''
      const finish = () => {
        if (destroyed || !kho || !kho.isConnected || !landed) return
        try { fx.burst(kho, 'sparkle', { n: 10 }) } catch { /* bỏ qua */ }
        if (label) { try { fx.floatText(kho, label, { tone: 'good', size: 'small' }) } catch { /* bỏ qua */ } }
        app.sound('chest')
      }
      const jobs = items.map((li, i) => {
        const ico = li.querySelector('.market-got-icon')
        if (!ico) return Promise.resolve()
        const id = li.dataset.ing
        const start = (id && from && from.by[id]) || (from && from.all) || null
        const art = ico.firstElementChild || ico
        const delay = i * 140
        return wait(delay).then(() => {
          if (destroyed || !ico.isConnected) return
          // 1) rổ lựa → mẹt
          const p1 = start && li.classList.contains('is-ing') ? safeFly(fx, start, ico, art, { ms: 420, arc: 0.3 }, ico) : Promise.resolve(false)
          return p1.then(() => {
            if (destroyed || !ico.isConnected) return
            // 2) mẹt → rương kho (hàng hiếm, mảnh) hoặc viên Muỗng Vàng
            const to = li.dataset.spoon ? spoonPill : kho
            if (!to) return
            return wait(160).then(() => {
              if (destroyed || !ico.isConnected || !to.isConnected) return
              return safeFly(fx, ico, to, art, { ms: 520, arc: 0.45, scale: 0.45 }).then(ok => { if (ok && to === kho) landed++ })
            })
          })
        })
      })
      Promise.all(jobs).then(finish, () => {})
    }

    // vfx.fly an toàn: hide = phần tử đích ẩn trong lúc bay (hiện lại khi xong, kể cả bị hủy giữa chừng).
    function safeFly(fx, fromT, toT, node, opts, hide = null) {
      let p
      if (hide) hide.style.opacity = '0'
      try { p = fx.fly(fromT, toT, { node, ...opts }) } catch { p = Promise.resolve(false) }
      return Promise.resolve(p).catch(() => false).then(ok => {
        if (hide) hide.style.opacity = ''
        return ok
      })
    }

    const timers = new Set()
    function wait(ms) {
      return new Promise(resolve => {
        if (!ms) { resolve(); return }
        const t = setTimeout(() => { timers.delete(t); resolve() }, ms)
        timers.add(t)
      })
    }

    async function leave(force = false) {
      if (play && !force) {
        const ok = await app.modal({
          title: 'Rời gánh hàng?', text: 'Rổ đang lựa được giữ nguyên (kể cả món lấy nhầm), quay lại lựa tiếp trong hôm nay.',
          actions: [{ label: 'Lựa tiếp', value: false, kind: 'ghost', testid: 'confirm-cancel' }, { label: 'Rời chợ', value: true, testid: 'confirm-ok' }]
        })
        if (!ok || destroyed) return
      }
      app.saveNow()
      app.go('prep')
    }

    render()
    // Phiên mở / tan theo giờ thật khi đang ở màn giới thiệu: vẽ lại (không đụng lúc đang lựa hay đang xem kết quả).
    const sig = () => {
      try {
        const st = status()
        return JSON.stringify([st.current && st.current.id, st.current && st.current.done, st.next && st.next.id, st.locked, st.pending, st.stalls.map(s => slotState(st, s))])
      } catch { return '' }
    }
    let lastSig = sig()
    const tick = setInterval(() => {
      if (destroyed || play || result) return
      const s = sig()
      if (s !== lastSig) { lastSig = s; render(); return }
      // giờ trên biển tre chạy theo giờ thật (chỉ đổi chữ, không vẽ lại màn)
      const now = el.querySelector('.market-now')
      if (now) { try { now.textContent = 'Bây giờ ' + clockText(status().minutes) } catch { /* bỏ qua */ } }
    }, 30000)
    return {
      onBack() { leave() },
      unmount() {
        destroyed = true
        clearInterval(tick)
        for (const t of timers) clearTimeout(t)
        timers.clear()
        if (play) { try { play.handle.destroy() } catch (err) { console.error(err) } play = null }
      }
    }
  }
}
