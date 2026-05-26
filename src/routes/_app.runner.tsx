import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2, BadgeCheck, TrendingUp, Star, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/_app/runner")({
  component: RunnerDashboard,
});

function RunnerDashboard() {
  const [available, setAvailable] = useState(true);
  const { ref, pull, refreshing } = usePullToRefresh(async () => {
    await new Promise((r) => setTimeout(r, 900));
  });

  const jobs = [
    { id: "j1", title: "Grocery pickup · Naivas → Kileleshwa", pay: "KSh 350", dist: "2.4 km", eta: "20 min" },
    { id: "j2", title: "Documents · CBD → Westlands", pay: "KSh 280", dist: "3.1 km", eta: "25 min" },
    { id: "j3", title: "Pharmacy · Goodlife → Lavington", pay: "KSh 220", dist: "1.8 km", eta: "15 min" },
  ];

  return (
    <div ref={ref as any} className="h-[calc(100dvh-5rem)] overflow-y-auto">
      <div style={{ height: pull, transition: pull === 0 ? "height 0.25s" : undefined }} className="flex items-end justify-center overflow-hidden">
        {(pull > 10 || refreshing) && (
          <Loader2 className={`w-5 h-5 text-primary mb-2 ${refreshing ? "animate-spin" : ""}`} />
        )}
      </div>
      <div className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Runner mode</p>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              Brian K.
              <BadgeCheck className="w-5 h-5 text-gold" />
            </h1>
          </div>
          <button onClick={() => setAvailable((v) => !v)}
            className={`px-4 py-2 rounded-full text-xs font-semibold ${available ? "bg-success text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {available ? "Online" : "Offline"}
          </button>
        </div>

        {/* Earnings card */}
        <div className="mt-5 rounded-3xl p-5 text-primary-foreground" style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs uppercase tracking-widest opacity-80">Today's earnings</p>
          <p className="text-3xl font-semibold mt-1">KSh 2,450</p>
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div><p className="text-lg font-semibold">8</p><p className="text-[10px] opacity-80 uppercase">Jobs</p></div>
            <div><p className="text-lg font-semibold flex items-center justify-center gap-1">4.9 <Star className="w-3 h-3 fill-current" /></p><p className="text-[10px] opacity-80 uppercase">Rating</p></div>
            <div><p className="text-lg font-semibold">96%</p><p className="text-[10px] opacity-80 uppercase">Accept</p></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-card rounded-2xl p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground mt-2">This week</p>
            <p className="font-semibold">KSh 14,200</p>
          </div>
          <div className="bg-card rounded-2xl p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
            <Clock className="w-4 h-4 text-gold" />
            <p className="text-xs text-muted-foreground mt-2">Hours online</p>
            <p className="font-semibold">6h 24m</p>
          </div>
        </div>

        <h2 className="mt-7 mb-3 text-sm font-semibold text-muted-foreground">Nearby jobs</h2>
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="bg-card rounded-2xl p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
              <p className="font-semibold text-sm">{j.title}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{j.dist}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{j.eta}</span>
                <span className="ml-auto font-semibold text-foreground">{j.pay}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold">Skip</button>
                <button className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Accept</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}