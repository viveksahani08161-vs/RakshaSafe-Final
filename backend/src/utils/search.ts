/** Escape user input before embedding it in a MongoDB $regex filter. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
