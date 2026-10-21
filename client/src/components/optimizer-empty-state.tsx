import { Sparkles } from "lucide-react";

/** Shown beside the optimiser controls until a squad has been generated. */
export default function OptimizerEmptyState({ label }: { label: string }) {
  return (
    <div
      className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/60 px-8 py-24 text-center"
      data-testid="optimizer-empty-state"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Sparkles className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Your {label} will appear here</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        Choose your options on the left, then run the optimiser to build the highest-scoring squad.
      </p>
    </div>
  );
}
