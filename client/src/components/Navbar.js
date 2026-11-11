import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserIdentity from './UserIdentity';
import NotificationBell from './NotificationBell';

export default function Navbar({
  activePage = null,
  children = null,
  showSearch = false,
  searchValue = '',
  onSearchChange = null,
  searchPlaceholder = 'Search volumes or authors…',
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active route
  const currentPath = location.pathname;
  const isBookshelf = activePage === 'bookshelf' || currentPath === '/dashboard';
  const isClubs = activePage === 'clubs' || currentPath === '/clubs' || currentPath.startsWith('/club');
  const isProfile = activePage === 'profile' || currentPath.startsWith('/profile');

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-outline-variant/20 shadow-[0_1px_8px_rgba(0,0,0,0.25)]">
      <div className="h-20 w-full px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Main Navigation Links */}
        <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 min-w-0">
          {/* Brand Logo */}
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 group cursor-pointer flex-shrink-0"
            title="Bookify Home"
          >
            <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-primary/25 flex items-center justify-center text-primary group-hover:text-secondary transition-colors">
              <span className="material-symbols-outlined text-[18px]">auto_stories</span>
            </div>
            <span className="font-headline-md font-garamond text-xl sm:text-2xl tracking-tight text-primary transition-opacity group-hover:opacity-90 font-semibold">
              Bookify
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-sm transition-all cursor-pointer ${
                isBookshelf
                  ? 'bg-surface-container-high text-primary font-semibold shadow-xs'
                  : 'text-on-surface-variant font-medium hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              Personal Bookshelf
            </button>

            <button
              onClick={() => navigate('/clubs')}
              className={`px-3.5 py-1.5 rounded-lg text-sm transition-all cursor-pointer ${
                isClubs
                  ? 'bg-surface-container-high text-primary font-semibold shadow-xs'
                  : 'text-on-surface-variant font-medium hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              Book Clubs
            </button>

            <button
              onClick={() => navigate('/profile')}
              className={`px-3.5 py-1.5 rounded-lg text-sm transition-all cursor-pointer ${
                isProfile
                  ? 'bg-surface-container-high text-primary font-semibold shadow-xs'
                  : 'text-on-surface-variant font-medium hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              Profile
            </button>
          </nav>
        </div>

        {/* Center / Optional Search Bar */}
        {showSearch && onSearchChange && (
          <div className="relative hidden md:block w-48 lg:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
              search
            </span>
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-surface-container-low border border-outline-variant/30 pl-9 pr-3.5 py-2 rounded-lg text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-all shadow-inner"
            />
          </div>
        )}

        {/* Right: Actions Slot & Shared Authenticated Identity */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {children}
          <NotificationBell />
          <UserIdentity />
        </div>
      </div>
    </header>
  );
}
