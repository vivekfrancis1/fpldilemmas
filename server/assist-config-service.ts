import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import {
  assistConfigEliteBoosts,
  assistConfigHistoricalTiers,
  assistConfigCreativityTiers,
  assistConfigPriceTiers,
  assistConfigPositionRates,
  assistConfigGeneral
} from "@shared/schema";
import type {
  AssistConfigEliteBoost,
  InsertAssistConfigEliteBoost,
  AssistConfigHistoricalTier,
  InsertAssistConfigHistoricalTier,
  AssistConfigCreativityTier,
  InsertAssistConfigCreativityTier,
  AssistConfigPriceTier,
  InsertAssistConfigPriceTier,
  AssistConfigPositionRate,
  InsertAssistConfigPositionRate,
  AssistConfigGeneral,
  InsertAssistConfigGeneral
} from "@shared/schema";

/**
 * Service for managing Player Assists configuration
 * Makes all multipliers and parameters configurable through admin interface
 */
export class AssistConfigService {

  /**
   * Initialize default configuration values
   */
  async initializeDefaults(): Promise<void> {
    console.log("🔧 Initializing Player Assists default configuration...");

    try {
      // Initialize Elite Boosts with current conservative values
      const eliteBoosts = await db.select().from(assistConfigEliteBoosts).limit(1);
      if (eliteBoosts.length === 0) {
        const defaultEliteBoosts: InsertAssistConfigEliteBoost[] = [
          // Elite creative midfielders and playmakers
          { playerName: 'Kevin De Bruyne', boostMultiplier: '1.35', position: 'Midfielder', notes: 'Premier League elite creative midfielder' },
          { playerName: 'Bruno Fernandes', boostMultiplier: '1.30', position: 'Midfielder', notes: 'Man United creative focal point' },
          { playerName: 'Martin Ødegaard', boostMultiplier: '1.25', position: 'Midfielder', notes: 'Arsenal creative midfielder' },
          { playerName: 'Cole Palmer', boostMultiplier: '1.30', position: 'Midfielder', notes: 'Chelsea creative talent' },
          { playerName: 'James Maddison', boostMultiplier: '1.20', position: 'Midfielder', notes: 'Tottenham creative midfielder' },
          { playerName: 'Phil Foden', boostMultiplier: '1.20', position: 'Midfielder', notes: 'Man City versatile creator' },
          { playerName: 'Bukayo Saka', boostMultiplier: '1.20', position: 'Midfielder', notes: 'Arsenal creative winger' },
          { playerName: 'Mason Mount', boostMultiplier: '1.15', position: 'Midfielder' },
          { playerName: 'Eberechi Eze', boostMultiplier: '1.15', position: 'Midfielder' },
          { playerName: 'Pascal Groß', boostMultiplier: '1.20', position: 'Midfielder' },
          { playerName: 'Emile Smith Rowe', boostMultiplier: '1.10', position: 'Midfielder' },
          { playerName: 'Jack Grealish', boostMultiplier: '1.10', position: 'Midfielder' },
          // Creative fullbacks and wing-backs
          { playerName: 'Trent Alexander-Arnold', boostMultiplier: '1.30', position: 'Defender', notes: 'Liverpool creative fullback' },
          { playerName: 'Andrew Robertson', boostMultiplier: '1.20', position: 'Defender', notes: 'Liverpool attacking fullback' },
          { playerName: 'Reece James', boostMultiplier: '1.20', position: 'Defender', notes: 'Chelsea attacking fullback' },
          { playerName: 'Ben Chilwell', boostMultiplier: '1.15', position: 'Defender' },
          { playerName: 'Kieran Trippier', boostMultiplier: '1.20', position: 'Defender' },
          { playerName: 'Luke Shaw', boostMultiplier: '1.10', position: 'Defender' },
          { playerName: 'João Cancelo', boostMultiplier: '1.15', position: 'Defender' },
          { playerName: 'Kyle Walker', boostMultiplier: '1.10', position: 'Defender' },
          { playerName: 'Pervis Estupiñán', boostMultiplier: '1.10', position: 'Defender' },
          // Playmaking forwards and wide players
          { playerName: 'Mohamed Salah', boostMultiplier: '1.20', position: 'Forward', notes: 'Liverpool creative forward' },
          { playerName: 'Son Heung-min', boostMultiplier: '1.15', position: 'Forward' },
          { playerName: 'Diogo Jota', boostMultiplier: '1.10', position: 'Forward' },
          { playerName: 'Gabriel Jesus', boostMultiplier: '1.15', position: 'Forward' },
          { playerName: 'Ivan Toney', boostMultiplier: '1.10', position: 'Forward' },
          { playerName: 'Harry Kane', boostMultiplier: '1.15', position: 'Forward' },
          { playerName: 'Ollie Watkins', boostMultiplier: '1.10', position: 'Forward' },
          { playerName: 'Alexander Isak', boostMultiplier: '1.10', position: 'Forward' },
          { playerName: 'Darwin Núñez', boostMultiplier: '1.05', position: 'Forward' },
          // Key creative defenders
          { playerName: 'Virgil van Dijk', boostMultiplier: '1.05', position: 'Defender' },
          { playerName: 'William Saliba', boostMultiplier: '1.02', position: 'Defender' },
          { playerName: 'Gabriel Magalhães', boostMultiplier: '1.02', position: 'Defender' },
          { playerName: 'Thiago Silva', boostMultiplier: '1.05', position: 'Defender' },
          { playerName: 'John Stones', boostMultiplier: '1.02', position: 'Defender' },
          { playerName: 'Rúben Dias', boostMultiplier: '1.02', position: 'Defender' }
        ];
        
        await db.insert(assistConfigEliteBoosts).values(defaultEliteBoosts);
        console.log(`✅ Initialized ${defaultEliteBoosts.length} elite assist boosts`);
      }

      // Initialize Historical Tiers
      const historicalTiers = await db.select().from(assistConfigHistoricalTiers).limit(1);
      if (historicalTiers.length === 0) {
        const defaultHistoricalTiers: InsertAssistConfigHistoricalTier[] = [
          { tierName: 'Elite Historical', minAverageAssists: '6.00', multiplier: '1.20', minSeasonsRequired: 2, minTotalAssists: 8 },
          { tierName: 'Very Good Historical', minAverageAssists: '4.00', multiplier: '1.15', minSeasonsRequired: 2, minTotalAssists: 8 },
          { tierName: 'Good Historical', minAverageAssists: '2.50', multiplier: '1.10', minSeasonsRequired: 2, minTotalAssists: 8 }
        ];
        
        await db.insert(assistConfigHistoricalTiers).values(defaultHistoricalTiers);
        console.log(`✅ Initialized ${defaultHistoricalTiers.length} historical assist tiers`);
      }

      // Initialize Creativity Tiers
      const creativityTiers = await db.select().from(assistConfigCreativityTiers).limit(1);
      if (creativityTiers.length === 0) {
        const defaultCreativityTiers: InsertAssistConfigCreativityTier[] = [
          { tierName: 'Top 50 Creativity', maxRank: 50, multiplier: '1.15' },
          { tierName: 'Top 100 Creativity', maxRank: 100, multiplier: '1.10' },
          { tierName: 'Top 200 Creativity', maxRank: 200, multiplier: '1.05' }
        ];
        
        await db.insert(assistConfigCreativityTiers).values(defaultCreativityTiers);
        console.log(`✅ Initialized ${defaultCreativityTiers.length} creativity tiers`);
      }

      // Initialize Price Tiers
      const priceTiers = await db.select().from(assistConfigPriceTiers).limit(1);
      if (priceTiers.length === 0) {
        const defaultPriceTiers: InsertAssistConfigPriceTier[] = [
          { tierName: 'Premium Players', minCost: 90, multiplier: '1.10' },
          { tierName: 'High-Value Players', minCost: 70, multiplier: '1.05' },
          { tierName: 'Mid-Tier Players', minCost: 50, multiplier: '1.02' }
        ];
        
        await db.insert(assistConfigPriceTiers).values(defaultPriceTiers);
        console.log(`✅ Initialized ${defaultPriceTiers.length} price tiers`);
      }

      // Initialize Position Rates
      const positionRates = await db.select().from(assistConfigPositionRates).limit(1);
      if (positionRates.length === 0) {
        const defaultPositionRates: InsertAssistConfigPositionRate[] = [
          { positionName: 'Goalkeeper', baseRate: '0.20', varianceRate: '0.10', shareCapPercentage: '2.00' },
          { positionName: 'Defender', baseRate: '8.50', varianceRate: '3.00', shareCapPercentage: '12.00' },
          { positionName: 'Midfielder', baseRate: '35.00', varianceRate: '12.00', shareCapPercentage: '28.00' },
          { positionName: 'Forward', baseRate: '18.00', varianceRate: '6.00', shareCapPercentage: '20.00' }
        ];
        
        await db.insert(assistConfigPositionRates).values(defaultPositionRates);
        console.log(`✅ Initialized ${defaultPositionRates.length} position rates`);
      }

      // Initialize General Configuration
      const generalConfig = await db.select().from(assistConfigGeneral).limit(1);
      if (generalConfig.length === 0) {
        const defaultGeneralConfig: InsertAssistConfigGeneral[] = [
          { configKey: 'form_boost_threshold_high', configValue: '6.00', description: 'Form above this gets 1.1x boost', category: 'form' },
          { configKey: 'form_boost_high_multiplier', configValue: '1.10', description: 'Multiplier for high form players', category: 'form' },
          { configKey: 'form_penalty_threshold_low', configValue: '3.00', description: 'Form below this gets 0.9x penalty', category: 'form' },
          { configKey: 'form_penalty_low_multiplier', configValue: '0.90', description: 'Multiplier for low form players', category: 'form' },
          { configKey: 'availability_penalty_threshold', configValue: '75.00', description: 'Availability % below this gets penalty', category: 'availability' },
          { configKey: 'availability_penalty_multiplier', configValue: '0.80', description: 'Multiplier for low availability players', category: 'availability' }
        ];
        
        await db.insert(assistConfigGeneral).values(defaultGeneralConfig);
        console.log(`✅ Initialized ${defaultGeneralConfig.length} general configuration items`);
      }

      console.log("✅ Player Assists configuration initialization completed");

    } catch (error) {
      console.error("❌ Error initializing Player Assists configuration:", error);
      throw error;
    }
  }

  /**
   * Get all configuration data for admin interface
   */
  async getAllConfig() {
    try {
      const [eliteBoosts, historicalTiers, creativityTiers, priceTiers, positionRates, generalConfig] = await Promise.all([
        db.select().from(assistConfigEliteBoosts).where(eq(assistConfigEliteBoosts.isActive, true)).orderBy(assistConfigEliteBoosts.playerName),
        db.select().from(assistConfigHistoricalTiers).where(eq(assistConfigHistoricalTiers.isActive, true)).orderBy(desc(assistConfigHistoricalTiers.minAverageAssists)),
        db.select().from(assistConfigCreativityTiers).where(eq(assistConfigCreativityTiers.isActive, true)).orderBy(assistConfigCreativityTiers.maxRank),
        db.select().from(assistConfigPriceTiers).where(eq(assistConfigPriceTiers.isActive, true)).orderBy(desc(assistConfigPriceTiers.minCost)),
        db.select().from(assistConfigPositionRates).where(eq(assistConfigPositionRates.isActive, true)).orderBy(assistConfigPositionRates.positionName),
        db.select().from(assistConfigGeneral).where(eq(assistConfigGeneral.isActive, true)).orderBy(assistConfigGeneral.category, assistConfigGeneral.configKey)
      ]);

      return {
        eliteBoosts,
        historicalTiers,
        creativityTiers,
        priceTiers,
        positionRates,
        generalConfig
      };
    } catch (error) {
      console.error("Error getting assist configuration:", error);
      throw error;
    }
  }

  /**
   * Update elite boost configuration
   */
  async updateEliteBoost(id: number, data: Partial<InsertAssistConfigEliteBoost>) {
    await db.update(assistConfigEliteBoosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assistConfigEliteBoosts.id, id));
  }

  /**
   * Update historical tier configuration
   */
  async updateHistoricalTier(id: number, data: Partial<InsertAssistConfigHistoricalTier>) {
    await db.update(assistConfigHistoricalTiers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assistConfigHistoricalTiers.id, id));
  }

  /**
   * Update creativity tier configuration
   */
  async updateCreativityTier(id: number, data: Partial<InsertAssistConfigCreativityTier>) {
    await db.update(assistConfigCreativityTiers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assistConfigCreativityTiers.id, id));
  }

  /**
   * Update price tier configuration
   */
  async updatePriceTier(id: number, data: Partial<InsertAssistConfigPriceTier>) {
    await db.update(assistConfigPriceTiers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assistConfigPriceTiers.id, id));
  }

  /**
   * Update position rate configuration
   */
  async updatePositionRate(id: number, data: Partial<InsertAssistConfigPositionRate>) {
    await db.update(assistConfigPositionRates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assistConfigPositionRates.id, id));
  }

  /**
   * Update general configuration
   */
  async updateGeneralConfig(id: number, data: Partial<InsertAssistConfigGeneral>) {
    await db.update(assistConfigGeneral)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assistConfigGeneral.id, id));
  }

  /**
   * Add new elite boost
   */
  async addEliteBoost(data: InsertAssistConfigEliteBoost) {
    await db.insert(assistConfigEliteBoosts).values(data);
  }

  /**
   * Delete elite boost
   */
  async deleteEliteBoost(id: number) {
    await db.update(assistConfigEliteBoosts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(assistConfigEliteBoosts.id, id));
  }
}

export const assistConfigService = new AssistConfigService();