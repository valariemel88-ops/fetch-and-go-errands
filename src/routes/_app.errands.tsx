import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2, MapPin, Package, ShoppingBag, FileText } from "lucide-react";

export const Route = createFileRoute("/_app/errands")({
  component: Errands,
});

type Errand = {
  id: string; title: string; status: "active" | "completed" | "cancelled";
  icon: any; runner: string; price: string; when: string;
};

const INITIAL: Errand[] = [
  { id: "abc123", title: "Grocery run · Naivas", status: "active", icon: ShoppingBag, runner: "Brian K.", price: "KSh 350", when: "Now · ETA 12 min" },
  { id: "p2", title: "Send package to CBD", status: "completed", icon: Package, runner: "Faith W.", price: "KSh 220", when: "Yesterday" },
  { id: "d3", title: "KRA documents pickup", status: "completed", icon: FileText, runner: "Mike O.", price: "KSh 500", when: "2 days ago" },
  { id: "p4", title: "Pharmacy — Goodlife", status: "cancelled", icon: Package, runner: "—", price: "KSh 0", when: "Last week" },
];

function Errands() {
  const [items, setItems] = useState(INITIAL);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const { ref, pull, refreshing } = usePullToRefresh(async () => {
    await new Promise((r) => setTimeout(r, 900));
    setItems((prev) => [...prev]);
  });

  const filtered = items.filter((i) => filter === "all" ? true : i.status === filter);

  return (
    <div ref={ref as any} className="h-[calc(100dvh-5rem)] overflow-y-auto">
      <div style={{ height: pull, transition: pull === 0 ? "height 0.25s" : undefined }} className="flex items-end justify-center overflow-hidden">
        {(pull > 10 || refreshing) && (
          <Loader2 className={`w-5 h-5 text-primary mb-2 ${refreshing ? "animate-spin" : ""}`} style={{ transform: `rotate(${pull * 4}deg)` }} />
        )}
      </div>
      <div className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <h1 className="text-2xl font-semibold tracking-tight">My errands</h1>
        <p className="text-sm text-muted-foreground mt-1">Pull down to refresh</p>

        <div className="flex gap-2 mt-5 mb-4">
          {(["all", "active", "completed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((e) => (
            <Link key={e.id} to="/tracking/$id" params={{ id: e.id }}
              className="block bg-card rounded-2xl p-4 active:scale-[0.99] transition" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-soft grid place-items-center text-primary">
                  <e.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{e.title}</p>
                    <span className="text-xs font-semibold text-foreground shrink-0">{e.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.runner} · {e.when}</p>
                  <span className={`mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    e.status === "active" ? "bg-success/15 text-success" :
                    e.status === "completed" ? "bg-primary-soft text-primary" :
                    "bg-destructive/15 text-destructive"
                  }`}>{e.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}