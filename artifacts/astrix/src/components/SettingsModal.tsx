import { useState, useEffect, useRef } from "react";
import { X, Settings, Loader2, Clock, Infinity, Gamepad2, Check, RotateCcw, Link, Ticket, Crown } from "lucide-react";
import { useApp, type SelectedGame } from "@/context/AppContext";
import premiumIcon from "@assets/image-removebg-preview_1778900165065.png";
import verifiedBadge from "@assets/image-removebg-preview_(1)_1778900210032.png";
import { useLocation } from "wouter";

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "Never expires";
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (days > 0) return `Expires ${dateStr} (${days}d ${hours}h left)`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `Expires soon — ${hours}h ${mins}m left`;
}

interface GameResult {
  universeId: number;
  name: string;
  iconUrl: string | null;
  thumbnailUrl: string | null;
  playerCount: number;
  placeId: number;
}

interface GamePass {
  id: number;
  name: string;
  price: number | null;
  isForSale: boolean;
  iconUrl: string | null;
}

export default function SettingsModal({ open, onClose }: Props) {
  const { username, balance, profile, keyInfo, selectedGame, isPremium, setUsername, setBalance, setProfile, setSelectedGame, setIsPremium, logout } = useApp();
  const [, navigate] = useLocation();

  const [loginInput, setLoginInput] = useState(username);
  const [balanceInput, setBalanceInput] = useState(String(balance));
  const [balanceSaved, setBalanceSaved] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Game lookup state
  const [gameInput, setGameInput] = useState("");
  const [gameLooking, setGameLooking] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const [gameSaved, setGameSaved] = useState(false);
  const [previewGame, setPreviewGame] = useState<GameResult | null>(null);
  const gameInputRef = useRef<HTMLInputElement>(null);

  // Gamepass state
  const [gamepasses, setGamepasses] = useState<GamePass[]>([]);
  const [gamepassLoading, setGamepassLoading] = useState(false);
  const [gamepassNoData, setGamepassNoData] = useState(false);

  useEffect(() => {
    if (open) {
      setLoginInput(username);
      setBalanceInput(String(balance));
      setGameInput("");
      setGameError(null);
      setPreviewGame(null);
      setGamepasses([]);
      setGamepassNoData(false);
    }
  }, [open, username, balance]);

  // Load gamepasses for the currently selected game on open
  useEffect(() => {
    if (open && selectedGame && gamepasses.length === 0 && !gamepassNoData) {
      setGamepassLoading(true);
      fetch(`/api/roblox/games/gamepasses?universeId=${selectedGame.universeId}`)
        .then((r) => r.json())
        .then((data: { gamepasses?: GamePass[]; noData?: boolean }) => {
          setGamepasses(data.gamepasses ?? []);
          setGamepassNoData(data.noData ?? false);
        })
        .catch(() => setGamepassNoData(true))
        .finally(() => setGamepassLoading(false));
    }
  }, [open, selectedGame]);

  if (!open) return null;

  const handleSwitch = async () => {
    const trimmed = loginInput.trim();
    if (!trimmed) return;
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch(`/api/roblox/user?username=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setLoginError(data.error ?? "User not found");
        return;
      }
      const data = await res.json() as { id: number; name: string; displayName: string; avatarUrl: string | null };
      setProfile({ id: data.id, name: data.name, displayName: data.displayName, avatarUrl: data.avatarUrl });
      setUsername(data.name);
    } catch {
      setLoginError("Failed to reach Roblox API");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSaveBalance = () => {
    const n = parseInt(balanceInput.replace(/,/g, ""), 10);
    if (!isNaN(n)) {
      setBalance(n);
      setBalanceSaved(true);
      setTimeout(() => setBalanceSaved(false), 2000);
    }
  };

  const handleGameLookup = async () => {
    const trimmed = gameInput.trim();
    if (!trimmed || gameLooking) return;
    setGameLooking(true);
    setGameError(null);
    setPreviewGame(null);
    try {
      const res = await fetch(`/api/roblox/games/lookup?input=${encodeURIComponent(trimmed)}`);
      const data = await res.json() as { game?: GameResult; error?: string };
      if (!res.ok || !data.game) {
        setGameError(data.error ?? "Game not found. Check the URL or place ID.");
        return;
      }
      setPreviewGame(data.game);
    } catch {
      setGameError("Could not reach the server. Try again.");
    } finally {
      setGameLooking(false);
    }
  };

  const handleSelectGame = (game: GameResult) => {
    const g: SelectedGame = {
      universeId: game.universeId,
      placeId: game.placeId,
      name: game.name,
      iconUrl: game.iconUrl,
      thumbnailUrl: game.thumbnailUrl,
    };
    setSelectedGame(g);
    setPreviewGame(null);
    setGameInput("");
    setGameError(null);
    setGameSaved(true);
    setTimeout(() => setGameSaved(false), 2000);

    // Fetch gamepasses for the newly selected game
    setGamepasses([]);
    setGamepassNoData(false);
    setGamepassLoading(true);
    fetch(`/api/roblox/games/gamepasses?universeId=${game.universeId}`)
      .then((r) => r.json())
      .then((data: { gamepasses?: GamePass[]; noData?: boolean }) => {
        setGamepasses(data.gamepasses ?? []);
        setGamepassNoData(data.noData ?? false);
      })
      .catch(() => setGamepassNoData(true))
      .finally(() => setGamepassLoading(false));
  };

  const handleResetGame = () => {
    setSelectedGame(null);
    setGameInput("");
    setPreviewGame(null);
    setGameError(null);
    setGamepasses([]);
    setGamepassNoData(false);
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate("/login");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2 font-bold text-base">
            <Settings className="w-4 h-4 text-muted-foreground" />
            Settings
          </div>
          <button onClick={onClose} className="hover:text-foreground text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* Roblox Account */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
              Roblox Account
            </p>
            {profile && (
              <div className="flex items-center gap-3 mb-3 p-3 bg-background rounded-xl border border-border">
                <div className="relative shrink-0">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
                      {profile.name[0].toUpperCase()}
                    </div>
                  )}
                  {isPremium && (
                    <img
                      src={premiumIcon}
                      alt="Premium"
                      className="absolute -bottom-1 -right-1 w-4 h-4"
                    />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">{profile.displayName}</p>
                    {isPremium && (
                      <img src={verifiedBadge} alt="Verified" className="w-4 h-4" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">@{profile.name}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={loginInput}
                onChange={(e) => { setLoginInput(e.target.value); setLoginError(null); }}
                placeholder="Enter Roblox username"
                onKeyDown={(e) => e.key === "Enter" && handleSwitch()}
                disabled={loginLoading}
              />
              <button
                onClick={handleSwitch}
                disabled={loginLoading || !loginInput.trim()}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold px-4 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {loginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loginLoading ? "Loading…" : "Switch"}
              </button>
            </div>
            {loginError && <p className="text-xs text-red-400 mt-2">{loginError}</p>}
          </div>

          {/* Robux Balance */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
              Robux Balance
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                placeholder="Enter balance"
                type="number"
                min={0}
              />
              <button
                onClick={handleSaveBalance}
                className={`text-sm font-semibold px-4 rounded-lg transition-colors ${
                  balanceSaved ? "bg-green-600 text-white" : "bg-secondary hover:bg-secondary/80 text-foreground"
                }`}
              >
                {balanceSaved ? "Saved!" : "Save"}
              </button>
            </div>
          </div>

          {/* Banner Game */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5" />
              Banner Game
            </p>

            {/* Currently selected */}
            {selectedGame && !gameSaved && (
              <div className="flex items-center gap-3 mb-3 p-3 bg-background rounded-xl border border-border group">
                {selectedGame.iconUrl ? (
                  <img
                    src={selectedGame.iconUrl}
                    alt={selectedGame.name}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{selectedGame.name}</p>
                  <p className="text-xs text-muted-foreground">Active banner game</p>
                </div>
                <button
                  onClick={handleResetGame}
                  title="Reset to default"
                  className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {gameSaved && (
              <div className="flex items-center gap-2 mb-3 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400">
                <Check className="w-3.5 h-3.5 shrink-0" />
                Banner updated! Reload the home page to see it.
              </div>
            )}

            {/* Gamepasses for selected game */}
            {selectedGame && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                  <Ticket className="w-3 h-3" />
                  Game Passes
                </p>
                {gamepassLoading ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading game passes…
                  </div>
                ) : gamepasses.length > 0 ? (
                  <>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
                      {gamepasses.map((gp) => (
                        <div
                          key={gp.id}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-background border border-border"
                        >
                          {gp.iconUrl ? (
                            <img
                              src={gp.iconUrl}
                              alt={gp.name}
                              className="w-8 h-8 rounded-lg object-cover shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                              <Ticket className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{gp.name}</p>
                            {!gp.isForSale ? (
                              <p className="text-[11px] text-muted-foreground">Not for sale</p>
                            ) : gp.price !== null ? (
                              <p className="text-[11px] text-yellow-400 font-semibold">R$ {gp.price.toLocaleString()}</p>
                            ) : (
                              <p className="text-[11px] text-green-400 font-semibold">Free</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedGame.placeId && (
                      <a
                        href={`https://www.roblox.com/games/${selectedGame.placeId}/store#!/store`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                      >
                        <Ticket className="w-3 h-3" />
                        View all passes on Roblox
                      </a>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Game passes can't be fetched server-side — Roblox restricts this API to browsers.
                    </p>
                    {selectedGame.placeId && (
                      <a
                        href={`https://www.roblox.com/games/${selectedGame.placeId}/store#!/store`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        View Game Passes on Roblox →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {!selectedGame && !gameSaved && (
              <p className="text-xs text-muted-foreground mb-3">
                Default banner active (Steal a Brainrot). Paste a game URL below to change it.
              </p>
            )}

            {/* URL / Place ID input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={gameInputRef}
                  className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="roblox.com/games/… or place ID"
                  value={gameInput}
                  onChange={(e) => { setGameInput(e.target.value); setGameError(null); setPreviewGame(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleGameLookup()}
                  disabled={gameLooking}
                />
              </div>
              <button
                onClick={handleGameLookup}
                disabled={gameLooking || !gameInput.trim()}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold px-4 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                {gameLooking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {gameLooking ? "…" : "Look up"}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1.5 px-0.5">
              Paste a Roblox game URL or the place ID number from the URL
            </p>

            {gameError && (
              <p className="text-xs text-red-400 mt-2">{gameError}</p>
            )}

            {/* Preview result */}
            {previewGame && (
              <div className="mt-3 rounded-xl border border-border bg-background overflow-hidden">
                {/* Banner thumbnail preview */}
                {previewGame.thumbnailUrl && (
                  <div className="relative h-[60px] overflow-hidden bg-[#15171e]">
                    <img
                      src={previewGame.thumbnailUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ objectPosition: "center 30%" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }} />
                  </div>
                )}
                <div className="flex items-center gap-3 px-3 py-3">
                  {previewGame.iconUrl ? (
                    <img
                      src={previewGame.iconUrl}
                      alt={previewGame.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{previewGame.name}</p>
                    {previewGame.playerCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {previewGame.playerCount.toLocaleString()} playing now
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleSelectGame(previewGame)}
                    className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3" />
                    Use this
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Premium */}
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              Premium
            </p>
            <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <img src={premiumIcon} alt="Premium" className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">Premium Member</p>
                    {isPremium && (
                      <img src={verifiedBadge} alt="Verified" className="w-4 h-4" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Shows premium &amp; verified badge on your profile</p>
                </div>
              </div>
              <button
                onClick={() => setIsPremium(!isPremium)}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                  isPremium ? "bg-primary" : "bg-secondary"
                }`}
                aria-label="Toggle premium"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    isPremium ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Active Key Info */}
          {keyInfo && (
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                Access Key
              </p>
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  {keyInfo.duration === "lifetime"
                    ? <Infinity className="w-3.5 h-3.5 text-green-400" />
                    : <Clock className="w-3.5 h-3.5 text-green-400" />}
                  <p className="text-xs font-semibold text-green-400">
                    {keyInfo.durationLabel}{keyInfo.label ? ` · ${keyInfo.label}` : ""}
                  </p>
                </div>
                <p className="text-xs font-mono text-muted-foreground">{keyInfo.key}</p>
                <p className="text-xs text-muted-foreground">{formatExpiry(keyInfo.expiresAt)}</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Log out
          </button>
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
