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
  // Defensive Team Tier Assignments
  eliteDefenseTeams: number[];
  strongDefenseTeams: number[];
  averageDefenseTeams: number[];
  weakDefenseTeams: number[];
  promotedDefenseTeams: number[];
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

// Default team tier assignments based on user specifications
const DEFAULT_TEAM_TIERS = {
  eliteAttackTeams: [12, 13, 1, 7], // Liverpool, Man City, Arsenal, Chelsea
  strongAttackTeams: [15, 18, 2], // Newcastle, Spurs, Aston Villa
  averageAttackTeams: [4, 5, 6, 8, 14, 19, 10], // Bournemouth, Brentford, Brighton, Crystal Palace, Man Utd, West Ham, Fulham
  weakAttackTeams: [16, 9, 20], // Nott'm Forest, Everton, Wolves
  promotedAttackTeams: [3, 11, 17], // Burnley, Leeds, Sunderland
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

  // Default team tier assignments - Updated per user specifications
  const DEFAULT_TEAM_TIERS = {
    eliteAttackTeams: [12, 13, 1, 7], // Liverpool, Man City, Arsenal, Chelsea
    strongAttackTeams: [15, 18, 2], // Newcastle, Spurs, Aston Villa
    averageAttackTeams: [4, 5, 6, 8, 14, 19, 10], // Bournemouth, Brentford, Brighton, Crystal Palace, Man Utd, West Ham, Fulham
    weakAttackTeams: [16, 9, 20], // Nott'm Forest, Everton, Wolves
    promotedAttackTeams: [3, 11, 17], // Burnley, Leeds, Sunderland
  };

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (settings) {
      // Parse team tier assignments from JSON strings to arrays
      const parseTeamArray = (teamString: string | number[]): number[] => {
        if (Array.isArray(teamString)) return teamString;
        if (typeof teamString === 'string') {
          try {
            return JSON.parse(teamString);
          } catch {
            return [];
          }
        }
        return [];
      };

      const settingsWithDefaults = {
        ...settings,
        eliteAttackTeams: parseTeamArray(settings.eliteAttackTeams) || DEFAULT_TEAM_TIERS.eliteAttackTeams,
        strongAttackTeams: parseTeamArray(settings.strongAttackTeams) || DEFAULT_TEAM_TIERS.strongAttackTeams,
        averageAttackTeams: parseTeamArray(settings.averageAttackTeams) || DEFAULT_TEAM_TIERS.averageAttackTeams,
        weakAttackTeams: parseTeamArray(settings.weakAttackTeams) || DEFAULT_TEAM_TIERS.weakAttackTeams,
        promotedAttackTeams: parseTeamArray(settings.promotedAttackTeams) || DEFAULT_TEAM_TIERS.promotedAttackTeams,
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

  const getDefaultTier = (teamId: number): string => {
    if (DEFAULT_TEAM_TIERS.eliteAttackTeams.includes(teamId)) return 'elite';
    if (DEFAULT_TEAM_TIERS.strongAttackTeams.includes(teamId)) return 'strong';
    if (DEFAULT_TEAM_TIERS.weakAttackTeams.includes(teamId)) return 'weak';
    if (DEFAULT_TEAM_TIERS.promotedAttackTeams.includes(teamId)) return 'promoted';
    return 'average';
  };

  // Default defensive tier assignments
  const DEFAULT_DEFENSIVE_TIERS = {
    eliteDefenseTeams: [1, 12, 13, 7], // Arsenal, Liverpool, Man City, Chelsea
    strongDefenseTeams: [15, 6, 18], // Newcastle, Brighton, Spurs
    averageDefenseTeams: [2, 4, 5, 8, 10, 14, 19], // Aston Villa, Bournemouth, Brentford, Crystal Palace, Fulham, Man Utd, West Ham
    weakDefenseTeams: [9, 16, 20], // Everton, Nott'm Forest, Wolves
    promotedDefenseTeams: [3, 11, 17], // Burnley, Leeds, Sunderland
  };

  // Defensive tier assignment helper functions
  const getTeamDefenseTier = (teamId: number): string => {
    const parseTeamArray = (teamString: string | number[]): number[] => {
      if (Array.isArray(teamString)) return teamString;
      if (typeof teamString === 'string') {
        try {
          return JSON.parse(teamString);
        } catch {
          return [];
        }
      }
      return [];
    };

    const eliteDefenseTeams = parseTeamArray(formData.eliteDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.eliteDefenseTeams;
    const strongDefenseTeams = parseTeamArray(formData.strongDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.strongDefenseTeams;
    const weakDefenseTeams = parseTeamArray(formData.weakDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.weakDefenseTeams;
    const promotedDefenseTeams = parseTeamArray(formData.promotedDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.promotedDefenseTeams;

    if (eliteDefenseTeams.includes(teamId)) return 'elite';
    if (strongDefenseTeams.includes(teamId)) return 'strong';
    if (weakDefenseTeams.includes(teamId)) return 'weak';
    if (promotedDefenseTeams.includes(teamId)) return 'promoted';
    return 'average';
  };

  const getDefaultDefenseTier = (teamId: number): string => {
    if (DEFAULT_DEFENSIVE_TIERS.eliteDefenseTeams.includes(teamId)) return 'elite';
    if (DEFAULT_DEFENSIVE_TIERS.strongDefenseTeams.includes(teamId)) return 'strong';
    if (DEFAULT_DEFENSIVE_TIERS.weakDefenseTeams.includes(teamId)) return 'weak';
    if (DEFAULT_DEFENSIVE_TIERS.promotedDefenseTeams.includes(teamId)) return 'promoted';
    return 'average';
  };

  const handleTeamDefenseTierChange = (teamId: number, newTier: string) => {
    setFormData(prev => {
      const updated = { ...prev };
      
      // Parse existing arrays or use defaults
      const parseTeamArray = (teamString: string | number[]): number[] => {
        if (Array.isArray(teamString)) return teamString;
        if (typeof teamString === 'string') {
          try {
            return JSON.parse(teamString);
          } catch {
            return [];
          }
        }
        return [];
      };

      // Remove team from all defensive tier arrays
      updated.eliteDefenseTeams = parseTeamArray(updated.eliteDefenseTeams).filter(id => id !== teamId);
      updated.strongDefenseTeams = parseTeamArray(updated.strongDefenseTeams).filter(id => id !== teamId);
      updated.averageDefenseTeams = parseTeamArray(updated.averageDefenseTeams).filter(id => id !== teamId);
      updated.weakDefenseTeams = parseTeamArray(updated.weakDefenseTeams).filter(id => id !== teamId);
      updated.promotedDefenseTeams = parseTeamArray(updated.promotedDefenseTeams).filter(id => id !== teamId);

      // Add team to new tier
      switch (newTier) {
        case 'elite':
          updated.eliteDefenseTeams = [...updated.eliteDefenseTeams, teamId];
          break;
        case 'strong':
          updated.strongDefenseTeams = [...updated.strongDefenseTeams, teamId];
          break;
        case 'average':
          updated.averageDefenseTeams = [...updated.averageDefenseTeams, teamId];
          break;
        case 'weak':
          updated.weakDefenseTeams = [...updated.weakDefenseTeams, teamId];
          break;
        case 'promoted':
          updated.promotedDefenseTeams = [...updated.promotedDefenseTeams, teamId];
          break;
      }

      return updated;
    });
    setHasChanges(true);
  };

  const getTeamsByTier = (tier: string) => {
    return teams.filter(team => getTeamTier(team.id) === tier);
  };

  const getTierBadge = (tier: string, variant: 'current' | 'default') => {
    const isDefault = variant === 'default';
    const badgeClass = isDefault ? "text-xs border" : "text-xs";
    const badgeVariant = isDefault ? "outline" : "default";
    
    const colors = {
      'elite': isDefault ? 'border-purple-300 text-purple-700 bg-purple-50' : 'bg-purple-600 hover:bg-purple-700',
      'strong': isDefault ? 'border-blue-300 text-blue-700 bg-blue-50' : 'bg-blue-600 hover:bg-blue-700',
      'average': isDefault ? 'border-gray-300 text-gray-700 bg-gray-50' : 'bg-gray-600 hover:bg-gray-700',
      'weak': isDefault ? 'border-orange-300 text-orange-700 bg-orange-50' : 'bg-orange-600 hover:bg-orange-700',
      'promoted': isDefault ? 'border-red-300 text-red-700 bg-red-50' : 'bg-red-600 hover:bg-red-700'
    }[tier] || (isDefault ? 'border-gray-300 text-gray-700 bg-gray-50' : 'bg-gray-600 hover:bg-gray-700');
    
    const tierNames = {
      'elite': 'Elite',
      'strong': 'Strong', 
      'average': 'Average',
      'weak': 'Weak',
      'promoted': 'Promoted'
    };
    
    return (
      <Badge 
        variant={badgeVariant as "default" | "outline"} 
        className={`${badgeClass} ${colors}`}
      >
        {tierNames[tier as keyof typeof tierNames] || 'Average'}
      </Badge>
    );
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

      <Tabs defaultValue="attacking-multipliers" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="attacking-multipliers">Attack Multipliers</TabsTrigger>
          <TabsTrigger value="attacking-teams">Attack Teams</TabsTrigger>
          <TabsTrigger value="defensive-multipliers">Defense Multipliers</TabsTrigger>
          <TabsTrigger value="defensive-teams">Defense Teams</TabsTrigger>
          <TabsTrigger value="global">Global Settings</TabsTrigger>
          <TabsTrigger value="context">Context Multipliers</TabsTrigger>
          <TabsTrigger value="market">Market Bounds</TabsTrigger>
        </TabsList>

        <TabsContent value="attacking-multipliers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attacking Tier Multipliers</CardTitle>
              <CardDescription>Team quality-based multipliers for attacking prowess (applied to goals scored)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="eliteAttackMultiplier">Elite Attack</Label>
                  <Input
                    id="eliteAttackMultiplier"
                    type="number"
                    step="0.01"
                    min="1.0"
                    max="1.3"
                    value={formData.eliteAttackMultiplier || 0}
                    onChange={(e) => handleInputChange('eliteAttackMultiplier', e.target.value)}
                    data-testid="input-elite-attack-multiplier"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 1.05</strong><br/>
                    Premier League elite attacking teams (Man City, Arsenal).<br/>
                    <em>Range: 1.0-1.3</em>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strongAttackMultiplier">Strong Attack</Label>
                  <Input
                    id="strongAttackMultiplier"
                    type="number"
                    step="0.01"
                    min="1.0"
                    max="1.2"
                    value={formData.strongAttackMultiplier || 0}
                    onChange={(e) => handleInputChange('strongAttackMultiplier', e.target.value)}
                    data-testid="input-strong-attack-multiplier"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 1.02</strong><br/>
                    Teams with strong attacking potential and good goal records.<br/>
                    <em>Range: 1.0-1.2</em>
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
                    Mid-table teams with average attacking capability (baseline).<br/>
                    <em>Range: 0.8-1.2</em>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weakAttackMultiplier">Weak Attack</Label>
                  <Input
                    id="weakAttackMultiplier"
                    type="number"
                    step="0.01"
                    min="0.7"
                    max="1.0"
                    value={formData.weakAttackMultiplier || 0}
                    onChange={(e) => handleInputChange('weakAttackMultiplier', e.target.value)}
                    data-testid="input-weak-attack-multiplier"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 0.98</strong><br/>
                    Teams with attacking struggles and low goal tallies.<br/>
                    <em>Range: 0.7-1.0</em>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promotedAttackMultiplier">Promoted Attack</Label>
                  <Input
                    id="promotedAttackMultiplier"
                    type="number"
                    step="0.01"
                    min="0.6"
                    max="1.0"
                    value={formData.promotedAttackMultiplier || 0}
                    onChange={(e) => handleInputChange('promotedAttackMultiplier', e.target.value)}
                    data-testid="input-promoted-attack-multiplier"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 0.95</strong><br/>
                    Newly promoted teams adapting to Premier League defensive quality.<br/>
                    <em>Range: 0.6-1.0</em>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attacking-teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Attacking Tier Assignments
              </CardTitle>
              <CardDescription>
                Assign all 20 Premier League teams to attacking tiers that determine their goal-scoring multipliers in projections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              {/* Overview Section */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How Team Tiers Work</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
                  <div className="text-center">
                    <Badge className="bg-purple-600 hover:bg-purple-700 mb-1">Elite</Badge>
                    <p className="text-purple-900 dark:text-purple-100">×{formData.eliteAttackMultiplier} multiplier</p>
                    <p className="text-muted-foreground">Top attacking teams</p>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-blue-600 hover:bg-blue-700 mb-1">Strong</Badge>
                    <p className="text-blue-900 dark:text-blue-100">×{formData.strongAttackMultiplier} multiplier</p>
                    <p className="text-muted-foreground">Good attacking sides</p>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-gray-600 hover:bg-gray-700 mb-1">Average</Badge>
                    <p className="text-gray-900 dark:text-gray-100">×{formData.averageAttackMultiplier} multiplier</p>
                    <p className="text-muted-foreground">Mid-table attack</p>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-orange-600 hover:bg-orange-700 mb-1">Weak</Badge>
                    <p className="text-orange-900 dark:text-orange-100">×{formData.weakAttackMultiplier} multiplier</p>
                    <p className="text-muted-foreground">Poor attacking teams</p>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-red-600 hover:bg-red-700 mb-1">Promoted</Badge>
                    <p className="text-red-900 dark:text-red-100">×{formData.promotedAttackMultiplier} multiplier</p>
                    <p className="text-muted-foreground">Newly promoted teams</p>
                  </div>
                </div>
              </div>

              {/* Team Assignment Grid */}
              <div className="grid gap-4">
                {teams.map(team => {
                  const currentTier = getTeamTier(team.id);
                  const defaultTier = getDefaultTier(team.id);
                  const hasChanged = currentTier !== defaultTier;
                  
                  const tierColor = {
                    'elite': 'bg-purple-50 border-purple-200',
                    'strong': 'bg-blue-50 border-blue-200',
                    'average': 'bg-gray-50 border-gray-200',
                    'weak': 'bg-orange-50 border-orange-200',
                    'promoted': 'bg-red-50 border-red-200'
                  }[currentTier] || 'bg-gray-50 border-gray-200';

                  return (
                    <div key={team.id} className={`p-4 border rounded-lg ${tierColor} ${hasChanged ? 'ring-2 ring-blue-300 dark:ring-blue-600' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm truncate">{team.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">ID: {team.id}</span>
                            {hasChanged && (
                              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-300 text-blue-700">
                                Modified
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Default:</span>
                              {getTierBadge(defaultTier, 'default')}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Current:</span>
                              {getTierBadge(currentTier, 'current')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <Label htmlFor={`team-${team.id}`} className="text-xs text-muted-foreground mb-1 block">
                            Change Current Tier
                          </Label>
                          <Select value={currentTier} onValueChange={(value) => handleTeamTierChange(team.id, value)}>
                            <SelectTrigger id={`team-${team.id}`} className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="elite">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                                  Elite
                                </div>
                              </SelectItem>
                              <SelectItem value="strong">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  Strong
                                </div>
                              </SelectItem>
                              <SelectItem value="average">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                  Average
                                </div>
                              </SelectItem>
                              <SelectItem value="weak">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                                  Weak
                                </div>
                              </SelectItem>
                              <SelectItem value="promoted">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                  Promoted
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defensive-multipliers" className="space-y-6">
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
                    <strong>Default: 0.65</strong><br/>
                    Premier League elite defensive teams (Arsenal, Liverpool).<br/>
                    <em>Range: 0.4-0.8</em>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strongDefenseMultiplier">Strong Defense</Label>
                  <Input
                    id="strongDefenseMultiplier"
                    type="number"
                    step="0.01"
                    min="0.6"
                    max="1.0"
                    value={formData.strongDefenseMultiplier || 0}
                    onChange={(e) => handleInputChange('strongDefenseMultiplier', e.target.value)}
                    data-testid="input-strong-defense-multiplier"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 0.80</strong><br/>
                    Teams with strong defensive records and low goals conceded.<br/>
                    <em>Range: 0.6-1.0</em>
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
                    <strong>Default: 1.25</strong><br/>
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
                    <strong>Default: 1.40</strong><br/>
                    Newly promoted teams adapting to Premier League attacking quality.<br/>
                    <em>Range: 1.2-2.0</em>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defensive-teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Team Defensive Tier Assignments
              </CardTitle>
              <CardDescription>
                Assign all 20 Premier League teams to defensive tiers that determine their clean sheet probability and goals against projections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              {/* Overview Section */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How Defensive Tiers Work</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
                  <div className="text-center">
                    <Badge className="bg-purple-600 hover:bg-purple-700 mb-1">Elite</Badge>
                    <p className="text-purple-900 dark:text-purple-100">×{formData.eliteDefenseMultiplier} multiplier</p>
                    <p className="text-muted-foreground">Best defensive teams</p>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-blue-600 hover:bg-blue-700 mb-1">Strong</Badge>
                    <p className="text-blue-900 dark:text-blue-100">×{formData.strongDefenseMultiplier} multiplier</p>
                    <p className="text-muted-foreground">Good defensive sides</p>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-gray-600 hover:bg-gray-700 mb-1">Average</Badge>
                    <p className="text-gray-900 dark:text-gray-100">×{formData.averageDefenseMultiplier} multiplier</p>
                    <p className="text-muted-foreground">Mid-table defense</p>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-orange-600 hover:bg-orange-700 mb-1">Weak</Badge>
                    <p className="text-orange-900 dark:text-orange-100">×{formData.weakDefenseMultiplier} multiplier</p>
                    <p className="text-muted-foreground">Poor defensive teams</p>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-red-600 hover:bg-red-700 mb-1">Promoted</Badge>
                    <p className="text-red-900 dark:text-red-100">×{formData.promotedDefenseMultiplier} multiplier</p>
                    <p className="text-muted-foreground">Newly promoted teams</p>
                  </div>
                </div>
              </div>

              {/* Team Assignment Grid */}
              <div className="grid gap-4">
                {teams.map(team => {
                  const currentDefenseTier = getTeamDefenseTier(team.id);
                  const defaultDefenseTier = getDefaultDefenseTier(team.id);
                  const hasDefenseChanged = currentDefenseTier !== defaultDefenseTier;
                  
                  const tierColor = {
                    'elite': 'bg-purple-50 border-purple-200',
                    'strong': 'bg-blue-50 border-blue-200',
                    'average': 'bg-gray-50 border-gray-200',
                    'weak': 'bg-orange-50 border-orange-200',
                    'promoted': 'bg-red-50 border-red-200'
                  }[currentDefenseTier] || 'bg-gray-50 border-gray-200';

                  return (
                    <div key={`defense-${team.id}`} className={`p-4 border rounded-lg ${tierColor} ${hasDefenseChanged ? 'ring-2 ring-blue-300 dark:ring-blue-600' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm truncate">{team.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">ID: {team.id}</span>
                            {hasDefenseChanged && (
                              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-300 text-blue-700">
                                Modified
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Default:</span>
                              {getTierBadge(defaultDefenseTier, 'default')}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Current:</span>
                              {getTierBadge(currentDefenseTier, 'current')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <Label htmlFor={`defense-team-${team.id}`} className="text-xs text-muted-foreground mb-1 block">
                            Change Current Tier
                          </Label>
                          <Select value={currentDefenseTier} onValueChange={(value) => handleTeamDefenseTierChange(team.id, value)}>
                            <SelectTrigger id={`defense-team-${team.id}`} className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="elite">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                                  Elite
                                </div>
                              </SelectItem>
                              <SelectItem value="strong">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  Strong
                                </div>
                              </SelectItem>
                              <SelectItem value="average">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                  Average
                                </div>
                              </SelectItem>
                              <SelectItem value="weak">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                                  Weak
                                </div>
                              </SelectItem>
                              <SelectItem value="promoted">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                  Promoted
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Global Settings</CardTitle>
              <CardDescription>System-wide multipliers that affect all projection calculations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="globalTierMultiplier">Global Tier Multiplier</Label>
                  <Input
                    id="globalTierMultiplier"
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="2.0"
                    value={formData.globalTierMultiplier || 0}
                    onChange={(e) => handleInputChange('globalTierMultiplier', e.target.value)}
                    data-testid="input-global-tier-multiplier"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 1.00</strong><br/>
                    Master multiplier applied to all tier-based calculations.<br/>
                    <em>Range: 0.5-2.0</em>
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
                    <strong>Default: 1.15</strong><br/>
                    Boost applied to projections with low confidence scores.<br/>
                    <em>Range: 1.0-2.0</em>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowConfidenceThreshold">Low Confidence Threshold</Label>
                  <Input
                    id="lowConfidenceThreshold"
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="0.9"
                    value={formData.lowConfidenceThreshold || 0}
                    onChange={(e) => handleInputChange('lowConfidenceThreshold', e.target.value)}
                    data-testid="input-low-confidence-threshold"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 0.30</strong><br/>
                    Confidence score below which low confidence boost is applied.<br/>
                    <em>Range: 0.1-0.9</em>
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
              <CardDescription>Situational adjustments based on match circumstances and timing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    Adjustment for local rivalries and derby matches.<br/>
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
                    Multiplier for matches between traditional "Big Six" teams.<br/>
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
                    Adjustment for matches between teams fighting relegation.<br/>
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
                    Adjustment for early kickoff times (12:30 PM).<br/>
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
                    Adjustment for late kickoff times (17:30/20:00).<br/>
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
                    Reduction for teams playing after midweek European competitions.<br/>
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
                    Adjustment for midweek Premier League fixtures.<br/>
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
                    Adjustment for final gameweek matches.<br/>
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
                    Boost applied when teams have a new manager.<br/>
                    <em>Range: 1.0-1.3</em>
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
              <CardDescription>Hard limits and boundaries for goal projections to maintain realistic ranges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="minGoalsPerMatch">Min Goals Per Match</Label>
                  <Input
                    id="minGoalsPerMatch"
                    type="number"
                    step="0.01"
                    min="1.0"
                    max="2.0"
                    value={formData.minGoalsPerMatch || 0}
                    onChange={(e) => handleInputChange('minGoalsPerMatch', e.target.value)}
                    data-testid="input-min-goals-per-match"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 1.20</strong><br/>
                    Minimum goals per match across all projections.<br/>
                    <em>Range: 1.0-2.0</em>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxGoalsPerMatch">Max Goals Per Match</Label>
                  <Input
                    id="maxGoalsPerMatch"
                    type="number"
                    step="0.01"
                    min="2.5"
                    max="4.0"
                    value={formData.maxGoalsPerMatch || 0}
                    onChange={(e) => handleInputChange('maxGoalsPerMatch', e.target.value)}
                    data-testid="input-max-goals-per-match"
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Default: 3.20</strong><br/>
                    Maximum goals per match across all projections.<br/>
                    <em>Range: 2.5-4.0</em>
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
                    <strong>Default: 0.30</strong><br/>
                    Hard minimum goals per match that cannot be exceeded.<br/>
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
                    <strong>Default: 4.20</strong><br/>
                    Hard maximum goals per match that cannot be exceeded.<br/>
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
