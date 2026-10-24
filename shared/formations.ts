// Formations and the slots they are made of, for the editable Predicted Lineup. A slot is one place in the XI with a
// role (GK, LB, CB, RB, LWB, RWB, CDM, CM, CAM, LM, RM, LW, RW, ST), numbered goalkeeper first, then line by line from
// the back, left to right. Pure.

// FotMob shows whatever formation a club lines up in, with no fixed list. These are the ones it has shown for Premier
// League matches this season (4-2-3-1, 3-4-2-1, 3-4-3, 5-4-1, 4-1-4-1, 3-5-2, 4-3-3, 4-1-2-3) plus the other shapes
// teams play, most common first.
export const FORMATIONS: readonly string[] = [
  "4-2-3-1", "4-3-3", "4-4-2", "3-4-2-1", "3-4-3", "3-5-2", "5-4-1", "5-3-2", "4-1-4-1", "4-5-1",
  "4-4-1-1", "4-3-2-1", "4-1-2-3", "4-3-1-2", "4-2-2-2", "3-4-1-2", "3-1-4-2", "3-3-3-1", "3-5-1-1",
  "4-1-2-1-2", "4-1-3-2", "5-2-3", "5-2-2-1", "5-3-1-1", "5-2-1-2", "4-2-4",
];

export function isFormation(value: string): boolean {
  return FORMATIONS.includes(value);
}

export interface FormationSlot {
  /** 0 = goalkeeper, 1 = back line, up to the front line. */
  line: number;
  /** Position within the line, left to right. */
  index: number;
  role: string;
}

const BACK: Record<number, string[]> = {
  2: ["CB", "CB"],
  3: ["CB", "CB", "CB"],
  4: ["LB", "CB", "CB", "RB"],
  5: ["LWB", "CB", "CB", "CB", "RWB"],
};
const FRONT: Record<number, string[]> = {
  1: ["ST"],
  2: ["ST", "ST"],
  3: ["LW", "ST", "RW"],
  4: ["LW", "ST", "ST", "RW"],
};

function midRoles(k: number, m: number, n: number, back: number): string[] {
  if (n >= 4) {
    const [left, right] = back === 3 ? ["LWB", "RWB"] : ["LM", "RM"];
    return [left, ...Array<string>(n - 2).fill("CM"), right];
  }
  if (m >= 2 && k === 0) return Array<string>(n).fill(n >= 3 ? "CM" : "CDM");
  if (m >= 2 && k === m - 1) return n === 3 ? ["LW", "CAM", "RW"] : Array<string>(n).fill("CAM");
  return Array<string>(n).fill("CM");
}

export function formationSlots(formation: string): FormationSlot[] {
  const lines = formation.split("-").map(Number);
  const back = lines[0];
  const mids = lines.slice(1, -1);
  const roles: string[][] = [
    BACK[back] ?? Array<string>(back).fill("CB"),
    ...mids.map((n, k) => midRoles(k, mids.length, n, back)),
    FRONT[lines[lines.length - 1]] ?? Array<string>(lines[lines.length - 1]).fill("ST"),
  ];
  const slots: FormationSlot[] = [{ line: 0, index: 0, role: "GK" }];
  roles.forEach((line, l) => line.forEach((role, index) => slots.push({ line: l + 1, index, role })));
  return slots;
}

const FAMILY: Record<string, "gk" | "back" | "mid" | "attack"> = {
  GK: "gk", CB: "back", LB: "back", RB: "back", LWB: "back", RWB: "back",
  CDM: "mid", CM: "mid", CAM: "mid", LM: "mid", RM: "mid", LW: "attack", RW: "attack", ST: "attack",
};
const FPL_FAMILY = { GKP: "gk", DEF: "back", MID: "mid", FWD: "attack" } as const;
const NEIGHBOUR: Record<string, string> = { LM: "LW", LW: "LM", RM: "RW", RW: "RM" };

/**
 * How well a player suits a slot: 3 his main position, 2 another position he plays, 1 the same part of the pitch (or a
 * wide midfielder / winger on the same side), 0 otherwise, -1 never (a goalkeeper outfield, an outfielder in goal).
 * `codes` are his detailed positions, main first, or null when unknown (then his FPL position decides).
 */
export function slotFit(role: string, codes: string[] | null, fplPosition: keyof typeof FPL_FAMILY): number {
  const main = codes?.[0];
  const isKeeper = main ? main === "GK" : fplPosition === "GKP";
  if (role === "GK") return isKeeper ? (main ? 3 : 1) : -1;
  if (isKeeper) return -1;
  if (main === role) return 3;
  if (codes?.slice(1).includes(role)) return 2;
  const family = main ? FAMILY[main] : FPL_FAMILY[fplPosition];
  if (family === FAMILY[role]) return 1;
  if (NEIGHBOUR[role] && codes?.includes(NEIGHBOUR[role])) return 1;
  return 0;
}
