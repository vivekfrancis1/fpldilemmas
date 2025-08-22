import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Fixtures from "./pages/fixtures";
import Transfers from "./pages/transfers";
import Captain from "./pages/captain";
import Watchlist from "./pages/watchlist";
import LiveRank from "./pages/live-rank";
import MyTeam from "./pages/my-team";
import MyLeagues from "./pages/my-leagues";
import PriceTracker from "./pages/price-tracker";
import LeagueComparison from "./pages/league-comparison";
import PlayerStats from "./pages/player-stats";
import Projections from "./pages/projections";
import ResultsProjections from "./pages/results-projections";
import TeamGoalProjections from "./pages/team-goal-projections";

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
      <Route path="/projections" component={Projections} />
      <Route path="/results-projections" component={ResultsProjections} />
      <Route path="/team-goal-projections" component={TeamGoalProjections} />
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
