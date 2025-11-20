import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export function useAuth() {
  const queryResult = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const { data: user, isLoading, isPending, isFetching, status } = queryResult;

  console.log("🔍 useAuth query state:", { 
    user, 
    isLoading, 
    isPending, 
    isFetching, 
    status,
    hasData: !!user 
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isLoading,
    isAdmin: user?.role === 'admin',
  };
}