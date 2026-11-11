import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { resolveFileUrl } from '../utils/api';
import socket from '../socket';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookCover from '../components/BookCover';

// ── UPLOAD BOOK MODAL ──────────────────────────────────────
function UploadClubBookModal({ clubId, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', author: '', description: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a PDF file');
    if (!form.title.trim()) return toast.error('Please enter a book title');
    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', form.title.trim());
      data.append('author', form.author.trim() || 'Unknown Author');
      data.append('description', form.description.trim());
      data.append('file', file);
      data.append('clubId', clubId);

      await api.post('/api/books/upload', data);
      toast.success('Book uploaded to the club! 📚');
      onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to upload book to club';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container-high border border-primary/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-surface-container-lowest border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
            <div>
              <h2 className="font-headline-sm font-garamond text-xl text-on-surface font-semibold">
                Upload Book to Club
              </h2>
              <p className="font-body-sm text-xs text-outline">
                Provide a digital PDF book for collaborative club reading.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1.5">
              Book Title <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. The Shadow of the Wind"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-sm px-3.5 py-2.5 rounded-lg shadow-inner focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1.5">
              Author <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={form.author}
              onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
              placeholder="e.g. Carlos Ruiz Zafón"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-sm px-3.5 py-2.5 rounded-lg shadow-inner focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1.5">
              Notes or Reading Schedule (Optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Add chapter pacing notes, reading milestones, or discussion focus..."
              rows={3}
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-sm px-3.5 py-2.5 rounded-lg shadow-inner focus:outline-none focus:border-primary transition-all resize-y"
            />
          </div>

          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1.5">
              PDF Document <span className="text-primary">*</span>
            </label>
            <input
              type="file"
              accept="application/pdf"
              required
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-xs text-outline file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-container-highest file:text-primary hover:file:bg-surface-bright cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface-variant font-label-lg text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-lg text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {loading ? 'hourglass_empty' : 'upload'}
              </span>
              <span>{loading ? 'Uploading...' : 'Upload Book'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MAIN CLUB DISCUSSION ROOM ──────────────────────────────
export default function ClubDashboard() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userId = user?.userId;

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const prevClubIdRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);

  const [club, setClub] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [profile, setProfile] = useState(null);
  const [userDropdown, setUserDropdown] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('chat'); // 'chat' | 'tome' | 'members'
  const [allBooksOpen, setAllBooksOpen] = useState(false);

  // Fetch current user details for Athenaeum header
  useEffect(() => {
    api.get('/api/users/me')
      .then((res) => setProfile(res.data))
      .catch(() => {});
  }, []);

  // Scroll ONLY the messages container without moving the page/window
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (behavior === 'smooth') {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Track if user is scrolled near bottom of messages container
  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100; // px
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom <= threshold;
  }, []);

  // Fetch Club, Messages, Books, and Members
  const fetchAll = useCallback(async () => {
    try {
      const [msgRes, bookRes, memberRes] = await Promise.all([
        api.get(`/api/messages/${clubId}`).catch(() => ({ data: [] })),
        api.get(`/api/books/${clubId}`).catch(() => ({ data: [] })),
        api.get(`/api/clubs/members/${clubId}`).catch(() => ({ data: { members: [] } })),
      ]);

      setMessages(msgRes.data || []);
      setBooks(bookRes.data || []);
      setMembers(memberRes.data?.members || []);
      setAdminId(memberRes.data?.admin || null);
      setInviteCode(memberRes.data?.inviteCode || '');
      setClub({
        name: memberRes.data?.name,
        description: memberRes.data?.description,
      });
    } catch {
      toast.error('Failed to load salon chamber data');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  // Socket.IO Room Joining and Real-time Listeners
  useEffect(() => {
    fetchAll();

    // Join the dedicated club room
    socket.emit('joinClub', clubId);

    // Listen for incoming messages from fellow readers
    const handleReceiveMessage = (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [clubId, fetchAll]);

  // Scroll messages container when appropriate without moving window/page
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const clubChanged = prevClubIdRef.current !== clubId;
    const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;

    if (clubChanged) {
      prevClubIdRef.current = clubId;
      prevMessagesLengthRef.current = messages.length;
      isNearBottomRef.current = true;
      // Instant internal scroll on club change - keeps page position untouched
      container.scrollTop = container.scrollHeight;
      return;
    }

    if (isInitialLoad) {
      prevMessagesLengthRef.current = messages.length;
      isNearBottomRef.current = true;
      // Instant internal scroll when messages are initially loaded - keeps page position untouched
      container.scrollTop = container.scrollHeight;
      return;
    }

    prevMessagesLengthRef.current = messages.length;

    // For new incoming/sent messages: only scroll container if user was already at bottom
    if (isNearBottomRef.current) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, clubId]);

  // Keep messages container at bottom when switching back to chat tab on mobile
  useEffect(() => {
    if (activeMobileTab === 'chat' && messagesContainerRef.current) {
      if (isNearBottomRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  }, [activeMobileTab]);

  // Send message handler
  const sendMessage = async () => {
    const cleanText = text.trim();
    if (!cleanText || sendingMsg) return;
    setSendingMsg(true);
    try {
      const res = await api.post(`/api/messages/send/${clubId}`, { text: cleanText });
      const newMsg = res.data;

      // Update local message stream immediately
      setMessages((prev) => [...prev, newMsg]);

      // Broadcast to other salon attendees via Socket.IO
      socket.emit('sendMessage', newMsg);

      // User sent their own message: ensure container scrolls to bottom
      isNearBottomRef.current = true;
      scrollToBottom('smooth');

      setText('');
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
      }
    } catch {
      toast.error('Failed to dispatch reflection');
    } finally {
      setSendingMsg(false);
    }
  };

  // Keydown handler: Enter sends, Shift+Enter makes newline
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick insertion helpers for literary discourse
  const insertQuoteTemplate = () => {
    setText((prev) => (prev ? `${prev}\n“...” — Folio / Page ` : '“...” — Folio / Page '));
    textareaRef.current?.focus({ preventScroll: true });
  };

  const insertPageRef = () => {
    setText((prev) => (prev ? `${prev} [Folio p. ] ` : '[Folio p. ] '));
    textareaRef.current?.focus({ preventScroll: true });
  };

  // Administrator Action: Remove Member
  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove reader "${memberName}" from this salon circle?`)) return;
    try {
      await api.delete(`/api/clubs/remove-member/${clubId}/${memberId}`);
      setMembers((prev) => prev.filter((m) => m._id !== memberId));
      toast.success(`Removed "${memberName}" from salon`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  };

  // Administrator Action: Delete Club
  const handleDeleteClub = async () => {
    if (!window.confirm('Dissolve this entire reading circle? All chapter archives will be removed. This cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/api/clubs/delete/${clubId}`);
      toast.success('Reading circle dissolved');
      navigate('/clubs');
    } catch {
      toast.error('Failed to dissolve circle');
    }
  };

  // Member Action: Leave Club
  const handleLeaveClub = async () => {
    if (!window.confirm('Depart from this reading circle?')) return;
    try {
      await api.delete(`/api/clubs/leave/${clubId}`);
      toast.success('Departed from reading circle');
      navigate('/clubs');
    } catch {
      toast.error('Failed to leave circle');
    }
  };

  // Copy Registry Invite Code
  const copyInviteCode = () => {
    if (!inviteCode) return toast.error('Registry code not yet minted');
    navigator.clipboard.writeText(inviteCode);
    toast.success(`Registry invite code "${inviteCode}" copied to clipboard! 📋`);
  };

  // Logout handler
  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
    toast.success('Logged out from Athenaeum');
  };

  // Helpers to inspect message senders
  const isMe = (msg) => {
    const s = msg.sender;
    if (!s) return false;
    if (typeof s === 'object') return s._id === userId;
    return s === userId;
  };

  const isHostMsg = (msg) => {
    const s = msg.sender;
    if (!s) return false;
    const senderId = typeof s === 'object' ? s._id : s;
    return senderId === adminId;
  };

  const getSenderName = (msg) => {
    const s = msg.sender;
    if (!s) return 'Reader • Book Club Member';
    if (typeof s === 'object') return s.username || s.name || 'Reader • Book Club Member';
    return 'Reader • Book Club Member';
  };

  // Find curator/admin member details
  const curator = useMemo(() => {
    return members.find((m) => m._id === adminId) || null;
  }, [members, adminId]);

  const curatorName = useMemo(() => {
    if (adminId === userId) return 'You (Club Host)';
    return curator ? (curator.name || curator.username) : 'Club Host';
  }, [adminId, userId, curator]);

  // Current active book is the most recent book uploaded to the club
  const activeBook = useMemo(() => {
    return books.length > 0 ? books[books.length - 1] : null;
  }, [books]);

  const activeBookProgress = Math.round(activeBook?.progress || 0);

  // Format message time
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-inner mb-4 animate-pulse">
          <span className="material-symbols-outlined text-2xl">auto_stories</span>
        </div>
        <h2 className="font-headline-sm font-garamond text-xl text-on-surface font-semibold mb-1">
          Entering Discussion Room...
        </h2>
        <p className="font-body-sm text-xs text-outline">
          Connecting to real-time club discussion
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col antialiased selection:bg-primary selection:text-on-primary">
      {/* ── TOP FIXED NAVBAR ──────────────────────────────────── */}
      <Navbar activePage="clubs">
        <button
          onClick={() => navigate('/clubs')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-label-sm text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          title="Return to My Clubs"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span className="hidden sm:inline">All Clubs</span>
        </button>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-1 bg-primary text-on-primary font-label-sm text-xs font-semibold px-3 py-1.5 rounded-lg shadow hover:bg-secondary transition-all cursor-pointer"
          title="Upload a new book for this club"
        >
          <span className="material-symbols-outlined text-sm">upload_file</span>
          <span className="hidden sm:inline">Upload Book</span>
        </button>
      </Navbar>

      {/* ── MAIN CONTENT CANVAS ───────────────────────────────── */}
      <main className="w-full pt-24 pb-16 flex-1 flex flex-col">
        <div className="w-full px-gutter-mobile lg:px-margin max-w-[1600px] mx-auto flex flex-col gap-space-md sm:gap-space-lg">

          {/* ── BREADCRUMBS BAR ─────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-outline font-body-sm">
            <button
              onClick={() => navigate('/clubs')}
              className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">groups</span>
              <span>Book Clubs</span>
            </button>
            <span className="text-outline/40">/</span>
            <span className="text-on-surface-variant font-medium truncate max-w-[200px]">
              {club?.name || 'Club'}
            </span>
            <span className="text-outline/40">/</span>
            <span className="text-primary font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
              <span>Discussion Room</span>
            </span>
          </nav>

          {/* ── CLUB HERO HEADER BANNER ─────────────────────────── */}
          <header className="relative w-full rounded-2xl bg-surface-container-low p-5 sm:p-7 shadow-xl overflow-hidden border border-outline-variant/20">
            {/* Background Editorial Texture & Ambient Glows */}
            <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest via-surface-container-low to-surface-container pointer-events-none" />
            <div className="absolute -right-12 -bottom-16 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md sm:gap-space-lg">
              {/* Left Identity Block */}
              <div className="flex flex-col gap-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    <span>Club Discussion Room</span>
                  </span>

                  <span className="text-outline text-xs">•</span>

                  <span className="text-on-surface-variant text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-outline">group</span>
                    <span>{members.length} {members.length === 1 ? 'Reader' : 'Readers'}</span>
                  </span>

                  <span className="text-outline text-xs">•</span>

                  <span className="text-on-surface-variant text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-outline">library_books</span>
                    <span>{books.length} {books.length === 1 ? 'Book' : 'Books'}</span>
                  </span>
                </div>

                <div className="flex items-baseline gap-3 flex-wrap">
                  <h1 className="font-headline-lg font-garamond text-2xl sm:text-3xl lg:text-4xl text-on-surface tracking-tight font-semibold">
                    {club?.name || 'Reading Club'}
                  </h1>
                </div>

                <p className="text-body-sm text-xs sm:text-sm text-on-surface-variant line-clamp-2 max-w-2xl leading-relaxed">
                  {club?.description || 'A sanctuary dedicated to collaborative reading, chapter discussions, and reflective notes.'}
                </p>

                {/* Sub-meta strip */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-outline font-body-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-surface-container-high border border-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                      {curatorName.charAt(0).toUpperCase()}
                    </span>
                    <span>Host:</span>
                    <span className="text-on-surface font-medium">{curatorName}</span>
                  </div>

                  {activeBook && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-primary">
                          menu_book
                        </span>
                        <span>Current Read:</span>
                        <span className="text-on-surface font-medium truncate max-w-[200px]">
                          &lsquo;{activeBook.title}&rsquo;
                        </span>
                        <span className="text-primary font-mono text-[11px]">
                          ({activeBookProgress}%)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                <button
                  onClick={copyInviteCode}
                  className="px-3.5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary font-label-sm text-xs font-semibold transition-all flex items-center gap-1.5 border border-primary/20 shadow-sm cursor-pointer"
                  title="Copy 6-character invite code"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>Code: <span className="font-mono tracking-wider">{inviteCode || '...'}</span></span>
                </button>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                  title="Upload a book to the club"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>Upload Book</span>
                </button>

                {adminId === userId ? (
                  <button
                    onClick={handleDeleteClub}
                    className="p-2 rounded-lg bg-surface-container-high hover:bg-error/20 text-outline hover:text-error transition-colors cursor-pointer"
                    title="Delete Club (Admin Only)"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                ) : (
                  <button
                    onClick={handleLeaveClub}
                    className="p-2 rounded-lg bg-surface-container-high hover:bg-error/20 text-outline hover:text-error transition-colors cursor-pointer"
                    title="Leave Club"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* ── MOBILE SECTION TABS (Shown only on small screens) ── */}
          <div className="flex lg:hidden items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/20">
            <button
              onClick={() => setActiveMobileTab('chat')}
              className={`flex-1 py-1.5 rounded-lg font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeMobileTab === 'chat'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">forum</span>
              <span>Discussions</span>
            </button>
            <button
              onClick={() => setActiveMobileTab('tome')}
              className={`flex-1 py-1.5 rounded-lg font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeMobileTab === 'tome'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">menu_book</span>
              <span>Books ({books.length})</span>
            </button>
            <button
              onClick={() => setActiveMobileTab('members')}
              className={`flex-1 py-1.5 rounded-lg font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeMobileTab === 'members'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">group</span>
              <span>Members ({members.length})</span>
            </button>
          </div>

          {/* ── MULTI-COLUMN DISCUSSION LAYOUT ───────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">

            {/* ════ LEFT/CENTER: DISCUSSION CHAMBERS & STREAM (8 COLS) ════ */}
            <div className={`lg:col-span-8 flex flex-col gap-space-md ${activeMobileTab !== 'chat' ? 'hidden lg:flex' : ''}`}>

              {/* Atmosphere & Channel Header */}
              <div className="w-full bg-surface-container-low rounded-xl px-4 py-2.5 flex items-center justify-between border border-outline-variant/15 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-surface-container-high border border-primary/20 flex items-center justify-center text-primary">
                    <span className="font-bold text-xs">#</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-lg text-xs sm:text-sm text-on-surface font-semibold">
                        club-discussions
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="font-body-sm text-[11px] text-outline">
                      Live Club Discussion • Chapter reflections
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-outline">
                  <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-label-sm text-[10px] font-semibold uppercase tracking-wider hidden sm:inline-block">
                    Real-time Socket
                  </span>
                  <button
                    onClick={() => {
                      isNearBottomRef.current = true;
                      scrollToBottom('smooth');
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-container hover:text-primary transition-colors cursor-pointer"
                    title="Jump to latest messages"
                  >
                    <span className="material-symbols-outlined text-base">vertical_align_bottom</span>
                  </button>
                </div>
              </div>

              {/* Pinned Lore Dispatch Banner */}
              <div className="relative w-full rounded-xl bg-surface-container p-3.5 sm:p-4 flex items-start gap-3 shadow-sm border border-outline-variant/15 overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 text-primary">
                  <span className="material-symbols-outlined text-[20px]">forum</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-[10px] uppercase tracking-wider text-primary font-bold">
                      Current Club Focus
                    </span>
                    <span className="text-outline text-xs">•</span>
                    <span className="font-body-sm text-[11px] text-outline">
                      Host: {curatorName}
                    </span>
                  </div>
                  <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-0.5 leading-relaxed">
                    {club?.description || 'Welcome to our reading circle discussion room. Share notes, cite favorite passages, and debate reflections on our active reading selection.'}
                  </p>
                </div>
              </div>

              {/* Messages Stream Chamber */}
              <div className="w-full bg-surface-container-low rounded-2xl p-4 sm:p-6 flex flex-col shadow-xl border border-outline-variant/15 h-[520px] lg:h-[580px]">
                {/* Scrollable Message History */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin"
                >
                  {/* Date Separator */}
                  <div className="relative flex items-center justify-center my-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full h-px bg-outline-variant/20" />
                    </div>
                    <div className="relative px-3 py-0.5 rounded-full bg-surface-container text-outline font-label-sm text-[10px] uppercase tracking-widest border border-outline-variant/10">
                      Discussion Stream
                    </div>
                  </div>

                  {messages.length === 0 ? (
                    /* Empty State: No messages yet */
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-outline">
                      <div className="w-14 h-14 rounded-2xl bg-surface-container border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner">
                        <span className="material-symbols-outlined text-2xl">edit_note</span>
                      </div>
                      <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold mb-1">
                        No messages in this discussion yet
                      </h3>
                      <p className="font-body-sm text-xs text-outline max-w-sm leading-relaxed mb-4">
                        No messages have been shared in this club yet. Be the first reader to share a thought or cite a passage.
                      </p>
                      <button
                        onClick={insertQuoteTemplate}
                        className="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-xs font-semibold border border-primary/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">format_quote</span>
                        <span>Start with a Passage Quote</span>
                      </button>
                    </div>
                  ) : (
                    /* Real Message Stream */
                    messages.map((msg, i) => {
                      const mine = isMe(msg);
                      const isHost = isHostMsg(msg);
                      const senderName = getSenderName(msg);
                      const senderInitial = senderName.charAt(0).toUpperCase();

                      return (
                        <div
                          key={msg._id || i}
                          className={`flex items-start gap-2.5 sm:gap-3 group animate-fadeIn ${
                            mine ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          {/* Sender Monogram Badge */}
                          <div className="relative shrink-0 mt-0.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-garamond text-sm font-bold shadow-sm ${
                                mine
                                  ? 'bg-primary-container text-on-primary-container border border-primary/30'
                                  : isHost
                                  ? 'bg-secondary-container text-on-secondary-container border border-secondary/40'
                                  : 'bg-surface-container-high text-on-surface border border-outline-variant/30'
                              }`}
                            >
                              {senderInitial}
                            </div>
                            {isHost && (
                              <span
                                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-secondary text-on-secondary rounded-full flex items-center justify-center shadow"
                                title="Club Host"
                              >
                                <span className="material-symbols-outlined text-[9px]">star</span>
                              </span>
                            )}
                          </div>

                          {/* Message Content Bubble */}
                          <div
                            className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                              mine ? 'items-end' : 'items-start'
                            }`}
                          >
                            {/* Author & Timestamp Header */}
                            <div
                              className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] ${
                                mine ? 'flex-row-reverse' : 'flex-row'
                              }`}
                            >
                              <span
                                className={`font-label-lg font-semibold ${
                                  mine
                                    ? 'text-primary'
                                    : isHost
                                    ? 'text-secondary font-bold'
                                    : 'text-on-surface'
                                }`}
                              >
                                {mine ? `${senderName} (You)` : senderName}
                              </span>

                              {isHost && !mine && (
                                <span className="px-1.5 py-0.2 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[9px] uppercase tracking-wider font-bold">
                                  Host
                                </span>
                              )}

                              <span className="text-outline/60 text-[10px]">
                                {formatTime(msg.createdAt)}
                              </span>
                            </div>

                            {/* Text Bubble */}
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
                                mine
                                  ? 'bg-primary/15 border border-primary/30 text-on-surface rounded-tr-sm'
                                  : isHost
                                  ? 'bg-surface-container-high border border-secondary/25 text-on-surface rounded-tl-sm'
                                  : 'bg-surface-container border border-outline-variant/20 text-on-surface rounded-tl-sm'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Bottom Stream Anchor */}
                <div className="pt-2" />
              </div>

              {/* Rich Chat Composition Chamber */}
              <div className="w-full bg-surface-container-low rounded-2xl p-3.5 sm:p-4 shadow-xl border border-outline-variant/20 flex flex-col gap-2.5">
                {/* Assist Toolbar */}
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-outline-variant/15 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={insertQuoteTemplate}
                      className="px-2 py-1 rounded hover:bg-surface-container text-outline hover:text-primary transition-colors flex items-center gap-1 font-label-sm text-[11px] cursor-pointer"
                      title="Insert quote passage template"
                    >
                      <span className="material-symbols-outlined text-[15px] text-primary">
                        format_quote
                      </span>
                      <span>Cite / Quote</span>
                    </button>

                    <button
                      type="button"
                      onClick={insertPageRef}
                      className="px-2 py-1 rounded hover:bg-surface-container text-outline hover:text-secondary transition-colors flex items-center gap-1 font-label-sm text-[11px] cursor-pointer"
                      title="Insert page reference tag"
                    >
                      <span className="material-symbols-outlined text-[15px] text-secondary">
                        auto_stories
                      </span>
                      <span>Page Ref</span>
                    </button>
                  </div>

                  {/* Active user status badge */}
                  <div className="flex items-center gap-1.5 text-[11px] text-outline font-label-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="truncate max-w-[180px]">
                      Writing as {profile?.username || 'Reader'}
                    </span>
                  </div>
                </div>

                {/* Textarea Input */}
                <div className="relative w-full">
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Share your thoughts in #club-discussions... (Press Enter to send, Shift+Enter for new line)"
                    className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline/50 font-body-md text-xs sm:text-sm p-3 rounded-xl border border-outline-variant/25 focus:outline-none focus:border-primary transition-all resize-none shadow-inner"
                  />
                </div>

                {/* Bottom Dispatch Controls */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-[10px] text-outline hidden sm:inline">
                    Enter sends • Shift+Enter new line
                  </span>

                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={sendingMsg || !text.trim()}
                    className="ml-auto px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-on-primary font-label-lg text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <span>{sendingMsg ? 'Sending...' : 'Send Message'}</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {sendingMsg ? 'hourglass_empty' : 'send'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ════ RIGHT: LITERARY SIDEBAR (4 COLS) ════ */}
            <aside className={`lg:col-span-4 flex flex-col gap-space-md ${activeMobileTab === 'chat' ? 'hidden lg:flex' : ''}`}>

              {/* ── SECTION 1: CURRENT CLUB BOOK & READING PROGRESS ── */}
              <div className={`w-full bg-surface-container-low rounded-2xl p-5 shadow-xl border border-outline-variant/20 flex flex-col gap-3.5 ${activeMobileTab === 'members' ? 'hidden lg:flex' : ''}`}>
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">
                      menu_book
                    </span>
                    <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary font-bold">
                      Current Book
                    </span>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="text-[11px] text-outline hover:text-primary transition-colors flex items-center gap-1 font-label-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Add</span>
                  </button>
                </div>

                {activeBook ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3 items-start">
                      {/* Book Cover Thumbnail with WebP optimization & spine shadow */}
                      <BookCover
                        coverImage={activeBook.coverImage}
                        title={activeBook.title}
                        author={activeBook.author}
                        variant="thumb"
                        className="w-20 shadow-xl"
                      />

                      {/* Book Details */}
                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="font-label-sm text-[9px] uppercase tracking-wider text-secondary font-bold">
                          Active Selection
                        </span>
                        <h3
                          title={activeBook.title}
                          className="font-headline-sm font-garamond text-base text-on-surface leading-tight mt-0.5 truncate"
                        >
                          {activeBook.title}
                        </h3>
                        <p className="font-body-sm text-xs text-outline truncate mt-0.5">
                          {activeBook.author || 'Unknown Author'}
                        </p>

                        {/* Progress Bar */}
                        <div className="mt-2.5 flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-outline">Reading Progress</span>
                            <span className="text-primary font-mono font-bold">
                              {activeBookProgress}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(activeBookProgress, 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Book Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant/15">
                      <a
                        href={`/viewer?file=${encodeURIComponent(resolveFileUrl(activeBook.fileUrl))}&bookId=${activeBook._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1.5 px-3 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all text-center no-underline cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">menu_book</span>
                        <span>Read Book</span>
                      </a>

                      <a
                        href={resolveFileUrl(activeBook.fileUrl)}
                        download
                        className="py-1.5 px-3 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors text-center no-underline cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">download</span>
                        <span>Download</span>
                      </a>
                    </div>

                    {/* Toggle all books if more than 1 */}
                    {books.length > 1 && (
                      <div className="pt-1">
                        <button
                          onClick={() => setAllBooksOpen((p) => !p)}
                          className="w-full py-1 text-xs text-outline hover:text-primary transition-colors flex items-center justify-between font-label-sm cursor-pointer"
                        >
                          <span>All Club Books ({books.length})</span>
                          <span className="material-symbols-outlined text-sm">
                            {allBooksOpen ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>

                        {allBooksOpen && (
                          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1 animate-fadeIn">
                            {books.map((b) => (
                              <div
                                key={b._id}
                                className="p-2 rounded-lg bg-surface-container flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="truncate flex-1">
                                  <p className="font-medium text-on-surface truncate">{b.title}</p>
                                  <p className="text-[10px] text-outline truncate">{b.author}</p>
                                </div>
                                <a
                                  href={`/viewer?file=${encodeURIComponent(resolveFileUrl(b.fileUrl))}&bookId=${b._id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline text-[11px] font-semibold shrink-0"
                                >
                                  Read
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Empty state for books */
                  <div className="py-6 px-3 flex flex-col items-center justify-center text-center text-xs text-outline">
                    <span className="material-symbols-outlined text-primary/70 text-2xl mb-1.5">
                      menu_book
                    </span>
                    <span className="font-label-sm text-[11px] text-primary uppercase tracking-wider font-semibold">
                      No Book Selected Yet
                    </span>
                    <p className="text-[11px] text-outline mt-1 max-w-[220px] leading-relaxed mb-3">
                      Upload a PDF book for this club to begin synchronized chapter readings and discussions.
                    </p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      <span>Upload Book</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ── SECTION 2: CLUB MEMBERS ── */}
              <div className={`w-full bg-surface-container-low rounded-2xl p-5 shadow-xl border border-outline-variant/20 flex flex-col gap-3.5 ${activeMobileTab === 'tome' ? 'hidden lg:flex' : ''}`}>
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-base">
                      group
                    </span>
                    <h3 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                      Club Members
                    </h3>
                    <span className="text-outline text-xs">({members.length})</span>
                  </div>
                  <span className="font-label-sm text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Real-time</span>
                  </span>
                </div>

                {/* Members list */}
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                  {members.map((member) => {
                    const isMemberAdmin = member._id?.toString() === adminId?.toString();
                    const isSelf = member._id?.toString() === userId?.toString();
                    const memberName = member.username || member.name || 'User';
                    const memberInitial = memberName.charAt(0).toUpperCase();

                    return (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Avatar Monogram */}
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-garamond text-xs font-bold shrink-0 ${
                              isMemberAdmin
                                ? 'bg-secondary-container text-on-secondary-container border border-secondary/40'
                                : 'bg-surface-container-highest text-on-surface border border-outline-variant/20'
                            }`}
                          >
                            {memberInitial}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="font-label-sm text-xs text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                              {memberName} {isSelf && <span className="text-primary font-normal">(You)</span>}
                            </span>
                            <span className="font-body-sm text-[10px] text-outline truncate">
                              {isMemberAdmin ? 'Club Host' : 'Club Member'}
                            </span>
                          </div>
                        </div>

                        {/* Admin Action: Remove Member */}
                        {adminId === userId && !isMemberAdmin && (
                          <button
                            onClick={() => handleRemoveMember(member._id, memberName)}
                            className="p-1 rounded text-outline hover:text-error hover:bg-error/15 transition-colors cursor-pointer"
                            title="Remove member from club"
                          >
                            <span className="material-symbols-outlined text-[15px]">close</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Invite Reader Action */}
                <button
                  onClick={copyInviteCode}
                  className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-primary/20 cursor-pointer"
                  title="Copy 6-character invite code"
                >
                  <span className="material-symbols-outlined text-[15px]">person_add</span>
                  <span>Invite Reader to Club</span>
                </button>
              </div>

              {/* ── SECTION 3: CLUB PRIVACY & GUIDELINES ── */}
              <div className="w-full bg-surface-container-low rounded-2xl p-5 shadow-xl border border-outline-variant/20 flex flex-col gap-3">
                <div className="flex items-center gap-1.5 border-b border-outline-variant/15 pb-2">
                  <span className="material-symbols-outlined text-outline text-base">
                    verified_user
                  </span>
                  <h4 className="font-headline-sm font-garamond text-sm text-on-surface font-semibold">
                    Club Privacy & Guidelines
                  </h4>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                  This club discussion is private and protected in real-time. Share your invite code with friends to invite fellow readers.
                </p>
                <div className="p-2.5 rounded-lg bg-surface-container text-xs text-outline flex items-center justify-between font-mono">
                  <span>Invite Code:</span>
                  <span className="text-primary font-bold tracking-wider">
                    {inviteCode || 'N/A'}
                  </span>
                </div>
              </div>

            </aside>
          </div>

        </div>
      </main>

      {/* ── UPLOAD BOOK MODAL ─────────────────────────────────── */}
      {showUploadModal && (
        <UploadClubBookModal
          clubId={clubId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchAll();
          }}
        />
      )}

      {/* ── GLOBAL FOOTER ─────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
