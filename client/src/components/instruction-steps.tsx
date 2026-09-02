import { ReactNode } from "react";

// A numbered, connected step list — used for the Connect FPL dialog's setup steps and the
// "Find your Manager ID" card, so both share one visual language instead of a plain <ol><li>.
export function InstructionSteps({ children }: { children: ReactNode }) {
  return <ol className="list-none p-0 m-0">{children}</ol>;
}

export function InstructionStep({
  number,
  isLast,
  children,
}: {
  number: number;
  isLast?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!isLast && (
        <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" aria-hidden="true" />
      )}
      <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
        {number}
      </span>
      <div className="pt-0.5 text-xs sm:text-sm leading-relaxed min-w-0">{children}</div>
    </li>
  );
}
