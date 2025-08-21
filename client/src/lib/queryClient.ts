import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
    
    console.log("Fetching URL:", url);
    const res = await fetch(url, {
      credentials: "include",
    });
    
    console.log("Response status:", res.status, "headers:", Object.fromEntries(res.headers));

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log("Query response for", url, "- data length:", Array.isArray(data) ? data.length : 'not array', typeof data);
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
