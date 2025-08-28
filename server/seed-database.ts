import { db } from "./db";
import { fplContentCreators } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface ContentCreatorSeed {
  id: number;
  name: string;
  handle: string;
  platform: string;
  managerId: number;
  description: string;
}

const CONTENT_CREATORS_SEED: ContentCreatorSeed[] = [
  {
    id: 1,
    name: "Let's Talk FPL",
    handle: "@LetsTalk_FPL",
    platform: "youtube",
    managerId: 44,
    description: "Popular YouTube channel known for team reveals and draft advice."
  },
  {
    id: 2,
    name: "FPL Focal",
    handle: "@FPLFocal",
    platform: "twitter",
    managerId: 200,
    description: "Data-driven content creator."
  },
  {
    id: 3,
    name: "FPL Harry",
    handle: "@FPL_Harry",
    platform: "youtube",
    managerId: 1320,
    description: "Engaging podcaster and streamer."
  },
  {
    id: 4,
    name: "FPL Raptor",
    handle: "@FPL__Raptor",
    platform: "youtube",
    managerId: 1587,
    description: "Analytical YouTuber with strong community engagement."
  },
  {
    id: 5,
    name: "FPL Pickle",
    handle: "@FPLPickle",
    platform: "twitter",
    managerId: 14501,
    description: "Humorous FPL content with tips and memes."
  },
  {
    id: 6,
    name: "FPL Mate",
    handle: "@FPLMate",
    platform: "twitter",
    managerId: 16267,
    description: "Meme-focused creator active in FPL discussions."
  },
  {
    id: 7,
    name: "Ben Crellin",
    handle: "@BenCrellin",
    platform: "twitter",
    managerId: 6586,
    description: "Fixture ticker expert; creates essential spreadsheets for planning."
  },
  {
    id: 8,
    name: "Az Phillips",
    handle: "@AzPhillipsFPL",
    platform: "twitter",
    managerId: 441,
    description: "Insightful analyst and podcaster on FPL BlackBox."
  },
  {
    id: 9,
    name: "Kelly Somers",
    handle: "@KellySomers",
    platform: "twitter",
    managerId: 1924811,
    description: "Official FPL Podcast host; provides expert insights."
  },
  {
    id: 10,
    name: "Julien Laurens",
    handle: "@LaurensJulien",
    platform: "twitter",
    managerId: 1514450,
    description: "ESPN pundit sharing occasional FPL tips."
  },
  {
    id: 11,
    name: "Sam Bonfield",
    handle: "@samfpl",
    platform: "twitter",
    managerId: 260,
    description: "FPL Podcast regular; family-oriented content."
  },
  {
    id: 12,
    name: "Lee Bonfield",
    handle: "@FPLFamily",
    platform: "twitter",
    managerId: 341,
    description: "Co-host of FPL Family Podcast."
  },
  {
    id: 13,
    name: "Holly Shand",
    handle: "@HollyShand",
    platform: "twitter",
    managerId: 135,
    description: "Writer and podcaster focused on women's football and FPL."
  },
  {
    id: 14,
    name: "Ian Irving",
    handle: "@IanIrving_",
    platform: "twitter",
    managerId: 7577129,
    description: "Podcast contributor with in-depth analysis."
  },
  {
    id: 15,
    name: "FPL Sonaldo",
    handle: "@FPLSonaldo",
    platform: "twitter",
    managerId: 16725,
    description: "Humorous takes on FPL; active in community leagues."
  },
  {
    id: 16,
    name: "FPL Pras",
    handle: "@Pras_fpl",
    platform: "twitter",
    managerId: 2570,
    description: "Podcaster on The FPL Wire; data-focused strategies."
  },
  {
    id: 17,
    name: "Gianni Buttice",
    handle: "@GianniButtice",
    platform: "twitter",
    managerId: 17614,
    description: "Data-driven FPL analysis and tools."
  },
  {
    id: 18,
    name: "BigMan Bakar",
    handle: "@BigManBakar",
    platform: "twitter",
    managerId: 963,
    description: "Shares advanced tactics."
  },
  {
    id: 19,
    name: "Yelena",
    handle: "@FPL_Yelena",
    platform: "twitter",
    managerId: 251,
    description: "Rising creator"
  },
  {
    id: 20,
    name: "Stormzy",
    handle: "@Stormzy",
    platform: "twitter",
    managerId: 698910,
    description: "Celebrity musician and FPL enthusiast."
  },
  {
    id: 21,
    name: "Chunkz",
    handle: "@Chunkz",
    platform: "youtube",
    managerId: 2253812,
    description: "YouTuber and influencer with entertaining FPL content."
  },
  {
    id: 22,
    name: "Lateriser12",
    handle: "@Lateriser",
    platform: "twitter",
    managerId: 5469,
    description: "Co-host of The FPL Wire podcast; multiple top 200 finishes and elite FPL veteran."
  },
  {
    id: 23,
    name: "FPL General (Mark McGettigan)",
    handle: "@FPLGeneral",
    platform: "twitter",
    managerId: 6969,
    description: "Popular podcaster and FPL expert with consistent advice on transfers and strategies."
  },
  {
    id: 24,
    name: "Abdul Rehman (FPL Salah)",
    handle: "@FPL_Salah",
    platform: "twitter",
    managerId: 124,
    description: "Top FPL manager with multiple top 1k finishes; contributor to The Athletic and FPL shows."
  },
  {
    id: 25,
    name: "Zophar",
    handle: "@ZopharFPL",
    platform: "twitter",
    managerId: 5149,
    description: "Co-host of The FPL Wire podcast; 8x top 10k finishes, best rank 17th overall."
  }
];

export async function seedContentCreators(): Promise<void> {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`🌱 Starting content creators seeding... (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Test database connection first
      console.log("🔗 Testing database connection...");
      
      // Ensure the table exists (might not exist in fresh production database)
      console.log("📋 Verifying content creators table...");
      
      // Check if content creators already exist
      const existingCreators = await db.select().from(fplContentCreators);
      console.log(`📊 Found ${existingCreators.length} existing content creators`);
      
      if (existingCreators.length > 0) {
        console.log(`✅ Content creators already seeded (${existingCreators.length} found)`);
        return;
      }
      
      console.log("📝 Seeding content creators data...");
      let successCount = 0;
      let errorCount = 0;
      
      // Insert all content creators with better error handling
      for (const creator of CONTENT_CREATORS_SEED) {
        try {
          await db.insert(fplContentCreators).values({
            name: creator.name,
            handle: creator.handle,
            platform: creator.platform,
            managerId: creator.managerId,
            managerName: creator.name, // Use name as manager name
            description: creator.description
          });
          
          console.log(`✅ Seeded: ${creator.name}`);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to seed ${creator.name}:`, error);
          errorCount++;
        }
      }
      
      console.log(`🎉 Content creators seeding completed! Success: ${successCount}, Errors: ${errorCount}`);
      
      // If we got here without throwing, seeding was successful
      return;
      
    } catch (error) {
      retryCount++;
      console.error(`❌ Content creators seeding failed (attempt ${retryCount}/${maxRetries}):`, error);
      
      if (retryCount >= maxRetries) {
        console.error("❌ Max retry attempts reached. Seeding failed permanently.");
        // Don't throw - let the server start anyway
        return;
      }
      
      // Wait before retrying
      console.log(`⏳ Waiting 2 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}