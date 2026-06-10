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
      <div style={{ padding: '6px 8px 22px' }}>
        <Image
          src="/rayle_logo.png"
          alt="RAYLEAD Engine"
          width={180}
          height={56}
          style={{ width: '100%', height: 'auto', maxWidth: 180 }}
          priority
        />
        <div style={{
          fontSize: 10.5,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          color: 'rgba(255,255,255,.55)',
          marginTop: 8,
          paddingLeft: 2,
          fontWeight: 600,
        }}>
          RAYLEAD Engine
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
