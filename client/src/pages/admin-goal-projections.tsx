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
import { PREMIER_LEAGUE_TEAMS } from "@shared/schema";
import ProtectedRoute from "@/components/protected-route";

interface Team {
  id: number;
  name: string;
  short_name: string;
  code: number;
}


interface AdminSettings {
  // Base Calculation Parameters - Previously Hardcoded
  averageBaseXGPerTeamPerGame: number;
  defaultTeamVariance: number;
  defaultExpectedGoalsPerGame: number;
  globalTierMultiplier: number;
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
  teamFormMultiplier: number;
  fixtureCongestionMultiplier: number;
  injuryCrisisMultiplier: number;
  europeanQualificationPushMultiplier: number;
  nothingToPlayForMultiplier: number;
  revengeFactorMultiplier: number;
  pressureMatchMultiplier: number;
  homeCrowdBoostMultiplier: number;
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
  // ATTACK TEAMS
  eliteAttackTeams: [12, 13], // Liverpool, Man City
  strongAttackTeams: [1, 7, 15, 18, 2], // Arsenal, Chelsea, Newcastle, Spurs, Aston Villa
  averageAttackTeams: [6, 14, 4, 5, 10], // Brighton, Man Utd, Bournemouth, Brentford, Fulham
  weakAttackTeams: [8, 9, 16, 19, 20], // Crystal Palace, Everton, Nott'm Forest, West Ham, Wolves
  promotedAttackTeams: [3, 11, 17], // Burnley, Leeds, Sunderland
  // DEFENSE TEAMS  
  eliteDefenseTeams: [1], // Arsenal
  strongDefenseTeams: [12, 13, 7, 15, 16], // Liverpool, Man City, Chelsea, Newcastle, Nott'm Forest
  averageDefenseTeams: [2, 9, 14, 18], // Aston Villa, Everton, Man Utd, Spurs
  weakDefenseTeams: [4, 5, 6, 8, 10, 19, 20], // Bournemouth, Brentford, Brighton, Crystal Palace, Fulham, West Ham, Wolves
  promotedDefenseTeams: [3, 11, 17], // Burnley, Leeds, Sunderland
};


export default function AdminGoalProjections() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<AdminSettings>({} as AdminSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('calculation-base');

  // Use hardcoded team data for consistency and performance
  const teams: Team[] = [...PREMIER_LEAGUE_TEAMS];

  // Fetch current admin settings from goals scored settings
  const { data: settings, isLoading } = useQuery<AdminSettings>({
    queryKey: ['/api/admin/goal-scored-settings'],
  });


  // Update settings mutation using goals scored settings endpoint
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<AdminSettings>) => {
      const response = await fetch('/api/admin/goal-scored-settings', {
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
        description: "Goals scored settings and projection parameters have been updated successfully.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/goal-scored-settings'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reset settings mutation using goals scored settings
  const resetSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/goal-scored-settings/reset', {
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/goal-scored-settings'] });
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
    eliteAttackTeams: [12, 13], // Liverpool, Man City
    strongAttackTeams: [1, 7, 15, 18, 2], // Arsenal, Chelsea, Newcastle, Spurs, Aston Villa
    averageAttackTeams: [6, 14, 4, 5, 10, 8], // Brighton, Man Utd, Bournemouth, Brentford, Fulham, Crystal Palace
    weakAttackTeams: [9, 16, 19, 20], // Everton, Nott'm Forest, West Ham, Wolves
    promotedAttackTeams: [17, 11, 3], // Sunderland, Leeds, Burnley
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
        
        // Defense team assignments
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
    strongDefenseTeams: [12, 13, 7, 15], // Liverpool, Man City, Chelsea, Newcastle
    averageDefenseTeams: [2, 9, 14, 18, 8, 10, 16], // Aston Villa, Everton, Man Utd, Spurs, Crystal Palace, Fulham, Nott'm Forest
    weakDefenseTeams: [4, 5, 6, 19, 20], // Bournemouth, Brentford, Brighton, West Ham, Wolves
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
    const averageDefenseTeams = parseTeamArray(formData.averageDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.averageDefenseTeams;
    const weakDefenseTeams = parseTeamArray(formData.weakDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.weakDefenseTeams;
    const promotedDefenseTeams = parseTeamArray(formData.promotedDefenseTeams) || DEFAULT_DEFENSIVE_TIERS.promotedDefenseTeams;

    if (eliteDefenseTeams.includes(teamId)) return 'elite';
    if (strongDefenseTeams.includes(teamId)) return 'strong';
    if (averageDefenseTeams.includes(teamId)) return 'average';
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

  // Define default values for each category - Updated to match MASTER_TEAM_DEFAULTS
  const DEFAULT_VALUES = {
    // Attack Multipliers
    attackMultipliers: {
      eliteAttackMultiplier: 1.35,
      strongAttackMultiplier: 1.15,
      averageAttackMultiplier: 1.00,
      weakAttackMultiplier: 0.85,
      promotedAttackMultiplier: 0.7,
    },
    // Defense Multipliers
    defenseMultipliers: {
      eliteDefenseMultiplier: 0.7,
      strongDefenseMultiplier: 0.85,
      averageDefenseMultiplier: 1.00,
      weakDefenseMultiplier: 1.15,
      promotedDefenseMultiplier: 1.3,
    },
    // Confidence Settings
    confidenceSettings: {
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
      weatherConditionsGoalsMultiplier: 0.92,
      refereeInfluenceMultiplier: 1.0,
      postInternationalBreakMultiplier: 0.92,
      travelDistanceFatigueMultiplier: 0.95,
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
      homeAdvantageMultiplier: 1.16,
      awayFactorMultiplier: 0.84,
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

  const resetVenueFactors = () => {
    if (confirm('Reset only this tab\'s venue factors to default values? Other settings will remain unchanged.')) {
      setFormData(prev => ({ ...prev, ...DEFAULT_VALUES.venueFactors }));
      setHasChanges(true);
      toast({
        title: "Venue Factors Reset",
        description: "Only venue factors have been reset to default values.",
      });
    }
  };

  const resetMarketBounds = () => {
    if (confirm('Reset only this tab\'s market bounds to default values? Other settings will remain unchanged.')) {
      setFormData(prev => ({ ...prev, ...DEFAULT_VALUES.marketBounds }));
      setHasChanges(true);
      toast({
        title: "Market Bounds Reset",
        description: "Only market bounds have been reset to default values.",
      });
    }
  };

  const resetPageSettings = () => {
    if (confirm('Reset all settings on this Team Goals admin page to default values? This will reset all 7 tabs: attacking multipliers, attacking teams, defensive multipliers, defensive teams, context multipliers, venue factors, and market bounds. Other system configurations will remain unchanged.')) {
      setFormData(prev => ({
        ...prev,
        ...DEFAULT_VALUES.attackMultipliers,
        ...DEFAULT_VALUES.defenseMultipliers,
        ...DEFAULT_VALUES.contextMultipliers,
        ...DEFAULT_VALUES.marketBounds,
        ...DEFAULT_VALUES.venueFactors,
        ...DEFAULT_VALUES.confidenceSettings,
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

  // Function to get the reset function for the current tab
  const getCurrentTabResetFunction = () => {
    switch (activeTab) {
      case 'base-xg':
        return () => {
          if (confirm('Reset all base xG values to default 2025/26 season projections?')) {
            toast({
              title: "Base xG Reset",
              description: "All team base xG values have been reset to season defaults.",
            });
          }
        };
      case 'attacking-multipliers':
        return resetAttackMultipliers;
      case 'attacking-teams':
        return resetAttackTeams;
      case 'defensive-multipliers':
        return resetDefenseMultipliers;
      case 'defensive-teams':
        return resetDefenseTeams;
      case 'context':
        return resetContextMultipliers;
      case 'venue':
        return resetVenueFactors;
      case 'market':
        return resetMarketBounds;
      case 'final-bounds':
        return () => {
          if (confirm('Reset only final bounds settings to default values? Other settings will remain unchanged.')) {
            setFormData(prev => ({ 
              ...prev, 
              absoluteMinGoals: 0.0,
              absoluteMaxGoals: 7.0
            }));
            setHasChanges(true);
            toast({
              title: "Final Bounds Reset",
              description: "Final bounds have been reset to default values.",
            });
          }
        };
      default:
        return null;
    }
  };

  // Function to get the reset button text for the current tab
  const getCurrentTabResetText = () => {
    switch (activeTab) {
      case 'calculation-base':
        return 'Reset Overview';
      case 'base-xg':
        return 'Reset Base xG';
      case 'attacking-multipliers':
        return 'Reset Attack Multipliers';
      case 'attacking-teams':
        return 'Reset Attack Teams';
      case 'defensive-multipliers':
        return 'Reset Defense Multipliers';
      case 'defensive-teams':
        return 'Reset Defense Teams';
      case 'context':
        return 'Reset Context Multipliers';
      case 'venue':
        return 'Reset Venue Factors';
      case 'market':
        return 'Reset Market Bounds';
      case 'final-bounds':
        return 'Reset Final Bounds';
      default:
        return 'Reset Tab';
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
    <ProtectedRoute requireAdmin={true}>
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
          Changes apply immediately to update team goal projections.
          <br/><br/>
          <strong>Parameter Integration:</strong> These settings work together to create realistic Premier League goal projections 
          maintaining appropriate ranges (30-85 goals per season per team) across all gameweeks.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="calculation-base" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 h-auto p-2 bg-muted rounded-lg">
          <TabsTrigger value="calculation-base" className="text-xs md:text-sm whitespace-nowrap">Projection Model</TabsTrigger>
          <TabsTrigger value="base-xg" className="text-xs md:text-sm whitespace-nowrap">Base xG Settings</TabsTrigger>
          <TabsTrigger value="attacking-teams" className="text-xs md:text-sm whitespace-nowrap">Attack Teams</TabsTrigger>
          <TabsTrigger value="attacking-multipliers" className="text-xs md:text-sm whitespace-nowrap">Attack Multipliers</TabsTrigger>
          <TabsTrigger value="defensive-teams" className="text-xs md:text-sm whitespace-nowrap">Defence Teams</TabsTrigger>
          <TabsTrigger value="defensive-multipliers" className="text-xs md:text-sm whitespace-nowrap">Defence Multipliers</TabsTrigger>
          <TabsTrigger value="venue" className="text-xs md:text-sm whitespace-nowrap">Venue Factors</TabsTrigger>
          <TabsTrigger value="context" className="text-xs md:text-sm whitespace-nowrap">Context Multipliers</TabsTrigger>
          <TabsTrigger value="market" className="text-xs md:text-sm whitespace-nowrap">Market Bounds</TabsTrigger>
          <TabsTrigger value="final-bounds" className="text-xs md:text-sm whitespace-nowrap">Final Bounds</TabsTrigger>
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
                        <strong>Average Base xG per Team per Game:</strong> <span className="font-mono text-blue-600">{formData.averageBaseXGPerTeamPerGame || 1.5}</span>
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 2: Attacking Tiers</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Elite:</strong> × <span className="font-mono text-orange-600">{formData.eliteAttackMultiplier || 1.35}</span><br/>
                        <strong>Strong:</strong> × <span className="font-mono text-orange-600">{formData.strongAttackMultiplier || 1.15}</span><br/>
                        <strong>Average:</strong> × <span className="font-mono text-orange-600">{formData.averageAttackMultiplier || 1.00}</span><br/>
                        <strong>Weak:</strong> × <span className="font-mono text-orange-600">{formData.weakAttackMultiplier || 0.85}</span><br/>
                        <strong>Promoted:</strong> × <span className="font-mono text-orange-600">{formData.promotedAttackMultiplier || 0.7}</span>
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 3: Defensive Tiers</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Elite Defense:</strong> × <span className="font-mono text-blue-600">{formData.eliteDefenseMultiplier || 0.7}</span><br/>
                        <strong>Strong Defense:</strong> × <span className="font-mono text-blue-600">{formData.strongDefenseMultiplier || 0.85}</span><br/>
                        <strong>Average Defense:</strong> × <span className="font-mono text-blue-600">{formData.averageDefenseMultiplier || 1.0}</span><br/>
                        <strong>Weak Defense:</strong> × <span className="font-mono text-blue-600">{formData.weakDefenseMultiplier || 1.15}</span><br/>
                        <strong>Promoted Defense:</strong> × <span className="font-mono text-blue-600">{formData.promotedDefenseMultiplier || 1.3}</span>
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 4: Venue adjustments</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Home:</strong> xG × <span className="font-mono text-green-600">{formData.homeAdvantageGoalsMultiplier || 1.16}</span><br/>
                        <strong>Away:</strong> xG × <span className="font-mono text-red-600">{formData.awayFactorGoalsMultiplier || 0.84}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 5: Context Multipliers</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Derby Matches:</strong> × <span className="font-mono text-purple-600">{formData.derbyGoalsMultiplier || 0.87}</span><br/>
                        <strong>Top Six Battles:</strong> × <span className="font-mono text-purple-600">{formData.topSixGoalsMultiplier || 1.12}</span><br/>
                        <strong>Relegation Battles:</strong> × <span className="font-mono text-purple-600">{formData.relegationBattleGoalsMultiplier || 0.83}</span><br/>
                        <strong>Early Kickoff:</strong> × <span className="font-mono text-purple-600">{formData.earlyKickoffGoalsMultiplier || 0.94}</span><br/>
                        <strong>Late Kickoff:</strong> × <span className="font-mono text-purple-600">{formData.lateKickoffGoalsMultiplier || 1.07}</span><br/>
                        <strong>Post-European:</strong> × <span className="font-mono text-purple-600">{formData.postEuropeanGoalsMultiplier || 0.88}</span><br/>
                        <strong>Midweek Fixtures:</strong> × <span className="font-mono text-purple-600">{formData.midweekFixtureGoalsMultiplier || 0.91}</span><br/>
                        <strong>Season Finale:</strong> × <span className="font-mono text-purple-600">{formData.seasonFinaleGoalsMultiplier || 1.05}</span><br/>
                        <strong>New Manager Bounce:</strong> × <span className="font-mono text-purple-600">{formData.newManagerBounceGoalsMultiplier || 1.08}</span><br/>
                        <strong>Adverse Weather:</strong> × <span className="font-mono text-purple-600">{formData.weatherConditionsGoalsMultiplier || DEFAULT_VALUES.contextMultipliers.weatherConditionsGoalsMultiplier}</span><br/>
                        <strong>Referee Style:</strong> × <span className="font-mono text-purple-600">{formData.refereeInfluenceMultiplier || DEFAULT_VALUES.contextMultipliers.refereeInfluenceMultiplier} (Lenient: +5%, Strict: -5%)</span><br/>
                        <strong>Post-Int'l Break:</strong> × <span className="font-mono text-purple-600">{formData.postInternationalBreakMultiplier || DEFAULT_VALUES.contextMultipliers.postInternationalBreakMultiplier}</span><br/>
                        <strong>Long Travel (Away):</strong> × <span className="font-mono text-purple-600">{formData.travelDistanceFatigueMultiplier || DEFAULT_VALUES.contextMultipliers.travelDistanceFatigueMultiplier}</span>
                      </p>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Phase 6: Market Bounds</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Market Floor Multiplier:</strong> <span className="font-mono text-indigo-600">{formData.marketFloorMultiplier || 0.40}</span><br/>
                        <strong>Market Ceiling Multiplier:</strong> <span className="font-mono text-indigo-600">{formData.marketCeilingMultiplier || 2.0}</span>
                      </p>
                    </div>
                    
                    
                    <div className="p-3 border rounded-lg bg-fpl-purple/5">
                      <h4 className="font-semibold text-sm mb-2">Phase 7: Final Bounds</h4>
                      <p className="text-sm text-muted-foreground">
                        <strong>Absolute Min Goals:</strong> <span className="font-mono text-gray-600">{formData.absoluteMinGoals || 0.0}</span><br/>
                        <strong>Absolute Max Goals:</strong> <span className="font-mono text-gray-600">{formData.absoluteMaxGoals || 7.0}</span><br/>
                        Final safety bounds to ensure realistic ranges
                      </p>
                    </div>
                  </div>
                </div>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Impact:</strong> All teams start from the same base xG foundation (1.35) in Phase 1. Team differences emerge through attacking/defensive tier multipliers, venue factors, and context adjustments applied in subsequent phases. This ensures a fair foundation while allowing team quality differences to be reflected through the layered multiplier system.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Base xG Settings Tab */}
        <TabsContent value="base-xg" className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Base Calculation Parameters</CardTitle>
                <CardDescription>Core mathematical constants (previously hardcoded) that drive all team goal projections</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>No More Hardcoded Values:</strong> All base calculation parameters are now configurable through this admin interface. Previously these were hardcoded in the system code and could not be changed without code updates.
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
                        { key: 'averageBaseXGPerTeamPerGame', name: 'Universal Base xG per Team per Game', default: 1.5, min: 0.8, max: 2.0, description: 'Universal foundation xG that all teams start from before adjustments' },
                        { key: 'defaultExpectedGoalsPerGame', name: 'Default Expected Goals per Game', default: 1.3, min: 1.0, max: 2.0, description: 'Fallback value for unknown teams' },
                        { key: 'defaultTeamVariance', name: 'Default Team Variance', default: 0.45, min: 0.2, max: 0.8, description: 'Goal prediction variance for teams' },
                        { key: 'globalTierMultiplier', name: 'Global Tier Multiplier', default: 1.25, min: 1.0, max: 2.0, description: 'Global tier impact factor' }
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
                                      title: "Base xG Updated",
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

                <div className="mt-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="font-semibold mb-2">How It Works</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          All teams start with the same base xG foundation. Team differences are created through:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                          <div className="text-center">
                            <p className="font-medium text-purple-600">Phase 4: Attack Tiers</p>
                            <p className="text-muted-foreground">Elite (×{formData.eliteAttackMultiplier || 1.35}), Strong (×{formData.strongAttackMultiplier || 1.15}), etc.</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-blue-600">Phase 3: Defensive Tiers</p>
                            <p className="text-muted-foreground">Elite (×{formData.eliteDefenseMultiplier || 0.7}), Strong (×{formData.strongDefenseMultiplier || 0.85}), etc.</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-green-600">Phase 2: Venue</p>
                            <p className="text-muted-foreground">Home advantage, away factor</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-orange-600">Phase 5: Context</p>
                            <p className="text-muted-foreground">Derby, top six, relegation battles</p>
                          </div>
                        </div>
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
            <CardHeader>
              <div>
                <CardTitle>Attacking Tier Multipliers</CardTitle>
                <CardDescription>Team quality-based multipliers for attacking prowess (applied to goals scored)</CardDescription>
              </div>
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
                      { key: 'eliteAttackMultiplier', name: 'Elite Attack', default: 1.35, min: 1.0, max: 2.0, description: 'Premier League elite attacking teams' },
                      { key: 'strongAttackMultiplier', name: 'Strong Attack', default: 1.15, min: 1.0, max: 1.5, description: 'Teams with strong attacking potential' },
                      { key: 'averageAttackMultiplier', name: 'Average Attack', default: 1.00, min: 0.8, max: 1.2, description: 'Mid-table teams (baseline)' },
                      { key: 'weakAttackMultiplier', name: 'Weak Attack', default: 0.85, min: 0.5, max: 1.0, description: 'Teams with attacking struggles' },
                      { key: 'promotedAttackMultiplier', name: 'Promoted Attack', default: 0.7, min: 0.3, max: 1.0, description: 'Newly promoted teams' }
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
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Attacking Tier Assignments
                </CardTitle>
                <CardDescription>
                  Assign all 20 Premier League teams to attacking tiers that determine their goal-scoring multipliers in projections.
                </CardDescription>
              </div>
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
              <div>
                <CardTitle>Defensive Tier Multipliers</CardTitle>
                <CardDescription>Team quality-based multipliers for defensive solidity (applied to goals conceded)</CardDescription>
              </div>
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
                      { key: 'eliteDefenseMultiplier', name: 'Elite Defense', default: 0.7, min: 0.3, max: 0.8, description: 'Premier League elite defensive teams' },
                      { key: 'strongDefenseMultiplier', name: 'Strong Defense', default: 0.85, min: 0.5, max: 1.0, description: 'Teams with strong defensive records' },
                      { key: 'averageDefenseMultiplier', name: 'Average Defense', default: 1.0, min: 0.8, max: 1.2, description: 'Mid-table teams (baseline)' },
                      { key: 'weakDefenseMultiplier', name: 'Weak Defense', default: 1.15, min: 1.0, max: 1.8, description: 'Teams with defensive vulnerabilities' },
                      { key: 'promotedDefenseMultiplier', name: 'Promoted Defense', default: 1.3, min: 1.2, max: 2.0, description: 'Newly promoted teams' }
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
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Team Defensive Tier Assignments
                </CardTitle>
                <CardDescription>
                  Assign all 20 Premier League teams to defensive tiers that determine their clean sheet probability and goals against projections.
                </CardDescription>
              </div>
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


        <TabsContent value="context" className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Context Multipliers</CardTitle>
                <CardDescription>Situational adjustments based on match circumstances and timing</CardDescription>
              </div>
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
                      { key: 'derbyGoalsMultiplier', name: 'Derby Matches', default: 0.87, min: 0.6, max: 1.3, description: 'Local rivalries (-13%): More defensive, cagey affairs where teams prioritize not losing. Increased physicality and tactical caution suppress goal scoring.' },
                      { key: 'topSixGoalsMultiplier', name: 'Top Six Battles', default: 1.12, min: 0.8, max: 1.5, description: 'Elite team clashes (+12%): High-quality attacking teams create more open, end-to-end games with superior technical ability breaking down defenses.' },
                      { key: 'relegationBattleGoalsMultiplier', name: 'Relegation Battles', default: 0.83, min: 0.6, max: 1.2, description: 'Bottom table clashes (-17%): Teams prioritize defensive solidity and avoiding defeat. Conservative tactics and "grind-out" mentalities suppress attacking risk-taking.' },
                      { key: 'earlyKickoffGoalsMultiplier', name: 'Early Kickoff', default: 0.94, min: 0.8, max: 1.1, description: 'Weekend early starts (-6%): Players not fully warmed up physically/mentally for 12:30 PM kickoffs. Harder to achieve full intensity in early matches.' },
                      { key: 'lateKickoffGoalsMultiplier', name: 'Late Kickoff', default: 1.07, min: 0.9, max: 1.2, description: 'Evening matches (+7%): Players naturally more alert in evening hours. Prime-time TV matches feature enhanced atmospheres and more expansive play.' },
                      { key: 'postEuropeanGoalsMultiplier', name: 'Post-European Fixtures', default: 0.88, min: 0.7, max: 1.0, description: 'After European games (-12%): Player fatigue from Champions/Europa League matches leads to reduced intensity and squad rotation affecting performance.' },
                      { key: 'midweekFixtureGoalsMultiplier', name: 'Midweek Fixtures', default: 0.91, min: 0.8, max: 1.1, description: 'Tuesday/Wednesday games (-9%): Tired players, reduced crowd attendance, disrupted preparation routines. Fixture congestion leads to conservative play.' },
                      { key: 'seasonFinaleGoalsMultiplier', name: 'Season Finale', default: 1.05, min: 0.9, max: 1.3, description: 'Final gameweek (+5%): More open matches as teams with nothing to play for take risks, though modest increase as some teams already in vacation mode.' },
                      { key: 'newManagerBounceGoalsMultiplier', name: 'New Manager Bounce', default: 1.08, min: 1.0, max: 1.3, description: 'Honeymoon period (+8%): New tactical changes, renewed motivation, players trying to impress. Fresh approach leads to more attacking, adventurous play.' },
                      { key: 'weatherConditionsGoalsMultiplier', name: 'Weather Conditions', default: 0.92, min: 0.8, max: 1.0, description: 'Adverse weather (-8%): Rain, cold (<5°C), or high wind disrupts passing accuracy and shot precision. Slippery pitches reduce high-intensity actions and lower shot quality.' },
                      { key: 'refereeInfluenceMultiplier', name: 'Referee Influence', default: 1.0, min: 0.9, max: 1.1, description: 'Officiating style (±5%): Lenient refs allow more open play and fouls in attacking areas (+5%). Strict refs suppress attacking risks and reduce chances (-5%).' },
                      { key: 'postInternationalBreakMultiplier', name: 'Post-International Break', default: 0.92, min: 0.8, max: 1.0, description: 'First game back (-8%): Travel fatigue, jet lag, and squad disruption reduce intensity. Teams with many internationals show reduced chance creation and errors.' },
                      { key: 'travelDistanceFatigueMultiplier', name: 'Travel Distance Fatigue', default: 0.95, min: 0.85, max: 1.0, description: 'Long away trips (-5%): Journeys >300km cause fatigue for away teams only. Reduced pressing intensity and increased errors from travel exhaustion.' },
                      { key: 'teamFormMultiplier', name: 'Team Form', default: 1.06, min: 0.9, max: 1.15, description: 'Recent performance (+6% good/-6% poor): Teams in good form (3-4 wins in last 5) show improved confidence and momentum, while poor form teams (0-1 wins) display reduced confidence.' },
                      { key: 'fixtureCongestionMultiplier', name: 'Fixture Congestion', default: 0.89, min: 0.7, max: 1.0, description: 'Heavy schedule (-11%): Teams playing 3+ games in 7 days suffer from physical and mental fatigue. Squad rotation and reduced intensity impact attacking output.' },
                      { key: 'injuryCrisisMultiplier', name: 'Injury Crisis', default: 0.92, min: 0.8, max: 1.0, description: 'Key players missing (-8%): When 3+ attacking players are injured/suspended, teams lose tactical familiarity and creative partnerships, forcing more conservative play.' },
                      { key: 'europeanQualificationPushMultiplier', name: 'European Push', default: 1.08, min: 1.0, max: 1.2, description: 'Fighting for Europe (+8%): Teams battling for Champions League/Europa spots (positions 4-7) show increased attacking urgency and willingness to take risks.' },
                      { key: 'nothingToPlayForMultiplier', name: 'Nothing to Play For', default: 0.94, min: 0.8, max: 1.0, description: 'Mid-table security (-6%): Teams safe from relegation but unable to reach Europe often display reduced intensity and "beach mode" mentality in final months.' },
                      { key: 'revengeFactorMultiplier', name: 'Revenge Factor', default: 1.05, min: 1.0, max: 1.15, description: 'Revenge motivation (+5%): Return fixtures where team lost heavily (3+ goals) in reverse fixture. Extra motivation to prove previous result was anomaly.' },
                      { key: 'pressureMatchMultiplier', name: 'Pressure Match', default: 0.91, min: 0.8, max: 1.0, description: 'Must-win scenarios (-9%): High-stakes games where defeat has serious consequences often see teams become overly cautious and struggle with creative attacking play.' },
                      { key: 'homeCrowdBoostMultiplier', name: 'Home Crowd Boost', default: 1.04, min: 1.0, max: 1.15, description: 'Exceptional atmosphere (+4%): Big home games with extraordinary crowd support lift attacking performance above normal levels through enhanced motivation.' }
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

        {/* Venue Factors Tab */}
        <TabsContent value="venue" className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Venue Factors</CardTitle>
                <CardDescription>Home and away multipliers that adjust goals scored based on match venue (Phase 2)</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Phase 2 Settings:</strong> Venue adjustments applied early in the calculation process. Home teams typically score more goals while away teams score fewer due to travel, crowd support, and familiarity factors.
                </AlertDescription>
              </Alert>
              
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
                      { key: 'homeAdvantageGoalsMultiplier', name: 'Home Advantage', default: 1.16, min: 1.0, max: 1.3, description: 'Multiplier for teams playing at home (16% advantage)' },
                      { key: 'awayFactorGoalsMultiplier', name: 'Away Factor', default: 0.84, min: 0.7, max: 1.0, description: 'Multiplier for teams playing away (16% disadvantage)' }
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Market Bounds</CardTitle>
                <CardDescription>Hard limits and boundaries for goal projections to maintain realistic ranges</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Phase 6 Settings:</strong> Market multiplier bounds control the variance range for goal projections. Floor multiplier prevents extremely low projections while ceiling multiplier caps unrealistic high values.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-6">
                {/* Market Bounds */}
                <div>
                  <h3 className="font-semibold mb-3">Market Multiplier Bounds</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Market Bound</th>
                          <th className="text-center p-2 font-medium">Default</th>
                          <th className="text-center p-2 font-medium">Current</th>
                          <th className="text-center p-2 font-medium">New Value</th>
                          <th className="text-center p-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'marketFloorMultiplier', name: 'Market Floor Multiplier', default: 0.40, min: 0.20, max: 0.80, description: 'Lower bound multiplier for market-driven adjustments' },
                          { key: 'marketCeilingMultiplier', name: 'Market Ceiling Multiplier', default: 2.0, min: 1.5, max: 3.0, description: 'Upper bound multiplier for market-driven adjustments' }
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
                                        title: "Market Multiplier Updated",
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

        {/* Final Bounds Tab */}
        <TabsContent value="final-bounds" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Final Safety Bounds</CardTitle>
                  <CardDescription>Absolute minimum and maximum goal limits applied as final safety checks</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm('Reset only final bounds settings to default values? Other settings will remain unchanged.')) {
                      setFormData(prev => ({ 
                        ...prev, 
                        absoluteMinGoals: 0.0,
                        absoluteMaxGoals: 7.0
                      }));
                      setHasChanges(true);
                      toast({
                        title: "Final Bounds Reset",
                        description: "Final bounds have been reset to default values.",
                      });
                    }
                  }}
                  className="flex items-center gap-2"
                  data-testid="button-reset-final-bounds"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Final Bounds
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Final Safety Net:</strong> These bounds are applied as the very last step in goal projection calculations to ensure no unrealistic values escape the system, regardless of how multipliers compound.
                  </AlertDescription>
                </Alert>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Final Bound</th>
                        <th className="text-center p-2 font-medium">Default</th>
                        <th className="text-center p-2 font-medium">Current</th>
                        <th className="text-center p-2 font-medium">New Value</th>
                        <th className="text-center p-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'absoluteMinGoals', name: 'Absolute Min Goals', default: 0.0, min: 0.0, max: 0.8, description: 'Hard minimum goals per match - no game can project below this' },
                        { key: 'absoluteMaxGoals', name: 'Absolute Max Goals', default: 7.0, min: 3.0, max: 10.0, description: 'Hard maximum goals per match - no game can project above this' }
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
                                step="0.1"
                                min={setting.min}
                                max={setting.max}
                                value={currentValue.toFixed(2)}
                                onChange={(e) => handleInputChange(setting.key as keyof AdminSettings, e.target.value)}
                                className="w-20 text-center"
                                data-testid={`input-${setting.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                              />
                            </td>
                            <td className="text-center p-2">
                              <div className="flex gap-1 justify-center">
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
              {getCurrentTabResetFunction() && (
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    const resetFn = getCurrentTabResetFunction();
                    if (resetFn) resetFn();
                  }}
                  className="flex items-center gap-2"
                  data-testid="button-reset-current-tab"
                >
                  <RotateCcw className="h-4 w-4" />
                  {getCurrentTabResetText()}
                </Button>
              )}
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
    </ProtectedRoute>
  );
}
