import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Shield, RotateCcw, Save, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminCSSettings {
  decayFactor: number;
  weakDefenseBoost: number;
  averageDefenseBoost: number;
  strongDefenseBoost: number;
  eliteDefensiveFloor: number;
  strongDefensiveFloor: number;
  averageDefensiveFloor: number;
  weakDefensiveFloor: number;
  promotedDefensiveFloor: number;
  derbyCSMultiplier: number;
  topSixCSMultiplier: number;
  relegationBattleCSMultiplier: number;
  earlyKickoffCSMultiplier: number;
  lateKickoffCSMultiplier: number;
  postEuropeanCSMultiplier: number;
  midweekFixtureCSMultiplier: number;
  seasonFinaleCSMultiplier: number;
  newManagerBounceCSMultiplier: number;
  weatherConditionsCSMultiplier: number;
  lastUpdated: string;
  updatedBy: string;
}

export default function AdminCSProjections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<AdminCSSettings>({} as AdminCSSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current admin settings
  const { data: settings, isLoading } = useQuery<AdminCSSettings>({
    queryKey: ['/api/admin/cs-projection-settings'],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<AdminCSSettings>) => {
      const response = await fetch('/api/admin/cs-projection-settings', {
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
        description: "Clean sheet projection model parameters have been updated successfully.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cs-projection-settings'] });
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
      const response = await fetch('/api/admin/cs-projection-settings/reset', {
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cs-projection-settings'] });
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

  const handleInputChange = (field: keyof AdminCSSettings, value: string) => {
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
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Team Clean Sheet Projections Admin</h1>
        </div>
        <div className="text-center py-8">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Team Clean Sheet Projections Admin</h1>
      </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Changes to these parameters will immediately affect Team Clean Sheet Projections calculations. 
          Use caution when modifying values as they impact all projection tools that depend on clean sheet data.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Core CS Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Core Clean Sheet Parameters</CardTitle>
            <CardDescription>Fundamental parameters affecting clean sheet calculations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="decayFactor">Decay Factor</Label>
                <Input
                  id="decayFactor"
                  type="number"
                  step="0.001"
                  value={formData.decayFactor || 0}
                  onChange={(e) => handleInputChange('decayFactor', e.target.value)}
                  data-testid="input-decay-factor"
                />
              </div>
              <div>
                <Label htmlFor="weakDefenseBoost">Weak Defense Boost</Label>
                <Input
                  id="weakDefenseBoost"
                  type="number"
                  step="0.01"
                  value={formData.weakDefenseBoost || 0}
                  onChange={(e) => handleInputChange('weakDefenseBoost', e.target.value)}
                  data-testid="input-weak-defense-boost"
                />
              </div>
              <div>
                <Label htmlFor="averageDefenseBoost">Average Defense Boost</Label>
                <Input
                  id="averageDefenseBoost"
                  type="number"
                  step="0.01"
                  value={formData.averageDefenseBoost || 0}
                  onChange={(e) => handleInputChange('averageDefenseBoost', e.target.value)}
                  data-testid="input-average-defense-boost"
                />
              </div>
              <div>
                <Label htmlFor="strongDefenseBoost">Strong Defense Boost</Label>
                <Input
                  id="strongDefenseBoost"
                  type="number"
                  step="0.01"
                  value={formData.strongDefenseBoost || 0}
                  onChange={(e) => handleInputChange('strongDefenseBoost', e.target.value)}
                  data-testid="input-strong-defense-boost"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Defensive Floors */}
        <Card>
          <CardHeader>
            <CardTitle>Defensive Floors by Tier</CardTitle>
            <CardDescription>Minimum clean sheet percentages for each defensive tier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="eliteDefensiveFloor">Elite Defensive Floor</Label>
                <Input
                  id="eliteDefensiveFloor"
                  type="number"
                  step="0.1"
                  value={formData.eliteDefensiveFloor || 0}
                  onChange={(e) => handleInputChange('eliteDefensiveFloor', e.target.value)}
                  data-testid="input-elite-defensive-floor"
                />
              </div>
              <div>
                <Label htmlFor="strongDefensiveFloor">Strong Defensive Floor</Label>
                <Input
                  id="strongDefensiveFloor"
                  type="number"
                  step="0.1"
                  value={formData.strongDefensiveFloor || 0}
                  onChange={(e) => handleInputChange('strongDefensiveFloor', e.target.value)}
                  data-testid="input-strong-defensive-floor"
                />
              </div>
              <div>
                <Label htmlFor="averageDefensiveFloor">Average Defensive Floor</Label>
                <Input
                  id="averageDefensiveFloor"
                  type="number"
                  step="0.1"
                  value={formData.averageDefensiveFloor || 0}
                  onChange={(e) => handleInputChange('averageDefensiveFloor', e.target.value)}
                  data-testid="input-average-defensive-floor"
                />
              </div>
              <div>
                <Label htmlFor="weakDefensiveFloor">Weak Defensive Floor</Label>
                <Input
                  id="weakDefensiveFloor"
                  type="number"
                  step="0.1"
                  value={formData.weakDefensiveFloor || 0}
                  onChange={(e) => handleInputChange('weakDefensiveFloor', e.target.value)}
                  data-testid="input-weak-defensive-floor"
                />
              </div>
              <div>
                <Label htmlFor="promotedDefensiveFloor">Promoted Defensive Floor</Label>
                <Input
                  id="promotedDefensiveFloor"
                  type="number"
                  step="0.1"
                  value={formData.promotedDefensiveFloor || 0}
                  onChange={(e) => handleInputChange('promotedDefensiveFloor', e.target.value)}
                  data-testid="input-promoted-defensive-floor"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Context Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle>Context Multipliers for Clean Sheets</CardTitle>
            <CardDescription>Situational adjustments for different match contexts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="derbyCSMultiplier">Derby Matches</Label>
                <Input
                  id="derbyCSMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.derbyCSMultiplier || 0}
                  onChange={(e) => handleInputChange('derbyCSMultiplier', e.target.value)}
                  data-testid="input-derby-cs-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="topSixCSMultiplier">Top Six Battles</Label>
                <Input
                  id="topSixCSMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.topSixCSMultiplier || 0}
                  onChange={(e) => handleInputChange('topSixCSMultiplier', e.target.value)}
                  data-testid="input-top-six-cs-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="relegationBattleCSMultiplier">Relegation Battles</Label>
                <Input
                  id="relegationBattleCSMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.relegationBattleCSMultiplier || 0}
                  onChange={(e) => handleInputChange('relegationBattleCSMultiplier', e.target.value)}
                  data-testid="input-relegation-battle-cs-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="earlyKickoffCSMultiplier">Early Kickoff</Label>
                <Input
                  id="earlyKickoffCSMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.earlyKickoffCSMultiplier || 0}
                  onChange={(e) => handleInputChange('earlyKickoffCSMultiplier', e.target.value)}
                  data-testid="input-early-kickoff-cs-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="lateKickoffCSMultiplier">Late Kickoff</Label>
                <Input
                  id="lateKickoffCSMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.lateKickoffCSMultiplier || 0}
                  onChange={(e) => handleInputChange('lateKickoffCSMultiplier', e.target.value)}
                  data-testid="input-late-kickoff-cs-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="postEuropeanCSMultiplier">Post-European Fixtures</Label>
                <Input
                  id="postEuropeanCSMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.postEuropeanCSMultiplier || 0}
                  onChange={(e) => handleInputChange('postEuropeanCSMultiplier', e.target.value)}
                  data-testid="input-post-european-cs-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="midweekFixtureCSMultiplier">Midweek Fixtures</Label>
                <Input
                  id="midweekFixtureCSMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.midweekFixtureCSMultiplier || 0}
                  onChange={(e) => handleInputChange('midweekFixtureCSMultiplier', e.target.value)}
                  data-testid="input-midweek-fixture-cs-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="seasonFinaleCSMultiplier">Season Finale</Label>
                <Input
                  id="seasonFinaleCSMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.seasonFinaleCSMultiplier || 0}
                  onChange={(e) => handleInputChange('seasonFinaleCSMultiplier', e.target.value)}
                  data-testid="input-season-finale-cs-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="newManagerBounceCSMultiplier">New Manager Bounce</Label>
                <Input
                  id="newManagerBounceCSMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.newManagerBounceCSMultiplier || 0}
                  onChange={(e) => handleInputChange('newManagerBounceCSMultiplier', e.target.value)}
                  data-testid="input-new-manager-bounce-cs-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="weatherConditionsCSMultiplier">Weather Conditions</Label>
                <Input
                  id="weatherConditionsCSMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.weatherConditionsCSMultiplier || 0}
                  onChange={(e) => handleInputChange('weatherConditionsCSMultiplier', e.target.value)}
                  data-testid="input-weather-conditions-cs-multiplier"
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