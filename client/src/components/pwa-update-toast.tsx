import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

// Surfaces a "new version available" toast when the service worker has
// fetched an update, backed by vite-plugin-pwa's autoUpdate registration.
export default function PwaUpdateToast() {
  const { toast } = useToast();
  const shown = useRef(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

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
