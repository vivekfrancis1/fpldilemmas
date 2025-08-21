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
  Star
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
        { path: "/price-tracker", label: "Price Tracker", icon: RefreshCw, description: "Player price changes", popular: true }
      ]
    },
    {
      section: "My FPL",
      items: [
        { path: "/live-rank", label: "My Live Rank", icon: TrendingUp, description: "Real-time FPL rank", popular: false }
      ]
    },
    {
      section: "Analysis Tools", 
      items: [
        { path: "/league-comparison", label: "League Analysis", icon: Users, description: "Single league analysis", popular: false },
        { path: "/watchlist", label: "Watchlist", icon: Heart, description: "Track favorite players", popular: false },
        { path: "/fixtures", label: "Fixtures", icon: Calendar, description: "Match schedules", popular: false },
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
        } lg:translate-x-0 lg:static lg:z-auto w-80 max-w-[80vw] sm:max-w-80`}
      >
        {/* Header */}
        <div className="p-6 border-b border-purple-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-fpl-green rounded-full flex items-center justify-center">
                <i className="fas fa-futbol text-fpl-purple text-sm"></i>
              </div>
              <div>
                <h1 className="text-lg font-bold">FPL Dilemmas</h1>
                <p className="text-purple-200 text-xs">Analytical tools to beat the deadline blues</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="lg:hidden text-white hover:bg-white/10 p-1"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navItems.map((section) => (
            <div key={section.section}>
              <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3 px-3">
                {section.section === "Most Popular" && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {section.section}
                  </div>
                )}
                {section.section !== "Most Popular" && section.section}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.path}>
                    <Link href={item.path} onClick={() => window.innerWidth < 1024 && onToggle()}>
                      <div
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group cursor-pointer ${
                          isActive(item.path)
                            ? 'bg-fpl-green text-fpl-purple font-medium'
                            : 'text-purple-100 hover:bg-white/10 hover:text-white'
                        }`}
                        data-testid={`sidebar-link-${item.path.slice(1) || 'player-stats'}`}
                      >
                        <item.icon className={`h-5 w-5 ${isActive(item.path) ? 'text-fpl-purple' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.label}</span>
                            {item.popular && (
                              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 h-auto">
                                HOT
                              </Badge>
                            )}
                          </div>
                          <p className={`text-xs ${
                            isActive(item.path) ? 'text-fpl-purple/70' : 'text-purple-300'
                          }`}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
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