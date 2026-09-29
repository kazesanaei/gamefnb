import test from 'node:test'
import assert from 'node:assert/strict'
import { startServer } from '../helpers/static-server.mjs'

test('máy chủ tĩnh: MIME đúng, chặn thoát thư mục gốc, 404', async () => {
  const srv = await startServer(0)
  try {
    const get = p => fetch(srv.url + p)
    let r = await get('src/core/rng.js')
    assert.equal(r.status, 200)
    assert.match(r.headers.get('content-type'), /^text\/javascript/)
    assert.match(await r.text(), /mulberry32/)
    r = await get('tests/fixtures/data.mjs')
    assert.match(r.headers.get('content-type'), /^text\/javascript/)
    await r.arrayBuffer()
    r = await get('package.json')
    assert.match(r.headers.get('content-type'), /^application\/json/)
    await r.arrayBuffer()
    for (const p of ['../../etc/passwd', '%2e%2e/%2e%2e/etc/passwd', 'khong-co-file.js']) {
      r = await get(p)
      assert.equal(r.status, 404, p)
      await r.arrayBuffer()
    }
    r = await fetch(srv.url + 'package.json', { method: 'HEAD' })
    assert.equal(r.status, 200)
  } finally {
    await srv.close()
  }
})
