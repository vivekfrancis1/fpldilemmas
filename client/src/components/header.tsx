import { Menu, X, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location === path;

  return (
    <header className="bg-fpl-purple text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer">
              <div className="w-10 h-10 bg-fpl-green rounded-full flex items-center justify-center">
                <i className="fas fa-futbol text-fpl-purple text-xl"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-site-title">FPL Dilemmas</h1>
                <p className="text-purple-200 text-sm" data-testid="text-site-subtitle">Analytical tools to beat the deadline blues</p>
              </div>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center space-x-1">
            <Link href="/" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/") ? "bg-fpl-green text-fpl-purple" : "text-purple-200 hover:text-white hover:bg-white/10"}`} data-testid="link-home">
              Home
            </Link>
            
            {/* Popular Tools */}
            <div className="flex items-center space-x-1 px-2">
              <div className="w-px h-6 bg-purple-400 opacity-50"></div>
              <Link href="/live-rank" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/live-rank") ? "bg-fpl-green text-fpl-purple" : "text-purple-200 hover:text-white hover:bg-white/10"}`} data-testid="link-live-rank">
                Live Rank
              </Link>
              <Link href="/price-tracker" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/price-tracker") ? "bg-fpl-green text-fpl-purple" : "text-purple-200 hover:text-white hover:bg-white/10"}`} data-testid="link-price-tracker">
                Price Tracker
              </Link>
              <div className="w-px h-6 bg-purple-400 opacity-50"></div>
            </div>

            {/* Other Tools */}
            <Link href="/league-comparison" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/league-comparison") ? "bg-fpl-green text-fpl-purple" : "text-purple-200 hover:text-white hover:bg-white/10"}`} data-testid="link-league-comparison">
              League Analysis
            </Link>
            <Link href="/watchlist" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/watchlist") ? "bg-fpl-green text-fpl-purple" : "text-purple-200 hover:text-white hover:bg-white/10"}`} data-testid="link-watchlist">
              Watchlist
            </Link>
            <Link href="/fixtures" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/fixtures") ? "bg-fpl-green text-fpl-purple" : "text-purple-200 hover:text-white hover:bg-white/10"}`} data-testid="link-fixtures">
              Fixtures
            </Link>
            <Link href="/transfers" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/transfers") ? "bg-fpl-green text-fpl-purple" : "text-purple-200 hover:text-white hover:bg-white/10"}`} data-testid="link-transfers">
              Transfers
            </Link>
            <Link href="/captain" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/captain") ? "bg-fpl-green text-fpl-purple" : "text-purple-200 hover:text-white hover:bg-white/10"}`} data-testid="link-captain">
              Captain
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/10 p-2"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border-gray-200 shadow-lg">
                <DropdownMenuItem asChild>
                  <Link href="/" className="w-full cursor-pointer" data-testid="mobile-link-home">
                    Home
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Most Popular
                </DropdownMenuLabel>
                
                <DropdownMenuItem asChild>
                  <Link href="/live-rank" className="w-full cursor-pointer" data-testid="mobile-link-live-rank">
                    Live Rank Tracker
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/price-tracker" className="w-full cursor-pointer" data-testid="mobile-link-price-tracker">
                    Price Tracker
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  All Tools
                </DropdownMenuLabel>
                
                <DropdownMenuItem asChild>
                  <Link href="/league-comparison" className="w-full cursor-pointer" data-testid="mobile-link-league-comparison">
                    League Analysis
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/watchlist" className="w-full cursor-pointer" data-testid="mobile-link-watchlist">
                    Watchlist
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/fixtures" className="w-full cursor-pointer" data-testid="mobile-link-fixtures">
                    Fixtures
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/transfers" className="w-full cursor-pointer" data-testid="mobile-link-transfers">
                    Transfers
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/captain" className="w-full cursor-pointer" data-testid="mobile-link-captain">
                    Captain
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
