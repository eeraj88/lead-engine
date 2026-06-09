export type LeadClass = 'hot' | 'warm' | 'cold' | 'not'

/**
 * Volume-Formatter: AI speichert project_value_estimate in Mio EUR (z.B. 60 = 60 Mio €).
 * Heuristik: Wert < 5000 → Mio EUR. Wert >= 5000 → volle EUR.
 */
export function formatVolume(value: number | null | undefined): string | null {
  if (!value || isNaN(value)) return null
  const inEuro = value < 5000 ? value * 1_000_000 : value
  if (inEuro >= 1_000_000) {
    const mio = inEuro / 1_000_000
    return `${mio % 1 === 0 ? mio.toFixed(0) : mio.toFixed(1)} Mio €`
  }
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(inEuro)
}

export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)))
}

export function getFinalScore(lead: any): number {
  return clampScore(lead.final_score ?? lead.score ?? 0)
}

export function getLeadClass(lead: any, score = getFinalScore(lead)): LeadClass {
  if (lead.lead_class === 'hot' || lead.lead_class === 'warm' || lead.lead_class === 'cold' || lead.lead_class === 'not') {
    return lead.lead_class
  }
  if (score >= 80) return 'hot'
  if (score >= 60) return 'warm'
  if (score >= 40) return 'cold'
  return 'not'
}
