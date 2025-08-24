import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import AdminGoalProjections from "./pages/admin-goal-projections";

function TestPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>FPL Dilemmas - Step 4: Testing AdminGoalProjections</h1>
      <p>If this loads, AdminGoalProjections component is working!</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={TestPage} />
      <Route path="/admin-goal-projections" component={AdminGoalProjections} />
      <Route component={TestPage} />
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