import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import toast from 'react-hot-toast';

export default function UserIdentity({ customProfile = null, showDesignation = true }) {
  const navigate = useNavigate();
  const { profile: authProfile, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const profile = customProfile || authProfile;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!profile) {
    return (
      <button
        onClick={() => navigate('/auth')}
        className="px-4 py-2 bg-primary text-on-primary font-label-lg text-xs font-semibold rounded-lg shadow hover:bg-secondary transition-all cursor-pointer"
      >
        Sign In
      </button>
    );
  }

  const username = profile.username || 'Reader';
  const email = profile.email || '';
  const designation = 'Reader • Book Club Member';

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/', { replace: true });
    toast.success('Safely logged out of Bookify');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group select-none"
        title="Account Options"
      >
        <UserAvatar user={profile} size={36} />

        <div className="hidden lg:flex flex-col text-left min-w-0 max-w-[150px]">
          <span className="font-label-lg text-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors leading-tight">
            {username}
          </span>
          {showDesignation && (
            <span className="text-[10px] text-outline truncate font-medium mt-0.5 leading-none">
              {designation}
            </span>
          )}
        </div>

        <span className="material-symbols-outlined text-outline text-lg transition-transform group-hover:text-primary hidden sm:inline">
          {dropdownOpen ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 top-12 w-64 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl p-2.5 z-50 animate-fadeIn">
          {/* Identity Header Card */}
          <div className="p-3 bg-surface-container-lowest/80 rounded-xl border border-outline-variant/20 mb-2">
            <div className="flex items-center gap-3">
              <UserAvatar user={profile} size={42} />
              <div className="min-w-0 flex-1">
                <div className="font-headline-sm font-garamond text-base font-semibold text-on-surface truncate">
                  {username}
                </div>
                {email && (
                  <div className="text-[11px] text-outline truncate mt-0.5">
                    {email}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-outline-variant/15 flex items-center gap-1.5 text-primary text-[10px] uppercase font-semibold tracking-wider">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              <span>{designation}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => {
                setDropdownOpen(false);
                navigate('/dashboard');
              }}
              className="w-full px-3 py-2 text-left text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">shelves</span>
              <span className="font-medium">Personal Bookshelf</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                navigate('/clubs');
              }}
              className="w-full px-3 py-2 text-left text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">groups</span>
              <span className="font-medium">Book Clubs</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                navigate('/profile');
              }}
              className="w-full px-3 py-2 text-left text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-tertiary">person</span>
              <span className="font-medium">User Profile</span>
            </button>
          </div>

          <div className="my-1.5 border-t border-outline-variant/20" />

          {/* Logout Action */}
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-left text-xs text-error hover:bg-error/10 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
