/**
 * Gameweek Key Normalization Utilities
 * 
 * These utilities ensure consistent gameweek key formats throughout the application
 * to prevent data access mismatches between frontend and backend systems.
 */

export type GameweekKeyFormat = 'numeric' | 'prefixed';

/**
 * Normalizes gameweek keys to a consistent format
 * @param key - The key to normalize (can be "6", "gw6", 6, etc.)
 * @param format - The desired output format ('numeric' for "6" or 'prefixed' for "gw6")
 * @returns Normalized key string
 */
export function normalizeGameweekKey(key: string | number, format: GameweekKeyFormat = 'numeric'): string {
  // Convert input to string and extract numeric part
  const keyStr = String(key);
  const numericPart = keyStr.replace(/^gw/i, ''); // Remove 'gw' prefix if present
  
  if (!/^\d+$/.test(numericPart)) {
    throw new Error(`Invalid gameweek key format: ${key}`);
  }
  
  return format === 'numeric' ? numericPart : `gw${numericPart}`;
}

/**
 * Normalizes an object's gameweek keys to the specified format
 * @param obj - Object with gameweek keys to normalize
 * @param format - The desired key format
 * @returns New object with normalized keys
 */
export function normalizeGameweekKeys<T>(obj: Record<string, T>, format: GameweekKeyFormat = 'numeric'): Record<string, T> {
  if (!obj || typeof obj !== 'object') return obj;
  
  const normalized: Record<string, T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    try {
      const normalizedKey = normalizeGameweekKey(key, format);
      normalized[normalizedKey] = value;
    } catch (error) {
      // If key normalization fails, keep the original key (for non-gameweek keys)
      normalized[key] = value;
    }
  }
  
  return normalized;
}

/**
 * Validates that all gameweek keys in an object follow the expected format
 * @param obj - Object to validate
 * @param expectedFormat - Expected format for gameweek keys
 * @returns Array of validation errors, empty if all keys are valid
 */
export function validateGameweekKeys(obj: Record<string, any>, expectedFormat: GameweekKeyFormat = 'numeric'): string[] {
  if (!obj || typeof obj !== 'object') return [];
  
  const errors: string[] = [];
  
  for (const key of Object.keys(obj)) {
    // Check if this looks like a gameweek key
    if (/^(gw)?\d+$/i.test(key)) {
      try {
        const expectedKey = normalizeGameweekKey(key, expectedFormat);
        if (key !== expectedKey) {
          errors.push(`Key "${key}" should be "${expectedKey}" for ${expectedFormat} format`);
        }
      } catch (error) {
        errors.push(`Invalid gameweek key format: ${key}`);
      }
    }
  }
  
  return errors;
}

/**
 * Creates a robust accessor function that can handle both key formats
 * Useful during transition periods or when dealing with mixed data sources
 * @param obj - Object to access
 * @param gameweek - Gameweek number
 * @returns Value from object, trying both numeric and prefixed formats
 */
export function getGameweekValue<T>(obj: Record<string, T> | undefined, gameweek: string | number): T | undefined {
  if (!obj) return undefined;
  
  const numericKey = normalizeGameweekKey(gameweek, 'numeric');
  const prefixedKey = normalizeGameweekKey(gameweek, 'prefixed');
  
  // Try both formats for maximum compatibility
  return obj[numericKey] ?? obj[prefixedKey] ?? undefined;
}