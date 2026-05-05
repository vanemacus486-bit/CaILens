export function fireAndForget(promise: Promise<unknown>, label: string): void {
  promise.catch((err) => {
    console.error(`[fire-and-forget] ${label}:`, err)
  })
}
