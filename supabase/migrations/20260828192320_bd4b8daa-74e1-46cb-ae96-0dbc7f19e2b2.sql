-- Enums
CREATE TYPE public.app_role AS ENUM ('retailer_staff', 'dispatcher', 'rider');
CREATE TYPE public.delivery_status AS ENUM ('OPEN', 'ASSIGNED', 'PICKED_UP', 'DELIVERED');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- New user bootstrap: profile + role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    _role := (NEW.raw_user_meta_data ->> 'role')::public.app_role;
  EXCEPTION WHEN OTHERS THEN
    _role := 'retailer_staff';
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(_role, 'retailer_staff'))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Deliveries
CREATE TABLE public.deliveries (
  delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_staff_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rider_id UUID REFERENCES auth.users ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  item_description TEXT NOT NULL,
  status public.delivery_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX deliveries_status_idx ON public.deliveries (status);
CREATE INDEX deliveries_rider_idx ON public.deliveries (rider_id);
CREATE INDEX deliveries_staff_idx ON public.deliveries (retailer_staff_id);

GRANT SELECT, INSERT, UPDATE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliveries_select_scoped" ON public.deliveries
FOR SELECT TO authenticated
USING (
  retailer_staff_id = auth.uid()
  OR public.has_role(auth.uid(), 'dispatcher')
  OR (rider_id = auth.uid() AND public.has_role(auth.uid(), 'rider'))
);

CREATE POLICY "deliveries_insert_staff" ON public.deliveries
FOR INSERT TO authenticated
WITH CHECK (
  retailer_staff_id = auth.uid()
  AND public.has_role(auth.uid(), 'retailer_staff')
  AND status = 'OPEN'
  AND rider_id IS NULL
);

CREATE POLICY "deliveries_update_dispatcher_or_rider" ON public.deliveries
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'dispatcher')
  OR (rider_id = auth.uid() AND public.has_role(auth.uid(), 'rider'))
)
WITH CHECK (
  public.has_role(auth.uid(), 'dispatcher')
  OR (rider_id = auth.uid() AND public.has_role(auth.uid(), 'rider'))
);

-- Status transition + field integrity guard
CREATE OR REPLACE FUNCTION public.enforce_delivery_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_dispatcher BOOLEAN := public.has_role(auth.uid(), 'dispatcher');
  _is_rider BOOLEAN := public.has_role(auth.uid(), 'rider');
BEGIN
  NEW.updated_at := now();

  -- Immutable core fields
  IF NEW.delivery_id <> OLD.delivery_id
     OR NEW.retailer_staff_id <> OLD.retailer_staff_id
     OR NEW.customer_name <> OLD.customer_name
     OR NEW.customer_phone <> OLD.customer_phone
     OR NEW.delivery_address <> OLD.delivery_address
     OR NEW.item_description <> OLD.item_description
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Delivery details cannot be modified after creation';
  END IF;

  IF OLD.status = 'DELIVERED' THEN
    RAISE EXCEPTION 'Delivery is already DELIVERED and cannot be changed';
  END IF;

  -- Assignment
  IF NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN
    IF NOT _is_dispatcher THEN
      RAISE EXCEPTION 'Only a dispatcher can assign a rider';
    END IF;
    IF OLD.status <> 'OPEN' THEN
      RAISE EXCEPTION 'Only OPEN deliveries can be assigned';
    END IF;
    IF NEW.rider_id IS NULL OR NOT public.has_role(NEW.rider_id, 'rider') THEN
      RAISE EXCEPTION 'Assigned user must be a rider';
    END IF;
  END IF;

  -- Status transitions
  IF NEW.status <> OLD.status THEN
    IF OLD.status = 'OPEN' AND NEW.status = 'ASSIGNED' THEN
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
$$;

CREATE TRIGGER deliveries_enforce_rules
BEFORE UPDATE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.enforce_delivery_rules();