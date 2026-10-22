import { describe, it, expect } from "vitest";
import { assertSafeDatabase, isLocalDatabaseUrl, poolSslOption } from "../server/db-config";

describe("isLocalDatabaseUrl", () => {
  it("accepts localhost, 127.0.0.1, ::1 and *.localhost, with or without credentials and port", () => {
    for (const url of [
      "postgresql://localhost:5433/fpldilemmas_dev",
      "postgres://steve@localhost/fpldilemmas_dev",
      "postgresql://u:p@127.0.0.1:5432/db",
      "postgresql://u:p@[::1]:5432/db",
      "postgresql://u:p@db.localhost:5432/db",
    ]) {
      expect(isLocalDatabaseUrl(url), url).toBe(true);
    }
  });

  it("rejects remote hosts, including look-alikes", () => {
    for (const url of [
      "postgresql://u:p@tokaido.proxy.rlwy.net:17343/railway",
      "postgresql://u:p@postgres.railway.internal:5432/railway",
      "postgresql://u:p@localhost.evil.com:5432/db",
      "postgresql://u:p@evil.com/localhost",
      "postgresql://localhost@evil.com:5432/db",
    ]) {
      expect(isLocalDatabaseUrl(url), url).toBe(false);
    }
  });

  it("treats junk as not local", () => {
    expect(isLocalDatabaseUrl("")).toBe(false);
    expect(isLocalDatabaseUrl("not a url")).toBe(false);
  });
});

describe("poolSslOption", () => {
  it("uses no TLS for a local database and Railway-style TLS (no hostname check) for a remote one", () => {
    expect(poolSslOption("postgresql://steve@localhost:5433/fpldilemmas_dev")).toBe(false);
    expect(poolSslOption("postgresql://u:p@tokaido.proxy.rlwy.net:17343/railway")).toEqual({ rejectUnauthorized: false });
  });
});

describe("assertSafeDatabase (dev and test must never touch a remote database by accident)", () => {
  const remote = "postgresql://u:p@tokaido.proxy.rlwy.net:17343/railway";
  const local = "postgresql://steve@localhost:5433/fpldilemmas_dev";

  it("allows a local database in every environment", () => {
    for (const env of ["development", "test", "production", undefined]) {
      expect(() => assertSafeDatabase(local, { NODE_ENV: env })).not.toThrow();
    }
  });

  it("refuses a remote database when NODE_ENV is development or test", () => {
    expect(() => assertSafeDatabase(remote, { NODE_ENV: "development" })).toThrow(/ALLOW_REMOTE_DB/);
    expect(() => assertSafeDatabase(remote, { NODE_ENV: "test" })).toThrow(/local/i);
  });

  it("never prints the password in the error", () => {
    try {
      assertSafeDatabase("postgresql://u:s3cretpw@tokaido.proxy.rlwy.net:17343/railway", { NODE_ENV: "development" });
      throw new Error("should have thrown");
    } catch (e) {
      expect(String((e as Error).message)).not.toContain("s3cretpw");
      expect(String((e as Error).message)).toContain("tokaido.proxy.rlwy.net");
    }
  });

  it("allows a remote database in production, when NODE_ENV is unset (scripts, railway run), or with ALLOW_REMOTE_DB=1", () => {
    expect(() => assertSafeDatabase(remote, { NODE_ENV: "production" })).not.toThrow();
    expect(() => assertSafeDatabase(remote, {})).not.toThrow();
    expect(() => assertSafeDatabase(remote, { NODE_ENV: "development", ALLOW_REMOTE_DB: "1" })).not.toThrow();
  });
});
