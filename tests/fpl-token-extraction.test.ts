import { describe, it, expect } from 'vitest';
import { extractBearerTokenFromCurl } from '../server/fpl-token-utils';

// Real "Copy as cURL" commands vary in quoting/flag style across browsers/OSes. A single
// strict regex previously rejected valid pastes that didn't match its exact shape — this
// caused the reported "Could not find bearer token in cURL" error for otherwise-valid input.
describe('extractBearerTokenFromCurl', () => {
  it('extracts from Chrome/Edge bash-style single-quoted -H flag', () => {
    const curl = `curl 'https://fantasy.premierleague.com/api/me/' \\\n  -H 'x-api-authorization: Bearer abc123.def456-XYZ' \\\n  -H 'accept: application/json' \\\n  --compressed`;
    expect(extractBearerTokenFromCurl(curl)).toBe('abc123.def456-XYZ');
  });

  it('extracts from double-quoted --header flag', () => {
    const curl = `curl "https://fantasy.premierleague.com/api/me/" --header "x-api-authorization: Bearer tokenABC789"`;
    expect(extractBearerTokenFromCurl(curl)).toBe('tokenABC789');
  });

  it('is case-insensitive on the header name', () => {
    const curl = `curl 'url' -H 'X-Api-Authorization: Bearer CaseSensitiveToken123'`;
    expect(extractBearerTokenFromCurl(curl)).toBe('CaseSensitiveToken123');
  });

  it('extracts a JWT-shaped token containing dots and dashes', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const curl = `curl 'url' -H 'x-api-authorization: Bearer ${jwt}'`;
    expect(extractBearerTokenFromCurl(curl)).toBe(jwt);
  });

  it('falls back to a looser match when the header is present without a -H/--header prefix', () => {
    const raw = `x-api-authorization: Bearer looseFormatToken456`;
    expect(extractBearerTokenFromCurl(raw)).toBe('looseFormatToken456');
  });

  it('returns null when no x-api-authorization header is present at all', () => {
    const curl = `curl 'https://fantasy.premierleague.com/static/logo.png' -H 'accept: image/png'`;
    expect(extractBearerTokenFromCurl(curl)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractBearerTokenFromCurl('')).toBeNull();
  });
});
