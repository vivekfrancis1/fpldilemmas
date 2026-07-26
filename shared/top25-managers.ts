// Top 25 FPL managers, sourced from fplresearch.com. Last refreshed: 2026-07-06.
//
// KNOWN STALE: FPL did a platform-wide manager (entry) ID renumbering on 2026-07-23,
// after this list was last scraped. Every managerId below (except Ben Crellin, rank 7 -
// confirmed current via his own launch-day post, and also cross-referenced against the
// content-creators list which shared the same old id) now resolves to an unrelated
// person, not the named manager (verified live: e.g. managerId 43164 no longer belongs
// to Cameron Scott). There is no API-based way to resolve old->new IDs before league
// standings populate post-GW1. Do not use the unconfirmed IDs for anything until
// re-scraped from fplresearch.com (or an equivalent source) after the season is underway.
export type Top25ManagerEntry = {
  rank: number;
  name: string;
  managerId: number;
};

export const TOP_25_MANAGERS_LAST_UPDATED = "2026-07-06";

export const TOP_25_MANAGERS: Top25ManagerEntry[] = [
  { rank: 1, name: "Cameron Scott", managerId: 43164 },
  { rank: 2, name: "- elevenify.com", managerId: 9325733 },
  { rank: 3, name: "Tom Dollimore", managerId: 497000 },
  { rank: 4, name: "John Walsh", managerId: 1277598 },
  { rank: 5, name: "Abinav C", managerId: 175376 },
  { rank: 6, name: "Huss E", managerId: 10421 },
  { rank: 7, name: "Ben Crellin", managerId: 53517 },
  { rank: 8, name: "Michael Giovanni", managerId: 69716 },
  { rank: 9, name: "Sam Hackett", managerId: 143684 },
  { rank: 10, name: "Uzair Rizwan", managerId: 642254 },
  { rank: 11, name: "Mattias Forsblom", managerId: 6743 },
  { rank: 12, name: "Harry Daniels", managerId: 1320 },
  { rank: 13, name: "Fábio Borges", managerId: 4783108 },
  { rank: 14, name: "-Calm -", managerId: 18383 },
  { rank: 15, name: "Jovan Popović", managerId: 226819 },
  { rank: 16, name: "Mark Hurst", managerId: 62110 },
  { rank: 17, name: "Michael Herbert", managerId: 1066 },
  { rank: 18, name: "Łukasz Woźniak", managerId: 859923 },
  { rank: 19, name: "Sam McKenzie", managerId: 256195 },
  { rank: 20, name: "Jon Ballantyne", managerId: 3903264 },
  { rank: 21, name: "Mark Brookes", managerId: 4826 },
  { rank: 22, name: "Tom N", managerId: 386057 },
  { rank: 23, name: "Josh Shah", managerId: 45338 },
  { rank: 24, name: "Simon MacNair", managerId: 742000 },
  { rank: 25, name: "Jonas Fougner", managerId: 12555 },
];
