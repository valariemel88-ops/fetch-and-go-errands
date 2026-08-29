import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Home, ListChecks, Bike, ClipboardList, Settings as SettingsIcon } from "lucide-react";
import { useAccount } from "@/hooks/useAccount";

type Tab = { to: string; label: string; icon: typeof Home };

const HOME_TAB: Tab = { to: "/", label: "Home", icon: Home };
const SETTINGS_TAB: Tab = { to: "/settings", label: "Settings", icon: SettingsIcon };

const ROLE_TABS: Record<string, Tab[]> = {
  retailer_staff: [{ to: "/staff", label: "Requests", icon: ClipboardList }],
  dispatcher: [{ to: "/dispatch", label: "Dispatch", icon: ListChecks }],
  rider: [{ to: "/deliveries", label: "Jobs", icon: Bike }],
};

const GUEST_TABS: Tab[] = [
  { to: "/errands", label: "Errands", icon: ListChecks },
  { to: "/runner", label: "Runner", icon: Bike },
];

const SCROLL_KEY = "fetchit:scroll";

function getScrollMap(): Record<string, number> {
  try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}"); } catch { return {}; }
}
function setScrollMap(map: Record<string, number>) {
  sessionStorage.setItem(SCROLL_KEY, JSON.stringify(map));
}

export function AppShell() {
  const location = useLocation();
  const { account } = useAccount();
  const tabs: Tab[] = [
    HOME_TAB,
    ...(account?.role ? ROLE_TABS[account.role]! : GUEST_TABS),
    SETTINGS_TAB,
  ];
  const mainRef = useRef<HTMLDivElement>(null);
  const prevPath = useRef<string>(location.pathname);

  // Preserve scroll per route
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    // Save scroll of previous path
    const map = getScrollMap();
    map[prevPath.current] = el.scrollTop;
    setScrollMap(map);
    // Restore scroll for current
    requestAnimationFrame(() => {
      el.scrollTop = map[location.pathname] ?? 0;
    });
    prevPath.current = location.pathname;
  }, [location.pathname]);

  const isTab = tabs.some((t) => t.to === location.pathname);

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground">
      <div ref={mainRef} className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: isTab ? 0 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isTab ? 0 : -24 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 bg-background/85 backdrop-blur-xl border-t border-border">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((t) => {
            const active = location.pathname === t.to;
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-colors"
              >
                <div className={`relative flex items-center justify-center w-11 h-7 rounded-full ${active ? "bg-primary-soft" : ""}`}>
                  <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={active ? 2.4 : 2} />
                </div>
                <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}