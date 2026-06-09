import { createServerClient } from '@/lib/supabase/server'
import { getFinalScore, getLeadClass } from '@/lib/lead-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const p = Object.fromEntries(url.searchParams.entries())

  const activeTab = p.tab ?? 'alle'
  const zeitraum  = p.zeitraum ?? 'today'
  const persona   = p.persona && p.persona !== 'all' ? p.persona : null
  const hebel     = p.hebel && p.hebel !== 'all' ? p.hebel : null
  const minScore  = Number(p.minScore ?? 60)
  const sourceId  = p.sourceId && p.sourceId !== 'all' ? p.sourceId : null
  const sort      = p.sort ?? 'score'

  const supabase = await createServerClient() as any

  // Last run timestamp for 'last_run' filter
  let lastRunAt: string | null = null
  if (zeitraum === 'last_run') {
    const { data: runRow } = await supabase
      .from('pipeline_runs')
      .select('started_at')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()
    lastRunAt = runRow?.started_at ?? null
  }

  let query = supabase.from('leads').select(
    'id,title,lead_class,final_score,score,hebel_type,persona,' +
    'buyer_name,bauherr_name,buyer_city,estimated_value,project_value_estimate,' +
    'sales_window,deadline,source_kind,source_url,created_at,' +
    'external_notice_id,sales_strategy,ai_summary,contact_person,contact_role,' +
    'description'
  )

  // Time filter
  const now = new Date()
  if (zeitraum === 'today') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    query = query.gte('created_at', todayStart)
  } else if (zeitraum === '7d') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    query = query.gte('created_at', d.toISOString())
  } else if (zeitraum === '30d') {
    const d = new Date(now); d.setDate(d.getDate() - 30)
    query = query.gte('created_at', d.toISOString())
  } else if (zeitraum === 'last_run' && lastRunAt) {
    query = query.gte('created_at', lastRunAt)
  }

  if (minScore > 0) query = query.gte('final_score', minScore)
  if (persona)      query = query.eq('persona', persona)
  if (hebel)        query = query.eq('hebel_type', hebel)
  if (sourceId)     query = query.eq('source_id', sourceId)
  if (activeTab !== 'alle') query = query.eq('lead_class', activeTab)

  if (sort === 'score') {
    query = query.order('final_score', { ascending: false })
  } else if (sort === 'date') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'volume') {
    query = query.order('project_value_estimate', { ascending: false, nullsFirst: false })
  }

  query = query.limit(500)

  const { data: leads, error } = await query

  if (error) {
    return new Response('Export fehlgeschlagen: ' + error.message, { status: 500 })
  }

  const rows = leads ?? []

  // Build CSV
  const headers = [
    'Score', 'Klasse', 'Hebel', 'Titel',
    'Auftraggeber', 'Stadt', 'Volumen (Mio €)',
    'Quelle', 'Sales-Window', 'Frist',
    'Notice-ID', 'Kontakt', 'Kontakt-Rolle',
    'KI-Zusammenfassung', 'Sales-Strategie',
    'URL', 'Gefunden am',
  ]

  const csvLines = [headers.map(csvCell).join(';')]

  for (const lead of rows) {
    const score = getFinalScore(lead)
    const cls   = getLeadClass(lead, score)
    const auftraggeber = lead.buyer_name ?? lead.bauherr_name ?? ''
    const volRaw = lead.estimated_value
      ? (lead.estimated_value / 1_000_000).toFixed(1)   // cents/EUR → Mio
      : lead.project_value_estimate
      ? Number(lead.project_value_estimate).toFixed(1)
      : ''
    const frist = lead.deadline
      ? new Date(lead.deadline).toLocaleDateString('de-DE')
      : ''
    const gefunden = lead.created_at
      ? new Date(lead.created_at).toLocaleDateString('de-DE')
      : ''

    const row = [
      String(score),
      cls.toUpperCase(),
      (lead.hebel_type ?? '').toUpperCase(),
      lead.title ?? '',
      auftraggeber,
      lead.buyer_city ?? '',
      volRaw,
      lead.source_kind ?? '',
      lead.sales_window ?? '',
      frist,
      lead.external_notice_id ?? '',
      lead.contact_person ?? '',
      lead.contact_role ?? '',
      lead.ai_summary ?? '',
      lead.sales_strategy ?? '',
      lead.source_url ?? '',
      gefunden,
    ]
    csvLines.push(row.map(csvCell).join(';'))
  }

  const csv = '﻿' + csvLines.join('\r\n')   // BOM for Excel UTF-8

  const today = new Date().toISOString().slice(0, 10)
  const filename = `leads-export-${today}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

function csvCell(val: string): string {
  const s = String(val ?? '').replace(/\r?\n/g, ' ').trim()
  // Wrap in quotes if contains semicolon, quote, or newline
  if (s.includes('"') || s.includes(';') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}
