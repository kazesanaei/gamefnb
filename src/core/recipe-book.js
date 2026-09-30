// Sổ công thức (M3): mọi món của Chặng 1 (đã có / bán ở Chợ Công Thức / món sự kiện) và món bóng mờ Chặng 2.
// Mỗi món: giá, giá vốn, số lần nấu, điểm cao nhất, cấp thạo món + mốc kế, huy hiệu "Không tì vết", nguồn.
// Chi tiết món: nguyên liệu cần (KHÔNG lộ bẫy trên kệ) và các bước; tab "Sổ từ vùng miền" từ SYNONYMS.
// Lõi thuần: đọc ctx.data (RECIPES, INGREDIENTS, SHOP, EVENTS, STRINGS, MINIGAME_TYPES, SYNONYMS, BALANCE).
import { cfg } from './state.js'
import { masteryLevel } from './mastery.js'
import { effectiveSteps } from './kitchen.js'
import { unitPriceOf } from './order.js'

function D(ctx) { return (ctx && ctx.data) || {} }

const SOURCE_ORDER = { default: 0, shop: 1, event: 2 }

// Giá vốn 1 phần (nguyên liệu không tùy chọn), đồng.
export function bookCost(recipe, ctx) {
  const INGS = D(ctx).INGREDIENTS || {}
  return (recipe.ingredients || []).filter(i => i.role !== 'tuy_chon')
    .reduce((s, i) => s + ((INGS[i.id] && INGS[i.id].cost) || 0) * (i.qty || 1), 0)
}

// Nhãn nguồn món: "Có sẵn", "Chợ Công Thức", nhãn mùa sự kiện ("Tri ân 20/11 · 2026").
export function sourceLabel(state, recipe, ctx) {
  const S = (D(ctx).STRINGS && D(ctx).STRINGS.sources) || {}
  if (recipe.source === 'event') {
    const got = state.eventRecipes && state.eventRecipes[recipe.id]
    if (got && got.label) return got.label
    const ev = recipe.eventId && D(ctx).EVENTS && D(ctx).EVENTS[recipe.eventId]
    return (ev && ev.label) || S.event || 'Món sự kiện'
  }
  if (recipe.source === 'shop') return S.shop || 'Chợ Công Thức'
  return S.default || 'Có sẵn'
}

// Cấp thạo món và mốc kế: {level, name, next: {level, name, target, need} | null}.
export function masteryInfo(progress, ctx) {
  const levels = cfg(ctx, 'masteryLevels')
  const names = (D(ctx).STRINGS && D(ctx).STRINGS.masteryLevels) || {}
  const level = masteryLevel(progress, levels)
  const good = Number(progress && progress.goodCooks) || 0
  const target = levels[level]
  const next = target === undefined ? null
    : { level: level + 1, name: names[level + 1] || String(level + 1), target, need: Math.max(0, target - good) }
  return { level, name: names[level] || String(level), goodCooks: good, next }
}

/**
 * Danh sách món cho Sổ công thức.
 * → { owned, total, entries: [{ id, name, icon, desc, status: 'owned'|'shop'|'event'|'teaser', source, sourceLabel,
 *      chang, price, cost, profit, cooks, goodCooks, best, flawless, flawlessBadge, mastery, shopPrice, fromDay, note, locked }] }
 */
export function recipeBook(state, ctx) {
  const R = D(ctx).RECIPES || {}
  const SHOP = D(ctx).SHOP || {}
  const owned = state.recipes || {}
  const entries = []
  const list = Object.values(R).filter(r => (r.chang || 1) <= (state.chang || 1))
    .sort((a, b) => {
      const oa = owned[a.id] ? 0 : 1, ob = owned[b.id] ? 0 : 1
      if (oa !== ob) return oa - ob
      return (SOURCE_ORDER[a.source] ?? 3) - (SOURCE_ORDER[b.source] ?? 3)
    })
  for (const r of list) {
    const p = owned[r.id] || null
    const cost = bookCost(r, ctx)
    const price = unitPriceOf(r, [])
    const status = p ? 'owned' : (r.source === 'shop' ? 'shop' : r.source === 'event' ? 'event' : 'owned')
    let note = ''
    if (!p && r.source === 'shop') {
      note = state.day >= (r.shopFromDay || 1) ? 'Mua ở Chợ Công Thức' : `Chợ Công Thức mở bán từ ngày ${r.shopFromDay || 1}`
    } else if (!p && r.source === 'event') {
      note = 'Chỉ nhận qua chuỗi của sự kiện có thời hạn'
    }
    entries.push({
      id: r.id, name: r.name, icon: r.icon || r.id, desc: r.desc || '', status, source: r.source,
      sourceLabel: sourceLabel(state, r, ctx), chang: r.chang || 1,
      price, cost, profit: price - cost,
      cooks: p ? p.cooks || 0 : 0, goodCooks: p ? p.goodCooks || 0 : 0, best: p ? p.best || 0 : 0,
      flawless: p ? p.flawless || 0 : 0, flawlessBadge: !!(p && p.flawless > 0),
      mastery: p ? masteryInfo(p, ctx) : null,
      shopPrice: r.shopPrice || 0, fromDay: r.shopFromDay || 1, note, locked: !p
    })
  }
  // bóng mờ Chặng sau (Chợ Công Thức): chỉ tên và hình
  for (const t of SHOP.teasers || []) {
    entries.push({
      id: t.id, name: t.name, icon: t.icon, desc: '', status: 'teaser', source: 'teaser',
      sourceLabel: SHOP.teaserNote || 'Chặng sau', chang: t.chang || 2, price: 0, cost: 0, profit: 0,
      cooks: 0, goodCooks: 0, best: 0, flawless: 0, flawlessBadge: false, mastery: null, shopPrice: 0, fromDay: 0,
      note: SHOP.teaserNote || '', locked: true
    })
  }
  return { owned: entries.filter(e => e.status === 'owned').length, total: entries.filter(e => e.status !== 'teaser').length, entries }
}

/**
 * Chi tiết một món (không lộ bẫy): nguyên liệu cần theo vai trò, các bước và kiểu thao tác, ghi chú khách hay dặn.
 * → { id, name, icon, desc, price, cost, ingredients: [{ id, name, icon, role, roleLabel, qty, when }],
 *     steps: [{ id, label, type, typeName, critical, chooseMethod, after }], notes: [{ id, label, surcharge }] } | null
 */
export function recipeDetail(state, recipeId, ctx) {
  const r = (D(ctx).RECIPES || {})[recipeId]
  if (!r) return null
  const INGS = D(ctx).INGREDIENTS || {}
  const ROLES = D(ctx).ROLE_LABELS || { chinh: 'Chính', phu: 'Phụ', tuy_chon: 'Tùy chọn' }
  const MT = D(ctx).MINIGAME_TYPES || {}
  // chỉ nguyên liệu CẦN (chính, phụ, tùy chọn theo lời dặn); bẫy (decoys) không bao giờ hiện
  const ingredients = (r.ingredients || []).map(i => {
    const when = i.role === 'tuy_chon' ? (r.notes || []).filter(n => (n.adds || []).includes(i.id)).map(n => n.label) : []
    return { id: i.id, name: (INGS[i.id] && INGS[i.id].name) || i.id, icon: (INGS[i.id] && INGS[i.id].icon) || i.id,
      role: i.role, roleLabel: ROLES[i.role] || i.role, qty: i.qty || 1, when }
  })
  const steps = effectiveSteps(r, [], null, 1).map(s => ({
    id: s.id, label: s.label, type: s.type, typeName: (MT[s.type] && MT[s.type].name) || s.type,
    critical: !!s.critical, chooseMethod: !!s.method, after: (s.after || []).slice()
  }))
  const notes = (r.notes || []).map(n => ({ id: n.id, label: n.label, surcharge: Number(n.surcharge) || 0 }))
  return { id: r.id, name: r.name, icon: r.icon || r.id, desc: r.desc || '', price: unitPriceOf(r, []), cost: bookCost(r, ctx),
    ingredients, steps, notes }
}

/** Sổ từ vùng miền: cặp từ Nam – Bắc (dữ liệu SYNONYMS của lời thoại). */
export function dialectBook(ctx) {
  return (D(ctx).SYNONYMS || []).map(w => ({ id: w.id, nam: w.nam, bac: w.bac, meaning: w.meaning || '' }))
}
