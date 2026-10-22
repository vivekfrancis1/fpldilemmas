import { useRef, useState, type ReactNode } from "react";
import { toPng } from "html-to-image";
import { Share2 } from "lucide-react";
import type { ShareCard } from "@shared/share-cards";
import { Button } from "@/components/ui/button";

const SIZE = 1080;

// The card is drawn at a fixed size with plain inline styles (not theme tokens), off-screen, so the exported
// image looks the same in light and dark mode and on every device.
function CardFace({ card }: { card: ShareCard }) {
  // Dense cards (e.g. an 11-player XI) use smaller rows so everything fits the square
  const lines = card.sections.reduce((n, sec) => n + sec.rows.length + (sec.heading ? 1 : 0), 0);
  const compact = lines > 10;
  const rowFont = compact ? 28 : 34;
  const rowLine = compact ? 1.3 : 1.45;
  const gap = compact ? 10 : 18;
  return (
    <div
      style={{
        width: SIZE, height: SIZE, boxSizing: "border-box", padding: 64, display: "flex", flexDirection: "column",
        background: "linear-gradient(160deg, #312e81 0%, #4f46e5 100%)", color: "#ffffff",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.85, letterSpacing: 1 }}>FPL DILEMMAS</div>
      <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, marginTop: 12 }}>{card.title}</div>
      <div style={{ fontSize: 30, opacity: 0.85, marginTop: 10 }}>{card.subtitle}</div>
      <div style={{ flex: 1, marginTop: 36, background: "rgba(255,255,255,0.12)", borderRadius: 28, padding: "28px 36px", overflow: "hidden" }}>
        {card.sections.map((section, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 0 : gap }}>
            {section.heading && <div style={{ fontSize: compact ? 20 : 22, fontWeight: 700, opacity: 0.7, marginBottom: 2 }}>{section.heading}</div>}
            {section.rows.map((row, k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 24, fontSize: rowFont, fontWeight: 600, lineHeight: rowLine }}>
                <span>{row.left}</span>
                <span style={{ opacity: 0.9 }}>{row.right}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 24, opacity: 0.8, marginTop: 24 }}>{card.footer}</div>
    </div>
  );
}

/** Either a text card (`getCard`, drawn by CardFace) or a fully custom face (`renderCard`, e.g. the player plot). */
export function ShareImageButton({
  getCard,
  renderCard,
  title,
  width = SIZE,
  height = SIZE,
  fileName,
  className,
}: {
  getCard?: () => ShareCard;
  renderCard?: () => ReactNode;
  title?: string;
  width?: number;
  height?: number;
  fileName: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  // The card exists in the DOM only while an image is being made, and its content is built on click, so pages that
  // never use Share pay nothing for it.
  const [card, setCard] = useState<{ node: ReactNode; title: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      let built: { node: ReactNode; title: string };
      if (renderCard) {
        built = { node: renderCard(), title: title ?? "FPL Dilemmas" };
      } else {
        const textCard = getCard!();
        built = { node: <CardFace card={textCard} />, title: textCard.title };
      }
      setCard(built);
      // wait for the offscreen card to be laid out
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!ref.current) throw new Error("card not rendered");
      const dataUrl = await toPng(ref.current, { width, height, pixelRatio: 1, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: built.title });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      // The person closing the share sheet is not an error
      if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("Couldn't create the image. Please try again.");
    } finally {
      setCard(null);
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={share} disabled={busy} className={`gap-2 ${className ?? ""}`} data-testid="button-share-image">
        <Share2 className="h-4 w-4" />
        {busy ? "Preparing…" : (
          <>
            <span className="sm:hidden">Share</span>
            <span className="hidden sm:inline">Share image</span>
          </>
        )}
      </Button>
      {message && <span className="text-xs text-red-600" role="alert">{message}</span>}
      {card && (
        <div aria-hidden="true" style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}>
          <div ref={ref}>
            {card.node}
          </div>
        </div>
      )}
    </>
  );
}
