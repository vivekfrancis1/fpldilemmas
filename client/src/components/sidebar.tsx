import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  TrendingUp, 
  RefreshCw, 
  Users, 
  Heart, 
  Calendar, 
  ArrowRightLeft, 
  Crown,
  BarChart3,
  Menu,
  X,
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
  FileText

} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const { isAdmin, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  const isActive = (path: string) => location === path;

  const handleNavItemClick = () => {
    if (isMobile) {
      onToggle(); // Close sidebar on mobile when item is clicked
    }
  };

  const navItems = [
    {
      section: "My FPL",
      items: [
        { path: "/my-dashboard", label: "My Dashboard", icon: BarChart3, description: "Complete FPL overview" },
        { path: "/projected-points", label: "Projected Points", icon: TrendingUp, description: "View projected points for your current team", popular: false },
        { path: "/transfer-planner", label: "Transfer Planner", icon: Target, description: "Plan your transfers and optimize your team", popular: false, new: true, mobileHidden: true }
      ]
    },
    {
      section: "Player Projections", 
      items: [
        { path: "/player-goals-scored-projections", label: "Goals", icon: Trophy, description: "Individual player goal projections", popular: false },
        { path: "/player-assist-projections", label: "Assists", icon: Zap, description: "Individual player assist projections", popular: false },
        { path: "/player-defensive-contributions", label: "Defensive Contributions", icon: Shield, description: "Gameweek table view of defensive contributions", popular: false },
        { path: "/player-saves", label: "Saves", icon: Shield, description: "Goalkeeper saves and penalty save projections", popular: false },
        { path: "/player-bonus-points", label: "Bonus Points", icon: Star, description: "Bonus point projections", popular: false },
        { path: "/player-total-points", label: "Total Points", icon: Target, description: "Complete FPL points projections combining all scoring components", popular: true },
        { path: "/best-freehit-team", label: "Best Freehit Team", icon: Users, description: "Optimal 15-player squad for maximum points with captain selection", popular: false },
        { path: "/best-wildcard-team", label: "Best Wildcard Team", icon: Star, description: "Optimal 15-player squad considering total points across next 6 gameweeks", popular: false }
        // { path: "/defensive-contribution-projections", label: "Defensive Contribution", icon: Shield, description: "Tackles, recoveries, and CBI projections", popular: false },
        // { path: "/player-minutes", label: "Player Minutes", icon: Clock, description: "Expected minutes and points per game", popular: false },
        // { path: "/player-cleansheet-points", label: "Player CS Points", icon: Shield, description: "Expected clean sheet points per gameweek", popular: false }
      ]
    },
    {
      section: "Team Projections", 
      items: [
        { path: "/fixtures", label: "Fixture Difficulty Rating", icon: Calendar, description: "Fixture difficulty analysis", popular: false },
        { path: "/team-goal-projections", label: "Goals Scored", icon: BarChart3, description: "Expected team goals", popular: false },
        { path: "/team-goals-against-projections", label: "Goals Conceded", icon: Shield, description: "Expected goals conceded", popular: false },
        { path: "/team-cs-projections", label: "Clean Sheets", icon: Shield, description: "Clean sheet probabilities", popular: false },
        { path: "/projected-goals-cs", label: "Match Predictions", icon: Target, description: "Projected goals & clean sheets", popular: true },
        { path: "/projected-standings", label: "Standings", icon: Trophy, description: "Final league table projection", popular: false }
      ]
    },
    {
      section: "Top Managers",
      items: [
        { path: "/top25-managers", label: "Top 25 (All Time)", icon: Crown, description: "Elite Fantasy Premier League managers and their performance", popular: false },
        { path: "/top50-managers", label: "Top 50 (Current Season)", icon: Trophy, description: "Current top 50 managers from the overall FPL league", popular: false },
        { path: "/content-creators", label: "Top Content Creators", icon: Users, description: "Track top FPL content creators and influencers", popular: false }
      ]
    },
    {
      section: "STATS",
      items: [
        { path: "/player-statistics", label: "Player Statistics", icon: BarChart3, description: "Comprehensive player data", popular: false },
        { path: "/current-standings", label: "Team Statistics", icon: Trophy, description: "Current league table based on completed matches", popular: false },
        { path: "/results-and-fixtures", label: "Match Statistics", icon: Trophy, description: "Complete Premier League schedule with results", popular: false, mobileHidden: true },
        { path: "/recent-price-changes", label: "Price Changes", icon: RefreshCw, description: "Season price changes", popular: false },
        { path: "/transfer-tracker", label: "Transfer Tracker", icon: BarChart3, description: "Transfer analysis and ownership tracking", popular: false }
      ]
    },
    {
      section: "Analysis Tools", 
      items: [
        // { path: "/league-comparison", label: "League Analysis", icon: Users, description: "Single league analysis", popular: false },
        // { path: "/captain", label: "Captain Choice", icon: Crown, description: "Captain selection", popular: false }
      ]
    },
  ];

  // Admin-only navigation items
  const adminNavItems = [
    {
      section: "Third Party Projection Tools", 
      items: [
        { path: "/openfpl-projections", label: "OpenFPL Player Projections", icon: BarChart3, description: "ML ensemble predictions", popular: false }
      ]
    },
    {
      section: "Admin Tools",
      items: [
        { path: "/admin-content-creators", label: "Content Creator Admin", icon: UserCog, description: "Manage FPL content creators", popular: false },
        { path: "/admin-cache-management", label: "Cache Management", icon: Database, description: "Refresh projection caches", popular: false },
        { path: "/admin-goal-projections", label: "Goal Projections Admin", icon: Settings, description: "Configure goal projection settings", popular: false },
        { path: "/admin-clean-sheet-config", label: "Team Clean Sheet Config", icon: Shield, description: "Configure clean sheet probability calculations", popular: false },
        { path: "/admin-upset-config", label: "Upset Configuration", icon: Settings, description: "Configure upset configuration settings", popular: false },
        { path: "/admin-data-population", label: "Data Population", icon: Database, description: "Populate and manage data", popular: false },
        { path: "/admin-gameweek-cache", label: "Gameweek Cache", icon: RefreshCw, description: "Manage gameweek cache", popular: false }
      ]
    },
    {
      section: "Advanced Player Tools",
      items: [
        { path: "/player-minutes", label: "Player Minutes", icon: Clock, description: "Expected minutes and points per game", popular: false },
        { path: "/player-cleansheet-points", label: "Player CS Points", icon: Shield, description: "Expected clean sheet points per gameweek", popular: false },
        { path: "/player-goals-conceded", label: "Player Goals Conceded", icon: Shield, description: "Goals conceded projections", popular: false },
        { path: "/player-yellow-cards", label: "Player Yellow Cards", icon: Shield, description: "Yellow card projections", popular: false },
        { path: "/player-red-cards", label: "Player Red Cards", icon: Shield, description: "Red card projections", popular: false }
      ]
    },
    {
      section: "Advanced Team Tools", 
      items: [
        { path: "/team-assist-projections", label: "Team Assists", icon: Zap, description: "Expected team assists", popular: false },
        { path: "/goal-share", label: "Goal Share", icon: Target, description: "Player goal share breakdown by team", popular: false },
        { path: "/assist-share", label: "Assist Share", icon: Zap, description: "Player assist share breakdown by team", popular: false },
        { path: "/predicted-scores", label: "Predicted Scores", icon: Target, description: "Match predictions with rounded scores", popular: false }
      ]
    },
    {
      section: "Documentation",
      items: [
        { path: "/projection-docs", label: "Projection Documentation", icon: Book, description: "Comprehensive guide to all projection tools and methodologies", popular: false }
      ]
    }
  ];

  // No filtering needed - all sections visible to all users
  const filteredNavItems = navItems;

  // Combine filtered public and admin navigation items
  const allNavItems = isAdmin ? [...filteredNavItems, ...adminNavItems] : filteredNavItems;

  // Sidebar content component (reused for mobile and desktop)
  const SidebarContent = ({ className = "" }: { className?: string }) => (
    <div className={`h-full bg-fpl-purple text-white overflow-y-auto ${className}`}>
        {/* Header */}
        <div className="p-3 sm:p-4 md:p-6 border-b border-purple-400/20">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 min-w-0 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-fpl-green rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-futbol text-fpl-purple text-xs sm:text-sm"></i>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg font-bold truncate">FPL Dilemmas</h1>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="lg:hidden text-white hover:bg-white/10 p-1 flex-shrink-0"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-2 sm:p-3 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 pb-16 sm:pb-20">
          {allNavItems
            .filter((section) => section.items.length > 0) // Only show sections with visible items
            .map((section) => (
            <div key={section.section} className="space-y-2 sm:space-y-3">
              <h2 className="text-purple-200 text-xs sm:text-xs font-semibold uppercase tracking-wider px-1">
                {section.section}
              </h2>
              <div className="space-y-1">
                {section.items
                  .filter(item => !isMobile || !(item as any).mobileHidden)
                  .map((item) => {
                  const isCurrentPage = isActive(item.path);
                  const Icon = item.icon;
                  
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      onClick={handleNavItemClick}
                    >
                      <div className={`group flex items-center justify-between px-2 sm:px-3 py-2 sm:py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                        isCurrentPage 
                          ? 'bg-white/10 text-white shadow-sm' 
                          : 'text-purple-100 hover:bg-white/5 hover:text-white'
                      }`}>
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isCurrentPage ? 'text-fpl-green' : 'text-purple-300 group-hover:text-purple-200'}`} />
                          <div className="min-w-0">
                            <p className={`text-xs sm:text-sm font-medium truncate ${isCurrentPage ? 'text-white' : 'group-hover:text-white'}`}>
                              {item.label}
                            </p>
                          </div>
                        </div>
                        {(item as any).new && (
                          <Badge variant="secondary" className="bg-green-500 text-white text-xs px-1.5 py-0.5 font-bold flex-shrink-0">
                            NEW
                          </Badge>
                        )}
                        {(item as any).popular && (
                          <Badge variant="secondary" className="bg-gradient-to-r from-green-500 to-green-600 text-white text-[10px] px-1.5 py-0.5 font-semibold rounded-full shadow-sm flex-shrink-0">
                            Popular
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-purple-400/20">
          <div className="text-center">
            <p className="text-xs text-purple-300">
              Data from Fantasy Premier League
            </p>
            <p className="text-xs text-purple-400 mt-1">
              Updated in real-time
            </p>
          </div>
        </div>
    </div>
  );

  // Render mobile sheet or desktop sidebar based on screen size
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetContent 
          side="left" 
          className="p-0 w-80 max-w-[85vw] bg-fpl-purple border-none"
          data-testid="mobile-sidebar-sheet"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar
  return (
    <aside className="w-64 lg:w-80 flex-shrink-0 hidden lg:block" data-testid="desktop-sidebar">
      <SidebarContent className="fixed left-0 top-0 h-full w-64 lg:w-80" />
    </aside>
  );
}