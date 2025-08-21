import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onSidebarToggle: () => void;
}

export default function Header({ onSidebarToggle }: HeaderProps) {

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="text-fpl-purple hover:bg-fpl-purple/10 p-2"
            data-testid="button-sidebar-toggle"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-fpl-purple">FPL Dilemmas</h1>
            <p className="text-xs text-gray-600">Analytical tools</p>
          </div>
        </div>
      </div>
    </header>
  );
}
