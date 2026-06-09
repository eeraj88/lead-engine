export type HebelType = 'direct' | 'opener' | 'indirect'
export type LeadClass = 'hot' | 'warm' | 'cold' | 'not'

const HEBEL_MULTIPLIERS: Record<HebelType, number> = {
  direct: 1,
  opener: 0.7,
  indirect: 0.4,
}

export function getHebelMultiplier(hebelType: HebelType): number {
  return HEBEL_MULTIPLIERS[hebelType]
}

export function calculateFinalScore({
  basisScore,
  hebelType,
}: {
  basisScore: number
  hebelType: HebelType
}): number {
  const clampedBasisScore = clampScore(basisScore)
  return clampScore(Math.round(clampedBasisScore * getHebelMultiplier(hebelType)))
}

export function classifyLead(finalScore: number): LeadClass {
  const score = clampScore(finalScore)

  if (score >= 80) return 'hot'
  if (score >= 60) return 'warm'
  if (score >= 40) return 'cold'
  return 'not'
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)))
}
