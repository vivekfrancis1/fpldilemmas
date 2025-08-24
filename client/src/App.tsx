import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";
import Fixtures from "./pages/fixtures";
import Transfers from "./pages/transfers";
import Captain from "./pages/captain";
import GoalShare from "./pages/goal-share";
import AssistShare from "./pages/assist-share";
import PlayerGoalProjections from "./pages/player-goal-projections";
import PlayerAssistProjections from "./pages/player-assist-projections";
import Watchlist from "./pages/watchlist";
import LiveRank from "./pages/live-rank";
import MyTeam from "./pages/my-team";
import MyLeagues from "./pages/my-leagues";
import PriceTracker from "./pages/price-tracker";
import OpenFPLProjections from "./pages/openfpl-projections";
import LeagueComparison from "./pages/league-comparison";
import PlayerStats from "./pages/player-stats";

import ProjectedGoalsCS from "./pages/projected-goals-cs";
import ProjectedStandings from "./pages/projected-standings";
import PredictedScores from "./pages/predicted-scores";
import TeamGoalProjections from "./pages/team-goal-projections";
import TeamGoalsAgainstProjections from "./pages/team-goals-against-projections";
import TeamAssistProjections from "./pages/team-assist-projections";
import TeamCSProjections from "./pages/team-cs-projections";
import SeasonProjections from "./pages/season-projections";
import AdminUnifiedProjections from "./pages/admin-unified-projections";
import AdminCSProjections from "./pages/admin-cs-projections";
import AdminAssistProjections from "./pages/admin-assist-projections";
import AdminMatchProjections from "./pages/admin-match-projections";
import AdminGoalProjections from "./pages/admin-goal-projections";
import AdminDefenseProjections from "./pages/admin-defense-projections";
import AdminGoalsAgainst from "./pages/admin-goals-against";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PlayerStats} />
      <Route path="/fixtures" component={Fixtures} />
      <Route path="/transfers" component={Transfers} />
      <Route path="/captain" component={Captain} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/live-rank" component={LiveRank} />
      <Route path="/my-team" component={MyTeam} />
      <Route path="/my-leagues" component={MyLeagues} />
      <Route path="/price-tracker" component={PriceTracker} />
      <Route path="/league-comparison" component={LeagueComparison} />
      <Route path="/player-stats" component={PlayerStats} />

      <Route path="/projected-goals-cs" component={ProjectedGoalsCS} />
      <Route path="/projected-standings" component={ProjectedStandings} />
      <Route path="/predicted-scores" component={PredictedScores} />
      <Route path="/results-projections" component={ProjectedGoalsCS} />
      <Route path="/team-goal-projections" component={TeamGoalProjections} />
      <Route path="/team-goals-against-projections" component={TeamGoalsAgainstProjections} />
      <Route path="/team-assist-projections" component={TeamAssistProjections} />
      <Route path="/team-cs-projections" component={TeamCSProjections} />
      <Route path="/goal-share" component={GoalShare} />
      <Route path="/assist-share" component={AssistShare} />
      <Route path="/player-goal-projections" component={PlayerGoalProjections} />
      <Route path="/player-assist-projections" component={PlayerAssistProjections} />
      <Route path="/openfpl-projections" component={OpenFPLProjections} />
      <Route path="/season-projections" component={SeasonProjections} />
      <Route path="/admin-unified-projections" component={AdminUnifiedProjections} />
      <Route path="/admin-goal-projections" component={AdminGoalProjections} />
      <Route path="/admin-defense-projections" component={AdminDefenseProjections} />
      <Route path="/admin-goals-against" component={AdminGoalsAgainst} />
      <Route path="/admin-cs-projections" component={AdminCSProjections} />
      <Route path="/admin-assist-projections" component={AdminAssistProjections} />
      <Route path="/admin-match-projections" component={AdminMatchProjections} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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