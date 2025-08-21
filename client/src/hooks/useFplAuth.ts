import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { FplUser } from "@shared/fpl-auth-schema";

interface FplAuthStatus {
  authenticated: boolean;
  user: FplUser | null;
}

export function useFplAuth() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Custom query function for FPL endpoints
  const fplQueryFn = async ({ queryKey }: { queryKey: readonly unknown[] }) => {
    const url = queryKey[0] as string;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  };

  // Check authentication status
  const { data: authStatus, isLoading } = useQuery<FplAuthStatus>({
    queryKey: ["/api/fpl/status"],
    queryFn: fplQueryFn,
    enabled: true,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest('/api/fpl/login', 'POST', credentials);
      return response;
    },
    onSuccess: (data: any) => {
      if (data.success && data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('fpl-session-id', data.sessionId);
        
        // Invalidate and refetch auth status
        queryClient.invalidateQueries({ queryKey: ["/api/fpl/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/fpl/team"] });
      }
    },
  });

  // Logout mutation  
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/fpl/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSessionId(null);
      localStorage.removeItem('fpl-session-id');
      
      // Clear all FPL-related cache
      queryClient.removeQueries({ queryKey: ["/api/fpl"] });
    },
  });

  // Load session ID from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('fpl-session-id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  return {
    // Auth state
    isAuthenticated: authStatus?.authenticated || false,
    user: authStatus?.user || null,
    isLoading: isLoading,
    sessionId,

    // Login/logout actions
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    
    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    
    // Utilities
    clearError: () => {
      loginMutation.reset();
      logoutMutation.reset();
    },
  };
}