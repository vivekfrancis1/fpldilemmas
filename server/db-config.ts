// Database connection rules shared by server/db.ts. Kept free of side effects so they can be unit tested.
//
// Local development and tests use a Postgres on this machine (see scripts/dev-db.sh). Production (Railway) is
// a remote database. These helpers make sure a dev or test run can never touch the remote one by accident.

/** True when the connection string points at this machine (localhost, 127.0.0.1, ::1, *.localhost). */
export function isLocalDatabaseUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
  } catch {
    return false;
  }
}

/**
 * TLS settings for the pg Pool. A local database has no TLS. Railway's Postgres proxy (internal and public)
 * presents a cert whose altnames don't match the hostname, so verification of the hostname is disabled there:
 * the connection is still encrypted, just not hostname-checked.
 */
export function poolSslOption(url: string): false | { rejectUnauthorized: false } {
  return isLocalDatabaseUrl(url) ? false : { rejectUnauthorized: false };
}

/**
 * Refuses to run a development or test process against a remote database. Production, and processes with no
 * NODE_ENV (one-off scripts, `railway run`), are not restricted. Set ALLOW_REMOTE_DB=1 to deliberately use a
 * remote database from a development or test run.
 */
export function assertSafeDatabase(url: string, env: Record<string, string | undefined>): void {
  if (env.NODE_ENV !== "development" && env.NODE_ENV !== "test") return;
  if (env.ALLOW_REMOTE_DB === "1" || isLocalDatabaseUrl(url)) return;
  let host = "an unknown host";
  try {
    host = new URL(url).hostname;
  } catch {
    /* keep the generic wording; never echo the raw URL, it contains the password */
  }
  throw new Error(
    `Refusing to start: NODE_ENV=${env.NODE_ENV} but DATABASE_URL points at ${host}, not a local database. ` +
      `Development and tests must use the local Postgres (run scripts/dev-db.sh start, then set DATABASE_URL to it, ` +
      `see CLAUDE.md "Local development database"). To deliberately use a remote database set ALLOW_REMOTE_DB=1.`,
  );
}
