// Outbound HTTP helper: a fetch that gives up after `timeoutMs`, including a body that stalls after the headers arrive.
// FPL can hang instead of failing around deadlines; without a timeout the Express handler waiting on it hangs too.

export async function fetchWithTimeout(url: string, timeoutMs = 10_000, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // The signal stays live for the body, so a stalled body is aborted too; the timer is cleared only when the
    // body has been fully read or the request failed.
    const response = await fetch(url, { ...init, signal: controller.signal });
    const clear = () => clearTimeout(timer);
    const originalText = response.text.bind(response);
    const originalJson = response.json.bind(response);
    response.text = async () => {
      try { return await originalText(); } finally { clear(); }
    };
    response.json = async () => {
      try { return await originalJson(); } finally { clear(); }
    };
    return response;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}
