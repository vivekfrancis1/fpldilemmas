import { Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

interface InstallAppButtonProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "ghost" | "default";
}

export default function InstallAppButton({
  className = "",
  size = "sm",
  variant = "ghost",
}: InstallAppButtonProps) {
  const { canInstall, install, showIOSInstructions, setShowIOSInstructions } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={install}
        className={`flex items-center gap-1.5 text-gray-600 hover:text-gray-800 transition-colors ${className}`}
        title="Install FPL Dilemmas as an app"
        data-testid="button-install-app"
      >
        <Download className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        <span className="text-xs hidden sm:inline">Install App</span>
      </Button>

      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Install FPL Dilemmas</DialogTitle>
            <DialogDescription>Add the app to your Home Screen in two steps.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-fpl-purple/10 text-fpl-purple">
                <Share className="h-4 w-4" />
              </span>
              Tap the <strong className="mx-1">Share</strong> icon in Safari's toolbar
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-fpl-purple/10 text-fpl-purple">
                <SquarePlus className="h-4 w-4" />
              </span>
              Scroll down and tap <strong className="mx-1">Add to Home Screen</strong>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
