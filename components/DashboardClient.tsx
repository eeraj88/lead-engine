'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PipelineStream } from '@/components/PipelineStream'
import { SourcesPanel } from '@/components/SourcesPanel'
import {
  Zap, ChevronRight, Database, Flame, Bookmark, BarChart3, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import type { SourceKpi } from '@/app/page'

interface DashboardStats {
  hotCount: number
  warmCount: number
  currentLeadsCount: number  // hot + warm + cold
  bookmarkedCount: number    // bookmarked = true (post migration) or status = 'qualified'
  sourceCount: number
  lastRunLabel: string
  pass1Count?: number
  pass2Count?: number
  pass3Count?: number
}

interface DashboardClientProps {
  initialStats: DashboardStats
  sourceKpis?: SourceKpi[]
}

export function DashboardClient({ initialStats, sourceKpis = [] }: DashboardClientProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [isSourcesPanelOpen, setIsSourcesPanelOpen] = useState(false)
  const [runStats, setRunStats] = useState({
    pass1Results: initialStats.pass1Count ?? 0,
    pass2Results: initialStats.pass2Count ?? 0,
    pass3Results: initialStats.pass3Count ?? 0,
  })

  // Close panel on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSourcesPanelOpen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const handleRun = () => setIsRunning(true)
  const handleComplete = (newStats: { pass1Results: number; pass2Results: number; pass3Results: number }) => {
    setRunStats(newStats)
    setIsRunning(false)
  }

  const funnelMax = Math.max(runStats.pass1Results, 1)

  const kpis = [
    { label: 'Aktuelle Leads', value: initialStats.currentLeadsCount, sub: 'HOT + WARM + COLD gesamt', icon: TrendingUp },
    { label: 'HOT-Leads',      value: initialStats.hotCount,          sub: 'Sofortiger Outreach',      icon: Flame },
    { label: 'Markierte',      value: initialStats.bookmarkedCount,   sub: 'Gespeichert zum Nachfassen', icon: Bookmark },
    { label: 'Aktive Quellen', value: initialStats.sourceCount,       sub: '32 Sektoren abgedeckt',    icon: Database },
  ]

  return (
    <div style={{ padding: '34px 40px 64px', maxWidth: 1640 }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

        {/* ── HERO ── */}
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 18, color: '#fff',
          background: 'radial-gradient(120% 120% at 88% -30%, #353fb0 0%, rgba(53,63,176,0) 52%), linear-gradient(135deg, #1d2378 0%, #161b63 60%, #12164f 100%)',
          padding: '40px 44px',
          boxShadow: '0 22px 48px -22px rgba(26,31,110,.55)',
        }}>
          {/* Grid lines overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
            WebkitMaskImage: 'radial-gradient(130% 100% at 80% 0%, #000 25%, transparent 78%)',
            maskImage: 'radial-gradient(130% 100% at 80% 0%, #000 25%, transparent 78%)',
          }} />
          {/* Gold glow */}
          <div style={{
            position: 'absolute', right: -60, top: -90, width: 320, height: 320,
            borderRadius: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(217,181,0,.22) 0%, rgba(217,181,0,0) 68%)',
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left: copy */}
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 11.5, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'var(--gold)' }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--gold)', boxShadow: '0 0 0 4px rgba(217,181,0,.22)', flexShrink: 0 }} />
                RAYLEAD Engine
              </span>
              <h1 style={{ fontFamily: 'var(--font-head)', color: '#fff', fontSize: 42, lineHeight: 1.06, letterSpacing: '-0.03em', margin: '18px 0 0', maxWidth: '18ch' }}>
                Finde Leads<br /><span style={{ color: 'var(--gold)' }}>auf Knopfdruck.</span>
              </h1>
              <p style={{ marginTop: 14, fontSize: 15, color: 'rgba(255,255,255,.72)', maxWidth: '46ch', lineHeight: 1.55 }}>
                Bauprojekte automatisch erkennen, qualifizieren und ansprechen.
              </p>
              <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,.45)', maxWidth: '46ch', lineHeight: 1.5 }}>
                Letzter Lauf: <strong style={{ color: 'rgba(255,255,255,.7)' }}>{initialStats.lastRunLabel}</strong>
                {runStats.pass1Results > 0 && (
                  <> · <strong style={{ color: 'rgba(255,255,255,.7)' }}>{runStats.pass1Results}</strong> gescannt → <strong style={{ color: 'rgba(255,255,255,.7)' }}>{runStats.pass2Results}</strong> bewertet → <strong style={{ color: 'rgba(255,255,255,.7)' }}>{runStats.pass3Results}</strong> angereichert</>
                )}
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  style={{
                    fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 8,
                    borderRadius: 'var(--r-sm)', fontSize: 14.5, fontWeight: 600, padding: '12px 22px',
                    cursor: isRunning ? 'not-allowed' : 'pointer', border: '1px solid transparent',
                    background: 'var(--gold)', color: 'var(--navy)',
                    boxShadow: '0 2px 8px rgba(217,181,0,.3)',
                    opacity: isRunning ? 0.6 : 1,
                    transition: 'background .16s',
                  }}
                >
                  <Zap size={17} className={isRunning ? 'spin' : ''} />
                  {isRunning ? 'Pipeline läuft…' : 'Pipeline starten'}
                </button>
                <button
                  onClick={() => setIsSourcesPanelOpen(true)}
                  style={{
                    fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 8,
                    borderRadius: 'var(--r-sm)', fontSize: 14.5, fontWeight: 600, padding: '12px 20px',
                    background: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.22)',
                    cursor: 'pointer', transition: 'background .16s, border .16s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,.12)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,.08)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,.22)'
                  }}
                >
                  <BarChart3 size={17} />
                  Quellen-Performance
                </button>
                <Link
                  href="/leads"
                  style={{
                    fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 8,
                    borderRadius: 'var(--r-sm)', fontSize: 14.5, fontWeight: 600, padding: '12px 20px',
                    background: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.22)',
                    textDecoration: 'none', transition: 'background .16s',
                  }}
                >
                  Alle Leads <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Right: funnel panel */}
            <div style={{
              flexBasis: 320, minWidth: 280,
              background: 'rgba(255,255,255,.055)',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 14, padding: '22px 22px 24px',
            }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.62)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Letzter Lauf</span>
                {runStats.pass3Results > 0 && (
                  <span style={{ color: '#7ee2a6', textTransform: 'none' as const, letterSpacing: 0 }}>✓ completed</span>
                )}
              </div>
              {[
                { label: 'Scan',    val: runStats.pass1Results },
                { label: 'Match',   val: runStats.pass2Results },
                { label: 'Connect', val: runStats.pass3Results },
              ].map((p) => (
                <div key={p.label} style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.8)', fontWeight: 500 }}>{p.label}</span>
                    <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 17, color: '#fff' }}>{p.val}</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 99, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
                    <div className="funnel-fill" style={{ width: `${(p.val / funnelMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
          marginTop: 22,
        }}>
          {kpis.map((k, i) => {
            const Icon = k.icon
            return (
              <div
                key={k.label}
                style={{
                  position: 'relative', padding: '26px 28px',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--border)',
                  cursor: 'default',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: 'var(--ink-2)' }}>
                    {k.label}
                  </span>
                  <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, background: 'var(--page)', color: 'var(--ink-3)' }}>
                    <Icon size={16} />
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 40, lineHeight: 1, marginTop: 16, color: 'var(--ink)', letterSpacing: '-.02em' }}>
                  {k.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 9 }}>{k.sub}</div>
              </div>
            )
          })}
        </div>

        {/* ── Pipeline Stream ── */}
        <PipelineStream isRunning={isRunning} onComplete={handleComplete} />

        {/* Slide-In Panel */}
        <SourcesPanel
          isOpen={isSourcesPanelOpen}
          onClose={() => setIsSourcesPanelOpen(false)}
          sourceKpis={sourceKpis}
        />
      </motion.div>
    </div>
  )
}

