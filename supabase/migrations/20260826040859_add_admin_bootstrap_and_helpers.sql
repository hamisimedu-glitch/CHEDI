/*
# Admin bootstrap, slug helper, and updated_at triggers

1. New Functions
- `bootstrap_first_admin()`: SECURITY DEFINER function that allows the FIRST authenticated user to self-promote to admin. Only works when `admin_users` is empty, preventing privilege escalation after bootstrap.
- `slugify(input text)`: generates a URL-safe slug from arbitrary text (lowercase, hyphenated, trimmed).
- `set_updated_at()`: trigger function that sets `updated_at = now()` on row update.

2. New Triggers
- `news_set_updated_at`: fires on UPDATE of `news`, keeping `updated_at` current.
- `gallery_items_set_updated_at`: fires on UPDATE of `gallery_items`, keeping `updated_at` current.

3. Security
- `bootstrap_first_admin()` is SECURITY DEFINER with fixed `search_path = public`, executable by `authenticated`. It checks that `admin_users` is empty before inserting, so only the very first staff member can self-promote. All subsequent admin additions must be done by an existing admin through the dashboard.
- `slugify()` is marked IMMUTABLE and executable by `authenticated`.
- `set_updated_at()` is a standard trigger function, no direct execution grants needed.

4. Important notes
- After deploying, the first staff member signs up via the admin login screen and is automatically promoted. They can then invite other staff by adding their accounts through the dashboard.
- The bootstrap function will refuse to run once any admin exists, so it is safe to leave deployed.
*/

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  admin_count integer;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT count(*) INTO admin_count FROM public.admin_users;
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'An admin already exists. Ask an existing admin to add you.';
  END IF;

  INSERT INTO public.admin_users (user_id) VALUES (uid);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          trim(input),
          '[^a-zA-Z0-9\s-]',
          '',
          'g'
        ),
        '\s+',
        '-',
        'g'
      ),
      '-+',
      '-',
      'g'
    )
  )
$$;

REVOKE ALL ON FUNCTION public.slugify(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.slugify(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.slugify(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS news_set_updated_at ON public.news;
CREATE TRIGGER news_set_updated_at
  BEFORE UPDATE ON public.news
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS gallery_items_set_updated_at ON public.gallery_items;
CREATE TRIGGER gallery_items_set_updated_at
  BEFORE UPDATE ON public.gallery_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();