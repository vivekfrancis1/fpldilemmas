import { Book, Target, Users, Shield, Clock, TrendingUp, Database, Calculator, Info, GitBranch, Zap, Trophy, BarChart3, FileText, AlertTriangle, CheckCircle, Settings, Activity, Cpu, Brain, Calendar, Home, UserCheck, Server, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ProtectedRoute from "@/components/protected-route";

export default function ProjectionDocumentation() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="fpl-page-container">
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <Book className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          Projection Documentation
        </div>
        <p className="fpl-page-subtitle">
          Comprehensive technical guide to all projection formulas, algorithms, and data sources
        </p>
      </div>

      <div className="fpl-section-spacing">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="flow">Logic Flow</TabsTrigger>
            <TabsTrigger value="algorithms">Algorithms</TabsTrigger>
            <TabsTrigger value="player-tools">Player Tools</TabsTrigger>
            <TabsTrigger value="team-tools">Team Tools</TabsTrigger>
            <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview" className="space-y-6">

            <Alert className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription>
                <strong className="text-lg">Real FPL Data · Set Piece Bonuses · AFCON / Injury Blend Correction</strong>
                <p className="mt-2">
                  All projections are built on <strong>verified full-season FPL API data</strong>. Set piece specialists receive goal/assist share bonuses from official FPL set piece order fields. Players who missed games through AFCON, injury, or a late transfer receive a <strong>time-weighted blend correction</strong> so their absence does not deflate their season rates.
                </p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div className="bg-white/50 p-2 rounded">
                    <strong>Goal Share:</strong> Season (goals + xG) + Penalty/Direct FK bonus
                  </div>
                  <div className="bg-white/50 p-2 rounded">
                    <strong>Assist Share:</strong> Season assists + Corner/Indirect FK bonus
                  </div>
                  <div className="bg-white/50 p-2 rounded">
                    <strong>Blend Logic:</strong> ~50 players corrected for structural absences
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Architecture */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Projection System Architecture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-700 text-lg">
                  A full-season FPL projection engine covering all ~515 Premier League players across GW1–38, using a hybrid 4-component formula for team goals and a percentage-share system for individual player distribution.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">Team Goals</h3>
                    </div>
                    <p className="text-sm text-blue-700 mb-2">Weighted 4-component formula</p>
                    <div className="space-y-1 text-xs text-blue-600">
                      <div>✓ GF × 0.4225</div>
                      <div>✓ xGF × 0.2275</div>
                      <div>✓ Opp GC × 0.2275</div>
                      <div>✓ Opp xGC × 0.1225</div>
                      <div>✓ Dynamic venue multiplier</div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-green-900">Share Distribution</h3>
                    </div>
                    <p className="text-sm text-green-700 mb-2">Current-club filtered shares</p>
                    <div className="space-y-1 text-xs text-green-600">
                      <div>✓ Transfer filter applied</div>
                      <div>✓ Set piece bonuses</div>
                      <div>✓ No position caps</div>
                      <div>✓ Per-team assist ratio</div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-5 w-5 text-orange-600" />
                      <h3 className="font-semibold text-orange-900">Blend Correction</h3>
                    </div>
                    <p className="text-sm text-orange-700 mb-2">AFCON / injury / transfer returnees</p>
                    <div className="space-y-1 text-xs text-orange-600">
                      <div>✓ ~50 of 515 players</div>
                      <div>✓ Time-weighted normalisation</div>
                      <div>✓ recentP60 from active games</div>
                      <div>✓ confidenceFactor = 1.0</div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-900">10-Component Total</h3>
                    </div>
                    <p className="text-sm text-purple-700 mb-2">Per player, per GW, per fixture</p>
                    <div className="space-y-1 text-xs text-purple-600">
                      <div>✓ Goals + Assists</div>
                      <div>✓ CS + Minutes + Bonus</div>
                      <div>✓ DC + Saves</div>
                      <div>✓ GC + YC + RC</div>
                    </div>
                  </div>
                </div>

                {/* 4-step summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">How It Works — 4 Steps</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-white p-3 rounded border-l-4 border-blue-400">
                      <div className="font-bold text-blue-700 mb-1">① Team Goals</div>
                      Weighted blend of GF, xGF, opponent GC and opponent xGC — averaged per game and scaled by a dynamic venue multiplier.
                    </div>
                    <div className="bg-white p-3 rounded border-l-4 border-green-400">
                      <div className="font-bold text-green-700 mb-1">② Share Distribution</div>
                      Each player's season contribution (goals + xG, assists) as a % of their current club's pool, boosted for set piece takers.
                    </div>
                    <div className="bg-white p-3 rounded border-l-4 border-orange-400">
                      <div className="font-bold text-orange-700 mb-1">③ Blend Correction</div>
                      For ~50 AFCON/injury returnees, the raw total is normalised to their per-game rate × team games so absence zeros don't drag shares down.
                    </div>
                    <div className="bg-white p-3 rounded border-l-4 border-purple-400">
                      <div className="font-bold text-purple-700 mb-1">④ Points Compilation</div>
                      10 FPL scoring components summed per fixture per GW, with availability probability applied for each player.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  Key Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      Goal Share with Set Piece Bonuses
                    </h4>
                    <div className="bg-blue-50 p-3 rounded text-sm">
                      <div className="font-mono text-xs mb-2">GoalShare% = BaseShare + PenaltyBonus + DirectFKBonus</div>
                      <ul className="space-y-1 text-blue-700">
                        <li>✓ <strong>Base:</strong> (goals + xG from current-club fixtures) / team total × 100</li>
                        <li>✓ <strong>Penalty #1:</strong> +0.8 + goals×0.04 (cap 1.5%)</li>
                        <li>✓ <strong>Penalty #2:</strong> +0.5 + goals×0.03 (cap 1.5%)</li>
                        <li>✓ <strong>Direct FK #1:</strong> +0.3 + goals×0.02 (cap 0.4%)</li>
                        <li>✓ No normalisation — additive boost only</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      Assist Share with Set Piece Bonuses
                    </h4>
                    <div className="bg-green-50 p-3 rounded text-sm">
                      <div className="font-mono text-xs mb-2">AssistShare% = BaseShare + CornerBonus + IndirectFKBonus</div>
                      <ul className="space-y-1 text-green-700">
                        <li>✓ <strong>Base:</strong> assists from current-club fixtures / team total × 100</li>
                        <li>✓ <strong>Corner #1:</strong> +0.8 + assists×0.03 (cap 1.2%)</li>
                        <li>✓ <strong>Corner #2:</strong> +0.4 + assists×0.02 (cap 1.2%)</li>
                        <li>✓ <strong>Indirect FK #1:</strong> +0.3%</li>
                        <li>✓ No normalisation — additive boost only</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-orange-600" />
                      AFCON / Injury / Transfer Blend Logic
                    </h4>
                    <div className="bg-orange-50 p-3 rounded text-sm">
                      <ul className="space-y-1 text-orange-700">
                        <li>✓ Qualifies if ≥3 active games, ≥4 consec DNP, ≥70% start rate, played last 4</li>
                        <li>✓ blendWeight = activeGames / teamGames</li>
                        <li>✓ blended = raw×weight + (raw/active × teamGames)×(1−weight)</li>
                        <li>✓ Corrects goalShare, assistShare, recentP60, confidenceFactor</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-cyan-600" />
                      Clean Sheet Probability
                    </h4>
                    <div className="bg-cyan-50 p-3 rounded text-sm">
                      <div className="font-mono text-xs mb-2">formulaCS = exp(−xGA × exponent) × multiplier</div>
                      <div className="font-mono text-xs mb-2">blendedCS% = 0.5 × formulaCS + 0.5 × actualCSPct</div>
                      <ul className="space-y-1 text-cyan-700">
                        <li>✓ Exponential decay from projected goals against</li>
                        <li>✓ Blended 50/50 with team's actual CS%</li>
                        <li>✓ Admin-configurable exponent and multiplier</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                  System Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-blue-700">~515</div>
                    <div className="text-sm text-blue-600 mt-1">Active Players</div>
                    <div className="text-xs text-blue-500 mt-1">All positions covered</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-green-700">20</div>
                    <div className="text-sm text-green-600 mt-1">PL Teams</div>
                    <div className="text-xs text-green-500 mt-1">Full squad coverage</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-purple-700">38</div>
                    <div className="text-sm text-purple-600 mt-1">Gameweeks</div>
                    <div className="text-xs text-purple-500 mt-1">Season-long forecast</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-orange-700">10</div>
                    <div className="text-sm text-orange-600 mt-1">FPL Components</div>
                    <div className="text-xs text-orange-500 mt-1">Complete point system</div>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-cyan-700">~50</div>
                    <div className="text-sm text-cyan-600 mt-1">Blend-Eligible</div>
                    <div className="text-xs text-cyan-500 mt-1">AFCON / injury returnees</div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-indigo-700">30 min</div>
                    <div className="text-sm text-indigo-600 mt-1">Total Points Cache</div>
                    <div className="text-xs text-indigo-500 mt-1">In-memory TTL</div>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-teal-700">15 min</div>
                    <div className="text-sm text-teal-600 mt-1">Goal/Assist Share Cache</div>
                    <div className="text-xs text-teal-500 mt-1">In-memory TTL</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-pink-700">100%</div>
                    <div className="text-sm text-pink-600 mt-1">Real FPL Data</div>
                    <div className="text-xs text-pink-500 mt-1">No synthetic estimates</div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* ── LOGIC FLOW TAB ── */}
          <TabsContent value="flow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Complete Projection Logic Flow — 10-Step Dependency Chain
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Each step depends on the outputs of earlier steps. Steps 6 and 7 (goal/assist share) depend on team goals computed in steps 2–4. Player totals in step 10 depend on all preceding steps.
                  </AlertDescription>
                </Alert>

                <div className="space-y-6">

                  {/* Step 1 */}
                  <div className="border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
                      <h3 className="text-lg font-semibold">Bootstrap + Fixtures Data Fetch</h3>
                    </div>
                    <div className="bg-blue-50 p-4 rounded">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>FPL Bootstrap Static:</strong>
                          <ul className="list-disc ml-5 mt-1">
                            <li>All ~515 player records (goals, assists, xG, xA, minutes, form)</li>
                            <li>Set piece order fields (penalties, direct FKs, corners)</li>
                            <li>Team + position metadata</li>
                            <li>Current GW event schedule</li>
                          </ul>
                        </div>
                        <div>
                          <strong>FPL Fixtures + Current Standings:</strong>
                          <ul className="list-disc ml-5 mt-1">
                            <li>All 380 fixtures (home/away team, GW, kickoff)</li>
                            <li>Team GF, GC, xGF, xGA (all per game)</li>
                            <li>Team's real home/away goal splits</li>
                            <li>Player match-by-match history (DB cache)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
                      <h3 className="text-lg font-semibold">Team Goals Scored (per fixture)</h3>
                    </div>
                    <div className="bg-green-50 p-4 rounded space-y-3">
                      <div className="bg-white p-3 rounded border font-mono text-sm">
                        teamGoals = GF×0.4225 + xGF×0.2275 + oppGC×0.2275 + oppxGC×0.1225<br/>
                        finalGoals = teamGoals × venueMultiplier
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Inputs (all per-game season averages):</strong>
                          <ul className="list-disc ml-5 mt-1">
                            <li>GF — team's actual goals per game (0.4225 weight)</li>
                            <li>xGF — team's expected goals per game (0.2275 weight)</li>
                            <li>oppGC — opponent goals conceded per game (0.2275 weight)</li>
                            <li>oppxGC — opponent xGA per game (0.1225 weight)</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Venue multiplier (dynamic):</strong>
                          <ul className="list-disc ml-5 mt-1">
                            <li>homeMultiplier = homeGPG / overallGPG (clamp 0.75–1.50)</li>
                            <li>awayMultiplier = awayGPG / overallGPG (clamp 0.50–1.20)</li>
                            <li>Fallback ({"<"}5 venue games): 1.15 home / 0.87 away</li>
                            <li>Admin floor 0.0, ceiling 7.0; DGW sums; BGW = 0.0</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="border-2 border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
                      <h3 className="text-lg font-semibold">Team Goals Conceded (per fixture)</h3>
                    </div>
                    <div className="bg-red-50 p-4 rounded space-y-3">
                      <div className="bg-white p-3 rounded border font-mono text-sm">
                        teamGC = same formula as Step 2, applied from opponent's perspective<br/>
                        (oppGF×0.4225 + oppxGF×0.2275 + teamGC×0.2275 + teamxGC×0.1225) × venueMultiplier
                      </div>
                      <p className="text-sm text-red-800">
                        A team's projected goals conceded equals the opponent's projected goals scored. The venue multiplier is inverted (opponent is at home = they get the home boost). Used for clean sheet probability and GC penalty calculations.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="border-2 border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">4</div>
                      <h3 className="text-lg font-semibold">Team Assists (per fixture)</h3>
                    </div>
                    <div className="bg-purple-50 p-4 rounded space-y-3">
                      <div className="bg-white p-3 rounded border font-mono text-sm">
                        assistRatio = team assists / team goals (season totals)<br/>
                        assistRatio = clamp(0.50, 1.00, assistRatio)  [fallback: 0.85]<br/>
                        teamAssists = projectedTeamGoals × assistRatio
                      </div>
                      <div className="text-sm text-purple-800">
                        The assist-to-goal ratio is computed per team from real season data, not a global constant. Teams with more tap-ins (lower assisted-goal rate) get a lower ratio; teams with creative build-up get a higher one. Clamped to prevent extremes.
                      </div>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="border-2 border-cyan-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">5</div>
                      <h3 className="text-lg font-semibold">Team Clean Sheet Probability</h3>
                    </div>
                    <div className="bg-cyan-50 p-4 rounded space-y-3">
                      <div className="bg-white p-3 rounded border font-mono text-sm">
                        formulaCS   = exp(−projectedGC × csExponent) × csMultiplier<br/>
                        blendedCS%  = 0.5 × formulaCS + 0.5 × teamActualCSPct<br/>
                        blendedCS%  = clamp(0, 100, blendedCS%)
                      </div>
                      <div className="text-sm text-cyan-800">
                        <strong>csExponent</strong> and <strong>csMultiplier</strong> are admin-configurable. The blend of formulaCS with the team's actual clean sheet percentage this season prevents the model from being too aggressive in either direction.
                      </div>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="border-2 border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">6</div>
                      <h3 className="text-lg font-semibold">Player Goal Share (per player)</h3>
                    </div>
                    <div className="bg-orange-50 p-4 rounded space-y-3">
                      <div className="bg-white p-3 rounded border font-mono text-sm">
                        baseShare% = (playerGoals + playerxG from current-club fixtures) / teamTotal × 100<br/>
                        goalShare% = baseShare + penaltyBonus + directFKBonus  [no normalisation]<br/>
                        <br/>
                        {/* blend correction for ~50 eligible players */}
                        blendWeight = activeClubGames / teamTotalGames<br/>
                        blended = raw×blendWeight + (raw/active × teamGames)×(1−blendWeight)<br/>
                        <br/>
                        playerGoals = (goalShare/100) × projectedTeamGoals × availability
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Transfer filter:</strong>
                          <ul className="list-disc ml-5 mt-1">
                            <li>Only current-club fixtures counted</li>
                            <li>Pre-transfer goals excluded from pool</li>
                            <li>Falls back to season totals if {"<"}1 current-club game</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Set piece bonuses (additive %):</strong>
                          <ul className="list-disc ml-5 mt-1">
                            <li>Penalty #1: +0.8 + goals×0.04 (cap 1.5)</li>
                            <li>Penalty #2: +0.5 + goals×0.03 (cap 1.5)</li>
                            <li>Direct FK #1: +0.3 + goals×0.02 (cap 0.4)</li>
                            <li>Direct FK #2: +0.2 + goals×0.015 (cap 0.4)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 7 */}
                  <div className="border-2 border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold">7</div>
                      <h3 className="text-lg font-semibold">Player Assist Share (per player)</h3>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded space-y-3">
                      <div className="bg-white p-3 rounded border font-mono text-sm">
                        baseShare% = player assists (current-club) / teamTotalAssists × 100<br/>
                        assistShare% = baseShare + cornerBonus + indirectFKBonus  [no normalisation]<br/>
                        <br/>
                        {/* blend same as Step 6 */}
                        blended the same way as goalShare if blend-eligible<br/>
                        <br/>
                        playerAssists = (assistShare/100) × projectedTeamAssists × availability
                      </div>
                      <div className="text-sm text-indigo-800">
                        <strong>Corner bonuses:</strong> Corner #1: +0.8 + assists×0.03 (cap 1.2) · Corner #2: +0.4 + assists×0.02 (cap 1.2) · Indirect FK #1: +0.3
                      </div>
                    </div>
                  </div>

                  {/* Step 8 */}
                  <div className="border-2 border-teal-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold">8</div>
                      <h3 className="text-lg font-semibold">Minutes Projections (per player)</h3>
                    </div>
                    <div className="bg-teal-50 p-4 rounded space-y-3">
                      <div className="bg-white p-3 rounded border font-mono text-sm">
                        source = last 8 active games (minutes {">"} 0)<br/>
                        [for blend-eligible: filtered to current-club fixtures only]<br/>
                        <br/>
                        pct60Plus = games with ≥60 min / 8 × 100<br/>
                        pctBelow60 = games with 1–59 min / 8 × 100<br/>
                        <br/>
                        rawMinutesPts = (pct60Plus/100)×2 + (pctBelow60/100)×1<br/>
                        <br/>
                        effectiveAppearances = teamGames (blend-eligible) OR appearances (others)<br/>
                        confidenceFactor = min(1, effectiveAppearances / 10)<br/>
                        <br/>
                        minutesPoints = rawMinutesPts × confidenceFactor
                      </div>
                      <div className="text-sm text-teal-800">
                        For blend-eligible players (AFCON / injury returnees), using teamGames (≥27) as effectiveAppearances gives confidenceFactor = 1.0 — removing the unwarranted penalty for structural absences.
                      </div>
                    </div>
                  </div>

                  {/* Step 9 */}
                  <div className="border-2 border-rose-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center font-bold">9</div>
                      <h3 className="text-lg font-semibold">Remaining Components (per player)</h3>
                    </div>
                    <div className="bg-rose-50 p-4 rounded">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Bonus Points:</strong>
                          <div className="font-mono text-xs mt-1 mb-2">bonusPerStart = seasonBonus / seasonStarts<br/>bonus = bonusPerStart × (expectedMinutes/90)</div>
                          <strong>Defensive Contributions:</strong>
                          <div className="font-mono text-xs mt-1 mb-2">threshold: DEF 10+, MID/FWD 12+<br/>DCPts = min(pctHitThreshold × (oppDCC/80) × 2, 2)</div>
                          <strong>Saves (GKP only):</strong>
                          <div className="font-mono text-xs mt-1">savesEst = 0.6×seasonAvg + 0.4×saves_per_90<br/>scaled by opponent attack ratio<br/>points via Poisson (3/6/9/12 thresholds)</div>
                        </div>
                        <div>
                          <strong>Goals Conceded (GKP/DEF):</strong>
                          <div className="font-mono text-xs mt-1 mb-2">λ = projectedTeamGC × minutesFraction<br/>GCPts = −Σ floor(k/2) × Poisson(k, λ)</div>
                          <strong>Yellow Cards:</strong>
                          <div className="font-mono text-xs mt-1 mb-2">blended = 0.6×playerRate + 0.4×posBaseline<br/>YCPts = −1 × blended × difficultyScale</div>
                          <strong>Red Cards:</strong>
                          <div className="font-mono text-xs mt-1">blended = 0.5×playerRate + 0.5×posBaseline<br/>RCPts = −3 × blended</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 10 */}
                  <div className="border-2 border-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold">10</div>
                      <h3 className="text-lg font-semibold">Total Points Compilation (per player, per GW)</h3>
                    </div>
                    <div className="bg-gray-50 p-4 rounded space-y-3">
                      <div className="bg-white p-3 rounded border font-mono text-sm">
                        TotalPts = GoalPts + AssistPts + CSPts + MinutesPts<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ SavesPts + BonusPts + DCPts<br/>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ GCPts + YellowPts + RedPts
                      </div>
                      <div className="text-sm">
                        Each component is summed across all fixtures in the GW. Availability (from FPL API <code>chance_of_playing_next_round</code>) is applied per fixture. DGW fixtures are summed; BGW fixture = 0.
                      </div>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ALGORITHMS TAB ── */}
          <TabsContent value="algorithms" className="space-y-6">
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                <strong>100% Real FPL Data:</strong> All algorithms use deterministic calculations on live FPL API data. No synthetic base xG values — every projection is derived from actual team and player performance.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">

              {/* Algorithm 1: Team Goals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-green-600" />
                    1. Weighted 4-Component Team Goals Formula
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-3">The formula (server/team-goals-service.ts)</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-1">
                      <div>teamGoals = GF × <strong>0.4225</strong></div>
                      <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ xGF × <strong>0.2275</strong></div>
                      <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ oppGC × <strong>0.2275</strong></div>
                      <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ oppxGC × <strong>0.1225</strong></div>
                      <div className="mt-2 text-gray-500">// weights sum to 1.0</div>
                    </div>
                    <div className="mt-3 text-sm text-green-800">
                      <strong>Weight derivation:</strong> 65% weight to the attacking team's performance, 35% to the opponent's defensive concession record. Within each side, 65% actual results / 35% expected goals:
                      <ul className="list-disc ml-5 mt-1">
                        <li>GF = 0.65 (attack) × 0.65 (actual) = 0.4225</li>
                        <li>xGF = 0.65 (attack) × 0.35 (expected) = 0.2275</li>
                        <li>oppGC = 0.35 (defence) × 0.65 (actual) = 0.2275</li>
                        <li>oppxGC = 0.35 (defence) × 0.35 (expected) = 0.1225</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded text-sm">
                    <strong>All four inputs are season averages per game played</strong> — this avoids distortion from teams who have played different numbers of games. Default fallback if no data: 1.3 GPG scored, 1.5 GPG conceded.
                  </div>
                </CardContent>
              </Card>

              {/* Algorithm 2: Venue Multipliers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-blue-600" />
                    2. Dynamic Venue Multipliers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Per-team, derived from real season splits</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-1">
                      <div>homeMultiplier = homeGPG / overallGPG</div>
                      <div>homeMultiplier = clamp(0.75, 1.50, homeMultiplier)</div>
                      <div className="mt-1">awayMultiplier = awayGPG / overallGPG</div>
                      <div>awayMultiplier = clamp(0.50, 1.20, awayMultiplier)</div>
                      <div className="mt-2 text-gray-500">// fallback ({"<"}5 venue games): 1.15 home, 0.87 away</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700">
                    This replaces the old static 1.16/0.84 global constants with each team's actual home/away scoring split. A team that scores heavily at home gets a higher homeMultiplier; one with an unusual away record gets an appropriate awayMultiplier.
                  </div>
                </CardContent>
              </Card>

              {/* Algorithm 3: Goal/Assist Share + Blend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-orange-600" />
                    3. Goal & Assist Share with Blend Correction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-3">Base share (current-club only)</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-1">
                      <div>playerCombined = goals + xG (current-club fixtures only)</div>
                      <div>teamCombined   = Σ player combined (all teammates)</div>
                      <div>baseShare% = playerCombined / teamCombined × 100</div>
                      <div className="mt-2">goalShare% = baseShare + penaltyBonus + directFKBonus</div>
                    </div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-amber-900 mb-3">Blend correction (AFCON / injury / transfer returnees)</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-1">
                      <div>{"// Eligibility: activeGames≥3, maxConsecDNP≥4, startRate≥0.70, playedLast4"}</div>
                      <div className="mt-1">blendWeight = activeClubGames / teamTotalGames</div>
                      <div>rateNormalized = (rawTotal / activeGames) × teamTotalGames</div>
                      <div>blended = rawTotal × blendWeight + rateNormalized × (1 − blendWeight)</div>
                    </div>
                    <p className="text-sm text-amber-800 mt-2">
                      Example: Semenyo active in 7 of 27 team games (blendWeight = 0.259). His raw season goals are normalised to what he would have accumulated at his per-game rate across all 27 games, then blended 26%/74% between raw and normalised.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Algorithm 4: Clean Sheet Exponential Decay */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-cyan-600" />
                    4. Clean Sheet Probability — Exponential Decay
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-cyan-50 p-4 rounded-lg">
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-1">
                      <div>formulaCS   = exp(−projectedGC × csExponent) × csMultiplier</div>
                      <div>blendedCS%  = 0.5 × formulaCS + 0.5 × teamActualCSPct</div>
                      <div>blendedCS%  = clamp(0, 100)</div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {[["0.5 GC", "~57% CS"], ["1.0 GC", "~33% CS"], ["1.5 GC", "~19% CS"], ["2.0 GC", "~11% CS"]].map(([gc, cs]) => (
                        <div key={gc} className="bg-white p-2 rounded border text-center">
                          <div className="font-semibold">{gc} → {cs}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700">
                    The exponent and multiplier are admin-configurable. Blending 50/50 with the team's actual CS% this season prevents over-correction in either direction and anchors the model to observable results.
                  </div>
                </CardContent>
              </Card>

              {/* Algorithm 5: Poisson */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-purple-600" />
                    5. Poisson Distribution — Saves & Goals Conceded
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Goalkeeper Saves</h4>
                      <div className="bg-white p-3 rounded border font-mono text-xs space-y-1">
                        <div>blendedSPG = 0.6×seasonAvg + 0.4×saves_per_90</div>
                        <div>λ = blendedSPG × (oppAGR / leagueAvgAGR)</div>
                        <div className="mt-1">P(k saves) = Poisson(k, λ)</div>
                        <div>SavePts = Σ P(k≥3) + P(k≥6) + P(k≥9) + P(k≥12)</div>
                      </div>
                      <p className="text-xs text-purple-700 mt-2">1 point awarded per 3-save threshold cleared. Probability-weighted so a keeper with λ=3.5 gets ~1.0 point expected.</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-2">Goals Conceded Penalty (GKP/DEF)</h4>
                      <div className="bg-white p-3 rounded border font-mono text-xs space-y-1">
                        <div>λ = projectedTeamGC × (avgMinutes / 90)</div>
                        <div>P(k) = Poisson(k, λ)</div>
                        <div className="mt-1">GCPts = −Σ floor(k/2) × P(k)  for k = 0,1,2,...,10</div>
                      </div>
                      <p className="text-xs text-red-700 mt-2">FPL rule: −1 point per 2 goals conceded. Poisson-weighted expected penalty avoids cliff edges at integer boundaries.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* ── PLAYER TOOLS TAB ── */}
          <TabsContent value="player-tools" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Each component is calculated independently and summed for total points. All 10 components are documented below with exact formulas, FPL points awarded, and data sources.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* 1. Goals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    1. Goals Scored
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <strong>Formula:</strong>
                    <div className="font-mono text-xs mt-2 space-y-1">
                      <div>baseShare% = (goals + xG, current club) / teamPool × 100</div>
                      <div>goalShare% = baseShare + penaltyBonus + directFKBonus</div>
                      <div>blended if AFCON/injury eligible (see Algorithms)</div>
                      <div>playerGoals = (goalShare/100) × teamGoals × availability</div>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Set piece bonuses (additive %):</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Penalty #1: +0.8 + goals×0.04 (cap 1.5)</li>
                      <li>Penalty #2: +0.5 + goals×0.03 (cap 1.5)</li>
                      <li>Direct FK #1: +0.3 + goals×0.02 (cap 0.4)</li>
                      <li>Direct FK #2: +0.2 + goals×0.015 (cap 0.4)</li>
                    </ul>
                    <div><strong>FPL Points:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>GKP / DEF: 6 points per goal</li>
                      <li>MID: 5 points per goal</li>
                      <li>FWD: 4 points per goal</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">API: /api/player-goal-share</div>
                </CardContent>
              </Card>

              {/* 2. Assists */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    2. Assists
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded text-sm">
                    <strong>Formula:</strong>
                    <div className="font-mono text-xs mt-2 space-y-1">
                      <div>baseShare% = assists (current club) / teamTotal × 100</div>
                      <div>assistShare% = baseShare + cornerBonus + indirectFKBonus</div>
                      <div>blended if AFCON/injury eligible</div>
                      <div>playerAssists = (assistShare/100) × teamAssists × availability</div>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Set piece bonuses (additive %):</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Corner #1: +0.8 + assists×0.03 (cap 1.2)</li>
                      <li>Corner #2: +0.4 + assists×0.02 (cap 1.2)</li>
                      <li>Indirect FK #1: +0.3</li>
                    </ul>
                    <div><strong>Team assists:</strong> teamGoals × per-team ratio (0.50–1.00, fallback 0.85)</div>
                    <div><strong>FPL Points:</strong> 3 points per assist (all positions)</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">API: /api/player-assist-share</div>
                </CardContent>
              </Card>

              {/* 3. Minutes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    3. Minutes / Playing Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-purple-50 p-3 rounded text-sm">
                    <strong>Formula:</strong>
                    <div className="font-mono text-xs mt-2 space-y-1">
                      <div>source = last 8 active games (mins {">"} 0)</div>
                      <div>[blend-eligible: current-club fixtures only]</div>
                      <div>pct60Plus = games ≥60 min / 8 × 100</div>
                      <div>pctBelow60 = games 1–59 min / 8 × 100</div>
                      <div className="mt-1">rawPts = (pct60Plus/100)×2 + (pctBelow60/100)×1</div>
                      <div className="mt-1">effectiveApps = teamGames (blend-eligible) | appearances (others)</div>
                      <div>confidenceFactor = min(1, effectiveApps / 10)</div>
                      <div>minutesPts = rawPts × confidenceFactor</div>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>FPL Points:</strong> 2 pts for 60+ min · 1 pt for 1–59 min · 0 for DNP</div>
                    <div><strong>Blend effect:</strong> Returnees get confidenceFactor = 1.0 (not penalised for absence games)</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">API: /api/player-minutes-projections</div>
                </CardContent>
              </Card>

              {/* 4. Bonus Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-600" />
                    4. Bonus Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-amber-50 p-3 rounded text-sm">
                    <strong>Formula:</strong>
                    <div className="font-mono text-xs mt-2 space-y-1">
                      <div>bonusPerStart = seasonBonus / seasonStarts</div>
                      <div>[fallback: seasonBonus / teamFixturesPlayed if starts = 0]</div>
                      <div>GWBonus = bonusPerStart × (expectedMinutes / 90) × availability</div>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Why per-start not per-game:</strong> A rotation player with 8 bonus in 15 starts earns 0.53/start. Dividing by team fixtures (27) gives a misleadingly low 0.30/game. Per-start rate correctly reflects their earning frequency.</div>
                    <div><strong>FPL Points:</strong> 1–3 per game (season average rate applied)</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">API: /api/player-bonus-points-projections</div>
                </CardContent>
              </Card>

              {/* 5. Clean Sheets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-teal-600" />
                    5. Clean Sheets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-teal-50 p-3 rounded text-sm">
                    <strong>Formula:</strong>
                    <div className="font-mono text-xs mt-2 space-y-1">
                      <div>blendedCS% = team clean sheet probability (see Algorithms §4)</div>
                      <div>CSPts = blendedCS%/100 × pct60Plus/100 × positionCSPts</div>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Inputs:</strong> Team CS probability + player's probability of playing ≥60 min</div>
                    <div><strong>FPL Points per clean sheet:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>GKP / DEF: 4 points</li>
                      <li>MID: 1 point</li>
                      <li>FWD: 0 points</li>
                    </ul>
                    <div><strong>Requirement:</strong> Player must play ≥60 minutes to qualify</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">API: /api/player-cleansheet-points</div>
                </CardContent>
              </Card>

              {/* 6. Goals Conceded */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    6. Goals Conceded (GKP / DEF only)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-orange-50 p-3 rounded text-sm">
                    <strong>Formula (Poisson-based):</strong>
                    <div className="font-mono text-xs mt-2 space-y-1">
                      <div>λ = projectedTeamGC × (avgMinutes / 90)</div>
                      <div>P(k) = Poisson(k, λ)  for k = 0, 1, 2, ..., 10</div>
                      <div>GCPts = −Σ floor(k/2) × P(k)</div>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>FPL Scoring:</strong> −1 point per 2 goals conceded</div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>0 GC = 0 pts · 1 GC = 0 pts · 2 GC = −1 pt · 4 GC = −2 pts</li>
                    </ul>
                    <div><strong>Why Poisson:</strong> Avoids cliff edges at whole-number boundaries; expected penalty is probability-weighted across all outcomes.</div>
                    <div><strong>Applies to:</strong> GKP and DEF only (MID/FWD: 0)</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">API: /api/player-goals-conceded-projections</div>
                </CardContent>
              </Card>

              {/* 7. Defensive Contributions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    7. Defensive Contributions (DC)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-red-50 p-3 rounded text-sm">
                    <strong>DC action count by position:</strong>
                    <div className="font-mono text-xs mt-2 space-y-1">
                      <div>DEF:     DC = CBI + Tackles</div>
                      <div>MID/FWD: DC = CBI + Tackles + Recoveries</div>
                    </div>
                    <strong className="mt-2 block">Points formula:</strong>
                    <div className="font-mono text-xs mt-1 space-y-1">
                      <div>pctHit = fraction of past games where player hit threshold</div>
                      <div>DCPts  = min(pctHit × (oppDCC/80) × 2, 2)</div>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Thresholds:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>DEF: 10+ DC actions required</li>
                      <li>MID / FWD: 12+ DC actions required</li>
                      <li>GKP: 0 points (DC not applicable)</li>
                    </ul>
                    <div><strong>oppDCC:</strong> Opponent's Defensive Contributions Conceded per game (baseline 80)</div>
                    <div><strong>Max:</strong> 2 points per fixture, regardless of DC count</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">API: /api/player-defensive-contributions</div>
                </CardContent>
              </Card>

              {/* 8. Saves */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-cyan-600" />
                    8. Saves (GKP only)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-cyan-50 p-3 rounded text-sm">
                    <strong>Formula:</strong>
                    <div className="font-mono text-xs mt-2 space-y-1">
                      <div>blendedSPG = 0.6 × seasonAvgSaves + 0.4 × saves_per_90</div>
                      <div>λ = blendedSPG × (oppAGR / 1.35) × availability</div>
                      <div className="mt-1">P(k) = Poisson(k, λ)</div>
                      <div>SavePts = Σ P(saves ≥ t) for thresholds t ∈ [3, 6, 9, 12]</div>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Blending:</strong> 60% season average (stability) + 40% saves_per_90 (recency). Falls back to season avg if saves_per_90 is zero or missing.</div>
                    <div><strong>oppAGR:</strong> Opponent attacking goal rate; 1.35 = league average normaliser</div>
                    <div><strong>FPL Points:</strong> 1 point per 3 saves (so 3+ = 1pt, 6+ = 2pts, etc.)</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">API: /api/player-saves-projections</div>
                </CardContent>
              </Card>

              {/* 9. Yellow Cards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    9. Yellow Cards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-yellow-50 p-3 rounded text-sm">
                    <strong>Formula:</strong>
                    <div className="font-mono text-xs mt-2 space-y-1">
                      <div>playerRate = seasonYC / gamesPlayed</div>
                      <div>posBaseline = GKP: 0.020 | DEF: 0.070 | MID: 0.090 | FWD: 0.050</div>
                      <div>blendedRate = 0.60 × playerRate + 0.40 × posBaseline</div>
                      <div className="mt-1">diffScale = clamp(0.85, 1.20, 1 + 0.25 × (oppAGR/leagueAvg − 1))</div>
                      <div>YCPts = −1 × blendedRate × diffScale × availability</div>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Why blend:</strong> 40% position baseline prevents players with 0 YCs this season from projecting exactly 0 risk.</div>
                    <div><strong>Difficulty scaling:</strong> Harder opponent attack = more defensive pressure = up to +20% card risk. Clamped to 0.85–1.20.</div>
                    <div><strong>FPL Points:</strong> −1 point per yellow card</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">API: /api/player-yellow-cards-projections</div>
                </CardContent>
              </Card>

              {/* 10. Red Cards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-700" />
                    10. Red Cards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-red-50 p-3 rounded text-sm">
                    <strong>Formula:</strong>
                    <div className="font-mono text-xs mt-2 space-y-1">
                      <div>playerRate = seasonRC / gamesPlayed</div>
                      <div>posBaseline = GKP: 0.005 | DEF: 0.012 | MID: 0.008 | FWD: 0.007</div>
                      <div>blendedRate = 0.50 × playerRate + 0.50 × posBaseline</div>
                      <div>RCPts = −3 × blendedRate × availability</div>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Why 50/50:</strong> Most players have 0 red cards this season, so player rate alone gives 0. A higher position-baseline weight (50%) ensures a realistic small risk is always projected.</div>
                    <div><strong>No opponent multiplier:</strong> Red cards are impulsive and weakly correlated with opponent strength.</div>
                    <div><strong>FPL Points:</strong> −3 points per red card</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">API: /api/player-red-cards-projections</div>
                </CardContent>
              </Card>

              {/* Total Points Summary */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    Total Points — 10-Component Sum
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                    TotalPts = GoalPts + AssistPts + CSPts + MinutesPts + SavesPts + BonusPts + DCPts + GCPts + YellowPts + RedPts
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    {[
                      ["Goals", "GKP/DEF 6 | MID 5 | FWD 4"],
                      ["Assists", "All positions: 3"],
                      ["Clean Sheet", "GKP/DEF 4 | MID 1 | FWD 0"],
                      ["Minutes", "60+ min: 2 | 1–59: 1 | DNP: 0"],
                      ["Saves", "GKP: 1 per 3 saves"],
                      ["Bonus", "1–3 pts (season avg rate)"],
                      ["DC", "≤2 pts per fixture"],
                      ["Goals Conceded", "−1 per 2 GC (GKP/DEF)"],
                      ["Yellow Card", "−1 per card"],
                      ["Red Card", "−3 per card"],
                    ].map(([name, desc]) => (
                      <div key={name} className="bg-white p-2 rounded border">
                        <div className="font-semibold">{name}</div>
                        <div className="text-gray-600">{desc}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs font-mono">API: /api/cached/player-total-points</div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* ── TEAM TOOLS TAB ── */}
          <TabsContent value="team-tools" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Team-Level Projections</strong> provide the foundation that all player-level projections build on. Team goals and assists feed directly into player goal/assist share calculations.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Team Goals Scored
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Weighted 4-Component Formula (server/team-goals-service.ts)</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm mb-3 space-y-1">
                      <div>teamGoals = GF×0.4225 + xGF×0.2275 + oppGC×0.2275 + oppxGC×0.1225</div>
                      <div>finalGoals = teamGoals × venueMultiplier</div>
                    </div>
                    <p className="text-sm text-green-800">65% weight to attacking team's performance, 35% to opponent's defensive record. Within each, 65% actual / 35% expected. All inputs are season averages per game played.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-semibold text-blue-900 mb-2">Venue Multiplier</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• homeMultiplier = homeGPG / overallGPG (clamp 0.75–1.50)</li>
                        <li>• awayMultiplier = awayGPG / overallGPG (clamp 0.50–1.20)</li>
                        <li>• Fallback if {"<"}5 venue games: 1.15 home, 0.87 away</li>
                        <li>• Dynamic — updates each gameweek</li>
                      </ul>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-semibold text-purple-900 mb-2">Constraints & Defaults</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• Admin floor: 0.0 goals | ceiling: 7.0 goals</li>
                        <li>• Default if no data: 1.3 GPG scored, 1.5 GPG conceded</li>
                        <li>• DGW: goals summed across both fixtures</li>
                        <li>• BGW: explicitly returns 0.0</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">API: /api/team-goal-projections · Cache: 30 min</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    Team Assists
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Per-Team Dynamic Ratio</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm mb-3 space-y-1">
                      <div>assistRatio = team assists / team goals  (season totals)</div>
                      <div>assistRatio = clamp(0.50, 1.00, assistRatio)  [fallback: 0.85]</div>
                      <div>teamAssists = projectedTeamGoals × assistRatio</div>
                    </div>
                    <p className="text-sm text-blue-800">
                      Not a global 0.85 constant — each team's real season assist/goal ratio is used. Teams with more headers, deflections, or own goals get a lower ratio; creative build-up teams get a higher one. Clamped to [0.50, 1.00] to prevent extremes.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-semibold text-green-900 mb-2">Calculation Flow</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>1. Calculate team goals (weighted formula)</li>
                        <li>2. Compute per-team assist ratio from season data</li>
                        <li>3. teamAssists = goals × ratio</li>
                        <li>4. Distribute to players by assist share %</li>
                        <li>5. Apply set piece corner/FK bonuses</li>
                      </ul>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <h4 className="font-semibold text-orange-900 mb-2">Player Assist Share</h4>
                      <ul className="text-sm text-orange-700 space-y-1">
                        <li>• BaseShare = assists (current club) / teamTotal × 100</li>
                        <li>• Corner taker bonuses added (no normalisation)</li>
                        <li>• Blend correction for returnees</li>
                        <li>• playerAssists = (share/100) × teamAssists × avail</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">API: /api/player-assist-share · Cache: 15 min</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-cyan-600" />
                    Team Goals Conceded & Clean Sheets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">Goals Conceded</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm">
                      GC = opponent's projected goals scored (same weighted formula, venue inverted)
                    </div>
                  </div>
                  <div className="bg-cyan-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-cyan-900 mb-2">Clean Sheet Probability</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-1">
                      <div>formulaCS  = exp(−projectedGC × csExponent) × csMultiplier</div>
                      <div>blendedCS% = 0.5 × formulaCS + 0.5 × teamActualCSPct</div>
                      <div>blendedCS% = clamp(0, 100)</div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {[["0.5 GC", "~57% CS"], ["1.0 GC", "~33% CS"], ["1.5 GC", "~19% CS"], ["2.0 GC", "~11% CS"]].map(([gc, cs]) => (
                        <div key={gc} className="bg-white p-2 rounded border text-center">
                          <div className="font-semibold text-sm">{gc}</div>
                          <div className="text-cyan-700 text-xs">{cs}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">API: /api/clean-sheet-projections · csExponent admin-configurable</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    Match Predictions & Projected Standings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">Deterministic Simulation</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-1">
                      <div>For each fixture:</div>
                      <div>&nbsp;• homeXG = TeamGoalsService(home, away, isHome=true)</div>
                      <div>&nbsp;• awayXG = TeamGoalsService(away, home, isHome=false)</div>
                      <div>&nbsp;• result: Win if xG margin {">"} 0.5 else Draw</div>
                      <div>&nbsp;• points: Win=3, Draw=1, Loss=0</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-semibold text-blue-900 mb-2">Poisson Score Predictions</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• P(score n goals) = (λⁿ × e⁻λ) / n!</li>
                        <li>• λ = expected goals from hybrid formula</li>
                        <li>• Calculates all scorelines 0-0 through 5-5</li>
                        <li>• Most likely score = highest joint probability</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-semibold text-green-900 mb-2">Standings Output</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Current pts + projected pts for remaining GWs</li>
                        <li>• Final position, GF, GA, GD</li>
                        <li>• CL / EL / relegation qualification zones</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">API: /api/projected-standings</div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* ── DATA SOURCES TAB ── */}
          <TabsContent value="data-sources" className="space-y-6">
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <strong>100% Authentic FPL Data.</strong> Every projection uses live data from official FPL APIs with strategic in-memory caching. No synthetic or estimated base values are used.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-600" />
                  FPL Bootstrap Static API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 p-3 rounded font-mono text-sm">GET https://fantasy.premierleague.com/api/bootstrap-static/</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-3 rounded">
                    <h4 className="font-semibold text-green-900 mb-2">Player Fields Used</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• goals_scored, assists, clean_sheets</li>
                      <li>• minutes, expected_goals (xG), expected_assists (xA)</li>
                      <li>• saves, yellow_cards, red_cards, bonus, starts</li>
                      <li>• chance_of_playing_next_round</li>
                      <li>• selected_by_percent, now_cost</li>
                    </ul>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <h4 className="font-semibold text-orange-900 mb-2">Set Piece Order Fields</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• <strong>penalties_order</strong> (1–3)</li>
                      <li>• <strong>direct_freekicks_order</strong> (1–3)</li>
                      <li>• <strong>corners_and_indirect_freekicks_order</strong> (1–3)</li>
                      <li className="mt-2 text-xs">Used for goal share bonuses (penalty/FK)</li>
                      <li className="text-xs">Used for assist share bonuses (corners/IFK)</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-semibold text-blue-900 mb-2">API Details</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Cache: 10 minutes (in-memory)</li>
                      <li>• ~515 active players</li>
                      <li>• 20 team records</li>
                      <li>• 38 event/gameweek records</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  FPL Current Standings API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-3 rounded font-mono text-sm">GET /api/current-standings (internal — sourced from FPL API)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-semibold text-blue-900 mb-2">Team Data Fields</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• goals_for, goals_against</li>
                      <li>• strength_attack_home/away</li>
                      <li>• played (home + away)</li>
                      <li>• xGF, xGA (from FPL standings data)</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <h4 className="font-semibold text-purple-900 mb-2">Used In</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Team goals formula (all 4 components)</li>
                      <li>• Venue multiplier computation</li>
                      <li>• Assist-to-goal ratio per team</li>
                      <li>• Clean sheet blending (actual CS%)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  FPL Fixtures API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-purple-50 p-3 rounded font-mono text-sm">GET https://fantasy.premierleague.com/api/fixtures/</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 p-3 rounded">
                    <h4 className="font-semibold text-purple-900 mb-2">Fixture Fields</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• id, event (GW), kickoff_time</li>
                      <li>• team_h, team_a</li>
                      <li>• team_h_difficulty, team_a_difficulty</li>
                      <li>• finished, started</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-semibold text-blue-900 mb-2">Used For</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• DGW / BGW detection</li>
                      <li>• Venue (home/away) determination</li>
                      <li>• Transfer filter (current-club games)</li>
                      <li>• Blend eligible player detection</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <h4 className="font-semibold text-green-900 mb-2">Cache</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• 30 minutes in-memory</li>
                      <li>• All 380 fixtures</li>
                      <li>• Separate finished/upcoming filters</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-cyan-600" />
                  Player Match History (PostgreSQL Cache)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-cyan-50 p-3 rounded font-mono text-sm">Table: player_history_cache (player_id, history_json, updated_at)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-cyan-50 p-3 rounded">
                    <h4 className="font-semibold text-cyan-900 mb-2">Fields Per Game</h4>
                    <ul className="text-sm text-cyan-700 space-y-1">
                      <li>• fixture, round (GW)</li>
                      <li>• minutes, starts</li>
                      <li>• goals_scored, assists, expected_goals, expected_assists</li>
                      <li>• bonus, clean_sheets, goals_conceded</li>
                      <li>• yellow_cards, red_cards, saves</li>
                      <li>• defensive_contribution</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-semibold text-blue-900 mb-2">Used For</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Current-club fixture filtering (transfer fix)</li>
                      <li>• computeBlendMap (blend eligibility)</li>
                      <li>• recentP60/pctBelow60 (last 8 active games)</li>
                      <li>• pctHitDCThreshold (DC points)</li>
                      <li>• bonusPerStart calculation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-orange-600" />
                  Blend Eligible Players Table
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-orange-50 p-3 rounded font-mono text-sm">Table: blend_eligible_players · API: /api/admin/blend-eligible-players</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-50 p-3 rounded">
                    <h4 className="font-semibold text-orange-900 mb-2">Stored Fields</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• player_id, team_id</li>
                      <li>• active_club_games, started_club_games</li>
                      <li>• team_total_games, max_consec_dnp</li>
                      <li>• blend_weight (= active / total)</li>
                      <li>• updated_at</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <h4 className="font-semibold text-green-900 mb-2">Notes</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Persisted asynchronously after each goalShare cache miss</li>
                      <li>• ~50 players currently qualify</li>
                      <li>• Used by admin blend-eligible view</li>
                      <li>• Minutes blend map computed in-memory separately</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  In-Memory Projection Caches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-indigo-50 p-3 rounded">
                    <h4 className="font-semibold text-indigo-900 mb-2">15-Minute Caches</h4>
                    <ul className="text-sm text-indigo-700 space-y-1">
                      <li>• /api/player-goal-share</li>
                      <li>• /api/player-assist-share</li>
                      <li>• /api/player-minutes-projections</li>
                      <li>• /api/player-cleansheet-points</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <h4 className="font-semibold text-purple-900 mb-2">30-Minute Caches</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• /api/cached/player-total-points</li>
                      <li>• /api/team-goal-projections</li>
                      <li>• /api/fixtures (raw FPL)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* ── CONFIGURATION TAB ── */}
          <TabsContent value="configuration" className="space-y-6">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                System constants and admin-configurable parameters. All projection services read these values at runtime.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-blue-600" />
                  Venue Multipliers (Dynamic)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Home Multiplier</h4>
                    <div className="font-mono text-sm bg-white p-2 rounded">homeGPG / overallGPG (clamp 0.75–1.50)</div>
                    <p className="text-sm text-blue-700 mt-2">Fallback if {"<"}5 home games: <strong>1.15</strong></p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-3">Away Multiplier</h4>
                    <div className="font-mono text-sm bg-white p-2 rounded">awayGPG / overallGPG (clamp 0.50–1.20)</div>
                    <p className="text-sm text-orange-700 mt-2">Fallback if {"<"}5 away games: <strong>0.87</strong></p>
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded text-sm">
                  The old static 1.16/0.84 constants have been replaced with per-team dynamic multipliers derived from each team's real season home/away scoring split. This means Man City at home gets a different multiplier than a newly promoted team at home.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  Blend Eligibility Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2">Eligibility Criteria (all 4 must hold)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Minimum active games at current club</span>
                        <span className="font-bold text-orange-700">≥ 3</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Consecutive DNP (block absence)</span>
                        <span className="font-bold text-orange-700">≥ 4</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Start rate when available</span>
                        <span className="font-bold text-orange-700">≥ 70%</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Played in all last 4 team fixtures</span>
                        <span className="font-bold text-orange-700">= true</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-amber-900 mb-2">Confidence Factor Logic</h4>
                    <div className="font-mono text-xs bg-white p-2 rounded mb-2 space-y-1">
                      <div>{"// Blend-eligible player:"}</div>
                      <div>effectiveApps = teamGames  {"// e.g. 27"}</div>
                      <div>confidenceFactor = min(1, 27/10) = 1.0</div>
                      <div className="mt-1">{"// Genuine rookie:"}</div>
                      <div>effectiveApps = appearances  {"// e.g. 4"}</div>
                      <div>confidenceFactor = min(1, 4/10) = 0.40</div>
                    </div>
                    <p className="text-xs text-amber-700">
                      Using teamGames for returnees ensures structural absences don't penalise their minutes projection. The 0.40 penalty correctly applies only to genuine data-sparse rookies.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-cyan-600" />
                  Clean Sheet Parameters (Admin-Configurable)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-cyan-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-cyan-900 mb-2">Formula Constants</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>csExponent (decay rate)</span>
                        <span className="font-bold text-cyan-700">admin-configurable</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>csMultiplier (scale)</span>
                        <span className="font-bold text-cyan-700">admin-configurable</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Actual CS% blend weight</span>
                        <span className="font-bold text-cyan-700">50%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-teal-900 mb-2">Team Goal Constraints</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Minimum goals per fixture</span>
                        <span className="font-bold text-teal-700">0.0 (admin)</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Maximum goals per fixture</span>
                        <span className="font-bold text-teal-700">7.0 (admin)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                  Card & Component Baselines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">Yellow Card Position Baselines</h4>
                    <div className="space-y-2 text-sm font-mono">
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>GKP</span><span>0.020 / game</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>DEF</span><span>0.070 / game</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>MID</span><span>0.090 / game</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>FWD</span><span>0.050 / game</span>
                      </div>
                    </div>
                    <p className="text-xs text-yellow-700 mt-2">Blend: 60% player season rate + 40% baseline</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">Red Card Position Baselines</h4>
                    <div className="space-y-2 text-sm font-mono">
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>GKP</span><span>0.005 / game</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>DEF</span><span>0.012 / game</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>MID</span><span>0.008 / game</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>FWD</span><span>0.007 / game</span>
                      </div>
                    </div>
                    <p className="text-xs text-red-700 mt-2">Blend: 50% player season rate + 50% baseline</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Saves normaliser:</strong> 1.35 (league average attacking goal rate — used to scale GK save projections up/down based on opponent strength)
                </div>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>DC baseline:</strong> 80 opponent DCC/game (league average — used to normalise DCPoints formula)
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* ── TROUBLESHOOTING TAB ── */}
          <TabsContent value="troubleshooting" className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Use these guides to diagnose unexpected projection values. Always clear in-memory caches by restarting the server after changing configuration.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Player's projected PPG is much lower than their historical PPG
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-700">Common causes for blend-eligible players (AFCON / injury / late transfer returnees):</p>
                  <div className="space-y-3">
                    <div className="bg-orange-50 p-3 rounded text-sm">
                      <strong>1. recentP60 dragged down by absence zeros</strong>
                      <p className="mt-1 text-orange-800">The last-8-games window included DNP weeks. Fix: for blend-eligible players, history is filtered to current-club fixtures before computing pct60Plus.</p>
                      <div className="font-mono text-xs mt-2 bg-white p-2 rounded">
                        Check: GET /api/player-minutes-projections → find player → inspect pct60Plus
                      </div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded text-sm">
                      <strong>2. confidenceFactor penalising structural absence</strong>
                      <p className="mt-1 text-orange-800">Player has {"<"}10 appearances but qualifies for blend. Fix: effectiveAppearances uses teamGames (≥27), giving confidenceFactor = 1.0.</p>
                      <div className="font-mono text-xs mt-2 bg-white p-2 rounded">
                        Check: inspect confidenceFactor field in minutes projection response
                      </div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded text-sm">
                      <strong>3. Player not in blend map</strong>
                      <p className="mt-1 text-orange-800">Player may not qualify (maxConsecDNP {"<"} 4, or didn't play last 4 fixtures). Check blend table:</p>
                      <div className="font-mono text-xs mt-2 bg-white p-2 rounded">
                        SELECT * FROM blend_eligible_players ORDER BY blend_weight;<br/>
                        GET /api/admin/blend-eligible-players
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Team projected goals look unrealistically high or low
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-3">
                    <div className="bg-yellow-50 p-3 rounded text-sm">
                      <strong>Check the 4 inputs to the formula</strong>
                      <div className="font-mono text-xs mt-2 bg-white p-2 rounded">
                        GET /api/current-standings → inspect goals_for, goals_against, xGF, xGA per team
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded text-sm">
                      <strong>Check venue multiplier</strong>
                      <p className="mt-1 text-yellow-800">A team with very few home/away games falls back to 1.15/0.87. A team with an unusual split early in the season may get a distorted multiplier — the clamps (0.75–1.50 home, 0.50–1.20 away) protect against extremes.</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded text-sm">
                      <strong>Check admin floor/ceiling</strong>
                      <p className="mt-1 text-yellow-800">Admin-configurable min (0.0) and max (7.0) cap the output. Check the goal-projection admin settings page.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Player goal share looks wrong (too high or too low)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-3">
                    <div className="bg-red-50 p-3 rounded text-sm">
                      <strong>Verify current-club fixture filter</strong>
                      <p className="mt-1 text-red-800">A recently transferred player's pre-transfer goals should be excluded. Verify using:</p>
                      <div className="font-mono text-xs mt-2 bg-white p-2 rounded">
                        SELECT history_json FROM player_history_cache WHERE player_id = {"{playerId}"};
                      </div>
                    </div>
                    <div className="bg-red-50 p-3 rounded text-sm">
                      <strong>Check blend correction is being applied</strong>
                      <div className="font-mono text-xs mt-2 bg-white p-2 rounded">
                        SELECT player_id, active_club_games, team_total_games, blend_weight<br/>
                        FROM blend_eligible_players WHERE player_id = {"{playerId}"};
                      </div>
                    </div>
                    <div className="bg-red-50 p-3 rounded text-sm">
                      <strong>Check set piece order fields</strong>
                      <p className="mt-1 text-red-800">If a player's penalty bonus disappeared, their penalties_order may have changed in bootstrap. Bonuses update automatically every 15 minutes when goalShare cache refreshes.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Useful Diagnostic Queries & Commands
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>All blend-eligible players (sorted by blend weight):</strong>
                      <div className="font-mono text-xs mt-1 bg-white p-2 rounded">
                        SELECT player_id, active_club_games, started_club_games, team_total_games, max_consec_dnp, blend_weight, updated_at<br/>
                        FROM blend_eligible_players ORDER BY blend_weight;
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Check player history is in DB:</strong>
                      <div className="font-mono text-xs mt-1 bg-white p-2 rounded">
                        SELECT player_id, jsonb_array_length(history_json::jsonb) as games, updated_at<br/>
                        FROM player_history_cache WHERE player_id = {"{id}"};
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Minutes projection for a specific player:</strong>
                      <div className="font-mono text-xs mt-1 bg-white p-2 rounded">
                        curl /api/player-minutes-projections | jq '.[] | select(.playerName | contains("Semenyo"))'
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Force goalShare cache refresh (clears 15-min in-memory cache):</strong>
                      <div className="font-mono text-xs mt-1 bg-white p-2 rounded">
                        Restart the server — caches are in-memory and cleared on restart.
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <strong>Admin projection validation:</strong>
                      <div className="font-mono text-xs mt-1 bg-white p-2 rounded">
                        GET /api/admin/projection-validation  (compares projected PPG vs actual PPG from live data)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

        </Tabs>
      </div>
      </div>
    </ProtectedRoute>
  );
}
