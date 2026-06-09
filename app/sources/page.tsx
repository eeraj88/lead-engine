import { createServerClient } from '@/lib/supabase/server'
import type { SourcePersona, SourcePriority } from '@/lib/sources/types'
import { Building2, Globe, HardHat, Landmark, Users, Rss } from 'lucide-react'
import type { ReactNode } from 'react'

const PERSONA_META: Record<SourcePersona, { label: string; icon: ReactNode }> = {
  bauherr_public: { label: 'Bauherr öffentlich', icon: <Landmark size={17} /> },
  bauherr_private: { label: 'Bauherr privat',    icon: <Building2 size={17} /> },
  gu:              { label: 'Generalunternehmer', icon: <HardHat size={17} /> },
  projektsteuerer: { label: 'Projektsteuerer',   icon: <Users size={17} /> },
  planer:          { label: 'Planer / Architekt', icon: <Globe size={17} /> },
  mixed:           { label: 'Gemischt',           icon: <Globe size={17} /> },
}

const PERSONA_ORDER: SourcePersona[] = ['bauherr_public', 'bauherr_private', 'gu', 'projektsteuerer', 'planer', 'mixed']

export default async function SourcesPage() {
  const supabase = await createServerClient() as any
  const { data: sources } = await supabase
    .from('sources')
    .select('*')
    .order('priority', { ascending: true })

  const grouped: Record<SourcePersona, any[]> = {
    bauherr_public: [], bauherr_private: [], gu: [], projektsteuerer: [], planer: [], mixed: [],
  }
  for (const source of (sources ?? [])) {
    const persona: SourcePersona = source.persona ?? 'mixed'
    grouped[persona].push(source)
  }
  const totalActive = (sources ?? []).filter((s: any) => s.enabled).length

  return (
    <div style={{ padding: '34px 40px 64px', maxWidth: 1640 }}>
      {/* Page header */}
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 30, lineHeight: 1.1, color: 'var(--ink)', margin: 0 }}>
          Sources
        </h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, marginTop: 7 }}>
          {(sources ?? []).length} Quellen · {totalActive} aktiv · nach Persona und Priorität gruppiert
        </p>
      </div>

      {!sources || sources.length === 0 ? (
        <div style={{ borderRadius: 'var(--r-card)', border: '1px dashed var(--border)', background: 'var(--card)', padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
          Noch keine Sources. Bitte Migration 005_source_persona.sql in Supabase ausführen.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {PERSONA_ORDER.map((persona) => {
            const group = grouped[persona]
            if (group.length === 0) return null
            const meta = PERSONA_META[persona]
            return (
              <section key={persona}>
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
                  <span style={{
                    display: 'grid', placeItems: 'center', width: 32, height: 32,
                    borderRadius: 9, background: 'var(--navy)', color: 'var(--gold)',
                    flexShrink: 0,
                  }}>
                    {meta.icon}
                  </span>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 13.5, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--navy)', margin: 0 }}>
                      {meta.label}
                    </h2>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{group.length} Quellen</div>
                  </div>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 6 }} />
                </div>

                {/* Card grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--gap-grid)' }}>
                  {group.map((source: any) => (
                    <SourceCard key={source.id} source={source} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PrioBadge({ prio }: { prio: SourcePriority }) {
  const styles: Record<SourcePriority, { bg: string; color: string; border: string }> = {
    1: { bg: 'var(--gold)',    color: 'var(--navy)',    border: 'var(--gold)' },
    2: { bg: 'transparent',   color: 'var(--gold-600)', border: 'var(--gold)' },
    3: { bg: 'transparent',   color: 'var(--ink-2)',   border: 'var(--border-strong)' },
  }
  const s = styles[prio] ?? styles[3]
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', padding: '3px 8px', borderRadius: 6,
      background: s.bg, color: s.color, border: `1.5px solid ${s.border}`,
    }}>
      P{prio}
    </span>
  )
}

function SourceCard({ source }: { source: any }) {
  const priority: SourcePriority = source.priority ?? 2
  const isRss = source.type === 'rss'
  const lastRun = source.last_run_at
    ? new Date(source.last_run_at).toLocaleDateString('de-DE')
    : '–'

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-card)',
      boxShadow: 'var(--shadow-sm)',
      padding: 'var(--pad-card)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15.5, margin: 0, color: 'var(--ink)', lineHeight: 1.25 }}>
            {source.name}
          </h3>
          {source.description && (
            <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '5px 0 0', lineHeight: 1.45 }}>
              {source.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
          <PrioBadge prio={priority} />
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 600,
            color: 'var(--ink-2)', background: 'var(--page)',
            border: '1px solid var(--border)', padding: '3px 9px', borderRadius: 999,
          }}>
            {isRss ? <Rss size={12} /> : <Globe size={12} />}
            {source.type}
          </span>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          fontSize: 12.5, fontWeight: 600,
          color: source.enabled ? '#15803d' : 'var(--ink-3)',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: source.enabled ? 'var(--success)' : 'var(--ink-3)', flexShrink: 0 }} />
          {source.enabled ? 'Aktiv' : 'Inaktiv'}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: (source.last_results_count ?? 0) > 0 ? 'var(--navy)' : 'var(--ink-3)' }}>
          {source.last_results_count ?? 0} Ergebnisse
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        Letzter Lauf: {lastRun}
      </div>
    </div>
  )
}
