import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { teamIdSetupSchema, type TeamIdSetup } from "@shared/fpl-auth-schema";
import { apiRequest } from "@/lib/queryClient";
import { User, ExternalLink, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthSetupTeam() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<TeamIdSetup>({
    resolver: zodResolver(teamIdSetupSchema),
    defaultValues: {
      teamId: "",
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: TeamIdSetup) => {
      const response = await fetch("/api/auth/setup-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Setup failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Team Connected!",
        description: "Your FPL team has been successfully connected.",
      });
      // Redirect to team page
      window.location.href = "/fpl-team";
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect your FPL team. Please check your Team ID.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: TeamIdSetup) => {
    setIsSubmitting(true);
    setupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-green-50 dark:from-purple-950 dark:to-green-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
            <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <CardTitle>Connect Your FPL Team</CardTitle>
          <CardDescription>
            Enter your FPL Team ID to sync your team data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Find your Team ID in the FPL app: Go to <strong>Points</strong> → <strong>View Gameweek history</strong>. 
              Your Team ID is in the URL (e.g., /entry/123456/event/)
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FPL Team ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your Team ID (e.g., 123456)"
                        {...field}
                        data-testid="input-team-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-connect-team"
              >
                {isSubmitting ? "Connecting..." : "Connect My Team"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open("https://fantasy.premierleague.com", "_blank")}
              className="text-sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open FPL Website
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/"}
              className="text-sm"
            >
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}