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
  Settings
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
      section: "My FPL",
      items: [
        { path: "/", label: "My Live Rank", icon: TrendingUp, description: "Real-time FPL rank", popular: false },
        { path: "/my-team", label: "My Team", icon: Users, description: "View your current team", popular: false },
        { path: "/my-leagues", label: "My Leagues", icon: Trophy, description: "League performance analysis", popular: false }
      ]
    },
    {
      section: "Most Popular",
      items: [
        { path: "/player-statistics", label: "Player Statistics", icon: BarChart3, description: "Comprehensive player data", popular: true },
        { path: "/fixtures", label: "Fixture Analyzer", icon: Calendar, description: "Fixture difficulty analysis", popular: true }
      ]
    },
    {
      section: "Projection Tools", 
      items: [
        { path: "/projected-goals-cs", label: "Match Projections", icon: Target, description: "Projected goals & clean sheets", popular: false },
        { path: "/predicted-scores", label: "Predicted Scores", icon: Target, description: "Match predictions with rounded scores", popular: false },
        { path: "/projected-standings", label: "Projected Standings", icon: Trophy, description: "Final league table projection", popular: false },
        { path: "/team-goal-projections", label: "Team Goals Scored", icon: BarChart3, description: "Expected team goals", popular: false },
        { path: "/team-goals-against-projections", label: "Team Goals Against", icon: Shield, description: "Expected goals conceded", popular: false },
        { path: "/team-assist-projections", label: "Team Assist Projections", icon: Users, description: "Expected team assists", popular: false },
        { path: "/team-cs-projections", label: "Team CS Projections", icon: Shield, description: "Clean sheet probabilities", popular: false },
        { path: "/season-projections", label: "Season Projections", icon: TrendingUp, description: "Season-long goal involvements", popular: false },
        { path: "/openfpl-projections", label: "Open FPL Projections", icon: BarChart3, description: "ML ensemble predictions", popular: false }
      ]
    },
    {
      section: "Analysis Tools", 
      items: [
        { path: "/league-comparison", label: "League Analysis", icon: Users, description: "Single league analysis", popular: false },
        { path: "/price-tracker", label: "Price Tracker", icon: RefreshCw, description: "Player price changes", popular: false },

        // { path: "/captain", label: "Captain Choice", icon: Crown, description: "Captain selection", popular: false }
      ]
    },
    {
      section: "Admin Tools",
      items: [
        // { path: "/admin-goal-projections", label: "Goals Scored", icon: Settings, description: "Team goal projection settings", popular: false }
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
        } lg:translate-x-0 lg:static lg:z-auto w-64 sm:w-72 md:w-80 max-w-[90vw] sm:max-w-[85vw] md:max-w-80 overflow-y-auto`}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 md:p-6 border-b border-purple-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-fpl-green rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-futbol text-fpl-purple text-xs sm:text-sm"></i>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg font-bold truncate">FPL Dilemmas</h1>
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
        <nav className="p-2 sm:p-3 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 pb-16 sm:pb-20">
          {navItems.map((section) => (
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
                        {(item as any).isNew && (
                          <Badge variant="secondary" className="bg-yellow-500 text-black text-xs px-1.5 py-0.5 font-bold flex-shrink-0">
                            New
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