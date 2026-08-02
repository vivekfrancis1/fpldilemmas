/**
 * Extracts the FPL Bearer token from a pasted "Copy as cURL" command. Browsers format this
 * differently (single- vs double-quoted headers, -H vs --header, Safari/Firefox spacing), so
 * several patterns are tried in order rather than one strict regex — a single strict pattern
 * previously rejected valid cURL commands that didn't match its exact shape.
 * Returns null if no x-api-authorization Bearer header is found anywhere in the input.
 */
export function extractBearerTokenFromCurl(input: string): string | null {
  const patterns = [
    /(?:-H|--header)\s+['"]x-api-authorization:\s*Bearer\s+([^'"]+)['"]/i,
    /(?:-H|--header)\s+x-api-authorization:\s*Bearer\s+(\S+)/i,
    /x-api-authorization['"]?\s*[:=]\s*['"]?Bearer\s+([^'"\\\s]+)/i,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return null;
}
