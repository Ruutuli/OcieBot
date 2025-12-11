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

/**
 * Determines if an image URL supports CORS (cross-origin requests)
 * Returns true for URLs that are known to support CORS, false otherwise
 */
export function supportsCORS(url: string | undefined | null): boolean {
  if (!url) return false;
  
  // Fandom/Wikia URLs with /revision/latest typically support CORS
  if (url.includes('fandom.com') || url.includes('wikia.com')) {
    return url.includes('/revision/latest');
  }
  
  // Most CDN URLs don't support CORS, so return false
  // This includes cdn.finalfantasywiki.com and similar CDNs
  return false;
}

