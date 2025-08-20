import { Link } from "wouter";
import Layout from "../components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BarChart3, Calendar, RefreshCw, Award, Eye, TrendingUp, Users, Star } from "lucide-react";

export default function Home() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="text-main-title">
            FPL Analysis Tools
          </h1>
          <p className="text-xl text-gray-600 mb-2" data-testid="text-main-subtitle">
            Analytical tools to beat the deadline blues
          </p>
          <p className="text-gray-600 max-w-2xl mx-auto" data-testid="text-main-description">
            Choose the right tool for your FPL decisions. Our most popular tools are highlighted for quick access.
          </p>
        </div>

        {/* Most Popular Tools */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            Most Popular Tools
          </h2>
          <p className="text-gray-600 mb-6">Our users' favorite FPL analysis tools</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Live Rank Tracker - Featured */}
            <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 hover:shadow-xl transition-all duration-300 cursor-pointer group" data-testid="card-live-rank-featured">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-red-600 text-white">MOST POPULAR</Badge>
                  <TrendingUp className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-xl">Live Rank Tracker</CardTitle>
                <CardDescription className="text-base">
                  Check your current FPL rank in real-time and track your progress throughout the season. See exactly where you stand globally and how you're trending.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Real-time rank updates
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Season progress tracking
                    </div>
                  </div>
                  <Link href="/live-rank" className="inline-block">
                    <Button 
                      size="lg"
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-base"
                      data-testid="button-view-live-rank-featured"
                    >
                      Check My Rank
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Price Tracker - Featured */}
            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-all duration-300 cursor-pointer group" data-testid="card-price-tracker-featured">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-orange-600 text-white">HIGHLY USEFUL</Badge>
                  <RefreshCw className="h-8 w-8 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Price Tracker</CardTitle>
                <CardDescription className="text-base">
                  Track daily price changes and predict future movements with intelligent analysis. Never miss a price rise or fall again.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Daily price predictions
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Smart timing alerts
                    </div>
                  </div>
                  <Link href="/price-tracker" className="inline-block">
                    <Button 
                      size="lg"
                      className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 text-base"
                      data-testid="button-view-price-tracker-featured"
                    >
                      Track Prices
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* All Tools */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            All Analysis Tools
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Player Statistics */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" data-testid="card-player-stats">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Player Statistics
                </CardTitle>
                <CardDescription>
                  Comprehensive player performance data and statistics for informed FPL decisions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">All player data & stats</span>
                  <Link href="/player-stats" className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-blue-600 group-hover:text-white transition-colors"
                      data-testid="button-view-player-stats"
                    >
                      View Stats
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            {/* Player Stats */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" data-testid="card-player-stats">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-fpl-purple" />
                  Player Performance
                </CardTitle>
                <CardDescription>
                  Analyze detailed player statistics, form, and value to find the best picks for your team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Advanced filters & sorting</span>
                  <Link href="/" className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-fpl-purple group-hover:text-white transition-colors"
                      data-testid="button-view-player-stats"
                    >
                      View Stats
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Fixture Difficulty */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" data-testid="card-fixture-analyzer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Fixture Analyzer
                </CardTitle>
                <CardDescription>
                  Check upcoming fixtures and difficulty ratings to plan your transfers and captaincy choices.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Next 5 gameweeks</span>
                  <Link href="/fixtures" className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-blue-600 group-hover:text-white transition-colors"
                      data-testid="button-view-fixtures"
                    >
                      Analyze
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Transfer Planner */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" data-testid="card-transfer-planner">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-green-600" />
                  Transfer Planner
                </CardTitle>
                <CardDescription>
                  Smart transfer recommendations based on form, fixtures, and value. Make the perfect moves.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Buy & sell recommendations</span>
                  <Link href="/transfers" className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-green-600 group-hover:text-white transition-colors"
                      data-testid="button-view-transfers"
                    >
                      Plan Now
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Captain Selector */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" data-testid="card-captain-selector">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  Captain Selector
                </CardTitle>
                <CardDescription>
                  Find the perfect captain and vice-captain with intelligent recommendations and strategy analysis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Multiple strategies</span>
                  <Link href="/captain" className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-yellow-600 group-hover:text-white transition-colors"
                      data-testid="button-view-captain"
                    >
                      Choose
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Watchlist */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" data-testid="card-watchlist">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-indigo-600" />
                  Watchlist & Alerts
                </CardTitle>
                <CardDescription>
                  Track your favorite players and get notified about price changes and key updates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Price alerts & notes</span>
                  <Link href="/watchlist" className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                      data-testid="button-view-watchlist"
                    >
                      Track
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* League Analysis */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" data-testid="card-league-comparison">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  League Analysis
                </CardTitle>
                <CardDescription>
                  Analyze player performance and compare managers within a single FPL mini-league.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Performance analysis</span>
                  <Link href="/league-comparison" className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-purple-600 group-hover:text-white transition-colors"
                      data-testid="button-view-league-comparison"
                    >
                      Analyze
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Why Use These Tools */}
        <div className="mb-12">
          <Card className="bg-gradient-to-r from-fpl-purple/10 to-fpl-green/10 border-fpl-purple/20">
            <CardContent className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Why FPL Managers Choose Our Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Real-Time Data</h4>
                  <p className="text-gray-600">Always up-to-date with the latest FPL API data for accurate decisions</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Smart Analysis</h4>
                  <p className="text-gray-600">Advanced analytics to identify patterns and opportunities</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Competitive Edge</h4>
                  <p className="text-gray-600">Tools designed to help you outperform other FPL managers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access to Player Data */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Looking for Player Stats?</h3>
          <p className="text-gray-600 mb-4">Access detailed player performance data and statistics</p>
          <p className="text-sm text-gray-500 mt-2">Player statistics are now integrated within each tool for focused analysis</p>
        </div>
      </div>
    </Layout>
  );
}
