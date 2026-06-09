import { describe, expect, test } from 'vitest'
import { isRelevantCpv } from '@/lib/pipeline/cpv'

describe('isRelevantCpv', () => {
  test.each([
    '71000000',
    '71200000',
    '71300000',
    '71541000',
  ])('recognizes relevant procurement CPV %s', (cpv) => {
    expect(isRelevantCpv([cpv])).toBe(true)
  })

  test.each([
    '71221000',
    '71320000',
    '71541010',
  ])('recognizes relevant subgroup CPV %s', (cpv) => {
    expect(isRelevantCpv([cpv])).toBe(true)
  })

  test.each([
    '45221000',
    '45221100',
    '45233120',
    '45234100',
  ])('does not treat pure infrastructure CPV %s as relevant', (cpv) => {
    expect(isRelevantCpv([cpv])).toBe(false)
  })

  test('normalizes formatted CPV values and checks all codes', () => {
    expect(isRelevantCpv(['45233120-6', '71240000-2'])).toBe(true)
  })

  test('returns false for empty or invalid CPV input', () => {
    expect(isRelevantCpv([])).toBe(false)
    expect(isRelevantCpv(['', 'not-a-cpv'])).toBe(false)
  })
})
