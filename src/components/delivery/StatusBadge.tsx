import type { DeliveryStatus } from "@/lib/deliveries.functions";

const STYLES: Record<DeliveryStatus, string> = {
  OPEN: "bg-secondary text-secondary-foreground",
  ASSIGNED: "bg-primary-soft text-primary",
  PICKED_UP: "bg-gold/25 text-gold-foreground",
  DELIVERED: "bg-success/20 text-success",
};

const LABELS: Record<DeliveryStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked up",
  DELIVERED: "Delivered",
};

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
