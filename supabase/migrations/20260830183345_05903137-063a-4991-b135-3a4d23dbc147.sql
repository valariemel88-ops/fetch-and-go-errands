CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- deliveries policies -> private.has_role
DROP POLICY IF EXISTS deliveries_insert_staff ON public.deliveries;
DROP POLICY IF EXISTS deliveries_select_scoped ON public.deliveries;
DROP POLICY IF EXISTS deliveries_update_dispatcher_or_rider ON public.deliveries;
DROP POLICY IF EXISTS deliveries_update_staff_cancel ON public.deliveries;

CREATE POLICY deliveries_insert_staff ON public.deliveries FOR INSERT TO authenticated
WITH CHECK (retailer_staff_id = auth.uid() AND private.has_role(auth.uid(), 'retailer_staff') AND status = 'OPEN' AND rider_id IS NULL);

CREATE POLICY deliveries_select_scoped ON public.deliveries FOR SELECT TO authenticated
USING (retailer_staff_id = auth.uid() OR private.has_role(auth.uid(), 'dispatcher') OR (rider_id = auth.uid() AND private.has_role(auth.uid(), 'rider')));

CREATE POLICY deliveries_update_dispatcher_or_rider ON public.deliveries FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'dispatcher') OR (rider_id = auth.uid() AND private.has_role(auth.uid(), 'rider')))
WITH CHECK (private.has_role(auth.uid(), 'dispatcher') OR (rider_id = auth.uid() AND private.has_role(auth.uid(), 'rider')));

CREATE POLICY deliveries_update_staff_cancel ON public.deliveries FOR UPDATE TO authenticated
USING (retailer_staff_id = auth.uid() AND private.has_role(auth.uid(), 'retailer_staff'))
WITH CHECK (retailer_staff_id = auth.uid() AND private.has_role(auth.uid(), 'retailer_staff'));

-- profiles: scoped reads
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_scoped ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR private.has_role(auth.uid(), 'dispatcher')
  OR EXISTS (
    SELECT 1 FROM public.deliveries d
    WHERE (d.retailer_staff_id = auth.uid() AND d.rider_id = profiles.id)
       OR (d.rider_id = auth.uid() AND d.retailer_staff_id = profiles.id)
  )
);

-- user_roles: own row or dispatcher
DROP POLICY IF EXISTS user_roles_select_authenticated ON public.user_roles;
CREATE POLICY user_roles_select_scoped ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'dispatcher'));

-- trigger function uses private helper
CREATE OR REPLACE FUNCTION public.enforce_delivery_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);