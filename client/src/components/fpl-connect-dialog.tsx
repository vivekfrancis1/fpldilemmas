import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link2, Unlink, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Bookmark } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

// Captures the "x-api-authorization" header FPL's own frontend sends on its next login-scoped
// request (fetch or XHR — we don't know which API their SPA uses, so we patch both) and redirects
// to our callback route with it, replicating what "Copy as cURL" already extracts today — just
// without the user ever opening DevTools. FPL sends the Bearer token under this non-standard
// header name rather than the standard "Authorization" (confirmed against how our own server's
// cURL-parsing already looks for "x-api-authorization" — see server/fpl-token-utils.ts). Built
// fresh per render so it always targets the current origin (works in local dev and production).
function buildBookmarkletHref(): string {
  const origin = window.location.origin;
  const code = `
    (function(){
      var origin = ${JSON.stringify(origin)};
      var done = false;
      function grab(raw){
        if (done || !raw) return;
        var token = raw.replace(/^Bearer\\s+/i, '');
        done = true;
        var m = location.pathname.match(/entry\\/(\\d+)/);
        var managerId = m ? m[1] : '';
        window.fetch = origFetch;
        window.location.href = origin + '/fpl-connect-callback#token=' + encodeURIComponent(token) + '&managerId=' + managerId;
      }
      function findHeader(headers){
        if (!headers) return null;
        if (typeof Headers !== 'undefined' && headers instanceof Headers) {
          return headers.get('x-api-authorization') || headers.get('X-Api-Authorization');
        }
        for (var key in headers) {
          if (key.toLowerCase() === 'x-api-authorization') return headers[key];
        }
        return null;
      }
      var origFetch = window.fetch;
      if (origFetch) {
        window.fetch = function(input, init){
          try { grab(findHeader(init && init.headers)); } catch(e) {}
          return origFetch.apply(this, arguments);
        };
      }
      var origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
      XMLHttpRequest.prototype.setRequestHeader = function(name, value){
        try { if (name && name.toLowerCase() === 'x-api-authorization') grab(value); } catch(e) {}
        return origSetHeader.apply(this, arguments);
      };
      alert('FPL Dilemmas: click OK, then refresh this page to finish connecting.');
    })();
  `.replace(/\s+/g, ' ').trim();
  return "javascript:" + encodeURIComponent(code);
}

export function FplConnectDialog() {
  const [open, setOpen] = useState(false);
  const [fplToken, setFplToken] = useState("");
  const [fplManagerId, setFplManagerId] = useState("");
  const [showManualSteps, setShowManualSteps] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Check FPL connection status
  const { data: fplStatus } = useQuery<{
    connected: boolean;
    fplManagerId?: number;
    fplEmail?: string;
    needsReauth?: boolean;
  }>({
    queryKey: ["/api/fpl/status"],
    retry: false,
  });

  // Connect FPL account mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fpl/connect", { fplToken, fplManagerId: parseInt(fplManagerId) });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "FPL Account Connected",
        description: `Successfully connected to FPL Manager ID: ${data.fplManagerId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fpl/status"] });
      setOpen(false);
      setFplToken("");
      setFplManagerId("");
    },
    onError: (error: any) => {
      const isAuthError = error.message?.includes("Authentication required") || error.message?.includes("401");
      toast({
        title: "Connection Failed",
        description: isAuthError 
          ? "Your session has expired. Please refresh the page and log in again."
          : error.message || "Please check your FPL Bearer token and Manager ID and try again",
        variant: "destructive",
      });
    },
  });

  // Disconnect FPL account mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fpl/disconnect");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "FPL Account Disconnected",
        description: "Your FPL account has been disconnected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fpl/status"] });
      setFplToken("");
      setFplManagerId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle Manager ID input - can be URL or plain ID
  const handleManagerIdInput = (value: string) => {
    const trimmed = value.trim();
    
    // Check if it's a URL
    if (trimmed.includes('fantasy.premierleague.com') || trimmed.includes('entry/')) {
      // Extract Manager ID from URL pattern: entry/123456
      const match = trimmed.match(/entry\/(\d+)/);
      if (match && match[1]) {
        setFplManagerId(match[1]);
        toast({
          title: "Manager ID Extracted",
          description: `Found Manager ID: ${match[1]}`,
        });
        return;
      }
    }
    
    // Otherwise treat as plain Manager ID
    setFplManagerId(value);
  };

  const handleConnect = () => {
    if (!fplToken || !fplManagerId) {
      toast({
        title: "Missing Information",
        description: "Please enter your FPL Bearer token and Manager ID",
        variant: "destructive",
      });
      return;
    }
    connectMutation.mutate();
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  // Don't render the button if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={fplStatus?.connected ? "outline" : "default"}
          size="sm"
          className="flex items-center gap-2"
          data-testid="button-fpl-connect"
        >
          {fplStatus?.connected ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              FPL Connected
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              Connect FPL
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {fplStatus?.connected ? "FPL Account Connected" : "Connect Your FPL Account"}
          </DialogTitle>
          <DialogDescription>
            {fplStatus?.connected
              ? "Your FPL account is connected. You can now sync your live team data."
              : "Connect your Fantasy Premier League account to sync your live team data including pending transfers."}
          </DialogDescription>
        </DialogHeader>

        {fplStatus?.connected ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Connected to FPL Manager ID: {fplStatus.fplManagerId}
              </AlertDescription>
            </Alert>

            {fplStatus.needsReauth && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  FPL session expired. Please reconnect to sync your latest team.
                </AlertDescription>
              </Alert>
            )}

            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="w-full flex items-center gap-2"
              data-testid="button-fpl-disconnect"
            >
              <Unlink className="h-4 w-4" />
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect FPL Account"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Bookmark className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>One-click setup:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-2">
                  <li>
                    Drag this button to your browser's bookmarks bar:{" "}
                    <a
                      href={buildBookmarkletHref()}
                      onClick={(e) => e.preventDefault()}
                      className="inline-block align-middle bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full cursor-move select-none"
                      data-testid="link-fpl-bookmarklet"
                    >
                      <Bookmark className="h-3 w-3 inline mr-1" />Connect to FPL Dilemmas
                    </a>
                  </li>
                  <li>Go to <a href="https://fantasy.premierleague.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">fantasy.premierleague.com</a> and <strong>sign in</strong></li>
                  <li>Click the bookmark, then click <strong>OK</strong> on the popup and <strong>refresh the page</strong></li>
                </ol>
                <p className="mt-2 text-xs font-semibold text-green-600">
                  ✅ You'll be redirected back here, fully connected — no Manager ID or token to copy.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bookmarks bar not visible? Most browsers show it with Ctrl/⌘ + Shift + B.
                </p>
              </AlertDescription>
            </Alert>

            <button
              type="button"
              onClick={() => setShowManualSteps(!showManualSteps)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              data-testid="button-toggle-manual-connect"
            >
              {showManualSteps ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showManualSteps ? "Hide manual method" : "Bookmark didn't work? Connect manually"}
            </button>

            {showManualSteps && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Manual Setup:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-2">
                      <li>Go to <a href="https://fantasy.premierleague.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">fantasy.premierleague.com</a>, <strong>sign in</strong>, and <strong>click on the Points tab</strong></li>
                      <li><strong>Copy the browser URL</strong> from the address bar → Paste in "Manager ID" field below</li>
                      <li>
                        Open Developer Tools and switch to the <strong>Network tab</strong>, then refresh the page:
                        <ul className="list-disc list-inside mt-1 ml-4 space-y-1 text-xs">
                          <li><strong>Windows/Linux</strong> (Chrome, Edge, Firefox): press <strong>F12</strong>, then <strong>F5</strong> to refresh</li>
                          <li><strong>Mac</strong> (Chrome, Edge, Firefox): press <strong>⌘ + Option + I</strong>, then <strong>⌘ + R</strong> to refresh</li>
                          <li><strong>Mac Safari</strong>: first enable it once via <strong>Safari → Settings → Advanced → "Show Develop menu in menu bar"</strong>, then press <strong>⌘ + Option + I</strong> and <strong>⌘ + R</strong> to refresh</li>
                        </ul>
                      </li>
                      <li>
                        Type <strong>"me"</strong> in the Network tab's filter box → <strong>right-click</strong> the <code>me</code> request → <strong>"Copy as cURL"</strong> → Paste in "cURL" field below
                        <span className="block text-xs mt-1 text-muted-foreground">Most other requests (images, scripts, analytics) won't carry your login token, so filtering to "me" avoids picking the wrong one. Older Safari versions don't have "Copy as cURL" — if you don't see it, click the request, open its <strong>Headers</strong> pane, and copy the value next to <strong>Authorization</strong> instead.</span>
                      </li>
                    </ol>
                    <p className="mt-2 text-xs font-semibold text-green-600">
                      ✅ That's it! We'll extract everything automatically.
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="fpl-manager-id">Your FPL Manager ID or Browser URL</Label>
                  <Input
                    id="fpl-manager-id"
                    type="text"
                    placeholder="Paste: https://fantasy.premierleague.com/entry/577434/event/10"
                    value={fplManagerId}
                    onChange={(e) => handleManagerIdInput(e.target.value)}
                    data-testid="input-fpl-manager-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    ✨ Paste your browser URL or just the Manager ID number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fpl-token">Paste cURL Command or Bearer Token</Label>
                  <textarea
                    id="fpl-token"
                    placeholder="Paste entire cURL command here (or just the Bearer token)"
                    value={fplToken}
                    onChange={(e) => setFplToken(e.target.value)}
                    data-testid="input-fpl-token"
                    className="w-full min-h-[100px] p-2 text-xs font-mono border rounded-md resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    ✨ New: Paste the full cURL command and we'll extract the token automatically!
                  </p>
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={connectMutation.isPending}
                  className="w-full"
                  data-testid="button-fpl-connect-submit"
                >
                  {connectMutation.isPending ? "Connecting..." : "Connect FPL Account"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
