// DB-free helpers for the Copilot xMins auto-sync (kept separate so they're unit-testable
// without a database connection).
import { createHash } from "crypto";

export function hashCopilotExport(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// Decides what the production watcher should do given the previous and current "latest Copilot
// load" marker (max calculated_at as an ISO string). The first observation only records a
// baseline, so restarting the server never triggers a refresh by itself.
export function copilotDataChange(
  previous: string | null | undefined,
  current: string | null
): "baseline" | "unchanged" | "changed" {
  if (previous === undefined) return "baseline";
  if (current === null || current === previous) return "unchanged";
  return "changed";
}
