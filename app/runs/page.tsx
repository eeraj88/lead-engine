import { createServerClient } from '@/lib/supabase/server'
import { CheckCircle, XCircle, Loader2, ChevronRight, Zap } from 'lucide-react'

const RUN_META = {
  completed: { stripe: 'var(--success)', icon: CheckCircle, color: 'var(--success)', bg: 'var(--success-bg)', text: '#15803d', label: 'completed' },
  failed:    { stripe: 'var(--error)',   icon: XCircle,     color: 'var(--error)',   bg: 'var(--error-bg)',   text: '#b91c1c', label: 'failed' },
  running:   { stripe: 'var(--running)', icon: Loader2,     color: 'var(--running)', bg: '#eef4fe',           text: '#1e54b7', label: 'running' },
}

export default async function RunsPage() {
  const supabase = await createServerClient() as any
  const { data: runs } = await supabase
    .from('pipeline_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20)

  return (
    <div style={{ padding: '34px 40px 64px', maxWidth: 1640 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 30, lineHeight: 1.1, color: 'var(--ink)', margin: 0 }}>
            Pipeline Runs
          </h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 14.5, marginTop: 7 }}>
            Historie der letzten {(runs ?? []).length} Ausführungen
          </p>
        </div>
      </div>

      {!runs || runs.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'var(--card)', border: '1px dashed var(--border)', borderRadius: 'var(--r-card)',
          padding: 64,
        }}>
          <Zap size={40} style={{ color: 'var(--border-strong)', marginBottom: 16 }} />
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: 18, color: 'var(--ink-2)', marginBottom: 8 }}>
            Pipeline noch nicht ausgeführt
          </h3>
          <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>Starte die Pipeline vom Dashboard aus.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-grid)' }}>
          {runs.map((run: any, i: number) => {
            const status = run.status as keyof typeof RUN_META
            const m = RUN_META[status] ?? RUN_META.running
            const Icon = m.icon
            const dur = run.duration_seconds ? `${run.duration_seconds}s` : null
            return (
              <div
                key={run.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${m.stripe}`,
                  borderRadius: 'var(--r-card)',
                  boxShadow: 'var(--shadow-sm)',
                  padding: '16px 22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 24,
                }}
              >
                {/* Left: status + date */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, minWidth: 0 }}>
                  <Icon
                    size={19}
                    style={{ color: m.color, marginTop: 2, flexShrink: 0 }}
                    className={status === 'running' ? 'spin' : ''}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, letterSpacing: '.03em',
                        padding: '3px 10px', borderRadius: 999,
                        background: m.bg, color: m.text,
                      }}>
                        {m.label}
                      </span>
                      {i === 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                          background: 'var(--gold-soft)', color: 'var(--gold-600)',
                          border: '1px solid var(--gold)',
                        }}>
                          Letzter Run
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginTop: 7 }}>
                      {new Date(run.started_at).toLocaleString('de-DE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                    {run.error_log?.error && (
                      <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>
                        {run.error_log.error}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: pass flow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {[
                    { label: 'Scan',    val: run.pass_1_results },
                    { label: 'Match',   val: run.pass_2_results },
                    { label: 'Connect', val: run.pass_3_results },
                  ].map((c, j) => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ textAlign: 'center', minWidth: 52 }}>
                        <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600 }}>{c.label}</div>
                        <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, color: 'var(--navy)', lineHeight: 1.2 }}>
                          {c.val ?? '–'}
                        </div>
                      </div>
                      {j < 2 && <ChevronRight size={16} style={{ color: 'var(--border-strong)' }} />}
                    </div>
                  ))}
                  <div style={{ width: 1, height: 34, background: 'var(--border)', margin: '0 14px' }} />
                  <div style={{ textAlign: 'right', minWidth: 56 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600 }}>Dauer</div>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, color: 'var(--ink-2)', lineHeight: 1.3 }}>
                      {dur ?? '—'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
