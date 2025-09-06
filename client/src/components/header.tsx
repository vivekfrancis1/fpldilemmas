import { Menu, LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface HeaderProps {
  onSidebarToggle: () => void;
}

export default function Header({ onSidebarToggle }: HeaderProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error logging out",
        variant: "destructive",
      });
    }
  };

  const handleLogin = () => {
    setLocation("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="text-fpl-purple hover:bg-fpl-purple/10 p-1 sm:p-2 flex-shrink-0 lg:hidden"
            data-testid="button-sidebar-toggle"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-fpl-purple truncate">FPL Dilemmas</h1>
            <p className="text-xs text-gray-600 hidden sm:block">Advanced FPL Analytics Platform</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>{user?.email}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:ml-2 sm:inline">Logout</span>
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogin}
                  className="text-fpl-purple border-fpl-purple hover:bg-fpl-purple/10"
                  data-testid="button-login"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:ml-2 sm:inline">Login</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
