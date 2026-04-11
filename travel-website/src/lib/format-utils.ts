export function formatPriceLevel(level: number): string {
  const safeLevel = Math.max(0, Math.min(5, Math.floor(level)));
  return "$".repeat(safeLevel);
}
