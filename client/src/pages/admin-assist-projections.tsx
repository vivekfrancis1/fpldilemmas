import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Users, TrendingUp, DollarSign, Target, Zap, Plus, Edit, Trash2, Save } from 'lucide-react';

interface EliteBoost {
  id: number;
  playerName: string;
  boostMultiplier: string;
  position: string;
  isActive: boolean;
  notes?: string;
}

interface HistoricalTier {
  id: number;
  tierName: string;
  minAverageAssists: string;
  multiplier: string;
  minSeasonsRequired: number;
  minTotalAssists: number;
  isActive: boolean;
}

interface CreativityTier {
  id: number;
  tierName: string;
  maxRank: number;
  multiplier: string;
  isActive: boolean;
}

interface PriceTier {
  id: number;
  tierName: string;
  minCost: number;
  multiplier: string;
  isActive: boolean;
}

interface PositionRate {
  id: number;
  positionName: string;
  baseRate: string;
  varianceRate: string;
  shareCapPercentage: string;
  isActive: boolean;
}

interface GeneralConfig {
  id: number;
  configKey: string;
  configValue: string;
  description?: string;
  category: string;
  isActive: boolean;
}

interface AssistConfig {
  eliteBoosts: EliteBoost[];
  historicalTiers: HistoricalTier[];
  creativityTiers: CreativityTier[];
  priceTiers: PriceTier[];
  positionRates: PositionRate[];
  generalConfig: GeneralConfig[];
}

export default function AdminAssistProjections() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AssistConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<string>('');
  const [newEliteBoost, setNewEliteBoost] = useState({ playerName: '', boostMultiplier: '', position: 'Midfielder', notes: '' });
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await apiRequest('/api/admin/assist-config');
      setConfig(data);
    } catch (error) {
      console.error('Error loading assist configuration:', error);
      toast({
        title: "Error",
        description: "Failed to load assist configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveItem = async (type: string, id: number, data: any) => {
    try {
      await apiRequest(`/api/admin/assist-config/${type}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      
      toast({
        title: "Success",
        description: "Configuration updated successfully"
      });
      
      await loadConfig();
      setEditingItem(null);
      setEditingType('');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    }
  };

  const addEliteBoost = async () => {
    try {
      await apiRequest('/api/admin/assist-config/elite-boost', {
        method: 'POST',
        body: JSON.stringify(newEliteBoost)
      });
      
      toast({
        title: "Success",
        description: "Elite boost added successfully"
      });
      
      await loadConfig();
      setNewEliteBoost({ playerName: '', boostMultiplier: '', position: 'Midfielder', notes: '' });
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error adding elite boost:', error);
      toast({
        title: "Error",
        description: "Failed to add elite boost",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading assist configuration...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-500">Failed to load assist configuration</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Player Assists Configuration</h1>
            <p className="text-gray-600">Configure all parameters for Player Assists projections</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="elite-boosts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="elite-boosts">Elite Boosts</TabsTrigger>
          <TabsTrigger value="historical-tiers">Historical</TabsTrigger>
          <TabsTrigger value="creativity-tiers">Creativity</TabsTrigger>
          <TabsTrigger value="price-tiers">Price Tiers</TabsTrigger>
          <TabsTrigger value="position-rates">Positions</TabsTrigger>
          <TabsTrigger value="general-config">General</TabsTrigger>
        </TabsList>

        <TabsContent value="elite-boosts">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <CardTitle>Elite Player Boosts</CardTitle>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Player
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Elite Player Boost</DialogTitle>
                      <DialogDescription>
                        Add a new player with custom assist boost multiplier
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="playerName">Player Name</Label>
                        <Input
                          id="playerName"
                          value={newEliteBoost.playerName}
                          onChange={(e) => setNewEliteBoost({...newEliteBoost, playerName: e.target.value})}
                          placeholder="e.g. Kevin De Bruyne"
                        />
                      </div>
                      <div>
                        <Label htmlFor="boostMultiplier">Boost Multiplier</Label>
                        <Input
                          id="boostMultiplier"
                          type="number"
                          step="0.01"
                          value={newEliteBoost.boostMultiplier}
                          onChange={(e) => setNewEliteBoost({...newEliteBoost, boostMultiplier: e.target.value})}
                          placeholder="e.g. 1.35"
                        />
                      </div>
                      <div>
                        <Label htmlFor="position">Position</Label>
                        <Select value={newEliteBoost.position} onValueChange={(value) => setNewEliteBoost({...newEliteBoost, position: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                            <SelectItem value="Defender">Defender</SelectItem>
                            <SelectItem value="Midfielder">Midfielder</SelectItem>
                            <SelectItem value="Forward">Forward</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={newEliteBoost.notes}
                          onChange={(e) => setNewEliteBoost({...newEliteBoost, notes: e.target.value})}
                          placeholder="Optional notes about this player"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setShowAddDialog(false)} variant="outline">
                        Cancel
                      </Button>
                      <Button onClick={addEliteBoost} disabled={!newEliteBoost.playerName || !newEliteBoost.boostMultiplier}>
                        Add Player
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Multiplier</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.eliteBoosts.map((boost) => (
                      <TableRow key={boost.id}>
                        <TableCell className="font-medium">{boost.playerName}</TableCell>
                        <TableCell>{boost.position}</TableCell>
                        <TableCell>
                          {editingItem?.id === boost.id && editingType === 'elite-boost' ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editingItem.boostMultiplier}
                              onChange={(e) => setEditingItem({...editingItem, boostMultiplier: e.target.value})}
                              className="w-20"
                            />
                          ) : (
                            `${boost.boostMultiplier}x`
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{boost.notes}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {editingItem?.id === boost.id && editingType === 'elite-boost' ? (
                              <Button
                                size="sm"
                                onClick={() => saveItem('elite-boost', boost.id, editingItem)}
                                className="flex items-center gap-1"
                              >
                                <Save className="h-3 w-3" />
                                Save
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingItem(boost);
                                  setEditingType('elite-boost');
                                }}
                                className="flex items-center gap-1"
                              >
                                <Edit className="h-3 w-3" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}