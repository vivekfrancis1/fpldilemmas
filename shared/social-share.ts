// Links for posting a shareable image to social networks. The web has no way to attach an image from a link, so the
// app copies (or saves) the image first and these links open each network's composer with the caption and the page
// link; Instagram has no web composer at all.

export type SocialNetwork = "x" | "facebook" | "instagram" | "whatsapp" | "telegram" | "linkedin";

export const SOCIAL_NETWORKS: Array<{ id: SocialNetwork; label: string }> = [
  { id: "x", label: "X" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telegram", label: "Telegram" },
  { id: "linkedin", label: "LinkedIn" },
];

const SITE = "fpldilemmas.com";
const MAX_CAPTION = 200;
// X counts every link as 23 characters, plus the space before it, inside the 280 limit.
const X_LIMIT = 280;
const X_LINK = 23;

/** A ready-to-post caption for a graphic: its name, the site and the FPL hashtags. */
export function defaultCaption(title: string): string {
  const tags = "#FPL #FantasyPremierLeague";
  const tail = ` · ${SITE} ${tags}`;
  const room = MAX_CAPTION - tail.length;
  const name = title.length > room ? `${title.slice(0, Math.max(0, room - 1))}…` : title;
  return `${name}${tail}`;
}

/** The caption cut (with an ellipsis) so that caption + space + link fits in an X post. */
export function xCaption(caption: string, _url: string): string {
  const max = X_LIMIT - X_LINK - 1;
  return caption.length <= max ? caption : `${caption.slice(0, max - 1)}…`;
}

/** The composer link for each network; null where there is no web composer (Instagram). */
export function buildShareLinks(input: { caption: string; url: string }): Record<SocialNetwork, string | null> {
  const { caption, url } = input;
  const q = (params: Record<string, string>) => new URLSearchParams(params).toString();
  return {
    x: `https://x.com/intent/post?${q({ text: xCaption(caption, url), url })}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?${q({ u: url })}`,
    instagram: null,
    whatsapp: `https://wa.me/?${q({ text: `${caption} ${url}` })}`,
    telegram: `https://t.me/share/url?${q({ url, text: caption })}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?${q({ url })}`,
  };
}
