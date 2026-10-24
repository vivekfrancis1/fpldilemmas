/** True once a fixture's 90 minutes are over, even before FPL confirms bonus points. FPL's own
 * `finished` flag stays false for a while after full time (often ~1hr+) while bonus is being
 * finalized; `finished_provisional` flips the moment the match itself ends and is what "has this
 * team/player actually played" should key off, not the bureaucratic bonus-confirmation delay. */
export function isFixtureActuallyOver(fixture: { finished?: boolean; finished_provisional?: boolean }): boolean {
  return !!(fixture.finished || fixture.finished_provisional);
}
