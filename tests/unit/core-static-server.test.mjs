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

test('máy chủ tĩnh dưới đường dẫn con (giống GitHub Pages): /gamefnb → 301 /gamefnb/, ngoài đường dẫn con 404', async () => {
  const seen = []
  const srv = await startServer(0, '127.0.0.1', { basePath: 'gamefnb/', onResponse: info => seen.push(info) })
  try {
    assert.equal(srv.basePath, '/gamefnb')
    assert.match(srv.url, /^http:\/\/127\.0\.0\.1:\d+\/gamefnb\/$/)
    const origin = new URL(srv.url).origin
    // thiếu / cuối → chuyển hướng, giữ query
    let r = await fetch(origin + '/gamefnb?seed=42&test=1', { redirect: 'manual' })
    assert.equal(r.status, 301)
    assert.equal(r.headers.get('location'), '/gamefnb/?seed=42&test=1')
    await r.arrayBuffer()
    // theo chuyển hướng → trang game
    r = await fetch(origin + '/gamefnb')
    assert.equal(r.status, 200)
    assert.equal(new URL(r.url).pathname, '/gamefnb/')
    assert.match(await r.text(), /<title>Bếp Khởi Nghiệp<\/title>/)
    r = await fetch(srv.url + 'src/core/rng.js?v=1')
    assert.equal(r.status, 200)
    assert.match(r.headers.get('content-type'), /^text\/javascript/)
    assert.match(await r.text(), /mulberry32/)
    r = await fetch(srv.url + 'manifest.webmanifest')
    assert.match(r.headers.get('content-type'), /^application\/manifest\+json/)
    await r.arrayBuffer()
    // tệp tên bắt đầu bằng "_" vẫn phục vụ được (GitHub Pages cần .nojekyll mới làm vậy)
    r = await fetch(srv.url + 'src/ui/minigames/_util.js')
    assert.equal(r.status, 200)
    await r.arrayBuffer()
    // ngoài đường dẫn con: 404 (đường dẫn tuyệt đối "/..." trong game sẽ lộ ra ở đây)
    for (const p of ['/', '/index.html', '/src/core/rng.js', '/sw.js', '/gamefnbx/', '/gamefnb%2f', '/gamefnb/%2e%2e/%2e%2e/etc/passwd', '/gamefnb/khong-co.js']) {
      r = await fetch(origin + p, { redirect: 'manual' })
      assert.equal(r.status, 404, p)
      await r.arrayBuffer()
    }
    r = await fetch(origin + '/gamefnb/sw.js', { method: 'HEAD' })
    assert.equal(r.status, 200)
    assert.ok(seen.some(x => x.url === '/gamefnb?seed=42&test=1' && x.status === 301))
    assert.ok(seen.some(x => x.url === '/src/core/rng.js' && x.status === 404))
  } finally {
    await srv.close()
  }
})

test('máy chủ tĩnh: không truyền basePath thì phục vụ ở gốc như cũ', async () => {
  const srv = await startServer(0)
  try {
    assert.equal(srv.basePath, '')
    assert.match(srv.url, /^http:\/\/127\.0\.0\.1:\d+\/$/)
    let r = await fetch(srv.url)
    assert.equal(r.status, 200)
    assert.match(await r.text(), /<title>Bếp Khởi Nghiệp<\/title>/)
    r = await fetch(srv.url + 'gamefnb/index.html')
    assert.equal(r.status, 404)
    await r.arrayBuffer()
  } finally {
    await srv.close()
  }
})
