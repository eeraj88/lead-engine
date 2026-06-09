import { getFinalScore, getLeadClass, formatVolume } from '@/lib/lead-utils'
import { createServerClient } from '@/lib/supabase/server'
import { BookmarkButton } from '@/components/BookmarkButton'
import {
  ArrowLeft, ArrowRight, Building2, Calendar, Clock, ExternalLink,
  FileText, GitBranch, Landmark, Link2, MapPin, Target, TrendingUp, User,
} from 'lucide-react'
import Link from 'next/link'

const TIER_BADGE: Record<string, { bg: string; color: string }> = {
  hot:  { bg: 'var(--gold)',  color: 'var(--navy)' },
  warm: { bg: 'var(--warm)', color: '#fff' },
  cold: { bg: 'var(--cold)', color: '#fff' },
  not:  { bg: '#9ca3af',     color: '#fff' },
}

const LEVER_COLOR: Record<string, string> = {
  direct:   'var(--navy)',
  opener:   'var(--gold-600)',
  indirect: 'var(--ink-3)',
}

const BREAKDOWN_MAX: Record<string, number> = {
  recency:    25,
  volume:     25,
  phase:      20,
  persona:    15,
  complexity: 15,
}

const BREAKDOWN_LABEL: Record<string, string> = {
  recency:    'Aktualität',
  volume:     'Volumen',
  phase:      'Phase',
  persona:    'Persona',
  complexity: 'Komplexität',
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient() as any

  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single()

  const { data: openerLead } = lead?.opener_lead_id
    ? await supabase.from('leads').select('id,title,hebel_type,lead_class,final_score,score').eq('id', lead.opener_lead_id).single()
    : { data: null }

  const { data: derivedLeads } = await supabase
    .from('leads')
    .select('id,title,hebel_type,lead_class,final_score,score,bauherr_name,created_at')
    .eq('opener_lead_id', id)
    .order('created_at', { ascending: false })

  if (!lead) {
    return (
      <div style={{ padding: '48px 40px' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 24, marginBottom: 16 }}>Lead nicht gefunden</h1>
        <Link href="/leads" style={{ color: 'var(--navy)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <ArrowLeft size={16} /> Zurück zur Liste
        </Link>
      </div>
    )
  }

  const finalScore = getFinalScore(lead)
  const leadClass  = getLeadClass(lead, finalScore)
  const tierStyle  = TIER_BADGE[leadClass] ?? TIER_BADGE.not
  const hebelType  = lead.hebel_type ?? 'indirect'
  const scoreBreakdown = lead.score_breakdown ?? lead.pass_2_data?.rawAIResponse?.score_breakdown
  const decisionMakers = Array.isArray(lead.decision_makers) ? lead.decision_makers : []

  // Volume: AI often stores in millions (36.3 = 36.3 Mio €), not full EUR
  const volumeRaw = lead.project_value_estimate ?? lead.project_value
  const volume = formatVolume(volumeRaw ? Number(volumeRaw) : null)

  // Project date: age label
  const projectDate = lead.project_date ? new Date(lead.project_date) : null
  const ageLabel = projectDate ? relativeAge(projectDate) : null

  // Description: clip to 400 chars
  const descFull = lead.description ?? ''
  const descClipped = descFull.length > 400 ? descFull.slice(0, 400) + ' …' : descFull

  return (
    <div style={{ padding: '28px 40px 64px', maxWidth: 1400 }}>

      {/* Back */}
      <Link href="/leads" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none', marginBottom: 20,
        fontWeight: 600,
      }}>
        <ArrowLeft size={15} /> Zurück zur Liste
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── HERO CARD ── */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderLeft: `5px solid ${tierStyle.bg}`,
            borderRadius: 'var(--r-card)', boxShadow: 'var(--shadow-sm)',
            padding: 28,
          }}>
            {/* Badges row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-head)', fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
                padding: '4px 10px', borderRadius: 6, background: tierStyle.bg, color: tierStyle.color,
              }}>{leadClass.toUpperCase()}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
                padding: '3px 9px', borderRadius: 6,
                border: `1.5px solid ${LEVER_COLOR[hebelType]}`, color: LEVER_COLOR[hebelType],
              }}>{hebelType.toUpperCase()}</span>
              {lead.persona && lead.persona !== 'unknown' && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                  border: '1.5px solid var(--border)', color: 'var(--ink-2)',
                }}>{formatPersona(lead.persona)}</span>
              )}
              {lead.data_quality === 'verified' && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                  background: 'rgba(34,197,94,.1)', color: '#15803d', border: '1.5px solid rgba(34,197,94,.3)',
                }}>✓ verified</span>
              )}
              {(lead.source_kind === 'ted' || lead.source_kind === 'procurement_open_data') && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                  background: 'rgba(26,31,110,.08)', color: 'var(--navy)',
                  border: '1.5px solid rgba(26,31,110,.25)',
                }}>
                  {lead.source_kind === 'ted' ? '📋 TED Europa' : '📋 Open-Data'}
                </span>
              )}
              {lead.sales_window === 'closing_soon' && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                  background: 'rgba(217,181,0,.15)', color: 'var(--gold-600)',
                  border: '1.5px solid rgba(217,181,0,.4)',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  <Clock size={12} /> Frist läuft ab
                </span>
              )}
              {lead.sales_window === 'open' && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                  background: 'rgba(34,197,94,.1)', color: '#15803d',
                  border: '1.5px solid rgba(34,197,94,.3)',
                }}>✓ Frist offen</span>
              )}
              {lead.source_url && (
                <a href={lead.source_url} target="_blank" rel="noopener noreferrer" style={{
                  marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, color: 'var(--navy)', fontWeight: 600, textDecoration: 'none',
                }}>
                  <ExternalLink size={13} /> Zur Quelle
                </a>
              )}
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 24,
              lineHeight: 1.25, color: 'var(--ink)', margin: '0 0 20px',
            }}>
              {lead.title}
            </h1>

            {/* WHO / WHEN / WHAT / WHERE — 2×2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <InfoBlock icon={<Building2 size={15} />} label="WER (Auftraggeber)">
                {lead.bauherr_name ?? lead.buyer_name ?? lead.company_name ?? lead.architekt_name ?? '—'}
              </InfoBlock>
              <InfoBlock icon={<Calendar size={15} />} label="WANN (Projektdatum)">
                {projectDate ? (
                  <>
                    {projectDate.toLocaleDateString('de-DE')}
                    {ageLabel && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--ink-3)' }}>({ageLabel})</span>}
                  </>
                ) : '—'}
              </InfoBlock>
              <InfoBlock icon={<MapPin size={15} />} label="WO">
                {lead.location ?? lead.buyer_city ?? '—'}
              </InfoBlock>
              <InfoBlock icon={<Landmark size={15} />} label="VOLUMEN">
                {volume ?? '—'}
              </InfoBlock>
            </div>

            {/* Phase + Category inline */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              {lead.project_phase && (
                <span style={{
                  fontSize: 12.5, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                  background: 'var(--navy)', color: '#fff',
                }}>
                  Phase: {lead.project_phase}
                </span>
              )}
              {lead.project_category && (
                <span style={{
                  fontSize: 12.5, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                  background: 'var(--page)', border: '1px solid var(--border)', color: 'var(--ink-2)',
                }}>
                  {lead.project_category}
                </span>
              )}
              {lead.project_type && (
                <span style={{
                  fontSize: 12.5, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                  background: 'var(--page)', border: '1px solid var(--border)', color: 'var(--ink-2)',
                }}>
                  {lead.project_type}
                </span>
              )}
            </div>

            {/* Description — clipped */}
            {descClipped && (
              <div style={{
                padding: '12px 16px', borderRadius: 8,
                background: 'var(--page)', border: '1px solid var(--border)',
                fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)',
              }}>
                {descClipped}
              </div>
            )}
          </div>

          {/* ── VERGABE-DATEN (nur TED / Open-Data) ── */}
          {(lead.source_kind === 'ted' || lead.source_kind === 'procurement_open_data') && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderLeft: '4px solid var(--navy)',
              borderRadius: 'var(--r-card)', padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>
                <FileText size={16} />
                Vergabe-Daten
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {lead.notice_type && (
                  <VergabeRow label="Bekanntmachungstyp">{formatNoticeType(lead.notice_type)}</VergabeRow>
                )}
                {lead.procurement_stage && (
                  <VergabeRow label="Vergabe-Phase">{formatProcurementStage(lead.procurement_stage)}</VergabeRow>
                )}
                {lead.deadline && (
                  <VergabeRow label="Abgabefrist">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} style={{ color: deadlineColor(lead.deadline) }} />
                      <span style={{ color: deadlineColor(lead.deadline), fontWeight: 700 }}>
                        {new Date(lead.deadline).toLocaleDateString('de-DE')}
                      </span>
                    </span>
                  </VergabeRow>
                )}
                {lead.sales_window && lead.sales_window !== 'too_late' && (
                  <VergabeRow label="Sales-Fenster">
                    <SalesWindowBadge window={lead.sales_window} />
                  </VergabeRow>
                )}
                {lead.buyer_name && (
                  <VergabeRow label="Auftraggeber">{lead.buyer_name}</VergabeRow>
                )}
                {lead.buyer_city && (
                  <VergabeRow label="Ort">{lead.buyer_city}</VergabeRow>
                )}
                {lead.estimated_value && (
                  <VergabeRow label="Geschätzter Wert">
                    {Number(lead.estimated_value).toLocaleString('de-DE')} EUR
                  </VergabeRow>
                )}
                {lead.external_notice_id && (
                  <VergabeRow label="Notice-ID">
                    <a
                      href={`https://ted.europa.eu/de/notice/-/detail/${lead.external_notice_id}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--navy)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      {lead.external_notice_id} <ExternalLink size={11} />
                    </a>
                  </VergabeRow>
                )}
              </div>
              {/* CPV Codes */}
              {Array.isArray(lead.cpv_codes) && lead.cpv_codes.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.07em', marginBottom: 8 }}>CPV-CODES</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(lead.cpv_codes as string[]).map((cpv: string) => (
                      <span key={cpv} style={{
                        fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 5,
                        background: 'var(--page)', border: '1px solid var(--border)', color: 'var(--ink-2)',
                      }}>
                        {cpv}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Dokument-Link */}
              {lead.documents_url && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <a
                    href={lead.documents_url}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8,
                      border: '1.5px solid var(--navy)', color: 'var(--navy)',
                      fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    }}
                  >
                    <FileText size={14} /> Ausschreibungsunterlagen
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── SALES STRATEGIE ── */}
          {lead.sales_strategy && (
            <div style={{
              background: 'var(--gold-soft)', border: '1.5px solid rgba(217,181,0,.35)',
              borderRadius: 'var(--r-card)', padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>
                <Target size={16} style={{ color: 'var(--gold-600)' }} />
                Sales-Strategie
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink)', margin: 0 }}>
                {lead.sales_strategy}
              </p>
            </div>
          )}

          {/* ── SCORE BREAKDOWN ── */}
          {scoreBreakdown && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-card)', padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>
                <TrendingUp size={16} />
                Score-Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(scoreBreakdown).map(([key, val]) => {
                  const max = BREAKDOWN_MAX[key] ?? 25
                  const v = Number(val)
                  const pct = Math.round((v / max) * 100)
                  const barColor = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--gold-600)' : 'var(--cold)'
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>
                          {BREAKDOWN_LABEL[key] ?? key}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                          {v} / {max}
                        </span>
                      </div>
                      <div style={{ height: 7, borderRadius: 99, background: 'var(--border)' }}>
                        <div style={{
                          height: 7, borderRadius: 99, width: `${pct}%`,
                          background: barColor, transition: 'width .5s ease',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              {lead.score_reasoning && (
                <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  {lead.score_reasoning}
                </p>
              )}
            </div>
          )}

          {/* ── DECISION MAKERS ── */}
          {decisionMakers.length > 0 && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-card)', padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>
                <User size={16} /> Kontakte
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {decisionMakers.map((c: any, i: number) => (
                  <div key={i} style={{
                    padding: '12px 16px', borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--page)',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{c.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3 }}>{c.role} · {c.company}</div>
                    {c.email && <div style={{ fontSize: 12, color: 'var(--navy)', marginTop: 5 }}>{c.email}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Score Box */}
          <div style={{
            background: 'var(--navy)', borderRadius: 'var(--r-card)',
            padding: '24px 20px', textAlign: 'center', color: '#fff',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(255,255,255,.55)', marginBottom: 6 }}>
              MATCH-SCORE
            </div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 56, fontWeight: 800, lineHeight: 1, color: scoreColor(finalScore) }}>
              {finalScore}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>von 100 Punkten</div>
            <div style={{
              marginTop: 14, display: 'inline-block',
              fontSize: 12, fontWeight: 700, letterSpacing: '.05em',
              padding: '5px 16px', borderRadius: 999,
              background: tierStyle.bg, color: tierStyle.color,
            }}>
              {leadClass.toUpperCase()}
            </div>
            {/* Bookmark */}
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
              <BookmarkButton leadId={lead.id} initialBookmarked={lead.bookmarked === true} size="md" />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>
                Nachfassen
              </span>
            </div>
          </div>

          {/* Linked leads (opener / derived) */}
          {openerLead && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)', padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>
                <Link2 size={13} /> Aus OPENER-Lead
              </div>
              <Link href={`/leads/${openerLead.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--page)', textDecoration: 'none', gap: 8,
              }}>
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4, flex: 1 }}>{openerLead.title}</span>
                <ArrowRight size={14} style={{ color: 'var(--navy)', flexShrink: 0 }} />
              </Link>
            </div>
          )}

          {derivedLeads && derivedLeads.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)', padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>
                <GitBranch size={13} /> DIRECT-Leads ({derivedLeads.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {derivedLeads.map((d: any) => (
                  <Link key={d.id} href={`/leads/${d.id}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--page)', textDecoration: 'none', gap: 8,
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4, flex: 1 }}>{d.title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{d.final_score ?? d.score ?? '–'}</span>
                      <ArrowRight size={13} style={{ color: 'var(--ink-3)' }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)', padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.08em', marginBottom: 12 }}>METADATEN</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <MetaRow label="Gefunden am">{new Date(lead.created_at).toLocaleString('de-DE')}</MetaRow>
              {lead.project_date && <MetaRow label="Projektdatum">{new Date(lead.project_date).toLocaleDateString('de-DE')}</MetaRow>}
              {lead.source_id && <MetaRow label="Quelle">{lead.source_id.slice(0, 8)}…</MetaRow>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 10,
      border: '1px solid var(--border)', background: 'var(--page)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', color: 'var(--ink-3)', marginBottom: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35 }}>
        {children}
      </div>
    </div>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
      <span style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ color: 'var(--ink-2)', fontWeight: 600, textAlign: 'right' }}>{children}</span>
    </div>
  )
}

function formatPersona(p: string): string {
  const MAP: Record<string, string> = {
    bauherr_public: 'Bauherr öffentl.',
    bauherr_private: 'Bauherr privat',
    gu: 'Generalunternehmer',
    projektsteuerer: 'Projektsteuerer',
    planer: 'Planer',
  }
  return MAP[p] ?? p.replaceAll('_', ' ')
}

function scoreColor(s: number): string {
  if (s >= 75) return '#4ade80'
  if (s >= 50) return 'var(--gold)'
  return '#f87171'
}

function relativeAge(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 30) return `${diffDays}d alt`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 18) return `${diffMonths} Monate alt`
  return `${Math.floor(diffMonths / 12)} Jahre alt`
}

function VergabeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.07em' }}>
        {label.toUpperCase()}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{children}</span>
    </div>
  )
}

function SalesWindowBadge({ window }: { window: string }) {
  if (window === 'open') return (
    <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      ✓ Offen
    </span>
  )
  if (window === 'closing_soon') return (
    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-600)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Clock size={13} /> Läuft bald ab
    </span>
  )
  return <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Unbekannt</span>
}

function deadlineColor(deadline: string): string {
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return '#9ca3af'
  if (daysLeft <= 14) return 'var(--gold-600)'
  return '#15803d'
}

function formatNoticeType(type: string): string {
  const MAP: Record<string, string> = {
    prior_information: 'Vorinformation',
    market_exploration: 'Markterkundung',
    competition: 'Wettbewerb',
    contract_notice: 'Ausschreibung',
    award: 'Zuschlag',
    result: 'Ergebnis',
    unknown: 'Unbekannt',
  }
  return MAP[type] ?? type.replaceAll('_', ' ')
}

function formatProcurementStage(stage: string): string {
  const MAP: Record<string, string> = {
    prior_information: 'Vorinformation',
    market_exploration: 'Markterkundung',
    competition: 'Wettbewerb',
    tender: 'Ausschreibung',
    planning_procurement: 'Planungsvergabe',
    award: 'Vergeben',
    execution: 'Ausführung',
    unknown: 'Unbekannt',
  }
  return MAP[stage] ?? stage.replaceAll('_', ' ')
}
