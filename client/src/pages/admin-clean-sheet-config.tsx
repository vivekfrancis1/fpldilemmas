import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Settings, RotateCcw, Save, AlertTriangle, Shield, Calculator, TrendingDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ProtectedRoute from "@/components/protected-route";

interface CleanSheetSettings {
  cleanSheetExponent: number;
  cleanSheetMultiplier: number;
  lastUpdated?: string;
  updatedBy?: string;
}

const DEFAULT_VALUES = {
  cleanSheetExponent: 1.0,
  cleanSheetMultiplier: 100,
};

export default function AdminCleanSheetConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<CleanSheetSettings>({
    cleanSheetExponent: DEFAULT_VALUES.cleanSheetExponent,
    cleanSheetMultiplier: DEFAULT_VALUES.cleanSheetMultiplier,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current clean sheet settings
  const { data: settings, isLoading } = useQuery<CleanSheetSettings>({
    queryKey: ['/api/admin/goal-scored-settings'],
    select: (data: any) => ({
      cleanSheetExponent: data.cleanSheetExponent || DEFAULT_VALUES.cleanSheetExponent,
      cleanSheetMultiplier: data.cleanSheetMultiplier || DEFAULT_VALUES.cleanSheetMultiplier,
      lastUpdated: data.lastUpdated,
      updatedBy: data.updatedBy,
    }),
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<CleanSheetSettings>) => {
      const response = await fetch('/api/admin/goal-scored-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
      if (!response.ok) throw new Error('Failed to update clean sheet settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/goal-scored-settings'] });
      setHasChanges(false);
      toast({
        title: "Settings Updated",
        description: "Clean sheet configuration has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: `Failed to update settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
    }
  }, [settings]);

  const handleInputChange = (field: keyof CleanSheetSettings, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numericValue }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const resetToDefaults = () => {
    if (confirm('Reset all clean sheet settings to default values?')) {
      setFormData({
        cleanSheetExponent: DEFAULT_VALUES.cleanSheetExponent,
        cleanSheetMultiplier: DEFAULT_VALUES.cleanSheetMultiplier,
      });
      setHasChanges(true);
      toast({
        title: "Reset to Defaults",
        description: "All clean sheet settings have been reset to default values.",
      });
    }
  };

  // Calculate example clean sheet probabilities
  const calculateExample = (xGA: number) => {
    const current = Math.exp(-xGA * (settings?.cleanSheetExponent || DEFAULT_VALUES.cleanSheetExponent)) * (settings?.cleanSheetMultiplier || DEFAULT_VALUES.cleanSheetMultiplier) / 100;
    const proposed = Math.exp(-xGA * formData.cleanSheetExponent) * formData.cleanSheetMultiplier / 100;
    return {
      current: Math.round(current * 100),
      proposed: Math.round(proposed * 100),
      change: Math.round((proposed - current) * 100)
    };
  };

  const exampleTeams = [
    { name: "Arsenal (Elite)", xGA: 0.8 },
    { name: "Liverpool (Strong)", xGA: 1.0 },
    { name: "Brighton (Average)", xGA: 1.3 },
    { name: "Burnley (Weak)", xGA: 1.6 }
  ];

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto p-6">
          <div className="text-center">Loading clean sheet configuration...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <Shield className="fpl-page-header-icon" />
            <h1>Team Clean Sheet Configuration</h1>
          </div>
          <p className="fpl-page-subtitle">
            Configure clean sheet probability calculations using the exponential decay formula
          </p>
        </div>

        {/* Formula Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Clean Sheet Formula
            </CardTitle>
            <CardDescription>
              Mathematical formula used to calculate clean sheet probabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border font-mono text-center">
              <div className="text-lg font-semibold mb-2">Clean Sheet % = e^(-xGA × Exponent) × Multiplier</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Where xGA = Expected Goals Against</div>
                <div>e = Euler's number (≈2.718)</div>
                <div>Higher Exponent = More conservative probabilities</div>
                <div>Lower Multiplier = Reduces all probabilities</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parameter Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Parameter Configuration
            </CardTitle>
            <CardDescription>
              Adjust the clean sheet calculation parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium border border-gray-200 dark:border-gray-700">Parameter</th>
                    <th className="text-center p-3 font-medium border border-gray-200 dark:border-gray-700">Default</th>
                    <th className="text-center p-3 font-medium border border-gray-200 dark:border-gray-700">Current</th>
                    <th className="text-center p-3 font-medium border border-gray-200 dark:border-gray-700">New Value</th>
                    <th className="text-center p-3 font-medium border border-gray-200 dark:border-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      key: 'cleanSheetExponent',
                      name: 'Clean Sheet Exponent',
                      default: DEFAULT_VALUES.cleanSheetExponent,
                      description: 'Controls sensitivity to xGA - higher values make clean sheets more conservative',
                      min: 0.5,
                      max: 2.5,
                      step: 0.1
                    },
                    {
                      key: 'cleanSheetMultiplier', 
                      name: 'Clean Sheet Multiplier',
                      default: DEFAULT_VALUES.cleanSheetMultiplier,
                      description: 'Overall probability scaling factor - lower values reduce all clean sheet chances',
                      min: 50,
                      max: 150,
                      step: 5
                    }
                  ].map((param) => {
                    const currentValue = settings?.[param.key as keyof CleanSheetSettings] || param.default;
                    const newValue = formData[param.key as keyof CleanSheetSettings];
                    const isChanged = Math.abs(newValue - param.default) > 0.01;
                    const isModified = Math.abs(newValue - currentValue) > 0.01;
                    
                    return (
                      <tr key={param.key} className="border-b hover:bg-muted/25">
                        <td className="p-3 border border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="font-medium">{param.name}</p>
                            <p className="text-sm text-muted-foreground">{param.description}</p>
                          </div>
                        </td>
                        <td className="text-center p-3 border border-gray-200 dark:border-gray-700">
                          <span className="font-mono text-sm">
                            {param.default.toFixed(param.key === 'cleanSheetExponent' ? 1 : 0)}
                          </span>
                        </td>
                        <td className="text-center p-3 border border-gray-200 dark:border-gray-700">
                          <span className={`font-mono font-medium ${isChanged ? 'text-blue-600' : ''}`}>
                            {currentValue.toFixed(param.key === 'cleanSheetExponent' ? 1 : 0)}
                          </span>
                          {isChanged && (
                            <div className="text-xs text-blue-600 mt-1">Modified</div>
                          )}
                        </td>
                        <td className="text-center p-3 border border-gray-200 dark:border-gray-700">
                          <Input
                            type="number"
                            step={param.step}
                            min={param.min}
                            max={param.max}
                            value={newValue.toFixed(param.key === 'cleanSheetExponent' ? 1 : 0)}
                            onChange={(e) => handleInputChange(param.key as keyof CleanSheetSettings, e.target.value)}
                            className={`w-24 text-center font-mono ${isModified ? 'border-orange-300 bg-orange-50' : ''}`}
                            data-testid={`input-${param.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                          />
                          {isModified && (
                            <div className="text-xs text-orange-600 mt-1">Pending</div>
                          )}
                        </td>
                        <td className="text-center p-3 border border-gray-200 dark:border-gray-700">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleInputChange(param.key as keyof CleanSheetSettings, param.default.toString());
                              toast({
                                title: "Reset to Default",
                                description: `${param.name} reset to ${param.default}`,
                              });
                            }}
                            data-testid={`button-reset-${param.key.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                            title="Reset to default"
                          >
                            ↺
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Impact Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Impact Preview
            </CardTitle>
            <CardDescription>
              See how your changes will affect clean sheet probabilities for different team strengths
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {exampleTeams.map((team) => {
                const example = calculateExample(team.xGA);
                return (
                  <div key={team.name} className="p-4 border rounded-lg">
                    <h4 className="font-medium text-sm mb-2">{team.name}</h4>
                    <div className="text-xs text-muted-foreground mb-2">xGA: {team.xGA}</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Current:</span>
                        <span className="font-mono">{example.current}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Proposed:</span>
                        <span className="font-mono">{example.proposed}%</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Change:</span>
                        <span className={`font-mono ${example.change < 0 ? 'text-red-600' : example.change > 0 ? 'text-green-600' : ''}`}>
                          {example.change > 0 ? '+' : ''}{example.change}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Recommendations for Conservative Clean Sheets:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>Increase <strong>Clean Sheet Exponent</strong> from 1.0 to 1.2-1.3 for 20-30% reduction</li>
              <li>Decrease <strong>Clean Sheet Multiplier</strong> from 100 to 85-90 for overall 10-15% reduction</li>
              <li>Both changes will significantly reduce goalkeeper projected points</li>
              <li>Arsenal's CS% will drop from ~45% to ~25-30% with conservative settings</li>
            </ul>
          </AlertDescription>
        </Alert>

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
                onClick={resetToDefaults}
                className="flex items-center gap-2"
                data-testid="button-reset-all"
              >
                <RotateCcw className="h-4 w-4" />
                Reset All to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}