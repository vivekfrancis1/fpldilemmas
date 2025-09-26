import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Calendar, Filter, Search, ChevronDown, ChevronUp, Target, Info, Zap, Shield, Swords, Timer, Users, RefreshCw, UserPlus, Heart, AlertTriangle, XCircle, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold cursor-help transition-colors hover:opacity-80 ${statusBg} ${statusBorder} border shadow-sm`}>
          <StatusIcon className={`h-3 w-3 ${statusColor}`} />
          <span className={statusColor}>
            {chanceOfPlaying}%
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 bg-white shadow-xl border border-gray-200 z-50">
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
      </TooltipContent>
    </Tooltip>
  );
}

// Availability Adjustment Helpers for Frontend
function parseReturnDate(newsText: string): Date | null {
  if (!newsText) return null;
  
  // Try multiple patterns for different date formats
  const patterns = [
    // "Expected back 18 Oct", "Return date 25 Nov", "Due back 03 Dec", "Suspended until 25 Oct"
    /(?:expected back|return date|due back|back|suspended until)\s+(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    // "Expected back October 25", "Due back November 18", "Suspended until October 25"
    /(?:expected back|return date|due back|back|suspended until)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
    // "Expected back 25th October", "Due back 18th November"
    /(?:expected back|return date|due back|back)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    // "October 25", "November 18" (simple format)
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
    // "25 October", "18 November" (day first)
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i
  ];
  
  const monthMap: { [key: string]: number } = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, 
    apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8, 
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
  };
  
  for (const pattern of patterns) {
    const match = newsText.match(pattern);
    if (match) {
      let day: number;
      let monthStr: string;
      
      // Handle different match group arrangements
      if (pattern.source.includes('(\\d{1,2}).*?(january|february')) {
        // Pattern 3: "25th October"
        day = parseInt(match[1]);
        monthStr = match[2].toLowerCase();
      } else if (pattern.source.includes('(january|february.*?(\\d{1,2})')) {
        // Pattern 2: "October 25"
        monthStr = match[1].toLowerCase();
        day = parseInt(match[2]);
      } else if (match[1] && match[2]) {
        // Handle both day-first and month-first patterns
        const first = match[1];
        const second = match[2];
        
        if (isNaN(parseInt(first))) {
          // First part is month name
          monthStr = first.toLowerCase();
          day = parseInt(second);
        } else {
          // First part is day number
          day = parseInt(first);
          monthStr = second.toLowerCase();
        }
      } else {
        continue;
      }
      
      const month = monthMap[monthStr];
      if (month === undefined) continue;
      
      // Use current year, but if month is before current month, use next year
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      const year = month < currentMonth ? currentYear + 1 : currentYear;
      
      return new Date(year, month, day);
    }
  }
  
  return null;
}

function getGameweekFromDate(date: Date, bootstrapData: BootstrapData): number | null {
  if (!bootstrapData?.events) return null;
  
  for (const event of bootstrapData.events) {
    const deadlineDate = new Date(event.deadline_time);
    // If the return date is before this gameweek's deadline, player could be available
    if (date <= deadlineDate) {
      return event.id;
    }
  }
  
  return null; // Date is beyond all gameweeks
}

function applyAvailabilityAdjustments(
  player: PlayerTotalPointsData,
  bootstrapData: BootstrapData,
  currentGameweek: number
): PlayerTotalPointsData {
  const chanceOfPlaying = player.chanceOfPlayingNextRound ?? 100;
  const status = player.status || 'a';
  const news = player.news || '';
  
  // Apply availability adjustments based on player status
  
  // If fully available, no adjustments needed
  if (chanceOfPlaying >= 100 && status === 'a') {
    return player;
  }
  
  const adjustedPlayer = { ...player };
  const adjustedProjections = { ...player.gameweekProjections };
  const originalProjections = { ...player.gameweekProjections };
  const availabilityAdjustments: { [gameweek: string]: { original: number; adjusted: number; reason: string } } = {};
  
  if (chanceOfPlaying === 0) {
    // 0% availability - suspended or injured
    const returnDate = parseReturnDate(news);
    
    if (returnDate) {
      // Zero out projections for gameweeks before return date
      const returnGameweek = getGameweekFromDate(returnDate, bootstrapData);
      
      Object.keys(adjustedProjections).forEach(gwKey => {
        const gw = parseInt(gwKey);
        if (returnGameweek && gw < returnGameweek) {
          const original = adjustedProjections[gwKey];
          adjustedProjections[gwKey] = 0;
          if (original > 0) {
            availabilityAdjustments[gwKey] = {
              original,
              adjusted: 0,
              reason: `Injured/suspended until GW${returnGameweek}`
            };
          }
        }
      });
    } else {
      // No return date - zero out all projections
      Object.keys(adjustedProjections).forEach(gwKey => {
        const original = adjustedProjections[gwKey];
        adjustedProjections[gwKey] = 0;
        if (original > 0) {
          availabilityAdjustments[gwKey] = {
            original,
            adjusted: 0,
            reason: status === 's' ? 'Suspended' : status === 'i' ? 'Injured' : 'Unavailable'
          };
        }
      });
    }
  } else if (chanceOfPlaying === 25 || chanceOfPlaying === 50 || chanceOfPlaying === 75) {
    // Partial availability - multiply next gameweek only
    const nextGameweek = (currentGameweek + 1).toString();
    if (adjustedProjections[nextGameweek] !== undefined) {
      const multiplier = chanceOfPlaying / 100;
      const original = adjustedProjections[nextGameweek];
      adjustedProjections[nextGameweek] = adjustedProjections[nextGameweek] * multiplier;
      
      if (original !== adjustedProjections[nextGameweek]) {
        availabilityAdjustments[nextGameweek] = {
          original,
          adjusted: adjustedProjections[nextGameweek],
          reason: `${chanceOfPlaying}% chance of playing`
        };
      }
    }
  }
  
  // Recalculate totals and averages after adjustments
  const gameweekCount = Object.keys(adjustedProjections).length;
  const newTotalExpectedPoints = Object.values(adjustedProjections).reduce((sum, points) => sum + points, 0);
  const newAveragePerGameweek = gameweekCount > 0 ? newTotalExpectedPoints / gameweekCount : 0;
  const newAverageValue = player.price > 0 ? newAveragePerGameweek / player.price : 0;
  
  adjustedPlayer.gameweekProjections = adjustedProjections;
  adjustedPlayer.originalGameweekProjections = originalProjections;
  adjustedPlayer.availabilityAdjustments = availabilityAdjustments;
  adjustedPlayer.totalExpectedPoints = Math.round(newTotalExpectedPoints * 100) / 100;
  adjustedPlayer.averagePerGameweek = Math.round(newAveragePerGameweek * 100) / 100;
  adjustedPlayer.averageValue = Math.round(newAverageValue * 100) / 100;
  
  return adjustedPlayer;
}

import { EnhancedTable, PlayerNameCell, TeamBadge, PositionBadge, ValueCell, type TableColumn } from "@/components/enhanced-table";
import PlayerProjectionsComparisonModal from "@/components/player-projections-comparison-modal";

// Gameweek Point Breakdown Tooltip Component
function GameweekPointBreakdownTooltip({ player, gameweek }: { player: PlayerTotalPointsData, gameweek: number }) {
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
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button className="cursor-help hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2 relative">
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
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm p-4 bg-white shadow-xl border border-gray-200 z-50">
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
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚽ Goals:</span>
              <ValueCell 
                value={player.pointsFromGoals?.[gwKey] || 0} 
                format="points" 
                decimals={2} 
                className="text-green-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🎯 Assists:</span>
              <ValueCell 
                value={player.pointsFromAssists?.[gwKey] || 0} 
                format="points" 
                decimals={2} 
                className="text-blue-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🛡️ Clean Sheets:</span>
              <ValueCell 
                value={player.pointsFromCleanSheets?.[gwKey] || 0} 
                format="points" 
                decimals={2} 
                className="text-yellow-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚔️ Defensive:</span>
              <ValueCell 
                value={player.pointsFromDefensiveContributions?.[gwKey] || 0} 
                format="points" 
                decimals={2} 
                className="text-orange-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⏱️ Minutes:</span>
              <ValueCell 
                value={player.pointsFromMinutes?.[gwKey] || 0} 
                format="points" 
                decimals={2} 
                className="text-purple-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">✨ Bonus:</span>
              <ValueCell 
                value={player.pointsFromBonus?.[gwKey] || 0} 
                format="points" 
                decimals={2} 
                className="text-pink-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🥅 Saves:</span>
              <ValueCell 
                value={player.pointsFromSaves?.[gwKey] || 0} 
                format="points" 
                decimals={2} 
                className="text-cyan-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🚪 Goals Conceded:</span>
              <ValueCell 
                value={player.pointsFromGoalsConceded?.[gwKey] || 0} 
                format="points" 
                decimals={2} 
                className="text-red-600"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🟨 Yellow Cards:</span>
              <ValueCell 
                value={player.pointsFromYellowCards?.[gwKey] || 0} 
                format="points" 
                decimals={2} 
                className="text-yellow-600"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🟥 Red Cards:</span>
              <ValueCell 
                value={player.pointsFromRedCards?.[gwKey] || 0} 
                format="points" 
                decimals={2} 
                className="text-red-700"
                fontWeight="medium"
              />
            </div>
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
      </TooltipContent>
    </Tooltip>
  );
}

// Range Total Point Breakdown Tooltip Component
function RangeTotalBreakdownTooltip({ player }: { player: PlayerTotalPointsData }) {
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

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button className="cursor-help hover:opacity-80 transition-colors bg-transparent border-0 p-0 underline decoration-dotted underline-offset-2">
          <ValueCell 
            value={player.totalExpectedPoints || 0} 
            format="points" 
            decimals={2} 
            className="text-green-800"
            fontWeight="bold"
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm p-4 bg-white shadow-xl border border-gray-200 z-50">
        <div className="space-y-2">
          <div className="font-semibold text-gray-900 border-b pb-2 mb-3">
            {player.name} - 6GW Total Breakdown
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚽ Goals:</span>
              <ValueCell 
                value={player.totalPointsFromGoals || 0} 
                format="points" 
                decimals={2} 
                className="text-green-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🎯 Assists:</span>
              <ValueCell 
                value={player.totalPointsFromAssists || 0} 
                format="points" 
                decimals={2} 
                className="text-blue-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🛡️ Clean Sheets:</span>
              <ValueCell 
                value={player.totalPointsFromCleanSheets || 0} 
                format="points" 
                decimals={2} 
                className="text-yellow-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⚔️ Defensive:</span>
              <ValueCell 
                value={player.totalPointsFromDefensiveContributions || 0} 
                format="points" 
                decimals={2} 
                className="text-orange-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">⏱️ Minutes:</span>
              <ValueCell 
                value={player.totalPointsFromMinutes || 0} 
                format="points" 
                decimals={2} 
                className="text-purple-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">✨ Bonus:</span>
              <ValueCell 
                value={player.totalPointsFromBonus || 0} 
                format="points" 
                decimals={2} 
                className="text-pink-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🥅 Saves:</span>
              <ValueCell 
                value={player.totalPointsFromSaves || 0} 
                format="points" 
                decimals={2} 
                className="text-cyan-700"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🚪 Goals Conceded:</span>
              <ValueCell 
                value={player.totalPointsFromGoalsConceded || 0} 
                format="points" 
                decimals={2} 
                className="text-red-600"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🟨 Yellow Cards:</span>
              <ValueCell 
                value={player.totalPointsFromYellowCards || 0} 
                format="points" 
                decimals={2} 
                className="text-yellow-600"
                fontWeight="medium"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🟥 Red Cards:</span>
              <ValueCell 
                value={player.totalPointsFromRedCards || 0} 
                format="points" 
                decimals={2} 
                className="text-red-700"
                fontWeight="medium"
              />
            </div>
          </div>
          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span className="text-gray-800">6GW Total:</span>
              <ValueCell 
                value={player.totalExpectedPoints || 0} 
                format="points" 
                decimals={2} 
                className="text-green-800"
                fontWeight="semibold"
              />
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
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
  onPlayerCompareClick?: (player: PlayerTotalPointsData) => void,
  compareList?: PlayerTotalPointsData[],
  maxCompareReached?: boolean
): TableColumn<PlayerTotalPointsData>[] {
  return [
    {
      key: 'name',
      header: 'Player',
      sortable: true,
      className: 'sticky left-0 bg-white z-10 min-w-[200px]',
      render: (_, player) => (
        <div className="flex items-center gap-2 min-w-[200px]">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <PlayerNameCell name={player.playerName || player.name} />
              <PlayerAvailabilityBadge player={player} />
            </div>
            <div className="flex items-center gap-1 mt-1 mb-1">
              <PositionBadge position={player.position} compact={true} />
              <TeamBadge team={player.teamName || player.team} compact={true} />
            </div>
            <div className="text-xs text-gray-500 space-x-2">
              <span className="font-medium">£{(typeof player.price === 'number') ? player.price.toFixed(1) : '0.0'}m</span>
              <span className="text-gray-400">•</span>
              <span>{(typeof player.ownership === 'number') ? player.ownership.toFixed(1) : '0.0'}%</span>
            </div>
          </div>
          {onPlayerCompareClick && (
            <div className="flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onPlayerCompareClick(player)}
                disabled={maxCompareReached && !compareList?.some(p => (p.playerId || p.id) === (player.playerId || player.id))}
                className={`h-8 w-8 p-0 hover:bg-blue-50 ${
                  compareList?.some(p => (p.playerId || p.id) === (player.playerId || player.id))
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-400 hover:text-blue-600'
                }`}
                data-testid={`button-compare-${player.playerId || player.id}`}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          )}
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
        align: 'center' as const,
        className: 'min-w-[48px] bg-blue-50/30',
        render: (_: any, player: PlayerTotalPointsData) => {
          const playerPoints = player.gameweekProjections?.[numericGwKey] || 0;
          const isMaxForGameweek = playerPoints > 0 && playerPoints === maxPointsForGw;
          
          return (
            <div className={`${isMaxForGameweek ? 'bg-gradient-to-br from-green-100 to-emerald-100 rounded-md p-1' : ''}`}>
              <GameweekPointBreakdownTooltip player={player} gameweek={gw} />
            </div>
          );
        }
      };
    }),
    {
      key: 'totalExpectedPoints',
      header: '6GW Total',
      sortable: true,
      align: 'center',
      className: 'min-w-[100px] bg-gradient-to-r from-green-50 to-emerald-50 border-l-2 border-gray-300',
      render: (_, player) => <RangeTotalBreakdownTooltip player={player} />
    },
    {
      key: 'averagePerGameweek',
      header: 'Avg/GW',
      sortable: true,
      align: 'center',
      className: 'min-w-[90px] bg-gradient-to-r from-orange-50 to-amber-50 border-l border-gray-300',
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
      header: 'Avg Value',
      sortable: true,
      align: 'center',
      className: 'min-w-[90px] bg-gradient-to-r from-purple-50 to-violet-50 border-l border-gray-300',
      render: (value) => (
        <ValueCell 
          value={value || 0} 
          format="number" 
          decimals={2}
          className="font-bold text-purple-800 text-sm"
        />
      )
    },
    {
      key: 'avgMinutesPerGameweek',
      header: 'Avg Mins',
      sortable: true,
      align: 'center',
      className: 'min-w-[80px] bg-gradient-to-r from-blue-50 to-sky-50 border-l border-gray-300',
      render: (value) => (
        <ValueCell 
          value={value || 0} 
          format="number" 
          decimals={0}
          className="font-bold text-blue-800 text-sm"
        />
      )
    }
  ];
}

import { computeCurrentGameweek } from "@shared/gameweek-utils";
import { BootstrapData } from "@shared/schema";

export default function PlayerTotalPoints() {
  const queryClient = useQueryClient();
  
  // Fetch bootstrap data to get current gameweek
  const { data: bootstrapData } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [startGameweek, setStartGameweek] = useState<number | null>(null);
  const [endGameweek, setEndGameweek] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoadGroup, setSelectedLoadGroup] = useState<string>("Top 50");
  const [sortField, setSortField] = useState<SortField>('totalExpectedPoints');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Comparison state
  const [compareList, setCompareList] = useState<PlayerTotalPointsData[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // One-time initialization when bootstrap data loads
  useEffect(() => {
    if (!bootstrapData || initialized) return;
    
    const currentGW = computeCurrentGameweek(bootstrapData.events);
    const nextGW = Math.min((currentGW ?? 5) + 1, 38); // Use current gameweek + 1
    const maxAvailableGW = Math.min(38, nextGW + 11); // Next 12 gameweeks max
    
    // Always start from the next gameweek (future gameweeks only)
    setStartGameweek(nextGW);
    setEndGameweek(Math.min(nextGW + 5, maxAvailableGW)); // Next 6 gameweeks default
    setInitialized(true);
  }, [bootstrapData, initialized]);

  // Calculate current gameweek and upcoming gameweeks
  const currentGameweek = useMemo(() => {
    if (!bootstrapData?.events) return 3; // Default fallback
    const currentEvent = bootstrapData.events.find(e => e.is_current);
    return currentEvent ? currentEvent.id : 3;
  }, [bootstrapData]);

  const nextGameweek = currentGameweek + 1;
  const maxAvailableGW = Math.min(38, nextGameweek + 11); // Next 12 gameweeks max

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
  const { data: cachedTotalPointsData, isLoading: cachedLoading, error: cachedError } = useQuery<PlayerTotalPointsData[]>({
    queryKey: ["/api/cached/player-total-points"],
    staleTime: 60 * 60 * 1000, // 1 hour cache
  });

  const { data: liveTotalPointsData, isLoading: liveLoading, error: liveError } = useQuery<PlayerTotalPointsData[]>({
    queryKey: ["/api/player-total-points", startGameweek, endGameweek],
    queryFn: async () => {
      const response = await fetch(`/api/player-total-points?startGameweek=${startGameweek}&endGameweek=${endGameweek}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch total points: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for live data
    enabled: startGameweek !== null && endGameweek !== null, // Only fetch when gameweek values are initialized
  });

  // Data selection logic - API-first approach with cache fallback for reliability
  const totalPointsData = useMemo(() => {
    let selectedData: PlayerTotalPointsData[] | null = null;
    
    // PRIORITY 1: Use live API data if available and valid (ensures freshest data)
    if (liveTotalPointsData && liveTotalPointsData.length > 0 && !liveError) {
      const samplePlayer = liveTotalPointsData[0];
      
      // Simplified validation - just check for basic required fields
      const hasValidLiveData = (samplePlayer.name || samplePlayer.playerName) && 
        samplePlayer.totalExpectedPoints !== undefined;
      
      if (hasValidLiveData) {
        selectedData = liveTotalPointsData;
      }
    }
    
    // PRIORITY 2: Fall back to cached data if live API fails, is loading, or has errors
    if (!selectedData && cachedTotalPointsData && cachedTotalPointsData.length > 0) {
      const samplePlayer = cachedTotalPointsData[0];
      
      // Simplified validation - just check for basic required fields
      const hasValidCachedData = (samplePlayer.name || samplePlayer.playerName) && 
        samplePlayer.totalExpectedPoints !== undefined;
      
      if (hasValidCachedData) {
        selectedData = cachedTotalPointsData;
      }
    }
    
    // PRIORITY 3: Return null if neither data source is available
    if (!selectedData) {
      return null;
    }
    
    // Apply availability adjustments to all players before returning
    if (bootstrapData && currentGameweek) {
      return selectedData.map(player => 
        applyAvailabilityAdjustments(player, bootstrapData, currentGameweek)
      );
    }
    
    return selectedData;
  }, [liveTotalPointsData, liveError, cachedTotalPointsData, startGameweek, endGameweek, bootstrapData, currentGameweek]);

  // Loading state - API-first loading logic: show loading primarily for live API, fallback to cached loading
  const isLoading = useMemo(() => {
    // PRIORITY 1: Show loading while live API is loading (our primary data source)
    if (liveLoading) return true;
    
    // PRIORITY 2: If live API failed or is unavailable, show loading while cached data loads
    if ((liveError || !liveTotalPointsData) && cachedLoading) return true;
    
    // PRIORITY 3: Show loading if neither data source is available yet
    if (!liveTotalPointsData && !cachedTotalPointsData && !liveError && !cachedError) return true;
    
    return false;
  }, [liveLoading, liveError, liveTotalPointsData, cachedLoading, cachedTotalPointsData, cachedError]);

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
      // Force refetch the current data
      console.log('🔄 Refetching total points data...');
      await queryClient.refetchQueries({ queryKey: ["/api/cached/player-total-points"] });
      console.log('🔄 Total points refresh completed!');
    } finally {
      setIsRefreshing(false);
      console.log('🔄 isRefreshing set to false');
    }
  };

  // Generate gameweek range for table headers
  const gameweekRange = useMemo(() => {
    if (!startGameweek || !endGameweek) return [];
    const range = [];
    for (let gw = startGameweek; gw <= endGameweek; gw++) {
      range.push(gw);
    }
    return range;
  }, [startGameweek, endGameweek]);

  // Get unique teams and positions for filters
  const teams = useMemo(() => {
    if (!totalPointsData) return [];
    return Array.from(new Set(totalPointsData.map(p => p.team))).sort();
  }, [totalPointsData]);

  const positions = useMemo(() => {
    if (!totalPointsData) return [];
    return Array.from(new Set(totalPointsData.map(p => p.position))).sort();
  }, [totalPointsData]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!totalPointsData) return [];
    
    let filtered = totalPointsData.filter(player => {
      if (selectedPosition !== "all" && player.position !== selectedPosition) return false;
      if (selectedTeam !== "all" && player.team !== selectedTeam) return false;
      if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !player.team.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    // Apply Load Group filtering
    if (selectedLoadGroup !== "all") {
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
  }, [totalPointsData, selectedPosition, selectedTeam, searchTerm, selectedLoadGroup, sortField, sortDirection]);

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
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
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
      <div className="fpl-container fpl-content-area fpl-section-spacing">
        <TooltipProvider delayDuration={100} skipDelayDuration={0}>
          {/* Page Header */}
          <div className="fpl-page-header">
            <div className="fpl-page-header-content">
              <div className="fpl-page-title">
                <Target className="h-8 w-8" />
                <h1>Player Total Points</h1>
              </div>
              <p className="fpl-page-subtitle">
                Complete FPL points projection combining all scoring components: goals, assists, clean sheets, minutes, saves, goals conceded, cards, defensive contributions and bonus points
              </p>
              <div className="fpl-page-actions">
                <Button
                  onClick={handleRefreshData}
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border-white/30 text-white disabled:opacity-50"
                  data-testid="button-refresh-data"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
              </div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="fpl-card mb-6">
            <div className="fpl-card-header">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-indigo-600" />
                <h2 className="fpl-card-title">Filters & Controls</h2>
              </div>
            </div>
            <div className="fpl-card-content">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Load Group Filter */}
            <div className="space-y-2">
              <Label htmlFor="load-group-filter" className="text-sm font-medium">Group</Label>
              <Select value={selectedLoadGroup} onValueChange={setSelectedLoadGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="load-group-all" value="all">All Players</SelectItem>
                  <SelectItem key="load-group-top-50" value="Top 50">Top 50</SelectItem>
                  <SelectItem key="load-group-top-50-fwds" value="Top 50 FWDs">Top 50 FWDs</SelectItem>
                  <SelectItem key="load-group-top-50-mids" value="Top 50 MIDs">Top 50 MIDs</SelectItem>
                  <SelectItem key="load-group-top-50-defs" value="Top 50 DEFs">Top 50 DEFs</SelectItem>
                  <SelectItem key="load-group-top-50-gks" value="Top 50 GKs">Top 50 GKs</SelectItem>
                  <SelectItem key="load-group-value-50" value="Value 50">Value 50</SelectItem>
                  <SelectItem key="load-group-value-50-fwds" value="Value 50 FWDs">Value 50 FWDs</SelectItem>
                  <SelectItem key="load-group-value-50-mids" value="Value 50 MIDs">Value 50 MIDs</SelectItem>
                  <SelectItem key="load-group-value-50-defs" value="Value 50 DEFs">Value 50 DEFs</SelectItem>
                  <SelectItem key="load-group-value-50-gks" value="Value 50 GKs">Value 50 GKs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Player or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Position Filter */}
            <div className="space-y-2">
              <Label htmlFor="position-filter" className="text-sm font-medium">Position</Label>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="position-all" value="all">All Positions</SelectItem>
                  {positions.map(position => (
                    <SelectItem key={`position-${position}`} value={position}>{position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Filter */}
            <div className="space-y-2">
              <Label htmlFor="team-filter" className="text-sm font-medium">Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="team-all" value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={`team-${team}`} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gameweek Range */}
            <div className="space-y-2">
              <Label htmlFor="start-gameweek" className="text-sm font-medium">Start GW</Label>
              <Select value={startGameweek?.toString() || ''} onValueChange={(value) => setStartGameweek(parseInt(value) || nextGameweek)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.min(15 - nextGameweek + 1, 12) }, (_, i) => nextGameweek + i).map(gw => (
                    <SelectItem key={`start-gw-${gw}`} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-gameweek" className="text-sm font-medium">End GW</Label>
              <Select value={endGameweek?.toString() || ''} onValueChange={(value) => setEndGameweek(parseInt(value) || nextGameweek + 5)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.min(15 - nextGameweek + 1, 12) }, (_, i) => nextGameweek + i).filter(gw => gw >= (startGameweek || nextGameweek)).map(gw => (
                    <SelectItem key={`end-gw-${gw}`} value={gw.toString()}>GW{gw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedPosition("all");
                  setSelectedTeam("all");
                  setSearchTerm("");
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
              </div>
            </div>
          </div>

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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-indigo-600" />
                    <h2 className="fpl-card-title">Player Total Points (GW{startGameweek}-{endGameweek})</h2>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700">
                    {filteredAndSortedData.length} players
                  </Badge>
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
                      handlePlayerCompareClick, 
                      compareList, 
                      maxCompareReached
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
        </TooltipProvider>

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