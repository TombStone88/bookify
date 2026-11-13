import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import UserAvatar from '../UserAvatar';

// ── CREATE / EDIT EVENT MODAL ─────────────────────────────────
function EventModal({ clubId, eventToEdit, onClose, onSuccess }) {
  const [title, setTitle] = useState(eventToEdit?.title || '');
  const [description, setDescription] = useState(eventToEdit?.description || '');
  const [eventDate, setEventDate] = useState(() => {
    if (eventToEdit?.eventDate) {
      const d = new Date(eventToEdit.eventDate);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(19, 0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [endDate, setEndDate] = useState(() => {
    if (eventToEdit?.endDate) {
      const d = new Date(eventToEdit.endDate);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }
    return '';
  });
  const [location, setLocation] = useState(eventToEdit?.location || 'Online Meeting');
  const [meetingUrl, setMeetingUrl] = useState(eventToEdit?.meetingUrl || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Please enter an event title');
    if (!eventDate) return toast.error('Please specify an event date and time');

    setSubmitting(true);
    try {
      if (eventToEdit) {
        await api.put(`/api/events/${eventToEdit._id}`, {
          title: title.trim(),
          description: description.trim(),
          eventDate,
          endDate: endDate || null,
          location: location.trim(),
          meetingUrl: meetingUrl.trim(),
        });
        toast.success('Event updated! 📅');
      } else {
        await api.post(`/api/events/club/${clubId}`, {
          title: title.trim(),
          description: description.trim(),
          eventDate,
          endDate: endDate || null,
          location: location.trim(),
          meetingUrl: meetingUrl.trim(),
        });
        toast.success('Club event scheduled! 🎟️');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container-high border border-primary/30 rounded-2xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-surface-container-lowest border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            </div>
            <div>
              <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold">
                {eventToEdit ? 'Edit Club Gathering' : 'Schedule Club Gathering'}
              </h3>
              <p className="font-body-sm text-[11px] text-outline">
                Coordinate chapter discussions, author Q&As, or virtual book meetups.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-primary transition-colors p-1 rounded-lg"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
              Event Title <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mid-Book Debate: Chapters 1 through 10"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs sm:text-sm px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
              Description / Agenda (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide meeting questions, agenda milestones, or preparation notes..."
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs sm:text-sm px-3.5 py-2 rounded-lg focus:outline-none focus:border-primary transition-all resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                Event Date & Time <span className="text-primary">*</span>
              </label>
              <input
                type="datetime-local"
                required
                max="2099-12-31T23:59"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs sm:text-sm px-3.5 py-2 rounded-lg focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                End Time (Optional)
              </label>
              <input
                type="datetime-local"
                max="2099-12-31T23:59"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs sm:text-sm px-3.5 py-2 rounded-lg focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Online, Discord, or Local Library"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs sm:text-sm px-3.5 py-2 rounded-lg focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                Meeting URL (Optional)
              </label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs sm:text-sm px-3.5 py-2 rounded-lg focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-2 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant font-label-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-lg text-xs font-semibold shadow-md flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {submitting ? 'hourglass_empty' : 'event_available'}
              </span>
              <span>{submitting ? 'Saving...' : eventToEdit ? 'Save Changes' : 'Schedule Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MAIN EVENTS SECTION COMPONENT ─────────────────────────────
export default function EventsSection({ clubId, isHost, currentUserId }) {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('upcoming'); // 'upcoming' | 'past' | 'all'
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [expandedAttendees, setExpandedAttendees] = useState({});
  const [rsvpLoading, setRsvpLoading] = useState({});

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get(`/api/events/club/${clubId}`);
      setEvents(res.data || []);
    } catch {
      toast.error('Failed to load club events');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRsvp = async (eventId, status) => {
    setRsvpLoading((prev) => ({ ...prev, [eventId]: true }));
    try {
      await api.post(`/api/events/${eventId}/rsvp`, { status });
      toast.success(status === 'going' ? 'RSVP confirmed! See you there! 🎉' : 'RSVP updated.');
      await fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update RSVP');
    } finally {
      setRsvpLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const handleCancelEvent = async (eventId, title) => {
    if (!window.confirm(`Mark event "${title}" as cancelled?`)) return;
    try {
      await api.put(`/api/events/${eventId}/cancel`);
      toast.success('Event cancelled');
      await fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel event');
    }
  };

  const handleDeleteEvent = async (eventId, title) => {
    if (!window.confirm(`Delete event "${title}" permanently?`)) return;
    try {
      await api.delete(`/api/events/${eventId}`);
      toast.success('Event deleted');
      setEvents((prev) => prev.filter((e) => e._id !== eventId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete event');
    }
  };

  const toggleAttendees = (eventId) => {
    setExpandedAttendees((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return !e.isPast && e.status !== 'cancelled';
    if (filter === 'past') return e.isPast || e.status === 'completed';
    return true;
  });

  const formatEventDate = (dateStr) => {
    if (!dateStr) return { day: '', month: '', time: '', fullDate: '' };
    try {
      const d = new Date(dateStr);
      return {
        month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        day: d.getDate(),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fullDate: d.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };
    } catch {
      return { day: '', month: '', time: '', fullDate: dateStr };
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-surface-container-low rounded-2xl p-8 border border-outline-variant/15 flex flex-col items-center justify-center text-outline">
        <span className="material-symbols-outlined text-3xl text-primary animate-spin mb-2">
          progress_activity
        </span>
        <p className="font-body-sm text-xs">Loading club events...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-space-md animate-fadeIn">
      {/* Header & Controls Strip */}
      <div className="w-full bg-surface-container-low rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-surface-container-high border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-base">calendar_month</span>
            </div>
            <h2 className="font-headline-sm font-garamond text-xl text-on-surface font-semibold">
              Club Events & Gatherings
            </h2>
            <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-mono text-xs font-semibold">
              {events.length}
            </span>
          </div>
          <p className="font-body-sm text-xs text-outline mt-0.5">
            Synchronized live sessions, reading circles, and chapter debriefs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-filters */}
          <div className="flex items-center bg-surface-container p-1 rounded-xl border border-outline-variant/20 text-xs">
            {['upcoming', 'past', 'all'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg capitalize font-label-sm transition-all cursor-pointer ${
                  filter === tab
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Host Action: Schedule Event */}
          {isHost && (
            <button
              onClick={() => {
                setEditingEvent(null);
                setShowModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Schedule Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Events List or Empty State */}
      {filteredEvents.length === 0 ? (
        <div className="w-full bg-surface-container-low rounded-2xl p-10 border border-outline-variant/15 flex flex-col items-center justify-center text-center text-outline">
          <div className="w-14 h-14 rounded-2xl bg-surface-container border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner">
            <span className="material-symbols-outlined text-2xl">event</span>
          </div>
          <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold mb-1">
            {filter === 'upcoming'
              ? 'No Upcoming Events Scheduled'
              : filter === 'past'
              ? 'No Past Events Found'
              : 'No Club Events Scheduled Yet'}
          </h3>
          <p className="font-body-sm text-xs text-outline max-w-md leading-relaxed mb-4">
            {isHost
              ? 'Organize a chapter debrief, live voice discussion, or silent reading hour for your club.'
              : 'The club host has not scheduled any gatherings yet. Check back soon for the next event!'}
          </p>
          {isHost && (
            <button
              onClick={() => {
                setEditingEvent(null);
                setShowModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">calendar_add_on</span>
              <span>Schedule First Event</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {filteredEvents.map((evt) => {
            const dt = formatEventDate(evt.eventDate);
            const isCancelled = evt.status === 'cancelled';
            const isPast = evt.isPast;
            const myRsvp = evt.myRsvp;
            const isRsvping = !!rsvpLoading[evt._id];
            const isExpanded = !!expandedAttendees[evt._id];
            const attendees = evt.attendees || [];

            return (
              <div
                key={evt._id}
                className="w-full bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 shadow-lg flex flex-col justify-between gap-4 hover:border-primary/30 transition-all group"
              >
                {/* Event Header & Calendar Ribbon */}
                <div className="flex items-start gap-4">
                  {/* Calendar Badge */}
                  <div className="flex flex-col items-center justify-center w-14 h-16 rounded-xl bg-surface-container border border-primary/30 text-center shadow-md shrink-0">
                    <span className="font-label-sm text-[10px] font-bold text-primary tracking-wider uppercase">
                      {dt.month}
                    </span>
                    <span className="font-headline-lg font-garamond text-2xl font-bold text-on-surface leading-none mt-0.5">
                      {dt.day}
                    </span>
                  </div>

                  {/* Title & Details */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.2 rounded-full text-[9px] font-label-sm uppercase tracking-wider font-bold border ${
                          isCancelled
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : isPast
                            ? 'bg-surface-container text-outline border-outline-variant/20'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {isCancelled ? 'Cancelled' : isPast ? 'Past Event' : 'Scheduled'}
                      </span>

                      {isHost && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingEvent(evt);
                              setShowModal(true);
                            }}
                            className="p-1 rounded text-outline hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                            title="Edit Event (Host Only)"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          {!isCancelled && !isPast && (
                            <button
                              onClick={() => handleCancelEvent(evt._id, evt.title)}
                              className="p-1 rounded text-outline hover:text-amber-400 hover:bg-amber-400/15 transition-colors cursor-pointer"
                              title="Cancel Event"
                            >
                              <span className="material-symbols-outlined text-[16px]">cancel</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteEvent(evt._id, evt.title)}
                            className="p-1 rounded text-outline hover:text-error hover:bg-error/15 transition-colors cursor-pointer"
                            title="Delete Event (Host Only)"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold leading-snug truncate mt-1 group-hover:text-primary transition-colors">
                      {evt.title}
                    </h3>

                    {/* Time & Location */}
                    <div className="flex flex-col gap-1 mt-1.5 text-xs text-outline font-body-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-primary">schedule</span>
                        <span>
                          {dt.fullDate} at {dt.time}
                        </span>
                      </div>

                      {evt.location && (
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-secondary">
                            location_on
                          </span>
                          <span className="truncate">{evt.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {evt.description && (
                  <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    {evt.description}
                  </p>
                )}

                {/* Meeting Link Pill */}
                {evt.meetingUrl && !isCancelled && (
                  <div className="p-2.5 rounded-xl bg-surface-container flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-primary min-w-0">
                      <span className="material-symbols-outlined text-sm">link</span>
                      <span className="truncate font-mono text-[11px]">{evt.meetingUrl}</span>
                    </div>
                    <a
                      href={evt.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded bg-primary text-on-primary font-label-sm text-[11px] font-semibold flex items-center gap-1 hover:bg-secondary transition-colors shrink-0 no-underline cursor-pointer"
                    >
                      <span>Join Call</span>
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </a>
                  </div>
                )}

                {/* RSVP Controls & Attendance Bar */}
                <div className="flex flex-col gap-2.5 pt-2 border-t border-outline-variant/15">
                  <div className="flex items-center justify-between text-xs">
                    {/* Attendees counter button */}
                    <button
                      onClick={() => toggleAttendees(evt._id)}
                      className="text-outline hover:text-primary transition-colors flex items-center gap-1 font-label-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isExpanded ? 'expand_less' : 'groups'}
                      </span>
                      <span>
                        <strong className="text-on-surface font-mono">{evt.attendingCount}</strong> Going
                      </span>
                      {evt.notGoingCount > 0 && (
                        <span className="text-outline/70">
                          • <strong className="font-mono">{evt.notGoingCount}</strong> Can&apos;t go
                        </span>
                      )}
                    </button>

                    {/* RSVP Buttons (if upcoming and not cancelled) */}
                    {!isCancelled && !isPast ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRsvp(evt._id, 'going')}
                          disabled={isRsvping}
                          className={`px-3 py-1.5 rounded-lg font-label-sm text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                            myRsvp === 'going'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                          <span>Going</span>
                        </button>

                        <button
                          onClick={() => handleRsvp(evt._id, 'not_going')}
                          disabled={isRsvping}
                          className={`px-2.5 py-1.5 rounded-lg font-label-sm text-xs transition-all cursor-pointer ${
                            myRsvp === 'not_going'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface'
                          }`}
                          title="Can't attend"
                        >
                          <span>Can&apos;t Go</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-outline italic">
                        {isCancelled ? 'Event cancelled' : 'Gathering concluded'}
                      </span>
                    )}
                  </div>

                  {/* Expanded Attendees List */}
                  {isExpanded && (
                    <div className="mt-1 pt-2 border-t border-outline-variant/15 flex flex-col gap-1.5 animate-fadeIn">
                      <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline font-semibold mb-1">
                        Attendee Register
                      </span>
                      {attendees.length === 0 ? (
                        <p className="text-[11px] text-outline italic">No RSVPs recorded yet.</p>
                      ) : (
                        attendees.map((att) => {
                          const u = att.user;
                          const uName = u?.username || u?.name || 'Reader';
                          const isSelf = u?._id?.toString() === currentUserId?.toString();
                          return (
                            <div
                              key={att._id || u?._id}
                              className="flex items-center justify-between text-xs p-1.5 rounded bg-surface-container"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <UserAvatar user={u} size="sm" className="w-5 h-5 text-[9px]" />
                                <span className="text-on-surface truncate">
                                  {uName} {isSelf && <span className="text-primary font-normal">(You)</span>}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-label-sm font-semibold capitalize ${
                                  att.status === 'going' ? 'text-emerald-400' : 'text-outline'
                                }`}
                              >
                                {att.status === 'going' ? '✓ Attending' : 'Not Going'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <EventModal
          clubId={clubId}
          eventToEdit={editingEvent}
          onClose={() => {
            setShowModal(false);
            setEditingEvent(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingEvent(null);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}
