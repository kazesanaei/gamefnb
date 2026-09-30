// Thẻ chuỗi nhiệm vụ (vd "Dì Sáu dặn"): bước đang làm, làm ở đâu, tiến độ, phần thưởng các bước đã xong chờ nhận.
import { h, svgBox } from '../dom.js'
import { claimChainReward } from '../../core/chains.js'
import { rewardChips, rewardLine, reasonText, progressBar, npcFace } from './meta-ui.js'

/**
 * chainCard(app, c, opts) → phần tử; c là 1 phần tử của chainStatus().
 * opts: { testid, title (vd "Dì Sáu dặn"), onChange() sau khi nhận thưởng, stepTestid (bước sự kiện),
 *         compact (màn Chuẩn bị: nhiều bước chờ nhận thì gộp 1 nút "Nhận thưởng N bước") }
 */
export function chainCard(app, c, opts = {}) {
  const S = app.data.STRINGS.meta
  const W = app.data.CHAIN_WHERE || {}
  const currency = c.eventId && app.data.EVENTS && app.data.EVENTS[c.eventId] ? app.data.EVENTS[c.eventId].currencyName : undefined
  const title = opts.title || chainTitle(c)
  const claimAll = () => {
    const got = []
    for (const k of c.claimable.slice()) {
      const r = claimChainReward(app.state, c.id, k.stepIndex, app.nowInfo(), app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); break }
      got.push(rewardLine(r.reward, app.data, { currency }))
    }
    if (!got.length) return
    app.sound('coin')
    app.toast('Nhận: ' + got.join(' · '), { kind: 'good' })
    app.saveNow()
    if (typeof opts.onChange === 'function') opts.onChange()
  }
  const many = opts.compact && (c.claimable || []).length > 1
  const claimBtns = many ? [h('div', { class: 'chain-claim-row' },
    h('div', { class: 'chain-claim-info' }, h('b', null, `Xong ${c.claimable.length} bước, thưởng đang chờ`),
      rewardChips(mergeRewards(c.claimable.map(k => k.reward)), app.data, { compact: true, currency })),
    h('button', { class: 'btn btn-primary btn-small', type: 'button', testid: `chain-claim-${c.id}`, disabled: !!app.state.shift, onclick: claimAll },
      `Nhận ${c.claimable.length} bước`))] : (c.claimable || []).map(k => h('div', { class: 'chain-claim-row' },
    h('div', { class: 'chain-claim-info' }, h('small', null, `Xong bước ${k.stepIndex + 1}:`), rewardChips(k.reward, app.data, { compact: true, currency })),
    h('button', {
      class: 'btn btn-primary btn-small', type: 'button', testid: `chain-claim-${c.id}-${k.stepIndex}`,
      disabled: !!app.state.shift,
      onclick: () => {
        const r = claimChainReward(app.state, c.id, k.stepIndex, app.nowInfo(), app.ctx)
        if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
        app.sound('coin')
        app.toast('Nhận: ' + rewardLine(r.reward, app.data, { currency }), { kind: 'good' })
        app.saveNow()
        if (typeof opts.onChange === 'function') opts.onChange(r)
      }
    }, S.questClaim)))
  // chuỗi xong: nhãn "Đã hoàn thành" tách riêng, lời nhắn cuối chuỗi hiện nguyên văn (không ghép tiền tố)
  const body = c.done
    ? h('div', { class: 'chain-done' },
      h('span', { class: 'chain-done-tag' }, '✓ ' + S.chainDone),
      c.text ? h('p', { class: 'chain-text chain-quote' }, c.text) : null)
    : h('div', { class: 'chain-step', testid: opts.stepTestid || null, dataset: { step: c.step } },
      h('div', { class: 'chain-step-head' },
        h('span', { class: 'chain-step-no' }, S.chainStep.replace('{n}', String(c.step + 1)).replace('{total}', String(c.total))),
        c.where && W[c.where] ? h('span', { class: 'chain-where' }, W[c.where]) : null),
      h('p', { class: 'chain-text' }, c.text),
      c.gateLocked ? h('p', { class: 'chain-gate small' }, gateText(app, c, S))
        : c.isCheck ? null
          : h('div', { class: 'chain-prog' }, progressBar(c.progress, c.target, { label: c.text }), h('span', { class: 'chain-num' }, `${c.progress}/${c.target}`)),
      c.assistText ? h('p', { class: 'chain-assist small', testid: 'chain-assist-' + c.id }, c.assistText) : null)
  return h('article', { class: ['chain-card', c.done ? 'is-done' : '', c.claimable && c.claimable.length ? 'has-claim' : ''], testid: opts.testid || 'chain-card-' + c.id, dataset: { chainId: c.id } },
    h('div', { class: 'chain-head' }, svgBox(npcFace(c.npc), 'npc-face small'),
      h('div', null, h('b', { class: 'chain-title' }, title), h('small', { class: 'muted' }, c.name))),
    body, claimBtns)
}

/** Tiêu đề thẻ chuỗi theo NPC: "Dì Sáu dặn", "Anh Khoa dặn", "Cô Hạnh nhờ" (động từ ở NPCS[npc].verb). */
export function chainTitle(c) {
  return c.npcName ? `${c.npcName} ${c.npcVerb || 'dặn'}` : c.name
}

// Bước chuỗi sự kiện chưa mở: hôm nay chưa bán ca nào trong mùa → mở hàng là mở bước; đã bán → mai chơi tiếp.
function gateText(app, c, S) {
  const es = app.state.events && app.state.events[c.eventId]
  const today = app.nowInfo().dayKey
  if (!es || !(es.days || []).includes(today)) return 'Mở hàng một ca hôm nay để mở bước này.'
  return S.chainLockedTomorrow
}

// Gộp nhiều phần thưởng (tiền, Muỗng Vàng, danh tiếng, Tem cộng dồn; món/đồ lấy cái đầu) để hiện gọn.
function mergeRewards(list) {
  const out = {}
  for (const r of list) {
    for (const k of ['money', 'gold', 'rep', 'tem']) if (r[k]) out[k] = (out[k] || 0) + r[k]
    for (const k of ['recipe', 'title', 'unlock', 'upgrade', 'cosmetic', 'tipId', 'eventId']) if (r[k] && !out[k]) out[k] = r[k]
  }
  return out
}
