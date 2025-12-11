/**
 * Generates a custom ID in the format A12345 (letter + 5-digit number)
 * @param prefix - The letter prefix (default: 'A')
 * @param model - The Mongoose model to check for existing IDs
 * @returns A unique ID string in the format A12345
 */
export async function generateCustomId(prefix: string = 'A', model: any): Promise<string> {
  // Find all existing IDs with the matching prefix
  const existingDocs = await model.find({ id: { $regex: `^${prefix}\\d+$` } })
    .select('id');

  let maxNumber = 0;

  // Find the highest numeric value
  for (const doc of existingDocs) {
    if (doc.id) {
      const match = doc.id.match(/^[A-Z](\d+)$/);
      if (match) {
        const number = parseInt(match[1], 10);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    }
  }

  // Increment to get the next number
  const nextNumber = maxNumber + 1;

  // Format as A12345 (prefix + 5-digit number with leading zeros)
  const formattedNumber = nextNumber.toString().padStart(5, '0');
  return `${prefix.toUpperCase()}${formattedNumber}`;
}

/**
 * Validates if an ID matches the format A12345
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidCustomId(id: string): boolean {
  return /^[A-Z]\d{5}$/.test(id);
}

