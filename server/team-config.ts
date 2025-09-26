// Shared team configuration and services to avoid circular dependencies
// This module provides centralized access to team settings and services

// Master Default Team Configuration - Single Source of Truth
export const MASTER_TEAM_DEFAULTS = {
  // Base Settings
  averageBaseXGPerTeamPerGame: 1.5,
  defaultTeamVariance: 0.45,
  defaultExpectedGoalsPerGame: 1.3,
  globalTierMultiplier: 1.25,
  homeAdvantageGoalsMultiplier: 1.12,
  awayFactorGoalsMultiplier: 0.88,
  
  // REMOVED: All tier-based assignments and multipliers
  // Now using dynamic performance-based calculations only
  
  // Context Multipliers
  derbyGoalsMultiplier: 0.87,
  topSixGoalsMultiplier: 1.12,
  relegationBattleGoalsMultiplier: 0.83,
  earlyKickoffGoalsMultiplier: 0.94,
  lateKickoffGoalsMultiplier: 1.07,
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