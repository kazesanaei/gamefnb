// Thẻ chuỗi nhiệm vụ (vd "Dì Sáu dặn"): bước đang làm, làm ở đâu, tiến độ, phần thưởng các bước đã xong chờ nhận.
// M5 Đợt 3 (gói M-N, bản 0.5.2): thẻ kiểu cuộn giấy, NPC bán thân (people.js), đường bước có bước hiện tại nổi bật và quà
// cuối chuỗi có hình ở cuối đường, phần thưởng thành ô vật phẩm có hình; nhận thưởng thì xu / muỗng bay về viên ví.
// Giữ testid (chain-card-*, chain-claim-*, chain-assist-*, opts.stepTestid), data-chain-id, data-step, chữ nút và toast.
import { h, svgBox } from '../dom.js'
import { claimChainReward, chainDefs } from '../../core/chains.js'
import { resolveReward } from '../../core/rewards.js'
import { metaArt } from '../art/meta.js'
import { SCENE_ICONS } from '../art/scene.js'
import { rewardChips, rewardLine, rewardParts, partArt, itemTile, reasonText, progressBar, npcBust, celebrateReward } from './meta-ui.js'

// Nơi làm bước chuỗi → hình nhỏ cạnh chữ "Làm ở …" (CHAIN_WHERE).
function whereArt(where) {
  if (where === 'quay') return SCENE_ICONS.tab_quay
  if (where === 'bep') return SCENE_ICONS.tab_bep
  if (where === 'shop') return metaArt('cho_cong_thuc')
  if (where === 'chung') return SCENE_ICONS.hud_sao
  return ''
}

// Phần thưởng (đã quy đổi) của bước cuối chuỗi, để vẽ "quà cuối"; lỗi dữ liệu → null.
function finalReward(app, c) {
  try {
    const def = chainDefs(app.ctx)[c.id]
    const steps = def && def.steps
    if (!steps || !steps.length) return null
    return resolveReward(app.state, steps[steps.length - 1].reward || {}, app.ctx, { eventId: def.eventId })
  } catch {
    return null
  }
}

// Ô quà cuối: mẩu nổi bật nhất (hiện vật có tên trước, rồi Muỗng Vàng, tiền…); nhãn đọc đủ cả phần thưởng.
function goalTile(app, reward, currency) {
  const parts = rewardParts(reward, app.data, { currency })
  if (!parts.length) return null
  const order = ['title', 'recipe', 'cosmetic', 'unlock', 'item', 'fragment', 'rare', 'upgrade', 'gold', 'money', 'tem', 'tip', 'rep']
  const best = parts.slice().sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0]
  return itemTile(partArt(best), { kind: best.kind, qty: best.qty, label: 'Quà cuối chuỗi: ' + rewardLine(reward, app.data, { currency }) })
}

/**
 * chainCard(app, c, opts) → phần tử; c là 1 phần tử của chainStatus().
 * opts: { testid, title (vd "Dì Sáu dặn"), onChange(r) sau khi nhận thưởng, stepTestid (bước sự kiện),
 *         compact (màn Chuẩn bị: nhiều bước chờ nhận thì gộp 1 nút "Nhận thưởng N bước"),
 *         variant ('note': giấy ghim của sảnh Chuẩn bị — thêm lớp ps-note và đinh ghim span.g-pin),
 *         onClaimed(reward, rect): gọi sau khi nhận thành công, TRƯỚC onChange; rect = khung .chain-claim-row vừa bấm (lấy
 *         trước khi vẽ lại). Có onClaimed thì màn gọi tự lo hiệu ứng; không có thì thẻ tự cho xu / muỗng bay về viên ví
 *         (celebrateReward) sau onChange. }
 */
export function chainCard(app, c, opts = {}) {
  const S = app.data.STRINGS.meta
  const W = app.data.CHAIN_WHERE || {}
  const currency = c.eventId && app.data.EVENTS && app.data.EVENTS[c.eventId] ? app.data.EVENTS[c.eventId].currencyName : undefined
  const title = opts.title || chainTitle(c)
  const note = opts.variant === 'note'
  const claims = c.claimable || []
  // sau khi nhận: lưu, báo màn gọi (onClaimed → onChange), rồi hiệu ứng mặc định trên phần tử MỚI (màn đã vẽ lại)
  const after = (reward, rect, r) => {
    app.saveNow()
    if (typeof opts.onClaimed === 'function') {
      try { opts.onClaimed(reward, rect) } catch (err) { console.error(err) }
    }
    if (typeof opts.onChange === 'function') opts.onChange(r)
    if (typeof opts.onClaimed !== 'function' && rect) celebrateReward(app, rect, reward)
  }
  const rowRect = ev => {
    const row = ev && ev.currentTarget && ev.currentTarget.closest ? ev.currentTarget.closest('.chain-claim-row') : null
    try { return row ? row.getBoundingClientRect() : null } catch { return null }
  }
  const claimAll = ev => {
    const rect = rowRect(ev)
    const got = []
    for (const k of claims.slice()) {
      const r = claimChainReward(app.state, c.id, k.stepIndex, app.nowInfo(), app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); break }
      got.push(r.reward || {})
    }
    if (!got.length) return
    app.sound('coin')
    // gộp thưởng nhiều bước thành 1 dòng ngắn (cộng tiền, Muỗng Vàng; đếm thẻ Mẹo nghề) thay vì nối từng bước
    const merged = mergeRewards(got)
    app.toast('Nhận: ' + rewardLine(merged, app.data, { currency }), { kind: 'good' })
    after(merged, rect, undefined)
  }
  const many = opts.compact && claims.length > 1
  const claimBtns = many ? [h('div', { class: 'chain-claim-row' },
    h('div', { class: 'chain-claim-info' }, h('b', null, `Xong ${claims.length} bước, thưởng đang chờ`),
      rewardChips(mergeRewards(claims.map(k => k.reward)), app.data, { compact: true, currency, art: true })),
    h('button', { class: 'btn btn-primary btn-small', type: 'button', testid: `chain-claim-${c.id}`, disabled: !!app.state.shift, onclick: claimAll },
      `Nhận ${claims.length} bước`))] : claims.map(k => h('div', { class: 'chain-claim-row' },
    h('div', { class: 'chain-claim-info' }, h('small', null, `Xong bước ${k.stepIndex + 1}:`), rewardChips(k.reward, app.data, { compact: true, currency, art: true })),
    h('button', {
      class: 'btn btn-primary btn-small', type: 'button', testid: `chain-claim-${c.id}-${k.stepIndex}`,
      disabled: !!app.state.shift,
      onclick: ev => {
        const rect = rowRect(ev)
        const r = claimChainReward(app.state, c.id, k.stepIndex, app.nowInfo(), app.ctx)
        if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
        app.sound('coin')
        app.toast('Nhận: ' + rewardLine(r.reward, app.data, { currency }), { kind: 'good' })
        after(r.reward || {}, rect, r)
      }
    }, S.questClaim)))
  // chuỗi xong: nhãn "Đã hoàn thành" tách riêng, lời nhắn cuối chuỗi hiện nguyên văn (không ghép tiền tố)
  const wArt = c.where ? whereArt(c.where) : ''
  const body = c.done
    ? h('div', { class: 'chain-done' },
      h('span', { class: 'chain-done-tag' }, '✓ ' + S.chainDone),
      c.text ? h('p', { class: 'chain-text chain-quote' }, c.text) : null)
    : h('div', { class: 'chain-step', testid: opts.stepTestid || null, dataset: { step: c.step } },
      h('div', { class: 'chain-step-head' },
        h('span', { class: 'chain-step-no' }, S.chainStep.replace('{n}', String(c.step + 1)).replace('{total}', String(c.total))),
        c.where && W[c.where] ? h('span', { class: 'chain-where' }, wArt ? svgBox(wArt, 'chain-where-ico') : null, W[c.where]) : null),
      h('p', { class: 'chain-text' }, c.text),
      c.gateLocked ? h('p', { class: 'chain-gate small' }, gateText(app, c, S))
        : c.isCheck ? null
          : h('div', { class: 'chain-prog' }, progressBar(c.progress, c.target, { label: c.text }), h('span', { class: 'chain-num' }, `${c.progress}/${c.target}`)),
      c.assistText ? h('p', { class: 'chain-assist small', testid: 'chain-assist-' + c.id }, c.assistText) : null)
  return h('article', {
    class: ['chain-card', 'g-scroll-meta', c.done ? 'is-done' : '', claims.length ? 'has-claim' : '', note ? 'ps-note' : ''],
    testid: opts.testid || 'chain-card-' + c.id, dataset: { chainId: c.id, npc: c.npc || 'di_sau' }
  },
  note ? h('span', { class: 'g-pin', 'aria-hidden': 'true' }) : null,
  h('div', { class: 'chain-head' }, svgBox(npcBust(c.npc, claims.length ? 'claim' : ''), 'npc-face npc-bust small'),
    h('div', { class: 'chain-head-text' }, h('b', { class: 'chain-title' }, title), h('small', { class: 'muted' }, c.name))),
  c.done ? null : stepPath(app, c, currency),
  body, claimBtns)
}

// Đường bước: chấm đã xong (✓), bước đang làm nổi bật (số), bước sau mờ; cuối đường là ô quà cuối chuỗi.
function stepPath(app, c, currency) {
  const total = Math.max(0, Math.min(12, Number(c.total) || 0))
  if (total < 2) return null
  const dots = []
  for (let i = 0; i < total; i++) {
    const st = i < c.step ? 'is-done' : i === c.step ? 'is-now' : 'is-next'
    if (i > 0) dots.push(h('span', { class: ['chain-link', i <= c.step ? 'is-done' : ''] }))
    dots.push(h('span', { class: ['chain-dot', st] }, i < c.step ? '✓' : String(i + 1)))
  }
  const fin = finalReward(app, c)
  const goal = fin ? goalTile(app, fin, currency) : null
  return h('div', { class: 'chain-path', 'aria-hidden': 'true' },
    h('span', { class: 'chain-dots' }, dots),
    goal ? h('span', { class: 'chain-goal' }, goal) : null)
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
export function mergeRewards(list) {
  const out = {}
  for (const r of list) {
    for (const k of ['money', 'gold', 'rep', 'tem']) if (r[k]) out[k] = (out[k] || 0) + r[k]
    for (const k of ['recipe', 'title', 'unlock', 'upgrade', 'cosmetic', 'tipId', 'eventId']) if (r[k] && !out[k]) out[k] = r[k]
    if (r.tipId) out.tipCount = (out.tipCount || 0) + 1
    for (const [id, n] of Object.entries(r.items || {})) out.items = { ...(out.items || {}), [id]: ((out.items && out.items[id]) || 0) + n }
  }
  return out
}
