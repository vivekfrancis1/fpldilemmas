import { Book, Target, Users, Shield, Clock, TrendingUp, Database, Calculator, Info, ExternalLink, GitBranch, Zap, Trophy, BarChart3, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProjectionDocumentation() {
  return (
    <div className="fpl-page-container">
      {/* Unified Page Header */}
      <div className="fpl-page-header">
        <div className="fpl-page-title">
          <Book className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          Projection Documentation
        </div>
        <p className="fpl-page-subtitle">
          Comprehensive guide to all projection tools, methodologies, and data sources
        </p>
      </div>

      <div className="fpl-section-spacing">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="player-tools">Player Tools</TabsTrigger>
            <TabsTrigger value="team-tools">Team Tools</TabsTrigger>
            <TabsTrigger value="methodology">Methodology</TabsTrigger>
            <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Projection System Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  FPL Dilemmas employs a comprehensive projection engine that combines historical data analysis, 
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
                    <h3 className="font-semibold text-purple-900 mb-2">Hybrid Methodology</h3>
                    <p className="text-sm text-purple-700">
                      Uses actual data for completed gameweeks and projections for future gameweeks
                    </p>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    All projections are updated regularly and use authentic data from the official FPL API. 
                    The system employs a deterministic approach ensuring consistent results.
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
                      <h4 className="font-semibold mb-2">Hybrid Calculation</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Actual FPL data for completed gameweeks</li>
                        <li>• Mixed data for ongoing gameweeks</li>
                        <li>• Projections for future gameweeks</li>
                        <li>• Real-time data integration</li>
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
                    Comprehensive FPL points projection combining all scoring components with gameweek-by-gameweek breakdown.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Goals Points</Badge>
                    <Badge variant="outline">Assists Points</Badge>
                    <Badge variant="outline">Clean Sheet Points</Badge>
                    <Badge variant="outline">Defensive Contribution Points</Badge>
                    <Badge variant="outline">Saves Points (GK)</Badge>
                    <Badge variant="outline">Bonus Points</Badge>
                    <Badge variant="outline">Minutes Points</Badge>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Uses hybrid methodology with actual FPL data for completed gameweeks and projection tools for future gameweeks. Applies authentic FPL scoring rules including position-specific bonuses.
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
                    Individual player goal projections using fixture-level analysis and penalty taker adjustments.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Fixture Analysis</Badge>
                    <Badge variant="outline">Goal Share Calculation</Badge>
                    <Badge variant="outline">Penalty Adjustments</Badge>
                    <Badge variant="outline">Team Multipliers</Badge>
                  </div>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Uses team goal projections × individual goal share percentage. Includes penalty taker bonuses and applies position-specific caps (GK: 2%, DEF: 25%, MID: 35%, FWD: 35%).
                  </div>
                </CardContent>
              </Card>

              {/* Player Assist Projections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Player Assist Projections
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Expected assists projections with minutes weighting and historical share analysis.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Assist Share Analysis</Badge>
                    <Badge variant="outline">Minutes Weighting</Badge>
                    <Badge variant="outline">Historical Trends</Badge>
                    <Badge variant="outline">Position Caps</Badge>
                  </div>
                  <div className="bg-blue-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Team assist projections × player assist share with minutes factoring. Position caps: GK (2%), DEF (25%), MID (35%), FWD (25%). Prevents backup players from inflating rankings.
                  </div>
                </CardContent>
              </Card>

              {/* Player Minutes Projections */}
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
                </CardContent>
              </Card>

              {/* Player Clean Sheet Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-cyan-600" />
                    Clean Sheet Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Clean sheet probability × minutes probability × position-specific FPL points.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Team CS Probability</Badge>
                    <Badge variant="outline">60+ Minutes Chance</Badge>
                    <Badge variant="outline">Position Points</Badge>
                    <Badge variant="outline">Fixture Difficulty</Badge>
                  </div>
                  <div className="bg-cyan-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Team clean sheet odds × player 60+ minutes probability. Points: GK/DEF = 4pts, MID = 1pt, FWD = 0pts. Uses exponential decay formula for clean sheet calculation.
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
                    Advanced team-level goal forecasting using 8-phase analysis and statistical modeling.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Attack Tier System</Badge>
                    <Badge variant="outline">Home/Away Factors</Badge>
                    <Badge variant="outline">Fixture Difficulty</Badge>
                    <Badge variant="outline">Context Multipliers</Badge>
                  </div>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Base xG per team (1.5) × attack multiplier × defense multiplier × home/away factor × context multipliers. Attack tiers: Elite (1.35), Strong (1.15), Average (1.00), Weak (0.85).
                  </div>
                </CardContent>
              </Card>

              {/* Team Goals Against */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    Team Goals Against
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Defensive analysis forecasting goals conceded by each team with opponent strength factoring.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Defense Tier System</Badge>
                    <Badge variant="outline">Opponent Analysis</Badge>
                    <Badge variant="outline">Venue Impact</Badge>
                    <Badge variant="outline">Form Weighting</Badge>
                  </div>
                  <div className="bg-red-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Opponent's attacking strength × team's defensive multiplier × venue factor. Defense tiers: Elite (0.7), Strong (0.85), Average (1.0), Weak (1.15), Promoted (1.3).
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
                    Clean sheet probability calculations using exponential decay formula and expected goals against.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Exponential Decay</Badge>
                    <Badge variant="outline">xGA Analysis</Badge>
                    <Badge variant="outline">Defensive Strength</Badge>
                    <Badge variant="outline">Match Context</Badge>
                  </div>
                  <div className="bg-cyan-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> CS% = 100 × e^(-1.1 × xGA). Uses team goals against projections as xGA input. Higher defensive strength and weaker opponents increase clean sheet probability.
                  </div>
                </CardContent>
              </Card>

              {/* Team Assist Projections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Team Assist Projections
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Team-level assist forecasting with individual player share breakdown for assist calculations.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Goal-Assist Correlation</Badge>
                    <Badge variant="outline">Creative Metrics</Badge>
                    <Badge variant="outline">Player Share Analysis</Badge>
                    <Badge variant="outline">Form Factors</Badge>
                  </div>
                  <div className="bg-blue-50 p-3 rounded text-sm">
                    <strong>Logic:</strong> Correlated with team goal projections using historical goal-to-assist ratios. Individual shares based on weighted historical assist percentage with minutes factoring.
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
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Methodology Tab */}
          <TabsContent value="methodology" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Master Team Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  All projections use the MASTER_TEAM_DEFAULTS configuration as the single source of truth for team classifications and multipliers.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Attack Tier Classifications</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm font-medium">Elite (1.35x)</span>
                        <span className="text-xs text-gray-600">Liverpool, Man City</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-sm font-medium">Strong (1.15x)</span>
                        <span className="text-xs text-gray-600">Arsenal, Chelsea, Newcastle, Tottenham, Aston Villa</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">Average (1.00x)</span>
                        <span className="text-xs text-gray-600">Brighton, Man Utd, Bournemouth, Brentford, Fulham, Palace</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-sm font-medium">Weak (0.85x)</span>
                        <span className="text-xs text-gray-600">Everton, Forest, West Ham, Wolves</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Defense Tier Classifications</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm font-medium">Elite (0.70x)</span>
                        <span className="text-xs text-gray-600">Arsenal</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-sm font-medium">Strong (0.85x)</span>
                        <span className="text-xs text-gray-600">Liverpool, Man City, Chelsea, Newcastle, Forest</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">Average (1.00x)</span>
                        <span className="text-xs text-gray-600">Villa, Everton, Man Utd, Tottenham, Palace, Fulham</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-sm font-medium">Weak (1.15x)</span>
                        <span className="text-xs text-gray-600">Bournemouth, Brentford, Brighton, West Ham, Wolves</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Context Multipliers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Advanced context multipliers enhance projection accuracy by accounting for situational factors.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Match Context</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Derby matches: 0.87x</li>
                      <li>• Top 6 clashes: 1.12x</li>
                      <li>• Relegation battles: 0.83x</li>
                      <li>• Pressure matches: 0.91x</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Scheduling</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Early kickoffs: 0.94x</li>
                      <li>• Late kickoffs: 1.07x</li>
                      <li>• Midweek fixtures: 0.91x</li>
                      <li>• Post-international: 0.92x</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Situational</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• New manager bounce: 1.08x</li>
                      <li>• Injury crisis: 0.92x</li>
                      <li>• Nothing to play for: 0.94x</li>
                      <li>• Weather conditions: 0.92x</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Penalty Taker Adjustments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Goal projections include specific adjustments for penalty takers based on historical penalty-taking rates.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Primary Penalty Takers</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Bruno Fernandes</span><span className="text-green-600">+0.15</span></div>
                      <div className="flex justify-between"><span>Mohamed Salah</span><span className="text-green-600">+0.12</span></div>
                      <div className="flex justify-between"><span>Harry Kane</span><span className="text-green-600">+0.10</span></div>
                      <div className="flex justify-between"><span>Cole Palmer</span><span className="text-green-600">+0.10</span></div>
                      <div className="flex justify-between"><span>Bukayo Saka</span><span className="text-green-600">+0.08</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Secondary Penalty Takers</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>James Ward-Prowse</span><span className="text-green-600">+0.06</span></div>
                      <div className="flex justify-between"><span>Pascal Groß</span><span className="text-green-600">+0.05</span></div>
                      <div className="flex justify-between"><span>Son Heung-min</span><span className="text-green-600">+0.04</span></div>
                      <div className="flex justify-between"><span>Alexander Isak</span><span className="text-green-600">+0.06</span></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Data Processing & Caching
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Advanced caching system ensures ultra-fast response times while maintaining data freshness.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Performance Optimization</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Database-backed projection caching</li>
                      <li>• Sub-second response times (95% faster)</li>
                      <li>• Intelligent cache invalidation</li>
                      <li>• Deterministic calculations</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Data Freshness</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Daily automated updates (7:05 AM IST)</li>
                      <li>• Real-time price change tracking</li>
                      <li>• Gameweek completion detection</li>
                      <li>• Manual refresh capabilities</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Additional Data Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">OpenFPL Integration</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Machine learning projections with ensemble models and multi-horizon forecasting.
                      </p>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Position-specific algorithms</li>
                        <li>• Hourly model updates</li>
                        <li>• Advanced statistical modeling</li>
                        <li>• Cross-validation techniques</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Custom Algorithms</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Proprietary calculations for enhanced accuracy and FPL-specific insights.
                      </p>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Fixture difficulty assessment</li>
                        <li>• Team strength analysis</li>
                        <li>• Player role evaluation</li>
                        <li>• Form and trend modeling</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      All external data is validated against official FPL sources to ensure consistency and accuracy. 
                      Custom algorithms are continuously refined based on historical performance validation.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}