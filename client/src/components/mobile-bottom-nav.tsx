import { Link, useLocation } from "wouter";
import { Calendar, Menu, Target, TrendingUp, Trophy } from "lucide-react";

const ITEMS = [
  { href: "/match-predictions", label: "Matches", icon: Target, match: ["/match-predictions", "/projected-goals-cs", "/match-odds-history"] },
  { href: "/player-total-points", label: "Players", icon: Trophy, match: ["/player-"] },
  { href: "/fixtures", label: "Fixtures", icon: Calendar, match: ["/fixtures", "/results-and-fixtures"] },
  { href: "/recent-price-changes", label: "Prices", icon: TrendingUp, match: ["/recent-price-changes"] },
];

/** Phone-only primary navigation. The hamburger/sidebar stays available under "More". */
export default function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const [location] = useLocation();
  return (
    <nav
      className="fpl-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-30 flex items-stretch justify-around border-t"
      aria-label="Primary"
      data-testid="nav-bottom"
    >
      {ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match.some((m) => location.startsWith(m));
        return (
          <Link
            key={href}
            href={href}
            className={`fpl-bottom-nav-item ${active ? "is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            data-testid={`nav-bottom-${label.toLowerCase().replace(/\s/g, "-")}`}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className="fpl-bottom-nav-item" data-testid="nav-bottom-more">
        <Menu className="h-5 w-5" />
        <span>More</span>
      </button>
    </nav>
  );
}
