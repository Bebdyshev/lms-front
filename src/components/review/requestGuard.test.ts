import { describe, expect, it } from 'vitest'
import { createRequestGuard } from './requestGuard'

describe('createRequestGuard', () => {
  it('treats the token from the most recent start() as current', () => {
    const guard = createRequestGuard()
    const token = guard.start()
    expect(guard.isCurrent(token)).toBe(true)
  })

  it('treats an older token as stale once a newer start() has been taken', () => {
    const guard = createRequestGuard()
    const older = guard.start()
    guard.start()
    expect(guard.isCurrent(older)).toBe(false)
  })

  it('supersedes across actions: token A then token B, A checked last, is stale', () => {
    // Mirrors selectGroup superseding an in-flight start(): both share one guard.
    const guard = createRequestGuard()
    const tokenA = guard.start() // e.g. `start()`'s token
    const tokenB = guard.start() // e.g. a later `selectGroup()`'s token
    expect(guard.isCurrent(tokenA)).toBe(false)
    expect(guard.isCurrent(tokenB)).toBe(true)
  })

  it('the older of two sequential requests loses even if it resolves last', () => {
    // The actual bug this guards against: request 1 fires, request 2 fires and resolves
    // first, then request 1's (now-stale) response arrives and must be dropped.
    const guard = createRequestGuard()
    const token1 = guard.start()
    const token2 = guard.start()

    // request 2 resolves first
    expect(guard.isCurrent(token2)).toBe(true)

    // request 1 resolves after -- it must still be recognized as stale
    expect(guard.isCurrent(token1)).toBe(false)
  })
})
