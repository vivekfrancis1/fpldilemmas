import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onSidebarToggle: () => void;
}

export default function Header({ onSidebarToggle }: HeaderProps) {

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm lg:hidden">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="text-fpl-purple hover:bg-fpl-purple/10 p-1 sm:p-2 flex-shrink-0"
            data-testid="button-sidebar-toggle"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-fpl-purple truncate">FPL Dilemmas</h1>
            <p className="text-xs text-gray-600 hidden sm:block">Analytical tools</p>
          </div>
        </div>
      </div>
    </header>
  );
}
