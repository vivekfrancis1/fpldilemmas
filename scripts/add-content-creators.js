// Script to add FPL Content Creators from the provided list
const contentCreators = [
  {
    name: "Let's Talk FPL (Andy Martin)",
    handle: "@LetsTalk_FPL",
    teamId: 44,
    teamName: "Andy's Team",
    platform: "YouTube",
    description: "Popular YouTuber known for team reveals and draft advice.",
    followers: 150000
  },
  {
    name: "FPL Focal",
    handle: "@FPLFocal",
    teamId: 200,
    teamName: "Focal Point",
    platform: "YouTube",
    description: "Data-driven content creator; finished around 4k last season.",
    followers: 75000
  },
  {
    name: "FPL Harry",
    handle: "@FPL_Harry",
    teamId: 1320,
    teamName: "Harry's Heroes",
    platform: "YouTube",
    description: "Engaging podcaster and streamer; often excels early in seasons.",
    followers: 120000
  },
  {
    name: "FPL Raptor",
    handle: "@FPL__Raptor",
    teamId: 1587,
    teamName: "Raptor's Raptors",
    platform: "YouTube",
    description: "Analytical YouTuber with strong community engagement.",
    followers: 95000
  },
  {
    name: "FPL Pickle",
    handle: "@FPLPickle",
    teamId: 14501,
    teamName: "Pickle Power",
    platform: "YouTube",
    description: "Humorous FPL content with tips and memes.",
    followers: 60000
  },
  {
    name: "FPL Mate",
    handle: "@FPLMate",
    teamId: 16267,
    teamName: "Mate's Masters",
    platform: "YouTube",
    description: "Meme-focused creator active in FPL discussions.",
    followers: 45000
  },
  {
    name: "Ben Crellin",
    handle: "@BenCrellin",
    teamId: 6586,
    teamName: "Fixture Focus",
    platform: "Twitter",
    description: "Fixture ticker expert; creates essential spreadsheets for planning.",
    followers: 180000
  },
  {
    name: "Az Phillips",
    handle: "@AzPhillipsFPL",
    teamId: 441,
    teamName: "Az's Aces",
    platform: "YouTube",
    description: "Insightful analyst and podcaster.",
    followers: 85000
  },
  {
    name: "Kelly Somers",
    handle: "@KellySomers",
    teamId: 1924811,
    teamName: "Kelly's Killers",
    platform: "Podcast",
    description: "Official FPL Podcast host; provides expert insights.",
    followers: 125000
  },
  {
    name: "Julien Laurens",
    handle: "@LaurensJulien",
    teamId: 1514450,
    teamName: "Julien's Giants",
    platform: "Podcast",
    description: "ESPN pundit sharing occasional FPL tips.",
    followers: 200000
  },
  {
    name: "Sam Bonfield",
    handle: "@samfpl",
    teamId: 260,
    teamName: "Sam's Squad",
    platform: "Podcast",
    description: "FPL Podcast regular; family-oriented content.",
    followers: 40000
  },
  {
    name: "Lee Bonfield",
    handle: "@FPLFamily",
    teamId: 341,
    teamName: "Family First",
    platform: "Podcast",
    description: "Co-host of FPL Family Podcast.",
    followers: 35000
  },
  {
    name: "Holly Shand",
    handle: "@HollyShand",
    teamId: 135,
    teamName: "Holly's Heroes",
    platform: "Podcast",
    description: "Writer and podcaster focused on women's football and FPL.",
    followers: 25000
  },
  {
    name: "Ian Irving",
    handle: "@IanIrving_",
    teamId: 7577129,
    teamName: "Irving's Invincibles",
    platform: "Podcast",
    description: "Podcast contributor with in-depth analysis.",
    followers: 30000
  },
  {
    name: "FPL Sonaldo",
    handle: "@FPLSonaldo",
    teamId: 16725,
    teamName: "Sonaldo's Squad",
    platform: "YouTube",
    description: "Humorous takes on FPL; active in community leagues.",
    followers: 55000
  },
  {
    name: "FPL Pras",
    handle: "@Pras_fpl",
    teamId: 3570,
    teamName: "Pras Power",
    platform: "Podcast",
    description: "Podcaster on The FPL Wire; data-focused strategies.",
    followers: 40000
  },
  {
    name: "Gianni Buttice",
    handle: "@GianniButtice",
    teamId: 17614,
    teamName: "Gianni's Giants",
    platform: "YouTube",
    description: "Data-driven FPL analysis and tools.",
    followers: 70000
  },
  {
    name: "BigMan Bakar",
    handle: "@BigManBakar",
    teamId: 963,
    teamName: "Bakar's Ballers",
    platform: "YouTube",
    description: "High-ranking player sharing advanced tactics.",
    followers: 90000
  },
  {
    name: "Yelena",
    handle: "@FPL_Yelena",
    teamId: 251,
    teamName: "Yelena's Yard",
    platform: "Twitter",
    description: "Rising creator with consistent top ranks.",
    followers: 20000
  },
  {
    name: "Stormzy",
    handle: "@Stormzy",
    teamId: 698910,
    teamName: "Stormzy's Stars",
    platform: "Twitter",
    description: "Celebrity musician and FPL enthusiast.",
    followers: 2500000
  },
  {
    name: "Chunkz",
    handle: "@Chunkz",
    teamId: 2253812,
    teamName: "Chunkz Champions",
    platform: "YouTube",
    description: "YouTuber and influencer with entertaining FPL content.",
    followers: 1800000
  }
];

// Function to add creators via API
async function addContentCreators() {
  try {
    const response = await fetch('http://localhost:5000/api/content-creators/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ creators: contentCreators })
    });

    const result = await response.json();
    console.log('Bulk add result:', result);
    
    if (result.errors && result.errors.length > 0) {
      console.log('Errors encountered:');
      result.errors.forEach(error => console.log('- ' + error));
    }
  } catch (error) {
    console.error('Error adding content creators:', error);
  }
}

// Add creators when script is run
addContentCreators().then(() => {
  console.log('Finished adding content creators');
}).catch(console.error);