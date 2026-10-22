// Cold-start gate for endpoints that aggregate projections. For about a minute after a restart the component
// caches behind /api/cached/player-total-points are still warming, and serving then gave incomplete numbers
// (e.g. defenders and goalkeepers topping every team in the Captaincy Matrix). Until the warm-up jobs have
// run, those requests get a clear 503 "initializing" reply (the client retries it) instead of wrong data.
import type { InitializationOrchestrator } from "./initialization-orchestrator";

/** The startup jobs whose caches /api/cached/player-total-points aggregates. */
export const TOTAL_POINTS_REQUIRED_JOBS = ["bootstrap-data", "team-goals-warmup"];

/** How long clients are told to wait before asking again. */
export const RETRY_AFTER_SECONDS = 15;

/**
 * Is the server warm for these jobs? A job counts as settled once it completed OR failed: a failed warm-up
 * leaves the service degraded, but holding every request on a 503 forever would be worse. Before the
 * orchestrator exists, or while a job is unregistered, pending or running, it is not ready.
 */
export function warmupStatus(orchestrator: InitializationOrchestrator | null, required: string[]): { ready: boolean; pending: string[] } {
  if (!orchestrator) return { ready: false, pending: [...required] };
  const status = new Map(orchestrator.getStatus().map((s) => [s.id, s.status]));
  const pending = required.filter((id) => {
    const s = status.get(id);
    return s !== "completed" && s !== "failed";
  });
  return { ready: pending.length === 0, pending };
}

export function requireWarmCaches(getOrchestrator: () => InitializationOrchestrator | null, required: string[], endpoint: string) {
  return (_req: unknown, res: any, next: () => void) => {
    const { ready, pending } = warmupStatus(getOrchestrator(), required);
    if (ready) return next();
    console.log(`🚫 ${endpoint}: still warming up - waiting for ${pending.join(", ")}`);
    res.status(503);
    res.set("Retry-After", String(RETRY_AFTER_SECONDS));
    return res.json({
      error: "System Initializing",
      message: `Projections are still warming up (waiting for: ${pending.join(", ")}). Please retry shortly.`,
      missingComponents: pending,
      retryAfter: RETRY_AFTER_SECONDS,
    });
  };
}
