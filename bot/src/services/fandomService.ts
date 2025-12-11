// Hardcoded fandoms
const HARDCODED_FANDOMS = [
  'Naruto',
  'Pokemon',
  'Zelda',
  'Shaman King',
  'Soul Eater',
  'Demon Slayer',
  'Inuyasha'
];

// Store for custom fandoms (in-memory for now, could be moved to database later)
// This will be populated from existing OCs in the database
let customFandoms: Set<string> = new Set();

/**
 * Get all available fandoms (hardcoded + custom)
 */
export function getAllFandoms(): string[] {
  const allFandoms = [...HARDCODED_FANDOMS, ...Array.from(customFandoms)];
  return allFandoms.sort();
}

/**
 * Get only hardcoded fandoms
 */
export function getHardcodedFandoms(): string[] {
  return [...HARDCODED_FANDOMS];
}

/**
 * Check if a fandom is hardcoded
 */
export function isHardcodedFandom(fandom: string): boolean {
  return HARDCODED_FANDOMS.some(hf => hf.toLowerCase() === fandom.toLowerCase());
}

/**
 * Add a custom fandom (not hardcoded)
 */
export function addCustomFandom(fandom: string): void {
  if (!isHardcodedFandom(fandom)) {
    customFandoms.add(fandom);
  }
}

/**
 * Initialize custom fandoms from existing OCs in the database
 * This should be called when the service starts
 */
export function initializeCustomFandoms(existingFandoms: string[]): void {
  customFandoms = new Set(
    existingFandoms.filter(f => f && f.trim() && !isHardcodedFandom(f))
  );
}

/**
 * Get all unique fandoms from a list of OC fandoms arrays
 */
export function extractUniqueFandoms(ocFandomsArrays: string[][]): string[] {
  const allFandoms = new Set<string>();
  for (const fandoms of ocFandomsArrays) {
    for (const fandom of fandoms) {
      if (fandom && fandom.trim()) {
        allFandoms.add(fandom);
      }
    }
  }
  return Array.from(allFandoms).sort();
}

