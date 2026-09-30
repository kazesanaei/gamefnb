// Màn sự kiện có thời hạn (vd "Tri ân 20/11"): đếm ngược, Tem sự kiện, điểm danh sự kiện, 3 việc sự kiện mỗi ngày,
// chuỗi sự kiện (nhận món miễn phí), Quầy đổi Tem. Hết mùa: ân hạn đổi nốt Tem, món đã nhận giữ vĩnh viễn.
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import {
  eventsOverview, eventQuestList, claimEventQuest, eventCheckinStatus, claimEventCheckin,
  exchangeList, exchangeTem, ensureEventQuests
} from '../../core/events.js'
import { chainStatus } from '../../core/chains.js'
import { screenHead, rewardChips, rewardLine, reasonText, progressBar, durationText, rewindNote } from '../components/meta-ui.js'
import { chainCard, chainTitle } from '../components/chain-card.js'

// Chữ ngắn cho nút điểm danh sự kiện khi chưa nhận được (câu dài nằm ở dòng nhắc lùi giờ).
const CK_SHORT = { da_nhan: 'Đã nhận', lui_gio: 'Tạm khóa', het_luot: 'Đã nhận đủ' }

export function phaseText(app, ev, nowInfo = null) {
  const S = app.data.STRINGS.meta
  if (ev.phase === 'sap_dien_ra') return `${S.eventSoon} · mở sau ${durationText(ev.msToStart)}`
  if (ev.phase === 'dang_dien_ra') return `${S.eventActive} · còn ${durationText(ev.msToEnd)}`
  if (ev.phase === 'an_han') {
    const left = nowInfo ? ` · còn ${durationText(ev.graceEndMs - nowInfo.trusted)}` : ''
    return S.eventGrace.replace('{currency}', ev.currencyName) + left
  }
  return S.eventEnded
}

export default {
  mount(root, app, params = {}) {
    const S = app.data.STRINGS.meta
    const el = h('section', { class: 'meta-screen event-screen', testid: 'screen-event' })
    root.appendChild(el)

    function done(msg) {
      if (msg) app.toast(msg, { kind: 'good' })
      app.sound('coin')
      app.saveNow()
      render()
    }

    function render() {
      const state = app.state
      const nowInfo = app.nowInfo()
      ensureEventQuests(state, nowInfo, app.ctx)
      const list = eventsOverview(state, nowInfo, app.ctx)
      const ev = list.find(e => e.id === params.eventId) || list[0]
      el.textContent = ''
      if (!ev) {
        el.appendChild(screenHead(app, { title: 'Sự kiện', backLabel: '‹ Chuẩn bị' }))
        el.appendChild(h('p', { class: 'meta-body muted' }, 'Hiện chưa có sự kiện nào.'))
        return
      }
      const def = app.data.EVENTS[ev.id]
      const cur = ev.currencyName
      // lý do từ chối nói đúng tên tiền của sự kiện (vd "Chưa đủ Phấn Trắng")
      const why = reason => reason === 'thieu_tem' ? `Chưa đủ ${cur}` : reasonText(app, reason)
      const chain = def.chain ? chainStatus(state, nowInfo, app.ctx).find(c => c.eventId === ev.id) : null
      const chainClaimRecipe = !!(chain && chain.claimable.some(k => k.reward && k.reward.recipe))
      el.appendChild(screenHead(app, { title: ev.name, sub: phaseText(app, ev, nowInfo), icon: 'phan_trang', backLabel: '‹ Chuẩn bị' }))
      const rw = rewindNote(app, nowInfo)
      if (rw) el.appendChild(rw)
      const body = h('div', { class: 'meta-body' })
      el.appendChild(body)

      // Món lễ + số Tem
      body.appendChild(h('section', { class: 'ev-hero', dataset: { phase: ev.phase } },
        h('p', null, ev.desc),
        h('div', { class: 'ev-recipes' }, ev.recipes.map(r => {
          const rec = app.data.RECIPES[r.id]
          const label = state.eventRecipes && state.eventRecipes[r.id] ? state.eventRecipes[r.id].label : ev.label
          return h('div', { class: ['ev-recipe', r.owned ? 'is-owned' : ''], testid: 'event-recipe-' + r.id },
            svgBox(icon(rec ? rec.icon : r.id), 'ev-recipe-icon'),
            h('div', null, h('b', null, rec ? rec.name : r.id),
              h('small', null, r.owned ? `Đã có · ${label}`
                : chainClaimRecipe ? 'Đã xong chuỗi sự kiện: bấm nhận công thức ở mục chuỗi bên dưới.'
                  : ev.phase === 'an_han' ? 'Mùa sự kiện đã qua. Món sẽ quay lại ở đợt "Món trở lại".'
                    : 'Nhận miễn phí qua chuỗi sự kiện, chỉ cần chơi 3 ngày bất kỳ')))
        })),
        ev.phase !== 'sap_dien_ra' ? h('div', { class: 'ev-tem', testid: 'event-tem', dataset: { amount: ev.tem } },
          svgBox(icon('phan_trang'), 'ev-tem-icon'),
          h('div', null, h('b', null, `${ev.tem} ${cur}`),
            h('small', null, ev.phase === 'dang_dien_ra'
              ? `Hôm nay từ món ăn: ${ev.temToday}/${ev.dailyCap}. Món đạt Ngon trở lên +1, món lễ thêm +2.`
              : `Đổi nốt trước khi hết ân hạn. ${cur} còn dư sẽ tự đổi ra Tiền quán (tỉ lệ thấp) qua Hộp thư.`))) : null))

      if (ev.phase === 'sap_dien_ra') {
        body.appendChild(h('p', { class: 'meta-hint' }, `Sự kiện mở lúc 04:00 ngày ${def.from.split('-').reverse().join('/')}. Trong mùa, món đạt Ngon trở lên được thưởng ${cur}; món lễ được khách gọi nhiều gấp đôi, giá bán không đổi.`))
        return
      }

      if (ev.phase === 'dang_dien_ra') {
        // Điểm danh sự kiện
        const ck = eventCheckinStatus(state, ev.id, nowInfo, app.ctx)
        body.appendChild(h('section', { class: 'card ev-block' },
          h('h2', { class: 'card-title' }, 'Điểm danh sự kiện'),
          h('div', { class: 'ev-ck-row' }, Array.from({ length: ck.slots }, (_, i) =>
            h('span', { class: ['ev-ck', i < ck.next ? 'is-claimed' : '', i === ck.next ? 'is-next' : ''] }, i < ck.next ? '✓' : String(i + 1)))),
          h('div', { class: 'ev-row' },
            h('span', { class: 'small' }, `Mỗi ngày ${ck.tem} ${cur}`),
            h('button', {
              class: ['btn', 'btn-small', ck.canClaim ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'event-checkin-claim',
              disabled: !ck.canClaim,
              onclick: () => {
                const r = claimEventCheckin(app.state, ev.id, app.nowInfo(), app.ctx)
                if (!r.ok) { app.toast(why(r.reason), { kind: 'bad' }); return }
                done('Nhận: ' + rewardLine(r.reward, app.data, { currency: cur }))
              }
            }, ck.canClaim ? 'Nhận' : CK_SHORT[ck.reason] || why(ck.reason)))))

        // Việc sự kiện hôm nay
        const qs = eventQuestList(state, ev.id, nowInfo, app.ctx)
        if (qs.length) {
          body.appendChild(h('section', { class: 'card ev-block' },
            h('h2', { class: 'card-title' }, 'Việc sự kiện hôm nay'),
            h('ul', { class: 'ev-quests' }, qs.map(q => h('li', { class: ['ev-quest', q.done ? 'is-done' : ''], testid: 'event-quest-' + q.id },
              h('div', { class: 'ev-quest-main' }, h('span', null, q.text),
                h('div', { class: 'quest-prog' }, progressBar(q.progress, q.target), h('span', { class: 'quest-num' }, `${q.progress}/${q.target}`)),
                q.assistText ? h('small', { class: 'ev-assist' }, q.assistText) : null),
              h('button', {
                class: ['btn', 'btn-small', q.done && !q.claimed ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'event-quest-claim-' + q.id,
                disabled: !q.done || q.claimed,
                onclick: () => {
                  const r = claimEventQuest(app.state, ev.id, q.id, app.nowInfo(), app.ctx)
                  if (!r.ok) { app.toast(why(r.reason), { kind: 'bad' }); return }
                  done('Nhận: ' + rewardLine(r.reward, app.data, { currency: cur }))
                }
              }, q.claimed ? 'Đã nhận' : `+${(q.reward && q.reward.tem) || 0}`))))))
        }

      }

      // Chuỗi sự kiện: trong mùa; và trong ân hạn khi còn bước đã xong chưa nhận (lõi cho nhận tới hết ân hạn)
      if (chain && def.chain && (ev.phase === 'dang_dien_ra' || (ev.phase === 'an_han' && chain.claimable.length))) {
        const cs = (state.chains || {})[chain.id]
        const stepNo = cs ? cs.step : 0
        body.appendChild(h('h2', { class: 'meta-section' }, `Chuỗi "${def.chain.name}"`))
        if (ev.phase === 'an_han') body.appendChild(h('p', { class: 'meta-hint ev-grace-note', testid: 'event-grace-chain' }, `Thưởng chuỗi đã xong vẫn nhận được tới hết ân hạn. Sau đó công thức gửi qua Hộp thư, ${cur} cộng vào phần dư.`))
        body.appendChild(chainCard(app, chain, { title: chainTitle(chain), stepTestid: 'event-chain-step', onChange: () => render() }))
        body.appendChild(h('ol', { class: 'ev-steps' }, def.chain.steps.map((st, i) =>
          h('li', { class: [i < stepNo ? 'is-done' : '', i === stepNo && !(cs && cs.done) ? 'is-current' : ''] },
            h('span', { class: 'ev-step-no' }, i < stepNo ? '✓' : String(i + 1)),
            h('span', null, String(st.text || '').replace('{n}', String(st.target || 1))),
            rewardChips({ tem: (st.reward && st.reward.tem) || 0, recipe: st.reward && st.reward.recipe }, app.data, { compact: true, currency: cur })))))
      }

      // Quầy đổi Tem (trong mùa và ân hạn)
      const ex = exchangeList(state, ev.id, app.ctx)
      if (ex.length) {
        body.appendChild(h('h2', { class: 'meta-section' }, S.eventExchange.replace('{currency}', cur)))
        body.appendChild(h('div', { class: 'ex-grid' }, ex.map(x => {
          const owned = x.gives && x.gives.cosmetic && ((state.cosmetics && state.cosmetics.owned) || []).includes(x.gives.cosmetic)
          const can = x.left > 0 && x.canAfford && !owned
          return h('div', { class: ['ex-item', owned ? 'is-owned' : ''], testid: 'event-exchange-item-' + x.id },
            h('b', null, x.name),
            h('small', { class: 'muted' }, x.limit > 1 ? `Còn ${x.left}/${x.limit} lần` : owned ? 'Đã có' : 'Chỉ 1 lần'),
            h('button', {
              class: ['btn', 'btn-small', can ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'event-exchange-' + x.id,
              disabled: !can,
              onclick: async () => {
                const ok = await app.modal({
                  title: `Đổi ${x.name}?`, text: `Trả ${x.price} ${cur}.`,
                  actions: [{ label: 'Để sau', value: false, kind: 'ghost', testid: 'confirm-cancel' }, { label: 'Đổi', value: true, testid: 'confirm-ok' }]
                })
                if (!ok) return
                const r = exchangeTem(app.state, ev.id, x.id, app.nowInfo(), app.ctx)
                if (!r.ok) { app.toast(why(r.reason), { kind: 'bad' }); return }
                done('Đã đổi: ' + rewardLine(r.reward, app.data))
              }
            }, owned ? 'Đã có' : `${x.price} ${cur}`))
        })))
      }
    }

    render()
    return { unmount() {} }
  }
}
