import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { resolveFileUrl } from '../utils/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

function SkeletonBook() {
  return (
    <div>
      <div className="skeleton" style={{ height: 196, borderRadius: 10 }} />
      <div className="skeleton" style={{ height: 12, borderRadius: 6, marginTop: 8, width: '80%' }} />
      <div className="skeleton" style={{ height: 10, borderRadius: 6, marginTop: 6, width: '55%' }} />
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 8, transition: 'transform .2s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: '0.8rem', color: '#8a8aa0', fontWeight: 500 }}>{label}</p>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      </div>
      <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1f2230' }}>{value}</p>
    </div>
  );
}

function BookCard({ book, onDelete }) {
  const [hover, setHover] = useState(false);

  return (
    <div className="book-card" style={{ position: 'relative', cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '2/3', border: '1px solid #ececf3' }}>
        <img
          src={book.coverImage ? resolveFileUrl(book.coverImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&size=200&background=ede9fe&color=7c3aed&bold=true`}
          alt={book.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&size=200&background=ede9fe&color=7c3aed&bold=true`; }}
        />
        {book.progress > 0 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(0,0,0,0.15)' }}>
            <div style={{ height: '100%', width: `${book.progress}%`, background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', transition: 'width .6s ease' }} />
          </div>
        )}
        {hover && (
          <div className="animate-fadeIn" style={{
            position: 'absolute', inset: 0, background: 'rgba(20,16,36,0.55)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12,
          }}>
            <a href={`/viewer?file=${encodeURIComponent(resolveFileUrl(book.fileUrl))}&bookId=${book._id}`}
              target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              className="btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', textDecoration: 'none', textAlign: 'center' }}>
              📖 Read
            </a>
            <button onClick={e => { e.stopPropagation(); onDelete(book._id); }}
              style={{ width: '100%', padding: '0.5rem', borderRadius: 8, background: 'rgba(239,68,68,0.85)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              🗑 Delete
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8 }}>
        <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1f2230', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</p>
        <p style={{ fontSize: '0.75rem', color: '#8a8aa0', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.author || 'Unknown author'}</p>
        {book.progress > 0 && <p style={{ fontSize: '0.7rem', color: '#7c3aed', marginTop: 4, fontWeight: 600 }}>{book.progress}% read</p>}
      </div>
    </div>
  );
}

function UploadModal({ onClose, onSuccess }) {
  const [form, setForm]       = useState({ title: '', author: '', description: '' });
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a PDF file');
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      data.append('file', file);
      await api.post('/api/books/upload', data);
      toast.success('Book uploaded! 📚');
      onSuccess();
    } catch { toast.error('Upload failed. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-strong animate-scaleIn" style={{ width: '100%', maxWidth: 440, borderRadius: 20, padding: '2rem', margin: '1rem', zIndex: 1000 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1f2230' }}>Add a book</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a4a4b8', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { name: 'title', label: 'Title', placeholder: 'Pride and Prejudice', required: true },
            { name: 'author', label: 'Author', placeholder: 'Jane Austen', required: true },
            { name: 'description', label: 'Description (optional)', placeholder: 'A classic...', required: false, textarea: true },
          ].map(f => (
            <div key={f.name}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>{f.label}</label>
              {f.textarea
                ? <textarea name={f.name} placeholder={f.placeholder} className="input-base" style={{ resize: 'vertical', minHeight: 80 }}
                    onChange={e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))} />
                : <input type="text" name={f.name} placeholder={f.placeholder} className="input-base" required={f.required}
                    onChange={e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))} />
              }
            </div>
          ))}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>PDF file</label>
            <input type="file" accept="application/pdf" required onChange={e => setFile(e.target.files[0])} style={{ width: '100%', fontSize: '0.85rem', color: '#6b6b80' }} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 4, padding: '0.875rem' }}>
            {loading ? 'Uploading…' : 'Upload book'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [books, setBooks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');

  const fetchBooks = useCallback(async () => {
    try {
      const [booksRes, userRes] = await Promise.all([
        api.get('/api/books/user/books'),
        api.get('/api/users/me'),
      ]);
      setBooks(booksRes.data);
      setUsername(userRes.data.username);
    } catch (err) {
      if (err.response?.status !== 401) toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const deleteBook = async (id) => {
    if (!window.confirm('Remove this book from your library?')) return;
    try {
      await api.delete(`/api/books/delete/${id}`);
      toast.success('Book removed');
      setBooks(p => p.filter(b => b._id !== id));
    } catch { toast.error('Delete failed'); }
  };

  const currentlyReading = books.filter(b => b.progress > 0 && b.progress < 100).length;
  const completed        = books.filter(b => b.progress >= 100).length;
  const avgProgress      = books.length ? Math.round(books.reduce((a, b) => a + (b.progress || 0), 0) / books.length) : 0;
  const inProgress       = books.filter(b => b.progress > 0 && b.progress < 100).slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7fb', padding: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <Navbar />

        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: '#1f2230', marginBottom: 6 }}>
            {greeting}, {username || 'Reader'} 👋
          </h1>
          <p style={{ color: '#8a8aa0', fontSize: '1rem' }}>Your reading universe awaits.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}>
          <StatCard label="Books in Library" value={books.length} icon="📚" />
          <StatCard label="Currently Reading" value={currentlyReading} icon="📖" />
          <StatCard label="Completed" value={completed} icon="✅" />
          <StatCard label="Avg Progress" value={`${avgProgress}%`} icon="📊" />
        </div>

        {inProgress.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2230', marginBottom: 20 }}>Continue Reading</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {inProgress.map(book => (
                <div key={book._id} className="glass" style={{ borderRadius: 16, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                  <img
                    src={book.coverImage ? resolveFileUrl(book.coverImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&size=80&background=ede9fe&color=7c3aed&bold=true`}
                    alt={book.title}
                    style={{ width: 52, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&size=80&background=ede9fe&color=7c3aed&bold=true`; }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: '#1f2230', fontSize: '0.9rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                    <p style={{ fontSize: '0.78rem', color: '#8a8aa0', marginBottom: 8 }}>{book.author}</p>
                    <div className="progress-bar" style={{ marginBottom: 6 }}>
                      <div className="progress-fill" style={{ width: `${book.progress}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600 }}>{book.progress}% read</span>
                      <a href={`/viewer?file=${encodeURIComponent(resolveFileUrl(book.fileUrl))}&bookId=${book._id}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed', textDecoration: 'none', background: '#f3edff', padding: '2px 10px', borderRadius: 6 }}>
                        Continue →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Upload book</button>
          <button onClick={() => navigate('/clubs')} className="btn-ghost">🏛 My Clubs</button>
        </div>

        <section>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2230' }}>Your Library</h2>
            <p style={{ fontSize: '0.8rem', color: '#a4a4b8', marginTop: 2 }}>{books.length} {books.length === 1 ? 'book' : 'books'}</p>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 20 }}>
              {[...Array(8)].map((_, i) => <SkeletonBook key={i} />)}
            </div>
          ) : books.length === 0 ? (
            <div className="glass" style={{ borderRadius: 20, padding: '5rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>📚</div>
              <h3 style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1f2230', marginBottom: 8 }}>Your library is empty</h3>
              <p style={{ color: '#8a8aa0', marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>
                Upload your first PDF book to get started. You can track your progress and read right in the browser.
              </p>
              <button onClick={() => setShowModal(true)} className="btn-primary">Upload your first book</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 20 }}>
              {books.map(book => <BookCard key={book._id} book={book} onDelete={deleteBook} />)}
            </div>
          )}
        </section>
      </div>

      {showModal && <UploadModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchBooks(); }} />}
    </div>
  );
}
