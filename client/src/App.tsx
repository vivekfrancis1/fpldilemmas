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
import Watchlist from "./pages/watchlist";
import LiveRank from "./pages/live-rank";
import PriceTracker from "./pages/price-tracker";
import LeagueComparison from "./pages/league-comparison";
import PlayerStats from "./pages/player-stats";
import FplTeam from "./pages/fpl-team";
import AuthLogin from "./pages/auth-login";
import AuthSetupTeam from "./pages/auth-setup-team";
import OAuthCallback from "./pages/oauth-callback";

function Router() {
  return (
    <Switch>
      {/* Authentication routes without layout */}
      <Route path="/auth/login" component={AuthLogin} />
      <Route path="/auth/callback" component={OAuthCallback} />
      <Route path="/auth/setup-team" component={AuthSetupTeam} />
      
      {/* Main app routes with layout */}
      <Route path="/">
        <Layout>
          <PlayerStats />
        </Layout>
      </Route>
      <Route path="/fixtures">
        <Layout>
          <Fixtures />
        </Layout>
      </Route>
      <Route path="/transfers">
        <Layout>
          <Transfers />
        </Layout>
      </Route>
      <Route path="/captain">
        <Layout>
          <Captain />
        </Layout>
      </Route>
      <Route path="/watchlist">
        <Layout>
          <Watchlist />
        </Layout>
      </Route>
      <Route path="/live-rank">
        <Layout>
          <LiveRank />
        </Layout>
      </Route>
      <Route path="/price-tracker">
        <Layout>
          <PriceTracker />
        </Layout>
      </Route>
      <Route path="/league-comparison">
        <Layout>
          <LeagueComparison />
        </Layout>
      </Route>
      <Route path="/player-stats">
        <Layout>
          <PlayerStats />
        </Layout>
      </Route>
      <Route path="/fpl-team">
        <Layout>
          <FplTeam />
        </Layout>
      </Route>
      
      {/* 404 page */}
      <Route>
        <Layout>
          <NotFound />
        </Layout>
      </Route>
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
