import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DELIVERY_STATUSES = ["OPEN", "ASSIGNED", "PICKED_UP", "DELIVERED", "CANCELLED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
export type AppRole = "retailer_staff" | "dispatcher" | "rider";

export type Delivery = {
  delivery_id: string;
  retailer_staff_id: string;
  rider_id: string | null;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  item_description: string;
  status: DeliveryStatus;
  handoff_code: string;
  created_at: string;
  updated_at: string;
  rider_name?: string | null;
  staff_name?: string | null;
};

const SELECT_COLS =
  "delivery_id, retailer_staff_id, rider_id, customer_name, customer_phone, delivery_address, item_description, status, handoff_code, created_at, updated_at";

function fail(message: string): never {
  throw new Error(message);
}

/** Current user's role + profile. */
export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: roleRow, error: roleErr }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("full_name, phone").eq("id", userId).maybeSingle(),
    ]);

    if (roleErr) fail("Could not load your account role. Please try again.");

    return {
      userId,
      role: (roleRow?.role ?? null) as AppRole | null,
      fullName: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
    };
  });

async function requireRole(
  supabase: any,
  userId: string,
  role: AppRole,
): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();
  if (error) fail("Could not verify your permissions.");
  if (!data) fail("You are not authorised to perform this action.");
}

async function attachNames(supabase: any, rows: Delivery[]): Promise<Delivery[]> {
  const ids = Array.from(
    new Set(rows.flatMap((r) => [r.rider_id, r.retailer_staff_id]).filter(Boolean) as string[]),
  );
  if (ids.length === 0) return rows;
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  const map = new Map<string, string>((data ?? []).map((p: any) => [p.id, p.full_name]));
  return rows.map((r) => ({
    ...r,
    rider_name: r.rider_id ? (map.get(r.rider_id) ?? "Rider") : null,
    staff_name: map.get(r.retailer_staff_id) ?? "Staff",
  }));
}

/* ---------------- Retailer staff ---------------- */

const createSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+0-9 ()-]+$/, "Phone number contains invalid characters"),
  delivery_address: z.string().trim().min(5).max(300),
  item_description: z.string().trim().min(3).max(500),
});

export const createDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "retailer_staff");

    const { data: row, error } = await supabase
      .from("deliveries")
      .insert({ ...data, retailer_staff_id: userId, status: "OPEN" })
      .select(SELECT_COLS)
      .single();

    if (error) fail(error.message || "Could not create the delivery request.");
    return row as Delivery;
  });

export const listMyDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("deliveries")
      .select(SELECT_COLS)
      .eq("retailer_staff_id", userId)
      .order("created_at", { ascending: false });
    if (error) fail("Could not load your delivery requests.");
    return attachNames(supabase, (data ?? []) as Delivery[]);
  });

/* ---------------- Dispatcher ---------------- */

export const listAllDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "dispatcher");
    const { data, error } = await supabase
      .from("deliveries")
      .select(SELECT_COLS)
      .order("created_at", { ascending: false });
    if (error) fail("Could not load deliveries.");
    return attachNames(supabase, (data ?? []) as Delivery[]);
  });

export const listRiders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "dispatcher");

    const { data: roleRows, error } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "rider");
    if (error) fail("Could not load riders.");

    const ids = (roleRows ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) return [] as { id: string; full_name: string; phone: string }[];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", ids);

    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name || "Unnamed rider",
      phone: p.phone || "",
    }));
  });

export const assignRider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ delivery_id: z.string().uuid(), rider_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "dispatcher");

    const { data: existing, error: readErr } = await supabase
      .from("deliveries")
      .select("status")
      .eq("delivery_id", data.delivery_id)
      .maybeSingle();
    if (readErr) fail("Could not load that delivery.");
    if (!existing) fail("Delivery not found.");
    if (existing.status !== "OPEN") fail(`Only OPEN deliveries can be assigned (currently ${existing.status}).`);

    const { data: row, error } = await supabase
      .from("deliveries")
      .update({ rider_id: data.rider_id, status: "ASSIGNED" })
      .eq("delivery_id", data.delivery_id)
      .select(SELECT_COLS)
      .maybeSingle();

    if (error) fail(error.message || "Could not assign the rider.");
    if (!row) fail("Assignment was rejected. Please refresh and try again.");
    return row as Delivery;
  });

/* ---------------- Rider ---------------- */

export const listRiderDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "rider");
    const { data, error } = await supabase
      .from("deliveries")
      .select(SELECT_COLS)
      .eq("rider_id", userId)
      .order("updated_at", { ascending: false });
    if (error) fail("Could not load your deliveries.");
    return attachNames(supabase, (data ?? []) as Delivery[]);
  });

const NEXT_STATUS: Record<string, DeliveryStatus | null> = {
  OPEN: null,
  ASSIGNED: "PICKED_UP",
  PICKED_UP: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

/**
 * Cancel a delivery.
 * - Retailer staff may cancel their own delivery while it is OPEN.
 * - Dispatchers may cancel while OPEN or ASSIGNED.
 * The database trigger enforces the same rules.
 */
export const cancelDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ delivery_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: readErr } = await supabase
      .from("deliveries")
      .select("status, retailer_staff_id")
      .eq("delivery_id", data.delivery_id)
      .maybeSingle();
    if (readErr) fail("Could not load that delivery.");
    if (!existing) fail("Delivery not found.");

    const { data: isDispatcher } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "dispatcher")
      .maybeSingle();

    const isOwner = existing.retailer_staff_id === userId;
    if (!isDispatcher && !isOwner) fail("You are not authorised to cancel this delivery.");
    if (existing.status === "OPEN") {
      if (!isDispatcher && !isOwner) fail("Only the creating staff member or a dispatcher can cancel.");
    } else if (existing.status === "ASSIGNED") {
      if (!isDispatcher) fail("Only a dispatcher can cancel an assigned delivery.");
    } else {
      fail(`A ${existing.status} delivery cannot be cancelled.`);
    }

    const { data: row, error } = await supabase
      .from("deliveries")
      .update({ status: "CANCELLED" })
      .eq("delivery_id", data.delivery_id)
      .select(SELECT_COLS)
      .maybeSingle();

    if (error) fail(error.message || "Could not cancel the delivery.");
    if (!row) fail("Cancellation was rejected. Please refresh and try again.");
    return row as Delivery;
  });

export const advanceDeliveryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        delivery_id: z.string().uuid(),
        next_status: z.enum(["PICKED_UP", "DELIVERED"]),
        confirmation_code: z.string().trim().max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireRole(supabase, userId, "rider");

    const { data: existing, error: readErr } = await supabase
      .from("deliveries")
      .select("status, rider_id, handoff_code")
      .eq("delivery_id", data.delivery_id)
      .maybeSingle();
    if (readErr) fail("Could not load that delivery.");
    if (!existing) fail("Delivery not found.");
    if (existing.rider_id !== userId) fail("This delivery is not assigned to you.");

    const expected = NEXT_STATUS[existing.status];
    if (expected !== data.next_status) {
      fail(`Invalid status change: ${existing.status} → ${data.next_status}.`);
    }

    if (data.next_status === "DELIVERED") {
      const supplied = (data.confirmation_code ?? "").trim().toUpperCase();
      if (!supplied) fail("Enter the customer's handoff code to confirm delivery.");
      if (supplied !== String(existing.handoff_code).trim().toUpperCase()) {
        fail("That handoff code does not match this delivery.");
      }
    }

    const { data: row, error } = await supabase
      .from("deliveries")
      .update({ status: data.next_status })
      .eq("delivery_id", data.delivery_id)
      .select(SELECT_COLS)
      .maybeSingle();

    if (error) fail(error.message || "Could not update the delivery status.");
    if (!row) fail("Status update was rejected. Please refresh and try again.");
    return row as Delivery;
  });
