import { Router } from "express";

const robloxRouter = Router();

const ROBLOX_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.roblox.com/",
  "Origin": "https://www.roblox.com",
};

interface CacheEntry<T> { value: T; expiresAt: number }
class TtlCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  constructor(private ttlMs: number) {}
  get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.map.delete(key); return null; }
    return entry.value;
  }
  set(key: string, value: T) {
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.map.size > 500) {
      const now = Date.now();
      for (const [k, v] of this.map) { if (now > v.expiresAt) this.map.delete(k); }
    }
  }
}

interface RobloxUser { id: number; name: string; displayName: string; avatarUrl: string | null }

const searchCache  = new TtlCache<RobloxUser[]>(60_000);
const userCache    = new TtlCache<RobloxUser>(120_000);
const profileCache = new TtlCache<object>(120_000);
interface FriendsResult { friends: RobloxUser[]; totalCount: number }
const friendsCache = new TtlCache<FriendsResult>(120_000);
const cdnUrlCache  = new TtlCache<string>(300_000);

async function fetchAvatarCdnUrls(ids: number[]): Promise<Record<number, string>> {
  if (ids.length === 0) return {};
  const cdnMap: Record<number, string> = {};
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
  await Promise.all(chunks.map(async (chunk) => {
    try {
      const res = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${chunk.join(",")}&size=150x150&format=Png&isCircular=false`,
        { headers: ROBLOX_HEADERS }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { data: Array<{ targetId: number; state: string; imageUrl: string }> };
      for (const t of data.data ?? []) {
        if (t.state === "Completed" && t.imageUrl) {
          cdnMap[t.targetId] = t.imageUrl;
          cdnUrlCache.set(String(t.targetId), t.imageUrl);
        }
      }
    } catch { /* skip chunk on error */ }
  }));
  return cdnMap;
}

async function fetchAvatars(ids: number[]): Promise<Record<number, string>> {
  const cdnMap = await fetchAvatarCdnUrls(ids);
  const proxyMap: Record<number, string> = {};
  for (const [id] of Object.entries(cdnMap)) {
    proxyMap[Number(id)] = `/api/roblox/avatar?userId=${id}`;
  }
  return proxyMap;
}

async function lookupByUsername(username: string): Promise<RobloxUser | null> {
  const cached = userCache.get(username.toLowerCase());
  if (cached) return cached;
  try {
    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: ROBLOX_HEADERS,
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data: Array<{ id: number; name: string; displayName: string }> };
    if (!data.data?.length) return null;
    const u = data.data[0];
    const avatarMap = await fetchAvatars([u.id]);
    const result: RobloxUser = { id: u.id, name: u.name, displayName: u.displayName, avatarUrl: avatarMap[u.id] ?? null };
    userCache.set(username.toLowerCase(), result);
    return result;
  } catch { return null; }
}

robloxRouter.get("/roblox/user", async (req, res) => {
  const { username } = req.query;
  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "username is required" });
    return;
  }
  try {
    const user = await lookupByUsername(username.trim());
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    let description: string | null = null;
    let created: string | null = null;
    try {
      const det = await fetch(`https://users.roblox.com/v1/users/${user.id}`, { headers: ROBLOX_HEADERS });
      if (det.ok) {
        const d = (await det.json()) as { description?: string; created?: string };
        description = d.description ?? null;
        created = d.created ?? null;
      }
    } catch { /* non-fatal */ }

    res.json({ ...user, description, created });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

robloxRouter.get("/roblox/search", async (req, res) => {
  const { keyword } = req.query;
  if (!keyword || typeof keyword !== "string" || keyword.trim().length < 2) {
    res.status(400).json({ error: "keyword must be at least 2 characters" });
    return;
  }
  const kw = keyword.trim().toLowerCase();

  const cached = searchCache.get(kw);
  if (cached) { res.json({ users: cached }); return; }

  try {
    const searchRes = await fetch(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(kw)}&limit=10`,
      { headers: ROBLOX_HEADERS }
    );

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as { data: Array<{ id: number; name: string; displayName: string }> };
      if (searchData.data?.length) {
        const ids = searchData.data.map((u) => u.id);
        const avatarMap = await fetchAvatars(ids);
        const users: RobloxUser[] = searchData.data.map((u) => ({
          id: u.id,
          name: u.name ?? "",
          displayName: u.displayName ?? u.name ?? "",
          avatarUrl: avatarMap[u.id] ?? null,
        }));
        searchCache.set(kw, users);
        res.json({ users });
        return;
      }
    }

    req.log.warn({ status: searchRes.status }, "Search API failed — falling back to username lookup");
    const fallback = await lookupByUsername(kw);
    if (fallback) {
      const users = [fallback];
      searchCache.set(kw, users);
      res.json({ users });
    } else {
      res.json({ users: [] });
    }
  } catch (err) {
    req.log.error(err);
    try {
      const fallback = await lookupByUsername(kw);
      res.json({ users: fallback ? [fallback] : [] });
    } catch {
      res.status(502).json({ error: "Roblox API unavailable. Try again in a moment." });
    }
  }
});

robloxRouter.get("/roblox/profile", async (req, res) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const cached = profileCache.get(userId);
  if (cached) { res.json(cached); return; }

  try {
    const [detailRes, friendsRes, followersRes, followingRes] = await Promise.allSettled([
      fetch(`https://users.roblox.com/v1/users/${userId}`, { headers: ROBLOX_HEADERS }),
      fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`, { headers: ROBLOX_HEADERS }),
      fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`, { headers: ROBLOX_HEADERS }),
      fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`, { headers: ROBLOX_HEADERS }),
    ]);

    let description: string | null = null;
    let created: string | null = null;
    if (detailRes.status === "fulfilled" && detailRes.value.ok) {
      const d = (await detailRes.value.json()) as { description?: string; created?: string };
      description = d.description ?? null;
      created = d.created ?? null;
    }

    const getCount = async (r: PromiseSettledResult<Response>): Promise<number> => {
      if (r.status !== "fulfilled" || !r.value.ok) return 0;
      try { return ((await r.value.json()) as { count?: number }).count ?? 0; } catch { return 0; }
    };

    const [friendCount, followerCount, followingCount] = await Promise.all([
      getCount(friendsRes), getCount(followersRes), getCount(followingRes),
    ]);

    const profile = { description, created, friendCount, followerCount, followingCount };
    profileCache.set(userId, profile);
    res.json(profile);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

robloxRouter.get("/roblox/cdn-image", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") { res.status(400).end(); return; }
  let parsed: URL;
  try { parsed = new URL(url); } catch { res.status(400).end(); return; }
  const allowed = ["tr.rbxcdn.com", "thumbnails.roblox.com", "t7.rbxcdn.com"];
  if (!allowed.some((h) => parsed.hostname === h)) { res.status(403).end(); return; }
  try {
    const imgRes = await fetch(url, {
      headers: { "User-Agent": ROBLOX_HEADERS["User-Agent"], "Referer": "https://www.roblox.com/" },
    });
    if (!imgRes.ok) { res.status(502).end(); return; }
    res.setHeader("Content-Type", imgRes.headers.get("content-type") ?? "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(Buffer.from(await imgRes.arrayBuffer()));
  } catch { res.status(502).end(); }
});

robloxRouter.get("/roblox/avatar", async (req, res) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    res.status(400).end(); return;
  }

  let cdnUrl = cdnUrlCache.get(userId);

  if (!cdnUrl) {
    const cdnMap = await fetchAvatarCdnUrls([Number(userId)]);
    cdnUrl = cdnMap[Number(userId)] ?? null;
  }

  if (!cdnUrl) {
    res.status(404).end(); return;
  }

  try {
    const imgRes = await fetch(cdnUrl, {
      headers: {
        "User-Agent": ROBLOX_HEADERS["User-Agent"],
        "Referer": "https://www.roblox.com/",
      },
    });
    if (!imgRes.ok) { res.status(502).end(); return; }

    const contentType = imgRes.headers.get("content-type") ?? "image/png";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=300");

    const buf = await imgRes.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err) {
    req.log.error(err);
    res.status(502).end();
  }
});

robloxRouter.get("/roblox/friends", async (req, res) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const cached = friendsCache.get(userId);
  if (cached) { res.json(cached); return; }

  try {
    const [friendsRes, countRes] = await Promise.all([
      fetch(`https://friends.roblox.com/v1/users/${userId}/friends`, { headers: ROBLOX_HEADERS }),
      fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`, { headers: ROBLOX_HEADERS }),
    ]);

    let totalCount = 0;
    if (countRes.ok) {
      try { totalCount = ((await countRes.json()) as { count?: number }).count ?? 0; } catch { /* ignore */ }
    }

    if (!friendsRes.ok) {
      res.json({ friends: [], totalCount });
      return;
    }

    const data = (await friendsRes.json()) as {
      data: Array<{ id: number; name?: string; displayName?: string }>;
    };

    const friendList = data.data ?? [];
    if (friendList.length === 0) {
      const result = { friends: [], totalCount };
      friendsCache.set(userId, result);
      res.json(result);
      return;
    }

    const ids = friendList.map((u) => u.id);

    let nameMap: Record<number, { name: string; displayName: string }> = {};
    try {
      const batchRes = await fetch("https://users.roblox.com/v1/users", {
        method: "POST",
        headers: ROBLOX_HEADERS,
        body: JSON.stringify({ userIds: ids, excludeBannedUsers: false }),
      });
      if (batchRes.ok) {
        const batchData = (await batchRes.json()) as {
          data: Array<{ id: number; name: string; displayName: string }>;
        };
        for (const u of batchData.data ?? []) {
          nameMap[u.id] = { name: u.name, displayName: u.displayName };
        }
      }
    } catch { /* fall through */ }

    const avatarMap = await fetchAvatars(ids);

    const friends: RobloxUser[] = friendList.map((u) => {
      const details = nameMap[u.id];
      const name = details?.name ?? u.name ?? "";
      const displayName = details?.displayName ?? u.displayName ?? name;
      return { id: u.id, name, displayName, avatarUrl: avatarMap[u.id] ?? null };
    });

    if (totalCount === 0) totalCount = friends.length;

    const result = { friends, totalCount };
    friendsCache.set(userId, result);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

interface GameSearchResult {
  universeId: number;
  name: string;
  iconUrl: string | null;
  thumbnailUrl: string | null;
  playerCount: number;
  placeId: number;
}

const gameSearchCache = new TtlCache<GameSearchResult[]>(90_000);

async function fetchGameThumbnails(universeIds: number[]): Promise<Record<number, { icon: string | null; thumbnail: string | null }>> {
  if (universeIds.length === 0) return {};
  const result: Record<number, { icon: string | null; thumbnail: string | null }> = {};
  for (const id of universeIds) result[id] = { icon: null, thumbnail: null };

  await Promise.allSettled([
    // Game icons (square)
    fetch(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(",")}&size=256x256&format=Png&isCircular=false`,
      { headers: ROBLOX_HEADERS }
    ).then((r) => {
      if (!r.ok) return;
      return r.json().then((data: { data: Array<{ targetId: number; state: string; imageUrl: string }> }) => {
        for (const t of data.data ?? []) {
          if (t.state === "Completed" && t.imageUrl && result[t.targetId]) {
            result[t.targetId].icon = `/api/roblox/proxy-image?url=${encodeURIComponent(t.imageUrl)}`;
          }
        }
      });
    }),
    // Game thumbnails (wide banner)
    fetch(
      `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeIds.join(",")}&thumbnailType=GameThumbnail&size=768x432&format=Png&isCircular=false`,
      { headers: ROBLOX_HEADERS }
    ).then((r) => {
      if (!r.ok) return;
      return r.json().then((data: { data: Array<{ universeId: number; thumbnails: Array<{ state: string; imageUrl: string }> }> }) => {
        for (const entry of data.data ?? []) {
          const thumb = entry.thumbnails?.find((t) => t.state === "Completed" && t.imageUrl);
          if (thumb && result[entry.universeId]) {
            result[entry.universeId].thumbnail = `/api/roblox/proxy-image?url=${encodeURIComponent(thumb.imageUrl)}`;
          }
        }
      });
    }),
  ]);

  return result;
}

const gameLookupCache = new TtlCache<GameSearchResult>(300_000);

function extractPlaceId(input: string): number | null {
  const trimmed = input.trim();
  // Direct numeric place ID
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  // Roblox URL: roblox.com/games/PLACEID/...
  const urlMatch = trimmed.match(/roblox\.com\/games\/(\d+)/i);
  if (urlMatch) return parseInt(urlMatch[1], 10);
  return null;
}

robloxRouter.get("/roblox/games/lookup", async (req, res) => {
  const { input } = req.query;
  if (!input || typeof input !== "string" || !input.trim()) {
    res.status(400).json({ error: "input is required" });
    return;
  }

  const placeId = extractPlaceId(input.trim());
  if (!placeId) {
    res.status(400).json({ error: "Enter a valid Roblox game URL or place ID (the number in the URL)" });
    return;
  }

  const cacheKey = String(placeId);
  const cached = gameLookupCache.get(cacheKey);
  if (cached) { res.json({ game: cached }); return; }

  const getHeaders = {
    "User-Agent": ROBLOX_HEADERS["User-Agent"],
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.roblox.com/",
  };

  try {
    // Step 1: place ID → universe ID
    const universeRes = await fetch(
      `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
      { headers: getHeaders }
    );
    if (!universeRes.ok) {
      res.status(404).json({ error: "Game not found. Check the place ID or URL." });
      return;
    }
    const { universeId } = (await universeRes.json()) as { universeId: number };
    if (!universeId) {
      res.status(404).json({ error: "Game not found." });
      return;
    }

    // Step 2: fetch game name + player count (parallel with thumbnails)
    const [detailsRes, thumbMap] = await Promise.all([
      fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, { headers: getHeaders })
        .then((r) => r.ok ? r.json() as Promise<{ data?: Array<{ id: number; rootPlaceId: number; name: string; playerCount: number }> }> : null)
        .catch(() => null),
      fetchGameThumbnails([universeId]),
    ]);

    const detail = detailsRes?.data?.[0];
    const game: GameSearchResult = {
      universeId,
      name: detail?.name ?? "Unknown Game",
      playerCount: detail?.playerCount ?? 0,
      placeId: detail?.rootPlaceId ?? placeId,
      iconUrl: thumbMap[universeId]?.icon ?? null,
      thumbnailUrl: thumbMap[universeId]?.thumbnail ?? null,
    };

    gameLookupCache.set(cacheKey, game);
    res.json({ game });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

interface GamePass {
  id: number;
  name: string;
  price: number | null;
  isForSale: boolean;
  iconUrl: string | null;
}

const gamepassCache = new TtlCache<GamePass[]>(120_000);

robloxRouter.get("/roblox/games/gamepasses", async (req, res) => {
  const { universeId } = req.query;
  if (!universeId || typeof universeId !== "string") {
    res.status(400).json({ error: "universeId is required" });
    return;
  }

  const cached = gamepassCache.get(universeId);
  if (cached) { res.json({ gamepasses: cached }); return; }

  try {
    // The Roblox game-passes API requires authentication and blocks cloud server IPs.
    // Return noData so the frontend can show the direct Roblox store link instead.
    gamepassCache.set(universeId, []);
    res.json({ gamepasses: [], noData: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Generic image proxy (for game thumbnails returned by the games search)
robloxRouter.get("/roblox/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") { res.status(400).end(); return; }
  let parsed: URL;
  try { parsed = new URL(url); } catch { res.status(400).end(); return; }
  const allowed = ["tr.rbxcdn.com", "thumbnails.roblox.com", "t7.rbxcdn.com", "rbxcdn.com"];
  if (!allowed.some((h) => parsed.hostname === h || parsed.hostname.endsWith("." + h))) {
    res.status(403).end(); return;
  }
  try {
    const imgRes = await fetch(url, {
      headers: { "User-Agent": ROBLOX_HEADERS["User-Agent"], "Referer": "https://www.roblox.com/" },
    });
    if (!imgRes.ok) { res.status(502).end(); return; }
    res.setHeader("Content-Type", imgRes.headers.get("content-type") ?? "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(Buffer.from(await imgRes.arrayBuffer()));
  } catch { res.status(502).end(); }
});

export default robloxRouter;
