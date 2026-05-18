import { createContext, useContext, useState, ReactNode } from "react";

export interface RobloxProfile {
  id: number;
  name: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface KeyInfo {
  key: string;
  label: string | null;
  durationLabel: string;
  duration: string;
  expiresAt: string | null;
}

export interface SelectedGame {
  universeId: number;
  placeId: number;
  name: string;
  iconUrl: string | null;
  thumbnailUrl: string | null;
}

interface AppState {
  username: string;
  balance: number;
  isLoggedIn: boolean;
  keyVerified: boolean;
  profile: RobloxProfile | null;
  keyInfo: KeyInfo | null;
  selectedGame: SelectedGame | null;
  isPremium: boolean;
  setUsername: (u: string) => void;
  setBalance: (b: number) => void;
  setProfile: (p: RobloxProfile | null) => void;
  setKeyInfo: (k: KeyInfo | null) => void;
  setSelectedGame: (g: SelectedGame | null) => void;
  setIsPremium: (v: boolean) => void;
  logout: () => void;
}

const AppContext = createContext<AppState | null>(null);

const FAKE_FRIENDS = [
  { id: 1, name: "Zyrexo", handle: "zyrexo", color: "#e74c3c" },
  { id: 2, name: "Nokzy", handle: "nokzy", color: "#3498db" },
  { id: 3, name: "Veltrix", handle: "veltrix", color: "#2ecc71" },
  { id: 4, name: "Drakyz", handle: "drakyz", color: "#9b59b6" },
  { id: 5, name: "Skyvex", handle: "skyvex", color: "#e67e22" },
  { id: 6, name: "Cruxen", handle: "cruxen", color: "#1abc9c" },
  { id: 7, name: "Phlynx", handle: "phlynx", color: "#f39c12" },
  { id: 8, name: "Orbize", handle: "orbize", color: "#e91e63" },
];

export { FAKE_FRIENDS };

function loadKeyInfo(): KeyInfo | null {
  try {
    const raw = localStorage.getItem("__key_info__");
    return raw ? (JSON.parse(raw) as KeyInfo) : null;
  } catch {
    return null;
  }
}

function loadProfile(): RobloxProfile | null {
  try {
    const raw = localStorage.getItem("__profile__");
    return raw ? (JSON.parse(raw) as RobloxProfile) : null;
  } catch {
    return null;
  }
}

function loadSelectedGame(): SelectedGame | null {
  try {
    const raw = localStorage.getItem("__selected_game__");
    return raw ? (JSON.parse(raw) as SelectedGame) : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [username, setUsernameState] = useState(() => localStorage.getItem("__username__") ?? "");
  const [balance, setBalance] = useState(0);
  const [profile, setProfileState] = useState<RobloxProfile | null>(loadProfile);
  const [keyInfo, setKeyInfoState] = useState<KeyInfo | null>(loadKeyInfo);
  const [selectedGame, setSelectedGameState] = useState<SelectedGame | null>(loadSelectedGame);
  const [isPremium, setIsPremiumState] = useState<boolean>(
    () => localStorage.getItem("__is_premium__") === "1"
  );

  const keyVerified = keyInfo !== null;
  const isLoggedIn = keyVerified;

  const setUsername = (u: string) => {
    setUsernameState(u);
    if (u) localStorage.setItem("__username__", u);
    else localStorage.removeItem("__username__");
  };

  const setProfile = (p: RobloxProfile | null) => {
    setProfileState(p);
    if (p) localStorage.setItem("__profile__", JSON.stringify(p));
    else localStorage.removeItem("__profile__");
  };

  const setKeyInfo = (k: KeyInfo | null) => {
    setKeyInfoState(k);
    if (k) {
      localStorage.setItem("__key_info__", JSON.stringify(k));
      localStorage.setItem("__access_key__", k.key);
    } else {
      localStorage.removeItem("__key_info__");
      localStorage.removeItem("__access_key__");
    }
  };

  const setSelectedGame = (g: SelectedGame | null) => {
    setSelectedGameState(g);
    if (g) localStorage.setItem("__selected_game__", JSON.stringify(g));
    else localStorage.removeItem("__selected_game__");
  };

  const setIsPremium = (v: boolean) => {
    setIsPremiumState(v);
    if (v) localStorage.setItem("__is_premium__", "1");
    else localStorage.removeItem("__is_premium__");
  };

  const logout = () => {
    setUsernameState("");
    setBalance(0);
    setProfileState(null);
    setKeyInfoState(null);
    localStorage.removeItem("__username__");
    localStorage.removeItem("__profile__");
    localStorage.removeItem("__key_info__");
    localStorage.removeItem("__access_key__");
    localStorage.removeItem("__hwid__");
  };

  return (
    <AppContext.Provider value={{
      username, balance, isLoggedIn, keyVerified, profile, keyInfo, selectedGame, isPremium,
      setUsername, setBalance, setProfile, setKeyInfo, setSelectedGame, setIsPremium, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
