import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, RotateCcw, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PricePredictionConfig {
  // Threshold coefficients
  riseCoefficient: number;
  fallCoefficient: number;
  
  // Minimum thresholds
  minRiseThreshold: number;
  minFallThreshold: number;
  
  // Price multipliers
  budgetPriceMultiplier: number;    // < £6.0m
  midPriceMultiplier: number;       // £6.0m - £10.0m
  premiumPriceMultiplier: number;   // £10.0m - £13.0m
  superPremiumPriceMultiplier: number; // > £13.0m
  
  // Velocity bonuses
  highVelocityThreshold: number;
  mediumVelocityThreshold: number;
  highVelocityBonus: number;
  mediumVelocityBonus: number;
  normalVelocityBonus: number;
  
  // Probability thresholds
  veryHighProbabilityThreshold: number;
  highProbabilityThreshold: number;
  mediumProbabilityThreshold: number;
}

const defaultConfig: PricePredictionConfig = {
  // Community-researched thresholds
  riseCoefficient: 0.05,  // 5% of absolute ownership
  fallCoefficient: 0.04,  // 4% of absolute ownership
  
  // Minimum transfers needed
  minRiseThreshold: 10000,  // 10k minimum transfers
  minFallThreshold: 8000,   // 8k minimum transfers
  
  // Price tier multipliers
  budgetPriceMultiplier: 0.85,    // Budget players easier
  midPriceMultiplier: 1.0,        // Mid-price normal
  premiumPriceMultiplier: 1.2,    // Premium slightly harder
  superPremiumPriceMultiplier: 1.4, // Super premium harder
  
  // Transfer velocity system
  highVelocityThreshold: 5000,   // Transfers per hour
  mediumVelocityThreshold: 2000, // Transfers per hour
  highVelocityBonus: 1.2,        // 20% bonus
  mediumVelocityBonus: 1.1,      // 10% bonus
  normalVelocityBonus: 1.0,      // No bonus
  
  // Probability calculation
  veryHighProbabilityThreshold: 0.8,
  highProbabilityThreshold: 0.5,
  mediumProbabilityThreshold: 0.2,
};

export default function AdminPricePredictions() {
  const { toast } = useToast();
  const [config, setConfig] = useState<PricePredictionConfig>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current configuration
  const { data: currentConfig, isLoading } = useQuery({
    queryKey: ["/api/admin/price-prediction-config"],
    onSuccess: (data) => {
      if (data) {
        setConfig(data);
      }
    }
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: PricePredictionConfig) => {
      return await apiRequest("/api/admin/price-prediction-config", "POST", newConfig);
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Price prediction algorithm settings have been updated successfully.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/price-predictions"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save configuration. Please try again.",
      });
      console.error("Failed to save config:", error);
    }
  });

  // Reset to defaults mutation  
  const resetConfigMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/admin/price-prediction-config/reset", "POST");
    },
    onSuccess: () => {
      setConfig(defaultConfig);
      setHasChanges(true);
      toast({
        title: "Reset to Defaults",
        description: "Configuration has been reset to default values.",
      });
    }
  });

  const handleConfigChange = (key: keyof PricePredictionConfig, value: number) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveConfigMutation.mutate(config);
  };

  const handleReset = () => {
    resetConfigMutation.mutate();
  };

  const ConfigField = ({ 
    label, 
    configKey, 
    description, 
    defaultValue, 
    currentValue, 
    unit = "" 
  }: { 
    label: string;
    configKey: keyof PricePredictionConfig;
    description: string;
    defaultValue: number;
    currentValue: number;
    unit?: string;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 border rounded-lg">
      <div>
        <Label className="font-medium">{label}</Label>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Default</Label>
          <div className="p-2 bg-muted/30 rounded text-sm font-mono">
            {defaultValue}{unit}
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Current</Label>
          <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-sm font-mono">
            {currentValue}{unit}
          </div>
        </div>
      </div>
      <div>
        <Label className="text-xs">New Value</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step={String(configKey).includes('Coefficient') ? '0.001' : String(configKey).includes('Threshold') ? '1000' : '0.1'}
            value={config[configKey]}
            onChange={(e) => handleConfigChange(configKey, parseFloat(e.target.value) || 0)}
            className="font-mono"
            data-testid={`input-${String(configKey)}`}
          />
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="fpl-page-container">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/20 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-container">
      {/* Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          Price Prediction Admin
        </div>
        <p className="fpl-page-subtitle">
          Configure algorithm variables for price change predictions
        </p>
      </div>

      <div className="fpl-section-spacing">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveConfigMutation.isPending}
            className="flex-1 sm:flex-none"
            data-testid="button-save-config"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveConfigMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetConfigMutation.isPending}
            data-testid="button-reset-config"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          
          {hasChanges && (
            <Badge variant="secondary" className="self-start">
              Unsaved Changes
            </Badge>
          )}
        </div>

        {/* Status Alert */}
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Changes to these settings will affect price predictions for all 705 players. 
            The algorithm uses community-researched thresholds from LiveFPL, Fantasy Football Fix, and r/FantasyPL.
          </AlertDescription>
        </Alert>

        {/* Threshold Coefficients */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              FPL Threshold Coefficients
            </CardTitle>
            <CardDescription>
              Core algorithm thresholds as percentage of absolute ownership
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConfigField
              label="Rise Coefficient"
              configKey="riseCoefficient"
              description="Percentage of absolute ownership needed for price rise"
              defaultValue={defaultConfig.riseCoefficient}
              currentValue={currentConfig?.riseCoefficient || defaultConfig.riseCoefficient}
              unit="%"
            />
            <ConfigField
              label="Fall Coefficient" 
              configKey="fallCoefficient"
              description="Percentage of absolute ownership needed for price fall"
              defaultValue={defaultConfig.fallCoefficient}
              currentValue={currentConfig?.fallCoefficient || defaultConfig.fallCoefficient}
              unit="%"
            />
          </CardContent>
        </Card>

        {/* Minimum Thresholds */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Minimum Transfer Thresholds</CardTitle>
            <CardDescription>
              Minimum transfers needed regardless of ownership level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConfigField
              label="Minimum Rise Threshold"
              configKey="minRiseThreshold"
              description="Minimum net transfers in required for any player"
              defaultValue={defaultConfig.minRiseThreshold}
              currentValue={currentConfig?.minRiseThreshold || defaultConfig.minRiseThreshold}
              unit=" transfers"
            />
            <ConfigField
              label="Minimum Fall Threshold"
              configKey="minFallThreshold" 
              description="Minimum net transfers out required for any player"
              defaultValue={defaultConfig.minFallThreshold}
              currentValue={currentConfig?.minFallThreshold || defaultConfig.minFallThreshold}
              unit=" transfers"
            />
          </CardContent>
        </Card>

        {/* Price Tier Multipliers */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Price Tier Multipliers
            </CardTitle>
            <CardDescription>
              Difficulty multipliers based on player price brackets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConfigField
              label="Budget Players (< £6.0m)"
              configKey="budgetPriceMultiplier"
              description="Multiplier for budget players (easier to change)"
              defaultValue={defaultConfig.budgetPriceMultiplier}
              currentValue={currentConfig?.budgetPriceMultiplier || defaultConfig.budgetPriceMultiplier}
              unit="x"
            />
            <ConfigField
              label="Mid-Price (£6.0m - £10.0m)"
              configKey="midPriceMultiplier"
              description="Multiplier for mid-price players (baseline)"
              defaultValue={defaultConfig.midPriceMultiplier}
              currentValue={currentConfig?.midPriceMultiplier || defaultConfig.midPriceMultiplier}
              unit="x"
            />
            <ConfigField
              label="Premium (£10.0m - £13.0m)"
              configKey="premiumPriceMultiplier"
              description="Multiplier for premium players (harder to change)"
              defaultValue={defaultConfig.premiumPriceMultiplier}
              currentValue={currentConfig?.premiumPriceMultiplier || defaultConfig.premiumPriceMultiplier}
              unit="x"
            />
            <ConfigField
              label="Super Premium (> £13.0m)"
              configKey="superPremiumPriceMultiplier"
              description="Multiplier for super premium players (hardest to change)"
              defaultValue={defaultConfig.superPremiumPriceMultiplier}
              currentValue={currentConfig?.superPremiumPriceMultiplier || defaultConfig.superPremiumPriceMultiplier}
              unit="x"
            />
          </CardContent>
        </Card>

        {/* Transfer Velocity System */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Transfer Velocity System
            </CardTitle>
            <CardDescription>
              Bonuses based on transfer rate (transfers per hour)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <ConfigField
                  label="High Velocity Threshold"
                  configKey="highVelocityThreshold"
                  description="Transfers/hour for high velocity bonus"
                  defaultValue={defaultConfig.highVelocityThreshold}
                  currentValue={currentConfig?.highVelocityThreshold || defaultConfig.highVelocityThreshold}
                  unit="/hr"
                />
                <ConfigField
                  label="Medium Velocity Threshold"
                  configKey="mediumVelocityThreshold"
                  description="Transfers/hour for medium velocity bonus"
                  defaultValue={defaultConfig.mediumVelocityThreshold}
                  currentValue={currentConfig?.mediumVelocityThreshold || defaultConfig.mediumVelocityThreshold}
                  unit="/hr"
                />
              </div>
              <div className="space-y-4">
                <ConfigField
                  label="High Velocity Bonus"
                  configKey="highVelocityBonus"
                  description="Multiplier for high velocity transfers"
                  defaultValue={defaultConfig.highVelocityBonus}
                  currentValue={currentConfig?.highVelocityBonus || defaultConfig.highVelocityBonus}
                  unit="x"
                />
                <ConfigField
                  label="Medium Velocity Bonus"
                  configKey="mediumVelocityBonus"
                  description="Multiplier for medium velocity transfers"
                  defaultValue={defaultConfig.mediumVelocityBonus}
                  currentValue={currentConfig?.mediumVelocityBonus || defaultConfig.mediumVelocityBonus}
                  unit="x"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}