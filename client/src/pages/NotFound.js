import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const navigate  = useNavigate();
  const { token } = useAuth();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 selection:bg-primary selection:text-on-primary font-body-md text-on-surface text-center">
      <div className="max-w-md w-full p-8 bg-surface-container-high border border-primary/30 rounded-2xl shadow-2xl relative animate-fadeIn flex flex-col items-center">
        <p className="font-headline-lg font-garamond text-7xl font-bold text-primary mb-2 tracking-tight">
          404
        </p>
        <h1 className="font-headline-md font-garamond text-2xl text-on-surface font-semibold mb-2">
          This page wandered off
        </h1>
        <p className="text-outline text-xs leading-relaxed mb-6">
          The page you're looking for doesn't exist, or has been moved to another shelf.
        </p>
        <button
          onClick={() => navigate(token ? '/dashboard' : '/')}
          className="px-5 py-2.5 bg-primary text-on-primary font-label-lg text-sm font-semibold rounded-lg shadow hover:bg-secondary transition-all cursor-pointer"
        >
          {token ? 'Back to Bookshelf' : 'Back to Home'}
        </button>
      </div>
    </div>
  );
}
