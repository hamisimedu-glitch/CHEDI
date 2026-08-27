-- Separate the single administrator from approved staff accounts.

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'staff'
  CHECK (role IN ('admin', 'staff'));

UPDATE public.admin_users
SET role = 'admin'
WHERE user_id = (SELECT user_id FROM public.admin_users ORDER BY created_at ASC LIMIT 1);

CREATE UNIQUE INDEX IF NOT EXISTS one_chedi_admin
  ON public.admin_users (role)
  WHERE role = 'admin';

CREATE TABLE IF NOT EXISTS public.staff_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_create_staff_request" ON public.staff_requests;
CREATE POLICY "users_create_staff_request" ON public.staff_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_read_staff_requests" ON public.staff_requests;
CREATE POLICY "admins_read_staff_requests" ON public.staff_requests
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.admin_users WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_staff_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.staff_requests;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the administrator can approve staff';
  END IF;

  SELECT * INTO request_row FROM public.staff_requests WHERE id = request_id FOR UPDATE;
  IF request_row.id IS NULL THEN
    RAISE EXCEPTION 'Staff request not found';
  END IF;

  INSERT INTO public.admin_users (user_id, display_name, role)
  VALUES (request_row.user_id, request_row.display_name, 'staff')
  ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, role = 'staff';

  UPDATE public.staff_requests SET status = 'approved' WHERE id = request_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_staff_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the administrator can decline staff';
  END IF;
  UPDATE public.staff_requests SET status = 'declined' WHERE id = request_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_staff_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_staff_request(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.decline_staff_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_staff_request(uuid) TO authenticated;