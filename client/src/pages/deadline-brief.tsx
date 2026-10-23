import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { compareUrl } from "@shared/compare-utils";
import { AlarmClock, ArrowDown, ArrowUp, CalendarClock, Crown, HeartPulse, ShieldCheck, Sparkles, Star, TrendingDown, TrendingUp } from "lucide-react";
import type { DeadlineBrief, BriefPlayer, PriceRow } from "@shared/deadline-brief";
import { Card, CardContent } from "@/components/ui/card";
import { ShareImageButton } from "@/components/share-image-button";
import { DeadlineReminderToggle } from "@/components/deadline-reminder-toggle";
import JerseyIcon from "@/components/jersey-icon";
import { PlayerAvailabilityBadge } from "@/components/player-availability-badge";
import { EmptyNote, Pill, PosChip, RankBadge, SectionCard, StatusPill, TeamChip, XptsBar, asPos } from "@/components/tool-ui";
import { teamColor } from "@/lib/team-colors";
import { availabilityCard, bestPicksCard, captainsCard, deadlineCard, dgwBgwCard, priceWatchCard, shareFileName } from "@shared/share-cards";

function countdownParts(deadlineIso: string, now: number) {
  const ms = new Date(deadlineIso).getTime() - now;
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  return { d: Math.floor(mins / 1440), h: Math.floor((mins % 1440) / 60), m: mins % 60 };
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[64px] flex-col items-center rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-sm ring-1 ring-white/20 sm:min-w-[78px]">
      <span className="text-3xl font-extrabold tabular-nums leading-none sm:text-4xl">{String(value).padStart(2, "0")}</span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/70">{label}</span>
    </div>
  );
}

const shareBtn = "bg-white/15 text-white border-white/30 hover:bg-white/25 hover:text-white";

function PlayerLine({ p, rank, max }: { p: BriefPlayer; rank?: number; max: number }) {
  const pos = asPos(p.position);
  return (
    <li
      className={`flex items-center gap-3 py-2 ${rank === 1 ? "my-1 rounded-xl bg-gradient-to-r from-amber-400/15 via-amber-400/5 to-transparent px-3 py-3 ring-1 ring-amber-400/30" : ""}`}
      data-testid={`row-player-${p.playerId}`}
    >
      {rank !== undefined && <RankBadge rank={rank} />}
      <JerseyIcon team={p.teamShort} position={pos} className={`shrink-0 object-contain ${rank === 1 ? "h-11 w-11" : "h-8 w-8"}`} />
      <div className="min-w-0 flex-1 basis-2/5">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <Link href={compareUrl([p.playerId])} className={`truncate font-bold text-gray-900 hover:underline ${rank === 1 ? "text-base" : "text-sm"}`} title="Compare this player">
            {p.name}
          </Link>
          <PlayerAvailabilityBadge
            player={{ status: p.status, chanceOfPlayingNextRound: p.chanceOfPlayingNextRound, news: p.news }}
            compact
          />
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <TeamChip>{p.teamShort}</TeamChip>
          <PosChip pos={pos} />
        </div>
      </div>
      <XptsBar value={p.xPts} max={max} tone={rank === undefined ? pos : "indigo"} />
    </li>
  );
}

function PriceList({ title, tone, rows }: { title: string; tone: "up" | "down"; rows: PriceRow[] }) {
  const up = tone === "up";
  return (
    <div className={`rounded-xl border p-3 ${up ? "border-emerald-500/25 bg-emerald-500/[0.04]" : "border-red-500/25 bg-red-500/[0.04]"}`}>
      <h3 className={`mb-1 flex items-center gap-1.5 text-sm font-bold ${up ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
        {up ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-gray-500">None predicted.</p>
      ) : (
        <ul className="divide-y divide-gray-200/70">
          {rows.map((r) => (
            <li key={r.playerId} className="flex items-center gap-2.5 py-2" data-testid={`price-${r.playerId}`}>
              <JerseyIcon team={r.teamShort} position={asPos(r.position)} className="h-7 w-7 shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-gray-900">{r.name}</div>
                <div className="text-xs text-gray-500">
                  {r.teamShort} · £{(r.currentPrice / 10).toFixed(1)}m · {r.ownership}% owned
                </div>
              </div>
              <Pill tone={up ? "green" : "red"}>
                {r.status}
                {r.calibrating ? " (calibrating)" : ""}
              </Pill>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TeamChips({ teams, tone }: { teams: Array<{ teamId: number; name: string; shortName: string }>; tone: "amber" | "slate" | "sky" }) {
  const ring = { amber: "border-amber-500/40 bg-amber-500/10", slate: "border-gray-400/40 bg-gray-500/10", sky: "border-sky-500/40 bg-sky-500/10" }[tone];
  return (
    <div className="flex flex-wrap gap-2">
      {teams.map((t) => (
        <span
          key={t.teamId}
          className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-3 text-sm font-semibold text-gray-900 ${ring}`}
          style={{ boxShadow: `inset 3px 0 0 0 ${teamColor(t.shortName)}` }}
        >
          <JerseyIcon team={t.shortName} position="MID" className="h-5 w-5 shrink-0 object-contain" />
          {t.name}
        </span>
      ))}
    </div>
  );
}

export default function DeadlineBriefPage() {
  const { data, isLoading, error } = useQuery<DeadlineBrief>({
    queryKey: ["/api/deadline-brief"],
    staleTime: 5 * 60 * 1000,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const deadline = data ? new Date(data.deadlineTime) : null;
  const deadlineText = deadline
    ? deadline.toLocaleString(undefined, { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
  const parts = data ? countdownParts(data.deadlineTime, now) : null;
  const maxXpts = data
    ? Math.max(0.1, ...data.captains.map((p) => p.xPts), ...Object.values(data.byPosition).flatMap((l) => l.map((p) => p.xPts)))
    : 1;

  return (
    <div className="min-h-screen">
      <div className="w-full py-4 sm:py-8">
        <div className="fpl-page-header">
          <div className="fpl-page-header-content">
            <div className="fpl-page-title">
              <AlarmClock />
              <h1 data-testid="text-page-title">Pre-deadline Brief{data ? ` - GW${data.gameweek}` : ""}</h1>
            </div>
            <p className="fpl-page-subtitle">Everything worth checking before the deadline, from official FPL data and our projections.</p>
          </div>
        </div>

        {error && <Card><CardContent className="p-6">Couldn't load the brief. Please try again shortly.</CardContent></Card>}
        {isLoading && <Card><CardContent className="p-6 text-muted-foreground">Loading…</CardContent></Card>}

        {data && deadline && (
          <div className="space-y-5">
            {/* Hero: deadline and countdown */}
            <section
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 text-white shadow-lg sm:p-7"
              data-testid="deadline"
            >
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
                <div className="min-w-[220px]">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                    <CalendarClock className="h-4 w-4" />
                    Gameweek {data.gameweek} deadline
                  </div>
                  <div className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
                    {deadline.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                  </div>
                  <div className="text-lg font-semibold text-white/80">
                    {deadline.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                <div className="flex items-center gap-2" data-testid="text-countdown" aria-label={parts ? `${parts.d} days ${parts.h} hours ${parts.m} minutes left` : "Deadline passed"}>
                  {parts ? (
                    <>
                      {parts.d > 0 && <CountdownBox value={parts.d} label="days" />}
                      <CountdownBox value={parts.h} label="hours" />
                      <CountdownBox value={parts.m} label="mins" />
                    </>
                  ) : (
                    <span className="rounded-2xl bg-white/15 px-5 py-3 text-xl font-extrabold ring-1 ring-white/20">Deadline passed</span>
                  )}
                </div>

                <ShareImageButton
                  className={shareBtn}
                  getCard={() => deadlineCard({ gameweek: data.gameweek, deadlineLabel: deadlineText })}
                  fileName={shareFileName(["deadline", `gw${data.gameweek}`])}
                />
              </div>
            </section>
            <DeadlineReminderToggle />

            {/* Top captain options */}
            <SectionCard
              icon={Crown}
              title="Top captain options"
              subtitle="Ranked by our expected points. A captain's points count double."
              testId="card-captains"
              action={
                data.projectionsAvailable && (
                  <ShareImageButton
                    getCard={() => captainsCard({ gameweek: data.gameweek, players: data.captains })}
                    fileName={shareFileName(["captains", `gw${data.gameweek}`])}
                  />
                )
              }
            >
              {!data.projectionsAvailable ? (
                <p className="text-sm text-gray-500">Projections for this gameweek aren't available yet.</p>
              ) : (
                <>
                  <ul className="divide-y divide-gray-100" data-testid="table-captains">
                    {data.captains.map((p, i) => (
                      <PlayerLine key={p.playerId} p={p} rank={i + 1} max={maxXpts} />
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-gray-500">
                    <Link href="/captaincy-matrix" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300">See every team's options →</Link>
                  </p>
                </>
              )}
            </SectionCard>

            {/* Best picks by position */}
            {data.projectionsAvailable && (
              <SectionCard
                icon={Star}
                title="Best picks by position"
                subtitle="Top three expected points for each position"
                action={
                  <ShareImageButton
                    getCard={() => bestPicksCard({ gameweek: data.gameweek, byPosition: data.byPosition })}
                    fileName={shareFileName(["best-picks", `gw${data.gameweek}`])}
                  />
                }
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="by-position">
                  {(["GKP", "DEF", "MID", "FWD"] as const).map((pos) => (
                    <div key={pos} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <PosChip pos={pos} className="text-xs" />
                      </div>
                      <ul className="divide-y divide-gray-200/70">
                        {data.byPosition[pos].map((p) => (
                          <PlayerLine key={p.playerId} p={p} max={maxXpts} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Availability watch */}
            <SectionCard
              icon={HeartPulse}
              title="Availability watch"
              subtitle="Injury and suspension flags among players owned by 10% or more"
              action={
                <ShareImageButton
                  getCard={() => availabilityCard({ gameweek: data.gameweek, players: data.availability })}
                  fileName={shareFileName(["availability", `gw${data.gameweek}`])}
                />
              }
            >
              <div data-testid="availability">
                {data.availability.length === 0 ? (
                  <EmptyNote icon={ShieldCheck}>No injury or suspension flags among players owned by 10% or more.</EmptyNote>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {data.availability.map((a) => (
                      <li key={a.playerId} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                        <JerseyIcon team={a.teamShort} position={asPos(a.position)} className="h-9 w-9 shrink-0 object-contain" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-bold text-gray-900">{a.name}</span>
                            <StatusPill status={a.status} chance={a.chanceOfPlayingNextRound} />
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                            <TeamChip>{a.teamShort}</TeamChip>
                            <Pill tone="indigo">{a.ownership}% owned</Pill>
                          </div>
                          {a.news && <p className="mt-1 text-xs leading-snug text-gray-600">{a.news}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-gray-500">FPL's own status and news. It can change before the deadline.</p>
              </div>
            </SectionCard>

            {/* Price-change watch */}
            <SectionCard
              icon={TrendingUp}
              title="Price-change watch"
              subtitle="Predictions from transfer momentum, not certainties"
              action={
                <ShareImageButton
                  getCard={() => priceWatchCard({ gameweek: data.gameweek, risers: data.priceWatch.risers, fallers: data.priceWatch.fallers })}
                  fileName={shareFileName(["price-watch", `gw${data.gameweek}`])}
                />
              }
            >
              <div className="grid gap-4 md:grid-cols-2" data-testid="price-watch">
                <PriceList title="May rise" tone="up" rows={data.priceWatch.risers} />
                <PriceList title="May fall" tone="down" rows={data.priceWatch.fallers} />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Full list on the <Link href="/price-changes" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300">Price Changes</Link> page.
              </p>
            </SectionCard>

            {/* Double and blank gameweeks */}
            <SectionCard
              icon={Sparkles}
              title="Double and blank gameweeks"
              subtitle="Which teams play twice, or not at all, this gameweek"
              action={
                <ShareImageButton
                  getCard={() => dgwBgwCard({ gameweek: data.gameweek, doubles: data.doubles, blanks: data.blanks, tbc: data.tbc })}
                  fileName={shareFileName(["double-blank", `gw${data.gameweek}`])}
                />
              }
            >
              <div className="space-y-4" data-testid="dgw-bgw">
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-sm font-bold text-gray-900">
                    <TrendingUp className="h-4 w-4 text-amber-500" /> Double
                  </div>
                  {data.doubles.length ? <TeamChips teams={data.doubles} tone="amber" /> : <span className="text-sm text-gray-500">None this gameweek.</span>}
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-sm font-bold text-gray-900">
                    <TrendingDown className="h-4 w-4 text-gray-500" /> Blank
                  </div>
                  {data.blanks.length ? <TeamChips teams={data.blanks} tone="slate" /> : <span className="text-sm text-gray-500">None this gameweek.</span>}
                </div>
                {data.tbc.length > 0 && (
                  <div data-testid="tbc">
                    <div className="mb-1.5 flex items-center gap-2 text-sm font-bold text-gray-900">
                      <CalendarClock className="h-4 w-4 text-sky-500" /> Fixture TBC
                    </div>
                    <TeamChips teams={data.tbc} tone="sky" />
                    <p className="mt-1.5 text-xs text-gray-500">No fixture this gameweek, but one is still unscheduled.</p>
                  </div>
                )}
              </div>
            </SectionCard>

            <p className="text-xs text-gray-500">Expected points are model estimates, not guarantees.</p>
          </div>
        )}
      </div>
    </div>
  );
}
