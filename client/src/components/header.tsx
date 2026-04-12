import { Menu, LogOut, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import RefreshButton from "@/components/refresh-button";
import TopNav from "@/components/top-nav";

interface HeaderProps {
  onSidebarToggle: () => void;
}

export default function Header({ onSidebarToggle }: HeaderProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
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
    <>
      {/* Desktop top navbar */}
      <TopNav />

      {/* Mobile header bar — hamburger + logo + auth */}
      <header className="md:hidden bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center space-x-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSidebarToggle}
              className="text-fpl-purple hover:bg-fpl-purple/10 p-1 flex-shrink-0 min-h-[44px] min-w-[44px] touch-manipulation"
              data-testid="button-sidebar-toggle"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-sm font-bold text-fpl-purple truncate">FPL Dilemmas</h1>
          </div>

          <div className="flex items-center space-x-2">
            <RefreshButton />
            {!isLoading && !isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/api/auth/google")}
                className="text-fpl-purple border-fpl-purple hover:bg-fpl-purple/10 min-h-[44px] min-w-[44px] touch-manipulation"
                data-testid="button-login-google"
              >
                <LogIn className="h-4 w-4" />
              </Button>
            )}
            {!isLoading && isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 border-red-600 hover:bg-red-50 min-h-[44px] min-w-[44px] touch-manipulation"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
