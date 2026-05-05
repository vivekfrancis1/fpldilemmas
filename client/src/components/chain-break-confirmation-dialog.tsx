import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ChainBreakPayload {
  transferIndex: number;
  gwId: number;
  transferName: string;
  dependentTransfers: string[];
  dependentPlayerPairs: { outPlayerId: number; inPlayerId: number; depGwId: number }[];
  crossGwDependents: Array<{ gwId: number; transferIndex: number }>;
}

interface ChainBreakConfirmationDialogProps {
  confirmation: ChainBreakPayload | null;
  onCancel: () => void;
  onUndoWithDependents: (transferIndex: number, gwId: number, crossGwDependents: Array<{ gwId: number; transferIndex: number }>) => void;
  onUndoAnywayHandlers: {
    handleUndoSingle: (transferIndex: number, gwId: number) => void;
    setBrokenTransfers: (updater: (prev: { gwId: number; outPlayerId: number; inPlayerId: number }[]) => { gwId: number; outPlayerId: number; inPlayerId: number }[]) => void;
    toast: (opts: { title: string; description: string; variant?: string }) => void;
  };
}

export function ChainBreakConfirmationDialog({
  confirmation,
  onCancel,
  onUndoWithDependents,
  onUndoAnywayHandlers,
}: ChainBreakConfirmationDialogProps) {
  const totalCount = confirmation ? confirmation.dependentTransfers.length + 1 : 0;
  const sameGwPairs = confirmation
    ? confirmation.dependentPlayerPairs
        .map((pair, i) => ({ pair, name: confirmation.dependentTransfers[i] }))
        .filter(({ pair }) => pair.depGwId === confirmation.gwId)
    : [];
  const crossGwItems = confirmation
    ? confirmation.dependentPlayerPairs
        .map((pair, i) => ({ pair, name: confirmation.dependentTransfers[i] }))
        .filter(({ pair }) => pair.depGwId !== confirmation.gwId)
    : [];
  const byGw = crossGwItems.reduce<Record<number, string[]>>((acc, { pair, name }) => {
    if (!acc[pair.depGwId]) acc[pair.depGwId] = [];
    acc[pair.depGwId].push(name.replace(/^GW\d+:\s*/, ""));
    return acc;
  }, {});
  const showUndoAnyway = !!confirmation && confirmation.crossGwDependents.length === 0;

  return (
    <AlertDialog open={!!confirmation} onOpenChange={onCancel}>
      <AlertDialogContent className="z-[100]">
        <AlertDialogHeader>
          <AlertDialogTitle>Dependent Transfer Detected</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Undoing <strong>{confirmation?.transferName}</strong> will break a transfer chain.
                The following {totalCount} transfers will be removed:
              </p>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  GW {confirmation?.gwId} — transfers to remove
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">{confirmation?.transferName}</span>{" "}
                    <span className="text-xs">(this transfer)</span>
                  </li>
                  {sameGwPairs.map(({ name }, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              </div>

              {crossGwItems.length > 0 &&
                Object.entries(byGw)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([futureGwId, names]) => (
                    <div key={futureGwId}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
                        GW {futureGwId} — future gameweek affected
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {names.map((name, i) => (
                          <li key={i}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  ))}

              <p className="text-muted-foreground">
                <strong>Undo This &amp; Dependents</strong> will remove all {totalCount} transfers listed above.
                {showUndoAnyway && (
                  <>
                    <br />
                    <strong>Undo Anyway</strong> will remove only this transfer; the dependent transfer
                    {confirmation && confirmation.dependentTransfers.length > 1 ? "s" : ""} will remain but may produce unexpected results.
                  </>
                )}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (confirmation) {
                onUndoWithDependents(confirmation.transferIndex, confirmation.gwId, confirmation.crossGwDependents);
                onCancel();
              }
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Undo This & Dependents ({totalCount})
          </AlertDialogAction>
          {showUndoAnyway && (
            <AlertDialogAction
              onClick={() => {
                if (confirmation) {
                  const { transferIndex, gwId, dependentTransfers, dependentPlayerPairs } = confirmation;
                  onUndoAnywayHandlers.handleUndoSingle(transferIndex, gwId);
                  const newBroken = dependentPlayerPairs.map(pair => ({
                    gwId: pair.depGwId,
                    outPlayerId: pair.outPlayerId,
                    inPlayerId: pair.inPlayerId,
                  }));
                  onUndoAnywayHandlers.setBrokenTransfers(prev => [...prev, ...newBroken]);
                  onUndoAnywayHandlers.toast({
                    title: "Warning: Squad May Be Broken",
                    description: `${dependentTransfers.length} dependent transfer${dependentTransfers.length > 1 ? "s" : ""} still reference${dependentTransfers.length === 1 ? "s" : ""} players that may no longer be in your squad. Review the highlighted transfer${dependentTransfers.length > 1 ? "s" : ""} below.`,
                    variant: "destructive",
                  });
                  onCancel();
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Undo Anyway
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
