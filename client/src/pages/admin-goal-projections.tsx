import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Settings, RotateCcw, Save, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminSettings {
  globalTierMultiplier: number;
  lowConfidenceBoost: number;
  lowConfidenceThreshold: number;
  derbyGoalsMultiplier: number;
  topSixGoalsMultiplier: number;
  relegationBattleGoalsMultiplier: number;
  earlyKickoffGoalsMultiplier: number;
  lateKickoffGoalsMultiplier: number;
  postEuropeanGoalsMultiplier: number;
  midweekFixtureGoalsMultiplier: number;
  seasonFinaleGoalsMultiplier: number;
  newManagerBounceGoalsMultiplier: number;
  weatherConditionsGoalsMultiplier: number;
  marketFloorMultiplier: number;
  marketCeilingMultiplier: number;
  absoluteMinGoals: number;
  absoluteMaxGoals: number;
  lastUpdated: string;
  updatedBy: string;
}

export default function AdminGoalProjections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<AdminSettings>({} as AdminSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current admin settings
  const { data: settings, isLoading } = useQuery<AdminSettings>({
    queryKey: ['/api/admin/goal-projection-settings'],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<AdminSettings>) => {
      const response = await fetch('/api/admin/goal-projection-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Goal projection model parameters have been updated successfully.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/goal-projection-settings'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reset settings mutation
  const resetSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/goal-projection-settings/reset', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to reset settings');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Reset",
        description: "All settings have been reset to default values.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/goal-projection-settings'] });
    },
    onError: () => {
      toast({
        title: "Reset Failed",
        description: "Failed to reset settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
    }
  }, [settings]);

  const handleInputChange = (field: keyof AdminSettings, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numericValue }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      resetSettingsMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Team Goal Projections Admin</h1>
        </div>
        <div className="text-center py-8">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Team Goal Projections Admin</h1>
      </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Changes to these parameters will immediately affect Team Goal Projections calculations. 
          Use caution when modifying values as they impact all projection tools that depend on goal data.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Global Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle>Global Multipliers</CardTitle>
            <CardDescription>Core multipliers applied across all teams</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="globalTierMultiplier">Global Tier Multiplier</Label>
                <Input
                  id="globalTierMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.globalTierMultiplier || 0}
                  onChange={(e) => handleInputChange('globalTierMultiplier', e.target.value)}
                  data-testid="input-global-tier-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="lowConfidenceBoost">Low Confidence Boost</Label>
                <Input
                  id="lowConfidenceBoost"
                  type="number"
                  step="0.01"
                  value={formData.lowConfidenceBoost || 0}
                  onChange={(e) => handleInputChange('lowConfidenceBoost', e.target.value)}
                  data-testid="input-low-confidence-boost"
                />
              </div>
              <div>
                <Label htmlFor="lowConfidenceThreshold">Low Confidence Threshold</Label>
                <Input
                  id="lowConfidenceThreshold"
                  type="number"
                  step="0.01"
                  value={formData.lowConfidenceThreshold || 0}
                  onChange={(e) => handleInputChange('lowConfidenceThreshold', e.target.value)}
                  data-testid="input-low-confidence-threshold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Context Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle>Context Multipliers</CardTitle>
            <CardDescription>Situational adjustments for different match contexts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="derbyGoalsMultiplier">Derby Matches</Label>
                <Input
                  id="derbyGoalsMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.derbyGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('derbyGoalsMultiplier', e.target.value)}
                  data-testid="input-derby-goals-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="topSixGoalsMultiplier">Top Six Battles</Label>
                <Input
                  id="topSixGoalsMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.topSixGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('topSixGoalsMultiplier', e.target.value)}
                  data-testid="input-top-six-goals-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="relegationBattleGoalsMultiplier">Relegation Battles</Label>
                <Input
                  id="relegationBattleGoalsMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.relegationBattleGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('relegationBattleGoalsMultiplier', e.target.value)}
                  data-testid="input-relegation-battle-goals-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="earlyKickoffGoalsMultiplier">Early Kickoff</Label>
                <Input
                  id="earlyKickoffGoalsMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.earlyKickoffGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('earlyKickoffGoalsMultiplier', e.target.value)}
                  data-testid="input-early-kickoff-goals-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="lateKickoffGoalsMultiplier">Late Kickoff</Label>
                <Input
                  id="lateKickoffGoalsMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.lateKickoffGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('lateKickoffGoalsMultiplier', e.target.value)}
                  data-testid="input-late-kickoff-goals-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="postEuropeanGoalsMultiplier">Post-European Fixtures</Label>
                <Input
                  id="postEuropeanGoalsMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.postEuropeanGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('postEuropeanGoalsMultiplier', e.target.value)}
                  data-testid="input-post-european-goals-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="midweekFixtureGoalsMultiplier">Midweek Fixtures</Label>
                <Input
                  id="midweekFixtureGoalsMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.midweekFixtureGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('midweekFixtureGoalsMultiplier', e.target.value)}
                  data-testid="input-midweek-fixture-goals-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="seasonFinaleGoalsMultiplier">Season Finale</Label>
                <Input
                  id="seasonFinaleGoalsMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.seasonFinaleGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('seasonFinaleGoalsMultiplier', e.target.value)}
                  data-testid="input-season-finale-goals-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="newManagerBounceGoalsMultiplier">New Manager Bounce</Label>
                <Input
                  id="newManagerBounceGoalsMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.newManagerBounceGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('newManagerBounceGoalsMultiplier', e.target.value)}
                  data-testid="input-new-manager-bounce-goals-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="weatherConditionsGoalsMultiplier">Weather Conditions</Label>
                <Input
                  id="weatherConditionsGoalsMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.weatherConditionsGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('weatherConditionsGoalsMultiplier', e.target.value)}
                  data-testid="input-weather-conditions-goals-multiplier"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Bounds */}
        <Card>
          <CardHeader>
            <CardTitle>Market Bounds</CardTitle>
            <CardDescription>Constraints for realistic Premier League goal ranges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="marketFloorMultiplier">Market Floor Multiplier</Label>
                <Input
                  id="marketFloorMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.marketFloorMultiplier || 0}
                  onChange={(e) => handleInputChange('marketFloorMultiplier', e.target.value)}
                  data-testid="input-market-floor-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="marketCeilingMultiplier">Market Ceiling Multiplier</Label>
                <Input
                  id="marketCeilingMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.marketCeilingMultiplier || 0}
                  onChange={(e) => handleInputChange('marketCeilingMultiplier', e.target.value)}
                  data-testid="input-market-ceiling-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="absoluteMinGoals">Absolute Min Goals</Label>
                <Input
                  id="absoluteMinGoals"
                  type="number"
                  step="0.01"
                  value={formData.absoluteMinGoals || 0}
                  onChange={(e) => handleInputChange('absoluteMinGoals', e.target.value)}
                  data-testid="input-absolute-min-goals"
                />
              </div>
              <div>
                <Label htmlFor="absoluteMaxGoals">Absolute Max Goals</Label>
                <Input
                  id="absoluteMaxGoals"
                  type="number"
                  step="0.01"
                  value={formData.absoluteMaxGoals || 0}
                  onChange={(e) => handleInputChange('absoluteMaxGoals', e.target.value)}
                  data-testid="input-absolute-max-goals"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              {settings?.lastUpdated && (
                <>Last updated: {new Date(settings.lastUpdated).toLocaleString()} by {settings.updatedBy}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateSettingsMutation.isPending}
                className="flex items-center gap-2"
                data-testid="button-save-settings"
              >
                <Save className="h-4 w-4" />
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={resetSettingsMutation.isPending}
                className="flex items-center gap-2"
                data-testid="button-reset-settings"
              >
                <RotateCcw className="h-4 w-4" />
                {resetSettingsMutation.isPending ? 'Resetting...' : 'Reset to Defaults'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}