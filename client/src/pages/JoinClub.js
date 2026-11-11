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
        toast.success('Joined book club successfully!');
        setTimeout(() => navigate('/clubs'), 1200);
      } catch (error) {
        setStatus('error');
        toast.error(error.response?.data?.message || 'Failed to join book club');
        setTimeout(() => navigate('/clubs'), 1800);
      }
    };

    joinClub();
  }, [inviteCode, token, navigate]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 selection:bg-primary selection:text-on-primary font-body-md text-on-surface">
      <div className="bg-surface-container-high border border-primary/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-fadeIn relative">
        {status === 'joining' && (
          <>
            <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-5" />
            <h2 className="font-headline-md font-garamond text-2xl text-on-surface font-semibold mb-2">
              Joining Book Club…
            </h2>
            <p className="text-outline text-xs leading-relaxed">
              Connecting you with the discussion room.
            </p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-surface-container-lowest border border-primary/30 flex items-center justify-center text-primary mx-auto mb-4 text-2xl">
              <span className="material-symbols-outlined text-3xl text-primary">check_circle</span>
            </div>
            <h2 className="font-headline-md font-garamond text-2xl text-on-surface font-semibold mb-2">
              You're in!
            </h2>
            <p className="text-outline text-xs leading-relaxed">
              Redirecting to your book clubs…
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-surface-container-lowest border border-error/30 flex items-center justify-center text-error mx-auto mb-4 text-2xl">
              <span className="material-symbols-outlined text-3xl text-error">error</span>
            </div>
            <h2 className="font-headline-md font-garamond text-2xl text-on-surface font-semibold mb-2">
              Couldn't join club
            </h2>
            <p className="text-outline text-xs leading-relaxed">
              This invite code may be invalid or expired. Redirecting…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
