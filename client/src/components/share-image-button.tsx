import { useEffect, useRef, useState, type ReactNode } from "react";
import { toPng } from "html-to-image";
import { prepareFontEmbedCSS } from "@/lib/render-png";
import { ChevronDown, Copy, Download, Facebook, Instagram, Link2, Linkedin, MessageCircle, Send, Share2, type LucideIcon } from "lucide-react";
import type { ShareCard } from "@shared/share-cards";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SOCIAL_NETWORKS, buildShareLinks, defaultCaption, type SocialNetwork } from "@shared/social-share";
import { composeLinkCard, sharePath, uploadLinkCard } from "@/lib/share-link";

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

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const NETWORK_ICON: Record<SocialNetwork, LucideIcon | typeof XIcon> = {
  x: XIcon,
  facebook: Facebook,
  instagram: Instagram,
  whatsapp: MessageCircle,
  telegram: Send,
  linkedin: Linkedin,
};

/**
 * "Share image": makes the image once when the menu opens, then offers to post it to X, Facebook, Instagram, WhatsApp,
 * Telegram or LinkedIn, share it through the device's share sheet, copy it, or download it. A link cannot attach an
 * image, so for the networks the image is copied to the clipboard first and the composer opens with the caption and the
 * page link: the person pastes the image into the post. Instagram has no web composer: the image is saved (or sent to
 * the Instagram app through the device share sheet on a phone).
 *
 * Either a text card (`getCard`, drawn by CardFace) or a fully custom face (`renderCard`, e.g. the player plot).
 */
export function ShareImageButton({
  getCard,
  renderCard,
  title,
  width = SIZE,
  height = SIZE,
  fileName,
  caption,
  className,
}: {
  getCard?: () => ShareCard;
  renderCard?: () => ReactNode;
  title?: string;
  width?: number;
  height?: number;
  fileName: string;
  /** Text for the post; defaults to the graphic's title, the site and the FPL hashtags. */
  caption?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<{ blob: Blob; title: string } | null>(null);
  // The card exists in the DOM only while an image is being made, and its content is built on open, so pages that
  // never use Share pay nothing for it.
  const [card, setCard] = useState<{ node: ReactNode; title: string } | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  // The short link whose preview shows this graphic (made in the background once the image exists).
  const linkRef = useRef<Promise<string | null> | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);

  // work out the font embedding in the background, so the first image does not have to wait for it
  useEffect(() => {
    const t = setTimeout(() => void prepareFontEmbedCSS().catch(() => undefined), 1500);
    return () => clearTimeout(t);
  }, []);

  // notes ("Image copied...") fade after a few seconds
  useEffect(() => {
    if (!message?.ok) return;
    const t = setTimeout(() => setMessage(null), 8000);
    return () => clearTimeout(t);
  }, [message]);

  const make = async () => {
    setBusy(true);
    setMessage(null);
    // a fresh image and link every time: the page may have changed (plot settings, selected players...). The link is
    // reset here rather than on close, because choosing an item closes the menu before its action has finished.
    linkRef.current = null;
    setShortUrl(null);
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
      // fonts are embedded from a trimmed, cached copy (worked out once): re-embedding the site's whole font stylesheet took ~4 s per image
      const fontEmbedCSS = await prepareFontEmbedCSS().catch(() => undefined);
      const dataUrl = await toPng(ref.current, { width, height, pixelRatio: 1, cacheBust: true, ...(fontEmbedCSS !== undefined ? { fontEmbedCSS } : {}) });
      const blob = await (await fetch(dataUrl)).blob();
      setImage({ blob, title: built.title });
      // Link preview: a 1200x630 card of the graphic is saved on the server and gets a short link (/g/<id>). Posts that use
      // it show the graphic itself on X, Facebook and WhatsApp. If anything fails the page link is used instead.
      linkRef.current = (async () => {
        try {
          const card = await composeLinkCard(blob);
          const url = await uploadLinkCard(card, { title: built.title, target: sharePath(window.location) });
          setShortUrl(url);
          return url;
        } catch {
          return null;
        }
      })();
    } catch {
      setMessage({ text: "Couldn't create the image. Please try again.", ok: false });
    } finally {
      setCard(null);
      setBusy(false);
    }
  };

  const onOpenChange = (open: boolean) => {
    if (open) {
      if (!busy) void make();
    } else {
      setImage(null);
    }
  };

  const file = image ? new File([image.blob], fileName, { type: "image/png" }) : null;
  const canNativeShare = !!file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  const postCaption = () => caption ?? defaultCaption(image?.title ?? title ?? "FPL Dilemmas");
  const pageUrl = () => (typeof window !== "undefined" ? window.location.href : "https://fpldilemmas.com");
  /** The preview short link when it is ready (waits a moment for it), otherwise the page's own link. */
  const resolveLink = async (): Promise<{ url: string; preview: boolean }> => {
    const pending = linkRef.current ?? Promise.resolve(null);
    const short = await Promise.race([pending, new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))]);
    return short ? { url: short, preview: true } : { url: pageUrl(), preview: false };
  };

  const download = () => {
    if (!image) return;
    const url = URL.createObjectURL(image.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyImage = async (): Promise<boolean> => {
    if (!image) return false;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image.blob })]);
      return true;
    } catch {
      return false;
    }
  };

  const nativeShare = async () => {
    if (!file || !image) return;
    try {
      await navigator.share({ files: [file], title: image.title, text: postCaption() });
    } catch (error) {
      // closing the share sheet is not an error
      if (!(error instanceof DOMException && error.name === "AbortError")) setMessage({ text: "Couldn't open the share sheet.", ok: false });
    }
  };

  const post = async (network: SocialNetwork) => {
    if (!image) return;
    if (network === "instagram") {
      // no web composer: on a phone the share sheet reaches the Instagram app; otherwise save the image
      if (canNativeShare) return nativeShare();
      download();
      setMessage({ text: "Image saved. Open Instagram and add it from your photos.", ok: true });
      return;
    }
    // Open the tab now, while the click still counts (browsers block pop-ups opened after a wait), then point it at the composer.
    const tab = window.open("about:blank", "_blank");
    const copied = await copyImage();
    const { url, preview } = await resolveLink();
    const link = buildShareLinks({ caption: postCaption(), url })[network]!;
    if (tab) {
      tab.opener = null;
      tab.location.href = link;
    } else {
      window.open(link, "_blank", "noopener,noreferrer");
    }
    setMessage({
      text: preview
        ? `The link will show your graphic in the post${copied ? ". The image is copied too, if you would rather attach it." : "."}`
        : copied
          ? "Image copied. Paste it into your post (Ctrl/Cmd+V)."
          : "Couldn't copy the image. Use Download image, then attach it to your post.",
      ok: preview || copied,
    });
  };

  const copyLink = async () => {
    const { url, preview } = await resolveLink();
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ text: preview ? "Link copied. Pasting it shows your graphic as a preview." : "Link copied.", ok: true });
    } catch {
      setMessage({ text: "Your browser blocked copying the link.", ok: false });
    }
  };

  const copyOnly = async () => {
    const ok = await copyImage();
    setMessage({ text: ok ? "Image copied. Paste it anywhere." : "Your browser blocked copying. Use Download image instead.", ok });
  };

  return (
    <>
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={`gap-2 ${className ?? ""}`} data-testid="button-share-image">
            <Share2 className="h-4 w-4" />
            <span className="sm:hidden">Share</span>
            <span className="hidden sm:inline">Share image</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60" data-testid="share-menu">
          <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {busy ? "Preparing your image…" : image ? "Post to" : "Couldn't prepare the image"}
          </DropdownMenuLabel>
          {SOCIAL_NETWORKS.map((n) => {
            const Icon = NETWORK_ICON[n.id];
            return (
              <DropdownMenuItem key={n.id} disabled={!image} onSelect={() => void post(n.id)} className="gap-2.5" data-testid={`share-${n.id}`}>
                <Icon className="h-4 w-4" />
                {n.label}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          {canNativeShare && (
            <DropdownMenuItem disabled={!image} onSelect={() => void nativeShare()} className="gap-2.5" data-testid="share-device">
              <Share2 className="h-4 w-4" /> Share via your device…
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={!image} onSelect={() => void copyLink()} className="gap-2.5" data-testid="share-copy-link">
            <Link2 className="h-4 w-4" /> {shortUrl ? "Copy link (shows a preview)" : "Copy link"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!image} onSelect={() => void copyOnly()} className="gap-2.5" data-testid="share-copy">
            <Copy className="h-4 w-4" /> Copy image
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!image} onSelect={download} className="gap-2.5" data-testid="share-download">
            <Download className="h-4 w-4" /> Download image
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {message && (
        <span className={`text-xs ${message.ok ? "text-emerald-600" : "text-red-600"}`} role="status" data-testid="share-message">
          {message.text}
        </span>
      )}
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
