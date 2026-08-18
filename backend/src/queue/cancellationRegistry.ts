const cancelled = new Set<string>();

export function requestCancellation(runId: string): void {
  cancelled.add(runId);
}

export function isCancelled(runId: string): boolean {
  return cancelled.has(runId);
}

export function clearCancellation(runId: string): void {
  cancelled.delete(runId);
}
