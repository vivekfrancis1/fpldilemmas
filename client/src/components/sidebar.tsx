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
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  const navItems = [
    {
      section: "Most Popular",
      items: [
        { path: "/", label: "Player Statistics", icon: BarChart3, description: "Comprehensive player data", popular: true },
        { path: "/fixtures", label: "Fixtures", icon: Calendar, description: "Fixture difficulty analysis", popular: true }
      ]
    },
    {
      section: "My FPL",
      items: [
        { path: "/live-rank", label: "My Live Rank", icon: TrendingUp, description: "Real-time FPL rank", popular: false },
        { path: "/my-team", label: "My Team", icon: Users, description: "View your current team", popular: false },
        { path: "/my-leagues", label: "My Leagues", icon: Trophy, description: "League performance analysis", popular: false }
      ]
    },
    {
      section: "Projection Tools", 
      items: [
        { path: "/results-projections", label: "Match Odds", icon: Target, description: "Projected goals & clean sheets", popular: false },
        { path: "/team-goal-projections", label: "Team Goal Projections", icon: BarChart3, description: "Expected team goals", popular: false },
        { path: "/team-cs-projections", label: "Team CS Projections", icon: Shield, description: "Clean sheet probabilities", popular: false },
        { path: "/goal-share", label: "Goal Share", icon: Target, description: "Player goal involvement %", popular: false },
        { path: "/assist-share", label: "Assist Share", icon: Zap, description: "Player assist involvement %", popular: false },
        { path: "/player-minutes", label: "Player Minutes", icon: Users, description: "Expected playing time", popular: false },
        { path: "/player-projected-goals", label: "Player Projected Goals", icon: Target, description: "Expected goals by player", popular: false },
        { path: "/player-expected-assists", label: "Player Expected Assists", icon: Zap, description: "Expected assists by player", popular: false },
        { path: "/player-expected-bonus", label: "Player Expected Bonus", icon: Award, description: "Expected bonus points by player", popular: false },
        { path: "/player-expected-cleansheets", label: "Player Expected Clean Sheets", icon: Shield, description: "Expected clean sheets (GK/DEF/MID)", popular: false },
        { path: "/player-defensive-contributions", label: "Player Defensive Contributions", icon: Shield, description: "Defensive threshold probabilities", popular: false }
      ]
    },
    {
      section: "Analysis Tools", 
      items: [
        { path: "/league-comparison", label: "League Analysis", icon: Users, description: "Single league analysis", popular: false },
        { path: "/price-tracker", label: "Price Tracker", icon: RefreshCw, description: "Player price changes", popular: false },
        { path: "/watchlist", label: "Watchlist", icon: Heart, description: "Track favorite players", popular: false },
        { path: "/transfers", label: "Transfers", icon: ArrowRightLeft, description: "Transfer planning", popular: false },
        { path: "/captain", label: "Captain Choice", icon: Crown, description: "Captain selection", popular: false }
      ]
    }
  ];

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
        } lg:translate-x-0 lg:static lg:z-auto w-72 sm:w-80 max-w-[85vw] sm:max-w-80 overflow-y-auto`}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-purple-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-fpl-green rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-futbol text-fpl-purple text-xs sm:text-sm"></i>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold truncate">FPL Dilemmas</h1>
                <p className="text-purple-200 text-xs hidden sm:block">Analytical tools to beat the deadline blues</p>
              </div>
            </div>
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
        <nav className="p-3 sm:p-6 space-y-4 sm:space-y-6 pb-20">
          {navItems.map((section) => (
            <div key={section.section} className="space-y-2 sm:space-y-3">
              <h2 className="text-purple-200 text-xs font-semibold uppercase tracking-wider px-1">
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