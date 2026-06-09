'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, CheckCircle2, BarChart2, Link2, AlertCircle,
  CheckCircle, XCircle, Loader2, Clock,
} from 'lucide-react'
import {
  isTerminalAtBottom,
  terminalScrollTarget,
} from './pass-card-scroll'

export type PassStatus = 'idle' | 'running' | 'complete' | 'error'

export interface PassLog {
  icon: 'search' | 'check' | 'score' | 'enrich' | 'error'
  text: string
  ts: number
}

interface PassCardProps {
  pass: 1 | 2 | 3
  name: string
  description: string
  status: PassStatus
  logs: PassLog[]
  count: number | null
  durationMs: number | null
}

const LOG_ICON = {
  search: { Comp: Search,       color: '#7c8aa5' },
  check:  { Comp: CheckCircle2, color: '#4ade80' },
  score:  { Comp: BarChart2,    color: '#60a5fa' },
  enrich: { Comp: Link2,        color: '#c084fc' },
  error:  { Comp: AlertCircle,  color: '#f87171' },
}

const STATUS_STRIPE: Record<PassStatus, string> = {
  idle:     'var(--cold)',
  running:  'var(--gold)',
  complete: 'var(--success)',
  error:    'var(--error)',
}

function PassStatusIcon({ status }: { status: PassStatus }) {
  if (status === 'running')  return <Loader2 size={18} className="spin" style={{ color: 'var(--gold-600)' }} />
  if (status === 'complete') return <CheckCircle size={18} style={{ color: 'var(--success)' }} />
  if (status === 'error')    return <XCircle size={18} style={{ color: 'var(--error)' }} />
  return <span style={{ width: 11, height: 11, borderRadius: 99, border: '2px solid var(--border-strong)', display: 'inline-block' }} />
}

function LogLine({ log }: { log: PassLog }) {
  const meta = LOG_ICON[log.icon] || LOG_ICON.search
  const Comp = meta.Comp
  const timestamp = new Date(log.ts).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      style={{ display: 'flex', gap: 8, padding: '3px 0', alignItems: 'flex-start' }}
    >
      <span style={{ flexShrink: 0, marginTop: 2 }}>
        <Comp size={13} style={{ color: meta.color }} />
      </span>
      <span style={{
        flexShrink: 0,
        color: '#64748b',
        fontSize: 11,
        lineHeight: 1.5,
        fontFamily: 'var(--font-mono)',
      }}>
        [{timestamp}]
      </span>
      <span style={{
        color: log.icon === 'error' ? '#fca5a5' : '#cbd5e1',
        lineHeight: 1.5,
        fontSize: 13,
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
      }}>
        {log.text}
      </span>
    </motion.div>
  )
}

export function PassCard({ pass, name, description, status, logs, count, durationMs }: PassCardProps) {
  const logRef = useRef<HTMLDivElement>(null)
  const previousLogCountRef = useRef(logs.length)
  const [autoScroll, setAutoScroll] = useState(true)
  const [newLogCount, setNewLogCount] = useState(0)

  const numBg = status === 'complete'
    ? 'var(--navy)' : status === 'running'
    ? 'var(--gold)' : 'var(--page)'
  const numColor = status === 'complete'
    ? 'var(--gold)' : status === 'running'
    ? 'var(--navy)' : 'var(--ink-3)'

  useEffect(() => {
    const addedLogs = Math.max(0, logs.length - previousLogCountRef.current)
    previousLogCountRef.current = logs.length

    if (logs.length === 0) {
      setAutoScroll(true)
      setNewLogCount(0)
      return
    }

    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = terminalScrollTarget()
      setNewLogCount(0)
    } else if (addedLogs > 0) {
      setNewLogCount((current) => current + addedLogs)
    }
  }, [logs.length, autoScroll])

  function handleScroll() {
    if (!logRef.current) return
    const atBottom = isTerminalAtBottom(logRef.current.scrollTop)
    setAutoScroll(atBottom)
    if (atBottom) setNewLogCount(0)
  }

  function scrollToLatest() {
    if (!logRef.current) return
    logRef.current.scrollTop = terminalScrollTarget()
    setAutoScroll(true)
    setNewLogCount(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (pass - 1) * 0.08 }}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${STATUS_STRIPE[status]}`,
        borderRadius: 'var(--r-card)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-left-color .3s',
      }}
    >
      {/* Header */}
      <div style={{ padding: '17px 19px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{
            flexShrink: 0, display: 'grid', placeItems: 'center',
            width: 30, height: 30, borderRadius: 9,
            fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13,
            background: numBg, color: numColor,
            transition: 'all .3s',
          }}>
            {pass}
          </span>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16.5, lineHeight: 1.1, color: 'var(--ink)' }}>
              {name}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500, marginTop: 4 }}>
              {description}
            </div>
          </div>
        </div>
        <PassStatusIcon status={status} />
      </div>

      {/* Dark console */}
      <div
        ref={logRef}
        onScroll={handleScroll}
        className="console-scroll"
        style={{
          margin: '0 14px',
          borderRadius: 10,
          background: 'var(--console-bg)',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          lineHeight: 1.5,
          padding: '13px 15px',
          height: 240,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column-reverse',
          flex: '0 0 240px',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.04)',
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: 'var(--console-dim)', fontStyle: 'italic', display: 'flex', gap: 8, alignItems: 'center', fontSize: 11.5 }}>
            <Clock size={13} style={{ flexShrink: 0 }} />
            {status === 'idle' ? 'Wartet auf vorherigen Pass…' : 'Startet…'}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {[...logs].reverse().map((log, i) => (
              <LogLine key={`${log.ts}-${logs.length - i}`} log={log} />
            ))}
          </AnimatePresence>
        )}
        {status === 'running' && (
          <span style={{ color: 'var(--gold)' }} className="cursor-blink">▋</span>
        )}
      </div>

      {newLogCount > 0 && (
        <button
          type="button"
          onClick={scrollToLatest}
          style={{
            alignSelf: 'center',
            zIndex: 1,
            marginTop: -38,
            marginBottom: 10,
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 999,
            background: 'var(--navy)',
            color: 'white',
            padding: '6px 11px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(0,0,0,.28)',
          }}
        >
          ↓ {newLogCount} neue {newLogCount === 1 ? 'Zeile' : 'Zeilen'}
        </button>
      )}

      {/* Footer */}
      <div style={{ padding: '12px 14px 14px' }}>
        <AnimatePresence>
          {status === 'complete' && count !== null ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12.5, fontWeight: 600,
                background: 'var(--success-bg)', color: '#15803d',
                padding: '9px 12px', borderRadius: 8, overflow: 'hidden',
              }}
            >
              <CheckCircle size={15} strokeWidth={2.6} />
              {count} {count === 1 ? 'Lead' : 'Leads'} gefunden
              {durationMs !== null && (
                <span style={{ color: '#4d9b6a', fontWeight: 500, marginLeft: 2 }}>
                  · in {(durationMs / 1000).toFixed(1)}s
                </span>
              )}
            </motion.div>
          ) : status === 'running' ? (
            <div key="running" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12.5, fontWeight: 600,
              background: 'var(--gold-soft)', color: 'var(--gold-600)',
              padding: '9px 12px', borderRadius: 8,
            }}>
              <Loader2 size={14} className="spin" /> Verarbeitung läuft…
            </div>
          ) : status === 'error' ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12.5, fontWeight: 600,
                background: 'var(--error-bg)', color: '#b91c1c',
                padding: '9px 12px', borderRadius: 8, overflow: 'hidden',
              }}
            >
              <AlertCircle size={14} /> Fehler in Pass {pass}
            </motion.div>
          ) : (
            <div key="idle" style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', padding: '9px 4px' }}>
              Noch nicht gestartet
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
