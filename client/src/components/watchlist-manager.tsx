import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, Plus, Trash2, TrendingUp, TrendingDown, Bell, BellOff, Target } from "lucide-react";
import { BootstrapData, WatchlistEntry, InsertWatchlistEntryForm, insertWatchlistEntrySchema, PriceAlert } from "@shared/schema";

interface WatchlistManagerProps {
  data?: BootstrapData;
  isLoading: boolean;
}

export default function WatchlistManager({ data, isLoading }: WatchlistManagerProps) {
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch watchlist entries
  const { data: watchlistEntries, isLoading: watchlistLoading } = useQuery<WatchlistEntry[]>({
    queryKey: ['/api/watchlist'],
  });

  // Fetch recent price alerts
  const { data: priceAlerts, isLoading: alertsLoading } = useQuery<PriceAlert[]>({
    queryKey: ['/api/price-alerts'],
  });

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: async (entry: InsertWatchlistEntryForm) => {
      return apiRequest('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
      toast({
        title: "Success",
        description: "Player added to watchlist",
      });
      setShowAddDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add player to watchlist",
        variant: "destructive",
      });
    },
  });

  // Remove from watchlist mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/watchlist/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
      toast({
        title: "Success",
        description: "Player removed from watchlist",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove player from watchlist",
        variant: "destructive",
      });
    },
  });

  // Form for adding players
  const form = useForm<InsertWatchlistEntryForm>({
    resolver: zodResolver(insertWatchlistEntrySchema),
    defaultValues: {
      playerId: 0,
      playerName: "",
      teamName: "",
      position: "",
      currentPrice: 0,
      targetPrice: undefined,
      alertOnRise: false,
      alertOnFall: false,
      notes: "",
    },
  });

  // Handle player selection
  const handlePlayerSelect = (playerId: string) => {
    if (!data) return;
    
    const player = data.elements.find(p => p.id.toString() === playerId);
    if (!player) return;

    const team = data.teams.find(t => t.id === player.team);
    const position = data.element_types.find(et => et.id === player.element_type);

    if (team && position) {
      form.setValue('playerId', player.id);
      form.setValue('playerName', `${player.first_name} ${player.second_name}`);
      form.setValue('teamName', team.name);
      form.setValue('position', position.singular_name);
      form.setValue('currentPrice', player.now_cost);
    }
  };

  // Filter available players (not already in watchlist)
  const availablePlayers = useMemo(() => {
    if (!data || !watchlistEntries) return [];
    
    const watchedPlayerIds = new Set(watchlistEntries.map(entry => entry.playerId));
    return data.elements.filter(player => !watchedPlayerIds.has(player.id));
  }, [data, watchlistEntries]);

  // Filter watchlist by position
  const filteredWatchlist = useMemo(() => {
    if (!watchlistEntries) return [];
    
    if (selectedPosition === "all") return watchlistEntries;
    return watchlistEntries.filter(entry => entry.position === selectedPosition);
  }, [watchlistEntries, selectedPosition]);

  // Recent price changes
  const recentAlerts = useMemo(() => {
    if (!priceAlerts) return [];
    return priceAlerts.slice(0, 10); // Show last 10 alerts
  }, [priceAlerts]);

  const onSubmit = (values: InsertWatchlistEntryForm) => {
    addToWatchlistMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900" data-testid="text-watchlist-title">
              My Watchlist
            </h3>
            <Badge variant="outline" className="bg-blue-50 text-blue-800">
              <Eye className="h-3 w-3 mr-1" />
              {filteredWatchlist.length} players
            </Badge>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-fpl-purple hover:bg-purple-700" data-testid="button-add-player">
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Player to Watchlist</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="playerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Player</FormLabel>
                        <FormControl>
                          <Select onValueChange={handlePlayerSelect}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a player" />
                            </SelectTrigger>
                            <SelectContent>
                              {availablePlayers.map((player) => {
                                const team = data?.teams.find(t => t.id === player.team);
                                return (
                                  <SelectItem key={player.id} value={player.id.toString()}>
                                    {player.first_name} {player.second_name} ({team?.short_name}) - £{(player.now_cost / 10).toFixed(1)}m
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Price (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="e.g. 85 for £8.5m"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) * 10 : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="alertOnRise"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>Alert on Price Rise</FormLabel>
                          <FormControl>
                            <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="alertOnFall"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>Alert on Price Fall</FormLabel>
                          <FormControl>
                            <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add notes about this player..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={addToWatchlistMutation.isPending}>
                      {addToWatchlistMutation.isPending ? "Adding..." : "Add to Watchlist"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Position Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" data-testid="label-position-filter">
              Filter by Position
            </label>
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger data-testid="select-position-filter">
                <SelectValue placeholder="All positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="Goalkeeper">Goalkeepers</SelectItem>
                <SelectItem value="Defender">Defenders</SelectItem>
                <SelectItem value="Midfielder">Midfielders</SelectItem>
                <SelectItem value="Forward">Forwards</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Recent Price Alerts */}
      {recentAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4" data-testid="text-alerts-title">
            Recent Price Changes
          </h3>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`alert-${alert.id}`}>
                <div className="flex items-center gap-3">
                  {alert.changeType === 'rise' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">{alert.playerName}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">
                    £{(alert.oldPrice / 10).toFixed(1)}m → £{(alert.newPrice / 10).toFixed(1)}m
                  </span>
                  <span className={`ml-2 ${alert.changeType === 'rise' ? 'text-green-600' : 'text-red-600'}`}>
                    ({alert.changeType === 'rise' ? '+' : '-'}£{(Math.abs(alert.changeAmount) / 10).toFixed(1)}m)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWatchlist.map((entry) => (
          <Card key={entry.id} className="hover:shadow-lg transition-shadow" data-testid={`card-watchlist-${entry.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold" data-testid={`text-player-name-${entry.id}`}>
                    {entry.playerName}
                  </CardTitle>
                  <p className="text-sm text-gray-600" data-testid={`text-player-details-${entry.id}`}>
                    {entry.teamName} • {entry.position}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFromWatchlistMutation.mutate(entry.id)}
                  disabled={removeFromWatchlistMutation.isPending}
                  data-testid={`button-remove-${entry.id}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Price</span>
                  <span className="font-medium" data-testid={`text-current-price-${entry.id}`}>
                    £{(entry.currentPrice / 10).toFixed(1)}m
                  </span>
                </div>

                {entry.targetPrice && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Target Price</span>
                    <span className="font-medium flex items-center gap-1" data-testid={`text-target-price-${entry.id}`}>
                      <Target className="h-3 w-3" />
                      £{(entry.targetPrice / 10).toFixed(1)}m
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs">
                  {entry.alertOnRise && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Bell className="h-3 w-3" />
                      Rise Alert
                    </div>
                  )}
                  {entry.alertOnFall && (
                    <div className="flex items-center gap-1 text-red-600">
                      <Bell className="h-3 w-3" />
                      Fall Alert
                    </div>
                  )}
                  {!entry.alertOnRise && !entry.alertOnFall && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <BellOff className="h-3 w-3" />
                      No Alerts
                    </div>
                  )}
                </div>

                {entry.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600" data-testid={`text-notes-${entry.id}`}>
                      {entry.notes}
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Added: {new Date(entry.createdAt!).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWatchlist.length === 0 && !watchlistLoading && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No players in watchlist</h3>
            <p className="text-sm">Add players to track their price changes and performance.</p>
          </div>
        </div>
      )}
    </div>
  );
}