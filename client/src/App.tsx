import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import { useEffect } from "react";
import { initGA } from "../lib/analytics";
import { useAnalytics } from "../hooks/use-analytics";
import NotFound from "@/pages/not-found";
import Fixtures from "./pages/fixtures";
import Transfers from "./pages/transfers";
import Captain from "./pages/captain";
import GoalShare from "./pages/goal-share";
import AssistShare from "./pages/assist-share";
import PlayerGoalProjections from "./pages/player-goal-projections";
import PlayerGoalsScoredProjections from "./pages/player-goals-scored-projections";
import PlayerAssistProjections from "./pages/player-assist-projections";
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
import AdminUpsetConfig from "./pages/admin-upset-config";
import Admin from "./pages/admin";


function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <Switch>
      <Route path="/" component={LiveRank} />
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
      <Route path="/team-goal-projections" component={TeamGoalProjections} />
      <Route path="/team-goals-against-projections" component={TeamGoalsAgainstProjections} />
      <Route path="/team-assist-projections" component={TeamAssistProjections} />
      <Route path="/team-cs-projections" component={TeamCSProjections} />
      <Route path="/goal-share" component={GoalShare} />
      <Route path="/assist-share" component={AssistShare} />
      <Route path="/player-goal-projections" component={PlayerGoalProjections} />
      <Route path="/player-assist-projections" component={PlayerAssistProjections} />
      <Route path="/player-goals-scored-projections" component={PlayerGoalsScoredProjections} />
      <Route path="/openfpl-projections" component={OpenFPLProjections} />
      <Route path="/season-projections" component={SeasonProjections} />
      <Route path="/admin-goal-projections" component={AdminGoalProjections} />
      <Route path="/admin-upset-config" component={AdminUpsetConfig} />
      <Route path="/admin-content-creators" component={Admin} />
      <Route path="/content-creators" component={ContentCreators} />
      <Route path="/content-creators/:id/team" component={CreatorTeam} />

      <Route component={NotFound} />
    </Switch>
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;