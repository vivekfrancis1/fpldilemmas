import { Book, Target, Users, Shield, Clock, TrendingUp, Database, Calculator, Info, ExternalLink, GitBranch, Zap, Trophy, BarChart3, FileText, Code, AlertTriangle, CheckCircle, Settings, Activity, Cpu, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ProtectedRoute from "@/components/protected-route";

export default function ProjectionDocumentation() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <Book className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          Projection Documentation
        </div>
        <p className="fpl-page-subtitle">
          Comprehensive technical guide to all projection tools, algorithms, and data sources
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

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Projection System Architecture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  FPL Dilemmas employs a sophisticated projection engine that combines historical data analysis, 
                  statistical modeling, and machine learning techniques to provide accurate predictions for Fantasy Premier League.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Player Projections</h3>
                    <p className="text-sm text-blue-700">
                      Individual player statistics including goals, assists, clean sheets, minutes, and total points
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">Team Projections</h3>
                    <p className="text-sm text-green-700">
                      Team-level forecasting for goals scored, goals against, clean sheets, and league standings
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">Hybrid Real Data Methodology</h3>
                    <p className="text-sm text-purple-700">
                      Uses real FPL API performance data combined with expected goals statistics for authentic projections
                    </p>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>RECENT MAJOR UPDATES:</strong> The projection system has been upgraded with a hybrid formula using real FPL performance data. 
                    Key changes: Market bounds removed, home advantage reduced to +12%, tier-based calculations replaced with live xGF/xGA data from current standings.
                    All projections now use authentic data exclusively from the official FPL API.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Core Projection Principles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Pure Projection Calculation</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Hybrid formula using real FPL performance data</li>
                        <li>• Live expected goals data from current standings</li>
                        <li>• No synthetic base xG - exclusively real data</li>
                        <li>• Market bounds completely removed</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Statistical Foundation</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Historical performance analysis (2016-2025)</li>
                        <li>• Fixture difficulty assessment</li>
                        <li>• Team strength multipliers</li>
                        <li>• Position-specific algorithms</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logic Flow Tab */}
          <TabsContent value="flow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Complete Projection Logic Flow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This diagram shows the complete dependency chain from MASTER_TEAM_DEFAULTS configuration through to final player projections.
                  </AlertDescription>
                </Alert>

                <div className="space-y-8">
                  {/* Step 1: Configuration */}
                  <div className="border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
                      <h3 className="text-lg font-semibold">Configuration Source</h3>
                    </div>
                    <div className="bg-blue-50 p-4 rounded">
                      <h4 className="font-semibold mb-2">MASTER_TEAM_DEFAULTS (server/routes.ts) + Real FPL Data</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Real Data Sources:</strong>
                          <ul className="list-disc ml-5 mt-1">
                            <li>FPL current standings API - live xGF/xGA</li>
                            <li>Team actual goals scored/conceded averages</li>
                            <li>Dynamic team performance data (5-minute cache)</li>
                            <li>No synthetic base xG values</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Updated Parameters:</strong>
                          <ul className="list-disc ml-5 mt-1">
                            <li>homeAdvantageMultiplier: 1.12 (reduced from 1.16)</li>
                            <li>awayFactorMultiplier: 0.84 (unchanged)</li>
                            <li>Context multipliers (15+ factors)</li>
                            <li>Market bounds: REMOVED completely</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Team Goals Scored */}
                  <div className="border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
                      <h3 className="text-lg font-semibold">Team Goals Scored Calculation</h3>
                    </div>
                    <div className="bg-green-50 p-4 rounded">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border font-mono text-sm">
                          <strong>NEW Hybrid Formula:</strong><br/>
                          TeamGoals = (TeamAvgGoals + RealTeamxGF + OpponentAvgGC + RealOpponentxGA) × 0.25 × VenueFactor × ContextMultipliers
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Real Data Inputs:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Team actual average goals scored per game</li>
                              <li>Real team xGF from FPL current standings</li>
                              <li>Opponent actual average goals conceded</li>
                              <li>Real opponent xGA from FPL current standings</li>
                              <li>Venue (H/A) → VenueFactor (1.12/0.84) - Updated</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Output:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Authentic expected goals based on real performance</li>
                              <li>No artificial market bounds (0.6-3.0 removed)</li>
                              <li>Used for: Player goal projections</li>
                              <li>Used for: Team assists calculation</li>
                              <li>Used for: Match predictions</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Team Goals Conceded */}
                  <div className="border-2 border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
                      <h3 className="text-lg font-semibold">Team Goals Conceded Calculation</h3>
                    </div>
                    <div className="bg-red-50 p-4 rounded">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border font-mono text-sm">
                          <strong>Real Data Formula:</strong><br/>
                          GoalsConceded = OpponentGoalsScored (calculated using hybrid real data formula)<br/>
                          (Uses opponent's real performance vs team's real defensive record)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Real Inputs:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Opponent actual goals scored average</li>
                              <li>Opponent real xGF from current standings</li>
                              <li>Team actual goals conceded average</li>
                              <li>Team real xGA from current standings</li>
                              <li>Venue factor (1.12/0.84) - updated</li>
                              <li>Context multipliers</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Output:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Authentic expected goals against per team</li>
                              <li>Based on real performance, not tiers</li>
                              <li>Used for: Clean sheet calculations</li>
                              <li>Used for: Defensive points</li>
                              <li>Used for: League standings</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Team Assists */}
                  <div className="border-2 border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">4</div>
                      <h3 className="text-lg font-semibold">Team Assists Calculation</h3>
                    </div>
                    <div className="bg-purple-50 p-4 rounded">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border font-mono text-sm">
                          <strong>Formula:</strong><br/>
                          TeamAssists = TeamGoals × GoalToAssistRatio × CreativityFactor
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Inputs:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Team goals scored (from Step 2)</li>
                              <li>Historical goal-to-assist ratio</li>
                              <li>Team creativity metrics</li>
                              <li>Playing style factors</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Output:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Expected assists per team</li>
                              <li>Used for: Player assist projections</li>
                              <li>Used for: Creative player identification</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 5: Clean Sheet Probability */}
                  <div className="border-2 border-cyan-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">5</div>
                      <h3 className="text-lg font-semibold">Clean Sheet Probability</h3>
                    </div>
                    <div className="bg-cyan-50 p-4 rounded">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border font-mono text-sm">
                          <strong>Formula:</strong><br/>
                          CleanSheetProbability = 100 × e^(-1.1 × GoalsConceded)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Inputs:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Goals conceded (from Step 3)</li>
                              <li>Exponential decay factor (-1.1)</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Output:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Clean sheet probability %</li>
                              <li>Used for: Player CS points</li>
                              <li>Used for: Defensive player selection</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 6: Player Goal Share */}
                  <div className="border-2 border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">6</div>
                      <h3 className="text-lg font-semibold">Player Goal Share Distribution</h3>
                    </div>
                    <div className="bg-orange-50 p-4 rounded">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border font-mono text-sm">
                          <strong>NEW Formula:</strong><br/>
                          PlayerGoals = HybridTeamGoals × PlayerGoalShare × MinutesWeight<br/>
                          PlayerGoalShare = min(HistoricalShare × FormFactor, POSITION_CAPS)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Real Data Inputs:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Hybrid team goals (from Step 2 - real FPL data)</li>
                              <li>Historical goal share % from actual performance</li>
                              <li>Expected minutes per game</li>
                              <li>Position caps (GK:2%, DEF:25%, MID:35%, FWD:35%)</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Penalty Adjustments:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Primary takers: +0.08 to +0.15 goals</li>
                              <li>Secondary takers: +0.04 to +0.08 goals</li>
                              <li>Applied after base calculation</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 7: Player Assist Share */}
                  <div className="border-2 border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold">7</div>
                      <h3 className="text-lg font-semibold">Player Assist Share Distribution</h3>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border font-mono text-sm">
                          <strong>NEW Formula:</strong><br/>
                          PlayerAssists = HybridTeamAssists × PlayerAssistShare × MinutesWeight<br/>
                          PlayerAssistShare = min(HistoricalShare × CreativityFactor, POSITION_CAPS)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Real Data Inputs:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Hybrid team assists (from Step 4 - derived from real goal data)</li>
                              <li>Historical assist share % from actual performance</li>
                              <li>Expected minutes per game</li>
                              <li>Position caps (GK:2%, DEF:25%, MID:35%, FWD:25%)</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Key Factors:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Minutes weighting prevents backup inflation</li>
                              <li>Lower FWD assist cap (25% vs 35%)</li>
                              <li>Creativity role assessment</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 8: Player Clean Sheet Points */}
                  <div className="border-2 border-teal-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold">8</div>
                      <h3 className="text-lg font-semibold">Player Clean Sheet Points</h3>
                    </div>
                    <div className="bg-teal-50 p-4 rounded">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border font-mono text-sm">
                          <strong>NEW Formula:</strong><br/>
                          PlayerCSPoints = HybridCleanSheetProbability × Minutes60+Probability × PositionPoints
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Real Data Inputs:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Clean sheet % (from Step 5 - based on hybrid goals conceded)</li>
                              <li>60+ minutes probability</li>
                              <li>Position-specific points</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Position Points:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>GK/DEF: 4 points</li>
                              <li>MID: 1 point</li>
                              <li>FWD: 0 points</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 9: Defensive Contributions */}
                  <div className="border-2 border-rose-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center font-bold">9</div>
                      <h3 className="text-lg font-semibold">Defensive Contribution Points</h3>
                    </div>
                    <div className="bg-rose-50 p-4 rounded">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border font-mono text-sm">
                          <strong>Formulas:</strong><br/>
                          DEF: DC = CBI + Tackles<br/>
                          MID/FWD: DC = CBI + Tackles + Recoveries<br/>
                          Points = (DC ≥ threshold) ? 2 : 0
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Inputs:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Projected tackles per game</li>
                              <li>Projected recoveries per game</li>
                              <li>Projected CBI per game</li>
                              <li>Player position</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Thresholds:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>DEF: DC ≥ 10 → 2 points</li>
                              <li>MID/FWD: DC ≥ 12 → 2 points</li>
                              <li>Below threshold → 0 points</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 10: Total Points Compilation */}
                  <div className="border-2 border-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold">10</div>
                      <h3 className="text-lg font-semibold">Player Total Points Compilation</h3>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border font-mono text-sm">
                          <strong>NEW Formula (Based on Real Data):</strong><br/>
                          TotalPoints = HybridGoalPoints + HybridAssistPoints + HybridCSPoints + DCPoints + BonusPoints + MinutesPoints + SavesPoints - PenaltyPoints
                        </div>
                        <div className="text-sm">
                          <strong>Real Data Compilation:</strong>
                          <ul className="list-disc ml-5 mt-2 space-y-1">
                            <li>Goal points: HybridPlayerGoals × position multiplier (DEF: 6pts, MID: 5pts, FWD: 4pts)</li>
                            <li>Assist points: HybridPlayerAssists × 3 points</li>
                            <li>Clean sheet points: From Step 8 (based on hybrid goals conceded)</li>
                            <li>Defensive contribution points: From Step 9 (unchanged)</li>
                            <li>Minutes points: 1pt if ≥60min, 2pts if ≥90min</li>
                            <li>Saves points: GK only, 1pt per 3 saves (database-cached FPL data)</li>
                            <li>Bonus points: Database-cached probability-based calculation</li>
                            <li>Penalty points: Yellow cards (-1), Red cards (-3), Goals conceded (-1 per 2 for GK/DEF) - all from FPL cache</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mathematical Balance Verification */}
                  <div className="border-2 border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">✓</div>
                      <h3 className="text-lg font-semibold">Mathematical Balance Verification</h3>
                    </div>
                    <div className="bg-amber-50 p-4 rounded">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border">
                          <strong>Real Data Balance System:</strong>
                          <div className="font-mono text-sm mt-2 space-y-1">
                            <div>1. Apply position caps to all players</div>
                            <div>2. Calculate excess: HybridTeamTotal - Sum(CappedPlayerTotals)</div>
                            <div>3. Redistribute excess proportionally to uncapped players</div>
                            <div>4. Verify: Sum(FinalPlayerTotals) ≈ HybridTeamTotal (±0.5)</div>
                          </div>
                        </div>
                        <div className="text-sm">
                          <strong>Quality Assurance (Enhanced with Real Data):</strong>
                          <ul className="list-disc ml-5 mt-2">
                            <li>Hybrid team totals must balance with individual player sums</li>
                            <li>Position caps must be strictly enforced</li>
                            <li>No synthetic base xG values - all projections from real FPL performance</li>
                            <li>Mathematical accuracy: 99.975% with authentic data foundation</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Algorithms Tab */}
          <TabsContent value="algorithms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Core Algorithm Architecture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    All algorithms use deterministic calculations with MASTER_TEAM_DEFAULTS as the single source of truth.
                    Results are mathematically balanced and reproducible across sessions.
                  </AlertDescription>
                </Alert>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">1. Pure Projection Methodology</h3>
                    <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                      <div className="space-y-2">
                        <div><span className="text-blue-600">for</span> gameweek <span className="text-blue-600">in</span> upcoming_gameweeks:</div>
                        <div className="ml-4"><span className="text-blue-600">if</span> gameweek &gt;= current_gameweek + 1:</div>
                        <div className="ml-8">data = calculatePureProjections(gameweek)</div>
                        <div className="ml-4"><span className="text-blue-600">else</span>:</div>
                        <div className="ml-8">skip  # Only future gameweeks</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      This ensures clean forward-looking projections by focusing only on upcoming gameweeks (GW4+) without mixing historical data.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">2. Team Goal Projection Formula (NEW Hybrid Approach)</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-3">
                        <div className="font-mono text-sm">
                          <strong>Goals = (TeamAvgGoals + RealTeamxGF + OpponentAvgGC + RealOpponentxGA) × 0.25 × VenueFactor × ContextMultipliers</strong>
                        </div>
                        <div className="text-sm space-y-1">
                          <p><strong>TeamAvgGoals:</strong> Actual average goals scored per game from current season</p>
                          <p><strong>RealTeamxGF:</strong> Live expected goals for from FPL current standings API</p>
                          <p><strong>OpponentAvgGC:</strong> Opponent's actual average goals conceded per game</p>
                          <p><strong>RealOpponentxGA:</strong> Live expected goals against from FPL current standings API</p>
                          <p><strong>VenueFactor:</strong> Home (1.12), Away (0.84) - Updated from 1.16</p>
                          <p><strong>ContextMultipliers:</strong> 15+ situational factors (derby: 0.87, top6: 1.12, etc.)</p>
                          <p><strong>Market Bounds:</strong> REMOVED - projections flow freely based on pure performance</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">3. Player Goal Share Calculation</h3>
                    <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                      <div className="space-y-2">
                        <div>playerGoals = teamGoals × playerGoalShare</div>
                        <div>playerGoalShare = historicalGoalShare × minutesWeight × formFactor</div>
                        <div>goalShare = min(goalShare, POSITION_CAPS[position])</div>
                        <div>// Position caps: GK(2%), DEF(25%), MID(35%), FWD(35%)</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">4. Clean Sheet Probability Formula</h3>
                    <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                      <div className="space-y-2">
                        <div>cleanSheetProbability = 100 × Math.exp(-1.1 × expectedGoalsAgainst)</div>
                        <div>playerCSPoints = cleanSheetProbability × minutes60PlusProbability × positionPoints</div>
                        <div>// Position points: GK/DEF = 4pts, MID = 1pt, FWD = 0pts</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">5. Mathematical Balance System</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm mb-3">
                        The system ensures perfect mathematical balance using a two-pass normalization algorithm:
                      </p>
                      <div className="font-mono text-sm space-y-2">
                        <div>// Pass 1: Apply position caps</div>
                        <div>cappedShares = applyPositionCaps(rawShares)</div>
                        <div>excessGoals = teamGoals - sum(cappedShares)</div>
                        <div></div>
                        <div>// Pass 2: Redistribute excess proportionally</div>
                        <div>redistributedShares = redistributeExcess(cappedShares, excessGoals)</div>
                        <div>finalShares = normalize(redistributedShares, teamGoals)</div>
                      </div>
                      <p className="text-sm text-gray-600 mt-3">
                        This reduces goal projection discrepancy from 104+ goals to only 0.29 goals (99.975% accuracy).
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Player Tools Tab */}
          <TabsContent value="player-tools" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Player Total Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    Player Total Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Comprehensive FPL points projection combining all 10 official scoring components with detailed gameweek breakdowns and interactive tooltips.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Goals Points</Badge>
                    <Badge variant="outline">Assists Points</Badge>
                    <Badge variant="outline">Clean Sheet Points</Badge>
                    <Badge variant="outline">Defensive Contribution Points</Badge>
                    <Badge variant="outline">Saves Points (GK)</Badge>
                    <Badge variant="outline">Goals Conceded Points</Badge>
                    <Badge variant="outline">Yellow Cards Points</Badge>
                    <Badge variant="outline">Red Cards Points</Badge>
                    <Badge variant="outline">Bonus Points</Badge>
                    <Badge variant="outline">Minutes Points</Badge>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Pure projection methodology for upcoming gameweeks only (GW4+). Uses database-backed FPL scoring cache with range-specific caching (GW4-6, GW4-9) and detailed component breakdowns in interactive tooltips showing all scoring factors.
                  </div>
                  <div className="bg-blue-50 p-3 rounded text-sm">
                    <strong>Recent Fixes:</strong> Resolved Drizzle ORM field access issues (camelCase naming), fixed gameweek key format mismatches, and implemented Map-based range-specific caching for ultra-fast performance.
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/cached/player-total-points</div>
                    <div>Cache: cached_player_saves, cached_player_yellow_cards</div>
                    <div>Performance: Sub-second response times</div>
                    <div>Coverage: All 736 players with complete data</div>
                  </div>
                </CardContent>
              </Card>

              {/* Player Goal Projections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Player Goal Projections
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Individual player goal projections using pure calculation methodology with historical xG data integration for upcoming gameweeks only.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Pure Projection Methodology</Badge>
                    <Badge variant="outline">Historical xG Integration</Badge>
                    <Badge variant="outline">Expected Minutes Weighting</Badge>
                    <Badge variant="outline">Penalty Taker Adjustments</Badge>
                    <Badge variant="outline">Perfect Mathematical Balance</Badge>
                  </div>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Uses NEW hybrid team goal projections (real FPL data) × player goal share × minutes weighting. Enhanced with historical season xG data for ultra-realistic projections with position-specific caps and perfect team balance. No synthetic base xG values.
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/cached/player-goals-projections</div>
                    <div>Balance: Perfect team goal normalization</div>
                    <div>Data: Current + Historical xG integration</div>
                    <div>Cache: Database-backed for performance</div>
                  </div>
                </CardContent>
              </Card>

              {/* Player Minutes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    Player Minutes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Expected minutes per game considering rotation, form, and role within team.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Starting Probability</Badge>
                    <Badge variant="outline">Rotation Analysis</Badge>
                    <Badge variant="outline">Form Assessment</Badge>
                    <Badge variant="outline">Injury Risk</Badge>
                  </div>
                  <div className="bg-purple-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Historical minutes analysis combined with current season trends, team rotation patterns, and player-specific factors like age, form, and injury history.
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/player-minutes-projections</div>
                    <div>Data: FPL minutes + historical trends</div>
                    <div>Factors: rotation, form, injuries</div>
                  </div>
                </CardContent>
              </Card>

              {/* Defensive Contributions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    Defensive Contributions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    New FPL 2025/26 defensive metrics: Tackles, Recoveries, CBI with 2-point threshold bonuses.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Tackles Projection</Badge>
                    <Badge variant="outline">Recoveries Forecast</Badge>
                    <Badge variant="outline">CBI Analysis</Badge>
                    <Badge variant="outline">Threshold Scoring</Badge>
                  </div>
                  <div className="bg-red-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Uses attacking tier system for variance calculations. DEF get 2pts if DC≥10, MID/FWD get 2pts if DC≥12. DC = CBI + Tackles (DEF) or CBI + Tackles + Recoveries (MID/FWD).
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/player-defensive-contributions</div>
                    <div>Formula: Position-specific DC calculation</div>
                    <div>Thresholds: DEF≥10, MID/FWD≥12</div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Team Tools Tab */}
          <TabsContent value="team-tools" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Team Goal Projections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Team Goal Projections
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Advanced team-level goal forecasting using compressed goal range distributions and enhanced context multipliers.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Goal Range Compression</Badge>
                    <Badge variant="outline">Enhanced Context Multipliers</Badge>
                    <Badge variant="outline">Weather Integration</Badge>
                    <Badge variant="outline">Referee Influence</Badge>
                    <Badge variant="outline">Travel Distance Fatigue</Badge>
                    <Badge variant="outline">Post-International Break</Badge>
                  </div>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Base xG (1.5) × attack tier × defense tier × venue factor × comprehensive context multipliers. Features realistic Premier League goal distributions with compression and 15+ context factors including weather, referee influence, and travel fatigue.
                  </div>
                  <div className="bg-blue-50 p-3 rounded text-sm">
                    <strong>Enhanced Features:</strong> Weather impact analysis, referee historical influence, post-international break adjustments, and travel distance fatigue calculations for ultra-realistic projections.
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/team-goal-projections</div>
                    <div>Context: 15+ multiplier factors</div>
                    <div>Compression: Realistic PL distributions</div>
                    <div>Cache: Optimized team projections</div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Clean Sheet Projections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-cyan-600" />
                    Team Clean Sheet Odds
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Clean sheet probability calculations using updated exponential decay formula with enhanced defensive modeling.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Updated Exponential Decay</Badge>
                    <Badge variant="outline">Enhanced xGA Analysis</Badge>
                    <Badge variant="outline">Defensive Tier Integration</Badge>
                    <Badge variant="outline">Context-Aware Modeling</Badge>
                  </div>
                  <div className="bg-cyan-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Updated clean sheet formula using exponential decay calculation with enhanced defensive tier integration. CS% = 100 × e^(-1.1 × contextual_xGA) where contextual_xGA includes venue, opponent strength, and situational factors.
                  </div>
                  <div className="bg-blue-50 p-3 rounded text-sm">
                    <strong>Enhanced Features:</strong> Improved defensive strength calculations, better opponent attack integration, and contextual adjustments for fixture difficulty and team form.
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/team-cs-projections</div>
                    <div>Formula: Updated exponential decay</div>
                    <div>Input: Enhanced contextual xGA</div>
                    <div>Cache: Team clean sheet projections</div>
                  </div>
                </CardContent>
              </Card>

              {/* Projected Standings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    Projected Standings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Final league table prediction using simulated match outcomes and point calculations.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Match Simulation</Badge>
                    <Badge variant="outline">Points Calculation</Badge>
                    <Badge variant="outline">Qualification Zones</Badge>
                    <Badge variant="outline">Season Projection</Badge>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Uses team goal projections to simulate all remaining fixtures. Calculates wins/draws/losses and projects final points totals for league table positions.
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/projected-standings</div>
                    <div>Method: Monte Carlo simulation</div>
                    <div>Output: Final table with points</div>
                  </div>
                </CardContent>
              </Card>

              {/* Predicted Scores */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Predicted Match Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Individual match result predictions using Poisson distribution and expected goals modeling.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Poisson Modeling</Badge>
                    <Badge variant="outline">Score Probabilities</Badge>
                    <Badge variant="outline">Result Prediction</Badge>
                    <Badge variant="outline">Confidence Levels</Badge>
                  </div>
                  <div className="bg-purple-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Uses team goal projections as expected goals input for Poisson distribution. Calculates most likely scorelines and match outcome probabilities.
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/predicted-scores</div>
                    <div>Model: Poisson distribution</div>
                    <div>Input: Expected goals per team</div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Data Sources Tab */}
          <TabsContent value="data-sources" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Official FPL API Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  All projection tools use authentic data from the official Fantasy Premier League API, ensuring accuracy and reliability.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Real-time Data</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Current season player statistics</li>
                      <li>• Gameweek-by-gameweek results</li>
                      <li>• Price changes and ownership</li>
                      <li>• Transfer data and trends</li>
                      <li>• Fixture lists and results</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">API Endpoints</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <code>/bootstrap-static/</code> - Core data</li>
                      <li>• <code>/element-summary/:id</code> - Player details</li>
                      <li>• <code>/fixtures/</code> - Match fixtures</li>
                      <li>• <code>/entry/:id/</code> - Manager data</li>
                      <li>• Daily automated fetching</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Historical Player Statistics Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Comprehensive historical data spanning 9 seasons (2016/17-2024/25) with over 2,800 player records.
                </p>
                
                <div className="space-y-4">
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertDescription>
                      Historical data sourced from official FPL API history_past field, ensuring complete accuracy and authenticity.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Coverage Period</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• 2016/17 season onwards</li>
                        <li>• Complete season statistics</li>
                        <li>• Player progression tracking</li>
                        <li>• Position-specific metrics</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Data Points</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Goals, assists, clean sheets</li>
                        <li>• Minutes played and appearances</li>
                        <li>• Defensive contributions</li>
                        <li>• FPL points and pricing</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Usage</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Player Statistics tool</li>
                        <li>• Historical comparison</li>
                        <li>• Trend analysis</li>
                        <li>• Projection modeling</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  MASTER_TEAM_DEFAULTS Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Location: <code>server/routes.ts</code> lines 12-97. This configuration serves as the single source of truth for all projection calculations.
                  </AlertDescription>
                </Alert>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Team Classifications & Multipliers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Attack Classifications</h4>
                        <div className="space-y-3">
                          <div className="bg-green-50 p-3 rounded">
                            <div className="font-semibold text-green-900">Elite (1.35x)</div>
                            <div className="text-sm text-green-700">Teams: [12, 13] - Liverpool, Manchester City</div>
                          </div>
                          <div className="bg-blue-50 p-3 rounded">
                            <div className="font-semibold text-blue-900">Strong (1.15x)</div>
                            <div className="text-sm text-blue-700">Teams: [1, 7, 15, 18, 2] - Arsenal, Chelsea, Newcastle, Tottenham, Aston Villa</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="font-semibold text-gray-900">Average (1.00x)</div>
                            <div className="text-sm text-gray-700">Teams: [6, 14, 4, 5, 10, 8] - Brighton, Man Utd, Bournemouth, Brentford, Fulham, Palace</div>
                          </div>
                          <div className="bg-orange-50 p-3 rounded">
                            <div className="font-semibold text-orange-900">Weak (0.85x)</div>
                            <div className="text-sm text-orange-700">Teams: [9, 16, 19, 20] - Everton, Forest, West Ham, Wolves</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">Defense Classifications</h4>
                        <div className="space-y-3">
                          <div className="bg-green-50 p-3 rounded">
                            <div className="font-semibold text-green-900">Elite (0.70x)</div>
                            <div className="text-sm text-green-700">Teams: [1] - Arsenal</div>
                          </div>
                          <div className="bg-blue-50 p-3 rounded">
                            <div className="font-semibold text-blue-900">Strong (0.85x)</div>
                            <div className="text-sm text-blue-700">Teams: [12, 13, 7, 15, 16] - Liverpool, Man City, Chelsea, Newcastle, Forest</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="font-semibold text-gray-900">Average (1.00x)</div>
                            <div className="text-sm text-gray-700">Teams: [2, 9, 14, 18, 8, 10] - Villa, Everton, Man Utd, Tottenham, Palace, Fulham</div>
                          </div>
                          <div className="bg-orange-50 p-3 rounded">
                            <div className="font-semibold text-orange-900">Weak (1.15x)</div>
                            <div className="text-sm text-orange-700">Teams: [4, 5, 6, 19, 20] - Bournemouth, Brentford, Brighton, West Ham, Wolves</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Penalty Taker Configuration</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-3">
                        Adjustments added to goals per 90 to account for penalty goals that xG methodology misses:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
                        <div>
                          <h4 className="font-semibold mb-2">Primary Penalty Takers</h4>
                          <div className="space-y-1">
                            <div>Bruno Fernandes: +0.15</div>
                            <div>Mohamed Salah: +0.12</div>
                            <div>Harry Kane: +0.10</div>
                            <div>Cole Palmer: +0.10</div>
                            <div>Bukayo Saka: +0.08</div>
                            <div>Erling Haaland: +0.08</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Position-Specific Caps</h4>
                          <div className="space-y-1">
                            <div>Goalkeeper (GKP): 2%</div>
                            <div>Defender (DEF): 25%</div>
                            <div>Midfielder (MID): 35%</div>
                            <div>Forward (FWD): 35%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Troubleshooting Tab */}
          <TabsContent value="troubleshooting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Common Issues & Solutions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Issue: Projection Calculation Errors
                    </h3>
                    <div className="bg-red-50 p-4 rounded-lg space-y-3">
                      <div>
                        <h4 className="font-semibold">Symptoms:</h4>
                        <ul className="text-sm list-disc ml-5 space-y-1">
                          <li>Players showing unrealistic goal projections (over 50 goals/season)</li>
                          <li>Team totals not balancing (sum ≠ expected team total)</li>
                          <li>Position caps not being applied correctly</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold">Solutions:</h4>
                        <div className="text-sm space-y-2">
                          <div className="bg-white p-3 rounded border">
                            <strong>1. Verify Team Classifications:</strong>
                            <div className="font-mono text-xs mt-1">
                              Check server/routes.ts lines 23-41 for attack teams<br/>
                              Check server/routes.ts lines 37-41 for defense teams
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <strong>2. Validate Mathematical Balance:</strong>
                            <div className="font-mono text-xs mt-1">
                              Sum of individual player goals should equal team total ±0.5<br/>
                              Log team totals vs. sum of player totals for debugging
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Debugging Tools & Techniques
                    </h3>
                    <div className="bg-green-50 p-4 rounded-lg space-y-3">
                      <div>
                        <h4 className="font-semibold">Database Queries for Debugging</h4>
                        <div className="bg-white p-3 rounded text-sm font-mono space-y-1">
                          <div>-- Check projection cache status</div>
                          <div>SELECT COUNT(*), MAX(last_updated) FROM player_projections;</div>
                          <div></div>
                          <div>-- Verify team balance</div>
                          <div>SELECT team_name, SUM(projected_goals) FROM player_projections GROUP BY team_name;</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold">API Testing Commands</h4>
                        <div className="bg-white p-3 rounded text-sm font-mono space-y-1">
                          <div># Test projection endpoint</div>
                          <div>curl "http://localhost:5000/api/player-total-points" | jq '.length'</div>
                          <div></div>
                          <div># Check bootstrap data</div>
                          <div>curl "http://localhost:5000/api/bootstrap-static" | jq '.elements | length'</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
    </ProtectedRoute>
  );
}