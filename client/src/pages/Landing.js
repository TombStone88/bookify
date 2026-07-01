import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Icon = ({ d, size = 20, color = '#7c3aed' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const FEATURES = [
  { icon: 'M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z', title: 'Personal Library',
    desc: 'Upload and organize your PDF books. Track your reading progress across every title in your collection.' },
  { icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', title: 'Book Clubs',
    desc: 'Create or join reading clubs. Share books, discuss chapters, and read together with friends in real time.' },
  { icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', title: 'Live Chat',
    desc: 'Real-time messaging inside every club. Discuss your latest read while the thoughts are still fresh.' },
  { icon: 'M18 20V10M12 20V4M6 20v-6', title: 'Reading Analytics',
    desc: 'Visual stats on your reading habits — books completed, pages read, and streaks to keep you motivated.' },
  { icon: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z', title: 'In-Browser PDF Reader',
    desc: "Read without leaving the app. Your progress is saved automatically so you never lose your place." },
  { icon: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z', title: 'Reading Goals',
    desc: 'Set a yearly reading goal and watch your progress grow. Celebrate milestones along the way.' },
];

const STATS = [
  { value: '10K+', label: 'Books Uploaded' },
  { value: '2K+',  label: 'Active Readers' },
  { value: '500+', label: 'Book Clubs' },
  { value: '98%',  label: 'Satisfaction' },
];

export default function Landing() {
  const navigate  = useNavigate();
  const { token } = useAuth();
  const heroRef   = useRef(null);

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    const handleMove = (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const dx = (clientX / innerWidth  - 0.5) * 14;
      const dy = (clientY / innerHeight - 0.5) * 14;
      if (heroRef.current) heroRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #ececf3',
        padding: '0 clamp(1.5rem, 5vw, 4rem)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📚</div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1f2230' }}>Bookify</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <a href="#features" style={{ color: '#6b6b80', fontSize: '0.9rem', textDecoration: 'none' }}
               onMouseEnter={e => e.target.style.color = '#1f2230'} onMouseLeave={e => e.target.style.color = '#6b6b80'}>Features</a>
            <a href="#about" style={{ color: '#6b6b80', fontSize: '0.9rem', textDecoration: 'none' }}
               onMouseEnter={e => e.target.style.color = '#1f2230'} onMouseLeave={e => e.target.style.color = '#6b6b80'}>About</a>
            <button onClick={() => navigate('/auth')} className="btn-ghost" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>Log in</button>
            <button onClick={() => navigate('/auth?mode=register')} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>Get started</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(70px, 12vw, 140px) clamp(1.5rem, 5vw, 4rem)', textAlign: 'center' }}>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `linear-gradient(#f1eefd 1px, transparent 1px), linear-gradient(90deg, #f1eefd 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 30%, black 30%, transparent 80%)',
        }} />
        <div style={{
          position: 'absolute', top: '15%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 600, background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
          zIndex: 0, pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 99, background: '#f3edff', border: '1px solid #e2d6fc',
          color: '#7c3aed', fontSize: '0.8rem', fontWeight: 600, marginBottom: 28,
          animation: 'fadeIn 0.6s ease forwards' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
          Your reading life, levelled up
        </div>

        <h1 style={{
          position: 'relative', zIndex: 1, fontSize: 'clamp(2.3rem, 6vw, 4.5rem)', fontWeight: 800,
          lineHeight: 1.12, letterSpacing: '-0.02em', color: '#1a1a2e', marginBottom: 24,
          animation: 'slideUp 0.6s 0.1s ease both',
        }}>
          Where books become<br />
          <span style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            shared adventures
          </span>
        </h1>

        <p style={{
          position: 'relative', zIndex: 1, fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#5b5b70',
          maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7,
          animation: 'slideUp 0.6s 0.2s ease both',
        }}>
          Upload your books, track your progress, join reading clubs, and discuss chapters
          with friends — all in one beautiful space.
        </p>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap',
          animation: 'slideUp 0.6s 0.3s ease both' }}>
          <button onClick={() => navigate('/auth?mode=register')} className="btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            Start reading free →
          </button>
          <button onClick={() => navigate('/auth')} className="btn-ghost" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            Sign in
          </button>
        </div>

        {/* Mock app preview */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '64px auto 0', animation: 'slideUp 0.8s 0.4s ease both' }}>
          <div style={{
            background: '#ffffff', border: '1px solid #ececf3', borderRadius: 20, padding: 20,
            boxShadow: '0 30px 80px rgba(20,20,40,0.12)',
          }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Books Uploaded', val: '24' },
                { label: 'Currently Reading', val: '3' },
                { label: 'Avg Progress', val: '67%' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f7f5ff', border: '1px solid #ece4ff', borderRadius: 12, padding: '12px 16px', textAlign: 'left' }}>
                  <p style={{ fontSize: '0.65rem', color: '#8a8aa0', marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1f2230' }}>{s.val}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div style={{ background: '#fafafe', borderRadius: 12, padding: 16, border: '1px solid #ececf3' }}>
                <p style={{ fontSize: '0.7rem', color: '#a4a4b8', marginBottom: 12 }}>Your Library</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ aspectRatio: '2/3', borderRadius: 6,
                      background: `linear-gradient(135deg, hsl(${260 + i * 16}, 55%, ${88 - i * 2}%), hsl(${270 + i * 12}, 45%, ${78 - i * 2}%))` }} />
                  ))}
                </div>
              </div>
              <div style={{ background: '#fafafe', borderRadius: 12, padding: 16, border: '1px solid #ececf3',
                display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: '0.7rem', color: '#a4a4b8', marginBottom: 4 }}>Reading Goal</p>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', border: '6px solid #ece4ff', borderTop: '6px solid #7c3aed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1f2230' }}>12</span>
                    <span style={{ fontSize: '0.5rem', color: '#a4a4b8' }}>/ 24</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.6rem', color: '#7c3aed', textAlign: 'center', fontWeight: 600 }}>50% of yearly goal</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(3rem,6vw,5rem) clamp(1.5rem,5vw,4rem)', borderTop: '1px solid #ececf3', borderBottom: '1px solid #ececf3', background: '#fafafe' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '2rem', textAlign: 'center' }}>
          {STATS.map(s => (
            <div key={s.label}>
              <p style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 800,
                background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</p>
              <p style={{ color: '#6b6b80', fontSize: '0.875rem', marginTop: 4, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section id="features" style={{ padding: 'clamp(5rem,10vw,8rem) clamp(1.5rem,5vw,4rem)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#7c3aed', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Everything you need
            </p>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Built for serious readers
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="glass" style={{ padding: '2rem', borderRadius: 16, borderRadius: 16, transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(20,20,40,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(20,20,40,0.04)'; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f3edff', border: '1px solid #e2d6fc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon d={f.icon} size={20} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1f2230', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: '#6b6b80', fontSize: '0.9rem', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────── */}
      <section id="about" style={{ padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,4rem)', borderTop: '1px solid #ececf3', background: '#fafafe' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#7c3aed', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              About Bookify
            </p>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.75rem)', fontWeight: 800, color: '#1a1a2e', lineHeight: 1.25, marginBottom: 24 }}>
              Reading is better<br />when it's shared
            </h2>
            <p style={{ color: '#5b5b70', lineHeight: 1.75, marginBottom: 16 }}>
              Bookify was built on the belief that great books deserve great conversations.
              We created a space where your personal reading life and your social reading life
              can coexist — without compromise.
            </p>
            <p style={{ color: '#5b5b70', lineHeight: 1.75, marginBottom: 32 }}>
              Upload any PDF, read it in the browser, and when something strikes you — share it
              with your club. It's your library, your pace, your community.
            </p>
            <button onClick={() => navigate('/auth?mode=register')} className="btn-primary">Join Bookify →</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { icon: '📖', title: 'Read anywhere', desc: 'Browser-based PDF reader — no downloads, no friction.' },
              { icon: '🏆', title: 'Achieve more', desc: 'Set reading goals and track your streak every day.' },
              { icon: '🎯', title: 'Stay focused', desc: 'Progress bars keep your reading momentum going.' },
              { icon: '💬', title: 'Never read alone', desc: 'Real-time club chat keeps the conversation alive.' },
            ].map((item, i) => (
              <div key={i} className="glass" style={{ padding: '1.5rem', borderRadius: 14 }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>{item.icon}</div>
                <h4 style={{ fontWeight: 700, color: '#1f2230', marginBottom: 6, fontSize: '0.95rem' }}>{item.title}</h4>
                <p style={{ color: '#6b6b80', fontSize: '0.82rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(5rem,10vw,8rem) clamp(1.5rem,5vw,4rem)', textAlign: 'center' }}>
        <div style={{
          maxWidth: 700, margin: '0 auto', padding: 'clamp(3rem,6vw,5rem)',
          background: 'linear-gradient(135deg, #f3edff, #fdf7ff)', border: '1px solid #e2d6fc',
          borderRadius: 24, position: 'relative', overflow: 'hidden',
        }}>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 800, color: '#1a1a2e', marginBottom: 16, lineHeight: 1.2 }}>
            Ready to build your library?
          </h2>
          <p style={{ color: '#5b5b70', marginBottom: 32, lineHeight: 1.7 }}>
            Join thousands of readers who use Bookify to track, share, and enjoy their reading life.
            Free forever, no credit card required.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/auth?mode=register')} className="btn-primary" style={{ padding: '0.875rem 2.25rem', fontSize: '1rem' }}>
              Get started for free
            </button>
            <button onClick={() => navigate('/auth')} className="btn-ghost" style={{ padding: '0.875rem 2.25rem', fontSize: '1rem' }}>
              I have an account
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #ececf3', padding: 'clamp(2rem,4vw,3rem) clamp(1.5rem,5vw,4rem)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📚</div>
            <span style={{ fontWeight: 700, color: '#6b6b80', fontSize: '0.9rem' }}>Bookify</span>
          </div>
          <p style={{ color: '#a4a4b8', fontSize: '0.8rem' }}>© {new Date().getFullYear()} Bookify · Built for readers</p>
        </div>
      </footer>
    </div>
  );
}
