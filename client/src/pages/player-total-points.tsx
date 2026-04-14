import { useState, useMemo, useEffect, type CSSProperties, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Calendar, Filter, Search, ChevronDown, ChevronUp, Target, Info, Zap, Shield, Swords, Timer, Users, RefreshCw, Heart, AlertTriangle, XCircle, Clock, CheckCircle, X, History } from "lucide-react";
import { computeCurrentGameweek, getDefaultGameweekRange, getNextGameweeksForDropdown } from "@shared/gameweek-utils";
import { useProjectionSettings } from "@/hooks/use-projection-settings";
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
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

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
        <button className={`inline-flex items-center gap-0 sm:gap-0.5 px-0.5 sm:px-1 py-px rounded text-[9px] sm:text-[11px] font-semibold cursor-pointer transition-colors hover:opacity-80 ${statusBg} ${statusBorder} border`}>
          <StatusIcon className={`h-1.5 w-1.5 sm:h-2 sm:w-2 ${statusColor}`} />
          <span className={statusColor}>{chanceOfPlaying}%</span>
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

// Fixture detail type for DGW breakdowns
interface FixtureDetail {
  opponent: string;
  isHome: boolean;
  pointsFromGoals: number;
  pointsFromAssists: number;
  pointsFromCleanSheets: number;
  pointsFromMinutes: number;
  pointsFromGoalsConceded: number;
  pointsFromYellowCards: number;
  pointsFromRedCards: number;
  pointsFromBonus: number;
  pointsFromSaves: number;
  pointsFromDefensiveContributions: number;
  totalPoints: number;
}

// Availability Adjustment Note — shown inside tooltips when a GW projection was scaled
function BlankGameweekNote({ gameweek }: { gameweek: number }) {
  return (
    <div className="mt-1">
      <div className="rounded-md bg-gray-100 border border-gray-300 px-3 py-2 space-y-1">
        <div className="flex items-center gap-1.5 text-gray-700 font-semibold text-xs">
          <span>🔕</span>
          <span>Blank Gameweek</span>
        </div>
        <p className="text-xs text-gray-500">No fixture for this player's team in GW{gameweek}. Projection: 0 pts.</p>
      </div>
    </div>
  );
}

function AvailabilityAdjustmentNote({ availAdj }: { availAdj: { original: number; adjusted: number; reason: string } }) {
  const isZeroed = availAdj.original === 0 && availAdj.adjusted === 0;
  return (
    <div className="mt-3 border-t border-amber-200 pt-3">
      <div className="rounded-md bg-amber-50 border border-amber-300 px-3 py-2 space-y-1">
        <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-xs">
          <span>⚠️</span>
          <span>Availability adjustment applied</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 text-xs text-amber-900">
          <span className="text-gray-600">Reason:</span>
          <span className="font-medium text-right">{availAdj.reason}</span>
          {!isZeroed && (
            <>
              <span className="text-gray-600">Full-fit projection:</span>
              <span className="font-medium text-right">{availAdj.original.toFixed(1)} pts</span>
              <span className="text-gray-600">Adjusted to:</span>
              <span className="font-semibold text-amber-700 text-right">{availAdj.adjusted.toFixed(1)} pts</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Gameweek Point Breakdown Tooltip Component
function GameweekPointBreakdownTooltip({ player, gameweek, excludedComponents = new Set() }: { player: PlayerTotalPointsData, gameweek: number, excludedComponents?: Set<string> }) {
  const hasBreakdownData = player.pointsFromGoals !== undefined;
  const gwKey = gameweek.toString(); // Use numeric string key format to match API data
  const gwPoints = player.gameweekProjections?.[gwKey];
  const availAdj = (player as any).availabilityAdjustments?.[gwKey] as { original: number; adjusted: number; reason: string } | undefined;
  
  // Check for fixtureDetails (DGW / BGW support)
  const fixtureDetailRaw = (player as any).fixtureDetails?.[gwKey];
  const fixtures = (fixtureDetailRaw || []) as FixtureDetail[];
  const isDGW = fixtures.length > 1;
  const isBGW = fixtureDetailRaw !== undefined && fixtures.length === 0;
  
  // Component definitions for display
  const componentDefs = [
    { key: 'pointsFromGoals', excludeKey: 'goals', label: '⚽ Goals', color: 'text-green-700' },
    { key: 'pointsFromAssists', excludeKey: 'assists', label: '🎯 Assists', color: 'text-blue-700' },
    { key: 'pointsFromCleanSheets', excludeKey: 'cleanSheets', label: '🛡️ Clean Sheets', color: 'text-yellow-700' },
    { key: 'pointsFromDefensiveContributions', excludeKey: 'defensiveContributions', label: '⚔️ Def Contrib', color: 'text-orange-700' },
    { key: 'pointsFromMinutes', excludeKey: 'minutes', label: '⏱️ Minutes', color: 'text-purple-700' },
    { key: 'pointsFromBonus', excludeKey: 'bonus', label: '✨ Bonus', color: 'text-pink-700' },
    { key: 'pointsFromSaves', excludeKey: 'saves', label: '🥅 Saves', color: 'text-cyan-700' },
    { key: 'pointsFromGoalsConceded', excludeKey: 'goalsConceded', label: '🚪 Goals Conceded', color: 'text-red-600' },
    { key: 'pointsFromYellowCards', excludeKey: 'yellowCards', label: '🟨 Yellow Cards', color: 'text-amber-600' },
    { key: 'pointsFromRedCards', excludeKey: 'redCards', label: '🟥 Red Cards', color: 'text-red-700' },
  ];
  
  if (!hasBreakdownData || !gwPoints) {
    if (availAdj) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 relative">
              <ValueCell 
                value={gwPoints || 0} 
                format="points" 
                decimals={1} 
                colorScheme="points"
                fontWeight="medium"
              />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="max-w-xs p-4 bg-white shadow-xl border border-amber-200 z-50">
            <AvailabilityAdjustmentNote availAdj={availAdj} />
          </PopoverContent>
        </Popover>
      );
    }
    if (isBGW) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 relative">
              <ValueCell 
                value={0} 
                format="points" 
                decimals={1} 
                colorScheme="points"
                fontWeight="medium"
              />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="max-w-xs p-4 bg-white shadow-xl border border-gray-200 z-50">
            <BlankGameweekNote gameweek={gameweek} />
          </PopoverContent>
        </Popover>
      );
    }
    return (
      <ValueCell 
        value={gwPoints || 0} 
        format="points" 
        decimals={1} 
        colorScheme="points"
        fontWeight="medium"
      />
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 relative">
          <ValueCell 
            value={gwPoints} 
            format="points" 
            decimals={1} 
            colorScheme="points"
            fontWeight="medium"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className={`${isDGW ? 'max-w-lg' : 'max-w-sm'} p-4 bg-white shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto`}>
        <div className="space-y-2">
          <div className="font-semibold text-gray-900 border-b pb-2 mb-3 flex items-center gap-2">
            <span>GW{gameweek} Points Breakdown</span>
            {isDGW && (
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                DGW - {fixtures.length} fixtures
              </span>
            )}
          </div>
          
          {/* DGW: Show per-fixture breakdown with all 10 components */}
          {isDGW ? (
            <div className="space-y-4">
              {fixtures.map((fixture, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${fixture.isHome ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {fixture.isHome ? 'H' : 'A'}
                    </span>
                    <span className="font-semibold text-gray-800">{fixture.opponent}</span>
                    <span className="ml-auto text-sm font-bold text-purple-700">{fixture.totalPoints.toFixed(1)} pts</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {componentDefs.map(comp => {
                      const value = fixture[comp.key as keyof FixtureDetail] as number;
                      const isExcluded = excludedComponents.has(comp.excludeKey);
                      if (value === 0 && !isExcluded) return null;
                      return (
                        <div key={comp.key} className={`flex justify-between items-center ${isExcluded ? 'opacity-40' : ''}`}>
                          <span className={`text-gray-600 ${isExcluded ? 'line-through' : ''}`}>{comp.label}:</span>
                          <span className={`${comp.color} font-medium`}>{isExcluded ? '0.0' : value.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Single gameweek: Show fixture info + component breakdown */
            <div className="space-y-3">
              {/* Show fixture details for SGW if available */}
              {fixtures.length === 1 && fixtures[0].opponent && (
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${fixtures[0].isHome ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {fixtures[0].isHome ? 'H' : 'A'}
                  </span>
                  <span className="font-semibold text-gray-800">vs {fixtures[0].opponent}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
              {(() => {
                return componentDefs.map(comp => {
                  const currentValue = (player as any)[comp.key]?.[gwKey] || 0;
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
                        ) : (
                          <ValueCell 
                            value={currentValue} 
                            format="points" 
                            decimals={1} 
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
            </div>
          )}
          
          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span className="text-gray-800">GW{gameweek} Points Total:</span>
              <ValueCell 
                value={gwPoints} 
                format="points" 
                decimals={1} 
                className="text-green-800"
                fontWeight="semibold"
              />
            </div>
          </div>
          {availAdj && <AvailabilityAdjustmentNote availAdj={availAdj} />}
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
}

function RangeTotalBreakdownTooltip({ 
  player, 
  gameweekCount, 
  excludedComponents = new Set(), 
}: RangeTotalBreakdownTooltipProps) {
  const hasBreakdownData = player.totalPointsFromGoals !== undefined;
  
  if (!hasBreakdownData) {
    return (
      <ValueCell 
        value={player.totalExpectedPoints || 0} 
        format="points" 
        decimals={1} 
        className="text-green-800 text-sm"
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
          <ValueCell 
            value={player.totalExpectedPoints || 0} 
            format="points" 
            decimals={1} 
            className="text-green-800 text-sm"
            fontWeight="bold"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-md p-4 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="font-semibold text-gray-900 border-b pb-2 mb-3">
            {player.name} - {gameweekCount}GW Total Breakdown
          </div>
          
          {excludedComponents.size > 0 && (
            <div className="flex flex-wrap gap-1 text-xs mb-2">
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                {excludedComponents.size} excluded
              </span>
            </div>
          )}

          <div className="space-y-1.5 text-sm">
            {componentDefs.map(comp => {
              const isExcluded = excludedComponents.has(comp.key);
              const currentValue = (player as any)[comp.totalKey] || 0;
              
              return (
                <div 
                  key={comp.key} 
                  className={`flex justify-between items-center ${isExcluded ? 'opacity-40' : ''}`}
                >
                  <span className={`text-gray-600 ${isExcluded ? 'line-through' : ''}`}>
                    {comp.label}:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <ValueCell 
                      value={isExcluded ? 0 : currentValue} 
                      format="points" 
                      decimals={1} 
                      className={isExcluded ? 'text-gray-400' : comp.color}
                      fontWeight="medium"
                    />
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
                decimals={1} 
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

// GW39 (TBC) column now uses the standard GameweekPointBreakdownTooltip with gameweek=39.
// The backend pipeline treats TBC as GW39 with the same model as GW33-38, so real
// per-component projections (pointsFromGoals['39'], etc.) are available in the player data.

interface PlayerTotalPointsData {
  [key: string]: any; // Add index signature for dynamic property access
  playerId: number;
  name: string;
  fullName: string;
  team: string;
  position: string;
  price: number;
  ownership: number;
  form?: string | number;
  selectedByPercent?: string | number;
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

type SortField = 'name' | 'position' | 'team' | 'totalExpectedPoints' | 'averagePerGameweek' | 'averageValue' | 'avgMinutesPerGameweek' | 'form' | 'selected_by_percent' | 'chanceOfPlayingNextRound' | string;

// Create columns configuration for the enhanced table
function createPlayerTotalPointsColumns(
  gameweekRange: number[],
  onSort: (field: SortField) => void,
  maxPointsPerGameweek: { [key: string]: number },
  teamNameToShortName: Map<string, string>,
  playerIdToWebName: Map<number, string>,
  opponentMap?: Map<string, { opponent: string; opponentId: number; isHome: boolean }>,
  showOpponent?: boolean,
  excludedComponents?: Set<string>,
  myTeamPlayerIds?: Set<number>,
  viewMode?: "past" | "future",
  isMobile?: boolean,
  tbcTeamShortNames?: Set<string>,
  tbcOpponentMap?: Map<string, { opponent: string; isHome: boolean }>
): TableColumn<PlayerTotalPointsData>[] {
  const isPastMode = viewMode === "past";
  const allColumns: TableColumn<PlayerTotalPointsData>[] = [
    {
      key: 'name',
      header: 'Player',
      sortable: true,
      hideSortIcon: true,
      className: 'sticky left-0 bg-white border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]',
      style: { width: '120px', minWidth: '80px', maxWidth: '140px' } as CSSProperties,
      render: (_, player) => (
        <div className="w-[80px] md:w-[110px] overflow-hidden">
          <div className="flex items-center gap-0.5 flex-wrap">
            {myTeamPlayerIds?.has(player.playerId) && (
              <span className="text-purple-600 flex-shrink-0" title="In My Team">
                <Users className="h-3 w-3" />
              </span>
            )}
            <span className="font-semibold text-xs md:text-sm text-gray-900 truncate max-w-[60px] md:max-w-[90px]">
              {(playerIdToWebName && playerIdToWebName.get(player.playerId)) || player.playerName || player.name}
            </span>
            <PlayerAvailabilityBadge player={player} />
          </div>
          <div className="flex items-center gap-0.5 mt-0.5">
            <PositionBadge position={player.position} compact={true} />
            <TeamBadge team={(teamNameToShortName && teamNameToShortName.get(player.teamName || player.team)) || player.teamName || player.team} compact={true} />
          </div>
        </div>
      )
    },
    ...gameweekRange.map(gw => {
      const gwKey = `gw${gw}`;
      const numericGwKey = gw.toString();
      const maxPointsForGw = maxPointsPerGameweek[gwKey];
      
      return {
        key: `gw${gw}`,
        header: `GW${gw}`,
        sortable: true,
        hideSortIcon: true,
        align: 'center' as const,
        className: 'bg-blue-50/30 px-0.5',
        style: { width: '50px', minWidth: '50px' } as CSSProperties,
        render: (_: any, player: PlayerTotalPointsData) => {
          const playerPoints = player.gameweekProjections?.[numericGwKey] || 0;
          const isMaxForGameweek = playerPoints > 0 && playerPoints === maxPointsForGw;
          const availAdj = !isPastMode && (player as any).availabilityAdjustments?.[numericGwKey];
          const fixtureRaw = !isPastMode ? (player as any).fixtureDetails?.[numericGwKey] : undefined;
          const numFixtures = fixtureRaw !== undefined ? (fixtureRaw as FixtureDetail[]).length : null;
          const isBGWCell = !availAdj && numFixtures === 0;
          const isDGWCell = !availAdj && numFixtures !== null && numFixtures > 1;
          
          // Get opponent info for this player's team and gameweek
          const teamShort = (teamNameToShortName && teamNameToShortName.get(player.teamName || player.team)) || player.teamShort || '';
          const opponentInfo = opponentMap?.get(`${teamShort}-${gw}`);
          
          const ringClass = availAdj
            ? 'ring-1 ring-amber-400 bg-amber-50 rounded'
            : isDGWCell
            ? 'ring-1 ring-purple-400 bg-purple-50 rounded'
            : isBGWCell
            ? 'ring-1 ring-gray-300 bg-gray-100 rounded'
            : '';

          return (
            <div className="flex flex-col items-center">
              <div className={`relative inline-flex items-center justify-center ${isMaxForGameweek ? 'bg-gradient-to-br from-green-100 to-emerald-100 rounded px-0.5 md:p-0.5' : ''} ${ringClass}`}>
                {availAdj && (
                  <span className="absolute top-0 right-0 w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-amber-400 -translate-y-0.5 translate-x-0.5" />
                )}
                {!availAdj && isDGWCell && (
                  <span className="absolute top-0 right-0 w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-purple-400 -translate-y-0.5 translate-x-0.5" />
                )}
                {!availAdj && !isDGWCell && isBGWCell && (
                  <span className="absolute top-0 right-0 w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-gray-400 -translate-y-0.5 translate-x-0.5" />
                )}
                {isPastMode ? (
                  <PastGameweekBreakdownTooltip player={player} gameweek={gw} />
                ) : (
                  <GameweekPointBreakdownTooltip player={player} gameweek={gw} excludedComponents={excludedComponents} />
                )}
              </div>
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
    ...(tbcTeamShortNames && tbcTeamShortNames.size > 0 && !isPastMode ? [{
      key: 'gw39',
      header: (<>GW39<br/><span className="text-[10px] text-amber-600 font-normal">(TBC)</span></>) as ReactNode,
      sortable: true,
      hideSortIcon: true,
      align: 'center' as const,
      className: 'bg-amber-50/60 border-l border-amber-300 px-0.5',
      style: { width: '50px', minWidth: '50px' } as CSSProperties,
      render: (_: any, player: PlayerTotalPointsData) => {
        const playerTeamShort = (teamNameToShortName?.get((player as any).teamName || player.team)) || (player as any).teamShort || player.team || '';
        const isTBCPlayer = tbcTeamShortNames.has(playerTeamShort);
        if (!isTBCPlayer) return <span className="text-gray-300 text-xs">-</span>;

        const tbcOpponentInfo = tbcOpponentMap?.get(playerTeamShort);
        return (
          <div className="flex flex-col items-center">
            <div className="relative inline-flex items-center justify-center ring-1 ring-amber-400 bg-amber-50 rounded px-0.5">
              <GameweekPointBreakdownTooltip player={player} gameweek={39} excludedComponents={excludedComponents} />
            </div>
            {showOpponent && tbcOpponentInfo && (
              <div className="text-[9px] text-gray-500 mt-0.5">
                {tbcOpponentInfo.opponent} ({tbcOpponentInfo.isHome ? 'H' : 'A'})
              </div>
            )}
          </div>
        );
      }
    }] : []),
    {
      key: 'totalExpectedPoints',
      header: `Total`,
      sortable: true,
      hideSortIcon: true,
      align: 'center',
      className: 'w-[68px] bg-green-50 border-l-2 border-gray-300 px-1 sticky right-0 md:right-[272px] z-[5] shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]',
      render: (_, player) => (
        isPastMode ? (
          <span className="font-bold text-green-800 text-sm">{Math.round(player.totalExpectedPoints || 0)}</span>
        ) : (
          <RangeTotalBreakdownTooltip 
            player={player} 
            gameweekCount={gameweekRange.length} 
            excludedComponents={excludedComponents}
          />
        )
      )
    },
    {
      key: 'averageValue',
      header: 'Value',
      sortable: true,
      hideSortIcon: true,
      align: 'center',
      className: 'hidden md:table-cell md:w-[68px] bg-purple-50 border-l border-gray-300 px-1 md:sticky md:right-[204px] md:z-[5] md:shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]',
      render: (value) => (
        <ValueCell 
          value={value || 0} 
          format="number" 
          decimals={1}
          className="font-bold text-purple-800 text-sm"
        />
      )
    },
    {
      key: 'form',
      header: 'Form',
      sortable: true,
      hideSortIcon: true,
      align: 'center',
      className: 'hidden md:table-cell md:w-[68px] bg-teal-50 border-l border-gray-300 px-1 md:sticky md:right-[136px] md:z-[5] md:shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]',
      render: (value) => (
        <ValueCell 
          value={parseFloat(value) || 0} 
          format="number" 
          decimals={1}
          className="font-bold text-teal-800 text-sm"
        />
      )
    },
    {
      key: 'avgMinutesPerGameweek',
      header: 'Mins',
      sortable: true,
      hideSortIcon: true,
      align: 'center',
      className: 'hidden md:table-cell md:w-[68px] bg-sky-50 border-l border-gray-300 px-1 md:sticky md:right-[68px] md:z-[5] md:shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]',
      render: (value) => (
        <ValueCell 
          value={value || 0} 
          format="number" 
          decimals={0}
          className="font-bold text-blue-800 text-sm"
        />
      )
    },
    {
      key: 'ownership',
      header: 'Own%',
      sortable: true,
      hideSortIcon: true,
      align: 'center',
      className: 'hidden md:table-cell md:w-[68px] bg-rose-50 border-l border-gray-300 px-1 md:sticky md:right-0 md:z-[5] md:shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]',
      render: (value) => (
        <ValueCell 
          value={parseFloat(value) || 0} 
          format="number" 
          decimals={1}
          className="font-bold text-rose-800 text-sm"
        />
      )
    }
  ];
  return allColumns;
}

const GW_COMPONENT_KEYS = [
  'pointsFromGoals', 'pointsFromAssists', 'pointsFromCleanSheets',
  'pointsFromDefensiveContributions', 'pointsFromMinutes', 'pointsFromBonus',
  'pointsFromSaves', 'pointsFromGoalsConceded', 'pointsFromYellowCards', 'pointsFromRedCards',
] as const;

const TOTAL_COMPONENT_KEYS: Record<string, string> = {
  pointsFromGoals: 'totalPointsFromGoals',
  pointsFromAssists: 'totalPointsFromAssists',
  pointsFromCleanSheets: 'totalPointsFromCleanSheets',
  pointsFromDefensiveContributions: 'totalPointsFromDefensiveContributions',
  pointsFromMinutes: 'totalPointsFromMinutes',
  pointsFromBonus: 'totalPointsFromBonus',
  pointsFromSaves: 'totalPointsFromSaves',
  pointsFromGoalsConceded: 'totalPointsFromGoalsConceded',
  pointsFromYellowCards: 'totalPointsFromYellowCards',
  pointsFromRedCards: 'totalPointsFromRedCards',
};

export default function PlayerTotalPoints() {
  const { defaultWeeks } = useProjectionSettings();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();
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
    // Fallback to localStorage (check both possible keys)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fpl-manager-id') || localStorage.getItem('fplManagerId') || null;
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

  const [fixtureMode, setFixtureMode] = useState<'base' | 'custom' | 'expert'>('base');
  const [tbcAssignments, setTbcAssignments] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem('fpl-tbc-assignments') || '{}'); } catch { return {}; }
  });
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
  
  // Gameweek selection state (empty = show all; non-empty = show only selected)
  const [selectedGameweeks, setSelectedGameweeks] = useState<Set<number>>(new Set());
  
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
  
  // Filter section collapse state - open by default
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
  
  // Get last finished gameweek
  const lastFinishedGW = useMemo(() => {
    if (!bootstrapData?.events) return 0;
    const finishedEvents = bootstrapData.events.filter((e: any) => e.finished);
    return finishedEvents.length > 0 ? Math.max(...finishedEvents.map((e: any) => e.id)) : 0;
  }, [bootstrapData?.events]);

  // Derive short names of teams involved in TBC fixtures (event: null) — must be defined early
  const tbcTeamShortNames = useMemo(() => {
    if (!bootstrapData?.teams || !Array.isArray(fixturesData)) return new Set<string>();
    const names = new Set<string>();
    fixturesData.forEach((fixture: any) => {
      if (!fixture.event) {
        const home = bootstrapData.teams.find((t: any) => t.id === fixture.team_h);
        const away = bootstrapData.teams.find((t: any) => t.id === fixture.team_a);
        if (home) names.add(home.short_name);
        if (away) names.add(away.short_name);
      }
    });
    return names;
  }, [bootstrapData?.teams, fixturesData]);

  // Get available gameweeks for dropdown - different for past vs future
  const availableGameweeks = useMemo(() => {
    if (!bootstrapData?.events) {
      return [];
    }
    if (viewMode === "past") {
      // Past mode: GW1 to last finished gameweek
      return Array.from({ length: lastFinishedGW }, (_, i) => i + 1);
    }
    const gws = getNextGameweeksForDropdown(bootstrapData.events, 12);
    if (fixtureMode === 'base' && tbcTeamShortNames.size > 0 && !gws.includes(39)) gws.push(39);
    return gws;
  }, [bootstrapData?.events, viewMode, lastFinishedGW, fixtureMode, tbcTeamShortNames]);

  // One-time initialization when bootstrap data loads
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const range = getDefaultGameweekRange(bootstrapData.events, defaultWeeks); 
    const start = parseInt(range.startGameweek);
    const end = parseInt(range.endGameweek);
    
    // Validate range
    if (start > 0 && end > 0 && start <= end && end <= 39) {
      setStartGameweek(start);
      setEndGameweek(end);
      setInitialized(true);
    }
  }, [bootstrapData, initialized]);

  // Reset gameweek range when viewMode changes
  useEffect(() => {
    if (!bootstrapData?.events || lastFinishedGW === 0) return;
    
    if (viewMode === "past") {
      // Past mode: default from GW 1 to latest finished gameweek
      const defaultStart = 1;
      setStartGameweek(defaultStart);
      setEndGameweek(lastFinishedGW);
    } else {
      // Future mode: default to next 6 gameweeks
      const range = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setStartGameweek(parseInt(range.startGameweek));
      setEndGameweek(parseInt(range.endGameweek));
    }
  }, [viewMode, bootstrapData?.events, lastFinishedGW]);

  // Auto-extend endGameweek to 39 in base mode when TBC fixture exists
  useEffect(() => {
    if (tbcTeamShortNames.size > 0 && fixtureMode === 'base' && viewMode === 'future') {
      setEndGameweek(39);
    }
  }, [tbcTeamShortNames.size, fixtureMode, viewMode]);

  // Snap endGameweek back from 39 when leaving base mode
  useEffect(() => {
    if (fixtureMode !== 'base' && endGameweek === 39 && bootstrapData?.events) {
      const defaultRange = getDefaultGameweekRange(bootstrapData.events, defaultWeeks);
      setEndGameweek(parseInt(defaultRange.endGameweek));
    }
  }, [fixtureMode, endGameweek, bootstrapData?.events]);

  // Sync tbcAssignments from localStorage when window regains focus or fixtureMode changes
  useEffect(() => {
    const onFocus = () => {
      try {
        const key = fixtureMode === 'expert' ? 'fpl-tbc-expert-assignments' : 'fpl-tbc-assignments';
        setTbcAssignments(JSON.parse(localStorage.getItem(key) || '{}'));
      } catch {}
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fixtureMode]);

  useEffect(() => {
    try {
      const key = fixtureMode === 'expert' ? 'fpl-tbc-expert-assignments' : 'fpl-tbc-assignments';
      setTbcAssignments(JSON.parse(localStorage.getItem(key) || '{}'));
    } catch {}
  }, [fixtureMode]);

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

  // Stable full team short-name list for invert (always all 20, not filtered)
  const allTeamShortNames = useMemo(() => {
    if (!bootstrapData?.teams) return [];
    return bootstrapData.teams.map(t => t.short_name).sort();
  }, [bootstrapData?.teams]);

  // Normalize any team name variant (full or short) to its canonical short name
  const normalizeTeam = (name: string): string => {
    if (!name) return name;
    return teamNameToShortName.get(name) || name;
  };

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

  // fixtureId lookup for TBC fixtures — built from fixturesData (event=null means TBC)
  const tbcFixtureIdMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!fixturesData || !bootstrapData?.teams || !Array.isArray(fixturesData)) return map;
    (fixturesData as any[]).forEach(f => {
      if (f.event !== null && f.event !== undefined) return;
      const home = (bootstrapData.teams as any[]).find(t => t.id === f.team_h);
      const away = (bootstrapData.teams as any[]).find(t => t.id === f.team_a);
      if (home) map.set(home.short_name, f.id);
      if (away) map.set(away.short_name, f.id);
    });
    return map;
  }, [fixturesData, bootstrapData?.teams]);

  // Opponent + home/away info for TBC fixtures — used by showOpponent in the GW39 TBC column
  const tbcTeamInfoMap = useMemo(() => {
    const map = new Map<string, { opponent: string; isHome: boolean }>();
    if (!fixturesData || !bootstrapData?.teams || !Array.isArray(fixturesData)) return map;
    (fixturesData as any[]).forEach(f => {
      if (f.event !== null && f.event !== undefined) return;
      const home = (bootstrapData.teams as any[]).find(t => t.id === f.team_h);
      const away = (bootstrapData.teams as any[]).find(t => t.id === f.team_a);
      if (home && away) {
        map.set(home.short_name, { opponent: away.short_name, isHome: true });
        map.set(away.short_name, { opponent: home.short_name, isHome: false });
      }
    });
    return map;
  }, [fixturesData, bootstrapData?.teams]);

  // In base mode: show GW39 column for all TBC teams.
  // In custom mode: hide GW39 column for teams whose fixture has been assigned to a GW in range.
  // In expert mode: GW39 is always moved to GW36, so never show the column.
  const effectiveTbcTeamShortNames = useMemo(() => {
    if (fixtureMode === 'expert') return new Set<string>();
    if (fixtureMode === 'custom') {
      const startGW = startGameweek ?? 0;
      const endGW = endGameweek ?? 39;
      const unassigned = new Set<string>();
      tbcTeamShortNames.forEach(teamShort => {
        const fixtureId = tbcFixtureIdMap.get(teamShort);
        if (fixtureId === undefined) { unassigned.add(teamShort); return; }
        const assigned = tbcAssignments[fixtureId];
        if (assigned === undefined || assigned === null || assigned < startGW || assigned > endGW) {
          unassigned.add(teamShort);
        }
      });
      return unassigned;
    }
    return tbcTeamShortNames;
  }, [fixtureMode, tbcTeamShortNames, tbcFixtureIdMap, tbcAssignments, startGameweek, endGameweek]);

  // Show the GW39 TBC column only when GW39 is in range and not filtered out by the user
  const showTBCColumn = useMemo(() => (
    endGameweek !== null && endGameweek >= 39 &&
    (selectedGameweeks.size === 0 || selectedGameweeks.has(39)) &&
    viewMode === 'future' &&
    effectiveTbcTeamShortNames.size > 0
  ), [endGameweek, selectedGameweeks, viewMode, effectiveTbcTeamShortNames]);

  // Fetch from the DB-backed cached endpoint — populated at startup, no heavy pipeline on page load.
  // TanStack Query does NOT refetch when the user changes the GW filter (instant client-side filtering).
  const { data: fullRangeData, isLoading: fullRangeLoading, error: fullRangeError, refetch: refetchFullRange } = useQuery<PlayerTotalPointsData[]>({
    queryKey: ["/api/cached/player-total-points"],
    queryFn: async () => {
      const res = await fetch(`/api/cached/player-total-points`);
      if (!res.ok) throw new Error('Failed to fetch player total points');
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 min — matches server-side in-memory cache TTL
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

  // Apply GW range filter to full-range data client-side — consistent per-GW values regardless of filter
  const totalPointsData = useMemo(() => {
    if (!fullRangeData || fullRangeData.length === 0) return null;
    if (!startGameweek || !endGameweek) return null;

    const samplePlayer = fullRangeData[0];
    const hasValidData = (samplePlayer.name || samplePlayer.playerName) &&
      samplePlayer.totalExpectedPoints !== undefined;
    if (!hasValidData) return null;

    // Always include GW39 data so tbcAdjustedData can move it into an assigned GW,
    // but only COUNT it in the total when the user's selected range already includes GW39.
    const effectiveEndGW = (tbcTeamShortNames.size > 0 && viewMode === 'future')
      ? Math.max(endGameweek, 39)
      : endGameweek;

    return fullRangeData.map(player => {
      const filtered: { [key: string]: number } = {};
      const gwProjections = (player.gameweekProjections || {}) as { [key: string]: number };

      for (let gw = startGameweek; gw <= effectiveEndGW; gw++) {
        if (selectedGameweeks.size > 0 && !selectedGameweeks.has(gw)) continue;
        const key = gw.toString();
        if (key in gwProjections) {
          filtered[key] = gwProjections[key];
        }
      }

      // Total and averages only count GWs within the user's selected range (not the extended GW39)
      const userRangeKeys = Object.keys(filtered).filter(k => parseInt(k) <= endGameweek);
      const newTotal = userRangeKeys.reduce((s, k) => s + (filtered[k] || 0), 0);
      const numGWs = userRangeKeys.length || 1;
      const playerPrice = player.price || 0;

      const componentOverrides: { [key: string]: any } = {};
      for (const compKey of GW_COMPONENT_KEYS) {
        const gwMap = (player as any)[compKey] as { [key: string]: number } | undefined;
        if (!gwMap) continue;
        const filteredComp: { [key: string]: number } = {};
        for (let gw = startGameweek; gw <= effectiveEndGW; gw++) {
          if (selectedGameweeks.size > 0 && !selectedGameweeks.has(gw)) continue;
          const key = gw.toString();
          if (key in gwMap) filteredComp[key] = gwMap[key];
        }
        componentOverrides[compKey] = filteredComp;
        const totalKey = TOTAL_COMPONENT_KEYS[compKey];
        if (totalKey) {
          // Component total only counts user's selected range, not the extended GW39
          componentOverrides[totalKey] = Object.entries(filteredComp)
            .filter(([k]) => parseInt(k) <= endGameweek)
            .reduce((s, [, v]) => s + v, 0);
        }
      }

      return {
        ...player,
        ...componentOverrides,
        gameweekProjections: filtered,
        totalExpectedPoints: newTotal,
        averagePerGameweek: newTotal / numGWs,
        averageValue: playerPrice > 0 ? newTotal / playerPrice : 0,
      };
    });
  }, [fullRangeData, startGameweek, endGameweek, selectedGameweeks, tbcTeamShortNames, viewMode]);

  // Recalculate player data based on excluded point components
  const adjustedPlayerData = useMemo((): PlayerTotalPointsData[] | null => {
    if (!totalPointsData) return null;
    const playerData = totalPointsData as PlayerTotalPointsData[];
    
    if (excludedComponents.size === 0) return playerData;
    
    return playerData.map(player => {
      const gwKeys = Object.keys(player.gameweekProjections || {});
      
      const newGwProjections: { [key: string]: number } = {};
      gwKeys.forEach(gwKey => { newGwProjections[gwKey] = 0; });
      
      POINT_COMPONENTS.forEach(component => {
        if (!excludedComponents.has(component.key)) {
          const gwData = (player as any)[component.gwKey] as { [key: string]: number } | undefined;
          if (gwData) {
            gwKeys.forEach(gwKey => {
              newGwProjections[gwKey] += gwData[gwKey] || 0;
            });
          }
        }
      });
      
      const newTotal = Object.values(newGwProjections).reduce((sum, val) => sum + val, 0);
      const numGameweeks = gwKeys.length || 1;
      const newAverage = newTotal / numGameweeks;
      const playerPrice = player.price || 0;
      const newAverageValue = playerPrice > 0 ? newTotal / playerPrice : 0;
      
      return {
        ...player,
        totalExpectedPoints: newTotal,
        gameweekProjections: newGwProjections,
        averagePerGameweek: newAverage,
        averageValue: newAverageValue,
      };
    });
  }, [totalPointsData, excludedComponents, POINT_COMPONENTS]);

  // Loading state — single source of truth is the live full-range fetch
  const isLoading = useMemo(() => {
    if (viewMode === "past") return historyLoading;
    if (fullRangeLoading) return true;
    if (!fullRangeData && !fullRangeError) return true;
    return false;
  }, [viewMode, historyLoading, fullRangeLoading, fullRangeData, fullRangeError]);

  // Error handling — live full-range source
  const error = useMemo(() => {
    if (fullRangeError && !fullRangeData) return fullRangeError;
    return null;
  }, [fullRangeError, fullRangeData]);

  const handleRefreshData = async () => {
    console.log('🔄 Total Points refresh button clicked!');
    setIsRefreshing(true);
    console.log('🔄 isRefreshing set to true');
    try {
      // Add a minimum delay to make spinner visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Invalidate all total points related queries
      console.log('🔄 Invalidating total points queries...');
      await queryClient.invalidateQueries({ queryKey: ["/api/player-total-points/full-range"] });
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes("/api/player-total-points");
        }
      });
      
      // Force refetch full-range data
      console.log('🔄 Refetching total points data...');
      await refetchFullRange();
      console.log('🔄 Total points refresh completed!');
    } finally {
      setIsRefreshing(false);
      console.log('🔄 isRefreshing set to false');
    }
  };

  // Toggle gameweek selection (select to include filter)
  const toggleGameweekSelection = (gw: number) => {
    setSelectedGameweeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gw)) {
        newSet.delete(gw);
      } else {
        newSet.add(gw);
      }
      return newSet;
    });
  };

  // Clear all gameweek selections (show all)
  const clearGameweekSelections = () => {
    setSelectedGameweeks(new Set());
  };

  // Display data - transforms history data to match projection format for past mode
  const displayData = useMemo(() => {
    if (viewMode === "future") {
      return adjustedPlayerData;
    }
    
    // Past mode - transform history data to match projection format
    if (!historyData?.players || !startGameweek || !endGameweek) return null;

    const hasComponentFilter = excludedComponents.size > 0;

    // Inline helpers for component-level point calculation from raw stats
    const getGoalPts = (et: number) => et === 1 || et === 2 ? 6 : et === 3 ? 5 : 4;
    const getCSPts = (et: number) => et === 1 || et === 2 ? 4 : et === 3 ? 1 : 0;
    const getGCPenalty = (et: number, conceded: number) => (et === 1 || et === 2) ? Math.floor(conceded / 2) * -1 : 0;
    
    return historyData.players.map(player => {
      // Calculate totals for selected range
      let rangeTotal = 0;
      let rangeMinutes = 0;
      let rangeGamesPlayed = 0;
      const gameweekProjections: { [gw: string]: number } = {};
      
      for (let gw = startGameweek; gw <= endGameweek; gw++) {
        const mins = player.gameweekMinutes?.[gw] || 0;
        let pts: number;

        if (hasComponentFilter) {
          const gwStats = player.gameweekStats?.[gw.toString()];
          if (gwStats) {
            const et = player.elementType;
            pts = 0;
            // Always include non-filterable items
            pts += gwStats.ownGoals * -2;
            pts += gwStats.penaltiesSaved * 5;
            pts += gwStats.penaltiesMissed * -2;
            // Include each filterable component only if not excluded
            if (!excludedComponents.has('minutes')) pts += gwStats.minutes >= 60 ? 2 : gwStats.minutes > 0 ? 1 : 0;
            if (!excludedComponents.has('goals')) pts += gwStats.goals * getGoalPts(et);
            if (!excludedComponents.has('assists')) pts += gwStats.assists * 3;
            if (!excludedComponents.has('cleanSheets')) pts += gwStats.cleanSheets * getCSPts(et);
            if (!excludedComponents.has('goalsConceded')) pts += getGCPenalty(et, gwStats.goalsConceded);
            if (!excludedComponents.has('saves')) pts += et === 1 ? Math.floor(gwStats.saves / 3) : 0;
            if (!excludedComponents.has('yellowCards')) pts += gwStats.yellowCards * -1;
            if (!excludedComponents.has('redCards')) pts += gwStats.redCards * -3;
            if (!excludedComponents.has('bonus')) pts += gwStats.bonus;
            // 'defensiveContributions' is not tracked in historical FPL data — always 0
          } else {
            pts = player.gameweekPoints[gw] || 0;
          }
        } else {
          pts = player.gameweekPoints[gw] || 0;
        }

        gameweekProjections[gw] = pts;
        rangeTotal += pts;
        rangeMinutes += mins;
        if (mins > 0) rangeGamesPlayed++;
      }
      
      const avgPointsPerGame = rangeGamesPlayed > 0 ? rangeTotal / rangeGamesPlayed : 0;
      // Value = Total Points / Price (points per million spent)
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
    }).filter(p => p.totalExpectedPoints > 0 || hasComponentFilter);
  }, [viewMode, adjustedPlayerData, historyData, startGameweek, endGameweek, excludedComponents]);

  // Generate full gameweek range (for toggle display)
  const fullGameweekRange = useMemo(() => {
    if (!startGameweek || !endGameweek) return [];
    const range = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      range.push(gw);
    }
    return range;
  }, [startGameweek, endGameweek]);

  // Generate active gameweek range for table headers (filtered to selected ones if any)
  const gameweekRange = useMemo(() => {
    return selectedGameweeks.size > 0
      ? fullGameweekRange.filter(gw => selectedGameweeks.has(gw))
      : fullGameweekRange;
  }, [fullGameweekRange, selectedGameweeks]);

  // In base mode: GW39 is already a proper projected column from the backend — no adjustments needed.
  // In custom/expert mode: move real GW39 points (and per-component breakdowns) to the assigned GW
  // so sorting/totals reflect the user's planning choice.
  const tbcAdjustedData = useMemo((): PlayerTotalPointsData[] | null => {
    if (!displayData || viewMode !== "future" || fixtureMode === 'base') return displayData;
    const startGW = startGameweek ?? 0;
    const endGW = endGameweek ?? 39;
    return displayData.map(player => {
      const playerTeamShort = (teamNameToShortName?.get((player as any).teamName || player.team)) || (player as any).teamShort || '';
      if (!tbcTeamShortNames.has(playerTeamShort)) return player;

      const gw39Points = player.gameweekProjections?.['39'] || 0;
      if (gw39Points === 0) return player;

      let assignedGW: number;
      if (fixtureMode === 'expert') {
        assignedGW = 36;
      } else {
        const fixtureId = tbcFixtureIdMap.get(playerTeamShort);
        if (fixtureId === undefined) return player;
        const raw = tbcAssignments[fixtureId];
        if (raw === undefined || raw === null || raw < startGW || raw > endGW) {
          // TBC not assigned to a GW within the display range.
          // totalExpectedPoints already excludes GW39 (computed in totalPointsData),
          // so just zero out GW39 from the per-GW map to keep data tidy.
          if (gw39Points === 0) return player;
          return {
            ...player,
            gameweekProjections: { ...player.gameweekProjections, '39': 0 },
          };
        }
        assignedGW = raw;
      }

      if (selectedGameweeks.size > 0 && !selectedGameweeks.has(assignedGW)) return player;

      const gwKey = assignedGW.toString();
      const existing = player.gameweekProjections?.[gwKey] || 0;
      const newGameweekProjections = {
        ...player.gameweekProjections,
        '39': 0,
        [gwKey]: existing + gw39Points,
      };

      // Move per-component breakdowns from GW39 to assigned GW
      // Also add GW39's component values to the running totals (they were excluded from the base total)
      const compMoveKeys = [
        'pointsFromGoals', 'pointsFromAssists', 'pointsFromCleanSheets',
        'pointsFromDefensiveContributions', 'pointsFromMinutes', 'pointsFromBonus',
        'pointsFromSaves', 'pointsFromGoalsConceded', 'pointsFromYellowCards', 'pointsFromRedCards',
      ];
      const compTotalKeyMap: Record<string, string> = {
        pointsFromGoals: 'totalPointsFromGoals', pointsFromAssists: 'totalPointsFromAssists',
        pointsFromCleanSheets: 'totalPointsFromCleanSheets', pointsFromDefensiveContributions: 'totalPointsFromDefensiveContributions',
        pointsFromMinutes: 'totalPointsFromMinutes', pointsFromBonus: 'totalPointsFromBonus',
        pointsFromSaves: 'totalPointsFromSaves', pointsFromGoalsConceded: 'totalPointsFromGoalsConceded',
        pointsFromYellowCards: 'totalPointsFromYellowCards', pointsFromRedCards: 'totalPointsFromRedCards',
      };
      const newComponents: Record<string, any> = {};
      compMoveKeys.forEach(key => {
        const compMap = (player as any)[key] as Record<string, number> | undefined;
        if (!compMap) return;
        const gw39Val = compMap['39'] || 0;
        const existingVal = compMap[gwKey] || 0;
        newComponents[key] = { ...compMap, '39': 0, [gwKey]: existingVal + gw39Val };
        // Add GW39's component contribution to the running total
        const totalKey = compTotalKeyMap[key];
        if (totalKey) newComponents[totalKey] = ((player as any)[totalKey] || 0) + gw39Val;
      });

      // Merge GW39 fixture details into the assigned GW (creates a virtual DGW)
      const gw39Fixtures = ((player as any).fixtureDetails?.['39'] || []) as FixtureDetail[];
      const existingFixtures = ((player as any).fixtureDetails?.[gwKey] || []) as FixtureDetail[];
      const newFixtureDetails = {
        ...((player as any).fixtureDetails || {}),
        '39': [],
        [gwKey]: [...existingFixtures, ...gw39Fixtures],
      };

      // Add GW39 points to the total (they were excluded from the base totalExpectedPoints)
      const newTotal = (player.totalExpectedPoints || 0) + gw39Points;
      const numGWsVisible = Object.keys(newGameweekProjections).filter(k => parseInt(k) <= endGW).length || 1;

      return {
        ...player,
        gameweekProjections: newGameweekProjections,
        fixtureDetails: newFixtureDetails,
        ...newComponents,
        totalExpectedPoints: newTotal,
        averagePerGameweek: newTotal / numGWsVisible,
        averageValue: (player.price || 0) > 0 ? newTotal / (player.price || 1) : 0,
      };
    });
  }, [displayData, viewMode, fixtureMode, tbcTeamShortNames, tbcFixtureIdMap, tbcAssignments, startGameweek, endGameweek, selectedGameweeks, teamNameToShortName]);

  // Get unique teams and positions for filters — normalize to short names to avoid duplicates
  const teams = useMemo(() => {
    if (!displayData) return [];
    return Array.from(new Set(displayData.map(p => normalizeTeam(p.team))))
      .filter(Boolean)
      .sort();
  }, [displayData, teamNameToShortName]);

  const positions = useMemo(() => {
    // Always show all 4 FPL positions regardless of what's in the data
    return ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
  }, []);

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
    if (!tbcAdjustedData) return [];
    
    let filtered = tbcAdjustedData.filter(player => {
      // Position filter — include semantics: non-empty set = show only those positions
      if (selectedPositions.size > 0) {
        const normalizedPos = normalizePosition(player.position);
        const included = Array.from(selectedPositions).some(sel => normalizePosition(sel) === normalizedPos);
        if (!included) return false;
      }
      // Team filter — include semantics: non-empty set = show only those teams
      if (selectedTeams.size > 0 && !selectedTeams.has(normalizeTeam(player.team))) return false;
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
  }, [tbcAdjustedData, selectedPositions, selectedTeams, searchTerm, selectedLoadGroup, selectedAvailability, sortField, sortDirection, myTeamPlayerIds]);

  // Compute empty message based on filter state
  const emptyMessage = useMemo(() => {
    if (selectedLoadGroup === "My Team") {
      if (!savedManagerId) {
        return "To view your team, please search for your Manager ID in My Dashboard first.";
      }
      if (myTeamPlayerIds.size === 0) {
        return "Loading your team data... If this persists, please search for your Manager ID in My Dashboard.";
      }
    }
    return "No players found matching your criteria";
  }, [selectedLoadGroup, savedManagerId, myTeamPlayerIds]);

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
      <div className="w-full py-4 sm:py-8">
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
            title={viewMode === "future" ? "Updating Player Projections" : "Loading Past GW Points"}
            description={viewMode === "future" ? "Recalculating player points for the selected gameweek range..." : "Fetching actual points from past gameweeks..."}
            steps={[
              { text: "Fetching updated player data", delay: "0s" },
              { text: viewMode === "future" ? "Calculating projected points" : "Loading actual points", delay: "0.2s" },
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
                <h1>Player Points</h1>
              </div>
              <p className="fpl-page-subtitle">
                FPL points across all scoring components: goals, assists, clean sheets, minutes, saves, goals conceded, cards, defensive contributions and bonus points
              </p>
            </div>
          </div>

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "past" | "future")} className="mb-6">
            <TabsList className="w-full">
              <TabsTrigger value="future" className="flex items-center gap-1.5 flex-1">
                <Calendar className="h-4 w-4" />
                Points Projections
              </TabsTrigger>
              <TabsTrigger value="past" className="flex items-center gap-1.5 flex-1">
                <History className="h-4 w-4" />
                Points History
              </TabsTrigger>
            </TabsList>
          </Tabs>

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
            <div className="p-3 sm:p-4">
              {/* Compact selects — 2-col on mobile, 4-col on sm+ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">From GW</Label>
                  <Select value={startGameweek?.toString() || ''} onValueChange={(value) => setStartGameweek(parseInt(value))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      {availableGameweeks.map(gw => (
                        <SelectItem key={gw} value={gw.toString()} className="text-xs">GW{gw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">To GW</Label>
                  <Select value={endGameweek?.toString() || ''} onValueChange={(value) => setEndGameweek(parseInt(value))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      {availableGameweeks.filter(gw => !startGameweek || gw >= startGameweek).map(gw => (
                        <SelectItem key={gw} value={gw.toString()} className="text-xs">GW{gw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">Avail.</Label>
                  <Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="all" className="text-xs">All</SelectItem>
                      <SelectItem value="available" className="text-xs">Available</SelectItem>
                      <SelectItem value="partial" className="text-xs">Partial</SelectItem>
                      <SelectItem value="unavailable" className="text-xs">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">Group</Label>
                  <Select value={selectedLoadGroup} onValueChange={setSelectedLoadGroup}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="all" className="text-xs">All</SelectItem>
                      <SelectItem value="My Team" className="text-xs">My Team</SelectItem>
                      <SelectItem value="Top 50" className="text-xs">Top 50</SelectItem>
                      <SelectItem value="Value 50" className="text-xs">Value 50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search players or teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs pl-8"
                />
              </div>

              {/* Tabbed toggle sections */}
              <Tabs defaultValue="gws" className="w-full">
                <TabsList className="w-full grid grid-cols-4 mb-2 h-auto p-1 bg-white shadow-sm border border-gray-100">
                  <TabsTrigger value="gws" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                    <span className="sm:hidden">GWs</span><span className="hidden sm:inline">Gameweek</span>{selectedGameweeks.size > 0 && ` (${selectedGameweeks.size})`}
                  </TabsTrigger>
                  <TabsTrigger value="pos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                    <span className="sm:hidden">Pos</span><span className="hidden sm:inline">Position</span>{selectedPositions.size > 0 && ` (${selectedPositions.size})`}
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                    Teams{selectedTeams.size > 0 && ` (${selectedTeams.size})`}
                  </TabsTrigger>
                  <TabsTrigger value="pts" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md py-1.5 font-medium transition-all duration-200 text-xs">
                    <span className="sm:hidden">Pts</span><span className="hidden sm:inline">Scoring</span>{excludedComponents.size > 0 && ` (${excludedComponents.size})`}
                  </TabsTrigger>
                </TabsList>

                {/* GWs tab */}
                <TabsContent value="gws" className="mt-0">
                  <div className="flex justify-end gap-1 mb-1">
                    <button onClick={clearGameweekSelections} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300" data-testid="button-clear-gw-selections">All</button>
                    <button onClick={() => setSelectedGameweeks(prev => new Set(fullGameweekRange.filter(gw => !prev.has(gw))))} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-orange-50 text-orange-700 border-orange-300" data-testid="button-invert-gameweeks">Invert</button>
                  </div>
                  <div className="flex flex-wrap gap-0.5 sm:gap-1">
                    {fullGameweekRange.map(gw => {
                      const isActive = selectedGameweeks.size === 0 || selectedGameweeks.has(gw);
                      return (
                        <button
                          key={gw}
                          onClick={() => toggleGameweekSelection(gw)}
                          className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}
                          data-testid={`button-toggle-gw-${gw}`}
                        >
                          GW{gw}
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Position tab */}
                <TabsContent value="pos" className="mt-0">
                  <div className="flex justify-end gap-1 mb-1">
                    <button onClick={() => setSelectedPositions(new Set())} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300" data-testid="button-include-all-positions">All</button>
                    <button onClick={() => setSelectedPositions(prev => new Set(positions.filter(p => !prev.has(p))))} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-orange-50 text-orange-700 border-orange-300" data-testid="button-invert-positions">Invert</button>
                  </div>
                  <div className="flex flex-wrap gap-0.5 sm:gap-1">
                    {positions.map(position => {
                      const isActive = selectedPositions.size === 0 || selectedPositions.has(position);
                      const shortForm = position === 'Goalkeeper' ? 'GKP' : position === 'Defender' ? 'DEF' : position === 'Midfielder' ? 'MID' : 'FWD';
                      return (
                        <button
                          key={position}
                          onClick={() => togglePositionSelection(position)}
                          className={`rounded-full border text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? 'bg-teal-100 text-teal-700 border-teal-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}
                          data-testid={`button-toggle-position-${position}`}
                        >
                          {shortForm}
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Teams tab */}
                <TabsContent value="teams" className="mt-0">
                  <div className="flex justify-end gap-1 mb-1">
                    <button onClick={() => setSelectedTeams(new Set())} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300" data-testid="button-include-all-teams">All</button>
                    <button onClick={() => setSelectedTeams(prev => new Set(allTeamShortNames.filter(t => !prev.has(t))))} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-orange-50 text-orange-700 border-orange-300" data-testid="button-invert-teams">Invert</button>
                  </div>
                  <div className="flex flex-wrap gap-0.5 sm:gap-1">
                    {teams.map(team => {
                      const isActive = selectedTeams.size === 0 || selectedTeams.has(team);
                      const shortName = teamNameToShortName.get(team) || team;
                      return (
                        <button
                          key={team}
                          onClick={() => toggleTeamSelection(team)}
                          className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isActive ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-100 text-gray-400 border-gray-300'}`}
                          data-testid={`button-toggle-team-${team}`}
                        >
                          {shortName}
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Point components tab */}
                <TabsContent value="pts" className="mt-0">
                  <div className="flex justify-end gap-1 mb-1">
                    <button onClick={includeAllComponents} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-green-50 text-green-700 border-green-300" data-testid="button-include-all-components">All</button>
                    <button onClick={() => setExcludedComponents(prev => new Set(POINT_COMPONENTS.map(c => c.key).filter(k => !prev.has(k))))} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-orange-50 text-orange-700 border-orange-300" data-testid="button-invert-components">Invert</button>
                    <button onClick={excludeAllComponents} className="rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer bg-red-50 text-red-700 border-red-300" data-testid="button-exclude-all-components">None</button>
                  </div>
                  <div className="flex flex-wrap gap-0.5 sm:gap-1">
                    {POINT_COMPONENTS.map(component => {
                      const isExcluded = excludedComponents.has(component.key);
                      return (
                        <button
                          key={component.key}
                          onClick={() => toggleComponentExclusion(component.key)}
                          className={`rounded-full border text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-px sm:py-0.5 leading-none cursor-pointer transition-colors ${isExcluded ? 'bg-gray-100 text-gray-400 line-through border-gray-300' : 'bg-blue-100 text-blue-700 border-blue-300'}`}
                          data-testid={`button-toggle-component-${component.key}`}
                        >
                          {component.label}
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Fixture Mode Toggle — only when TBC fixtures exist and in future mode */}
          {viewMode === "future" && tbcTeamShortNames.size > 0 && (
            <div className="flex justify-center mb-4">
              <div className="inline-flex rounded-lg border bg-gray-100 p-0.5 gap-0">
                <button
                  onClick={() => setFixtureMode('base')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${fixtureMode === 'base' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >Base Fixtures</button>
                {(() => { try { return Object.keys(JSON.parse(localStorage.getItem('fpl-tbc-assignments') || '{}')).length > 0; } catch { return false; } })() && (
                  <button
                    onClick={() => setFixtureMode('custom')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${fixtureMode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                  >My Fixtures</button>
                )}
                <button
                  onClick={() => setFixtureMode('expert')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${fixtureMode === 'expert' ? 'bg-amber-100 text-amber-900 shadow-sm border border-amber-300' : 'text-gray-500 hover:text-gray-800'}`}
                >Expert Fixtures</button>
              </div>
              <a href="/fixtures" className="ml-2 self-center text-xs text-blue-600 hover:underline flex-shrink-0">⚙ Edit fixtures</a>
            </div>
          )}

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
                    <h2 className="fpl-card-title">
                      <span className="hidden sm:inline">{viewMode === "future" ? "Player Points Projections" : "Player Points History"}: GW{startGameweek}-GW{endGameweek}</span>
                      <span className="sm:hidden">{viewMode === "future" ? "Projections" : "History"}: GW{startGameweek}-{endGameweek}</span>
                    </h2>
                    {selectedGameweeks.size > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {selectedGameweeks.size} GW{selectedGameweeks.size === 1 ? '' : 's'} selected
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowOpponent(!showOpponent)}
                      className={`inline-flex items-center gap-1 rounded border text-xs font-medium px-2.5 py-1.5 cursor-pointer transition-colors ${showOpponent ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
                      data-testid="button-toggle-opponent"
                    >
                      <Users className="h-3.5 w-3.5" />
                      {showOpponent ? 'Hide Opp' : 'Show Opp'}
                    </button>
                    <Button
                      onClick={handleRefreshData}
                      disabled={isRefreshing}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5"
                      data-testid="button-refresh-data"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
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
                      gameweekRange.filter(gw => gw < 39), 
                      handleSort, 
                      maxPointsPerGameweek,
                      teamNameToShortName,
                      playerIdToWebName,
                      opponentMap,
                      showOpponent,
                      excludedComponents,
                      myTeamPlayerIds,
                      viewMode,
                      isMobile,
                      showTBCColumn ? effectiveTbcTeamShortNames : new Set<string>(),
                      tbcTeamInfoMap
                    )}
                    onSort={handleSort}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    loading={isLoading}
                    emptyMessage={emptyMessage}
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

      </div>
    </div>
  );
}