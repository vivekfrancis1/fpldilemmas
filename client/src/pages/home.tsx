import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "../components/header";
import Footer from "../components/footer";
import StatsCards from "../components/stats-cards";
import FiltersPanel from "../components/filters-panel";
import PlayerStatsTable from "../components/player-stats-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Calendar, RefreshCw, Award, Eye, TrendingUp, Users } from "lucide-react";
import { FilterState, SortState } from "@/lib/types";
import { BootstrapData } from "@shared/schema";

export default function Home() {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    position: "all",
    team: "all",
    maxPrice: "all",
  });

  const [sort, setSort] = useState<SortState>({
    field: "total_points",
    direction: "desc",
  });

  const { data: bootstrapData, isLoading, error } = useQuery<BootstrapData>({
    queryKey: ["/api/bootstrap-static"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (error) {
    return (
      <div className="min-h-screen bg-fpl-light">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8" data-testid="error-state">
            <div className="flex items-center">
              <i className="fas fa-exclamation-triangle text-red-500 mr-3"></i>
              <div>
                <h3 className="text-red-800 font-medium">Failed to load player data</h3>
                <p className="text-red-600 text-sm mt-1">Unable to connect to FPL API. Please check your connection and try again.</p>
                <button 
                  className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  onClick={() => window.location.reload()}
                  data-testid="button-retry"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fpl-light">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="text-main-title">
            FPL Dilemmas
          </h1>
          <p className="text-xl text-gray-600 mb-2" data-testid="text-main-subtitle">
            Your Complete Fantasy Premier League Analysis Suite
          </p>
          <p className="text-gray-600 max-w-2xl mx-auto" data-testid="text-main-description">
            Make smarter FPL decisions with our comprehensive set of analysis tools. From player stats to transfer planning, we've got everything you need to dominate your leagues.
          </p>
        </div>

        {/* FPL Tools Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Choose Your Analysis Tool
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

            {/* League Comparison */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" data-testid="card-league-comparison">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  League Comparison
                </CardTitle>
                <CardDescription>
                  Compare multiple mini-leagues side-by-side and analyze standings across different competitions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Compare performance</span>
                  <Link href="/league-comparison" className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-purple-600 group-hover:text-white transition-colors"
                      data-testid="button-view-league-comparison"
                    >
                      Compare
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Live Rank */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" data-testid="card-live-rank">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                  Live Rank Tracker
                </CardTitle>
                <CardDescription>
                  Check your current FPL rank, track progress, and see how you're performing this season.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overall & gameweek ranks</span>
                  <Link href="/live-rank" className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-red-600 group-hover:text-white transition-colors"
                      data-testid="button-view-live-rank"
                    >
                      Check Rank
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Price Tracker */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" data-testid="card-price-tracker">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-orange-600" />
                  Price Tracker
                </CardTitle>
                <CardDescription>
                  Track daily price changes and predict future movements with AI-powered analysis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Daily updates & predictions</span>
                  <Link href="/price-tracker" className="inline-block">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-orange-600 group-hover:text-white transition-colors"
                      data-testid="button-view-price-tracker"
                    >
                      Track Prices
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4" data-testid="text-quick-stats-title">
            Quick Stats Overview
          </h2>
          <StatsCards data={bootstrapData} isLoading={isLoading} />
        </div>

        {/* Featured Player Table */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900" data-testid="text-featured-players-title">
              Top Performing Players
            </h2>
            <Link href="/">
              <Button variant="outline" data-testid="button-view-all-players">
                View All Players
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
        <FiltersPanel 
          filters={filters}
          setFilters={setFilters}
          teams={bootstrapData?.teams}
          elementTypes={bootstrapData?.element_types}
          isLoading={isLoading}
        />
        
        <PlayerStatsTable 
          data={bootstrapData}
          filters={filters}
          sort={sort}
          setSort={setSort}
          isLoading={isLoading}
        />
      </main>

      <Footer />

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="loading-state">
          <div className="bg-white rounded-lg p-8 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fpl-purple"></div>
            <span className="text-gray-700 font-medium">Loading player data...</span>
          </div>
        </div>
      )}
    </div>
  );
}
