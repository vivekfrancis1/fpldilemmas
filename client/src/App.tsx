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
import PriceTracker from "./pages/price-tracker";
import LeagueComparison from "./pages/league-comparison";
import PlayerStats from "./pages/player-stats";
import FplTeam from "./pages/fpl-team";
import AuthLogin from "./pages/auth-login";
import AuthSetupTeam from "./pages/auth-setup-team";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PlayerStats} />
      <Route path="/fixtures" component={Fixtures} />
      <Route path="/transfers" component={Transfers} />
      <Route path="/captain" component={Captain} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/live-rank" component={LiveRank} />
      <Route path="/price-tracker" component={PriceTracker} />
      <Route path="/league-comparison" component={LeagueComparison} />
      <Route path="/player-stats" component={PlayerStats} />
      <Route path="/fpl-team" component={FplTeam} />
      <Route path="/auth/login" component={AuthLogin} />
      <Route path="/auth/setup-team" component={AuthSetupTeam} />
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
