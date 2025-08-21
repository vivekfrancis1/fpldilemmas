import { useQuery } from "@tanstack/react-query";

export interface AuthUser {
  id: string;
  provider: 'google' | 'facebook' | 'apple';
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  fplTeamId?: number;
  fplTeamName?: string;
}

export function useAuth() {
  const sessionId = localStorage.getItem('fpl-session-id');
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async (): Promise<AuthUser | null> => {
      if (!sessionId) {
        return null;
      }

      const response = await fetch('/api/auth/user', {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('fpl-session-id');
          return null;
        }
        throw new Error('Failed to fetch user');
      }

      return response.json();
    },
    retry: false,
    enabled: !!sessionId,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !!sessionId,
    sessionId,
    error,
  };
}

export function useLogout() {
  return async () => {
    const sessionId = localStorage.getItem('fpl-session-id');
    if (sessionId) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'X-Session-ID': sessionId,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    localStorage.removeItem('fpl-session-id');
    window.location.href = '/';
  };
}