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
            
            {/* Hero Alert - Major System Upgrade */}
            <Alert className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription>
                <strong className="text-lg">🎯 Season-Only Data with Set Piece Bonuses</strong>
                <p className="mt-2">
                  All projections use <strong>verified full season data only</strong> from the official FPL API - no estimations or last 6 games blending. Set piece specialists receive boosted shares based on official FPL set piece order data (penalties, direct free kicks, corners, indirect free kicks).
                </p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div className="bg-white/50 p-2 rounded">
                    <strong>Goal Share:</strong> Season + Penalty/Direct FK Bonus
                  </div>
                  <div className="bg-white/50 p-2 rounded">
                    <strong>Assist Share:</strong> Season + Corner/Indirect FK Bonus
                  </div>
                  <div className="bg-white/50 p-2 rounded">
                    <strong>All Stats:</strong> Season-only (Saves, Bonus, Cards)
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* System Architecture Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Projection System Architecture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-700 text-lg">
                  A comprehensive FPL projection engine that delivers <strong>mathematically balanced</strong> predictions for all 700+ Premier League players across 38 gameweeks, using a hybrid methodology that combines real team performance data with advanced statistical modeling.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">Player Projections</h3>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Individual player statistics for all FPL scoring components
                    </p>
                    <div className="space-y-1 text-xs text-blue-600">
                      <div>✓ Goals & Assists</div>
                      <div>✓ Clean Sheets & Saves</div>
                      <div>✓ Defensive Contributions</div>
                      <div>✓ Bonus Points & Cards</div>
                      <div>✓ Total Points (10 components)</div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-green-900">Team Projections</h3>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      Team-level forecasting for attack, defense, and standings
                    </p>
                    <div className="space-y-1 text-xs text-green-600">
                      <div>✓ Goals Scored (Hybrid)</div>
                      <div>✓ Goals Conceded</div>
                      <div>✓ Clean Sheets (Exponential)</div>
                      <div>✓ Match Predictions</div>
                      <div>✓ Projected Standings</div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-900">Real Data Sources</h3>
                    </div>
                    <p className="text-sm text-purple-700 mb-3">
                      100% authentic FPL API data with strategic caching
                    </p>
                    <div className="space-y-1 text-xs text-purple-600">
                      <div>✓ Current Standings API (xG)</div>
                      <div>✓ Bootstrap Static (Players)</div>
                      <div>✓ Fixtures API (Matches)</div>
                      <div>✓ Historical Database (9 yrs)</div>
                      <div>✓ PostgreSQL Cache</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Features & Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  Key Features & Capabilities
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
                      <div className="font-mono text-xs mb-2">
                        GoalShare = BaseShare + PenaltyBonus + DirectFKBonus
                      </div>
                      <ul className="space-y-1 text-blue-700">
                        <li>✓ <strong>Base:</strong> (Goals + xG) / TeamTotal × 100</li>
                        <li>✓ <strong>Penalty Bonus:</strong> Primary +0.8-1.5, Secondary +0.5-1.5</li>
                        <li>✓ <strong>Direct FK Bonus:</strong> Primary +0.3-0.4, Secondary +0.2-0.4</li>
                        <li>✓ No normalization (individual boost only)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      Assist Share with Set Piece Bonuses
                    </h4>
                    <div className="bg-green-50 p-3 rounded text-sm">
                      <div className="font-mono text-xs mb-2">
                        AssistShare = BaseShare + CornerBonus
                      </div>
                      <ul className="space-y-1 text-green-700">
                        <li>✓ <strong>Base:</strong> (Assists + xA) / TeamTotal × 100</li>
                        <li>✓ <strong>Corner/Indirect FK Bonus:</strong> Primary +0.8-1.2</li>
                        <li>✓ <strong>Secondary:</strong> +0.5-1.2, Tertiary +0.3-1.2</li>
                        <li>✓ No normalization (individual boost only)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      Season-Only Data Approach
                    </h4>
                    <div className="bg-purple-50 p-3 rounded text-sm">
                      <ul className="space-y-1 text-purple-700">
                        <li>✓ Based on verified full season FPL data</li>
                        <li>✓ No last 6 games blending (removed)</li>
                        <li>✓ Uses official FPL API set piece order fields</li>
                        <li>✓ Zero estimations - 100% real data</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-cyan-600" />
                      Clean Sheet Probability
                    </h4>
                    <div className="bg-cyan-50 p-3 rounded text-sm">
                      <div className="font-mono text-xs mb-2">
                        CS% = 100 × e^(-1.1 × xGA)
                      </div>
                      <ul className="space-y-1 text-cyan-700">
                        <li>✓ Exponential decay (Poisson-based)</li>
                        <li>✓ 0.5 xGA → 57% CS chance</li>
                        <li>✓ 1.0 xGA → 33% CS chance</li>
                        <li>✓ Position multipliers: GK/DEF 4pts, MID 1pt</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                  System Statistics & Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-blue-700">700+</div>
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
                    <div className="text-3xl font-bold text-cyan-700">99.975%</div>
                    <div className="text-sm text-cyan-600 mt-1">Balance Accuracy</div>
                    <div className="text-xs text-cyan-500 mt-1">0.29 goal variance</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-pink-700">2.8K+</div>
                    <div className="text-sm text-pink-600 mt-1">Historical Records</div>
                    <div className="text-xs text-pink-500 mt-1">9 seasons of data</div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-indigo-700">30min</div>
                    <div className="text-sm text-indigo-600 mt-1">Cache Duration</div>
                    <div className="text-xs text-indigo-500 mt-1">In-memory projection cache TTL</div>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-teal-700">15+</div>
                    <div className="text-sm text-teal-600 mt-1">Context Factors</div>
                    <div className="text-xs text-teal-500 mt-1">Form, derbies, etc.</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Major System Improvements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Major System Improvements (Recent Updates)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        ✅ Implemented Changes
                      </h4>
                      <ul className="space-y-2 text-sm text-green-700">
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">▪</span>
                          <span><strong>Hybrid Real Data Formula:</strong> Replaced synthetic base xG with live xGF/xGA from current standings API</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">▪</span>
                          <span><strong>Market Bounds Removed:</strong> No artificial 0.6-3.0 goal caps, projections flow freely based on performance</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">▪</span>
                          <span><strong>Updated Venue Factors:</strong> Home advantage 1.16×, Away disadvantage 0.84×</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">▪</span>
                          <span><strong>Pure Raw Share Calculation:</strong> Simple percentage of team output, no adjustments applied</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">▪</span>
                          <span><strong>Simplified System:</strong> Removed complexity for more transparent projections</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">▪</span>
                          <span><strong>Availability Applied Server-Side Only:</strong> All per-gameweek availability probability (0%/25%/50%/75%/100%) is now applied exclusively server-side in individual projection components. Frontend no longer re-applies availability multipliers, preventing double-application bugs.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">▪</span>
                          <span><strong>Blank Gameweek Handling:</strong> Averages (points per GW, value) now divide by non-blank gameweeks only - teams with postponed fixtures (e.g. MCI/CRY GW31) get accurate averages instead of deflated values.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        ❌ Removed/Deprecated
                      </h4>
                      <ul className="space-y-2 text-sm text-red-700">
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">▪</span>
                          <span><strong>Synthetic Base xG:</strong> Completely eliminated, replaced with real FPL xGF/xGA data</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">▪</span>
                          <span><strong>Market Bounds (0.6-3.0):</strong> Artificial limits removed, allowing authentic projection flow</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">▪</span>
                          <span><strong>Tier-based Multipliers:</strong> Static tier system replaced with dynamic real-time data</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">▪</span>
                          <span><strong>Estimated Team Strengths:</strong> Now uses actual performance data from current standings</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Impact Summary:</strong> The hybrid real data system provides more authentic projections that closely mirror actual FPL performance. 
                      All calculations now use exclusively real data from the official FPL API, ensuring projections are grounded in actual team and player performance rather than estimated values.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            {/* Quick Navigation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-gray-600" />
                  Documentation Navigation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-3 rounded border hover:border-blue-400 transition-colors cursor-pointer">
                    <h4 className="font-semibold text-sm mb-1">Logic Flow</h4>
                    <p className="text-xs text-gray-600">10-step calculation process</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border hover:border-blue-400 transition-colors cursor-pointer">
                    <h4 className="font-semibold text-sm mb-1">Algorithms</h4>
                    <p className="text-xs text-gray-600">5 core algorithms explained</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border hover:border-blue-400 transition-colors cursor-pointer">
                    <h4 className="font-semibold text-sm mb-1">Player Tools</h4>
                    <p className="text-xs text-gray-600">10 projection components</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border hover:border-blue-400 transition-colors cursor-pointer">
                    <h4 className="font-semibold text-sm mb-1">Team Tools</h4>
                    <p className="text-xs text-gray-600">6 team-level projections</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border hover:border-blue-400 transition-colors cursor-pointer">
                    <h4 className="font-semibold text-sm mb-1">Data Sources</h4>
                    <p className="text-xs text-gray-600">5 FPL API endpoints</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border hover:border-blue-400 transition-colors cursor-pointer">
                    <h4 className="font-semibold text-sm mb-1">Configuration</h4>
                    <p className="text-xs text-gray-600">All system parameters</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border hover:border-blue-400 transition-colors cursor-pointer">
                    <h4 className="font-semibold text-sm mb-1">Troubleshooting</h4>
                    <p className="text-xs text-gray-600">Common issues & solutions</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border hover:border-blue-400 transition-colors cursor-pointer">
                    <h4 className="font-semibold text-sm mb-1">Implementation</h4>
                    <p className="text-xs text-gray-600">Code locations & details</p>
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
                            <li>homeAdvantageMultiplier: 1.16</li>
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
                          <strong>Season-Only Hybrid Formula:</strong><br/>
                          BaseGoals = (TeamAvgGoals + TeamxGF + OpponentAvgGC + OpponentxGA) × 0.25<br/>
                          <strong>TeamGoals = BaseGoals × VenueFactor × ContextMultipliers</strong>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Season Data (Full Season Only):</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Team average goals scored per game</li>
                              <li>Team xGF from current standings</li>
                              <li>Opponent average goals conceded</li>
                              <li>Opponent xGA from current standings</li>
                            </ul>
                            <strong className="mt-2 block">Venue Factors:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Home: 1.16× multiplier</li>
                              <li>Away: 0.84× multiplier</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Context Multipliers:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Team form (last 5 games)</li>
                              <li>Derby matches: 0.87×</li>
                              <li>Top 6 battles: 1.12×</li>
                              <li>Season finale (GW37+): 1.05×</li>
                            </ul>
                            <strong className="mt-2 block">Output:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Used for: Player goal projections</li>
                              <li>Used for: Team assists (85% of goals)</li>
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
                              <li>Venue factor (1.16/0.84)</li>
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
                          TeamAssists = TeamGoals × 0.85
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Inputs:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Team goals scored (from Step 2)</li>
                              <li>Assist ratio: 0.85 (85% of goals have assists in FPL)</li>
                              <li>Simple multiplication - no additional factors</li>
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
                          <strong>Season-Only Goal Share Formula:</strong><br/>
                          GoalShare = BaseSeasonShare + PenaltyBonus + DirectFKBonus<br/>
                          <strong>PlayerGoals = HybridTeamGoals × GoalShare / 100</strong>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Season-Only Share:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Full season goals + xG as base</li>
                              <li>Penalty taker bonus (+0.8-1.5)</li>
                              <li>Direct FK taker bonus (+0.3-0.4)</li>
                              <li>No position caps - pure raw share %</li>
                            </ul>
                          </div>
                          <div>
                            <strong>No Normalization:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Set piece takers get pure bonus</li>
                              <li>Other players unaffected by bonuses</li>
                              <li>100% verified FPL API data</li>
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
                          <strong>Season-Only Assist Share Formula:</strong><br/>
                          AssistShare = BaseSeasonShare + CornerBonus<br/>
                          <strong>PlayerAssists = TeamAssists × AssistShare / 100</strong>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Season-Only Share:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Full season assists + xA as base</li>
                              <li>Corner taker bonus (+0.8-1.2)</li>
                              <li>Indirect FK taker bonus included</li>
                              <li>No position caps - raw contribution %</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Set Piece Separation:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>Goals: Penalties + Direct FKs</li>
                              <li>Assists: Corners + Indirect FKs</li>
                              <li>Based on corners_and_indirect_freekicks_order</li>
                              <li>No normalization applied</li>
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
                          <strong>DC Calculation:</strong><br/>
                          DEF: DC = CBI + Tackles<br/>
                          MID/FWD: DC = CBI + Tackles + Recoveries<br/><br/>
                          <strong>DC Points Formula (Probability-Based):</strong><br/>
                          DCPoints = MIN( (% Chance of Hitting Threshold) × (Opponent DCC / 80) × 2, 2 )
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Inputs:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>% Chance of Hitting Threshold (historical)</li>
                              <li>Opponent DCC per game</li>
                              <li>Player position (for threshold)</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Thresholds (for % calculation):</strong>
                            <ul className="list-disc ml-5 mt-1">
                              <li>DEF: 10+ DC required</li>
                              <li>MID/FWD: 12+ DC required</li>
                              <li>Max points capped at 2</li>
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
                          <strong>10-Component Formula:</strong><br/>
                          TotalPoints = GoalPoints + AssistPoints + CSPoints + MinutesPoints + SavesPoints + BonusPoints + DCPoints + GoalsConcededPoints + YellowCardPoints + RedCardPoints
                        </div>
                        <div className="text-sm">
                          <strong>Real Data Compilation:</strong>
                          <ul className="list-disc ml-5 mt-2 space-y-1">
                            <li>Goal points: HybridPlayerGoals × position multiplier (DEF: 6pts, MID: 5pts, FWD: 4pts)</li>
                            <li>Assist points: HybridPlayerAssists × 3 points</li>
                            <li>Clean sheet points: From Step 8 (based on hybrid goals conceded)</li>
                            <li>Defensive contribution points: From Step 9 (unchanged)</li>
                            <li>Minutes points: 2pts for 60+ min probability + 1pt for sub-60 min probability</li>
                            <li>Saves points: GK only, Poisson-based from blended saves/game (60% season avg + 40% saves_per_90) × (opponent AGR / 1.35)</li>
                            <li>Bonus points: Historical bonus-per-start rate × mild fixture difficulty adjustment (0.85-1.15)</li>
                            <li>Yellow cards: Blended rate (60% player season rate + 40% position baseline) × opponent difficulty (±20%) × -1pt | Red cards: Blended rate (50/50) × -3pts | Goals conceded: -floor(projected GC / 2) for GK/DEF</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pure Raw Share System */}
                  <div className="border-2 border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">✓</div>
                      <h3 className="text-lg font-semibold">Pure Raw Share Calculation</h3>
                    </div>
                    <div className="bg-amber-50 p-4 rounded">
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border">
                          <strong>Simple Share Formula:</strong>
                          <div className="font-mono text-sm mt-2 space-y-1">
                            <div>1. Calculate raw contribution for all players (goals + xG)</div>
                            <div>2. Calculate player share as % of team total</div>
                            <div>3. GoalShare = (PlayerGoals + PlayerXG) / TeamTotal × 100</div>
                          </div>
                        </div>
                        <div className="text-sm">
                          <strong>System Characteristics:</strong>
                          <ul className="list-disc ml-5 mt-2">
                            <li>Pure percentage calculation - no artificial adjustments</li>
                            <li>No position caps or limits applied</li>
                            <li>All projections from real FPL performance data</li>
                            <li>Season-only data with set piece bonuses</li>
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
                      <div className="ml-4">venueFactor = isHome ? 1.16 : 0.84</div>
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

              {/* Algorithm 2: Goal Share with Set Piece Bonuses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-orange-600" />
                    2. Goal Share with Set Piece Bonuses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-3">Implementation (server/routes.ts - buildGoalShareResponse)</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-2">
                      <div className="text-blue-600">function</div> <div>buildGoalShareResponse(player, teamTotal):</div>
                      <div className="ml-4">// Base goal share from season data</div>
                      <div className="ml-4">baseShare = (player.goals + player.xG) / teamTotal × 100</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Penalty taker bonus (penalties_order)</div>
                      <div className="ml-4">if penaltyOrder === 1: bonus = 0.8 + goals × 0.04 (cap 1.5)</div>
                      <div className="ml-4">if penaltyOrder === 2: bonus = 0.5 + goals × 0.03 (cap 1.5)</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Direct freekick bonus (direct_freekicks_order)</div>
                      <div className="ml-4">if fkOrder === 1: bonus = 0.3 + goals × 0.02 (cap 0.4)</div>
                      <div className="ml-4">if fkOrder === 2: bonus = 0.2 + goals × 0.015 (cap 0.4)</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">goalShare = baseShare + penaltyBonus + freekickBonus</div>
                      <div className="ml-4"><span className="text-green-600">return</span> goalShare</div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <strong className="text-green-900">Key Principles:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-green-800">
                        <strong>No Normalization:</strong> Bonuses boost individuals without reducing others
                      </div>
                      <div className="text-green-800">
                        <strong>FPL API Fields:</strong> penalties_order, direct_freekicks_order
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Algorithm 3: Assist Share with Set Piece Bonuses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-purple-600" />
                    3. Assist Share with Set Piece Bonuses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-3">Implementation (server/routes.ts - /api/assist-share-season)</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-2">
                      <div className="text-blue-600">function</div> <div>calculateAssistShare(player, teamTotal):</div>
                      <div className="ml-4">// Base assist share from season data</div>
                      <div className="ml-4">baseShare = (player.assists + player.xA) / teamTotal × 100</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Corner/indirect freekick bonus (corners_and_indirect_freekicks_order)</div>
                      <div className="ml-4">if cornerOrder === 1: bonus = 0.8 + assists × 0.04 (cap 1.2)</div>
                      <div className="ml-4">if cornerOrder === 2: bonus = 0.5 + assists × 0.03 (cap 1.2)</div>
                      <div className="ml-4">if cornerOrder === 3: bonus = 0.3 + assists × 0.02 (cap 1.2)</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">assistShare = baseShare + cornerBonus</div>
                      <div className="ml-4"><span className="text-green-600">return</span> assistShare</div>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Set Piece Separation Logic</h4>
                    <ul className="list-disc ml-5 text-blue-800 space-y-1">
                      <li><strong>Goal Share:</strong> Penalties + Direct FKs (scoring opportunities)</li>
                      <li><strong>Assist Share:</strong> Corners + Indirect FKs (chance creation)</li>
                      <li>No normalization - set piece takers get pure bonus</li>
                      <li>Uses official FPL API corners_and_indirect_freekicks_order field</li>
                    </ul>
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
                      <div className="ml-4">pct60Plus = player.gamesHit60Plus / player.appearances × 100</div>
                      <div className="ml-4">playerCSPoints = (cleanSheetProbability / 100) × (pct60Plus / 100) × positionPoints</div>
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

              {/* Algorithm 5: Season-Only with Set Piece Bonuses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-amber-600" />
                    5. Season-Only Data with Set Piece Bonuses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-amber-900 mb-3">Season-Only Share Calculation</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-2">
                      <div className="text-blue-600">function</div> <div>calculateShareWithBonus(playerId, type):</div>
                      <div className="ml-4">// Source: Full season performance only</div>
                      <div className="ml-4">seasonData = getSeasonStats(playerId)</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Calculate base share from season data</div>
                      <div className="ml-4">baseShare = (seasonData.stats + seasonData.xStats) / teamTotal × 100</div>
                      <div className="ml-4"></div>
                      <div className="ml-4">// Add set piece bonus (no normalization)</div>
                      <div className="ml-4">setPieceBonus = calculateSetPieceBonus(playerId, type)</div>
                      <div className="ml-4">finalShare = baseShare + setPieceBonus</div>
                      <div className="ml-4"></div>
                      <div className="ml-4"><span className="text-green-600">return</span> finalShare</div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <strong className="text-green-900">Benefits:</strong>
                    <div className="mt-2 text-green-800">
                      100% verified FPL API season data - zero estimations<br/>
                      Set piece specialists receive boosted shares without affecting others
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
                    Individual player goal projections using hybrid team goals and season goal share, adjusted by a mild form multiplier based on current FPL form vs position average.
                  </p>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">PlayerGoals = HybridTeamGoals × (GoalShare / 100) × Availability × FormMultiplier</code><br/>
                    <code className="text-xs">GoalShare = BaseShare + PenaltyBonus + DirectFKBonus</code><br/>
                    <code className="text-xs">FormFactor = clamp(0.75, 1.25, player.form / positionAvgForm)</code><br/>
                    <code className="text-xs">FormMultiplier = 0.75 + 0.25 × FormFactor  (range: ~0.94–1.06)</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Form Multiplier:</strong> Conservative adjustment anchored at position average — a player at average form = 1.0× (no change). Max effect ±12.5% from season share baseline.</div>
                    <div><strong>Set Piece Bonuses (No Normalization):</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Penalty taker (penalties_order=1): +0.8 to +1.5</li>
                      <li>Direct FK taker (direct_freekicks_order=1): +0.3 to +0.4</li>
                    </ul>
                    <div><strong>Points Calculation:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>GK/DEF: Goals × 6 points</li>
                      <li>MID: Goals × 5 points</li>
                      <li>FWD: Goals × 4 points</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/goal-share-season</div>
                    <div>Data Source: Season goals + xG + set piece order + FPL form</div>
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
                    Assist projections based on team creativity and season assist share with set piece bonuses, adjusted by a mild form multiplier.
                  </p>
                  <div className="bg-blue-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">PlayerAssists = TeamAssists × (AssistShare / 100) × Availability × FormMultiplier</code><br/>
                    <code className="text-xs">AssistShare = BaseShare + CornerBonus</code><br/>
                    <code className="text-xs">FormFactor = clamp(0.75, 1.25, player.form / positionAvgForm)</code><br/>
                    <code className="text-xs">FormMultiplier = 0.75 + 0.25 × FormFactor  (range: ~0.94–1.06)</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Form Multiplier:</strong> Same as goals — conservative ±12.5% max adjustment vs position peers. Players at average form are unaffected.</div>
                    <div><strong>Set Piece Bonuses (No Normalization):</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Corner taker (corners_and_indirect_freekicks_order=1): +0.8 to +1.2</li>
                      <li>Secondary (order=2): +0.5 to +1.2</li>
                      <li>Tertiary (order=3): +0.3 to +1.2</li>
                    </ul>
                    <div><strong>Assist Ratio:</strong> Per-team ratio from actual season data (clamped 0.50–1.00), replacing fixed 0.85</div>
                    <div><strong>Points:</strong> Each assist = 3 points</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/assist-share-season</div>
                    <div>Data: Season assists + xA + corner order + FPL form</div>
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
                    Expected minutes per game based on actual game-by-game history with 60-minute threshold probability.
                  </p>
                  <div className="bg-purple-50 p-3 rounded text-sm">
                    <strong>Formulas:</strong><br/>
                    <code className="text-xs">ExpectedMinutes = CurrentMinutes / PlayerAppearances</code><br/>
                    <code className="text-xs">pct60Plus = (Games with 60+ mins / Appearances) × 100</code><br/>
                    <code className="text-xs">pctBelow60 = (Games with 1-59 mins / Appearances) × 100</code>
                  </div>
                  <div className="bg-purple-100 p-3 rounded text-sm mt-2">
                    <strong>Minutes Points Formula:</strong><br/>
                    <code className="text-xs">MinutesPoints = (2 × pct60Plus/100) + (1 × pctBelow60/100)</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Calculation:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Fetches actual game-by-game history for each player</li>
                      <li>Counts appearances (games with any minutes)</li>
                      <li>Calculates % of games hitting 60+ minutes threshold</li>
                    </ul>
                    <div><strong>FPL Points Rules:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>1-59 minutes: 1 point</li>
                      <li>60+ minutes: 2 points</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/player-minutes-projections</div>
                    <div>Data: FPL element-summary game history</div>
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
                    <strong>Team CS Formula:</strong><br/>
                    <code className="text-xs">CS% = 100 × e^(-1.1 × GoalsConceded)</code>
                  </div>
                  <div className="bg-teal-100 p-3 rounded text-sm mt-2">
                    <strong>Player CS Points Formula:</strong><br/>
                    <code className="text-xs">CSPoints = (Team CS%) × (% chance of 60+ mins) × PositionPoints</code><br/>
                    <div className="text-xs mt-1 text-teal-700">
                      • pct60Plus: Actual % of games where player reached 60+ mins<br/>
                      • Requires 60+ minutes for clean sheet points in FPL
                    </div>
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
                    <strong>DC Calculation (Season):</strong><br/>
                    <code className="text-xs">DEF: DC = CBI + Tackles</code><br/>
                    <code className="text-xs">MID/FWD: DC = CBI + Tackles + Recoveries</code><br/>
                    <code className="text-xs">DC/game = Season DC ÷ Games with minutes</code>
                  </div>
                  <div className="bg-red-100 p-3 rounded text-sm mt-2">
                    <strong>Projected DC Formula:</strong><br/>
                    <code className="text-xs">Projected DC = ((Current DC/game + Threshold) / 2) × (Opponent DCC / 80) × (Avg Minutes / 90)</code><br/>
                    <div className="text-xs mt-1 text-red-700">
                      • Threshold: 10 for DEF, 12 for MID/FWD<br/>
                      • Opponent DCC: Defensive Contributions Conceded per game<br/>
                      • Baseline DCC: 80 (league average reference)
                    </div>
                  </div>
                  <div className="bg-gray-100 p-3 rounded text-sm mt-2">
                    <strong>DC Points (Probability-Based):</strong><br/>
                    <code className="text-xs">DCPoints = MIN( (% Chance of Hitting Threshold) × (Opponent DCC / 80) × 2, 2 )</code><br/>
                    <div className="text-xs mt-1 text-gray-700">
                      • % Chance: Historical rate of hitting threshold (games hit / total games)<br/>
                      • Opponent DCC: Opponent's Defensive Contributions Conceded per game<br/>
                      • Maximum: Capped at 2 points per gameweek
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Thresholds (for % calculation):</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Defenders: 10+ DC threshold</li>
                      <li>Midfielders: 12+ DC threshold</li>
                      <li>Forwards: 12+ DC threshold</li>
                      <li>Goalkeepers: 0 points (DC not applicable)</li>
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
                    Goalkeeper save projections blending season average with recent saves_per_90, adjusted by opponent attacking threat.
                  </p>
                  <div className="bg-cyan-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">BlendedSavesPerGame = 0.60 × SeasonAvg + 0.40 × saves_per_90</code><br/>
                    <code className="text-xs">ExpectedSaves = BlendedSavesPerGame × (OpponentAGR / 1.35) × Availability</code><br/>
                    <code className="text-xs">AGR = 0.5 × (GF + XGF) / GamesPlayed</code><br/>
                    <code className="text-xs">SavePoints = Poisson probability-based (thresholds: 3/6/9/12 saves)</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Calculation Details:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>60% weight on full season saves per game (stability)</li>
                      <li>40% weight on saves_per_90 from FPL API (recency)</li>
                      <li>Falls back to season avg if saves_per_90 is missing/zero</li>
                      <li>Opponent AGR scales saves up/down (harder attack = more saves)</li>
                      <li>1.35 is league-average AGR normalizer</li>
                      <li>Points via Poisson CDF: 1pt at 3+ saves, +1pt per additional 3</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/player-saves-projections</div>
                    <div>Data: Bootstrap static + fixtures + current standings + saves_per_90</div>
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
                    <code className="text-xs">GC per GW = Team Goals Against Projection (mirror of opponent's team goals scored)</code><br/>
                    <code className="text-xs">GCPoints = -floor(GC / 2) for GK/DEF only</code>
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
                    Yellow card projections using a position-weighted blended rate scaled by opponent attacking strength.
                  </p>
                  <div className="bg-yellow-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">PlayerRate = SeasonYellowCards / GamesPlayed</code><br/>
                    <code className="text-xs">PositionBaseline = GKP: 0.020 | DEF: 0.070 | MID: 0.090 | FWD: 0.050 per game</code><br/>
                    <code className="text-xs">BlendedRate = 0.60 × PlayerRate + 0.40 × PositionBaseline</code><br/>
                    <code className="text-xs">OpponentMult = clamp(0.85, 1.20, 1 + 0.25 × (OpponentAGR / LeagueAvgAGR - 1))</code><br/>
                    <code className="text-xs">ExpectedYC = BlendedRate × OpponentMult × Availability</code><br/>
                    <code className="text-xs">YCPoints = ExpectedYC × -1</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Calculation Details:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>60% player season rate + 40% position baseline prevents zero-YC players from projecting 0 risk</li>
                      <li>Position baseline anchors GKPs lower (~0.02/game) and MIDs higher (~0.09/game)</li>
                      <li>Opponent multiplier: tougher attack (higher AGR) = more defensive pressure = up to +20% more cards</li>
                      <li>Opponent multiplier clamped to 0.85–1.20 range</li>
                    </ul>
                    <div><strong>Points:</strong> Each yellow card = -1 point</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/player-yellow-cards-projections</div>
                    <div>Data: Season yellow card totals + fixtures + opponent AGR</div>
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
                    Red card projections using a 50/50 blend of player season rate and position baseline — personal red card rate is too noisy to use alone.
                  </p>
                  <div className="bg-red-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">PlayerRate = SeasonRedCards / GamesPlayed</code><br/>
                    <code className="text-xs">PositionBaseline = GKP: 0.005 | DEF: 0.012 | MID: 0.008 | FWD: 0.007 per game</code><br/>
                    <code className="text-xs">BlendedRate = 0.50 × PlayerRate + 0.50 × PositionBaseline</code><br/>
                    <code className="text-xs">ExpectedRC = BlendedRate × Availability</code><br/>
                    <code className="text-xs">RCPoints = ExpectedRC × -3</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Calculation Details:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>50% position baseline (higher than YC) because most players have 0 RCs this season</li>
                      <li>All GKPs carry a small baseline risk (~0.005/game) rather than projecting exactly 0</li>
                      <li>DEFs project slightly higher than MIDs and FWDs from baseline</li>
                      <li>No opponent multiplier — red cards are more impulsive and less correlated with opponent strength</li>
                    </ul>
                    <div><strong>Points:</strong> Each red card = -3 points</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/player-red-cards-projections</div>
                    <div>Data: Season red card totals + position baseline blending</div>
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
                    Bonus point projections based on historical bonus-per-start rate with fixture difficulty adjustment.
                  </p>
                  <div className="bg-amber-50 p-3 rounded text-sm">
                    <strong>Formula:</strong><br/>
                    <code className="text-xs">BonusPerStart = SeasonBonus / PlayerStarts  (fallback: SeasonBonus / TeamFixturesPlayed)</code><br/>
                    <code className="text-xs">GWBonus = BonusPerStart × DifficultyFactor(0.85-1.15) × Availability</code>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><strong>Calculation Details:</strong></div>
                    <ul className="list-disc ml-5 text-xs">
                      <li>Per-start rate (not per-team-game) correctly reflects rotation players' actual bonus earning frequency</li>
                      <li>Example: 8 bonus in 15 starts = 0.53/start, vs misleading 0.30/game if divided by team fixtures played</li>
                      <li>Falls back to per-team-game if player has 0 recorded starts</li>
                      <li>Mild difficulty adjustment (harder opponents = 0.85×, easier opponents = 1.15×) based on opponent strength rating</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>API: /api/player-bonus-points-projections</div>
                    <div>Data: Season bonus totals + player starts + fixture difficulty ratings</div>
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
                        <li>• Home advantage: 1.16×</li>
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
                      TeamAssists = TeamGoals × 0.85
                    </div>
                    <p className="text-sm text-blue-800">
                      Based on historical Premier League data showing that approximately 85% of goals have an associated assist. This ratio is consistent across teams and seasons.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-semibold text-green-900 mb-2">Calculation Flow</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>1. Calculate team goals (hybrid formula)</li>
                        <li>2. Multiply by 0.85 for assist total</li>
                        <li>3. Distribute to players by assist share %</li>
                        <li>4. Add set piece bonuses (corners)</li>
                        <li>5. No normalization applied</li>
                      </ul>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-semibold text-purple-900 mb-2">Season-Only Share System</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• No position caps applied</li>
                        <li>• Direct percentage of team output</li>
                        <li>• Based on full season data only</li>
                        <li>• Set piece bonuses for corner takers</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-3 rounded">
                    <h4 className="font-semibold text-orange-900 mb-2">Data Sources</h4>
                    <p className="text-sm text-orange-800 mb-2">
                      Assist share calculated from real FPL performance data:
                    </p>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Player actual assists this season</li>
                      <li>• Player expected assists (xA)</li>
                      <li>• Team total assists and xA</li>
                      <li>• Season-only data - no blending</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                    <div><strong>API:</strong> /api/team-assist-projections</div>
                    <div><strong>Module:</strong> server/routes.ts</div>
                    <div><strong>Input:</strong> Team goal projections × 0.85</div>
                    <div><strong>Method:</strong> Pure raw share calculation</div>
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
                      Goals conceded is simply the opponent's expected goals scored, calculated using the same hybrid formula but from the defensive perspective. Venue factors are inverted (home team defends better at 1.16×, worse away at 0.84×).
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
                    Individual player goal projections calculated by distributing team goals based on raw share percentage with set piece bonuses.
                  </p>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2">Player Goal Share Formula</h4>
                    <div className="bg-white p-3 rounded border font-mono text-sm mb-3">
                      PlayerGoals = TeamGoals × (GoalShare / 100)
                    </div>
                    <p className="text-sm text-orange-800">
                      Each player's goal projection is their raw share of the team's total expected goals. GoalShare includes set piece bonuses (penalties, direct FKs) added to the base season share.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-semibold text-blue-900 mb-2">Pure Raw Share Formula</h4>
                      <div className="bg-white p-2 rounded border mb-2 font-mono text-xs">
                        GoalShare = (PlayerGoals + PlayerXG) / TeamTotal × 100
                      </div>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• No position caps applied</li>
                        <li>• Direct percentage calculation</li>
                        <li>• No artificial adjustments</li>
                        <li>• Pure historical contribution</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-semibold text-green-900 mb-2">Share Calculation Process</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>1. Calculate goals scored + expected goals</li>
                        <li>2. Sum totals for all team players</li>
                        <li>3. Calculate player share as % of team</li>
                        <li>4. Add set piece bonuses (penalties, direct FKs)</li>
                        <li>5. Apply to projected team goals</li>
                        <li>6. No normalization applied</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-3 rounded">
                    <h4 className="font-semibold text-purple-900 mb-2">Data Sources</h4>
                    <p className="text-sm text-purple-800 mb-2">
                      Goal share calculated from real FPL performance data:
                    </p>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Player actual goals scored (full season)</li>
                      <li>• Player expected goals (xG) from FPL API</li>
                      <li>• Set piece order (penalties_order, direct_freekicks_order)</li>
                      <li>• Season-only data - no last 6 blending</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                    <div><strong>API:</strong> /api/goal-share</div>
                    <div><strong>Module:</strong> server/routes.ts</div>
                    <div><strong>Function:</strong> buildGoalShareResponse()</div>
                    <div><strong>Input:</strong> Team goals + player goals + player xG</div>
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Player Data Fields</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Goals, assists, clean sheets</li>
                      <li>• Minutes played per game</li>
                      <li>• Expected goals (xG) & assists (xA)</li>
                      <li>• Current price & ownership</li>
                      <li>• Position & team assignment</li>
                      <li>• Form & ICT indices</li>
                    </ul>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2">Set Piece Order Fields</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• <strong>penalties_order</strong> (1-3)</li>
                      <li>• <strong>direct_freekicks_order</strong> (1-3)</li>
                      <li>• <strong>corners_and_indirect_freekicks_order</strong> (1-3)</li>
                      <li className="mt-2 text-xs">Used for goal share bonuses (penalties, direct FKs)</li>
                      <li className="text-xs">Used for assist share bonuses (corners, indirect FKs)</li>
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
                    <div className="text-3xl font-bold text-blue-700">1.16×</div>
                    <p className="text-sm text-blue-600 mt-2">
                      16% boost to expected goals at home
                    </p>
                    <div className="bg-white p-2 rounded mt-3 text-sm font-mono">
                      const HOME_FACTOR = 1.16
                    </div>
                    <p className="text-xs text-blue-500 mt-2">
                      Standard Premier League home advantage
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
                      Mirrors home advantage (inverse relationship)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Raw Share Calculation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                  Raw Share Calculation (No Caps)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Goal and assist shares are calculated using pure raw percentages without position caps or any artificial adjustments. Share = (PlayerGoals + PlayerXG) / TeamTotal × 100.
                </p>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3">No Position Caps Applied</h4>
                  <p className="text-sm text-green-800">
                    No position caps are applied to goal or assist shares. Pure raw share percentage is used directly based on each player's historical contribution (goals + xG or assists + xA) as a percentage of team total.
                  </p>
                </div>

                <div className="bg-yellow-50 p-3 rounded text-sm">
                  <strong className="text-yellow-900">Implementation Note:</strong>
                  <p className="text-yellow-800 mt-1">
                    Raw share calculation uses actual performance data (goals + xG) without any artificial caps, adjustments, or modifiers. Pure percentage based on historical contribution.
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

            {/* Data Blending Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-cyan-600" />
                  Season-Only Data Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  All projections use verified full season data only from the official FPL API - no estimations or blending with recent games.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-cyan-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-cyan-900 mb-3">Season-Only Data</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Data Source</span>
                        <span className="font-bold text-cyan-700">Full Season Only</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Approach</span>
                        <span className="font-bold text-cyan-700">100% Verified FPL API</span>
                      </div>
                      <p className="text-xs text-cyan-600 mt-2">
                        No last 6 games blending - zero estimations
                      </p>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3">Set Piece Bonuses</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Goal Share</span>
                        <span className="font-bold text-blue-700">Penalty + Direct FK</span>
                      </div>
                      <div className="bg-white p-2 rounded flex justify-between">
                        <span>Assist Share</span>
                        <span className="font-bold text-blue-700">Corner + Indirect FK</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        No normalization - individual boost only
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-3 rounded text-sm">
                  <strong className="text-yellow-900">Applied To:</strong>
                  <p className="text-yellow-800 mt-1">
                    Goals, assists, clean sheets, saves, defensive contributions, bonus points, and all player projections
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
                    <div className="text-2xl font-bold text-gray-700">0.85</div>
                    <p className="text-sm text-gray-600 mt-1">
                      TeamAssists = TeamGoals × 0.85
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Based on FPL's generous assist rules (85% of goals have assists)
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
                          <li>Share percentages not summing to 100% for team</li>
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