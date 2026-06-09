import { describe, expect, test, vi } from 'vitest'
import { StreamEmitter } from '@/lib/pipeline/stream'

describe('StreamEmitter', () => {
  test('forwards stream events to the configured callback', () => {
    const onEvent = vi.fn()
    const emitter = new StreamEmitter(onEvent)
    const event = { type: 'pass_started' as const, pass: 1 }

    emitter.send(event)

    expect(onEvent).toHaveBeenCalledWith(event)
  })
})
