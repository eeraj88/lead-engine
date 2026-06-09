const RELEVANT_CPV_DIVISIONS = new Set([
  '71', // Architecture, construction, engineering and inspection services
])

function normalizeCpv(cpv: string): string | null {
  const mainCode = cpv.trim().split('-')[0].replace(/\D/g, '')
  return mainCode.length === 8 ? mainCode : null
}

export function isRelevantCpv(cpvCodes: string[]): boolean {
  return cpvCodes.some((cpv) => {
    const normalized = normalizeCpv(cpv)
    return normalized !== null
      && RELEVANT_CPV_DIVISIONS.has(normalized.slice(0, 2))
  })
}
