'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity } from 'lucide-react'
import { PassCard, type PassStatus, type PassLog } from './PassCard'

type RawEvent =
  | { type: 'pass_started'; pass: number }
  | { type: 'pass_complete'; pass: number; count: number }
  | { type: 'source_started'; source: string }
  | { type: 'source_complete'; source: string; count: number }
  | { type: 'lead_filtered'; title: string; reason: string }
  | { type: 'lead_scored'; title: string; score: number }
  | { type: 'lead_enriched'; title: string }
  | { type: 'error'; message: string }
  | { type: 'complete'; stats: { pass1Results: number; pass2Results: number; pass3Results: number } }
  | { type: 'done' }

interface PassState {
  status: PassStatus
  logs: PassLog[]
  count: number | null
  startMs: number | null
  durationMs: number | null
}

const INITIAL_PASS: PassState = {
  status: 'idle', logs: [], count: null, startMs: null, durationMs: null,
}

interface PipelineStreamProps {
  isRunning: boolean
  onComplete: (stats: { pass1Results: number; pass2Results: number; pass3Results: number }) => void
}

export function PipelineStream({ isRunning, onComplete }: PipelineStreamProps) {
  const [passes, setPasses] = useState<[PassState, PassState, PassState]>([
    { ...INITIAL_PASS }, { ...INITIAL_PASS }, { ...INITIAL_PASS },
  ])
  const [visible, setVisible] = useState(false)
  const currentPassRef = useRef<1 | 2 | 3>(1)

  function addLog(passIdx: number, log: PassLog) {
    setPasses((prev) => {
      const next = [...prev] as [PassState, PassState, PassState]
      next[passIdx] = { ...next[passIdx], logs: [...next[passIdx].logs, log] }
      return next
    })
  }

  function setPassStatus(passIdx: number, status: PassStatus, extras: Partial<PassState> = {}) {
    setPasses((prev) => {
      const next = [...prev] as [PassState, PassState, PassState]
      next[passIdx] = { ...next[passIdx], status, ...extras }
      return next
    })
  }

  useEffect(() => {
    if (!isRunning) return
    setVisible(true)
    currentPassRef.current = 1
    setPasses([{ ...INITIAL_PASS }, { ...INITIAL_PASS }, { ...INITIAL_PASS }])

    const eventSource = new EventSource('/api/pipeline/run')
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as RawEvent
      const now = Date.now()
      switch (data.type) {
        case 'pass_started': {
          const idx = data.pass - 1
          currentPassRef.current = data.pass as 1 | 2 | 3
          setPassStatus(idx, 'running', { startMs: now, logs: [], count: null, durationMs: null })
          break
        }
        case 'pass_complete': {
          const idx = data.pass - 1
          setPasses((prev) => {
            const next = [...prev] as [PassState, PassState, PassState]
            const startMs = next[idx].startMs
            next[idx] = { ...next[idx], status: 'complete', count: data.count, durationMs: startMs ? now - startMs : null }
            return next
          })
          break
        }
        case 'source_started':  addLog(0, { icon: 'search', text: data.source, ts: now }); break
        case 'source_complete': addLog(0, { icon: 'check',  text: `${data.source}: ${data.count} Treffer`, ts: now }); break
        case 'lead_filtered':   addLog(0, { icon: 'check',  text: data.title, ts: now }); break
        case 'lead_scored':     addLog(1, { icon: 'score',  text: `${data.title} — Score ${data.score}`, ts: now }); break
        case 'lead_enriched':   addLog(2, { icon: 'enrich', text: data.title, ts: now }); break
        case 'error': {
          const idx = (currentPassRef.current - 1) as 0 | 1 | 2
          addLog(idx, { icon: 'error', text: data.message, ts: now })
          setPassStatus(idx, 'error')
          break
        }
        case 'complete': onComplete(data.stats); break
        case 'done':     eventSource.close(); break
      }
    }
    eventSource.onerror = () => {
      const idx = (currentPassRef.current - 1) as 0 | 1 | 2
      setPassStatus(idx, 'error')
      eventSource.close()
    }
    return () => eventSource.close()
  }, [isRunning, onComplete])

  if (!visible) return null

  const anyRunning = passes.some((p) => p.status === 'running')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginTop: 40 }}
      >
        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{
            display: 'grid', placeItems: 'center', width: 30, height: 30,
            borderRadius: 9, background: 'var(--navy)', color: 'var(--gold)',
          }}>
            <Activity size={16} />
          </span>
          <h2 style={{
            fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13,
            letterSpacing: '.13em', textTransform: 'uppercase' as const,
            color: 'var(--navy)', margin: 0,
          }}>
            Pipeline Live-Stream
          </h2>
          {anyRunning ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
              padding: '5px 11px', borderRadius: 999, border: '1px solid var(--gold)', color: 'var(--gold-600)', background: 'var(--card)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--gold)' }} className="pulse-ring" /> Live
            </span>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
              padding: '5px 11px', borderRadius: 999, border: '1px solid var(--border)', color: 'var(--ink-3)', background: 'var(--card)',
            }}>
              3 Pässe · idle
            </span>
          )}
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--gap-grid)' }}>
          <PassCard pass={1} name="Scan" description="Quellen durchsuchen"
            status={passes[0].status} logs={passes[0].logs} count={passes[0].count} durationMs={passes[0].durationMs} />
          <PassCard pass={2} name="Match" description="Leads bewerten und filtern"
            status={passes[1].status} logs={passes[1].logs} count={passes[1].count} durationMs={passes[1].durationMs} />
          <PassCard pass={3} name="Connect" description="Kontakte recherchieren"
            status={passes[2].status} logs={passes[2].logs} count={passes[2].count} durationMs={passes[2].durationMs} />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
