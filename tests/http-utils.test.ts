import { describe, it, expect, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { fetchWithTimeout } from "../server/http-utils";

const servers: http.Server[] = [];
const listen = (handler: http.RequestListener) =>
  new Promise<string>((resolve) => {
    const s = http.createServer(handler).listen(0, "127.0.0.1", () => {
      servers.push(s);
      resolve(`http://127.0.0.1:${(s.address() as AddressInfo).port}`);
    });
  });
afterAll(() => Promise.all(servers.map((s) => new Promise((r) => (s.closeAllConnections?.(), s.close(r))))));

describe("fetchWithTimeout", () => {
  it("returns the response when the server answers in time", async () => {
    const url = await listen((_req, res) => res.end("ok"));
    const r = await fetchWithTimeout(url, 1000);
    expect(await r.text()).toBe("ok");
  });

  it("aborts a response that never arrives, close to the timeout", async () => {
    const url = await listen(() => undefined); // accepts the request and never answers
    const start = Date.now();
    await expect(fetchWithTimeout(url, 200)).rejects.toThrow();
    expect(Date.now() - start).toBeLessThan(1500);
  });

  it("also aborts when headers arrive but the body stalls", async () => {
    const url = await listen((_req, res) => {
      res.writeHead(200);
      res.write("partial");
    });
    const r = await fetchWithTimeout(url, 300);
    await expect(r.text()).rejects.toThrow();
  });

  it("passes headers through", async () => {
    const url = await listen((req, res) => res.end(String(req.headers["x-test"])));
    const r = await fetchWithTimeout(url, 1000, { headers: { "x-test": "yes" } });
    expect(await r.text()).toBe("yes");
  });
});
