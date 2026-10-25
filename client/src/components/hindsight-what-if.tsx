import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, SectionCard } from "@/components/tool-ui";
import { CHIP_LABEL, useSeason, type SeasonPlayer } from "@/components/hindsight-season";

type Scenario = "set-and-forget" | "captain" | "vice" | "form-captain" | "keeper" | "rotation" | "chips" | "hits" | "wildcard" | "freehit";

const SCENARIOS: Array<{ id: Scenario; title: string; question: string }> = [
  { id: "set-and-forget", title: "Set and forget", question: "What if you never made a transfer after a gameweek?" },
  { id: "captain", title: "Same captain every week", question: "What if you captained one player every game?" },
  { id: "vice", title: "Vice-captain instead", question: "What if you always gave the armband to your vice-captain?" },
  { id: "form-captain", title: "Chase form", question: "What if you captained last week's top scorer in your XI?" },
  { id: "keeper", title: "One goalkeeper", question: "What if you stopped rotating your goalkeeper?" },
  { id: "rotation", title: "Stop rotating", question: "What if you stuck with your regulars in a position?" },
  { id: "chips", title: "Chip timing", question: "Were your Bench Boost and Triple Captain well timed?" },
  { id: "hits", title: "Transfer hits", question: "Were the hits you took worth it?" },
  { id: "wildcard", title: "No Wildcard", question: "What if you kept your old squad instead of wildcarding?" },
  { id: "freehit", title: "No Free Hit", question: "What if you hadn't played your Free Hit?" },
];

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
const tone = (n: number): "green" | "red" | "gray" => (n > 0 ? "green" : n < 0 ? "red" : "gray");

async function fetchWhatIf(managerId: string, params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const res = await fetch(`/api/hindsight/${encodeURIComponent(managerId)}/what-if?${qs}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Something went wrong");
  }
  return res.json();
}

function Headline({ children, testId }: { children: ReactNode; testId?: string }) {
  return <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4 text-base font-bold text-gray-900 sm:text-lg" data-testid={testId}>{children}</div>;
}

function Row({ gw, children, delta }: { gw: number; children: ReactNode; delta?: number }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2 sm:px-5">
      <span className="w-12 text-sm font-extrabold text-gray-900">GW{gw}</span>
      <span className="flex-1 text-xs text-gray-600 sm:text-sm">{children}</span>
      {delta !== undefined && <Pill tone={tone(delta)}>{signed(delta)}</Pill>}
    </li>
  );
}

const moreFewer = (n: number) => (n === 0 ? "the same number of points" : `${Math.abs(n)} ${n > 0 ? "more" : "fewer"} point${Math.abs(n) === 1 ? "" : "s"}`);
const POSITION_WORD: Record<string, string> = { GKP: "goalkeepers", DEF: "defenders", MID: "midfielders", FWD: "forwards" };
const pts = (n: number) => `${n} pt${n === 1 ? "" : "s"}`;

export function WhatIfView({ managerId }: { managerId: string }) {
  const [scenario, setScenario] = useState<Scenario>("set-and-forget");
  const [from, setFrom] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [keeperId, setKeeperId] = useState<string>("");
  const [position, setPosition] = useState<string>("DEF");

  const season = useSeason(managerId, true);
  const players: SeasonPlayer[] = season.data?.players ?? [];
  const keepers = players.filter((p) => p.position === "GKP");
  const gameweeks = season.data?.rows.map((r) => r.gameweek) ?? [];

  // Sensible defaults once the squads are known: the most-captained player, the first week
  useEffect(() => {
    if (!season.data) return;
    if (!playerId && players[0]) setPlayerId(String(players[0].id));
  }, [season.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsPlayer = scenario === "captain";
  const params: Record<string, string | undefined> = { scenario };
  if (scenario === "set-and-forget") params.from = from || undefined;
  if (scenario === "captain") params.player = playerId;
  if (scenario === "keeper") params.player = keeperId || undefined;
  if (scenario === "rotation") params.position = position;

  const ready = !!season.data && (!needsPlayer || !!playerId);
  const { data, error, isFetching } = useQuery<any>({
    queryKey: ["/api/hindsight", managerId, "what-if", params],
    enabled: ready,
    retry: false,
    placeholderData: (prev: any) => prev,
    queryFn: () => fetchWhatIf(managerId, params),
    staleTime: 10 * 60 * 1000,
  });
  const current = data && data.scenario === scenario ? data : null;

  const selectFor = () => {
    if (scenario === "set-and-forget") {
      return (
        <Picker label="Keep the squad you had in">
          <Select value={from || String(gameweeks[0] ?? "")} onValueChange={setFrom}>
            <SelectTrigger className="h-10 w-[170px] rounded-xl" data-testid="select-from"><SelectValue /></SelectTrigger>
            <SelectContent>{gameweeks.map((g) => <SelectItem key={g} value={String(g)}>Gameweek {g}</SelectItem>)}</SelectContent>
          </Select>
        </Picker>
      );
    }
    if (scenario === "captain") {
      return (
        <Picker label="Captain">
          <Select value={playerId} onValueChange={setPlayerId}>
            <SelectTrigger className="h-10 w-[220px] rounded-xl" data-testid="select-player"><SelectValue placeholder="Choose a player" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {players.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} · {p.position} · {p.weeks} wk{p.weeks === 1 ? "" : "s"}</SelectItem>)}
            </SelectContent>
          </Select>
        </Picker>
      );
    }
    if (scenario === "rotation") {
      return (
        <Picker label="Position">
          <Select value={position} onValueChange={setPosition}>
            <SelectTrigger className="h-10 w-[170px] rounded-xl" data-testid="select-position"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[["DEF", "Defenders"], ["MID", "Midfielders"], ["FWD", "Forwards"], ["GKP", "Goalkeepers"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Picker>
      );
    }
    if (scenario === "keeper" && keepers.length > 0) {
      return (
        <Picker label="Always start">
          <Select value={keeperId || (current ? String(current.keeper.id) : "")} onValueChange={setKeeperId}>
            <SelectTrigger className="h-10 w-[220px] rounded-xl" data-testid="select-keeper"><SelectValue placeholder="Most-started keeper" /></SelectTrigger>
            <SelectContent>{keepers.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} · {p.weeks} wk{p.weeks === 1 ? "" : "s"} in squad</SelectItem>)}</SelectContent>
          </Select>
        </Picker>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5" data-testid="what-if-view">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScenario(s.id)}
            aria-pressed={scenario === s.id}
            data-testid={`scenario-${s.id}`}
            className={`rounded-2xl border p-3 text-left transition-colors ${scenario === s.id ? "border-indigo-500/50 bg-indigo-500/[0.08] shadow-sm" : "border-gray-200 bg-white hover:border-indigo-500/30"}`}
          >
            <div className="text-sm font-extrabold text-gray-900">{s.title}</div>
            <div className="text-xs text-gray-600">{s.question}</div>
          </button>
        ))}
      </div>

      {season.error && <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm">{(season.error as Error).message}</div>}
      {selectFor()}
      {error && <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm" data-testid="text-whatif-error">{(error as Error).message}</div>}
      {!current && !error && <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">{isFetching || season.isLoading ? "Working it out…" : "Choose a scenario above."}</div>}

      {current && !error && (
        <SectionCard icon={Lightbulb} title={SCENARIOS.find((s) => s.id === scenario)!.title} subtitle={SCENARIOS.find((s) => s.id === scenario)!.question} bodyClassName="p-0" testId="what-if-result">
          <div className="space-y-3 p-4 sm:p-5">
            <Result scenario={scenario} d={current} />
          </div>
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            <Rows scenario={scenario} d={current} />
          </ul>
        </SectionCard>
      )}

      <p className="text-xs text-gray-500">
        Every number is exact arithmetic on your real squads and each player's final points. Nothing is predicted. Auto-subs and vice-captain promotion are
        not re-run, so a scenario shows what the points would have been had that one thing differed, not a full re-simulation of your season.
      </p>
    </div>
  );
}

function Picker({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-700">
      <span>{label}</span>
      {children}
    </div>
  );
}

function Result({ scenario, d }: { scenario: Scenario; d: any }) {
  const t = d.totals;
  switch (scenario) {
    case "set-and-forget":
      return (
        <>
          <Headline testId="text-whatif-headline">
            Keeping your GW{d.fromGameweek} squad: {moreFewer(t.delta)} from the best XI each week
            {t.hitsSaved > 0 ? `, plus ${t.hitsSaved} in transfer costs saved (${moreFewer(t.netDelta)} overall)` : ""}.
          </Headline>
          <p className="text-sm text-gray-600">
            Both sides use the best XI from the squad held (no chips), so no lineup is invented. Your GW{d.fromGameweek} squad: {d.squad.map((p: any) => p.name).join(", ")}.
          </p>
        </>
      );
    case "captain":
      return (
        <Headline testId="text-whatif-headline">
          Captaining {d.player.name} every week: {moreFewer(t.delta)}, across {t.weeksApplied} week{t.weeksApplied === 1 ? "" : "s"} where he was in your XI.
          <span className="mt-1 block text-sm font-medium text-gray-600">
            {t.weeksAlready} already captain · {t.weeksNotInXI} on your bench · {t.weeksNotInSquad} not in your squad (no change in those).
          </span>
        </Headline>
      );
    case "vice":
      return (
        <Headline testId="text-whatif-headline">
          Giving the armband to your vice-captain every week: {moreFewer(t.delta)} over {t.weeksApplied} week{t.weeksApplied === 1 ? "" : "s"}.
        </Headline>
      );
    case "form-captain":
      return (
        <Headline testId="text-whatif-headline">
          Giving the armband to last week's top scorer in your XI: {moreFewer(t.delta)} over {t.weeksApplied} week{t.weeksApplied === 1 ? "" : "s"}.
          <span className="mt-1 block text-sm font-medium text-gray-600">{t.weeksAlready} week{t.weeksAlready === 1 ? "" : "s"} he was already your captain. The first gameweek is unchanged.</span>
        </Headline>
      );
    case "rotation":
      return d.totals.weeksChanged === 0 ? (
        <Headline testId="text-whatif-headline">You already started the same {POSITION_WORD[d.position]} every week, so nothing would change.</Headline>
      ) : (
        <>
          <Headline testId="text-whatif-headline">
            Sticking with your regular {POSITION_WORD[d.position]}: {moreFewer(t.delta)} across {t.weeksChanged} week{t.weeksChanged === 1 ? "" : "s"} where you chose differently.
          </Headline>
          <p className="text-sm text-gray-600">Most-started: {d.core.slice(0, 6).map((p: any) => `${p.name} (${p.weeks})`).join(", ")}. The captain is left where he was.</p>
        </>
      );
    case "wildcard":
    case "freehit": {
      const label = scenario === "wildcard" ? "Wildcard" : "Free Hit";
      return d.chips.length === 0 ? (
        <Headline testId="text-whatif-headline">You haven't played a {label} in a finished gameweek (or it was your first week, with no earlier squad to keep).</Headline>
      ) : (
        <>
          <Headline testId="text-whatif-headline">
            Without your {label}: {moreFewer(t.delta)} from the best XI {scenario === "wildcard" ? "over the weeks counted" : "that week"}.
          </Headline>
          <p className="text-sm text-gray-600">
            Both sides use the best XI from the squad held (no chips). Positive means keeping the earlier squad would have scored more.
            {scenario === "wildcard" ? ` Counts the Wildcard week and the next ${d.horizon - 1}.` : ""}
          </p>
        </>
      );
    }
    case "keeper":
      return (
        <>
          <Headline testId="text-whatif-headline">
            {t.weeksChanged === 0
              ? `You started ${d.keeper.name} every week he was in your squad, so nothing would change.`
              : `Starting ${d.keeper.name} every week he was in your squad: ${moreFewer(t.delta)} across ${t.weeksChanged} week${t.weeksChanged === 1 ? "" : "s"} where you started someone else.`}
          </Headline>
          <p className="text-sm text-gray-600">Keepers you started: {d.startedCounts.map((k: any) => `${k.name} (${k.weeks})`).join(", ")}.</p>
        </>
      );
    case "chips":
      return d.chips.length === 0 ? (
        <Headline testId="text-whatif-headline">You haven't played a Bench Boost or Triple Captain yet.</Headline>
      ) : (
        <Headline testId="text-whatif-headline">
          Your chips gave you {t.gain} points. The best weeks available for those chips would have given {t.gain + t.missed}.
        </Headline>
      );
    case "hits":
      return d.rows.length === 0 ? (
        <Headline testId="text-whatif-headline">You haven't taken a transfer hit in a finished gameweek.</Headline>
      ) : (
        <Headline testId="text-whatif-headline">
          {t.hits} hit{t.hits === 1 ? "" : "s"} costing {t.cost} points. {t.worthIt} paid off; {moreFewer(t.net)} in total after the hits, counting each hit's gameweek and the next {d.horizon - 1}.
        </Headline>
      );
  }
}

function Rows({ scenario, d }: { scenario: Scenario; d: any }) {
  switch (scenario) {
    case "set-and-forget":
      return d.rows.map((r: any) => (
        <Row key={r.gameweek} gw={r.gameweek} delta={r.delta}>
          Best XI from the kept squad {r.fixedBest} vs from the squad you held {r.actualBest}
        </Row>
      ));
    case "captain": {
      const text: Record<string, string> = { already: "already your captain", "not-in-xi": "on your bench", "not-in-squad": "not in your squad", "no-captain": "no captain on record" };
      return d.rows.map((r: any) => (
        <Row key={r.gameweek} gw={r.gameweek} delta={r.status === "applied" || r.status === "already" ? r.delta : undefined}>
          {r.status === "applied" ? `${d.player.name} ${r.playerPoints} vs your captain ${r.captainPoints}` : text[r.status]}
        </Row>
      ));
    }
    case "vice": {
      return d.rows.map((r: any) => (
        <Row key={r.gameweek} gw={r.gameweek} delta={r.status === "applied" ? r.delta : undefined}>
          {r.status === "applied"
            ? `${r.vice.name} ${r.vice.points} vs your captain ${r.captain.name} ${r.captain.points}`
            : r.status === "not-in-xi" ? `${r.vice?.name ?? "Vice-captain"} was on your bench` : "no vice-captain on record"}
        </Row>
      ));
    }
    case "form-captain":
      return d.rows.map((r: any) => (
        <Row key={r.gameweek} gw={r.gameweek} delta={r.status === "applied" ? r.delta : undefined}>
          {r.status === "applied"
            ? `${r.player.name} (${r.player.previousPoints} last week) ${r.player.points} vs your captain ${r.captain.name} ${r.captain.points}`
            : r.status === "already" ? `${r.player.name} was already your captain`
            : r.status === "no-previous" ? "no earlier gameweek to chase" : "no captain on record"}
        </Row>
      ));
    case "rotation":
      return d.rows.map((r: any) => (
        <Row key={r.gameweek} gw={r.gameweek} delta={r.status === "changed" ? r.delta : undefined}>
          {r.status === "changed"
            ? `${r.instead.map((p: any) => `${p.name} ${p.points}`).join(", ")} instead of ${r.started.map((p: any) => `${p.name} ${p.points}`).join(", ")}`
            : r.status === "bench-boost" ? "Bench Boost week (all players count)" : "same as your regulars"}
        </Row>
      ));
    case "wildcard":
    case "freehit":
      return d.chips.flatMap((c: any) => c.rows.map((r: any, i: number) => (
        <Row key={`${c.gameweek}-${r.gameweek}`} gw={r.gameweek} delta={r.delta}>
          {i === 0 ? `${scenario === "wildcard" ? "Wildcard" : "Free Hit"} week: ` : ""}best XI from your GW{c.squadFrom} squad {r.fixedBest} vs from the squad you held {r.actualBest}
          {i === c.rows.length - 1 && c.partial ? " · more gameweeks to come" : ""}
        </Row>
      )));
    case "keeper":
      return d.rows.map((r: any) => (
        <Row key={r.gameweek} gw={r.gameweek} delta={r.status === "changed" ? r.delta : undefined}>
          {r.status === "changed" ? `${d.keeper.name} ${r.keeperPoints} vs ${r.started.name} ${r.started.points}` : r.status === "same" ? `you started ${d.keeper.name}` : r.status === "bench-boost" ? "Bench Boost week (both keepers count)" : `${d.keeper.name} not in your squad`}
        </Row>
      ));
    case "chips":
      return d.chips.map((c: any) => (
        <Row key={c.usedGameweek} gw={c.usedGameweek} delta={-c.missed}>
          {CHIP_LABEL[c.chip]}: {c.chip === "bboost" ? `your bench scored ${pts(c.gain)}` : `your captain scored ${pts(c.gain)}`}.{" "}
          {c.missed > 0 ? `Best week in that window: GW${c.best.gameweek} (${pts(c.best.gain)}).` : "That was the best week in its window."}
        </Row>
      ));
    case "hits":
      return d.rows.map((r: any) => (
        <Row key={r.gameweek} gw={r.gameweek} delta={r.net}>
          In: {r.bought.map((p: any) => p.name).join(", ") || "—"} ({r.pointsBought}) · Out: {r.sold.map((p: any) => p.name).join(", ") || "—"} ({r.pointsSold}) · hit −{r.cost}
          {r.partial ? ` · only ${r.weeksCounted} gameweek${r.weeksCounted === 1 ? "" : "s"} so far` : ""}
        </Row>
      ));
  }
}
