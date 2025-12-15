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

  // Handle 401 errors by clearing stale auth cache
  if (res.status === 401) {
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - reduce from Infinity for fresher data
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
      retry: 1, // Allow 1 retry for network issues
    },
    mutations: {
      retry: false,
    },
  },
});
