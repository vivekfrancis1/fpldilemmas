import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Zap, RotateCcw, Save, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminAssistSettings {
  globalAssistMultiplier: number;
  creativityBoost: number;
  lowCreativityThreshold: number;
  eliteAttackMultiplier: number;
  strongAttackMultiplier: number;
  averageAttackMultiplier: number;
  weakAttackMultiplier: number;
  promotedAttackMultiplier: number;
  minAssistsPerGame: number;
  maxAssistsPerGame: number;
  lastUpdated: string;
  updatedBy: string;
}

export default function AdminAssistProjections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<AdminAssistSettings>({} as AdminAssistSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current admin settings
  const { data: settings, isLoading } = useQuery<AdminAssistSettings>({
    queryKey: ['/api/admin/assist-projection-settings'],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<AdminAssistSettings>) => {
      const response = await fetch('/api/admin/assist-projection-settings', {
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
        description: "Assist projection model parameters have been updated successfully.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assist-projection-settings'] });
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
      const response = await fetch('/api/admin/assist-projection-settings/reset', {
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assist-projection-settings'] });
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

  const handleInputChange = (field: keyof AdminAssistSettings, value: string) => {
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
          <Zap className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Team Assist Projections Admin</h1>
        </div>
        <div className="text-center py-8">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Team Assist Projections Admin</h1>
      </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Changes to these parameters will immediately affect Team Assist Projections calculations. 
          Use caution when modifying values as they impact creativity and attacking projection accuracy.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Core Assist Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Core Assist Parameters</CardTitle>
            <CardDescription>Fundamental parameters affecting assist calculations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="globalAssistMultiplier">Global Assist Multiplier</Label>
                <Input
                  id="globalAssistMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.globalAssistMultiplier || 0}
                  onChange={(e) => handleInputChange('globalAssistMultiplier', e.target.value)}
                  data-testid="input-global-assist-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="creativityBoost">Creativity Boost</Label>
                <Input
                  id="creativityBoost"
                  type="number"
                  step="0.01"
                  value={formData.creativityBoost || 0}
                  onChange={(e) => handleInputChange('creativityBoost', e.target.value)}
                  data-testid="input-creativity-boost"
                />
              </div>
              <div>
                <Label htmlFor="lowCreativityThreshold">Low Creativity Threshold</Label>
                <Input
                  id="lowCreativityThreshold"
                  type="number"
                  step="0.01"
                  value={formData.lowCreativityThreshold || 0}
                  onChange={(e) => handleInputChange('lowCreativityThreshold', e.target.value)}
                  data-testid="input-low-creativity-threshold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attacking Tier Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle>Attacking Tier Multipliers</CardTitle>
            <CardDescription>Assist generation multipliers for different attacking qualities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="eliteAttackMultiplier">Elite Attack</Label>
                <Input
                  id="eliteAttackMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.eliteAttackMultiplier || 0}
                  onChange={(e) => handleInputChange('eliteAttackMultiplier', e.target.value)}
                  data-testid="input-elite-attack-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="strongAttackMultiplier">Strong Attack</Label>
                <Input
                  id="strongAttackMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.strongAttackMultiplier || 0}
                  onChange={(e) => handleInputChange('strongAttackMultiplier', e.target.value)}
                  data-testid="input-strong-attack-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="averageAttackMultiplier">Average Attack</Label>
                <Input
                  id="averageAttackMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.averageAttackMultiplier || 0}
                  onChange={(e) => handleInputChange('averageAttackMultiplier', e.target.value)}
                  data-testid="input-average-attack-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="weakAttackMultiplier">Weak Attack</Label>
                <Input
                  id="weakAttackMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.weakAttackMultiplier || 0}
                  onChange={(e) => handleInputChange('weakAttackMultiplier', e.target.value)}
                  data-testid="input-weak-attack-multiplier"
                />
              </div>
              <div>
                <Label htmlFor="promotedAttackMultiplier">Promoted Attack</Label>
                <Input
                  id="promotedAttackMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.promotedAttackMultiplier || 0}
                  onChange={(e) => handleInputChange('promotedAttackMultiplier', e.target.value)}
                  data-testid="input-promoted-attack-multiplier"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assist Bounds */}
        <Card>
          <CardHeader>
            <CardTitle>Assist Bounds</CardTitle>
            <CardDescription>Minimum and maximum assists per game limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minAssistsPerGame">Minimum Assists Per Game</Label>
                <Input
                  id="minAssistsPerGame"
                  type="number"
                  step="0.01"
                  value={formData.minAssistsPerGame || 0}
                  onChange={(e) => handleInputChange('minAssistsPerGame', e.target.value)}
                  data-testid="input-min-assists-per-game"
                />
              </div>
              <div>
                <Label htmlFor="maxAssistsPerGame">Maximum Assists Per Game</Label>
                <Input
                  id="maxAssistsPerGame"
                  type="number"
                  step="0.01"
                  value={formData.maxAssistsPerGame || 0}
                  onChange={(e) => handleInputChange('maxAssistsPerGame', e.target.value)}
                  data-testid="input-max-assists-per-game"
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