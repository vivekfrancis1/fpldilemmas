import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Users, 
  Trophy, 
  TrendingUp, 
  Calendar, 
  ArrowUpDown, 
  Eye,
  Target,
  Crown,
  Shield
} from "lucide-react";

const navigation = [
  { name: "Player Statistics", href: "/player-stats", icon: BarChart3 },
  { name: "Live Rank", href: "/live-rank", icon: Trophy },
  { name: "Price Tracker", href: "/price-tracker", icon: TrendingUp },
  { name: "Fixtures", href: "/fixtures", icon: Calendar },
  { name: "Transfers", href: "/transfers", icon: ArrowUpDown },
  { name: "Captain Analysis", href: "/captain", icon: Crown },
  { name: "Watchlist", href: "/watchlist", icon: Eye },
  { name: "League Comparison", href: "/league-comparison", icon: Users },
  { name: "My FPL Team", href: "/fpl-team", icon: Shield },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col bg-background border-r">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <Target className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-primary">FPL Dilemmas</h1>
          <p className="text-xs text-muted-foreground">Beat the deadline blues</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href === "/player-stats" && location === "/");
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <span
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer",
                      isActive && "bg-accent text-accent-foreground font-medium"
                    )}
                    data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}