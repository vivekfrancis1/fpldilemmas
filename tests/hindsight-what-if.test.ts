import { describe, it, expect, beforeAll } from "vitest";
import { setAndForget, captainEveryWeek, stickWithKeeper, viceEveryWeek, chipTiming, hitsWorthIt, formCaptain, noChip, stopRotating, type WhatIfWeek, type WhatIfPick } from "../shared/hindsight-what-if";
import { bestPossible } from "../shared/hindsight";

// 15-man squads: ids 1-2 GKP, 11-15 DEF, 21-25 MID, 31-33 FWD
const SQUAD = [1, 2, 11, 12, 13, 14, 15, 21, 22, 23, 24, 25, 31, 32, 33];
const typeOf = (id: number): 1 | 2 | 3 | 4 => (id < 11 ? 1 : id < 21 ? 2 : id < 31 ? 3 : 4);
const START = [1, 11, 12, 13, 14, 21, 22, 23, 24, 31, 32];

function week(gameweek: number, points: Record<number, number>, o: { squad?: number[]; captain?: number; vice?: number; chip?: string | null; start?: number[]; cost?: number; official?: number } = {}): WhatIfWeek {
  const squad = o.squad ?? SQUAD;
  const start = o.start ?? START;
  const captain = o.captain ?? 31;
  const bboost = o.chip === "bboost";
  const pointsById = new Map<number, number>();
  for (const id of squad) pointsById.set(id, points[id] ?? 0);
  for (const [k, v] of Object.entries(points)) pointsById.set(Number(k), v);
  const picks: WhatIfPick[] = squad.map((id) => ({
    id,
    name: `P${id}`,
    elementType: typeOf(id),
    started: start.includes(id),
    multiplier: !start.includes(id) && !bboost ? 0 : id === captain ? (o.chip === "3xc" ? 3 : 2) : 1,
    isCaptain: id === captain,
    isVice: id === (o.vice ?? 32),
  }));
  return { gameweek, chip: o.chip ?? null, officialPoints: o.official ?? 0, transferCost: o.cost ?? 0, picks, pointsById };
}

const pts = (over: Record<number, number> = {}) => ({ 1: 2, 2: 1, 11: 4, 12: 2, 13: 2, 14: 1, 15: 0, 21: 5, 22: 3, 23: 2, 24: 2, 25: 1, 31: 6, 32: 2, 33: 1, ...over });

describe("setAndForget", () => {
  it("returns null when the manager has no squad in the starting gameweek", () => {
    expect(setAndForget([week(2, pts())], 1)).toBeNull();
  });

  it("with no transfers at all, the fixed squad equals the actual squad: zero difference", () => {
    const out = setAndForget([week(1, pts()), week(2, pts({ 21: 9 })), week(3, pts())], 1)!;
    expect(out.totals.delta).toBe(0);
    expect(out.rows.every((r) => r.delta === 0)).toBe(true);
    expect(out.rows).toHaveLength(3);
  });

  it("uses the squad held in the starting gameweek in every later week, and counts the best XI (no chip) on both sides", () => {
    // GW2: manager sold player 21 for 41 (a forward); player 21 scores 10, player 41 scores 1
    const squad2 = SQUAD.map((id) => (id === 21 ? 41 : id));
    const w1 = week(1, pts());
    const w2 = week(2, { ...pts({ 21: 10 }), 41: 1 }, { squad: squad2, start: START.map((id) => (id === 21 ? 41 : id)) });
    const out = setAndForget([w1, w2], 1)!;
    const fixed2 = bestPossible(SQUAD.map((id) => ({ id, elementType: typeOf(id), points: w2.pointsById.get(id)! })), null).total;
    const actual2 = bestPossible(squad2.map((id) => ({ id, elementType: id === 41 ? 4 : typeOf(id), points: w2.pointsById.get(id)! })), null).total;
    expect(out.rows[1].fixedBest).toBe(fixed2);
    expect(out.rows[1].actualBest).toBe(actual2);
    expect(out.rows[1].delta).toBe(fixed2 - actual2);
    expect(out.rows[1].delta).toBeGreaterThan(0);
  });

  it("starts from the chosen gameweek: earlier weeks are excluded and only later transfer hits count as saved", () => {
    const out = setAndForget([week(1, pts(), { cost: 4 }), week(2, pts(), { cost: 4 }), week(3, pts(), { cost: 8 })], 2)!;
    expect(out.fromGameweek).toBe(2);
    expect(out.rows.map((r) => r.gameweek)).toEqual([2, 3]);
    expect(out.totals.hitsSaved).toBe(8); // GW3 only: the hit in GW2 bought the squad being kept
    expect(out.totals.netDelta).toBe(out.totals.delta + 8);
  });

  it("totals are the sums of the rows", () => {
    const out = setAndForget([week(1, pts()), week(2, pts({ 31: 12 })), week(3, pts({ 22: 7 }))], 1)!;
    expect(out.totals.actualBest).toBe(out.rows.reduce((a, r) => a + r.actualBest, 0));
    expect(out.totals.fixedBest).toBe(out.rows.reduce((a, r) => a + r.fixedBest, 0));
    expect(out.squad.map((p) => p.id).sort((a, b) => a - b)).toEqual(SQUAD);
  });
});

describe("captainEveryWeek", () => {
  it("no change in weeks where the player already holds the armband", () => {
    const out = captainEveryWeek([week(1, pts())], 31);
    expect(out.rows[0].status).toBe("already");
    expect(out.rows[0].delta).toBe(0);
  });

  it("moves the armband: delta = (his points - the captain's) x (multiplier - 1)", () => {
    const out = captainEveryWeek([week(1, pts({ 31: 2, 21: 11 }), { captain: 31 })], 21);
    expect(out.rows[0].status).toBe("applied");
    expect(out.rows[0].delta).toBe(9); // 11 - 2, once extra under the normal x2
  });

  it("Triple Captain weeks use the x3 armband (two extra copies)", () => {
    const out = captainEveryWeek([week(1, pts({ 31: 2, 21: 11 }), { captain: 31, chip: "3xc" })], 21);
    expect(out.rows[0].delta).toBe(18);
  });

  it("weeks where he is on the bench or not in the squad are left unchanged and counted separately", () => {
    const benched = week(1, pts({ 25: 15 }), { captain: 31 }); // 25 is on the bench
    const absent = week(2, pts(), { squad: SQUAD.filter((id) => id !== 25), start: START });
    const out = captainEveryWeek([benched, absent], 25);
    expect(out.rows.map((r) => r.status)).toEqual(["not-in-xi", "not-in-squad"]);
    expect(out.totals.delta).toBe(0);
    expect(out.totals.weeksApplied).toBe(0);
    expect(out.totals.weeksNotInXI).toBe(1);
    expect(out.totals.weeksNotInSquad).toBe(1);
  });

  it("under Bench Boost a bench player is in play and can take the armband", () => {
    const out = captainEveryWeek([week(1, pts({ 25: 13, 31: 2 }), { captain: 31, chip: "bboost" })], 25);
    expect(out.rows[0].status).toBe("applied");
    expect(out.rows[0].delta).toBe(11);
  });

  it("totals add the deltas", () => {
    const out = captainEveryWeek([week(1, pts({ 31: 2, 21: 11 })), week(2, pts({ 31: 12, 21: 3 }))], 21);
    expect(out.totals.delta).toBe(9 + -9);
    expect(out.totals.weeksApplied).toBe(2);
  });
});

describe("stickWithKeeper", () => {
  it("defaults to the keeper started most often", () => {
    const a = week(1, pts());
    const b = week(2, pts(), { start: START.map((id) => (id === 1 ? 2 : id)) });
    const c = week(3, pts(), { start: START.map((id) => (id === 1 ? 2 : id)) });
    const out = stickWithKeeper([a, b, c])!;
    expect(out.keeper.id).toBe(2);
    expect(out.startedCounts).toEqual([{ id: 2, name: "P2", weeks: 2 }, { id: 1, name: "P1", weeks: 1 }]);
  });

  it("delta = the sticking keeper's points minus the keeper actually started, only in weeks he was rotated out", () => {
    const rot = START.map((id) => (id === 1 ? 2 : id));
    const out = stickWithKeeper([week(1, pts({ 1: 6, 2: 1 })), week(2, pts({ 1: 6, 2: 1 }), { start: rot })], 1)!;
    expect(out.rows[0].delta).toBe(0);
    expect(out.rows[1].started.id).toBe(2);
    expect(out.rows[1].delta).toBe(5);
    expect(out.totals.delta).toBe(5);
    expect(out.totals.weeksChanged).toBe(1);
  });

  it("a week where the sticking keeper was not in the squad is unchanged, and Bench Boost weeks are skipped", () => {
    const gone = week(1, pts(), { squad: SQUAD.filter((id) => id !== 1), start: START.map((id) => (id === 1 ? 2 : id)) });
    const bb = week(2, pts(), { chip: "bboost" });
    const out = stickWithKeeper([gone, bb], 1)!;
    expect(out.rows.map((r) => r.status)).toEqual(["not-in-squad", "bench-boost"]);
    expect(out.totals.delta).toBe(0);
  });

  it("returns null when no goalkeeper was ever started", () => {
    expect(stickWithKeeper([])).toBeNull();
  });
});

describe("viceEveryWeek", () => {
  it("armband goes to the vice-captain: delta = (vice points - captain points) x (multiplier - 1)", () => {
    const out = viceEveryWeek([week(1, pts({ 31: 2, 32: 9 }), { captain: 31, vice: 32 })]);
    expect(out.rows[0].status).toBe("applied");
    expect(out.rows[0].delta).toBe(7);
  });

  it("Triple Captain weeks use the x3 armband", () => {
    const out = viceEveryWeek([week(1, pts({ 31: 2, 32: 9 }), { captain: 31, vice: 32, chip: "3xc" })]);
    expect(out.rows[0].delta).toBe(14);
  });

  it("a vice-captain on the bench cannot take the armband; no vice on record is skipped", () => {
    const benched = week(1, pts({ 33: 20 }), { captain: 31, vice: 33 });
    expect(viceEveryWeek([benched]).rows[0].status).toBe("not-in-xi");
    const none = week(2, pts(), { captain: 31, vice: 999 });
    expect(viceEveryWeek([none]).rows[0].status).toBe("no-vice");
  });

  it("totals add the deltas and count the weeks applied", () => {
    const out = viceEveryWeek([week(1, pts({ 31: 2, 32: 9 })), week(2, pts({ 31: 10, 32: 1 }))]);
    expect(out.totals.delta).toBe(7 - 9);
    expect(out.totals.weeksApplied).toBe(2);
  });
});

describe("chipTiming", () => {
  const windows = [{ name: "bboost", start: 1, stop: 19 }, { name: "3xc", start: 1, stop: 19 }];
  // bench players are 2, 15, 25, 33 in the default week()
  it("Bench Boost gain is the points of the original bench; the best alternative week is found in the window", () => {
    const used = week(1, pts({ 2: 1, 15: 0, 25: 1, 33: 1 }), { chip: "bboost" });
    const better = week(2, pts({ 2: 6, 15: 6, 25: 6, 33: 6 }));
    const out = chipTiming([used, better], windows);
    const bb = out.chips.find((c) => c.chip === "bboost")!;
    expect(bb.usedGameweek).toBe(1);
    expect(bb.gain).toBe(3);
    expect(bb.best).toEqual({ gameweek: 2, gain: 24 });
    expect(bb.missed).toBe(21);
  });

  it("Triple Captain gain is the captain's points (the extra multiple)", () => {
    const used = week(1, pts({ 31: 4 }), { chip: "3xc" });
    const better = week(2, pts({ 31: 15 }));
    const tc = chipTiming([used, better], windows).chips.find((c) => c.chip === "3xc")!;
    expect(tc.gain).toBe(4);
    expect(tc.best).toEqual({ gameweek: 2, gain: 15 });
  });

  it("weeks outside the chip's window, or where another chip was played, are not candidates", () => {
    const used = week(1, pts({ 31: 4 }), { chip: "3xc" });
    const otherChip = week(2, pts({ 31: 30 }), { chip: "freehit" });
    const outside = week(25, pts({ 31: 30 }));
    const tc = chipTiming([used, otherChip, outside], windows).chips[0];
    expect(tc.best).toEqual({ gameweek: 1, gain: 4 });
    expect(tc.missed).toBe(0);
  });

  it("the same chip used in each half is compared inside its own window", () => {
    const w = [{ name: "3xc", start: 1, stop: 19 }, { name: "3xc", start: 20, stop: 38 }];
    const out = chipTiming([week(1, pts({ 31: 5 }), { chip: "3xc" }), week(3, pts({ 31: 9 })), week(20, pts({ 31: 7 }), { chip: "3xc" }), week(22, pts({ 31: 20 }))], w);
    expect(out.chips.map((c) => [c.usedGameweek, c.best?.gameweek])).toEqual([[1, 3], [20, 22]]);
  });

  it("totals: points the chips gave, and points left by not choosing the best week; Wildcard and Free Hit are ignored; no chips -> empty", () => {
    const out = chipTiming([week(1, pts({ 31: 4 }), { chip: "3xc" }), week(2, pts({ 31: 15 })), week(3, pts(), { chip: "wildcard" })], windows);
    expect(out.totals.gain).toBe(4);
    expect(out.totals.missed).toBe(11);
    expect(out.chips).toHaveLength(1);
    expect(chipTiming([week(1, pts())], windows).chips).toEqual([]);
  });
});

describe("hitsWorthIt", () => {
  const swapped = (out: number, inn: number) => SQUAD.map((id) => (id === out ? inn : id));
  const startSwapped = (out: number, inn: number) => START.map((id) => (id === out ? inn : id));

  it("compares players bought and sold over the gameweek and the next three, net of the hit", () => {
    // GW2: sold 24 (MID) for 26 (MID), paid 4
    const w1 = week(1, pts());
    const w2 = week(2, { ...pts({ 24: 2 }), 26: 8 }, { squad: swapped(24, 26), start: startSwapped(24, 26), cost: 4 });
    const w3 = week(3, { ...pts({ 24: 1 }), 26: 6 }, { squad: swapped(24, 26), start: startSwapped(24, 26) });
    const out = hitsWorthIt([w1, w2, w3], 4);
    expect(out.rows).toHaveLength(1);
    const r = out.rows[0];
    expect(r.gameweek).toBe(2);
    expect(r.cost).toBe(4);
    expect(r.bought.map((p) => p.id)).toEqual([26]);
    expect(r.sold.map((p) => p.id)).toEqual([24]);
    expect(r.pointsBought).toBe(14);
    expect(r.pointsSold).toBe(3);
    expect(r.net).toBe(14 - 3 - 4);
    expect(r.weeksCounted).toBe(2);
    expect(r.partial).toBe(true);
  });

  it("weeks with no transfer cost, and the first week, produce no rows", () => {
    expect(hitsWorthIt([week(1, pts({}), { cost: 4 }), week(2, pts())], 4).rows).toEqual([]);
  });

  it("a hit is full (not partial) once the whole horizon has been played", () => {
    const sq = swapped(24, 26);
    const weeks = [week(1, pts())];
    for (let g = 2; g <= 6; g++) weeks.push(week(g, { ...pts(), 26: 3 }, { squad: sq, start: startSwapped(24, 26), cost: g === 2 ? 4 : 0 }));
    const r = hitsWorthIt(weeks, 4).rows[0];
    expect(r.weeksCounted).toBe(4);
    expect(r.partial).toBe(false);
  });

  it("the previous squad skips a Free Hit week", () => {
    const fh = week(2, pts(), { squad: swapped(24, 26), chip: "freehit" });
    const w3 = week(3, pts(), { cost: 4 }); // back to the original squad, paid 4 for nothing
    const out = hitsWorthIt([week(1, pts()), fh, w3], 4);
    expect(out.rows[0].bought).toEqual([]);
    expect(out.rows[0].net).toBe(-4);
  });

  it("totals: hits, cost and net; 'worth it' counts hits with a positive net", () => {
    const sq = swapped(24, 26);
    const out = hitsWorthIt([
      week(1, pts()),
      week(2, { ...pts(), 26: 12 }, { squad: sq, start: startSwapped(24, 26), cost: 4 }),
      week(3, { ...pts(), 26: 0 }, { squad: SQUAD, cost: 4 }),
    ], 1);
    expect(out.totals.hits).toBe(2);
    expect(out.totals.cost).toBe(8);
    expect(out.totals.net).toBe(out.rows.reduce((a, r) => a + r.net, 0));
    expect(out.totals.worthIt).toBe(out.rows.filter((r) => r.net > 0).length);
  });
});

describe("formCaptain", () => {
  it("week 1 and weeks with no previous gameweek on record are unchanged", () => {
    const out = formCaptain([week(1, pts()), week(3, pts())]);
    expect(out.rows.map((r) => r.status)).toEqual(["no-previous", "no-previous"]);
    expect(out.totals.delta).toBe(0);
  });

  it("the armband goes to last week's top scorer among the players counted this week", () => {
    const out = formCaptain([week(1, pts({ 24: 9 })), week(2, pts({ 24: 3, 31: 6 }), { captain: 31 })]);
    const r = out.rows[1];
    expect(r.status).toBe("applied");
    expect(r.player?.id).toBe(24);
    expect(r.delta).toBe(3 - 6);
  });

  it("a player on the bench this week is not a candidate", () => {
    const out = formCaptain([week(1, pts({ 25: 20, 21: 7 })), week(2, pts({ 21: 4, 31: 1 }), { captain: 31 })]);
    expect(out.rows[1].player?.id).toBe(21); // 25 scored most but sits on the bench in week 2
    expect(out.rows[1].delta).toBe(3);
  });

  it("ties on last week's points go to the lower id; already the captain means no change", () => {
    const tie = formCaptain([week(1, pts({ 21: 8, 22: 8, 31: 2 })), week(2, pts({ 21: 5, 22: 20 }))]);
    expect(tie.rows[1].player?.id).toBe(21);
    const same = formCaptain([week(1, pts({ 31: 15 })), week(2, pts())]);
    expect(same.rows[1].status).toBe("already");
    expect(same.rows[1].delta).toBe(0);
  });

  it("Triple Captain weeks use the x3 armband; totals add up", () => {
    const out = formCaptain([week(1, pts({ 24: 9 })), week(2, pts({ 24: 3, 31: 6 }), { chip: "3xc" }), week(3, pts({ 24: 1 })), week(4, pts({ 24: 12, 31: 2 }))]);
    expect(out.rows[1].delta).toBe((3 - 6) * 2);
    expect(out.totals.delta).toBe(out.rows.reduce((a, r) => a + r.delta, 0));
    expect(out.totals.weeksApplied).toBe(out.rows.filter((r) => r.status === "applied").length);
  });
});

describe("noChip", () => {
  const swapped = (out: number, inn: number) => SQUAD.map((id) => (id === out ? inn : id));

  it("Wildcard: compares the squad held before it with the squad you played, for the wildcard week and the next three", () => {
    const sq = swapped(24, 26);
    const weeks = [
      week(1, pts()),
      week(2, pts()),
      week(3, { ...pts({ 24: 9 }), 26: 1 }, { squad: sq, chip: "wildcard" }), // old squad (with 24) would have scored more
      week(4, { ...pts({ 24: 2 }), 26: 7 }, { squad: sq }),
    ];
    const out = noChip(weeks, "wildcard", 4);
    expect(out.chips).toHaveLength(1);
    const c = out.chips[0];
    expect(c.gameweek).toBe(3);
    expect(c.rows.map((r) => r.gameweek)).toEqual([3, 4]);
    expect(c.rows[0].delta).toBe(c.rows[0].fixedBest - c.rows[0].actualBest);
    expect(c.rows[0].delta).toBeGreaterThan(0);
    expect(c.rows[1].delta).toBeLessThan(0);
    expect(c.partial).toBe(true);
    expect(c.totals.delta).toBe(c.rows[0].delta + c.rows[1].delta);
    expect(out.totals.delta).toBe(c.totals.delta);
  });

  it("the squad before a chip skips an earlier Free Hit week", () => {
    const sq = swapped(24, 26);
    const weeks = [week(1, pts()), week(2, pts(), { squad: sq, chip: "freehit" }), week(3, { ...pts(), 26: 5 }, { squad: sq, chip: "wildcard" })];
    const c = noChip(weeks, "wildcard", 1).chips[0];
    expect(c.squadFrom).toBe(1);
  });

  it("Free Hit covers only its own week; no chip or a chip in the first week gives nothing", () => {
    const sq = swapped(24, 26);
    const weeks = [week(1, pts()), week(2, { ...pts({ 24: 9 }), 26: 0 }, { squad: sq, chip: "freehit" }), week(3, pts())];
    const out = noChip(weeks, "freehit", 1);
    expect(out.chips[0].rows.map((r) => r.gameweek)).toEqual([2]);
    expect(out.chips[0].partial).toBe(false);
    expect(noChip([week(1, pts(), { chip: "wildcard" })], "wildcard", 4).chips).toEqual([]);
    expect(noChip([week(1, pts()), week(2, pts())], "wildcard", 4).chips).toEqual([]);
  });
});

describe("stopRotating", () => {
  const defStart = (defs: number[]) => [1, ...defs, 21, 22, 23, 24, 31, 32];
  const w = (gw: number, defs: number[], points: Record<number, number>, o: Parameters<typeof week>[2] = {}) => week(gw, points, { start: defStart(defs), ...o });

  it("fields the position's most-started players every week: delta = their points - the ones you started", () => {
    const p = pts({ 14: 6, 15: 1 });
    const out = stopRotating([w(1, [11, 12, 13, 14], p), w(2, [11, 12, 13, 15], p), w(3, [11, 12, 13, 14], p)], "DEF")!;
    expect(out.core.map((c) => c.id).slice(0, 4)).toEqual([11, 12, 13, 14]);
    expect(out.rows.map((r) => r.delta)).toEqual([0, 5, 0]);
    expect(out.rows.map((r) => r.status)).toEqual(["same", "changed", "same"]);
    expect(out.totals.delta).toBe(5);
    expect(out.totals.weeksChanged).toBe(1);
  });

  it("a core player who is not in that week's squad is skipped and the next in rank is used", () => {
    const p = pts({ 14: 6, 15: 1 });
    const gone = w(2, [11, 12, 13, 15], p, { squad: SQUAD.filter((id) => id !== 14) });
    const out = stopRotating([w(1, [11, 12, 13, 14], p), gone, w(3, [11, 12, 13, 14], p)], "DEF")!;
    expect(out.rows[1].status).toBe("same");
    expect(out.rows[1].delta).toBe(0);
  });

  it("the captain stays where he is and is not part of the rotation", () => {
    const p = pts({ 11: 10, 14: 6, 15: 1 });
    const out = stopRotating([w(1, [11, 12, 13, 14], p, { captain: 11 }), w(2, [11, 12, 13, 15], p, { captain: 11 }), w(3, [11, 12, 13, 14], p, { captain: 11 })], "DEF")!;
    expect(out.rows[1].delta).toBe(6 - 1);
    expect(out.rows[0].delta).toBe(0);
  });

  it("Bench Boost weeks are skipped; no starters in the position gives null", () => {
    const out = stopRotating([w(1, [11, 12, 13, 14], pts()), w(2, [11, 12, 13, 15], pts(), { chip: "bboost" })], "DEF")!;
    expect(out.rows[1].status).toBe("bench-boost");
    expect(out.rows[1].delta).toBe(0);
    expect(stopRotating([], "MID")).toBeNull();
  });

  it("for goalkeepers it reproduces the One goalkeeper scenario", () => {
    const rot = START.map((id) => (id === 1 ? 2 : id));
    const weeks = [week(1, pts({ 1: 6, 2: 1 })), week(2, pts({ 1: 6, 2: 1 }), { start: rot }), week(3, pts({ 1: 2, 2: 9 }), { start: rot })];
    expect(stopRotating(weeks, "GKP")!.totals.delta).toBe(stickWithKeeper(weeks)!.totals.delta);
  });
});

const BASE_URL = process.env.TEST_BASE_URL ?? `http://localhost:5050`;
async function getJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, body: await res.json() };
}

describe("GET /api/hindsight/:managerId/what-if (against real finished gameweeks)", () => {
  let managerId: number;
  beforeAll(async () => {
    const top = (await getJson("/api/top-managers/teams")).body;
    managerId = top.teams.find((t: any) => t.success).managerId;
  }, 180000);

  it("set-and-forget: a manager who made no transfers would see zero difference; totals are sums of rows", async () => {
    const { status, body } = await getJson(`/api/hindsight/${managerId}/what-if?scenario=set-and-forget`);
    expect(status).toBe(200);
    expect(body.scenario).toBe("set-and-forget");
    expect(body.rows.length).toBeGreaterThan(0);
    expect(body.rows[0].delta).toBe(0); // the first week is the squad being kept
    expect(body.totals.delta).toBe(body.rows.reduce((a: number, r: any) => a + r.delta, 0));
    expect(body.totals.netDelta).toBe(body.totals.delta + body.totals.hitsSaved);
  }, 120000);

  it("captain: needs a numeric player; delta rows add up", async () => {
    expect((await getJson(`/api/hindsight/${managerId}/what-if?scenario=captain`)).status).toBe(400);
    const season = (await getJson(`/api/hindsight/${managerId}/season`)).body;
    const player = season.rows.find((r: any) => r.captain.chosen)!.captain.chosen.id;
    const { status, body } = await getJson(`/api/hindsight/${managerId}/what-if?scenario=captain&player=${player}`);
    expect(status).toBe(200);
    expect(body.totals.delta).toBe(body.rows.reduce((a: number, r: any) => a + r.delta, 0));
  }, 120000);

  it("keeper: defaults to the most-started keeper", async () => {
    const { status, body } = await getJson(`/api/hindsight/${managerId}/what-if?scenario=keeper`);
    expect(status).toBe(200);
    expect(body.keeper.id).toBe(body.startedCounts[0].id);
  }, 120000);

  it("vice, chips and hits scenarios respond with their totals", async () => {
    const vice = await getJson(`/api/hindsight/${managerId}/what-if?scenario=vice`);
    expect(vice.status).toBe(200);
    expect(vice.body.totals.delta).toBe(vice.body.rows.reduce((a: number, r: any) => a + r.delta, 0));
    const chips = await getJson(`/api/hindsight/${managerId}/what-if?scenario=chips`);
    expect(chips.status).toBe(200);
    for (const c of chips.body.chips) expect(c.missed).toBe(c.best.gain - c.gain);
    const hits = await getJson(`/api/hindsight/${managerId}/what-if?scenario=hits`);
    expect(hits.status).toBe(200);
    expect(hits.body.totals.hits).toBe(hits.body.rows.length);
    for (const r of hits.body.rows) expect(r.net).toBe(r.pointsBought - r.pointsSold - r.cost);
  }, 120000);

  it("form-captain, wildcard, freehit and rotation scenarios respond with consistent totals", async () => {
    const form = await getJson(`/api/hindsight/${managerId}/what-if?scenario=form-captain`);
    expect(form.status).toBe(200);
    expect(form.body.totals.delta).toBe(form.body.rows.reduce((a: number, r: any) => a + r.delta, 0));
    for (const scenario of ["wildcard", "freehit"]) {
      const { status, body } = await getJson(`/api/hindsight/${managerId}/what-if?scenario=${scenario}`);
      expect(status).toBe(200);
      expect(body.totals.delta).toBe(body.chips.reduce((a: number, c: any) => a + c.totals.delta, 0));
    }
    expect((await getJson(`/api/hindsight/${managerId}/what-if?scenario=rotation`)).status).toBe(400);
    expect((await getJson(`/api/hindsight/${managerId}/what-if?scenario=rotation&position=XYZ`)).status).toBe(400);
    const rot = await getJson(`/api/hindsight/${managerId}/what-if?scenario=rotation&position=DEF`);
    expect(rot.status).toBe(200);
    expect(rot.body.position).toBe("DEF");
    expect(rot.body.totals.delta).toBe(rot.body.rows.reduce((a: number, r: any) => a + r.delta, 0));
    const gk = (await getJson(`/api/hindsight/${managerId}/what-if?scenario=rotation&position=GKP`)).body;
    const keeper = (await getJson(`/api/hindsight/${managerId}/what-if?scenario=keeper`)).body;
    expect(gk.totals.delta).toBe(keeper.totals.delta);
  }, 120000);

  it("rejects an unknown scenario and a bad manager id", async () => {
    expect((await getJson(`/api/hindsight/${managerId}/what-if?scenario=nope`)).status).toBe(400);
    expect((await getJson(`/api/hindsight/abc/what-if?scenario=keeper`)).status).toBe(400);
    expect((await getJson(`/api/hindsight/999999999/what-if?scenario=keeper`)).status).toBe(404);
  }, 60000);
});
