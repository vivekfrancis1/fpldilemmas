// Remembered team ID for Rate My Team, Hindsight and League Ownership. These tools often look up OTHER managers, so they
// keep their own key and never overwrite the ID My Team saved ("fpl-manager-id"); that one is only read to pre-fill.

export const MY_TEAM_KEY = "fpl-manager-id";
export const TOOLS_KEY = "fpl-tools-manager-id";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const browserStorage = (): KeyValueStore | undefined => {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

export function readToolManagerId(storage: KeyValueStore | undefined = browserStorage()): string {
  try {
    return storage?.getItem(TOOLS_KEY) || storage?.getItem(MY_TEAM_KEY) || "";
  } catch {
    return "";
  }
}

export function saveToolManagerId(id: string, storage: KeyValueStore | undefined = browserStorage()): void {
  try {
    storage?.setItem(TOOLS_KEY, id);
  } catch {
    /* storage unavailable: the tool still works for this visit */
  }
}
