// Supabase Types
// Auto-generated from Supabase dashboard later
// Type: supabase gen types typescript > lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sources: {
        Row: {
          id: string
          name: string
          type: 'rss' | 'tavily' | 'api'
          config: Json
          enabled: boolean
          last_run_at: string | null
          last_results_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'rss' | 'tavily' | 'api'
          config?: Json
          enabled?: boolean
          last_run_at?: string | null
          last_results_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'rss' | 'tavily' | 'api'
          config?: Json
          enabled?: boolean
          last_run_at?: string | null
          last_results_count?: number
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          source_id: string | null
          source_url: string
          title: string
          description: string | null
          company_name: string | null
          project_type: 'competition' | 'tender' | 'pre-tender' | null
          project_category: string | null
          project_value_estimate: number | null
          location: string | null
          score: number
          score_reasoning: string | null
          lead_class: 'hot' | 'warm' | 'cold' | 'not' | null
          persona: 'bauherr_public' | 'bauherr_private' | 'gu' | 'projektsteuerer' | 'planer' | 'unknown' | null
          hebel_type: 'direct' | 'opener' | 'indirect' | null
          hebel_multiplier: number
          project_phase: string | null
          project_date: string | null
          sales_trigger: string | null
          sales_strategy: string | null
          bauherr_name: string | null
          bauherr_type: string | null
          architekt_name: string | null
          gu_name: string | null
          ps_name: string | null
          score_breakdown: Json | null
          basis_score: number | null
          final_score: number | null
          data_quality: 'verified' | 'inferred' | 'mock' | 'missing' | null
          killer_arguments: Json
          best_timing: string | null
          decision_makers: Json
          opener_lead_id: string | null
          ai_summary: string | null
          contact_person: string | null
          contact_role: string | null
          contact_source: string | null
          involved_parties: Json
          planned_completion: string | null
          relevant_links: Json
          deep_research_done: boolean
          deadline: string | null
          notice_type: 'prior_information' | 'market_exploration' | 'competition' | 'contract_notice' | 'award' | 'result' | 'unknown' | null
          procedure_type: string | null
          procurement_stage: 'prior_information' | 'market_exploration' | 'competition' | 'tender' | 'planning_procurement' | 'award' | 'execution' | 'unknown' | null
          sales_window: 'open' | 'closing_soon' | 'too_late' | 'unknown' | null
          cpv_codes: Json | null
          buyer_name: string | null
          buyer_city: string | null
          estimated_value: number | null
          documents_url: string | null
          external_notice_id: string | null
          source_kind: 'procurement_open_data' | 'ted' | 'tavily' | 'rss' | 'firecrawl' | null
          raw_notice: Json | null
          pass_1_data: Json
          pass_2_data: Json
          pass_3_data: Json | null
          enrichment: Json | null
          status: 'new' | 'contacted' | 'qualified' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_id?: string | null
          source_url: string
          title: string
          description?: string | null
          company_name?: string | null
          project_type?: 'competition' | 'tender' | 'pre-tender' | null
          project_category?: string | null
          project_value_estimate?: number | null
          location?: string | null
          score?: number
          score_reasoning?: string | null
          lead_class?: 'hot' | 'warm' | 'cold' | 'not' | null
          persona?: 'bauherr_public' | 'bauherr_private' | 'gu' | 'projektsteuerer' | 'planer' | 'unknown' | null
          hebel_type?: 'direct' | 'opener' | 'indirect' | null
          hebel_multiplier?: number
          project_phase?: string | null
          project_date?: string | null
          sales_trigger?: string | null
          sales_strategy?: string | null
          bauherr_name?: string | null
          bauherr_type?: string | null
          architekt_name?: string | null
          gu_name?: string | null
          ps_name?: string | null
          score_breakdown?: Json | null
          basis_score?: number | null
          final_score?: number | null
          data_quality?: 'verified' | 'inferred' | 'mock' | 'missing' | null
          killer_arguments?: Json
          best_timing?: string | null
          decision_makers?: Json
          opener_lead_id?: string | null
          ai_summary?: string | null
          contact_person?: string | null
          contact_role?: string | null
          contact_source?: string | null
          involved_parties?: Json
          planned_completion?: string | null
          relevant_links?: Json
          deep_research_done?: boolean
          deadline?: string | null
          notice_type?: 'prior_information' | 'market_exploration' | 'competition' | 'contract_notice' | 'award' | 'result' | 'unknown' | null
          procedure_type?: string | null
          procurement_stage?: 'prior_information' | 'market_exploration' | 'competition' | 'tender' | 'planning_procurement' | 'award' | 'execution' | 'unknown' | null
          sales_window?: 'open' | 'closing_soon' | 'too_late' | 'unknown' | null
          cpv_codes?: Json | null
          buyer_name?: string | null
          buyer_city?: string | null
          estimated_value?: number | null
          documents_url?: string | null
          external_notice_id?: string | null
          source_kind?: 'procurement_open_data' | 'ted' | 'tavily' | 'rss' | 'firecrawl' | null
          raw_notice?: Json | null
          pass_1_data?: Json
          pass_2_data?: Json
          pass_3_data?: Json | null
          enrichment?: Json | null
          status?: 'new' | 'contacted' | 'qualified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_id?: string | null
          source_url?: string
          title?: string
          description?: string | null
          company_name?: string | null
          project_type?: 'competition' | 'tender' | 'pre-tender' | null
          project_category?: string | null
          project_value_estimate?: number | null
          location?: string | null
          score?: number
          score_reasoning?: string | null
          lead_class?: 'hot' | 'warm' | 'cold' | 'not' | null
          persona?: 'bauherr_public' | 'bauherr_private' | 'gu' | 'projektsteuerer' | 'planer' | 'unknown' | null
          hebel_type?: 'direct' | 'opener' | 'indirect' | null
          hebel_multiplier?: number
          project_phase?: string | null
          project_date?: string | null
          sales_trigger?: string | null
          sales_strategy?: string | null
          bauherr_name?: string | null
          bauherr_type?: string | null
          architekt_name?: string | null
          gu_name?: string | null
          ps_name?: string | null
          score_breakdown?: Json | null
          basis_score?: number | null
          final_score?: number | null
          data_quality?: 'verified' | 'inferred' | 'mock' | 'missing' | null
          killer_arguments?: Json
          best_timing?: string | null
          decision_makers?: Json
          opener_lead_id?: string | null
          ai_summary?: string | null
          contact_person?: string | null
          contact_role?: string | null
          contact_source?: string | null
          involved_parties?: Json
          planned_completion?: string | null
          relevant_links?: Json
          deep_research_done?: boolean
          deadline?: string | null
          notice_type?: 'prior_information' | 'market_exploration' | 'competition' | 'contract_notice' | 'award' | 'result' | 'unknown' | null
          procedure_type?: string | null
          procurement_stage?: 'prior_information' | 'market_exploration' | 'competition' | 'tender' | 'planning_procurement' | 'award' | 'execution' | 'unknown' | null
          sales_window?: 'open' | 'closing_soon' | 'too_late' | 'unknown' | null
          cpv_codes?: Json | null
          buyer_name?: string | null
          buyer_city?: string | null
          estimated_value?: number | null
          documents_url?: string | null
          external_notice_id?: string | null
          source_kind?: 'procurement_open_data' | 'ted' | 'tavily' | 'rss' | 'firecrawl' | null
          raw_notice?: Json | null
          pass_1_data?: Json
          pass_2_data?: Json
          pass_3_data?: Json | null
          enrichment?: Json | null
          status?: 'new' | 'contacted' | 'qualified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      pipeline_runs: {
        Row: {
          id: string
          started_at: string
          finished_at: string | null
          status: 'running' | 'completed' | 'failed'
          pass_1_results: number
          pass_2_results: number
          pass_3_results: number
          error_log: Json | null
          duration_seconds: number | null
        }
        Insert: {
          id?: string
          started_at?: string
          finished_at?: string | null
          status?: 'running' | 'completed' | 'failed'
          pass_1_results?: number
          pass_2_results?: number
          pass_3_results?: number
          error_log?: Json | null
          duration_seconds?: number | null
        }
        Update: {
          id?: string
          started_at?: string
          finished_at?: string | null
          status?: 'running' | 'completed' | 'failed'
          pass_1_results?: number
          pass_2_results?: number
          pass_3_results?: number
          error_log?: Json | null
          duration_seconds?: number | null
        }
      }
    }
  }
}
