// Static jersey icons served from client/public/jerseys/<SHORT>.webp and <SHORT>-gk.webp
// (one outfield + one goalkeeper variant per club, matching PREMIER_LEAGUE_TEAMS short_name).
export function getJerseyUrl(teamShortName: string | undefined | null, position: string | undefined | null): string {
  const short = (teamShortName || "").toUpperCase();
  const isGoalkeeper = (position || "").toUpperCase() === "GKP";
  return `/jerseys/${short}${isGoalkeeper ? "-gk" : ""}.webp`;
}
