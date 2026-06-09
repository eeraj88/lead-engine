'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, Info } from 'lucide-react'
import type { SourceKpi } from '@/app/page'

interface SourcesPanelProps {
  isOpen: boolean
  onClose: () => void
  sourceKpis: SourceKpi[]
}

export function SourcesPanel({ isOpen, onClose, sourceKpis }: SourcesPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 480,
              background: 'var(--card)',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.2)',
              zIndex: 101,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid var(--border)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <TrendingUp size={18} style={{ color: 'var(--gold)' }} />
                  <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--ink)' }}>
                    Quellen-Performance
                  </h2>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                  Welche Quellen liefern die besten Leads? (Letzte 7 Tage)
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 36, height: 36, borderRadius: 99,
                  display: 'grid', placeItems: 'center',
                  background: 'var(--page)', border: '1px solid var(--border)',
                  color: 'var(--ink-2)', cursor: 'pointer',
                  transition: 'background .12s',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content (Table) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {sourceKpis.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
                  Keine Daten für die letzten 7 Tage verfügbar.
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 64px 64px 72px 64px',
                    padding: '12px 28px', borderBottom: '1px solid var(--border)',
                    fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                    textTransform: 'uppercase', color: 'var(--ink-3)',
                  }}>
                    <span>Quelle</span>
                    <span style={{ textAlign: 'right' }}>Total</span>
                    <span style={{ textAlign: 'right' }}>H+W</span>
                    <span style={{ textAlign: 'right' }}>Qualität</span>
                    <span style={{ textAlign: 'right' }}>Date</span>
                  </div>
                  {sourceKpis.map((k, i) => (
                    <div
                      key={k.sourceId}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 64px 64px 72px 64px',
                        padding: '14px 28px', alignItems: 'center',
                        borderBottom: i === sourceKpis.length - 1 ? 'none' : '1px solid var(--border)',
                        transition: 'background .12s',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {k.sourceName}
                          {k.sourceKind === 'ted' && (
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 3, background: 'var(--navy)', color: '#fff' }}>TED</span>
                          )}
                        </div>
                      </div>
                      <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{k.total}</span>
                      <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: k.quality > 0 ? '#16a34a' : 'var(--ink-3)' }}>{k.quality}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <div style={{ width: 32, height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${k.qualityRate}%`,
                            background: k.qualityRate >= 50 ? '#16a34a' : k.qualityRate >= 25 ? 'var(--gold)' : '#dc2626',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)' }}>{k.qualityRate}%</span>
                      </div>
                      <span style={{ textAlign: 'right', fontSize: 11, color: 'var(--ink-3)' }}>
                        {k.lastSeen ? new Date(k.lastSeen).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '—'}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer / Hint */}
            <div style={{
              padding: '20px 28px',
              background: 'var(--page)',
              borderTop: '1px solid var(--border)',
            }}>
              <div style={{
                display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10,
                background: 'rgba(217,181,0,0.08)', border: '1px solid rgba(217,181,0,0.2)',
              }}>
                <Info size={16} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                  <strong>Hinweis:</strong> Qualität zeigt nur Leads mit Score ≥ 60. Quellen mit niedrigerer Qualität tauchen seltener auf.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
