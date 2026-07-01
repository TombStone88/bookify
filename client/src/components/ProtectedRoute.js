import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7f7fb' }}>
        <div className="flex flex-col items-center gap-4">
          <div style={{
            width: 40, height: 40, border: '3px solid #ece4ff',
            borderTop: '3px solid #7c3aed', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#8a8aa0', fontSize: '0.875rem' }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!token) return <Navigate to="/" replace />;
  return children;
}

export default ProtectedRoute;
