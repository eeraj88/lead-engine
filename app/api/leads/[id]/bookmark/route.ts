import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { bookmarked, note } = body as { bookmarked: boolean; note?: string }

    if (typeof bookmarked !== 'boolean') {
      return NextResponse.json({ error: 'bookmarked must be boolean' }, { status: 400 })
    }

    const supabase = await createServerClient()

    const { error } = await supabase
      .from('leads')
      .update({
        bookmarked,
        bookmarked_at: bookmarked ? new Date().toISOString() : null,
        bookmark_note: bookmarked ? (note ?? null) : null,
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, bookmarked })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
