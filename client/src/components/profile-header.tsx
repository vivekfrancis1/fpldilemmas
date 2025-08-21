import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { User, LogOut, Shield } from "lucide-react";
import { useLocation } from "wouter";

export function ProfileHeader() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const logout = useLogout();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <header className="border-b bg-background px-4 md:px-6 py-3">
        <div className="flex items-center justify-end">
          <div className="animate-pulse">
            <div className="h-8 w-8 bg-muted rounded-full"></div>
          </div>
        </div>
      </header>
    );
  }

  if (!isAuthenticated) {
    return (
      <header className="border-b bg-background px-4 md:px-6 py-3">
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/auth/login")}
            className="gap-2"
          >
            <User className="h-4 w-4" />
            Login
          </Button>
        </div>
      </header>
    );
  }

  const userInitials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || user?.provider?.[0]?.toUpperCase() || 'U';
  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.email || 'User';

  return (
    <header className="border-b bg-background px-4 md:px-6 py-3">
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-auto p-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImage} alt={displayName} />
                <AvatarFallback className="text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium">{displayName}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {user?.provider} • {user?.fplTeamId ? 'FPL Connected' : 'No Team'}
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={() => navigate("/fpl-team")}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              My FPL Team
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={logout}
              className="gap-2 text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}