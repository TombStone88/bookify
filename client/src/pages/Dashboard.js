import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { resolveFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookCover from '../components/BookCover';

function UploadModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', author: '', description: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a PDF file');
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      data.append('file', file);
      await api.post('/api/books/upload/', data);
      toast.success('Book uploaded to your library! 📚');
      onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Upload failed. Please check the file and try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-container-high border border-primary/30 rounded-2xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">
              auto_stories
            </span>
            <h2 className="font-headline-sm font-garamond text-headline-sm text-on-surface font-semibold">
              Upload Book
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-primary transition-colors p-1"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              placeholder="e.g., The Shadow of the Wind"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-sm px-3.5 py-2.5 rounded-lg shadow-inner focus:outline-none focus:border-primary"
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
              Author
            </label>
            <input
              type="text"
              name="author"
              value={form.author}
              placeholder="e.g., Carlos Ruiz Zafón"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-sm px-3.5 py-2.5 rounded-lg shadow-inner focus:outline-none focus:border-primary"
              onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={form.description}
              placeholder="Add personal notes or volume synopsis..."
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-sm px-3.5 py-2.5 rounded-lg shadow-inner focus:outline-none focus:border-primary resize-y min-h-[70px]"
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
              PDF Document
            </label>
            <input
              type="file"
              accept="application/pdf"
              required
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-xs text-outline file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-surface-container-highest file:text-primary hover:file:bg-surface-bright cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-lg text-sm flex items-center justify-center gap-2 font-semibold transition-all shadow-md disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <span>Uploading Book...</span>
            ) : (
              <>
                <span>Upload Book</span>
                <span className="material-symbols-outlined text-base">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile: authProfile } = useAuth();

  const [books, setBooks] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'reading', 'finished'
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'title', 'author', 'progress'

  const fetchDashboardData = useCallback(async () => {
    try {
      const [booksRes, userRes, clubsRes] = await Promise.all([
        api.get('/api/books/user/books'),
        api.get('/api/users/me').catch(() => ({ data: { username: 'Reader' } })),
        api.get('/api/clubs/my-clubs').catch(() => ({ data: [] })),
      ]);
      setBooks(booksRes.data || []);
      const resolvedUsername = userRes.data?.user?.username || userRes.data?.username || 'Reader';
      setUsername(resolvedUsername);
      setClubs(clubsRes.data || []);
    } catch (err) {
      if (err.response?.status !== 401) {
        toast.error('Failed to load shelf records');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const deleteBook = async (id, title) => {
    if (!window.confirm(`Remove "${title || 'this book'}" from your library?`)) {
      return;
    }
    try {
      await api.delete(`/api/books/delete/${id}`);
      toast.success('Book removed from library');
      setBooks((p) => p.filter((b) => b._id !== id));
    } catch {
      toast.error('Failed to remove book');
    }
  };

  const handleOpenReader = (book) => {
    const url = `/viewer?file=${encodeURIComponent(
      resolveFileUrl(book.fileUrl)
    )}&bookId=${book._id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Real Database Metrics
  const currentlyReadingBooks = useMemo(
    () => books.filter((b) => b.progress > 0 && b.progress < 100),
    [books]
  );
  const completedBooks = useMemo(
    () => books.filter((b) => b.progress >= 100),
    [books]
  );

  const avgProgress = useMemo(() => {
    if (!books.length) return 0;
    const total = books.reduce((acc, b) => acc + (b.progress || 0), 0);
    return Math.round(total / books.length);
  }, [books]);

  // Filtered & Sorted Books for Main Shelf
  const filteredBooks = useMemo(() => {
    let list = books;
    if (activeFilter === 'reading') {
      list = currentlyReadingBooks;
    } else if (activeFilter === 'finished') {
      list = completedBooks;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sortBy === 'title') {
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'author') {
      sorted.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    } else if (sortBy === 'progress') {
      sorted.sort((a, b) => (b.progress || 0) - (a.progress || 0));
    } else {
      // 'recent'
      sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return sorted;
  }, [books, activeFilter, currentlyReadingBooks, completedBooks, searchQuery, sortBy]);

  // Recently Added (Real Data)
  const recentlyAddedBooks = useMemo(() => {
    return books
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 4);
  }, [books]);

  // Time-of-day Greeting
  const hour = new Date().getHours();
  const sessionTag =
    hour < 12
      ? 'Morning Session'
      : hour < 17
      ? 'Afternoon Session'
      : 'Evening Session';
  const greeting =
    hour < 12
      ? 'Good morning'
      : hour < 17
      ? 'Good afternoon'
      : 'Good evening';

  const greetingName = authProfile?.username || username || 'Reader';

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col antialiased selection:bg-primary selection:text-on-primary">
      {/* ── TOP FIXED NAVBAR ──────────────────────────────────── */}
      <Navbar
        activePage="bookshelf"
        showSearch={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search your books and authors…"
      >
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1 bg-primary text-on-primary font-label-sm text-xs font-semibold px-3 py-1.5 rounded-lg shadow hover:bg-secondary transition-all cursor-pointer"
          title="Upload a new book"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="hidden sm:inline">Upload Book</span>
        </button>
      </Navbar>

      {/* ── MAIN LOGGED-IN CONTENT ───────────────────────────── */}
      <main className="w-full pt-20 flex-1 bg-surface">
        <div className="relative w-full overflow-hidden px-gutter-mobile md:px-gutter lg:px-margin pb-space-xl">
          {/* Ambient Lighting Gradients */}
          <div className="pointer-events-none absolute -top-24 left-1/4 w-[36rem] h-[36rem] rounded-full bg-primary/5 blur-[120px] -z-10" />
          <div className="pointer-events-none absolute top-96 -right-20 w-[30rem] h-[30rem] rounded-full bg-secondary-container/10 blur-[140px] -z-10" />

          {/* ── SECTION 1: WELCOME & METRICS RIBBON ────────────── */}
          <section className="pt-space-lg pb-space-lg flex flex-col gap-space-lg">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-space-md">
              <div className="flex flex-col gap-1 max-w-3xl">
                <div className="flex items-center gap-space-sm">
                  <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Personal Bookshelf
                  </span>
                  <span className="text-outline text-label-sm font-label-sm font-light">
                    {sessionTag}
                  </span>
                </div>

                <h1 className="font-headline-lg font-garamond text-headline-lg md:text-3xl lg:text-4xl text-on-surface tracking-tight mt-1">
                  {greeting},{' '}
                  <span className="italic text-primary font-serif">
                    {greetingName}
                  </span>
                  .
                </h1>

                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {currentlyReadingBooks.length > 0 ? (
                    <>
                      You currently have{' '}
                      <span className="text-secondary font-medium">
                        {currentlyReadingBooks.length} book
                        {currentlyReadingBooks.length === 1 ? '' : 's'}
                      </span>{' '}
                      open on your reading table. Continue where you left off or upload a new book.
                    </>
                  ) : books.length > 0 ? (
                    <>
                      Your library contains{' '}
                      <span className="text-secondary font-medium">
                        {books.length} archived book{books.length === 1 ? '' : 's'}
                      </span>
                      . Select a book below to resume reading.
                    </>
                  ) : (
                    <>
                      Your library is waiting for its first book. Upload a PDF book below to begin your journey.
                    </>
                  )}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-space-sm">
                <button
                  onClick={() => setShowModal(true)}
                  className="group relative inline-flex items-center gap-space-xs bg-primary text-on-primary font-label-lg text-label-lg px-space-lg py-2.5 rounded-lg shadow-md hover:bg-secondary transition-all cursor-pointer font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:rotate-90">
                    add
                  </span>
                  <span>Upload Book</span>
                </button>
                <button
                  onClick={() => navigate('/clubs')}
                  className="inline-flex items-center gap-space-xs bg-surface-container-high border border-outline-variant/30 text-primary font-label-lg text-label-lg px-space-lg py-2.5 rounded-lg shadow-sm hover:bg-surface-container-highest transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    groups
                  </span>
                  <span>Explore Clubs</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Ribbon (100% Real Database Signals) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm pt-space-xs">
              {/* In Progress */}
              <div className="bg-surface-container-low border border-outline-variant/20 p-space-md rounded-xl flex flex-col gap-1 shadow-sm hover:bg-surface-container transition-colors">
                <div className="flex items-center justify-between text-outline">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-[11px]">
                    In Progress
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    auto_stories
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg font-garamond text-2xl lg:text-3xl text-on-surface">
                    {currentlyReadingBooks.length}
                  </span>
                  <span className="text-body-sm text-outline text-xs">
                    book{currentlyReadingBooks.length === 1 ? '' : 's'} active
                  </span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        books.length
                          ? Math.round(
                              (currentlyReadingBooks.length / books.length) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Completed */}
              <div className="bg-surface-container-low border border-outline-variant/20 p-space-md rounded-xl flex flex-col gap-1 shadow-sm hover:bg-surface-container transition-colors">
                <div className="flex items-center justify-between text-outline">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-[11px]">
                    Completed
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    workspace_premium
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg font-garamond text-2xl lg:text-3xl text-on-surface">
                    {completedBooks.length}
                  </span>
                  <span className="text-body-sm text-outline text-xs">
                    finished
                  </span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-secondary h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        books.length
                          ? Math.round(
                              (completedBooks.length / books.length) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Total Library */}
              <div className="bg-surface-container-low border border-outline-variant/20 p-space-md rounded-xl flex flex-col gap-1 shadow-sm hover:bg-surface-container transition-colors">
                <div className="flex items-center justify-between text-outline">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-[11px]">
                    Total Collection
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-tertiary">
                    library_books
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg font-garamond text-2xl lg:text-3xl text-on-surface">
                    {books.length}
                  </span>
                  <span className="text-body-sm text-outline text-xs">
                    book{books.length === 1 ? '' : 's'} archived
                  </span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-2">
                  <div className="bg-tertiary h-full w-full rounded-full" />
                </div>
              </div>

              {/* Average Progress */}
              <div className="bg-surface-container-low border border-outline-variant/20 p-space-md rounded-xl flex flex-col gap-1 shadow-sm hover:bg-surface-container transition-colors">
                <div className="flex items-center justify-between text-outline">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-[11px]">
                    Average Progress
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-primary-fixed-dim">
                    speed
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg font-garamond text-2xl lg:text-3xl text-primary">
                    {avgProgress}%
                  </span>
                  <span className="text-body-sm text-on-surface-variant font-medium text-xs">
                    across shelf
                  </span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${avgProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 2: PERSONAL BOOKSHELF SHOWCASE ─────────── */}
          <section className="flex flex-col gap-space-md mb-space-xl">
            {/* Shelf Filter Header */}
            <div className="flex flex-col gap-3 pb-space-xs border-b border-outline-variant/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <h2 className="font-headline-md font-garamond text-headline-md text-on-surface tracking-tight">
                    Personal Bookshelf
                  </h2>
                  <span className="text-outline text-label-sm font-label-sm font-mono bg-surface-container px-2 py-0.5 rounded text-[10px]">
                    CATALOGUE {books.length} BOOKS
                  </span>
                  {searchQuery && (
                    <span className="text-primary text-label-sm font-label-sm font-mono bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-[10px]">
                      {filteredBooks.length} MATCH{filteredBooks.length === 1 ? '' : 'ES'}
                    </span>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="inline-flex p-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl self-start sm:self-auto shadow-inner">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1 rounded-lg font-label-sm text-xs transition-all cursor-pointer ${
                      activeFilter === 'all'
                        ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    All Books ({books.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('reading')}
                    className={`px-3 py-1 rounded-lg font-label-sm text-xs transition-all cursor-pointer ${
                      activeFilter === 'reading'
                        ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    Currently Reading ({currentlyReadingBooks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('finished')}
                    className={`px-3 py-1 rounded-lg font-label-sm text-xs transition-all cursor-pointer ${
                      activeFilter === 'finished'
                        ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    Finished ({completedBooks.length})
                  </button>
                </div>
              </div>

              {/* Bookshelf Search & Sort Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                {/* Instant Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search bookshelf by title or author…"
                    className="w-full bg-surface-container-low border border-outline-variant/30 pl-9 pr-9 py-2 rounded-xl text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors p-1 rounded-lg cursor-pointer flex items-center justify-center"
                      title="Clear search"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                {/* Sort Control */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <span className="text-outline font-label-sm text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">sort</span>
                    <span className="hidden sm:inline">Sort:</span>
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs font-label-sm py-1.5 px-2.5 rounded-lg focus:outline-none focus:border-primary cursor-pointer shadow-xs"
                  >
                    <option value="recent">Recently Added</option>
                    <option value="title">Title (A–Z)</option>
                    <option value="author">Author (A–Z)</option>
                    <option value="progress">Reading Progress</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bookshelf Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md py-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-5 h-64 animate-pulse flex flex-col justify-between"
                  >
                    <div className="flex gap-4">
                      <div className="w-28 h-40 bg-surface-container-highest rounded-lg" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-surface-container-highest rounded w-3/4" />
                        <div className="h-3 bg-surface-container-highest rounded w-1/2" />
                        <div className="h-2 bg-surface-container-highest rounded w-full mt-6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-10 text-center flex flex-col items-center justify-center my-4">
                <span className="material-symbols-outlined text-primary text-4xl mb-2">
                  {searchQuery ? 'search_off' : 'menu_book'}
                </span>
                <h3 className="font-headline-sm font-garamond text-lg text-on-surface mb-1">
                  {searchQuery
                    ? `No books found matching "${searchQuery}"`
                    : activeFilter === 'reading'
                    ? 'No books currently marked In Progress'
                    : activeFilter === 'finished'
                    ? 'No completed books yet'
                    : 'Your personal bookshelf is currently empty'}
                </h3>
                <p className="font-body-sm text-on-surface-variant text-xs max-w-sm mb-4">
                  {searchQuery
                    ? 'No volumes in your personal collection match this title or author query.'
                    : 'Upload a PDF book to begin reading and recording progress in your personal library.'}
                </p>
                <div className="flex items-center gap-2">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="inline-flex items-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-primary border border-primary/30 font-label-sm text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      <span>Clear Search</span>
                    </button>
                  ) : null}
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 bg-primary text-on-primary font-label-sm text-xs font-semibold px-4 py-2 rounded-lg hover:bg-secondary transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Upload Book</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
                {filteredBooks.map((book) => {
                  const progressPct = book.progress || 0;
                  const isFinished = progressPct >= 100;
                  const isInProgress = progressPct > 0 && progressPct < 100;

                  return (
                    <div
                      key={book._id}
                      className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-space-md lg:p-space-lg flex flex-col justify-between gap-space-md shadow-md relative group transition-all duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,0.45)] hover:border-primary/30"
                    >
                      <div className="flex gap-space-md">
                        {/* Book Cover Token with optimized thumbnail & shimmer placeholder */}
                        <BookCover
                          coverImage={book.coverImage}
                          title={book.title}
                          author={book.author}
                          variant="card"
                          className="w-24 sm:w-28 shadow-xl"
                          imgClassName="transition-transform duration-500 group-hover:scale-105"
                          badge={
                            <div
                              className={`px-1.5 py-0.5 rounded text-[9px] font-label-sm uppercase tracking-wider font-semibold backdrop-blur-md ${
                                isFinished
                                  ? 'bg-secondary-container/90 text-on-secondary-container'
                                  : isInProgress
                                  ? 'bg-primary-container/90 text-on-primary-container'
                                  : 'bg-surface-container-highest/90 text-outline'
                              }`}
                            >
                              {isFinished
                                ? 'Finished'
                                : isInProgress
                                ? 'Reading'
                                : 'Unread'}
                            </div>
                          }
                        />

                        {/* Volume Metadata */}
                        <div className="flex flex-col justify-between min-w-0 flex-1">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-label-sm text-[10px] text-secondary tracking-widest uppercase">
                              {isInProgress
                                ? 'Active Reading'
                                : isFinished
                                ? 'Completed'
                                : 'Personal Book'}
                            </span>
                            <h3
                              title={book.title}
                              className="font-headline-sm font-garamond text-headline-sm text-on-surface tracking-tight truncate group-hover:text-primary transition-colors"
                            >
                              {book.title}
                            </h3>
                            <p className="font-body-sm text-body-sm text-outline italic truncate text-xs">
                              {book.author || 'Unknown Author'}
                            </p>
                          </div>

                          {/* Pace & Real Progress Bar */}
                          <div className="flex flex-col gap-1 mt-2">
                            <div className="flex items-center justify-between text-body-sm font-body-sm text-xs">
                              <span className="text-on-surface-variant font-medium">
                                Progress
                              </span>
                              <span className="text-primary font-semibold font-mono">
                                {progressPct}%
                              </span>
                            </div>
                            <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-primary-container to-primary h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(progressPct, 0)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Row */}
                      <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/15">
                        <button
                          onClick={() => handleOpenReader(book)}
                          className="flex-1 bg-primary text-on-primary font-label-sm text-xs py-2 rounded-lg text-center font-semibold hover:bg-secondary transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">
                            menu_book
                          </span>
                          <span>
                            {progressPct > 0 ? 'Continue Reading' : 'Start Reading'}
                          </span>
                        </button>
                        <button
                          onClick={() => deleteBook(book._id, book.title)}
                          title="Remove from Shelf"
                          className="p-2 bg-surface-container hover:bg-error/20 hover:text-error text-outline rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Wooden Shelf Tonal Shadow Strip */}
            <div className="w-full h-2 rounded-full bg-gradient-to-r from-transparent via-surface-container-highest/60 to-transparent mt-2" />
          </section>

          {/* ── SECTION 3: RECENTLY ADDED BOOKS ─ */}
          {recentlyAddedBooks.length > 0 && (
            <section className="flex flex-col gap-space-md mb-space-xl">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                <div className="flex items-center gap-space-sm">
                  <h2 className="font-headline-md font-garamond text-headline-md text-on-surface tracking-tight">
                    Recently Added Books
                  </h2>
                  <span className="text-outline text-label-sm font-label-sm font-mono bg-surface-container px-2 py-0.5 rounded text-[10px]">
                    LATEST ADDITIONS
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm sm:gap-space-md">
                {recentlyAddedBooks.map((book) => (
                  <div
                    key={book._id}
                    onClick={() => handleOpenReader(book)}
                    className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 flex flex-col justify-between group hover:border-primary/40 hover:bg-surface-container transition-all cursor-pointer shadow-sm"
                  >
                    <BookCover
                      coverImage={book.coverImage}
                      title={book.title}
                      author={book.author}
                      variant="card"
                      className="w-full mb-2"
                      imgClassName="transition-transform duration-300 group-hover:scale-105"
                    />
                    <div>
                      <h4 className="font-headline-sm font-garamond text-sm text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                        {book.title}
                      </h4>
                      <p className="font-body-sm text-xs text-outline italic truncate">
                        {book.author || 'Unknown'}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-secondary mt-1 font-label-sm">
                        <span>{book.progress || 0}% read</span>
                        <span className="material-symbols-outlined text-xs">
                          arrow_forward
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── SECTION 4: SPLIT PANEL BENTO (Guilds & Quick Actions) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            {/* Connected Clubs Column (5 Cols) */}
            <section className="lg:col-span-5 flex flex-col gap-space-md">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                <div className="flex items-center gap-space-sm">
                  <h2 className="font-headline-md font-garamond text-headline-md text-on-surface tracking-tight">
                    Your Reading Circles
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <button
                  onClick={() => navigate('/clubs')}
                  className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary hover:text-secondary transition-colors text-xs"
                >
                  Explore All Clubs{' '}
                  <span className="material-symbols-outlined text-[15px]">
                    arrow_forward
                  </span>
                </button>
              </div>

              <div className="flex flex-col gap-space-sm">
                {clubs.length === 0 ? (
                  <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-5 text-center flex flex-col items-center">
                    <span className="material-symbols-outlined text-primary text-3xl mb-1">
                      groups
                    </span>
                    <h4 className="font-headline-sm font-garamond text-base text-on-surface">
                      No Reading Circles Joined Yet
                    </h4>
                    <p className="font-body-sm text-on-surface-variant text-xs mt-1 mb-3">
                      Join an active club or create your own book club with chapter milestones.
                    </p>
                    <button
                      onClick={() => navigate('/clubs')}
                      className="px-3.5 py-1.5 rounded-lg bg-surface-container-high border border-primary/30 text-primary hover:bg-primary hover:text-on-primary font-label-sm text-xs font-semibold transition-all"
                    >
                      Browse Clubs
                    </button>
                  </div>
                ) : (
                  clubs.map((club) => (
                    <div
                      key={club._id}
                      onClick={() => navigate(`/club/${club._id}`)}
                      className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-space-md flex flex-col gap-space-xs shadow-sm hover:bg-surface-container hover:border-primary/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary/20 flex items-center justify-center text-primary font-serif font-bold text-sm">
                            {club.name ? club.name.slice(0, 2).toUpperCase() : 'BC'}
                          </div>
                          <div className="flex flex-col">
                            <h3 className="font-headline-sm font-garamond text-base text-on-surface group-hover:text-primary transition-colors">
                              {club.name}
                            </h3>
                            <span className="font-body-sm text-outline text-xs">
                              {club.members?.length || 1} reader
                              {club.members?.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container/50 text-on-secondary-container font-label-sm text-[10px] uppercase tracking-wider">
                          Active Circle
                        </span>
                      </div>
                      {club.description && (
                        <p className="font-body-sm text-on-surface-variant text-xs line-clamp-2 mt-1">
                          {club.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Quick Actions & Literary Notes (7 Cols) */}
            <section className="lg:col-span-7 flex flex-col gap-space-md">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                <div className="flex items-center gap-space-sm">
                  <h2 className="font-headline-md font-garamond text-headline-md text-on-surface tracking-tight">
                    Sanctuary Dispatches
                  </h2>
                  <span className="text-outline text-label-sm font-label-sm font-mono bg-surface-container px-2 py-0.5 rounded text-[10px]">
                    READING NOTES
                  </span>
                </div>
              </div>

              <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <blockquote className="font-headline-sm font-garamond italic text-on-surface-variant pl-space-md border-l-2 border-primary text-base leading-relaxed">
                  “Every book, every volume you see here, has a soul. The soul of the person who wrote it and of those who read it and lived and dreamed with it.”
                </blockquote>
                <p className="font-body-sm text-outline text-xs pl-space-md -mt-2">
                  — Carlos Ruiz Zafón, <span className="italic">The Shadow of the Wind</span>
                </p>

                {/* Quick Action Navigation Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-2">
                  <button
                    onClick={() => setShowModal(true)}
                    className="p-3 bg-surface-container border border-outline-variant/25 rounded-lg text-left hover:border-primary/40 hover:bg-surface-container-high transition-all group"
                  >
                    <span className="material-symbols-outlined text-primary text-xl mb-1">
                      upload_file
                    </span>
                    <h4 className="font-label-lg text-on-surface text-xs font-semibold group-hover:text-primary transition-colors">
                      Upload Book
                    </h4>
                    <p className="font-body-sm text-outline text-[11px] mt-0.5">
                      Upload and catalog a PDF
                    </p>
                  </button>

                  <button
                    onClick={() => navigate('/clubs')}
                    className="p-3 bg-surface-container border border-outline-variant/25 rounded-lg text-left hover:border-primary/40 hover:bg-surface-container-high transition-all group"
                  >
                    <span className="material-symbols-outlined text-secondary text-xl mb-1">
                      forum
                    </span>
                    <h4 className="font-label-lg text-on-surface text-xs font-semibold group-hover:text-secondary transition-colors">
                      Book Clubs
                    </h4>
                    <p className="font-body-sm text-outline text-[11px] mt-0.5">
                      Live club discussions
                    </p>
                  </button>

                  <button
                    onClick={() => navigate('/profile')}
                    className="p-3 bg-surface-container border border-outline-variant/25 rounded-lg text-left hover:border-primary/40 hover:bg-surface-container-high transition-all group"
                  >
                    <span className="material-symbols-outlined text-tertiary text-xl mb-1">
                      manage_accounts
                    </span>
                    <h4 className="font-label-lg text-on-surface text-xs font-semibold group-hover:text-tertiary transition-colors">
                      Account Settings
                    </h4>
                    <p className="font-body-sm text-outline text-[11px] mt-0.5">
                      Account &amp; preferences
                    </p>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ── GLOBAL FOOTER ─────────────────────────────────────── */}
      <Footer />

      {/* Upload Modal */}
      {showModal && (
        <UploadModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
