import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  TrendingUp,
  RefreshCw,
  Users,
  Calendar,
  ArrowRightLeft,
  Crown,
  BarChart3,
  Star,
  Trophy,
  Target,
  Shield,
  Zap,
  Clock,
  Settings,
  Book,
  Database,
  UserCog,
  Activity,
  CalendarRange,
  ChevronDown,
  LogOut,
  LogIn,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import RefreshButton from "@/components/refresh-button";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    section: "My FPL",
    items: [
      { path: "/my-dashboard", label: "My Dashboard", icon: BarChart3 },
      { path: "/projected-points", label: "My Team Projected Points", icon: TrendingUp, adminOnly: true },
      { path: "/team-optimizer", label: "Optimized Lineup", icon: Zap, adminOnly: true },
      { path: "/transfer-recommendations", label: "AI Recommended Transfers", icon: ArrowRightLeft },
      { path: "/transfer-planner", label: "Transfer Planner", icon: Target },
    ],
  },
  {
    section: "Player Projections",
    items: [
      { path: "/player-total-points", label: "Points", icon: Target },
      { path: "/player-goals-scored-projections", label: "Goals", icon: Trophy },
      { path: "/player-assist-projections", label: "Assists", icon: Zap },
      { path: "/player-defensive-contributions", label: "Defensive Contributions", icon: Shield },
      { path: "/player-saves", label: "Saves", icon: Shield },
      { path: "/player-bonus-points", label: "Bonus Points", icon: Star, adminOnly: true },
    ],
  },
  {
    section: "Team Projections",
    items: [
      { path: "/team-goal-projections", label: "Goals Scored", icon: BarChart3 },
      { path: "/team-goals-against-projections", label: "Goals Conceded", icon: Shield },
      { path: "/team-cs-projections", label: "Clean Sheet Odds", icon: Shield },
      { path: "/projected-goals-cs", label: "Match Predictions", icon: Target },
      { path: "/projected-standings", label: "Predicted Standings", icon: Trophy },
    ],
  },
  {
    section: "Popular Tools",
    items: [
      { path: "/fixtures", label: "Fixture Analyzer", icon: Calendar },
      { path: "/results-and-fixtures", label: "Match Results", icon: Trophy },
      { path: "/player-statistics", label: "Player Statistics", icon: BarChart3 },
      { path: "/current-standings", label: "Team Statistics", icon: Trophy },
      { path: "/recent-price-changes", label: "Price Changes", icon: RefreshCw },
      { path: "/transfer-tracker", label: "Transfer Tracker", icon: BarChart3 },
      { path: "/best-freehit-team", label: "Freehit Team", icon: Users },
      { path: "/best-wildcard-team", label: "Wildcard Team", icon: Star },
    ],
  },
  {
    section: "Top Managers",
    items: [
      { path: "/top25-managers", label: "Top 25 (All Time)", icon: Crown },
      { path: "/content-creators", label: "Top Content Creators", icon: Users },
    ],
  },
];

const adminSection: NavSection = {
  section: "Admin",
  items: [
    { path: "/openfpl-projections", label: "OpenFPL Projections", icon: BarChart3 },
    { path: "/projection-accuracy", label: "Projection Accuracy", icon: Target },
    { path: "/admin-content-creators", label: "Content Creator Admin", icon: UserCog },
    { path: "/admin-cache-management", label: "Cache Management", icon: Database },
    { path: "/admin-goal-projections", label: "Goal Projections Admin", icon: Settings },
    { path: "/admin-clean-sheet-config", label: "Clean Sheet Config", icon: Shield },
    { path: "/admin-upset-config", label: "Upset Configuration", icon: Settings },
    { path: "/admin-data-population", label: "Data Population", icon: Database },
    { path: "/admin-gameweek-cache", label: "Gameweek Cache", icon: RefreshCw },
    { path: "/admin-activity-logs", label: "Activity Logs", icon: Activity },
    { path: "/admin-projection-validation", label: "Projection Validation", icon: BarChart3 },
    { path: "/admin-projection-window", label: "Projection Window", icon: CalendarRange },
    { path: "/player-minutes", label: "Player Minutes", icon: Clock },
    { path: "/player-cleansheet-points", label: "Player CS Points", icon: Shield },
    { path: "/player-goals-conceded", label: "Player Goals Conceded", icon: Shield },
    { path: "/player-yellow-cards", label: "Yellow Cards", icon: Shield },
    { path: "/player-red-cards", label: "Red Cards", icon: Shield },
    { path: "/team-assist-projections", label: "Team Assists", icon: Zap },
    { path: "/goal-share", label: "Goal Share", icon: Target },
    { path: "/assist-share", label: "Assist Share", icon: Zap },
    { path: "/predicted-scores", label: "Predicted Scores", icon: Target },
    { path: "/projection-documentation", label: "Documentation", icon: Book },
  ],
};

function NavDropdown({
  section,
  isActive,
  twoCol = false,
}: {
  section: NavSection;
  isActive: boolean;
  twoCol?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative flex-shrink-0 h-full flex items-center"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-2.5 h-full text-sm font-medium transition-colors whitespace-nowrap ${
          isActive
            ? "bg-white/15 text-white"
            : "text-purple-100 hover:bg-white/10 hover:text-white"
        }`}
      >
        {section.section}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 min-w-[180px] ${
            twoCol ? "w-[380px]" : "w-[220px]"
          }`}
        >
          <div className={twoCol ? "grid grid-cols-2 gap-x-1 p-1" : "p-1"}>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-fpl-purple/10 hover:text-fpl-purple cursor-pointer transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-fpl-purple/60" />
                    <span className="truncate">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const isSectionActive = (section: NavSection) =>
    section.items.some((item) => location === item.path);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear();
      toast({ title: "Logged out", description: "You have been logged out successfully" });
      setLocation("/");
    } catch {
      toast({ title: "Logout failed", description: "There was an error logging out", variant: "destructive" });
    }
  };

  const visibleSections = navSections.map((s) => ({
    ...s,
    items: s.items.filter((item) => !item.adminOnly || isAdmin),
  }));

  return (
    <header className="hidden md:flex items-center bg-fpl-purple text-white sticky top-0 z-40 h-12 w-full border-b border-purple-500/30 shadow-sm">
      {/* Logo */}
      <Link href="/" className="flex items-center px-3 mr-4 flex-shrink-0 hover:opacity-80 transition-opacity border-r border-purple-500/30 h-full">
        <span className="text-sm font-bold text-fpl-green whitespace-nowrap">FPL DILEMMAS</span>
      </Link>

      {/* Nav dropdowns — flex-1 so they fill available space */}
      <nav className="flex items-center h-full flex-1 min-w-0">
        {visibleSections.map((section) => (
          <NavDropdown
            key={section.section}
            section={section}
            isActive={isSectionActive(section)}
            twoCol={section.section === "Popular Tools"}
          />
        ))}
        {isAdmin && (
          <NavDropdown
            section={adminSection}
            isActive={adminSection.items.some((i) => location === i.path)}
            twoCol
          />
        )}
      </nav>

      {/* Right side: refresh + auth */}
      <div className="flex items-center gap-1.5 flex-shrink-0 px-3 border-l border-purple-500/30 h-full">
        <RefreshButton className="text-purple-200 hover:text-white" />
        {!isLoading && !isAuthenticated && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/api/auth/google")}
            className="text-fpl-purple border-white bg-white hover:bg-purple-50 text-xs h-7 px-2"
          >
            <LogIn className="h-3.5 w-3.5 mr-1" />
            Login
          </Button>
        )}
        {!isLoading && isAuthenticated && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-purple-200 truncate max-w-[100px] hidden lg:block">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-red-400 border-red-400/50 bg-transparent hover:bg-red-500/10 text-xs h-7 px-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="ml-1 hidden lg:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
