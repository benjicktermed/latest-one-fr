import { useState, useEffect, useRef } from "react";
import { Key, Plus, Trash2, RotateCcw, Copy, Check, Clock, Infinity, Monitor, Lock, Delete } from "lucide-react";

const ADMIN_PIN = "021114";

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = (d: string) => {
    if (digits.length >= 6) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 6) {
      if (next.join("") === ADMIN_PIN) {
        sessionStorage.setItem("admin_unlocked", "1");
        onUnlock();
      } else {
        setShake(true);
        timeoutRef.current = setTimeout(() => {
          setDigits([]);
          setShake(false);
        }, 600);
      }
    }
  };

  const pop = () => setDigits((prev) => prev.slice(0, -1));

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const PAD = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-1">
          <Lock className="w-5 h-5 text-purple-400" />
        </div>
        <h1 className="font-bold text-lg">Admin Access</h1>
        <p className="text-sm text-muted-foreground">Enter your PIN to continue</p>
      </div>

      <div className={`flex gap-3 ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
              i < digits.length
                ? shake ? "bg-red-400 border-red-400" : "bg-purple-400 border-purple-400"
                : "bg-transparent border-border"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 w-64">
        {PAD.map((k, i) => {
          if (k === "") return <div key={i} />;
          if (k === "⌫") return (
            <button
              key={i}
              onClick={pop}
              className="h-14 rounded-2xl bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/80 flex items-center justify-center transition-all active:scale-95"
            >
              <Delete className="w-4 h-4" />
            </button>
          );
          return (
            <button
              key={i}
              onClick={() => push(k)}
              className="h-14 rounded-2xl bg-card border border-border font-bold text-lg hover:bg-secondary/60 hover:border-purple-500/40 transition-all active:scale-95"
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Duration = "1day" | "1week" | "1month" | "1year" | "lifetime";

interface KeyEntry {
  id: number;
  key: string;
  label: string | null;
  duration: string;
  expiresAt: string | null;
  expired: boolean;
  deviceCount: number;
  registeredHwid: string | null;
  createdAt: string;
}

const DURATIONS: { value: Duration; label: string; desc: string; color: string }[] = [
  { value: "1day",     label: "1 Day",    desc: "Expires in 24h",      color: "bg-orange-500/10 border-orange-500/30 text-orange-400" },
  { value: "1week",    label: "1 Week",   desc: "Expires in 7 days",   color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" },
  { value: "1month",   label: "1 Month",  desc: "Expires in 30 days",  color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  { value: "1year",    label: "1 Year",   desc: "Expires in 365 days", color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
  { value: "lifetime", label: "Lifetime", desc: "Never expires",       color: "bg-green-500/10 border-green-500/30 text-green-400" },
];

function durationColor(duration: string) {
  return DURATIONS.find((d) => d.value === duration)?.color ?? "bg-secondary text-muted-foreground border-border";
}

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeLeft(iso: string | null): string {
  if (!iso) return "∞";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m left`;
}

export default function Admin() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("admin_unlocked") === "1");
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<Duration>("lifetime");
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<KeyEntry & { durationLabel?: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [resetingKey, setResetingKey] = useState<string | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keys/list");
      const data = await res.json() as { keys?: KeyEntry[] };
      setKeys(data.keys ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    setNewKey(null);
    try {
      const res = await fetch("/api/keys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined, duration: selectedDuration }),
      });
      const data = await res.json() as { success?: boolean; key?: string; id?: number; duration?: string; durationLabel?: string; expiresAt?: string | null; createdAt?: string };
      if (data.key) {
        setNewKey({
          id: data.id!,
          key: data.key,
          label: label.trim() || null,
          duration: data.duration ?? selectedDuration,
          durationLabel: data.durationLabel,
          expiresAt: data.expiresAt ?? null,
          expired: false,
          deviceCount: 0,
          registeredHwid: null,
          createdAt: data.createdAt ?? new Date().toISOString(),
        });
        setLabel("");
        await fetchKeys();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`/api/keys/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      if (newKey?.id === id) setNewKey(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetHwid = async (key: string) => {
    setResetingKey(key);
    try {
      await fetch("/api/keys/reset-hwid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      await fetchKeys();
    } finally {
      setResetingKey(null);
    }
  };

  const activeKeys  = keys.filter((k) => !k.expired);
  const expiredKeys = keys.filter((k) => k.expired);

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-6 h-14 bg-background border-b border-border">
        <Key className="w-4 h-4 text-primary" />
        <span className="font-bold text-sm">Adonis HuB — Key Manager</span>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {activeKeys.length} active · {expiredKeys.length} expired
        </span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Create Key Panel */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-bold text-base mb-5 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Generate New Key
          </h2>

          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">Duration</p>
          <div className="grid grid-cols-5 gap-2 mb-5">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setSelectedDuration(d.value)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-all ${
                  selectedDuration === d.value
                    ? d.color + " ring-2 ring-primary/40 scale-[1.03]"
                    : "bg-background border-border text-muted-foreground hover:bg-secondary/30"
                }`}
              >
                {d.value === "lifetime"
                  ? <Infinity className="w-4 h-4" />
                  : <Clock className="w-4 h-4" />}
                <span className="text-xs font-bold leading-tight">{d.label}</span>
                <span className="text-[9px] leading-tight opacity-70">{d.desc}</span>
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">Label (optional)</p>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. VIP user, Discord member…"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold px-5 rounded-lg transition-colors flex items-center gap-2"
            >
              {creating
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Plus className="w-4 h-4" />}
              Generate
            </button>
          </div>

          {newKey && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/25 rounded-xl">
              <p className="text-xs text-green-400 font-semibold mb-2 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Key created!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm text-white bg-black/30 px-3 py-2 rounded-lg overflow-x-auto">
                  {newKey.key}
                </code>
                <button onClick={() => handleCopy(newKey.key)} className="shrink-0 p-2 rounded-lg bg-black/20 hover:bg-black/40 transition-colors">
                  {copied === newKey.key ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Duration: <span className="text-white font-medium">{DURATIONS.find(d => d.value === newKey.duration)?.label ?? newKey.duration}</span>
                {newKey.expiresAt && <> · Expires: <span className="text-white font-medium">{formatDate(newKey.expiresAt)}</span></>}
              </p>
            </div>
          )}
        </div>

        {/* Keys list */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-sm">All Keys</h2>
            <button onClick={fetchKeys} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : keys.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No keys yet. Generate one above.</div>
          ) : (
            <div className="divide-y divide-border">
              {keys.map((k) => (
                <div key={k.id} className={`px-5 py-4 ${k.expired ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${durationColor(k.duration)}`}>
                          {DURATIONS.find(d => d.value === k.duration)?.label ?? k.duration}
                        </span>
                        {k.expired && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
                            Expired
                          </span>
                        )}
                        {k.registeredHwid && !k.expired && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary">
                            Locked
                          </span>
                        )}
                        {!k.registeredHwid && !k.expired && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                            Free
                          </span>
                        )}
                        {k.label && <span className="text-[10px] text-muted-foreground">{k.label}</span>}
                      </div>

                      <div className="flex items-center gap-2 mb-1.5">
                        <code className="text-xs font-mono text-foreground truncate">{k.key}</code>
                        <button onClick={() => handleCopy(k.key)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                          {copied === k.key ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {k.registeredHwid && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Monitor className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-[11px] text-muted-foreground">Device:</span>
                          <span className="text-[11px] font-mono text-foreground">{k.registeredHwid}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-muted-foreground">
                        {k.expiresAt
                          ? <span className={k.expired ? "text-red-400" : ""}>{timeLeft(k.expiresAt)}</span>
                          : "Never expires"}
                        {" · "}Created {formatDate(k.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleResetHwid(k.key)}
                        disabled={resetingKey === k.key || !k.registeredHwid}
                        title={k.registeredHwid ? "Reset HWID — free this key from its device" : "No device registered"}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {resetingKey === k.key
                          ? <span className="w-3.5 h-3.5 border border-primary/40 border-t-primary rounded-full animate-spin block" />
                          : <RotateCcw className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(k.id)}
                        disabled={deletingId === k.id}
                        title="Delete key"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        {deletingId === k.id
                          ? <span className="w-3.5 h-3.5 border border-red-400/40 border-t-red-400 rounded-full animate-spin block" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
