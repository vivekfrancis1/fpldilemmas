import { describe, it, expect, vi } from "vitest";
import { InitializationOrchestrator } from "../server/initialization-orchestrator";
import { TOTAL_POINTS_REQUIRED_JOBS, requireWarmCaches, warmupStatus } from "../server/readiness";
import { INITIALIZING_MAX_RETRIES, initializingRetryDelay, isInitializingError, isNetworkLevelError, shouldRetryQuery } from "../client/src/lib/query-retry";

const REQUIRED = ["bootstrap-data", "team-goals-warmup"];

function orchestratorWith(jobs: Array<{ id: string; deps?: string[]; run?: () => Promise<void> }>) {
  const o = new InitializationOrchestrator();
  for (const j of jobs) {
    o.registerJob({ id: j.id, name: j.id, dependencies: j.deps ?? [], executor: j.run ?? (async () => {}), timeout: 5000 });
  }
  return o;
}

describe("warmupStatus (is the server warm enough to serve projections?)", () => {
  it("is not ready before the startup orchestrator exists", () => {
    expect(warmupStatus(null, REQUIRED)).toEqual({ ready: false, pending: REQUIRED });
  });

  it("is not ready while a required job is unregistered, pending or running", () => {
    expect(warmupStatus(orchestratorWith([]), REQUIRED).ready).toBe(false);
    const pending = orchestratorWith([{ id: "bootstrap-data" }, { id: "team-goals-warmup", deps: ["bootstrap-data"] }]);
    expect(warmupStatus(pending, REQUIRED)).toEqual({ ready: false, pending: REQUIRED });
  });

  it("flips to ready only after the required jobs have run", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const o = orchestratorWith([
      { id: "bootstrap-data" },
      { id: "team-goals-warmup", deps: ["bootstrap-data"], run: () => gate },
    ]);
    const done = o.executeAll();
    await new Promise((r) => setTimeout(r, 20));
    expect(warmupStatus(o, REQUIRED)).toEqual({ ready: false, pending: ["team-goals-warmup"] });
    release();
    await done;
    expect(warmupStatus(o, REQUIRED)).toEqual({ ready: true, pending: [] });
  });

  it("a job that failed does not block serving forever (degraded beats a permanent 503)", async () => {
    const o = orchestratorWith([
      { id: "bootstrap-data" },
      { id: "team-goals-warmup", deps: ["bootstrap-data"], run: async () => { throw new Error("boom"); } },
    ]);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    await o.executeAll().catch(() => {});
    errors.mockRestore();
    expect(warmupStatus(o, REQUIRED).ready).toBe(true);
  });

  it("the projections endpoint waits for exactly the jobs that warm the data it aggregates", () => {
    expect(TOTAL_POINTS_REQUIRED_JOBS).toEqual(REQUIRED);
  });
});

describe("requireWarmCaches middleware", () => {
  const fakeRes = () => {
    const res: any = { headers: {} as Record<string, string> };
    res.status = vi.fn((c: number) => ((res.statusCode = c), res));
    res.set = vi.fn((k: string, v: string) => ((res.headers[k] = v), res));
    res.json = vi.fn((b: unknown) => ((res.body = b), res));
    return res;
  };

  it("answers 503 with Retry-After and the pending jobs while the server is warming", () => {
    const mw = requireWarmCaches(() => null, REQUIRED, "cached-player-total-points");
    const res = fakeRes();
    const next = vi.fn();
    mw({}, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
    expect(res.headers["Retry-After"]).toBe("15");
    expect(res.body).toMatchObject({ error: "System Initializing", missingComponents: REQUIRED, retryAfter: 15 });
  });

  it("lets the request through once warm, without touching the response", async () => {
    const o = orchestratorWith([{ id: "bootstrap-data" }, { id: "team-goals-warmup", deps: ["bootstrap-data"] }]);
    await o.executeAll();
    const mw = requireWarmCaches(() => o, REQUIRED, "cached-player-total-points");
    const res = fakeRes();
    const next = vi.fn();
    mw({}, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("client retry policy", () => {
  const http = (status: number, msg = "x") => new Error(`${status}: ${msg}`);

  it("recognises the server's 'initializing' reply", () => {
    expect(isInitializingError(http(503, "System Initializing"))).toBe(true);
    expect(isInitializingError(http(500, "System Initializing"))).toBe(false);
    expect(isInitializingError(http(503, "Service Unavailable"))).toBe(false);
    expect(isInitializingError("503: System Initializing")).toBe(false);
  });

  it("retries 'initializing' for about a minute, then gives up", () => {
    expect(shouldRetryQuery(0, http(503, "System Initializing"))).toBe(true);
    expect(shouldRetryQuery(INITIALIZING_MAX_RETRIES - 1, http(503, "System Initializing"))).toBe(true);
    expect(shouldRetryQuery(INITIALIZING_MAX_RETRIES, http(503, "System Initializing"))).toBe(false);
    const total = Array.from({ length: INITIALIZING_MAX_RETRIES }, (_, i) => initializingRetryDelay(i)).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(45_000);
    expect(total).toBeLessThanOrEqual(120_000);
  });

  it("still only retries network blips twice, and never other HTTP errors", () => {
    const net = new Error("Failed to fetch");
    expect(isNetworkLevelError(net)).toBe(true);
    expect(shouldRetryQuery(0, net)).toBe(true);
    expect(shouldRetryQuery(1, net)).toBe(true);
    expect(shouldRetryQuery(2, net)).toBe(false);
    expect(shouldRetryQuery(0, http(404, "Manager not found"))).toBe(false);
    expect(shouldRetryQuery(0, http(500, "boom"))).toBe(false);
  });
});
