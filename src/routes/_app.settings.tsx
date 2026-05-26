import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, User, Bell, CreditCard, Shield, HelpCircle, LogOut, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: Settings,
});

function Settings() {
  const [confirming, setConfirming] = useState(false);

  const sections: { label: string; items: { icon: any; label: string; hint?: string }[] }[] = [
    { label: "Account", items: [
      { icon: User, label: "Profile", hint: "Amani M." },
      { icon: Bell, label: "Notifications" },
      { icon: CreditCard, label: "Payment methods", hint: "M-Pesa" },
    ]},
    { label: "Preferences", items: [
      { icon: Shield, label: "Privacy & security" },
      { icon: HelpCircle, label: "Help & support" },
    ]},
  ];

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="mt-5 bg-card rounded-2xl p-4 flex items-center gap-3" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="w-14 h-14 rounded-full grid place-items-center text-lg font-semibold text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>A</div>
        <div className="flex-1">
          <p className="font-semibold">Amani Mwangi</p>
          <p className="text-xs text-muted-foreground">+254 712 345 678</p>
        </div>
        <button className="text-xs font-semibold text-primary">Edit</button>
      </div>

      {sections.map((s) => (
        <div key={s.label} className="mt-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">{s.label}</h2>
          <div className="bg-card rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-soft)" }}>
            {s.items.map((it, i) => (
              <button key={it.label} className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${i > 0 ? "border-t border-border" : ""}`}>
                <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary grid place-items-center">
                  <it.icon className="w-4 h-4" />
                </div>
                <span className="flex-1 text-sm font-medium">{it.label}</span>
                {it.hint && <span className="text-xs text-muted-foreground">{it.hint}</span>}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-6 space-y-2">
        <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-sm">
          <LogOut className="w-4 h-4" /> Log out
        </button>
        <button onClick={() => setConfirming(true)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-destructive/10 text-destructive font-semibold text-sm">
          <Trash2 className="w-4 h-4" /> Delete account
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">FetchIt · v1.0.0</p>

      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setConfirming(false)}>
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 m-0 sm:m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive grid place-items-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <button onClick={() => setConfirming(false)} className="w-8 h-8 rounded-full bg-secondary grid place-items-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="mt-4 text-lg font-semibold">Delete your account?</h3>
            <p className="text-sm text-muted-foreground mt-1">This will permanently remove your profile, errand history, and wallet balance. This action cannot be undone.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirming(false)} className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm">Cancel</button>
              <button className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}