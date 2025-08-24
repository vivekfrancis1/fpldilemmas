import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Save, RotateCcw, Shield } from 'lucide-react';

interface Team {
  id: number;
  name: string;
  short_name: string;
}

interface AdminSettings {
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
  lastUpdated: string;
  updatedBy: string;
}

// Default defensive team tier assignments - These will be the fallback values
const DEFAULT_DEFENSIVE_TIERS = {
  eliteDefenseTeams: [1, 12, 13, 7], // Arsenal, Liverpool, Man City, Chelsea
  strongDefenseTeams: [15, 6, 18], // Newcastle, Brighton, Spurs
  averageDefenseTeams: [2, 4, 5, 8, 10, 14, 19], // Aston Villa, Bournemouth, Brentford, Crystal Palace, Fulham, Man Utd, West Ham
  weakDefenseTeams: [9, 16, 20], // Everton, Nott'm Forest, Wolves
  promotedDefenseTeams: [3, 11, 17], // Burnley, Leeds, Sunderland
};

export default function AdminDefenseProjections() {
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
        description: "Defensive tier assignments and projection parameters have been updated successfully.",
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
        description: "All defensive settings and team assignments have been reset to default values.",
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
        eliteDefenseTeams: parseTeamArray(settings.eliteDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.eliteDefenseTeams,
        strongDefenseTeams: parseTeamArray(settings.strongDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.strongDefenseTeams,
        averageDefenseTeams: parseTeamArray(settings.averageDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.averageDefenseTeams,
        weakDefenseTeams: parseTeamArray(settings.weakDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.weakDefenseTeams,
        promotedDefenseTeams: parseTeamArray(settings.promotedDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.promotedDefenseTeams,
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
    if (formData.eliteDefenseTeams?.includes(teamId)) return 'elite';
    if (formData.strongDefenseTeams?.includes(teamId)) return 'strong';
    if (formData.weakDefenseTeams?.includes(teamId)) return 'weak';
    if (formData.promotedDefenseTeams?.includes(teamId)) return 'promoted';
    return 'average';
  };

  const getDefaultTier = (teamId: number): string => {
    if (DEFAULT_DEFENSIVE_TIERS.eliteDefenseTeams.includes(teamId)) return 'elite';
    if (DEFAULT_DEFENSIVE_TIERS.strongDefenseTeams.includes(teamId)) return 'strong';
    if (DEFAULT_DEFENSIVE_TIERS.weakDefenseTeams.includes(teamId)) return 'weak';
    if (DEFAULT_DEFENSIVE_TIERS.promotedDefenseTeams.includes(teamId)) return 'promoted';
    return 'average';
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
      const updated = { ...prev };
      
      // Remove team from all tier arrays
      const tierFields = ['eliteDefenseTeams', 'strongDefenseTeams', 'averageDefenseTeams', 'weakDefenseTeams', 'promotedDefenseTeams'] as const;
      tierFields.forEach(field => {
        updated[field] = (updated[field] || []).filter(id => id !== teamId);
      });

      // Add team to new tier
      switch (newTier) {
        case 'elite':
          updated.eliteDefenseTeams = [...(updated.eliteDefenseTeams || []), teamId];
          break;
        case 'strong':
          updated.strongDefenseTeams = [...(updated.strongDefenseTeams || []), teamId];
          break;
        case 'average':
          updated.averageDefenseTeams = [...(updated.averageDefenseTeams || []), teamId];
          break;
        case 'weak':
          updated.weakDefenseTeams = [...(updated.weakDefenseTeams || []), teamId];
          break;
        case 'promoted':
          updated.promotedDefenseTeams = [...(updated.promotedDefenseTeams || []), teamId];
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
    resetSettingsMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Admin Defensive Projections</h1>
          <p className="text-muted-foreground">Configure defensive tier assignments and clean sheet projection parameters</p>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Unsaved Changes</p>
            <p className="text-xs text-amber-700">You have unsaved changes that will be lost if you leave this page.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {/* Defensive Multipliers */}
        <Card>
          <CardHeader>
            <CardTitle>Defensive Tier Multipliers</CardTitle>
            <CardDescription>
              Configure how much each defensive tier affects clean sheet probability. Lower multipliers = better defense = more clean sheets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eliteDefenseMultiplier" className="text-sm font-medium">Elite Defense</Label>
                <Input
                  id="eliteDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.eliteDefenseMultiplier || ''}
                  onChange={(e) => handleInputChange('eliteDefenseMultiplier', e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Lower = fewer goals conceded</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="strongDefenseMultiplier" className="text-sm font-medium">Strong Defense</Label>
                <Input
                  id="strongDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.strongDefenseMultiplier || ''}
                  onChange={(e) => handleInputChange('strongDefenseMultiplier', e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Slightly better than average</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="averageDefenseMultiplier" className="text-sm font-medium">Average Defense</Label>
                <Input
                  id="averageDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.averageDefenseMultiplier || ''}
                  onChange={(e) => handleInputChange('averageDefenseMultiplier', e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Baseline multiplier (1.0)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weakDefenseMultiplier" className="text-sm font-medium">Weak Defense</Label>
                <Input
                  id="weakDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.weakDefenseMultiplier || ''}
                  onChange={(e) => handleInputChange('weakDefenseMultiplier', e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">More goals conceded</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="promotedDefenseMultiplier" className="text-sm font-medium">Promoted Defense</Label>
                <Input
                  id="promotedDefenseMultiplier"
                  type="number"
                  step="0.01"
                  value={formData.promotedDefenseMultiplier || ''}
                  onChange={(e) => handleInputChange('promotedDefenseMultiplier', e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Highest goals conceded</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Defensive Tier Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Defensive Team Tier Assignments</CardTitle>
            <CardDescription>
              Assign teams to defensive tiers. These assignments determine each team's clean sheet probability and goals against projections.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updateSettingsMutation.isPending}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={resetSettingsMutation.isPending}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {resetSettingsMutation.isPending ? 'Resetting...' : 'Reset to Defaults'}
        </Button>
      </div>
    </div>
  );
}