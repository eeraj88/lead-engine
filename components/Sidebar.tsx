'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Database, Users, Activity } from 'lucide-react'
import Image from 'next/image'

const navItems = [
  { href: '/',        label: 'Dashboard',     icon: Home },
  { href: '/sources', label: 'Sources',        icon: Database },
  { href: '/leads',   label: 'Leads',          icon: Users },
  { href: '/runs',    label: 'Pipeline Runs',  icon: Activity },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      flexShrink: 0,
      minHeight: '100vh',
      position: 'sticky',
      top: 0,
      alignSelf: 'flex-start',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--navy)',
      color: 'rgba(255,255,255,.72)',
      padding: '22px 16px',
    }}>
      {/* Brand */}
      <div style={{ padding: '6px 8px 22px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <Image
          src="/rayle_logo.png"
          alt="RAYLEAD Engine"
          width={56}
          height={39}
          style={{ width: 56, height: 39, display: 'block' }}
          priority
        />
        <div style={{
          fontFamily: 'var(--font-head)',
          fontSize: 17,
          letterSpacing: '0.01em',
          fontWeight: 700,
          lineHeight: 1,
          whiteSpace: 'nowrap' as const,
        }}>
          <span style={{ color: 'var(--gold)' }}>RAY</span><span style={{ color: '#fff' }}>LEAD Engine</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '10px 12px',
                borderRadius: 9,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : 'rgba(255,255,255,.72)',
                textDecoration: 'none',
                background: isActive ? 'rgba(255,255,255,.10)' : 'transparent',
                borderLeft: `3px solid ${isActive ? 'var(--gold)' : 'transparent'}`,
                transition: 'background .15s, color .15s',
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.3 : 2} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        marginTop: 'auto',
        padding: '14px 12px 4px',
        fontSize: 11,
        color: 'rgba(255,255,255,.45)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderTop: '1px solid rgba(255,255,255,.10)',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: 99,
          background: 'var(--success)',
          boxShadow: '0 0 0 3px rgba(34,197,94,.18)',
          flexShrink: 0,
        }} />
        <span>Pipeline bereit · v2.4</span>
      </div>
    </aside>
  )
}
