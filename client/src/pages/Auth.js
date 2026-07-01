import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function Spinner({ size = 18 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: '2px solid rgba(255,255,255,0.35)', borderTop: '2px solid white',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  );
}

export default function Auth() {
  const [searchParams]   = useSearchParams();
  const navigate          = useNavigate();
  const { login, token }  = useAuth();

  const initialMode = searchParams.get('mode') === 'register' ? false : true;
  const [isLogin, setIsLogin]   = useState(initialMode);
  const [loading, setLoading]   = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.post('/api/auth/login', { email: form.email, password: form.password });
        login(res.data.token);
        toast.success('Welcome back! 👋');
        navigate('/dashboard');
      } else {
        await api.post('/api/auth/register', form);
        toast.success('Account created! Please log in.');
        setIsLogin(true);
        setForm(p => ({ ...p, name: '', password: '' }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#fafafe',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <button
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', gap: 6,
          color: '#8a8aa0', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#1f2230'}
        onMouseLeave={e => e.currentTarget.style.color = '#8a8aa0'}
      >
        ← Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📚</div>
        <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#1f2230' }}>Bookify</span>
      </div>

      <div className="glass-strong" style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: 'clamp(2rem, 5vw, 2.5rem)', animation: 'scaleIn 0.3s ease' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2230', marginBottom: 6 }}>
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p style={{ color: '#8a8aa0', fontSize: '0.9rem', marginBottom: 28 }}>
          {isLogin ? 'Sign in to continue reading.' : 'Start your reading journey today.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f1f0f8', borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {['Log in', 'Register'].map((label, i) => {
            const active = i === 0 ? isLogin : !isLogin;
            return (
              <button
                key={label}
                onClick={() => setIsLogin(i === 0)}
                style={{
                  padding: '0.6rem', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem',
                  border: 'none', cursor: 'pointer', transition: 'all .2s',
                  background: active ? '#7c3aed' : 'transparent',
                  color: active ? 'white' : '#8a8aa0',
                  boxShadow: active ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>Full name</label>
              <input type="text" name="name" value={form.name} placeholder="Jane Austen" className="input-base" onChange={handleChange} required />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>Email</label>
            <input type="email" name="email" value={form.email} placeholder="you@example.com" className="input-base" onChange={handleChange} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} name="password" value={form.password}
                placeholder="••••••••" className="input-base" style={{ paddingRight: '3rem' }}
                onChange={handleChange} required
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#8a8aa0', fontSize: '0.8rem' }}>
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: 4, padding: '0.875rem', fontSize: '0.9375rem' }}>
            {loading ? <Spinner /> : (isLogin ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: '#8a8aa0' }}>
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={() => setIsLogin(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontWeight: 600, fontSize: 'inherit' }}>
            {isLogin ? 'Register' : 'Log in'}
          </button>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
