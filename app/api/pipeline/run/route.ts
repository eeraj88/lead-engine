import { runPipeline } from '@/lib/pipeline/orchestrator'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limitParam = url.searchParams.get('limit')
  const maxRelevantLeads = limitParam ? Number(limitParam) : undefined
  const tedLimitParam = url.searchParams.get('tedLimit')
  const tedLimit = tedLimitParam ? Math.max(1, Math.min(50, Number(tedLimitParam))) : undefined
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let controllerOpen = true
      const send = (data: string) => {
        if (!controllerOpen) return
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          // Browser disconnected — pipeline continues silently
          controllerOpen = false
        }
      }

      try {
        await runPipeline(
          (event) => {
            send(JSON.stringify(event))
          },
          {
            maxRelevantLeads:
              maxRelevantLeads && Number.isFinite(maxRelevantLeads)
                ? Math.max(1, Math.min(50, Math.floor(maxRelevantLeads)))
                : undefined,
            tedLimit,
          }
        )

        send(JSON.stringify({ type: 'done' }))
        if (controllerOpen) controller.close()
      } catch (error) {
        send(
          JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        )
        if (controllerOpen) controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
