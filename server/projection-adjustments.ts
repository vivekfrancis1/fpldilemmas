/**
 * Centralized Projection Adjustments Module
 * 
 * This module contains all set piece adjustments and position caps logic
 * to ensure consistency between cached and real-time projections.
 * 
 * All adjustments are pure functions that can be applied during cache generation
 * or real-time calculation.
 */

export interface PlayerAdjustment {
  playerId: number;
  playerName: string;
  position: string;
  penaltyAdjustment: number;
  freekickAdjustment: number;
  cornerAdjustment: number;
  totalGoalAdjustment: number;
  totalAssistAdjustment: number;
}

export interface PositionCaps {
  goalkeeper: number;
  defender: number;
  midfielder: number;
  forward: number;
}

export interface TeamPlayerShare {
  id: number;
  name: string;
  position: string;
  goalShare?: number;
  assistShare?: number;
  projectedGoals?: number;
  projectedAssists?: number;
}

// Default position caps for goal shares
export const DEFAULT_GOAL_SHARE_CAPS: PositionCaps = {
  goalkeeper: 2,    // Max 2% share for GKs
  defender: 10,     // Max 10% share for defenders
  midfielder: 25,   // Max 25% share for midfielders
  forward: 30       // Max 30% share for forwards
};

// Default position caps for assist shares
export const DEFAULT_ASSIST_SHARE_CAPS: PositionCaps = {
  goalkeeper: 2,    // Max 2% share for GKs
  defender: 15,     // Max 15% share for defenders
  midfielder: 30,   // Max 30% share for midfielders
  forward: 25       // Max 25% share for forwards
};

/**
 * Dynamic penalty taker adjustment based on FPL metrics
 * Increased penalty advantage for stronger impact
 */
export function getPenaltyTakerAdjustment(playerId: number, bootstrapData?: any): number {
  if (!bootstrapData?.elements) return 0;
  
  const player = bootstrapData.elements.find((p: any) => p.id === playerId);
  if (!player) return 0;
  
  const penaltyOrder = player.penalties_order || 99;
  
  let adjustment = 0;
  if (penaltyOrder === 1) {
    // Primary penalty taker - INCREASED for stronger penalty advantage
    adjustment = 0.6 + (player.goals_scored || 0) * 0.03; // Base + goals bonus
  } else if (penaltyOrder === 2) {
    // Secondary penalty taker - INCREASED for stronger penalty advantage
    adjustment = 0.3 + (player.goals_scored || 0) * 0.025;
  }
  
  // Cap the adjustment - INCREASED ceiling
  adjustment = Math.min(0.8, Math.max(0, adjustment));
  
  return adjustment;
}

/**
 * Direct freekick taker adjustment for goals (slight goal advantage)
 */
export function getDirectFreekickAdjustment(playerId: number, bootstrapData?: any): number {
  if (!bootstrapData?.elements) return 0;
  
  const player = bootstrapData.elements.find((p: any) => p.id === playerId);
  if (!player) return 0;
  
  const freekickOrder = player.direct_freekicks_order || 99;
  
  let adjustment = 0;
  if (freekickOrder === 1) {
    // Primary direct freekick taker - slight goal advantage
    adjustment = 0.25 + (player.goals_scored || 0) * 0.02;
  } else if (freekickOrder === 2) {
    // Secondary direct freekick taker
    adjustment = 0.15 + (player.goals_scored || 0) * 0.015;
  } else if (freekickOrder === 3) {
    // Tertiary direct freekick taker
    adjustment = 0.1 + (player.goals_scored || 0) * 0.01;
  }
  
  // Cap the adjustment
  adjustment = Math.min(0.4, Math.max(0, adjustment));
  
  return adjustment;
}

/**
 * Corner/indirect freekick taker adjustment for assists (much higher assist share)
 */
export function getCornerFreekickAdjustment(playerId: number, bootstrapData?: any): number {
  if (!bootstrapData?.elements) return 0;
  
  const player = bootstrapData.elements.find((p: any) => p.id === playerId);
  if (!player) return 0;
  
  const cornerOrder = player.corners_and_indirect_freekicks_order || 99;
  
  let adjustment = 0;
  if (cornerOrder === 1) {
    // Primary corner/indirect freekick taker - much higher assist advantage
    adjustment = 0.8 + (player.assists || 0) * 0.04;
  } else if (cornerOrder === 2) {
    // Secondary corner/indirect freekick taker
    adjustment = 0.5 + (player.assists || 0) * 0.03;
  } else if (cornerOrder === 3) {
    // Tertiary corner/indirect freekick taker  
    adjustment = 0.3 + (player.assists || 0) * 0.02;
  }
  
  // Cap the adjustment higher for assists
  adjustment = Math.min(1.2, Math.max(0, adjustment));
  
  return adjustment;
}

/**
 * Get position goal share cap by position name
 */
export function getPositionGoalShareCap(position: string): number {
  switch (position?.toLowerCase()) {
    case 'goalkeeper': return DEFAULT_GOAL_SHARE_CAPS.goalkeeper;
    case 'defender': return DEFAULT_GOAL_SHARE_CAPS.defender;
    case 'midfielder': return DEFAULT_GOAL_SHARE_CAPS.midfielder;
    case 'forward': return DEFAULT_GOAL_SHARE_CAPS.forward;
    default: return 25;
  }
}

/**
 * Get position assist share cap by position name
 */
export function getPositionAssistShareCap(position: string): number {
  switch (position?.toLowerCase()) {
    case 'goalkeeper': return DEFAULT_ASSIST_SHARE_CAPS.goalkeeper;
    case 'defender': return DEFAULT_ASSIST_SHARE_CAPS.defender;
    case 'midfielder': return DEFAULT_ASSIST_SHARE_CAPS.midfielder;
    case 'forward': return DEFAULT_ASSIST_SHARE_CAPS.forward;
    default: return 25;
  }
}

/**
 * Get position cap by element type (FPL position ID)
 */
export function getPositionCapByElementType(elementType: number, type: 'goals' | 'assists'): number {
  const caps = type === 'goals' ? DEFAULT_GOAL_SHARE_CAPS : DEFAULT_ASSIST_SHARE_CAPS;
  
  switch (elementType) {
    case 1: return caps.goalkeeper;  // GKP
    case 2: return caps.defender;    // DEF
    case 3: return caps.midfielder;  // MID
    case 4: return caps.forward;     // FWD
    default: return 25;
  }
}

/**
 * Enforce position caps on team player shares and redistribute excess
 */
export function enforcePositionCaps(
  teamPlayerShares: TeamPlayerShare[],
  type: 'goals' | 'assists' = 'goals',
  debug = false
): TeamPlayerShare[] {
  if (!teamPlayerShares || teamPlayerShares.length === 0) return teamPlayerShares;
  
  const shareProperty = type === 'goals' ? 'goalShare' : 'assistShare';
  const projectionProperty = type === 'goals' ? 'projectedGoals' : 'projectedAssists';
  
  // Apply position caps
  let totalExcess = 0;
  const cappedShares = teamPlayerShares.map(player => {
    const originalShare = player[shareProperty] || 0;
    const positionCap = type === 'goals' 
      ? getPositionGoalShareCap(player.position)
      : getPositionAssistShareCap(player.position);
    
    const cappedShare = Math.min(originalShare, positionCap);
    const excess = originalShare - cappedShare;
    
    if (excess > 0) {
      totalExcess += excess;
      if (debug) {
        console.log(`DEBUG: Capped ${player.name} ${type} share: ${originalShare.toFixed(1)}% → ${cappedShare.toFixed(1)}% (${player.position} cap: ${positionCap}%)`);
      }
    }
    
    return {
      ...player,
      [shareProperty]: cappedShare
    };
  });
  
  // Redistribute excess proportionally among non-capped players
  if (totalExcess > 0) {
    const totalCappedShare = cappedShares.reduce((sum, player) => sum + (player[shareProperty] || 0), 0);
    const redistributionFactor = totalExcess / Math.max(totalCappedShare, 1);
    
    cappedShares.forEach(player => {
      const currentShare = player[shareProperty] || 0;
      const positionCap = type === 'goals' 
        ? getPositionGoalShareCap(player.position)
        : getPositionAssistShareCap(player.position);
      
      // Only redistribute to players who aren't at their cap
      if (currentShare < positionCap) {
        const redistributedShare = currentShare * (1 + redistributionFactor);
        const finalShare = Math.min(redistributedShare, positionCap);
        player[shareProperty] = finalShare;
      }
    });
  }
  
  // Normalize to ensure total = 100%
  const totalShare = cappedShares.reduce((sum, player) => sum + (player[shareProperty] || 0), 0);
  if (totalShare > 0) {
    cappedShares.forEach(player => {
      const normalizedShare = ((player[shareProperty] || 0) / totalShare) * 100;
      player[shareProperty] = Math.round(normalizedShare * 10) / 10;
    });
  }
  
  return cappedShares;
}

/**
 * Apply all adjustments to a player's goal projections
 */
export function applyGoalAdjustments(
  playerId: number, 
  playerName: string,
  baseGoalProjection: number,
  bootstrapData?: any,
  debug = false
): number {
  const penaltyAdj = getPenaltyTakerAdjustment(playerId, bootstrapData);
  const freekickAdj = getDirectFreekickAdjustment(playerId, bootstrapData);
  
  const totalAdjustment = penaltyAdj + freekickAdj;
  const adjustedProjection = baseGoalProjection + totalAdjustment;
  
  if (debug) {
    if (totalAdjustment > 0) {
      const adjustments = [];
      if (penaltyAdj > 0) adjustments.push(`PK +${penaltyAdj.toFixed(2)}`);
      if (freekickAdj > 0) adjustments.push(`FK +${freekickAdj.toFixed(2)}`);
      console.log(`✅ Goal adjustments for ${playerName}: ${adjustments.join(', ')} → +${totalAdjustment.toFixed(2)} xG per 90`);
    } else {
      // Log occasionally to verify function is being called
      const shouldLog = Math.random() < 0.01; // 1% chance
      if (shouldLog) {
        console.log(`📊 Goal adjustment check for ${playerName}: no adjustments (PK: ${penaltyAdj.toFixed(2)}, FK: ${freekickAdj.toFixed(2)})`);
      }
    }
  }
  
  return Math.round(adjustedProjection * 100) / 100;
}

/**
 * Apply all adjustments to a player's assist projections
 */
export function applyAssistAdjustments(
  playerId: number,
  playerName: string, 
  baseAssistProjection: number,
  bootstrapData?: any,
  debug = false
): number {
  const cornerAdj = getCornerFreekickAdjustment(playerId, bootstrapData);
  
  const adjustedProjection = baseAssistProjection + cornerAdj;
  
  if (debug && cornerAdj > 0) {
    console.log(`DEBUG: Assist adjustments for ${playerName}: Corner/FK +${cornerAdj.toFixed(2)} → +${cornerAdj.toFixed(2)} xA per 90`);
  }
  
  return Math.round(adjustedProjection * 100) / 100;
}

/**
 * Centralized function to apply all adjustments to player projections
 */
export function applyAllAdjustmentsToPlayerProjections(
  playerData: {
    playerId: number;
    playerName: string;
    position: string;
    goalProjections?: Record<string, number>;
    assistProjections?: Record<string, number>;
  },
  bootstrapData?: any,
  debug = false
): {
  goalProjections: Record<string, number>;
  assistProjections: Record<string, number>;
  adjustmentSummary: PlayerAdjustment;
} {
  const penaltyAdj = getPenaltyTakerAdjustment(playerData.playerId, bootstrapData);
  const freekickAdj = getDirectFreekickAdjustment(playerData.playerId, bootstrapData);
  const cornerAdj = getCornerFreekickAdjustment(playerData.playerId, bootstrapData);
  
  const totalGoalAdjustment = penaltyAdj + freekickAdj;
  const totalAssistAdjustment = cornerAdj;
  
  // Apply adjustments to goal projections
  const adjustedGoalProjections: Record<string, number> = {};
  if (playerData.goalProjections) {
    Object.entries(playerData.goalProjections).forEach(([gameweek, projection]) => {
      adjustedGoalProjections[gameweek] = Math.round((projection + totalGoalAdjustment) * 100) / 100;
    });
  }
  
  // Apply adjustments to assist projections
  const adjustedAssistProjections: Record<string, number> = {};
  if (playerData.assistProjections) {
    Object.entries(playerData.assistProjections).forEach(([gameweek, projection]) => {
      adjustedAssistProjections[gameweek] = Math.round((projection + totalAssistAdjustment) * 100) / 100;
    });
  }
  
  const adjustmentSummary: PlayerAdjustment = {
    playerId: playerData.playerId,
    playerName: playerData.playerName,
    position: playerData.position,
    penaltyAdjustment: penaltyAdj,
    freekickAdjustment: freekickAdj,
    cornerAdjustment: cornerAdj,
    totalGoalAdjustment,
    totalAssistAdjustment
  };
  
  if (debug && (totalGoalAdjustment > 0 || totalAssistAdjustment > 0)) {
    const adjustments = [];
    if (penaltyAdj > 0) adjustments.push(`PK +${penaltyAdj.toFixed(2)} xG`);
    if (freekickAdj > 0) adjustments.push(`FK +${freekickAdj.toFixed(2)} xG`);
    if (cornerAdj > 0) adjustments.push(`Corner +${cornerAdj.toFixed(2)} xA`);
    console.log(`DEBUG: Applied adjustments to ${playerData.playerName}: ${adjustments.join(', ')}`);
  }
  
  return {
    goalProjections: adjustedGoalProjections,
    assistProjections: adjustedAssistProjections,
    adjustmentSummary
  };
}

/**
 * Utility function to get player name for debugging
 */
export function getPlayerNameForDebug(playerId: number, bootstrapData?: any): string {
  if (!bootstrapData?.elements) return `Player ${playerId}`;
  
  const player = bootstrapData.elements.find((p: any) => p.id === playerId);
  if (!player) return `Player ${playerId}`;
  
  return `${player.first_name} ${player.second_name}`.trim() || player.web_name || `Player ${playerId}`;
}