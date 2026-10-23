/** Only known YouTube hosts are embedded. Arbitrary links are never fetched. */
export function youtubeVideo(
  url: string | null,
): { id: string; start: number } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password || u.port)
      return null;
    const host = u.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else
        id =
          u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1] ||
          null;
    }
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    const raw = u.searchParams.get("t") || u.searchParams.get("start") || "0";
    const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    const seconds = /^\d+$/.test(raw)
      ? Number(raw)
      : match
        ? Number(match[1] || 0) * 3600 +
          Number(match[2] || 0) * 60 +
          Number(match[3] || 0)
        : 0;
    return { id, start: Math.min(seconds, 86400) };
  } catch {
    return null;
  }
}
export function nextVote(score: number, current: number, selected: number) {
  const value = current === selected ? 0 : selected;
  return { score: score - current + value, value };
}
