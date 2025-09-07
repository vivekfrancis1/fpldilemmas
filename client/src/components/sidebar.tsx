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
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const { isAdmin } = useAuth();

  const isActive = (path: string) => location === path;

  const navItems = [
    {
      section: "My FPL",
      items: [
        { path: "/my-dashboard", label: "My Dashboard", icon: BarChart3, description: "Complete FPL overview", popular: true }
      ]
    },
    {
      section: "Most Popular",
      items: [
        { path: "/player-statistics", label: "Player Statistics", icon: BarChart3, description: "Comprehensive player data", popular: false },
        { path: "/fixtures", label: "Fixture Difficulty Rating", icon: Calendar, description: "Fixture difficulty analysis", popular: false },
        { path: "/recent-price-changes", label: "Recent Price Changes", icon: RefreshCw, description: "Season price changes", popular: false },
        { path: "/predicted-price-changes", label: "Transfer Tracker", icon: BarChart3, description: "Transfer analysis and ownership tracking", popular: false },
        { path: "/content-creators", label: "FPL Content Creators", icon: Users, description: "Track top FPL content creators and influencers", popular: false, new: true }
      ]
    },
    {
      section: "Team Projections", 
      items: [
        { path: "/projected-goals-cs", label: "Goals and CS - Next GW", icon: Target, description: "Projected goals & clean sheets", popular: false },
        { path: "/team-goal-projections", label: "Goals Scored", icon: BarChart3, description: "Expected team goals", popular: false },
        { path: "/team-cs-projections", label: "Clean Sheets", icon: Shield, description: "Clean sheet probabilities", popular: false },
        { path: "/team-goals-against-projections", label: "Goals Conceded", icon: Shield, description: "Expected goals conceded", popular: false },
        { path: "/projected-standings", label: "Standings", icon: Trophy, description: "Final league table projection", popular: false }
      ]
    },
    ...(isAdmin ? [{
      section: "Player Projections", 
      items: [
        { path: "/player-goals-scored-projections", label: "Player Goals Scored", icon: Trophy, description: "Individual player goal projections", popular: false },
        { path: "/player-assist-projections", label: "Player Assists", icon: Zap, description: "Individual player assist projections", popular: false },
        { path: "/player-total-points", label: "Player Total Points", icon: Target, description: "Complete FPL points projections combining all scoring components", popular: true }
        // { path: "/defensive-contribution-projections", label: "Defensive Contribution", icon: Shield, description: "Tackles, recoveries, and CBI projections", popular: false },
        // { path: "/player-minutes", label: "Player Minutes", icon: Clock, description: "Expected minutes and points per game", popular: false },
        // { path: "/player-cleansheet-points", label: "Player CS Points", icon: Shield, description: "Expected clean sheet points per gameweek", popular: false }
      ]
    }] : []),
    {
      section: "Third Party Projection Tools", 
      items: [
        { path: "/openfpl-projections", label: "OpenFPL Player Projections", icon: BarChart3, description: "ML ensemble predictions", popular: false }
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
        { path: "/player-red-cards", label: "Player Red Cards", icon: Shield, description: "Red card projections", popular: false },
        { path: "/player-bonus-points", label: "Player Bonus Points", icon: Star, description: "Bonus point projections", popular: false },
        { path: "/player-defensive-contributions", label: "Player Defensive Contributions", icon: Shield, description: "Gameweek table view of defensive contributions", popular: false },
        { path: "/player-saves", label: "Goalkeeper Saves", icon: Shield, description: "Goalkeeper saves and penalty save projections", popular: false },
        { path: "/defensive-contribution-projections", label: "Defensive Contributions", icon: Shield, description: "Tackles, recoveries, and CBI projections", popular: false }
      ]
    },
    {
      section: "Advanced Team Tools", 
      items: [
        { path: "/goal-share", label: "Goal Share", icon: Target, description: "Player goal share breakdown by team", popular: false },
        { path: "/assist-share", label: "Assist Share", icon: Zap, description: "Player assist share breakdown by team", popular: false },
        { path: "/predicted-scores", label: "Predicted Scores", icon: Target, description: "Match predictions with rounded scores", popular: false },
        { path: "/results-projections", label: "Results Projections", icon: Calendar, description: "Mathematical match predictions without variance", popular: false },
        { path: "/team-goals-spread-betting", label: "Team Goals Spread Betting", icon: Target, description: "Spread betting analysis", popular: false },
        { path: "/season-projections", label: "Season Projections", icon: Trophy, description: "Full season projections", popular: false }
      ]
    },
    {
      section: "Documentation",
      items: [
        { path: "/projection-docs", label: "Projection Documentation", icon: Book, description: "Comprehensive guide to all projection tools and methodologies", popular: false }
      ]
    }
  ];

  // Combine public and admin navigation items
  const allNavItems = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full bg-fpl-purple text-white z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto w-64 sm:w-72 md:w-80 max-w-[90vw] sm:max-w-[85vw] md:max-w-80 overflow-y-auto`}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 md:p-6 border-b border-purple-400/20">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 min-w-0 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-fpl-green rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-futbol text-fpl-purple text-xs sm:text-sm"></i>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg font-bold truncate">FPL Dilemmas</h1>
                <p className="text-purple-200 text-xs hidden sm:block">Advanced FPL Analytics Platform</p>
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
                {section.items.map((item) => {
                  const isCurrentPage = isActive(item.path);
                  const Icon = item.icon;
                  
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      onClick={() => onToggle()}
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
                            <p className={`text-xs hidden sm:block ${isCurrentPage ? 'text-purple-200' : 'text-purple-400 group-hover:text-purple-300'}`}>
                              {item.description}
                            </p>
                          </div>
                        </div>
                        {item.popular && (
                          <Badge variant="secondary" className="bg-fpl-green/20 text-fpl-green text-xs hidden sm:inline-flex flex-shrink-0">
                            Popular
                          </Badge>
                        )}
                        {(item as any).new && (
                          <Badge variant="secondary" className="bg-green-500 text-white text-xs px-1.5 py-0.5 font-bold flex-shrink-0">
                            NEW
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
      </aside>
    </>
  );
}