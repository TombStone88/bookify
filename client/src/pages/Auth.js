import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

function GoogleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, token } = useAuth();

  const isRegisterMode = searchParams.get('mode') === 'register';
  const [isLogin, setIsLogin] = useState(!isRegisterMode);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [magicLinkMsg, setMagicLinkMsg] = useState(false);

  const googleBtnContainerRef = useRef(null);
  const googleClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
  const isGoogleConfigured = Boolean(
    googleClientId &&
      googleClientId !== '' &&
      !googleClientId.includes('placeholder') &&
      googleClientId !== 'bookify-google-client-id.apps.googleusercontent.com'
  );

  // Form State
  const initialEmail = searchParams.get('email') || '';
  const [form, setForm] = useState({
    name: '',
    email: initialEmail,
    password: '',
  });

  // Registration Extra State
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

  // ── GOOGLE IDENTITY SERVICES INTEGRATION ────────────────────
  const handleGoogleCredentialResponse = useCallback(
    async (response) => {
      const idToken = response?.credential;
      if (!idToken) {
        toast.error('Google did not return a valid credential. Please try again.');
        return;
      }

      setGoogleLoading(true);
      try {
        const res = await api.post('/api/auth/google', { idToken });
        login(res.data.token);

        if (res.data.linked) {
          toast.success('Your existing Bookify account was linked with Google! 📚');
        } else if (res.data.isNewUser) {
          toast.success('Welcome to Bookify! Account created with Google. 📖');
        } else {
          toast.success('Welcome back to your reading circle! 👋');
        }

        navigate(redirectTarget, { replace: true });
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          'Google authentication failed. Please try again.';
        toast.error(msg);
      } finally {
        setGoogleLoading(false);
      }
    },
    [login, navigate, redirectTarget]
  );

  // Monitor GIS script readiness
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        setGisLoaded(true);
        clearInterval(interval);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Initialize GIS if configured and script is ready
  useEffect(() => {
    if (gisLoaded && isGoogleConfigured && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: isLogin ? 'signin_with' : 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: googleBtnContainerRef.current.offsetWidth || 340,
          });
        }
      } catch (e) {
        console.warn('[Google Auth] GIS initialization note:', e);
      }
    }
  }, [gisLoaded, isGoogleConfigured, googleClientId, isLogin, handleGoogleCredentialResponse]);

  const handleSocialSignIn = () => {
    if (googleLoading || loading) return;

    if (!isGoogleConfigured) {
      toast(
        () => (
          <div className="flex flex-col gap-1 text-xs text-left">
            <span className="font-semibold text-amber-300">Google OAuth Setup Required</span>
            <span className="text-on-surface-variant">
              Please set a valid <code className="bg-surface-container px-1 py-0.5 rounded text-amber-200">REACT_APP_GOOGLE_CLIENT_ID</code> in your deployment environment variables (Vercel Project Settings) or <code className="bg-surface-container px-1 py-0.5 rounded text-amber-200">client/.env</code>.
            </span>
          </div>
        ),
        { icon: '⚙️', duration: 6000 }
      );
      console.warn(
        '[Bookify Google Auth] Missing or placeholder REACT_APP_GOOGLE_CLIENT_ID.\n' +
        'To enable Google Sign-In:\n' +
        '1. In Google Cloud Console (https://console.cloud.google.com) > APIs & Services > Credentials, create an OAuth 2.0 Web Client ID.\n' +
        '2. Add Authorized JavaScript Origins: https://bookify-beta-rosy.vercel.app and http://localhost:3000\n' +
        '3. Add REACT_APP_GOOGLE_CLIENT_ID in Vercel Environment Variables (and client/.env locally).\n' +
        '4. Add GOOGLE_CLIENT_ID in server environment variables.'
      );
      return;
    }

    if (!window.google?.accounts?.id) {
      toast.error('Google Sign-In is initializing. Please check your network and try again.');
      return;
    }

    try {
      setGoogleLoading(true);

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.prompt((notification) => {
        setGoogleLoading(false);
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          console.warn('[Google Auth] Prompt not displayed:', reason);
          toast.error(
            `Google prompt not displayed (${reason || 'browser suppressed'}). Ensure popups/third-party cookies are enabled or sign into Google.`,
            { duration: 5000 }
          );
        } else if (notification.isSkippedMoment()) {
          console.warn('[Google Auth] Prompt skipped:', notification.getSkippedReason());
        }
      });
    } catch (e) {
      setGoogleLoading(false);
      console.error('Error invoking Google sign-in:', e);
      toast.error('Could not open Google authentication. Please try again.');
    }
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

            {/* Social Authentication: Continue with Google */}
            <div className="w-full flex flex-col items-center mb-1">
              {/* Clearly Visible, Responsive "Continue with Google" Button */}
              <button
                id="google-signin-btn"
                onClick={handleSocialSignIn}
                disabled={googleLoading || loading}
                type="button"
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-lg text-xs sm:text-sm font-medium shadow-sm border border-outline-variant/30 hover:border-primary/40 active:scale-[0.99] transition-all duration-200 group cursor-pointer disabled:opacity-50"
              >
                {googleLoading ? (
                  <Spinner size={16} />
                ) : (
                  <GoogleIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                )}
                <span>
                  {googleLoading
                    ? 'Connecting to Google...'
                    : isLogin
                    ? 'Continue with Google'
                    : 'Sign up with Google'}
                </span>
              </button>

              {/* Informational Configuration Note when OAuth Client ID is missing */}
              {!isGoogleConfigured && (
                <div className="w-full mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] flex items-start gap-2 leading-snug">
                  <span className="material-symbols-outlined text-[15px] shrink-0 text-amber-400 mt-0.5">
                    info
                  </span>
                  <div className="flex-1">
                    <span className="font-semibold text-amber-200">OAuth Setup Required: </span>
                    <span>
                      Set <code className="bg-surface-container-lowest px-1 py-0.5 rounded text-amber-200 font-mono">REACT_APP_GOOGLE_CLIENT_ID</code> in environment variables (Vercel Project Settings or client/.env).
                    </span>
                  </div>
                </div>
              )}

              {/* Hidden container where official GIS can be rendered if available */}
              <div ref={googleBtnContainerRef} className="hidden" aria-hidden="true" />
            </div>

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
                disabled={loading || googleLoading}
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
