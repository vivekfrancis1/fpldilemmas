import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import { useEffect, Suspense, lazy } from "react";
import { initGA } from "../lib/analytics";
import { useAnalytics } from "../hooks/use-analytics";
import { ErrorBoundary } from "react-error-boundary";
import { useErrorMonitoring } from "./hooks/use-error-monitoring";
import { Loader2 } from "lucide-react";
import ProtectedRoute from "@/components/protected-route";

const Fixtures = lazy(() => import("./pages/fixtures"));
const Transfers = lazy(() => import("./pages/transfers"));
const Captain = lazy(() => import("./pages/captain"));
const GoalShare = lazy(() => import("./pages/goal-share"));
const AssistShare = lazy(() => import("./pages/assist-share"));
const PlayerGoalProjections = lazy(() => import("./pages/player-goal-projections"));
const PlayerGoalsScoredProjections = lazy(() => import("./pages/player-goals-scored-projections"));
const PlayerAssistProjections = lazy(() => import("./pages/player-assist-projections"));
const PlayerMinutes = lazy(() => import("./pages/player-minutes"));
const PlayerCleanSheetPoints = lazy(() => import("./pages/player-cleansheet-points"));
const PlayerTotalPoints = lazy(() => import("./pages/player-total-points"));
const BestFreehitTeam = lazy(() => import("./pages/best-freehit-team"));
const BestWildcardTeam = lazy(() => import("./pages/best-wildcard-team"));
const Watchlist = lazy(() => import("./pages/watchlist"));
const LiveRank = lazy(() => import("./pages/live-rank"));
const MyTeam = lazy(() => import("./pages/my-team"));
const MyLeagues = lazy(() => import("./pages/my-leagues"));
const MyDashboard = lazy(() => import("./pages/my-dashboard"));
const LeagueAnalysisPage = lazy(() => import("./pages/league-analysis"));
const PriceTracker = lazy(() => import("./pages/price-tracker"));
const RecentPriceChanges = lazy(() => import("./pages/recent-price-changes"));
const TransferTracker = lazy(() => import("./pages/transfer-tracker"));
const OpenFPLProjections = lazy(() => import("./pages/openfpl-projections"));
const ContentCreators = lazy(() => import("./pages/content-creators"));
const CreatorTeam = lazy(() => import("./pages/creator-team"));
const Top25Managers = lazy(() => import("./pages/top25-managers"));
const Top25ManagerTeam = lazy(() => import("./pages/top25-manager-team"));
const Top25TeamAnalysis = lazy(() => import("./pages/top25-team-analysis"));
const ManagerTeam = lazy(() => import("./pages/manager-team"));
const LeagueComparison = lazy(() => import("./pages/league-comparison"));
const PlayerStats = lazy(() => import("./pages/player-stats"));
const PlayerDetail = lazy(() => import("./pages/player-detail"));
const ResultsAndFixtures = lazy(() => import("./pages/results-and-fixtures"));
const MatchStats = lazy(() => import("./pages/match-stats"));
const ProjectedGoalsCS = lazy(() => import("./pages/projected-goals-cs"));
const ProjectedStandings = lazy(() => import("./pages/projected-standings"));
const PredictedScores = lazy(() => import("./pages/predicted-scores"));
const TeamGoalProjections = lazy(() => import("./pages/team-goal-projections"));
const TeamGoalsAgainstProjections = lazy(() => import("./pages/team-goals-against-projections"));
const TeamAssistProjections = lazy(() => import("./pages/team-assist-projections"));
const TeamCSProjections = lazy(() => import("./pages/team-cs-projections"));
const AdminGoalProjections = lazy(() => import("./pages/admin-goal-projections"));
const AdminUpsetConfig = lazy(() => import("./pages/admin-upset-config"));
const Admin = lazy(() => import("./pages/admin"));
const AdminDataPopulation = lazy(() => import("./pages/admin-data-population"));
const AdminGameweekCache = lazy(() => import("./pages/admin-gameweek-cache"));
const AdminCleanSheetConfig = lazy(() => import("./pages/admin-clean-sheet-config"));
const AdminCacheManagement = lazy(() => import("./pages/admin-cache-management"));
const AdminActivityLogs = lazy(() => import("./pages/admin-activity-logs"));
const PlayerDefensiveContributions = lazy(() => import("./pages/player-defensive-contributions"));
const ProjectionDocumentation = lazy(() => import("./pages/projection-documentation"));
const PlayerSaves = lazy(() => import("./pages/player-saves"));
const PlayerGoalsConceded = lazy(() => import("./pages/player-goals-conceded"));
const PlayerYellowCards = lazy(() => import("./pages/player-yellow-cards"));
const PlayerRedCards = lazy(() => import("./pages/player-red-cards"));
const PlayerBonusPoints = lazy(() => import("./pages/player-bonus-points"));
const Login = lazy(() => import("./pages/login"));
const ResponsiveTableDemo = lazy(() => import("./pages/responsive-table-demo"));
const CurrentStandings = lazy(() => import("./pages/current-standings"));
const TransferPlanner = lazy(() => import("./pages/transfer-planner"));
const ProjectedPoints = lazy(() => import("./pages/projected-points"));
const TeamOptimizer = lazy(() => import("./pages/team-optimizer"));
const TransferRecommendations = lazy(() => import("./pages/transfer-recommendations"));
const ProjectionAccuracy = lazy(() => import("./pages/projection-accuracy"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">Loading page...</p>
          <p className="text-sm text-gray-500">Please wait while we prepare your content</p>
        </div>
      </div>
    </div>
  );
}

function Router() {
  useAnalytics();
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={PlayerTotalPoints} />
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
        <Route path="/player/:id" component={PlayerDetail} />
        <Route path="/responsive-table-demo" component={ResponsiveTableDemo} />

        <Route path="/projected-goals-cs" component={ProjectedGoalsCS} />
        <Route path="/projected-standings" component={ProjectedStandings} />
        <Route path="/current-standings" component={CurrentStandings} />
        <Route path="/predicted-scores" component={PredictedScores} />
        <Route path="/results-and-fixtures" component={ResultsAndFixtures} />
        <Route path="/match-stats/:fixtureId" component={MatchStats} />
        <Route path="/player-goals-scored-projections" component={PlayerGoalsScoredProjections} />
        <Route path="/player-minutes">
          <ProtectedRoute requireAdmin={true}>
            <Suspense fallback={<PageLoader />}>
              <PlayerMinutes />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/player-cleansheet-points">
          <ProtectedRoute requireAdmin={true}>
            <Suspense fallback={<PageLoader />}>
              <PlayerCleanSheetPoints />
            </Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <PlayerGoalProjections />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/player-goals-scored">
          <ProtectedRoute requireAdmin={true}>
            <Suspense fallback={<PageLoader />}>
              <PlayerGoalProjections />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/player-assist-projections" component={PlayerAssistProjections} />
        <Route path="/player-defensive-contributions" component={PlayerDefensiveContributions} />
        <Route path="/player-saves" component={PlayerSaves} />
        <Route path="/player-goals-conceded" component={PlayerGoalsConceded} />
        <Route path="/player-yellow-cards" component={PlayerYellowCards} />
        <Route path="/player-red-cards" component={PlayerRedCards} />
        <Route path="/player-bonus-points" component={PlayerBonusPoints} />
        <Route path="/projection-accuracy">
          <ProtectedRoute requireAdmin={true}>
            <Suspense fallback={<PageLoader />}>
              <ProjectionAccuracy />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/openfpl-projections" component={OpenFPLProjections} />
        <Route path="/admin-goal-projections" component={AdminGoalProjections} />
        <Route path="/admin-clean-sheet-config" component={AdminCleanSheetConfig} />
        <Route path="/admin-upset-config" component={AdminUpsetConfig} />
        <Route path="/admin-content-creators" component={Admin} />
        <Route path="/admin-cache-management">
          <ProtectedRoute requireAdmin={true}>
            <Suspense fallback={<PageLoader />}>
              <AdminCacheManagement />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/admin-activity-logs" component={AdminActivityLogs} />
        <Route path="/admin-data-population" component={AdminDataPopulation} />
        <Route path="/admin-gameweek-cache" component={AdminGameweekCache} />
        <Route path="/content-creators" component={ContentCreators} />
        <Route path="/content-creators/:id/team" component={CreatorTeam} />
        <Route path="/top25-managers" component={Top25Managers} />
        <Route path="/top25-managers/:rank/team" component={Top25ManagerTeam} />
        <Route path="/top25-team-analysis" component={Top25TeamAnalysis} />
        <Route path="/manager-team/:managerId" component={ManagerTeam} />
        <Route path="/projection-documentation" component={ProjectionDocumentation} />
        <Route path="/login" component={Login} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  console.error('App Error:', error);
  
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
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">{getErrorCategory()}</h1>
          <p className="text-lg text-gray-700 mb-4">Something went wrong</p>
        </div>

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
  const { getErrorStats, isMonitoringActive } = useErrorMonitoring({
    enableConsoleMonitoring: true,
    enableGlobalErrorHandling: true,
    reportToAnalytics: true
  });

  useEffect(() => {
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isMonitoringActive) {
      console.log('Error monitoring activated for React hooks violations and common errors');
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
