import { Calendar, Target, TrendingUp, Trophy } from "lucide-react";

/** The four most-used tools, shown as direct tabs on mobile (bottom bar) and desktop (top bar). */
export const PRIMARY_NAV_ITEMS = [
  {
    href: "/match-predictions",
    label: "Matches",
    icon: Target,
    match: ["/match-predictions", "/projected-goals-cs", "/match-odds-history"],
  },
  {
    href: "/player-total-points",
    label: "Points",
    icon: Trophy,
    match: [
      "/player-total-points",
      "/player-goals-scored-projections",
      "/player-assist-projections",
      "/player-defensive-contributions",
      "/player-saves",
      "/player-bonus-points",
      "/player-minutes",
    ],
  },
  {
    href: "/fixtures",
    label: "Fixtures",
    icon: Calendar,
    match: ["/fixtures", "/results-and-fixtures"],
  },
  {
    href: "/recent-price-changes",
    label: "Prices",
    icon: TrendingUp,
    match: ["/recent-price-changes", "/price-changes"],
  },
];
