import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import { useEffect } from "react";
import { initGA } from "../lib/analytics";
import { useAnalytics } from "../hooks/use-analytics";
import { ErrorBoundary } from "react-error-boundary";
import NotFound from "@/pages/not-found";
import ProtectedRoute from "@/components/protected-route";
import Fixtures from "./pages/fixtures";
import Transfers from "./pages/transfers";
import Captain from "./pages/captain";
import GoalShare from "./pages/goal-share";
import AssistShare from "./pages/assist-share";
import PlayerGoalProjections from "./pages/player-goal-projections";
import PlayerGoalsScoredProjections from "./pages/player-goals-scored-projections";
import PlayerAssistProjections from "./pages/player-assist-projections";
import PlayerMinutes from "./pages/player-minutes";
import PlayerCleanSheetPoints from "./pages/player-cleansheet-points";
import PlayerTotalPoints from "./pages/player-total-points";
import Watchlist from "./pages/watchlist";
import LiveRank from "./pages/live-rank";
import MyTeam from "./pages/my-team";
import MyLeagues from "./pages/my-leagues";
import MyDashboard from "./pages/my-dashboard";
import PriceTracker from "./pages/price-tracker";
import RecentPriceChanges from "./pages/recent-price-changes";
import TransferTracker from "./pages/transfer-tracker";
import OpenFPLProjections from "./pages/openfpl-projections";
import ContentCreators from "./pages/content-creators";
import CreatorTeam from "./pages/creator-team";
import LeagueComparison from "./pages/league-comparison";
import PlayerStats from "./pages/player-stats";
import ResultsProjections from "./pages/results-projections";

import ProjectedGoalsCS from "./pages/projected-goals-cs";
import ProjectedStandings from "./pages/projected-standings";
import PredictedScores from "./pages/predicted-scores";
import TeamGoalProjections from "./pages/team-goal-projections";
import TeamGoalsAgainstProjections from "./pages/team-goals-against-projections";
import TeamAssistProjections from "./pages/team-assist-projections";
import TeamCSProjections from "./pages/team-cs-projections";
import SeasonProjections from "./pages/season-projections";
import AdminGoalProjections from "./pages/admin-goal-projections";
import AdminAssistProjections from "./pages/admin-assist-projections";
import AdminUpsetConfig from "./pages/admin-upset-config";
import Admin from "./pages/admin";
import AdminDataPopulation from "./pages/admin-data-population";
import AdminGameweekCache from "./pages/admin-gameweek-cache";
import AdminCleanSheetConfig from "./pages/admin-clean-sheet-config";
import AdminCacheManagement from "./pages/admin-cache-management";
import DefensiveContributionProjections from "./pages/defensive-contribution-projections";
import PlayerDefensiveContributions from "./pages/player-defensive-contributions";
import ProjectionDocumentation from "./pages/projection-documentation";
import PlayerSaves from "./pages/player-saves";
import PlayerGoalsConceded from "./pages/player-goals-conceded";
import PlayerYellowCards from "./pages/player-yellow-cards";
import PlayerRedCards from "./pages/player-red-cards";
import PlayerBonusPoints from "./pages/player-bonus-points";
import TeamGoalsSpreadBetting from "./pages/team-goals-spread-betting";
import Login from "./pages/login";


function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <Switch>
      <Route path="/" component={MyDashboard} />
      <Route path="/live-rank" component={LiveRank} />
      <Route path="/my-dashboard" component={MyDashboard} />
      <Route path="/fixtures" component={Fixtures} />
      <Route path="/transfers" component={Transfers} />
      <Route path="/captain" component={Captain} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/my-team" component={MyTeam} />
      <Route path="/my-leagues" component={MyLeagues} />
      <Route path="/price-tracker" component={PriceTracker} />
      <Route path="/recent-price-changes" component={RecentPriceChanges} />
      <Route path="/predicted-price-changes" component={TransferTracker} />
      <Route path="/league-comparison" component={LeagueComparison} />
      <Route path="/player-statistics" component={PlayerStats} />

      <Route path="/projected-goals-cs" component={ProjectedGoalsCS} />
      <Route path="/projected-standings" component={ProjectedStandings} />
      <Route path="/predicted-scores" component={PredictedScores} />
      <Route path="/results-projections" component={ResultsProjections} />
      <Route path="/player-goals-scored-projections">
        <ProtectedRoute requireAdmin={true}>
          <PlayerGoalsScoredProjections />
        </ProtectedRoute>
      </Route>
      <Route path="/player-minutes">
        <ProtectedRoute requireAdmin={true}>
          <PlayerMinutes />
        </ProtectedRoute>
      </Route>
      <Route path="/player-cleansheet-points">
        <ProtectedRoute requireAdmin={true}>
          <PlayerCleanSheetPoints />
        </ProtectedRoute>
      </Route>
      <Route path="/player-total-points">
        <ProtectedRoute requireAdmin={true}>
          <PlayerTotalPoints />
        </ProtectedRoute>
      </Route>
      <Route path="/team-goal-projections" component={TeamGoalProjections} />
      <Route path="/team-goals-spread-betting" component={TeamGoalsSpreadBetting} />
      <Route path="/team-goals-against-projections" component={TeamGoalsAgainstProjections} />
      <Route path="/team-assist-projections" component={TeamAssistProjections} />
      <Route path="/team-cs-projections" component={TeamCSProjections} />
      <Route path="/goal-share" component={GoalShare} />
      <Route path="/assist-share" component={AssistShare} />
      <Route path="/player-goal-projections">
        <ProtectedRoute requireAdmin={true}>
          <PlayerGoalProjections />
        </ProtectedRoute>
      </Route>
      <Route path="/player-goals-scored">
        <ProtectedRoute requireAdmin={true}>
          <PlayerGoalProjections />
        </ProtectedRoute>
      </Route>
      <Route path="/player-assist-projections">
        <ProtectedRoute requireAdmin={true}>
          <PlayerAssistProjections />
        </ProtectedRoute>
      </Route>
      <Route path="/defensive-contribution-projections" component={DefensiveContributionProjections} />
      <Route path="/player-defensive-contributions" component={PlayerDefensiveContributions} />
      <Route path="/player-saves" component={PlayerSaves} />
      <Route path="/player-goals-conceded" component={PlayerGoalsConceded} />
      <Route path="/player-yellow-cards" component={PlayerYellowCards} />
      <Route path="/player-red-cards" component={PlayerRedCards} />
      <Route path="/player-bonus-points" component={PlayerBonusPoints} />
      <Route path="/openfpl-projections" component={OpenFPLProjections} />
      <Route path="/season-projections" component={SeasonProjections} />
      <Route path="/admin-goal-projections" component={AdminGoalProjections} />
      <Route path="/admin-assist-projections" component={AdminAssistProjections} />
      <Route path="/admin-clean-sheet-config" component={AdminCleanSheetConfig} />
      <Route path="/admin-upset-config" component={AdminUpsetConfig} />
      <Route path="/admin-content-creators" component={Admin} />
      <Route path="/admin-cache-management">
        <ProtectedRoute requireAdmin={true}>
          <AdminCacheManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin-data-population" component={AdminDataPopulation} />
      <Route path="/admin-gameweek-cache" component={AdminGameweekCache} />
      <Route path="/content-creators" component={ContentCreators} />
      <Route path="/content-creators/:id/team" component={CreatorTeam} />
      <Route path="/projection-docs" component={ProjectionDocumentation} />
      <Route path="/login" component={Login} />

      <Route component={NotFound} />
    </Switch>
  );
}

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  console.error('App Error:', error);
  
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center', 
      backgroundColor: '#fff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ color: '#dc2626', marginBottom: '16px' }}>Application Error</h1>
      <p style={{ marginBottom: '16px', color: '#6b7280' }}>
        Something went wrong: {error.message}
      </p>
      <button 
        onClick={resetErrorBoundary}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Try Again
      </button>
    </div>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('ErrorBoundary caught:', error)}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Layout>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <Router />
            </ErrorBoundary>
          </Layout>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;