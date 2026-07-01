import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { resolveFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const NAV_LINKS = [
  { label: 'Home',     path: '/dashboard' },
  { label: 'My Clubs', path: '/clubs' },
];

function Avatar({ username, profileImage, size = 36 }) {
  const initial = username ? username.charAt(0).toUpperCase() : 'U';
  const resolvedImage = profileImage ? resolveFileUrl(profileImage) : null;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, color: 'white', flexShrink: 0,
      border: '2px solid #ece4ff',
    }}>
      {resolvedImage
        ? <img src={resolvedImage} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initial
      }
    </div>
  );
}

export default function Navbar() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const { logout }     = useAuth();
  const dropdownRef    = useRef(null);

  const [showDropdown, setShowDropdown]   = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [username, setUsername]           = useState('');
  const [email, setEmail]                 = useState('');
  const [profileImage, setProfileImage]   = useState('');
  const [image, setImage]                 = useState(null);
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    api.get('/api/users/me').then(res => {
      setUsername(res.data.username);
      setEmail(res.data.email);
      setProfileImage(res.data.profileImage);
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
    toast.success('Logged out successfully');
  };

  const updateUsername = async () => {
    try {
      setSaving(true);
      await api.put('/api/users/username', { username });
      toast.success('Username updated');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const uploadImage = async () => {
    if (!image) return;
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('image', image);
      const res = await api.post('/api/users/upload-profile', formData);
      setProfileImage(res.data.profileImage);
      setImage(null);
      toast.success('Profile photo updated');
    } catch { toast.error('Upload failed'); }
    finally { setSaving(false); }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 40, paddingBottom: 20, borderBottom: '1px solid #ececf3',
      }}>
        <div onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📚</div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1f2230' }}>Bookify</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {NAV_LINKS.map(link => (
            <button key={link.path}
              onClick={() => navigate(link.path)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500,
                color: isActive(link.path) ? '#7c3aed' : '#6b6b80',
                padding: '4px 8px', borderRadius: 6,
                borderBottom: isActive(link.path) ? '2px solid #7c3aed' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!isActive(link.path)) e.currentTarget.style.color = '#1f2230'; }}
              onMouseLeave={e => { if (!isActive(link.path)) e.currentTarget.style.color = '#6b6b80'; }}
            >
              {link.label}
            </button>
          ))}

          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowDropdown(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 2 }}>
              <Avatar username={username} profileImage={profileImage} size={36} />
            </button>

            {showDropdown && (
              <div className="glass-strong animate-scaleIn" style={{
                position: 'absolute', right: 0, top: 'calc(100% + 12px)', width: 220, borderRadius: 14, padding: 12, zIndex: 100,
                transformOrigin: 'top right',
              }}>
                <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid #ececf3', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1f2230', marginBottom: 2 }}>{username || 'User'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#a4a4b8' }}>{email}</div>
                </div>

                {[
                  { label: '⚙️  Profile settings', action: () => { setShowDropdown(false); setShowProfileModal(true); } },
                  { label: '🏠  Dashboard', action: () => navigate('/dashboard') },
                  { label: '🏛️  My Clubs', action: () => navigate('/clubs') },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#44445a', fontSize: '0.875rem', fontWeight: 500,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f7f5ff'; e.currentTarget.style.color = '#1f2230'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#44445a'; }}
                  >
                    {item.label}
                  </button>
                ))}

                <div style={{ borderTop: '1px solid #ececf3', marginTop: 8, paddingTop: 8 }}>
                  <button onClick={handleLogout}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#ef4444', fontSize: '0.875rem', fontWeight: 500,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    🚪  Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showProfileModal && (
        <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="glass-strong animate-scaleIn"
            style={{ width: '100%', maxWidth: 400, borderRadius: 20, padding: '2rem', margin: '1rem', zIndex: 1000 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1f2230' }}>Profile Settings</h2>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a4a4b8', fontSize: '1.3rem' }}>×</button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'inline-block', position: 'relative' }}>
                <Avatar username={username} profileImage={profileImage} size={80} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)} className="input-base" />
              </div>
              <button onClick={updateUsername} disabled={saving} className="btn-primary" style={{ width: '100%' }}>
                {saving ? 'Saving…' : 'Update username'}
              </button>

              <div style={{ height: 1, background: '#ececf3', margin: '8px 0' }} />

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>Profile photo</label>
                <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} style={{ width: '100%', fontSize: '0.85rem', color: '#6b6b80' }} />
              </div>

              {image && (
                <button onClick={uploadImage} disabled={saving} className="btn-primary" style={{ width: '100%' }}>
                  {saving ? 'Uploading…' : 'Upload photo'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
