import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Settings, RotateCcw, Save, AlertTriangle, Target, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UnifiedProjectionSettings {
  // Auto balance setting
  autoBalance: boolean;
  
  // Global multipliers (affect both scoring and conceding)
  globalTierMultiplier: number;
  lowConfidenceBoost: number;
  lowConfidenceThreshold: number;
  
  // Contextual multipliers (affect both scoring and conceding)
  derbyMatchMultiplier: number;
  topSixMatchMultiplier: number;
  relegationBattleMultiplier: number;
  earlyKickoffMultiplier: number;
  lateKickoffMultiplier: number;
  postEuropeanMultiplier: number;
  midweekFixtureMultiplier: number;
  seasonFinaleMultiplier: number;
  newManagerBounceMultiplier: number;
  weatherConditionsMultiplier: number;
  
  // Team tier multipliers for attacking (goals scored)
  eliteAttackMultiplier: number;
  strongAttackMultiplier: number;
  averageAttackMultiplier: number;
  weakAttackMultiplier: number;
  promotedAttackMultiplier: number;
  
  // Team tier multipliers for defending (goals conceded)
  eliteDefenseMultiplier: number;
  strongDefenseMultiplier: number;
  averageDefenseMultiplier: number;
  weakDefenseMultiplier: number;
  promotedDefenseMultiplier: number;
  
  // Market bounds
  absoluteMinGoals: number;
  absoluteMaxGoals: number;
  marketFloorMultiplier: number;
  marketCeilingMultiplier: number;
  
  // Metadata
  lastUpdated: string;
  updatedBy: string;
}

export default function AdminUnifiedProjections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<UnifiedProjectionSettings>({} as UnifiedProjectionSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current unified settings
  const { data: settings, isLoading } = useQuery<UnifiedProjectionSettings>({
    queryKey: ['/api/admin/unified-projection-settings'],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<UnifiedProjectionSettings>) => {
      const response = await fetch('/api/admin/unified-projection-settings', {
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
        description: "Unified projection model parameters have been updated successfully. Goals scored and conceded are now perfectly synchronized.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/unified-projection-settings'] });
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
      const response = await fetch('/api/admin/unified-projection-settings/reset', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to reset settings');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Reset",
        description: "All unified projection settings have been reset to defaults.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/unified-projection-settings'] });
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

  const handleInputChange = (field: keyof UnifiedProjectionSettings, value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      setFormData(prev => ({ ...prev, [field]: numericValue }));
      setHasChanges(true);
    }
  };

  const handleSwitchChange = (field: keyof UnifiedProjectionSettings, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleReset = () => {
    resetSettingsMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-lg">Loading unified projection settings...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6 text-blue-600" />
        <h1 className="text-3xl font-bold">Unified Projection Admin</h1>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Data Consistency:</strong> This unified admin portal ensures that goals scored and goals conceded are perfectly synchronized. 
          When Team A scores X goals against Team B, Team B concedes exactly X goals from Team A. Total goals scored = Total goals conceded across all teams.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="global">Global Settings</TabsTrigger>
          <TabsTrigger value="attacking">Attacking Tiers</TabsTrigger>
          <TabsTrigger value="defending">Defending Tiers</TabsTrigger>
          <TabsTrigger value="bounds">Market Bounds</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Global Multipliers
              </CardTitle>
              <CardDescription>
                These settings affect both goals scored and goals conceded calculations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
                <div className="space-y-2">
                  <Label htmlFor="autoBalance" className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    Auto Balance Goals
                  </Label>
                  <p className="text-base text-blue-700 dark:text-blue-300 max-w-md">
                    <strong>Single Setting Control:</strong> Automatically ensures Goals Scored = Goals Against across all teams with perfect mathematical consistency.
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    ✓ Maintains your defensive variance (Arsenal ~30 goals, West Ham ~85 goals)<br/>
                    ✓ Handles all balancing automatically<br/>
                    ✓ No manual adjustments needed
                  </p>
                </div>
                <Switch
                  id="autoBalance"
                  checked={formData.autoBalance || false}
                  onCheckedChange={(checked) => handleSwitchChange('autoBalance', checked)}
                  data-testid="switch-autoBalance"
                  className="scale-150"
                />
              </div>
              
              {!formData.autoBalance && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-orange-50 dark:bg-orange-950">
                  <div className="col-span-full">
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                      <strong>Manual Mode:</strong> Auto Balance is disabled. Manual controls available (not recommended for perfect consistency).
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="globalTierMultiplier">Global Tier Multiplier</Label>
                    <Input
                      id="globalTierMultiplier"
                      type="number"
                      step="0.01"
                      value={formData.globalTierMultiplier || ''}
                      onChange={(e) => handleInputChange('globalTierMultiplier', e.target.value)}
                      data-testid="input-globalTierMultiplier"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lowConfidenceBoost">Low Confidence Boost</Label>
                    <Input
                      id="lowConfidenceBoost"
                      type="number"
                      step="0.01"
                      value={formData.lowConfidenceBoost || ''}
                      onChange={(e) => handleInputChange('lowConfidenceBoost', e.target.value)}
                      data-testid="input-lowConfidenceBoost"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lowConfidenceThreshold">Low Confidence Threshold</Label>
                    <Input
                      id="lowConfidenceThreshold"
                      type="number"
                      step="0.01"
                      value={formData.lowConfidenceThreshold || ''}
                      onChange={(e) => handleInputChange('lowConfidenceThreshold', e.target.value)}
                      data-testid="input-lowConfidenceThreshold"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contextual Multipliers</CardTitle>
              <CardDescription>
                These affect match outcomes based on context (both scoring and conceding)
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="derbyMatchMultiplier">Derby Match Multiplier</Label>
                <Input
                  id="derbyMatchMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.derbyMatchMultiplier || ''}
                  onChange={(e) => handleInputChange('derbyMatchMultiplier', e.target.value)}
                  data-testid="input-derbyMatchMultiplier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topSixMatchMultiplier">Top Six Match Multiplier</Label>
                <Input
                  id="topSixMatchMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.topSixMatchMultiplier || ''}
                  onChange={(e) => handleInputChange('topSixMatchMultiplier', e.target.value)}
                  data-testid="input-topSixMatchMultiplier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relegationBattleMultiplier">Relegation Battle Multiplier</Label>
                <Input
                  id="relegationBattleMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.relegationBattleMultiplier || ''}
                  onChange={(e) => handleInputChange('relegationBattleMultiplier', e.target.value)}
                  data-testid="input-relegationBattleMultiplier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="earlyKickoffMultiplier">Early Kickoff Multiplier</Label>
                <Input
                  id="earlyKickoffMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.earlyKickoffMultiplier || ''}
                  onChange={(e) => handleInputChange('earlyKickoffMultiplier', e.target.value)}
                  data-testid="input-earlyKickoffMultiplier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lateKickoffMultiplier">Late Kickoff Multiplier</Label>
                <Input
                  id="lateKickoffMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.lateKickoffMultiplier || ''}
                  onChange={(e) => handleInputChange('lateKickoffMultiplier', e.target.value)}
                  data-testid="input-lateKickoffMultiplier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newManagerBounceMultiplier">New Manager Bounce Multiplier</Label>
                <Input
                  id="newManagerBounceMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.newManagerBounceMultiplier || ''}
                  onChange={(e) => handleInputChange('newManagerBounceMultiplier', e.target.value)}
                  data-testid="input-newManagerBounceMultiplier"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attacking" className="space-y-6">
          {formData.autoBalance && (
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950 text-center">
              <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                🤖 Auto Balance Mode Active
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                Attacking multipliers are automatically managed for perfect balance. Turn off Auto Balance to see manual controls.
              </p>
            </div>
          )}
          
          <Card className={formData.autoBalance ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Attacking Tier Multipliers
              </CardTitle>
              <CardDescription>
                Controls how many goals teams score based on their attacking strength
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eliteAttackMultiplier">Elite Attack Multiplier</Label>
                <Input
                  id="eliteAttackMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.eliteAttackMultiplier || ''}
                  onChange={(e) => handleInputChange('eliteAttackMultiplier', e.target.value)}
                  data-testid="input-eliteAttackMultiplier"
                />
                <p className="text-sm text-gray-500">Man City, Arsenal, Liverpool</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="strongAttackMultiplier">Strong Attack Multiplier</Label>
                <Input
                  id="strongAttackMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.strongAttackMultiplier || ''}
                  onChange={(e) => handleInputChange('strongAttackMultiplier', e.target.value)}
                  data-testid="input-strongAttackMultiplier"
                />
                <p className="text-sm text-gray-500">Chelsea, Tottenham, Brighton</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="averageAttackMultiplier">Average Attack Multiplier</Label>
                <Input
                  id="averageAttackMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.averageAttackMultiplier || ''}
                  onChange={(e) => handleInputChange('averageAttackMultiplier', e.target.value)}
                  data-testid="input-averageAttackMultiplier"
                />
                <p className="text-sm text-gray-500">Mid-table teams</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weakAttackMultiplier">Weak Attack Multiplier</Label>
                <Input
                  id="weakAttackMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.weakAttackMultiplier || ''}
                  onChange={(e) => handleInputChange('weakAttackMultiplier', e.target.value)}
                  data-testid="input-weakAttackMultiplier"
                />
                <p className="text-sm text-gray-500">Struggling attacking teams</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotedAttackMultiplier">Promoted Attack Multiplier</Label>
                <Input
                  id="promotedAttackMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.promotedAttackMultiplier || ''}
                  onChange={(e) => handleInputChange('promotedAttackMultiplier', e.target.value)}
                  data-testid="input-promotedAttackMultiplier"
                />
                <p className="text-sm text-gray-500">Newly promoted teams</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-red-600" />
                Defending Tier Multipliers
              </CardTitle>
              <CardDescription>
                Controls how many goals teams concede based on their defensive strength. Lower values = stronger defense.
                {formData.autoBalance && (
                  <span className="block mt-2 text-green-600 font-medium">
                    ✓ These settings work with Auto Balance - your defensive variance is preserved!
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eliteDefenseMultiplier">Elite Defense Multiplier</Label>
                <Input
                  id="eliteDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.eliteDefenseMultiplier || ''}
                  onChange={(e) => handleInputChange('eliteDefenseMultiplier', e.target.value)}
                  data-testid="input-eliteDefenseMultiplier"
                />
                <p className="text-sm text-gray-500">Arsenal, Man City, Liverpool (concede fewer)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="strongDefenseMultiplier">Strong Defense Multiplier</Label>
                <Input
                  id="strongDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.strongDefenseMultiplier || ''}
                  onChange={(e) => handleInputChange('strongDefenseMultiplier', e.target.value)}
                  data-testid="input-strongDefenseMultiplier"
                />
                <p className="text-sm text-gray-500">Brighton, Newcastle, Aston Villa</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="averageDefenseMultiplier">Average Defense Multiplier</Label>
                <Input
                  id="averageDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.averageDefenseMultiplier || ''}
                  onChange={(e) => handleInputChange('averageDefenseMultiplier', e.target.value)}
                  data-testid="input-averageDefenseMultiplier"
                />
                <p className="text-sm text-gray-500">Mid-table defensive units</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weakDefenseMultiplier">Weak Defense Multiplier</Label>
                <Input
                  id="weakDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.weakDefenseMultiplier || ''}
                  onChange={(e) => handleInputChange('weakDefenseMultiplier', e.target.value)}
                  data-testid="input-weakDefenseMultiplier"
                />
                <p className="text-sm text-gray-500">Defensively vulnerable teams (concede more)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotedDefenseMultiplier">Promoted Defense Multiplier</Label>
                <Input
                  id="promotedDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.promotedDefenseMultiplier || ''}
                  onChange={(e) => handleInputChange('promotedDefenseMultiplier', e.target.value)}
                  data-testid="input-promotedDefenseMultiplier"
                />
                <p className="text-sm text-gray-500">Newly promoted teams (highest conceding)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bounds" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Market Bounds & Limits</CardTitle>
              <CardDescription>
                Controls the minimum and maximum goals that can be projected for any team
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="absoluteMinGoals">Absolute Min Goals</Label>
                <Input
                  id="absoluteMinGoals"
                  type="number"
                  step="0.1"
                  value={formData.absoluteMinGoals || ''}
                  onChange={(e) => handleInputChange('absoluteMinGoals', e.target.value)}
                  data-testid="input-absoluteMinGoals"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="absoluteMaxGoals">Absolute Max Goals</Label>
                <Input
                  id="absoluteMaxGoals"
                  type="number"
                  step="0.1"
                  value={formData.absoluteMaxGoals || ''}
                  onChange={(e) => handleInputChange('absoluteMaxGoals', e.target.value)}
                  data-testid="input-absoluteMaxGoals"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketFloorMultiplier">Market Floor Multiplier</Label>
                <Input
                  id="marketFloorMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.marketFloorMultiplier || ''}
                  onChange={(e) => handleInputChange('marketFloorMultiplier', e.target.value)}
                  data-testid="input-marketFloorMultiplier"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketCeilingMultiplier">Market Ceiling Multiplier</Label>
                <Input
                  id="marketCeilingMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.marketCeilingMultiplier || ''}
                  onChange={(e) => handleInputChange('marketCeilingMultiplier', e.target.value)}
                  data-testid="input-marketCeilingMultiplier"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {settings?.lastUpdated && (
            <p>Last updated: {new Date(settings.lastUpdated).toLocaleString()} by {settings.updatedBy}</p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetSettingsMutation.isPending}
            className="flex items-center gap-2"
            data-testid="button-reset"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || updateSettingsMutation.isPending}
            className="flex items-center gap-2"
            data-testid="button-save"
          >
            <Save className="h-4 w-4" />
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Alert className="border-green-200 bg-green-50">
        <AlertTriangle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Perfect Synchronization:</strong> Changes to these settings will update both goals scored and goals conceded projections simultaneously, 
          ensuring that total league goals remain consistent and realistic.
        </AlertDescription>
      </Alert>
    </div>
  );
}