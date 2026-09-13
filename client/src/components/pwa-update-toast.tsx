import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

// Surfaces a "new version available" toast when the service worker has
// fetched an update, backed by vite-plugin-pwa's autoUpdate registration.
//
// vite-plugin-pwa/workbox only check for a new service worker once, at
// registration time (page load). A tab left open for a while — or one whose
// registration predates several deploys — can otherwise sit on stale cached
// JS indefinitely with no prompt to refresh. We supplement that with our own
// periodic check plus a check whenever the tab regains focus, since that's
// when a user is most likely to actually notice and act on the prompt.
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export default function PwaUpdateToast() {
  const { toast } = useToast();
  const shown = useRef(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const checkForUpdate = () => registration.update().catch(() => {});
      setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
    },
  });

  useEffect(() => {
    if (!needRefresh || shown.current) return;
    shown.current = true;
    toast({
      title: "New version available",
      description: "Refresh to get the latest updates.",
      action: (
        <ToastAction altText="Refresh" onClick={() => updateServiceWorker(true)}>
          Refresh
        </ToastAction>
      ),
    });
  }, [needRefresh, toast, updateServiceWorker]);

  return null;
}
