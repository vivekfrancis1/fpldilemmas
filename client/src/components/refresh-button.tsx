import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface RefreshButtonProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "ghost" | "default";
}

export default function RefreshButton({ 
  className = "", 
  size = "sm", 
  variant = "ghost" 
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all FPL API-related queries to force refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/bootstrap-static"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/fixtures"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/price-predictions"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/price-changes"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/manager"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/projected-standings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/team-goal-projections"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/team-goals-against-projections"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/player-projections"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/match-projections"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/seasons"] }),
      ]);
      
      toast({
        title: "Data Refreshed",
        description: "Successfully refreshed data from FPL API",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed", 
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`flex items-center gap-1.5 text-gray-600 hover:text-gray-800 transition-colors ${className}`}
      title="Refresh data from FPL API"
      data-testid="button-refresh-fpl-api"
    >
      <RefreshCw className={`${isRefreshing ? 'animate-spin' : ''} ${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      <span className="text-xs hidden sm:inline">Refresh</span>
    </Button>
  );
}