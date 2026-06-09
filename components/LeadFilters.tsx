'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'

interface LeadFilterBarProps {
  sources?: { id: string; name: string }[]
  // Current values (from URL)
  zeitraum?: string
  persona?: string
  hebel?: string
  minScore?: string
  sourceId?: string
  status?: string
  sort?: string
}

const SEL_STYLE = {
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--ink)',
  cursor: 'pointer',
  outline: 'none',
  height: 34,
}

export function LeadFilters({
  sources = [],
  zeitraum,
  persona,
  hebel,
  minScore,
  sourceId,
  status,
  sort,
}: LeadFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value === '' || value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    // Reset to page 1 on any filter change
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasFilters = zeitraum || persona || hebel || minScore || sourceId || status || sort !== 'score'

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-card)', boxShadow: 'var(--shadow-sm)',
      padding: '14px 18px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)', marginRight: 4 }}>
          <SlidersHorizontal size={14} />
          Filter
        </div>

        {/* Status (Markiert) */}
        <select
          style={SEL_STYLE}
          value={status ?? 'all'}
          onChange={(e) => update('status', e.target.value)}
          title="Status"
        >
          <option value="all">Alle Status</option>
          <option value="qualified">Nur Markierte</option>
        </select>

        {/* Zeitraum */}
        <select
          style={SEL_STYLE}
          value={zeitraum ?? 'today'}
          onChange={(e) => update('zeitraum', e.target.value)}
          title="Zeitraum"
        >
          <option value="today">Heute</option>
          <option value="7d">Letzte 7 Tage</option>
          <option value="30d">Letzte 30 Tage</option>
          <option value="last_run">Letzter Pipeline-Run</option>
          <option value="all">Alle</option>
        </select>

        {/* Persona */}
        <select
          style={SEL_STYLE}
          value={persona ?? 'all'}
          onChange={(e) => update('persona', e.target.value)}
          title="Persona"
        >
          <option value="all">Alle Personas</option>
          <option value="bauherr_public">Bauherr öffentlich</option>
          <option value="bauherr_private">Bauherr privat</option>
          <option value="gu">Generalunternehmer</option>
          <option value="projektsteuerer">Projektsteuerer</option>
          <option value="planer">Planer / Architekt</option>
        </select>

        {/* Hebel */}
        <select
          style={SEL_STYLE}
          value={hebel ?? 'all'}
          onChange={(e) => update('hebel', e.target.value)}
          title="Hebel"
        >
          <option value="all">Alle Hebel</option>
          <option value="direct">DIRECT</option>
          <option value="opener">OPENER</option>
          <option value="indirect">INDIRECT</option>
        </select>

        {/* Min Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>Min-Score</span>
          <input
            type="number"
            min={0} max={100} step={5}
            style={{ ...SEL_STYLE, width: 72 }}
            defaultValue={minScore ?? '60'}
            onBlur={(e) => update('minScore', e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') update('minScore', (e.target as HTMLInputElement).value) }}
            title="Min-Score"
          />
        </div>

        {/* Quelle */}
        {sources.length > 0 && (
          <select
            style={SEL_STYLE}
            value={sourceId ?? 'all'}
            onChange={(e) => update('sourceId', e.target.value)}
            title="Quelle"
          >
            <option value="all">Alle Quellen</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {/* Sortierung */}
        <select
          style={SEL_STYLE}
          value={sort ?? 'score'}
          onChange={(e) => update('sort', e.target.value)}
          title="Sortierung"
        >
          <option value="score">Score ↓</option>
          <option value="date">Neueste zuerst</option>
          <option value="volume">Volumen ↓</option>
        </select>

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            style={{
              ...SEL_STYLE,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              color: 'var(--ink-3)', border: '1px solid var(--border)',
              background: 'transparent',
            }}
          >
            <X size={12} /> Zurücksetzen
          </button>
        )}
      </div>
    </div>
  )
}
