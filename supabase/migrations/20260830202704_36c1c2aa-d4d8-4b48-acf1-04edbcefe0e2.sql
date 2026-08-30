ALTER TABLE public.deliveries
  ADD COLUMN handoff_code text NOT NULL DEFAULT upper(substring(md5(gen_random_uuid()::text) from 1 for 6));

CREATE OR REPLACE FUNCTION public.enforce_delivery_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_dispatcher BOOLEAN := private.has_role(auth.uid(), 'dispatcher');
  _is_rider BOOLEAN := private.has_role(auth.uid(), 'rider');
  _is_owner_staff BOOLEAN := private.has_role(auth.uid(), 'retailer_staff') AND OLD.retailer_staff_id = auth.uid();
BEGIN
  NEW.updated_at := now();

  IF NEW.delivery_id <> OLD.delivery_id
     OR NEW.retailer_staff_id <> OLD.retailer_staff_id
     OR NEW.customer_name <> OLD.customer_name
     OR NEW.customer_phone <> OLD.customer_phone
     OR NEW.delivery_address <> OLD.delivery_address
     OR NEW.item_description <> OLD.item_description
     OR NEW.handoff_code <> OLD.handoff_code
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Delivery details cannot be modified after creation';
  END IF;

  IF OLD.status IN ('DELIVERED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Delivery is already % and cannot be changed', OLD.status;
  END IF;

  IF NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN
    IF NOT _is_dispatcher THEN
      RAISE EXCEPTION 'Only a dispatcher can assign a rider';
    END IF;
    IF OLD.status <> 'OPEN' THEN
      RAISE EXCEPTION 'Only OPEN deliveries can be assigned';
    END IF;
    IF NEW.rider_id IS NULL OR NOT private.has_role(NEW.rider_id, 'rider') THEN
      RAISE EXCEPTION 'Assigned user must be a rider';
    END IF;
  END IF;

  IF NEW.status <> OLD.status THEN
    IF NEW.status = 'CANCELLED' THEN
      IF OLD.status = 'OPEN' AND NOT (_is_dispatcher OR _is_owner_staff) THEN
        RAISE EXCEPTION 'Only the creating staff member or a dispatcher can cancel an open delivery';
      ELSIF OLD.status = 'ASSIGNED' AND NOT _is_dispatcher THEN
        RAISE EXCEPTION 'Only a dispatcher can cancel an assigned delivery';
      ELSIF OLD.status NOT IN ('OPEN', 'ASSIGNED') THEN
        RAISE EXCEPTION 'Invalid status transition: % -> CANCELLED', OLD.status;
      END IF;
    ELSIF OLD.status = 'OPEN' AND NEW.status = 'ASSIGNED' THEN
      IF NOT _is_dispatcher THEN
        RAISE EXCEPTION 'Only a dispatcher can assign a delivery';
      END IF;
      IF NEW.rider_id IS NULL THEN
        RAISE EXCEPTION 'A rider must be assigned';
      END IF;
    ELSIF OLD.status = 'ASSIGNED' AND NEW.status = 'PICKED_UP' THEN
      IF NOT (_is_rider AND OLD.rider_id = auth.uid()) THEN
        RAISE EXCEPTION 'Only the assigned rider can mark this as picked up';
      END IF;
    ELSIF OLD.status = 'PICKED_UP' AND NEW.status = 'DELIVERED' THEN
      IF NOT (_is_rider AND OLD.rider_id = auth.uid()) THEN
        RAISE EXCEPTION 'Only the assigned rider can mark this as delivered';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;