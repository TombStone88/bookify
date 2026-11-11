import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function Spinner({ size = 18 }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2px solid rgba(13,19,32,0.3)',
        borderTop: '2px solid #0d1320',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, token } = useAuth();

  const isRegisterMode = searchParams.get('mode') === 'register';
  const [isLogin, setIsLogin] = useState(!isRegisterMode);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [magicLinkMsg, setMagicLinkMsg] = useState(false);

  // Form State
  const initialEmail = searchParams.get('email') || '';
  const [form, setForm] = useState({
    name: '',
    email: initialEmail,
    password: '',
  });

  // Registration Extra State
  const [selectedRole, setSelectedRole] = useState('host');
  const [agreedToCharter, setAgreedToCharter] = useState(true);

  // Sync state if query param changes externally
  useEffect(() => {
    setIsLogin(searchParams.get('mode') !== 'register');
  }, [searchParams]);

  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  // Authenticated-user redirection
  useEffect(() => {
    if (token) navigate(redirectTarget, { replace: true });
  }, [token, navigate, redirectTarget]);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleModeSwitch = (targetLogin) => {
    setIsLogin(targetLogin);
    setMagicLinkMsg(false);
    const redirectParam = searchParams.get('redirect');
    const newParams = {};
    if (!targetLogin) newParams.mode = 'register';
    if (redirectParam) newParams.redirect = redirectParam;
    setSearchParams(newParams);
  };

  // Password strength calculation
  const strength = useMemo(() => {
    const val = form.password;
    if (!val || val.length === 0) {
      return { score: 0, label: 'Security: Waiting for input', color: 'text-outline' };
    }
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 8) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val) || val.length >= 12) score++;

    if (score === 1) return { score: 1, label: 'Security: Weak', color: 'text-error' };
    if (score === 2) return { score: 2, label: 'Security: Fair', color: 'text-amber-400' };
    if (score === 3) return { score: 3, label: 'Security: Good', color: 'text-secondary' };
    return { score: 4, label: 'Security: Strong', color: 'text-sage-400' };
  }, [form.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.post('/api/auth/login', {
          email: form.email,
          password: form.password,
        });
        login(res.data.token);
        toast.success('Welcome back to your reading circle! 👋');
        navigate(redirectTarget);
      } else {
        if (!agreedToCharter) {
          toast.error('Please accept the reading charter to proceed');
          setLoading(false);
          return;
        }
        await api.post('/api/auth/register', {
          name: form.name,
          email: form.email,
          password: form.password,
        });
        toast.success('Account created! Please sign in.');
        handleModeSwitch(true);
        setForm((p) => ({ ...p, password: '' }));
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Authentication failed. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = () => {
    toast(
      'Google single sign-on is scheduled for next dispatch. Please use email credentials.',
      { icon: '🏛️' }
    );
  };

  const handleMagicLink = () => {
    if (!form.email) {
      toast.error('Please enter your email address first.');
    } else {
      setMagicLinkMsg(true);
      toast.success(`Magic link simulation dispatched to ${form.email}`);
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen lg:h-screen lg:overflow-hidden selection:bg-primary-container selection:text-on-primary-container flex flex-col lg:flex-row relative">
      {/* ── LEFT COLUMN: EDITORIAL LITERARY SANCTUARY (Desktop) ── */}
      <div className="lg:w-5/12 xl:w-5/12 bg-surface-container-lowest/90 border-b lg:border-b-0 lg:border-r border-outline-variant/20 relative flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 overflow-hidden shrink-0">
        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 -right-20 w-80 h-80 bg-secondary-container/20 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Branding & Return Navigation */}
        <div className="relative z-10 flex items-center justify-between">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-space-sm group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/25 flex items-center justify-center text-primary group-hover:text-secondary transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[20px]">auto_stories</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm font-garamond text-headline-sm tracking-tight text-primary leading-none group-hover:text-secondary transition-colors">
                Bookify
              </span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant/70 text-[10px]">
                Book Clubs & Library
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1 font-label-sm text-label-sm uppercase tracking-wider text-outline hover:text-primary transition-colors py-1 px-2.5 rounded hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Back</span>
          </button>
        </div>

        {/* Center Editorial Manifesto & Features (Visible on tablet/desktop) */}
        <div className="relative z-10 my-6 lg:my-auto">
          <div className="inline-flex items-center gap-space-xs px-2.5 py-0.5 rounded-full bg-surface-container-high/80 border border-outline-variant/30 text-secondary text-[11px] font-label-sm tracking-widest uppercase mb-space-sm">
            <span>✦</span>
            <span>Antiquarian Reading Architecture</span>
          </div>

          <h2 className="font-headline-lg font-garamond text-2xl sm:text-3xl lg:text-[2.2rem] text-on-surface leading-tight mb-space-xs">
            Where Great Books Spark Meaningful Conversations
          </h2>

          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed max-w-md mb-space-md">
            A quiet sanctuary for readers and book clubs. Coordinate gatherings, vote on future reads, and explore chapter discussions protected from spoilers.
          </p>

          {/* 3 Core Architectural Pillars */}
          <div className="hidden sm:flex flex-col gap-space-sm pt-space-xs border-t border-outline-variant/20">
            <div className="flex items-start gap-space-sm">
              <div className="w-7 h-7 rounded bg-surface-container-high border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[15px]">visibility_off</span>
              </div>
              <div>
                <h4 className="font-label-lg text-label-lg text-on-surface font-semibold text-xs">
                  Spoiler-Shield Checkpoints
                </h4>
                <p className="font-body-sm text-on-surface-variant text-[11px] leading-normal">
                  Paced discussion milestones unlock as readers confirm their progress.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-space-sm">
              <div className="w-7 h-7 rounded bg-surface-container-high border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[15px]">how_to_vote</span>
              </div>
              <div>
                <h4 className="font-label-lg text-label-lg text-on-surface font-semibold text-xs">
                  Democratic Consensus Engine
                </h4>
                <p className="font-body-sm text-on-surface-variant text-[11px] leading-normal">
                  Ranked-choice ballots eliminate endless decision paralysis.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-space-sm">
              <div className="w-7 h-7 rounded bg-surface-container-high border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[15px]">menu_book</span>
              </div>
              <div>
                <h4 className="font-label-lg text-label-lg text-on-surface font-semibold text-xs">
                  Integrated Book Reader
                </h4>
                <p className="font-body-sm text-on-surface-variant text-[11px] leading-normal">
                  Read books directly in-browser with automatic progress synchronization.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Classical Quote */}
        <div className="relative z-10 hidden sm:block pt-space-sm border-t border-outline-variant/15 text-outline text-xs font-garamond italic">
          "A reader lives a thousand lives before he dies."
        </div>
      </div>

      {/* ── RIGHT COLUMN: AUTHENTICATION INTERFACE (Viewport-Fit) ── */}
      <div className="lg:w-7/12 xl:w-7/12 flex-1 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 xl:p-12 overflow-y-auto max-h-screen relative">
        {/* Subtle Ambient Radial Backlight */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Central Auth Card: Compact, Centered, Visible without scrolling */}
        <div className="w-full max-w-[460px] relative z-10 flex flex-col my-auto">
          {/* Card Frame */}
          <div className="w-full bg-surface-container/85 border border-outline-variant/25 backdrop-blur-xl rounded-2xl p-5 sm:p-7 shadow-2xl relative">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-1 mb-4 shadow-inner">
              <button
                type="button"
                onClick={() => handleModeSwitch(true)}
                className={`py-1.5 text-center font-label-lg text-xs sm:text-sm rounded transition-all duration-200 cursor-pointer ${
                  isLogin
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch(false)}
                className={`py-1.5 text-center font-label-lg text-xs sm:text-sm rounded transition-all duration-200 cursor-pointer ${
                  !isLogin
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Header Text Inside Card */}
            <div className="text-center mb-4">
              <h1 className="font-headline-md font-garamond text-xl sm:text-2xl text-on-surface font-normal">
                {isLogin ? 'Welcome Back to Bookify' : 'Join the Literary Circle'}
              </h1>
              <p className="font-body-sm text-on-surface-variant text-xs mt-0.5">
                {isLogin
                  ? 'Access your book clubs, active reading lists, and discussions.'
                  : 'Start or join reading circles with chapter milestones.'}
              </p>
            </div>

            {/* Social Authentication */}
            <button
              onClick={handleSocialSignIn}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-lg text-xs shadow-sm border border-outline-variant/20 transition-all duration-200 group cursor-pointer"
            >
              <svg
                className="w-4 h-4 fill-current text-primary group-hover:scale-105 transition-transform"
                viewBox="0 0 24 24"
              >
                <path d="M12.24 10.285V13.4h6.887C18.2 16.035 15.65 18 12.24 18c-3.315 0-6-2.685-6-6s2.685-6 6-6c1.47 0 2.81.53 3.86 1.405l2.45-2.45C17.07 3.555 14.8 2.7 12.24 2.7 7.14 2.7 3 6.84 3 11.94s4.14 9.24 9.24 9.24c5.33 0 8.86-3.75 8.86-9.02 0-.6-.065-1.18-.185-1.875H12.24z" />
              </svg>
              <span>{isLogin ? 'Sign in with Google' : 'Sign up with Google'}</span>
            </button>

            {/* Editorial Divider */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-outline-variant/25" />
              </div>
              <div className="relative px-3 bg-surface-container text-outline font-label-sm text-[10px] uppercase tracking-widest">
                <span>• or continue with email •</span>
              </div>
            </div>

            {/* ── FORM ────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Full Name (Register Mode Only) */}
              {!isLogin && (
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-outline text-lg pointer-events-none">
                      person
                    </span>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs sm:text-sm pl-10 pr-3 py-2 rounded-lg shadow-inner focus:outline-none focus:border-primary focus:bg-surface-dim transition-colors"
                      placeholder="E.g., Clara Oswald"
                      required
                      type="text"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                    {isLogin ? 'Email Address' : 'Email Address'}
                  </label>
                  {isLogin && (
                    <span className="text-[10px] text-secondary font-label-sm">
                      Club Access
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-lg pointer-events-none">
                    {isLogin ? 'bookmark' : 'mail'}
                  </span>
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs sm:text-sm pl-10 pr-3 py-2 rounded-lg shadow-inner focus:outline-none focus:border-primary focus:bg-surface-dim transition-colors"
                    placeholder={isLogin ? 'reader@bookify.club' : 'reader@example.com'}
                    required
                    type="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                    Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() =>
                        toast('Please contact support to reset credentials.', {
                          icon: '🗝️',
                        })
                      }
                      className="text-[11px] text-primary hover:text-secondary transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-lg pointer-events-none">
                    {isLogin ? 'key' : 'lock'}
                  </span>
                  <input
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs sm:text-sm pl-10 pr-10 py-2 rounded-lg shadow-inner focus:outline-none focus:border-primary focus:bg-surface-dim transition-colors"
                    placeholder={isLogin ? '••••••••••••' : 'Minimum 8 characters'}
                    required
                    type={showPass ? 'text' : 'password'}
                  />
                  <button
                    aria-label="Toggle password visibility"
                    className="absolute right-2.5 text-outline hover:text-primary transition-colors flex items-center justify-center p-1"
                    onClick={() => setShowPass((p) => !p)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                {/* Password Strength Indicator (Register Mode Only) */}
                {!isLogin && (
                  <div className="pt-0.5 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 1
                            ? strength.score === 1
                              ? 'bg-error'
                              : 'bg-primary'
                            : 'bg-surface-container-highest'
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 2 ? 'bg-primary' : 'bg-surface-container-highest'
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 3 ? 'bg-secondary' : 'bg-surface-container-highest'
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 4 ? 'bg-sage-500' : 'bg-surface-container-highest'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-label-sm text-outline">
                      <span className={strength.color}>{strength.label}</span>
                      <span>Min. 8 characters</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Role Selection (Register Mode Only - Compact Segmented Pill) */}
              {!isLogin && (
                <div className="flex flex-col gap-1 pt-1">
                  <label className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                    Primary Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('host')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-label-lg transition-all ${
                        selectedRole === 'host'
                          ? 'bg-surface-container-high border-primary text-primary font-semibold'
                          : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">hotel_class</span>
                      <span>Club Host</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('reader')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-label-lg transition-all ${
                        selectedRole === 'reader'
                          ? 'bg-surface-container-high border-primary text-secondary font-semibold'
                          : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">local_library</span>
                      <span>Avid Reader</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Checkboxes */}
              {isLogin ? (
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      defaultChecked
                      className="w-3.5 h-3.5 rounded bg-surface-container-lowest text-primary accent-primary cursor-pointer"
                      type="checkbox"
                    />
                    <span className="font-body-sm text-xs text-on-surface-variant hover:text-on-surface transition-colors">
                      Remember this device
                    </span>
                  </label>
                </div>
              ) : (
                <div className="pt-0.5">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedToCharter}
                      onChange={(e) => setAgreedToCharter(e.target.checked)}
                      className="w-3.5 h-3.5 mt-0.5 rounded bg-surface-container-lowest text-primary accent-primary cursor-pointer"
                    />
                    <span className="font-body-sm text-[11px] text-on-surface-variant leading-tight">
                      I agree to the Bookify <span className="text-primary">Reading Charter</span> &amp; <span className="text-primary">Privacy Policy</span>.
                    </span>
                  </label>
                </div>
              )}

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2.5 px-4 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-lg text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/20 transition-all duration-200 font-semibold group cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <Spinner />
                ) : (
                  <>
                    <span>{isLogin ? 'Enter Book Club' : 'Create Free Account'}</span>
                    <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>

              {/* Login-only: Magic Link Alternative Button */}
              {isLogin && (
                <button
                  onClick={handleMagicLink}
                  type="button"
                  className="w-full py-1.5 px-3 rounded-lg bg-surface-container-high/60 hover:bg-surface-bright text-primary border border-outline-variant/20 font-label-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">forward_to_inbox</span>
                  <span>Send Instant Magic Link via Email</span>
                </button>
              )}
            </form>

            {/* Magic Link Feedback */}
            {magicLinkMsg && (
              <div className="mt-2.5 p-2 rounded bg-surface-container-highest text-primary font-body-sm text-xs text-center border border-primary/20">
                A dispatch token has been sent to your email.
              </div>
            )}

            {/* Bottom Toggle Between Login and Register */}
            <div className="mt-3.5 pt-2.5 border-t border-outline-variant/25 flex items-center justify-center gap-1.5 text-center text-xs">
              <span className="text-on-surface-variant">
                {isLogin ? 'New to Bookify?' : 'Already have an account?'}
              </span>
              <button
                type="button"
                onClick={() => handleModeSwitch(!isLogin)}
                className="font-label-lg text-primary hover:text-secondary transition-colors font-semibold inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>{isLogin ? 'Create free account' : 'Sign in here'}</span>
                <span className="material-symbols-outlined text-xs">arrow_outward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
