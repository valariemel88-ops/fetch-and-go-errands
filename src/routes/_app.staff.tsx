import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PackagePlus, RefreshCw } from "lucide-react";
import { RoleGate } from "@/components/delivery/RoleGate";
import { StatusBadge } from "@/components/delivery/StatusBadge";
import { createDelivery, listMyDeliveries, type Delivery } from "@/lib/deliveries.functions";

export const Route = createFileRoute("/_app/staff")({
  head: () => ({
    meta: [
      { title: "Retailer Staff · FetchIt Delivery Management" },
      { name: "description", content: "Create customer delivery requests and track their progress from open to delivered." },
      { property: "og:title", content: "Retailer Staff Dashboard · FetchIt" },
      { property: "og:description", content: "Create and monitor customer delivery requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate role="retailer_staff">
      <StaffDashboard />
    </RoleGate>
  ),
});

const EMPTY = { customer_name: "", customer_phone: "", delivery_address: "", item_description: "" };

function StaffDashboard() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["deliveries", "mine"],
    queryFn: () => listMyDeliveries(),
    refetchInterval: 5000,
  });

  const create = useMutation({
    mutationFn: (input: typeof EMPTY) => createDelivery({ data: input }),
    onSuccess: () => {
      setForm(EMPTY);
      setError(null);
      qc.invalidateQueries({ queryKey: ["deliveries", "mine"] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Could not create the request."),
  });

  const rows = (data ?? []) as Delivery[];

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Retailer Staff</p>
          <h1 className="text-2xl font-semibold tracking-tight">New delivery</h1>
        </div>
        {isFetching && <RefreshCw className="w-4 h-4 mt-2 text-muted-foreground animate-spin" />}
      </header>

      <form
        className="mt-4 bg-card rounded-2xl p-4 space-y-3"
        style={{ boxShadow: "var(--shadow-soft)" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!create.isPending) create.mutate(form);
        }}
      >
        <Field label="Customer name" value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })} placeholder="Jane Wanjiku" />
        <Field label="Customer phone" value={form.customer_phone} onChange={(v) => setForm({ ...form, customer_phone: v })} placeholder="0712 345 678" />
        <Field label="Delivery address" value={form.delivery_address} onChange={(v) => setForm({ ...form, delivery_address: v })} placeholder="Embu town, Kubukubu Road" />
        <Field label="Item description" value={form.item_description} onChange={(v) => setForm({ ...form, item_description: v })} placeholder="2x 10kg gas cylinder" />

        {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={create.isPending}
          className="w-full py-3.5 rounded-2xl text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
          style={{ background: "var(--gradient-hero)" }}
        >
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
          Create delivery request
        </button>
      </form>

      <h2 className="mt-7 mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        My requests {rows.length > 0 && `(${rows.length})`}
      </h2>

      {isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1 pb-10">No delivery requests yet.</p>
      ) : (
        <div className="space-y-3 pb-10">
          {rows.map((d) => (
            <div key={d.delivery_id} className="bg-card rounded-2xl p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{d.customer_name}</p>
                <StatusBadge status={d.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{d.item_description}</p>
              <p className="text-xs text-muted-foreground">{d.delivery_address} · {d.customer_phone}</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                {d.rider_name ? `Rider: ${d.rider_name}` : "Awaiting rider assignment"} · {new Date(d.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-2xl bg-background border border-border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
    </label>
  );
}
