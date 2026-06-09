export type StreamEvent =
  | { type: 'pass_started'; pass: number }
  | { type: 'pass_complete'; pass: number; count: number }
  | { type: 'pass0_complete'; fetched: number; relevant: number; filtered: number; duplicates: number }
  | { type: 'source_started'; source: string }
  | { type: 'source_complete'; source: string; count: number }
  | { type: 'lead_filtered'; title: string; reason: string }
  | { type: 'lead_scored'; title: string; score: number }
  | { type: 'lead_enriched'; title: string }
  | { type: 'error'; message: string }
  | { type: 'warning'; message: string }
  | { type: 'complete'; stats: object }

export class StreamEmitter {
  private encoder = new TextEncoder()

  constructor(private onEvent?: (event: StreamEvent) => void) {}

  send(event: StreamEvent) {
    this.onEvent?.(event)
    const data = `data: ${JSON.stringify(event)}\n\n`
    return this.encoder.encode(data)
  }
}
