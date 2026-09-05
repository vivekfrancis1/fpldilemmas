// FPL applies price changes at midnight UK time (00:00 BST/GMT depending on the time of year),
// not midnight UTC. During BST that's 23:00 UTC the previous day, so a change FPL and users both
// consider to have happened "today" (in UK terms) can land on the previous UTC calendar date —
// e.g. a change applied at 00:00 BST on Sep 5 is 23:00 UTC on Sep 4. Anything that stores or
// compares a price change's "date" needs to use this instead of `new Date().toISOString()`,
// which is silently UTC and drifts a day off for roughly a third of every day during BST.
export function getLondonDateString(date: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD directly, so no reassembly of the parts is needed.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
