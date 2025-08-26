#!/usr/bin/env tsx
/**
 * Production Database Seeding Script
 * 
 * This script seeds the production database with content creators.
 * Run with: npm run seed:production
 */

import { db } from "../server/db";
import { fplContentCreators } from "../shared/schema";

const CONTENT_CREATORS = [
  { name: "Let's Talk FPL", handle: "@LetsTalk_FPL", platform: "youtube", teamId: 44, description: "Popular YouTube channel known for team reveals and draft advice." },
  { name: "FPL Focal", handle: "@FPLFocal", platform: "twitter", teamId: 1964, description: "Data-driven content creator; finished around 4k last season." },
  { name: "FPL Harry", handle: "@FPL_Harry", platform: "youtube", teamId: 2524, description: "Engaging podcaster and streamer; often excels early in seasons." },
  { name: "FPL Raptor", handle: "@FPL__Raptor", platform: "youtube", teamId: 76, description: "Analytical YouTuber with strong community engagement." },
  { name: "FPL Pickle", handle: "@FPLPickle", platform: "twitter", teamId: 5080, description: "Humorous FPL content with tips and memes." },
  { name: "FPL Mate", handle: "@FPLMate", platform: "twitter", teamId: 89, description: "Meme-focused creator active in FPL discussions." },
  { name: "Ben Crellin", handle: "@BenCrellin", platform: "twitter", teamId: 64, description: "Fixture ticker expert; creates essential spreadsheets for planning." },
  { name: "Az Phillips", handle: "@AzPhillipsFPL", platform: "twitter", teamId: 2833, description: "Insightful analyst and podcaster." },
  { name: "Kelly Somers", handle: "@KellySomers", platform: "twitter", teamId: 3, description: "Official FPL Podcast host; provides expert insights." },
  { name: "Julien Laurens", handle: "@LaurensJulien", platform: "twitter", teamId: 1379, description: "ESPN pundit sharing occasional FPL tips." },
  { name: "Sam Bonfield", handle: "@samfpl", platform: "twitter", teamId: 260, description: "FPL Podcast regular; family-oriented content." },
  { name: "Lee Bonfield", handle: "@FPLFamily", platform: "twitter", teamId: 41, description: "Co-host of FPL Family Podcast." },
  { name: "Holly Shand", handle: "@HollyShand", platform: "twitter", teamId: 35, description: "Writer and podcaster focused on women's football and FPL." },
  { name: "Ian Irving", handle: "@IanIrving_", platform: "twitter", teamId: 1328, description: "Podcast contributor with in-depth analysis." },
  { name: "FPL Sonaldo", handle: "@FPLSonaldo", platform: "twitter", teamId: 6896, description: "Humorous takes on FPL; active in community leagues." },
  { name: "FPL Pras", handle: "@Pras_fpl", platform: "twitter", teamId: 1349, description: "Podcaster on The FPL Wire; data-focused strategies." },
  { name: "Gianni Buttice", handle: "@GianniButtice", platform: "twitter", teamId: 9176, description: "Data-driven FPL analysis and tools." },
  { name: "BigMan Bakar", handle: "@BigManBakar", platform: "twitter", teamId: 397, description: "High-ranking player sharing advanced tactics." },
  { name: "Yelena", handle: "@FPL_Yelena", platform: "twitter", teamId: 251, description: "Rising creator with consistent top ranks." },
  { name: "Stormzy", handle: "@Stormzy", platform: "twitter", teamId: 698910, description: "Celebrity musician and FPL enthusiast." },
  { name: "Chunkz", handle: "@Chunkz", platform: "youtube", teamId: 8061, description: "YouTuber and influencer with entertaining FPL content." },
  { name: "Lateriser12", handle: "@Lateriser", platform: "twitter", teamId: 1122, description: "Co-host of The FPL Wire podcast; multiple top 200 finishes and elite FPL veteran." },
  { name: "FPL General (Mark McGettigan)", handle: "@FPLGeneral", platform: "twitter", teamId: 6969, description: "Popular podcaster and FPL expert with consistent advice on transfers and strategies." },
  { name: "Abdul Rehman (FPL Salah)", handle: "@FPL_Salah", platform: "twitter", teamId: 1301, description: "Top FPL manager with multiple top 1k finishes; contributor to The Athletic and FPL shows." },
  { name: "Zophar", handle: "@ZopharFPL", platform: "twitter", teamId: 5149, description: "Co-host of The FPL Wire podcast; 8x top 10k finishes, best rank 17th overall." }
];

async function seedProductionDatabase() {
  try {
    console.log("🚀 Starting production database seeding...");
    
    // Check existing content creators
    const existing = await db.select().from(fplContentCreators);
    console.log(`📊 Found ${existing.length} existing content creators`);
    
    if (existing.length >= 24) {
      console.log("✅ Content creators already fully seeded!");
      process.exit(0);
    }
    
    console.log("📝 Inserting content creators...");
    let inserted = 0;
    
    for (const creator of CONTENT_CREATORS) {
      try {
        // Check if this creator already exists
        const existingCreator = existing.find(c => c.managerId === creator.teamId);
        if (existingCreator) {
          console.log(`⏭️  Skipping ${creator.name} (already exists)`);
          continue;
        }
        
        await db.insert(fplContentCreators).values({
          name: creator.name,
          handle: creator.handle,
          platform: creator.platform,
          managerId: creator.teamId,
          managerName: creator.name,
          description: creator.description
        });
        
        console.log(`✅ Inserted: ${creator.name}`);
        inserted++;
      } catch (error) {
        console.error(`❌ Failed to insert ${creator.name}:`, error);
      }
    }
    
    console.log(`🎉 Production seeding completed! Inserted ${inserted} new creators.`);
    
    // Verify final count
    const final = await db.select().from(fplContentCreators);
    console.log(`📊 Final count: ${final.length} content creators`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Production seeding failed:", error);
    process.exit(1);
  }
}

// Run the seeding
seedProductionDatabase();