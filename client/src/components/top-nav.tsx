import ThemeToggle from "@/components/theme-toggle";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  TrendingUp,
  RefreshCw,
  Users,
  Calendar,
  ArrowRightLeft,
  Crown,
  ChartScatter,
  ImagePlus,
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
  UserPlus,
  Coffee,
  GitCompareArrows,
  ClipboardCheck,
  AlarmClock,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { PRIMARY_NAV_ITEMS } from "@/components/primary-nav-items";
import RefreshButton from "@/components/refresh-button";
import InstallAppButton from "@/components/install-app-button";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavSection {
  section: string;
  /** Sections sharing a `group` render as columns of one dropdown, labelled with the group name. */
  group?: string;
  /** Column heading inside a grouped dropdown (defaults to the section name). */
  heading?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    section: "Statistics",
    items: [
      { path: "/player-statistics", label: "Player Stats", icon: BarChart3 },
      { path: "/team-statistics", label: "Team Stats", icon: Trophy },
      { path: "/results-and-fixtures", label: "Match Stats", icon: Trophy },
    ],
  },
  {
    section: "Team Projections",
    group: "Projections",
    heading: "Team",
    items: [
      { path: "/team-goal-projections", label: "Goals Scored", icon: BarChart3 },
      { path: "/team-goals-against-projections", label: "Goals Conceded", icon: Shield },
      { path: "/team-cs-projections", label: "Clean Sheet Odds", icon: Shield },
      { path: "/projected-standings", label: "Predicted Standings", icon: Trophy },
    ],
  },
  {
    section: "Player Projections",
    group: "Projections",
    heading: "Player",
    items: [
      { path: "/player-goals-scored-projections", label: "Goals", icon: Trophy },
      { path: "/player-assist-projections", label: "Assists", icon: Zap },
      { path: "/player-defensive-contributions", label: "Defensive Contributions", icon: Shield },
      { path: "/player-saves", label: "Saves", icon: Shield },
      { path: "/player-bonus-points", label: "Bonus Points", icon: Star, adminOnly: true },
      { path: "/player-minutes", label: "Minutes", icon: Clock, adminOnly: true },
    ],
  },
  {
    section: "Popular Tools",
    group: "Tools",
    heading: "Popular",
    items: [
      { path: "/deadline-brief", label: "Pre-deadline Brief", icon: AlarmClock },
      { path: "/compare", label: "Compare Players", icon: GitCompareArrows },
      { path: "/captaincy-matrix", label: "Captaincy Matrix", icon: Crown },
      { path: "/transfer-tracker", label: "Transfer Tracker", icon: BarChart3 },
      { path: "/best-freehit-team", label: "Freehit Team", icon: Users },
      { path: "/best-wildcard-team", label: "Wildcard Team", icon: Star },
    ],
  },
  {
    section: "Visual Tools",
    items: [
      { path: "/player-plot", label: "Player Plot", icon: ChartScatter },
      { path: "/graphics", label: "Graphics Maker", icon: ImagePlus },
    ],
  },
  {
    section: "Top Managers",
    items: [
      { path: "/top-managers", label: "All Time Top 100", icon: Crown },
      { path: "/elite-64", label: "Elite 64", icon: Crown },
      { path: "/analytics-elite-64", label: "Analytics Elite 64", icon: Crown },
      { path: "/content-creators", label: "Content Creators", icon: Users },
      { path: "/template-team", label: "Template Team", icon: Users },
    ],
  },
  {
    section: "My FPL",
    items: [
      { path: "/my-dashboard", label: "My Dashboard", icon: BarChart3 },
      { path: "/rate-my-team", label: "Rate My Team", icon: ClipboardCheck },
      { path: "/hindsight", label: "Hindsight", icon: History },
      { path: "/league-ownership", label: "League Ownership", icon: Users },
      { path: "/projected-points", label: "Projected Points", icon: TrendingUp, adminOnly: true },
      { path: "/team-optimizer", label: "Optimized Lineup", icon: Zap, adminOnly: true },
      { path: "/transfer-recommendations", label: "Recommended Transfers", icon: ArrowRightLeft, adminOnly: true },
      { path: "/transfer-planner", label: "Transfer Planner", icon: Target },
    ],
  },
];

const adminSection: NavSection = {
  section: "Admin",
  items: [
    { path: "/pick-team", label: "Pick Team", icon: UserPlus },
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
    { path: "/admin-site-settings", label: "Site Settings", icon: Coffee },
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
  label,
  columns,
  isActive,
  twoCol = false,
}: {
  label: string;
  columns: NavSection[];
  isActive: boolean;
  twoCol?: boolean;
}) {
  const multiColumn = columns.length > 1;
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
        className={`flex items-center gap-0.5 xl:gap-1 px-1 lg:px-1.5 xl:px-2 h-full text-[12px] lg:text-[13px] xl:text-sm font-medium transition-colors whitespace-nowrap ${
          isActive
            ? "bg-white/15 text-white"
            : "text-purple-100 hover:bg-white/10 hover:text-white"
        }`}
      >
        {label}
        <ChevronDown
          className={`hidden lg:block h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 min-w-[180px] ${
            multiColumn ? "w-[440px]" : twoCol ? "w-[380px]" : "w-[220px]"
          }`}
        >
          <div className={multiColumn ? "grid grid-cols-2 gap-x-1 p-1" : twoCol ? "grid grid-cols-2 gap-x-1 p-1" : "p-1"}>
            {columns.map((col) => (
              <div key={col.section} className={multiColumn ? undefined : "contents"}>
                {multiColumn && (
                  <div className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {col.heading ?? col.section}
                  </div>
                )}
                {col.items.map((item) => {
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
            ))}
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

  const visibleSections = navSections
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((s) => s.items.length > 0);

  // One dropdown per section, except sections sharing a `group`, which become columns of one dropdown.
  const dropdowns: { label: string; columns: NavSection[] }[] = [];
  for (const s of visibleSections) {
    const label = s.group ?? s.section;
    const existing = dropdowns.find((d) => d.label === label);
    if (existing) existing.columns.push(s);
    else dropdowns.push({ label, columns: [s] });
  }

  return (
    <header className="hidden md:flex items-center bg-fpl-purple text-white sticky top-0 z-40 h-12 w-full border-b border-purple-500/30 shadow-sm">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-2 lg:px-3 mr-1 lg:mr-2 flex-shrink-0 hover:opacity-80 transition-opacity border-r border-purple-500/30 h-full">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-purple-600 to-indigo-600 text-[13px] leading-none flex-shrink-0">
          ⚽
        </span>
        <span className="hidden 2xl:inline text-sm font-bold text-white whitespace-nowrap">FPL DILEMMAS</span>
      </Link>

      {/* Nav dropdowns — flex-1 so they fill available space */}
      <nav className="flex items-center h-full flex-1 min-w-0">
        {/* Primary tabs: same four as the mobile bottom bar */}
        {PRIMARY_NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match.some((m) => location.startsWith(m));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-1 lg:px-1.5 xl:px-2 h-full text-[12px] lg:text-[13px] xl:text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
                active ? "bg-white/15 text-white" : "text-white hover:bg-white/10"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-3.5 w-3.5 text-fpl-green hidden xl:block" />
              {label}
            </Link>
          );
        })}
        <span className="h-5 w-px bg-purple-500/40 mx-1 flex-shrink-0" aria-hidden />
        {dropdowns.map((d) => (
          <NavDropdown
            key={d.label}
            label={d.label}
            columns={d.columns}
            isActive={d.columns.some(isSectionActive)}
          />
        ))}
        {isAdmin && (
          <NavDropdown
            label={adminSection.section}
            columns={[adminSection]}
            isActive={adminSection.items.some((i) => location === i.path)}
            twoCol
          />
        )}
      </nav>

      {/* Right side: refresh + auth */}
      <div className="flex items-center gap-1 lg:gap-1.5 flex-shrink-0 px-2 lg:px-3 border-l border-purple-500/30 h-full">
        <ThemeToggle className="text-purple-200 hover:text-white" />
        <RefreshButton className="text-purple-200 hover:text-white" labelClassName="hidden 2xl:inline" />
        <InstallAppButton className="text-purple-200 hover:text-white" />
        {!isLoading && !isAuthenticated && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/api/auth/google")}
            aria-label="Login"
            className="text-fpl-purple border-white bg-white hover:bg-purple-50 text-xs h-7 px-2"
          >
            <LogIn className="h-3.5 w-3.5 lg:mr-1" />
            <span className="hidden lg:inline">Login</span>
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
