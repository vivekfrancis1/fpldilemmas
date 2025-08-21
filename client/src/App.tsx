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
import Login from "./pages/login";
import Layout from "./components/layout";
import { useAuth } from "./hooks/useAuth";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fpl-purple mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <Layout>
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
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
