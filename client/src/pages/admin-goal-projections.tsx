import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, RotateCcw, Save, AlertTriangle, Users, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Team {
  id: number;
  name: string;
  short_name: string;
  code: number;
}

interface AdminSettings {
  globalTierMultiplier: number;
  lowConfidenceBoost: number;
  lowConfidenceThreshold: number;
  // Attacking Tier Multipliers
  eliteAttackMultiplier: number;
  strongAttackMultiplier: number;
  averageAttackMultiplier: number;
  weakAttackMultiplier: number;
  promotedAttackMultiplier: number;
  // Team Tier Assignments
  eliteAttackTeams: number[];
  strongAttackTeams: number[];
  averageAttackTeams: number[];
  weakAttackTeams: number[];
  promotedAttackTeams: number[];
  // Defensive Tier Multipliers
  eliteDefenseMultiplier: number;
  strongDefenseMultiplier: number;
  averageDefenseMultiplier: number;
  weakDefenseMultiplier: number;
  promotedDefenseMultiplier: number;
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

// Default team tier assignments based on current Premier League standings and performance
const DEFAULT_TEAM_TIERS = {
  eliteAttackTeams: [1, 2], // Arsenal, Man City
  strongAttackTeams: [3, 4, 5, 6], // Liverpool, Newcastle, Chelsea, Tottenham
  averageAttackTeams: [7, 8, 9, 10, 11, 12, 13, 14], // Brighton, Aston Villa, West Ham, Crystal Palace, Bournemouth, Fulham, Wolves, Everton
  weakAttackTeams: [15, 16, 17], // Brentford, Nottm Forest, Man Utd
  promotedAttackTeams: [18, 19, 20], // Leicester, Ipswich, Southampton
};

export default function AdminGoalProjections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<AdminSettings>({} as AdminSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch team data from bootstrap
  const { data: bootstrapData } = useQuery({
    queryKey: ['/api/bootstrap-static'],
    staleTime: 5 * 60 * 1000,
  });

  const teams: Team[] = (bootstrapData as any)?.teams || [];

  // Fetch current admin settings from unified projection settings
  const { data: settings, isLoading } = useQuery<AdminSettings>({
    queryKey: ['/api/admin/unified-projection-settings'],
  });

  // Update settings mutation using unified projection settings endpoint
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<AdminSettings>) => {
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
        description: "Team tier assignments and projection parameters have been updated successfully.",
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

  // Reset settings mutation using unified projection settings
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
        description: "All settings and team assignments have been reset to default values.",
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

  // Default team tier assignments
  const DEFAULT_TEAM_TIERS = {
    eliteAttackTeams: [1, 13], // Arsenal, Man City
    strongAttackTeams: [12, 15, 7, 18], // Liverpool, Newcastle, Chelsea, Tottenham
    averageAttackTeams: [6, 2, 21, 8, 5, 11, 20, 10], // Brighton, Aston Villa, West Ham, Crystal Palace, Bournemouth, Fulham, Wolves, Everton
    weakAttackTeams: [4, 16, 14], // Brentford, Nottm Forest, Man Utd
    promotedAttackTeams: [9, 17, 19], // Leicester, Ipswich, Southampton
  };

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (settings) {
      // Initialize team tier assignments if they don't exist
      const settingsWithDefaults = {
        ...settings,
        eliteAttackTeams: settings.eliteAttackTeams || DEFAULT_TEAM_TIERS.eliteAttackTeams,
        strongAttackTeams: settings.strongAttackTeams || DEFAULT_TEAM_TIERS.strongAttackTeams,
        averageAttackTeams: settings.averageAttackTeams || DEFAULT_TEAM_TIERS.averageAttackTeams,
        weakAttackTeams: settings.weakAttackTeams || DEFAULT_TEAM_TIERS.weakAttackTeams,
        promotedAttackTeams: settings.promotedAttackTeams || DEFAULT_TEAM_TIERS.promotedAttackTeams,
      };
      setFormData(settingsWithDefaults);
      setHasChanges(false);
    }
  }, [settings]);

  const handleInputChange = (field: keyof AdminSettings, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numericValue }));
    setHasChanges(true);
  };

  // Team tier assignment helper functions
  const getTeamTier = (teamId: number): string => {
    if (formData.eliteAttackTeams?.includes(teamId)) return 'elite';
    if (formData.strongAttackTeams?.includes(teamId)) return 'strong';
    if (formData.weakAttackTeams?.includes(teamId)) return 'weak';
    if (formData.promotedAttackTeams?.includes(teamId)) return 'promoted';
    return 'average';
  };

  const getTeamsByTier = (tier: string) => {
    return teams.filter(team => getTeamTier(team.id) === tier);
  };

  const handleTeamTierChange = (teamId: number, newTier: string) => {
    setFormData(prev => {
      // Remove team from all tier arrays
      const updated = {
        ...prev,
        eliteAttackTeams: (prev.eliteAttackTeams || []).filter(id => id !== teamId),
        strongAttackTeams: (prev.strongAttackTeams || []).filter(id => id !== teamId),
        averageAttackTeams: (prev.averageAttackTeams || []).filter(id => id !== teamId),
        weakAttackTeams: (prev.weakAttackTeams || []).filter(id => id !== teamId),
        promotedAttackTeams: (prev.promotedAttackTeams || []).filter(id => id !== teamId),
      };

      // Add team to new tier
      switch (newTier) {
        case 'elite':
          updated.eliteAttackTeams = [...(updated.eliteAttackTeams || []), teamId];
          break;
        case 'strong':
          updated.strongAttackTeams = [...(updated.strongAttackTeams || []), teamId];
          break;
        case 'average':
          updated.averageAttackTeams = [...(updated.averageAttackTeams || []), teamId];
          break;
        case 'weak':
          updated.weakAttackTeams = [...(updated.weakAttackTeams || []), teamId];
          break;
        case 'promoted':
          updated.promotedAttackTeams = [...(updated.promotedAttackTeams || []), teamId];
          break;
      }

      return updated;
    });
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
          <h1 className="text-2xl font-bold">Configuration Portal - Team Goals Scored</h1>
        </div>
        <div className="text-center py-8">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Configuration Portal - Team Goals Scored</h1>
      </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Configuration Portal - Team Goals Scored</strong><br/>
          This interface controls 27 advanced parameters that determine how teams score goals across all gameweeks. 
          Changes apply immediately and maintain perfect mathematical consistency with Goals Against projections.
          <br/><br/>
          <strong>Mathematical Integration:</strong> These parameters work with the Goals Against system to ensure total league goals scored = total league goals conceded, 
          maintaining realistic Premier League ranges (30-85 goals per season per team) and gameweek-level balance.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="global" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="global">Global Multipliers</TabsTrigger>
          <TabsTrigger value="attacking">Attacking Tier</TabsTrigger>
          <TabsTrigger value="defensive">Defensive Tier</TabsTrigger>
          <TabsTrigger value="context">Context Multipliers</TabsTrigger>
          <TabsTrigger value="market">Market Bounds</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Global Multipliers</CardTitle>
              <CardDescription>Core multipliers applied across all teams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="globalTierMultiplier">Global Tier Multiplier</Label>
                  <Input
                    id="globalTierMultiplier"
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="3.0"
                    value={formData.globalTierMultiplier || 0}
                    onChange={(e) => handleInputChange('globalTierMultiplier', e.target.value)}
                    data-testid="input-global-tier-multiplier"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 1.25</strong><br/>
                    Master scaling factor applied to all team goal calculations. Higher values increase overall goal output across the league.<br/>
                    <em>Range: 0.5-3.0</em>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowConfidenceBoost">Low Confidence Boost</Label>
                  <Input
                    id="lowConfidenceBoost"
                    type="number"
                    step="0.01"
                    min="1.0"
                    max="2.0"
                    value={formData.lowConfidenceBoost || 0}
                    onChange={(e) => handleInputChange('lowConfidenceBoost', e.target.value)}
                    data-testid="input-low-confidence-boost"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 1.25</strong><br/>
                    Multiplier applied to teams below the confidence threshold to prevent unrealistically low projections.<br/>
                    <em>Range: 1.0-2.0</em>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowConfidenceThreshold">Low Confidence Threshold</Label>
                  <Input
                    id="lowConfidenceThreshold"
                    type="number"
                    step="0.01"
                    min="0.3"
                    max="0.8"
                    value={formData.lowConfidenceThreshold || 0}
                    onChange={(e) => handleInputChange('lowConfidenceThreshold', e.target.value)}
                    data-testid="input-low-confidence-threshold"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 0.65</strong><br/>
                    Confidence score below which the Low Confidence Boost is applied (0.0-1.0 scale).<br/>
                    <em>Range: 0.3-0.8</em>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attacking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Attacking Tier Multipliers & Team Assignments
              </CardTitle>
              <CardDescription>Team quality-based multipliers for goal scoring ability with configurable team assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Multiplier Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="eliteAttackMultiplier">Elite Attack Multiplier</Label>
                  <Input
                    id="eliteAttackMultiplier"
                    type="number"
                    step="0.01"
                    min="0.8"
                    max="1.5"
                    value={formData.eliteAttackMultiplier || 0}
                    onChange={(e) => handleInputChange('eliteAttackMultiplier', e.target.value)}
                    data-testid="input-elite-attack-multiplier"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 1.15</strong><br/>
                    <em>Range: 0.8-1.5</em>
                  </p>
                </div>
              <div className="space-y-2">
                <Label htmlFor="strongAttackMultiplier">Strong Attack</Label>
                <Input
                  id="strongAttackMultiplier"
                  type="number"
                  step="0.01"
                  min="0.8"
                  max="1.3"
                  value={formData.strongAttackMultiplier || 0}
                  onChange={(e) => handleInputChange('strongAttackMultiplier', e.target.value)}
                  data-testid="input-strong-attack-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 1.10</strong><br/>
                  Strong attacking teams with consistent goal threats.<br/>
                  <em>Range: 0.8-1.3</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="averageAttackMultiplier">Average Attack</Label>
                <Input
                  id="averageAttackMultiplier"
                  type="number"
                  step="0.01"
                  min="0.8"
                  max="1.2"
                  value={formData.averageAttackMultiplier || 0}
                  onChange={(e) => handleInputChange('averageAttackMultiplier', e.target.value)}
                  data-testid="input-average-attack-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 1.00</strong><br/>
                  Mid-table teams with average attacking output (baseline).<br/>
                  <em>Range: 0.8-1.2</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weakAttackMultiplier">Weak Attack</Label>
                <Input
                  id="weakAttackMultiplier"
                  type="number"
                  step="0.01"
                  min="0.6"
                  max="1.0"
                  value={formData.weakAttackMultiplier || 0}
                  onChange={(e) => handleInputChange('weakAttackMultiplier', e.target.value)}
                  data-testid="input-weak-attack-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.90</strong><br/>
                  Teams with limited attacking threats and low goal output.<br/>
                  <em>Range: 0.6-1.0</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="promotedAttackMultiplier">Promoted Attack</Label>
                <Input
                  id="promotedAttackMultiplier"
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="1.0"
                  value={formData.promotedAttackMultiplier || 0}
                  onChange={(e) => handleInputChange('promotedAttackMultiplier', e.target.value)}
                  data-testid="input-promoted-attack-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.85</strong><br/>
                  Newly promoted teams adapting to Premier League level.<br/>
                  <em>Range: 0.5-1.0</em>
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Team Assignment Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Team Tier Assignments</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Elite Attack Teams */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">Elite Attack (×{formData.eliteAttackMultiplier || 1.15})</Badge>
                  </div>
                  <div className="border rounded-lg p-3 min-h-[120px] bg-green-50">
                    <div className="space-y-2">
                      {getTeamsByTier('elite').map(team => (
                        <div key={team.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{team.short_name}</span>
                          <Select 
                            value="elite" 
                            onValueChange={(value) => handleTeamTierChange(team.id, value)}
                          >
                            <SelectTrigger className="w-20 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="elite">Elite</SelectItem>
                              <SelectItem value="strong">Strong</SelectItem>
                              <SelectItem value="average">Average</SelectItem>
                              <SelectItem value="weak">Weak</SelectItem>
                              <SelectItem value="promoted">Promoted</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Strong Attack Teams */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-blue-600">Strong Attack (×{formData.strongAttackMultiplier || 1.10})</Badge>
                  </div>
                  <div className="border rounded-lg p-3 min-h-[120px] bg-blue-50">
                    <div className="space-y-2">
                      {getTeamsByTier('strong').map(team => (
                        <div key={team.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{team.short_name}</span>
                          <Select 
                            value="strong" 
                            onValueChange={(value) => handleTeamTierChange(team.id, value)}
                          >
                            <SelectTrigger className="w-20 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="elite">Elite</SelectItem>
                              <SelectItem value="strong">Strong</SelectItem>
                              <SelectItem value="average">Average</SelectItem>
                              <SelectItem value="weak">Weak</SelectItem>
                              <SelectItem value="promoted">Promoted</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Average Attack Teams */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-gray-600">Average Attack (×{formData.averageAttackMultiplier || 1.00})</Badge>
                  </div>
                  <div className="border rounded-lg p-3 min-h-[120px] bg-gray-50">
                    <div className="space-y-2">
                      {getTeamsByTier('average').map(team => (
                        <div key={team.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{team.short_name}</span>
                          <Select 
                            value="average" 
                            onValueChange={(value) => handleTeamTierChange(team.id, value)}
                          >
                            <SelectTrigger className="w-20 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="elite">Elite</SelectItem>
                              <SelectItem value="strong">Strong</SelectItem>
                              <SelectItem value="average">Average</SelectItem>
                              <SelectItem value="weak">Weak</SelectItem>
                              <SelectItem value="promoted">Promoted</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Weak Attack Teams */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-orange-600">Weak Attack (×{formData.weakAttackMultiplier || 0.90})</Badge>
                  </div>
                  <div className="border rounded-lg p-3 min-h-[120px] bg-orange-50">
                    <div className="space-y-2">
                      {getTeamsByTier('weak').map(team => (
                        <div key={team.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{team.short_name}</span>
                          <Select 
                            value="weak" 
                            onValueChange={(value) => handleTeamTierChange(team.id, value)}
                          >
                            <SelectTrigger className="w-20 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="elite">Elite</SelectItem>
                              <SelectItem value="strong">Strong</SelectItem>
                              <SelectItem value="average">Average</SelectItem>
                              <SelectItem value="weak">Weak</SelectItem>
                              <SelectItem value="promoted">Promoted</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Promoted Attack Teams */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-red-600">Promoted Attack (×{formData.promotedAttackMultiplier || 0.85})</Badge>
                  </div>
                  <div className="border rounded-lg p-3 min-h-[120px] bg-red-50">
                    <div className="space-y-2">
                      {getTeamsByTier('promoted').map(team => (
                        <div key={team.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{team.short_name}</span>
                          <Select 
                            value="promoted" 
                            onValueChange={(value) => handleTeamTierChange(team.id, value)}
                          >
                            <SelectTrigger className="w-20 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="elite">Elite</SelectItem>
                              <SelectItem value="strong">Strong</SelectItem>
                              <SelectItem value="average">Average</SelectItem>
                              <SelectItem value="weak">Weak</SelectItem>
                              <SelectItem value="promoted">Promoted</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defensive" className="space-y-6">
          <Card>
          <CardHeader>
            <CardTitle>Defensive Tier Multipliers</CardTitle>
            <CardDescription>Team quality-based multipliers for defensive solidity (applied to goals conceded)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="space-y-2">
                <Label htmlFor="eliteDefenseMultiplier">Elite Defense</Label>
                <Input
                  id="eliteDefenseMultiplier"
                  type="number"
                  step="0.01"
                  min="0.4"
                  max="0.8"
                  value={formData.eliteDefenseMultiplier || 0}
                  onChange={(e) => handleInputChange('eliteDefenseMultiplier', e.target.value)}
                  data-testid="input-elite-defense-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.60</strong><br/>
                  Premier League elite defensive teams (Arsenal, Man City).<br/>
                  <em>Range: 0.4-0.8</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="strongDefenseMultiplier">Strong Defense</Label>
                <Input
                  id="strongDefenseMultiplier"
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="1.0"
                  value={formData.strongDefenseMultiplier || 0}
                  onChange={(e) => handleInputChange('strongDefenseMultiplier', e.target.value)}
                  data-testid="input-strong-defense-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.75</strong><br/>
                  Strong defensive teams with solid structure.<br/>
                  <em>Range: 0.5-1.0</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="averageDefenseMultiplier">Average Defense</Label>
                <Input
                  id="averageDefenseMultiplier"
                  type="number"
                  step="0.01"
                  min="0.8"
                  max="1.2"
                  value={formData.averageDefenseMultiplier || 0}
                  onChange={(e) => handleInputChange('averageDefenseMultiplier', e.target.value)}
                  data-testid="input-average-defense-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 1.00</strong><br/>
                  Mid-table teams with average defensive capability (baseline).<br/>
                  <em>Range: 0.8-1.2</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weakDefenseMultiplier">Weak Defense</Label>
                <Input
                  id="weakDefenseMultiplier"
                  type="number"
                  step="0.01"
                  min="1.0"
                  max="1.8"
                  value={formData.weakDefenseMultiplier || 0}
                  onChange={(e) => handleInputChange('weakDefenseMultiplier', e.target.value)}
                  data-testid="input-weak-defense-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 1.35</strong><br/>
                  Teams with defensive vulnerabilities and high goals conceded.<br/>
                  <em>Range: 1.0-1.8</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="promotedDefenseMultiplier">Promoted Defense</Label>
                <Input
                  id="promotedDefenseMultiplier"
                  type="number"
                  step="0.01"
                  min="1.2"
                  max="2.0"
                  value={formData.promotedDefenseMultiplier || 0}
                  onChange={(e) => handleInputChange('promotedDefenseMultiplier', e.target.value)}
                  data-testid="input-promoted-defense-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 1.60</strong><br/>
                  Newly promoted teams adapting to Premier League attacking quality.<br/>
                  <em>Range: 1.2-2.0</em>
                </p>
              </div>
            </div>
          </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context" className="space-y-6">
          <Card>
          <CardHeader>
            <CardTitle>Context Multipliers</CardTitle>
            <CardDescription>Situational adjustments for different match contexts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="derbyGoalsMultiplier">Derby Matches</Label>
                <Input
                  id="derbyGoalsMultiplier"
                  type="number"
                  step="0.01"
                  min="0.6"
                  max="1.3"
                  value={formData.derbyGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('derbyGoalsMultiplier', e.target.value)}
                  data-testid="input-derby-goals-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.87</strong><br/>
                  Adjustment for local rivalries and derby matches. Typically reduces goals due to tighter, more defensive play.<br/>
                  <em>Range: 0.6-1.3</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="topSixGoalsMultiplier">Top Six Battles</Label>
                <Input
                  id="topSixGoalsMultiplier"
                  type="number"
                  step="0.01"
                  min="0.8"
                  max="1.5"
                  value={formData.topSixGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('topSixGoalsMultiplier', e.target.value)}
                  data-testid="input-top-six-goals-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 1.12</strong><br/>
                  Multiplier for matches between traditional "Big Six" teams. Often increases goals due to attacking nature.<br/>
                  <em>Range: 0.8-1.5</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="relegationBattleGoalsMultiplier">Relegation Battles</Label>
                <Input
                  id="relegationBattleGoalsMultiplier"
                  type="number"
                  step="0.01"
                  min="0.6"
                  max="1.2"
                  value={formData.relegationBattleGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('relegationBattleGoalsMultiplier', e.target.value)}
                  data-testid="input-relegation-battle-goals-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.83</strong><br/>
                  Adjustment for matches between teams fighting relegation. Usually reduces goals due to cautious approach.<br/>
                  <em>Range: 0.6-1.2</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="earlyKickoffGoalsMultiplier">Early Kickoff</Label>
                <Input
                  id="earlyKickoffGoalsMultiplier"
                  type="number"
                  step="0.01"
                  min="0.8"
                  max="1.1"
                  value={formData.earlyKickoffGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('earlyKickoffGoalsMultiplier', e.target.value)}
                  data-testid="input-early-kickoff-goals-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.94</strong><br/>
                  Adjustment for early kickoff times (12:30 PM). Slight reduction due to less preparation time.<br/>
                  <em>Range: 0.8-1.1</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateKickoffGoalsMultiplier">Late Kickoff</Label>
                <Input
                  id="lateKickoffGoalsMultiplier"
                  type="number"
                  step="0.01"
                  min="0.9"
                  max="1.2"
                  value={formData.lateKickoffGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('lateKickoffGoalsMultiplier', e.target.value)}
                  data-testid="input-late-kickoff-goals-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 1.07</strong><br/>
                  Adjustment for late kickoff times (17:30/20:00). Slight increase due to more attacking play.<br/>
                  <em>Range: 0.9-1.2</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postEuropeanGoalsMultiplier">Post-European Fixtures</Label>
                <Input
                  id="postEuropeanGoalsMultiplier"
                  type="number"
                  step="0.01"
                  min="0.7"
                  max="1.0"
                  value={formData.postEuropeanGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('postEuropeanGoalsMultiplier', e.target.value)}
                  data-testid="input-post-european-goals-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.88</strong><br/>
                  Reduction for teams playing after midweek European competitions due to fatigue and rotation.<br/>
                  <em>Range: 0.7-1.0</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="midweekFixtureGoalsMultiplier">Midweek Fixtures</Label>
                <Input
                  id="midweekFixtureGoalsMultiplier"
                  type="number"
                  step="0.01"
                  min="0.8"
                  max="1.1"
                  value={formData.midweekFixtureGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('midweekFixtureGoalsMultiplier', e.target.value)}
                  data-testid="input-midweek-fixture-goals-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.91</strong><br/>
                  Adjustment for midweek Premier League fixtures. Reduction due to less preparation and potential rotation.<br/>
                  <em>Range: 0.8-1.1</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seasonFinaleGoalsMultiplier">Season Finale</Label>
                <Input
                  id="seasonFinaleGoalsMultiplier"
                  type="number"
                  step="0.01"
                  min="0.9"
                  max="1.3"
                  value={formData.seasonFinaleGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('seasonFinaleGoalsMultiplier', e.target.value)}
                  data-testid="input-season-finale-goals-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 1.05</strong><br/>
                  Adjustment for final gameweek matches. Slight increase due to "nothing to lose" mentality.<br/>
                  <em>Range: 0.9-1.3</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newManagerBounceGoalsMultiplier">New Manager Bounce</Label>
                <Input
                  id="newManagerBounceGoalsMultiplier"
                  type="number"
                  step="0.01"
                  min="1.0"
                  max="1.3"
                  value={formData.newManagerBounceGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('newManagerBounceGoalsMultiplier', e.target.value)}
                  data-testid="input-new-manager-bounce-goals-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 1.08</strong><br/>
                  Boost applied when teams have a new manager (first few matches). Reflects improved motivation.<br/>
                  <em>Range: 1.0-1.3</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weatherConditionsGoalsMultiplier">Weather Conditions</Label>
                <Input
                  id="weatherConditionsGoalsMultiplier"
                  type="number"
                  step="0.01"
                  min="0.8"
                  max="1.1"
                  value={formData.weatherConditionsGoalsMultiplier || 0}
                  onChange={(e) => handleInputChange('weatherConditionsGoalsMultiplier', e.target.value)}
                  data-testid="input-weather-conditions-goals-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.96</strong><br/>
                  Adjustment for adverse weather conditions (rain, wind, snow). Slight reduction in goal output.<br/>
                  <em>Range: 0.8-1.1</em>
                </p>
              </div>
            </div>
          </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <Card>
          <CardHeader>
            <CardTitle>Market Bounds</CardTitle>
            <CardDescription>Constraints for realistic Premier League goal ranges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="marketFloorMultiplier">Market Floor Multiplier</Label>
                <Input
                  id="marketFloorMultiplier"
                  type="number"
                  step="0.01"
                  min="0.2"
                  max="0.8"
                  value={formData.marketFloorMultiplier || 0}
                  onChange={(e) => handleInputChange('marketFloorMultiplier', e.target.value)}
                  data-testid="input-market-floor-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.4</strong><br/>
                  Lower boundary multiplier to prevent unrealistically low goal projections per match.<br/>
                  <em>Range: 0.2-0.8</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketCeilingMultiplier">Market Ceiling Multiplier</Label>
                <Input
                  id="marketCeilingMultiplier"
                  type="number"
                  step="0.01"
                  min="1.5"
                  max="3.0"
                  value={formData.marketCeilingMultiplier || 0}
                  onChange={(e) => handleInputChange('marketCeilingMultiplier', e.target.value)}
                  data-testid="input-market-ceiling-multiplier"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 2.0</strong><br/>
                  Upper boundary multiplier to prevent unrealistically high goal projections per match.<br/>
                  <em>Range: 1.5-3.0</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="absoluteMinGoals">Absolute Min Goals</Label>
                <Input
                  id="absoluteMinGoals"
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="0.8"
                  value={formData.absoluteMinGoals || 0}
                  onChange={(e) => handleInputChange('absoluteMinGoals', e.target.value)}
                  data-testid="input-absolute-min-goals"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 0.3</strong><br/>
                  Hard minimum goals per match that cannot be exceeded regardless of other calculations.<br/>
                  <em>Range: 0.1-0.8</em>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="absoluteMaxGoals">Absolute Max Goals</Label>
                <Input
                  id="absoluteMaxGoals"
                  type="number"
                  step="0.01"
                  min="3.0"
                  max="6.0"
                  value={formData.absoluteMaxGoals || 0}
                  onChange={(e) => handleInputChange('absoluteMaxGoals', e.target.value)}
                  data-testid="input-absolute-max-goals"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Default: 4.2</strong><br/>
                  Hard maximum goals per match that cannot be exceeded regardless of other calculations.<br/>
                  <em>Range: 3.0-6.0</em>
                </p>
              </div>
            </div>
          </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="space-y-6">
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