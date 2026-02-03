import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Calendar, Filter, Search, ChevronDown, ChevronUp, Target, Info, Zap, Shield, Swords, Timer, Users, RefreshCw, UserPlus, Heart, AlertTriangle, XCircle, Clock, CheckCircle, X, History } from "lucide-react";
import { computeCurrentGameweek, getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { BootstrapData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LoadingExperience } from "@/components/loading-experience";
import { applyAvailabilityAdjustments } from "@/lib/availability-adjustments";
import { useAuth } from "@/hooks/useAuth";

// Player Availability Badge Component - only shows for players with < 100% availability
function PlayerAvailabilityBadge({ player }: { player: PlayerTotalPointsData }) {
  const chanceOfPlaying = player.chanceOfPlayingNextRound ?? 100;
  const status = player.status || 'a';
  const news = player.news || '';


  // Only show badge if availability is not 100%
  if (chanceOfPlaying >= 100 && status === 'a') {
    return null;
  }

  // Determine status display based on chance of playing and status
  let statusColor = 'text-yellow-600';
  let statusBg = 'bg-yellow-50';
  let statusIcon = Clock;
  let statusText = 'Doubtful';
  let statusBorder = 'border-yellow-200';

  if (status === 's' || status === 'suspended') {
    statusColor = 'text-red-600';
    statusBg = 'bg-red-50';
    statusIcon = XCircle;
    statusText = 'Suspended';
    statusBorder = 'border-red-200';
  } else if (status === 'i' || status === 'injured') {
    statusColor = 'text-red-600';
    statusBg = 'bg-red-50';
    statusIcon = Heart;
    statusText = 'Injured';
    statusBorder = 'border-red-200';
  } else if (status === 'd' || status === 'doubtful') {
    statusColor = 'text-yellow-600';
    statusBg = 'bg-yellow-50';
    statusIcon = AlertTriangle;
    statusText = 'Doubtful';
    statusBorder = 'border-yellow-200';
  } else if (status === 'u' || status === 'unavailable') {
    statusColor = 'text-gray-600';
    statusBg = 'bg-gray-50';
    statusIcon = XCircle;
    statusText = 'Unavailable';
    statusBorder = 'border-gray-200';
  }

  const StatusIcon = statusIcon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors hover:opacity-80 ${statusBg} ${statusBorder} border shadow-sm`}>
          <StatusIcon className={`h-3 w-3 ${statusColor}`} />
          <span className={statusColor}>
            {chanceOfPlaying}%
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
            <span className="font-semibold text-gray-900">{statusText}</span>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Chance of playing:</span> {chanceOfPlaying}%
          </div>
          {news && (
            <div className="text-sm text-gray-700 border-t pt-2">
              <span className="font-medium">News:</span> {news}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, type TableColumn } from "@/components/enhanced-table";
import PlayerProjectionsComparisonModal from "@/components/player-projections-comparison-modal";

// Gameweek Point Breakdown Tooltip Component
function GameweekPointBreakdownTooltip({ player, gameweek, excludedComponents = new Set() }: { player: PlayerTotalPointsData, gameweek: number, excludedComponents?: Set<string> }) {
  const hasBreakdownData = player.pointsFromGoals !== undefined;
  const gwKey = gameweek.toString(); // Use numeric string key format to match API data
  const gwPoints = player.gameweekProjections?.[gwKey];
  
  // Check for availability adjustments
  const hasAdjustment = player.availabilityAdjustments?.[gwKey];
  const originalPoints = player.originalGameweekProjections?.[gwKey];
  
  if (!hasBreakdownData || !gwPoints) {
    return (
      <div className="relative">
        {hasAdjustment && (
          <span className="absolute -top-1 -right-1 text-xs bg-orange-500 text-white rounded-full w-3 h-3 flex items-center justify-center" title="Availability adjusted">
            !
          </span>
        )}
        <ValueCell 
          value={gwPoints || 0} 
          format="points" 
          decimals={2} 
          colorScheme="points"
          fontWeight="medium"
        />
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 relative">
          {hasAdjustment && (
            <span className="absolute -top-1 -right-1 text-xs bg-orange-500 text-white rounded-full w-3 h-3 flex items-center justify-center" title="Availability adjusted">
              !
            </span>
          )}
          <ValueCell 
            value={gwPoints} 
            format="points" 
            decimals={2} 
            colorScheme="points"
            fontWeight="medium"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-sm p-4 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="font-semibold text-gray-900 border-b pb-2 mb-3">
            GW{gameweek} Points Breakdown
          </div>
          
          {/* Show availability adjustment notice if exists */}
          {hasAdjustment && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-600 font-semibold">⚠️ Availability Adjusted</span>
              </div>
              <div className="text-sm space-y-1">
                <div className="text-gray-700">{hasAdjustment.reason}</div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Original projection:</span>
                  <ValueCell 
                    value={hasAdjustment.original} 
                    format="points" 
                    decimals={2} 
                    className="text-gray-700 line-through"
                    fontWeight="medium"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Adjusted projection:</span>
                  <ValueCell 
                    value={hasAdjustment.adjusted} 
                    format="points" 
                    decimals={2} 
                    className="text-orange-700"
                    fontWeight="semibold"
                  />
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(() => {
              const originalCompProjs = (player as any).originalComponentProjections as { [comp: string]: { [gw: string]: number } } | undefined;
              // Map per-gameweek keys to exclusion keys (matching the total points tooltip)
              const componentDefs = [
                { key: 'pointsFromGoals', excludeKey: 'goals', label: '⚽ Goals', color: 'text-green-700' },
                { key: 'pointsFromAssists', excludeKey: 'assists', label: '🎯 Assists', color: 'text-blue-700' },
                { key: 'pointsFromCleanSheets', excludeKey: 'cleanSheets', label: '🛡️ Clean Sheets', color: 'text-yellow-700' },
                { key: 'pointsFromDefensiveContributions', excludeKey: 'defensiveContributions', label: '⚔️ Defensive Contributions', color: 'text-orange-700' },
                { key: 'pointsFromMinutes', excludeKey: 'minutes', label: '⏱️ Minutes', color: 'text-purple-700' },
                { key: 'pointsFromBonus', excludeKey: 'bonus', label: '✨ Bonus', color: 'text-pink-700' },
                { key: 'pointsFromSaves', excludeKey: 'saves', label: '🥅 Saves', color: 'text-cyan-700' },
                { key: 'pointsFromGoalsConceded', excludeKey: 'goalsConceded', label: '🚪 Goals Conceded', color: 'text-red-600' },
                { key: 'pointsFromYellowCards', excludeKey: 'yellowCards', label: '🟨 Yellow Cards', color: 'text-amber-600' },
                { key: 'pointsFromRedCards', excludeKey: 'redCards', label: '🟥 Red Cards', color: 'text-red-700' },
              ];
              
              return componentDefs.map(comp => {
                const currentValue = (player as any)[comp.key]?.[gwKey] || 0;
                const originalValue = originalCompProjs?.[comp.key]?.[gwKey] ?? currentValue;
                const hasCompAdjustment = hasAdjustment && Math.abs(currentValue - originalValue) > 0.001;
                const isExcluded = excludedComponents.has(comp.excludeKey);
                
                return (
                  <div key={comp.key} className={`flex justify-between items-center ${isExcluded ? 'opacity-40' : ''}`}>
                    <span className={`text-gray-600 ${isExcluded ? 'line-through' : ''}`}>{comp.label}:</span>
                    <div className="flex items-center gap-1.5">
                      {isExcluded ? (
                        <>
                          <span className="text-gray-400 font-medium">0.00</span>
                          <span className="text-xs text-red-500">✕</span>
                        </>
                      ) : hasCompAdjustment ? (
                        <>
                          <span className="text-gray-400 text-xs line-through">
                            {originalValue.toFixed(2)}
                          </span>
                          <span className={`${comp.color} font-medium`}>
                            {currentValue.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <ValueCell 
                          value={currentValue} 
                          format="points" 
                          decimals={2} 
                          className={comp.color}
                          fontWeight="medium"
                        />
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span className="text-gray-800">GW{gameweek} Points Total:</span>
              <ValueCell 
                value={gwPoints} 
                format="points" 
                decimals={2} 
                className="text-green-800"
                fontWeight="semibold"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Past Gameweek Breakdown Tooltip Component - for historical data
function PastGameweekBreakdownTooltip({ player, gameweek }: { player: PlayerTotalPointsData, gameweek: number }) {
  const gwKey = gameweek.toString();
  const gwStats = (player as any).gameweekStats?.[gwKey];
  const gwPoints = player.gameweekProjections?.[gwKey] || 0;
  const elementType = (player as any).elementType || 3; // Default to MID if unknown
  
  if (!gwStats) {
    return <span className="font-semibold text-gray-800">{Math.round(gwPoints)}</span>;
  }

  // Calculate FPL points breakdown based on element type
  // 1=GKP, 2=DEF, 3=MID, 4=FWD
  const getGoalPoints = (type: number) => type === 1 || type === 2 ? 6 : type === 3 ? 5 : 4;
  const getCleanSheetPoints = (type: number) => type === 1 || type === 2 ? 4 : type === 3 ? 1 : 0;
  const getGoalsConcededPenalty = (type: number, conceded: number) => {
    if (type === 1 || type === 2) return Math.floor(conceded / 2) * -1;
    return 0;
  };
  
  const breakdown = {
    minutes: gwStats.minutes >= 60 ? 2 : gwStats.minutes > 0 ? 1 : 0,
    goals: gwStats.goals * getGoalPoints(elementType),
    assists: gwStats.assists * 3,
    cleanSheets: gwStats.cleanSheets * getCleanSheetPoints(elementType),
    goalsConceded: getGoalsConcededPenalty(elementType, gwStats.goalsConceded),
    ownGoals: gwStats.ownGoals * -2,
    penaltiesSaved: gwStats.penaltiesSaved * 5,
    penaltiesMissed: gwStats.penaltiesMissed * -2,
    yellowCards: gwStats.yellowCards * -1,
    redCards: gwStats.redCards * -3,
    saves: elementType === 1 ? Math.floor(gwStats.saves / 3) : 0,
    bonus: gwStats.bonus
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
          <span className="font-semibold text-gray-800">{Math.round(gwPoints)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-sm p-4 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="font-semibold text-gray-900 border-b pb-2 mb-3">
            GW{gameweek} Actual Points Breakdown
          </div>
          
          <div className="space-y-1.5 text-sm">
            {gwStats.minutes > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">⏱️ Minutes ({gwStats.minutes}):</span>
                <span className="font-medium text-purple-700">{breakdown.minutes}</span>
              </div>
            )}
            {gwStats.goals > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">⚽ Goals ({gwStats.goals}):</span>
                <span className="font-medium text-green-700">{breakdown.goals}</span>
              </div>
            )}
            {gwStats.assists > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">🎯 Assists ({gwStats.assists}):</span>
                <span className="font-medium text-blue-700">{breakdown.assists}</span>
              </div>
            )}
            {gwStats.cleanSheets > 0 && getCleanSheetPoints(elementType) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">🛡️ Clean Sheet:</span>
                <span className="font-medium text-yellow-700">{breakdown.cleanSheets}</span>
              </div>
            )}
            {breakdown.goalsConceded < 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">🚪 Goals Conceded ({gwStats.goalsConceded}):</span>
                <span className="font-medium text-red-600">{breakdown.goalsConceded}</span>
              </div>
            )}
            {gwStats.saves > 0 && elementType === 1 && (
              <div className="flex justify-between">
                <span className="text-gray-600">🥅 Saves ({gwStats.saves}):</span>
                <span className="font-medium text-cyan-700">{breakdown.saves}</span>
              </div>
            )}
            {gwStats.penaltiesSaved > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">🧤 Penalties Saved ({gwStats.penaltiesSaved}):</span>
                <span className="font-medium text-green-700">{breakdown.penaltiesSaved}</span>
              </div>
            )}
            {gwStats.penaltiesMissed > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">❌ Penalties Missed ({gwStats.penaltiesMissed}):</span>
                <span className="font-medium text-red-600">{breakdown.penaltiesMissed}</span>
              </div>
            )}
            {gwStats.ownGoals > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">🙈 Own Goals ({gwStats.ownGoals}):</span>
                <span className="font-medium text-red-600">{breakdown.ownGoals}</span>
              </div>
            )}
            {gwStats.yellowCards > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">🟨 Yellow Cards ({gwStats.yellowCards}):</span>
                <span className="font-medium text-yellow-600">{breakdown.yellowCards}</span>
              </div>
            )}
            {gwStats.redCards > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">🟥 Red Cards ({gwStats.redCards}):</span>
                <span className="font-medium text-red-700">{breakdown.redCards}</span>
              </div>
            )}
            {gwStats.bonus > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">✨ Bonus:</span>
                <span className="font-medium text-pink-700">{breakdown.bonus}</span>
              </div>
            )}
          </div>
          
          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span className="text-gray-800">GW{gameweek} Total:</span>
              <span className="text-green-800">{Math.round(gwPoints)}</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Range Total Point Breakdown Tooltip Component
interface RangeTotalBreakdownTooltipProps {
  player: PlayerTotalPointsData;
  gameweekCount: number;
  excludedComponents?: Set<string>;
  applyAvailability?: boolean;
  originalPlayer?: PlayerTotalPointsData;
}

function RangeTotalBreakdownTooltip({ 
  player, 
  gameweekCount, 
  excludedComponents = new Set(), 
  applyAvailability = true,
  originalPlayer
}: RangeTotalBreakdownTooltipProps) {
  const hasBreakdownData = player.totalPointsFromGoals !== undefined;
  
  if (!hasBreakdownData) {
    return (
      <ValueCell 
        value={player.totalExpectedPoints || 0} 
        format="points" 
        decimals={2} 
        className="text-green-800"
        fontWeight="bold"
      />
    );
  }

  // Component definitions for tooltip display
  const componentDefs = [
    { key: 'goals', label: '⚽ Goals', totalKey: 'totalPointsFromGoals', color: 'text-green-700' },
    { key: 'assists', label: '🎯 Assists', totalKey: 'totalPointsFromAssists', color: 'text-blue-700' },
    { key: 'cleanSheets', label: '🛡️ Clean Sheets', totalKey: 'totalPointsFromCleanSheets', color: 'text-yellow-700' },
    { key: 'defensive', label: '⚔️ Defensive Contributions', totalKey: 'totalPointsFromDefensiveContributions', color: 'text-orange-700' },
    { key: 'minutes', label: '⏱️ Minutes', totalKey: 'totalPointsFromMinutes', color: 'text-purple-700' },
    { key: 'bonus', label: '✨ Bonus', totalKey: 'totalPointsFromBonus', color: 'text-pink-700' },
    { key: 'saves', label: '🥅 Saves', totalKey: 'totalPointsFromSaves', color: 'text-cyan-700' },
    { key: 'goalsConceded', label: '🚪 Goals Conceded', totalKey: 'totalPointsFromGoalsConceded', color: 'text-red-600' },
    { key: 'yellowCards', label: '🟨 Yellow Cards', totalKey: 'totalPointsFromYellowCards', color: 'text-yellow-600' },
    { key: 'redCards', label: '🟥 Red Cards', totalKey: 'totalPointsFromRedCards', color: 'text-red-700' },
  ];

  // Calculate if there are any availability adjustments
  const hasAvailabilityAdjustments = originalPlayer && applyAvailability && 
    (player as any).availabilityAdjustments && 
    Object.keys((player as any).availabilityAdjustments).length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
          <ValueCell 
            value={player.totalExpectedPoints || 0} 
            format="points" 
            decimals={2} 
            className="text-green-800"
            fontWeight="bold"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-md p-4 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="font-semibold text-gray-900 border-b pb-2 mb-3">
            {player.name} - {gameweekCount}GW Total Breakdown
          </div>
          
          {/* Filter status indicators */}
          <div className="flex flex-wrap gap-1 text-xs mb-2">
            <span className={`px-1.5 py-0.5 rounded ${applyAvailability ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
              Avail. Adj: {applyAvailability ? 'ON' : 'OFF'}
            </span>
            {excludedComponents.size > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                {excludedComponents.size} excluded
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-sm">
            {componentDefs.map(comp => {
              const isExcluded = excludedComponents.has(comp.key);
              const currentValue = (player as any)[comp.totalKey] || 0;
              
              // Use originalComponentTotals from availability adjustments if available
              const originalComponentTotals = (player as any).originalComponentTotals as { [key: string]: number } | undefined;
              const originalValue = originalComponentTotals?.[comp.totalKey] ?? 
                (originalPlayer ? (originalPlayer as any)[comp.totalKey] || 0 : currentValue);
              const hasAdjustment = applyAvailability && originalComponentTotals && Math.abs(currentValue - originalValue) > 0.001;
              
              return (
                <div 
                  key={comp.key} 
                  className={`flex justify-between items-center ${isExcluded ? 'opacity-40' : ''}`}
                >
                  <span className={`text-gray-600 ${isExcluded ? 'line-through' : ''}`}>
                    {comp.label}:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {hasAdjustment && !isExcluded ? (
                      <>
                        <span className="text-gray-400 text-xs line-through">
                          {originalValue.toFixed(2)}
                        </span>
                        <span className="text-purple-600 font-medium">
                          {currentValue.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <ValueCell 
                        value={isExcluded ? 0 : currentValue} 
                        format="points" 
                        decimals={2} 
                        className={isExcluded ? 'text-gray-400' : comp.color}
                        fontWeight="medium"
                      />
                    )}
                    {isExcluded && (
                      <span className="text-xs text-red-500">✕</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span className="text-gray-800">{gameweekCount}GW Total:</span>
              <ValueCell 
                value={player.totalExpectedPoints || 0} 
                format="points" 
                decimals={2} 
                className="text-green-800"
                fontWeight="semibold"
              />
            </div>
            {hasAvailabilityAdjustments && originalPlayer && (
              <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                <span>Before availability adj:</span>
                <span>{(originalPlayer.totalExpectedPoints || 0).toFixed(1)} pts</span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface PlayerTotalPointsData {
  [key: string]: any; // Add index signature for dynamic property access
  playerId: number;
  name: string;
  fullName: string;
  team: string;
  position: string;
  price: number;
  ownership: number;
  gameweekProjections: { [key: string]: number };
  totalExpectedPoints: number;
  seasonTotalPoints: number;
  averagePerGameweek: number;
  averageValue: number;
  avgMinutesPerGameweek: number;
  // Availability status fields
  chanceOfPlayingNextRound?: number;
  status?: string;
  news?: string;
  // Detailed point breakdowns
  pointsFromGoals?: { [key: string]: number };
  pointsFromAssists?: { [key: string]: number };
  pointsFromCleanSheets?: { [key: string]: number };
  pointsFromDefensiveContributions?: { [key: string]: number };
  pointsFromMinutes?: { [key: string]: number };
  pointsFromBonus?: { [key: string]: number };
  pointsFromSaves?: { [key: string]: number };
  pointsFromGoalsConceded?: { [key: string]: number };
  pointsFromYellowCards?: { [key: string]: number };
  pointsFromRedCards?: { [key: string]: number };
  totalPointsFromGoals?: number;
  totalPointsFromAssists?: number;
  totalPointsFromCleanSheets?: number;
  totalPointsFromDefensiveContributions?: number;
  totalPointsFromMinutes?: number;
  totalPointsFromBonus?: number;
  totalPointsFromSaves?: number;
  totalPointsFromGoalsConceded?: number;
  totalPointsFromYellowCards?: number;
  totalPointsFromRedCards?: number;
}

type SortField = 'name' | 'position' | 'team' | 'totalExpectedPoints' | 'averagePerGameweek' | 'averageValue' | 'avgMinutesPerGameweek' | 'chanceOfPlayingNextRound' | string;

// Create columns configuration for the enhanced table
function createPlayerTotalPointsColumns(
  gameweekRange: number[],
  onSort: (field: SortField) => void,
  maxPointsPerGameweek: { [key: string]: number },
  teamNameToShortName: Map<string, string>,
  playerIdToWebName: Map<number, string>,
  onPlayerCompareClick?: (player: PlayerTotalPointsData) => void,
  compareList?: PlayerTotalPointsData[],
  maxCompareReached?: boolean,
  opponentMap?: Map<string, { opponent: string; opponentId: number; isHome: boolean }>,
  showOpponent?: boolean,
  excludedComponents?: Set<string>,
  applyAvailability?: boolean,
  originalPlayerDataMap?: Map<number, PlayerTotalPointsData>,
  myTeamPlayerIds?: Set<number>,
  viewMode?: "past" | "future"
): TableColumn<PlayerTotalPointsData>[] {
  const isPastMode = viewMode === "past";
  return [
    {
      key: 'name',
      header: 'Player',
      sortable: true,
      className: 'sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] min-w-[100px] md:min-w-[160px]',
      render: (_, player) => (
        <div className="min-w-[100px] md:min-w-[160px]">
          <div className="flex items-center gap-0.5 flex-wrap">
            {myTeamPlayerIds?.has(player.playerId) && (
              <span className="text-purple-600 flex-shrink-0" title="In My Team">
                <Users className="h-3 w-3" />
              </span>
            )}
            <span className="font-semibold text-xs md:text-sm text-gray-900 truncate max-w-[80px] md:max-w-none">
              {(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.playerName || player.name}
            </span>
            <PlayerAvailabilityBadge player={player} />
          </div>
          <div className="flex items-center gap-0.5 mt-0.5 mb-0.5">
            <PositionBadge position={player.position} compact={true} />
            <TeamBadge team={(teamNameToShortName && teamNameToShortName.get(player.teamName || player.team)) || player.teamName || player.team} compact={true} />
          </div>
          <div className="text-[9px] md:text-xs text-gray-500 space-x-0.5">
            <span className="font-medium">£{(typeof player.price === 'number') ? player.price.toFixed(1) : '0.0'}</span>
            <span className="text-gray-400">•</span>
            <span>{(typeof player.ownership === 'number') ? player.ownership.toFixed(1) : '0.0'}%</span>
          </div>
        </div>
      )
    },
    ...(onPlayerCompareClick ? [{
      key: 'compare',
      header: '',
      sortable: false,
      align: 'center' as const,
      className: 'hidden md:table-cell min-w-[40px]',
      render: (_: any, player: PlayerTotalPointsData) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onPlayerCompareClick(player)}
          disabled={maxCompareReached && !compareList?.some(p => (p.playerId || p.id) === (player.playerId || player.id))}
          className={`h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-blue-50 ${
            compareList?.some(p => (p.playerId || p.id) === (player.playerId || player.id))
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-400 hover:text-blue-600'
          }`}
          data-testid={`button-compare-${player.playerId || player.id}`}
        >
          <UserPlus className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      )
    }] : []),
    ...gameweekRange.map(gw => {
      const gwKey = `gw${gw}`;
      const numericGwKey = gw.toString();
      const maxPointsForGw = maxPointsPerGameweek[gwKey];
      
      return {
        key: `gw${gw}`,
        header: `${gw}`,
        sortable: true,
        align: 'center' as const,
        className: 'min-w-[40px] md:min-w-[48px] bg-blue-50/30 px-1',
        render: (_: any, player: PlayerTotalPointsData) => {
          const playerPoints = player.gameweekProjections?.[numericGwKey] || 0;
          const isMaxForGameweek = playerPoints > 0 && playerPoints === maxPointsForGw;
          
          // Get opponent info for this player's team and gameweek
          const teamShort = (teamNameToShortName && teamNameToShortName.get(player.teamName || player.team)) || player.teamShort || '';
          const opponentInfo = opponentMap?.get(`${teamShort}-${gw}`);
          
          return (
            <div className={`${isMaxForGameweek ? 'bg-gradient-to-br from-green-100 to-emerald-100 rounded-md p-1' : ''}`}>
              {isPastMode ? (
                <PastGameweekBreakdownTooltip player={player} gameweek={gw} />
              ) : (
                <GameweekPointBreakdownTooltip player={player} gameweek={gw} excludedComponents={excludedComponents} />
              )}
              {showOpponent && opponentInfo && (
                <div className="text-[9px] text-gray-500 mt-0.5">
                  {opponentInfo.opponent} ({opponentInfo.isHome ? 'H' : 'A'})
                </div>
              )}
            </div>
          );
        }
      };
    }),
    {
      key: 'totalExpectedPoints',
      header: `Total`,
      sortable: true,
      align: 'center',
      className: 'min-w-[60px] md:min-w-[80px] bg-gradient-to-r from-green-50 to-emerald-50 border-l-2 border-gray-300 px-1',
      render: (_, player) => (
        isPastMode ? (
          <span className="font-bold text-green-800 text-lg">{Math.round(player.totalExpectedPoints || 0)}</span>
        ) : (
          <RangeTotalBreakdownTooltip 
            player={player} 
            gameweekCount={gameweekRange.length} 
            excludedComponents={excludedComponents}
            applyAvailability={applyAvailability}
            originalPlayer={originalPlayerDataMap?.get(player.playerId)}
          />
        )
      )
    },
    {
      key: 'averagePerGameweek',
      header: 'Avg',
      sortable: true,
      align: 'center',
      className: 'min-w-[50px] md:min-w-[70px] bg-gradient-to-r from-orange-50 to-amber-50 border-l border-gray-300 px-1',
      render: (value) => (
        <ValueCell 
          value={value || 0} 
          format="points" 
          decimals={2}
          className="font-bold text-orange-800 text-lg"
        />
      )
    },
    {
      key: 'averageValue',
      header: 'Val',
      sortable: true,
      align: 'center',
      className: 'hidden md:table-cell min-w-[60px] bg-gradient-to-r from-purple-50 to-violet-50 border-l border-gray-300 px-1',
      render: (value) => (
        <ValueCell 
          value={value || 0} 
          format="number" 
          decimals={2}
          className="font-bold text-purple-800 text-xs md:text-sm"
        />
      )
    },
    {
      key: 'avgMinutesPerGameweek',
      header: 'Mins',
      sortable: true,
      align: 'center',
      className: 'hidden md:table-cell min-w-[50px] bg-gradient-to-r from-blue-50 to-sky-50 border-l border-gray-300 px-1',
      render: (value) => (
        <ValueCell 
          value={value || 0} 
          format="number" 
          decimals={0}
          className="font-bold text-blue-800 text-xs md:text-sm"
        />
      )
    }
  ];
}

export default function PlayerTotalPoints() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Fetch bootstrap data to get current gameweek
  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch fixtures for opponent information
  const { data: fixturesData } = useQuery({
    queryKey: ["/api/fixtures"],
    staleTime: 5 * 60 * 1000,
  });

  // Get manager ID for "My Team" indicator - prefer authenticated user, fallback to localStorage
  const savedManagerId = useMemo(() => {
    // First check authenticated user's fplManagerId
    if (user?.fplManagerId) {
      return user.fplManagerId.toString();
    }
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fplManagerId') || null;
    }
    return null;
  }, [user?.fplManagerId]);

  // Fetch manager's team to show "My Team" indicator
  const { data: managerTeamData } = useQuery<{ picks?: { element: number }[] }>({
    queryKey: ["/api/manager", savedManagerId, "team"],
    enabled: !!savedManagerId,
    staleTime: 5 * 60 * 1000,
  });

  // Create a Set of player IDs in the user's team
  const myTeamPlayerIds = useMemo(() => {
    const ids = new Set<number>();
    if (managerTeamData?.picks) {
      managerTeamData.picks.forEach((pick) => {
        ids.add(pick.element);
      });
    }
    return ids;
  }, [managerTeamData]);

  const [viewMode, setViewMode] = useState<"past" | "future">("future");
  const [startGameweek, setStartGameweek] = useState<number | null>(null);
  const [endGameweek, setEndGameweek] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoadGroup, setSelectedLoadGroup] = useState<string>("Top 50");
  const [selectedAvailability, setSelectedAvailability] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('totalExpectedPoints');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Comparison state
  const [compareList, setCompareList] = useState<PlayerTotalPointsData[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  
  // Gameweek exclusion state
  const [excludedGameweeks, setExcludedGameweeks] = useState<Set<number>>(new Set());
  
  // Opponent display toggle state
  const [showOpponent, setShowOpponent] = useState(false);
  
  // Point component exclusion state
  const POINT_COMPONENTS = [
    { key: 'goals', label: 'Goals', totalKey: 'totalPointsFromGoals', gwKey: 'pointsFromGoals' },
    { key: 'assists', label: 'Assists', totalKey: 'totalPointsFromAssists', gwKey: 'pointsFromAssists' },
    { key: 'cleanSheets', label: 'Clean Sheets', totalKey: 'totalPointsFromCleanSheets', gwKey: 'pointsFromCleanSheets' },
    { key: 'defensiveContributions', label: 'Def Con', totalKey: 'totalPointsFromDefensiveContributions', gwKey: 'pointsFromDefensiveContributions' },
    { key: 'minutes', label: 'Minutes', totalKey: 'totalPointsFromMinutes', gwKey: 'pointsFromMinutes' },
    { key: 'bonus', label: 'Bonus', totalKey: 'totalPointsFromBonus', gwKey: 'pointsFromBonus' },
    { key: 'saves', label: 'Saves', totalKey: 'totalPointsFromSaves', gwKey: 'pointsFromSaves' },
    { key: 'goalsConceded', label: 'Goals Conceded', totalKey: 'totalPointsFromGoalsConceded', gwKey: 'pointsFromGoalsConceded' },
    { key: 'yellowCards', label: 'Yellow Cards', totalKey: 'totalPointsFromYellowCards', gwKey: 'pointsFromYellowCards' },
    { key: 'redCards', label: 'Red Cards', totalKey: 'totalPointsFromRedCards', gwKey: 'pointsFromRedCards' },
  ] as const;
  
  const [excludedComponents, setExcludedComponents] = useState<Set<string>>(new Set());
  
  // Filter section collapse state - collapsed by default on all devices
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Toggle point component exclusion
  const toggleComponentExclusion = (componentKey: string) => {
    setExcludedComponents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(componentKey)) {
        newSet.delete(componentKey);
      } else {
        newSet.add(componentKey);
      }
      return newSet;
    });
  };
  
  // Toggle position selection
  const togglePositionSelection = (position: string) => {
    setSelectedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(position)) {
        newSet.delete(position);
      } else {
        newSet.add(position);
      }
      return newSet;
    });
  };
  
  // Toggle team selection
  const toggleTeamSelection = (team: string) => {
    setSelectedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(team)) {
        newSet.delete(team);
      } else {
        newSet.add(team);
      }
      return newSet;
    });
  };
  
  // Include/exclude all components
  const includeAllComponents = () => setExcludedComponents(new Set());
  const excludeAllComponents = () => setExcludedComponents(new Set(POINT_COMPONENTS.map(c => c.key)));
  
  // Availability adjustments toggle (default ON)
  const [applyAvailability, setApplyAvailability] = useState(true);

  // Get last finished gameweek
  const lastFinishedGW = useMemo(() => {
    if (!bootstrapData?.events) return 0;
    const finishedEvents = bootstrapData.events.filter((e: any) => e.finished);
    return finishedEvents.length > 0 ? Math.max(...finishedEvents.map((e: any) => e.id)) : 0;
  }, [bootstrapData?.events]);

  // Get available gameweeks for dropdown - different for past vs future
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return [];
    }
    if (viewMode === "past") {
      // Past mode: GW1 to last finished gameweek
      return Array.from({ length: lastFinishedGW }, (_, i) => i + 1);
    }
    return getNextGameweeksForDropdown(bootstrapData.events, 12); // Show 12 gameweeks in dropdown
  }, [bootstrapData?.events, viewMode, lastFinishedGW]);

  // One-time initialization when bootstrap data loads
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const range = getDefaultGameweekRange(bootstrapData.events, 6); // Default to 6 gameweeks
    const start = parseInt(range.startGameweek);
    const end = parseInt(range.endGameweek);
    
    // Validate range
    if (start > 0 && end > 0 && start <= end && end <= 38) {
      setStartGameweek(start);
      setEndGameweek(end);
      setInitialized(true);
    }
  }, [bootstrapData, initialized]);

  // Reset gameweek range when viewMode changes
  useEffect(() => {
    if (!bootstrapData?.events || lastFinishedGW === 0) return;
    
    if (viewMode === "past") {
      // Past mode: default to last 6 finished gameweeks
      const defaultStart = Math.max(1, lastFinishedGW - 5);
      setStartGameweek(defaultStart);
      setEndGameweek(lastFinishedGW);
    } else {
      // Future mode: default to next 6 gameweeks
      const range = getDefaultGameweekRange(bootstrapData.events, 6);
      setStartGameweek(parseInt(range.startGameweek));
      setEndGameweek(parseInt(range.endGameweek));
    }
  }, [viewMode, bootstrapData?.events, lastFinishedGW]);

  // Calculate current gameweek and upcoming gameweeks
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 3; // Default fallback
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  const nextGameweek = currentGameweek + 1;
  const maxAvailableGW = Math.min(38, nextGameweek + 11); // Next 12 gameweeks max

  // Create team name to short name mapping
  const teamNameToShortName = useMemo(() => {
    if (!bootstrapData?.teams) return new Map<string, string>();
    const map = new Map<string, string>();
    bootstrapData.teams.forEach(team => {
      map.set(team.name, team.short_name);
    });
    return map;
  }, [bootstrapData?.teams]);

  // Create player ID to web_name mapping
  const playerIdToWebName = useMemo(() => {
    if (!bootstrapData?.elements) return new Map<number, string>();
    const map = new Map<number, string>();
    bootstrapData.elements.forEach(player => {
      map.set(player.id, player.web_name);
    });
    return map;
  }, [bootstrapData?.elements]);

  // Create a mapping of teamShort + gameweek -> opponent info
  const opponentMap = useMemo(() => {
    if (!bootstrapData?.teams || !Array.isArray(fixturesData)) return new Map<string, { opponent: string; opponentId: number; isHome: boolean }>();
    
    const map = new Map<string, { opponent: string; opponentId: number; isHome: boolean }>();
    
    fixturesData.forEach((fixture: any) => {
      const homeTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_h);
      const awayTeam = bootstrapData.teams.find((t: any) => t.id === fixture.team_a);
      
      if (homeTeam && awayTeam && fixture.event) {
        // Home team's opponent is away team
        map.set(`${homeTeam.short_name}-${fixture.event}`, {
          opponent: awayTeam.short_name,
          opponentId: fixture.team_a,
          isHome: true
        });
        // Away team's opponent is home team
        map.set(`${awayTeam.short_name}-${fixture.event}`, {
          opponent: homeTeam.short_name,
          opponentId: fixture.team_h,
          isHome: false
        });
      }
    });
    
    return map;
  }, [bootstrapData?.teams, fixturesData]);

  // Handle player comparison
  const handlePlayerCompareClick = (player: PlayerTotalPointsData) => {
    const playerId = player.playerId;
    if (!playerId) {
      console.warn('Player has no valid playerId:', player);
      return;
    }

    const isPlayerInList = compareList.some(p => p.playerId === playerId);
    
    if (isPlayerInList) {
      // Remove player from comparison list
      setCompareList(prev => prev.filter(p => p.playerId !== playerId));
      console.log('Removed player from comparison:', player.playerName, 'List length:', compareList.length - 1);
    } else {
      // Add player to comparison list (max 5 for projected data comparison)
      if (compareList.length < 5) {
        setCompareList(prev => [...prev, player]);
        console.log('Added player to comparison:', player.playerName, 'List length:', compareList.length + 1);
      }
    }
  };

  // Handle compare modal open
  const handleCompareModalOpen = () => {
    if (compareList.length >= 2) {
      setIsCompareModalOpen(true);
    }
  };

  // Handle compare modal close
  const handleCompareModalClose = () => {
    setIsCompareModalOpen(false);
  };

  // Check if max compare reached
  const maxCompareReached = compareList.length >= 5;

  // ALL useQuery hooks - cached and live data sources
  const { data: cachedTotalPointsData, isLoading: cachedLoading, error: cachedError, refetch: refetchCached } = useQuery<PlayerTotalPointsData[]>({
    queryKey: ["/api/cached/player-total-points"],
    staleTime: 60 * 60 * 1000, // 1 hour cache
    enabled: viewMode === "future",
  });

  // History query for past gameweeks
  const { data: historyData, isLoading: historyLoading } = useQuery<{
    lastFinishedGW: number;
    players: Array<{
      id: number;
      name: string;
      teamName: string;
      teamShort: string;
      position: string;
      elementType: number;
      price: number;
      gameweekPoints: { [gw: string]: number };
      gameweekMinutes: { [gw: string]: number };
      gameweekStats: { [gw: string]: {
        minutes: number;
        goals: number;
        assists: number;
        cleanSheets: number;
        goalsConceded: number;
        ownGoals: number;
        penaltiesSaved: number;
        penaltiesMissed: number;
        yellowCards: number;
        redCards: number;
        saves: number;
        bonus: number;
        totalPoints: number;
      }};
      totalPoints: number;
      totalMinutes: number;
      gamesPlayed: number;
    }>;
  }>({
    queryKey: ["/api/player-total-points-history", startGameweek, endGameweek],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startGameweek) params.set('startGw', startGameweek.toString());
      if (endGameweek) params.set('endGw', endGameweek.toString());
      const response = await fetch(`/api/player-total-points-history?${params}`);
      if (!response.ok) throw new Error("Failed to fetch history");
      return response.json();
    },
    staleTime: 60 * 60 * 1000,
    enabled: viewMode === "past" && startGameweek !== null && endGameweek !== null,
  });

  // Check if default range (for deciding whether to use cached or live endpoint)
  const isDefaultRange = startGameweek === nextGameweek && endGameweek === maxAvailableGW;
  
  const { data: liveTotalPointsData, isLoading: liveLoading, error: liveError, refetch: refetchLive } = useQuery<PlayerTotalPointsData[]>({
    queryKey: ["/api/player-total-points", startGameweek, endGameweek],
    queryFn: async () => {
      const response = await fetch(`/api/player-total-points?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch total points: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for live data
    // Only fetch live data when: future mode AND custom range (not default range which uses cached data)
    enabled: viewMode === "future" && startGameweek !== null && endGameweek !== null && !isDefaultRange,
  });

  // Data selection logic - Cache-first approach for faster loading
  const totalPointsData = useMemo(() => {
    let selectedData: PlayerTotalPointsData[] | null = null;
    
    // PRIORITY 1: Use cached data if available and user is viewing default range (fast path)
    if (isDefaultRange && cachedTotalPointsData && cachedTotalPointsData.length > 0) {
      const samplePlayer = cachedTotalPointsData[0];
      
      // Simplified validation - just check for basic required fields
      const hasValidCachedData = (samplePlayer.name || samplePlayer.playerName) && 
        samplePlayer.totalExpectedPoints !== undefined;
      
      if (hasValidCachedData) {
        selectedData = cachedTotalPointsData;
      }
    }
    
    // PRIORITY 2: Use live API data for custom ranges or if cache unavailable
    if (!selectedData && liveTotalPointsData && liveTotalPointsData.length > 0 && !liveError) {
      const samplePlayer = liveTotalPointsData[0];
      
      // Simplified validation - just check for basic required fields
      const hasValidLiveData = (samplePlayer.name || samplePlayer.playerName) && 
        samplePlayer.totalExpectedPoints !== undefined;
      
      if (hasValidLiveData) {
        selectedData = liveTotalPointsData;
      }
    }
    
    // PRIORITY 3: Return null if neither data source is available
    if (!selectedData) {
      return null;
    }
    
    // Conditionally apply availability adjustments based on toggle
    if (applyAvailability && bootstrapData && currentGameweek) {
      return selectedData.map(player => 
        applyAvailabilityAdjustments(player as any, bootstrapData, currentGameweek)
      ) as unknown as PlayerTotalPointsData[];
    }
    
    return selectedData;
  }, [liveTotalPointsData, liveError, cachedTotalPointsData, isDefaultRange, bootstrapData, currentGameweek, applyAvailability]);

  // Recalculate player data based on excluded point components
  const adjustedPlayerData = useMemo((): PlayerTotalPointsData[] | null => {
    if (!totalPointsData) return null;
    // Cast to PlayerTotalPointsData[] to handle availability adjustments return type
    const playerData = totalPointsData as PlayerTotalPointsData[];
    if (excludedComponents.size === 0) return playerData;
    
    return playerData.map(player => {
      // Calculate new totals by summing only included components
      let newTotal = 0;
      const newGwProjections: { [key: string]: number } = {};
      
      // Get the gameweek keys from the player's projections
      const gwKeys = Object.keys(player.gameweekProjections || {});
      
      // Initialize gameweek projections
      gwKeys.forEach(gwKey => {
        newGwProjections[gwKey] = 0;
      });
      
      // Calculate availability factors per gameweek if availability adjustments are applied
      const availabilityFactors: { [key: string]: number } = {};
      if (applyAvailability && (player as any).originalGameweekProjections && (player as any).availabilityAdjustments) {
        const originalProjections = (player as any).originalGameweekProjections as { [key: string]: number };
        const adjustments = (player as any).availabilityAdjustments as { [key: string]: { original: number; adjusted: number; reason: string } };
        
        gwKeys.forEach(gwKey => {
          if (adjustments[gwKey]) {
            // Use the adjustment ratio
            const original = adjustments[gwKey].original;
            availabilityFactors[gwKey] = original > 0 ? adjustments[gwKey].adjusted / original : 0;
          } else {
            // No adjustment for this gameweek
            availabilityFactors[gwKey] = 1;
          }
        });
      }
      
      // Sum up included components with availability adjustments
      POINT_COMPONENTS.forEach(component => {
        if (!excludedComponents.has(component.key)) {
          // Add to each gameweek projection (with availability factor if applicable)
          const gwData = (player as any)[component.gwKey] as { [key: string]: number } | undefined;
          if (gwData) {
            gwKeys.forEach(gwKey => {
              const rawValue = gwData[gwKey] || 0;
              const factor = applyAvailability && availabilityFactors[gwKey] !== undefined 
                ? availabilityFactors[gwKey] 
                : 1;
              newGwProjections[gwKey] += rawValue * factor;
            });
          }
        }
      });
      
      // Sum gameweek projections for total
      newTotal = Object.values(newGwProjections).reduce((sum, val) => sum + val, 0);
      
      // Calculate new averages
      const numGameweeks = gwKeys.length || 1;
      const newAverage = newTotal / numGameweeks;
      const playerPrice = player.price || 0;
      const newAverageValue = playerPrice > 0 ? newAverage / playerPrice : 0;
      
      return {
        ...player,
        totalExpectedPoints: newTotal,
        gameweekProjections: newGwProjections,
        averagePerGameweek: newAverage,
        averageValue: newAverageValue
      };
    });
  }, [totalPointsData, excludedComponents, POINT_COMPONENTS, applyAvailability]);

  // Create a map of original player data (BEFORE availability adjustments) for tooltip comparison
  // This uses the raw data directly without applyAvailability toggle, so we always have the unadjusted baseline
  const originalPlayerDataMap = useMemo(() => {
    const map = new Map<number, PlayerTotalPointsData>();
    
    // Get the raw selected data (same logic as totalPointsData but WITHOUT availability adjustments)
    let rawData: PlayerTotalPointsData[] | null = null;
    
    // PRIORITY 1: Use cached data if available and user is viewing default range
    if (isDefaultRange && cachedTotalPointsData && cachedTotalPointsData.length > 0) {
      const samplePlayer = cachedTotalPointsData[0];
      const hasValidCachedData = (samplePlayer.name || samplePlayer.playerName) && 
        samplePlayer.totalExpectedPoints !== undefined;
      if (hasValidCachedData) {
        rawData = cachedTotalPointsData;
      }
    }
    
    // PRIORITY 2: Use live API data for custom ranges or if cache unavailable
    if (!rawData && liveTotalPointsData && liveTotalPointsData.length > 0 && !liveError) {
      const samplePlayer = liveTotalPointsData[0];
      const hasValidLiveData = (samplePlayer.name || samplePlayer.playerName) && 
        samplePlayer.totalExpectedPoints !== undefined;
      if (hasValidLiveData) {
        rawData = liveTotalPointsData;
      }
    }
    
    if (rawData) {
      rawData.forEach(player => {
        map.set(player.playerId, player);
      });
    }
    return map;
  }, [liveTotalPointsData, liveError, cachedTotalPointsData, isDefaultRange]);

  // Loading state - Cache-first loading logic: show loading for cache, then live API if needed
  const isLoading = useMemo(() => {
    // For past mode, show loading while history loads
    if (viewMode === "past") {
      return historyLoading;
    }
    
    // PRIORITY 1: For default range, show loading while cache loads
    if (isDefaultRange && cachedLoading) return true;
    
    // PRIORITY 2: For custom ranges, show loading while live API loads
    if (!isDefaultRange && liveLoading) return true;
    
    // PRIORITY 3: Show loading if neither data source is available yet
    if (!liveTotalPointsData && !cachedTotalPointsData && !liveError && !cachedError) return true;
    
    return false;
  }, [viewMode, historyLoading, liveLoading, liveError, liveTotalPointsData, cachedLoading, cachedTotalPointsData, cachedError, isDefaultRange]);

  // Error handling - API-first: prioritize live API errors, only show cached errors if live API succeeds
  const error = useMemo(() => {
    // If live API has error and cached also fails, show live error (primary source)
    if (liveError && cachedError) return liveError;
    // If only live API has error but cached works, don't show error (cache fallback working)
    if (liveError && cachedTotalPointsData) return null;
    // If live API works but cached fails, don't show error (primary source working)
    if (liveTotalPointsData && cachedError) return null;
    // Show live API error if no cached fallback available
    if (liveError && !cachedTotalPointsData) return liveError;
    // Show cached error only if live API is also unavailable
    if (cachedError && !liveTotalPointsData) return cachedError;
    
    return null;
  }, [liveError, cachedError, liveTotalPointsData, cachedTotalPointsData]);

  const handleRefreshData = async () => {
    console.log('🔄 Total Points refresh button clicked!');
    setIsRefreshing(true);
    console.log('🔄 isRefreshing set to true');
    try {
      // Add a minimum delay to make spinner visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Invalidate all total points related queries
      console.log('🔄 Invalidating total points queries...');
      await queryClient.invalidateQueries({ queryKey: ["/api/cached/player-total-points"] });
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/player-total-points") || key?.includes("/api/cached/player-total-points");
        }
      });
      
      // Force refetch both cached and live data
      console.log('🔄 Refetching total points data...');
      await Promise.all([
        refetchCached(),
        refetchLive()
      ]);
      console.log('🔄 Total points refresh completed!');
    } finally {
      setIsRefreshing(false);
      console.log('🔄 isRefreshing set to false');
    }
  };

  // Toggle gameweek exclusion
  const toggleGameweekExclusion = (gw: number) => {
    setExcludedGameweeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gw)) {
        newSet.delete(gw);
      } else {
        newSet.add(gw);
      }
      return newSet;
    });
  };

  // Clear all exclusions
  const clearExclusions = () => {
    setExcludedGameweeks(new Set());
  };

  // Display data - transforms history data to match projection format for past mode
  const displayData = useMemo(() => {
    if (viewMode === "future") {
      return adjustedPlayerData;
    }
    
    // Past mode - transform history data to match projection format
    if (!historyData?.players || !startGameweek || !endGameweek) return null;
    
    const numGameweeks = endGameweek - startGameweek + 1;
    
    return historyData.players.map(player => {
      // Calculate totals for selected range
      let rangeTotal = 0;
      let rangeMinutes = 0;
      let rangeGamesPlayed = 0;
      const gameweekProjections: { [gw: string]: number } = {};
      
      for (let gw = startGameweek; gw <= endGameweek; gw++) {
        const pts = player.gameweekPoints[gw] || 0;
        const mins = player.gameweekMinutes?.[gw] || 0;
        gameweekProjections[gw] = pts;
        rangeTotal += pts;
        rangeMinutes += mins;
        if (mins > 0) rangeGamesPlayed++;
      }
      
      const avgPointsPerGame = rangeGamesPlayed > 0 ? rangeTotal / rangeGamesPlayed : 0;
      const avgValue = player.price > 0 ? rangeTotal / player.price : 0;
      const avgMinsPerGame = rangeGamesPlayed > 0 ? rangeMinutes / rangeGamesPlayed : 0;
      
      return {
        playerId: player.id,
        name: player.name,
        team: player.teamName,
        teamShort: player.teamShort,
        position: player.position,
        elementType: player.elementType,
        price: player.price,
        totalExpectedPoints: rangeTotal,
        totalMinutes: rangeMinutes,
        averagePerGameweek: avgPointsPerGame,
        averageValue: avgValue,
        avgMinutesPerGameweek: avgMinsPerGame,
        gameweekProjections,
        gameweekStats: player.gameweekStats,
      } as unknown as PlayerTotalPointsData;
    }).filter(p => p.totalExpectedPoints > 0);
  }, [viewMode, adjustedPlayerData, historyData, startGameweek, endGameweek]);

  // Generate full gameweek range (for toggle display)
  const fullGameweekRange = useMemo(() => {
    if (!startGameweek || !endGameweek) return [];
    const range = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      range.push(gw);
    }
    return range;
  }, [startGameweek, endGameweek]);

  // Generate active gameweek range for table headers (excluding excluded ones)
  const gameweekRange = useMemo(() => {
    return fullGameweekRange.filter(gw => !excludedGameweeks.has(gw));
  }, [fullGameweekRange, excludedGameweeks]);

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!displayData) return [];
    return Array.from(new Set(displayData.map(p => p.team)))
      .filter(team => team && team.length > 3) // Remove short forms (e.g., ARS, LIV), keep full names
      .sort();
  }, [displayData]);

  const positions = useMemo(() => {
    if (!displayData) return [];
    return Array.from(new Set(displayData.map(p => p.position)))
      .filter(pos => pos !== 'FWD') // Remove FWD since Forward already exists
      .sort();
  }, [displayData]);

  // Helper to normalize position strings for filtering
  const normalizePosition = (pos: string): string => {
    if (!pos) return '';
    const upper = pos.toUpperCase();
    if (upper === 'DEF' || upper.startsWith('DEFEND')) return 'Defender';
    if (upper === 'MID' || upper.startsWith('MIDFIEL')) return 'Midfielder';
    if (upper === 'FWD' || upper.startsWith('FORWARD')) return 'Forward';
    if (upper === 'GKP' || upper.startsWith('GOALK')) return 'Goalkeeper';
    return pos;
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!displayData) return [];
    
    let filtered = displayData.filter(player => {
      // Position filter - normalize both sides for comparison
      if (selectedPositions.size > 0) {
        const normalizedPos = normalizePosition(player.position);
        const matches = Array.from(selectedPositions).some(sel => normalizePosition(sel) === normalizedPos);
        if (!matches) return false;
      }
      if (selectedTeams.size > 0 && !selectedTeams.has(player.team)) return false;
      if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !player.team.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      // Availability filter
      if (selectedAvailability !== "all") {
        const chanceOfPlaying = player.chanceOfPlayingNextRound ?? 100;
        const status = player.status || 'a';
        
        switch (selectedAvailability) {
          case 'available':
            if (chanceOfPlaying < 100 || status !== 'a') return false;
            break;
          case 'partial':
            if (chanceOfPlaying !== 25 && chanceOfPlaying !== 50 && chanceOfPlaying !== 75) return false;
            break;
          case 'suspended':
            if (status !== 's') return false;
            break;
          case 'injured':
            if (status !== 'i') return false;
            break;
          case 'unavailable':
            if (chanceOfPlaying !== 0) return false;
            break;
        }
      }
      
      return true;
    });

    // Apply Load Group filtering
    if (selectedLoadGroup === "My Team") {
      // Filter to only show players in my team
      filtered = filtered.filter(player => myTeamPlayerIds.has(player.playerId));
    } else if (selectedLoadGroup !== "all") {
      // Parse the load group option to determine criteria and position filter
      const [criteria, count, ...positionParts] = selectedLoadGroup.split(' ');
      const position = positionParts.length > 0 ? positionParts.join(' ') : null;
      const limit = parseInt(count);
      
      // Filter by position if specified
      let workingData = [...filtered];
      if (position) {
        workingData = workingData.filter(player => {
          switch (position) {
            case 'FWDs': return player.position === 'Forward' || player.position === 'FWD';
            case 'MIDs': return player.position === 'Midfielder' || player.position === 'MID';
            case 'DEFs': return player.position === 'Defender' || player.position === 'DEF';
            case 'GKs': return player.position === 'Goalkeeper' || player.position === 'GKP';
            default: return true;
          }
        });
      }
      
      // Sort by criteria and take top N
      if (criteria === 'Top') {
        // Sort by total expected points (descending)
        workingData.sort((a, b) => (b.totalExpectedPoints || 0) - (a.totalExpectedPoints || 0));
      } else if (criteria === 'Value') {
        // Sort by average value (descending)  
        workingData.sort((a, b) => (b.averageValue || 0) - (a.averageValue || 0));
      }
      
      // Take top N players
      filtered = workingData.slice(0, limit);
    }

    // Sort data (always apply user-selected sorting)
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      // Handle component-specific gameweek sorting (e.g., "pointsFromGoals.gw4")
      if (sortField.includes('.gw')) {
        const [component, gwKey] = sortField.split('.');
        const gwNumber = gwKey.replace('gw', '');
        aValue = a[component]?.[gwNumber] || 0;
        bValue = b[component]?.[gwNumber] || 0;
      }
      // Handle total points gameweek sorting
      else if (sortField.startsWith('gw')) {
        const gwNumber = sortField.replace('gw', ''); // Extract numeric part
        aValue = a.gameweekProjections?.[gwNumber] || 0;
        bValue = b.gameweekProjections?.[gwNumber] || 0;
      } 
      // Handle regular field sorting
      else {
        aValue = a[sortField];
        bValue = b[sortField];
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [displayData, selectedPositions, selectedTeams, searchTerm, selectedLoadGroup, selectedAvailability, sortField, sortDirection, myTeamPlayerIds]);

  // Calculate max points per gameweek for highlighting
  const maxPointsPerGameweek = useMemo(() => {
    const maxPoints: { [key: string]: number } = {};
    gameweekRange.forEach(gw => {
      const gwKey = `gw${gw}`;
      const numericGwKey = gw.toString();
      const maxForThisGw = Math.max(...filteredAndSortedData.map(player => player.gameweekProjections?.[numericGwKey] || 0));
      maxPoints[gwKey] = maxForThisGw;
    });
    return maxPoints;
  }, [gameweekRange, filteredAndSortedData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  // Show loading only when actually needed
  if (!initialized || !bootstrapData || isLoading) {
    const isPastMode = viewMode === "past";
    return (
      <LoadingExperience
        variant="table"
        title={isPastMode ? "Loading Historical Points Data" : "Loading Player Points Projections"}
        description={isPastMode 
          ? `Fetching actual FPL points data for GW${startGameweek || 1}-${endGameweek || lastFinishedGW}...`
          : "Fetching comprehensive FPL points data for all players across the next 12 gameweeks..."
        }
        steps={isPastMode ? [
          { text: "Fetching historical gameweek data", delay: "0s" },
          { text: "Loading actual player performance stats", delay: "0.2s" },
          { text: "Preparing historical points table", delay: "0.4s" },
        ] : [
          { text: "Loading player data and fixture difficulty", delay: "0s" },
          { text: "Calculating projected points from multiple components", delay: "0.2s" },
          { text: "Preparing sortable projection table", delay: "0.4s" },
        ]}
      />
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error loading total points data. Please try again.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fpl-page-wrapper">
      {/* Loading overlay when refetching data after gameweek change */}
      {initialized && isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="overlay-loading-data">
          <LoadingExperience
            variant="table"
            title="Updating Player Projections"
            description="Recalculating player points for the selected gameweek range..."
            steps={[
              { text: "Fetching updated player data", delay: "0s" },
              { text: "Calculating projected points", delay: "0.2s" },
              { text: "Updating table view", delay: "0.4s" },
            ]}
          />
        </div>
      )}
      
      <div className="fpl-container fpl-content-area fpl-section-spacing">
          {/* Page Header */}
          <div className="fpl-page-header">
            <div className="fpl-page-header-content">
              <div className="fpl-page-title">
                <Target className="h-8 w-8" />
                <h1>{viewMode === "future" ? "Player Points Projections" : "Player Points History"}</h1>
              </div>
              <p className="fpl-page-subtitle">
                {viewMode === "future" 
                  ? "Complete FPL points projection combining all scoring components: goals, assists, clean sheets, minutes, saves, goals conceded, cards, defensive contributions and bonus points"
                  : "Actual FPL points scored by players in past gameweeks"}
              </p>
              {/* Past/Future Toggle */}
              <div className="flex gap-2 mt-3">
                <Button
                  variant={viewMode === "past" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("past")}
                  className={`flex items-center gap-1.5 ${viewMode === "past" ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"}`}
                >
                  <History className="h-4 w-4" />
                  Past GW Points
                </Button>
                <Button
                  variant={viewMode === "future" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("future")}
                  className={`flex items-center gap-1.5 ${viewMode === "future" ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-600"}`}
                >
                  <Calendar className="h-4 w-4" />
                  Future GW Projections
                </Button>
              </div>
            </div>
          </div>

          {/* Filters and Controls */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="fpl-card mb-6">
            <CollapsibleTrigger asChild>
              <div className="fpl-card-header cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-indigo-600" />
                    <h2 className="fpl-card-title">Filters & Controls</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 md:hidden">
                      {isFiltersOpen ? 'Tap to collapse' : 'Tap to expand'}
                    </span>
                    {isFiltersOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <div className="fpl-card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-gameweek" className="text-sm font-medium text-gray-700">From GW</Label>
              <Select value={startGameweek?.toString() || ''} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableGameweeks.map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-gameweek" className="text-sm font-medium text-gray-700">To GW</Label>
              <Select value={endGameweek?.toString() || ''} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableGameweeks.filter(gw => !startGameweek || gw >= startGameweek).map(gw => (
                    <SelectItem key={gw} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability-filter" className="text-sm font-medium text-gray-700">Availability</Label>
              <Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="availability-all" value="all">All</SelectItem>
                  <SelectItem key="availability-available" value="available">Available</SelectItem>
                  <SelectItem key="availability-partial" value="partial">Partial</SelectItem>
                  <SelectItem key="availability-unavailable" value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="load-group-filter" className="text-sm font-medium text-gray-700">Group</Label>
              <Select value={selectedLoadGroup} onValueChange={setSelectedLoadGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="load-group-all" value="all">All</SelectItem>
                  <SelectItem key="load-group-my-team" value="My Team">My Team</SelectItem>
                  <SelectItem key="load-group-top-50" value="Top 50">Top 50</SelectItem>
                  <SelectItem key="load-group-value-50" value="Value 50">Value 50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="search" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
              </div>
              
              {/* Gameweek Toggle Section with Opponent Toggle */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">
                    Toggle Gameweeks (click to exclude/include):
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOpponent(!showOpponent)}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 ${
                        showOpponent 
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                      }`}
                      data-testid="button-toggle-opponent"
                    >
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{showOpponent ? 'Hide Opponent' : 'Show Opponent'}</span>
                      <span className="sm:hidden">{showOpponent ? 'Hide' : 'Show'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setApplyAvailability(!applyAvailability)}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 ${
                        applyAvailability 
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-300'
                      }`}
                      data-testid="button-toggle-availability"
                    >
                      <span className="hidden sm:inline">{applyAvailability ? 'Avail. Adj: ON' : 'Avail. Adj: OFF'}</span>
                      <span className="sm:hidden">{applyAvailability ? 'Adj: ON' : 'Adj: OFF'}</span>
                    </Button>
                    {excludedGameweeks.size > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearExclusions}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 sm:px-3"
                        data-testid="button-clear-exclusions"
                      >
                        <X className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Clear exclusions</span>
                        <span className="sm:hidden">Clear</span>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {fullGameweekRange.map(gw => {
                    const isExcluded = excludedGameweeks.has(gw);
                    return (
                      <Button
                        key={gw}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleGameweekExclusion(gw)}
                        className={`min-w-[50px] sm:min-w-[60px] text-xs px-2 py-1 ${
                          isExcluded 
                            ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300' 
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                        }`}
                        data-testid={`button-toggle-gw-${gw}`}
                      >
                        GW{gw}
                      </Button>
                    );
                  })}
                </div>
                {excludedGameweeks.size > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Excluded: {Array.from(excludedGameweeks).sort((a, b) => a - b).map(gw => `GW${gw}`).join(', ')}
                  </p>
                )}
              </div>
              
              {/* Position Toggle Section */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">
                    Positions:
                  </Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedPositions(new Set())}
                      className="text-xs sm:text-sm bg-green-50 text-green-700 hover:bg-green-100 border-green-300 px-2 sm:px-3 py-1.5"
                      data-testid="button-include-all-positions"
                    >
                      All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedPositions(new Set(['_none_']))}
                      className="text-xs sm:text-sm bg-red-50 text-red-700 hover:bg-red-100 border-red-300 px-2 sm:px-3 py-1.5"
                      data-testid="button-exclude-all-positions"
                    >
                      None
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {positions.map(position => {
                    const isSelected = selectedPositions.size === 0 || selectedPositions.has(position);
                    const shortForm = position === 'Goalkeeper' ? 'GKP' : position === 'Defender' ? 'DEF' : position === 'Midfielder' ? 'MID' : position === 'Forward' ? 'FWD' : position;
                    return (
                      <Button
                        key={position}
                        variant="outline"
                        size="sm"
                        onClick={() => togglePositionSelection(position)}
                        className={`text-xs px-2 py-1 ${
                          isSelected 
                            ? 'bg-teal-100 text-teal-700 hover:bg-teal-200 border border-teal-300' 
                            : 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300'
                        }`}
                        data-testid={`button-toggle-position-${position}`}
                      >
                        {shortForm}
                      </Button>
                    );
                  })}
                </div>
              </div>
              
              {/* Team Toggle Section */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">
                    Teams:
                  </Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedTeams(new Set())}
                      className="text-xs sm:text-sm bg-green-50 text-green-700 hover:bg-green-100 border-green-300 px-2 sm:px-3 py-1.5"
                      data-testid="button-include-all-teams"
                    >
                      All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedTeams(new Set(['_none_']))}
                      className="text-xs sm:text-sm bg-red-50 text-red-700 hover:bg-red-100 border-red-300 px-2 sm:px-3 py-1.5"
                      data-testid="button-exclude-all-teams"
                    >
                      None
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {teams.map(team => {
                    const isSelected = selectedTeams.size === 0 || selectedTeams.has(team);
                    const shortName = teamNameToShortName.get(team) || team;
                    return (
                      <Button
                        key={team}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTeamSelection(team)}
                        className={`text-xs px-2 py-1 ${
                          isSelected 
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-300' 
                            : 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300'
                        }`}
                        data-testid={`button-toggle-team-${team}`}
                      >
                        {shortName}
                      </Button>
                    );
                  })}
                </div>
              </div>
              
              {/* Point Component Toggle Section */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">
                    Toggle Point Components (click to exclude/include):
                  </Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={includeAllComponents}
                      className="text-xs sm:text-sm bg-green-50 text-green-700 hover:bg-green-100 border-green-300 px-2 sm:px-3 py-1.5"
                      data-testid="button-include-all-components"
                    >
                      All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={excludeAllComponents}
                      className="text-xs sm:text-sm bg-red-50 text-red-700 hover:bg-red-100 border-red-300 px-2 sm:px-3 py-1.5"
                      data-testid="button-exclude-all-components"
                    >
                      None
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {POINT_COMPONENTS.map(component => {
                    const isExcluded = excludedComponents.has(component.key);
                    return (
                      <Button
                        key={component.key}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleComponentExclusion(component.key)}
                        className={`text-xs px-2 py-1 ${
                          isExcluded 
                            ? 'bg-gray-100 text-gray-400 line-through hover:bg-gray-200 border border-gray-300' 
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                        }`}
                        data-testid={`button-toggle-component-${component.key}`}
                      >
                        {component.label}
                      </Button>
                    );
                  })}
                </div>
                {excludedComponents.size > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Excluded: {POINT_COMPONENTS.filter(c => excludedComponents.has(c.key)).map(c => c.label).join(', ')}
                  </p>
                )}
              </div>
            </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Data Tabs */}
          {isLoading ? (
            <div className="fpl-card">
              <div className="fpl-card-content">
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="ml-4 text-lg text-gray-600">Loading player total points...</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="fpl-card">
              <div className="fpl-card-header">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-indigo-600" />
                    <h2 className="fpl-card-title">Player Points Projections: GW{startGameweek}-GW{endGameweek}</h2>
                    {excludedGameweeks.size > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {excludedGameweeks.size} excluded
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleRefreshData}
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      data-testid="button-refresh-data"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                    <Badge className="bg-indigo-100 text-indigo-700">
                      {filteredAndSortedData.length} players
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="fpl-card-content p-0">
                <Tabs defaultValue="total" className="w-full">
                  <TabsList className="justify-center bg-gray-50 p-1 m-4 mb-0 rounded-lg gap-1">
                    <TabsTrigger value="total" className="flex items-center gap-1 text-xs md:text-sm px-2 py-1.5">
                      <Trophy className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Total Points</span>
                      <span className="sm:hidden">Pts</span>
                    </TabsTrigger>
                  </TabsList>

                {/* Total Points Tab */}
                <TabsContent value="total" className="mt-0">
                  <EnhancedTable
                    data={filteredAndSortedData}
                    columns={createPlayerTotalPointsColumns(
                      gameweekRange, 
                      handleSort, 
                      maxPointsPerGameweek,
                      teamNameToShortName,
                      playerIdToWebName,
                      handlePlayerCompareClick, 
                      compareList, 
                      maxCompareReached,
                      opponentMap,
                      showOpponent,
                      excludedComponents,
                      applyAvailability,
                      originalPlayerDataMap,
                      myTeamPlayerIds,
                      viewMode
                    )}
                    onSort={handleSort}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    loading={isLoading}
                    emptyMessage="No players found matching your criteria"
                    stickyHeader={true}
                    compact={true}
                    maxHeight="80vh"
                    className="shadow-sm"
                  />
                </TabsContent>


                </Tabs>
              </div>
            </div>
          )}

        {/* Comparison Modal */}
        <PlayerProjectionsComparisonModal
          players={compareList}
          isOpen={isCompareModalOpen}
          onClose={handleCompareModalClose}
          bootstrapData={bootstrapData}
          startGameweek={startGameweek || 6}
          endGameweek={endGameweek || 11}
        />

        {/* Bottom Right Comparison Popup */}
        {compareList.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40 max-w-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Compare Players ({compareList.length}/5)</h3>
              <button
                onClick={() => setCompareList([])}
                className="text-gray-400 hover:text-gray-600 text-sm"
                data-testid="button-clear-comparison"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
              {compareList.map((player) => (
                <div key={player.playerId || player.id} className="flex items-center justify-between text-sm py-1">
                  <span className="font-medium text-gray-700 truncate">
                    {player.playerName || player.name}
                  </span>
                  <button
                    onClick={() => {
                      const playerId = player.playerId || player.id;
                      setCompareList(prev => prev.filter(p => (p.playerId || p.id) !== playerId));
                    }}
                    className="text-red-400 hover:text-red-600 ml-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleCompareModalOpen}
              disabled={compareList.length < 2}
              className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              data-testid="button-compare-players"
            >
              Compare {compareList.length < 2 ? `(Need ${2 - compareList.length} more)` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}