import { callAI, ClassificationScoringSchema } from '@/lib/ai'
import type { InvolvedParty, RelevantLink } from '@/lib/ai/schemas'
import { PASS_2_PROMPT } from '@/lib/ai/prompts'
import type { RawLead, ProcurementMeta } from '@/lib/sources'
import { z } from 'zod'
import type { StreamEmitter } from './stream'

type AiScoring = z.infer<typeof ClassificationScoringSchema>

export interface ScoredLead {
  sourceId: string
  sourceUrl: string
  title: string
  description: string
  projectType: string
  projectCategory: string
  score: number
  basisScore: number
  finalScore: number
  leadClass: 'hot' | 'warm' | 'cold' | 'not'
  persona: string
  hebelType: 'direct' | 'opener' | 'indirect'
  hebelMultiplier: number
  scoreBreakdown: Record<string, number> | null
  scoreReasoning: string
  projectValueEstimate: number | null
  projectDate: string | null
  projectPhase: string | null
  location: string | null
  companies: string[]
  bauherrName: string | null
  bauherrType: string | null
  architektName: string | null
  guName: string | null
  psName: string | null
  dataQuality: 'verified' | 'inferred' | 'mock' | 'missing'
  // Step 2: KI-Zusammenfassung
  aiSummary: string
  // Step 3: Erweiterte Sales-Felder
  involvedParties: InvolvedParty[]
  plannedCompletion: string | null
  relevantLinks: RelevantLink[]
  pass1Data: Record<string, unknown>
  pass2Data: Record<string, unknown>
  /** Carried through from Pass 0 — present only for TED/Open-Data leads */
  procurement?: ProcurementMeta
}

export interface Pass2Result {
  scoredLeads: ScoredLead[]
  topLeads: ScoredLead[]
}

// ── STUDENT KEYWORDS — auto-NOT when any match in title+description ──────────
const STUDENT_KEYWORDS = [
  'Studierende', 'Studenten', 'Hochschule für', 'AIV-Schinkel',
  'Wettbewerb Studenten', 'Studentenwohnheim',
]

// ── RECENCY CAPS per age bracket ─────────────────────────────────────────────
// Returns the maximum allowed recency score given age in months.
// This is HARD CODE — KI cannot override this.
function recencyCap(ageMonths: number): number {
  if (ageMonths > 18) return 0   // AUTO-NOT territory
  if (ageMonths > 12) return 3   // max 3/25
  if (ageMonths >  6) return 10  // max 10/25
  if (ageMonths >  3) return 20  // max 20/25
  return 25                      // full score if ≤ 3 months
}

/** Months since a given date (calendar months, not exact days) */
function monthsSince(date: Date): number {
  const now = new Date()
  return (now.getFullYear() - date.getFullYear()) * 12
       + (now.getMonth() - date.getMonth())
}

function isExecutionPhase(phase: string | null): boolean {
  if (!phase) return false
  const normalized = phase.toLowerCase()
  return normalized.includes('lp5')
    || normalized.includes('lp 5')
    || normalized.includes('ausfuehrung')
    || normalized.includes('ausführung')
    || normalized.includes('bauausfuehrung')
    || normalized.includes('bauausführung')
}

interface PostProcessed extends AiScoring {
  autoNotReason?: string
}

/**
 * Hard-code post-processing AFTER KI call, BEFORE DB save.
 *
 * Rules the KI has proven it cannot reliably self-enforce:
 * A — Age: clamp recency score by project age
 * B — Student filter: zero persona score, force NOT
 * C — Recalculate basis_score from breakdown sum
 * D — Recalculate final_score = basis_score × hebel_multiplier
 * E — Re-derive lead_class from final_score (canonical thresholds)
 */
function postProcessScoring(scoring: AiScoring, lead: RawLead): PostProcessed {
  const result = { ...scoring }
  const bd = result.score_breakdown ? { ...result.score_breakdown } : null
  let autoNotReason: string | undefined

  // ─ FILTER A: Age ──────────────────────────────────────────────────────────
  // Procurement leads: ALWAYS use publishedAt (= notice publication date) as
  // reference. The AI often mis-extracts a historic project/award date from
  // the notice description text, causing spurious Auto-NOT. A notice that
  // survived Pass 0 hard-filter is by definition recent/active.
  // Non-procurement: prefer AI-extracted project_date, fall back to publishedAt.
  const refDateStr = lead.procurement
    ? (lead.publishedAt ?? result.project_date)
    : (result.project_date ?? lead.publishedAt)
  if (refDateStr && bd) {
    const refDate = new Date(refDateStr)
    if (!isNaN(refDate.getTime())) {
      const ageMonths = monthsSince(refDate)
      const cap = recencyCap(ageMonths)

      if (bd.recency > cap) {
        bd.recency = cap
      }
      if (ageMonths > 18) {
        autoNotReason = `Auto-NOT: Projekt ${ageMonths} Monate alt (${refDateStr})`
      }
      if (isExecutionPhase(result.project_phase) && refDate.getTime() <= Date.now()) {
        bd.phase = 0
        autoNotReason = `Auto-NOT: Ausfuehrung bereits gestartet (${refDateStr})`
      }
    }
  }

  // ─ FILTER B: Student-Projekt ──────────────────────────────────────────────
  const textToCheck = `${lead.title} ${lead.description}`.toLowerCase()
  const studentHit = STUDENT_KEYWORDS.find(kw => textToCheck.includes(kw.toLowerCase()))
  if (studentHit) {
    if (bd) bd.persona = 0
    autoNotReason = `Auto-NOT: Studierenden-Projekt ("${studentHit}")`
  }

  // ─ FILTER C: Recalculate basis_score from (possibly clamped) breakdown ────
  if (bd) {
    result.score_breakdown = bd
    const sum = bd.recency + bd.volume + bd.phase + bd.persona + bd.complexity
    result.basis_score = Math.min(100, sum)
  }

  // ─ FILTER D: Recalculate final_score ─────────────────────────────────────
  const multiplier = result.hebel_multiplier ?? 1
  result.final_score = Math.min(100, Math.round(result.basis_score * multiplier))
  result.score = result.final_score

  // ─ FILTER E: Re-derive lead_class from score ──────────────────────────────
  result.lead_class = classifyByScore(result.final_score)
  if (autoNotReason) {
    result.lead_class = 'not'
  }

  // ─ FILTER F: Sales Window (procurement leads only) ────────────────────────
  // Hard rule: too_late = NOT (award/expired deadline/execution already running).
  // unknown = NO CAP — filterProcurementNotice already rejected expired deadlines,
  //   awards and execution notices before Pass 2. A notice that survived the hard
  //   filter with unknown sales_window is implicitly active/open.
  // Non-procurement (Tavily/RSS) leads are unaffected — no sales_window set.
  if (lead.procurement) {
    const { salesWindow, deadline } = lead.procurement
    if (salesWindow === 'too_late') {
      autoNotReason = `Auto-NOT: Sales-Fenster geschlossen (Frist: ${deadline ?? 'abgelaufen'})`
      result.lead_class = 'not'
      result.final_score = Math.min(result.final_score, 35)
      result.score = result.final_score
    }
    // 'open', 'closing_soon', 'unknown' → normal scoring, no cap
  }

  return { ...result, autoNotReason }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function runPass2(
  relevantLeads: RawLead[],
  stream: StreamEmitter
): Promise<Pass2Result> {
  stream.send({ type: 'pass_started', pass: 2 })

  const scoredLeads: ScoredLead[] = []

  for (const lead of relevantLeads) {
    try {
      const aiScoring = await callAI({
        model: 'openai/gpt-4o-mini',
        prompt: PASS_2_PROMPT(lead),
        schema: ClassificationScoringSchema,
      })

      // ── POST-PROCESS (hard code rules, KI kann nicht widersprechen) ────────
      const scoring = postProcessScoring(aiScoring, lead)

      // Warn if KI class was corrected
      if (scoring.autoNotReason) {
        stream.send({ type: 'warning', message: `⚠ ${scoring.autoNotReason}: "${lead.title}"` })
      } else if (aiScoring.lead_class !== scoring.lead_class) {
        stream.send({
          type: 'warning',
          message: `⚠ Re-classified "${lead.title}": KI="${aiScoring.lead_class}" Score=${scoring.final_score} → "${scoring.lead_class}"`,
        })
      }
      // Info: procurement lead with unknown sales window (hard filter passed, implicitly active)
      if (lead.procurement?.salesWindow === 'unknown' && (scoring.lead_class === 'hot' || scoring.lead_class === 'warm')) {
        stream.send({
          type: 'warning',
          message: `ℹ️ TED-Lead ohne Deadline-Datum, kein Fenster-Cap: "${lead.title.slice(0, 60)}" → ${scoring.lead_class.toUpperCase()} ${scoring.final_score}`,
        })
      }

      // Warn on suspiciously round scores (KI lazy scoring)
      const finalScore = scoring.final_score
      if (finalScore === 85 || finalScore === 80 || finalScore === 75) {
        stream.send({
          type: 'warning',
          message: `⚠ Runder Score bei "${lead.title}": ${finalScore} — Scoring prüfen`,
        })
      }

      const scoredLead: ScoredLead = {
        sourceId:             lead.sourceId,
        sourceUrl:            lead.sourceUrl,
        title:                lead.title,
        description:          lead.description,
        projectType:          scoring.project_type,
        projectCategory:      scoring.project_category,
        score:                finalScore,
        basisScore:           scoring.basis_score,
        finalScore:           finalScore,
        leadClass:            scoring.lead_class ?? 'not',
        persona:              scoring.persona,
        hebelType:            scoring.hebel_type,
        hebelMultiplier:      scoring.hebel_multiplier,
        scoreBreakdown:       scoring.score_breakdown ?? null,
        scoreReasoning:       scoring.score_reasoning,
        projectValueEstimate: scoring.project_value_estimate,
        projectDate:          scoring.project_date,
        projectPhase:         scoring.project_phase,
        location:             scoring.location,
        companies:            scoring.companies,
        bauherrName:          scoring.bauherr_name,
        bauherrType:          scoring.bauherr_type,
        architektName:        scoring.architekt_name,
        guName:               scoring.gu_name,
        psName:               scoring.ps_name,
        dataQuality:          scoring.data_quality,
        // Step 2
        aiSummary:            scoring.ai_summary,
        // Step 3
        involvedParties:      scoring.involved_parties,
        plannedCompletion:    scoring.planned_completion,
        relevantLinks:        scoring.relevant_links,
        procurement: lead.procurement,
        pass1Data: {
          publishedAt: lead.publishedAt,
          isLead:      lead.isLead,
          persona:     lead.persona,
          hebelType:   lead.hebelType,
          reason:      lead.pass1Reason,
        },
        pass2Data: {
          classifiedAt:  new Date().toISOString(),
          rawAIResponse: aiScoring,   // original KI-Antwort archivieren
          postProcessed: {            // was wurde geändert?
            recencyCapApplied: scoring.score_breakdown?.recency !== aiScoring.score_breakdown?.recency,
            autoNotReason:     scoring.autoNotReason,
            aiLeadClass:       aiScoring.lead_class,
            aiScore:           aiScoring.final_score,
          },
        },
      }

      scoredLeads.push(scoredLead)

      stream.send({
        type:  'lead_scored',
        title: lead.title,
        score: finalScore,
      })
    } catch (error) {
      stream.send({
        type:    'error',
        message: `Scoring failed for ${lead.title}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  const topLeads = scoredLeads.filter(
    (lead) => lead.leadClass === 'hot' || lead.leadClass === 'warm'
  )

  stream.send({ type: 'pass_complete', pass: 2, count: scoredLeads.length })

  return { scoredLeads, topLeads }
}

/** Classify lead by final_score using canonical thresholds (matches lead-utils.ts) */
function classifyByScore(score: number): 'hot' | 'warm' | 'cold' | 'not' {
  if (score >= 80) return 'hot'
  if (score >= 60) return 'warm'
  if (score >= 40) return 'cold'
  return 'not'
}
