import test from 'node:test'
import assert from 'node:assert/strict'
import { createBus } from '../../src/core/bus.js'

test('bus: on/emit/off/clear và "*"', () => {
  const bus = createBus()
  const got = []
  const off = bus.on('a', p => got.push(['a', p.x]))
  bus.on('*', (p, type) => got.push(['*', type]))
  bus.emit('a', { x: 1 })
  off()
  bus.emit('a', { x: 2 })
  assert.deepEqual(got, [['a', 1], ['*', 'a'], ['*', 'a']])
  bus.clear()
  bus.emit('a', { x: 3 })
  assert.equal(got.length, 3)
})
