// Script to bulk update content creators with Twitter handles and YouTube URLs
const creatorUpdates = [
  { name: "Let's Talk FPL (Andy)", twitterHandle: "@LetsTalk_FPL", youtubeUrl: "https://www.youtube.com/@LetsTalkFPL" },
  { name: "FPL Focal", twitterHandle: "@FPLFocal", youtubeUrl: "https://www.youtube.com/@FPLFocal" },
  { name: "FPL Harry", twitterHandle: "@FPL_Harry", youtubeUrl: "https://www.youtube.com/@FPLHarry" },
  { name: "FPL Raptor", twitterHandle: "@FPL__Raptor", youtubeUrl: "https://www.youtube.com/@FPLRaptor" },
  { name: "FPL Pickle", twitterHandle: "@FPLPickle", youtubeUrl: null },
  { name: "FPL Mate", twitterHandle: "@FPLMate", youtubeUrl: "https://www.youtube.com/@FPLMate" },
  { name: "Ben Crellin", twitterHandle: "@BenCrellin", youtubeUrl: null },
  { name: "Az Phillips", twitterHandle: "@AzPhillipsFPL", youtubeUrl: "https://www.youtube.com/@FPLBlackBox" },
  { name: "Kelly Somers", twitterHandle: "@KellySomers", youtubeUrl: "https://www.youtube.com/@premierleague" },
  { name: "Julien Laurens", twitterHandle: "@LaurensJulien", youtubeUrl: null },
  { name: "Sam Bonfield", twitterHandle: "@samfpl_", youtubeUrl: "https://www.youtube.com/@FPLFamily" },
  { name: "Lee Bonfield", twitterHandle: "@FPLFamily", youtubeUrl: "https://www.youtube.com/@FPLFamily" },
  { name: "Holly Shand", twitterHandle: "@HollyShand", youtubeUrl: "https://www.youtube.com/@HollyShand" },
  { name: "Ian Irving", twitterHandle: "@IanIrving_", youtubeUrl: null },
  { name: "FPL Sonaldo", twitterHandle: "@FPLSonaldo", youtubeUrl: null },
  { name: "FPL Pras", twitterHandle: "@Pras_fpl", youtubeUrl: "https://www.youtube.com/@TheFPLWire" },
  { name: "Gianni Buttice", twitterHandle: "@GianniButtice", youtubeUrl: "https://www.youtube.com/@gianni_buttice" },
  { name: "BigMan Bakar", twitterHandle: "@BigManBakar", youtubeUrl: "https://www.youtube.com/@TheFPLWire" },
  { name: "Yelena", twitterHandle: "@FPL_Yelena", youtubeUrl: null },
  { name: "Stormzy", twitterHandle: "@Stormzy", youtubeUrl: null },
  { name: "Chunkz", twitterHandle: "@Chunkz", youtubeUrl: "https://www.youtube.com/@Chunkz" },
  { name: "Lateriser12", twitterHandle: "@lateriser12", youtubeUrl: "https://www.youtube.com/@TheFPLWire" },
  { name: "Abdul Rehman (FPL Salah)", twitterHandle: "@FPL_Salah", youtubeUrl: null },
  { name: "Zophar", twitterHandle: "@ZopharFPL", youtubeUrl: "https://www.youtube.com/@TheFPLWire" }
];

async function updateCreators() {
  try {
    // First, fetch all creators to get their IDs
    const response = await fetch('http://localhost:5000/api/content-creators');
    const creators = await response.json();
    
    console.log(`📊 Found ${creators.length} creators to update`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const update of creatorUpdates) {
      const creator = creators.find(c => c.name === update.name);
      
      if (creator) {
        try {
          const updateResponse = await fetch(`http://localhost:5000/api/content-creators/${creator.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              twitterHandle: update.twitterHandle,
              youtubeUrl: update.youtubeUrl
            })
          });
          
          if (updateResponse.ok) {
            console.log(`✅ Updated ${update.name}`);
            successCount++;
          } else {
            console.error(`❌ Failed to update ${update.name}: ${updateResponse.statusText}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Error updating ${update.name}:`, error);
          errorCount++;
        }
      } else {
        console.log(`⚠️  Creator not found: ${update.name}`);
      }
    }
    
    console.log(`\n🎉 Update complete! Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

updateCreators();