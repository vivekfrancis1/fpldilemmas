// Hardcoded FPL Player Data - 2025-26 Season
// This provides stable player names and IDs to reduce API dependency

export interface FPLPlayer {
  id: number;
  firstName: string;
  secondName: string;
  webName: string;
  currentTeam: string;
  position: string;
}

// Core FPL Players - Hardcoded for reliability
export const FPL_PLAYERS: Record<number, FPLPlayer> = {
  // Arsenal
  1: { id: 1, firstName: "David", secondName: "Raya Martín", webName: "Raya", currentTeam: "Arsenal", position: "Goalkeeper" },
  7: { id: 7, firstName: "Riccardo", secondName: "Calafiori", webName: "Calafiori", currentTeam: "Arsenal", position: "Defender" },
  8: { id: 8, firstName: "Gabriel", secondName: "dos Santos Magalhães", webName: "Gabriel", currentTeam: "Arsenal", position: "Defender" },
  9: { id: 9, firstName: "William", secondName: "Saliba", webName: "Saliba", currentTeam: "Arsenal", position: "Defender" },
  10: { id: 10, firstName: "Ben", secondName: "White", webName: "White", currentTeam: "Arsenal", position: "Defender" },
  11: { id: 11, firstName: "Oleksandr", secondName: "Zinchenko", webName: "Zinchenko", currentTeam: "Arsenal", position: "Defender" },
  12: { id: 12, firstName: "Jurriën", secondName: "Timber", webName: "Timber", currentTeam: "Arsenal", position: "Defender" },
  13: { id: 13, firstName: "Takehiro", secondName: "Tomiyasu", webName: "Tomiyasu", currentTeam: "Arsenal", position: "Defender" },
  14: { id: 14, firstName: "Jakub", secondName: "Kiwior", webName: "Kiwior", currentTeam: "Arsenal", position: "Defender" },
  15: { id: 15, firstName: "Kieran", secondName: "Tierney", webName: "Tierney", currentTeam: "Arsenal", position: "Defender" },
  16: { id: 16, firstName: "Thomas", secondName: "Partey", webName: "Partey", currentTeam: "Arsenal", position: "Midfielder" },
  17: { id: 17, firstName: "Jorginho", secondName: "Luiz Frello Filho Jorge", webName: "Jorginho", currentTeam: "Arsenal", position: "Midfielder" },
  18: { id: 18, firstName: "Martin", secondName: "Ødegaard", webName: "Ødegaard", currentTeam: "Arsenal", position: "Midfielder" },
  19: { id: 19, firstName: "Declan", secondName: "Rice", webName: "Rice", currentTeam: "Arsenal", position: "Midfielder" },
  20: { id: 20, firstName: "Kai", secondName: "Havertz", webName: "Havertz", currentTeam: "Arsenal", position: "Midfielder" },
  21: { id: 21, firstName: "Leandro", secondName: "Trossard", webName: "Trossard", currentTeam: "Arsenal", position: "Midfielder" },
  22: { id: 22, firstName: "Bukayo", secondName: "Saka", webName: "Saka", currentTeam: "Arsenal", position: "Midfielder" },
  23: { id: 23, firstName: "Gabriel", secondName: "Jesus", webName: "Gabriel Jesus", currentTeam: "Arsenal", position: "Forward" },

  // Manchester United (2025-26 Updated Squad)
  24: { id: 24, firstName: "André", secondName: "Onana", webName: "Onana", currentTeam: "Man Utd", position: "Goalkeeper" },
  30: { id: 30, firstName: "Lisandro", secondName: "Martínez", webName: "Lisandro Martínez", currentTeam: "Man Utd", position: "Defender" },
  31: { id: 31, firstName: "Harry", secondName: "Maguire", webName: "Maguire", currentTeam: "Man Utd", position: "Defender" },
  32: { id: 32, firstName: "Matthijs", secondName: "de Ligt", webName: "de Ligt", currentTeam: "Man Utd", position: "Defender" },
  33: { id: 33, firstName: "Luke", secondName: "Shaw", webName: "Shaw", currentTeam: "Man Utd", position: "Defender" },
  34: { id: 34, firstName: "Diogo", secondName: "Dalot", webName: "Dalot", currentTeam: "Man Utd", position: "Defender" },
  35: { id: 35, firstName: "Noussair", secondName: "Mazraoui", webName: "Mazraoui", currentTeam: "Man Utd", position: "Defender" },
  36: { id: 36, firstName: "Casemiro", secondName: "Carlos Henrique", webName: "Casemiro", currentTeam: "Man Utd", position: "Midfielder" },
  37: { id: 37, firstName: "Bruno Miguel", secondName: "Borges Fernandes", webName: "Fernandes", currentTeam: "Man Utd", position: "Midfielder" },
  38: { id: 38, firstName: "Mason", secondName: "Mount", webName: "Mount", currentTeam: "Man Utd", position: "Midfielder" },
  39: { id: 39, firstName: "Kobbie", secondName: "Mainoo", webName: "Mainoo", currentTeam: "Man Utd", position: "Midfielder" },
  40: { id: 40, firstName: "Manuel", secondName: "Ugarte", webName: "Ugarte", currentTeam: "Man Utd", position: "Midfielder" },
  42: { id: 42, firstName: "Alejandro", secondName: "Garnacho", webName: "Garnacho", currentTeam: "Man Utd", position: "Midfielder" },
  43: { id: 43, firstName: "Joshua", secondName: "Zirkzee", webName: "Zirkzee", currentTeam: "Man Utd", position: "Forward" },
  44: { id: 44, firstName: "Rasmus", secondName: "Højlund", webName: "Højlund", currentTeam: "Man Utd", position: "Forward" },

  // Liverpool (2025-26 Updated Squad)
  45: { id: 45, firstName: "Alisson", secondName: "Ramses Becker", webName: "Alisson", currentTeam: "Liverpool", position: "Goalkeeper" },
  51: { id: 51, firstName: "Virgil", secondName: "van Dijk", webName: "van Dijk", currentTeam: "Liverpool", position: "Defender" },
  52: { id: 52, firstName: "Ibrahima", secondName: "Konaté", webName: "Konaté", currentTeam: "Liverpool", position: "Defender" },
  53: { id: 53, firstName: "Joe", secondName: "Gomez", webName: "Gomez", currentTeam: "Liverpool", position: "Defender" },
  54: { id: 54, firstName: "Andrew", secondName: "Robertson", webName: "Robertson", currentTeam: "Liverpool", position: "Defender" },
  55: { id: 55, firstName: "Konstantinos", secondName: "Tsimikas", webName: "Tsimikas", currentTeam: "Liverpool", position: "Defender" },
  56: { id: 56, firstName: "Trent", secondName: "Alexander-Arnold", webName: "Alexander-Arnold", currentTeam: "Liverpool", position: "Defender" },
  57: { id: 57, firstName: "Alexis", secondName: "Mac Allister", webName: "Mac Allister", currentTeam: "Liverpool", position: "Midfielder" },
  58: { id: 58, firstName: "Ryan", secondName: "Gravenberch", webName: "Gravenberch", currentTeam: "Liverpool", position: "Midfielder" },
  59: { id: 59, firstName: "Curtis", secondName: "Jones", webName: "Curtis Jones", currentTeam: "Liverpool", position: "Midfielder" },
  60: { id: 60, firstName: "Dominik", secondName: "Szoboszlai", webName: "Szoboszlai", currentTeam: "Liverpool", position: "Midfielder" },
  61: { id: 61, firstName: "Harvey", secondName: "Elliott", webName: "Elliott", currentTeam: "Liverpool", position: "Midfielder" },
  62: { id: 62, firstName: "Mohamed", secondName: "Salah", webName: "Salah", currentTeam: "Liverpool", position: "Midfielder" },
  64: { id: 64, firstName: "Cody", secondName: "Gakpo", webName: "Gakpo", currentTeam: "Liverpool", position: "Midfielder" },
  65: { id: 65, firstName: "Darwin", secondName: "Núñez", webName: "Núñez", currentTeam: "Liverpool", position: "Forward" },
  66: { id: 66, firstName: "Diogo", secondName: "Jota", webName: "Jota", currentTeam: "Liverpool", position: "Forward" },

  // Manchester City
  67: { id: 67, firstName: "Ederson", secondName: "Santana de Moraes", webName: "Ederson", currentTeam: "Man City", position: "Goalkeeper" },
  73: { id: 73, firstName: "Rúben", secondName: "Dias", webName: "Rúben Dias", currentTeam: "Man City", position: "Defender" },
  74: { id: 74, firstName: "John", secondName: "Stones", webName: "Stones", currentTeam: "Man City", position: "Defender" },
  75: { id: 75, firstName: "Kyle", secondName: "Walker", webName: "Walker", currentTeam: "Man City", position: "Defender" },
  76: { id: 76, firstName: "Joško", secondName: "Gvardiol", webName: "Gvardiol", currentTeam: "Man City", position: "Defender" },
  77: { id: 77, firstName: "Nathan", secondName: "Aké", webName: "Aké", currentTeam: "Man City", position: "Defender" },
  78: { id: 78, firstName: "Manuel", secondName: "Akanji", webName: "Akanji", currentTeam: "Man City", position: "Defender" },
  79: { id: 79, firstName: "Rico", secondName: "Lewis", webName: "Lewis", currentTeam: "Man City", position: "Defender" },
  80: { id: 80, firstName: "Rodri", secondName: "Hernández Cascante", webName: "Rodri", currentTeam: "Man City", position: "Midfielder" },
  81: { id: 81, firstName: "Kevin", secondName: "De Bruyne", webName: "De Bruyne", currentTeam: "Man City", position: "Midfielder" },
  82: { id: 82, firstName: "Ilkay", secondName: "Gündogan", webName: "Gündogan", currentTeam: "Man City", position: "Midfielder" },
  83: { id: 83, firstName: "Bernardo Mota", secondName: "Veiga de Carvalho e Silva", webName: "Bernardo Silva", currentTeam: "Man City", position: "Midfielder" },
  84: { id: 84, firstName: "Jack", secondName: "Grealish", webName: "Grealish", currentTeam: "Man City", position: "Midfielder" },
  85: { id: 85, firstName: "Phil", secondName: "Foden", webName: "Foden", currentTeam: "Man City", position: "Midfielder" },
  86: { id: 86, firstName: "Erling", secondName: "Haaland", webName: "Haaland", currentTeam: "Man City", position: "Forward" },
  87: { id: 87, firstName: "Julián", secondName: "Álvarez", webName: "Julián Álvarez", currentTeam: "Man City", position: "Forward" },

  // Chelsea
  88: { id: 88, firstName: "Robert", secondName: "Sánchez", webName: "Sánchez", currentTeam: "Chelsea", position: "Goalkeeper" },
  94: { id: 94, firstName: "Thiago", secondName: "Silva", webName: "Thiago Silva", currentTeam: "Chelsea", position: "Defender" },
  95: { id: 95, firstName: "Reece", secondName: "James", webName: "James", currentTeam: "Chelsea", position: "Defender" },
  96: { id: 96, firstName: "Ben", secondName: "Chilwell", webName: "Chilwell", currentTeam: "Chelsea", position: "Defender" },
  97: { id: 97, firstName: "Marc", secondName: "Cucurella", webName: "Cucurella", currentTeam: "Chelsea", position: "Defender" },
  98: { id: 98, firstName: "Wesley", secondName: "Fofana", webName: "Fofana", currentTeam: "Chelsea", position: "Defender" },
  99: { id: 99, firstName: "Levi", secondName: "Colwill", webName: "Colwill", currentTeam: "Chelsea", position: "Defender" },
  100: { id: 100, firstName: "Enzo", secondName: "Fernández", webName: "Enzo", currentTeam: "Chelsea", position: "Midfielder" },
  101: { id: 101, firstName: "Moisés", secondName: "Caicedo", webName: "Caicedo", currentTeam: "Chelsea", position: "Midfielder" },
  102: { id: 102, firstName: "Conor", secondName: "Gallagher", webName: "Gallagher", currentTeam: "Chelsea", position: "Midfielder" },
  103: { id: 103, firstName: "Cole", secondName: "Palmer", webName: "Palmer", currentTeam: "Chelsea", position: "Midfielder" },
  104: { id: 104, firstName: "Christopher", secondName: "Nkunku", webName: "Nkunku", currentTeam: "Chelsea", position: "Midfielder" },
  105: { id: 105, firstName: "Raheem", secondName: "Sterling", webName: "Sterling", currentTeam: "Chelsea", position: "Midfielder" },
  106: { id: 106, firstName: "Mykhailo", secondName: "Mudryk", webName: "Mudryk", currentTeam: "Chelsea", position: "Midfielder" },
  107: { id: 107, firstName: "Nicolas", secondName: "Jackson", webName: "Jackson", currentTeam: "Chelsea", position: "Forward" },

  // Brentford
  119: { id: 119, firstName: "Bryan", secondName: "Mbeumo", webName: "Mbeumo", currentTeam: "Brentford", position: "Midfielder" },
  120: { id: 120, firstName: "Yoane", secondName: "Wissa", webName: "Wissa", currentTeam: "Brentford", position: "Forward" },

  // Newcastle
  158: { id: 158, firstName: "Alexander", secondName: "Isak", webName: "Isak", currentTeam: "Newcastle", position: "Forward" },
  159: { id: 159, firstName: "Anthony", secondName: "Gordon", webName: "Gordon", currentTeam: "Newcastle", position: "Midfielder" },

  // Tottenham
  177: { id: 177, firstName: "Son", secondName: "Heung-min", webName: "Son", currentTeam: "Spurs", position: "Midfielder" },
  178: { id: 178, firstName: "James", secondName: "Maddison", webName: "Maddison", currentTeam: "Spurs", position: "Midfielder" },
  179: { id: 179, firstName: "Dominic", secondName: "Solanke", webName: "Solanke", currentTeam: "Spurs", position: "Forward" },

  // West Ham
  200: { id: 200, firstName: "Jarrod", secondName: "Bowen", webName: "Bowen", currentTeam: "West Ham", position: "Midfielder" },

  // Aston Villa
  221: { id: 221, firstName: "Ollie", secondName: "Watkins", webName: "Watkins", currentTeam: "Aston Villa", position: "Forward" },

  // Brighton
  242: { id: 242, firstName: "Lewis", secondName: "Dunk", webName: "Dunk", currentTeam: "Brighton", position: "Defender" },

  // Wolverhampton Wanderers
  263: { id: 263, firstName: "Matheus Santos", secondName: "Carneiro da Cunha", webName: "Cunha", currentTeam: "Wolves", position: "Forward" },

  // Crystal Palace
  284: { id: 284, firstName: "Eberechi", secondName: "Eze", webName: "Eze", currentTeam: "Crystal Palace", position: "Midfielder" },

  // Fulham
  305: { id: 305, firstName: "Rodrigo", secondName: "Muniz", webName: "Rodrigo Muniz", currentTeam: "Fulham", position: "Forward" },

  // Bournemouth
  326: { id: 326, firstName: "Antoine", secondName: "Semenyo", webName: "Semenyo", currentTeam: "Bournemouth", position: "Forward" },

  // Everton
  347: { id: 347, firstName: "Dominic", secondName: "Calvert-Lewin", webName: "Calvert-Lewin", currentTeam: "Everton", position: "Forward" },

  // Nottingham Forest
  368: { id: 368, firstName: "Chris", secondName: "Wood", webName: "Wood", currentTeam: "Nott'm Forest", position: "Forward" }
};

// Helper functions for accessing player data
export function getPlayerById(id: number): FPLPlayer | undefined {
  return FPL_PLAYERS[id];
}

export function getPlayerName(id: number): string {
  const player = FPL_PLAYERS[id];
  return player ? player.webName : `Player ${id}`;
}

export function getFullPlayerName(id: number): string {
  const player = FPL_PLAYERS[id];
  return player ? `${player.firstName} ${player.secondName}` : `Player ${id}`;
}

export function getPlayerTeam(id: number): string {
  const player = FPL_PLAYERS[id];
  return player ? player.currentTeam : 'Unknown Team';
}

export function getPlayerPosition(id: number): string {
  const player = FPL_PLAYERS[id];
  return player ? player.position : 'Unknown Position';
}

export function getPlayersByTeam(teamName: string): FPLPlayer[] {
  return Object.values(FPL_PLAYERS).filter(player => player.currentTeam === teamName);
}

export function getAllPlayerIds(): number[] {
  return Object.keys(FPL_PLAYERS).map(id => parseInt(id));
}

// Team mappings for quick reference
export const TEAM_MAPPINGS: Record<string, string> = {
  "Arsenal": "Arsenal",
  "Man Utd": "Manchester United", 
  "Liverpool": "Liverpool",
  "Man City": "Manchester City",
  "Chelsea": "Chelsea",
  "Spurs": "Tottenham Hotspur",
  "Newcastle": "Newcastle United",
  "West Ham": "West Ham United",
  "Aston Villa": "Aston Villa",
  "Brighton": "Brighton & Hove Albion",
  "Brentford": "Brentford",
  "Wolves": "Wolverhampton Wanderers",
  "Crystal Palace": "Crystal Palace",
  "Fulham": "Fulham",
  "Bournemouth": "Bournemouth",
  "Everton": "Everton",
  "Nott'm Forest": "Nottingham Forest"
};