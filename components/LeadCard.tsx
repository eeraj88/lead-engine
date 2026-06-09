'use client'

import { BauherrnLookupButton } from '@/components/BauherrnLookupButton'
import { BookmarkButton } from '@/components/BookmarkButton'
import { cn } from '@/lib/utils'
import { Building2, ExternalLink, MapPin, Landmark, Calendar, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { type LeadClass, getFinalScore, getLeadClass, formatVolume } from '@/lib/lead-utils'
export { getFinalScore, getLeadClass }

type HebelType = 'direct' | 'opener' | 'indirect'

interface LeadCardProps {
  lead: any
}

const TIER_STRIPE: Record<LeadClass, string> = {
  hot:  'var(--gold)',
  warm: 'var(--warm)',
  cold: 'var(--cold)',
  not:  '#9ca3af',
}

const TIER_BADGE: Record<LeadClass, { bg: string; color: string }> = {
  hot:  { bg: 'var(--gold)',    color: 'var(--navy)' },
  warm: { bg: 'var(--warm)',    color: '#fff' },
  cold: { bg: 'var(--cold)',    color: '#fff' },
  not:  { bg: '#9ca3af',        color: '#fff' },
}

const LEVER_BADGE: Record<HebelType, { border: string; color: string }> = {
  direct:   { border: 'var(--navy)',         color: 'var(--navy)' },
  opener:   { border: 'var(--gold-600)',      color: 'var(--gold-600)' },
  indirect: { border: 'var(--border-strong)', color: 'var(--ink-2)' },
}

function scoreColor(s: number) {
  if (s >= 75) return 'var(--success)'
  if (s >= 50) return 'var(--gold-600)'
  return 'var(--error)'
}

function ScoreRing({ score }: { score: number }) {
  const size = 56
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const col = scoreColor(score)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * score) / 100}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, color: 'var(--navy)', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.08em', color: 'var(--ink-3)', marginTop: 1 }}>SCORE</span>
      </div>
    </div>
  )
}

export function LeadCard({ lead }: LeadCardProps) {
  const finalScore = getFinalScore(lead)
  const leadClass = getLeadClass(lead, finalScore)
  const hebelType = getHebelType(lead)
  const primaryCompany = lead.bauherr_name || lead.buyer_name || lead.company_name || lead.architekt_name || null
  const tierStyle = TIER_BADGE[leadClass]
  const leverStyle = LEVER_BADGE[hebelType]
  const foundAt = lead.created_at ? formatFoundAt(lead.created_at) : null
  const isProcurement = lead.source_kind === 'ted' || lead.source_kind === 'procurement_open_data'
  const salesWindow = lead.sales_window as string | null | undefined

  return (
    <article style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${TIER_STRIPE[leadClass]}`,
      borderRadius: 'var(--r-card)',
      boxShadow: 'var(--shadow-sm)',
      padding: '16px 18px',
      display: 'flex',
      gap: 16,
      alignItems: 'stretch',
      height: 200,
      overflow: 'hidden',
      transition: 'box-shadow .2s, transform .2s',
      boxSizing: 'border-box',
      position: 'relative',
    }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lift)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
        ;(e.currentTarget as HTMLElement).style.transform = 'none'
      }}
    >
      {/* Bookmark — top-right corner (absolute, does not affect layout) */}
      <div style={{ position: 'absolute', top: 12, right: 14, zIndex: 1 }}>
        <BookmarkButton leadId={lead.id} initialBookmarked={lead.bookmarked === true} size="sm" />
      </div>

      {/* Main content — left column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7, overflow: 'hidden' }}>

        {/* Row 1: Badges */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <span style={{
            fontFamily: 'var(--font-head)', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em',
            padding: '3px 8px', borderRadius: 5,
            background: tierStyle.bg, color: tierStyle.color, flexShrink: 0,
          }}>
            {leadClass.toUpperCase()}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
            padding: '2px 7px', borderRadius: 5,
            border: `1.5px solid ${leverStyle.border}`, color: leverStyle.color, background: 'var(--card)', flexShrink: 0,
          }}>
            {hebelType.toUpperCase()}
          </span>
          {lead.persona && lead.persona !== 'unknown' && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
              border: '1.5px solid var(--border)', color: 'var(--ink-3)', background: 'var(--card)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160,
            }}>
              {formatPersona(lead.persona)}
            </span>
          )}
          {isProcurement && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
              background: 'rgba(26,31,110,.08)', color: 'var(--navy)',
              border: '1.5px solid rgba(26,31,110,.2)', flexShrink: 0,
            }}>
              {lead.source_kind === 'ted' ? 'TED' : 'VERGABE'}
            </span>
          )}
          {salesWindow === 'closing_soon' && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
              background: 'rgba(217,181,0,.15)', color: 'var(--gold-600)',
              border: '1.5px solid rgba(217,181,0,.4)', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <Clock size={9} /> Frist bald
            </span>
          )}
          {salesWindow === 'open' && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
              background: 'rgba(34,197,94,.1)', color: '#15803d',
              border: '1.5px solid rgba(34,197,94,.3)', flexShrink: 0,
            }}>
              Frist offen
            </span>
          )}
          {foundAt && (
            <span style={{
              marginLeft: 'auto', fontSize: 10, color: 'var(--ink-3)', whiteSpace: 'nowrap', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <Calendar size={10} style={{ flexShrink: 0 }} />
              {foundAt}
            </span>
          )}
        </div>

        {/* Row 2: Title — max 2 lines */}
        <Link
          href={`/leads/${lead.id}`}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontFamily: 'var(--font-head)', fontWeight: 700,
            fontSize: 15.5, lineHeight: 1.3, color: 'var(--ink)', textDecoration: 'none',
            flexShrink: 0,
          } as any}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--navy)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ink)' }}
        >
          {lead.title}
        </Link>

        {/* Row 3: Main actor */}
        {primaryCompany && (
          <div style={{
            fontSize: 12.5, color: 'var(--ink-2)', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <Building2 size={12} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primaryCompany}</span>
          </div>
        )}

        {/* Row 4: Meta — location, volume, date, phase */}
        <div style={{
          display: 'flex', flexWrap: 'nowrap', gap: 14, fontSize: 12, color: 'var(--ink-3)',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {lead.location && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
              <MapPin size={11} style={{ flexShrink: 0 }} />
              {lead.location}
            </span>
          )}
          {formatVolume(lead.project_value_estimate) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Landmark size={11} style={{ flexShrink: 0 }} />
              {formatVolume(lead.project_value_estimate)}
            </span>
          )}
          {lead.project_phase && (
            <span style={{ flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
              {lead.project_phase}
            </span>
          )}
          {lead.deadline && (
            <span style={{ flexShrink: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} style={{ flexShrink: 0 }} />
              Frist: {formatDate(lead.deadline)}
            </span>
          )}
          {!lead.deadline && lead.project_date && (
            <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
              {formatDate(lead.project_date)}
            </span>
          )}
        </div>

        {/* Row 5: Bottom — source + details button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', flexShrink: 0 }}>
          <Link
            href={`/leads/${lead.id}`}
            style={{
              fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 11px', fontSize: 12.5, fontWeight: 600,
              borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
              background: 'var(--navy)', color: '#fff', textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            Details <ChevronRight size={13} />
          </Link>
          {hebelType === 'opener' && <BauherrnLookupButton leadId={lead.id} />}
          {lead.source_url && (
            <a
              href={lead.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11.5, color: 'var(--ink-3)', textDecoration: 'none', fontWeight: 500,
              }}
            >
              Quelle <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Right column: Score */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 56 }}>
        <ScoreRing score={finalScore} />
      </div>
    </article>
  )
}

function getHebelType(lead: any): HebelType {
  if (lead.hebel_type === 'direct' || lead.hebel_type === 'opener' || lead.hebel_type === 'indirect') return lead.hebel_type
  return 'indirect'
}

function formatPersona(persona: string) {
  const MAP: Record<string, string> = {
    bauherr_public: 'Bauherr öffentl.',
    bauherr_private: 'Bauherr privat',
    gu: 'Generalunternehmer',
    projektsteuerer: 'Projektsteuerer',
    planer: 'Planer',
    unknown: '',
  }
  return MAP[persona] ?? persona.replaceAll('_', ' ')
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatFoundAt(isoStr: string) {
  try {
    const d = new Date(isoStr)
    const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    return `Gefunden: ${date}, ${time}`
  } catch {
    return null
  }
}

// keep cn import used by other files
export { cn }
