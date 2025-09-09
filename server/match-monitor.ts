import { db } from './db';
import { collectionAuditLog } from '@shared/schema';
import { sql } from 'drizzle-orm';

interface FixtureData {
  id: number;
  event: number;
  finished: boolean;
  team_h: number;
  team_a: number;
  kickoff_time: string;
}

class MatchMonitor {
  private isRunning = false;
  private lastCheckedFixtures = new Set<number>();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  private readonly API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://fantasy.premierleague.com/api' 
    : 'http://localhost:5000/api';

  async start() {
    if (this.isRunning) {
      console.log('🔄 Match monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting automated match monitor system');
    
    // Initialize with current fixtures
    await this.initializeFixtures();
    
    // Start monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.checkForCompletedMatches();
    }, this.CHECK_INTERVAL);
    
    console.log(`✅ Match monitor started - checking every ${this.CHECK_INTERVAL / 1000 / 60} minutes`);
  }

  async stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Match monitor stopped');
  }

  private async initializeFixtures() {
    try {
      console.log('📊 Initializing current fixture states...');
      const fixtures = await this.fetchFixtures();
      
      // Store all currently finished fixtures to avoid triggering on restart
      fixtures.forEach(fixture => {
        if (fixture.finished) {
          this.lastCheckedFixtures.add(fixture.id);
        }
      });
      
      const finishedCount = Array.from(this.lastCheckedFixtures).length;
      console.log(`✅ Initialized with ${finishedCount} already finished fixtures`);
    } catch (error) {
      console.error('❌ Failed to initialize fixtures:', error);
    }
  }

  private async fetchFixtures(): Promise<FixtureData[]> {
    const response = await fetch(`${this.API_BASE}/fixtures`);
    if (!response.ok) {
      throw new Error(`Failed to fetch fixtures: ${response.status}`);
    }
    return response.json();
  }

  private async getCurrentGameweek(): Promise<number> {
    try {
      const response = await fetch(`${this.API_BASE}/bootstrap-static`);
      if (!response.ok) throw new Error('Failed to fetch bootstrap data');
      
      const data = await response.json();
      const currentEvent = data.events.find((event: any) => event.is_current);
      return currentEvent?.id || 4; // Fallback to GW4
    } catch (error) {
      console.error('❌ Error fetching current gameweek:', error);
      return 4; // Fallback
    }
  }

  private async checkForCompletedMatches() {
    try {
      console.log('🔍 Checking for newly completed matches...');
      
      const fixtures = await this.fetchFixtures();
      const newlyFinished: FixtureData[] = [];

      // Find fixtures that just finished
      fixtures.forEach(fixture => {
        if (fixture.finished && !this.lastCheckedFixtures.has(fixture.id)) {
          newlyFinished.push(fixture);
          this.lastCheckedFixtures.add(fixture.id);
        }
      });

      if (newlyFinished.length === 0) {
        console.log('ℹ️ No new completed matches found');
        return;
      }

      console.log(`🎯 Found ${newlyFinished.length} newly completed matches:`);
      newlyFinished.forEach(fixture => {
        console.log(`   📅 GW${fixture.event} - Fixture ${fixture.id} (${fixture.team_h} vs ${fixture.team_a})`);
      });

      // Trigger data collection for each affected gameweek
      const gameweeksToUpdate = [...new Set(newlyFinished.map(f => f.event))];
      
      for (const gameweek of gameweeksToUpdate) {
        await this.triggerDataCollection(gameweek);
      }

    } catch (error) {
      console.error('❌ Error checking for completed matches:', error);
    }
  }

  private async triggerDataCollection(gameweek: number) {
    try {
      console.log(`🔄 Triggering data collection for GW${gameweek}...`);
      
      // Use a default manager ID for collection (content creator or system default)
      const defaultManagerId = 577434; // You can change this to any valid manager ID
      
      const response = await fetch(`${this.API_BASE}/collect-league-snapshots/${gameweek}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ managerId: defaultManagerId }),
      });

      if (!response.ok) {
        throw new Error(`Collection API responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Data collection completed for GW${gameweek}:`);
        console.log(`   📊 Total collected: ${result.totalCollected} managers`);
        console.log(`   🏆 Leagues processed: ${result.leaguesProcessed}`);
        console.log(`   📈 Ranking benchmarks updated automatically`);
        
        // Log to database for audit trail
        await this.logCollectionEvent(gameweek, result.totalCollected, result.leaguesProcessed, 'match-completion');
      } else {
        console.warn(`⚠️ Data collection failed for GW${gameweek}:`, result.error);
      }

    } catch (error) {
      console.error(`❌ Failed to trigger data collection for GW${gameweek}:`, error);
      
      // Log failed attempt
      await this.logCollectionEvent(gameweek, 0, 0, 'match-completion-failed');
    }
  }

  private async logCollectionEvent(gameweek: number, totalCollected: number, leaguesProcessed: number, trigger: string) {
    try {
      await db.insert(collectionAuditLog).values({
        gameweek,
        totalCollected,
        leaguesProcessed,
        triggerType: trigger,
        success: totalCollected > 0,
        errorMessage: totalCollected === 0 ? 'No data collected' : null,
      });
    } catch (error) {
      // Ignore logging errors to not break the main flow
      console.warn('⚠️ Failed to log collection event:', error.message);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      trackedFixtures: this.lastCheckedFixtures.size,
      checkInterval: this.CHECK_INTERVAL,
      nextCheck: this.monitoringInterval ? 
        new Date(Date.now() + this.CHECK_INTERVAL).toISOString() : null
    };
  }
}

// Global instance
export const matchMonitor = new MatchMonitor();

// Auto-start on import (in production)
if (process.env.NODE_ENV === 'production') {
  matchMonitor.start().catch(console.error);
}