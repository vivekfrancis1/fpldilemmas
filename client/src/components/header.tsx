import { Menu, LogOut, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import RefreshButton from "@/components/refresh-button";

interface HeaderProps {
  onSidebarToggle: () => void;
}

export default function Header({ onSidebarToggle }: HeaderProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      
      // Clear all auth-related queries from cache
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear(); // Clear all cached data for security
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      
      // Navigate to home page after successful logout
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSidebarToggle}
              className="text-fpl-purple hover:bg-fpl-purple/10 p-1 sm:p-2 flex-shrink-0 min-h-[44px] min-w-[44px] touch-manipulation"
              data-testid="button-sidebar-toggle"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-fpl-purple truncate">FPL Dilemmas</h1>
            {!isMobile && (
              <p className="text-xs text-gray-600">FPL made smarter with predictive analytics.</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <RefreshButton />
          {!isLoading && !isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/api/auth/google"}
              className="text-fpl-purple border-fpl-purple hover:bg-fpl-purple/10 min-h-[44px] min-w-[44px] touch-manipulation"
              data-testid="button-login-google"
            >
              <LogIn className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Login with Google</span>}
            </Button>
          )}
          {!isLoading && isAuthenticated && (
            <div className="flex items-center space-x-2">
              {!isMobile && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="truncate max-w-[120px]">{user?.email}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 border-red-600 hover:bg-red-50 min-h-[44px] min-w-[44px] touch-manipulation"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Logout</span>}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
