import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleUserRound,
  FileText,
  HeartHandshake,
  Image as ImageIcon,
  Inbox,
  LogOut,
  Mail,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Users,
  UserPlus,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type AdminTab = 'overview' | 'stories' | 'gallery' | 'applications' | 'messages' | 'donations' | 'staff';

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  cover_image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type GalleryItem = {
  id: string;
  title: string;
  alt_text: string;
  image_url: string;
  category: string;
  published: boolean;
  created_at: string;
};

type Application = {
  id: string;
  application_type: string;
  name: string;
  email: string;
  organization: string | null;
  focus_area: string | null;
  message: string;
  status: string;
  created_at: string;
};

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
};

type Donation = {
  id: string;
  donor_email: string;
  amount_kes: number;
  status: string;
  created_at: string;
};

type StaffRequest = {
  id: string;
  email: string;
  display_name: string;
  status: string;
  created_at: string;
};

const CATEGORIES = ['Field note', 'Upcoming event', 'CHEDI journal', 'Impact story', 'Announcement'];
const GALLERY_CATEGORIES = ['Community', 'Health', 'Environment', 'Education', 'Events'];
const APP_STATUSES = ['new', 'reviewing', 'contacted', 'closed'];
const MSG_STATUSES = ['new', 'read', 'replied', 'closed'];
const DONATION_STATUSES = ['pledged', 'paid', 'cancelled'];

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const formatDateTime = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const formatKES = (amount: number) => 'KES ' + amount.toLocaleString('en-KE');

const slugifyLocal = (text: string) =>
  text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

type AdminDashboardProps = {
  session: Session;
  onClose: () => void;
};

export default function AdminDashboard({ session, onClose }: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [adminName, setAdminName] = useState('CHEDI staff');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ stories: 0, gallery: 0, applications: 0, messages: 0, donations: 0, pendingApps: 0, pendingMsgs: 0, totalDonations: 0 });
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.rpc('is_admin').then(({ data }) => setAuthorized(data === true));
  }, [session.user.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [newsRes, galleryRes, appsRes, msgsRes, donsRes, adminRes] = await Promise.all([
      supabase.from('news').select('id', { count: 'exact', head: true }),
      supabase.from('gallery_items').select('id', { count: 'exact', head: true }),
      supabase.from('applications').select('id, status', { count: 'exact' }),
      supabase.from('contact_messages').select('id, status', { count: 'exact' }),
      supabase.from('donations').select('id, amount_kes, status', { count: 'exact' }),
      supabase.from('admin_users').select('display_name').maybeSingle(),
    ]);

    if (adminRes.data?.display_name) setAdminName(adminRes.data.display_name);

    const apps = appsRes.data ?? [];
    const msgs = msgsRes.data ?? [];
    const dons = donsRes.data ?? [];

    setStats({
      stories: newsRes.count ?? 0,
      gallery: galleryRes.count ?? 0,
      applications: appsRes.count ?? 0,
      messages: msgsRes.count ?? 0,
      donations: donsRes.count ?? 0,
      pendingApps: apps.filter(a => a.status === 'new').length,
      pendingMsgs: msgs.filter(m => m.status === 'new').length,
      totalDonations: dons.filter(d => d.status !== 'cancelled').reduce((sum, d) => sum + d.amount_kes, 0),
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  if (authorized === false) {
    return <div className="admin-login-shell"><div className="admin-login-card"><img src="/CHEDI%20LOGO.png" alt="CHEDI" className="admin-login-logo" /><p className="eyebrow"><span /> Access pending</p><h2>Thanks for <em>signing up.</em></h2><p className="admin-login-sub">Your account is not an administrator account. Ask the CHEDI administrator to approve your staff access before signing in here.</p><button className="button button-green full" onClick={handleSignOut}>Return to the site</button></div></div>;
  }
  if (authorized !== true) return <div className="admin-loading">Checking access...</div>;

  const initials = adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'CH';

  const navItems: { key: AdminTab; label: string; icon: typeof Inbox; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'stories', label: 'Stories', icon: Newspaper },
    { key: 'gallery', label: 'Gallery', icon: ImageIcon },
    { key: 'applications', label: 'Applications', icon: Users, badge: stats.pendingApps },
    { key: 'messages', label: 'Messages', icon: Mail, badge: stats.pendingMsgs },
    { key: 'donations', label: 'Donations', icon: HeartHandshake },
    { key: 'staff', label: 'Staff requests', icon: UserPlus },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <img src="/CHEDI%20LOGO.png" alt="CHEDI" className="admin-sidebar-logo" />
          <span>Dashboard</span>
        </div>
        <nav className="admin-nav-list">
          {navItems.map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              className={`admin-nav-item ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {badge ? <span className="admin-nav-badge">{badge}</span> : null}
            </button>
          ))}
        </nav>
        <button className="admin-signout" onClick={handleSignOut}>
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h2>{navItems.find(n => n.key === tab)?.label}</h2>
            <span className="admin-topbar-sub">{formatDateTime(new Date().toISOString())}</span>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-user-chip">
              <span className="admin-avatar">{initials}</span>
              {adminName}
            </span>
            <button className="admin-close-btn" onClick={onClose} aria-label="Close dashboard">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="admin-content-area">
          {loading && tab === 'overview' ? (
            <div className="admin-loading">Loading dashboard...</div>
          ) : tab === 'overview' ? (
            <OverviewTab stats={stats} onNavigate={setTab} />
          ) : tab === 'stories' ? (
            <StoriesTab />
          ) : tab === 'gallery' ? (
            <GalleryTab />
          ) : tab === 'applications' ? (
            <ApplicationsTab />
          ) : tab === 'messages' ? (
            <MessagesTab />
          ) : tab === 'donations' ? (
            <DonationsTab />
          ) : tab === 'staff' ? (
            <StaffRequestsTab />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function StaffWorkspace({ session, onClose }: AdminDashboardProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  return <div className="admin-login-shell"><div className="admin-login-card"><img src="/CHEDI%20LOGO.png" alt="CHEDI" className="admin-login-logo" /><p className="eyebrow"><span /> Staff workspace</p><h2>Welcome to <em>CHEDI.</em></h2><p className="admin-login-sub">Your staff account has been approved. Content administration remains available only to the CHEDI administrator.</p><button className="button button-green full" onClick={handleSignOut}>Sign out</button></div></div>;
}

function StaffRequestsTab() {
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('staff_requests').select('id, email, display_name, status, created_at').order('created_at', { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRequest = async (id: string, action: 'approve_staff_request' | 'decline_staff_request') => {
    const { error } = await supabase.rpc(action, { request_id: id });
    if (error) window.alert(error.message);
    await load();
  };

  return <div className="admin-list-view"><div className="admin-list-header"><h3>Staff access requests</h3></div>{loading ? <div className="admin-loading">Loading staff requests...</div> : requests.length === 0 ? <div className="admin-empty"><UserPlus size={32} /><p>No staff requests yet.</p></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td className="admin-cell-title">{request.display_name}</td><td className="admin-cell-email">{request.email}</td><td><span className="admin-pill">{request.status}</span></td><td className="admin-cell-date">{formatDate(request.created_at)}</td><td className="admin-cell-actions">{request.status === 'pending' && <><button className="button button-green" onClick={() => updateRequest(request.id, 'approve_staff_request')}><Check size={14} /> Approve</button><button className="button button-outline-dark" onClick={() => updateRequest(request.id, 'decline_staff_request')}>Decline</button></>}</td></tr>)}</tbody></table></div>}</div>;
}

function OverviewTab({ stats, onNavigate }: { stats: { stories: number; gallery: number; applications: number; messages: number; donations: number; pendingApps: number; pendingMsgs: number; totalDonations: number }; onNavigate: (t: AdminTab) => void }) {
  const cards = [
    { label: 'Stories published', value: stats.stories, icon: Newspaper, tab: 'stories' as AdminTab, color: 'green' },
    { label: 'Gallery items', value: stats.gallery, icon: ImageIcon, tab: 'gallery' as AdminTab, color: 'blue' },
    { label: 'New applications', value: stats.pendingApps, icon: Users, tab: 'applications' as AdminTab, color: 'orange', sub: `${stats.applications} total` },
    { label: 'New messages', value: stats.pendingMsgs, icon: Mail, tab: 'messages' as AdminTab, color: 'teal', sub: `${stats.messages} total` },
    { label: 'Total pledged', value: formatKES(stats.totalDonations), icon: HeartHandshake, tab: 'donations' as AdminTab, color: 'green', sub: `${stats.donations} donations` },
  ];

  return (
    <div className="admin-overview">
      <div className="admin-stats-grid">
        {cards.map(({ label, value, icon: Icon, tab, color, sub }) => (
          <button className={`admin-stat-card ${color}`} key={label} onClick={() => onNavigate(tab)}>
            <div className="admin-stat-icon"><Icon size={22} /></div>
            <div className="admin-stat-info">
              <strong>{value}</strong>
              <span>{label}</span>
              {sub && <small>{sub}</small>}
            </div>
          </button>
        ))}
      </div>
      <div className="admin-quick-actions">
        <h3>Quick actions</h3>
        <div className="admin-action-row">
          <button onClick={() => onNavigate('stories')}><Plus size={16} /> Write a new story</button>
          <button onClick={() => onNavigate('gallery')}><Plus size={16} /> Add gallery photo</button>
          <button onClick={() => onNavigate('applications')}><Inbox size={16} /> Review applications</button>
          <button onClick={() => onNavigate('messages')}><Mail size={16} /> Read messages</button>
        </div>
      </div>
    </div>
  );
}

function StoriesTab() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this story permanently?')) return;
    await supabase.from('news').delete().eq('id', id);
    load();
  };

  const togglePublished = async (item: NewsItem) => {
    const published = !item.published;
    await supabase.from('news').update({
      published,
      published_at: published ? (item.published_at ?? new Date().toISOString()) : null,
    }).eq('id', item.id);
    load();
  };

  const filtered = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));

  if (showForm || editing) {
    return <StoryForm existing={editing} onDone={() => { setShowForm(false); setEditing(null); load(); }} onCancel={() => { setShowForm(false); setEditing(null); }} />;
  }

  return (
    <div className="admin-list-view">
      <div className="admin-list-header">
        <div className="admin-search-bar">
          <Search size={15} />
          <input placeholder="Search stories..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="button button-green" onClick={() => setShowForm(true)}><Plus size={16} /> New story</button>
      </div>
      {loading ? <div className="admin-loading">Loading stories...</div> : filtered.length === 0 ? (
        <div className="admin-empty">
          <Newspaper size={32} />
          <p>No stories yet. Click "New story" to create your first one.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Title</th><th>Category</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td className="admin-cell-title">{item.title}</td>
                  <td><span className="admin-pill">{item.category}</span></td>
                  <td>
                    <button className={`admin-toggle ${item.published ? 'on' : 'off'}`} onClick={() => togglePublished(item)}>
                      {item.published ? <><Check size={12} /> Published</> : 'Draft'}
                    </button>
                  </td>
                  <td className="admin-cell-date">{formatDate(item.created_at)}</td>
                  <td className="admin-cell-actions">
                    <button className="admin-icon-btn" onClick={() => setEditing(item)} aria-label="Edit"><Pencil size={15} /></button>
                    <button className="admin-icon-btn danger" onClick={() => handleDelete(item.id)} aria-label="Delete"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StoryForm({ existing, onDone, onCancel }: { existing: NewsItem | null; onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [excerpt, setExcerpt] = useState(existing?.excerpt ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [category, setCategory] = useState(existing?.category ?? CATEGORIES[0]);
  const [coverImage, setCoverImage] = useState(existing?.cover_image_url ?? '');
  const [published, setPublished] = useState(existing?.published ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !excerpt.trim()) { setError('Title and excerpt are required.'); return; }
    setSaving(true);
    const slug = existing?.slug ?? slugifyLocal(title);
    const payload = {
      title: title.trim(),
      slug,
      excerpt: excerpt.trim(),
      body: body.trim(),
      category,
      cover_image_url: coverImage.trim() || null,
      published,
      published_at: published ? (existing?.published_at ?? new Date().toISOString()) : null,
    };
    const { error: dbError } = existing
      ? await supabase.from('news').update(payload).eq('id', existing.id)
      : await supabase.from('news').insert(payload);
    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    onDone();
  };

  return (
    <div className="admin-form-view">
      <div className="admin-form-header">
        <h3>{existing ? 'Edit story' : 'New story'}</h3>
        <button className="admin-icon-btn" onClick={onCancel}><X size={18} /></button>
      </div>
      <form onSubmit={handleSubmit} className="admin-form">
        <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Story headline" required /></label>
        <label>Category
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Excerpt<input value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="One-sentence summary shown on the public site" required /></label>
        <label>Cover image URL<input value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://..." /></label>
        {coverImage && <img src={coverImage} alt="Cover preview" className="admin-image-preview" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
        <label>Full story<textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Write the full article here..." /></label>
        <label className="admin-checkbox-row">
          <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
          <span>Publish immediately (visible on the public site)</span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="admin-form-actions">
          <button type="button" className="button button-outline-dark" onClick={onCancel}>Cancel</button>
          <button type="submit" className="button button-green" disabled={saving}>{saving ? 'Saving...' : 'Save story'}</button>
        </div>
      </form>
    </div>
  );
}

function GalleryTab() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('gallery_items').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this photo from the gallery?')) return;
    await supabase.from('gallery_items').delete().eq('id', id);
    load();
  };

  const togglePublished = async (item: GalleryItem) => {
    await supabase.from('gallery_items').update({ published: !item.published }).eq('id', item.id);
    load();
  };

  if (showForm || editing) {
    return <GalleryForm existing={editing} onDone={() => { setShowForm(false); setEditing(null); load(); }} onCancel={() => { setShowForm(false); setEditing(null); }} />;
  }

  return (
    <div className="admin-list-view">
      <div className="admin-list-header">
        <h3>{items.length} photos</h3>
        <button className="button button-green" onClick={() => setShowForm(true)}><Plus size={16} /> Add photo</button>
      </div>
      {loading ? <div className="admin-loading">Loading gallery...</div> : items.length === 0 ? (
        <div className="admin-empty">
          <ImageIcon size={32} />
          <p>No photos yet. Add your first gallery image.</p>
        </div>
      ) : (
        <div className="admin-gallery-grid">
          {items.map(item => (
            <div className="admin-gallery-card" key={item.id}>
              <img src={item.image_url} alt={item.alt_text} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/34717769/pexels-photo-34717769.jpeg?auto=compress&cs=tinysrgb&h=300'; }} />
              <div className="admin-gallery-info">
                <strong>{item.title}</strong>
                <span>{item.category}</span>
                <div className="admin-gallery-actions">
                  <button className={`admin-toggle small ${item.published ? 'on' : 'off'}`} onClick={() => togglePublished(item)}>
                    {item.published ? 'Published' : 'Hidden'}
                  </button>
                  <button className="admin-icon-btn" onClick={() => setEditing(item)}><Pencil size={14} /></button>
                  <button className="admin-icon-btn danger" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryForm({ existing, onDone, onCancel }: { existing: GalleryItem | null; onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [altText, setAltText] = useState(existing?.alt_text ?? '');
  const [imageUrl, setImageUrl] = useState(existing?.image_url ?? '');
  const [category, setCategory] = useState(existing?.category ?? GALLERY_CATEGORIES[0]);
  const [published, setPublished] = useState(existing?.published ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !altText.trim() || !imageUrl.trim()) { setError('Title, alt text, and image URL are required.'); return; }
    setSaving(true);
    const payload = { title: title.trim(), alt_text: altText.trim(), image_url: imageUrl.trim(), category, published };
    const { error: dbError } = existing
      ? await supabase.from('gallery_items').update(payload).eq('id', existing.id)
      : await supabase.from('gallery_items').insert(payload);
    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    onDone();
  };

  return (
    <div className="admin-form-view">
      <div className="admin-form-header">
        <h3>{existing ? 'Edit photo' : 'Add photo'}</h3>
        <button className="admin-icon-btn" onClick={onCancel}><X size={18} /></button>
      </div>
      <form onSubmit={handleSubmit} className="admin-form">
        <label>Image URL<input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." required /></label>
        {imageUrl && <img src={imageUrl} alt="Preview" className="admin-image-preview" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
        <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Photo title" required /></label>
        <label>Alt text (accessibility)<input value={altText} onChange={e => setAltText(e.target.value)} placeholder="Describe the photo for screen readers" required /></label>
        <label>Category
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {GALLERY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="admin-checkbox-row">
          <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
          <span>Show on public website</span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="admin-form-actions">
          <button type="button" className="button button-outline-dark" onClick={onCancel}>Cancel</button>
          <button type="submit" className="button button-green" disabled={saving}>{saving ? 'Saving...' : 'Save photo'}</button>
        </div>
      </form>
    </div>
  );
}

function ApplicationsTab() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('applications').update({ status }).eq('id', id);
    load();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application?')) return;
    await supabase.from('applications').delete().eq('id', id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-list-view">
      <div className="admin-list-header">
        <div className="admin-search-bar">
          <Search size={15} />
          <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {loading ? <div className="admin-loading">Loading applications...</div> : filtered.length === 0 ? (
        <div className="admin-empty"><Users size={32} /><p>No applications yet.</p></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Type</th><th>Email</th><th>Status</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className={selected?.id === item.id ? 'selected' : ''}>
                  <td className="admin-cell-title">{item.name}</td>
                  <td><span className={`admin-pill ${item.application_type}`}>{item.application_type}</span></td>
                  <td className="admin-cell-email">{item.email}</td>
                  <td>
                    <select className="admin-status-select" value={item.status} onChange={e => updateStatus(item.id, e.target.value)}>
                      {APP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="admin-cell-date">{formatDate(item.created_at)}</td>
                  <td className="admin-cell-actions">
                    <button className="admin-icon-btn" onClick={() => setSelected(selected?.id === item.id ? null : item)} aria-label="View">
                      {selected?.id === item.id ? <ChevronDown size={15} className="rotate-180" /> : <ChevronDown size={15} />}
                    </button>
                    <button className="admin-icon-btn danger" onClick={() => handleDelete(item.id)} aria-label="Delete"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="admin-detail-panel">
          <div className="admin-detail-header">
            <h3>{selected.name}</h3>
            <button className="admin-icon-btn" onClick={() => setSelected(null)}><X size={16} /></button>
          </div>
          <div className="admin-detail-body">
            <div className="admin-detail-row"><strong>Email:</strong> <a href={`mailto:${selected.email}`}>{selected.email}</a></div>
            {selected.organization && <div className="admin-detail-row"><strong>Organization:</strong> {selected.organization}</div>}
            {selected.focus_area && <div className="admin-detail-row"><strong>Focus area:</strong> {selected.focus_area}</div>}
            <div className="admin-detail-row"><strong>Type:</strong> {selected.application_type}</div>
            <div className="admin-detail-row"><strong>Submitted:</strong> {formatDateTime(selected.created_at)}</div>
            <div className="admin-detail-message"><strong>Message:</strong><p>{selected.message}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessagesTab() {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('contact_messages').update({ status }).eq('id', id);
    load();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    await supabase.from('contact_messages').delete().eq('id', id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  const openMessage = (item: ContactMessage) => {
    setSelected(selected?.id === item.id ? null : item);
    if (item.status === 'new') updateStatus(item.id, 'read');
  };

  return (
    <div className="admin-list-view">
      {loading ? <div className="admin-loading">Loading messages...</div> : items.length === 0 ? (
        <div className="admin-empty"><Mail size={32} /><p>No messages yet.</p></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Message</th><th>Status</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={selected?.id === item.id ? 'selected' : ''}>
                  <td className="admin-cell-title">{item.name}</td>
                  <td className="admin-cell-email">{item.email}</td>
                  <td className="admin-cell-msg">{item.message.slice(0, 60)}{item.message.length > 60 ? '...' : ''}</td>
                  <td>
                    <select className="admin-status-select" value={item.status} onChange={e => updateStatus(item.id, e.target.value)}>
                      {MSG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="admin-cell-date">{formatDate(item.created_at)}</td>
                  <td className="admin-cell-actions">
                    <button className="admin-icon-btn" onClick={() => openMessage(item)} aria-label="View"><Mail size={15} /></button>
                    <button className="admin-icon-btn danger" onClick={() => handleDelete(item.id)} aria-label="Delete"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="admin-detail-panel">
          <div className="admin-detail-header">
            <h3>{selected.name}</h3>
            <button className="admin-icon-btn" onClick={() => setSelected(null)}><X size={16} /></button>
          </div>
          <div className="admin-detail-body">
            <div className="admin-detail-row"><strong>Email:</strong> <a href={`mailto:${selected.email}`}>{selected.email}</a></div>
            <div className="admin-detail-row"><strong>Received:</strong> {formatDateTime(selected.created_at)}</div>
            <div className="admin-detail-message"><strong>Message:</strong><p>{selected.message}</p></div>
            <a className="button button-green" href={`mailto:${selected.email}?subject=Re: Your message to CHEDI`}>
              Reply by email <ArrowRight size={15} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function DonationsTab() {
  const [items, setItems] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('donations').select('*').order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('donations').update({ status }).eq('id', id);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this donation record?')) return;
    await supabase.from('donations').delete().eq('id', id);
    load();
  };

  const total = items.filter(d => d.status !== 'cancelled').reduce((s, d) => s + d.amount_kes, 0);

  return (
    <div className="admin-list-view">
      <div className="admin-list-header">
        <h3>Total pledged: <strong>{formatKES(total)}</strong></h3>
      </div>
      {loading ? <div className="admin-loading">Loading donations...</div> : items.length === 0 ? (
        <div className="admin-empty"><HeartHandshake size={32} /><p>No donations yet.</p></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Donor email</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td className="admin-cell-email">{item.donor_email}</td>
                  <td className="admin-cell-amount">{formatKES(item.amount_kes)}</td>
                  <td>
                    <select className="admin-status-select" value={item.status} onChange={e => updateStatus(item.id, e.target.value)}>
                      {DONATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="admin-cell-date">{formatDate(item.created_at)}</td>
                  <td className="admin-cell-actions">
                    <button className="admin-icon-btn danger" onClick={() => handleDelete(item.id)} aria-label="Delete"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type AdminLoginProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export function AdminLogin({ onClose, onSuccess }: AdminLoginProps) {
  const [mode, setMode] = useState<'login' | 'request'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'request') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
      if (signUpError) { setError(signUpError.message); setLoading(false); return; }
      if (data.user && data.session) {
        const { error: requestError } = await supabase.from('staff_requests').insert({ user_id: data.user.id, email: email.trim(), display_name: displayName.trim() || 'CHEDI staff' });
        if (requestError) { setError(requestError.message); setLoading(false); return; }
        await supabase.auth.signOut();
        setError('Request submitted. The administrator must approve your staff access before you can sign in.');
        setMode('login');
      } else {
        setError('Account created. Confirm your email, then ask the administrator to approve your staff access.');
        setMode('login');
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) { setError(signInError.message); setLoading(false); return; }
      if (email.trim().toLowerCase() === 'chedifoundation8@gmail.com') {
        const { error: claimError } = await supabase.rpc('claim_chedi_admin');
        if (claimError) { setError('Admin access is not configured yet. Apply the latest Supabase migrations, then sign in again.'); setLoading(false); return; }
      }
      onSuccess();
      return;
    }
    setLoading(false);
  };

  return (
    <div className="admin-login-shell">
      <div className="admin-login-card">
        <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <img src="/CHEDI%20LOGO.png" alt="CHEDI" className="admin-login-logo" />
        <p className="eyebrow"><span /> Staff area</p>
        <h2>{mode === 'login' ? <>Welcome <em>back.</em></> : <>Request <em>access.</em></>}</h2>
        <p className="admin-login-sub">
          {mode === 'login'
            ? 'Only the CHEDI administrator and approved staff can sign in here.'
            : 'Create a staff account request. The administrator will review and approve it.'}
        </p>
        <form onSubmit={handleSubmit} className="admin-login-form">
          {mode === 'request' && <label>Your name
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Full name" required />
          </label>}
          <label>Email address
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@chedi.org" required />
          </label>
          <label>Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" minLength={8} required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="button button-green full" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Request staff access'}
          </button>
        </form>
        <button className="admin-login-toggle" onClick={() => { setMode(mode === 'login' ? 'request' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Need staff access? Submit a request' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
