import { describe, it, expect } from 'vitest';
import { getAuthenticatedUserId } from '../server/replitAuth';

// isAuthenticated accepts two different auth shapes: Passport/Google OAuth populates req.user,
// while the local email/password login (server/replitAuth.ts's own /api/auth/login) sets
// req.session.user directly and never touches req.user at all. Several route handlers read
// req.user.id unconditionally and crashed with a 500 for every session-based login — this broke
// /api/fpl/status, /api/fpl/my-team, and other FPL endpoints for anyone not using Google.
describe('getAuthenticatedUserId', () => {
  it('reads the id from req.user when Passport/Google OAuth populated it', () => {
    const req = { user: { id: 'user-123' }, session: {} };
    expect(getAuthenticatedUserId(req)).toBe('user-123');
  });

  it('falls back to req.session.user.id when req.user is absent (local email/password login)', () => {
    const req = { session: { user: { id: 'user-456' } } };
    expect(getAuthenticatedUserId(req)).toBe('user-456');
  });

  it('prefers req.user.id when both are present', () => {
    const req = { user: { id: 'from-passport' }, session: { user: { id: 'from-session' } } };
    expect(getAuthenticatedUserId(req)).toBe('from-passport');
  });

  it('returns undefined when neither auth shape has an id', () => {
    const req = { session: {} };
    expect(getAuthenticatedUserId(req)).toBeUndefined();
  });

  it('returns undefined for a request with no session at all', () => {
    const req = {};
    expect(getAuthenticatedUserId(req)).toBeUndefined();
  });
});
