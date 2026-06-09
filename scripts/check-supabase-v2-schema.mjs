import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

loadEnvFile('.env.local')

const requiredColumns = [
  'lead_class',
  'persona',
  'hebel_type',
  'hebel_multiplier',
  'project_phase',
  'project_date',
  'sales_strategy',
  'bauherr_name',
  'architekt_name',
  'score_breakdown',
  'basis_score',
  'final_score',
  'data_quality',
  'decision_makers',
  'opener_lead_id',
  'deadline',
  'notice_type',
  'procedure_type',
  'procurement_stage',
  'sales_window',
  'cpv_codes',
  'buyer_name',
  'buyer_city',
  'estimated_value',
  'documents_url',
  'external_notice_id',
  'source_kind',
  'raw_notice',
]

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exitCode = 1
  throw new Error('Missing Supabase environment')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const { error } = await supabase
  .from('leads')
  .select(requiredColumns.join(','))
  .limit(1)

if (!error) {
  console.log('Supabase v2 schema check: OK')
} else {
  console.error('Supabase v2 schema check: FAILED')
  console.error(`Code: ${error.code ?? 'unknown'}`)
  console.error(`Message: ${error.message}`)

  if (error.message.includes('column') || error.code === '42703') {
    console.error('Run migrations/004_lead_engine_v2.sql and 007_procurement_sources.sql in the Supabase SQL Editor, then rerun this check.')
  }

  process.exitCode = 1
}

function loadEnvFile(path) {
  const content = readFileSync(path, 'utf8')

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    process.env[key] = value.replace(/^["']|["']$/g, '')
  }
}
