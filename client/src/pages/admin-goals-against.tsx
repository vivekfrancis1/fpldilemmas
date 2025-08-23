import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Target, RotateCcw, Save, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminGoalsAgainstSettings {
  globalDefensiveMultiplier: number;
  defensiveConfidenceBoost: number;
  weakDefenseThreshold: number;
  eliteDefenseMultiplier: number;
  strongDefenseMultiplier: number;
  averageDefenseMultiplier: number;
  weakDefenseMultiplier: number;
  promotedDefenseMultiplier: number;
  minGoalsAgainst: number;
  maxGoalsAgainst: number;
  lastUpdated: string;
  updatedBy: string;
}

export default function AdminGoalsAgainst() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<AdminGoalsAgainstSettings>({} as AdminGoalsAgainstSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current admin settings
  const { data: settings, isLoading } = useQuery<AdminGoalsAgainstSettings>({
    queryKey: ['/api/admin/goals-against-settings'],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<AdminGoalsAgainstSettings>) => {
      const response = await fetch('/api/admin/goals-against-settings', {
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
        description: "Goals against projection model parameters have been updated successfully.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/goals-against-settings'] });
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
      const response = await fetch('/api/admin/goals-against-settings/reset', {
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/goals-against-settings'] });
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

  const handleInputChange = (field: keyof AdminGoalsAgainstSettings, value: string) => {
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
          <Target className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Team Goals Against Projections Admin</h1>
        </div>
        <div className="text-center py-8">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Team Goals Against Projections Admin</h1>
      </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Changes to these parameters will immediately affect Team Goals Against Projections calculations. 
          Use caution when modifying values as they impact defensive projection accuracy.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Core Defensive Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Core Defensive Parameters</CardTitle>
            <CardDescription>Fundamental parameters affecting goals against calculations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="globalDefensiveMultiplier">Global Defensive Multiplier</Label>
                <Input
                  id="globalDefensiveMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.globalDefensiveMultiplier || 0}
                  onChange={(e) => handleInputChange('globalDefensiveMultiplier', e.target.value)}
                  data-testid="input-global-defensive-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="defensiveConfidenceBoost">Defensive Confidence Boost</Label>
                <Input
                  id="defensiveConfidenceBoost"
                  type="number"
                  step="0.01"
                  value={formData.defensiveConfidenceBoost || 0}
                  onChange={(e) => handleInputChange('defensiveConfidenceBoost', e.target.value)}
                  data-testid="input-defensive-confidence-boost"
                />
              </div>
              <div>
                <Label htmlFor="weakDefenseThreshold">Weak Defense Threshold</Label>
                <Input
                  id="weakDefenseThreshold"
                  type="number"
                  step="0.01"
                  value={formData.weakDefenseThreshold || 0}
                  onChange={(e) => handleInputChange('weakDefenseThreshold', e.target.value)}
                  data-testid="input-weak-defense-threshold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Defensive Tier Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle>Defensive Tier Multipliers</CardTitle>
            <CardDescription>Goal concession multipliers for different defensive qualities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="eliteDefenseMultiplier">Elite Defense</Label>
                <Input
                  id="eliteDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.eliteDefenseMultiplier || 0}
                  onChange={(e) => handleInputChange('eliteDefenseMultiplier', e.target.value)}
                  data-testid="input-elite-defense-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="strongDefenseMultiplier">Strong Defense</Label>
                <Input
                  id="strongDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.strongDefenseMultiplier || 0}
                  onChange={(e) => handleInputChange('strongDefenseMultiplier', e.target.value)}
                  data-testid="input-strong-defense-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="averageDefenseMultiplier">Average Defense</Label>
                <Input
                  id="averageDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.averageDefenseMultiplier || 0}
                  onChange={(e) => handleInputChange('averageDefenseMultiplier', e.target.value)}
                  data-testid="input-average-defense-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="weakDefenseMultiplier">Weak Defense</Label>
                <Input
                  id="weakDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.weakDefenseMultiplier || 0}
                  onChange={(e) => handleInputChange('weakDefenseMultiplier', e.target.value)}
                  data-testid="input-weak-defense-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="promotedDefenseMultiplier">Promoted Defense</Label>
                <Input
                  id="promotedDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.promotedDefenseMultiplier || 0}
                  onChange={(e) => handleInputChange('promotedDefenseMultiplier', e.target.value)}
                  data-testid="input-promoted-defense-multiplier"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Against Bounds */}
        <Card>
          <CardHeader>
            <CardTitle>Goals Against Bounds</CardTitle>
            <CardDescription>Minimum and maximum goals against per game limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minGoalsAgainst">Minimum Goals Against</Label>
                <Input
                  id="minGoalsAgainst"
                  type="number"
                  step="0.01"
                  value={formData.minGoalsAgainst || 0}
                  onChange={(e) => handleInputChange('minGoalsAgainst', e.target.value)}
                  data-testid="input-min-goals-against"
                />
              </div>
              <div>
                <Label htmlFor="maxGoalsAgainst">Maximum Goals Against</Label>
                <Input
                  id="maxGoalsAgainst"
                  type="number"
                  step="0.01"
                  value={formData.maxGoalsAgainst || 0}
                  onChange={(e) => handleInputChange('maxGoalsAgainst', e.target.value)}
                  data-testid="input-max-goals-against"
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