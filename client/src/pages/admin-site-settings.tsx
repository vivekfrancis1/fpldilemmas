import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Coffee, TrendingUp } from "lucide-react";
import ProtectedRoute from "@/components/protected-route";

interface OddsApiUsage {
  month: string;
  creditsUsed: number;
  creditsRemaining: number;
  limit: number;
}

function OddsApiUsageCard() {
  const { data, isLoading } = useQuery<OddsApiUsage>({
    queryKey: ["/api/admin/odds-api-usage"],
    refetchInterval: 5 * 60 * 1000,
  });

  const monthLabel = data
    ? new Date(`${data.month}-01T00:00:00`).toLocaleString("en-US", { month: "long", year: "numeric" })
    : "";
  const pctUsed = data && data.limit > 0 ? Math.min(100, (data.creditsUsed / data.limit) * 100) : 0;
  const isLow = data ? data.creditsRemaining <= data.limit * 0.2 : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Odds API Usage
        </CardTitle>
        <CardDescription>
          Credits used this calendar month by the odds refresh scheduler. Resets automatically at
          the start of each month. This is our own tracked count of calls made (2 credits/call),
          not a live mirror of the provider's account dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{monthLabel}</span>
              <span className={`text-sm font-medium ${isLow ? "text-red-600" : "text-muted-foreground"}`}>
                {data.creditsRemaining} remaining
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${isLow ? "bg-red-500" : "bg-purple-500"}`}
                style={{ width: `${pctUsed}%` }}
              />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{data.creditsUsed}</span>
              <span className="text-muted-foreground">/ {data.limit} credits used</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminSiteSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/bmc-widget-config"],
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch("/api/admin/bmc-widget-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to update widget setting");
      return response.json();
    },
    onSuccess: (_data, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bmc-widget-config"] });
      toast({
        title: enabled ? "Widget enabled" : "Widget disabled",
        description: `The Buy Me a Coffee widget is now ${enabled ? "showing" : "hidden"} on the site.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: `Failed to update setting: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="w-full p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Site Settings</h1>
          <p className="text-muted-foreground">Site-wide toggles for optional widgets and features.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Buy Me a Coffee Widget
            </CardTitle>
            <CardDescription>
              Shows the floating "Buy Me a Coffee" support button on every page for all visitors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch
                id="bmc-widget-enabled"
                checked={!!data?.enabled}
                disabled={isLoading || mutation.isPending}
                onCheckedChange={(checked) => mutation.mutate(checked)}
              />
              <Label htmlFor="bmc-widget-enabled">
                {data?.enabled ? "Enabled" : "Disabled"}
              </Label>
            </div>
          </CardContent>
        </Card>

        <OddsApiUsageCard />
      </div>
    </ProtectedRoute>
  );
}
