import { DashboardClient } from '@/components/DashboardClient'
import { createServerClient } from '@/lib/supabase/server'

export interface SourceKpi {
  sourceId: string
  sourceName: string
  sourceKind: string | null
  total: number
  quality: number     // HOT + WARM
  notCount: number
  qualityRate: number // 0-100
  lastSeen: string | null
}

export default async function DashboardPage() {
  const supabase = await createServerClient() as any
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: leads }, { data: sources }, { data: runs }, { data: recentLeads }] = await Promise.all([
    supabase.from('leads').select('lead_class,final_score,score,hebel_type,opener_lead_id,source_kind,created_at,status,bookmarked').limit(1000),
    // Fetch ALL sources for name mapping (incl. disabled — leads may reference them)
    supabase.from('sources').select('id,name,enabled'),
    supabase.from('pipeline_runs').select('status,started_at,pass_1_results,pass_2_results,pass_3_results').order('started_at', { ascending: false }).limit(1),
    // Recent leads for source KPIs — need source_id, lead_class, source_kind, created_at
    supabase.from('leads')
      .select('source_id,lead_class,final_score,score,source_kind,created_at')
      .gte('created_at', since7d)
      .limit(1000),
  ])

  const leadRows = leads ?? []
  const hotCount  = leadRows.filter((lead: any) => getLeadClass(lead) === 'hot').length
  const warmCount = leadRows.filter((lead: any) => getLeadClass(lead) === 'warm').length
  const coldCount = leadRows.filter((lead: any) => getLeadClass(lead) === 'cold').length
  const currentLeadsCount = hotCount + warmCount + coldCount
  // bookmarkedCount: uses 'bookmarked' column after migration 012; falls back to status='qualified'
  const bookmarkedCount = leadRows.filter((lead: any) =>
    lead.bookmarked === true || lead.status === 'qualified'
  ).length
  const lastRun = runs?.[0]

  // ── Quellen-KPIs (letzte 7 Tage) ──────────────────────────────────────────
  const sourceMap = new Map<string, { name: string }>()
  for (const s of sources ?? []) sourceMap.set(s.id, { name: s.name })

  const kpiMap = new Map<string, SourceKpi>()
  for (const lead of recentLeads ?? []) {
    const sid = lead.source_id ?? 'unknown'
    if (!kpiMap.has(sid)) {
      kpiMap.set(sid, {
        sourceId:    sid,
        sourceName:  sourceMap.get(sid)?.name ?? sid,
        sourceKind:  lead.source_kind ?? null,
        total:       0,
        quality:     0,
        notCount:    0,
        qualityRate: 0,
        lastSeen:    null,
      })
    }
    const k = kpiMap.get(sid)!
    const cls = getLeadClass(lead)
    k.total++
    if (cls === 'hot' || cls === 'warm') k.quality++
    if (cls === 'not') k.notCount++
    if (!k.lastSeen || lead.created_at > k.lastSeen) k.lastSeen = lead.created_at
  }
  const sourceKpis: SourceKpi[] = Array.from(kpiMap.values())
    .map(k => ({ ...k, qualityRate: k.total > 0 ? Math.round((k.quality / k.total) * 100) : 0 }))
    .sort((a, b) => b.quality - a.quality || b.total - a.total)
    .slice(0, 10)

  return (
    <DashboardClient
      initialStats={{
        hotCount,
        warmCount,
        currentLeadsCount,
        bookmarkedCount,
        sourceCount: (sources ?? []).filter((s: any) => s.enabled).length,
        lastRunLabel: lastRun ? formatRunLabel(lastRun) : '-',
        pass1Count: lastRun?.pass_1_results ?? 0,
        pass2Count: lastRun?.pass_2_results ?? 0,
        pass3Count: lastRun?.pass_3_results ?? 0,
      }}
      sourceKpis={sourceKpis}
    />
  )
}

function getLeadClass(lead: any): 'hot' | 'warm' | 'cold' | 'not' {
  if (lead.lead_class === 'hot' || lead.lead_class === 'warm' || lead.lead_class === 'cold' || lead.lead_class === 'not') {
    return lead.lead_class
  }

  const score = Math.min(100, Math.max(0, Math.round(lead.final_score ?? lead.score ?? 0)))
  if (score >= 80) return 'hot'
  if (score >= 60) return 'warm'
  if (score >= 40) return 'cold'
  return 'not'
}

function formatRunLabel(run: { status: string; started_at: string }) {
  const date = new Date(run.started_at).toLocaleDateString('de-DE')
  return `${run.status} · ${date}`
}
