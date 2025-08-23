import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Calendar, RotateCcw, Save, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminMatchSettings {
  homeAdvantageMultiplier: number;
  strengthMultiplierBase: number;
  homeMinGoals: number;
  homeMaxGoals: number;
  awayMinGoals: number;
  awayMaxGoals: number;
  cleanSheetExponent: number;
  cleanSheetMultiplier: number;
  derbyMatchMultiplier: number;
  topSixMatchMultiplier: number;
  relegationBattleMultiplier: number;
  lastUpdated: string;
  updatedBy: string;
}

export default function AdminMatchProjections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<AdminMatchSettings>({} as AdminMatchSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current admin settings
  const { data: settings, isLoading } = useQuery<AdminMatchSettings>({
    queryKey: ['/api/admin/match-projection-settings'],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<AdminMatchSettings>) => {
      const response = await fetch('/api/admin/match-projection-settings', {
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
        description: "Match projection model parameters have been updated successfully.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/match-projection-settings'] });
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
      const response = await fetch('/api/admin/match-projection-settings/reset', {
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/match-projection-settings'] });
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

  const handleInputChange = (field: keyof AdminMatchSettings, value: string) => {
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
          <Calendar className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Match Projections Admin</h1>
        </div>
        <div className="text-center py-8">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Match Projections Admin</h1>
      </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Changes to these parameters will immediately affect Match Projections calculations. 
          Use caution when modifying values as they impact all match outcome predictions.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Core Match Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Core Match Parameters</CardTitle>
            <CardDescription>Fundamental parameters affecting match projections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="homeAdvantageMultiplier">Home Advantage Multiplier</Label>
                <Input
                  id="homeAdvantageMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.homeAdvantageMultiplier || 0}
                  onChange={(e) => handleInputChange('homeAdvantageMultiplier', e.target.value)}
                  data-testid="input-home-advantage-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="strengthMultiplierBase">Strength Multiplier Base</Label>
                <Input
                  id="strengthMultiplierBase"
                  type="number"
                  step="0.01"
                  value={formData.strengthMultiplierBase || 0}
                  onChange={(e) => handleInputChange('strengthMultiplierBase', e.target.value)}
                  data-testid="input-strength-multiplier-base"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goal Bounds */}
        <Card>
          <CardHeader>
            <CardTitle>Goal Bounds</CardTitle>
            <CardDescription>Minimum and maximum goal limits for match projections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Home Team Bounds</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homeMinGoals">Min Goals</Label>
                    <Input
                      id="homeMinGoals"
                      type="number"
                      step="0.01"
                      value={formData.homeMinGoals || 0}
                      onChange={(e) => handleInputChange('homeMinGoals', e.target.value)}
                      data-testid="input-home-min-goals"
                    />
                  </div>
                  <div>
                    <Label htmlFor="homeMaxGoals">Max Goals</Label>
                    <Input
                      id="homeMaxGoals"
                      type="number"
                      step="0.01"
                      value={formData.homeMaxGoals || 0}
                      onChange={(e) => handleInputChange('homeMaxGoals', e.target.value)}
                      data-testid="input-home-max-goals"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Away Team Bounds</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="awayMinGoals">Min Goals</Label>
                    <Input
                      id="awayMinGoals"
                      type="number"
                      step="0.01"
                      value={formData.awayMinGoals || 0}
                      onChange={(e) => handleInputChange('awayMinGoals', e.target.value)}
                      data-testid="input-away-min-goals"
                    />
                  </div>
                  <div>
                    <Label htmlFor="awayMaxGoals">Max Goals</Label>
                    <Input
                      id="awayMaxGoals"
                      type="number"
                      step="0.01"
                      value={formData.awayMaxGoals || 0}
                      onChange={(e) => handleInputChange('awayMaxGoals', e.target.value)}
                      data-testid="input-away-max-goals"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clean Sheet Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Clean Sheet Parameters</CardTitle>
            <CardDescription>Parameters for clean sheet probability calculations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cleanSheetExponent">Clean Sheet Exponent</Label>
                <Input
                  id="cleanSheetExponent"
                  type="number"
                  step="0.01"
                  value={formData.cleanSheetExponent || 0}
                  onChange={(e) => handleInputChange('cleanSheetExponent', e.target.value)}
                  data-testid="input-clean-sheet-exponent"
                />
              </div>
              <div>
                <Label htmlFor="cleanSheetMultiplier">Clean Sheet Multiplier</Label>
                <Input
                  id="cleanSheetMultiplier"
                  type="number"
                  step="1"
                  value={formData.cleanSheetMultiplier || 0}
                  onChange={(e) => handleInputChange('cleanSheetMultiplier', e.target.value)}
                  data-testid="input-clean-sheet-multiplier"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Context Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle>Match Context Multipliers</CardTitle>
            <CardDescription>Adjustments for different match contexts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="derbyMatchMultiplier">Derby Matches</Label>
                <Input
                  id="derbyMatchMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.derbyMatchMultiplier || 0}
                  onChange={(e) => handleInputChange('derbyMatchMultiplier', e.target.value)}
                  data-testid="input-derby-match-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="topSixMatchMultiplier">Top Six Matches</Label>
                <Input
                  id="topSixMatchMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.topSixMatchMultiplier || 0}
                  onChange={(e) => handleInputChange('topSixMatchMultiplier', e.target.value)}
                  data-testid="input-top-six-match-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="relegationBattleMultiplier">Relegation Battles</Label>
                <Input
                  id="relegationBattleMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.relegationBattleMultiplier || 0}
                  onChange={(e) => handleInputChange('relegationBattleMultiplier', e.target.value)}
                  data-testid="input-relegation-battle-multiplier"
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