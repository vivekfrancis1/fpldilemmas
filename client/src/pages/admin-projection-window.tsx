import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, RotateCcw, Save, CalendarRange, Info, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import ProtectedRoute from "@/components/protected-route";

interface ProjectionWindowSettings {
  defaultWeeks: number;
  totalWeeks: number;
  lastUpdated: string | null;
  updatedBy: string | null;
  defaults: { defaultWeeks: number; totalWeeks: number };
}

function AdminProjectionWindowContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [defaultWeeks, setDefaultWeeks] = useState<number>(8);
  const [totalWeeks, setTotalWeeks] = useState<number>(12);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<ProjectionWindowSettings>({
    queryKey: ["/api/admin/projection-window-settings"],
  });

  useEffect(() => {
    if (settings) {
      setDefaultWeeks(settings.defaultWeeks);
      setTotalWeeks(settings.totalWeeks);
    }
  }, [settings]);

  useEffect(() => {
    if (defaultWeeks > totalWeeks) {
      setValidationError("Default view weeks cannot exceed total projection weeks.");
    } else if (defaultWeeks < 1 || totalWeeks < 1) {
      setValidationError("Both values must be at least 1.");
    } else if (defaultWeeks > 38 || totalWeeks > 38) {
      setValidationError("Values cannot exceed 38 (full Premier League season).");
    } else {
      setValidationError(null);
    }
  }, [defaultWeeks, totalWeeks]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("PUT", "/api/admin/projection-window-settings", { defaultWeeks, totalWeeks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projection-window-settings"] });
      toast({ title: "Settings saved", description: `Default view: ${defaultWeeks} weeks · Total horizon: ${totalWeeks} weeks` });
    },
    onError: async (err: any) => {
      const body = await err.response?.json?.().catch(() => null);
      toast({ title: "Save failed", description: body?.error ?? "Unknown error", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/admin/projection-window-settings/reset", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/projection-window-settings"] });
      toast({ title: "Settings reset", description: "Restored to compile-time defaults (10 / 12)." });
    },
    onError: () => {
      toast({ title: "Reset failed", description: "Could not reset settings.", variant: "destructive" });
    },
  });

  const isDirty =
    settings && (defaultWeeks !== settings.defaultWeeks || totalWeeks !== settings.totalWeeks);
  const isBusy = saveMutation.isPending || resetMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <CalendarRange className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Projection Window Settings</h1>
          <p className="text-muted-foreground text-sm">
            Control how many gameweeks are shown by default and computed by the APIs.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Loading current settings…</div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Runtime Values
              </CardTitle>
              <CardDescription>
                Changes take effect immediately for new API calls. Frontend pages pick up the new
                default view on their next load (or within 5 minutes if already open).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultWeeks">
                    Default View (weeks)
                  </Label>
                  <Input
                    id="defaultWeeks"
                    type="number"
                    min={1}
                    max={38}
                    value={defaultWeeks}
                    onChange={(e) => setDefaultWeeks(parseInt(e.target.value) || 1)}
                    disabled={isBusy}
                  />
                  <p className="text-xs text-muted-foreground">
                    GWs shown when a projection page first loads. Compile-time default:{" "}
                    <code className="text-xs bg-muted px-1 rounded">{settings?.defaults.defaultWeeks ?? 8}</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalWeeks">
                    Total Projection Horizon (weeks)
                  </Label>
                  <Input
                    id="totalWeeks"
                    type="number"
                    min={1}
                    max={38}
                    value={totalWeeks}
                    onChange={(e) => setTotalWeeks(parseInt(e.target.value) || 1)}
                    disabled={isBusy}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max GWs computed by projection APIs. Compile-time default:{" "}
                    <code className="text-xs bg-muted px-1 rounded">{settings?.defaults.totalWeeks ?? 12}</code>
                  </p>
                </div>
              </div>

              {validationError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Default View</strong> sets the initial gameweek range on every projection
                  page (e.g. GW29–38 when set to 10). <strong>Total Horizon</strong> controls how
                  many gameweeks the backend computes — it should be ≥ Default View so users can
                  always expand to the full range.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={isBusy || !!validationError || !isDirty}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => resetMutation.mutate()}
                  disabled={isBusy}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {resetMutation.isPending ? "Resetting…" : "Reset to Defaults"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {settings?.lastUpdated && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Last Change</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Updated by</span>
                  <Badge variant="secondary">{settings.updatedBy}</Badge>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-muted-foreground">
                    {new Date(settings.lastUpdated).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminProjectionWindow() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminProjectionWindowContent />
    </ProtectedRoute>
  );
}
