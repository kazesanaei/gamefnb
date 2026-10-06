// Màn sự kiện có thời hạn (vd "Tri ân 20/11"): đếm ngược, Tem sự kiện, điểm danh sự kiện, 3 việc sự kiện mỗi ngày,
// chuỗi sự kiện (nhận món miễn phí), Quầy đổi Tem. Hết mùa: ân hạn đổi nốt Tem, món đã nhận giữ vĩnh viễn.
// M5 Đợt 3 (gói M-C, bản 0.5.2): băng rôn sự kiện có hình (bó hoa tri ân) + đồng hồ đếm ngược; ví Tem có hình tiền sự kiện
// (bảng phấn) và số to; món giới hạn (Chè bưởi) hình to trên đĩa có quầng; điểm danh sự kiện là 7 tờ lịch nhỏ; việc sự
// kiện là tờ giấy có hình loại việc; chuỗi sự kiện ngoài thẻ chuỗi còn có "con đường" các mốc (đã qua có dấu tick, mốc
// đang làm nổi bật, đích là món giới hạn); Quầy đổi là các món hàng có hình (xe đẩy xem trước đồ trang trí, Muỗng Vàng).
// Nhận Tem thì mảnh tiền sự kiện bay về ví Tem (nhân bản rồi bay: khung nút lấy trước khi vẽ lại), Muỗng Vàng / tiền bay
// về viên ở đầu màn. Không đổi luật, Tem, phần thưởng. Giữ testid screen-event, event-tem (data-amount), event-checkin-claim,
// event-quest-<id>, event-quest-claim-<id>, event-recipe-<món> (.is-owned, chữ nhãn mùa / "nhận công thức"),
// event-exchange-<id>, event-exchange-item-<id>, event-chain-step (qua chainCard), event-grace-chain (p.meta-hint.ev-grace-note);
// giữ export phaseText (màn Chuẩn bị dùng).
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { metaArt } from '../art/meta.js'
import { SCENE_ICONS } from '../art/scene.js'
import {
  eventsOverview, eventQuestList, claimEventQuest, eventCheckinStatus, claimEventCheckin,
  exchangeList, exchangeTem, ensureEventQuests
} from '../../core/events.js'
import { chainStatus } from '../../core/chains.js'
import {
  screenHead, rewardChips, rewardLine, rewardParts, partArt, reasonText, progressBar, durationText, rewindNote,
  celebrateReward, cartArt, cartOptions
} from '../components/meta-ui.js'
import { chainCard, chainTitle } from '../components/chain-card.js'
import { rewardBurst } from '../vfx.js'

// Chữ ngắn cho nút điểm danh sự kiện khi chưa nhận được (câu dài nằm ở dòng nhắc lùi giờ).
const CK_SHORT = { da_nhan: 'Đã nhận', lui_gio: 'Tạm khóa', het_luot: 'Đã nhận đủ' }
// Hình loại việc sự kiện theo tín hiệu đếm.
const SIGNAL_ART = Object.freeze({ served: 'tab_quay', change_correct: 'tab_quay', dish_good: 'tab_bep', dish_excellent: 'tab_bep', five_star: 'hud_sao', good_rating: 'hud_sao' })

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

/** Đồng hồ đếm ngược của băng rôn: "Mở sau 2 ngày 18 giờ" / "Còn 7 ngày 18 giờ" / "Còn 1 ngày để đổi". Thuần. */
export function countdownText(ev, nowInfo = null) {
  if (ev.phase === 'sap_dien_ra') return `Mở sau ${durationText(ev.msToStart)}`
  if (ev.phase === 'dang_dien_ra') return `Còn ${durationText(ev.msToEnd)}`
  if (ev.phase === 'an_han') return `Còn ${durationText(ev.graceEndMs - (nowInfo ? nowInfo.trusted : ev.toMs))} để đổi`
  return 'Đã kết thúc'
}

// Khung cắt của hình xe đẩy (viewBox 0 0 240 170) để đồ trang trí nằm giữa hình xem trước: biển (bảng đèn), chậu hoa, dù.
const CART_CROP = Object.freeze({ bien: '44 88 152 62', trang_tri: '-4 76 132 90', du: '6 0 228 104' })

/** Hình xem trước một món của Quầy đổi: đồ thẩm mỹ → xe đẩy đang dùng thử món đó (cắt khung vào chỗ đồ trang trí); còn
 *  lại → hình phần thưởng. */
function exchangeArt(app, x) {
  const C = app.data.COSMETICS || {}
  const id = x.gives && x.gives.cosmetic
  const c = id && C[id]
  if (c && c.slot) {
    const crop = CART_CROP[c.slot]
    let svg = cartArt(cartOptions(app.state, app.data, { [c.slot]: id }))
    if (crop) svg = svg.replace('viewBox="0 0 240 170"', `viewBox="${crop}"`)
    return { svg, cart: true, slot: c.slot }
  }
  const p = rewardParts(x.gives || {}, app.data)[0]
  return { svg: p ? partArt(p) : metaArt('qua'), cart: false, qty: p ? p.qty : '' }
}

export default {
  mount(root, app, params = {}) {
    const S = app.data.STRINGS.meta
    const el = h('section', { class: 'meta-screen event-screen', testid: 'screen-event' })
    root.appendChild(el)
    let destroyed = false
    let pendingFx = null      // hiệu ứng nhận quà chạy sau lần vẽ kế tiếp: { reward, rect }
    let stampCk = -1          // ô điểm danh sự kiện vừa nhận (đóng dấu một lần)
    // đã mở màn Sự kiện: thông báo tự cộng Tem (bật ở màn Chuẩn bị) thừa và che đầu màn → cất đi
    if (app.overlay) for (const t of app.overlay.querySelectorAll('[data-testid="event-auto-toast"]')) t.remove()

    // Nhận xong: toast có hình, lưu, vẽ lại, rồi hiệu ứng (rect lấy trước khi vẽ lại).
    function done(reward, rect, prefix = 'Nhận: ', currency) {
      const p = rewardParts(reward || {}, app.data, { currency })[0]
      app.toast(prefix + rewardLine(reward || {}, app.data, { currency }), { kind: 'good', icon: p ? partArt(p) : undefined })
      app.sound('coin')
      app.saveNow()
      pendingFx = rect ? { reward, rect } : null
      render()
    }

    // Tem bay về ví Tem (số đếm lên); phần còn lại (Muỗng Vàng, tiền, hiện vật) theo celebrateReward.
    function playFx(fx, currencyId) {
      if (!fx || !fx.rect || destroyed) return
      const reward = fx.reward || {}
      const tem = Math.max(0, Math.round(Number(reward.tem) || 0))
      const wallet = el.querySelector('[data-testid="event-tem"]')
      if (tem && wallet && app.vfx) {
        const num = wallet.querySelector('.ev-tem-num')
        rewardBurst(app.vfx, fx.rect, [{ kind: 'item', n: 3, to: wallet.querySelector('.ev-tem-icon') || wallet, html: metaArt(currencyId) || metaArt('tem') }])
        const to = Number(wallet.dataset.amount)
        if (num && Number.isFinite(to) && typeof app.vfx.countUp === 'function') {
          try { app.vfx.countUp(num, Math.max(0, to - tem), to, 800, v => String(v), { glow: false }) } catch { /* bỏ qua */ }
        }
        const rest = { ...reward }
        delete rest.tem
        delete rest.eventId
        if (rest.money || rest.gold) celebrateReward(app, fx.rect, { money: rest.money, gold: rest.gold })
        return
      }
      celebrateReward(app, fx.rect, reward)
    }

    function render() {
      if (destroyed) return
      const state = app.state
      const nowInfo = app.nowInfo()
      ensureEventQuests(state, nowInfo, app.ctx)
      const list = eventsOverview(state, nowInfo, app.ctx)
      const ev = list.find(e => e.id === params.eventId) || list[0]
      el.textContent = ''
      if (!ev) {
        el.appendChild(screenHead(app, { title: 'Sự kiện', backLabel: '‹ Chuẩn bị' }))
        el.appendChild(h('div', { class: 'meta-body' },
          h('div', { class: 'ev-none g-paper-meta' }, svgBox(metaArt('su_kien'), 'ev-none-art'), h('p', null, 'Hiện chưa có sự kiện nào.'))))
        pendingFx = null
        return
      }
      const def = app.data.EVENTS[ev.id]
      const cur = ev.currencyName
      const curArt = metaArt(def.currencyId) || metaArt('tem')
      // lý do từ chối nói đúng tên tiền của sự kiện (vd "Chưa đủ Phấn Trắng")
      const why = reason => reason === 'thieu_tem' ? `Chưa đủ ${cur}` : reasonText(app, reason)
      const chain = def.chain ? chainStatus(state, nowInfo, app.ctx).find(c => c.eventId === ev.id) : null
      const chainClaimRecipe = !!(chain && chain.claimable.some(k => k.reward && k.reward.recipe))
      const phaseShort = ev.phase === 'sap_dien_ra' ? S.eventSoon : ev.phase === 'dang_dien_ra' ? S.eventActive
        : ev.phase === 'an_han' ? S.eventGrace.replace('{currency}', cur) : S.eventEnded
      el.appendChild(screenHead(app, { title: 'Sự kiện', sub: `${ev.name} · ${phaseShort}`, backLabel: '‹ Chuẩn bị' }))
      const rw = rewindNote(app, nowInfo)
      if (rw) el.appendChild(rw)
      const body = h('div', { class: 'meta-body ev-body' })
      el.appendChild(body)

      // ---- Băng rôn: tên sự kiện trên dải vải, hình to, đồng hồ đếm ngược, lời giới thiệu; ví Tem ----
      const firstRecipe = ev.recipes[0]
      body.appendChild(h('section', { class: ['ev-hero', 'ev-banner', 'is-' + ev.phase], dataset: { phase: ev.phase } },
        h('div', { class: 'ev-ribbon' }, h('span', { class: 'ev-ribbon-text' }, ev.name)),
        h('div', { class: 'ev-banner-body' },
          svgBox(metaArt(ev.id) || metaArt('su_kien'), 'ev-banner-art'),
          h('div', { class: 'ev-banner-text' },
            h('span', { class: 'ev-phase-chip' }, ev.phase === 'an_han' ? 'Ân hạn' : phaseShort),
            h('p', { class: 'ev-count', role: 'timer' }, svgBox(SCENE_ICONS.hud_gio || metaArt('o_lich'), 'ev-count-ico'), h('span', null, countdownText(ev, nowInfo))),
            h('p', { class: 'ev-desc' }, ev.desc))),
        ev.phase !== 'sap_dien_ra' ? h('div', { class: 'ev-tem', testid: 'event-tem', dataset: { amount: ev.tem } },
          svgBox(curArt, 'ev-tem-icon'),
          h('div', { class: 'ev-tem-text' },
            h('span', { class: 'ev-tem-line' }, h('b', { class: 'ev-tem-num' }, String(ev.tem)), h('span', { class: 'ev-tem-cur' }, cur)),
            h('small', null, ev.phase === 'dang_dien_ra'
              ? `Hôm nay từ món ăn: ${ev.temToday}/${ev.dailyCap}. Món đạt Ngon trở lên +1, món lễ thêm +2.`
              : `Đổi nốt trước khi hết ân hạn. ${cur} còn dư sẽ tự đổi ra Tiền quán (tỉ lệ thấp) qua Hộp thư.`))) : null))

      // ---- Món giới hạn: hình to trên đĩa có quầng ----
      body.appendChild(h('div', { class: 'ev-recipes' }, ev.recipes.map(r => {
        const rec = app.data.RECIPES[r.id]
        const label = state.eventRecipes && state.eventRecipes[r.id] ? state.eventRecipes[r.id].label : ev.label
        const status = r.owned ? `Đã có · ${label}`
          : chainClaimRecipe ? 'Đã xong chuỗi sự kiện: bấm nhận công thức ở mục chuỗi bên dưới.'
            : ev.phase === 'an_han' ? 'Mùa sự kiện đã qua. Món sẽ quay lại ở đợt "Món trở lại".'
              : 'Nhận miễn phí qua chuỗi sự kiện, chỉ cần chơi 3 ngày bất kỳ'
        return h('div', { class: ['ev-recipe', r.owned ? 'is-owned' : '', chainClaimRecipe && !r.owned ? 'is-claimable' : ''], testid: 'event-recipe-' + r.id },
          h('span', { class: 'ev-recipe-stage' },
            h('span', { class: 'ev-recipe-glow', 'aria-hidden': 'true' }),
            svgBox(icon(rec ? rec.icon : r.id), 'ev-recipe-icon'),
            r.owned ? svgBox(metaArt('dau_tick'), 'ev-recipe-tick') : null),
          h('div', { class: 'ev-recipe-text' },
            h('span', { class: 'ev-recipe-tag' }, r.owned ? 'Món của xe' : 'Món giới hạn'),
            h('b', null, rec ? rec.name : r.id),
            h('small', null, status)))
      })))

      if (ev.phase === 'sap_dien_ra') {
        body.appendChild(h('p', { class: 'meta-hint ev-soon-hint' }, `Sự kiện mở lúc 04:00 ngày ${def.from.split('-').reverse().join('/')}. Trong mùa, món đạt Ngon trở lên được thưởng ${cur}; món lễ được khách gọi nhiều gấp đôi, giá bán không đổi.`))
        pendingFx = null
        return
      }

      if (ev.phase === 'dang_dien_ra') {
        // ---- Điểm danh sự kiện: 7 tờ lịch nhỏ + nút nhận ----
        const ck = eventCheckinStatus(state, ev.id, nowInfo, app.ctx)
        const cells = Array.from({ length: ck.slots }, (_, i) => {
          const claimed = i < ck.next
          const next = i === ck.next
          return h('li', { class: ['ev-ck', claimed ? 'is-claimed' : '', next ? 'is-next' : '', next && ck.canClaim ? 'is-today' : '', stampCk === i ? 'is-stamping' : ''] },
            h('span', { class: 'ev-ck-day' }, String(i + 1)),
            claimed ? svgBox(metaArt('dau_tick'), 'ev-ck-tick') : svgBox(curArt, 'ev-ck-art'))
        })
        stampCk = -1
        body.appendChild(h('section', { class: 'ev-block ev-ck-block g-paper-meta' },
          h('div', { class: 'ev-block-head' },
            h('div', { class: 'ev-block-title' }, h('h2', { class: 'card-title' }, 'Điểm danh sự kiện'), h('small', null, `Mỗi ngày ${ck.tem} ${cur}`)),
            h('button', {
              class: ['btn', 'btn-small', 'ev-ck-btn', ck.canClaim ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'event-checkin-claim',
              disabled: !ck.canClaim,
              'aria-label': ck.canClaim ? `Nhận ${ck.tem} ${cur}` : null,
              onclick: ev2 => {
                const rect = rectOf(ev2)
                const idx = ck.next
                const r = claimEventCheckin(app.state, ev.id, app.nowInfo(), app.ctx)
                if (!r.ok) { app.toast(why(r.reason), { kind: 'bad' }); return }
                stampCk = idx
                done(r.reward, rect, 'Nhận: ', cur)
              }
            }, ck.canClaim ? [svgBox(curArt, 'ev-btn-ico'), `+${ck.tem}`] : CK_SHORT[ck.reason] || why(ck.reason))),
          h('ol', { class: 'ev-ck-row', 'aria-label': `Đã điểm danh ${ck.next}/${ck.slots} ngày` }, cells)))

        // ---- Việc sự kiện hôm nay: tờ giấy có hình loại việc ----
        const qs = eventQuestList(state, ev.id, nowInfo, app.ctx)
        if (qs.length) {
          body.appendChild(h('section', { class: 'ev-block ev-quests-block g-paper-meta' },
            h('div', { class: 'ev-block-head' }, h('div', { class: 'ev-block-title' }, h('h2', { class: 'card-title' }, 'Việc sự kiện hôm nay'), h('small', null, 'Đổi mới lúc 04:00'))),
            h('ul', { class: 'ev-quests' }, qs.map(q => {
              const qd = (def.quests || []).find(x => x.id === q.id) || {}
              const tem = (q.reward && q.reward.tem) || 0
              return h('li', { class: ['ev-quest', q.done ? 'is-done' : '', q.claimed ? 'is-claimed' : ''], testid: 'event-quest-' + q.id },
                h('span', { class: 'ev-quest-type' }, svgBox(SCENE_ICONS[SIGNAL_ART[qd.signal]] || SCENE_ICONS.hud_sao, 'ev-quest-icon'),
                  q.done ? svgBox(metaArt('dau_tick'), 'ev-quest-tick') : null),
                h('div', { class: 'ev-quest-main' }, h('span', { class: 'ev-quest-text' }, q.text),
                  q.claimed ? null : h('div', { class: 'quest-prog' }, progressBar(q.progress, q.target, { label: q.text }), h('span', { class: 'quest-num' }, `${q.progress}/${q.target}`)),
                  q.assistText ? h('small', { class: 'ev-assist' }, q.assistText) : null),
                h('button', {
                  class: ['btn', 'btn-small', 'ev-quest-btn', q.claimed ? 'is-claimed' : q.done ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'event-quest-claim-' + q.id,
                  disabled: !q.done || q.claimed,
                  'aria-label': q.claimed ? 'Đã nhận' : `Nhận ${tem} ${cur}`,
                  onclick: ev2 => {
                    const rect = rectOf(ev2)
                    const r = claimEventQuest(app.state, ev.id, q.id, app.nowInfo(), app.ctx)
                    if (!r.ok) { app.toast(why(r.reason), { kind: 'bad' }); return }
                    done(r.reward, rect, 'Nhận: ', cur)
                  }
                }, q.claimed ? [svgBox(metaArt('dau_tick'), 'ev-btn-ico'), 'Đã nhận'] : [svgBox(curArt, 'ev-btn-ico'), `+${tem}`]))
            }))))
        }
      }

      // ---- Chuỗi sự kiện: trong mùa; và trong ân hạn khi còn bước đã xong chưa nhận (lõi cho nhận tới hết ân hạn) ----
      if (chain && def.chain && (ev.phase === 'dang_dien_ra' || (ev.phase === 'an_han' && chain.claimable.length))) {
        const cs = (state.chains || {})[chain.id]
        const stepNo = cs ? cs.step : 0
        const allDone = !!(cs && cs.done)
        body.appendChild(h('h2', { class: 'meta-section' }, `Chuỗi "${def.chain.name}"`))
        if (ev.phase === 'an_han') body.appendChild(h('p', { class: 'meta-hint ev-grace-note', testid: 'event-grace-chain' }, `Thưởng chuỗi đã xong vẫn nhận được tới hết ân hạn. Sau đó công thức gửi qua Hộp thư, ${cur} cộng vào phần dư.`))
        body.appendChild(chainCard(app, chain, {
          title: chainTitle(chain), stepTestid: 'event-chain-step',
          onClaimed: (reward, rect) => { pendingFx = { reward, rect } },
          onChange: () => render()
        }))
        // con đường các mốc: đã qua (tick), đang làm (nổi bật), sắp tới; đích là món giới hạn
        const steps = def.chain.steps
        body.appendChild(h('ol', { class: 'ev-road', 'aria-label': `Con đường chuỗi "${def.chain.name}"` }, steps.map((st, i) => {
          const isDone = i < stepNo
          const isNow = i === stepNo && !allDone
          const last = i === steps.length - 1
          const reward = st.reward || {}
          const recId = reward.recipe
          const rec = recId && app.data.RECIPES[recId]
          return h('li', { class: ['ev-stop', isDone ? 'is-done' : '', isNow ? 'is-current' : '', last ? 'is-final' : ''] },
            h('span', { class: 'ev-stop-pin', 'aria-hidden': 'true' }, isDone ? svgBox(metaArt('dau_tick'), 'ev-stop-tick') : String(i + 1)),
            h('div', { class: 'ev-stop-text' },
              h('span', null, String(st.text || '').replace('{n}', String(st.target || 1))),
              rewardChips({ tem: reward.tem || 0 }, app.data, { compact: true, slots: true, currency: cur })),
            last && rec ? h('span', { class: 'ev-stop-goal' }, svgBox(icon(rec.icon), 'ev-stop-goal-art'), h('b', null, rec.name)) : null)
        })))
      }

      // ---- Quầy đổi Tem (trong mùa và ân hạn): món hàng có hình ----
      const ex = exchangeList(state, ev.id, app.ctx)
      if (ex.length) {
        body.appendChild(h('h2', { class: 'meta-section' }, S.eventExchange.replace('{currency}', cur)))
        body.appendChild(h('div', { class: 'ex-grid' }, ex.map(x => {
          const owned = x.gives && x.gives.cosmetic && ((state.cosmetics && state.cosmetics.owned) || []).includes(x.gives.cosmetic)
          const can = x.left > 0 && x.canAfford && !owned
          const pic = exchangeArt(app, x)
          return h('div', { class: ['ex-item', owned ? 'is-owned' : '', x.left <= 0 ? 'is-out' : ''], testid: 'event-exchange-item-' + x.id },
            h('span', { class: ['ex-pic', pic.cart ? 'is-cart is-' + pic.slot : ''], 'aria-hidden': 'true' }, svgBox(pic.svg, 'ex-pic-art'),
              pic.qty ? h('b', { class: 'ex-pic-qty' }, pic.qty) : null,
              owned ? svgBox(metaArt('dau_tick'), 'ex-pic-tick') : null),
            h('b', { class: 'ex-name' }, x.name),
            h('small', { class: 'muted' }, x.limit > 1 ? `Còn ${x.left}/${x.limit} lần` : owned ? 'Đã có' : 'Chỉ 1 lần'),
            h('button', {
              class: ['btn', 'btn-small', 'ex-buy', can ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'event-exchange-' + x.id,
              disabled: !can, 'aria-label': owned ? 'Đã có' : `Đổi ${x.name}: ${x.price} ${cur}`,
              onclick: async ev2 => {
                const rect = rectOf(ev2)
                const ok = await app.modal({
                  title: `Đổi ${x.name}?`, text: `Trả ${x.price} ${cur}.`,
                  actions: [{ label: 'Để sau', value: false, kind: 'ghost', testid: 'confirm-cancel' }, { label: 'Đổi', value: true, testid: 'confirm-ok' }]
                })
                if (!ok) return
                const r = exchangeTem(app.state, ev.id, x.id, app.nowInfo(), app.ctx)
                if (!r.ok) { app.toast(why(r.reason), { kind: 'bad' }); return }
                done(r.reward, rect, 'Đã đổi: ')
              }
            }, owned ? [svgBox(metaArt('dau_tick'), 'ev-btn-ico'), 'Đã có'] : [svgBox(curArt, 'ev-btn-ico'), String(x.price)]))
        })))
      }

      // hiệu ứng nhận quà của lần bấm vừa rồi (chạy trên phần tử MỚI, một lần)
      const fx = pendingFx
      pendingFx = null
      if (fx) playFx(fx, def.currencyId)
    }

    function rectOf(e) {
      const t = e && e.currentTarget
      try { return t && t.getBoundingClientRect ? t.getBoundingClientRect() : null } catch { return null }
    }

    render()
    return { unmount() { destroyed = true } }
  }
}
