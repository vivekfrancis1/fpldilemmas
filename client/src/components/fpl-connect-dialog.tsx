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
import { Link2, Unlink, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

export function FplConnectDialog() {
  const [open, setOpen] = useState(false);
  const [fplToken, setFplToken] = useState("");
  const [fplManagerId, setFplManagerId] = useState("");
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
      <DialogContent className="sm:max-w-md">
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
                  Your session has expired. Please reconnect your FPL account.
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
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Super Simple Setup:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-2">
                  <li>Go to <a href="https://fantasy.premierleague.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">fantasy.premierleague.com</a> and <strong>sign in</strong></li>
                  <li><strong>Copy the browser URL</strong> from the address bar → Paste in "Manager ID" field below</li>
                  <li>Press <strong>F12</strong> → <strong>Network tab</strong> → <strong>F5</strong> to refresh</li>
                  <li><strong>Right-click</strong> any request → <strong>"Copy as cURL"</strong> → Paste in "cURL" field below</li>
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
      </DialogContent>
    </Dialog>
  );
}
