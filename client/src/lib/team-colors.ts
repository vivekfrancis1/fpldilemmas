// Club primary colours keyed by FPL short_name. Used only for subtle accents (stripes), never for text.
const TEAM_COLORS: Record<string, string> = {
  ARS: '#EF0107', AVL: '#95BFE5', BOU: '#DA291C', BRE: '#E30613', BHA: '#0057B8',
  BUR: '#6C1D45', CHE: '#034694', COV: '#59C1E8', CRY: '#1B458F', EVE: '#003399',
  FUL: '#111111', HUL: '#F5A12D', IPS: '#3A64A3', LEE: '#FFCD00', LEI: '#003090',
  LIV: '#C8102E', MCI: '#6CABDD', MUN: '#DA291C', NEW: '#241F20', NFO: '#DD0000',
  SOU: '#D71920', SUN: '#EB172B', TOT: '#132257', WHU: '#7A263A', WOL: '#FDB913',
};

export function teamColor(shortName?: string | null): string {
  return (shortName && TEAM_COLORS[shortName]) || '#94a3b8';
}

/** Inset left stripe in the club colour; inset shadow so it never shifts layout. */
export function teamStripe(shortName?: string | null, width = 4): { boxShadow: string } {
  return { boxShadow: `inset ${width}px 0 0 0 ${teamColor(shortName)}` };
}
