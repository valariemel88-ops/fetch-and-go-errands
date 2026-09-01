import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, PackageCheck, RefreshCw } from "lucide-react";
import { RoleGate } from "@/components/delivery/RoleGate";
import { StatusBadge } from "@/components/delivery/StatusBadge";
import { advanceDeliveryStatus, listRiderDeliveries, type Delivery } from "@/lib/deliveries.functions";

export const Route = createFileRoute("/_app/deliveries")({
  head: () => ({
    meta: [
      { title: "My Deliveries · FetchIt Rider" },
      { name: "description", content: "Riders view assigned jobs and update each delivery from picked up to delivered." },
      { property: "og:title", content: "Rider Deliveries · FetchIt" },
      { property: "og:description", content: "Assigned jobs with pickup and delivery status updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate role="rider">
      <RiderDashboard />
    </RoleGate>
  ),
});

function RiderDashboard() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["deliveries", "rider"],
    queryFn: () => listRiderDeliveries(),
    refetchInterval: 5000,
  });

  const advance = useMutation({
    mutationFn: (v: { delivery_id: string; next_status: "PICKED_UP" | "DELIVERED"; confirmation_code?: string }) =>
      advanceDeliveryStatus({ data: v }),
    onSuccess: () => {
      setError(null);
      setConfirming(null);
      setCode("");
      qc.invalidateQueries({ queryKey: ["deliveries", "rider"] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Could not update the status."),
  });

  const rows = (data ?? []) as Delivery[];
  const activeJobs = rows.filter((d) => d.status !== "DELIVERED");
  const done = rows.filter((d) => d.status === "DELIVERED");

  return (
    <div className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-10">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Rider</p>
          <h1 className="text-2xl font-semibold tracking-tight">My deliveries</h1>
        </div>
        {isFetching && <RefreshCw className="w-4 h-4 mt-2 text-muted-foreground animate-spin" />}
      </header>

      {error && <p role="alert" className="mt-4 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

      <h2 className="mt-6 mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active jobs</h2>
      {isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : activeJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">No jobs assigned to you yet.</p>
      ) : (
        <div className="space-y-3">
          {activeJobs.map((d) => (
            <div key={d.delivery_id} className="bg-card rounded-2xl p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{d.customer_name}</p>
                <StatusBadge status={d.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{d.item_description}</p>
              <p className="text-xs text-muted-foreground">{d.delivery_address}</p>
              <a href={`tel:${d.customer_phone}`} className="text-xs font-semibold text-primary">{d.customer_phone}</a>

              <div className="mt-3">
                {d.status === "ASSIGNED" && (
                  <button
                    disabled={advance.isPending}
                    onClick={() => advance.mutate({ delivery_id: d.delivery_id, next_status: "PICKED_UP" })}
                    className="w-full py-3 rounded-xl text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: "var(--gradient-hero)" }}
                  >
                    <PackageCheck className="w-4 h-4" /> Mark picked up
                  </button>
                )}
                {d.status === "PICKED_UP" && (
                  <button
                    disabled={advance.isPending}
                    onClick={() => advance.mutate({ delivery_id: d.delivery_id, next_status: "DELIVERED" })}
                    className="w-full py-3 rounded-xl bg-success text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark delivered
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <h2 className="mt-7 mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed ({done.length})</h2>
          <div className="space-y-2">
            {done.map((d) => (
              <div key={d.delivery_id} className="bg-card rounded-2xl p-3.5 flex items-center gap-3" style={{ boxShadow: "var(--shadow-soft)" }}>
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{d.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{d.delivery_address}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">{new Date(d.updated_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
