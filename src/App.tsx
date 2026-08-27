import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Facebook,
  HeartHandshake,
  Instagram,
  Leaf,
  Mail,
  MapPin,
  Menu,
  Phone,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Music2,
  UsersRound,
  X,
  Youtube,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import AdminDashboard, { AdminLogin, StaffWorkspace } from '@/components/AdminDashboard';

type Program = {
  title: string;
  description: string;
  color: string;
  icon: typeof HeartHandshake;
  image: string;
  details: string;
};

type ModalType = 'donate' | 'volunteer' | 'partner' | 'contact' | 'admin' | null;

const heroImage = '/CHEDI3.jpg';
const communityImage = '/CHEDI1.jpg';
const cleanUpImage = '/CHEDI2.jpg';
const studentImage = '/CHEDI4.jpg';
const wasteImages = ['/CHEDI%20WASTE%201.jpg', '/CHEDI%20WASTE2.jpg', '/CHEDI%20WASTE3.jpg', '/CHEDI%20WASTE4.jpg'];
const heroSlides = [
  { image: heroImage, label: 'Our community, our strength' },
  { image: communityImage, label: 'Community-led health action' },
  { image: wasteImages[0], label: 'Cleaner spaces, healthier homes' },
  { image: studentImage, label: 'Hope in every classroom' },
];

const programs: Program[] = [
  { title: 'Community Health', description: 'Health education, disease prevention, screenings, and maternal-child nutrition support led by local health promoters.', color: 'green', icon: HeartHandshake, image: '/CHEDI2.jpg', details: 'Community health promoters meet residents where they are, sharing trusted information, connecting families to care, and supporting healthier daily choices.' },
  { title: 'Environmental Action', description: 'Clean-up campaigns, door-to-door waste collection, recycling awareness, and conservation for a healthier home.', color: 'blue', icon: Leaf, image: wasteImages[0], details: 'Our waste collection work helps keep shared spaces safer through community clean-ups, household collection, sorting awareness, and practical environmental action.' },
  { title: 'Menstrual Dignity', description: 'Safe spaces, menstrual health education, sanitary products, and advocacy for adolescent girls and young mothers.', color: 'orange', icon: Sparkles, image: '/CHEDI1.jpg', details: 'We create respectful spaces where girls and young mothers can access accurate information, practical support, and the confidence to speak about menstrual health.' },
  { title: 'WASH & Hygiene', description: 'Practical household sanitation, handwashing promotion, and water, sanitation and hygiene education.', color: 'teal', icon: ShieldCheck, image: wasteImages[1], details: 'WASH activities connect cleaner surroundings with healthier households through hygiene education, sanitation habits, and community-led waste reduction.' },
];

const gallery = [
  { image: heroImage, label: 'Community health outreach', tall: true },
  { image: cleanUpImage, label: 'A cleaner Kibera', tall: false },
  { image: studentImage, label: 'Hope in every classroom', tall: false },
  { image: communityImage, label: 'Together, we rise', tall: true },
];

function Logo() {
  return <a href="#top" className="logo" aria-label="CHEDI home"><img className="chedi-logo" src="/CHEDI%20LOGO.png" alt="CHEDI — Community Health, Environment & Dignity Initiative" /></a>;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [submitted, setSubmitted] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState('2,500');
  const [submitError, setSubmitError] = useState('');
  const [publicNews, setPublicNews] = useState<{ title: string; category: string; published_at: string | null }[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [accountRole, setAccountRole] = useState<'admin' | 'staff' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [heroSlide, setHeroSlide] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.from('news').select('title, category, published_at').eq('published', true).order('published_at', { ascending: false }).limit(3).then(({ data }) => {
      if (mounted && data) setPublicNews(data);
    });
    supabase.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) { setAccountRole(null); return; }
    supabase.rpc('get_my_role').then(({ data }) => setAccountRole(data === 'admin' || data === 'staff' ? data : null));
  }, [session]);

  useEffect(() => {
    if (carouselPaused) return;
    const interval = window.setInterval(() => setHeroSlide((current) => (current + 1) % heroSlides.length), 5500);
    return () => window.clearInterval(interval);
  }, [carouselPaused]);

  useEffect(() => {
    const finishLoading = () => setIsLoading(false);
    if (document.readyState === 'complete') finishLoading();
    else window.addEventListener('load', finishLoading);
    const fallback = window.setTimeout(finishLoading, 1200);
    return () => { window.removeEventListener('load', finishLoading); window.clearTimeout(fallback); };
  }, []);

  const closeModal = () => {
    setModal(null);
    setSubmitted(false);
    setSubmitError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const message = String(form.get('message') ?? '').trim();
    let error: { message: string } | null = null;
    if (modal === 'donate') {
      const amount = Number(String(form.get('amount') ?? selectedDonation).replace(/,/g, ''));
      if (!Number.isInteger(amount) || amount < 1) { setSubmitError('Please enter a valid amount.'); return; }
      ({ error } = await supabase.from('donations').insert({ donor_email: email, amount_kes: amount, status: 'pledged' }));
    } else if (modal === 'volunteer' || modal === 'partner') {
      ({ error } = await supabase.from('applications').insert({ application_type: modal, name, email, organization: String(form.get('organization') ?? '').trim() || null, focus_area: String(form.get('focus_area') ?? '').trim() || null, message }));
    } else if (modal === 'contact') {
      ({ error } = await supabase.from('contact_messages').insert({ name, email, message }));
    }
    if (error) { console.error('CHEDI form submission failed', error); setSubmitError('We could not send that just now. Please try again.'); return; }
    setSubmitted(true);
  };

  if (isLoading) return <div className="site-loader" role="status" aria-label="Loading CHEDI"><img src="/CHEDI%20LOGO.png" alt="" /><span /></div>;

  return (
    <div id="top" className="site-shell">
      <div className="topline"><div className="container topline-inner"><span><MapPin size={14} /> Kibera, Nairobi, Kenya</span><span className="topline-message">Giving back with compassion, health and hope.</span><span><Mail size={14} /> chedifoundation8@gmail.com</span></div></div>
      <header className="header">
        <div className="container nav-wrap">
          <Logo />
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
          <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
            <a href="#who-we-are" onClick={() => setMenuOpen(false)}>Who we are</a>
            <a href="#programs" onClick={() => setMenuOpen(false)}>Our work</a>
            <a href="#impact" onClick={() => setMenuOpen(false)}>Our impact</a>
            <a href="#stories" onClick={() => setMenuOpen(false)}>Stories</a>
            <button className="nav-donate" onClick={() => setModal('donate')}>Support CHEDI <ArrowRight size={16} /></button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero" onMouseEnter={() => setCarouselPaused(true)} onMouseLeave={() => setCarouselPaused(false)}>
          <div key={heroSlide} className="hero-image" style={{ backgroundImage: `url(${heroSlides[heroSlide].image})` }} role="img" aria-label={heroSlides[heroSlide].label} />
          <div className="hero-overlay" />
          <div className="container hero-content">
            <p className="eyebrow light"><span /> Community-led. Dignity-first.</p>
            <h1>Health, hope &amp;<br /><em>dignity</em> for all.</h1>
            <p className="hero-copy">We are a grassroots community organization working with residents of Kibera to build healthier, safer and more hopeful futures—together.</p>
            <div className="hero-actions"><a className="button button-primary" href="#who-we-are">Discover our work <ArrowRight size={18} /></a><button className="play-button" onClick={() => setModal('contact')}><span><Play size={15} fill="currentColor" /></span> See our story</button></div>
          </div>
          <div className="hero-note"><span className="hero-note-line" /><strong>{String(heroSlide + 1).padStart(2, '0')}</strong><span>of {String(heroSlides.length).padStart(2, '0')} &nbsp; / &nbsp; {heroSlides[heroSlide].label}</span><div className="hero-controls"><button onClick={() => setHeroSlide((heroSlide - 1 + heroSlides.length) % heroSlides.length)} aria-label="Previous homepage image"><ChevronLeft size={17} /></button><button onClick={() => setHeroSlide((heroSlide + 1) % heroSlides.length)} aria-label="Next homepage image"><ChevronRight size={17} /></button></div></div>
          <div className="hero-dots" role="tablist" aria-label="Homepage images">{heroSlides.map((slide, index) => <button key={slide.image} className={heroSlide === index ? 'active' : ''} onClick={() => setHeroSlide(index)} role="tab" aria-label={`Show image ${index + 1}: ${slide.label}`} aria-selected={heroSlide === index} />)}</div>
        </section>

        <section className="intro-section" id="who-we-are">
          <div className="container intro-grid">
            <div className="intro-heading"><div className="intro-video-wrap"><video className="intro-video" autoPlay muted loop playsInline poster={communityImage} aria-label="CHEDI waste collection activity"><source src="/WASTE%20COLLECTION%20VID.mp4" type="video/mp4" />Your browser does not support the video tag.</video><span className="intro-video-label">Community action in motion</span></div><p className="eyebrow"><span /> Who we are</p><h2>Change starts<br /><em>from within.</em></h2><div className="line-accent" /></div>
            <div className="intro-copy"><p className="lead">CHEDI is a grassroots Community-Based Organization founded by passionate community members and frontline Community Health Promoters in Kibera, Nairobi.</p><p>We believe lasting change begins within communities. By putting local knowledge, skills and leadership at the center, we create practical solutions that respond directly to real needs on the ground.</p><button className="text-link text-button" onClick={() => setStoryExpanded(!storyExpanded)} aria-expanded={storyExpanded}> {storyExpanded ? 'Close our story' : 'Read our story'} <ArrowRight size={16} className={storyExpanded ? 'rotate-180' : ''} /></button>{storyExpanded && <div className="story-expanded"><div className="story-expanded-images">{wasteImages.map((image, index) => <img src={image} alt={`CHEDI waste collection activity ${index + 1}`} key={image} />)}</div><p>Our work is powered by local leadership. Six community health promoters and nine community members, including youth, bring practical knowledge, energy and accountability to every initiative.</p><p>From waste collection and clean-up activities to health education and dignity programs, we listen first and build solutions with the people who live the reality every day.</p></div>}</div>
          </div>
        </section>

        <section className="marquee"><div className="marquee-track"><span>Compassion</span><b>•</b><span>Health</span><b>•</b><span>Hope</span><b>•</b><span>Dignity</span><b>•</b><span>Compassion</span><b>•</b><span>Health</span><b>•</b><span>Hope</span></div></section>

        <section className="program-section" id="programs">
          <div className="container"><div className="section-heading-row"><div><p className="eyebrow"><span /> What we do</p><h2>Practical action.<br /><em>Lasting change.</em></h2></div><p className="section-intro">Across eight strategic pillars, we partner with communities to turn everyday challenges into opportunities for wellbeing, resilience and growth.</p></div>
            <div className="program-grid">{programs.map(({ title, description, color, icon: Icon, image, details }, index) => <article className={`program-card ${color}`} key={title}><img className="program-card-image" src={image} alt={`${title} activity`} /><div className="program-card-content"><div className="program-top"><span className="program-number">0{index + 1}</span><span className="program-icon"><Icon size={23} /></span></div><h3>{title}</h3><p>{description}</p><button className="program-more" onClick={() => setSelectedProgram(selectedProgram === title ? null : title)} aria-label={`${selectedProgram === title ? 'Hide' : 'Show'} more details about ${title}`} aria-expanded={selectedProgram === title}><ArrowRight size={17} className={selectedProgram === title ? 'rotate-180' : ''} /></button></div>{selectedProgram === title && <div className="program-details"><strong>{title}</strong><p>{details}</p></div>}</article>)}</div>
            <div className="program-footer"><span>Also working across</span><strong>Social support</strong><i /><strong>Capacity building</strong><i /><strong>Advocacy &amp; partnerships</strong><i /><strong>Research &amp; learning</strong></div>
          </div>
        </section>

        <section className="impact-section" id="impact"><div className="container impact-grid"><div className="impact-image-wrap"><img src={communityImage} alt="Community members gathered together" /><div className="image-caption"><span>Community voices</span><strong>are the beginning<br />of every solution.</strong></div></div><div className="impact-copy"><p className="eyebrow"><span /> Our approach</p><h2>Rooted in<br /><em>community.</em></h2><p className="lead">Our work is community-led, evidence-informed and partnership-driven.</p><p>From schools and religious institutions to health facilities, government agencies and development partners, we bring people together to build solutions that last.</p><div className="values"><span><Check size={15} /> Compassion</span><span><Check size={15} /> Integrity</span><span><Check size={15} /> Accountability</span><span><Check size={15} /> Inclusion</span></div><button className="button button-dark" onClick={() => setModal('partner')}>Work with us <ArrowRight size={17} /></button></div></div></section>

        <section className="numbers-section"><div className="container"><div className="numbers-heading"><p className="eyebrow light"><span /> The difference we make</p><h2>Small actions.<br /><em>Big ripples.</em></h2></div><div className="numbers-grid"><div><strong>8</strong><span>Strategic pillars</span></div><div><strong>25k<span>+</span></strong><span>People reached</span></div><div><strong>150<span>+</span></strong><span>Community health promoters</span></div><div><strong>12</strong><span>Local partnerships</span></div></div></div></section>

        <section className="stories-section" id="stories"><div className="container"><div className="section-heading-row"><div><p className="eyebrow"><span /> From the field</p><h2>Stories that<br /><em>stay with you.</em></h2></div><a className="text-link" href="#news">View all stories <ArrowRight size={16} /></a></div><div className="story-feature"><video controls playsInline preload="metadata" poster={studentImage} aria-label="Latifa shares her story"><source src="/WhatsApp%20Video%202026-08-26%20at%201.57.13%20PM.mp4" type="video/mp4" />Your browser does not support the video tag.</video><div className="story-text"><span className="tag">Latifa’s story</span><h3>“My story matters.<br />My future matters too.”</h3><p>Latifa is a young mother whose courage and voice remind us why community-led support, dignity and opportunity matter.</p><a className="text-link" href="#contact">Connect with CHEDI <ArrowRight size={16} /></a></div></div></div></section>

        <section className="gallery-section"><div className="container"><div className="gallery-heading"><p className="eyebrow"><span /> In pictures</p><h2>Life at the<br /><em>heart of Kibera.</em></h2><p>Every image is a reminder that change is not an abstract idea. It is people, showing up for one another.</p></div><div className="gallery-grid">{gallery.map((item) => <div className={`gallery-item ${item.tall ? 'tall' : ''}`} key={item.label}><img src={item.image} alt={item.label} /><div className="gallery-label">{item.label}<ArrowRight size={15} /></div></div>)}</div></div></section>

        <section className="news-section" id="news"><div className="container"><div className="section-heading-row"><div><p className="eyebrow"><span /> News &amp; updates</p><h2>Stay close to<br /><em>the work.</em></h2></div><button className="text-link text-button">Explore all updates <ArrowRight size={16} /></button></div><div className="news-grid">{publicNews.length > 0 ? publicNews.map((item) => <article key={item.title}><div className="news-meta"><span>{item.category}</span><span>{item.published_at ? new Date(item.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span></div><h3>{item.title}</h3><a className="text-link" href="#contact">Read more <ArrowRight size={16} /></a></article>) : <><article><div className="news-meta"><span>Field note</span><span>18 Jun 2026</span></div><h3>Why community health promoters are the backbone of better care</h3><a className="text-link" href="#contact">Read article <ArrowRight size={16} /></a></article><article><div className="news-meta"><span>Upcoming event</span><span>12 Jul 2026</span></div><h3>Kibera Community Clean-Up Day is back. Bring your neighbours.</h3><a className="text-link" href="#contact">Save your spot <ArrowRight size={16} /></a></article><article><div className="news-meta"><span>CHEDI journal</span><span>02 Jun 2026</span></div><h3>Five ways to support menstrual dignity beyond Menstrual Hygiene Day</h3><a className="text-link" href="#contact">Read journal <ArrowRight size={16} /></a></article></>}</div></div></section>

        <section className="cta-section"><div className="container cta-inner"><div><p className="eyebrow light"><span /> You can be part of this</p><h2>Hope is a practice.<br /><em>Let’s practice it together.</em></h2></div><div className="cta-actions"><button className="button button-orange" onClick={() => setModal('donate')}>Give with purpose <HeartHandshake size={18} /></button><button className="button button-outline" onClick={() => setModal('volunteer')}>Join our movement <UsersRound size={18} /></button></div></div></section>
      </main>

      <footer className="footer" id="contact"><div className="container footer-grid"><div><Logo /><p className="footer-motto">Giving back with compassion,<br />health and hope.</p><div className="socials"><a href="https://www.facebook.com/chedifoundation" target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={16} /></a><a href="https://www.instagram.com/chedifoundation" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={16} /></a><a href="https://www.tiktok.com/@chedifoundation" target="_blank" rel="noreferrer" aria-label="TikTok"><Music2 size={16} /></a><a href="https://www.youtube.com/@chedifoundation" target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube size={16} /></a></div></div><div><h4>Explore</h4><a href="#who-we-are">Who we are</a><a href="#programs">Our work</a><a href="#impact">Our impact</a><a href="#news">News &amp; stories</a></div><div><h4>Get involved</h4><button onClick={() => setModal('volunteer')}>Volunteer with us</button><button onClick={() => setModal('partner')}>Become a partner</button><button onClick={() => setModal('donate')}>Make a donation</button><button onClick={() => setModal('admin')}>Staff dashboard</button></div><div><h4>Say hello</h4><a href="mailto:chedifoundation8@gmail.com"><Mail size={15} /> chedifoundation8@gmail.com</a><a href="tel:+254704827013"><Phone size={15} /> 0704 827 013</a><p><MapPin size={15} /> Kibera, Nairobi<br />Kenya</p><p className="member-note">15 members: 6 community health promoters and 9 community members (youths).</p></div></div><div className="container footer-bottom"><span>© 2026 CHEDI. Community, dignity, always.</span><span>Privacy &amp; safeguarding</span></div></footer>

      {modal && modal !== 'admin' && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div className="modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={closeModal} aria-label="Close"><X size={20} /></button>
        {submitted ? <div className="success-state"><span className="success-icon"><Check /></span><h2>Thank you for showing up.</h2><p>Your message is safely in our inbox. A member of the CHEDI team will be in touch soon.</p><button className="button button-dark" onClick={closeModal}>Back to the site</button></div> : <><p className="eyebrow"><span /> {modal === 'donate' ? 'Support the work' : modal === 'volunteer' ? 'Join the movement' : modal === 'partner' ? 'Build with us' : 'Start a conversation'}</p><h2>{modal === 'donate' ? <>Give with<br /><em>purpose.</em></> : modal === 'volunteer' ? <>Your time can<br /><em>move a city.</em></> : modal === 'partner' ? <>Stronger<br /><em>together.</em></> : <>We’d love to<br /><em>hear from you.</em></>}</h2>{modal === 'donate' ? <form onSubmit={handleSubmit}><p className="form-label">Choose an amount (KES)</p><div className="donation-options">{['500', '1,000', '2,500', '5,000'].map(amount => <button type="button" className={selectedDonation === amount ? 'selected' : ''} onClick={() => setSelectedDonation(amount)} key={amount}>KES {amount}</button>)}</div><label>Or enter another amount<input name="amount" type="text" placeholder="KES  amount" /></label><label>Your email<input name="email" type="email" placeholder="you@example.com" required /></label><button className="button button-orange full" type="submit">Continue securely <ArrowRight size={17} /></button><small className="secure-note"><ShieldCheck size={14} /> Secure giving. Every contribution supports community-led work.</small></form> : <form onSubmit={handleSubmit}><div className="form-two"><label>Your name<input name="name" required placeholder="Full name" /></label><label>Email address<input name="email" required type="email" placeholder="you@example.com" /></label></div>{modal === 'volunteer' && <label>How would you like to help?<select name="focus_area" defaultValue=""><option value="" disabled>Select an area</option><option>Community outreach</option><option>Events and clean-ups</option><option>Communications</option><option>Fundraising</option></select></label>}{modal === 'partner' && <label>Organization name<input name="organization" required placeholder="Your organization" /></label>}<label>Tell us a little more<textarea name="message" required rows={4} placeholder="Write your message here..." /></label><button className="button button-dark full" type="submit">Send message <Send size={16} /></button></form>}{submitError && <p className="form-error" role="alert">{submitError}</p>}</>}
      </div></div>}

      {modal === 'admin' && (session ? accountRole === 'admin' ? <AdminDashboard session={session} onClose={closeModal} /> : accountRole === 'staff' ? <StaffWorkspace session={session} onClose={closeModal} /> : <div className="admin-loading">Checking account access...</div> : <AdminLogin onClose={closeModal} onSuccess={() => {}} />)}
    </div>
  );
}

export default App;
