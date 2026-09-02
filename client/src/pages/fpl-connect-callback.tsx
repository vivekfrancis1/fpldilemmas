import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// Destination the bookmarklet (see fpl-connect-dialog.tsx) redirects to after it captures the
// Authorization header FPL's own site sends on its next request. The token/manager ID travel in
// the URL fragment (never sent to any server on the way here) and are cleared from the address
// bar the instant this page reads them, mirroring how briefly the token is visible today when a
// user pastes it into the dialog's plaintext textarea.
export default function FplConnectCallback() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [status, setStatus] = useState<"working" | "success" | "error" | "need-login">("working");
  const [errorMessage, setErrorMessage] = useState("");

  // Parsed exactly once, synchronously, on the first render — the effect below reacts to auth
  // state resolving (which fires more than once as the query settles), but by then the fragment
  // has already been wiped from the address bar, so it must not be the thing we re-read from.
  const parsedRef = useRef<{ token: string | null; managerId: string | null } | null>(null);
  if (parsedRef.current === null) {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    parsedRef.current = { token: params.get("token"), managerId: params.get("managerId") };
    // Clear the fragment immediately so the token doesn't linger in the address bar or history.
    window.history.replaceState(null, "", window.location.pathname);
  }

  const connectAttemptedRef = useRef(false);

  useEffect(() => {
    if (isAuthLoading || connectAttemptedRef.current) return;
    const { token, managerId } = parsedRef.current!;

    if (!token) {
      setStatus("error");
      setErrorMessage("No login token was found. Please use the bookmarklet again from your FPL Points page.");
      return;
    }

    if (!isAuthenticated) {
      setStatus("need-login");
      return;
    }

    connectAttemptedRef.current = true;
    (async () => {
      try {
        const res = await apiRequest("POST", "/api/fpl/connect", {
          fplToken: token,
          fplManagerId: managerId ? parseInt(managerId, 10) : undefined,
        });
        const data = await res.json();
        queryClient.invalidateQueries({ queryKey: ["/api/fpl/status"] });
        setStatus("success");
        setTimeout(() => navigate(`/my-dashboard`), 1500);
        void data;
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to connect your FPL account.");
      }
    })();
  }, [isAuthLoading, isAuthenticated, navigate, queryClient]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          {status === "working" && (
            <>
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-600" />
              <h1 className="text-lg font-semibold">Connecting your FPL account…</h1>
              <p className="text-sm text-muted-foreground">This only takes a moment.</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-8 w-8 mx-auto text-green-600" />
              <h1 className="text-lg font-semibold">FPL account connected!</h1>
              <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
            </>
          )}
          {status === "need-login" && (
            <>
              <AlertCircle className="h-8 w-8 mx-auto text-amber-500" />
              <h1 className="text-lg font-semibold">Please log in to FPL Dilemmas first</h1>
              <p className="text-sm text-muted-foreground">
                Log in, then click the bookmarklet again from your FPL Points page.
              </p>
              <Button onClick={() => navigate("/")} className="w-full">Go to login</Button>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
              <h1 className="text-lg font-semibold">Couldn't connect your account</h1>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button onClick={() => navigate("/my-dashboard")} variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
