import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MapPin, Clock, Zap } from "lucide-react";

export const Route = createFileRoute("/_app/request")({
  component: RequestErrand,
});

function RequestErrand() {
  const navigate = useNavigate();
  const [priority, setPriority] = useState(false);
  const [desc, setDesc] = useState("");
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");

  const basePrice = 220;
  const priorityFee = priority ? 150 : 0;
  const total = basePrice + priorityFee + (desc.length > 60 ? 80 : 0);

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-6">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/" className="w-10 h-10 grid place-items-center rounded-full bg-secondary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">New request</p>
          <h1 className="text-xl font-semibold tracking-tight">Request an errand</h1>
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What do you need?</span>
        <textarea
          value={desc} onChange={(e) => setDesc(e.target.value)}
          rows={3} placeholder="e.g. Pick up 2 loaves of bread and milk from Naivas Kileleshwa"
          className="mt-2 w-full rounded-2xl bg-card border border-border p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>

      <div className="mt-4 bg-card rounded-2xl p-2" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-success" />
          <input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Pickup location" className="flex-1 bg-transparent text-sm py-1.5 outline-none" />
          <MapPin className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="border-t border-border mx-3" />
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <input value={drop} onChange={(e) => setDrop(e.target.value)} placeholder="Drop-off location" className="flex-1 bg-transparent text-sm py-1.5 outline-none" />
          <MapPin className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <button onClick={() => setPriority((v) => !v)}
        className={`w-full mt-4 rounded-2xl p-4 flex items-center gap-3 text-left transition ${priority ? "bg-gold/15 ring-2 ring-gold" : "bg-card"}`}
        style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="w-10 h-10 rounded-xl grid place-items-center text-gold-foreground" style={{ background: "var(--gradient-gold)" }}>
          <Zap className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Priority delivery</p>
          <p className="text-xs text-muted-foreground">+KSh 150 · Matched in under 5 min</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 ${priority ? "border-gold bg-gold" : "border-border"}`} />
      </button>

      <div className="mt-5 bg-card rounded-2xl p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Base</span><span>KSh {basePrice}</span>
        </div>
        {priorityFee > 0 && (
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Priority fee</span><span>KSh {priorityFee}</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="font-semibold">Estimated total</span>
          <span className="font-semibold text-lg text-primary">KSh {total}</span>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
          <Clock className="w-3 h-3" /> Pay with M-Pesa on delivery
        </p>
      </div>

      <button
        onClick={() => navigate({ to: "/tracking/$id", params: { id: "new" } })}
        className="w-full mt-5 py-4 rounded-2xl text-primary-foreground font-semibold text-sm active:scale-[0.98] transition"
        style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-card)" }}>
        Find a runner
      </button>
    </div>
  );
}