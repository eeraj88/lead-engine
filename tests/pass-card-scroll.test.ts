import { describe, expect, test } from 'vitest'
import {
  isTerminalAtBottom,
  terminalScrollTarget,
} from '@/components/pass-card-scroll'

describe('PassCard terminal scrolling', () => {
  test('treats scrollTop zero as the bottom for column-reverse terminals', () => {
    expect(isTerminalAtBottom(0)).toBe(true)
    expect(isTerminalAtBottom(-4)).toBe(true)
    expect(isTerminalAtBottom(-20)).toBe(false)
  })

  test('returns zero as the auto-scroll target for column-reverse terminals', () => {
    expect(terminalScrollTarget()).toBe(0)
  })
})
