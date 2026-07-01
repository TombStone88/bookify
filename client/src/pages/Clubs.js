import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

function ClubCard({ club, onOpen, onLeave }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="glass book-card"
      style={{ borderRadius: 18, overflow: 'hidden', cursor: 'pointer', border: hover ? '1px solid #c4b5fd' : '1px solid #ececf3' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onOpen(club._id)}
    >
      <div style={{
        height: 90,
        background: `linear-gradient(135deg, hsl(${(club.name.charCodeAt(0) * 37) % 360}, 60%, 88%), hsl(${(club.name.charCodeAt(0) * 57) % 360}, 50%, 80%))`,
        display: 'flex', alignItems: 'flex-end', padding: '0 1.25rem 12px',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, fontSize: 22, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏛</div>
      </div>

      <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
        <h3 style={{ fontWeight: 700, color: '#1f2230', fontSize: '1rem', marginBottom: 6 }}>{club.name}</h3>
        <p style={{ fontSize: '0.82rem', color: '#8a8aa0', marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {club.description || 'No description provided.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: '0.75rem', color: '#a4a4b8', display: 'flex', alignItems: 'center', gap: 4 }}>👥 {club.members?.length || 0}</span>
            <span style={{ fontSize: '0.75rem', color: '#a4a4b8', display: 'flex', alignItems: 'center', gap: 4 }}>📚 {club.books?.length || 0} books</span>
          </div>
          <button onClick={e => { e.stopPropagation(); onLeave(club._id); }}
            style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', fontWeight: 500 }}>
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateClubModal({ onClose, onSuccess }) {
  const [form, setForm]       = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/clubs/create', form);
      toast.success(`Club "${form.name}" created!`);
      onSuccess();
    } catch { toast.error('Failed to create club'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-strong animate-scaleIn" style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: '2rem', margin: '1rem', zIndex: 1000 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1f2230' }}>Create a Club</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a4a4b8', fontSize: '1.5rem' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>Club name</label>
            <input className="input-base" placeholder="e.g. Science Fiction Lovers" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>Description</label>
            <textarea className="input-base" placeholder="What does your club read?" style={{ resize: 'vertical', minHeight: 80 }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.875rem' }}>
            {loading ? 'Creating…' : 'Create Club'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Clubs() {
  const navigate  = useNavigate();
  const [clubs, setClubs]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const fetchClubs = async () => {
    try {
      const res = await api.get('/api/clubs/my-clubs');
      setClubs(res.data);
    } catch { toast.error('Failed to load clubs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClubs(); }, []);

  const leaveClub = async (clubId) => {
    if (!window.confirm('Leave this club?')) return;
    try {
      await api.delete(`/api/clubs/leave/${clubId}`);
      toast.success('Left club');
      setClubs(p => p.filter(c => c._id !== clubId));
    } catch { toast.error('Failed to leave club'); }
  };

  const joinByCode = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      await api.post(`/api/clubs/join/${inviteCode.trim()}`);
      toast.success('Joined club!');
      setInviteCode('');
      fetchClubs();
    } catch { toast.error('Invalid invite code'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7fb', padding: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <Navbar />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 800, color: '#1f2230', marginBottom: 6 }}>My Clubs</h1>
            <p style={{ color: '#8a8aa0', fontSize: '0.9rem' }}>Read together, discuss more.</p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <form onSubmit={joinByCode} style={{ display: 'flex', gap: 8 }}>
              <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Invite code…" className="input-base" style={{ width: 160 }} />
              <button type="submit" className="btn-ghost" style={{ whiteSpace: 'nowrap' }}>Join</button>
            </form>
            <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Club</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 20 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass" style={{ borderRadius: 18, height: 200 }}>
                <div className="skeleton" style={{ height: 90, borderRadius: '18px 18px 0 0' }} />
                <div style={{ padding: 16 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 6, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 12, width: '90%', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <div className="glass" style={{ borderRadius: 20, padding: '5rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏛</div>
            <h3 style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1f2230', marginBottom: 8 }}>No clubs yet</h3>
            <p style={{ color: '#8a8aa0', maxWidth: 320, margin: '0 auto 24px' }}>Create a club or join one with an invite code to start reading with others.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">Create your first club</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 20 }}>
            {clubs.map(club => <ClubCard key={club._id} club={club} onOpen={id => navigate(`/club/${id}`)} onLeave={leaveClub} />)}
          </div>
        )}
      </div>

      {showCreate && <CreateClubModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchClubs(); }} />}
    </div>
  );
}
