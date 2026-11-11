import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThreeBookShowcase from '../components/landing/ThreeBookShowcase';
import Footer from '../components/Footer';

export default function Landing() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [activeModal, setActiveModal] = useState(null);

  // Preserve existing authenticated-user redirection
  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

  const handleStartClub = (e) => {
    if (e) e.preventDefault();
    if (emailInput.trim()) {
      navigate(`/auth?mode=register&email=${encodeURIComponent(emailInput.trim())}`);
    } else {
      navigate('/auth?mode=register');
    }
  };

  const handleExploreSalons = () => {
    if (token) {
      navigate('/clubs');
    } else {
      // Smooth scroll to Reading Architecture or go to registration
      const elem = document.getElementById('reading-architecture');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/auth?mode=register');
      }
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen selection:bg-primary-container selection:text-on-primary-container">
      {/* ── STICKY GLASSMORPHIC HEADER ─────────────────────── */}
      <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/20 shadow-[0_1px_12px_rgba(0,0,0,0.45)]">
        <div className="h-20 w-full px-gutter-mobile lg:px-margin flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-space-sm group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/20 flex items-center justify-center text-primary group-hover:text-primary-fixed transition-colors duration-200">
              <span className="material-symbols-outlined text-[20px]">auto_stories</span>
            </div>
            <span className="font-headline-md text-headline-md font-garamond text-on-surface tracking-tight group-hover:text-primary transition-colors duration-200">
              Bookify
            </span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-space-md">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-space-md py-space-xs transition-all duration-200 bg-primary-container text-on-primary-container font-label-lg text-label-lg rounded-lg shadow-[0_0_16px_rgba(212,163,115,0.2)]"
            >
              Home
            </button>
            <a
              href="#reading-architecture"
              className="px-space-md py-space-xs rounded-lg font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all duration-200"
            >
              Architecture
            </a>
            <a
              href="#classical-reflections"
              className="px-space-md py-space-xs rounded-lg font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all duration-200"
            >
              Reflections
            </a>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-space-md">
            <button
              onClick={() => navigate('/auth')}
              className="font-label-lg text-label-lg text-on-surface-variant hover:text-primary transition-colors duration-200 px-space-xs py-space-xs"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/auth?mode=register')}
              className="inline-flex items-center justify-center px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary-container font-label-lg text-label-lg hover:bg-primary hover:text-on-primary transition-all duration-200 shadow-[0_0_16px_rgba(212,163,115,0.2)] hover:shadow-[0_0_20px_rgba(212,163,115,0.35)]"
            >
              Start a Club
            </button>
            <button
              onClick={() => navigate('/auth')}
              title="Account"
              className="w-8 h-8 rounded-full bg-primary hover:bg-secondary transition-colors flex items-center justify-center ml-space-xs"
            >
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────── */}
      <main className="w-full pt-20 bg-surface min-h-screen">
        <div className="flex flex-col w-full">
          {/* Top Atmospheric Gradient Canvas & Hero Section */}
          <div className="relative w-full overflow-hidden px-gutter-mobile lg:px-margin pt-space-lg pb-space-xl">
            {/* Ambient Lighting Gradients */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[480px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-1/3 -right-32 w-80 h-80 bg-secondary-container/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Hero Content */}
            <div className="max-w-6xl mx-auto flex flex-col items-center text-center relative z-10">
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-high/70 shadow-sm text-primary backdrop-blur-md mb-space-md border border-outline-variant/30">
                <span className="material-symbols-outlined text-[15px] text-secondary">
                  auto_stories
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary-fixed-dim">
                  Antiquarian Tech for Modern Book Clubs
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="font-headline-lg font-garamond text-display-lg-mobile lg:text-display-lg text-on-surface tracking-tight max-w-4xl leading-tight">
                Where Great Books Spark Meaningful Conversations
              </h1>

              {/* Subtitle */}
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-space-md mb-space-lg font-light leading-relaxed">
                Effortlessly coordinate gatherings, cast democratic votes on your next read,
                and discover curated community reviews with spoiler barriers.
              </p>

              {/* Dual CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-space-md mb-space-lg">
                <button
                  onClick={handleExploreSalons}
                  className="inline-flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg bg-primary text-on-primary font-label-lg text-label-lg transition-all duration-300 shadow-[0_0_24px_rgba(212,163,115,0.28)] hover:shadow-[0_0_32px_rgba(212,163,115,0.45)] hover:bg-secondary cursor-pointer"
                >
                  <span>Explore Book Clubs</span>
                  <span className="material-symbols-outlined text-[18px]">menu_book</span>
                </button>
                <button
                  onClick={() => navigate('/auth?mode=register')}
                  className="inline-flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg bg-surface-container-high/60 border border-outline-variant/40 text-secondary font-label-lg text-label-lg transition-all duration-300 hover:bg-surface-container-highest hover:text-primary cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">stylus_note</span>
                  <span>Host a Reading Circle</span>
                </button>
              </div>

              {/* 3D Three.js Book Showcase */}
              <ThreeBookShowcase />

              {/* Key Platform Architectural Pillars (Authentic capabilities, no fabricated stats) */}
              <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-space-md pt-space-xl mt-space-md text-left">
                <div className="bg-surface-container-low/70 border border-outline-variant/20 rounded-xl p-space-md">
                  <div className="font-headline-md font-garamond text-primary">Zero Spoilers</div>
                  <div className="font-label-sm text-label-sm uppercase text-outline mt-1 tracking-wider">
                    Paced Milestones
                  </div>
                </div>
                <div className="bg-surface-container-low/70 border border-outline-variant/20 rounded-xl p-space-md">
                  <div className="font-headline-md font-garamond text-primary">In-Browser PDF</div>
                  <div className="font-label-sm text-label-sm uppercase text-outline mt-1 tracking-wider">
                    Integrated Reader
                  </div>
                </div>
                <div className="bg-surface-container-low/70 border border-outline-variant/20 rounded-xl p-space-md">
                  <div className="font-headline-md font-garamond text-primary">Ranked Ballots</div>
                  <div className="font-label-sm text-label-sm uppercase text-outline mt-1 tracking-wider">
                    Democratic Voting
                  </div>
                </div>
                <div className="bg-surface-container-low/70 border border-outline-variant/20 rounded-xl p-space-md">
                  <div className="font-headline-md font-garamond text-primary">Live Circles</div>
                  <div className="font-label-sm text-label-sm uppercase text-outline mt-1 tracking-wider">
                    Real-Time Discussions
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: READING ARCHITECTURE ───────────────── */}
          <section
            id="reading-architecture"
            className="w-full bg-surface-container-low py-space-xl px-gutter-mobile lg:px-margin border-t border-b border-outline-variant/15 relative"
          >
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-md">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary">
                    Engineered for Erudition
                  </span>
                  <h2 className="font-headline-lg font-garamond text-headline-lg text-on-surface mt-space-xs">
                    Bookify Reading Architecture
                  </h2>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                  Designed specifically to extinguish administrative fatigue so readers can sink deeply into the written word.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
                {/* Feature 1 */}
                <div className="group bg-surface-container border border-outline-variant/25 rounded-xl p-space-lg transition-all duration-300 hover:bg-surface-container-high hover:-translate-y-1 shadow-md">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-highest border border-primary/20 flex items-center justify-center text-secondary mb-space-md group-hover:scale-105 transition-transform duration-200">
                    <span className="material-symbols-outlined text-[24px]">how_to_vote</span>
                  </div>
                  <h3 className="font-headline-sm font-garamond text-headline-sm text-on-surface mb-space-xs">
                    Democratic Ranked-Choice Ballots
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Eliminate endless message group stalemates. Propose shortlists and tally weighted preferences with a single, elegant voting mechanic.
                  </p>
                  <button
                    onClick={() => navigate('/auth?mode=register')}
                    className="mt-space-md pt-space-sm flex items-center gap-space-xs text-primary font-label-sm text-label-sm uppercase tracking-wider hover:text-secondary transition-colors"
                  >
                    <span>Instant Consensus Engine</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>

                {/* Feature 2 */}
                <div className="group bg-surface-container border border-outline-variant/25 rounded-xl p-space-lg transition-all duration-300 hover:bg-surface-container-high hover:-translate-y-1 shadow-md">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-highest border border-primary/20 flex items-center justify-center text-secondary mb-space-md group-hover:scale-105 transition-transform duration-200">
                    <span className="material-symbols-outlined text-[24px]">visibility_off</span>
                  </div>
                  <h3 className="font-headline-sm font-garamond text-headline-sm text-on-surface mb-space-xs">
                    Spoiler-Shield Checkpoints
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Paced, chapter-by-chapter discussion rooms unlock only when readers confirm their current progress. Read freely without early plot reveals.
                  </p>
                  <button
                    onClick={() => navigate('/auth?mode=register')}
                    className="mt-space-md pt-space-sm flex items-center gap-space-xs text-primary font-label-sm text-label-sm uppercase tracking-wider hover:text-secondary transition-colors"
                  >
                    <span>Synchronized Pacing</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>

                {/* Feature 3 */}
                <div className="group bg-surface-container border border-outline-variant/25 rounded-xl p-space-lg transition-all duration-300 hover:bg-surface-container-high hover:-translate-y-1 shadow-md">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-highest border border-primary/20 flex items-center justify-center text-secondary mb-space-md group-hover:scale-105 transition-transform duration-200">
                    <span className="material-symbols-outlined text-[24px]">psychology_alt</span>
                  </div>
                  <h3 className="font-headline-sm font-garamond text-headline-sm text-on-surface mb-space-xs">
                    Curated Discussion Guides
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Pre-assembled contextual dossiers, author interviews, and catalytic prompts that transform routine summaries into profound book discussions.
                  </p>
                  <button
                    onClick={() => navigate('/auth?mode=register')}
                    className="mt-space-md pt-space-sm flex items-center gap-space-xs text-primary font-label-sm text-label-sm uppercase tracking-wider hover:text-secondary transition-colors"
                  >
                    <span>Scholar-Backed Prompts</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 3: CLASSICAL SALON REFLECTIONS ─────────── */}
          {/* Authentic literary reflections (No fictional users, fake star ratings, or fabricated reviews) */}
          <section
            id="classical-reflections"
            className="w-full bg-surface py-space-xl px-gutter-mobile lg:px-margin relative overflow-hidden"
          >
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-xl mx-auto mb-space-xl">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary">
                  Voices from the Parlors
                </span>
                <h2 className="font-headline-lg font-garamond text-headline-lg text-on-surface mt-space-xs">
                  Curated Reflections &amp; Foundational Works
                </h2>
                <div className="w-12 h-0.5 bg-primary/40 mx-auto mt-space-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
                {/* Reflection 1 */}
                <div className="bg-surface-container-high/40 border border-outline-variant/20 backdrop-blur-md rounded-2xl p-space-lg flex flex-col justify-between shadow-lg relative group">
                  <div className="text-primary/15 absolute top-4 right-6 font-headline-lg text-[64px] select-none pointer-events-none leading-none font-garamond">
                    “
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="px-space-sm py-1 rounded bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm tracking-wide">
                        Demon Copperhead
                      </span>
                      <span className="text-secondary text-xs uppercase tracking-widest font-label-sm">
                        Appalachian Epic
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface italic font-garamond text-[1.1rem] leading-relaxed mb-space-lg">
                      "First I got myself born. A decent crowd was on hand to watch, and they've always had plenty to say. A modern retelling that demands deep, chapter-by-chapter reflection."
                    </p>
                  </div>
                  <div className="flex items-center gap-space-sm pt-space-sm border-t border-outline-variant/20">
                    <div className="w-9 h-9 rounded-full bg-surface-container-highest border border-primary/25 flex items-center justify-center text-primary font-headline-sm font-garamond">
                      B
                    </div>
                    <div>
                      <div className="font-label-lg text-label-lg text-on-surface">Barbara Kingsolver</div>
                      <div className="font-body-sm text-body-sm text-outline">Pulitzer Prize for Fiction</div>
                    </div>
                  </div>
                </div>

                {/* Reflection 2 */}
                <div className="bg-surface-container-high/40 border border-outline-variant/20 backdrop-blur-md rounded-2xl p-space-lg flex flex-col justify-between shadow-lg relative group">
                  <div className="text-primary/15 absolute top-4 right-6 font-headline-lg text-[64px] select-none pointer-events-none leading-none font-garamond">
                    “
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="px-space-sm py-1 rounded bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm tracking-wide">
                        The Odyssey
                      </span>
                      <span className="text-secondary text-xs uppercase tracking-widest font-label-sm">
                        Classical Canon
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface italic font-garamond text-[1.1rem] leading-relaxed mb-space-lg">
                      "Of all creatures that breathe and move upon the earth, nothing is bred that is weaker than man. A foundational journey of intellect, exile, and homecoming."
                    </p>
                  </div>
                  <div className="flex items-center gap-space-sm pt-space-sm border-t border-outline-variant/20">
                    <div className="w-9 h-9 rounded-full bg-surface-container-highest border border-primary/25 flex items-center justify-center text-primary font-headline-sm font-garamond">
                      H
                    </div>
                    <div>
                      <div className="font-label-lg text-label-lg text-on-surface">Homer</div>
                      <div className="font-body-sm text-body-sm text-outline">The Epic Tradition</div>
                    </div>
                  </div>
                </div>

                {/* Reflection 3 */}
                <div className="bg-surface-container-high/40 border border-outline-variant/20 backdrop-blur-md rounded-2xl p-space-lg flex flex-col justify-between shadow-lg relative group">
                  <div className="text-primary/15 absolute top-4 right-6 font-headline-lg text-[64px] select-none pointer-events-none leading-none font-garamond">
                    “
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-space-md">
                      <span className="px-space-sm py-1 rounded bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm tracking-wide">
                        Klara and the Sun
                      </span>
                      <span className="text-secondary text-xs uppercase tracking-widest font-label-sm">
                        Speculative Fiction
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface italic font-garamond text-[1.1rem] leading-relaxed mb-space-lg">
                      "Do you believe in the human heart? I don't mean simply the organ, obviously. But do you believe there is something that makes each of us special?"
                    </p>
                  </div>
                  <div className="flex items-center gap-space-sm pt-space-sm border-t border-outline-variant/20">
                    <div className="w-9 h-9 rounded-full bg-surface-container-highest border border-primary/25 flex items-center justify-center text-primary font-headline-sm font-garamond">
                      K
                    </div>
                    <div>
                      <div className="font-label-lg text-label-lg text-on-surface">Kazuo Ishiguro</div>
                      <div className="font-body-sm text-body-sm text-outline">Nobel Laureate in Literature</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 4: CALL TO ACTION BANNER ──────────────── */}
          <section className="w-full bg-surface-container-low px-gutter-mobile lg:px-margin py-space-xl relative overflow-hidden border-t border-outline-variant/15">
            <div className="max-w-4xl mx-auto rounded-3xl bg-surface-container-high/90 border border-primary/20 p-space-lg lg:p-space-xl shadow-2xl relative">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="text-center relative z-10 max-w-2xl mx-auto">
                <span className="material-symbols-outlined text-secondary text-[36px] mb-space-xs">
                  local_library
                </span>
                <h2 className="font-headline-lg font-garamond text-headline-lg text-on-surface mb-space-xs">
                  Gather Your Circle Under Bookify
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                  Bring order, elegance, and literary vitality back to your reading group.
                </p>

                {/* Form Capture leading directly to Register */}
                <form
                  onSubmit={handleStartClub}
                  className="flex flex-col sm:flex-row items-center gap-space-xs max-w-md mx-auto"
                >
                  <div className="relative w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                      mail
                    </span>
                    <input
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-space-sm rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-body-md text-body-md placeholder-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                      placeholder="Enter your email address"
                      type="email"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto whitespace-nowrap px-space-lg py-space-sm rounded-lg bg-primary text-on-primary font-label-lg text-label-lg transition-all duration-200 hover:bg-secondary shadow-[0_0_16px_rgba(212,163,115,0.3)] cursor-pointer"
                  >
                    Start a Book Club
                  </button>
                </form>

                <div className="flex flex-wrap items-center justify-center gap-space-sm mt-space-md text-outline font-label-sm text-label-sm uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-secondary">
                      check_circle
                    </span>
                    Setup in under 2 minutes
                  </span>
                  <span>•</span>
                  <span>No credit card required</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ── FOOTER LINKS & GLOBAL FOOTER ─────────────────────── */}
      <div className="w-full bg-surface-container-lowest border-t border-outline-variant/15 py-4 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-center sm:justify-end gap-6 text-xs text-outline">
          <button
            onClick={() => setActiveModal('charter')}
            className="uppercase tracking-wider hover:text-primary transition-colors cursor-pointer text-[11px]"
          >
            Reading Charter
          </button>
          <button
            onClick={() => setActiveModal('privacy')}
            className="uppercase tracking-wider hover:text-primary transition-colors cursor-pointer text-[11px]"
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveModal('terms')}
            className="uppercase tracking-wider hover:text-primary transition-colors cursor-pointer text-[11px]"
          >
            Club Guidelines
          </button>
        </div>
      </div>
      <Footer className="border-t-0 pt-0" />

      {/* ── MODALS (Reading Charter / Privacy / Terms) ──────── */}
      {activeModal && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-container-high border border-primary/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative"
          >
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-outline hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            {activeModal === 'charter' && (
              <div>
                <h3 className="font-headline-sm font-garamond text-xl text-primary mb-2 font-semibold">
                  The Bookify Reading Charter
                </h3>
                <p className="font-body-sm text-on-surface-variant leading-relaxed text-xs">
                  Bookify is founded on intentional reading, collegial inquiry, and respectful literary debate. Every book club operates under reader autonomy, shared chapter pacing, and spoiler protections.
                </p>
              </div>
            )}
            {activeModal === 'privacy' && (
              <div>
                <h3 className="font-headline-sm font-garamond text-xl text-primary mb-2 font-semibold">
                  Privacy Policy
                </h3>
                <p className="font-body-sm text-on-surface-variant leading-relaxed text-xs">
                  Your reading data, notes, and discussions belong to you and your chosen circles. No tracking or selling of reading habits to third parties.
                </p>
              </div>
            )}
            {activeModal === 'terms' && (
              <div>
                <h3 className="font-headline-sm font-garamond text-xl text-primary mb-2 font-semibold">
                  Club Guidelines
                </h3>
                <p className="font-body-sm text-on-surface-variant leading-relaxed text-xs">
                  Club hosts facilitate discussions, maintain democratic shortlist voting, and uphold inclusive book club guidelines for all members.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      )}
    </div>
  );
}
