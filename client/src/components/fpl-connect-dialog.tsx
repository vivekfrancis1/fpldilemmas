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

export function FplConnectDialog() {
  const [open, setOpen] = useState(false);
  const [fplEmail, setFplEmail] = useState("");
  const [fplPassword, setFplPassword] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      return await apiRequest("/api/fpl/connect", {
        method: "POST",
        body: JSON.stringify({ fplEmail, fplPassword }),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "FPL Account Connected",
        description: `Successfully connected to FPL Manager ID: ${data.fplManagerId}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fpl/status"] });
      setOpen(false);
      setFplPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Please check your FPL credentials and try again",
        variant: "destructive",
      });
    },
  });

  // Disconnect FPL account mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/fpl/disconnect", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "FPL Account Disconnected",
        description: "Your FPL account has been disconnected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fpl/status"] });
      setFplEmail("");
      setFplPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConnect = () => {
    if (!fplEmail || !fplPassword) {
      toast({
        title: "Missing Information",
        description: "Please enter your FPL email and password",
        variant: "destructive",
      });
      return;
    }
    connectMutation.mutate();
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

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
                <br />
                Email: {fplStatus.fplEmail}
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
              <AlertDescription>
                Your FPL credentials are used only to authenticate with the official FPL API. They are
                not stored in plain text and are only used to obtain session cookies.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="fpl-email">FPL Email</Label>
              <Input
                id="fpl-email"
                type="email"
                placeholder="your.email@example.com"
                value={fplEmail}
                onChange={(e) => setFplEmail(e.target.value)}
                data-testid="input-fpl-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fpl-password">FPL Password</Label>
              <Input
                id="fpl-password"
                type="password"
                placeholder="Your FPL password"
                value={fplPassword}
                onChange={(e) => setFplPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                data-testid="input-fpl-password"
              />
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
