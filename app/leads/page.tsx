import type { CSSProperties } from 'react'
import { Suspense } from 'react'
import { LeadFilters } from '@/components/LeadFilters'
import { LeadCard } from '@/components/LeadCard'
import { createServerClient } from '@/lib/supabase/server'
import { Flame, Thermometer, Snowflake, XCircle, ChevronLeft, ChevronRight, LayoutList, Download, Bookmark } from 'lucide-react'
import Link from 'next/link'

const PER_PAGE = 15

const TABS = [
  { key: 'alle', label: 'Alle',  sub: 'Gesamt-Übersicht',       icon: LayoutList  },
  { key: 'shortlist', label: 'Markiert', sub: 'Gespeicherte Favoriten', icon: Bookmark },
  { key: 'hot',  label: 'HOT',  sub: 'Sofortiger Outreach',    icon: Flame       },
  { key: 'warm', label: 'WARM', sub: 'Nachfassen + anreichern', icon: Thermometer },
  { key: 'cold', label: 'COLD', sub: 'Radar und Nurturing',     icon: Snowflake   },
  { key: 'not',  label: 'NOT',  sub: 'Archiv oder verwerfen',   icon: XCircle     },
]

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await searchParams

  const activeTab  = p.tab      ?? 'alle'
  const zeitraum   = p.zeitraum ?? 'today'
  const persona    = p.persona  && p.persona !== 'all' ? p.persona : null
  const hebel      = p.hebel    && p.hebel   !== 'all' ? p.hebel   : null
  const minScore   = Number(p.minScore  ?? 60)
  const sourceId   = p.sourceId && p.sourceId !== 'all' ? p.sourceId : null
  const status     = p.status   && p.status   !== 'all' ? p.status   : null
  const sort       = p.sort ?? 'score'
  const page       = Math.max(1, Number(p.page ?? 1))
  const offset     = (page - 1) * PER_PAGE

  const supabase = await createServerClient() as any

  // ── Get last run start_time for "last_run" filter ──
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

  // ── Sources list for filter dropdown ──
  const { data: sources } = await supabase
    .from('sources')
    .select('id, name')
    .order('name')

  // ── Build query ──
  const scoreCol = 'final_score'

  let query = supabase.from('leads').select('*', { count: 'exact' })

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
  // 'all': no time filter

  // Score filter
  if (minScore > 0) {
    query = query.gte(scoreCol, minScore)
  }

  // Persona filter
  if (persona) query = query.eq('persona', persona)

  // Hebel filter
  if (hebel) query = query.eq('hebel_type', hebel)

  // Source filter
  if (sourceId) query = query.eq('source_id', sourceId)

  // Status filter (from dropdown)
  if (status) query = query.eq('status', status)

  // Lead class filter (tab) — "alle" zeigt alle Klassen
  if (activeTab === 'shortlist') {
    query = query.eq('bookmarked', true)
  } else if (activeTab !== 'alle') {
    query = query.eq('lead_class', activeTab)
  }

  // Sort
  if (sort === 'score') {
    query = query.order(scoreCol, { ascending: false })
  } else if (sort === 'date') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'volume') {
    query = query.order('project_value_estimate', { ascending: false, nullsFirst: false })
  }

  // Pagination
  query = query.range(offset, offset + PER_PAGE - 1)

  const { data: leads, count: totalCount } = await query

  // ── Tab counts: separate counts per class with same time/persona/hebel/score/source filters ──
  const baseCountQuery = () => {
    let q = supabase.from('leads').select('lead_class', { count: 'exact', head: true })
    const now2 = new Date()
    if (zeitraum === 'today') {
      const s = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate()).toISOString()
      q = q.gte('created_at', s)
    } else if (zeitraum === '7d') {
      const d = new Date(now2); d.setDate(d.getDate() - 7)
      q = q.gte('created_at', d.toISOString())
    } else if (zeitraum === '30d') {
      const d = new Date(now2); d.setDate(d.getDate() - 30)
      q = q.gte('created_at', d.toISOString())
    } else if (zeitraum === 'last_run' && lastRunAt) {
      q = q.gte('created_at', lastRunAt)
    }
    if (minScore > 0) q = q.gte(scoreCol, minScore)
    if (persona) q = q.eq('persona', persona)
    if (hebel) q = q.eq('hebel_type', hebel)
    if (sourceId) q = q.eq('source_id', sourceId)
    if (status) q = q.eq('status', status)
    return q
  }

  const [cHot, cWarm, cCold, cNot, cShortlist] = await Promise.all([
    baseCountQuery().eq('lead_class', 'hot'),
    baseCountQuery().eq('lead_class', 'warm'),
    baseCountQuery().eq('lead_class', 'cold'),
    baseCountQuery().eq('lead_class', 'not'),
    baseCountQuery().eq('bookmarked', true),
  ])

  const counts = {
    hot:  cHot.count ?? 0,
    warm: cWarm.count ?? 0,
    cold: cCold.count ?? 0,
    not:  cNot.count ?? 0,
    shortlist: cShortlist.count ?? 0,
    alle: (cHot.count ?? 0) + (cWarm.count ?? 0) + (cCold.count ?? 0) + (cNot.count ?? 0),
  }

  const totalPages = Math.ceil((totalCount ?? 0) / PER_PAGE)
  const currentTab = TABS.find((t) => t.key === activeTab) ?? TABS[0]

  // Build URL preserving all active filters, with overrides
  function buildUrl(overrides: Record<string, string | null | undefined>) {
    const base: Record<string, string | null | undefined> = {
      tab: activeTab,
      zeitraum,
      persona,
      hebel,
      minScore: minScore > 0 ? String(minScore) : null,
      sourceId,
      status,
      sort: sort !== 'score' ? sort : null,
      page: String(page),
    }
    const merged = { ...base, ...overrides }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'null' && v !== 'undefined') params.set(k, v)
    }
    return `/leads?${params.toString()}`
  }

  function buildExportUrl(filters: Record<string, string | null | undefined>) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (v && v !== 'null' && v !== 'undefined') params.set(k, v)
    }
    return `/api/leads/export?${params.toString()}`
  }

  return (
    <div style={{ padding: '34px 40px 64px', maxWidth: 1640 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 30, lineHeight: 1.1, color: 'var(--ink)', margin: 0 }}>
            Leads
          </h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 14.5, marginTop: 6, maxWidth: 720 }}>
            Qualifizierte Pipeline-Funde — gefiltert, bewertet, bereit für Outreach.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexShrink: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
            padding: '5px 11px', borderRadius: 999, border: '1px solid var(--border)',
            color: 'var(--ink-2)', background: 'var(--card)',
          }}>
            {totalCount ?? 0} in dieser Ansicht
          </span>
          <a
            href={buildExportUrl({ tab: activeTab, zeitraum, persona, hebel, minScore: minScore > 0 ? String(minScore) : null, sourceId, status, sort: sort !== 'score' ? sort : null })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
              padding: '5px 13px', borderRadius: 999, border: '1px solid var(--border)',
              color: 'var(--ink)', background: 'var(--card)', textDecoration: 'none',
              cursor: 'pointer',
            }}
            download
          >
            <Download size={13} />
            CSV
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <Suspense fallback={null}>
      <LeadFilters
        sources={sources ?? []}
        zeitraum={zeitraum}
        persona={persona ?? undefined}
        hebel={hebel ?? undefined}
        minScore={String(minScore)}
        sourceId={sourceId ?? undefined}
        status={status ?? undefined}
        sort={sort}
      />
      </Suspense>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const on = activeTab === t.key
          const cnt = counts[t.key as keyof typeof counts]
          const href = buildUrl({ tab: t.key, page: '1' })
          return (
            <Link
              key={t.key}
              href={href}
              style={{
                fontFamily: 'var(--font-body)', cursor: 'pointer', borderRadius: 9,
                padding: '8px 15px', fontSize: 13, fontWeight: 600,
                border: on ? '1px solid var(--navy)' : '1px solid var(--border)',
                background: on ? 'var(--navy)' : 'var(--card)',
                color: on ? '#fff' : 'var(--ink-2)',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                textDecoration: 'none',
              }}
            >
              {t.label}
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                background: on ? 'rgba(255,255,255,.18)' : 'var(--page)',
                color: on ? '#fff' : 'var(--ink-3)',
              }}>
                {cnt}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Group header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: 'var(--navy-050)',
        borderRadius: 10, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'grid', placeItems: 'center', width: 28, height: 28,
            borderRadius: 7, background: 'var(--navy)', color: 'var(--gold)',
          }}>
            <currentTab.icon size={14} />
          </span>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>
              {currentTab.label}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--navy-600)' }}>{currentTab.sub}</div>
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
          {totalCount ?? 0} Leads
        </span>
      </div>

      {/* Lead list */}
      {!leads || leads.length === 0 ? (
        <div style={{
          background: 'var(--card)', border: '1px dashed var(--border)',
          borderRadius: 'var(--r-card)', padding: '36px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 17, color: 'var(--ink-2)', marginBottom: 6, margin: 0 }}>
            Keine Leads in dieser Ansicht
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 8 }}>
            {zeitraum === 'today'
              ? 'Heute noch keine Pipeline gelaufen oder keine Treffer für die Filter.'
              : 'Filter anpassen oder anderen Zeitraum wählen.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leads.map((lead: any) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 28 }}>
          {/* Previous */}
          {page > 1 ? (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              style={paginationBtn(false)}
            >
              <ChevronLeft size={15} /> Vorherige
            </Link>
          ) : (
            <span style={paginationBtn(true)}><ChevronLeft size={15} /> Vorherige</span>
          )}

          {/* Page numbers */}
          {buildPageNumbers(page, totalPages).map((n, i) =>
            n === null ? (
              <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--ink-3)', fontSize: 13 }}>…</span>
            ) : (
              <Link
                key={n}
                href={buildUrl({ page: String(n) })}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: `1px solid ${n === page ? 'var(--navy)' : 'var(--border)'}`,
                  background: n === page ? 'var(--navy)' : 'var(--card)',
                  color: n === page ? '#fff' : 'var(--ink)',
                  textDecoration: 'none',
                }}
              >
                {n}
              </Link>
            )
          )}

          {/* Next */}
          {page < totalPages ? (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              style={paginationBtn(false)}
            >
              Nächste <ChevronRight size={15} />
            </Link>
          ) : (
            <span style={paginationBtn(true)}>Nächste <ChevronRight size={15} /></span>
          )}
        </div>
      )}

      {/* Page info */}
      {totalPages > 1 && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>
          Seite {page} von {totalPages} · {totalCount} Leads gesamt
        </div>
      )}
    </div>
  )
}

function paginationBtn(disabled: boolean): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: '1px solid var(--border)',
    background: 'var(--card)',
    color: disabled ? 'var(--ink-3)' : 'var(--ink)',
    textDecoration: 'none',
    pointerEvents: disabled ? 'none' : 'auto',
    opacity: disabled ? 0.5 : 1,
  }
}

function buildPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | null)[] = []
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, null, total)
  } else if (current >= total - 3) {
    pages.push(1, null, total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, null, current - 1, current, current + 1, null, total)
  }
  return pages
}
