import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Try to parse JSON error response for a user-friendly message
    let errorMessage = text;
    try {
      const json = JSON.parse(text);
      if (json.error) {
        errorMessage = json.error;
      } else if (json.message) {
        errorMessage = json.message;
      }
    } catch {
      // Not JSON, use text as-is
    }
    
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle 401 errors by clearing stale auth cache — but not for /api/fpl/* endpoints, which use
  // a separate auth concept (the user's *FPL connection* token, not their app login session). A
  // 401 there means "your FPL connection has expired," not "you're logged out of the app," but
  // this used to clear the app-auth cache unconditionally anyway, forcing every useAuth()
  // consumer to refetch. Since the refetched user record still carries the same stale
  // fplManagerId, pages that derive "is this the user's own team" from that field would
  // re-select the authenticated endpoint again, hit the same 401, and repeat — an infinite loop,
  // visible as constant flicker on My FPL pages once a user's FPL connection expired.
  if (res.status === 401 && !url.startsWith("/api/fpl/")) {
    queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
    queryClient.removeQueries({ queryKey: ["/api/fpl/status"] });
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url: string;
    if (Array.isArray(queryKey) && queryKey.length > 1) {
      // Handle parameterized URLs like ["/api/players/historical", "2023/24"]
      const [baseUrl, ...params] = queryKey;
      if (params.length > 0) {
        url = `${baseUrl}/${params.map(p => encodeURIComponent(p as string)).join('/')}`;
      } else {
        url = baseUrl as string;
      }
    } else {
      url = queryKey.join("/") as string;
    }
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });

      // Handle 401 errors - just return null, don't clear cache
      if (res.status === 401) {
        if (unauthorizedBehavior === "returnNull") {
          console.log("🔐 Query returned 401, returning null for:", url);
          return null as any;
        }
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error("🔥 Query error for", url, ":", error);
      throw error;
    }
  };

// True for a raw network-level failure (fetch() itself throwing — dropped connection, DNS
// hiccup, or a brief window where the server is mid-restart during a deploy) as opposed to an
// HTTP error response (404, 500, etc.), which getQueryFn/apiRequest format as "<status>: <msg>".
export function isNetworkLevelError(error: unknown): boolean {
  return error instanceof Error && /failed to fetch|networkerror|load failed/i.test(error.message);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - reduce from Infinity for fresher data
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
      // Only retry genuine network-level failures (a real HTTP error response like "404:
      // Manager not found" retrying pointlessly would just delay showing the correct message).
      // Up to 2 retries gives a transient blip — e.g. a request that lands during the few-second
      // window a deploy briefly restarts the server — a real chance to quietly succeed instead
      // of surfacing an error at all.
      retry: (failureCount, error) => isNetworkLevelError(error) && failureCount < 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: false,
    },
  },
});
