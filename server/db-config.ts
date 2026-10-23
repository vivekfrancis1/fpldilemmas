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

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
// Generous: no web request waits longer than the 120 s internal-API timeout, and the heaviest job queries take seconds.
const DEFAULT_QUERY_TIMEOUT_MS = 120_000;

/** A whole number of milliseconds from an env var, or null when unset or not a non-negative integer. */
function envMillis(value: string | undefined): number | null {
  return value !== undefined && /^\d+$/.test(value) ? parseInt(value, 10) : null;
}

/**
 * Options for the pg Pool. A connection that died silently (laptop sleep, a proxy or NAT dropping an idle socket)
 * used to hang every query on it until the OS gave up minutes later (`read ETIMEDOUT`), which stalled the whole
 * server. TCP keep-alive finds a dead peer early, and the timeouts make a stuck connect or query fail fast.
 * PG_CONNECTION_TIMEOUT_MS and PG_QUERY_TIMEOUT_MS override the defaults (0 turns the query timeout off, for a
 * one-off script that really needs a very long query); anything that is not a plain number is ignored.
 */
export function poolOptions(url: string, env: Record<string, string | undefined>) {
  const connect = envMillis(env.PG_CONNECTION_TIMEOUT_MS);
  const query = envMillis(env.PG_QUERY_TIMEOUT_MS);
  return {
    connectionString: url,
    ssl: poolSslOption(url),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    connectionTimeoutMillis: connect !== null && connect > 0 ? connect : DEFAULT_CONNECTION_TIMEOUT_MS,
    query_timeout: query === null ? DEFAULT_QUERY_TIMEOUT_MS : query === 0 ? undefined : query,
  };
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
