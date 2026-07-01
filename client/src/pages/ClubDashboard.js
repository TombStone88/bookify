import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { resolveFileUrl } from '../utils/api';
import Navbar from '../components/Navbar';
import socket from '../socket';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

export default function ClubDashboard() {
  const { clubId }  = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const userId      = user?.userId;
  const messagesEnd = useRef(null);

  const [club, setClub]         = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [books, setBooks]       = useState([]);
  const [members, setMembers]   = useState([]);
  const [adminId, setAdminId]   = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState({ title: '', author: '', description: '', file: null });
  const [loading, setLoading]   = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [sendingMsg, setSendingMsg]       = useState(false);

  const scrollToBottom = () => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); };

  const fetchAll = useCallback(async () => {
    try {
      const [msgRes, bookRes, memberRes] = await Promise.all([
        api.get(`/api/messages/${clubId}`),
        api.get(`/api/books/${clubId}`),
        api.get(`/api/clubs/members/${clubId}`),
      ]);
      setMessages(msgRes.data);
      setBooks(bookRes.data);
      setMembers(memberRes.data.members);
      setAdminId(memberRes.data.admin);
      setInviteCode(memberRes.data.inviteCode || '');
      setClub({ name: memberRes.data.name });
    } catch (err) {
      toast.error('Failed to load club data');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchAll();
    socket.emit('joinClub', clubId);

    socket.on('receiveMessage', (msg) => {
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => { socket.off('receiveMessage'); };
  }, [clubId, fetchAll]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      const res = await api.post(`/api/messages/send/${clubId}`, { text });
      setMessages(prev => [...prev, res.data]);
      socket.emit('sendMessage', res.data);
      setText('');
    } catch { toast.error('Failed to send message'); }
    finally { setSendingMsg(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const removeMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(`/api/clubs/remove-member/${clubId}/${memberId}`);
      setMembers(p => p.filter(m => m._id !== memberId));
      toast.success('Member removed');
    } catch { toast.error('Failed to remove member'); }
  };

  const deleteClub = async () => {
    if (!window.confirm('Delete this club? This cannot be undone.')) return;
    try {
      await api.delete(`/api/clubs/delete/${clubId}`);
      toast.success('Club deleted');
      navigate('/clubs');
    } catch { toast.error('Failed to delete club'); }
  };

  const copyInviteCode = () => {
    if (!inviteCode) return toast.error('Invite code not available yet');
    navigator.clipboard.writeText(inviteCode);
    toast.success('Invite code copied!');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file) return toast.error('Please select a PDF file');
    setUploadLoading(true);
    try {
      const data = new FormData();
      ['title', 'author', 'description'].forEach(k => data.append(k, form[k]));
      data.append('file', form.file);
      data.append('clubId', clubId);
      await api.post('/api/books/upload', data);
      toast.success('Book added to club!');
      setShowModal(false);
      setForm({ title: '', author: '', description: '', file: null });
      const res = await api.get(`/api/books/${clubId}`);
      setBooks(res.data);
    } catch { toast.error('Upload failed'); }
    finally { setUploadLoading(false); }
  };

  const getUserLabel = (msg) => {
    const s = msg.sender;
    if (!s) return 'User';
    if (typeof s === 'object') return s.username || s.name || 'User';
    return 'User';
  };

  const isMe = (msg) => {
    const s = msg.sender;
    if (!s) return false;
    if (typeof s === 'object') return s._id === userId;
    return s === userId;
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f7f7fb', padding: 'clamp(1.5rem,4vw,2.5rem)' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #ece4ff', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#8a8aa0', fontSize: '0.875rem' }}>Loading club…</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7fb', padding: 'clamp(1.5rem,4vw,2.5rem)' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <Navbar />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <button onClick={() => navigate('/clubs')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a8aa0', fontSize: '0.85rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Back to clubs
            </button>
            <h1 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 800, color: '#1f2230', marginBottom: 4 }}>🏛 {club?.name || 'Club Dashboard'}</h1>
            <p style={{ color: '#8a8aa0', fontSize: '0.875rem' }}>{members.length} {members.length === 1 ? 'member' : 'members'} · {books.length} {books.length === 1 ? 'book' : 'books'}</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={copyInviteCode} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <CopyIcon /> Copy invite code
            </button>
            {adminId === userId && (
              <button onClick={deleteClub} style={{ padding: '0.6rem 1.2rem', borderRadius: 10, cursor: 'pointer', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                Delete Club
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 220px', gap: 20, alignItems: 'start' }}>

          {/* ── LEFT: Books ── */}
          <div className="glass" style={{ borderRadius: 18, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, color: '#1f2230', fontSize: '0.95rem' }}>📚 Books</h3>
              <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.78rem' }}>+ Add</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto' }}>
              {books.length === 0
                ? <p style={{ color: '#c4c4d4', fontSize: '0.8rem', textAlign: 'center', padding: '2rem 0' }}>No books yet. Add the first one!</p>
                : books.map(book => (
                  <div key={book._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <img
                      src={book.coverImage ? resolveFileUrl(book.coverImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&size=60&background=ede9fe&color=7c3aed&bold=true`}
                      alt={book.title}
                      style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                      onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&size=60&background=ede9fe&color=7c3aed&bold=true`; }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1f2230', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{book.title}</p>
                      <p style={{ fontSize: '0.72rem', color: '#8a8aa0', marginBottom: 6 }}>{book.author}</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a href={`/viewer?file=${encodeURIComponent(resolveFileUrl(book.fileUrl))}&bookId=${book._id}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Read</a>
                        <a href={resolveFileUrl(book.fileUrl)} download style={{ fontSize: '0.72rem', color: '#8a8aa0', textDecoration: 'none' }}>Download</a>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* ── CENTER: Chat ── */}
          <div className="glass" style={{ borderRadius: 18, display: 'flex', flexDirection: 'column', height: 560 }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #ececf3', flexShrink: 0 }}>
              <h3 style={{ fontWeight: 700, color: '#1f2230', fontSize: '0.95rem' }}>💬 Club Chat</h3>
              <p style={{ fontSize: '0.72rem', color: '#a4a4b8', marginTop: 2 }}>Real-time · Press Enter to send</p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 12, background: '#fcfbfe' }}>
              {messages.length === 0
                ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#c4c4d4', fontSize: '0.85rem', textAlign: 'center' }}>No messages yet.<br />Be the first to say something!</p>
                  </div>
                : messages.map((msg, i) => {
                  const mine = isMe(msg);
                  return (
                    <div key={msg._id || i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }} className="animate-fadeIn">
                      <div style={{ maxWidth: '70%' }}>
                        {!mine && <p style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 600, marginBottom: 3, paddingLeft: 4 }}>{getUserLabel(msg)}</p>}
                        <div className={mine ? 'bubble-me' : 'bubble-other'} style={{ padding: '0.6rem 0.9rem', fontSize: '0.875rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })
              }
              <div ref={messagesEnd} />
            </div>

            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #ececf3', display: 'flex', gap: 8, flexShrink: 0 }}>
              <textarea
                value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send)" rows={1}
                style={{ flex: 1, padding: '0.6rem 0.875rem', background: '#fbfbfe', border: '1px solid #e2e2ee', borderRadius: 10, color: '#1f2230', fontSize: '0.875rem', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
              <button onClick={sendMessage} disabled={sendingMsg || !text.trim()} className="btn-primary" style={{ padding: '0 1rem', flexShrink: 0, borderRadius: 10, minWidth: 60 }}>
                {sendingMsg ? '…' : '↑'}
              </button>
            </div>
          </div>

          {/* ── RIGHT: Members ── */}
          <div className="glass" style={{ borderRadius: 18, padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 700, color: '#1f2230', fontSize: '0.95rem', marginBottom: 16 }}>👥 Members ({members.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
              {members.map(member => {
                const isAdmin = member._id?.toString() === adminId?.toString();
                return (
                  <div key={member._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: isAdmin ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#a78bfa',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white',
                      }}>
                        {(member.username || member.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: isAdmin ? '#d97706' : '#1f2230' }}>{member.username || member.name || 'User'}</p>
                        {isAdmin && <p style={{ fontSize: '0.65rem', color: '#f59e0b' }}>Admin</p>}
                      </div>
                    </div>
                    {adminId === userId && !isAdmin && (
                      <button onClick={() => removeMember(member._id)} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer' }}>×</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="glass-strong animate-scaleIn" style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: '2rem', margin: '1rem', zIndex: 1000 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1f2230' }}>Add book to Club</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a4a4b8', fontSize: '1.5rem' }}>×</button>
            </div>
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { name: 'title', label: 'Title', ph: 'Dune', required: true },
                { name: 'author', label: 'Author', ph: 'Frank Herbert', required: true },
              ].map(f => (
                <div key={f.name}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>{f.label}</label>
                  <input className="input-base" placeholder={f.ph} required={f.required} onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b6b80', fontWeight: 500, marginBottom: 6 }}>PDF file</label>
                <input type="file" accept="application/pdf" required onChange={e => setForm(p => ({ ...p, file: e.target.files[0] }))} style={{ width: '100%', fontSize: '0.85rem', color: '#6b6b80' }} />
              </div>
              <button type="submit" disabled={uploadLoading} className="btn-primary" style={{ width: '100%', padding: '0.875rem', marginTop: 4 }}>
                {uploadLoading ? 'Uploading…' : 'Upload to Club'}
              </button>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
