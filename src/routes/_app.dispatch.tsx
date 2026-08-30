import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, UserCheck, XCircle } from "lucide-react";
import { RoleGate } from "@/components/delivery/RoleGate";
import { StatusBadge } from "@/components/delivery/StatusBadge";
import { assignRider, cancelDelivery, listAllDeliveries, listRiders, type Delivery } from "@/lib/deliveries.functions";

export const Route = createFileRoute("/_app/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatcher · FetchIt Delivery Management" },
      { name: "description", content: "Review open delivery requests, assign riders and monitor every delivery in real time." },
      { property: "og:title", content: "Dispatcher Dashboard · FetchIt" },
      { property: "og:description", content: "Assign riders to open deliveries and track progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate role="dispatcher">
      <DispatchDashboard />
    </RoleGate>
  ),
});

function DispatchDashboard() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["deliveries", "all"],
    queryFn: () => listAllDeliveries(),
    refetchInterval: 5000,
  });

  const riders = useQuery({
    queryKey: ["riders"],
    queryFn: () => listRiders(),
    staleTime: 30_000,
  });

  const assign = useMutation({
    mutationFn: (v: { delivery_id: string; rider_id: string }) => assignRider({ data: v }),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["deliveries", "all"] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Could not assign the rider."),
  });

  const cancel = useMutation({
    mutationFn: (delivery_id: string) => cancelDelivery({ data: { delivery_id } }),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["deliveries", "all"] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Could not cancel the delivery."),
  });

  const rows = (data ?? []) as Delivery[];
  const open = rows.filter((d) => d.status === "OPEN");
  const active = rows.filter((d) => d.status !== "OPEN");
  const riderList = riders.data ?? [];

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-10">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Dispatcher</p>
          <h1 className="text-2xl font-semibold tracking-tight">Dispatch board</h1>
        </div>
        {isFetching && <RefreshCw className="w-4 h-4 mt-2 text-muted-foreground animate-spin" />}
      </header>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <Stat label="Open" value={open.length} />
        <Stat label="In progress" value={rows.filter((d) => d.status === "ASSIGNED" || d.status === "PICKED_UP").length} />
        <Stat label="Delivered" value={rows.filter((d) => d.status === "DELIVERED").length} />
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

      <h2 className="mt-7 mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open requests</h2>
      {isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : open.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">No open requests right now.</p>
      ) : (
        <div className="space-y-3">
          {open.map((d) => (
            <div key={d.delivery_id} className="bg-card rounded-2xl p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
              <Summary d={d} />
              <div className="mt-3 flex gap-2">
                <select
                  value={picked[d.delivery_id] ?? ""}
                  onChange={(e) => setPicked({ ...picked, [d.delivery_id]: e.target.value })}
                  className="flex-1 rounded-xl bg-background border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">{riderList.length ? "Select a rider…" : "No riders available"}</option>
                  {riderList.map((r) => (
                    <option key={r.id} value={r.id}>{r.full_name}{r.phone ? ` · ${r.phone}` : ""}</option>
                  ))}
                </select>
                <button
                  disabled={!picked[d.delivery_id] || assign.isPending}
                  onClick={() => assign.mutate({ delivery_id: d.delivery_id, rider_id: picked[d.delivery_id]! })}
                  className="px-4 rounded-xl text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                  style={{ background: "var(--gradient-hero)" }}
                >
                  <UserCheck className="w-4 h-4" /> Assign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-7 mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned & in progress</h2>
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">Nothing assigned yet.</p>
      ) : (
        <div className="space-y-3">
          {active.map((d) => (
            <div key={d.delivery_id} className="bg-card rounded-2xl p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
              <Summary d={d} />
              <p className="text-[11px] text-muted-foreground mt-2">
                Rider: {d.rider_name ?? "—"} · Staff: {d.staff_name ?? "—"} · Updated {new Date(d.updated_at).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Summary({ d }: { d: Delivery }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-sm">{d.customer_name}</p>
        <StatusBadge status={d.status} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{d.item_description}</p>
      <p className="text-xs text-muted-foreground">{d.delivery_address} · {d.customer_phone}</p>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-2xl p-3 text-center" style={{ boxShadow: "var(--shadow-soft)" }}>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
