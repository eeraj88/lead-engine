import { describe, expect, test } from 'vitest'
import { PASS_1_PROMPT, PASS_2_PROMPT, PASS_3_PROMPT } from '@/lib/ai/prompts'

describe('AI prompts', () => {
  test('Pass 1 prompt asks for persona and Hebel classification', () => {
    const prompt = PASS_1_PROMPT({
      title: 'Klinikum Stuttgart Neubau',
      description: 'VgV-Verfahren fuer Bettenhaus',
    })

    expect(prompt).toContain('persona')
    expect(prompt).toContain('hebel_type')
    expect(prompt).toContain('bauherr_public')
    expect(prompt).toContain('opener')
  })

  test('Pass 2 prompt asks for score breakdown and final score', () => {
    const prompt = PASS_2_PROMPT({
      title: 'Klinikum Stuttgart Neubau',
      description: 'VgV-Verfahren fuer Bettenhaus',
    })

    expect(prompt).toContain('score_breakdown')
    expect(prompt).toContain('basis_score')
    expect(prompt).toContain('final_score')
    expect(prompt).toContain('lead_class')
    expect(prompt).toContain('hebel_multiplier')
  })

  test('Pass 3 prompt forbids invented contacts and requests sales strategy', () => {
    const prompt = PASS_3_PROMPT({
      title: 'Klinikum Stuttgart Neubau',
      projectType: 'tender',
      companies: ['Klinikum Stuttgart gGmbH'],
      score: 97,
      location: 'Stuttgart',
      persona: 'bauherr_public',
      hebelType: 'direct',
    })

    expect(prompt).toContain('sales_strategy')
    expect(prompt).toContain('decision_makers')
    expect(prompt).toContain('NULL')
    expect(prompt).not.toContain('Max Mustermann')
    expect(prompt).not.toContain('simuliert')
  })
})
