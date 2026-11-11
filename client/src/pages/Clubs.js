import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { resolveFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookCover from '../components/BookCover';

// ── CREATE CLUB MODAL ──────────────────────────────────────
function CreateClubModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return toast.error('Please enter a club name');
    }
    setLoading(true);
    try {
      await api.post('/api/clubs/create', {
        name: form.name.trim(),
        description: form.description.trim(),
      });
      toast.success(`Club "${form.name}" created successfully! 🏛`);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create club');
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
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
            </div>
            <div>
              <h2 className="font-headline-sm font-garamond text-xl text-on-surface font-semibold">
                Create a Book Club
              </h2>
              <p className="font-body-sm text-xs text-outline">
                Create a reading club for collaborative chapter discussions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface-container"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1.5">
              Club Name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. The Ink & Ivy Society"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-sm px-3.5 py-2.5 rounded-lg shadow-inner focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1.5">
              Club Description (Optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe the literary focus, meeting cadence, or themes explored by this club..."
              rows={4}
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-sm px-3.5 py-2.5 rounded-lg shadow-inner focus:outline-none focus:border-primary transition-all resize-y"
            />
          </div>

          <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/15 flex items-start gap-2.5 text-xs text-outline">
            <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0 mt-0.5">
              key
            </span>
            <p>
              A unique 6-character invite code will be generated automatically so you can invite members.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-outline-variant/20">
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
              className="px-5 py-2 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-lg text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-sm">
                {loading ? 'hourglass_empty' : 'menu_book'}
              </span>
              <span>{loading ? 'Creating Club...' : 'Create Club'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── DISCOVER CLUBS SLIDING DRAWER ──────────────────────────
function DiscoverClubsDrawer({ isOpen, onClose, onJoinedSuccess, myClubs }) {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [expandedClubId, setExpandedClubId] = useState(null);
  const [joiningClubId, setJoiningClubId] = useState(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle direct join by code form
  const handleJoinByCode = async (e) => {
    e.preventDefault();
    const cleanCode = inviteCode.trim();
    if (!cleanCode) {
      return toast.error('Please enter a 6-character invite code');
    }
    setJoiningCode(true);
    try {
      const res = await api.post(`/api/clubs/join/${cleanCode}`);
      toast.success(res.data?.message || 'Joined reading circle! 🏛');
      setInviteCode('');
      onJoinedSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Invalid or expired invite code');
    } finally {
      setJoiningCode(false);
    }
  };

  // Handle join from a listed club card
  const handleJoinClub = async (club) => {
    if (!club.inviteCode) {
      return toast.error('This circle does not have an active registry code');
    }
    setJoiningClubId(club._id);
    try {
      const res = await api.post(`/api/clubs/join/${club.inviteCode}`);
      toast.success(res.data?.message || `Joined "${club.name}"! 🏛`);
      onJoinedSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to join circle');
    } finally {
      setJoiningClubId(null);
    }
  };

  // Curated genre filter tags
  const GENRE_TAGS = [
    { id: 'all', label: 'All Circles' },
    { id: 'classics', label: 'Classics & Philosophy' },
    { id: 'speculative', label: 'Speculative & Sci-Fi' },
    { id: 'gothic', label: 'Historical & Gothic' },
    { id: 'literary', label: 'Literary Fiction' },
    { id: 'poetry', label: 'Poetry & Essays' },
  ];

  // Map of joined club IDs for quick lookup
  const joinedClubIds = useMemo(() => {
    return new Set((myClubs || []).map((c) => c._id));
  }, [myClubs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Darkened Atmospheric Backdrop */}
      <div
        className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sliding Drawer Container */}
      <div className="fixed inset-y-0 right-0 z-50 flex max-w-full">
        <aside
          className="w-full sm:w-[90vw] md:w-[85vw] lg:w-[80vw] max-w-5xl bg-surface-container-low border-l border-outline-variant/30 shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-out"
          role="dialog"
          aria-modal="true"
          aria-label="Discover Reading Circles Drawer"
        >
          {/* Drawer Top Bar */}
          <div className="h-20 px-6 sm:px-8 border-b border-outline-variant/20 bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-primary/25 flex items-center justify-center text-primary shadow-inner">
                <span className="material-symbols-outlined text-[22px]">explore</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-[10px] text-primary uppercase tracking-widest font-semibold">
                    Club Directory
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
                <h2 className="font-headline-sm font-garamond text-xl sm:text-2xl text-on-surface font-semibold tracking-tight">
                  Discover Reading Clubs
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              title="Close Directory (Esc)"
              aria-label="Close Directory"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
            {/* ── SECTION A: DIRECT JOIN VIA REGISTRY CODE (Hero Card) ── */}
            <div className="relative rounded-2xl bg-gradient-to-r from-surface-container via-surface-container-high to-surface-container p-6 border border-primary/25 shadow-lg overflow-hidden">
              <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="max-w-xl">
                  <div className="flex items-center gap-1.5 text-primary font-label-sm text-xs uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-sm">key</span>
                    <span>Direct Registry Pass</span>
                  </div>
                  <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold">
                    Have an Invitation Code?
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                    Paste the 6-character code shared by a circle curator to join an existing salon instantly.
                  </p>
                </div>

                <form
                  onSubmit={handleJoinByCode}
                  className="flex items-center gap-2 w-full md:w-auto"
                >
                  <div className="relative flex-1 md:w-56">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
                      tag
                    </span>
                    <input
                      type="text"
                      maxLength={12}
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toLowerCase())}
                      placeholder="e.g. 7k3b9a"
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 pl-9 pr-3 py-2.5 rounded-lg text-sm text-on-surface font-mono placeholder:text-outline/40 focus:outline-none focus:border-primary transition-all shadow-inner uppercase tracking-wider"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={joiningCode || !inviteCode.trim()}
                    className="px-4 py-2.5 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-lg text-xs font-semibold shadow transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {joiningCode ? 'hourglass_empty' : 'login'}
                    </span>
                    <span>{joiningCode ? 'Verifying...' : 'Join Circle'}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* ── SECTION B: SEARCH & GENRE FILTER STRIP ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
              {/* Genre Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                {GENRE_TAGS.map((tag) => {
                  const isActive = selectedGenre === tag.id;
                  return (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedGenre(tag.id)}
                      className={`px-3 py-1.5 rounded-lg font-label-sm text-xs whitespace-nowrap transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-primary text-on-primary font-semibold shadow-sm'
                          : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>

              {/* Search Field */}
              <div className="relative w-full md:w-72 flex-shrink-0">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search circles by name or lore..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 pl-9 pr-3 py-2 rounded-lg text-body-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* ── SECTION C: ATHENAEUM REGISTRY CARDS ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">
                    groups_3
                  </span>
                  <h3 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                    Curated Guild Directory
                  </h3>
                </div>
                <span className="font-label-sm text-[11px] text-outline">
                  Showing circles registered in this Athenaeum
                </span>
              </div>

              {/* Known Circles List */}
              {myClubs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myClubs
                    .filter((c) => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        c.name?.toLowerCase().includes(q) ||
                        c.description?.toLowerCase().includes(q)
                      );
                    })
                    .map((club) => {
                      const isJoined = joinedClubIds.has(club._id);
                      const isExpanded = expandedClubId === club._id;
                      const isJoining = joiningClubId === club._id;

                      return (
                        <article
                          key={club._id}
                          className="rounded-xl bg-surface-container border border-outline-variant/20 p-5 shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/20 flex items-center justify-center text-primary font-garamond text-base font-bold">
                                  {club.name ? club.name.charAt(0).toUpperCase() : '🏛'}
                                </div>
                                <div>
                                  <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold truncate">
                                    {club.name}
                                  </h4>
                                  <p className="font-label-sm text-[10px] text-outline">
                                    {club.curatorName ? `Hosted by ${club.curatorName}` : 'Book Club'}
                                  </p>
                                </div>
                              </div>

                              <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-[10px] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">group</span>
                                <span>{club.memberCount || club.members?.length || 1}</span>
                              </span>
                            </div>

                            {/* Description */}
                            <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-3">
                              {club.description || 'A dedicated circle for quiet reading, chapter notes, and shared literary insights.'}
                            </p>

                            {/* Expandable Details Panel */}
                            {isExpanded && (
                              <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 mb-3 text-xs space-y-2 animate-fadeIn">
                                <div>
                                  <span className="font-label-sm text-[10px] text-primary uppercase tracking-wider block mb-0.5">
                                    Club Details
                                  </span>
                                  <p className="text-on-surface-variant text-[11px] leading-relaxed">
                                    {club.description || 'No extended description recorded for this club.'}
                                  </p>
                                </div>

                                <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-[11px]">
                                  <span className="text-outline">Invite Code:</span>
                                  <span className="font-mono text-primary font-semibold tracking-wider">
                                    {club.inviteCode || 'N/A'}
                                  </span>
                                </div>

                                {club.currentBook && (
                                  <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-[11px]">
                                    <span className="text-outline">Current Book:</span>
                                    <span className="text-on-surface truncate font-medium">
                                      {club.currentBook.title}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Card Footer Actions */}
                          <div className="pt-3 border-t border-outline-variant/15 flex items-center justify-between gap-2 mt-2">
                            <button
                              onClick={() => setExpandedClubId(isExpanded ? null : club._id)}
                              className="text-xs text-outline hover:text-primary transition-colors flex items-center gap-1 font-label-sm cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                              <span className="material-symbols-outlined text-sm">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                            </button>

                            <div className="flex items-center gap-2">
                              {isJoined ? (
                                <button
                                  onClick={() => {
                                    onClose();
                                    navigate(`/club/${club._id}`);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary font-label-sm text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <span>Enter Room</span>
                                  <span className="material-symbols-outlined text-xs">
                                    arrow_forward
                                  </span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleJoinClub(club)}
                                  disabled={isJoining}
                                  className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold shadow-sm transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-xs">
                                    {isJoining ? 'hourglass_empty' : 'group_add'}
                                  </span>
                                  <span>{isJoining ? 'Joining...' : 'Join Club'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-surface-container text-center border border-outline-variant/15">
                  <span className="material-symbols-outlined text-outline text-3xl mb-2">
                    lock_clock
                  </span>
                  <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold mb-1">
                    Private Book Clubs
                  </h4>
                  <p className="font-body-sm text-xs text-outline max-w-md mx-auto leading-relaxed">
                    Clubs require a 6-character invite code to ensure intimate, focused discussions. Enter an invite code in the pass box above to join.
                  </p>
                </div>
              )}
            </div>

            {/* ── SECTION D: CLUB PRIVACY & GUIDELINES ── */}
            <div className="rounded-xl bg-surface-container/60 border border-outline-variant/20 p-5 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-base">info</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-headline-sm font-garamond text-sm text-on-surface font-semibold">
                  Club Privacy & Guidelines
                </h4>
                <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                  Bookify reading clubs are protected sanctuary spaces. When you create a club, you receive a dedicated 6-character invite code. Anyone who possesses this code can join and participate in chapter discussions and reading notes.
                </p>
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="h-16 px-6 sm:px-8 border-t border-outline-variant/20 bg-surface-container-lowest flex items-center justify-between flex-shrink-0">
            <span className="font-label-sm text-[11px] text-outline">
              Bookify Clubs Directory
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant font-label-sm text-xs transition-colors cursor-pointer"
            >
              Close Directory
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── MAIN CLUBS PAGE ────────────────────────────────────────
export default function Clubs() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userId = user?.userId;

  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDiscoverDrawer, setShowDiscoverDrawer] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch joined clubs (backend returns pre-enriched summary, eliminating N+1 queries)
  const fetchClubs = useCallback(async () => {
    try {
      const res = await api.get('/api/clubs/my-clubs');
      const baseClubs = res.data || [];

      const enriched = baseClubs.map((club) => ({
        ...club,
        currentBook:
          club.currentBook ||
          (club.books && club.books.length > 0 ? club.books[club.books.length - 1] : null),
        books: club.books || [],
        curatorName:
          club.curatorName || (club.admin === userId ? 'You' : 'Club Host'),
        memberCount:
          club.memberCount || (club.members?.length || 1),
        messagesCount: club.messagesCount || 0,
      }));

      setClubs(enriched);
    } catch {
      toast.error('Failed to load your reading clubs');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  // Handle Leave Club
  const handleLeaveClub = async (clubId, clubName) => {
    if (!window.confirm(`Leave the reading club "${clubName}"?`)) return;
    try {
      await api.delete(`/api/clubs/leave/${clubId}`);
      toast.success(`Left club "${clubName}"`);
      setClubs((prev) => prev.filter((c) => c._id !== clubId));
    } catch {
      toast.error('Failed to leave club');
    }
  };

  // Copy club invite code to clipboard
  const handleCopyCode = (code, e) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success(`Invite code "${code}" copied to clipboard! 📋`);
  };

  // Filtered Clubs computation
  const filteredClubs = useMemo(() => {
    let list = clubs;

    // Filter by tab
    if (activeFilter === 'active-reads') {
      list = list.filter((c) => c.currentBook !== null);
    } else if (activeFilter === 'curated') {
      list = list.filter((c) => c.admin === userId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.currentBook?.title?.toLowerCase().includes(q) ||
          c.currentBook?.author?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [clubs, activeFilter, searchQuery, userId]);

  // Derived real dynamic metrics
  const totalJoined = clubs.length;
  const hostedCount = clubs.filter((c) => c.admin === userId).length;
  const activeTomesCount = clubs.filter((c) => c.currentBook !== null).length;
  const totalReadersCount = clubs.reduce((acc, c) => acc + (c.memberCount || 1), 0);

  // Logout handler
  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
    toast.success('Logged out from Athenaeum');
  };

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col antialiased selection:bg-primary selection:text-on-primary">
      {/* ── TOP FIXED NAVBAR ──────────────────────────────────── */}
      <Navbar activePage="clubs">
        <button
          onClick={() => setShowDiscoverDrawer(true)}
          className="inline-flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-sm text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary/20 transition-all cursor-pointer"
          title="Open Clubs Directory"
        >
          <span className="material-symbols-outlined text-sm">explore</span>
          <span className="hidden sm:inline">Discover</span>
        </button>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1 bg-primary text-on-primary font-label-sm text-xs font-semibold px-3 py-1.5 rounded-lg shadow hover:bg-secondary transition-all cursor-pointer"
          title="Create a new reading club"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="hidden sm:inline">New Club</span>
        </button>
      </Navbar>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────── */}
      <main className="w-full pt-24 pb-16 flex-1 flex flex-col">
        <div className="w-full px-gutter-mobile lg:px-margin max-w-7xl mx-auto flex flex-col gap-space-xl">

          {/* ── HERO / HEADER SECTION ───────────────────────────── */}
          <section className="relative w-full rounded-2xl bg-surface-container-low p-6 sm:p-8 lg:p-10 shadow-xl overflow-hidden border border-outline-variant/20">
            {/* Ambient gold glow circles */}
            <div className="absolute -right-16 -top-16 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="absolute -left-10 bottom-0 w-72 h-72 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
              <div className="flex flex-col gap-space-sm max-w-2xl">
                <div className="flex items-center gap-space-xs text-primary font-label-sm text-xs uppercase tracking-widest font-semibold">
                  <span className="material-symbols-outlined text-[16px]">auto_stories</span>
                  <span>Book Clubs • Reading Circles</span>
                </div>
                <h1 className="font-headline-lg font-garamond text-3xl sm:text-4xl lg:text-[42px] text-on-surface tracking-tight leading-tight">
                  Your Book Clubs & Circles
                </h1>
                <p className="font-body-md text-sm sm:text-base text-on-surface-variant leading-relaxed">
                  Curate reading lists, engage in chapter-by-chapter discussions, and vote on upcoming books with your circles.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-space-sm self-start lg:self-end">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-xs font-semibold transition-all duration-300 hover:bg-secondary-fixed shadow-[0_4px_20px_rgba(212,163,115,0.2)] flex items-center gap-space-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>Create New Club</span>
                </button>
                <button
                  onClick={() => setShowDiscoverDrawer(true)}
                  className="px-4 py-2.5 rounded-lg bg-surface-container-high text-primary font-label-lg text-xs font-semibold transition-all duration-200 hover:bg-surface-container-highest hover:text-on-surface flex items-center gap-space-xs cursor-pointer border border-primary/20"
                >
                  <span className="material-symbols-outlined text-[18px]">explore</span>
                  <span>Discover Clubs</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar (Real Database Metrics) */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-space-md mt-space-xl pt-space-lg border-t border-outline-variant/15">
              <div className="flex flex-col p-4 rounded-xl bg-surface-container/60 shadow-sm border border-outline-variant/10">
                <span className="font-headline-md font-garamond text-2xl lg:text-3xl text-primary font-semibold">
                  {totalJoined}
                </span>
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline mt-1 font-semibold">
                  Joined Clubs
                </span>
              </div>

              <div className="flex flex-col p-4 rounded-xl bg-surface-container/60 shadow-sm border border-outline-variant/10">
                <span className="font-headline-md font-garamond text-2xl lg:text-3xl text-secondary font-semibold">
                  {hostedCount}
                </span>
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline mt-1 font-semibold">
                  Hosted Clubs
                </span>
              </div>

              <div className="flex flex-col p-4 rounded-xl bg-surface-container/60 shadow-sm border border-outline-variant/10">
                <span className="font-headline-md font-garamond text-2xl lg:text-3xl text-on-surface font-semibold">
                  {activeTomesCount}
                </span>
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline mt-1 font-semibold">
                  Active Books
                </span>
              </div>

              <div className="flex flex-col p-4 rounded-xl bg-surface-container/60 shadow-sm border border-outline-variant/10">
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-md font-garamond text-2xl lg:text-3xl text-primary-fixed-dim font-semibold">
                    {totalReadersCount}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </div>
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline mt-1 font-semibold">
                  Fellow Readers
                </span>
              </div>
            </div>
          </section>

          {/* ── FILTER & NAVIGATION CONTROL STRIP ───────────────── */}
          <section className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-xs overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-lg font-label-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                All My Clubs ({clubs.length})
              </button>
              <button
                onClick={() => setActiveFilter('active-reads')}
                className={`px-4 py-2 rounded-lg font-label-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === 'active-reads'
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                Currently Active Reads ({activeTomesCount})
              </button>
              <button
                onClick={() => setActiveFilter('curated')}
                className={`px-4 py-2 rounded-lg font-label-lg text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === 'curated'
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                Hosted by Me ({hostedCount})
              </button>
            </div>

            {/* Filter Search Input */}
            <div className="relative w-full md:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter clubs or topics..."
                className="w-full bg-surface-container-low border border-outline-variant/30 pl-9 pr-3 py-2 rounded-lg text-body-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-all shadow-sm"
              />
            </div>
          </section>

          {/* ── CARDS GRID OR EMPTY STATES ──────────────────────── */}
          {loading ? (
            /* Skeleton Loading State */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-6 flex flex-col gap-4 animate-pulse"
                >
                  <div className="h-4 w-28 bg-surface-container rounded" />
                  <div className="h-6 w-48 bg-surface-container rounded" />
                  <div className="h-3 w-32 bg-surface-container rounded" />
                  <div className="h-28 bg-surface-container rounded-lg" />
                  <div className="h-10 bg-surface-container rounded-lg mt-auto" />
                </div>
              ))}
            </div>
          ) : clubs.length === 0 ? (
            /* Empty State: User has not joined any clubs */
            <div className="rounded-2xl bg-surface-container-low border border-primary/25 p-10 sm:p-14 text-center shadow-lg relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary mx-auto mb-4 shadow-inner">
                <span className="material-symbols-outlined text-3xl">auto_stories</span>
              </div>
              <h3 className="font-headline-lg font-garamond text-2xl text-on-surface font-semibold mb-2">
                No Reading Clubs Joined Yet
              </h3>
              <p className="font-body-md text-sm text-on-surface-variant max-w-lg mx-auto mb-6 leading-relaxed">
                You have not yet joined any reading clubs. Discover active clubs to join via invite code, or establish a new club of your own.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setShowDiscoverDrawer(true)}
                  className="px-5 py-2.5 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-lg text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">explore</span>
                  <span>Discover Clubs</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer border border-primary/20"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Create a Club</span>
                </button>
              </div>
            </div>
          ) : filteredClubs.length === 0 ? (
            /* Empty State for current filter / search */
            <div className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-8 text-center">
              <span className="material-symbols-outlined text-outline text-3xl mb-2">
                search_off
              </span>
              <h4 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold mb-1">
                No Clubs Match Your Filter
              </h4>
              <p className="font-body-sm text-xs text-outline mb-4">
                No clubs found matching &ldquo;{searchQuery || activeFilter}&rdquo;. Try another term or view all clubs.
              </p>
              <button
                onClick={() => {
                  setActiveFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-xs transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            /* Active Reading Circles (Cards Grid) */
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
              {filteredClubs.map((club) => {
                const currentBook = club.currentBook;
                const progressPct = Math.round(currentBook?.progress || 0);
                const isHost = club.admin === userId;

                return (
                  <article
                    key={club._id}
                    className="flex flex-col rounded-xl bg-surface-container-low p-space-lg shadow-md hover:shadow-xl transition-all duration-300 relative group border border-outline-variant/15 justify-between"
                  >
                    <div>
                      {/* Status & Role Pill Strip */}
                      <div className="flex items-center justify-between gap-space-xs mb-space-sm">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-[10px] uppercase tracking-wider font-semibold">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              currentBook ? 'bg-primary animate-pulse' : 'bg-outline'
                            }`}
                          />
                          <span>{currentBook ? 'Active Book' : 'Reading Open'}</span>
                        </div>

                        {isHost ? (
                          <span className="font-label-sm text-[11px] text-primary flex items-center gap-1 font-semibold">
                            <span className="material-symbols-outlined text-[14px]">shield_person</span>
                            <span>Host: You</span>
                          </span>
                        ) : (
                          <span className="font-label-sm text-[11px] text-outline flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">group</span>
                            <span>{club.memberCount} Members</span>
                          </span>
                        )}
                      </div>

                      {/* Club Title & Lore */}
                      <div className="mb-space-md">
                        <h2
                          onClick={() => navigate(`/club/${club._id}`)}
                          className="font-headline-md font-garamond text-xl text-on-surface group-hover:text-primary transition-colors cursor-pointer leading-snug"
                        >
                          {club.name}
                        </h2>
                        <p className="font-body-sm text-xs text-outline mt-1 truncate">
                          Host: {club.curatorName} • {club.memberCount} Member{club.memberCount === 1 ? '' : 's'}
                        </p>
                        <p className="font-body-sm text-xs text-on-surface-variant/80 mt-1.5 line-clamp-2 leading-relaxed">
                          {club.description || 'A dedicated circle for quiet reading, chapter notes, and shared literary insights.'}
                        </p>
                      </div>

                      {/* Current Book Display Block */}
                      <div className="flex gap-space-md p-space-sm rounded-lg bg-surface-container mb-space-md border border-outline-variant/10">
                        {currentBook ? (
                          <>
                            {/* Book Cover Thumbnail with WebP optimization & spine */}
                            <BookCover
                              coverImage={currentBook.coverImage}
                              title={currentBook.title}
                              author={currentBook.author}
                              variant="thumb"
                              className="w-16 sm:w-20 h-24 sm:h-28 flex-shrink-0 shadow-md"
                            />

                            {/* Book Info & Real Progress */}
                            <div className="flex flex-col justify-center min-w-0 flex-1">
                              <span className="font-label-sm text-[10px] text-primary uppercase tracking-wider font-semibold">
                                Current Selection
                              </span>
                              <h3
                                title={currentBook.title}
                                className="font-headline-sm font-garamond text-sm sm:text-base text-on-surface truncate leading-tight mt-0.5"
                              >
                                {currentBook.title}
                              </h3>
                              <span className="font-body-sm text-xs text-outline truncate">
                                {currentBook.author || 'Unknown Author'}
                              </span>

                              {/* Progress bar */}
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 h-1.5 rounded-full bg-surface-bright overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all duration-300"
                                    style={{ width: `${Math.max(progressPct, 0)}%` }}
                                  />
                                </div>
                                <span className="font-label-sm text-[11px] text-on-surface-variant font-mono">
                                  {progressPct}%
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* No book uploaded yet placeholder */
                          <div className="w-full py-4 px-3 flex flex-col items-center justify-center text-center text-xs text-outline">
                            <span className="material-symbols-outlined text-primary/70 text-2xl mb-1">
                              menu_book
                            </span>
                            <span className="font-label-sm text-[10px] text-primary uppercase tracking-wider font-semibold">
                              No Book Selected Yet
                            </span>
                            <p className="text-[11px] text-outline mt-0.5 max-w-[220px]">
                              Enter the discussion room to upload or recommend the first book for this club.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Discourse Status */}
                      <div className="p-space-sm rounded-lg bg-surface-container/50 mb-space-md flex items-center justify-between text-xs text-outline">
                        <div className="flex items-center gap-1.5 text-on-surface-variant font-medium">
                          <span className="material-symbols-outlined text-primary text-[17px]">
                            forum
                          </span>
                          <span>
                            {club.messagesCount > 0
                              ? `${club.messagesCount} discussions active`
                              : 'Open club discussion'}
                          </span>
                        </div>
                        <span className="text-secondary font-label-sm text-[10px] uppercase tracking-wider">
                          Club Active
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-space-sm border-t border-outline-variant/15 flex flex-col gap-2 mt-auto">
                      {/* Invite Code Quick Copy Badge */}
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="text-outline text-[11px]">Invite Code:</span>
                        <button
                          onClick={(e) => handleCopyCode(club.inviteCode, e)}
                          title="Copy Club Invite Code"
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-primary font-mono text-xs tracking-wider transition-colors cursor-pointer"
                        >
                          <span>{club.inviteCode || 'N/A'}</span>
                          <span className="material-symbols-outlined text-[13px]">
                            content_copy
                          </span>
                        </button>
                      </div>

                      {/* Primary Actions Grid */}
                      <div className="grid grid-cols-2 gap-space-xs mt-1">
                        <button
                          onClick={() => navigate(`/club/${club._id}`)}
                          className="py-2 px-space-sm rounded bg-primary text-on-primary font-label-lg text-xs font-semibold flex items-center justify-center gap-1 hover:bg-secondary-fixed transition-colors shadow-sm cursor-pointer"
                        >
                          <span>Enter Room</span>
                          <span className="material-symbols-outlined text-[16px]">
                            arrow_forward
                          </span>
                        </button>

                        <button
                          onClick={() => handleLeaveClub(club._id, club.name)}
                          className="py-2 px-space-sm rounded bg-surface-container-high text-outline hover:text-error hover:bg-error/15 font-label-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title="Leave reading club"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            logout
                          </span>
                          <span>Leave</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>

      {/* ── CREATE CLUB MODAL ─────────────────────────────────── */}
      {showCreateModal && (
        <CreateClubModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchClubs();
          }}
        />
      )}

      {/* ── DISCOVER CLUBS SLIDING DRAWER ─────────────────────── */}
      <DiscoverClubsDrawer
        isOpen={showDiscoverDrawer}
        onClose={() => setShowDiscoverDrawer(false)}
        onJoinedSuccess={() => {
          fetchClubs();
        }}
        myClubs={clubs}
      />

      {/* ── GLOBAL FOOTER ─────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
