// Màn "Gánh hàng quê" (M4, thiết kế mục C.6a): lựa hàng hiếm ở phiên hàng theo giờ thật Việt Nam (Chợ sớm 05:00–09:00,
// Xe ba gác trưa 11:00–13:30, Gánh đặc sản tối 17:30–21:00). Mini-game "Lựa hàng" dùng lại nguyên bước Chọn nguyên liệu
// (MINIGAMES.chon) với kệ 9 ô dựng tạm ở lõi (rare.stallGame): hàng hiếm là món phải lấy, hàng thường dễ nhầm là bẫy.
// Kết quả (rare.finishStall): luôn được ít nhất 1 phần; từ 90 điểm thêm 1 phần; từ 75 điểm có 50% được 1 mảnh công thức.
// Chọn nhầm hàng thường → thẻ Mẹo nghề "Kiểm hàng trước khi nhận". Mỗi phiên 1 lượt mỗi ngày thật, chỉ ở ngoài ca,
// khóa khi giờ máy bị lùi. Rời màn giữa chừng: lượt lựa dở được giữ (rare.pendingStall), quay lại lựa tiếp trong ngày;
// rổ đang chọn và số lần chọn nhầm lưu vào save mỗi lần chạm (rare.saveStallDraft), "Lựa tiếp" khôi phục đúng rổ đó.
// params: { stallId }.
import { h, svgBox } from '../dom.js'
import { icon, face, DI_SAU } from '../art.js'
import { playStep } from '../minigames/index.js'
import { uiRand, hashKey } from '../minigames/_util.js'
import { stallStatus, startStall, finishStall, rareConfig, rareStock, saveStallDraft } from '../../core/rare.js'
import { screenHead, reasonText, rewindNote } from '../components/meta-ui.js'

// Hình ngôi sao độ hiếm (★1, ★2).
export function starText(n) {
  return '★'.repeat(Math.max(1, Math.min(3, Number(n) || 1)))
}

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

    // help: nút "?" (Hướng dẫn) — không đặt trong lúc đang lựa (đồng hồ của bước lựa không dừng theo bảng Hướng dẫn)
    function head(sub, help = true) {
      return screenHead(app, { title: S.screens.market || 'Gánh hàng quê', sub, backLabel: '‹ Chuẩn bị', onBack: () => leave(), help })
    }

    // Đầu màn + thân màn (lề 16px hai bên); trả thân màn để gắn thẻ.
    function frame(sub, help = true) {
      el.textContent = ''
      el.appendChild(head(sub, help))
      const body = h('div', { class: 'meta-body market-body' })
      el.appendChild(body)
      return body
    }

    // Thẻ một món hàng hiếm của phiên: hình, tên, độ hiếm, quê, tồn kho.
    function goodRow(id) {
      const g = INGS[id]
      if (!g) return null
      const C = rareConfig(app.ctx)
      return h('li', { class: 'market-good', dataset: { ing: id } },
        svgBox(icon(g.icon || id), 'market-good-icon'),
        h('div', { class: 'market-good-text' },
          h('b', null, g.name, ' ', h('span', { class: 'rare-star', 'aria-label': `độ hiếm ${g.star || 1} sao` }, starText(g.star))),
          h('small', { class: 'muted' }, `Quê: ${g.origin || '—'} · Kho: ${rareStock(app.state, id)}/${C.stockMax} phần`),
          (g.traps || []).length ? h('small', { class: 'market-trap' },
            'Dễ nhầm với: ' + g.traps.map(t => (INGS[t] ? INGS[t].name : t).toLocaleLowerCase('vi-VN')).join(', ')) : null))
    }

    function render() {
      if (destroyed) return
      const ni = app.nowInfo()
      const st = status()
      const id = stallId()
      const stall = id && stallDef(id)
      if (result) return renderResult(stall)
      if (!stall) {
        const body = frame('Hiện chưa có phiên nào mở')
        body.appendChild(h('section', { class: 'card market-intro', testid: 'market-intro' },
          h('p', null, nextText(st)),
          backBtn()))
        return
      }
      const C = rareConfig(app.ctx).stall
      const pending = st.pending === stall.id
      const cur = st.current && st.current.id === stall.id ? st.current : null
      const canStart = pending ? (!st.locked && !st.inShift) : !!(cur && cur.canStart)
      const reason = pending ? (st.locked ? 'lui_gio' : st.inShift ? 'dang_ban' : null)
        : (cur ? cur.reason : 'ngoai_gio')
      const body = frame(`${stall.name} · ${stall.from}–${stall.to}`)
      const rw = rewindNote(app, ni)
      if (rw) body.appendChild(rw)
      body.appendChild(h('section', { class: 'card market-intro', testid: 'market-intro', dataset: { stall: stall.id } },
        h('div', { class: 'npc-talk' }, svgBox(stall.persona ? face(stall.persona, 'vui', stall.gender) : DI_SAU.vui, 'npc-face small'),
          h('div', { class: 'bubble npc-bubble' }, h('b', null, stall.seller || stall.name), h('p', null, stall.hello || stall.desc))),
        h('p', { class: 'small' }, stall.desc),
        h('h2', { class: 'card-title' }, 'Hàng hiếm hôm nay'),
        h('ul', { class: 'market-goods' }, (stall.goods || []).map(goodRow)),
        h('ul', { class: 'market-rules small' },
          h('li', null, 'Lựa đúng các món hàng hiếm, bỏ qua hàng thường dễ nhầm. Chạm lần nữa để bỏ ra.'),
          h('li', null, `Luôn được ít nhất ${C.base} phần. Từ ${C.bonusAt} điểm thêm 1 phần.`),
          h('li', null, `Từ ${C.fragmentAt} điểm: ${Math.round(C.fragmentRate * 100)}% được 1 mảnh công thức hiếm.`),
          h('li', null, 'Mỗi phiên 1 lượt mỗi ngày. Lỡ phiên không sao, còn phiên khác và khách lạ.')),
        canStart
          ? h('button', { class: 'btn btn-primary btn-big', type: 'button', testid: 'stall-start', onclick: () => begin(stall.id) },
            pending ? 'Lựa tiếp' : 'Bắt đầu lựa hàng')
          : h('p', { class: 'small market-locked', testid: 'stall-locked' }, reasonText(app, reason || 'ngoai_gio') + (reason === 'ngoai_gio' ? ' · ' + nextText(st) : '')),
        backBtn()))
    }

    function nextText(st) {
      if (st.next) return `Phiên kế tiếp: ${st.next.name}, ${st.next.from}–${st.next.to}.`
      if (st.tomorrow) return `Hẹn ngày mai: ${st.tomorrow.name}, ${st.tomorrow.from}–${st.tomorrow.to}.`
      return 'Hẹn phiên sau nha.'
    }

    function backBtn() {
      return h('button', { class: 'btn btn-ghost', type: 'button', testid: 'market-back', onclick: () => leave() }, 'Về màn Chuẩn bị')
    }

    function begin(id) {
      const r = startStall(app.state, id, app.nowInfo(), app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); render(); return }
      app.sound('click')
      app.saveNow()
      const body = frame(`${r.stall.name} · lựa hàng`, false)
      const stage = h('div', { class: 'mg-stage' })
      const wrap = h('section', { class: 'market-stage', testid: 'market-stage', dataset: { stall: id } },
        h('p', { class: 'small market-hint' }, 'Bỏ vào rổ đúng ' + r.game.goods.map(g => INGS[g] ? INGS[g].name : g).join(' và ') + ', rồi bấm Xong.'),
        stage)
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
        result = out
        app.sound(out.score >= 90 ? 'ding' : 'coin')
        app.saveNow()
        render()
      })
    }

    function renderResult(stall) {
      const r = result
      const tips = Array.isArray(app.data.TIPS) ? app.data.TIPS : []
      const tip = r.wrong ? tips.find(t => t.trigger === 'kiem_hang') : null
      const body = frame(`${r.name || (stall && stall.name) || ''} · kết quả`)
      const got = r.got.filter(x => x.n > 0)
      body.appendChild(h('section', { class: 'card market-result', testid: 'market-result',
        dataset: { score: String(r.score), got: String(got.reduce((s, x) => s + x.n, 0)), fragment: r.fragment ? r.fragment.recipeId : '' } },
      h('div', { class: 'market-score' }, h('span', { class: 'muted' }, 'Điểm lựa hàng'), h('b', null, String(r.score))),
      h('ul', { class: 'market-got' },
        got.map(x => h('li', { testid: 'market-got-' + x.id }, svgBox(icon((INGS[x.id] && INGS[x.id].icon) || x.id), 'market-good-icon'),
          h('span', null, `+${x.n} phần ${x.name}`))),
        r.fragment ? h('li', { testid: 'market-fragment' }, svgBox(icon(((app.data.RECIPES || {})[r.fragment.recipeId] || {}).icon || 'thu'), 'market-good-icon'),
          h('span', null, `+${r.fragment.n} mảnh công thức ${r.fragment.name}`)) : null,
        r.spoons > 0 ? h('li', null, svgBox(icon('muong_vang'), 'market-good-icon'),
          h('span', null, `+${r.spoons} Muỗng Vàng (kho hoặc mức hôm nay đã đủ)`)) : null),
      h('div', { class: 'npc-talk' }, svgBox(r.score >= 90 ? DI_SAU.tu_hao : DI_SAU.vui, 'npc-face small'),
        h('div', { class: 'bubble npc-bubble' }, h('b', null, 'Dì Sáu'),
          h('p', null, r.score >= 90 ? 'Lựa khéo quá con! Hàng thật, đúng món, cất kho dùng dần nha.'
            : r.wrong ? 'Có món lấy nhầm hàng thường rồi con. Nhận hàng phải coi kỹ từng món.'
              : 'Được rồi con, lần sau lựa nhanh tay hơn chút nữa.'))),
      tip ? h('div', { class: 'incident-tip', testid: 'market-tip' }, h('b', null, 'Mẹo nghề: ' + tip.title), h('p', null, tip.text)) : null,
      h('p', { class: 'small muted' }, (RS.stockNote || '').replace('{max}', String(rareConfig(app.ctx).stockMax)).replace('{gold}', String(rareConfig(app.ctx).overflowGold))),
      h('button', { class: 'btn btn-primary btn-big', type: 'button', testid: 'market-done', onclick: () => leave(true) }, 'Về màn Chuẩn bị')))
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
    return {
      onBack() { leave() },
      unmount() {
        destroyed = true
        if (play) { try { play.handle.destroy() } catch (err) { console.error(err) } play = null }
      }
    }
  }
}
