import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LoadingStep {
  text: string;
  delay?: string;
}

interface LoadingExperienceProps {
  variant?: "analysis" | "simulation" | "table" | "optimization";
  title?: string;
  description?: string;
  steps?: LoadingStep[];
  className?: string;
}

const DEFAULT_CONFIGS = {
  analysis: {
    title: "Analyzing Data",
    description: "Processing your request...",
    steps: [
      { text: "Loading data sources", delay: "0s" },
      { text: "Running calculations", delay: "0.2s" },
      { text: "Preparing results", delay: "0.4s" },
    ],
  },
  simulation: {
    title: "Running Simulation",
    description: "Optimizing team selections and calculating outcomes...",
    steps: [
      { text: "Analyzing player pool", delay: "0s" },
      { text: "Running optimization algorithm", delay: "0.2s" },
      { text: "Calculating projected points", delay: "0.4s" },
    ],
  },
  table: {
    title: "Loading Table Data",
    description: "Fetching and organizing information...",
    steps: [
      { text: "Connecting to data source", delay: "0s" },
      { text: "Loading records", delay: "0.2s" },
      { text: "Formatting display", delay: "0.4s" },
    ],
  },
  optimization: {
    title: "Optimizing Team",
    description: "Finding the best possible combinations...",
    steps: [
      { text: "Evaluating constraints", delay: "0s" },
      { text: "Testing formations", delay: "0.2s" },
      { text: "Maximizing points", delay: "0.4s" },
    ],
  },
};

export function LoadingExperience({
  variant = "analysis",
  title,
  description,
  steps,
  className = "",
}: LoadingExperienceProps) {
  const config = DEFAULT_CONFIGS[variant];
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalSteps = steps || config.steps;

  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <Card className="w-full max-w-md shadow-lg border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            {finalTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">{finalDescription}</p>
            {finalSteps && finalSteps.length > 0 && (
              <div className="space-y-2 text-sm text-gray-500">
                {finalSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse"
                      style={{ animationDelay: step.delay || `${index * 0.2}s` }}
                    ></div>
                    <span>{step.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
