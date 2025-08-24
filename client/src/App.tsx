import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";

function TestPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>FPL Dilemmas - Step 3: Router Working</h1>
      <p>Router is working! Now testing page components...</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={TestPage} />
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