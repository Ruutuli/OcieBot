/**
 * Normalizes image URLs, particularly for Fandom/Wikia URLs
 * Fandom URLs with /revision/latest are correct and should be preserved as-is
 */
export function normalizeImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  
  // Fandom/Wikia URLs with /revision/latest are correct and work properly
  // We should preserve them as-is. The function is kept for potential future normalization needs.
  return url;
}

