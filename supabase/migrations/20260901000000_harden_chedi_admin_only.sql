-- Harden the CHEDI admin restriction to a single admin identity.
-- This must be applied in Supabase SQL editor after the Auth user exists.

CREATE OR REPLACE FUNCTION public.is_chedi_admin_email()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'chedifoundation8@gmail.com';
$$;

REVOKE ALL ON FUNCTION public.is_chedi_admin_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_chedi_admin_email() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_chedi_admin_email()
    AND EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE user_id = auth.uid() AND role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

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

  UPDATE public.admin_users
  SET role = 'staff'
  WHERE role = 'admin' AND user_id <> auth.uid();

  INSERT INTO public.admin_users (user_id, display_name, role)
  VALUES (auth.uid(), 'CHEDI administrator', 'admin')
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      role = 'admin';

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_chedi_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_chedi_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_single_admin_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' AND NOT public.is_chedi_admin_email() THEN
    RAISE EXCEPTION 'Admin role is restricted to the CHEDI administrator account only.';
  END IF;

  IF NEW.role = 'admin' THEN
    UPDATE public.admin_users
    SET role = 'staff'
    WHERE role = 'admin' AND user_id <> NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_users_single_identity_guard ON public.admin_users;
CREATE TRIGGER admin_users_single_identity_guard
BEFORE INSERT OR UPDATE OF role
ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_admin_identity();

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_single_admin_idx
ON public.admin_users (role)
WHERE role = 'admin';
