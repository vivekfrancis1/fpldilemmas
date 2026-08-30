import { getJerseyUrl } from "@/lib/jersey";

interface JerseyIconProps {
  team: string | undefined | null;
  position: string | undefined | null;
  className?: string;
}

// Small jersey icon shown before a player's name across the projection tables — hides itself if
// the specific team/position combination has no matching file rather than showing a broken image.
export default function JerseyIcon({ team, position, className }: JerseyIconProps) {
  if (!team) return null;
  return (
    <img
      src={getJerseyUrl(team, position)}
      alt=""
      className={className || "h-5 w-5 object-contain shrink-0"}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}
