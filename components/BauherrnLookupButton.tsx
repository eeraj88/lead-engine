'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function BauherrnLookupButton({ leadId }: { leadId: string }) {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)

  async function runLookup() {
    setIsRunning(true)

    try {
      const response = await fetch(`/api/bauherrn-lookup/${leadId}`, {
        method: 'POST',
      })
      const payload = await response.json()

      if (response.ok && payload.lead?.id) {
        router.push(`/leads/${payload.lead.id}`)
        return
      }

      router.refresh()
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Button
      size="sm"
      onClick={runLookup}
      disabled={isRunning}
      className="bg-orca-gold text-orca-blue-dark hover:bg-orca-gold-dark"
    >
      {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
      Lookup
    </Button>
  )
}
