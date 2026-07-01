import React, { useEffect, useState } from 'react';
import api, { resolveFileUrl } from '../utils/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Profile() {
  const [username, setUsername]     = useState('');
  const [email, setEmail]           = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [image, setImage]           = useState(null);
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [books, setBooks]           = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/api/users/me'),
      api.get('/api/books/user/books'),
    ]).then(([userRes, bookRes]) => {
      setUsername(userRes.data.username);
      setEmail(userRes.data.email);
      setProfileImage(userRes.data.profileImage);
      setBooks(bookRes.data);
    }).catch(() => { toast.error('Failed to load profile'); })
      .finally(() => setLoading(false));
  }, []);

  const updateUsername = async () => {
    if (!username.trim()) return;
    setSaving(true);
    try {
      await api.put('/api/users/username', { username });
      toast.success('Username updated!');
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const uploadImage = async () => {
    if (!image) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('image', image);
      const res = await api.post('/api/users/upload-profile', formData);
      setProfileImage(res.data.profileImage);
      setImage(null);
      toast.success('Photo updated!');
    } catch { toast.error('Upload failed'); }
    finally { setSaving(false); }
  };

  const booksRead    = books.filter(b => b.progress >= 100).length;
  const inProgress   = books.filter(b => b.progress > 0 && b.progress < 100).length;
  const avgProgress  = books.length ? Math.round(books.reduce((a, b) => a + (b.progress || 0), 0) / books.length) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7fb', padding: 'clamp(1.5rem,4vw,2.5rem)' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <Navbar />

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
            <div style={{ width: 40, height: 40, border: '3px solid #ece4ff', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass" style={{ borderRadius: 20, padding: '2rem', textAlign: 'center' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  width: 96, height: 96, borderRadius: '50%', margin: '0 auto 12px',
                  background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', border: '3px solid #ece4ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.5rem', fontWeight: 800, color: 'white', overflow: 'hidden',
                }}>
                  {profileImage
                    ? <img src={resolveFileUrl(profileImage)} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (username || 'U').charAt(0).toUpperCase()
                  }
                </div>
                <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1f2230', marginBottom: 4 }}>{username}</h2>
                <p style={{ fontSize: '0.85rem', color: '#8a8aa0' }}>{email}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
                {[
                  { label: 'Books', value: books.length },
                  { label: 'Done', value: booksRead },
                  { label: 'Reading', value: inProgress },
                ].map(s => (
                  <div key={s.label} className="glass" style={{ borderRadius: 10, padding: '0.75rem 0.5rem' }}>
                    <p style={{ fontWeight: 800, fontSize: '1.3rem', color: '#1f2230' }}>{s.value}</p>
                    <p style={{ fontSize: '0.68rem', color: '#8a8aa0', marginTop: 2 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>Username</label>
                  <input value={username} onChange={e => setUsername(e.target.value)} className="input-base" />
                </div>
                <button onClick={updateUsername} disabled={saving} className="btn-primary" style={{ width: '100%' }}>
                  {saving ? 'Saving…' : 'Update username'}
                </button>

                <div style={{ height: 1, background: '#ececf3', margin: '4px 0' }} />

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>Profile photo</label>
                  <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} style={{ width: '100%', fontSize: '0.82rem', color: '#6b6b80' }} />
                </div>
                {image && (
                  <button onClick={uploadImage} disabled={saving} className="btn-primary" style={{ width: '100%' }}>
                    {saving ? 'Uploading…' : 'Upload photo'}
                  </button>
                )}
              </div>
            </motion.div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="glass" style={{ borderRadius: 20, padding: '1.75rem' }}>
                <h3 style={{ fontWeight: 700, color: '#1f2230', fontSize: '1rem', marginBottom: 20 }}>📊 Reading Stats</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                  {[
                    { label: 'Total books', value: books.length, icon: '📚', bg: '#f3edff', border: '#e2d6fc' },
                    { label: 'Completed', value: booksRead, icon: '✅', bg: '#f0fdf4', border: '#bbf7d0' },
                    { label: 'In progress', value: inProgress, icon: '📖', bg: '#fff7ed', border: '#fed7aa' },
                    { label: 'Avg progress', value: `${avgProgress}%`, icon: '📊', bg: '#f3edff', border: '#e2d6fc' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '1.1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{s.icon}</div>
                      <p style={{ fontWeight: 800, fontSize: '1.5rem', color: '#1f2230', marginBottom: 4 }}>{s.value}</p>
                      <p style={{ fontSize: '0.75rem', color: '#6b6b80' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {books.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="glass" style={{ borderRadius: 20, padding: '1.75rem' }}>
                  <h3 style={{ fontWeight: 700, color: '#1f2230', fontSize: '1rem', marginBottom: 16 }}>Your Library</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto' }}>
                    {books.map(book => (
                      <div key={book._id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 12, background: '#fafafe', border: '1px solid #ececf3' }}>
                        <img
                          src={book.coverImage ? resolveFileUrl(book.coverImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&size=60&background=ede9fe&color=7c3aed&bold=true`}
                          alt={book.title}
                          style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                          onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&size=60&background=ede9fe&color=7c3aed&bold=true`; }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2230', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{book.title}</p>
                          <p style={{ fontSize: '0.75rem', color: '#8a8aa0', marginBottom: 6 }}>{book.author}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 3, background: '#ececf3', borderRadius: 99 }}>
                              <div style={{ height: '100%', width: `${book.progress || 0}%`, background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#7c3aed', flexShrink: 0, fontWeight: 600 }}>{book.progress || 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
