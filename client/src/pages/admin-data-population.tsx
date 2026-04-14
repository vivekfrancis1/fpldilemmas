import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import ProtectedRoute from "@/components/protected-route";

export default function AdminDataPopulation() {
  const [populationStatus, setPopulationStatus] = useState<Record<string, 'pending' | 'running' | 'completed' | 'error'>>({});
  const [populationResults, setPopulationResults] = useState<Record<string, any>>({});
  const [isPopulatingAll, setIsPopulatingAll] = useState(false);

  const seasons = [
    '2024/25', '2023/24', '2022/23', '2021/22', '2020/21',
    '2019/20', '2018/19', '2017/18', '2016/17'
  ];

  const populateSeason = async (season: string) => {
    setPopulationStatus(prev => ({ ...prev, [season]: 'running' }));
    
    try {
      const response = await fetch('/api/historical-player-stats/populate-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ season })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPopulationStatus(prev => ({ ...prev, [season]: 'completed' }));
        setPopulationResults(prev => ({ ...prev, [season]: result }));
      } else {
        setPopulationStatus(prev => ({ ...prev, [season]: 'error' }));
      }
    } catch (error) {
      setPopulationStatus(prev => ({ ...prev, [season]: 'error' }));
      console.error(`Error populating ${season}:`, error);
    }
  };

  const populateAllSeasons = async () => {
    setIsPopulatingAll(true);
    
    for (const season of seasons) {
      await populateSeason(season);
      // Add delay between seasons to respect API limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsPopulatingAll(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const completedSeasons = Object.values(populationStatus).filter(status => status === 'completed').length;
  const progress = (completedSeasons / seasons.length) * 100;

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="w-full p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Historical Data Population</h1>
        <p className="text-muted-foreground mt-2">
          Populate production database with comprehensive historical player statistics across all FPL seasons.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Population Progress</CardTitle>
          <CardDescription>
            {completedSeasons} of {seasons.length} seasons completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="mb-4" />
          <div className="flex gap-2">
            <Button 
              onClick={populateAllSeasons} 
              disabled={isPopulatingAll}
              data-testid="button-populate-all"
            >
              {isPopulatingAll ? 'Populating...' : 'Populate All Seasons'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {seasons.map((season) => {
          const status = populationStatus[season] || 'pending';
          const result = populationResults[season];
          
          return (
            <Card key={season}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Season {season}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    <Badge variant={
                      status === 'completed' ? 'default' :
                      status === 'running' ? 'secondary' :
                      status === 'error' ? 'destructive' : 'outline'
                    }>
                      {status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <Button 
                    size="sm" 
                    onClick={() => populateSeason(season)}
                    disabled={status === 'running' || isPopulatingAll}
                    data-testid={`button-populate-${season.replace('/', '-')}`}
                  >
                    {status === 'running' ? 'Running...' : 'Populate Season'}
                  </Button>
                </div>
                
                {result && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Players Processed: {result.playersProcessed}</p>
                    <p>Records Inserted: {result.recordsInserted}</p>
                    <p>API Requests: {result.apiRequestCount}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
    </ProtectedRoute>
  );
}