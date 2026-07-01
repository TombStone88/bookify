import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function JoinClub() {
  const { inviteCode } = useParams();
  const navigate        = useNavigate();
  const { token }       = useAuth();
  const [status, setStatus] = useState('joining');

  useEffect(() => {
    if (!token) {
      navigate(`/auth?redirect=/join/${inviteCode}`, { replace: true });
      return;
    }

    const joinClub = async () => {
      try {
        await api.post(`/api/clubs/join/${inviteCode}`, {});
        setStatus('success');
        toast.success('Joined club successfully!');
        setTimeout(() => navigate('/clubs'), 1200);
      } catch (error) {
        setStatus('error');
        toast.error(error.response?.data?.message || 'Failed to join club');
        setTimeout(() => navigate('/clubs'), 1800);
      }
    };

    joinClub();
  }, [inviteCode, token, navigate]);

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-strong animate-scaleIn" style={{ borderRadius: 20, padding: '3rem 2.5rem', textAlign: 'center', maxWidth: 360 }}>
        {status === 'joining' && (
          <>
            <div style={{ width: 48, height: 48, border: '3px solid #ece4ff', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <h2 style={{ fontWeight: 700, color: '#1f2230', marginBottom: 8 }}>Joining club…</h2>
            <p style={{ color: '#8a8aa0', fontSize: '0.875rem' }}>Hang tight, this won't take long.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontWeight: 700, color: '#1f2230', marginBottom: 8 }}>You're in!</h2>
            <p style={{ color: '#8a8aa0', fontSize: '0.875rem' }}>Redirecting to your clubs…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>😕</div>
            <h2 style={{ fontWeight: 700, color: '#1f2230', marginBottom: 8 }}>Couldn't join club</h2>
            <p style={{ color: '#8a8aa0', fontSize: '0.875rem' }}>This invite code may be invalid. Redirecting…</p>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
