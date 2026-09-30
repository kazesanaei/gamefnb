// Tiện ích cho test hệ thống meta M2 (dữ liệu thật src/data, đồng hồ giả).
import { DATA } from '../../src/data/index.js'
import { defaultState } from '../../src/core/state.js'
import { createBus } from '../../src/core/bus.js'
import { makeNowInfo } from '../../src/core/clock.js'
import { attachMeta } from '../../src/core/meta.js'

// 'YYYY-MM-DDTHH:mm' giờ Việt Nam → ms
export function vn(str) {
  const s = str.length === 10 ? str + 'T12:00' : str
  return Date.parse(s + (s.length === 16 ? ':00' : '') + '+07:00')
}

// Ngữ cảnh có bus thật, đồng hồ giả, ghi lại sự kiện. data mặc định là DATA thật.
export function makeMetaCtx({ data = DATA, at = '2026-10-01T09:00', attach = false, state = null } = {}) {
  const bus = createBus()
  const clock = { t: vn(at) }
  const events = []
  const ctx = {
    data, bus, clock, events,
    now: () => clock.t,
    emit: (type, payload) => { events.push({ type, payload }); bus.emit(type, payload) }
  }
  let st = state
  ctx.setState = s => { st = s }
  if (attach) ctx.detach = attachMeta(bus, () => st, ctx)
  return ctx
}

export function newState(seed = 1) {
  return defaultState(seed, DATA)
}

// nowInfo tại thời điểm giờ Việt Nam (cập nhật state.clock.maxSeen).
export function at(state, str) {
  return makeNowInfo(state, vn(str))
}

export { DATA }
