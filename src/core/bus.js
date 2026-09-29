// Bus sự kiện miền. on('*', fn) nhận mọi sự kiện với fn(payload, type).

export function createBus() {
  let handlers = Object.create(null)
  return {
    on(type, fn) {
      if (!handlers[type]) handlers[type] = []
      handlers[type].push(fn)
      return () => {
        const list = handlers[type]
        if (!list) return
        const i = list.indexOf(fn)
        if (i >= 0) list.splice(i, 1)
      }
    },
    emit(type, payload) {
      const list = (handlers[type] || []).slice()
      for (const fn of list) fn(payload, type)
      if (type !== '*') for (const fn of (handlers['*'] || []).slice()) fn(payload, type)
    },
    clear() { handlers = Object.create(null) }
  }
}
