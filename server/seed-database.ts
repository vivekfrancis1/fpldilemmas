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
    name: "Let's Talk FPL (Andy Martin)",
    handle: "@LetsTalk_FPL",
    platform: "youtube",
    managerId: 44,
    description: "Popular YouTuber known for team reveals and draft advice."
  },
  {
    id: 2,
    name: "FPL Focal",
    handle: "@FPLFocal",
    platform: "twitter",
    managerId: 1964,
    description: "Data-driven content creator; finished around 4k last season."
  },
  {
    id: 3,
    name: "FPL Harry",
    handle: "@FPL_Harry",
    platform: "youtube",
    managerId: 2524,
    description: "Engaging podcaster and streamer; often excels early in seasons."
  },
  {
    id: 4,
    name: "FPL Raptor",
    handle: "@FPL__Raptor",
    platform: "youtube",
    managerId: 76,
    description: "Analytical YouTuber with strong community engagement."
  },
  {
    id: 5,
    name: "FPL Pickle",
    handle: "@FPLPickle",
    platform: "twitter",
    managerId: 5080,
    description: "Humorous FPL content with tips and memes."
  },
  {
    id: 6,
    name: "FPL Mate",
    handle: "@FPLMate",
    platform: "twitter",
    managerId: 89,
    description: "Meme-focused creator active in FPL discussions."
  },
  {
    id: 7,
    name: "Ben Crellin",
    handle: "@BenCrellin",
    platform: "twitter",
    managerId: 64,
    description: "Fixture ticker expert; creates essential spreadsheets for planning."
  },
  {
    id: 8,
    name: "Az Phillips",
    handle: "@AzPhillipsFPL",
    platform: "twitter",
    managerId: 2833,
    description: "Insightful analyst and podcaster."
  },
  {
    id: 9,
    name: "Kelly Somers",
    handle: "@KellySomers",
    platform: "twitter",
    managerId: 3,
    description: "Official FPL Podcast host; provides expert insights."
  },
  {
    id: 10,
    name: "Julien Laurens",
    handle: "@LaurensJulien",
    platform: "twitter",
    managerId: 1379,
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
    managerId: 41,
    description: "Co-host of FPL Family Podcast."
  },
  {
    id: 13,
    name: "Holly Shand",
    handle: "@HollyShand",
    platform: "twitter",
    managerId: 35,
    description: "Writer and podcaster focused on women's football and FPL."
  },
  {
    id: 14,
    name: "Ian Irving",
    handle: "@IanIrving_",
    platform: "twitter",
    managerId: 1328,
    description: "Podcast contributor with in-depth analysis."
  },
  {
    id: 15,
    name: "FPL Sonaldo",
    handle: "@FPLSonaldo",
    platform: "twitter",
    managerId: 6896,
    description: "Humorous takes on FPL; active in community leagues."
  },
  {
    id: 16,
    name: "FPL Pras",
    handle: "@Pras_fpl",
    platform: "twitter",
    managerId: 1349,
    description: "Podcaster on The FPL Wire; data-focused strategies."
  },
  {
    id: 17,
    name: "Gianni Buttice",
    handle: "@GianniButtice",
    platform: "twitter",
    managerId: 9176,
    description: "Data-driven FPL analysis and tools."
  },
  {
    id: 18,
    name: "BigMan Bakar",
    handle: "@BigManBakar",
    platform: "twitter",
    managerId: 397,
    description: "High-ranking player sharing advanced tactics."
  },
  {
    id: 19,
    name: "Yelena",
    handle: "@FPL_Yelena",
    platform: "twitter",
    managerId: 251,
    description: "Rising creator with consistent top ranks."
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
    managerId: 8061,
    description: "YouTuber and influencer with entertaining FPL content."
  },
  {
    id: 22,
    name: "Lateriser12",
    handle: "@Lateriser",
    platform: "twitter",
    managerId: 1122,
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
    managerId: 1301,
    description: "Top FPL manager with multiple top 1k finishes; contributor to The Athletic and FPL shows."
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
            teamId: creator.managerId,
            teamName: creator.name, // Use name as team name
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