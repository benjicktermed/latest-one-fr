import { useState, useEffect, useRef } from "react";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { X, Search, Loader2, Users, UserCheck, UserPlus, Calendar } from "lucide-react";
import { useApp } from "@/context/AppContext";
import robuxIcon from "@/robux-icon-CFocC_-X.png";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = "select" | "amount" | "confirm" | "sending" | "done";

interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
  avatarUrl: string | null;
}

interface RobloxProfile {
  description: string | null;
  created: string | null;
  friendCount: number;
  followerCount: number;
  followingCount: number;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function formatJoinDate(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function fmtRobux(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
}

export default function SendRobuxModal({ open, onClose }: Props) {
  const { balance, setBalance, profile: appProfile } = useApp();
  const [step, setStep] = useState<Step>("select");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RobloxUser | null>(null);
  const [profile, setProfile] = useState<RobloxProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [amount, setAmount] = useState(0);
  const [amountInput, setAmountInput] = useState("0");
  const [results, setResults] = useState<RobloxUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [friends, setFriends] = useState<RobloxUser[]>([]);
  const [friendsTotal, setFriendsTotal] = useState<number | null>(null);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 900);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open || !appProfile?.id) return;
    setFriendsLoading(true);
    fetch(`/api/roblox/friends?userId=${appProfile.id}`)
      .then((r) => r.json())
      .then((data: { friends?: RobloxUser[]; totalCount?: number; error?: string }) => {
        setFriends(data.friends ?? []);
        setFriendsTotal(data.totalCount ?? null);
      })
      .catch(() => { setFriends([]); setFriendsTotal(null); })
      .finally(() => setFriendsLoading(false));
  }, [open, appProfile?.id]);

  useEffect(() => {
    if (!open) return;
    if (debouncedSearch.trim().length < 2) { setResults([]); setSearchError(null); return; }
    setSearching(true);
    setSearchError(null);
    fetch(`/api/roblox/search?keyword=${encodeURIComponent(debouncedSearch.trim())}`)
      .then((r) => r.json())
      .then((data: { users?: RobloxUser[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setResults(data.users ?? []);
      })
      .catch((e: Error) => { setSearchError(e.message ?? "Search failed"); setResults([]); })
      .finally(() => setSearching(false));
  }, [debouncedSearch, open]);

  const handleSelectUser = (u: RobloxUser) => {
    setSelected(u);
    setStep("amount");
    setAmount(0);
    setAmountInput("0");
    setProfile(null);
  };

  const handleQuickAmount = (n: number) => {
    setAmount(n);
    setAmountInput(String(n));
  };

  const handleNext = async () => {
    if (amount <= 0 || amount > balance) return;
    setStep("confirm");
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/roblox/profile?userId=${selected!.id}`);
      if (res.ok) setProfile(await res.json() as RobloxProfile);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSend = () => {
    setStep("sending");
    setTimeout(() => {
      setBalance(Math.max(0, balance - amount));
      setStep("done");
    }, 2000);
  };

  const handleClose = () => {
    setStep("select"); setSearch(""); setResults([]);
    setSelected(null); setProfile(null);
    setAmount(0); setAmountInput("0");
    onClose();
  };

  if (!open) return null;

  const showSearch = search.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-[400px] bg-[#1a1c24] border border-[#2a2d3a] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#2a2d3a]">
          <div className="flex items-center gap-2 font-bold text-base text-white">
            <img src={robuxIcon} alt="Robux" className="w-4 h-4" />
            Send Robux
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <img src={robuxIcon} alt="Robux" className="w-4 h-4" />
              {fmtRobux(balance)}
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {step === "select" && (
          <div className="px-4 pb-5 pt-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
              <input
                ref={searchRef}
                className="w-full bg-transparent border border-[#3b82f6] rounded-xl h-10 pl-9 pr-9 text-sm text-white placeholder-gray-400 focus:outline-none"
                placeholder="Search by username"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {showSearch && (
              <>
                <p className="text-sm font-semibold text-white mb-3 px-1">
                  Results ({results.length})
                </p>
                <div className="space-y-0.5 max-h-60 overflow-y-auto">
                  {!searching && searchError && <p className="text-center text-sm text-red-400 py-6">{searchError}</p>}
                  {!searching && !searchError && results.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No users found</p>}
                  {results.map((u) => (
                    <button key={u.id} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-left" onClick={() => handleSelectUser(u)}>
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} alt={u.name} className="w-9 h-9 rounded-full object-cover shrink-0 bg-[#2a2d3a]" />
                        : <div className="w-9 h-9 rounded-full bg-[#2a2d3a] flex items-center justify-center text-white text-sm font-bold shrink-0">{u.name?.[0]?.toUpperCase() ?? "?"}</div>}
                      <div>
                        <p className="text-sm text-white font-medium">{u.name}</p>
                        {u.displayName && u.displayName !== u.name && <p className="text-xs text-gray-400">{u.displayName}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {!showSearch && (
              <>
                <p className="text-sm font-semibold text-white mb-3 px-1 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#3b82f6]" />
                  Friends
                  {!appProfile
                    ? <span className="text-xs text-gray-500 font-normal">(set username in settings)</span>
                    : friendsTotal !== null
                      ? <span className="text-xs text-gray-400 font-normal">{friends.length} / {friendsTotal}</span>
                      : friendsLoading
                        ? null
                        : <span className="text-xs text-gray-400 font-normal">{friends.length}</span>
                  }
                </p>
                <div className="space-y-0.5 max-h-60 overflow-y-auto">
                  {friendsLoading && (
                    <div className="flex items-center justify-center py-6 gap-2 text-gray-500 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading friends…
                    </div>
                  )}
                  {!friendsLoading && !appProfile && (
                    <p className="text-center text-sm text-gray-500 py-6">Set your Roblox username in Settings to see friends here</p>
                  )}
                  {!friendsLoading && appProfile && friends.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-6">No friends found</p>
                  )}
                  {!friendsLoading && friends.map((u) => (
                    <button key={u.id} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-left" onClick={() => handleSelectUser(u)}>
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} alt={u.name} className="w-9 h-9 rounded-full object-cover shrink-0 bg-[#2a2d3a]" />
                        : <div className="w-9 h-9 rounded-full bg-[#2a2d3a] flex items-center justify-center text-white text-sm font-bold shrink-0">{u.name?.[0]?.toUpperCase() ?? "?"}</div>}
                      <div>
                        <p className="text-sm text-white font-medium">{u.name}</p>
                        {u.displayName && u.displayName !== u.name && <p className="text-xs text-gray-400">{u.displayName}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {step === "amount" && selected && (
          <div className="px-6 py-6 flex flex-col items-center">
            {selected.avatarUrl
              ? <img src={selected.avatarUrl} alt={selected.name} className="w-20 h-20 rounded-full object-cover mb-3 bg-[#2a2d3a]" />
              : <div className="w-20 h-20 rounded-full bg-[#2a2d3a] flex items-center justify-center text-white text-3xl font-bold mb-3">{selected.name?.[0]?.toUpperCase() ?? "?"}</div>}
            <p className="font-bold text-lg text-white">{selected.displayName || selected.name}</p>
            <p className="text-sm text-gray-400 mb-6">@{selected.name}</p>

            <div className="flex items-center gap-2 mb-4">
              <img src={robuxIcon} alt="Robux" className="w-5 h-5" />
              <input
                className="text-2xl font-bold bg-transparent border-none outline-none text-center text-white w-32"
                value={amountInput}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setAmountInput(v || "0"); setAmount(parseInt(v || "0", 10)); }}
                inputMode="numeric"
              />
            </div>

            <div className="flex gap-2 mb-6">
              {[25, 50, 100, 200].map((n) => (
                <button key={n} onClick={() => handleQuickAmount(n)}
                  className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${amount === n ? "bg-[#3b82f6] text-white border-[#3b82f6]" : "border-[#2a2d3a] text-white hover:bg-white/5"}`}>
                  <img src={robuxIcon} alt="" className="w-3 h-3" />{n}
                </button>
              ))}
            </div>

            <button onClick={handleNext} disabled={amount <= 0 || amount > balance}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors mb-3">
              Next
            </button>
            <p className="text-xs text-gray-400">Robux are sent instantly with no fees</p>
            <button onClick={() => { setStep("select"); setSelected(null); }} className="text-xs text-gray-400 hover:text-white mt-3 transition-colors">← Back</button>
          </div>
        )}

        {step === "confirm" && selected && (
          <div className="px-6 py-6 flex flex-col items-center">
            <div className="relative mb-3">
              {selected.avatarUrl
                ? <img src={selected.avatarUrl} alt={selected.name} className="w-20 h-20 rounded-full object-cover bg-[#2a2d3a] ring-2 ring-[#3b82f6]/40" />
                : <div className="w-20 h-20 rounded-full bg-[#2a2d3a] flex items-center justify-center text-white text-3xl font-bold ring-2 ring-[#3b82f6]/40">{selected.name?.[0]?.toUpperCase() ?? "?"}</div>}
            </div>

            <p className="font-bold text-lg text-white">{selected.displayName || selected.name}</p>
            <p className="text-sm text-gray-400 mb-1">@{selected.name}</p>

            {profileLoading ? (
              <div className="flex items-center gap-2 text-gray-500 text-xs mt-2 mb-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading profile…
              </div>
            ) : profile ? (
              <>
                {profile.description && (
                  <p className="text-xs text-gray-400 text-center mt-1 mb-3 max-w-[280px] line-clamp-2 leading-relaxed">
                    {profile.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mb-4 mt-1">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1 text-white font-bold text-sm">
                      <Users className="w-3.5 h-3.5 text-[#3b82f6]" />
                      {formatCount(profile.friendCount)}
                    </div>
                    <span className="text-[10px] text-gray-500">Friends</span>
                  </div>
                  <div className="w-px h-8 bg-[#2a2d3a]" />
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1 text-white font-bold text-sm">
                      <UserCheck className="w-3.5 h-3.5 text-[#3b82f6]" />
                      {formatCount(profile.followerCount)}
                    </div>
                    <span className="text-[10px] text-gray-500">Followers</span>
                  </div>
                  <div className="w-px h-8 bg-[#2a2d3a]" />
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1 text-white font-bold text-sm">
                      <UserPlus className="w-3.5 h-3.5 text-[#3b82f6]" />
                      {formatCount(profile.followingCount)}
                    </div>
                    <span className="text-[10px] text-gray-500">Following</span>
                  </div>
                  <div className="w-px h-8 bg-[#2a2d3a]" />
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1 text-white font-bold text-sm">
                      <Calendar className="w-3.5 h-3.5 text-[#3b82f6]" />
                      <span className="text-xs">{formatJoinDate(profile.created)}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Joined</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="mb-3" />
            )}

            <div className="flex items-center gap-2 py-3 px-5 bg-[#1a1c24] rounded-xl mb-5">
              <img src={robuxIcon} alt="Robux" className="w-5 h-5" />
              <span className="text-xl font-bold text-white">{fmtRobux(amount)}</span>
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={handleSend}
                className="flex-[2] bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                Send
              </button>
              <button onClick={() => setStep("amount")}
                className="flex-1 border border-[#2a2d3a] hover:bg-white/5 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                Edit
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">Robux are sent instantly with no fees</p>
          </div>
        )}

        {step === "sending" && (
          <div className="px-6 py-12 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
            <p className="font-semibold text-white">Sending Robux…</p>
            <p className="text-sm text-gray-400">Please wait</p>
          </div>
        )}

        {step === "done" && selected && (
          <div className="px-6 py-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xl font-bold text-white">Robux Sent!</p>
            <p className="text-sm text-gray-400 text-center">
              You sent <span className="text-white font-semibold">{fmtRobux(amount)} Robux</span>{" "}
              to <span className="text-white font-semibold">{selected.name}</span>
            </p>
            <button onClick={handleClose} className="mt-4 bg-[#2a2d3a] hover:bg-[#333648] px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
