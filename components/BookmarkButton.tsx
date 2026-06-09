'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark } from 'lucide-react'

interface BookmarkButtonProps {
  leadId: string
  initialBookmarked: boolean
  size?: 'sm' | 'md'
}

export function BookmarkButton({ leadId, initialBookmarked, size = 'sm' }: BookmarkButtonProps) {
  const router = useRouter()
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [loading, setLoading] = useState(false)

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return

    // Optimistic update
    const next = !bookmarked
    setBookmarked(next)
    setLoading(true)

    try {
      const res = await fetch(`/api/leads/${leadId}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarked: next }),
      })
      if (!res.ok) throw new Error('Failed')
      router.refresh()
    } catch {
      // Revert on failure
      setBookmarked(!next)
    } finally {
      setLoading(false)
    }
  }

  const dim = size === 'md' ? 36 : 30
  const iconSize = size === 'md' ? 17 : 15

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={bookmarked ? 'Bookmark entfernen' : 'Zum Nachfassen markieren'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: dim, height: dim, borderRadius: 7, flexShrink: 0,
        background: bookmarked ? 'rgba(217,181,0,.15)' : 'var(--page)',
        border: `1.5px solid ${bookmarked ? 'rgba(217,181,0,.5)' : 'var(--border)'}`,
        color: bookmarked ? 'var(--gold-600, #b59200)' : 'var(--ink-3)',
        cursor: loading ? 'wait' : 'pointer',
        transition: 'all .18s',
      }}
    >
      <Bookmark size={iconSize} fill={bookmarked ? 'currentColor' : 'none'} />
    </button>
  )
}
