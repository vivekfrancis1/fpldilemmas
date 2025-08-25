// Client-side FPL Player Constants for hardcoded player data
// This reduces API dependency and improves reliability

export interface FPLPlayer {
  id: number;
  firstName: string;
  secondName: string;
  webName: string;
  currentTeam: string;
  position: string;
}

// Core FPL Players - Hardcoded for reliability (Top players)
export const PLAYER_NAMES: Record<number, string> = {
  // Arsenal
  1: "Raya",
  7: "Calafiori", 
  8: "Gabriel",
  9: "Saliba",
  16: "Saka",
  17: "Ødegaard",
  18: "Martinelli",
  20: "Trossard",
  21: "Rice",
  22: "Merino",
  30: "Havertz",
  31: "Jesus",

  // Manchester United (2025-26 Updated)
  24: "Onana",
  30: "Lisandro",
  31: "Maguire",
  32: "de Ligt", 
  37: "Fernandes",
  39: "Mainoo",
  42: "Garnacho",
  43: "Zirkzee",
  44: "Højlund",

  // Liverpool (2025-26 Updated)
  45: "Alisson",
  51: "van Dijk",
  52: "Konaté",
  54: "Robertson",
  56: "Alexander-Arnold",
  57: "Mac Allister",
  58: "Gravenberch",
  60: "Szoboszlai",
  62: "Salah",
  64: "Gakpo",
  65: "Núñez",
  66: "Jota",

  // Manchester City
  67: "Ederson",
  73: "Rúben Dias",
  75: "Walker",
  76: "Gvardiol",
  77: "Aké",
  80: "Rodri",
  81: "De Bruyne",
  83: "Bernardo Silva",
  84: "Grealish",
  85: "Foden",
  86: "Haaland",

  // Chelsea
  88: "Sánchez",
  95: "Reece James",
  97: "Cucurella",
  100: "Enzo",
  101: "Caicedo",
  103: "Palmer",
  104: "Nkunku",
  105: "Sterling",
  107: "Jackson",

  // Brentford
  119: "Mbeumo",
  120: "Wissa",

  // Newcastle
  158: "Isak",
  159: "Gordon",

  // Tottenham
  177: "Son",
  178: "Maddison",
  179: "Solanke",

  // Others
  200: "Bowen", // West Ham
  221: "Watkins", // Aston Villa
  242: "Dunk", // Brighton
  263: "Cunha", // Wolves
  284: "Eze", // Crystal Palace
  305: "Rodrigo Muniz", // Fulham
  326: "Semenyo", // Bournemouth
  347: "Calvert-Lewin", // Everton
  368: "Wood" // Nottingham Forest
};

export const TEAM_NAMES: Record<number, string> = {
  1: "Arsenal",
  2: "Aston Villa", 
  3: "Burnley",
  4: "Bournemouth",
  5: "Brentford",
  6: "Brighton",
  7: "Chelsea",
  8: "Crystal Palace",
  9: "Everton",
  10: "Fulham",
  11: "Leeds",
  12: "Liverpool",
  13: "Man City",
  14: "Man Utd",
  15: "Newcastle",
  16: "Nott'm Forest",
  17: "Sunderland",
  18: "Spurs",
  19: "West Ham",
  20: "Wolves"
};

export function getPlayerName(id: number): string {
  return PLAYER_NAMES[id] || `Player ${id}`;
}

export function getTeamName(id: number): string {
  return TEAM_NAMES[id] || `Team ${id}`;
}

// Helper function for team matching by name
export function getTeamIdByName(teamName: string): number | undefined {
  const teamEntry = Object.entries(TEAM_NAMES).find(([_, name]) => 
    name.toLowerCase() === teamName.toLowerCase() ||
    name.toLowerCase().includes(teamName.toLowerCase()) ||
    teamName.toLowerCase().includes(name.toLowerCase())
  );
  return teamEntry ? parseInt(teamEntry[0]) : undefined;
}