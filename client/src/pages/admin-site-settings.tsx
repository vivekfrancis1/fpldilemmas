import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Coffee } from "lucide-react";
import ProtectedRoute from "@/components/protected-route";

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
      </div>
    </ProtectedRoute>
  );
}
