// Small, dependency-free CSV helpers for exporting tables exactly as shown on screen.

const NUMBER_LIKE = /^-?\d+(\.\d+)?$/;

/** One CSV cell. Quotes when needed, doubles embedded quotes, and defuses spreadsheet formulas in text cells. */
export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = value;
  // A text cell that starts with = + - @ (or a tab/CR) could be run as a formula; a real number like "-3.5" is fine.
  if (/^[=+@\t\r]/.test(text) || (text.startsWith("-") && !NUMBER_LIKE.test(text))) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Header row plus data rows, CRLF separated, no trailing newline. */
export function buildCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

/**
 * Turns what a table cell displays ("£5.5m", "12.3%", "1,234", "+0.3") into a plain number. Placeholders such as
 * "—", "-", "N/A" or "..." give null, never 0.
 */
export function numericFromDisplay(text: string): number | null {
  const m = /^([+-]?)£?([\d,]+(?:\.\d+)?|\.\d+)[m%]?$/.exec(text.trim());
  if (!m) return null;
  const n = Number(`${m[1] === "-" ? "-" : ""}${m[2].replace(/,/g, "")}`);
  return Number.isFinite(n) ? n : null;
}

/** The text content of a rendered cell (a string, number or React-element-like object with props.children). */
export function textOfNode(node: any): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOfNode).join("");
  return textOfNode(node.props?.children);
}

/** e.g. csvFileName(["fpl-dilemmas", "player-stats", "2026/27"], "2026-10-21") -> "fpl-dilemmas-player-stats-2026-27-2026-10-21.csv" */
export function csvFileName(parts: string[], date: string): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${[...parts.map(slug), date].filter(Boolean).join("-")}.csv`;
}
