// When to retry a failed query. Kept free of React Query so it can be unit tested on its own.

// True for a raw network-level failure (fetch() itself throwing — dropped connection, DNS
// hiccup, or a brief window where the server is mid-restart during a deploy) as opposed to an
// HTTP error response (404, 500, etc.), which getQueryFn/apiRequest format as "<status>: <msg>".
export function isNetworkLevelError(error: unknown): boolean {
  return error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message);
}

/** The server's "still warming up after a restart" reply (503 with error "System Initializing"). */
export function isInitializingError(error: unknown): boolean {
  return error instanceof Error && /^503: System Initializing/i.test(error.message);
}

/** About a minute of patience: the server needs roughly that long to warm its projection caches. */
export const INITIALIZING_MAX_RETRIES = 8;
export const initializingRetryDelay = (attemptIndex: number) => Math.min(3000 * (attemptIndex + 1), 10_000);

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isInitializingError(error)) return failureCount < INITIALIZING_MAX_RETRIES;
  // Only retry genuine network-level failures (a real HTTP error response like "404:
  // Manager not found" retrying pointlessly would just delay showing the correct message).
  // Up to 2 retries gives a transient blip — e.g. a request that lands during the few-second
  // window a deploy briefly restarts the server — a real chance to quietly succeed instead
  // of surfacing an error at all.
  return isNetworkLevelError(error) && failureCount < 2;
}

export function queryRetryDelay(attemptIndex: number, error: unknown): number {
  return isInitializingError(error) ? initializingRetryDelay(attemptIndex) : Math.min(1000 * 2 ** attemptIndex, 5000);
}
