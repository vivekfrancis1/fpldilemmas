import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Fixtures from "./pages/fixtures";
import Transfers from "./pages/transfers";
import Captain from "./pages/captain";
import GoalShare from "./pages/goal-share";
import AssistShare from "./pages/assist-share";
import Watchlist from "./pages/watchlist";
import LiveRank from "./pages/live-rank";
import MyTeam from "./pages/my-team";
import MyLeagues from "./pages/my-leagues";
import PriceTracker from "./pages/price-tracker";
import LeagueComparison from "./pages/league-comparison";
import PlayerStats from "./pages/player-stats";

import ProjectedGoalsCS from "./pages/projected-goals-cs";
import TeamGoalProjections from "./pages/team-goal-projections";
import TeamCSProjections from "./pages/team-cs-projections";
import PlayerMinutes from "./pages/player-minutes";
import PlayerProjectedGoals from "./pages/player-projected-goals";
import PlayerExpectedAssists from "./pages/player-expected-assists";

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

      <Route path="/results-projections" component={ProjectedGoalsCS} />
      <Route path="/team-goal-projections" component={TeamGoalProjections} />
      <Route path="/team-cs-projections" component={TeamCSProjections} />
      <Route path="/goal-share" component={GoalShare} />
      <Route path="/assist-share" component={AssistShare} />
      <Route path="/player-minutes" component={PlayerMinutes} />
      <Route path="/player-projected-goals" component={PlayerProjectedGoals} />
      <Route path="/player-expected-assists" component={PlayerExpectedAssists} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
