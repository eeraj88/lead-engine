import { describe, expect, test } from 'vitest'
import {
  calculateFinalScore,
  classifyLead,
  getHebelMultiplier,
} from '@/lib/pipeline/scoring'

describe('scoring', () => {
  test('maps each Hebel type to the concept multiplier', () => {
    expect(getHebelMultiplier('direct')).toBe(1)
    expect(getHebelMultiplier('opener')).toBe(0.7)
    expect(getHebelMultiplier('indirect')).toBe(0.4)
  })

  test('calculates rounded final scores from basis score and Hebel multiplier', () => {
    expect(calculateFinalScore({ basisScore: 97, hebelType: 'direct' })).toBe(97)
    expect(calculateFinalScore({ basisScore: 84, hebelType: 'opener' })).toBe(59)
    expect(calculateFinalScore({ basisScore: 84, hebelType: 'indirect' })).toBe(34)
  })

  test('clamps final scores to the supported 0-100 range', () => {
    expect(calculateFinalScore({ basisScore: 140, hebelType: 'direct' })).toBe(100)
    expect(calculateFinalScore({ basisScore: -10, hebelType: 'direct' })).toBe(0)
  })

  test('classifies final scores according to the v2 concept thresholds', () => {
    expect(classifyLead(100)).toBe('hot')
    expect(classifyLead(80)).toBe('hot')
    expect(classifyLead(79)).toBe('warm')
    expect(classifyLead(60)).toBe('warm')
    expect(classifyLead(59)).toBe('cold')
    expect(classifyLead(40)).toBe('cold')
    expect(classifyLead(39)).toBe('not')
    expect(classifyLead(0)).toBe('not')
  })
})
