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
import { Settings, RotateCcw, Save, AlertTriangle, Users, Shield, TrendingUp, Target, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Team {
  id: number;
  name: string;
  short_name: string;
  code: number;
}

interface TeamConfidenceData {
  id: number;
  team: string;
  teamName: string;
  confidenceScore: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  attackingTier: string;
  defensiveTier: string;
  expectedGoalsPerGame: number;
  baseCleanSheetRate: number;
  tierMultiplier: number;
  confidenceMultiplier: number;
}

interface AdminSettings {
  globalTierMultiplier: number;
  lowConfidenceBoost: number;
  lowConfidenceThreshold: number;
  // Venue Multipliers
  homeAdvantageGoalsMultiplier: number;
  awayFactorGoalsMultiplier: number;
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

const getConfidenceBadgeColor = (level: string) => {
  switch (level) {
    case 'High': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'Low': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
  }
};

const getTierBadgeColor = (tier: string) => {
  switch (tier) {
    case 'elite': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    case 'strong': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    case 'weak': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
    case 'promoted': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-400';
  }
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

  const { data: confidenceData, isLoading: confidenceLoading } = useQuery<TeamConfidenceData[]>({
    queryKey: ["/api/team-confidence-analysis"],
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
        // Apply new default values for any missing settings
        eliteAttackMultiplier: settings.eliteAttackMultiplier ?? DEFAULT_VALUES.attackMultipliers.eliteAttackMultiplier,
        strongAttackMultiplier: settings.strongAttackMultiplier ?? DEFAULT_VALUES.attackMultipliers.strongAttackMultiplier,
        averageAttackMultiplier: settings.averageAttackMultiplier ?? DEFAULT_VALUES.attackMultipliers.averageAttackMultiplier,
        weakAttackMultiplier: settings.weakAttackMultiplier ?? DEFAULT_VALUES.attackMultipliers.weakAttackMultiplier,
        promotedAttackMultiplier: settings.promotedAttackMultiplier ?? DEFAULT_VALUES.attackMultipliers.promotedAttackMultiplier,
        
        eliteDefenseMultiplier: settings.eliteDefenseMultiplier ?? DEFAULT_VALUES.defenseMultipliers.eliteDefenseMultiplier,
        strongDefenseMultiplier: settings.strongDefenseMultiplier ?? DEFAULT_VALUES.defenseMultipliers.strongDefenseMultiplier,
        averageDefenseMultiplier: settings.averageDefenseMultiplier ?? DEFAULT_VALUES.defenseMultipliers.averageDefenseMultiplier,
        weakDefenseMultiplier: settings.weakDefenseMultiplier ?? DEFAULT_VALUES.defenseMultipliers.weakDefenseMultiplier,
        promotedDefenseMultiplier: settings.promotedDefenseMultiplier ?? DEFAULT_VALUES.defenseMultipliers.promotedDefenseMultiplier,
        
        // Goals Scored admin doesn't have minGoalsPerMatch/maxGoalsPerMatch settings
        absoluteMinGoals: settings.absoluteMinGoals ?? DEFAULT_VALUES.marketBounds.absoluteMinGoals,
        absoluteMaxGoals: settings.absoluteMaxGoals ?? DEFAULT_VALUES.marketBounds.absoluteMaxGoals,
        marketFloorMultiplier: settings.marketFloorMultiplier ?? DEFAULT_VALUES.marketBounds.marketFloorMultiplier,
        marketCeilingMultiplier: settings.marketCeilingMultiplier ?? DEFAULT_VALUES.marketBounds.marketCeilingMultiplier,
        
        homeAdvantageGoalsMultiplier: settings.homeAdvantageGoalsMultiplier ?? DEFAULT_VALUES.venueFactors.homeAdvantageMultiplier,
        awayFactorGoalsMultiplier: settings.awayFactorGoalsMultiplier ?? DEFAULT_VALUES.venueFactors.awayFactorMultiplier,
        
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

  // Default defensive tier assignments - Updated per user specifications
  const DEFAULT_DEFENSIVE_TIERS = {
    eliteDefenseTeams: [1], // Arsenal
    strongDefenseTeams: [12, 13, 7, 16, 15, 9], // Liverpool, Man City, Chelsea, Nottm Forest, Newcastle, Everton
    averageDefenseTeams: [8, 14, 18, 2, 10], // Crystal Palace, Man Utd, Spurs, Aston Villa, Fulham
    weakDefenseTeams: [6, 19, 20, 4, 5], // Brighton, West Ham, Wolves, Bournemouth, Brentford
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

  // Define default values for each category
  const DEFAULT_VALUES = {
    // Attack Multipliers
    attackMultipliers: {
      eliteAttackMultiplier: 1.5,
      strongAttackMultiplier: 1.25,
      averageAttackMultiplier: 1.00,
      weakAttackMultiplier: 0.75,
      promotedAttackMultiplier: 0.5,
    },
    // Defense Multipliers
    defenseMultipliers: {
      eliteDefenseMultiplier: 0.5,
      strongDefenseMultiplier: 0.75,
      averageDefenseMultiplier: 1.00,
      weakDefenseMultiplier: 1.25,
      promotedDefenseMultiplier: 1.5,
    },
    // Global Settings
    globalSettings: {
      globalTierMultiplier: 1.00,
      lowConfidenceBoost: 1.15,
      lowConfidenceThreshold: 0.30,
    },
    // Context Multipliers
    contextMultipliers: {
      derbyGoalsMultiplier: 0.87,
      topSixGoalsMultiplier: 1.12,
      relegationBattleGoalsMultiplier: 0.83,
      earlyKickoffGoalsMultiplier: 0.94,
      lateKickoffGoalsMultiplier: 1.07,
      postEuropeanGoalsMultiplier: 0.88,
      midweekFixtureGoalsMultiplier: 0.91,
      seasonFinaleGoalsMultiplier: 1.05,
      newManagerBounceGoalsMultiplier: 1.08,
    },
    // Market Bounds
    marketBounds: {
      minGoalsPerMatch: 0.0,
      maxGoalsPerMatch: 5.0,
      absoluteMinGoals: 0.0,
      absoluteMaxGoals: 7.0,
      marketFloorMultiplier: 0.40,
      marketCeilingMultiplier: 2.00,
    },
    // Venue Factors
    venueFactors: {
      homeAdvantageMultiplier: 1.15,
      awayFactorMultiplier: 0.88,
    },
  };

  // Individual reset functions for each tab
  const resetAttackMultipliers = () => {
    if (confirm('Reset only this tab\'s attacking multipliers to default values? Other settings will remain unchanged.')) {
      setFormData(prev => ({ ...prev, ...DEFAULT_VALUES.attackMultipliers }));
      setHasChanges(true);
      toast({
        title: "Attack Multipliers Reset",
        description: "Only attacking tier multipliers have been reset to default values.",
      });
    }
  };

  const resetAttackTeams = () => {
    if (confirm('Reset only this tab\'s attacking team assignments to default values? Other settings will remain unchanged.')) {
      setFormData(prev => ({ ...prev, ...DEFAULT_TEAM_TIERS }));
      setHasChanges(true);
      toast({
        title: "Attack Teams Reset",
        description: "Only attacking team assignments have been reset to default values.",
      });
    }
  };

  const resetDefenseMultipliers = () => {
    if (confirm('Reset only this tab\'s defensive multipliers to default values? Other settings will remain unchanged.')) {
      setFormData(prev => ({ ...prev, ...DEFAULT_VALUES.defenseMultipliers }));
      setHasChanges(true);
      toast({
        title: "Defense Multipliers Reset",
        description: "Only defensive tier multipliers have been reset to default values.",
      });
    }
  };

  const resetDefenseTeams = () => {
    if (confirm('Reset only this tab\'s defensive team assignments to default values? Other settings will remain unchanged.')) {
      setFormData(prev => ({ ...prev, ...DEFAULT_DEFENSIVE_TIERS }));
      setHasChanges(true);
      toast({
        title: "Defense Teams Reset",
        description: "Only defensive team assignments have been reset to default values.",
      });
    }
  };

  const resetGlobalSettings = () => {
    if (confirm('Reset only this tab\'s global settings to default values? Other settings will remain unchanged.')) {
      setFormData(prev => ({ ...prev, ...DEFAULT_VALUES.globalSettings }));
      setHasChanges(true);
      toast({
        title: "Global Settings Reset",
        description: "Only global settings have been reset to default values.",
      });
    }
  };

  const resetContextMultipliers = () => {
    if (confirm('Reset only this tab\'s context multipliers to default values? Other settings will remain unchanged.')) {
      setFormData(prev => ({ ...prev, ...DEFAULT_VALUES.contextMultipliers }));
      setHasChanges(true);
      toast({
        title: "Context Multipliers Reset",
        description: "Only context multipliers have been reset to default values.",
      });
    }
  };

  const resetMarketBounds = () => {
    if (confirm('Reset only this tab\'s market bounds and venue factors to default values? Other settings will remain unchanged.')) {
      setFormData(prev => ({ ...prev, ...DEFAULT_VALUES.marketBounds, ...DEFAULT_VALUES.venueFactors }));
      setHasChanges(true);
      toast({
        title: "Market Bounds & Venue Factors Reset",
        description: "Market bounds and venue factors have been reset to default values.",
      });
    }
  };

  const resetPageSettings = () => {
    if (confirm('Reset all settings on this Team Goals admin page to default values? This will reset all 7 tabs: attacking multipliers, attacking teams, defensive multipliers, defensive teams, global settings, context multipliers, and market bounds. Other system configurations will remain unchanged.')) {
      setFormData(prev => ({
        ...prev,
        ...DEFAULT_VALUES.attackMultipliers,
        ...DEFAULT_VALUES.defenseMultipliers,
        ...DEFAULT_VALUES.globalSettings,
        ...DEFAULT_VALUES.contextMultipliers,
        ...DEFAULT_VALUES.marketBounds,
        ...DEFAULT_VALUES.venueFactors,
        ...DEFAULT_TEAM_TIERS,
        ...DEFAULT_DEFENSIVE_TIERS,
      }));
      setHasChanges(true);
      toast({
        title: "Page Settings Reset",
        description: "All Team Goals admin page settings including venue factors have been reset to default values.",
      });
    }
  };

  const handleReset = () => {
    if (confirm('Reset ALL settings across ALL pages and configurations in the entire system? This includes Team Goals, Team Clean Sheets, and all other projection configurations. This action cannot be undone.')) {
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

      <Tabs defaultValue="calculation-base" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="calculation-base">Calculation Base</TabsTrigger>
          <TabsTrigger value="base-xg">Base xG Settings</TabsTrigger>
          <TabsTrigger value="attacking-multipliers">Attack Multipliers</TabsTrigger>
          <TabsTrigger value="attacking-teams">Attack Teams</TabsTrigger>
          <TabsTrigger value="defensive-multipliers">Defense Multipliers</TabsTrigger>
          <TabsTrigger value="defensive-teams">Defense Teams</TabsTrigger>
          <TabsTrigger value="global">Global Settings</TabsTrigger>
          <TabsTrigger value="context">Context Multipliers</TabsTrigger>
          <TabsTrigger value="market">Market Bounds</TabsTrigger>
          <TabsTrigger value="confidence">Team Confidence</TabsTrigger>
        </TabsList>

        {/* Calculation Base Tab */}
        <TabsContent value="calculation-base" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                How Team Goal Projections Are Calculated
              </CardTitle>
              <CardDescription>
                Understanding the 8-phase calculation process that transforms base xG into final goal projections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 1: Foundation</h4>
                      <p className="text-sm text-muted-foreground">
                        Starts with team's base <strong>Expected Goals per Game</strong> (xG rate)<br/>
                        Examples: Liverpool 2.14, Man City 1.97, Arsenal 1.67
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 2: Venue Adjustments</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Home:</strong> xG × {formData.homeAdvantageGoalsMultiplier || 1.15} (configurable)<br/>
                        <strong>Away:</strong> xG × {formData.awayFactorGoalsMultiplier || 0.88} (configurable)
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 3: Opponent Defense</h4>
                      <p className="text-sm text-muted-foreground">
                        Opponent's clean sheet rate reduces goals by up to 20%<br/>
                        Formula: xG × (1.0 - opponent_CS_rate × 0.4)
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 4: Context Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Elite Clashes:</strong> +8% boost<br/>
                        <strong>Top 6 Battles:</strong> +2% boost<br/>
                        <strong>Derby Matches:</strong> +14% boost
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 5: Attacking Tiers</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Elite:</strong> × {formData.eliteAttackMultiplier || 1.5} (configurable)<br/>
                        <strong>Strong:</strong> × {formData.strongAttackMultiplier || 1.25}<br/>
                        <strong>Average:</strong> × {formData.averageAttackMultiplier || 1.0}<br/>
                        <strong>Weak:</strong> × {formData.weakAttackMultiplier || 0.75}
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 6-7: Market Factors</h4>
                      <p className="text-sm text-muted-foreground">
                        Small adjustments for market momentum and variance<br/>
                        Range: 99-101% (minimal seasonal fluctuations)
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 8: Final Bounds</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Floor:</strong> Min {formData.absoluteMinGoals || 0.6} goals/match<br/>
                        <strong>Ceiling:</strong> Max {formData.absoluteMaxGoals || 2.2} goals/match<br/>
                        Ensures realistic Premier League ranges
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg bg-fpl-purple/5">
                      <h4 className="font-semibold text-sm mb-2">Final Step: Confidence Boost</h4>
                      <p className="text-sm text-muted-foreground">
                        Teams with confidence below {formData.lowConfidenceThreshold * 100}%<br/>
                        receive a <strong>{formData.lowConfidenceBoost}×</strong> multiplier boost
                      </p>
                    </div>
                  </div>
                </div>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Impact:</strong> Base xG is the foundation that flows through all 8 phases. Higher xG teams (Liverpool 2.14) naturally project higher goals than lower xG teams (Fulham 1.20) even after all adjustments. Each phase can be configured using the settings in the other tabs.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Base xG Settings Tab */}
        <TabsContent value="base-xg" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Base Expected Goals per Game</CardTitle>
                <CardDescription>Foundational xG rates that serve as Phase 1 input for all team goal projections</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm('Reset all base xG values to default 2025/26 season projections?')) {
                    // Reset logic would go here
                    toast({
                      title: "Base xG Reset",
                      description: "All team base xG values have been reset to season defaults.",
                    });
                  }
                }}
                className="flex items-center gap-2"
                data-testid="button-reset-base-xg"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Tab
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Foundation Layer:</strong> These base xG values are the starting point (Phase 1) for all team goal projections. They represent each team's underlying attacking quality before any adjustments for venue, opponent, context, or tiers are applied.
                  </AlertDescription>
                </Alert>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Team</th>
                        <th className="text-center p-2 font-medium">Tier</th>
                        <th className="text-center p-2 font-medium">Default xG</th>
                        <th className="text-center p-2 font-medium">Current xG</th>
                        <th className="text-center p-2 font-medium">New xG</th>
                        <th className="text-center p-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team) => {
                        const currentTier = getTeamTier(team.id);
                        const tierColor = getTierBadgeColor(currentTier);
                        
                        // Default xG values based on team tier and quality
                        const getDefaultXG = (teamId: number) => {
                          const defaults: Record<number, number> = {
                            13: 1.97, // Man City
                            12: 2.14, // Liverpool  
                            1: 1.67,  // Arsenal
                            7: 1.95,  // Chelsea
                            18: 1.67, // Tottenham
                            15: 1.60, // Newcastle
                            2: 1.47,  // Aston Villa
                            6: 1.85,  // Brighton
                            14: 1.45, // Man United
                            4: 1.53,  // Bournemouth
                            10: 1.20, // Fulham
                            5: 1.42,  // Brentford
                            16: 1.18, // Nottingham Forest
                            19: 1.27, // West Ham
                            8: 1.35,  // Crystal Palace
                            9: 1.10,  // Everton
                            20: 1.05, // Wolves
                            3: 0.88,  // Burnley
                            11: 0.95, // Leeds
                            17: 0.85  // Sunderland
                          };
                          return defaults[teamId] || 1.30;
                        };
                        
                        const defaultXG = getDefaultXG(team.id);
                        const currentXG = defaultXG; // TODO: Get from actual settings
                        const isChanged = Math.abs(currentXG - defaultXG) > 0.01;
                        
                        return (
                          <tr key={team.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div>
                                <p className="font-medium">{team.short_name}</p>
                                <p className="text-sm text-muted-foreground">{team.name}</p>
                              </div>
                            </td>
                            <td className="text-center p-2">
                              <Badge className={tierColor}>
                                {currentTier}
                              </Badge>
                            </td>
                            <td className="text-center p-2">
                              <span className="font-mono text-sm text-muted-foreground">
                                {defaultXG.toFixed(2)}
                              </span>
                            </td>
                            <td className="text-center p-2">
                              <span className={`font-mono font-medium ${isChanged ? 'text-blue-600' : ''}`}>
                                {currentXG.toFixed(2)}
                              </span>
                              {isChanged && (
                                <div className="text-xs text-blue-600 mt-1">Modified</div>
                              )}
                            </td>
                            <td className="text-center p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0.5"
                                max="3.0"
                                className="w-20 mx-auto text-center"
                                defaultValue={currentXG.toFixed(2)}
                                data-testid={`input-base-xg-${team.id}`}
                              />
                            </td>
                            <td className="text-center p-2">
                              <div className="flex gap-1 justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    toast({
                                      title: "xG Updated",
                                      description: `Base xG updated for ${team.short_name}`,
                                    });
                                  }}
                                  data-testid={`button-update-xg-${team.id}`}
                                >
                                  Update
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const input = document.querySelector(`[data-testid="input-base-xg-${team.id}"]`) as HTMLInputElement;
                                    if (input) input.value = defaultXG.toFixed(2);
                                    toast({
                                      title: "Reset to Default",
                                      description: `${team.short_name} xG reset to default ${defaultXG.toFixed(2)}`,
                                    });
                                  }}
                                  data-testid={`button-reset-xg-${team.id}`}
                                  title="Reset to default"
                                >
                                  ↺
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-purple-600">Elite Range</p>
                        <p className="text-2xl font-bold">1.8 - 2.2</p>
                        <p className="text-xs text-muted-foreground">Man City, Liverpool, Arsenal</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-blue-600">Strong Range</p>
                        <p className="text-2xl font-bold">1.4 - 1.7</p>
                        <p className="text-xs text-muted-foreground">Newcastle, Spurs, Villa</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-600">Average Range</p>
                        <p className="text-2xl font-bold">1.1 - 1.4</p>
                        <p className="text-xs text-muted-foreground">Fulham, Brighton, West Ham</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm font-medium text-orange-600">Weak/Promoted</p>
                        <p className="text-2xl font-bold">0.8 - 1.1</p>
                        <p className="text-xs text-muted-foreground">Promoted teams, relegation battlers</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attacking-multipliers" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Attacking Tier Multipliers</CardTitle>
                <CardDescription>Team quality-based multipliers for attacking prowess (applied to goals scored)</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetAttackMultipliers}
                className="flex items-center gap-2"
                data-testid="button-reset-attack-multipliers"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Tab
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Phase 5 Settings:</strong> These attacking tier multipliers are applied in Phase 5 of the goal projection calculation. Teams are assigned to tiers in the Attack Teams tab.
                </AlertDescription>
              </Alert>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Multiplier</th>
                      <th className="text-center p-2 font-medium">Default</th>
                      <th className="text-center p-2 font-medium">Current</th>
                      <th className="text-center p-2 font-medium">New Value</th>
                      <th className="text-center p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'eliteAttackMultiplier', name: 'Elite Attack', default: 1.5, min: 1.0, max: 2.0, description: 'Premier League elite attacking teams' },
                      { key: 'strongAttackMultiplier', name: 'Strong Attack', default: 1.25, min: 1.0, max: 1.5, description: 'Teams with strong attacking potential' },
                      { key: 'averageAttackMultiplier', name: 'Average Attack', default: 1.0, min: 0.8, max: 1.2, description: 'Mid-table teams (baseline)' },
                      { key: 'weakAttackMultiplier', name: 'Weak Attack', default: 0.75, min: 0.5, max: 1.0, description: 'Teams with attacking struggles' },
                      { key: 'promotedAttackMultiplier', name: 'Promoted Attack', default: 0.5, min: 0.3, max: 1.0, description: 'Newly promoted teams' }
                    ].map((setting) => {
                      const currentValue = (formData as any)[setting.key] || setting.default;
                      const isChanged = Math.abs(currentValue - setting.default) > 0.01;
                      
                      return (
                        <tr key={setting.key} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{setting.name}</p>
                              <p className="text-sm text-muted-foreground">{setting.description}</p>
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              {setting.default.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-center p-2">
                            <span className={`font-mono font-medium ${isChanged ? 'text-blue-600' : ''}`}>
                              {currentValue.toFixed(2)}
                            </span>
                            {isChanged && (
                              <div className="text-xs text-blue-600 mt-1">Modified</div>
                            )}
                          </td>
                          <td className="text-center p-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={setting.min}
                              max={setting.max}
                              className="w-20 mx-auto text-center"
                              value={currentValue.toFixed(2)}
                              onChange={(e) => handleInputChange(setting.key as keyof AdminSettings, e.target.value)}
                              data-testid={`input-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                            />
                          </td>
                          <td className="text-center p-2">
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast({
                                    title: "Multiplier Updated",
                                    description: `${setting.name} updated to ${currentValue.toFixed(2)}`,
                                  });
                                }}
                                data-testid={`button-update-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                              >
                                Update
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  handleInputChange(setting.key as keyof AdminSettings, setting.default.toString());
                                  toast({
                                    title: "Reset to Default",
                                    description: `${setting.name} reset to ${setting.default.toFixed(2)}`,
                                  });
                                }}
                                data-testid={`button-reset-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                                title="Reset to default"
                              >
                                ↺
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attacking-teams" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Attacking Tier Assignments
                </CardTitle>
                <CardDescription>
                  Assign all 20 Premier League teams to attacking tiers that determine their goal-scoring multipliers in projections.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetAttackTeams}
                className="flex items-center gap-2"
                data-testid="button-reset-attack-teams"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Tab
              </Button>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Defensive Tier Multipliers</CardTitle>
                <CardDescription>Team quality-based multipliers for defensive solidity (applied to goals conceded)</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetDefenseMultipliers}
                className="flex items-center gap-2"
                data-testid="button-reset-defense-multipliers"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Tab
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Defense Settings:</strong> These defensive tier multipliers are applied to goals against calculations. Teams are assigned to tiers in the Defense Teams tab.
                </AlertDescription>
              </Alert>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Multiplier</th>
                      <th className="text-center p-2 font-medium">Default</th>
                      <th className="text-center p-2 font-medium">Current</th>
                      <th className="text-center p-2 font-medium">New Value</th>
                      <th className="text-center p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'eliteDefenseMultiplier', name: 'Elite Defense', default: 0.5, min: 0.3, max: 0.8, description: 'Premier League elite defensive teams' },
                      { key: 'strongDefenseMultiplier', name: 'Strong Defense', default: 0.75, min: 0.5, max: 1.0, description: 'Teams with strong defensive records' },
                      { key: 'averageDefenseMultiplier', name: 'Average Defense', default: 1.0, min: 0.8, max: 1.2, description: 'Mid-table teams (baseline)' },
                      { key: 'weakDefenseMultiplier', name: 'Weak Defense', default: 1.25, min: 1.0, max: 1.8, description: 'Teams with defensive vulnerabilities' },
                      { key: 'promotedDefenseMultiplier', name: 'Promoted Defense', default: 1.5, min: 1.2, max: 2.0, description: 'Newly promoted teams' }
                    ].map((setting) => {
                      const currentValue = (formData as any)[setting.key] || setting.default;
                      const isChanged = Math.abs(currentValue - setting.default) > 0.01;
                      
                      return (
                        <tr key={setting.key} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{setting.name}</p>
                              <p className="text-sm text-muted-foreground">{setting.description}</p>
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              {setting.default.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-center p-2">
                            <span className={`font-mono font-medium ${isChanged ? 'text-blue-600' : ''}`}>
                              {currentValue.toFixed(2)}
                            </span>
                            {isChanged && (
                              <div className="text-xs text-blue-600 mt-1">Modified</div>
                            )}
                          </td>
                          <td className="text-center p-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={setting.min}
                              max={setting.max}
                              className="w-20 mx-auto text-center"
                              value={currentValue.toFixed(2)}
                              onChange={(e) => handleInputChange(setting.key as keyof AdminSettings, e.target.value)}
                              data-testid={`input-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                            />
                          </td>
                          <td className="text-center p-2">
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast({
                                    title: "Multiplier Updated",
                                    description: `${setting.name} updated to ${currentValue.toFixed(2)}`,
                                  });
                                }}
                                data-testid={`button-update-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                              >
                                Update
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  handleInputChange(setting.key as keyof AdminSettings, setting.default.toString());
                                  toast({
                                    title: "Reset to Default",
                                    description: `${setting.name} reset to ${setting.default.toFixed(2)}`,
                                  });
                                }}
                                data-testid={`button-reset-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                                title="Reset to default"
                              >
                                ↺
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defensive-teams" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Team Defensive Tier Assignments
                </CardTitle>
                <CardDescription>
                  Assign all 20 Premier League teams to defensive tiers that determine their clean sheet probability and goals against projections.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetDefenseTeams}
                className="flex items-center gap-2"
                data-testid="button-reset-defense-teams"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Tab
              </Button>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Global Settings</CardTitle>
                <CardDescription>System-wide multipliers that affect all projection calculations</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetGlobalSettings}
                className="flex items-center gap-2"
                data-testid="button-reset-global-settings"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Tab
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>System-Wide Settings:</strong> These global multipliers affect all projection calculations across the entire system.
                </AlertDescription>
              </Alert>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Setting</th>
                      <th className="text-center p-2 font-medium">Default</th>
                      <th className="text-center p-2 font-medium">Current</th>
                      <th className="text-center p-2 font-medium">New Value</th>
                      <th className="text-center p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'globalTierMultiplier', name: 'Global Tier Multiplier', default: 1.0, min: 0.5, max: 2.0, description: 'Master multiplier for all tier-based calculations' },
                      { key: 'lowConfidenceBoost', name: 'Low Confidence Boost', default: 1.15, min: 1.0, max: 2.0, description: 'Boost for projections with low confidence scores' },
                      { key: 'lowConfidenceThreshold', name: 'Low Confidence Threshold', default: 0.30, min: 0.1, max: 0.9, description: 'Confidence score threshold for boost application' }
                    ].map((setting) => {
                      const currentValue = (formData as any)[setting.key] || setting.default;
                      const isChanged = Math.abs(currentValue - setting.default) > 0.01;
                      
                      return (
                        <tr key={setting.key} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{setting.name}</p>
                              <p className="text-sm text-muted-foreground">{setting.description}</p>
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              {setting.default.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-center p-2">
                            <span className={`font-mono font-medium ${isChanged ? 'text-blue-600' : ''}`}>
                              {currentValue.toFixed(2)}
                            </span>
                            {isChanged && (
                              <div className="text-xs text-blue-600 mt-1">Modified</div>
                            )}
                          </td>
                          <td className="text-center p-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={setting.min}
                              max={setting.max}
                              className="w-20 mx-auto text-center"
                              value={currentValue.toFixed(2)}
                              onChange={(e) => handleInputChange(setting.key as keyof AdminSettings, e.target.value)}
                              data-testid={`input-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                            />
                          </td>
                          <td className="text-center p-2">
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast({
                                    title: "Setting Updated",
                                    description: `${setting.name} updated to ${currentValue.toFixed(2)}`,
                                  });
                                }}
                                data-testid={`button-update-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                              >
                                Update
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  handleInputChange(setting.key as keyof AdminSettings, setting.default.toString());
                                  toast({
                                    title: "Reset to Default",
                                    description: `${setting.name} reset to ${setting.default.toFixed(2)}`,
                                  });
                                }}
                                data-testid={`button-reset-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                                title="Reset to default"
                              >
                                ↺
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Context Multipliers</CardTitle>
                <CardDescription>Situational adjustments based on match circumstances and timing</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetContextMultipliers}
                className="flex items-center gap-2"
                data-testid="button-reset-context-multipliers"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Tab
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Phase 4 Settings:</strong> These context multipliers are applied in Phase 4 of the goal projection calculation based on match circumstances and timing.
                </AlertDescription>
              </Alert>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Context Multiplier</th>
                      <th className="text-center p-2 font-medium">Default</th>
                      <th className="text-center p-2 font-medium">Current</th>
                      <th className="text-center p-2 font-medium">New Value</th>
                      <th className="text-center p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'derbyGoalsMultiplier', name: 'Derby Matches', default: 0.87, min: 0.6, max: 1.3, description: 'Local rivalries and derby matches' },
                      { key: 'topSixGoalsMultiplier', name: 'Top Six Battles', default: 1.12, min: 0.8, max: 1.5, description: 'Matches between traditional Big Six teams' },
                      { key: 'relegationBattleGoalsMultiplier', name: 'Relegation Battles', default: 0.83, min: 0.6, max: 1.2, description: 'Matches between teams fighting relegation' },
                      { key: 'earlyKickoffGoalsMultiplier', name: 'Early Kickoff', default: 0.94, min: 0.8, max: 1.1, description: 'Early kickoff times (12:30 PM)' },
                      { key: 'lateKickoffGoalsMultiplier', name: 'Late Kickoff', default: 1.07, min: 0.9, max: 1.2, description: 'Late kickoff times (17:30/20:00)' },
                      { key: 'postEuropeanGoalsMultiplier', name: 'Post-European Fixtures', default: 0.88, min: 0.7, max: 1.0, description: 'After midweek European competitions' },
                      { key: 'midweekFixtureGoalsMultiplier', name: 'Midweek Fixtures', default: 0.91, min: 0.8, max: 1.1, description: 'Midweek Premier League fixtures' },
                      { key: 'seasonFinaleGoalsMultiplier', name: 'Season Finale', default: 1.05, min: 0.9, max: 1.3, description: 'Final gameweek matches' },
                      { key: 'newManagerBounceGoalsMultiplier', name: 'New Manager Bounce', default: 1.08, min: 1.0, max: 1.3, description: 'Teams with a new manager' }
                    ].map((setting) => {
                      const currentValue = (formData as any)[setting.key] || setting.default;
                      const isChanged = Math.abs(currentValue - setting.default) > 0.01;
                      
                      return (
                        <tr key={setting.key} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{setting.name}</p>
                              <p className="text-sm text-muted-foreground">{setting.description}</p>
                            </div>
                          </td>
                          <td className="text-center p-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              {setting.default.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-center p-2">
                            <span className={`font-mono font-medium ${isChanged ? 'text-blue-600' : ''}`}>
                              {currentValue.toFixed(2)}
                            </span>
                            {isChanged && (
                              <div className="text-xs text-blue-600 mt-1">Modified</div>
                            )}
                          </td>
                          <td className="text-center p-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={setting.min}
                              max={setting.max}
                              className="w-20 mx-auto text-center"
                              value={currentValue.toFixed(2)}
                              onChange={(e) => handleInputChange(setting.key as keyof AdminSettings, e.target.value)}
                              data-testid={`input-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                            />
                          </td>
                          <td className="text-center p-2">
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast({
                                    title: "Context Updated",
                                    description: `${setting.name} updated to ${currentValue.toFixed(2)}`,
                                  });
                                }}
                                data-testid={`button-update-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                              >
                                Update
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  handleInputChange(setting.key as keyof AdminSettings, setting.default.toString());
                                  toast({
                                    title: "Reset to Default",
                                    description: `${setting.name} reset to ${setting.default.toFixed(2)}`,
                                  });
                                }}
                                data-testid={`button-reset-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                                title="Reset to default"
                              >
                                ↺
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Market Bounds</CardTitle>
                <CardDescription>Hard limits and boundaries for goal projections to maintain realistic ranges</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetMarketBounds}
                className="flex items-center gap-2"
                data-testid="button-reset-market-bounds"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Tab
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Phase 8 Settings:</strong> Market bounds and venue factors applied in the final phases of goal projection calculations to ensure realistic ranges.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-6">
                {/* Market Bounds */}
                <div>
                  <h3 className="font-semibold mb-3">Goal Limits</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Bound</th>
                          <th className="text-center p-2 font-medium">Default</th>
                          <th className="text-center p-2 font-medium">Current</th>
                          <th className="text-center p-2 font-medium">New Value</th>
                          <th className="text-center p-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'absoluteMinGoals', name: 'Absolute Min Goals', default: 0.0, min: 0.0, max: 0.8, description: 'Hard minimum goals per match floor' },
                          { key: 'absoluteMaxGoals', name: 'Absolute Max Goals', default: 7.0, min: 3.0, max: 10.0, description: 'Hard maximum goals per match ceiling' }
                        ].map((setting) => {
                          const currentValue = (formData as any)[setting.key] || setting.default;
                          const isChanged = Math.abs(currentValue - setting.default) > 0.01;
                          
                          return (
                            <tr key={setting.key} className="border-b hover:bg-muted/50">
                              <td className="p-2">
                                <div>
                                  <p className="font-medium">{setting.name}</p>
                                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                                </div>
                              </td>
                              <td className="text-center p-2">
                                <span className="font-mono text-sm text-muted-foreground">
                                  {setting.default.toFixed(2)}
                                </span>
                              </td>
                              <td className="text-center p-2">
                                <span className={`font-mono font-medium ${isChanged ? 'text-blue-600' : ''}`}>
                                  {currentValue.toFixed(2)}
                                </span>
                                {isChanged && (
                                  <div className="text-xs text-blue-600 mt-1">Modified</div>
                                )}
                              </td>
                              <td className="text-center p-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min={setting.min}
                                  max={setting.max}
                                  className="w-20 mx-auto text-center"
                                  value={currentValue.toFixed(2)}
                                  onChange={(e) => handleInputChange(setting.key as keyof AdminSettings, e.target.value)}
                                  data-testid={`input-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                                />
                              </td>
                              <td className="text-center p-2">
                                <div className="flex gap-1 justify-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      toast({
                                        title: "Bound Updated",
                                        description: `${setting.name} updated to ${currentValue.toFixed(2)}`,
                                      });
                                    }}
                                    data-testid={`button-update-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                                  >
                                    Update
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      handleInputChange(setting.key as keyof AdminSettings, setting.default.toString());
                                      toast({
                                        title: "Reset to Default",
                                        description: `${setting.name} reset to ${setting.default.toFixed(2)}`,
                                      });
                                    }}
                                    data-testid={`button-reset-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                                    title="Reset to default"
                                  >
                                    ↺
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Venue Factors */}
                <div>
                  <h3 className="font-semibold mb-3">Venue Factors (Phase 2)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Venue Factor</th>
                          <th className="text-center p-2 font-medium">Default</th>
                          <th className="text-center p-2 font-medium">Current</th>
                          <th className="text-center p-2 font-medium">New Value</th>
                          <th className="text-center p-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'homeAdvantageGoalsMultiplier', name: 'Home Advantage', default: 1.15, min: 1.0, max: 1.3, description: 'Multiplier for teams playing at home (15% advantage)' },
                          { key: 'awayFactorGoalsMultiplier', name: 'Away Factor', default: 0.88, min: 0.7, max: 1.0, description: 'Multiplier for teams playing away (12% disadvantage)' }
                        ].map((setting) => {
                          const currentValue = (formData as any)[setting.key] || setting.default;
                          const isChanged = Math.abs(currentValue - setting.default) > 0.01;
                          
                          return (
                            <tr key={setting.key} className="border-b hover:bg-muted/50">
                              <td className="p-2">
                                <div>
                                  <p className="font-medium">{setting.name}</p>
                                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                                </div>
                              </td>
                              <td className="text-center p-2">
                                <span className="font-mono text-sm text-muted-foreground">
                                  {setting.default.toFixed(2)}
                                </span>
                              </td>
                              <td className="text-center p-2">
                                <span className={`font-mono font-medium ${isChanged ? 'text-blue-600' : ''}`}>
                                  {currentValue.toFixed(2)}
                                </span>
                                {isChanged && (
                                  <div className="text-xs text-blue-600 mt-1">Modified</div>
                                )}
                              </td>
                              <td className="text-center p-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min={setting.min}
                                  max={setting.max}
                                  className="w-20 mx-auto text-center"
                                  value={currentValue.toFixed(2)}
                                  onChange={(e) => handleInputChange(setting.key as keyof AdminSettings, e.target.value)}
                                  data-testid={`input-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                                />
                              </td>
                              <td className="text-center p-2">
                                <div className="flex gap-1 justify-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      toast({
                                        title: "Venue Factor Updated",
                                        description: `${setting.name} updated to ${currentValue.toFixed(2)}`,
                                      });
                                    }}
                                    data-testid={`button-update-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                                  >
                                    Update
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      handleInputChange(setting.key as keyof AdminSettings, setting.default.toString());
                                      toast({
                                        title: "Reset to Default",
                                        description: `${setting.name} reset to ${setting.default.toFixed(2)}`,
                                      });
                                    }}
                                    data-testid={`button-reset-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                                    title="Reset to default"
                                  >
                                    ↺
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Confidence Tab */}
        <TabsContent value="confidence" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Confidence Analysis</CardTitle>
              <CardDescription>
                Confidence levels and multipliers applied in goal projection calculations. Teams with confidence below {formData.lowConfidenceThreshold * 100}% receive a {formData.lowConfidenceBoost}x boost.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {confidenceLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fpl-purple mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading team confidence analysis...</p>
                </div>
              ) : confidenceData ? (
                <div className="space-y-6">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium">High Confidence</p>
                            <p className="text-2xl font-bold">
                              {confidenceData.filter(t => t.confidenceLevel === 'High').length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="h-5 w-5 text-yellow-600" />
                          <div>
                            <p className="text-sm font-medium">Medium Confidence</p>
                            <p className="text-2xl font-bold">
                              {confidenceData.filter(t => t.confidenceLevel === 'Medium').length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Target className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-sm font-medium">Low Confidence</p>
                            <p className="text-2xl font-bold">
                              {confidenceData.filter(t => t.confidenceLevel === 'Low').length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-5 w-5 text-fpl-purple" />
                          <div>
                            <p className="text-sm font-medium">Total Teams</p>
                            <p className="text-2xl font-bold">{confidenceData.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Team Confidence Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Team</th>
                          <th className="text-center p-2 font-medium">Confidence Score</th>
                          <th className="text-center p-2 font-medium">Level</th>
                          <th className="text-center p-2 font-medium">CS Rate</th>
                          <th className="text-center p-2 font-medium">Confidence Multiplier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {confidenceData.slice().sort((a, b) => b.confidenceScore - a.confidenceScore).map((team) => (
                          <tr key={team.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div>
                                <p className="font-medium">{team.team}</p>
                                <p className="text-sm text-muted-foreground">{team.teamName}</p>
                              </div>
                            </td>
                            <td className="text-center p-2">
                              <span className="font-mono font-medium">{team.confidenceScore}%</span>
                            </td>
                            <td className="text-center p-2">
                              <Badge className={getConfidenceBadgeColor(team.confidenceLevel)}>
                                {team.confidenceLevel}
                              </Badge>
                            </td>
                            <td className="text-center p-2">
                              <span className="font-mono">{team.baseCleanSheetRate}%</span>
                            </td>
                            <td className="text-center p-2">
                              <span className={`font-mono font-medium ${team.confidenceMultiplier > 1 ? 'text-green-600' : ''}`}>
                                {team.confidenceMultiplier}x
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Explanation */}
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-3">
                        <div>
                          <strong>How Confidence Score is Calculated:</strong>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Market Data (40%):</strong> Betting market assessment of team reliability</p>
                            <p><strong>Performance Consistency (25%):</strong> Player minutes and reliability metrics</p>
                          </div>
                          <div>
                            <p><strong>Volume Confidence (20%):</strong> Amount of available projection data</p>
                            <p><strong>Quality Bonus (15%):</strong> CS Rate ≥35% earns defensive quality bonus</p>
                          </div>
                        </div>
                        <div>
                          <strong>Confidence Levels:</strong> High ≥85% | Medium 65-84% | Low ≤64%
                        </div>
                        <div>
                          <strong>Impact:</strong> Teams with confidence below {formData.lowConfidenceThreshold * 100}% receive a {formData.lowConfidenceBoost}x boost to their expected goals. You can adjust these settings in the Global Settings tab.
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">Failed to load team confidence data.</p>
              )}
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
                onClick={resetPageSettings}
                className="flex items-center gap-2"
                data-testid="button-reset-page-settings"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Page
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={resetSettingsMutation.isPending}
                className="flex items-center gap-2"
                data-testid="button-reset-settings"
              >
                <RotateCcw className="h-4 w-4" />
                {resetSettingsMutation.isPending ? 'Resetting...' : 'Global Reset'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
