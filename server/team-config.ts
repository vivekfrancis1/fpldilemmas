// Shared team configuration and services to avoid circular dependencies
// This module provides centralized access to team settings and services

// Master Default Team Configuration - Single Source of Truth
//
// Team-ID tier assignments below are derived from the 2025/26 final Premier League
// standings (goals-for for attack tiers, goals-against for defense tiers, ascending)
// among the teams that carried over into the current season, plus the three
// promoted clubs (Hull City, Ipswich Town, Coventry City). These are only consumed
// when adminGoalSettings.calculationMode === 'tiered' — the default 'dynamic' mode
// ignores all tier/context fields below and uses live performance data instead.
// Every value here is editable via the Admin Goal Projections page.
export const MASTER_TEAM_DEFAULTS = {
  // Base Settings
  averageBaseXGPerTeamPerGame: 1.5,
  defaultTeamVariance: 0.45,
  defaultExpectedGoalsPerGame: 1.3,
  globalTierMultiplier: 1.25,
  homeAdvantageGoalsMultiplier: 1.15,
  awayFactorGoalsMultiplier: 0.87,

  // Attacking Tier Multipliers
  eliteAttackMultiplier: 1.35,
  strongAttackMultiplier: 1.15,
  averageAttackMultiplier: 1.00,
  weakAttackMultiplier: 0.85,
  promotedAttackMultiplier: 0.70,

  // Attacking Team Tier Assignments (ranked by 2025/26 goals-for)
  eliteAttackTeams: [15, 1, 16],        // Man City, Arsenal, Man Utd
  strongAttackTeams: [14, 6, 3, 2, 4],  // Liverpool, Chelsea, Bournemouth, Aston Villa, Brentford
  averageAttackTeams: [17, 5, 13, 18, 19], // Newcastle, Brighton, Leeds, Nott'm Forest, Spurs
  weakAttackTeams: [9, 10, 20, 8],      // Everton, Fulham, Sunderland, Crystal Palace
  promotedAttackTeams: [11, 12, 7],     // Hull City, Ipswich Town, Coventry City

  // Defensive Tier Multipliers
  eliteDefenseMultiplier: 0.70,
  strongDefenseMultiplier: 0.85,
  averageDefenseMultiplier: 1.00,
  weakDefenseMultiplier: 1.15,
  promotedDefenseMultiplier: 1.30,

  // Defensive Team Tier Assignments (ranked by 2025/26 goals-against, ascending)
  eliteDefenseTeams: [1, 15, 5],         // Arsenal, Man City, Brighton
  strongDefenseTeams: [20, 2, 16, 9, 10], // Sunderland, Aston Villa, Man Utd, Everton, Fulham
  averageDefenseTeams: [8, 18, 4, 6, 14], // Crystal Palace, Nott'm Forest, Brentford, Chelsea, Liverpool
  weakDefenseTeams: [3, 17, 13, 19],      // Bournemouth, Newcastle, Leeds, Spurs
  promotedDefenseTeams: [11, 12, 7],      // Hull City, Ipswich Town, Coventry City
};

// Admin goal settings - will be set by routes module to avoid circular dependency
let adminGoalSettings: any = null;
let createTeamService: any = null;

// Setters for configuration (called by routes module)
export function setAdminGoalSettings(value: any): void {
  adminGoalSettings = value;
}

export function setCreateTeamService(fn: any): void {
  createTeamService = fn;
}

// Getters for accessing configuration
export function getAdminGoalSettings() {
  if (!adminGoalSettings) {
    throw new Error('Admin goal settings not initialized. Routes module should call setAdminGoalSettings() first.');
  }
  return adminGoalSettings;
}

export function getCreateTeamService() {
  if (!createTeamService) {
    throw new Error('Create team service not initialized. Routes module should call setCreateTeamService() first.');
  }
  return createTeamService;
}

// Cache invalidation utilities
export class TeamConfigCache {
  private static caches = new Map<string, any>();
  
  static set(key: string, value: any): void {
    this.caches.set(key, value);
  }
  
  static get(key: string): any {
    return this.caches.get(key);
  }
  
  static clear(pattern?: string): void {
    if (pattern) {
      const keys = Array.from(this.caches.keys());
      for (const key of keys) {
        if (key.includes(pattern)) {
          this.caches.delete(key);
        }
      }
    } else {
      this.caches.clear();
    }
  }
  
  static clearAll(): void {
    this.caches.clear();
  }
}