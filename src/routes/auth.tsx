import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_HOME, ROLE_LABEL, useAccount } from "@/hooks/useAccount";
import type { AppRole } from "@/lib/deliveries.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · FetchIt Delivery Management" },
      { name: "description", content: "Sign in to FetchIt to create, dispatch and deliver customer orders." },
      { property: "og:title", content: "Sign in · FetchIt" },
      { property: "og:description", content: "Retailer staff, dispatchers and riders sign in here." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const ROLES: AppRole[] = ["retailer_staff", "dispatcher", "rider"];

function AuthPage() {
  const navigate = useNavigate();
  const { session, account } = useAccount();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AppRole>("retailer_staff");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session && account?.role) {
      navigate({ to: ROLE_HOME[account.role], replace: true });
    }
  }, [session, account, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);

    if (!email.trim() || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    if (mode === "signup" && fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim(), phone: phone.trim(), role },
          },
        });
        if (err) throw err;
        setNotice("Account created. Signing you in…");
        await supabase.auth.signInWithPassword({ email: email.trim(), password });
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div
          className="w-14 h-14 rounded-2xl grid place-items-center text-primary-foreground mb-5"
          style={{ background: "var(--gradient-hero)" }}
        >
          <Package className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">FetchIt</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Delivery management for retailer staff, dispatchers and riders.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-secondary">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); }}
              className={`py-2 rounded-xl text-sm font-semibold transition ${mode === m ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "signup" && (
            <>
              <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Jane Wanjiku" />
              <Field label="Phone" value={phone} onChange={setPhone} placeholder="0712 345 678" />
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</span>
                <div className="mt-2 grid gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium border transition ${role === r ? "border-primary bg-primary-soft text-primary" : "border-border bg-card"}`}
                    >
                      {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
          <Field label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />

          {error && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}
          {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-2xl text-primary-foreground font-semibold text-sm active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-hero)" }}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-2xl bg-card border border-border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
    </label>
  );
}
