import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>FPL Dilemmas - Step 1: Basic Providers</h1>
          <p>QueryClient and TooltipProvider loaded successfully.</p>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;