-- Keep one administrator identity. Set this account's password in Supabase Auth
-- directly; credentials must never be stored in application code or migrations.

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'CHEDI staff',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'staff'
  CHECK (role IN ('admin', 'staff'));

CREATE OR REPLACE FUNCTION public.is_chedi_admin_email()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'chedifoundation8@gmail.com';
$$;

UPDATE public.admin_users
SET role = 'staff'
WHERE role = 'admin';

INSERT INTO public.admin_users (user_id, display_name, role)
SELECT id, 'CHEDI administrator', 'admin'
FROM auth.users
WHERE lower(email) = 'chedifoundation8@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET display_name = EXCLUDED.display_name, role = 'admin';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_chedi_admin_email()
    AND EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_chedi_admin_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_chedi_admin_email() TO authenticated;

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

CREATE OR REPLACE FUNCTION public.claim_chedi_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_chedi_admin_email() THEN
    RAISE EXCEPTION 'Only the CHEDI administrator email can claim admin access';
  END IF;

  UPDATE public.admin_users SET role = 'staff' WHERE role = 'admin' AND user_id <> auth.uid();
  INSERT INTO public.admin_users (user_id, display_name, role)
  VALUES (auth.uid(), 'CHEDI administrator', 'admin')
  ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, role = 'admin';
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_chedi_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_chedi_admin() TO authenticated;