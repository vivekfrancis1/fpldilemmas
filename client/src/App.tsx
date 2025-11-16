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
import { useErrorMonitoring } from "./hooks/use-error-monitoring";
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
import BestFreehitTeam from "./pages/best-freehit-team";
import BestWildcardTeam from "./pages/best-wildcard-team";
import Watchlist from "./pages/watchlist";
import LiveRank from "./pages/live-rank";
import MyTeam from "./pages/my-team";
import MyLeagues from "./pages/my-leagues";
import MyDashboard from "./pages/my-dashboard";
import LeagueAnalysisPage from "./pages/league-analysis";
import PriceTracker from "./pages/price-tracker";
import RecentPriceChanges from "./pages/recent-price-changes";
import TransferTracker from "./pages/transfer-tracker";
import OpenFPLProjections from "./pages/openfpl-projections";
import ContentCreators from "./pages/content-creators";
import CreatorTeam from "./pages/creator-team";
import Top25Managers from "./pages/top25-managers";
import Top25ManagerTeam from "./pages/top25-manager-team";
import Top25TeamAnalysis from "./pages/top25-team-analysis";
import ManagerTeam from "./pages/manager-team";
import Top50Managers from "./pages/top50-managers";
import Top50ManagerTeam from "./pages/top50-manager-team";
import LeagueComparison from "./pages/league-comparison";
import PlayerStats from "./pages/player-stats";
import ResultsAndFixtures from "./pages/results-and-fixtures";

import ProjectedGoalsCS from "./pages/projected-goals-cs";
import ProjectedStandings from "./pages/projected-standings";
import PredictedScores from "./pages/predicted-scores";
import TeamGoalProjections from "./pages/team-goal-projections";
import TeamGoalsAgainstProjections from "./pages/team-goals-against-projections";
import TeamAssistProjections from "./pages/team-assist-projections";
import TeamCSProjections from "./pages/team-cs-projections";
import AdminGoalProjections from "./pages/admin-goal-projections";
import AdminUpsetConfig from "./pages/admin-upset-config";
import Admin from "./pages/admin";
import AdminDataPopulation from "./pages/admin-data-population";
import AdminGameweekCache from "./pages/admin-gameweek-cache";
import AdminCleanSheetConfig from "./pages/admin-clean-sheet-config";
import AdminCacheManagement from "./pages/admin-cache-management";
import PlayerDefensiveContributions from "./pages/player-defensive-contributions";
import ProjectionDocumentation from "./pages/projection-documentation";
import PlayerSaves from "./pages/player-saves";
import PlayerGoalsConceded from "./pages/player-goals-conceded";
import PlayerYellowCards from "./pages/player-yellow-cards";
import PlayerRedCards from "./pages/player-red-cards";
import PlayerBonusPoints from "./pages/player-bonus-points";
import Login from "./pages/login";
import ResponsiveTableDemo from "./pages/responsive-table-demo";
import CurrentStandings from "./pages/current-standings";
import TransferPlanner from "./pages/transfer-planner";
import ProjectedPoints from "./pages/projected-points";
import TeamOptimizer from "./pages/team-optimizer";
import TransferRecommendations from "./pages/transfer-recommendations";


function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <Switch>
      <Route path="/" component={TeamGoalProjections} />
      <Route path="/live-rank" component={LiveRank} />
      <Route path="/my-dashboard" component={MyDashboard} />
      <Route path="/projected-points" component={ProjectedPoints} />
      <Route path="/team-optimizer" component={TeamOptimizer} />
      <Route path="/transfer-recommendations" component={TransferRecommendations} />
      <Route path="/fixtures" component={Fixtures} />
      <Route path="/transfers" component={Transfers} />
      <Route path="/captain" component={Captain} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/my-team" component={MyTeam} />
      <Route path="/my-leagues" component={MyLeagues} />
      <Route path="/transfer-planner" component={TransferPlanner} />
      <Route path="/league-analysis/:leagueId/:leagueName/:managerId" component={LeagueAnalysisPage} />
      <Route path="/price-tracker" component={PriceTracker} />
      <Route path="/recent-price-changes" component={RecentPriceChanges} />
      <Route path="/predicted-price-changes" component={TransferTracker} />
      <Route path="/transfer-tracker" component={TransferTracker} />
      <Route path="/league-comparison" component={LeagueComparison} />
      <Route path="/player-statistics" component={PlayerStats} />
      <Route path="/responsive-table-demo" component={ResponsiveTableDemo} />

      <Route path="/projected-goals-cs" component={ProjectedGoalsCS} />
      <Route path="/projected-standings" component={ProjectedStandings} />
      <Route path="/current-standings" component={CurrentStandings} />
      <Route path="/predicted-scores" component={PredictedScores} />
      <Route path="/results-and-fixtures" component={ResultsAndFixtures} />
      <Route path="/player-goals-scored-projections" component={PlayerGoalsScoredProjections} />
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
      <Route path="/player-total-points" component={PlayerTotalPoints} />
      <Route path="/best-freehit-team" component={BestFreehitTeam} />
      <Route path="/best-wildcard-team" component={BestWildcardTeam} />
      <Route path="/team-goal-projections" component={TeamGoalProjections} />
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
      <Route path="/player-assist-projections" component={PlayerAssistProjections} />
      <Route path="/player-defensive-contributions" component={PlayerDefensiveContributions} />
      <Route path="/player-saves" component={PlayerSaves} />
      <Route path="/player-goals-conceded" component={PlayerGoalsConceded} />
      <Route path="/player-yellow-cards" component={PlayerYellowCards} />
      <Route path="/player-red-cards" component={PlayerRedCards} />
      <Route path="/player-bonus-points" component={PlayerBonusPoints} />
      <Route path="/openfpl-projections" component={OpenFPLProjections} />
      <Route path="/admin-goal-projections" component={AdminGoalProjections} />
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
      <Route path="/top25-managers" component={Top25Managers} />
      <Route path="/top25-managers/:rank/team" component={Top25ManagerTeam} />
      <Route path="/top25-team-analysis" component={Top25TeamAnalysis} />
      <Route path="/top50-managers" component={Top50Managers} />
      <Route path="/top50-managers/:rank/team" component={Top50ManagerTeam} />
      <Route path="/manager-team/:managerId" component={ManagerTeam} />
      <Route path="/projection-documentation" component={ProjectionDocumentation} />
      <Route path="/login" component={Login} />

      <Route component={NotFound} />
    </Switch>
  );
}

// Enhanced Error fallback component with React hooks error detection
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  console.error('App Error:', error);
  
  // Detect React hooks violations and other common errors
  const isHooksError = error.message.includes('hooks') || 
                      error.message.includes('Hook') ||
                      error.message.includes('useEffect') ||
                      error.message.includes('useState') ||
                      error.message.includes('useQuery') ||
                      error.message.includes('Invalid hook call');
                      
  const isRenderError = error.message.includes('render') ||
                       error.message.includes('key') ||
                       error.stack?.includes('render');

  const getErrorCategory = () => {
    if (isHooksError) return 'React Hooks Error';
    if (isRenderError) return 'Rendering Error';
    return 'Application Error';
  };

  const getErrorAdvice = () => {
    if (isHooksError) {
      return 'This appears to be a React hooks error. Try refreshing the page to reset the component state.';
    }
    if (isRenderError) {
      return 'This appears to be a rendering error. The page state may have become corrupted.';
    }
    return 'An unexpected error occurred. Please try the recovery options below.';
  };

  const handlePageReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        {/* Error Title */}
        <div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">{getErrorCategory()}</h1>
          <p className="text-lg text-gray-700 mb-4">Something went wrong</p>
        </div>

        {/* Error Details */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
          <h3 className="font-semibold text-gray-900 mb-2">Error Details:</h3>
          <p className="text-sm text-gray-700 mb-3">{getErrorAdvice()}</p>
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
              Technical Details (Click to expand)
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded border">
              <p className="font-mono text-xs text-red-700 break-words">
                {error.message}
              </p>
              {error.stack && (
                <pre className="mt-2 font-mono text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-32">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        </div>

        {/* Recovery Options */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Recovery Options:</h3>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={handlePageReload}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              data-testid="button-reload-page"
            >
              Reload Page
            </button>
            
            <button 
              onClick={resetErrorBoundary}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              data-testid="button-retry-error"
            >
              Try Again
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            If the error persists, try refreshing your browser or clearing your cache.
          </p>
        </div>

        {/* Navigation Link */}
        <div className="pt-4 border-t border-gray-200">
          <a 
            href="/" 
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            data-testid="link-home"
          >
            ← Return to Home Page
          </a>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Initialize error monitoring for React hooks violations and other errors
  const { getErrorStats, isMonitoringActive } = useErrorMonitoring({
    enableConsoleMonitoring: true,
    enableGlobalErrorHandling: true,
    reportToAnalytics: true
  });

  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  // Log error monitoring status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isMonitoringActive) {
      console.log('🔍 Error monitoring activated for React hooks violations and common errors');
    }
  }, [isMonitoringActive]);

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