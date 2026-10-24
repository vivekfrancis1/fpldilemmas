import { Link } from "wouter";
import { ImagePlus } from "lucide-react";

/**
 * "Share image": opens the Graphics Maker on the matching template, already filled in with what the page is showing
 * (the link comes from `matchGraphicLink` in shared/graphics-matches.ts).
 */
export function ShareGraphicLink({ href, label = "Share image", testId, className = "" }: { href: string; label?: string; testId?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-200 ${className}`}
      data-testid={testId}
      title="Make a shareable image of this"
    >
      <ImagePlus className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Link>
  );
}
