import { useState } from "react";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import {
  Bell,
  User,
  MessageCircle,
  Settings,
  Search,
  House,
  CircleUser,
  Users,
  Box,
  ShoppingBag,
  Repeat,
  Palette,
  FileText,
  Store,
  Gift,
  ChevronDown,
  ChevronUp,
  Send,
  Gamepad2,
} from "lucide-react";
import robloxLogo from "@/roblox-logo-DKvbWd-7.png";
import robuxIcon from "@/robux-icon-CFocC_-X.png";
import robloxPlus from "@/roblox-plus-DR1DI8K-.png";
import brainrotBg from "@assets/image_1778659311418.png";
import brainrotIcon from "@assets/image_1778669541463.png";
import premiumIcon from "@assets/image-removebg-preview_1778900165065.png";
import verifiedBadge from "@assets/image-removebg-preview_(1)_1778900210032.png";
import { useApp } from "@/context/AppContext";
import SettingsModal from "@/components/SettingsModal";
import SendRobuxModal from "@/components/SendRobuxModal";
import Avatar from "@/components/Avatar";

function fmtN(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
}

const bonusPackages = [
  { amount: 24000, original: 22500, bonus: 1500, price: "$199.99" },
  { amount: 11000, original: 10000, bonus: 1000, price: "$99.99" },
  { amount: 5250,  original: 4500,  bonus: 750,  price: "$49.99" },
  { amount: 3625,  original: 3150,  bonus: 475,  price: "$34.99" },
  { amount: 2000,  original: 1700,  bonus: 300,  price: "$19.99" },
];

const packages = [
  { amount: 26400, original: 25000, bonus: 1400, price: "$239.99" },
  { amount: 12100, original: 11000, bonus: 1100, price: "$119.99" },
  { amount: 5800, original: 4950, bonus: 850, price: "$59.99" },
  { amount: 4000, original: 3470, bonus: 530, price: "$39.99" },
  { amount: 2200, original: 1870, bonus: 330, price: "$24.99" },
  { amount: 1650, original: 1330, bonus: 320, price: "$15.99" },
  { amount: 1100, original: 880, bonus: 220, price: "$11.99" },
  { amount: 550, original: 440, bonus: 110, price: "$5.99" },
];

const faqs = [
  {
    q: "What are Robux?",
    a: "Robux is the virtual currency used on the Roblox platform. It can be used to purchase in-game items, accessories, avatar upgrades, and more.",
  },
  {
    q: "Where are my Robux?",
    a: "Your Robux balance is shown in the top right corner of your screen. After purchase, Robux are added to your account instantly.",
  },
  {
    q: "Do Robux expire?",
    a: "No, Robux do not expire. Once purchased, they remain in your account indefinitely.",
  },
  {
    q: "How to redeem your gift card?",
    a: "Visit the Roblox gift card redemption page, enter your code, and the Robux will be added to your account immediately.",
  },
];

const sideNavItems = [
  { icon: House, label: "Home" },
  { icon: CircleUser, label: "Profile" },
  { icon: null, label: "Roblox Plus", img: robloxPlus },
  { icon: MessageCircle, label: "Messages", badge: "90" },
  { icon: Users, label: "Friends", badge: "400" },
  { icon: User, label: "Avatar" },
  { icon: Box, label: "Inventory" },
  { icon: ShoppingBag, label: "Sandbox" },
  { icon: Repeat, label: "Trade" },
  { icon: Users, label: "Communities" },
  { icon: Palette, label: "Themes" },
  { icon: FileText, label: "Blog" },
  { icon: Store, label: "Official Store" },
  { icon: Gift, label: "Buy Gift Cards" },
];

export default function Home() {
  const { username, balance, isLoggedIn, selectedGame, isPremium } = useApp();
  const animatedBalance = useAnimatedNumber(balance, 900);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);


  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-6 px-6 h-16 bg-background border-b border-border">
        <button className="flex items-center" aria-label="Home">
          <img src={robloxLogo} alt="Roblox" className="h-9 object-contain" />
        </button>
        <nav className="flex items-center gap-7 text-sm font-medium">
          <a className="hover:text-primary transition-colors cursor-pointer">Home</a>
          <a className="hover:text-primary transition-colors cursor-pointer">Charts</a>
          <a className="hover:text-primary transition-colors cursor-pointer">Marketplace</a>
          <a className="hover:text-primary transition-colors cursor-pointer">Create</a>
          <a className="hover:text-primary transition-colors cursor-pointer">Robux</a>
        </nav>
        <div className="flex-1 max-w-2xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <input
            placeholder="Search"
            className="w-full bg-card border border-border rounded-full h-9 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-center gap-3">
          <Avatar size="sm" />
          <div className="relative cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
              34
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm cursor-pointer">
            <img src={robuxIcon} alt="Robux" className="w-4 h-4" />
            <span>{isLoggedIn ? animatedBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f") : "0"}</span>
          </div>
          <button onClick={() => setSettingsOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-border min-h-[calc(100vh-4rem)] py-4">
          <div className="px-4 pb-3 mb-1 border-b border-border flex items-center gap-3">
            <Avatar size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm truncate">
                  {isLoggedIn ? username : "Not logged in"}
                </span>
                {isPremium && (
                  <>
                    <img src={verifiedBadge} alt="Verified" className="w-4 h-4 shrink-0" />
                    <img src={premiumIcon} alt="Premium" className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  </>
                )}
              </div>
            </div>
          </div>
          <nav className="px-2">
            {sideNavItems.map(({ icon: Icon, label, badge, img }) => (
              <a
                key={label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-card cursor-pointer text-sm transition-colors"
              >
                {img ? (
                  <img src={img} alt="" className="w-5 h-5" />
                ) : Icon ? (
                  <Icon className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                ) : null}
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="text-[11px] bg-card border border-border rounded-full px-2 py-0.5">
                    {badge}
                  </span>
                )}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 px-12 py-10 relative">
          {/* Balance + Send */}
          <div className="absolute right-12 top-6 flex items-center gap-2 bg-[#1e2028] border border-[#2a2d3a] rounded-full px-3 py-1.5">
            <img src={robuxIcon} alt="Robux" className="w-4 h-4" />
            <span className="font-semibold text-sm text-white">{isLoggedIn ? animatedBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f") : "0"}</span>
            <button
              onClick={() => setSendOpen(true)}
              className="ml-1 inline-flex items-center gap-1.5 bg-[#2a2d3a] hover:bg-[#333648] px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors"
            >
              <Send className="w-3 h-3" />
              Send
            </button>
          </div>

          <h1 className="text-center text-5xl font-extrabold tracking-tight mt-8 mb-12 leading-tight">
            Enjoy up to 25%<br />more Robux
          </h1>

          <section className="max-w-3xl mx-auto mb-10">
            <h2 className="text-xl font-bold mb-4">Bonus item we picked for you</h2>
            <div className="rounded-2xl border border-border overflow-hidden shadow-xl">
              {/* Game banner — uses selectedGame if set, otherwise the default brainrot */}
              {selectedGame ? (
                <div className="relative h-[72px] overflow-hidden bg-[#15171e]">
                  {/* Wide thumbnail as background */}
                  {selectedGame.thumbnailUrl ? (
                    <img
                      src={selectedGame.thumbnailUrl}
                      alt=""
                      className="absolute right-0 top-0 h-full w-[60%] object-cover"
                      style={{ objectPosition: "right center" }}
                      draggable={false}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : null}
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to right, #15171e 0%, #15171e 35%, rgba(21,23,30,0.88) 52%, rgba(21,23,30,0.45) 70%, rgba(21,23,30,0.1) 100%)" }}
                  />
                  <div className="relative flex items-center gap-3 h-full px-4">
                    {selectedGame.iconUrl ? (
                      <img
                        src={selectedGame.iconUrl}
                        alt={selectedGame.name}
                        className="w-[54px] h-[54px] rounded-xl object-cover shrink-0"
                        draggable={false}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-[54px] h-[54px] rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Gamepad2 className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-white text-[13.5px] flex items-center gap-1 leading-tight">
                        <span className="text-[13px]">🎁</span>
                        {selectedGame.name} Game Pass
                        <span className="text-white/25 text-[11px] ml-0.5">ⓘ</span>
                      </p>
                      <p className="text-[12px] text-zinc-400 mt-[3px] leading-tight">
                        Bonus Item: Unlock 2x Money when playing{" "}
                        <span className="text-white/70">{selectedGame.name}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative h-[72px] overflow-hidden bg-[#15171e]">
                  <img
                    src={brainrotBg}
                    alt=""
                    className="absolute right-0 top-0 h-full w-[60%] object-cover"
                    style={{ objectPosition: "right center" }}
                    draggable={false}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to right, #15171e 0%, #15171e 35%, rgba(21,23,30,0.88) 52%, rgba(21,23,30,0.45) 70%, rgba(21,23,30,0.1) 100%)" }}
                  />
                  <div className="relative flex items-center gap-3 h-full px-4">
                    <img
                      src={brainrotIcon}
                      alt="Steal a Brainrot"
                      className="w-[54px] h-[54px] object-contain shrink-0"
                      draggable={false}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-white text-[13.5px] flex items-center gap-1 leading-tight">
                        <span className="text-white/60 font-normal">[</span>
                        <span className="text-[13px]">🎁</span>
                        <span className="text-white/60 font-normal">]</span>
                        Steal a Brainrot Game Pass
                        <span className="text-white/25 text-[11px] ml-0.5">ⓘ</span>
                      </p>
                      <p className="text-[12px] text-zinc-400 mt-[3px] leading-tight">
                        Bonus Item: Unlock 2x Money when playing{" "}
                        <span className="text-white/70">[🎁] Steal a Brainrot</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bonus package rows */}
              <div className="divide-y divide-border">
                {bonusPackages.map((pkg) => (
                  <div key={pkg.amount} className="flex items-center px-5 py-4 gap-4 hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-2 w-44 font-semibold">
                      <img src={robuxIcon} alt="Robux" className="w-5 h-5" />
                      {fmtN(pkg.amount)}
                      <span className="text-muted-foreground line-through text-sm font-normal flex items-center gap-1">
                        <img src={robuxIcon} alt="Robux" className="w-3.5 h-3.5 opacity-60" />
                        {fmtN(pkg.original)}
                      </span>
                    </div>
                    <span className="text-xs bg-[#252830] text-[#c8c8d4] rounded-full px-2.5 py-1 font-medium whitespace-nowrap">
                      + {fmtN(pkg.bonus)} more
                    </span>
                    <div className="flex-1" />
                    <button className="bg-secondary hover:bg-secondary/60 text-sm rounded-lg px-6 py-2.5 font-medium min-w-[110px] transition-colors text-right">
                      {pkg.price}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Robux packages</h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
              {packages.map((pkg) => (
                <div
                  key={pkg.amount}
                  className="flex items-center px-5 py-4 gap-4 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-2 w-44 font-semibold">
                    <img src={robuxIcon} alt="Robux" className="w-5 h-5" />
                    {fmtN(pkg.amount)}
                    <span className="text-muted-foreground line-through text-sm font-normal flex items-center gap-1">
                      <img src={robuxIcon} alt="Robux" className="w-3.5 h-3.5 opacity-60" />
                      {fmtN(pkg.original)}
                    </span>
                  </div>
                  <span className="text-xs bg-secondary rounded-full px-2 py-1 text-muted-foreground">
                    + {fmtN(pkg.bonus)} more
                  </span>
                  <div className="flex-1" />
                  <button className="bg-secondary hover:bg-secondary/60 text-sm rounded-lg px-6 py-2.5 font-medium min-w-[120px] transition-colors">
                    {pkg.price}
                  </button>
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold mt-12 mb-4">FAQ</h2>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <button
                    className="w-full px-5 py-4 flex items-center justify-between text-left font-semibold hover:bg-secondary/20 transition-colors"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    {faq.q}
                    {openFaq === i ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-8 leading-relaxed">
              When you buy Robux you receive only a limited, non-refundable, non-transferable, revocable license
              to use Robux, which has no value in real currency. By selecting the Premium subscription package,
              (1) you agree that you are over 18 and that you authorize us to charge your account every month
              until you cancel the subscription, and (2) you represent that you understand and agree to the
              Terms of Use, which includes an agreement to arbitrate any dispute between you and Roblox, and
              Privacy Policy. You can cancel at any time by clicking "Cancel subscription" on the billing tab
              of the setting page. If you cancel, you will still be charged for the current billing period.
              See Terms of Use for other limitations.
            </p>

            <footer className="mt-10 pt-6 border-t border-border flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground justify-center">
              {["About Us","Jobs","Blog","Parents","Buy Gift Cards","Help","Terms","Accessibility","Privacy","Your Privacy Choices","Sitemap","Cookie Options"].map((link) => (
                <a key={link} className="hover:text-foreground cursor-pointer transition-colors">{link}</a>
              ))}
            </footer>
            <p className="text-[11px] text-muted-foreground text-center mt-4 mb-8">
              ©2026 Roblox Corporation. Roblox, the Roblox logo and Powering Imagination are among our
              registered and unregistered trademarks in the U.S. and other countries.
            </p>
          </section>
        </main>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SendRobuxModal open={sendOpen} onClose={() => setSendOpen(false)} />
    </div>
  );
}
