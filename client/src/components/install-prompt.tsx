import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const DISMISSED_KEY = "fpld-install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOSSafari() {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isChromeOrFirefoxOrEdgeOnIOS = /CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && !isChromeOrFirefoxOrEdgeOnIOS;
}

// Surfaces an "Install App" affordance: a real install prompt on browsers that
// support beforeinstallprompt (Chrome/Edge/Android), or step-by-step
// instructions on iOS Safari, which has no programmatic install API. Hidden
// once installed, on unsupported browsers, or after the user dismisses it.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(DISMISSED_KEY) === "1"
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !isIOSSafari()) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowIOSInstructions(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-1 rounded-full bg-fpl-purple text-white shadow-lg pr-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleInstallClick}
          className="text-white hover:bg-white/10 hover:text-white rounded-full gap-2 h-10 px-4"
          data-testid="button-install-app"
        >
          <Download className="h-4 w-4" />
          Install App
        </Button>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
          data-testid="button-dismiss-install-prompt"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

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
