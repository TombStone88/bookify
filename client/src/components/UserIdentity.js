import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import UserAvatar from './UserAvatar';
import toast from 'react-hot-toast';

const MOOD_OPTIONS = [
  '📖 Reading',
  '💬 Available to chat',
  '🎧 Busy',
  '✨ Taking a break',
  '☕ Coffee time',
  '🧠 Deep focus',
];

const AVAILABILITIES = ['Online', 'Away', 'Do Not Disturb', 'Offline'];

const AVAILABILITY_CONFIG = {
  Online: { label: 'Online', dot: 'bg-emerald-500', border: 'border-emerald-500/40', text: 'text-emerald-400' },
  Away: { label: 'Away', dot: 'bg-amber-500', border: 'border-amber-500/40', text: 'text-amber-400' },
  'Do Not Disturb': { label: 'Do Not Disturb', dot: 'bg-rose-500', border: 'border-rose-500/40', text: 'text-rose-400' },
  Offline: { label: 'Offline', dot: 'bg-slate-500', border: 'border-slate-500/40', text: 'text-slate-400' },
};

export default function UserIdentity({ customProfile = null, showDesignation = true }) {
  const navigate = useNavigate();
  const { profile: authProfile, logout, refreshProfile } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const dropdownRef = useRef(null);

  const profile = customProfile || authProfile;
  const isSelf = !customProfile || (authProfile && customProfile._id === authProfile._id);

  // Status edit state
  const [selectedMood, setSelectedMood] = useState(profile?.mood || '📖 Reading');
  const [customStatus, setCustomStatus] = useState(profile?.customStatus || '');
  const [selectedAvailability, setSelectedAvailability] = useState(profile?.availability || 'Online');
  const [savingStatus, setSavingStatus] = useState(false);

  // Sync internal state with profile
  useEffect(() => {
    if (profile) {
      setSelectedMood(profile.mood || '📖 Reading');
      setCustomStatus(profile.customStatus || '');
      setSelectedAvailability(profile.availability || 'Online');
    }
  }, [profile]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setEditingStatus(false);
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
  const mood = profile.mood || '📖 Reading';
  const availability = profile.availability || 'Online';
  const availMeta = AVAILABILITY_CONFIG[availability] || AVAILABILITY_CONFIG.Online;

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/', { replace: true });
    toast.success('Safely logged out of Bookify');
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!isSelf) return;

    setSavingStatus(true);
    try {
      await api.put('/api/users/status', {
        mood: selectedMood,
        customStatus: customStatus.trim().slice(0, 100),
        availability: selectedAvailability,
      });
      toast.success('Status updated! ✨');
      setEditingStatus(false);
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group select-none"
        title={`Account: ${username} • ${availability}`}
      >
        <div className="relative">
          <UserAvatar user={profile} size={36} />
          {/* Availability Beacon Dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${availMeta.dot} border-2 border-surface-container-low shadow-xs`}
            title={`Availability: ${availMeta.label}`}
          />
        </div>

        <div className="hidden lg:flex flex-col text-left min-w-0 max-w-[170px]">
          <span className="font-label-lg text-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors leading-tight">
            {username}
          </span>
          {showDesignation && (
            <div className="flex items-center gap-1 text-[10px] text-outline truncate font-medium mt-0.5 leading-none">
              <span className="truncate text-primary/90">{mood}</span>
              {profile.customStatus && (
                <span className="truncate italic text-outline/80 max-w-[90px]">
                  • "{profile.customStatus}"
                </span>
              )}
            </div>
          )}
        </div>

        <span className="material-symbols-outlined text-outline text-lg transition-transform group-hover:text-primary hidden sm:inline">
          {dropdownOpen ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 top-12 w-80 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn">
          {/* Identity Header Card */}
          <div className="p-3 bg-surface-container-lowest/80 rounded-xl border border-outline-variant/20 mb-2">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <UserAvatar user={profile} size={42} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${availMeta.dot} border-2 border-surface-container-lowest shadow-xs`}
                  title={availMeta.label}
                />
              </div>
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

            {/* Current Mood & Availability Pill */}
            <div className="mt-2.5 pt-2 border-t border-outline-variant/15 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-medium text-on-surface">
                  <span>{mood}</span>
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container ${availMeta.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${availMeta.dot}`} />
                  <span>{availMeta.label}</span>
                </span>
              </div>
              {profile.customStatus && (
                <p className="text-[11px] text-outline italic truncate">
                  "{profile.customStatus}"
                </p>
              )}
            </div>

            {/* Quick Status Toggle Button */}
            {isSelf && (
              <div className="mt-2.5 pt-2 border-t border-outline-variant/15 flex justify-end">
                <button
                  type="button"
                  onClick={() => setEditingStatus((prev) => !prev)}
                  className="text-[11px] text-primary hover:text-secondary font-label-sm font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {editingStatus ? 'expand_less' : 'tune'}
                  </span>
                  <span>{editingStatus ? 'Close Status Editor' : 'Update Mood & Status'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Status Editor Inline */}
          {editingStatus && isSelf && (
            <form onSubmit={handleSaveStatus} className="p-3 bg-surface-container-lowest rounded-xl border border-primary/20 mb-2 flex flex-col gap-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-primary font-semibold">
                  Update Availability
                </span>
              </div>
              {/* Availability Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {AVAILABILITIES.map((avail) => {
                  const cfg = AVAILABILITY_CONFIG[avail];
                  const isSelected = selectedAvailability === avail;
                  return (
                    <button
                      key={avail}
                      type="button"
                      onClick={() => setSelectedAvailability(avail)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left text-[11px] font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-surface-container border-primary text-on-surface shadow-xs font-semibold'
                          : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
                      <span className="truncate">{avail}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mood Selector */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
                  Current Mood
                </label>
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 text-on-surface font-body-sm text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  {MOOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Status Input */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
                    Custom Status (Optional)
                  </label>
                  <span className="text-[10px] text-outline font-mono">
                    {customStatus.length}/100
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={100}
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="e.g. Chapter 4 of Middlemarch..."
                  className="w-full bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-outline font-body-sm text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-primary transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingStatus(false)}
                  className="px-2.5 py-1 rounded text-[11px] text-outline hover:text-on-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="px-3 py-1 bg-primary text-on-primary font-label-sm text-xs font-semibold rounded-lg shadow-sm hover:bg-secondary transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {savingStatus ? 'hourglass_empty' : 'check'}
                  </span>
                  <span>{savingStatus ? 'Saving…' : 'Save'}</span>
                </button>
              </div>
            </form>
          )}

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
