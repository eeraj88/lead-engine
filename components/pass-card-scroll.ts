const BOTTOM_THRESHOLD_PX = 10

export function isTerminalAtBottom(scrollTop: number): boolean {
  return Math.abs(scrollTop) < BOTTOM_THRESHOLD_PX
}

export function terminalScrollTarget(): number {
  return 0
}
