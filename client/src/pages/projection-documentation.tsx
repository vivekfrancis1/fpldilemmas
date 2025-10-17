import { Book, Target, Users, Shield, Clock, TrendingUp, Database, Calculator, Info, ExternalLink, GitBranch, Zap, Trophy, BarChart3, FileText, Code, AlertTriangle, CheckCircle, Settings, Activity, Cpu, Brain, Calendar, Home, UserCheck, Server, Archive } from "lucide-react";
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
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                <strong>100% Real FPL Data:</strong> All algorithms use deterministic calculations with live FPL API data as the foundation. No synthetic base xG values - every projection is derived from actual team performance data from the current standings API.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              
              {/* Algorithm 1: Hybrid Team Goals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-green-600" />
                    1. Hybrid Team Goals Algorithm
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-3">Implementation (server/team-goals-service.ts)</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-2">
                      <div className="text-blue-600">async function</div> <div>calculateFixtureGoals(team, opponent, fixture, isHome):</div>
                      <div className="ml-4">// Phase 1: Fetch real data from current standings</div>
                      <div className="ml-4">teamAvgGoals = await getTeamAverageGoals(team.id)</div>
                      <div className="ml-4">teamAvgXG = await getTeamAverageXG(team.id)</div>
                      <div className="ml-4">opponentAvgGC = await getTeamAverageGoalsConceded(opponent.id)</div>
                      <div className="ml-4">opponentAvgXGA = await getTeamAverageXGC(opponent.id)</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Phase 2: Hybrid calculation</div>
                      <div className="ml-4">baseGoals = (teamAvgGoals + teamAvgXG + opponentAvgGC + opponentAvgXGA) × 0.25</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Phase 3: Apply venue factor</div>
                      <div className="ml-4">venueFactor = isHome ? 1.12 : 0.84</div>
                      <div className="ml-4">goalsWithVenue = baseGoals × venueFactor</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Phase 4: Context multipliers</div>
                      <div className="ml-4">finalGoals = applyContextMultipliers(goalsWithVenue, team, opponent, fixture)</div>
                      <div className="ml-4"></div>
                      <div className="ml-4 text-green-600">return</div> finalGoals
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded text-sm">
                      <strong className="text-blue-900">Data Fetching:</strong>
                      <ul className="list-disc ml-5 mt-1 text-blue-800">
                        <li>Calls /api/current-standings internally</li>
                        <li>Calculates averages from played games</li>
                        <li>5-minute cache on standings data</li>
                        <li>10-minute cache on team projections</li>
                      </ul>
                    </div>
                    <div className="bg-purple-50 p-3 rounded text-sm">
                      <strong className="text-purple-900">Context Factors:</strong>
                      <ul className="list-disc ml-5 mt-1 text-purple-800">
                        <li>Team form: Last 5 games (3+ wins = 1.06×)</li>
                        <li>Derby matches: 0.87× multiplier</li>
                        <li>Top 6 battles: 1.12× multiplier</li>
                        <li>Season finale (GW37+): 1.05×</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Algorithm 2: Position Caps & Redistribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-orange-600" />
                    2. Position Caps & Redistribution Algorithm
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-3">Implementation (server/projection-adjustments.ts)</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-2">
                      <div className="text-blue-600">function</div> <div>enforcePositionCaps(teamPlayerShares, type):</div>
                      <div className="ml-4">// Step 1: Apply position caps</div>
                      <div className="ml-4">totalExcess = 0</div>
                      <div className="ml-4"><span className="text-blue-600">for each</span> player <span className="text-blue-600">in</span> teamPlayerShares:</div>
                      <div className="ml-8">positionCap = getPositionCap(player.position, type)</div>
                      <div className="ml-8">cappedShare = min(player.share, positionCap)</div>
                      <div className="ml-8">excess = player.share - cappedShare</div>
                      <div className="ml-8">totalExcess += excess</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Step 2: Redistribute excess proportionally</div>
                      <div className="ml-4"><span className="text-blue-600">if</span> totalExcess &gt; 0:</div>
                      <div className="ml-8">totalCappedShare = sum(all cappedShares)</div>
                      <div className="ml-8">redistributionFactor = totalExcess / totalCappedShare</div>
                      <div className="ml-8"><span className="text-blue-600">for each</span> player <span className="text-blue-600">not at cap</span>:</div>
                      <div className="ml-12">player.share = min(player.share × (1 + redistributionFactor), positionCap)</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Step 3: Normalize to 100%</div>
                      <div className="ml-4">totalShare = sum(all player shares)</div>
                      <div className="ml-4"><span className="text-blue-600">for each</span> player:</div>
                      <div className="ml-8">player.share = (player.share / totalShare) × 100</div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded text-sm">
                    <strong className="text-yellow-900">Position Caps Reference:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-yellow-800">
                        <strong>Goals:</strong> GK 2%, DEF 10%, MID 25%, FWD 30%
                      </div>
                      <div className="text-yellow-800">
                        <strong>Assists:</strong> GK 2%, DEF 15%, MID 30%, FWD 25%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Algorithm 3: Set Piece Adjustments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-purple-600" />
                    3. Set Piece Adjustments Algorithm
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-3">Penalty Taker Adjustment (Goals)</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-2">
                      <div className="text-blue-600">function</div> <div>getPenaltyTakerAdjustment(playerId, bootstrapData):</div>
                      <div className="ml-4">player = bootstrapData.elements.find(p =&gt; p.id === playerId)</div>
                      <div className="ml-4">penaltyOrder = player.penalties_order</div>
                      <div className="ml-4"></div>
                      <div className="ml-4"><span className="text-blue-600">if</span> penaltyOrder === 1:  // Primary</div>
                      <div className="ml-8">adjustment = 0.6 + (player.goals_scored × 0.03)</div>
                      <div className="ml-8">adjustment = min(0.8, adjustment)  // Cap at 0.8</div>
                      <div className="ml-4"><span className="text-blue-600">else if</span> penaltyOrder === 2:  // Secondary</div>
                      <div className="ml-8">adjustment = 0.3 + (player.goals_scored × 0.025)</div>
                      <div className="ml-8">adjustment = min(0.5, adjustment)  // Cap at 0.5</div>
                      <div className="ml-4"></div>
                      <div className="ml-4"><span className="text-green-600">return</span> adjustment</div>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Corner Taker Adjustment (Assists)</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-2">
                      <div className="text-blue-600">function</div> <div>getCornerFreekickAdjustment(playerId, bootstrapData):</div>
                      <div className="ml-4">player = bootstrapData.elements.find(p =&gt; p.id === playerId)</div>
                      <div className="ml-4">cornerOrder = player.corners_and_indirect_freekicks_order</div>
                      <div className="ml-4"></div>
                      <div className="ml-4"><span className="text-blue-600">if</span> cornerOrder === 1:  // Primary</div>
                      <div className="ml-8">adjustment = 0.8 + (player.assists × 0.04)</div>
                      <div className="ml-8">adjustment = min(1.2, adjustment)  // Cap at 1.2</div>
                      <div className="ml-4"><span className="text-blue-600">else if</span> cornerOrder === 2:  // Secondary</div>
                      <div className="ml-8">adjustment = 0.5 + (player.assists × 0.03)</div>
                      <div className="ml-8">adjustment = min(0.8, adjustment)  // Cap at 0.8</div>
                      <div className="ml-4"></div>
                      <div className="ml-4"><span className="text-green-600">return</span> adjustment</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Algorithm 4: Clean Sheet Probability */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-cyan-600" />
                    4. Clean Sheet Probability Algorithm
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-cyan-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-cyan-900 mb-3">Exponential Decay Formula (Poisson-based)</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-2">
                      <div className="text-blue-600">function</div> <div>calculateCleanSheetProbability(teamId, opponent, venue):</div>
                      <div className="ml-4">// Calculate expected goals conceded</div>
                      <div className="ml-4">goalsConceded = calculateOpponentGoalsScored(opponent, teamId, venue)</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Apply exponential decay (Poisson P(0) formula)</div>
                      <div className="ml-4">cleanSheetProbability = 100 × Math.exp(-1.1 × goalsConceded)</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Calculate player clean sheet points</div>
                      <div className="ml-4">positionPoints = getPositionCSPoints(player.position)</div>
                      <div className="ml-4">minutes60PlusProb = player.expectedMinutes &gt;= 60 ? 1.0 : 0.0</div>
                      <div className="ml-4">playerCSPoints = (cleanSheetProbability / 100) × minutes60PlusProb × positionPoints</div>
                      <div className="ml-4"></div>
                      <div className="ml-4"><span className="text-green-600">return</span> playerCSPoints</div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <strong className="text-green-900">Probability Examples:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-green-800">
                      <div>0.5 xGA → 57% CS chance</div>
                      <div>1.0 xGA → 33% CS chance</div>
                      <div>1.5 xGA → 19% CS chance</div>
                      <div>2.0 xGA → 11% CS chance</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Algorithm 5: Mathematical Balance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-amber-600" />
                    5. Mathematical Balance Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-amber-900 mb-3">Three-Phase Balance System</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-2">
                      <div className="text-blue-600">function</div> <div>ensureMathematicalBalance(teamGoals, playerProjections):</div>
                      <div className="ml-4">// Phase 1: Apply position caps</div>
                      <div className="ml-4">cappedProjections = enforcePositionCaps(playerProjections)</div>
                      <div className="ml-4">sumCapped = sum(cappedProjections)</div>
                      <div className="ml-4">excess = teamGoals - sumCapped</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Phase 2: Redistribute excess</div>
                      <div className="ml-4"><span className="text-blue-600">if</span> excess &gt; 0:</div>
                      <div className="ml-8">redistributedProjections = redistributeProportionally(cappedProjections, excess)</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Phase 3: Final normalization</div>
                      <div className="ml-4">totalSum = sum(redistributedProjections)</div>
                      <div className="ml-4">normalizedProjections = redistributedProjections.map(p =&gt; (p / totalSum) × teamGoals)</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Verify balance</div>
                      <div className="ml-4">finalSum = sum(normalizedProjections)</div>
                      <div className="ml-4">discrepancy = abs(finalSum - teamGoals)</div>
                      <div className="ml-4"><span className="text-blue-600">assert</span> discrepancy &lt; 0.5  // Should be ≈0.29 goals</div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <strong className="text-green-900">Balance Achievement:</strong>
                    <div className="mt-2 text-green-800">
                      Original system: 104+ goals discrepancy<br/>
                      Current system: 0.29 goals discrepancy (99.975% accuracy)
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Player Tools Tab */}
          <TabsContent value="player-tools" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                All player projection tools use actual implementation logic from the FPL scoring system. Each component is calculated independently and combined for total points.
              </AlertDescription>
            </Alert>

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
                    Comprehensive FPL points projection combining all 10 official scoring components with detailed gameweek breakdowns.
                  </p>
                  <div className="bg-yellow-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">TotalPoints = GoalPoints + AssistPoints + CleanSheetPoints + DCPoints + MinutesPoints + SavesPoints + BonusPoints - GoalsConcededPoints - YellowCardPoints - RedCardPoints</code>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm"><strong>Components:</strong></div>
                    <Badge variant="outline">Goals × Position Multiplier</Badge>
                    <Badge variant="outline">Assists × 3</Badge>
                    <Badge variant="outline">Clean Sheets × Position Points</Badge>
                    <Badge variant="outline">DC ≥ Threshold: 2pts</Badge>
                    <Badge variant="outline">Minutes: 1-2pts</Badge>
                    <Badge variant="outline">Saves ÷ 3: 1pt</Badge>
                    <Badge variant="outline">Bonus (Cached)</Badge>
                    <Badge variant="outline">GC ÷ 2: -1pt (GK/DEF)</Badge>
                    <Badge variant="outline">Yellow: -1pt</Badge>
                    <Badge variant="outline">Red: -3pt</Badge>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/cached/player-total-points</div>
                    <div>Cache: cached_player_total_points</div>
                    <div>Performance: Sub-second response</div>
                  </div>
                </CardContent>
              </Card>

              {/* Player Goal Projections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Goals & Points from Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Individual player goal projections using hybrid team goals and historical goal share data.
                  </p>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">PlayerGoals = HybridTeamGoals × (PlayerGoalShare / 100) × (ExpectedMinutes / 90)</code><br/>
                    <code className="text-xs">+ PenaltyAdjustment + FreekickAdjustment</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Position Caps:</strong> GK: 2%, DEF: 10%, MID: 30%, FWD: 40%</div>
                    <div><strong>Penalty Adjustments:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Primary: +0.6 to +0.8 goals per GW</li>
                      <li>Secondary: +0.3 to +0.5 goals per GW</li>
                    </ul>
                    <div><strong>Points Calculation:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>GK/DEF: Goals × 6 points</li>
                      <li>MID: Goals × 5 points</li>
                      <li>FWD: Goals × 4 points</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/player-goal-projections</div>
                    <div>Data Source: Hybrid team goals + historical xG</div>
                  </div>
                </CardContent>
              </Card>

              {/* Player Assist Projections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Assists & Points from Assists
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Assist projections based on team creativity and individual assist share from historical data.
                  </p>
                  <div className="bg-blue-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">PlayerAssists = TeamAssists × (PlayerAssistShare / 100)</code><br/>
                    <code className="text-xs">TeamAssists = TeamGoals × 0.72</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Position Caps:</strong> GK: 2%, DEF: 15%, MID: 40%, FWD: 25%</div>
                    <div><strong>Set Piece Bonuses:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Primary corner/freekick: +0.8 assists</li>
                      <li>Secondary corner/freekick: +0.5 assists</li>
                      <li>Direct freekick specialist: +0.2 assists</li>
                    </ul>
                    <div><strong>Points:</strong> Each assist = 3 points</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/player-assist-projections</div>
                    <div>Data: Assist share + xA integration</div>
                  </div>
                </CardContent>
              </Card>

              {/* Player Minutes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    Minutes & Points from Minutes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Expected minutes per game based on actual performance and team rotation patterns.
                  </p>
                  <div className="bg-purple-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">ExpectedMinutes = (CurrentMinutes / GamesPlayed)</code><br/>
                    <code className="text-xs">MinutesPoints = (ExpectedMinutes / 90) × 2</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Calculation:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Uses actual minutes played this season</li>
                      <li>Divided by team games played (not appearances)</li>
                      <li>Capped at 90 minutes per game maximum</li>
                    </ul>
                    <div><strong>FPL Points Rules:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>0-59 minutes: 0 points</li>
                      <li>60-89 minutes: 1 point</li>
                      <li>90+ minutes: 2 points</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/player-minutes-projections</div>
                    <div>Data: FPL bootstrap actual minutes</div>
                  </div>
                </CardContent>
              </Card>

              {/* Clean Sheets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-teal-600" />
                    Clean Sheets & CS Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Clean sheet probability using exponential decay based on expected goals conceded.
                  </p>
                  <div className="bg-teal-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">CS% = 100 × e^(-1.1 × GoalsConceded)</code><br/>
                    <code className="text-xs">CSPoints = CS% × Minutes60+% × PositionPoints</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Goals Conceded Calculation:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Based on hybrid opponent attack data</li>
                      <li>Real team defensive performance</li>
                      <li>Venue and context adjustments</li>
                    </ul>
                    <div><strong>Position Points:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>GK/DEF: 4 points per clean sheet</li>
                      <li>MID: 1 point per clean sheet</li>
                      <li>FWD: 0 points</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/clean-sheet-projections</div>
                    <div>Formula: Exponential decay (e^-1.1×xGA)</div>
                  </div>
                </CardContent>
              </Card>

              {/* Defensive Contributions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    Defensive Contributions & DC Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    FPL 2025/26 defensive metrics: Tackles, Recoveries, CBI with threshold-based scoring.
                  </p>
                  <div className="bg-red-50 p-3 rounded text-sm">
                    <strong>Formulas:</strong><br/>
                    <code className="text-xs">DEF: DC = CBI + Tackles</code><br/>
                    <code className="text-xs">MID/FWD: DC = CBI + Tackles + Recoveries</code><br/>
                    <code className="text-xs">Points = (DC ≥ Threshold) ? 2 : 0</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Thresholds:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Defenders: DC ≥ 10 → 2 points</li>
                      <li>Midfielders: DC ≥ 12 → 2 points</li>
                      <li>Forwards: DC ≥ 12 → 2 points</li>
                      <li>Goalkeepers: Uses defender formula</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/player-defensive-contributions</div>
                    <div>Data: Per-90 rates from historical stats</div>
                  </div>
                </CardContent>
              </Card>

              {/* Goalkeeper Saves */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-cyan-600" />
                    Saves & Points from Saves (GK Only)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Goalkeeper save projections based on opponent shots on target and defensive quality.
                  </p>
                  <div className="bg-cyan-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">ExpectedSaves = OpponentShotsOnTarget × TeamDefensiveQuality</code><br/>
                    <code className="text-xs">SavePoints = floor(Saves / 3) × 1</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>FPL Scoring Rules:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>1 point for every 3 saves</li>
                      <li>5 bonus points for each penalty save</li>
                      <li>Examples: 6 saves = 2pts, 9 saves = 3pts</li>
                    </ul>
                    <div><strong>Data Source:</strong> Cached from FPL live data</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>Cache: cached_player_save_points</div>
                    <div>Table: gameweek_player_data (saves)</div>
                  </div>
                </CardContent>
              </Card>

              {/* Goals Conceded */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Goals Conceded & GC Points (GK/DEF)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Goals conceded projections for goalkeepers and defenders based on team defensive performance.
                  </p>
                  <div className="bg-orange-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">GoalsConceded = OpponentGoalsScored (from hybrid formula)</code><br/>
                    <code className="text-xs">GCPoints = -floor(GoalsConceded / 2)</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>FPL Scoring Rules:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>GK/DEF only: -1 point per 2 goals conceded</li>
                      <li>Examples: 1 GC = 0pts, 2 GC = -1pt, 4 GC = -2pts</li>
                      <li>Based on team defensive record vs opponent</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>Cache: cached_player_goals_conceded</div>
                    <div>Calculation: Hybrid real data formula</div>
                  </div>
                </CardContent>
              </Card>

              {/* Yellow Cards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Yellow Cards & YC Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Yellow card probability based on player position, form, and opponent difficulty.
                  </p>
                  <div className="bg-yellow-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">YCProbability = BaseRate × PositionMultiplier × FormFactor × FixtureDifficulty</code><br/>
                    <code className="text-xs">YCPoints = ExpectedYellowCards × -1</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Position Base Rates:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Defenders: Higher base probability</li>
                      <li>Midfielders: Medium probability</li>
                      <li>Forwards: Lower probability</li>
                    </ul>
                    <div><strong>Points:</strong> Each yellow card = -1 point</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>Cache: cached_player_yellow_cards</div>
                    <div>Data: Historical yellow card rates</div>
                  </div>
                </CardContent>
              </Card>

              {/* Red Cards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-700" />
                    Red Cards & RC Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Red card probability based on player discipline, position, and fixture difficulty.
                  </p>
                  <div className="bg-red-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">RCProbability = BaseRate × PositionMultiplier × FormFactor × FixtureDifficulty</code><br/>
                    <code className="text-xs">RCPoints = ExpectedRedCards × -3</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Position Risk:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Defenders: Higher risk (last man situations)</li>
                      <li>Others: Lower base probability</li>
                    </ul>
                    <div><strong>Points:</strong> Each red card = -3 points</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>Cache: cached_player_red_cards</div>
                    <div>Probability: Generally very low (&lt;0.1)</div>
                  </div>
                </CardContent>
              </Card>

              {/* Bonus Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-600" />
                    Bonus Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Bonus point projections based on overall performance metrics and historical BPS data.
                  </p>
                  <div className="bg-amber-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">BonusProbability = f(Goals, Assists, CleanSheets) × FormFactor × OwnershipWeight</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Calculation Factors:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Goals, assists, clean sheets performance</li>
                      <li>Recent form and BPS trends</li>
                      <li>Player ownership influence</li>
                      <li>Capped probability for realistic distribution</li>
                    </ul>
                    <div><strong>Note:</strong> Probabilistic estimate, actual bonus based on FPL BPS</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>Cache: cached_player_bonus_points</div>
                    <div>Data: Probability-based calculation</div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Team Tools Tab */}
          <TabsContent value="team-tools" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Team-Level Projections:</strong> All team tools use the hybrid real FPL data methodology to calculate team-level statistics that feed into player projections. These tools provide the foundation for accurate player-level forecasting by establishing realistic team performance baselines.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              
              {/* Team Goals Scored */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Team Goals Scored
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Advanced team-level goal forecasting using hybrid real FPL performance data combined with expected goals analysis. This is the foundation for all player goal and assist projections.
                  </p>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Hybrid Real Data Formula</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm mb-3">
                      TeamGoals = (TeamAvgGoals + RealTeamxGF + OpponentAvgGC + RealOpponentxGA) × 0.25 × VenueFactor × ContextMultipliers
                    </div>
                    <p className="text-sm text-green-800">
                      This formula combines four real data sources: team's actual average goals scored, team's real expected goals from current standings, opponent's actual average goals conceded, and opponent's real expected goals against from current standings.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-semibold text-blue-900 mb-2">Real Data Inputs (100% FPL API)</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Team actual avg goals/game (from current standings)</li>
                        <li>• Team real xGF/game (from FPL API standings)</li>
                        <li>• Opponent actual avg goals conceded/game</li>
                        <li>• Opponent real xGA/game (from FPL API)</li>
                        <li>• No synthetic base xG - exclusively real data</li>
                      </ul>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-semibold text-purple-900 mb-2">Venue & Context Factors</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• Home advantage: 1.12× (reduced from 1.16)</li>
                        <li>• Away factor: 0.84×</li>
                        <li>• Team form (last 5 games): ±6%</li>
                        <li>• Derby matches: 0.87× (defensive)</li>
                        <li>• Top 6 battles: 1.12× (high-scoring)</li>
                        <li>• Season finale: 1.05× (open games)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded">
                    <h4 className="font-semibold text-yellow-900 mb-2">Key Implementation Changes</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>✅ Market bounds completely removed (was 0.6-3.0)</li>
                      <li>✅ Tier-based multipliers replaced with live xGF/xGA data</li>
                      <li>✅ 5-minute cache on current standings data</li>
                      <li>✅ 10-minute cache on team goal projections</li>
                      <li>✅ Real FPL data only - no synthetic calculations</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                    <div><strong>API:</strong> /api/team-goal-projections</div>
                    <div><strong>Service:</strong> TeamGoalsService.getTeamGoalProjections()</div>
                    <div><strong>Data Source:</strong> /api/current-standings (real FPL data)</div>
                    <div><strong>Cache:</strong> 10 minutes per gameweek range</div>
                    <div><strong>Output:</strong> Expected goals per team per gameweek</div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Assists */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    Team Assists
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Team assist projections derived directly from team goal projections using historical Premier League assist-to-goal ratios.
                  </p>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Simple Ratio Formula</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm mb-3">
                      TeamAssists = TeamGoals × 0.72
                    </div>
                    <p className="text-sm text-blue-800">
                      Based on historical Premier League data showing that approximately 72% of goals have an associated assist. This ratio is consistent across teams and seasons.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-semibold text-green-900 mb-2">Calculation Flow</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>1. Calculate team goals (hybrid formula)</li>
                        <li>2. Multiply by 0.72 for assist total</li>
                        <li>3. Distribute to players by assist share %</li>
                        <li>4. Apply position caps (see below)</li>
                        <li>5. Add set piece bonuses (corners/FKs)</li>
                      </ul>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-semibold text-purple-900 mb-2">Assist Share Position Caps</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• Goalkeeper: Max 2% share</li>
                        <li>• Defender: Max 15% share</li>
                        <li>• Midfielder: Max 30% share</li>
                        <li>• Forward: Max 25% share (lower than goals)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-3 rounded">
                    <h4 className="font-semibold text-orange-900 mb-2">Set Piece Assist Bonuses</h4>
                    <p className="text-sm text-orange-800 mb-2">
                      Additional assists added for corner and indirect freekick takers:
                    </p>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Primary corner taker: +0.8 to +1.2 assists</li>
                      <li>• Secondary corner taker: +0.5 to +0.8 assists</li>
                      <li>• Tertiary corner taker: +0.3 to +0.5 assists</li>
                      <li>• Bonus scales with actual assists recorded</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                    <div><strong>API:</strong> /api/team-assist-projections</div>
                    <div><strong>Module:</strong> server/projection-adjustments.ts</div>
                    <div><strong>Input:</strong> Team goal projections × 0.72</div>
                    <div><strong>Adjustments:</strong> Position caps + set piece bonuses</div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Goals Conceded & Clean Sheets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-cyan-600" />
                    Team Goals Conceded & Clean Sheets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Team defensive projections calculated using opponent's attacking threat combined with exponential decay formula for clean sheet probability.
                  </p>
                  
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">Goals Conceded Calculation</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm mb-3">
                      GoalsConceded = OpponentGoalsScored<br/>
                      (Using hybrid real data formula with venue inverted)
                    </div>
                    <p className="text-sm text-red-800">
                      Goals conceded is simply the opponent's expected goals scored, calculated using the same hybrid formula but from the defensive perspective. Venue factors are inverted (home team defends better at 1.12×, worse away at 0.84×).
                    </p>
                  </div>

                  <div className="bg-cyan-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-cyan-900 mb-2">Clean Sheet Probability Formula</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm mb-3">
                      CleanSheetProbability = 100 × e^(-1.1 × GoalsConceded)
                    </div>
                    <p className="text-sm text-cyan-800 mb-3">
                      Exponential decay formula based on Poisson distribution theory. The decay factor of -1.1 provides realistic Premier League clean sheet probabilities.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white p-2 rounded border">
                        <div className="font-semibold">0.5 xGA → 57% CS</div>
                        <div className="text-xs text-gray-600">Elite defensive fixture</div>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <div className="font-semibold">1.0 xGA → 33% CS</div>
                        <div className="text-xs text-gray-600">Average fixture</div>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <div className="font-semibold">1.5 xGA → 19% CS</div>
                        <div className="text-xs text-gray-600">Difficult fixture</div>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <div className="font-semibold">2.0 xGA → 11% CS</div>
                        <div className="text-xs text-gray-600">Very difficult fixture</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-semibold text-green-900 mb-2">Real Data Foundation</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Opponent's actual goals scored/game</li>
                        <li>• Opponent's real xGF from standings</li>
                        <li>• Team's actual goals conceded/game</li>
                        <li>• Team's real xGA from standings</li>
                        <li>• Contextual adjustments applied</li>
                      </ul>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-semibold text-purple-900 mb-2">FPL Clean Sheet Points</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• Goalkeeper: 4 points</li>
                        <li>• Defender: 4 points</li>
                        <li>• Midfielder: 1 point</li>
                        <li>• Forward: 0 points</li>
                        <li>• Requires 60+ minutes played</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                    <div><strong>API:</strong> /api/team-cs-projections</div>
                    <div><strong>Formula:</strong> 100 × e^(-1.1 × xGA)</div>
                    <div><strong>Input:</strong> Opponent goals scored (hybrid formula)</div>
                    <div><strong>Output:</strong> Clean sheet probability % per fixture</div>
                  </div>
                </CardContent>
              </Card>

              {/* Goal Share Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    Goal Share Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Individual player goal projections calculated by distributing team goals based on historical share percentage with strict position-based caps.
                  </p>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2">Player Goal Share Formula</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm mb-3">
                      PlayerGoals = TeamGoals × min(HistoricalShare × FormFactor, POSITION_CAP) × MinutesWeight
                    </div>
                    <p className="text-sm text-orange-800">
                      Each player's goal projection is their share of the team's total expected goals, capped by position limits and weighted by expected minutes played.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-semibold text-blue-900 mb-2">Position Caps (% of Team Goals)</h4>
                      <ul className="text-sm text-blue-700 space-y-2">
                        <li className="flex justify-between">
                          <span>• Goalkeeper:</span>
                          <strong>Max 2%</strong>
                        </li>
                        <li className="flex justify-between">
                          <span>• Defender:</span>
                          <strong>Max 10%</strong>
                        </li>
                        <li className="flex justify-between">
                          <span>• Midfielder:</span>
                          <strong>Max 25%</strong>
                        </li>
                        <li className="flex justify-between">
                          <span>• Forward:</span>
                          <strong>Max 30%</strong>
                        </li>
                      </ul>
                      <p className="text-xs text-blue-600 mt-2">
                        *Elite exceptions: Haaland 40%, Salah 30%
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-semibold text-green-900 mb-2">Share Calculation Process</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>1. Calculate historical goal share %</li>
                        <li>2. Apply current form multiplier</li>
                        <li>3. Enforce position-based caps</li>
                        <li>4. Redistribute excess to team</li>
                        <li>5. Normalize to 100% team total</li>
                        <li>6. Weight by expected minutes</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-3 rounded">
                    <h4 className="font-semibold text-purple-900 mb-2">Penalty Taker Adjustments</h4>
                    <p className="text-sm text-purple-800 mb-2">
                      Additional goals added for penalty takers (not included in base xG):
                    </p>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Primary penalty taker: +0.6 to +0.8 goals (based on conversion rate)</li>
                      <li>• Secondary penalty taker: +0.3 to +0.5 goals</li>
                      <li>• Adjustment scales with goals scored history</li>
                      <li>• Applied after base goal share calculation</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                    <div><strong>API:</strong> /api/goal-share</div>
                    <div><strong>Module:</strong> server/projection-adjustments.ts</div>
                    <div><strong>Function:</strong> enforcePositionCaps()</div>
                    <div><strong>Input:</strong> Team goals + player historical share</div>
                  </div>
                </CardContent>
              </Card>

              {/* Match Predictions & Standings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    Match Predictions & Standings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    League standings and match result predictions using team goal projections to simulate all remaining fixtures and calculate final table positions.
                  </p>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">Match Outcome Simulation</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm mb-3">
                      For each fixture:<br/>
                      • Calculate TeamA expected goals (hybrid formula)<br/>
                      • Calculate TeamB expected goals (hybrid formula)<br/>
                      • Determine result: Win if xG difference &gt; 0.5, else Draw<br/>
                      • Award points: Win = 3, Draw = 1, Loss = 0
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-semibold text-blue-900 mb-2">Points Calculation</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Win: 3 points (xG margin &gt; 0.5)</li>
                        <li>• Draw: 1 point (xG margin ≤ 0.5)</li>
                        <li>• Loss: 0 points</li>
                        <li>• Goal difference calculated from xG</li>
                        <li>• Simulates all remaining fixtures</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-semibold text-green-900 mb-2">Standings Output</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Current points + projected points</li>
                        <li>• Final league position</li>
                        <li>• Total goals for/against</li>
                        <li>• Goal difference</li>
                        <li>• Qualification zones (CL, EL, REL)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-3 rounded">
                    <h4 className="font-semibold text-purple-900 mb-2">Poisson Score Predictions</h4>
                    <p className="text-sm text-purple-800 mb-2">
                      Alternative prediction method using Poisson distribution:
                    </p>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• P(Team scores n goals) = (λ^n × e^-λ) / n!</li>
                      <li>• λ = expected goals from hybrid formula</li>
                      <li>• Calculate probability for each scoreline (0-0 to 5-5)</li>
                      <li>• Most likely score = highest probability combination</li>
                      <li>• Provides confidence intervals for predictions</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                    <div><strong>API:</strong> /api/projected-standings</div>
                    <div><strong>Input:</strong> Team goal projections (all fixtures)</div>
                    <div><strong>Method:</strong> Deterministic simulation</div>
                    <div><strong>Output:</strong> Final table with positions & points</div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Data Sources Tab */}
          <TabsContent value="data-sources" className="space-y-6">
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <strong>100% Authentic FPL Data:</strong> Every projection uses live data from official Fantasy Premier League APIs with strategic caching for optimal performance. No synthetic or estimated base values.
              </AlertDescription>
            </Alert>

            {/* Current Standings API - NEW PRIMARY SOURCE */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-600" />
                  Current Standings API (Primary Data Source)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  <strong>The foundation of the hybrid formula:</strong> Real-time team performance data including live xGF and xGA from the current standings API.
                </p>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">API Endpoint</h4>
                  <div className="bg-white p-3 rounded border font-mono text-sm">
                    GET /api/current-standings
                  </div>
                  <p className="text-sm text-green-700 mt-2">
                    Returns comprehensive team statistics for all 20 Premier League teams including goals scored/conceded, expected goals (xGF/xGA), points, and league position.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Live Team Metrics (from API)</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>✓ Goals scored per game (actual)</li>
                      <li>✓ Expected goals for (xGF) - LIVE</li>
                      <li>✓ Goals conceded per game (actual)</li>
                      <li>✓ Expected goals against (xGA) - LIVE</li>
                      <li>✓ Played games count</li>
                      <li>✓ Clean sheets & form</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2">Caching Strategy</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Cache duration: 5 minutes</li>
                      <li>• Updates after every match</li>
                      <li>• In-memory storage for speed</li>
                      <li>• Automatic refresh on invalidation</li>
                      <li>• No manual intervention required</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-yellow-50 p-3 rounded">
                  <strong className="text-yellow-900">Integration with Hybrid Formula:</strong>
                  <p className="text-sm text-yellow-800 mt-2">
                    The hybrid formula uses: (TeamAvgGoals + <strong>RealTeamxGF</strong> + OpponentAvgGC + <strong>RealOpponentxGA</strong>) × 0.25 × VenueFactor
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Where <strong>RealTeamxGF</strong> and <strong>RealOpponentxGA</strong> come directly from this API endpoint.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Bootstrap Static API */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Bootstrap Static API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Core FPL data containing all player information, team details, and current season statistics.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Player Data Fields</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Goals, assists, clean sheets</li>
                      <li>• Minutes played per game</li>
                      <li>• Penalty & corner taker order</li>
                      <li>• Current price & ownership</li>
                      <li>• Position & team assignment</li>
                      <li>• Form & ICT indices</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">API Details</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div className="font-mono bg-white p-2 rounded">GET /api/bootstrap-static</div>
                      <div className="mt-2">
                        <strong>Update Frequency:</strong> Real-time
                      </div>
                      <div><strong>Cache:</strong> 10 minutes (in-memory)</div>
                      <div><strong>Size:</strong> ~600KB compressed</div>
                      <div><strong>Players:</strong> 700+ active players</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fixtures API */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Fixtures API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Complete fixture schedule with match results, difficulty ratings, and team matchups for all gameweeks.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 p-3 rounded">
                    <h4 className="font-semibold text-purple-900 mb-2">Fixture Data</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Home vs Away teams</li>
                      <li>• Gameweek number</li>
                      <li>• Kickoff time</li>
                      <li>• Venue information</li>
                      <li>• Difficulty ratings (1-5)</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-semibold text-blue-900 mb-2">Usage</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Team goal projections</li>
                      <li>• Match predictions</li>
                      <li>• Venue factor application</li>
                      <li>• Context multipliers</li>
                      <li>• Fixture planning</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <h4 className="font-semibold text-green-900 mb-2">API Details</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <div className="font-mono bg-white p-1 rounded text-xs">GET /api/fixtures</div>
                      <div className="mt-1">Cache: 10 min</div>
                      <div>Coverage: All GWs</div>
                      <div>Real-time updates</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database-Cached Projections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-orange-600" />
                  Database-Cached Projections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Computed projections cached in PostgreSQL database for lightning-fast retrieval and consistent calculations.
                </p>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-3">Cached Tables & Endpoints</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded border">
                      <div className="font-mono text-xs text-orange-800">cached_player_total_points</div>
                      <div className="text-xs text-gray-600 mt-1">API: /api/cached/player-total-points</div>
                      <div className="text-xs text-gray-500">All-in-one points projection</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="font-mono text-xs text-orange-800">cached_team_goals</div>
                      <div className="text-xs text-gray-600 mt-1">API: /api/team-goal-projections</div>
                      <div className="text-xs text-gray-500">Hybrid team goals (10min cache)</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="font-mono text-xs text-orange-800">cached_player_save_points</div>
                      <div className="text-xs text-gray-600 mt-1">GK saves projection</div>
                      <div className="text-xs text-gray-500">Based on opponent shots</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="font-mono text-xs text-orange-800">cached_player_bonus_points</div>
                      <div className="text-xs text-gray-600 mt-1">Bonus points probability</div>
                      <div className="text-xs text-gray-500">BPS-based calculation</div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded text-sm">
                  <strong className="text-blue-900">Cache Strategy Benefits:</strong>
                  <ul className="list-disc ml-5 mt-2 text-blue-700">
                    <li>Sub-second response times for complex projections</li>
                    <li>Consistent calculations across all users</li>
                    <li>Reduced API load on FPL servers</li>
                    <li>Automatic refresh after gameweeks</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Historical Database */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-cyan-600" />
                  Historical Player Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Nine seasons of FPL history (2016/17 - 2024/25) with 2,800+ player records for trend analysis and projections.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-cyan-50 p-3 rounded">
                    <h4 className="font-semibold text-cyan-900 mb-2">Coverage</h4>
                    <ul className="text-sm text-cyan-700 space-y-1">
                      <li>• 9 complete seasons</li>
                      <li>• 2,800+ player records</li>
                      <li>• All positions covered</li>
                      <li>• Loan & transfer tracking</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-semibold text-blue-900 mb-2">Metrics</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Goals & assists</li>
                      <li>• Clean sheets</li>
                      <li>• Minutes & appearances</li>
                      <li>• Points & pricing</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <h4 className="font-semibold text-green-900 mb-2">Source</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <div className="font-mono bg-white p-1 rounded text-xs">FPL history_past</div>
                      <div className="mt-1">Official FPL API</div>
                      <div>100% authentic</div>
                      <div>Annual updates</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-6">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                <strong>Implementation Location:</strong> All configuration constants are defined in <code>server/projection-adjustments.ts</code> and used across projection services. These values have been calibrated based on historical FPL performance data.
              </AlertDescription>
            </Alert>

            {/* Venue Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-blue-600" />
                  Venue Factors (Updated)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Home/away adjustments applied to team goal projections, calibrated from 2024/25 season data.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Home Advantage</h4>
                    <div className="text-3xl font-bold text-blue-700">1.12×</div>
                    <p className="text-sm text-blue-600 mt-2">
                      12% boost to expected goals at home
                    </p>
                    <div className="bg-white p-2 rounded mt-3 text-sm font-mono">
                      const HOME_FACTOR = 1.12
                    </div>
                    <p className="text-xs text-blue-500 mt-2">
                      Previously: 1.16× (reduced for accuracy)
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-3">Away Penalty</h4>
                    <div className="text-3xl font-bold text-orange-700">0.84×</div>
                    <p className="text-sm text-orange-600 mt-2">
                      16% reduction to expected goals away
                    </p>
                    <div className="bg-white p-2 rounded mt-3 text-sm font-mono">
                      const AWAY_FACTOR = 0.84
                    </div>
                    <p className="text-xs text-orange-500 mt-2">
                      Mirrors home advantage (1.12 ÷ 1.12 = 0.84)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Position Caps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                  Position Caps (Enforced)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Maximum share limits by position to prevent unrealistic individual projections. Enforced via <code>enforcePositionCaps()</code> in projection-adjustments.ts.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-3">Goal Share Caps</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-white p-2 rounded">
                        <span className="text-sm">Goalkeeper (GK)</span>
                        <span className="font-bold text-green-700">2%</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 rounded">
                        <span className="text-sm">Defender (DEF)</span>
                        <span className="font-bold text-green-700">10%</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 rounded">
                        <span className="text-sm">Midfielder (MID)</span>
                        <span className="font-bold text-green-700">25%</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 rounded">
                        <span className="text-sm">Forward (FWD)</span>
                        <span className="font-bold text-green-700">30%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Assist Share Caps</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-white p-2 rounded">
                        <span className="text-sm">Goalkeeper (GK)</span>
                        <span className="font-bold text-blue-700">2%</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 rounded">
                        <span className="text-sm">Defender (DEF)</span>
                        <span className="font-bold text-blue-700">15%</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 rounded">
                        <span className="text-sm">Midfielder (MID)</span>
                        <span className="font-bold text-blue-700">30%</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 rounded">
                        <span className="text-sm">Forward (FWD)</span>
                        <span className="font-bold text-blue-700">25%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-3 rounded text-sm">
                  <strong className="text-yellow-900">Implementation Note:</strong>
                  <p className="text-yellow-800 mt-1">
                    Position caps are applied first, then excess is redistributed proportionally to uncapped players. This ensures team totals balance while preventing unrealistic individual shares.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Context Multipliers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  Context Multipliers (15+ Factors)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Situational adjustments applied to team goal projections based on match context and team form.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-3 rounded">
                    <h4 className="font-semibold text-green-900 mb-2">Form-Based</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Winning streak (3+): 1.06×</li>
                      <li>• Losing streak (3+): 0.91×</li>
                      <li>• Recent form: ±5%</li>
                      <li>• Momentum shifts</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-semibold text-blue-900 mb-2">Match Context</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Derby matches: 0.87×</li>
                      <li>• Top 6 clashes: 1.12×</li>
                      <li>• Season finale (GW37+): 1.05×</li>
                      <li>• European fixtures: 0.92×</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <h4 className="font-semibold text-purple-900 mb-2">Team-Specific</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• New manager bounce: 1.08×</li>
                      <li>• Relegation battle: 0.88×</li>
                      <li>• Title race: 1.04×</li>
                      <li>• Team news impact</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                  <div><strong>Implementation:</strong> server/team-goals-service.ts</div>
                  <div className="mt-2">function applyContextMultipliers(baseGoals, team, opponent, fixture)</div>
                </div>
              </CardContent>
            </Card>

            {/* Set Piece Adjustments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-cyan-600" />
                  Set Piece Adjustments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Bonus goals/assists for penalty takers and set piece specialists, applied after base projection calculations.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-cyan-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-cyan-900 mb-3">Penalty Takers (Goals)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Primary taker</span>
                        <span className="font-bold text-cyan-700">+0.6 to +0.8</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Secondary taker</span>
                        <span className="font-bold text-cyan-700">+0.3 to +0.5</span>
                      </div>
                      <p className="text-xs text-cyan-600 mt-2">
                        Scales with player's goals scored history
                      </p>
                      <div className="bg-white p-2 rounded text-xs font-mono mt-2">
                        adjustment = 0.6 + (goals × 0.03)<br/>
                        capped at 0.8 per gameweek
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Corner/FK Takers (Assists)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Primary taker</span>
                        <span className="font-bold text-blue-700">+0.8 to +1.2</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Secondary taker</span>
                        <span className="font-bold text-blue-700">+0.5 to +0.8</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        Scales with player's assists history
                      </p>
                      <div className="bg-white p-2 rounded text-xs font-mono mt-2">
                        adjustment = 0.8 + (assists × 0.04)<br/>
                        capped at 1.2 per gameweek
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-3 rounded text-sm">
                  <strong className="text-yellow-900">Data Source:</strong>
                  <p className="text-yellow-800 mt-1">
                    Set piece taker order comes from bootstrap-static API: <code>penalties_order</code> and <code>corners_and_indirect_freekicks_order</code> fields
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Clean Sheet Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-teal-600" />
                  Clean Sheet Probability Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Exponential decay formula parameters for calculating clean sheet probability from expected goals conceded.
                </p>
                
                <div className="bg-teal-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-teal-900 mb-3">Formula Parameters</h4>
                  <div className="bg-white p-3 rounded border font-mono text-sm">
                    CS% = 100 × e^(-1.1 × xGA)
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="text-sm">
                      <strong className="text-teal-900">Decay Rate:</strong>
                      <div className="text-teal-700">1.1 (Poisson constant)</div>
                    </div>
                    <div className="text-sm">
                      <strong className="text-teal-900">Base Multiplier:</strong>
                      <div className="text-teal-700">100 (percentage scale)</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-900 mb-2">Position Points Multipliers</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="bg-white p-2 rounded text-center">
                      <div className="font-bold text-green-700">GK: 4pts</div>
                    </div>
                    <div className="bg-white p-2 rounded text-center">
                      <div className="font-bold text-green-700">DEF: 4pts</div>
                    </div>
                    <div className="bg-white p-2 rounded text-center">
                      <div className="font-bold text-green-700">MID: 1pt</div>
                    </div>
                    <div className="bg-white p-2 rounded text-center">
                      <div className="font-bold text-green-700">FWD: 0pts</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mathematical Constants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-gray-600" />
                  Mathematical Constants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="font-semibold mb-2">Assist Ratio</h4>
                    <div className="text-2xl font-bold text-gray-700">0.72</div>
                    <p className="text-sm text-gray-600 mt-1">
                      TeamAssists = TeamGoals × 0.72
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Based on PL historical average (72% of goals have assists)
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="font-semibold mb-2">Hybrid Weight</h4>
                    <div className="text-2xl font-bold text-gray-700">0.25</div>
                    <p className="text-sm text-gray-600 mt-1">
                      Equal weight to 4 data sources
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      (AvgGoals + xGF + OpponentGC + OpponentxGA) × 0.25
                    </p>
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