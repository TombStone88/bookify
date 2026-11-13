import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import socket from '../socket';
import toast from 'react-hot-toast';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNotificationMeta(type) {
  switch (type) {
    case 'club_message':
      return {
        icon: 'forum',
        badgeColor: 'text-primary bg-primary/10 border-primary/20',
      };
    case 'club_book':
      return {
        icon: 'auto_stories',
        badgeColor: 'text-secondary bg-secondary-container/20 border-secondary/30',
      };
    case 'club_member_joined':
      return {
        icon: 'person_add',
        badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      };
    case 'club_invitation':
      return {
        icon: 'mail',
        badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      };
    default:
      return {
        icon: 'notifications',
        badgeColor: 'text-outline bg-surface-container border-outline-variant/20',
      };
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const hasLoadedRef = useRef(false);

  const token = localStorage.getItem('token');

  // Fetch initial unread count on mount
  useEffect(() => {
    if (!token) return;

    api.get('/api/notifications/unread-count')
      .then((res) => {
        setUnreadCount(res.data?.unreadCount || 0);
      })
      .catch(() => {});
  }, [token]);

  // Real-time listener for Socket.IO events
  useEffect(() => {
    if (!token) return;

    const handleNewNotification = (notification) => {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => {
        if (prev.some((n) => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      toast((t) => (
        <div
          onClick={() => {
            toast.dismiss(t.id);
            if (notification.referenceId) {
              navigate(`/clubs/${notification.referenceId}`);
            }
          }}
          className="flex items-start gap-2.5 cursor-pointer text-xs"
        >
          <span className="material-symbols-outlined text-primary text-base">notifications</span>
          <div>
            <p className="font-semibold text-on-surface">{notification.title}</p>
            <p className="text-outline line-clamp-1">{notification.message}</p>
          </div>
        </div>
      ), {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#1a1f2d',
          color: '#f3efe6',
          border: '1px solid rgba(242, 190, 140, 0.25)',
        },
      });
    };

    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [token, navigate]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch full notification list
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/notifications?page=1&limit=30');
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
      hasLoadedRef.current = true;
    } catch {
      setError('Unable to load chamber dispatches');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Toggle dropdown
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && (!hasLoadedRef.current || unreadCount > 0)) {
      fetchNotifications();
    }
  };

  // Mark single notification as read and navigate
  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      api.patch(`/api/notifications/${notif._id}/read`).catch(() => {});
    }

    setIsOpen(false);

    // Route to referenced resource
    if (notif.referenceType === 'club' || notif.referenceType === 'message' || notif.referenceType === 'book') {
      navigate(`/clubs/${notif.referenceId}`);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  // Delete notification
  const handleDelete = async (e, notifId, wasRead) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/notifications/${notifId}`);
      setNotifications((prev) => prev.filter((n) => n._id !== notifId));
      if (!wasRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      toast.error('Failed to remove notification');
    }
  };

  if (!token) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-surface-container-high text-primary shadow-inner border border-primary/30'
            : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
        }`}
        title="Notification Center"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <span className="material-symbols-outlined text-[21px]">
          {unreadCount > 0 ? 'notifications_active' : 'notifications'}
        </span>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Pane */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[330px] sm:w-[380px] bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container-lowest/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[19px]">notifications</span>
              <h3 className="font-headline-sm font-garamond text-base text-on-surface font-semibold tracking-tight">
                Dispatches
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/25">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-label-sm font-semibold text-primary hover:text-secondary flex items-center gap-1 transition-colors cursor-pointer"
                title="Mark all notifications as read"
              >
                <span className="material-symbols-outlined text-[14px]">done_all</span>
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notification List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/10 scrollbar-thin">
            {loading ? (
              <div className="p-8 flex flex-col items-center justify-center text-center text-outline">
                <span className="material-symbols-outlined text-2xl animate-spin text-primary mb-2">
                  progress_activity
                </span>
                <p className="text-xs font-body-sm">Loading notifications…</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-xs text-error font-body-sm mb-2">{error}</p>
                <button
                  type="button"
                  onClick={fetchNotifications}
                  className="px-3 py-1 rounded bg-surface-container text-xs text-primary font-semibold hover:bg-surface-container-highest cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center text-outline">
                <div className="w-12 h-12 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-center text-primary/70 mb-2.5">
                  <span className="material-symbols-outlined text-2xl">mark_chat_read</span>
                </div>
                <h4 className="font-garamond text-sm text-on-surface font-semibold mb-0.5">
                  No Dispatches
                </h4>
                <p className="text-[11px] text-outline max-w-[210px] leading-relaxed">
                  You are completely caught up with your book club reflections and activities.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const meta = getNotificationMeta(notif.type);
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3 sm:p-3.5 transition-colors cursor-pointer group flex items-start gap-3 relative ${
                      !notif.isRead
                        ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
                        : 'hover:bg-surface-container/60 opacity-90'
                    }`}
                  >
                    {/* Monogram / Category Badge */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${meta.badgeColor}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs font-semibold truncate ${!notif.isRead ? 'text-primary' : 'text-on-surface'}`}>
                          {notif.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-outline/70 mt-1 block font-mono">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    {/* Actions: Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, notif._id, notif.isRead)}
                      className="absolute right-2 top-3 p-1 rounded hover:bg-error/15 text-outline/50 hover:text-error transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Dismiss notification"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
