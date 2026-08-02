// Shared admin login helper for tests that hit admin-gated endpoints (isAuthenticated +
// requireAdmin in server/routes.ts). Matches the seeded admin account in
// server/seed-admin-user.ts — not imported directly because these tests are plain HTTP clients
// against a running server (no @shared/* path alias is configured for the vitest 'unit'
// project, so importing server-side modules here doesn't resolve).
const ADMIN_EMAIL = 'fpldilemmas@gmail.com';
const ADMIN_PASSWORD = 'fpldilemmas2024';

/**
 * Logs in as the seeded admin account and returns a session cookie confirmed to actually be
 * active. The login response can return before the session is reliably queryable by a
 * subsequent request (an async gap between express-session/connect-pg-simple writing the
 * session and it being visible to the very next read) — observed as the *first* authenticated
 * request right after login occasionally getting a spurious 401 even with a valid cookie, while
 * every request after that succeeds. This does a lightweight /api/auth/user check after login,
 * retrying briefly, so callers only ever get back a cookie that's already proven to work.
 */
export async function loginAsAdmin(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (res.status !== 200) {
    throw new Error(`Admin login failed: ${res.status} ${res.statusText}`);
  }
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Admin login succeeded but returned no session cookie');
  }
  const cookie = setCookie.split(';')[0];

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const check = await fetch(`${baseUrl}/api/auth/user`, { headers: { Cookie: cookie } });
    if (check.status === 200) return cookie;
    if (attempt === maxAttempts) {
      throw new Error(`Admin session never became active after login (last status: ${check.status})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
  }
  return cookie; // unreachable — loop above always returns or throws
}
