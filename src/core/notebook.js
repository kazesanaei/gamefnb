// Sổ tay nghề (M3): gom 20 thẻ Mẹo nghề theo nhóm Quầy / Bếp / Kho / Phục vụ-Quản lý. Thẻ đã mở hiện đủ chữ,
// thẻ chưa mở hiện bóng mờ kèm gợi ý cách mở (TIPS[].hint). Mở đủ mọi thẻ của một nhóm → danh hiệu + 20 Muỗng Vàng
// (TIP_GROUP_REWARDS), nhận 1 lần tại Sổ tay nghề. Lõi thuần: đọc ctx.data, không DOM, không ngẫu nhiên của trình duyệt.
import { emit, defaultNotebook } from './state.js'
import { resolveReward, grantReward } from './rewards.js'

function D(ctx) { return (ctx && ctx.data) || {} }

function tipList(ctx) {
  const T = D(ctx).TIPS || []
  return Array.isArray(T) ? T : Object.values(T)
}

export function ensureNotebook(state) {
  const nb = state.notebook && typeof state.notebook === 'object' ? state.notebook : (state.notebook = defaultNotebook())
  if (!Array.isArray(nb.claimed)) nb.claimed = []
  return nb
}

/**
 * Trạng thái Sổ tay nghề cho giao diện.
 * → { total, unlocked, claimable, groups: [{ id, name, total, unlocked, complete, claimed, canClaim, reward (đã quy đổi),
 *      title: {id, name} | null, tips: [{ id, title, text, hint, unlocked }] }] }
 */
export function notebookStatus(state, ctx) {
  const nb = ensureNotebook(state)
  const seen = new Set(state.tipsSeen || [])
  const G = D(ctx).TIP_GROUPS || {}
  const RW = D(ctx).TIP_GROUP_REWARDS || {}
  const TT = D(ctx).TITLES || {}
  const tips = tipList(ctx)
  const ids = Object.keys(G)
  // nhóm lạ trong dữ liệu thẻ (nếu có) vẫn hiện, xếp sau
  for (const t of tips) if (t && t.group && !ids.includes(t.group)) ids.push(t.group)
  const groups = ids.map(id => {
    const list = tips.filter(t => t && t.group === id).map(t => ({
      id: t.id, title: t.title || '', text: t.text || '', hint: t.hint || '', unlocked: seen.has(t.id)
    }))
    const unlocked = list.filter(t => t.unlocked).length
    const complete = list.length > 0 && unlocked === list.length
    const claimed = nb.claimed.includes(id)
    const raw = RW[id] || null
    const reward = raw ? resolveReward(state, raw, ctx) : {}
    const title = raw && raw.title ? { id: raw.title, name: (TT[raw.title] && TT[raw.title].name) || raw.title } : null
    return {
      id, name: G[id] || id, total: list.length, unlocked, complete, claimed,
      canClaim: complete && !claimed && !!raw, reward, title, tips: list
    }
  })
  const total = groups.reduce((s, g) => s + g.total, 0)
  const unlocked = groups.reduce((s, g) => s + g.unlocked, 0)
  return { total, unlocked, claimable: groups.filter(g => g.canClaim).length, groups }
}

/** Số nhóm đủ thẻ chờ nhận thưởng (chấm đỏ ở màn Chuẩn bị). */
export function notebookBadge(state, ctx) {
  return notebookStatus(state, ctx).claimable
}

/**
 * Nhận thưởng đủ nhóm (mỗi nhóm 1 lần). Không nhận trong ca (giữ luật chung của hệ thống thưởng).
 * → { ok: true, groupId, reward } | { ok: false, reason: 'khong_co' | 'chua_xong' | 'da_nhan' | 'dang_ban' }
 */
export function claimNotebookGroup(state, groupId, ctx) {
  const st = notebookStatus(state, ctx)
  const g = st.groups.find(x => x.id === groupId)
  const raw = (D(ctx).TIP_GROUP_REWARDS || {})[groupId]
  if (!g || !raw) return { ok: false, reason: 'khong_co' }
  if (g.claimed) return { ok: false, reason: 'da_nhan' }
  if (!g.complete) return { ok: false, reason: 'chua_xong' }
  if (state.shift) return { ok: false, reason: 'dang_ban' }
  const nb = ensureNotebook(state)
  nb.claimed.push(groupId)
  const reward = grantReward(state, raw, ctx)
  emit(ctx, 'notebook.claimed', { groupId, reward })
  return { ok: true, groupId, reward }
}

/** Thẻ đã mở để hiện ngẫu nhiên (màn mở đầu, màn Chuẩn bị). rand() trả số trong [0,1) do giao diện truyền. */
export function randomSeenTip(state, ctx, rand = () => 0) {
  const seen = new Set(state.tipsSeen || [])
  const list = tipList(ctx).filter(t => t && seen.has(t.id))
  if (!list.length) return null
  const i = Math.min(list.length - 1, Math.max(0, Math.floor(Number(rand()) * list.length)))
  return list[i]
}
