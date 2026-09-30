// Chuỗi nhiệm vụ: luôn đúng 1 bước đang làm; bước "làm N lần" chỉ đếm từ lúc bước hiện ra;
// bước "đạt mức" kiểm tra trạng thái hiện tại; không hạn giờ, không thể thất bại.
// Xong bước → thưởng vào danh sách chờ nhận (claimable), bước kế hiện ra ngay.
// Chuỗi sự kiện (EVENTS[id].chain) chỉ chạy trong mùa và có cổng theo số ngày thật đã chơi (gates).
//
// state.chains[chainId] = { step, progress, done, claimable: [stepIndex], since: dayKey bước hiện ra }
import { cfg, emit } from './state.js'
import { averageRating } from './scoring.js'
import { grantReward, resolveReward } from './rewards.js'
import { eventWindow, eventPhase, isEventActive, eventState } from './events.js'
import { pushMail } from './mail.js'
import { addDaysKey, daysBetweenKeys } from './clock.js'

function D(ctx) { return (ctx && ctx.data) || {} }

// Mọi chuỗi: CHAINS + chuỗi của các sự kiện (có eventId).
export function chainDefs(ctx) {
  const out = {}
  for (const [id, c] of Object.entries(D(ctx).CHAINS || {})) out[id] = { ...c, id }
  for (const ev of Object.values(D(ctx).EVENTS || {})) {
    if (ev.chain && ev.chain.id) out[ev.chain.id] = { ...ev.chain, eventId: ev.id, main: false }
  }
  return out
}

function chainState(state, id) {
  state.chains = state.chains && typeof state.chains === 'object' ? state.chains : {}
  return state.chains[id] || null
}

// Chuỗi đã mở chưa (theo ngày game / mùa sự kiện).
export function chainUnlocked(state, def, nowInfo, ctx) {
  if (def.eventId) return !!nowInfo && isEventActive(def.eventId, nowInfo.trusted, ctx)
  if (def.fromDayKey && state.day < cfg(ctx, def.fromDayKey)) return false
  if (def.fromDay && state.day < def.fromDay) return false
  return true
}

// Cổng bước k của chuỗi sự kiện: đủ số ngày thật đã chơi trong mùa, hoặc không còn đủ ngày để đạt (gộp bước).
export function stepGateOpen(state, def, k, nowInfo, ctx) {
  if (!def.eventId || !def.gates) return true
  const gate = def.gates[k] || 0
  if (gate <= 0) return true
  const ev = D(ctx).EVENTS && D(ctx).EVENTS[def.eventId]
  if (!ev || !nowInfo) return false
  const es = eventState(state, def.eventId)
  const played = es.days.length
  if (played >= gate) return true
  const w = eventWindow(ev)
  const remaining = Math.max(0, daysBetweenKeys(nowInfo.dayKey, w.lastDay) + 1)
  const playedToday = es.days.includes(nowInfo.dayKey)
  const reachable = played + (playedToday ? remaining - 1 : remaining)
  return reachable < gate
}

// Kiểm tra bước dạng "đạt mức".
export function checkPasses(state, check, ctx) {
  if (!check) return false
  if (check.reputation !== undefined && (state.reputation || 0) < check.reputation) return false
  if (check.avgRating !== undefined && averageRating(state.ratings || []) < check.avgRating) return false
  if (check.ownsShopRecipe) {
    const R = D(ctx).RECIPES || {}
    if (!Object.keys(state.recipes || {}).some(id => R[id] && R[id].source === 'shop')) return false
  }
  if (check.upgrade && !(state.upgrades && state.upgrades[check.upgrade])) return false
  return true
}

function completeStep(state, def, cs, ctx) {
  const k = cs.step
  cs.claimable.push(k)
  cs.step += 1
  cs.progress = 0
  if (cs.step >= def.steps.length) cs.done = true
  emit(ctx, 'chain.step', { chainId: def.id, stepIndex: k, done: cs.done })
}

function initChain(state, def, nowInfo) {
  state.chains[def.id] = { step: 0, progress: 0, done: false, claimable: [], since: nowInfo ? nowInfo.dayKey : '' }
  return state.chains[def.id]
}

// Tạo chuỗi vừa mở, xét bước "đạt mức", gửi thưởng chưa nhận của chuỗi sự kiện đã hết ân hạn vào Hộp thư.
export function refreshChains(state, nowInfo, ctx) {
  chainState(state, '')
  const changes = []
  for (const def of Object.values(chainDefs(ctx))) {
    let cs = state.chains[def.id]
    if (!cs && chainUnlocked(state, def, nowInfo, ctx)) cs = initChain(state, def, nowInfo)
    if (!cs) continue
    if (!cs.done && chainUnlocked(state, def, nowInfo, ctx)) {
      let guard = 0
      while (!cs.done && guard++ < 20) {
        const st = def.steps[cs.step]
        if (!st.check || !stepGateOpen(state, def, cs.step, nowInfo, ctx) || !checkPasses(state, st.check, ctx)) break
        completeStep(state, def, cs, ctx)
        if (nowInfo) cs.since = nowInfo.dayKey
        changes.push({ chainId: def.id, stepIndex: cs.step - 1 })
      }
    }
    // chuỗi sự kiện đã kết thúc hẳn: thưởng chưa nhận vào Hộp thư
    if (def.eventId && nowInfo && cs.claimable.length) {
      const ev = D(ctx).EVENTS[def.eventId]
      if (ev && eventPhase(ev, nowInfo.trusted) === 'da_ket_thuc') {
        for (const k of cs.claimable) {
          const st = def.steps[k]
          pushMail(state, { id: `chuoi:${def.id}:${k}`, kind: 'su_kien', title: `${def.name}: thưởng bước ${k + 1}`,
            body: 'Phần thưởng chuỗi sự kiện chưa nhận được gửi qua hộp thư.', reward: resolveReward(state, st.reward || {}, ctx, { eventId: def.eventId }),
            expiresDay: addDaysKey(nowInfo.dayKey, 30) }, nowInfo, ctx, { compensation: true })
        }
        cs.claimable = []
      }
    }
  }
  return changes
}

// Cộng tiến độ theo tín hiệu cho bước đang làm của mọi chuỗi đã mở.
export function applyChainSignal(state, sig, n, nowInfo, ctx) {
  chainState(state, '')
  const changes = []
  for (const def of Object.values(chainDefs(ctx))) {
    if (!chainUnlocked(state, def, nowInfo, ctx)) continue
    let cs = state.chains[def.id]
    if (!cs) cs = initChain(state, def, nowInfo)
    if (cs.done) continue
    const st = def.steps[cs.step]
    if (!st || st.signal !== sig) continue
    if (!stepGateOpen(state, def, cs.step, nowInfo, ctx)) continue
    cs.progress = Math.min(st.target || 1, cs.progress + (Number(n) || 0))
    changes.push({ chainId: def.id, stepIndex: cs.step, progress: cs.progress, target: st.target || 1 })
    emit(ctx, 'chain.progress', changes[changes.length - 1])
    if (cs.progress >= (st.target || 1)) {
      completeStep(state, def, cs, ctx)
      if (nowInfo) cs.since = nowInfo.dayKey
    }
  }
  // bước "đạt mức" có thể vừa đạt (vd vừa mua Loa)
  if (changes.some(c => c.progress >= c.target)) refreshChains(state, nowInfo, ctx)
  return changes
}

// Nhận thưởng một bước đã xong (mặc định bước sớm nhất). Không nhận trong ca.
export function claimChainReward(state, chainId, stepIndex = null, nowInfo = null, ctx) {
  const def = chainDefs(ctx)[chainId]
  const cs = chainState(state, chainId)
  if (!def || !cs) return { ok: false, reason: 'khong_co' }
  if (state.shift) return { ok: false, reason: 'dang_ban' }
  if (!cs.claimable.length) return { ok: false, reason: 'chua_xong' }
  const k = stepIndex === null || stepIndex === undefined ? cs.claimable[0] : stepIndex
  const i = cs.claimable.indexOf(k)
  if (i < 0) return { ok: false, reason: 'chua_xong' }
  if (def.eventId && nowInfo) {
    const ev = D(ctx).EVENTS[def.eventId]
    if (ev && eventPhase(ev, nowInfo.trusted) === 'da_ket_thuc') return { ok: false, reason: 'het_su_kien' }
  }
  cs.claimable.splice(i, 1)
  const reward = grantReward(state, def.steps[k].reward || {}, ctx, { eventId: def.eventId })
  emit(ctx, 'chain.claimed', { chainId, stepIndex: k, reward })
  return { ok: true, stepIndex: k, reward }
}

function stepText(st) {
  return String(st.text || '').replace('{n}', String(st.target || 1))
}

// Trạng thái các chuỗi cho giao diện (ghim ở màn Chuẩn bị).
export function chainStatus(state, nowInfo, ctx) {
  const out = []
  const NP = D(ctx).NPCS || {}
  for (const def of Object.values(chainDefs(ctx))) {
    const cs = (state.chains || {})[def.id] || null
    const unlocked = chainUnlocked(state, def, nowInfo, ctx)
    if (!cs && !unlocked) continue
    const k = cs ? cs.step : 0
    const st = def.steps[k] || null
    out.push({
      id: def.id, name: def.name, npc: def.npc, npcName: (NP[def.npc] && NP[def.npc].name) || '',
      main: !!def.main, eventId: def.eventId || null, unlocked,
      done: !!(cs && cs.done), step: k, total: def.steps.length,
      text: st ? stepText(st) : (def.doneText || ''), where: st ? st.where : null,
      progress: cs ? cs.progress : 0, target: st ? (st.check ? 1 : st.target || 1) : 0,
      isCheck: !!(st && st.check),
      gateLocked: !!(st && def.eventId && !stepGateOpen(state, def, k, nowInfo, ctx)),
      claimable: cs ? cs.claimable.map(i => ({ stepIndex: i, reward: resolveReward(state, def.steps[i].reward || {}, ctx, { eventId: def.eventId }) })) : []
    })
  }
  return out
}

// Chuỗi "Làm quen QR" đang ở bước phát hiện ảnh giả → ca kế tiếp ép 1 khách QR giả.
export function chainForcesFakeQr(state, ctx) {
  if (state.day < cfg(ctx, 'qrFromDay')) return false
  for (const def of Object.values(chainDefs(ctx))) {
    if (def.eventId) continue
    const cs = (state.chains || {})[def.id]
    if (!cs || cs.done) continue
    const st = def.steps[cs.step]
    if (st && st.forceFakeQr) return true
  }
  return false
}
