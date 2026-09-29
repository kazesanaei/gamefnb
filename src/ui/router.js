// Bộ định tuyến màn: mỗi màn là module { mount(root, app, params) → { unmount(), update?(dt) } }.

export function createRouter(root, app, screens) {
  let current = null
  let currentName = null
  const router = {
    go(name, params = {}) {
      const scr = screens[name]
      if (!scr) throw new Error('Không có màn: ' + name)
      if (current && typeof current.unmount === 'function') {
        try { current.unmount() } catch (err) { console.error(err) }
      }
      current = null
      root.textContent = ''
      root.dataset.screen = name
      currentName = name
      current = scr.mount(root, app, params) || {}
      root.scrollTop = 0
      return current
    },
    get current() { return current },
    get name() { return currentName }
  }
  return router
}
