import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { base64UrlToBytes } from "@shared/deadline-reminders";
import { Button } from "@/components/ui/button";

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIosBrowserTab = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(navigator as any).standalone &&
  !window.matchMedia?.("(display-mode: standalone)").matches;

// Hidden until the server has VAPID keys configured, so nothing appears before reminders actually work.
export function DeadlineReminderToggle() {
  const { data: config } = useQuery<{ enabled: boolean; publicKey: string | null }>({
    queryKey: ["/api/push/config"],
    staleTime: 60 * 60 * 1000,
  });
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supported() || !config?.enabled) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => undefined);
  }, [config?.enabled]);

  if (!config?.enabled || !config.publicKey) return null;
  if (!supported() || isIosBrowserTab()) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="text-reminder-unavailable">
        {isIosBrowserTab()
          ? "On iPhone, add this site to your Home Screen first to get deadline reminders."
          : "Deadline reminders aren't supported in this browser."}
      </p>
    );
  }

  const enable = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setMessage("Notifications are blocked for this site. Allow them in your browser settings to get reminders.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(config.publicKey!) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) {
        await sub.unsubscribe();
        throw new Error("subscribe failed");
      }
      setSubscribed(true);
    } catch {
      setMessage("Couldn't turn reminders on. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      setMessage("Couldn't turn reminders off. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1" data-testid="reminder-toggle">
      <Button variant="outline" size="sm" onClick={subscribed ? disable : enable} disabled={busy} className="gap-2" data-testid="button-reminder">
        {subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {busy ? "Working…" : subscribed ? "Turn off deadline reminder" : "Remind me 2h before deadlines"}
      </Button>
      {message && <span className="text-xs text-red-600" role="alert">{message}</span>}
    </div>
  );
}
