import { Menu } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Header() {
  const [location] = useLocation();

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
                <p className="text-purple-200 text-sm" data-testid="text-site-subtitle">Smart decisions for fantasy success</p>
              </div>
            </div>
          </Link>
          <nav className="hidden md:flex space-x-6">
            <Link href="/" className={`${isActive("/") ? "text-white border-b-2 border-fpl-green" : "text-purple-200 hover:text-white"} transition-colors font-medium`} data-testid="link-player-stats">
              Player Stats
            </Link>
            <Link href="/fixtures" className={`${isActive("/fixtures") ? "text-white border-b-2 border-fpl-green" : "text-purple-200 hover:text-white"} transition-colors font-medium`} data-testid="link-fixtures">
              Fixtures
            </Link>
            <Link href="/transfers" className={`${isActive("/transfers") ? "text-white border-b-2 border-fpl-green" : "text-purple-200 hover:text-white"} transition-colors font-medium`} data-testid="link-transfers">
              Transfers
            </Link>
            <Link href="/captain" className={`${isActive("/captain") ? "text-white border-b-2 border-fpl-green" : "text-purple-200 hover:text-white"} transition-colors font-medium`} data-testid="link-captain">
              Captain
            </Link>
            <Link href="/watchlist" className={`${isActive("/watchlist") ? "text-white border-b-2 border-fpl-green" : "text-purple-200 hover:text-white"} transition-colors font-medium`} data-testid="link-watchlist">
              Watchlist
            </Link>
            <Link href="/live-rank" className={`${isActive("/live-rank") ? "text-white border-b-2 border-fpl-green" : "text-purple-200 hover:text-white"} transition-colors font-medium`} data-testid="link-live-rank">
              Live Rank
            </Link>
          </nav>
          <button className="md:hidden text-white" data-testid="button-mobile-menu">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
