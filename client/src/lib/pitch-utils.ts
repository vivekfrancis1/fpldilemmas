// Pitch view utility functions for FPL team visualization

// Team jersey color mapping (matches My Dashboard colors)
export const getTeamJerseyColor = (teamId: number): string => {
  const jerseyColors: Record<number, string> = {
    1: '#EF0107',      // Arsenal - Red
    2: '#95BFE5',      // Aston Villa - Claret & Blue (Light Blue)
    3: '#8B0000',      // Burnley - Dark Red (not in current PL)
    4: '#8B0000',      // Bournemouth - Dark Red/Black
    5: '#FDB913',      // Brentford - Red & White (Gold)
    6: '#0057B8',      // Brighton - Blue & White
    7: '#034694',      // Chelsea - Dark Blue
    8: '#1B458F',      // Crystal Palace - Blue & Pink
    9: '#003399',      // Everton - Dark Blue
    10: '#FFFFFF',     // Fulham - White
    11: '#FFFFFF',     // Leeds - White (not in current PL)
    12: '#C8102E',     // Liverpool - Red
    13: '#6CABDD',     // Man City - Sky Blue
    14: '#DA291C',     // Man Utd - Red
    15: '#241F20',     // Newcastle - Black & White
    16: '#DA020E',     // Nottm Forest - Red
    17: '#1B458F',     // Sunderland - Blue (not in current PL)
    18: '#FFFFFF',     // Spurs (Tottenham) - White
    19: '#FBEE23',     // West Ham - Claret & Blue (Gold)
    20: '#FDB913'      // Wolves - Gold & Black
  };
  
  return jerseyColors[teamId] || '#9CA3AF';
};

// Calculate text color based on jersey background
export const getTextColor = (hexColor: string): string => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

// Get difficulty color class
export const getDifficultyColor = (difficulty: number): string => {
  if (difficulty === 1) return 'bg-green-600 text-white';
  if (difficulty === 2) return 'bg-emerald-500 text-white';
  if (difficulty === 3) return 'bg-gray-400 text-white';
  if (difficulty === 4) return 'bg-orange-500 text-white';
  if (difficulty === 5) return 'bg-red-600 text-white';
  return 'bg-gray-400 text-white';
};

// Sort players by position for formation display
export const sortPlayersByPosition = <T extends { position: number }>(players: T[]): T[] => {
  return [...players].sort((a, b) => a.position - b.position);
};

// Get player position from element_type
export const getPositionFromElementType = (elementType: number): 'GK' | 'DEF' | 'MID' | 'FWD' => {
  if (elementType === 1) return 'GK';
  if (elementType === 2) return 'DEF';
  if (elementType === 3) return 'MID';
  if (elementType === 4) return 'FWD';
  return 'MID';
};

// Get position short name
export const getPositionShortName = (position: string): string => {
  const shortNames: Record<string, string> = {
    'GK': 'GK',
    'DEF': 'DEF',
    'MID': 'MID',
    'FWD': 'FWD',
  };
  return shortNames[position] || position;
};

// Get position color class
export const getPositionColor = (position: string): string => {
  const colors: Record<string, string> = {
    'GK': 'bg-yellow-100 text-yellow-800',
    'DEF': 'bg-green-100 text-green-800',
    'MID': 'bg-blue-100 text-blue-800',
    'FWD': 'bg-red-100 text-red-800',
  };
  return colors[position] || 'bg-gray-100 text-gray-800';
};

// Get position icon
export const getPositionIcon = (position: string): string => {
  const icons: Record<string, string> = {
    'GK': '🧤',
    'DEF': '🛡️',
    'MID': '⚙️',
    'FWD': '⚽',
  };
  return icons[position] || '';
};

// Filter players by element type
export const filterPlayersByType = <T extends { element_type: number }>(
  players: T[],
  elementType: number
): T[] => {
  return players.filter(player => player.element_type === elementType);
};
