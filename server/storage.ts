import { type BootstrapData, type PlayerSummary, type PriceAlert, type InsertPriceAlert } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  getBootstrapData(): Promise<BootstrapData | undefined>;
  setBootstrapData(data: BootstrapData): Promise<void>;
  getPlayerSummary(playerId: number): Promise<PlayerSummary | undefined>;
  setPlayerSummary(playerId: number, data: PlayerSummary): Promise<void>;
  
  // Price alert operations
  getPriceAlerts(): Promise<PriceAlert[]>;
  addPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert>;
  deletePriceAlert(id: number): Promise<void>;
  updatePriceAlert(id: number, alert: Partial<InsertPriceAlert>): Promise<PriceAlert>;
  
  // Price change tracking operations (for future implementation)
  getPriceChange(playerId: number, changeAmount: number): Promise<{ playerId: number; changeAmount: number; date: string; } | undefined>;
  setPriceChange(playerId: number, changeAmount: number, date: string): Promise<void>;
  
  // Historical player operations
  getHistoricalPlayers(season: string): Promise<any[]>;
  insertHistoricalPlayers(players: any[]): Promise<void>;
  hasHistoricalData(season: string): Promise<boolean>;
  getSeasons(): Promise<string[]>;
  
  // Manager ID caching operations
  getLastManagerId(): Promise<string | undefined>;
  setLastManagerId(managerId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private bootstrapData: BootstrapData | undefined;
  private playerSummaries: Map<number, PlayerSummary>;
  private priceAlerts: Map<number, PriceAlert>;
  private nextAlertId: number;
  private priceChangeHistory: Map<string, { playerId: number; changeAmount: number; date: string; }>;
  private historicalPlayerCache: Map<string, any[]>;
  private lastManagerId: string | undefined;

  constructor() {
    this.bootstrapData = undefined;
    this.playerSummaries = new Map();
    this.priceAlerts = new Map();
    this.nextAlertId = 1;
    this.priceChangeHistory = new Map();
    this.historicalPlayerCache = new Map();
    this.lastManagerId = undefined;
  }

  async getBootstrapData(): Promise<BootstrapData | undefined> {
    return this.bootstrapData;
  }

  async setBootstrapData(data: BootstrapData): Promise<void> {
    this.bootstrapData = data;
  }

  async getPlayerSummary(playerId: number): Promise<PlayerSummary | undefined> {
    return this.playerSummaries.get(playerId);
  }

  async setPlayerSummary(playerId: number, data: PlayerSummary): Promise<void> {
    this.playerSummaries.set(playerId, data);
  }

  // Price alert operations
  async getPriceAlerts(): Promise<PriceAlert[]> {
    return Array.from(this.priceAlerts.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async addPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert> {
    const id = this.nextAlertId++;
    const priceAlert: PriceAlert = {
      id,
      ...alert,
      alertTriggered: alert.alertTriggered ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.priceAlerts.set(id, priceAlert);
    return priceAlert;
  }

  async deletePriceAlert(id: number): Promise<void> {
    this.priceAlerts.delete(id);
  }

  async updatePriceAlert(id: number, alert: Partial<InsertPriceAlert>): Promise<PriceAlert> {
    const existing = this.priceAlerts.get(id);
    if (!existing) {
      throw new Error(`Price alert with id ${id} not found`);
    }
    const updated: PriceAlert = {
      ...existing,
      ...alert,
      updatedAt: new Date(),
    };
    this.priceAlerts.set(id, updated);
    return updated;
  }

  // Price change tracking operations (for future implementation)
  async getPriceChange(playerId: number, changeAmount: number): Promise<{ playerId: number; changeAmount: number; date: string; } | undefined> {
    const key = `${playerId}-${changeAmount}`;
    return this.priceChangeHistory.get(key);
  }

  async setPriceChange(playerId: number, changeAmount: number, date: string): Promise<void> {
    const key = `${playerId}-${changeAmount}`;
    this.priceChangeHistory.set(key, { playerId, changeAmount, date });
  }

  // Historical player operations
  async getHistoricalPlayers(season: string): Promise<any[]> {
    return this.historicalPlayerCache.get(season) || [];
  }

  async insertHistoricalPlayers(players: any[]): Promise<void> {
    // Group by season
    const playersBySeason: Map<string, any[]> = new Map();
    
    players.forEach(player => {
      const season = player.season;
      if (!playersBySeason.has(season)) {
        playersBySeason.set(season, []);
      }
      playersBySeason.get(season)!.push({
        id: Math.random(), // Generate a temporary ID
        ...player,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Store in cache
    playersBySeason.forEach((seasonPlayers, season) => {
      this.historicalPlayerCache.set(season, seasonPlayers);
    });
  }

  async hasHistoricalData(season: string): Promise<boolean> {
    return this.historicalPlayerCache.has(season) && 
           this.historicalPlayerCache.get(season)!.length > 0;
  }

  async getSeasons(): Promise<string[]> {
    // Return predefined seasons for historical data
    return [
      "2016/17", "2017/18", "2018/19", "2019/20", "2020/21", 
      "2021/22", "2022/23", "2023/24", "2024/25"
    ];
  }

  // Manager ID caching operations
  async getLastManagerId(): Promise<string | undefined> {
    return this.lastManagerId;
  }

  async setLastManagerId(managerId: string): Promise<void> {
    this.lastManagerId = managerId;
  }
}

export class DatabaseStorage implements IStorage {
  private memFallback: MemStorage;

  constructor() {
    this.memFallback = new MemStorage();
  }

  async getBootstrapData(): Promise<BootstrapData | undefined> {
    return this.memFallback.getBootstrapData();
  }

  async setBootstrapData(data: BootstrapData): Promise<void> {
    return this.memFallback.setBootstrapData(data);
  }

  async getPlayerSummary(playerId: number): Promise<PlayerSummary | undefined> {
    return this.memFallback.getPlayerSummary(playerId);
  }

  async setPlayerSummary(playerId: number, data: PlayerSummary): Promise<void> {
    return this.memFallback.setPlayerSummary(playerId, data);
  }

  // Price alert methods (keep using memory for simplicity)
  async getPriceAlerts(): Promise<PriceAlert[]> {
    return this.memFallback.getPriceAlerts();
  }

  async addPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert> {
    return this.memFallback.addPriceAlert(alert);
  }

  async deletePriceAlert(id: number): Promise<void> {
    return this.memFallback.deletePriceAlert(id);
  }

  async updatePriceAlert(id: number, alert: Partial<InsertPriceAlert>): Promise<PriceAlert> {
    return this.memFallback.updatePriceAlert(id, alert);
  }

  async getPriceChange(playerId: number, changeAmount: number): Promise<{ playerId: number; changeAmount: number; date: string; } | undefined> {
    return this.memFallback.getPriceChange(playerId, changeAmount);
  }

  async setPriceChange(playerId: number, changeAmount: number, date: string): Promise<void> {
    return this.memFallback.setPriceChange(playerId, changeAmount, date);
  }

  // Historical player operations using database
  async getHistoricalPlayers(season: string): Promise<any[]> {
    try {
      // For now, use memory fallback since database schema is not defined
      return this.memFallback.getHistoricalPlayers(season);
    } catch (error) {
      // Fallback to memory storage
      console.log(`Database query failed for season ${season}, using memory fallback`);
      return this.memFallback.getHistoricalPlayers(season);
    }
  }

  async insertHistoricalPlayers(players: any[]): Promise<void> {
    try {
      // For now, use memory fallback since database schema is not defined
      await this.memFallback.insertHistoricalPlayers(players);
    } catch (error) {
      // Fallback to memory storage
      console.log("Database insert failed, using memory fallback");
      await this.memFallback.insertHistoricalPlayers(players);
    }
  }

  async hasHistoricalData(season: string): Promise<boolean> {
    try {
      // For now, use memory fallback since database schema is not defined
      return this.memFallback.hasHistoricalData(season);
    } catch (error) {
      // Fallback to memory storage
      return this.memFallback.hasHistoricalData(season);
    }
  }

  async getSeasons(): Promise<string[]> {
    return this.memFallback.getSeasons();
  }

  async getLastManagerId(): Promise<string | undefined> {
    return this.memFallback.getLastManagerId();
  }

  async setLastManagerId(managerId: string): Promise<void> {
    return this.memFallback.setLastManagerId(managerId);
  }
}

export const storage = new MemStorage();