import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Settings, RotateCcw, Save, AlertTriangle, Zap, Target, TrendingDown, DicesIcon, Calculator } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import ProtectedRoute from "@/components/protected-route";

interface UpsetConfig {
  // Enable/disable options
  enableControlledVariance: boolean;
  enableContextUpsets: boolean;
  enableSmartRounding: boolean;
  enableSeasonUpsetBudget: boolean;
  enablePoissonDistribution: boolean;
  
  // Option 2: Controlled Variance settings
  varianceMin: number;
  varianceMax: number;
  
  // Option 3: Context-based upsets settings
  giantKillingBoost: number;
  pressurePenalty: number;
  pressureChance: number;
  derbyVarianceBoost: number;
  derbyChance: number;
  topTeamIds: number[];
  
  // Option 4: Smart Rounding settings
  upsetRoundingChance: number;
  
  // Option 5: Season Upset Budget settings
  upsetBudgetChance: number;
  upsetBudgetMin: number;
  upsetBudgetMax: number;
  
  // Option 1: Poisson Distribution settings
  poissonChance: number;
}

// Default configuration values
const DEFAULT_CONFIG: UpsetConfig = {
  enableControlledVariance: true,
  enableContextUpsets: false,
  enableSmartRounding: true,
  enableSeasonUpsetBudget: false,
  enablePoissonDistribution: false,
  varianceMin: 0.8,
  varianceMax: 1.2,
  giantKillingBoost: 0.15,
  pressurePenalty: 0.1,
  pressureChance: 0.3,
  derbyVarianceBoost: 0.1,
  derbyChance: 0.25,
  topTeamIds: [1, 2, 3, 4, 5, 6],
  upsetRoundingChance: 0.15,
  upsetBudgetChance: 0.25,
  upsetBudgetMin: 0.7,
  upsetBudgetMax: 1.3,
  poissonChance: 0.8
};

// Helper component for displaying default, current, and input values
const ConfigField = ({ 
  label, 
  field, 
  type = "number", 
  step = "0.01", 
  min, 
  max, 
  description,
  config,
  formData,
  updateField,
  updateTopTeamIds
}: {
  label: string;
  field: keyof UpsetConfig;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
  description?: string;
  config?: UpsetConfig;
  formData?: UpsetConfig;
  updateField: (field: keyof UpsetConfig, value: any) => void;
  updateTopTeamIds: (value: string) => void;
}) => {
  const defaultValue = DEFAULT_CONFIG[field];
  const currentValue = config?.[field];
  const formValue = formData?.[field];
  
  return (
    <div className="space-y-2">
      <Label htmlFor={field as string}>{label}</Label>
      <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Default</div>
          <div className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
            {Array.isArray(defaultValue) ? defaultValue.join(", ") : String(defaultValue)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Current</div>
          <div className="font-mono text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
            {Array.isArray(currentValue) ? currentValue?.join(", ") : String(currentValue)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">New Value</div>
          {field === 'topTeamIds' ? (
            <Input
              id={field as string}
              type="text"
              value={Array.isArray(formValue) ? formValue.join(", ") : ""}
              onChange={(e) => updateTopTeamIds(e.target.value)}
              placeholder="1, 2, 3, 4, 5, 6"
              data-testid={`input-${field}`}
            />
          ) : (
            <Input
              id={field as string}
              type={type}
              step={step}
              min={min}
              max={max}
              value={formValue as string | number}
              onChange={(e) => {
                const value = type === "number" ? parseFloat(e.target.value) : e.target.value;
                updateField(field, value);
              }}
              data-testid={`input-${field}`}
            />
          )}
        </div>
      </div>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      )}
    </div>
  );
};

export default function AdminUpsetConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: config, isLoading } = useQuery<UpsetConfig>({
    queryKey: ["/api/admin/upset-config"],
    queryFn: async () => {
      const response = await fetch("/api/admin/upset-config");
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const [formData, setFormData] = useState<UpsetConfig | null>(null);

  useEffect(() => {
    if (config && !formData) {
      setFormData(config);
    }
  }, [config, formData]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: UpsetConfig) => {
      const response = await fetch("/api/admin/upset-config", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Failed to save config: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/upset-config"] });
      toast({
        title: "Success",
        description: "Upset configuration saved successfully",
      });
      setUnsavedChanges(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save configuration: ${error}`,
        variant: "destructive",
      });
    },
  });

  const resetConfigMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/upset-config/reset", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Failed to reset config: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/upset-config"] });
      setFormData(data.config);
      toast({
        title: "Reset Complete",
        description: "Configuration reset to default values",
      });
      setUnsavedChanges(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reset configuration: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (formData) {
      saveConfigMutation.mutate(formData);
    }
  };

  const handleGlobalReset = () => {
    resetConfigMutation.mutate();
  };

  const handleResetTab = () => {
    if (!formData) return;
    
    let resetFields: Partial<UpsetConfig> = {};
    
    switch (activeTab) {
      case "variance":
        resetFields = {
          enableControlledVariance: DEFAULT_CONFIG.enableControlledVariance,
          varianceMin: DEFAULT_CONFIG.varianceMin,
          varianceMax: DEFAULT_CONFIG.varianceMax
        };
        break;
      case "context":
        resetFields = {
          enableContextUpsets: DEFAULT_CONFIG.enableContextUpsets,
          giantKillingBoost: DEFAULT_CONFIG.giantKillingBoost,
          pressurePenalty: DEFAULT_CONFIG.pressurePenalty,
          pressureChance: DEFAULT_CONFIG.pressureChance,
          derbyVarianceBoost: DEFAULT_CONFIG.derbyVarianceBoost,
          derbyChance: DEFAULT_CONFIG.derbyChance,
          topTeamIds: DEFAULT_CONFIG.topTeamIds
        };
        break;
      case "rounding":
        resetFields = {
          enableSmartRounding: DEFAULT_CONFIG.enableSmartRounding,
          upsetRoundingChance: DEFAULT_CONFIG.upsetRoundingChance
        };
        break;
      case "budget":
        resetFields = {
          enableSeasonUpsetBudget: DEFAULT_CONFIG.enableSeasonUpsetBudget,
          upsetBudgetChance: DEFAULT_CONFIG.upsetBudgetChance,
          upsetBudgetMin: DEFAULT_CONFIG.upsetBudgetMin,
          upsetBudgetMax: DEFAULT_CONFIG.upsetBudgetMax
        };
        break;
      case "poisson":
        resetFields = {
          enablePoissonDistribution: DEFAULT_CONFIG.enablePoissonDistribution,
          poissonChance: DEFAULT_CONFIG.poissonChance
        };
        break;
      case "overview":
        resetFields = {
          enableControlledVariance: DEFAULT_CONFIG.enableControlledVariance,
          enableContextUpsets: DEFAULT_CONFIG.enableContextUpsets,
          enableSmartRounding: DEFAULT_CONFIG.enableSmartRounding,
          enableSeasonUpsetBudget: DEFAULT_CONFIG.enableSeasonUpsetBudget,
          enablePoissonDistribution: DEFAULT_CONFIG.enablePoissonDistribution
        };
        break;
    }
    
    setFormData(prev => prev ? { ...prev, ...resetFields } : null);
    setUnsavedChanges(true);
    toast({
      title: "Tab Reset",
      description: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tab reset to defaults`,
    });
  };

  const handleResetPage = () => {
    setFormData(DEFAULT_CONFIG);
    setUnsavedChanges(true);
    toast({
      title: "Page Reset",
      description: "All settings reset to defaults (not yet saved)",
    });
  };

  const updateField = (field: keyof UpsetConfig, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
    setUnsavedChanges(true);
  };

  const updateTopTeamIds = (value: string) => {
    try {
      const ids = value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      updateField('topTeamIds', ids);
    } catch (error) {
      // Invalid input, ignore
    }
  };


  if (isLoading || !formData) {
    return (
      <div className="w-full py-4 sm:py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="w-full py-4 sm:py-8 space-y-6" data-testid="admin-upset-config">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Predicted Scores Upset Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Control the 5 upset systems that make predicted scores more realistic
          </p>
        </div>
      </div>

      {unsavedChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Configuration" to apply them.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="poisson">Poisson</TabsTrigger>
          <TabsTrigger value="variance">Variance</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="rounding">Rounding</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Upset System Overview
              </CardTitle>
              <CardDescription>
                Enable or disable each of the 5 upset systems that create realistic match outcomes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Option 1: Poisson Distribution</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Mathematically realistic goal scoring</p>
                    </div>
                    <Switch
                      checked={formData.enablePoissonDistribution}
                      onCheckedChange={(value) => updateField('enablePoissonDistribution', value)}
                      data-testid="switch-poisson"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Option 2: Controlled Variance</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Random performance fluctuations (±20%)</p>
                    </div>
                    <Switch
                      checked={formData.enableControlledVariance}
                      onCheckedChange={(value) => updateField('enableControlledVariance', value)}
                      data-testid="switch-variance"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Option 3: Context Upsets</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Giant-killing, pressure, derby effects</p>
                    </div>
                    <Switch
                      checked={formData.enableContextUpsets}
                      onCheckedChange={(value) => updateField('enableContextUpsets', value)}
                      data-testid="switch-context"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Option 4: Smart Rounding</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Upset-biased floor rounding</p>
                    </div>
                    <Switch
                      checked={formData.enableSmartRounding}
                      onCheckedChange={(value) => updateField('enableSmartRounding', value)}
                      data-testid="switch-rounding"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Option 5: Season Upset Budget</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Major performance swings</p>
                    </div>
                    <Switch
                      checked={formData.enableSeasonUpsetBudget}
                      onCheckedChange={(value) => updateField('enableSeasonUpsetBudget', value)}
                      data-testid="switch-budget"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Current Status</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.enablePoissonDistribution && <Badge variant="secondary">Poisson Active</Badge>}
                  {formData.enableControlledVariance && <Badge variant="secondary">Variance Active</Badge>}
                  {formData.enableContextUpsets && <Badge variant="secondary">Context Active</Badge>}
                  {formData.enableSmartRounding && <Badge variant="secondary">Rounding Active</Badge>}
                  {formData.enableSeasonUpsetBudget && <Badge variant="secondary">Budget Active</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-600" />
                Option 2: Controlled Variance Settings
              </CardTitle>
              <CardDescription>
                Configure random performance fluctuations applied to all teams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg mb-6">
                <div>
                  <h3 className="font-semibold">Enable Controlled Variance</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Random performance fluctuations (±20%)</p>
                </div>
                <Switch
                  checked={formData.enableControlledVariance}
                  onCheckedChange={(value) => updateField('enableControlledVariance', value)}
                  data-testid="switch-variance"
                />
              </div>
              
              <div className="space-y-6">
                <ConfigField
                  label="Variance Minimum"
                  field="varianceMin"
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="1.0"
                  description="Minimum performance multiplier (0.8 = 20% reduction)"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />
                
                <ConfigField
                  label="Variance Maximum"
                  field="varianceMax"
                  type="number"
                  step="0.01"
                  min="1.0"
                  max="2.0"
                  description="Maximum performance multiplier (1.2 = 20% boost)"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">How Variance Works</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Each team's expected goals are multiplied by a random factor between {formData.varianceMin} and {formData.varianceMax}. 
                  This creates natural performance fluctuations - strong teams sometimes underperform, weak teams sometimes overperform.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Option 3: Context-Based Upsets
              </CardTitle>
              <CardDescription>
                Configure situational factors that affect match outcomes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg mb-6">
                <div>
                  <h3 className="font-semibold">Enable Context-Based Upsets</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Giant-killing, pressure, derby effects</p>
                </div>
                <Switch
                  checked={formData.enableContextUpsets}
                  onCheckedChange={(value) => updateField('enableContextUpsets', value)}
                  data-testid="switch-context"
                />
              </div>
              
              <div className="space-y-6">
                <ConfigField
                  label="Giant-Killing Boost"
                  field="giantKillingBoost"
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.5"
                  description="+15% boost for underdogs vs top teams"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />
                
                <ConfigField
                  label="Pressure Penalty"
                  field="pressurePenalty"
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.3"
                  description="-10% penalty for top teams in pressure situations"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />

                <ConfigField
                  label="Pressure Chance"
                  field="pressureChance"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  description="20% chance of pressure situations"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />

                <ConfigField
                  label="Derby Variance Boost"
                  field="derbyVarianceBoost"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  description="+30% extra variance for derby matches"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />

                <ConfigField
                  label="Derby Chance"
                  field="derbyChance"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  description="15% chance of derby effects"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />

                <ConfigField
                  label="Top Team IDs"
                  field="topTeamIds"
                  type="text"
                  description="Team IDs considered 'top teams' (1,2,3,4,5,6)"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rounding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-purple-600" />
                Option 4: Smart Rounding Settings
              </CardTitle>
              <CardDescription>
                Configure upset-biased rounding that favors lower scores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg mb-6">
                <div>
                  <h3 className="font-semibold">Enable Smart Rounding</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Upset-biased floor rounding</p>
                </div>
                <Switch
                  checked={formData.enableSmartRounding}
                  onCheckedChange={(value) => updateField('enableSmartRounding', value)}
                  data-testid="switch-rounding"
                />
              </div>
              
              <div className="space-y-6">
                <ConfigField
                  label="Upset Rounding Chance"
                  field="upsetRoundingChance"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  description="15% chance of floor rounding instead of normal rounding"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">How Smart Rounding Works</h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  When enabled, {Math.round(formData.upsetRoundingChance * 100)}% of matches use floor rounding instead of normal rounding. 
                  This means 2.7 expected goals becomes 2 goals instead of 3, creating more upsets.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Option 5: Season Upset Budget
              </CardTitle>
              <CardDescription>
                Configure major performance swings that balance out over the season
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg mb-6">
                <div>
                  <h3 className="font-semibold">Enable Season Upset Budget</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Major performance swings</p>
                </div>
                <Switch
                  checked={formData.enableSeasonUpsetBudget}
                  onCheckedChange={(value) => updateField('enableSeasonUpsetBudget', value)}
                  data-testid="switch-budget"
                />
              </div>
              
              <div className="space-y-6">
                <ConfigField
                  label="Upset Budget Chance"
                  field="upsetBudgetChance"
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.2"
                  description="5% chance of major swings"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />
                
                <ConfigField
                  label="Budget Minimum"
                  field="upsetBudgetMin"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="1.0"
                  description="50% performance minimum"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />

                <ConfigField
                  label="Budget Maximum"
                  field="upsetBudgetMax"
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="3.0"
                  description="150% performance maximum"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">How Upset Budget Works</h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {Math.round(formData.upsetBudgetChance * 100)}% of matches get a random multiplier between {formData.upsetBudgetMin} and {formData.upsetBudgetMax}. 
                  This creates occasional dramatic over/underperformances that simulate real football chaos.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="poisson" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DicesIcon className="h-5 w-5 text-indigo-600" />
                Option 1: Poisson Distribution
              </CardTitle>
              <CardDescription>
                Configure mathematically realistic goal scoring probabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg mb-6">
                <div>
                  <h3 className="font-semibold">Enable Poisson Distribution</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Mathematically realistic goal scoring</p>
                </div>
                <Switch
                  checked={formData.enablePoissonDistribution}
                  onCheckedChange={(value) => updateField('enablePoissonDistribution', value)}
                  data-testid="switch-poisson"
                />
              </div>
              
              <div className="space-y-6">
                <ConfigField
                  label="Poisson Usage Rate"
                  field="poissonChance"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  description="70% Poisson, 30% smart rounding"
                  config={config}
                  formData={formData}
                  updateField={updateField}
                  updateTopTeamIds={updateTopTeamIds}
                />
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <h3 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">How Poisson Distribution Works</h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  Poisson distribution is mathematically perfect for football - it uses expected goals as the mean probability. 
                  {Math.round(formData.poissonChance * 100)}% of matches use Poisson, {Math.round((1 - formData.poissonChance) * 100)}% use smart rounding.
                  Arsenal with 2.8 xG could score 0, 1, 2, 3, 4+ goals naturally based on probability.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Action Buttons at Bottom */}
      <div className="border-t pt-6 mt-8">
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            onClick={handleResetTab}
            variant="outline"
            disabled={activeTab === "overview"}
            data-testid="button-reset-tab"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Tab
          </Button>
          <Button
            onClick={handleResetPage}
            variant="outline"
            data-testid="button-reset-page"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Page
          </Button>
          <Button
            onClick={handleGlobalReset}
            variant="outline"
            disabled={resetConfigMutation.isPending}
            data-testid="button-global-reset"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Global Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!unsavedChanges || saveConfigMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-save-config"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}