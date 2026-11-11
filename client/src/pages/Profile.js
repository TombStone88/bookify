import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { resolveFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookCover from '../components/BookCover';
import UserAvatar from '../components/UserAvatar';

// ── AVAILABLE GENRES & INTERESTS FOR PREFERENCES ────────────
const DEFAULT_GENRES = [
  'Gothic Realism',
  'Speculative & Sci-Fi',
  'Classical Philosophy',
  'Historical Fiction',
  'Victorian Literature',
  'Mystery & Detective',
  'Poetry & Anthologies',
  'Mythology & Folklore',
  'Literary Criticism',
  'Memoir & Biography',
];

const DEFAULT_INTERESTS = [
  'First Editions',
  'Classics',
  'Book Club Discussions',
  'Annotations & Notes',
  'Historical Fiction',
  'Literary Fiction',
  'Philosophy',
  'Book Design & Typography',
];

// ── EDIT PROFILE MODAL ───────────────────────────────────────
function EditProfileModal({ user, onClose, onUpdate }) {
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      return toast.error('Username cannot be empty');
    }
    setSaving(true);
    try {
      const res = await api.put('/api/users/profile', {
        username: username.trim(),
        bio: bio.trim(),
      });
      toast.success('Profile updated successfully! 📜');
      onUpdate(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
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
              <span className="material-symbols-outlined text-[20px]">edit_note</span>
            </div>
            <div>
              <h2 className="font-headline-sm font-garamond text-xl text-on-surface font-semibold">
                Edit Profile
              </h2>
              <p className="font-body-sm text-xs text-outline">
                Update your bio and reader identity.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface-container cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={30}
                required
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface pl-8 pr-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:border-primary shadow-inner"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                Reader Bio
              </label>
              <span className="text-[11px] text-outline">{bio.length} / 500</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Share your literary passions, favourite genres, or reading goals..."
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 p-3.5 rounded-lg text-sm focus:outline-none focus:border-primary shadow-inner resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !username.trim()}
              className="px-5 py-2.5 bg-primary text-on-primary font-label-lg text-sm font-semibold rounded-lg shadow hover:bg-secondary transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {saving ? 'hourglass_empty' : 'check'}
              </span>
              <span>{saving ? 'Saving…' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── FORMAT DATE HELPER ──────────────────────────────────────
function formatMemberDate(dateStr) {
  if (!dateStr) return 'Member since Autumn 2024';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Member since Autumn 2024';
    const month = d.toLocaleString('default', { month: 'long' });
    const year = d.getFullYear();
    return `Member since ${month} ${year}`;
  } catch {
    return 'Member since Autumn 2024';
  }
}

// ── MAIN PROFILE PAGE COMPONENT ─────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { username: routeUsername } = useParams();
  const { user: authUser, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Active section tab: 'profile' | 'activity' | 'preferences' | 'privacy'
  const [activeTab, setActiveTab] = useState('profile');

  // Modals & UI states
  const [showEditModal, setShowEditModal] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Preference Form state
  const [prefGenres, setPrefGenres] = useState([]);
  const [prefInterests, setPrefInterests] = useState([]);
  const [customGenre, setCustomGenre] = useState('');
  const [customInterest, setCustomInterest] = useState('');
  const [prefFavoriteBookIds, setPrefFavoriteBookIds] = useState([]);
  const [prefShowCurrentlyReading, setPrefShowCurrentlyReading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Privacy Settings Form state
  const [privacyState, setPrivacyState] = useState({
    isPublic: true,
    showReadingActivity: true,
    showCurrentlyReading: true,
    showFavoriteBooks: true,
    showClubs: true,
  });
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // User's own books for preferences selection
  const [myUploadedBooks, setMyUploadedBooks] = useState([]);

  // Fetch Profile Data
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      if (routeUsername) {
        // Fetch public profile by username parameter
        const res = await api.get(`/api/users/public/${encodeURIComponent(routeUsername)}`);
        if (res.data.isPrivate) {
          setIsPrivate(true);
          setIsOwner(false);
          setProfileData(res.data);
        } else {
          setIsPrivate(false);
          setIsOwner(res.data.isOwner || false);
          setProfileData(res.data);
          if (res.data.user?.privacy) {
            setPrivacyState(res.data.user.privacy);
          }
          if (res.data.user?.favoriteGenres) setPrefGenres(res.data.user.favoriteGenres);
          if (res.data.user?.readingInterests) setPrefInterests(res.data.user.readingInterests);
          if (res.data.favoriteBooks) {
            setPrefFavoriteBookIds(res.data.favoriteBooks.map((b) => (typeof b === 'object' ? b._id : b)));
          }
        }
      } else {
        // Authenticated user's own profile (/profile)
        const [meRes, booksRes] = await Promise.all([
          api.get('/api/users/me'),
          api.get('/api/books/user/books').catch(() => ({ data: [] })),
        ]);

        const me = meRes.data;
        setIsPrivate(false);
        setIsOwner(true);
        setProfileData({
          user: me.user,
          stats: me.stats,
          currentlyReading: me.currentlyReading,
          activity: me.activity,
          clubs: me.clubs,
          favoriteBooks: me.user.favoriteBooks || [],
        });

        if (me.user.privacy) {
          setPrivacyState(me.user.privacy);
          setPrefShowCurrentlyReading(me.user.privacy.showCurrentlyReading !== false);
        }
        if (me.user.favoriteGenres) setPrefGenres(me.user.favoriteGenres);
        if (me.user.readingInterests) setPrefInterests(me.user.readingInterests);
        if (me.user.favoriteBooks) {
          setPrefFavoriteBookIds(me.user.favoriteBooks.map((b) => (typeof b === 'object' ? b._id : b)));
        }
        setMyUploadedBooks(booksRes.data || []);
      }
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [routeUsername]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Handle Profile Photo Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/api/users/upload-profile', formData);
      toast.success('Profile image updated! 📸');
      setProfileData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          profileImage: res.data.profileImage,
        },
      }));
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Share Profile Link
  const handleShareProfile = () => {
    const username = profileData?.user?.username || routeUsername;
    if (!username) return;
    const url = `${window.location.origin}/profile/${encodeURIComponent(username)}`;
    navigator.clipboard.writeText(url);
    toast.success('Public profile link copied to clipboard! 📋');
  };
  const handleShareCodex = handleShareProfile;

  // Handle Toggle Genre Tag
  const toggleGenre = (genre) => {
    setPrefGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  // Handle Add Custom Genre
  const addCustomGenre = (e) => {
    e.preventDefault();
    const g = customGenre.trim();
    if (!g) return;
    if (!prefGenres.includes(g)) {
      setPrefGenres((prev) => [...prev, g]);
    }
    setCustomGenre('');
  };

  // Handle Toggle Interest Tag
  const toggleInterest = (interest) => {
    setPrefInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  // Handle Add Custom Interest
  const addCustomInterest = (e) => {
    e.preventDefault();
    const item = customInterest.trim();
    if (!item) return;
    if (!prefInterests.includes(item)) {
      setPrefInterests((prev) => [...prev, item]);
    }
    setCustomInterest('');
  };

  // Handle Toggle Favorite Book
  const toggleFavoriteBook = (bookId) => {
    setPrefFavoriteBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  // Save Preferences
  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await Promise.all([
        api.put('/api/users/profile', {
          favoriteGenres: prefGenres,
          readingInterests: prefInterests,
          favoriteBooks: prefFavoriteBookIds,
        }),
        api.put('/api/users/privacy', {
          showCurrentlyReading: prefShowCurrentlyReading,
        }),
      ]);
      toast.success('Reading preferences saved! ✨');
      loadProfile();
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Save Privacy Settings
  const handleSavePrivacy = async (updatedSettings) => {
    setSavingPrivacy(true);
    try {
      const res = await api.put('/api/users/privacy', updatedSettings || privacyState);
      setPrivacyState(res.data.privacy);
      toast.success('Privacy settings updated! 🛡');
      loadProfile();
    } catch {
      toast.error('Failed to update privacy settings');
    } finally {
      setSavingPrivacy(false);
    }
  };

  // Toggle individual privacy setting
  const togglePrivacyField = (field) => {
    const updated = {
      ...privacyState,
      [field]: !privacyState[field],
    };
    setPrivacyState(updated);
    handleSavePrivacy(updated);
  };

  const currentUser = profileData?.user;
  const stats = profileData?.stats || {
    totalBooks: 0,
    completedBooks: 0,
    inProgressBooks: 0,
    activeClubs: 0,
  };
  const currentlyReading = profileData?.currentlyReading;
  const activity = profileData?.activity;
  const clubs = profileData?.clubs || [];
  const favoriteBooks = profileData?.favoriteBooks || [];

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col antialiased selection:bg-primary selection:text-on-primary">
      {/* ── GLOBAL NAVBAR ───────────────────────────────────── */}
      <Navbar
        activePage="profile"
        pageActions={
          <button
            onClick={handleShareProfile}
            className="inline-flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-sm text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary/20 transition-all cursor-pointer"
            title="Copy Public Profile Link"
          >
            <span className="material-symbols-outlined text-sm">share</span>
            <span className="hidden sm:inline">Share Profile</span>
          </button>
        }
      />

      {/* ── MAIN CONTENT AREA ─────────────────────────────────── */}
      <main className="w-full pt-20 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="font-headline-sm font-garamond text-lg text-outline">
              Loading profile…
            </p>
          </div>
        ) : isPrivate ? (
          /* ── PRIVATE PROFILE SHIELD ── */
          <div className="max-w-2xl mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shadow-2xl">
              <span className="material-symbols-outlined text-4xl">lock</span>
            </div>
            <h1 className="font-headline-lg font-garamond text-3xl text-on-surface font-semibold tracking-tight">
              Private Profile
            </h1>
            <p className="font-body-md text-on-surface-variant max-w-md leading-relaxed">
              The reading records and bookshelf of{' '}
              <strong className="text-primary font-semibold">@{currentUser?.username}</strong> have
              been set to private.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-6 py-2.5 bg-surface-container-high border border-primary/25 text-primary hover:bg-surface-container-highest font-label-lg text-sm rounded-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Return to Bookshelf</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col w-full">
            {/* ── 1. TOP PROFILE HERO / HEADER FOLIAGE ── */}
            <section className="relative w-full bg-surface-container-lowest px-4 sm:px-6 lg:px-12 py-10 overflow-hidden border-b border-outline-variant/20 shadow-xl">
              {/* Atmospheric Background Blooms */}
              <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
              <div className="absolute top-1/2 right-0 w-[30rem] h-[30rem] rounded-full bg-secondary-container/20 blur-[120px] pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(#d4a373_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

              <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-start justify-between gap-8">
                {/* Avatar + Identity details */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
                  {/* Avatar Frame with Halo & Upload trigger */}
                  <div className="relative group flex-shrink-0">
                    <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-full p-1 bg-gradient-to-tr from-secondary-container via-primary-container to-secondary shadow-[0_0_24px_rgba(212,163,115,0.25)] flex items-center justify-center transition-transform group-hover:scale-[1.02]">
                      <div className="w-full h-full rounded-full overflow-hidden bg-surface-container-high relative flex items-center justify-center">
                        <UserAvatar
                          profileImage={currentUser?.profileImage}
                          username={currentUser?.username}
                          size="xl"
                          className="w-full h-full"
                        />

                        {/* Owner Photo Upload Overlay */}
                        {isOwner && (
                          <label className="absolute inset-0 bg-surface-container-lowest/70 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-primary">
                            <span className="material-symbols-outlined text-2xl">
                              {uploadingImage ? 'hourglass_empty' : 'photo_camera'}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                              {uploadingImage ? 'Uploading…' : 'Change'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingImage}
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Online Beacon */}
                    <span
                      className="absolute bottom-1 right-2 w-5 h-5 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-md"
                      title="Online"
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-primary animate-pulse" />
                    </span>
                    <span
                      className="material-symbols-outlined absolute -top-1 -right-1 text-primary text-[20px] bg-surface-container-low p-1 rounded-full shadow-sm"
                      title="Bookify Reader"
                    >
                      auto_stories
                    </span>
                  </div>

                  {/* Name, Bio & Meta */}
                  <div className="flex flex-col gap-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="font-headline-lg font-garamond text-2xl sm:text-3xl text-on-surface tracking-tight font-semibold">
                        {currentUser?.username || 'Reader'}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-[11px] uppercase tracking-wider shadow-sm font-semibold">
                        Reader • Book Club Member
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant text-xs">
                      <span className="text-primary font-semibold">@{currentUser?.username}</span>
                      <span className="text-outline">•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">
                          calendar_month
                        </span>
                        <span>{formatMemberDate(currentUser?.createdAt)}</span>
                      </span>
                      <span className="text-outline">•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-tertiary">
                          library_books
                        </span>
                        <span>{stats.totalBooks} Books Logged</span>
                      </span>
                    </div>

                    <p className="font-body-md text-sm text-on-surface-variant mt-1.5 leading-relaxed max-w-xl italic">
                      {currentUser?.bio ? (
                        `"${currentUser.bio}"`
                      ) : isOwner ? (
                        <span className="not-italic text-outline">
                          No personal bio added yet. Click "Edit Profile" below to add your reading interests.
                        </span>
                      ) : (
                        <span className="not-italic text-outline">
                          A reader and book club member at Bookify.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Action Cluster */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto lg:self-start pt-2">
                  {isOwner && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-4 py-2 bg-primary text-on-primary font-label-lg text-xs font-semibold rounded-lg shadow-[0_4px_16px_rgba(242,190,140,0.2)] hover:bg-secondary transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit_note</span>
                      <span>Edit Profile</span>
                    </button>
                  )}

                  <button
                    onClick={handleShareProfile}
                    className="px-4 py-2 bg-surface-container-high text-on-surface font-label-lg text-xs font-semibold rounded-lg border border-outline-variant/30 hover:bg-surface-container-highest transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">share</span>
                    <span>Share Profile</span>
                  </button>

                  {isOwner && (
                    <button
                      onClick={() => setActiveTab('privacy')}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        activeTab === 'privacy'
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:text-on-surface hover:bg-surface-container-highest'
                      }`}
                      title="Privacy Settings"
                    >
                      <span className="material-symbols-outlined text-[20px]">security</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Profile Metrics Ribbon (Real Data) */}
              <div className="relative z-10 max-w-7xl mx-auto mt-8 pt-6 border-t border-outline-variant/15 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Books Added */}
                <div className="bg-surface-container-low/90 backdrop-blur-md p-4 rounded-xl border border-outline-variant/20 shadow-md flex flex-col justify-between">
                  <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold">
                    Books Added
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-headline-lg font-garamond text-2xl text-primary font-bold">
                      {stats.totalBooks}
                    </span>
                    <span className="text-xs text-outline">books</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1 rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{
                        width: stats.totalBooks > 0 ? `${Math.min(100, stats.totalBooks * 10)}%` : '0%',
                      }}
                    />
                  </div>
                </div>

                {/* 2. Completed Books */}
                <div className="bg-surface-container-low/90 backdrop-blur-md p-4 rounded-xl border border-outline-variant/20 shadow-md flex flex-col justify-between">
                  <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold">
                    Completed Books
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-headline-lg font-garamond text-2xl text-secondary font-bold">
                      {stats.completedBooks}
                    </span>
                    <span className="text-xs text-outline">
                      {stats.totalBooks > 0
                        ? `(${Math.round((stats.completedBooks / stats.totalBooks) * 100)}%)`
                        : ''}
                    </span>
                  </div>
                  <span className="font-label-sm text-[11px] text-tertiary mt-2.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    <span>Completed</span>
                  </span>
                </div>

                {/* 3. In Active Reading */}
                <div className="bg-surface-container-low/90 backdrop-blur-md p-4 rounded-xl border border-outline-variant/20 shadow-md flex flex-col justify-between">
                  <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold">
                    Currently Reading
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-headline-lg font-garamond text-2xl text-primary font-bold">
                      {stats.inProgressBooks}
                    </span>
                    <span className="text-xs text-outline">in progress</span>
                  </div>
                  <span className="font-label-sm text-[11px] text-secondary mt-2.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
                    <span>In Progress</span>
                  </span>
                </div>

                {/* 4. Book Clubs */}
                <div className="bg-surface-container-low/90 backdrop-blur-md p-4 rounded-xl border border-outline-variant/20 shadow-md flex flex-col justify-between">
                  <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold">
                    Book Clubs
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-headline-lg font-garamond text-2xl text-on-surface font-bold">
                      {stats.activeClubs}
                    </span>
                    <span className="text-xs text-outline">clubs</span>
                  </div>
                  <span className="font-label-sm text-[11px] text-primary mt-2.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">groups</span>
                    <span>Club Member</span>
                  </span>
                </div>
              </div>
            </section>

            {/* ── 2. SUB-NAVIGATION BAR (4 SECTIONS) ── */}
            <div className="w-full bg-surface-container-lowest border-b border-outline-variant/20 px-4 sm:px-6 lg:px-12 sticky top-20 z-30 shadow-sm backdrop-blur-md">
              <div className="max-w-7xl mx-auto flex items-center gap-6 overflow-x-auto no-scrollbar py-2">
                {/* 1. Profile Tab */}
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`relative py-2.5 px-1 font-label-lg text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-colors ${
                    activeTab === 'profile'
                      ? 'text-primary font-semibold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  <span>Profile</span>
                </button>

                {/* 2. Reading Activity Tab */}
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`relative py-2.5 px-1 font-label-lg text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-colors ${
                    activeTab === 'activity'
                      ? 'text-primary font-semibold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">insights</span>
                  <span>Reading Activity</span>
                </button>

                {/* 3. Preferences Tab */}
                {isOwner && (
                  <button
                    onClick={() => setActiveTab('preferences')}
                    className={`relative py-2.5 px-1 font-label-lg text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'preferences'
                        ? 'text-primary font-semibold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    <span>Reading Preferences</span>
                  </button>
                )}

                {/* 4. Privacy Settings Tab */}
                {isOwner && (
                  <button
                    onClick={() => setActiveTab('privacy')}
                    className={`relative py-2.5 px-1 font-label-lg text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-colors ${
                      activeTab === 'privacy'
                        ? 'text-primary font-semibold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">security</span>
                    <span>Privacy Settings</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── 3. SECTION CONTENT SWITCHER ── */}
            <div className="w-full px-4 sm:px-6 lg:px-12 py-8">
              <div className="max-w-7xl mx-auto">
                {/* ══════════════════════════════════════════════════════════
                    SECTION 1: PROFILE (Overview, Focus & Curated Shelf)
                ══════════════════════════════════════════════════════════ */}
                {activeTab === 'profile' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column (8 cols): Active Reading Focus & Favorites */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                      {/* A. Current Reading Focus Spotlight */}
                      <section className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-lg relative overflow-hidden">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant/15">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">
                              local_library
                            </span>
                            <span className="font-label-sm text-xs uppercase tracking-wider text-outline font-semibold">
                              Currently Reading
                            </span>
                          </div>
                          {currentlyReading && (
                            <div className="flex items-center gap-1.5 bg-secondary-container/40 px-2.5 py-1 rounded text-on-secondary-container text-xs font-semibold">
                              <span className="material-symbols-outlined text-sm text-primary">
                                sync
                              </span>
                              <span>Reading Now</span>
                            </div>
                          )}
                        </div>

                        {currentlyReading ? (
                          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                            {/* Book Cover with high-res optimized WebP and tactile spine */}
                            <BookCover
                              coverImage={currentlyReading.coverImage}
                              title={currentlyReading.title}
                              author={currentlyReading.author}
                              variant="large"
                              className="w-36 h-52 sm:w-40 sm:h-56 flex-shrink-0 shadow-2xl border border-primary/20 group"
                              imgClassName="group-hover:scale-105 transition-transform duration-500"
                              badge={
                                <div className="bg-surface-container-lowest/90 px-2 py-0.5 rounded text-center">
                                  <span className="text-[9px] text-primary tracking-wider uppercase font-semibold">
                                    Current
                                  </span>
                                </div>
                              }
                            />

                            {/* Book Details & Progress */}
                            <div className="flex flex-col flex-1 gap-2.5 w-full">
                              <div>
                                <h3 className="font-headline-md font-garamond text-2xl text-on-surface font-semibold leading-snug">
                                  {currentlyReading.title}
                                </h3>
                                <p className="text-sm text-on-surface-variant italic mt-0.5">
                                  {currentlyReading.author || 'Anonymous Author'}
                                </p>
                              </div>

                              {currentlyReading.description && (
                                <p className="text-xs text-outline line-clamp-2 leading-relaxed">
                                  {currentlyReading.description}
                                </p>
                              )}

                              {/* Progress bar */}
                              <div className="mt-2 p-3.5 rounded-xl bg-surface-container border border-outline-variant/15 flex flex-col gap-2">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-on-surface font-semibold">Reading Progress</span>
                                  <span className="text-primary font-bold">
                                    {currentlyReading.progress || 0}% Completed
                                  </span>
                                </div>
                                <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-primary-container via-primary to-secondary h-full rounded-full transition-all duration-500"
                                    style={{ width: `${currentlyReading.progress || 0}%` }}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[11px] text-outline">
                                  <span>
                                    Page {currentlyReading.currentPage || 1} of{' '}
                                    {currentlyReading.totalPages || 1}
                                  </span>
                                  <span className="text-secondary-fixed-dim">
                                    {currentlyReading.lastReadAt
                                      ? `Last read ${new Date(
                                          currentlyReading.lastReadAt
                                        ).toLocaleDateString()}`
                                      : 'In progress'}
                                  </span>
                                </div>
                              </div>

                              {/* Read Action */}
                              <div className="pt-2">
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/viewer?bookId=${currentlyReading._id}${
                                        currentlyReading.fileUrl
                                          ? `&file=${encodeURIComponent(
                                              resolveFileUrl(currentlyReading.fileUrl)
                                            )}`
                                          : ''
                                      }`
                                    )
                                  }
                                  className="px-4 py-2 bg-primary text-on-primary font-label-lg text-xs font-semibold rounded-lg shadow hover:bg-secondary transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    menu_book
                                  </span>
                                  <span>Continue Reading</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Empty state for currently reading */
                          <div className="py-8 px-4 text-center flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-outline text-3xl">
                              auto_stories
                            </span>
                            <h4 className="font-headline-sm font-garamond text-lg text-on-surface">
                              No Book Currently Reading
                            </h4>
                            <p className="font-body-sm text-xs text-outline max-w-sm">
                              {isOwner
                                ? 'Select a book from your bookshelf to begin tracking your reading progress.'
                                : 'This reader has no active reading session at this moment.'}
                            </p>
                            {isOwner && (
                              <button
                                onClick={() => navigate('/dashboard')}
                                className="mt-2 px-4 py-2 bg-surface-container-high border border-primary/20 text-primary text-xs font-semibold rounded-lg hover:bg-surface-container-highest transition-colors cursor-pointer"
                              >
                                Browse Bookshelf
                              </button>
                            )}
                          </div>
                        )}
                      </section>

                      {/* B. Curated Favourite Books */}
                      <section className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-lg flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">
                              bookmark_heart
                            </span>
                            <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold">
                              Favourite Books
                            </h3>
                          </div>
                          {isOwner && (
                            <button
                              onClick={() => setActiveTab('preferences')}
                              className="text-primary hover:text-secondary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Manage Favourites</span>
                              <span className="material-symbols-outlined text-sm">tune</span>
                            </button>
                          )}
                        </div>

                        {favoriteBooks.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {favoriteBooks.map((book) => {
                              const b = typeof book === 'object' ? book : { _id: book };
                              return (
                                <div
                                  key={b._id}
                                  onClick={() =>
                                    navigate(
                                      `/viewer?bookId=${b._id}${
                                        b.fileUrl
                                          ? `&file=${encodeURIComponent(resolveFileUrl(b.fileUrl))}`
                                          : ''
                                      }`
                                    )
                                  }
                                  className="bg-surface-container border border-outline-variant/20 rounded-xl p-3.5 flex gap-3 hover:border-primary/40 hover:bg-surface-container-high transition-all cursor-pointer group"
                                >
                                  <BookCover
                                    coverImage={b.coverImage}
                                    title={b.title}
                                    author={b.author}
                                    variant="thumb"
                                    className="w-14 h-20 shadow border border-primary/10"
                                    imgClassName="group-hover:scale-105 transition-transform"
                                  />
                                  <div className="flex flex-col justify-between min-w-0 flex-1">
                                    <div>
                                      <h4 className="font-headline-sm font-garamond text-sm text-on-surface font-semibold group-hover:text-primary transition-colors truncate">
                                        {b.title || 'Book'}
                                      </h4>
                                      <p className="text-xs text-outline truncate">{b.author || 'Author'}</p>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-primary pt-1">
                                      <span>Read Book</span>
                                      <span className="material-symbols-outlined text-xs">
                                        arrow_forward
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-8 px-4 text-center flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-outline text-3xl">
                              shelves
                            </span>
                            <p className="text-xs text-outline max-w-sm">
                              {isOwner
                                ? 'No favourite books selected yet. Select books in Reading Preferences to feature on your bookshelf.'
                                : 'This reader has not selected any favourite books yet.'}
                            </p>
                          </div>
                        )}
                      </section>
                    </div>

                    {/* Right Column (4 cols): Genres, Interests & Clubs */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                      {/* 1. Favourite Genres */}
                      <section className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2.5">
                          <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                            Favourite Genres
                          </h4>
                          <span className="text-[10px] uppercase font-bold text-primary">
                            Genres
                          </span>
                        </div>
                        {currentUser?.favoriteGenres?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {currentUser.favoriteGenres.map((genre) => (
                              <span
                                key={genre}
                                className="px-2.5 py-1 rounded-md bg-surface-container border border-primary/20 text-primary text-xs font-semibold"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-outline italic">
                            {isOwner
                              ? 'No genres selected yet. Add them in Preferences.'
                              : 'No genres declared.'}
                          </p>
                        )}
                      </section>

                      {/* 2. Reading Interests */}
                      <section className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2.5">
                          <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                            Reading Interests
                          </h4>
                          <span className="text-[10px] uppercase font-bold text-secondary">
                            Focus
                          </span>
                        </div>
                        {currentUser?.readingInterests?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {currentUser.readingInterests.map((interest) => (
                              <span
                                key={interest}
                                className="px-2.5 py-1 rounded-md bg-secondary-container/30 border border-secondary/30 text-on-secondary-container text-xs font-semibold"
                              >
                                {interest}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-outline italic">
                            {isOwner
                              ? 'No reading interests selected yet. Add them in Preferences.'
                              : 'No interests declared.'}
                          </p>
                        )}
                      </section>

                      {/* 3. Book Clubs */}
                      <section className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2.5">
                          <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                            Book Clubs
                          </h4>
                          <span className="text-[10px] uppercase font-bold text-tertiary">
                            {clubs.length} Active
                          </span>
                        </div>
                        {clubs.length > 0 ? (
                          <div className="flex flex-col gap-2 pt-1">
                            {clubs.map((c) => (
                              <div
                                key={c._id}
                                onClick={() => navigate(`/club/${c._id}`)}
                                className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/15 flex items-center justify-between hover:bg-surface-container-high hover:border-primary/30 transition-all cursor-pointer group"
                              >
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-headline-sm font-garamond text-sm text-on-surface font-semibold group-hover:text-primary transition-colors truncate">
                                    {c.name}
                                  </h5>
                                  <p className="text-[11px] text-outline truncate">
                                    {c.memberCount || 1} members
                                  </p>
                                </div>
                                <span className="material-symbols-outlined text-outline group-hover:text-primary text-base">
                                  chevron_right
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-outline italic">
                            {isOwner
                              ? 'You have not joined any book clubs yet.'
                              : 'No club affiliations.'}
                          </p>
                        )}
                      </section>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    SECTION 2: READING ACTIVITY & CADENCE
                ══════════════════════════════════════════════════════════ */}
                {activeTab === 'activity' && (
                  <div className="flex flex-col gap-6">
                    {/* Activity Header Banner */}
                    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-primary text-xl">
                            show_chart
                          </span>
                          <span className="text-xs uppercase tracking-wider text-outline font-semibold">
                            Reading Activity • {activity?.year || new Date().getFullYear()}
                          </span>
                        </div>
                        <h2 className="font-headline-md font-garamond text-2xl text-on-surface font-semibold">
                          Reading Pace & History
                        </h2>
                        <p className="text-xs text-outline mt-0.5">
                          Calculated from your verified reading history in Bookify.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-surface-container px-3.5 py-2 rounded-xl border border-outline-variant/20 text-center">
                          <span className="block text-[10px] text-outline uppercase font-semibold">
                            Peak Month
                          </span>
                          <span className="font-headline-sm font-garamond text-sm text-primary font-bold">
                            {activity?.peakMonth || 'None recorded yet'}
                          </span>
                        </div>
                        <div className="bg-surface-container px-3.5 py-2 rounded-xl border border-outline-variant/20 text-center">
                          <span className="block text-[10px] text-outline uppercase font-semibold">
                            Completion Rate
                          </span>
                          <span className="font-headline-sm font-garamond text-sm text-secondary font-bold">
                            {activity?.completionRate || 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quarterly Breakdown Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      {activity?.quarters?.map((q, idx) => {
                        const total = activity.totalBooks || 1;
                        const pct = Math.min(100, Math.round((q.count / total) * 100));
                        const colors = [
                          'text-primary border-primary/20',
                          'text-secondary border-secondary/20',
                          'text-primary-fixed-dim border-primary/20',
                          'text-tertiary border-tertiary/20',
                        ];
                        const barColors = ['bg-primary', 'bg-secondary', 'bg-primary-container', 'bg-tertiary'];
                        return (
                          <div
                            key={q.label}
                            className={`bg-surface-container-low border rounded-xl p-4 shadow-md flex flex-col justify-between ${colors[idx]}`}
                          >
                            <span className="font-label-sm text-[11px] text-outline font-semibold">
                              {q.label}
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="font-headline-md font-garamond text-2xl font-bold">
                                {q.count}
                              </span>
                              <span className="text-xs text-outline">books</span>
                            </div>
                            <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-2.5 overflow-hidden">
                              <div
                                className={`${barColors[idx]} h-full rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-outline mt-1.5">{q.months}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Monthly Sparkline & Histogram Graph (Real Data) */}
                    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-base">
                            stacked_bar_chart
                          </span>
                          <span className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                            Monthly Reading Activity
                          </span>
                        </div>
                        <span className="text-[11px] text-outline">
                          {activity?.completed || 0} completed of {activity?.totalBooks || 0} total
                        </span>
                      </div>

                      {/* 12-Month Bar Columns */}
                      <div className="pt-6 pb-2">
                        <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-40 border-b border-outline-variant/20 pb-2">
                          {activity?.monthlyActivity?.map((m) => {
                            const maxVal = Math.max(
                              1,
                              ...activity.monthlyActivity.map((item) => item.completed + item.active)
                            );
                            const totalVal = m.completed + m.active;
                            const heightPct = totalVal > 0 ? Math.max(15, Math.round((totalVal / maxVal) * 100)) : 4;
                            return (
                              <div
                                key={m.month}
                                className="flex flex-col items-center justify-end h-full group relative"
                              >
                                {/* Tooltip */}
                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-highest border border-primary/25 text-on-surface text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                                  {m.month}: {m.completed} completed, {m.active} active
                                </div>

                                <div
                                  className={`w-full rounded-t-sm transition-all duration-300 ${
                                    m.completed > 0
                                      ? 'bg-gradient-to-t from-primary-container to-primary group-hover:brightness-110'
                                      : m.active > 0
                                      ? 'bg-secondary/60'
                                      : 'bg-surface-container-high'
                                  }`}
                                  style={{ height: `${heightPct}%` }}
                                />
                                <span className="text-[10px] text-outline uppercase font-mono mt-2 group-hover:text-primary transition-colors">
                                  {m.month}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-xs text-on-surface-variant pt-2">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-primary" />
                            <span>Completed Books</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-secondary/60" />
                            <span>In-Progress Books</span>
                          </span>
                        </div>
                        <span className="text-outline">
                          Based on verified database records • No synthetic markers
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    SECTION 3: PREFERENCES (Genres, Interests, Favorite Books)
                ══════════════════════════════════════════════════════════ */}
                {activeTab === 'preferences' && isOwner && (
                  <div className="flex flex-col gap-6 max-w-4xl">
                    {/* Header Banner */}
                    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-primary text-xl">
                          tune
                        </span>
                        <span className="text-xs uppercase tracking-wider text-outline font-semibold">
                          Reading Preferences
                        </span>
                      </div>
                      <h2 className="font-headline-md font-garamond text-2xl text-on-surface font-semibold">
                        Reading Preferences & Interests
                      </h2>
                      <p className="text-xs text-outline mt-0.5 leading-relaxed">
                        Select your favourite genres, reading interests, and choose which
                        books are featured on your profile.
                      </p>
                    </div>

                    {/* 1. Favourite Genres */}
                    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-lg flex flex-col gap-4">
                      <div>
                        <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold">
                          Favourite Genres
                        </h3>
                        <p className="text-xs text-outline">
                          Select the literary genres that resonate most with your reading pursuits.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {DEFAULT_GENRES.map((g) => {
                          const selected = prefGenres.includes(g);
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => toggleGenre(g)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                selected
                                  ? 'bg-primary text-on-primary border-primary shadow'
                                  : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:border-primary/40 hover:text-on-surface'
                              }`}
                            >
                              {selected && '✓ '}
                              {g}
                            </button>
                          );
                        })}
                        {/* Custom added genres */}
                        {prefGenres
                          .filter((g) => !DEFAULT_GENRES.includes(g))
                          .map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => toggleGenre(g)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-primary text-on-primary border-primary shadow cursor-pointer"
                            >
                              ✓ {g} ×
                            </button>
                          ))}
                      </div>

                      {/* Add Custom Genre Form */}
                      <form onSubmit={addCustomGenre} className="flex items-center gap-2 pt-2 max-w-md">
                        <input
                          type="text"
                          value={customGenre}
                          onChange={(e) => setCustomGenre(e.target.value)}
                          placeholder="Add custom genre..."
                          className="flex-1 bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-primary shadow-inner"
                        />
                        <button
                          type="submit"
                          disabled={!customGenre.trim()}
                          className="px-3.5 py-2 bg-surface-container-high border border-primary/20 text-primary text-xs font-semibold rounded-lg hover:bg-surface-container-highest transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          Add
                        </button>
                      </form>
                    </div>

                    {/* 2. Reading Interests */}
                    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-lg flex flex-col gap-4">
                      <div>
                        <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold">
                          Reading Interests & Passions
                        </h3>
                        <p className="text-xs text-outline">
                          Select your areas of interest and discussion topics.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {DEFAULT_INTERESTS.map((item) => {
                          const selected = prefInterests.includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleInterest(item)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                selected
                                  ? 'bg-secondary text-on-primary border-secondary shadow'
                                  : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:border-secondary/40 hover:text-on-surface'
                              }`}
                            >
                              {selected && '✓ '}
                              {item}
                            </button>
                          );
                        })}
                        {/* Custom added interests */}
                        {prefInterests
                          .filter((i) => !DEFAULT_INTERESTS.includes(i))
                          .map((i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => toggleInterest(i)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-secondary text-on-primary border-secondary shadow cursor-pointer"
                            >
                              ✓ {i} ×
                            </button>
                          ))}
                      </div>

                      {/* Add Custom Interest Form */}
                      <form onSubmit={addCustomInterest} className="flex items-center gap-2 pt-2 max-w-md">
                        <input
                          type="text"
                          value={customInterest}
                          onChange={(e) => setCustomInterest(e.target.value)}
                          placeholder="Add custom reading interest..."
                          className="flex-1 bg-surface-container-lowest border border-outline-variant/30 text-on-surface px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-primary shadow-inner"
                        />
                        <button
                          type="submit"
                          disabled={!customInterest.trim()}
                          className="px-3.5 py-2 bg-surface-container-high border border-primary/20 text-primary text-xs font-semibold rounded-lg hover:bg-surface-container-highest transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          Add
                        </button>
                      </form>
                    </div>

                    {/* 3. Featured Favourite Books Selection */}
                    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-lg flex flex-col gap-4">
                      <div>
                        <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold">
                          Favourite Books
                        </h3>
                        <p className="text-xs text-outline">
                          Select which books from your library are highlighted on your profile.
                        </p>
                      </div>

                      {myUploadedBooks.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {myUploadedBooks.map((book) => {
                            const isFav = prefFavoriteBookIds.includes(book._id);
                            return (
                              <div
                                key={book._id}
                                onClick={() => toggleFavoriteBook(book._id)}
                                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                                  isFav
                                    ? 'bg-surface-container-high border-primary text-primary'
                                    : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:border-primary/30'
                                }`}
                              >
                                <BookCover
                                  coverImage={book.coverImage}
                                  title={book.title}
                                  author={book.author}
                                  variant="thumb"
                                  className="w-10 h-14 rounded shadow-sm"
                                />
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-headline-sm font-garamond text-xs font-semibold truncate">
                                    {book.title}
                                  </h5>
                                  <p className="text-[10px] text-outline truncate">{book.author}</p>
                                  <span className="text-[10px] mt-1 inline-block">
                                    {isFav ? '★ Featured on profile' : '☆ Click to feature'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-outline italic">
                          No books in your library yet. Add books on your bookshelf first.
                        </p>
                      )}
                    </div>

                    {/* 4. Display Currently Reading Toggle */}
                    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-lg flex items-center justify-between">
                      <div className="max-w-xl">
                        <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                          Display Currently Reading Book
                        </h4>
                        <p className="text-xs text-outline mt-0.5">
                          When enabled, the book you are actively reading is displayed in your profile
                          spotlight.
                        </p>
                      </div>
                      <div
                        onClick={() => setPrefShowCurrentlyReading((p) => !p)}
                        className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${
                          prefShowCurrentlyReading ? 'bg-primary' : 'bg-surface-container-highest'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform ${
                            prefShowCurrentlyReading ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSavePreferences}
                        disabled={savingPrefs}
                        className="px-6 py-3 bg-primary text-on-primary font-label-lg text-sm font-semibold rounded-xl shadow-[0_4px_16px_rgba(242,190,140,0.25)] hover:bg-secondary transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {savingPrefs ? 'hourglass_empty' : 'save'}
                        </span>
                        <span>{savingPrefs ? 'Saving…' : 'Save Reading Preferences'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    SECTION 4: PRIVACY SETTINGS (Enforced by Backend)
                ══════════════════════════════════════════════════════════ */}
                {activeTab === 'privacy' && isOwner && (
                  <div className="flex flex-col gap-6 max-w-3xl">
                    {/* Header Banner */}
                    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-primary text-xl">
                          security
                        </span>
                        <span className="text-xs uppercase tracking-wider text-outline font-semibold">
                          Privacy Settings
                        </span>
                      </div>
                      <h2 className="font-headline-md font-garamond text-2xl text-on-surface font-semibold">
                        Profile Privacy & Visibility
                      </h2>
                      <p className="text-xs text-outline mt-0.5 leading-relaxed">
                        Control how your reading records, activity graphs, and favourite books
                        are presented to other members and visitors.
                      </p>
                    </div>

                    {/* Notice Callout */}
                    <div className="p-4 rounded-xl bg-surface-container border border-primary/20 flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0 mt-0.5">
                        verified_user
                      </span>
                      <div className="text-xs leading-relaxed text-on-surface-variant">
                        <strong className="text-primary font-semibold block mb-0.5">
                          Privacy Protection
                        </strong>
                        When privacy switches are deactivated, Bookify's server strictly withholds
                        the corresponding records from public view. Your private records are never
                        exposed to unauthorized visitors.
                      </div>
                    </div>

                    {/* Privacy Toggles Card */}
                    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-lg flex flex-col divide-y divide-outline-variant/15">
                      {/* 1. Public / Private Profile Visibility */}
                      <div className="py-4 first:pt-0 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                            Public Profile
                          </h4>
                          <p className="text-xs text-outline mt-0.5">
                            When enabled, members and visitors can discover your profile and reading
                            activity via your profile link. When disabled, your entire profile is private.
                          </p>
                        </div>
                        <div
                          onClick={() => togglePrivacyField('isPublic')}
                          className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors flex-shrink-0 ${
                            privacyState.isPublic ? 'bg-primary' : 'bg-surface-container-highest'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform ${
                              privacyState.isPublic ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>

                      {/* 2. Reading Activity & Cadence Visibility */}
                      <div className="py-4 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                            Reading Activity & Statistics
                          </h4>
                          <p className="text-xs text-outline mt-0.5">
                            Allow other readers to view your monthly reading pace, completed books,
                            and quarterly reading statistics.
                          </p>
                        </div>
                        <div
                          onClick={() => togglePrivacyField('showReadingActivity')}
                          className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors flex-shrink-0 ${
                            privacyState.showReadingActivity
                              ? 'bg-primary'
                              : 'bg-surface-container-highest'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform ${
                              privacyState.showReadingActivity ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>

                      {/* 3. Currently Reading Visibility */}
                      <div className="py-4 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                            Currently Reading Book
                          </h4>
                          <p className="text-xs text-outline mt-0.5">
                            Show which book you are actively reading to other readers.
                          </p>
                        </div>
                        <div
                          onClick={() => togglePrivacyField('showCurrentlyReading')}
                          className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors flex-shrink-0 ${
                            privacyState.showCurrentlyReading
                              ? 'bg-primary'
                              : 'bg-surface-container-highest'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform ${
                              privacyState.showCurrentlyReading ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>

                      {/* 4. Favourite Books Visibility */}
                      <div className="py-4 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                            Favourite Books
                          </h4>
                          <p className="text-xs text-outline mt-0.5">
                            Display your favourite books on your public profile.
                          </p>
                        </div>
                        <div
                          onClick={() => togglePrivacyField('showFavoriteBooks')}
                          className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors flex-shrink-0 ${
                            privacyState.showFavoriteBooks
                              ? 'bg-primary'
                              : 'bg-surface-container-highest'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform ${
                              privacyState.showFavoriteBooks ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>

                      {/* 5. Club Affiliations Visibility */}
                      <div className="py-4 last:pb-0 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                            Book Clubs
                          </h4>
                          <p className="text-xs text-outline mt-0.5">
                            Show which book clubs you have joined.
                          </p>
                        </div>
                        <div
                          onClick={() => togglePrivacyField('showClubs')}
                          className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors flex-shrink-0 ${
                            privacyState.showClubs ? 'bg-primary' : 'bg-surface-container-highest'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-surface-container-lowest shadow-md transform transition-transform ${
                              privacyState.showClubs ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-outline">
                        Changes are saved immediately to your account.
                      </span>
                      {savingPrivacy && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <span className="w-3 h-3 border border-primary/30 border-t-primary rounded-full animate-spin" />
                          <span>Saving settings…</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── GLOBAL FOOTER ────────────────────────────────────── */}
      <Footer />

      {/* ── EDIT PROFILE MODAL ────────────────────────────────── */}
      {showEditModal && currentUser && (
        <EditProfileModal
          user={currentUser}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedUser) => {
            setProfileData((prev) => ({
              ...prev,
              user: {
                ...prev.user,
                ...updatedUser,
              },
            }));
          }}
        />
      )}
    </div>
  );
}
