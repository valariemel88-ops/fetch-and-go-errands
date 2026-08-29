import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ROLE_HOME, useAccount } from "@/hooks/useAccount";
import { motion } from "framer-motion";
import { Package, ShoppingBag, FileText, Receipt, Pill, Sparkles, ArrowRight, MapPin, Zap } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: Home,
});

const CATEGORIES = [
  { icon: Package, label: "Send package", tint: "bg-primary-soft text-primary" },
  { icon: ShoppingBag, label: "Buy groceries", tint: "bg-accent text-accent-foreground" },
  { icon: FileText, label: "Documents", tint: "bg-primary-soft text-primary" },
  { icon: Receipt, label: "Pay bills", tint: "bg-accent text-accent-foreground" },
  { icon: Pill, label: "Pharmacy", tint: "bg-primary-soft text-primary" },
  { icon: Sparkles, label: "Other", tint: "bg-accent text-accent-foreground" },
];

function Home() {
  const navigate = useNavigate();
  const { session, account } = useAccount();

  useEffect(() => {
    if (session && account?.role) navigate({ to: ROLE_HOME[account.role], replace: true });
  }, [session, account, navigate]);

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <h1 className="text-xl font-semibold tracking-tight">Hi, {account?.fullName?.split(" ")[0] ?? "there"} 👋</h1>
        </div>
        <div className="w-11 h-11 rounded-full grid place-items-center text-sm font-semibold text-primary-foreground"
             style={{ background: "var(--gradient-hero)" }}>A</div>
      </header>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-5 mb-6 text-primary-foreground"
        style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <p className="text-xs/relaxed uppercase tracking-widest opacity-80">Your errands, simplified</p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight">Need something done?<br/>We'll fetch it.</h2>
        <Link to="/request" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white text-primary px-4 py-2.5 text-sm font-semibold shadow-md hover:bg-white/90 active:scale-[0.98] transition">
          Request an errand <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>

      {/* Quick categories */}
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">What do you need?</h3>
      <div className="grid grid-cols-3 gap-3 mb-7">
        {CATEGORIES.map((c) => (
          <Link key={c.label} to="/request" className="bg-card rounded-2xl p-3 flex flex-col items-center gap-2 active:scale-95 transition" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className={`w-11 h-11 rounded-2xl grid place-items-center ${c.tint}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] text-center font-medium text-foreground leading-tight">{c.label}</span>
          </Link>
        ))}
      </div>

      {/* Priority callout */}
      <Link to="/request" className="block rounded-2xl p-4 mb-7 border border-border bg-card flex items-center gap-3" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="w-11 h-11 rounded-xl grid place-items-center text-gold-foreground" style={{ background: "var(--gradient-gold)" }}>
          <Zap className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Priority delivery</p>
          <p className="text-xs text-muted-foreground">Urgent? Get matched in under 5 min.</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </Link>

      {/* Active errand */}
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Active</h3>
      <Link to="/tracking/$id" params={{ id: "abc123" }} className="block bg-card rounded-2xl p-4 mb-8" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-soft grid place-items-center text-primary">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">Grocery run · Naivas</p>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-success">On the way</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Runner: Brian K. · ETA 12 min</p>
            <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full w-3/5 rounded-full" style={{ background: "var(--gradient-hero)" }} />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}