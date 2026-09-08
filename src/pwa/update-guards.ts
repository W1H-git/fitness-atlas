const guards = new Set<() => Promise<void>>()
export function registerUpdateGuard(guard: () => Promise<void>) {
  guards.add(guard)
  return () => guards.delete(guard)
}
export async function flushUpdateGuards() {
  for (const guard of guards) await guard()
}
