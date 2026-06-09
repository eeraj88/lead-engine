import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import {
  assertLeadEngineV2Schema,
  assertProcurementSchema,
} from '@/lib/supabase/schema-check'
import { runPass0 } from './pass0-procurement'
import { runPass1 } from './pass1-broad'
import { runPass2 } from './pass2-deep'
import { runPass3 } from './pass3-cross'
import { normalizeCompanyName } from './lead-validation'
import { StreamEmitter, type StreamEvent } from './stream'

export interface PipelineStats {
  pass1Results: number
  pass2Results: number
  pass3Results: number
}

export interface PipelineOptions {
  maxRelevantLeads?: number
  /** Max TED notices to fetch per run (default: 50). Use smaller value for test runs. */
  tedLimit?: number
}

export async function runPipeline(
  onEvent: (event: StreamEvent) => void,
  options: PipelineOptions = {}
): Promise<PipelineStats> {
  const stream = new StreamEmitter(onEvent)
  const supabase = await createServiceClient() as any

  // Track pipeline run
  const { data: runData } = await supabase
    .from('pipeline_runs')
    .insert({ status: 'running' })
    .select('id')
    .single()

  const runId = runData?.id
  const startTime = Date.now()

  try {
  await assertLeadEngineV2Schema(supabase)
  await assertProcurementSchema(supabase)

    // Fetch enabled sources
    const { data: sources } = await supabase
      .from('sources')
      .select('*')
      .eq('enabled', true)

    if (!sources || sources.length === 0) {
      throw new Error('No enabled sources found')
    }

    // Pass 0: Structured Procurement Scan (TED + future Open-Data)
    // Notices bypass Pass 1 AI filter — already hard-filtered deterministically
    const pass0Result = await runPass0(stream, supabase, {
      tedLimit: options.tedLimit,
    })

    // Pass 1: Broad Scan (Tavily/RSS sources)
    const pass1Result = await runPass1(sources, stream, {
      maxRelevantLeads: options.maxRelevantLeads,
    })

    // Pass 2: Deep Dive — merge procurement leads + scan leads
    const allRelevantLeads = [...pass0Result.relevantLeads, ...pass1Result.relevantLeads]
    const pass2Result = await runPass2(allRelevantLeads, stream)

    // Pass 3: Cross-Reference (only top leads)
    const enrichedLeads = await runPass3(pass2Result.topLeads, stream)

    // Save leads to database
    for (const lead of enrichedLeads) {
      const { error: insertError } = await supabase.from('leads').insert({
        source_id: lead.sourceId,
        source_url: lead.sourceUrl,
        title: lead.title,
        description: lead.description,
        company_name: normalizeCompanyName(lead.companies[0] || null),
        project_type: lead.projectType as Database['public']['Tables']['leads']['Insert']['project_type'],
        project_category: lead.projectCategory,
        project_value_estimate: lead.projectValueEstimate,
        location: lead.location,
        score: lead.validatedScore,
        lead_class: lead.leadClass,
        persona: lead.persona as Database['public']['Tables']['leads']['Insert']['persona'],
        hebel_type: lead.hebelType,
        hebel_multiplier: lead.hebelMultiplier,
        project_phase: lead.projectPhase,
        project_date: lead.projectDate,
        sales_strategy: lead.salesStrategy,
        bauherr_name: lead.bauherrName,
        bauherr_type: lead.bauherrType,
        architekt_name: lead.architektName,
        gu_name: lead.guName,
        ps_name: lead.psName,
        score_breakdown: lead.scoreBreakdown,
        basis_score: lead.basisScore,
        final_score: lead.validatedScore,
        data_quality: lead.dataQuality,
        killer_arguments: lead.killerArguments,
        best_timing: lead.bestTiming,
        decision_makers: lead.decisionMakers,
        score_reasoning: `${lead.scoreReasoning} | Cross-validated: ${lead.enrichmentNotes}`,
        // Step 2: KI-Zusammenfassung
        ai_summary: lead.aiSummary || null,
        // Step 3: Erweiterte Sales-Felder
        involved_parties: lead.involvedParties.length > 0
          ? lead.involvedParties
          : (lead.deepInvolvedParties.length > 0 ? lead.deepInvolvedParties : null),
        planned_completion: lead.plannedCompletion ?? null,
        relevant_links: lead.relevantLinks.length > 0 ? lead.relevantLinks : null,
        // Step 4: Deep Research
        contact_person: lead.contactPerson,
        contact_role: lead.contactRole,
        contact_source: lead.contactSource,
        sales_trigger: lead.salesTrigger || null,
        deep_research_done: lead.deepResearchDone,
        // Task 6: Procurement fields (TED / Open-Data)
        external_notice_id: lead.procurement?.externalId ?? null,
        source_kind: lead.procurement?.sourceKind ?? null,
        deadline: lead.procurement?.deadline ?? null,
        notice_type: lead.procurement?.noticeType ?? null,
        procurement_stage: lead.procurement?.procurementStage ?? null,
        sales_window: lead.procurement?.salesWindow ?? null,
        cpv_codes: lead.procurement?.cpvCodes.length ? lead.procurement.cpvCodes : null,
        buyer_name: lead.procurement?.buyerName ?? null,
        buyer_city: lead.procurement?.buyerCity ?? null,
        estimated_value: lead.procurement?.estimatedValue ?? null,
        documents_url: lead.procurement?.documentsUrl ?? null,
        raw_notice: lead.procurement?.rawNotice ?? null,
        pass_1_data: lead.pass1Data,
        pass_2_data: lead.pass2Data,
        pass_3_data: lead.pass3Data,
        enrichment: {
          additional_contacts: lead.additionalContacts,
          enrichment_notes: lead.enrichmentNotes,
          estimated_close_probability: lead.estimatedCloseProbability,
        },
        status: 'new',
      })
      if (insertError) {
        // Log insert failures so they're visible in pipeline stream
        onEvent({
          type: 'error',
          message: `DB insert failed for "${lead.title}": ${insertError.message} (code: ${insertError.code})`,
        })
      }
    }

    // Update pipeline run
    if (runId) {
      await supabase
        .from('pipeline_runs')
        .update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          pass_1_results: pass1Result.filteredCount,
          pass_2_results: pass2Result.scoredLeads.length,
          pass_3_results: enrichedLeads.length,
          duration_seconds: Math.floor((Date.now() - startTime) / 1000),
        })
        .eq('id', runId)
    }

    // Update sources last_run
    for (const source of sources) {
      await supabase
        .from('sources')
        .update({
          last_run_at: new Date().toISOString(),
          last_results_count: pass1Result.rawLeads.filter(
            (l) => l.sourceId === source.id
          ).length,
        })
        .eq('id', source.id)
    }

    onEvent({
      type: 'complete',
      stats: {
        pass0Results: pass0Result.relevantLeads.length,
        pass1Results: pass1Result.filteredCount,
        pass2Results: pass2Result.scoredLeads.length,
        pass3Results: enrichedLeads.length,
      },
    })

    return {
      pass1Results: pass1Result.filteredCount + pass0Result.relevantLeads.length,
      pass2Results: pass2Result.scoredLeads.length,
      pass3Results: enrichedLeads.length,
    }
  } catch (error) {
    if (runId) {
      await supabase
        .from('pipeline_runs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_log: { error: error instanceof Error ? error.message : 'Unknown error' },
        })
        .eq('id', runId)
    }

    onEvent({
      type: 'error',
      message: error instanceof Error ? error.message : 'Pipeline failed',
    })

    throw error
  }
}
