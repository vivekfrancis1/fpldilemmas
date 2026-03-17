import { db } from "./db";
import { fplTopManagers, fplContentCreators } from "@shared/schema";
import { storage } from "./storage";
import type { InsertManagerProfile } from "@shared/schema";

async function fetchManagerEntry(managerId: number): Promise<{ entryName: string | null; overallRank: number | null } | null> {
  try {
    const response = await fetch(`https://fantasy.premierleague.com/api/entry/${managerId}/`);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      entryName: data.name || null,
      overallRank: data.summary_overall_rank || null,
    };
  } catch {
    return null;
  }
}

export async function seedManagerProfiles(): Promise<void> {
  console.log("[seed-manager-profiles] Starting...");

  try {
    // Seed from fpl_content_creators (no API call needed)
    const creators = await db.select().from(fplContentCreators);
    if (creators.length > 0) {
      const creatorProfiles: InsertManagerProfile[] = creators.map(c => {
        const parts = (c.playerName || "").split(" ");
        const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : (c.playerName || null);
        const lastName = parts.length > 1 ? parts[parts.length - 1] : null;
        return {
          managerId: c.managerId,
          entryName: c.managerName || null,
          playerFirstName: firstName,
          playerLastName: lastName,
          overallRank: null,
        };
      });
      await storage.bulkUpsertManagerProfiles(creatorProfiles);
      console.log(`[seed-manager-profiles] Seeded ${creatorProfiles.length} content creator profiles`);
    }

    // Seed from fpl_top_managers (fetch each entry from FPL API for team name + rank)
    const topManagers = await db.select().from(fplTopManagers);
    if (topManagers.length > 0) {
      const profiles: InsertManagerProfile[] = [];
      for (const mgr of topManagers) {
        const parts = (mgr.name || "").split(" ");
        const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : (mgr.name || null);
        const lastName = parts.length > 1 ? parts[parts.length - 1] : null;

        const entryData = await fetchManagerEntry(mgr.managerId);
        profiles.push({
          managerId: mgr.managerId,
          entryName: entryData?.entryName || null,
          playerFirstName: firstName,
          playerLastName: lastName,
          overallRank: entryData?.overallRank || null,
        });

        // Small delay to avoid hammering the FPL API
        await new Promise(r => setTimeout(r, 200));
      }
      await storage.bulkUpsertManagerProfiles(profiles);
      console.log(`[seed-manager-profiles] Seeded ${profiles.length} top manager profiles`);
    }

    console.log("[seed-manager-profiles] Done");
  } catch (error) {
    console.error("[seed-manager-profiles] Error:", error);
  }
}
