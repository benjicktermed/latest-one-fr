import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/context/AppContext";
import { CheckCircle2, XCircle, ShieldAlert, Loader2, Key, Shield } from "lucide-react";

function getHwid(): string {
  const stored = localStorage.getItem("__hwid__");
  if (stored) return stored;
  const nav = window.navigator;
  const raw = [
    nav.userAgent, nav.language,
    screen.width, screen.height, screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency ?? 0,
  ].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
  const hwid = Math.abs(hash).toString(16).padStart(8, "0").toUpperCase();
  localStorage.setItem("__hwid__", hwid);
  return hwid;
}

const PARTICLES = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  x: Math.round((i * 137.5) % 100),
  y: Math.round((i * 97.3) % 100),
  size: [1, 1, 1.5, 1.5, 2, 2, 2.5][i % 7],
  dur: 6 + (i % 9) * 1.4,
  delay: -(i % 11) * 1.1,
  opacity: [0.15, 0.2, 0.25, 0.3, 0.18][i % 5],
}));

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const dots = PARTICLES.map((p) => ({
      x: (p.x / 100) * window.innerWidth,
      y: (p.y / 100) * window.innerHeight,
      baseY: (p.y / 100) * window.innerHeight,
      size: p.size,
      speed: 0.18 + p.size * 0.06,
      amp: 18 + p.id * 3.7,
      phase: p.delay,
      opacity: p.opacity,
    }));

    const t0 = performance.now();

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const d of dots) {
        const y = d.baseY - ((t * d.speed * 60) % (canvas.height + 20));
        const x = d.x + Math.sin(t * 0.5 + d.phase) * d.amp;
        const pulse = 0.6 + 0.4 * Math.sin(t * 1.2 + d.phase);

        ctx.beginPath();
        ctx.arc(x, y < -10 ? y + canvas.height + 20 : y, d.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,197,94,${d.opacity * pulse})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

type KeyStatus = "idle" | "loading" | "valid" | "invalid" | "expired" | "locked";

export default function Login() {
  const [, navigate] = useLocation();
  const { setKeyInfo } = useApp();

  const [keyInput, setKeyInput] = useState("");
  const [status, setStatus] = useState<KeyStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hwid = getHwid();

  const handleVerify = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed || status === "loading") return;
    setStatus("loading");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/keys/verify?key=${encodeURIComponent(trimmed)}&hwid=${encodeURIComponent(hwid)}`);
      const data = await res.json() as {
        valid?: boolean; error?: string; expired?: boolean; locked?: boolean;
        label?: string | null; durationLabel?: string; duration?: string; expiresAt?: string | null;
      };
      if (data.expired) {
        setStatus("expired");
        setErrorMsg("This key has expired. Contact the admin for a new one.");
      } else if (data.locked) {
        setStatus("locked");
        setErrorMsg("This key is locked to another device. Contact admin to reset.");
      } else if (!res.ok || !data.valid) {
        setStatus("invalid");
        setErrorMsg(data.error ?? "Invalid key. Double-check and try again.");
      } else {
        setStatus("valid");
        setKeyInfo({
          key: trimmed,
          label: data.label ?? null,
          durationLabel: data.durationLabel ?? "Lifetime",
          duration: data.duration ?? "lifetime",
          expiresAt: data.expiresAt ?? null,
        });
        setTimeout(() => navigate("/"), 600);
      }
    } catch {
      setStatus("invalid");
      setErrorMsg("Could not reach the server. Try again.");
    }
  };

  const isError = status === "invalid" || status === "expired" || status === "locked";

  return (
    <div className="relative min-h-screen bg-[#080b0e] text-foreground flex flex-col items-center justify-center px-4 overflow-hidden">

      <ParticleCanvas />

      {/* Glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-[120px]"
          style={{
            width: 520, height: 520,
            top: "-140px", left: "50%", transform: "translateX(-50%)",
            background: "radial-gradient(circle, rgba(34,197,94,0.13) 0%, transparent 70%)",
            animation: "pulse-orb 6s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full blur-[90px]"
          style={{
            width: 300, height: 300,
            bottom: "60px", right: "-60px",
            background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
            animation: "pulse-orb 8s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute rounded-full blur-[80px]"
          style={{
            width: 240, height: 240,
            bottom: "80px", left: "-40px",
            background: "radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%)",
            animation: "pulse-orb 7s ease-in-out infinite 2s",
          }}
        />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <style>{`
        @keyframes pulse-orb {
          0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
          50%       { opacity: 1;   transform: translateX(-50%) scale(1.12); }
        }
      `}</style>

      {/* Admin button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur border border-white/10 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-purple-500/40 hover:bg-purple-500/10 transition-all"
        >
          <Shield className="w-3.5 h-3.5" />
          Admin
        </button>
      </div>

      {/* Card */}
      <div className="w-full max-w-xs space-y-7 relative z-10">

        {/* Branding */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.25)",
              boxShadow: "0 0 32px rgba(34,197,94,0.15), inset 0 0 24px rgba(34,197,94,0.05)",
            }}
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-primary" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2.5 5.5v7h3.5v-2.5h2V19H16V8.5h-3v2.5h-2V8.5H7.5z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Adonis HuB</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your access key to continue</p>
          </div>
        </div>

        {/* Key input card */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: "rgba(15,18,23,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.04)",
          }}
        >
          <div className="space-y-2">
            <label className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Access Key
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                spellCheck={false}
                autoComplete="off"
                className={`w-full bg-black/40 border rounded-xl pl-10 pr-4 py-3 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 transition-all placeholder:text-muted-foreground/30 ${
                  isError
                    ? "border-red-500/50 focus:ring-red-500/30"
                    : status === "valid"
                    ? "border-green-500/50 focus:ring-green-500/30"
                    : "border-white/10 focus:ring-primary/30 focus:border-primary/40"
                }`}
                placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setStatus("idle");
                  setErrorMsg(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                disabled={status === "loading" || status === "valid"}
              />
            </div>

            {status === "locked" && (
              <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-orange-400">Device Locked</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This key is bound to another device. Contact admin to reset.</p>
                </div>
              </div>
            )}
            {errorMsg && status !== "locked" && (
              <p className={`text-xs px-1 ${status === "expired" ? "text-orange-400" : "text-red-400"}`}>
                {errorMsg}
              </p>
            )}
            {status === "valid" && (
              <p className="text-xs text-green-400 px-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Key verified — entering…
              </p>
            )}
          </div>

          <button
            onClick={handleVerify}
            disabled={status === "loading" || status === "valid" || !keyInput.trim()}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] ${
              status === "valid"   ? "bg-green-600 text-white" :
              status === "expired" ? "bg-orange-500 text-white" :
              status === "locked"  ? "bg-orange-600 text-white" :
              isError              ? "bg-red-600 hover:bg-red-700 text-white" :
              "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
            style={!isError && status !== "valid" ? { boxShadow: "0 0 24px rgba(34,197,94,0.25)" } : {}}
          >
            {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === "valid"   && <CheckCircle2 className="w-4 h-4" />}
            {status === "locked"  && <ShieldAlert className="w-4 h-4" />}
            {isError && status !== "locked" && <XCircle className="w-4 h-4" />}
            {status === "loading" ? "Verifying…" :
             status === "valid"   ? "Verified!" :
             status === "expired" ? "Key Expired" :
             status === "locked"  ? "Device Locked" :
             isError              ? "Try Again" :
             "Enter"}
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/40">
          Don't have a key? Contact the admin.
        </p>
      </div>
    </div>
  );
}
