/*
# Create CHEDI content, submissions, and staff access tables

1. New tables
- `admin_users`: maps approved Supabase accounts to staff access.
- `news`: published stories, field notes, and event updates shown on the public website.
- `gallery_items`: approved photo records shown in the public gallery.
- `applications`: volunteer and partnership applications submitted by visitors.
- `donations`: donation pledges submitted by visitors until a payment provider is connected.
- `contact_messages`: general enquiries submitted through the contact form.

2. Security
- Row Level Security is enabled on every table.
- Public visitors may read only published news and gallery records.
- Public visitors may submit applications, donation pledges, and contact messages, but cannot read, edit, or delete submissions.
- Only approved staff accounts listed in `admin_users` may manage content and review submissions.
- The `is_admin` function uses the signed-in account identity and has a fixed search path.

3. Important notes
- No payment provider is activated by this migration; donation records are pledges and should not be treated as paid transactions.
- The first staff account must be approved by inserting its authenticated user id into `admin_users` through a trusted operator workflow.
- All timestamps are stored in UTC.
*/

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'CHEDI staff',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text NOT NULL,
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Field note',
  cover_image_url text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  alt_text text NOT NULL,
  image_url text NOT NULL,
  category text NOT NULL DEFAULT 'Community',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_type text NOT NULL CHECK (application_type IN ('volunteer', 'partnership')),
  name text NOT NULL,
  email text NOT NULL,
  organization text,
  focus_area text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'contacted', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_email text NOT NULL,
  amount_kes integer NOT NULL CHECK (amount_kes > 0 AND amount_kes <= 10000000),
  status text NOT NULL DEFAULT 'pledged' CHECK (status IN ('pledged', 'paid', 'cancelled')),
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_admin_users" ON public.admin_users;
CREATE POLICY "admins_read_admin_users" ON public.admin_users FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admins_insert_admin_users" ON public.admin_users;
CREATE POLICY "admins_insert_admin_users" ON public.admin_users FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admins_update_admin_users" ON public.admin_users;
CREATE POLICY "admins_update_admin_users" ON public.admin_users FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admins_delete_admin_users" ON public.admin_users;
CREATE POLICY "admins_delete_admin_users" ON public.admin_users FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "public_read_published_news" ON public.news;
CREATE POLICY "public_read_published_news" ON public.news FOR SELECT TO anon, authenticated USING (published = true OR public.is_admin());
DROP POLICY IF EXISTS "admins_insert_news" ON public.news;
CREATE POLICY "admins_insert_news" ON public.news FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admins_update_news" ON public.news;
CREATE POLICY "admins_update_news" ON public.news FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admins_delete_news" ON public.news;
CREATE POLICY "admins_delete_news" ON public.news FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "public_read_published_gallery" ON public.gallery_items;
CREATE POLICY "public_read_published_gallery" ON public.gallery_items FOR SELECT TO anon, authenticated USING (published = true OR public.is_admin());
DROP POLICY IF EXISTS "admins_insert_gallery" ON public.gallery_items;
CREATE POLICY "admins_insert_gallery" ON public.gallery_items FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admins_update_gallery" ON public.gallery_items;
CREATE POLICY "admins_update_gallery" ON public.gallery_items FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admins_delete_gallery" ON public.gallery_items;
CREATE POLICY "admins_delete_gallery" ON public.gallery_items FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "public_submit_applications" ON public.applications;
CREATE POLICY "public_submit_applications" ON public.applications FOR INSERT TO anon, authenticated WITH CHECK (application_type IN ('volunteer', 'partnership') AND status = 'new');
DROP POLICY IF EXISTS "admins_read_applications" ON public.applications;
CREATE POLICY "admins_read_applications" ON public.applications FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admins_update_applications" ON public.applications;
CREATE POLICY "admins_update_applications" ON public.applications FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admins_delete_applications" ON public.applications;
CREATE POLICY "admins_delete_applications" ON public.applications FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "public_submit_donations" ON public.donations;
CREATE POLICY "public_submit_donations" ON public.donations FOR INSERT TO anon, authenticated WITH CHECK (status = 'pledged' AND amount_kes > 0 AND amount_kes <= 10000000);
DROP POLICY IF EXISTS "admins_read_donations" ON public.donations;
CREATE POLICY "admins_read_donations" ON public.donations FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admins_update_donations" ON public.donations;
CREATE POLICY "admins_update_donations" ON public.donations FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admins_delete_donations" ON public.donations;
CREATE POLICY "admins_delete_donations" ON public.donations FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "public_submit_contact_messages" ON public.contact_messages;
CREATE POLICY "public_submit_contact_messages" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (status = 'new');
DROP POLICY IF EXISTS "admins_read_contact_messages" ON public.contact_messages;
CREATE POLICY "admins_read_contact_messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "admins_update_contact_messages" ON public.contact_messages;
CREATE POLICY "admins_update_contact_messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admins_delete_contact_messages" ON public.contact_messages;
CREATE POLICY "admins_delete_contact_messages" ON public.contact_messages FOR DELETE TO authenticated USING (public.is_admin());

CREATE INDEX IF NOT EXISTS news_published_at_idx ON public.news (published, published_at DESC);
CREATE INDEX IF NOT EXISTS gallery_published_idx ON public.gallery_items (published, created_at DESC);
CREATE INDEX IF NOT EXISTS applications_status_idx ON public.applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS donations_status_idx ON public.donations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON public.contact_messages (status, created_at DESC);