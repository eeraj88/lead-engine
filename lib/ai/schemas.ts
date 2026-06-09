import { z } from 'zod'

// ── Shared sub-schemas ────────────────────────────────────────────────────────

export const InvolvedPartySchema = z.object({
  role: z.string(),                                          // z.B. "Architekt", "GU", "Projektsteuerer"
  name: z.string(),
  source: z.enum(['text', 'inferred']).catch('inferred'),   // wie gefunden
})

export const RelevantLinkSchema = z.object({
  url: z.string(),
  title: z.string().default(''),
  type: z.enum(['backlink_in_pdf', 'bauherr_website', 'press_release']).catch('backlink_in_pdf'),
})

export type InvolvedParty = z.infer<typeof InvolvedPartySchema>
export type RelevantLink  = z.infer<typeof RelevantLinkSchema>

// ── Enums ─────────────────────────────────────────────────────────────────────

export const PersonaSchema = z.enum([
  'bauherr_public',
  'bauherr_private',
  'gu',
  'projektsteuerer',
  'planer',
  'unknown',
]).catch('unknown')

export const HebelTypeSchema = z.enum(['direct', 'opener', 'indirect']).catch('indirect')
export const LeadClassSchema = z.enum(['hot', 'warm', 'cold', 'not']).catch('not')
export const DataQualitySchema = z.enum(['verified', 'inferred', 'mock', 'missing']).catch('missing')

// Pass 1: Persona and Hebel classification
export const RelevanceFilterSchema = z.object({
  is_lead: z.boolean().optional(),
  relevant: z.boolean().optional(),
  persona: PersonaSchema.default('unknown'),
  hebel_type: HebelTypeSchema.default('indirect'),
  reason: z.string(),
}).transform((value) => ({
  ...value,
  relevant: value.relevant ?? value.is_lead ?? false,
  is_lead: value.is_lead ?? value.relevant ?? false,
}))

export type RelevanceFilter = z.infer<typeof RelevanceFilterSchema>

// Pass 2: Classification and scoring
export const ClassificationSchema = z.enum(['competition', 'tender', 'pre-tender']).catch('pre-tender')

export const ProjectCategorySchema = z.enum([
  'hospital',
  'school',
  'stadium',
  'housing',
  'office',
  'retail',
  'industrial',
  'infrastructure',
  'cultural',
  'other',
]).catch('other')

const clampInt = (max: number) =>
  z.number().finite().transform((v) =>
    Math.min(max, Math.max(0, Math.round(v)))
  )

export const ScoreBreakdownSchema = z.object({
  recency:    clampInt(25),
  volume:     clampInt(25),
  phase:      clampInt(20),
  persona:    clampInt(15),
  complexity: clampInt(15),
})

export const ClassificationScoringSchema = z.object({
  project_type: ClassificationSchema,
  project_category: ProjectCategorySchema,
  bauherr_name: z.string().nullable().default(null),
  bauherr_type: z.string().nullable().default(null),
  architekt_name: z.string().nullable().default(null),
  gu_name: z.string().nullable().default(null),
  ps_name: z.string().nullable().default(null),
  project_value: z.number().nullable().optional(),
  project_value_estimate: z.number().nullable().default(null),
  project_date: z.string().nullable().default(null),
  project_phase: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  persona: PersonaSchema.default('unknown'),
  hebel_type: HebelTypeSchema.default('indirect'),
  hebel_multiplier: z.number().min(0).max(1).default(1),
  basis_score: clampInt(100).optional(),
  final_score: clampInt(100).optional(),
  score: clampInt(100).optional(),
  score_reasoning: z.union([z.string(), z.record(z.string(), z.unknown())]).transform((v) =>
    typeof v === 'string' ? v : JSON.stringify(v)
  ),
  score_breakdown: ScoreBreakdownSchema.optional(),
  lead_class: LeadClassSchema.optional(),
  data_quality: DataQualitySchema.default('missing'),
  companies: z.array(z.string()).default([]),

  // ── Step 2: KI-Zusammenfassung ───────────────────────────────────────────
  ai_summary: z.string().default(''),                        // Max 3 Sätze, nur Fakten

  // ── Step 3: Erweiterte Sales-Felder ─────────────────────────────────────
  involved_parties: z.array(InvolvedPartySchema).default([]),        // Beteiligte aus Text
  planned_completion: z.string().nullable().default(null),           // ISO-Datum wenn genannt
  relevant_links: z.array(RelevantLinkSchema).default([]),           // Links aus Quelltext
}).transform((value) => {
  const basisScore = value.basis_score ?? value.score ?? value.final_score ?? 0
  const finalScore = value.final_score ?? value.score ?? basisScore

  return {
    ...value,
    project_value_estimate: value.project_value_estimate ?? value.project_value ?? null,
    basis_score: basisScore,
    final_score: finalScore,
    score: value.score ?? finalScore,
  }
})

export type ClassificationScoring = z.infer<typeof ClassificationScoringSchema>

const ContactSchema = z.object({
  name: z.string(),
  role: z.string(),
  company: z.string(),
  // .nullish() = null | undefined — AI often returns null for missing fields
  email: z.string().nullish(),
  phone: z.string().nullish(),
  linkedin_url: z.string().nullish(),
  source: z.enum(['apollo', 'tavily', 'handelsregister']).nullish(),
})

// Pass 3: Basic enrichment + sales strategy
export const CrossReferenceSchema = z.object({
  validated_score: clampInt(100),
  additional_contacts: z.array(ContactSchema).default([]),
  decision_makers: z.array(ContactSchema).default([]),
  enrichment_notes: z.string(),
  sales_strategy: z.string(),
  killer_arguments: z.array(z.string()).default([]),
  best_timing: z.string().nullable().default(null),
  estimated_close_probability: z.number().finite().nullable().default(null).transform((v) =>
    v === null ? null : Math.min(100, Math.max(0, Math.round(v)))
  ),
}).transform((value) => ({
  ...value,
  decision_makers: value.decision_makers.length > 0
    ? value.decision_makers
    : value.additional_contacts,
}))

// Pass 3 Deep Research: HOT-Leads — echte Web-Daten → KI analysiert
export const DeepResearchSchema = z.object({
  contact_person: z.string().nullable().default(null),   // echter Mensch, kein Placeholder
  contact_role: z.string().nullable().default(null),
  contact_source: z.string().nullable().default(null),   // URL der Quelle
  involved_parties: z.array(InvolvedPartySchema).default([]),
  sales_trigger: z.string().default(''),                 // Warum jetzt kontaktieren?
  sales_strategy: z.string().default(''),                // 2-3 Sätze, konkret
  decision_makers: z.array(ContactSchema).default([]),
})

export type DeepResearch = z.infer<typeof DeepResearchSchema>

export type CrossReference = z.infer<typeof CrossReferenceSchema>

export const BauherrnLookupSchema = z.object({
  bauherr_name: z.string().nullable(),
  bauherr_type: z.string().nullable().default(null),
  project_title: z.string().nullable().default(null),
  confidence: z.enum(['verified', 'inferred', 'missing']),
  reason: z.string(),
  source_urls: z.array(z.string()).default([]),
})

export type BauherrnLookup = z.infer<typeof BauherrnLookupSchema>
