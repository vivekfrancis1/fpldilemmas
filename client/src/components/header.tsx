import { Menu } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-fpl-purple text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-fpl-green rounded-full flex items-center justify-center">
              <i className="fas fa-futbol text-fpl-purple text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-site-title">FPL Manager Tools</h1>
              <p className="text-purple-200 text-sm" data-testid="text-site-subtitle">Smart decisions for fantasy success</p>
            </div>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#" className="text-white hover:text-fpl-green transition-colors font-medium border-b-2 border-fpl-green" data-testid="link-player-stats">
              Player Stats
            </a>
            <a href="#" className="text-purple-200 hover:text-white transition-colors font-medium" data-testid="link-fixtures">
              Fixtures
            </a>
            <a href="#" className="text-purple-200 hover:text-white transition-colors font-medium" data-testid="link-transfers">
              Transfers
            </a>
            <a href="#" className="text-purple-200 hover:text-white transition-colors font-medium" data-testid="link-leagues">
              Leagues
            </a>
          </nav>
          <button className="md:hidden text-white" data-testid="button-mobile-menu">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
