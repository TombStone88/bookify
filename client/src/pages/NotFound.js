import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate  = useNavigate();
  const { token } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <div>
        <p style={{
          fontSize: 'clamp(4rem, 12vw, 7rem)', fontWeight: 800, lineHeight: 1,
          background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 16,
        }}>
          404
        </p>
        <h1 style={{ fontWeight: 700, fontSize: '1.3rem', color: '#1f2230', marginBottom: 8 }}>This page wandered off</h1>
        <p style={{ color: '#8a8aa0', marginBottom: 28 }}>The page you're looking for doesn't exist, or has been moved.</p>
        <button onClick={() => navigate(token ? '/dashboard' : '/')} className="btn-primary">
          {token ? 'Back to Dashboard' : 'Back to Home'}
        </button>
      </div>
    </div>
  );
}
