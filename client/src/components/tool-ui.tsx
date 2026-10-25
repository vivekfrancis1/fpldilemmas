import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Crown } from "lucide-react";

// Small building blocks shared by the Pre-deadline Brief, Captaincy Matrix and Compare Players pages, so the three
// tools look like one family and match the rest of the site: indigo/violet brand, soft rounded cards, club shirts,
// colour-coded pills. Backgrounds use alpha colours and text colours carry `dark:` variants so both themes work.

export type Pos = "GKP" | "DEF" | "MID" | "FWD";

const POS_CHIP: Record<Pos, string> = {
  GKP: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  DEF: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
  MID: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30",
  FWD: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
};
const POS_BAR: Record<Pos, string> = {
  GKP: "from-amber-400 to-amber-500",
  DEF: "from-emerald-400 to-emerald-500",
  MID: "from-sky-400 to-sky-500",
  FWD: "from-rose-400 to-rose-500",
};
const POS_ACCENT: Record<Pos, string> = {
  GKP: "border-t-amber-400",
  DEF: "border-t-emerald-400",
  MID: "border-t-sky-400",
  FWD: "border-t-rose-400",
};

export const asPos = (v: string): Pos => (v === "GKP" || v === "DEF" || v === "MID" || v === "FWD" ? v : "MID");
export const posAccent = (pos: Pos) => POS_ACCENT[pos];

export function PosChip({ pos, className = "" }: { pos: Pos; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-px text-[10px] font-bold leading-4 tracking-wide ${POS_CHIP[pos]} ${className}`}>
      {pos}
    </span>
  );
}

export function TeamChip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md bg-gray-100 px-1.5 py-px text-[10px] font-semibold leading-4 tracking-wide text-gray-600 ${className}`}>
      {children}
    </span>
  );
}

/** Rounded gradient tile holding a section's icon. */
export function IconTile({ icon: Icon, className = "" }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-300 ${className}`}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

/** A titled section: icon tile, title, optional subtitle and action (e.g. Share image), then the content. */
export function SectionCard({
  icon,
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClassName = "p-4 sm:p-5",
  testId,
  onHeaderClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  testId?: string;
  /** Makes the whole header a click target (e.g. to collapse the section). */
  onHeaderClick?: () => void;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`} data-testid={testId}>
      <header
        className={`flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-indigo-500/[0.06] via-violet-500/[0.03] to-transparent px-4 py-3 sm:px-5 ${onHeaderClick ? "cursor-pointer" : ""}`}
        onClick={onHeaderClick}
      >
        <IconTile icon={icon} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold leading-tight text-gray-900 sm:text-lg">{title}</h2>
          {subtitle && <p className="text-xs leading-snug text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Numbered badge; the top three get gold, silver and bronze. */
export function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-sm"
      : rank === 2
        ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800"
        : rank === 3
          ? "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-950"
          : "bg-gray-100 text-gray-500";
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold tabular-nums ${style}`}>
      {rank === 1 ? <Crown className="h-3.5 w-3.5" /> : rank}
    </span>
  );
}

/** Expected points as a bar relative to `max`, with the number on the right. */
export function XptsBar({ value, max, tone = "indigo", label = "xPts" }: { value: number; max: number; tone?: "indigo" | Pos; label?: string }) {
  const pct = max > 0 ? Math.max(6, Math.min(100, (value / max) * 100)) : 0;
  const fill = tone === "indigo" ? "from-indigo-500 to-violet-500" : POS_BAR[tone];
  return (
    <span className="flex min-w-[96px] flex-1 items-center gap-2" title={`${value.toFixed(1)} ${label}`}>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200/70 dark:bg-white/10">
        <span className={`block h-full rounded-full bg-gradient-to-r ${fill}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-9 text-right text-sm font-bold tabular-nums text-gray-900">{value.toFixed(1)}</span>
    </span>
  );
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  i: { label: "Injured", cls: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
  s: { label: "Suspended", cls: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
  d: { label: "Doubtful", cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30" },
  u: { label: "Unavailable", cls: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30" },
};

/** FPL status as a pill, with the chance of playing when below 100. */
export function StatusPill({ status, chance }: { status: string; chance: number | null }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.d;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>
      {s.label}
      {chance !== null && chance < 100 && <span className="font-semibold opacity-80">· {chance}%</span>}
    </span>
  );
}

export function Pill({ children, tone = "gray", className = "" }: { children: ReactNode; tone?: "gray" | "indigo" | "green" | "red" | "amber"; className?: string }) {
  const cls = {
    gray: "bg-gray-500/10 text-gray-600 dark:text-gray-300",
    indigo: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    red: "bg-red-500/12 text-red-700 dark:text-red-300",
    amber: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${cls} ${className}`}>{children}</span>;
}

/** Friendly empty state used inside a section. */
export function EmptyNote({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-4 py-4 text-sm text-gray-600">
      <Icon className="h-5 w-5 shrink-0 text-emerald-500" />
      <span>{children}</span>
    </div>
  );
}

/** Brand gradient banner with soft glows, used for each tool's headline numbers. */
export function HeroPanel({ children, className = "", testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-800 via-indigo-600 to-blue-700 p-5 text-white shadow-lg sm:p-7 ${className}`}
      data-testid={testId}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="relative">{children}</div>
    </section>
  );
}

/** A big number with a label and a line of context, for use on a HeroPanel. */
export function HeroStat({
  label,
  value,
  sub,
  testId,
  valueTestId,
  size = "lg",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  testId?: string;
  valueTestId?: string;
  /** "md" for rows of four or more stats, where "lg" numbers would not fit on a phone. */
  size?: "lg" | "md";
}) {
  return (
    <div data-testid={testId}>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{label}</div>
      <div className={`mt-1 font-extrabold leading-none tabular-nums ${size === "md" ? "text-2xl sm:text-3xl" : "text-4xl sm:text-5xl"}`} data-testid={valueTestId}>{value}</div>
      {sub && <div className="mt-1.5 text-xs font-medium text-white/75">{sub}</div>}
    </div>
  );
}

/** Pill-style switcher (same look as the position filter on the Captaincy Matrix). */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  testIdPrefix,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  testIdPrefix?: string;
}) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          data-testid={testIdPrefix ? `${testIdPrefix}-${o.value}` : undefined}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
            value === o.value ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A percentage as a bar with its label on the right. */
export function PercentBar({ percent, label, tone = "indigo" }: { percent: number; label: ReactNode; tone?: "indigo" | Pos }) {
  const fill = tone === "indigo" ? "from-indigo-500 to-violet-500" : POS_BAR[tone];
  return (
    <span className="flex min-w-[110px] flex-1 items-center gap-2">
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200/70 dark:bg-white/10">
        <span className={`block h-full rounded-full bg-gradient-to-r ${fill}`} style={{ width: `${Math.max(3, Math.min(100, percent))}%` }} />
      </span>
      <span className="min-w-[64px] text-right text-xs font-bold tabular-nums text-gray-900">{label}</span>
    </span>
  );
}

/** Panel that holds a tool's inputs (team ID, league ID...). */
export function InputPanel({ icon: Icon, title, subtitle, children }: { icon: LucideIcon; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="mb-5 rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-500/[0.06] via-white to-violet-500/[0.04] p-4 shadow-sm dark:via-transparent sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <IconTile icon={Icon} />
        <div>
          <h2 className="text-base font-bold leading-tight text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** Small white tile with a label and a value, for secondary figures that sit under a hero panel. */
export function StatTile({ label, value, tone = "gray", testId }: { label: string; value: ReactNode; tone?: "gray" | "indigo" | "green" | "amber"; testId?: string }) {
  const accent = { gray: "border-t-gray-300", indigo: "border-t-indigo-400", green: "border-t-emerald-400", amber: "border-t-amber-400" }[tone];
  return (
    <div className={`rounded-xl border border-gray-200 border-t-2 bg-white px-3 py-2.5 shadow-sm ${accent}`} data-testid={testId}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 sm:text-[11px]">{label}</div>
      <div className="mt-0.5 text-base font-extrabold tabular-nums text-gray-900 sm:text-lg">{value}</div>
    </div>
  );
}
