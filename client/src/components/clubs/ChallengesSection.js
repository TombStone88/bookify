import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import UserAvatar from '../UserAvatar';

// ── CREATE CHALLENGE MODAL ────────────────────────────────────
function CreateChallengeModal({ clubId, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState('pages');
  const [targetGoal, setTargetGoal] = useState('300');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Please enter a challenge title');
    const numGoal = Number(targetGoal);
    if (!numGoal || numGoal <= 0) return toast.error('Target goal must be greater than zero');
    if (!startDate || !endDate) return toast.error('Please select valid start and end dates');
    if (new Date(endDate) <= new Date(startDate)) {
      return toast.error('End date must be after start date');
    }

    setSubmitting(true);
    try {
      await api.post(`/api/challenges/club/${clubId}`, {
        title: title.trim(),
        description: description.trim(),
        goalType,
        targetGoal: numGoal,
        startDate,
        endDate,
      });
      toast.success('Reading challenge declared! 🏆');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create challenge');
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
        className="w-full max-w-lg bg-surface-container-high border border-primary/30 rounded-2xl p-6 sm:p-7 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 border-b border-outline-variant/20 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-surface-container-lowest border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">flag</span>
            </div>
            <div>
              <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold">
                Create Reading Challenge
              </h3>
              <p className="font-body-sm text-[11px] text-outline">
                Motivate your club members with a collective or individual reading milestone.
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
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
              Challenge Title <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Winter Gothic Sprint • 500 Pages"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs sm:text-sm px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the themes, chapter goals, or celebration notes..."
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs sm:text-sm px-3.5 py-2 rounded-lg focus:outline-none focus:border-primary transition-all resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                Goal Metric
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs sm:text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-primary transition-all"
              >
                <option value="pages">Pages read</option>
                <option value="books">Books completed</option>
              </select>
            </div>

            <div>
              <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                Target Quantity <span className="text-primary">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={targetGoal}
                onChange={(e) => setTargetGoal(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs sm:text-sm px-3.5 py-2 rounded-lg focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                Start Date <span className="text-primary">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs sm:text-sm px-3.5 py-2 rounded-lg focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
                End Date <span className="text-primary">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs sm:text-sm px-3.5 py-2 rounded-lg focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface-variant font-label-lg text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-lg text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {submitting ? 'hourglass_empty' : 'add_task'}
              </span>
              <span>{submitting ? 'Creating...' : 'Create Challenge'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── LOG PROGRESS MODAL / INLINE ───────────────────────────────
function UpdateProgressModal({ challenge, onClose, onSuccess }) {
  const [val, setVal] = useState(challenge.myProgress || 0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const num = Number(val);
    if (isNaN(num) || num < 0) return toast.error('Please enter a valid non-negative number');

    setSubmitting(true);
    try {
      const res = await api.post(`/api/challenges/${challenge._id}/progress`, { progress: num });
      toast.success(res.data.isCompleted ? 'Challenge completed! 🎖️ Outstanding!' : 'Progress updated! 📖');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update progress');
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
        className="w-full max-w-md bg-surface-container-high border border-primary/30 rounded-2xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">auto_stories</span>
            <h3 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
              Log Your Reading Progress
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-primary transition-colors p-1 rounded-lg"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <p className="font-body-sm text-xs text-outline mb-4">
          Challenge: <strong className="text-on-surface">{challenge.title}</strong>
          <br />
          Goal: {challenge.targetGoal} {challenge.goalType}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
              Your Current Total ({challenge.goalType})
            </label>
            <input
              type="number"
              min="0"
              required
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-sm px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-primary transition-all font-mono"
            />
            <p className="text-[10px] text-outline mt-1">
              Enter your cumulative number of {challenge.goalType} read towards this challenge.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
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
              className="px-5 py-2 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-lg text-xs font-semibold shadow-md flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">
                {submitting ? 'hourglass_empty' : 'check'}
              </span>
              <span>{submitting ? 'Saving...' : 'Update Progress'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MAIN CHALLENGES SECTION COMPONENT ─────────────────────────
export default function ChallengesSection({ clubId, isHost, currentUserId }) {
  const [challenges, setChallenges] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'upcoming' | 'completed'
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [progressModalChallenge, setProgressModalChallenge] = useState(null);
  const [expandedParticipants, setExpandedParticipants] = useState({});

  const fetchChallenges = useCallback(async () => {
    try {
      const res = await api.get(`/api/challenges/club/${clubId}`);
      setChallenges(res.data || []);
    } catch {
      toast.error('Failed to load reading challenges');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleDelete = async (challengeId, challengeTitle) => {
    if (!window.confirm(`Dissolve reading challenge "${challengeTitle}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/challenges/${challengeId}`);
      toast.success('Challenge removed');
      setChallenges((prev) => prev.filter((c) => c._id !== challengeId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete challenge');
    }
  };

  const toggleParticipants = (id) => {
    setExpandedParticipants((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredChallenges = challenges.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-surface-container-low rounded-2xl p-8 border border-outline-variant/15 flex flex-col items-center justify-center text-outline">
        <span className="material-symbols-outlined text-3xl text-primary animate-spin mb-2">
          progress_activity
        </span>
        <p className="font-body-sm text-xs">Loading reading challenges...</p>
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
              <span className="material-symbols-outlined text-base">flag</span>
            </div>
            <h2 className="font-headline-sm font-garamond text-xl text-on-surface font-semibold">
              Reading Challenges
            </h2>
            <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-mono text-xs font-semibold">
              {challenges.length}
            </span>
          </div>
          <p className="font-body-sm text-xs text-outline mt-0.5">
            Synchronized pacing milestones to read collaboratively with club members.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-filters */}
          <div className="flex items-center bg-surface-container p-1 rounded-xl border border-outline-variant/20 text-xs">
            {['all', 'active', 'upcoming', 'completed'].map((tab) => (
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

          {/* Host Action: Declare Challenge */}
          {isHost && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>New Challenge</span>
            </button>
          )}
        </div>
      </div>

      {/* Challenges List or Empty State */}
      {filteredChallenges.length === 0 ? (
        <div className="w-full bg-surface-container-low rounded-2xl p-10 border border-outline-variant/15 flex flex-col items-center justify-center text-center text-outline">
          <div className="w-14 h-14 rounded-2xl bg-surface-container border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner">
            <span className="material-symbols-outlined text-2xl">trophy</span>
          </div>
          <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold mb-1">
            {filter === 'all'
              ? 'No Reading Challenges Created Yet'
              : `No ${filter} challenges found`}
          </h3>
          <p className="font-body-sm text-xs text-outline max-w-md leading-relaxed mb-4">
            {isHost
              ? 'Set an ambitious page target or book count milestone to guide your members through their journey.'
              : 'The club host has not created any active reading challenges. When they do, track your pacing and celebrate completions here.'}
          </p>
          {isHost && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span>Create First Challenge</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {filteredChallenges.map((challenge) => {
            const isCompleted = challenge.myCompleted;
            const myPercent = Math.min(100, Math.max(0, challenge.myPercent || 0));
            const clubTotal = challenge.totalClubProgress || 0;
            const participants = challenge.participants || [];
            const isExpanded = !!expandedParticipants[challenge._id];

            const statusConfig = {
              active: {
                label: 'Active Challenge',
                badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                dot: 'bg-emerald-400 animate-pulse',
              },
              upcoming: {
                label: 'Upcoming',
                badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                dot: 'bg-amber-400',
              },
              completed: {
                label: 'Concluded',
                badge: 'bg-surface-container text-outline border-outline-variant/30',
                dot: 'bg-outline',
              },
            }[challenge.status] || {
              label: challenge.status,
              badge: 'bg-surface-container text-outline',
              dot: 'bg-outline',
            };

            return (
              <div
                key={challenge._id}
                className="w-full bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 shadow-lg flex flex-col justify-between gap-4 hover:border-primary/30 transition-all group"
              >
                {/* Top Strip */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-label-sm uppercase tracking-wider font-bold border flex items-center gap-1.5 ${statusConfig.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                      <span>{statusConfig.label}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-primary font-bold px-2 py-0.5 rounded bg-surface-container border border-primary/20">
                        {challenge.targetGoal} {challenge.goalType}
                      </span>
                      {isHost && (
                        <button
                          onClick={() => handleDelete(challenge._id, challenge.title)}
                          className="p-1 rounded text-outline hover:text-error hover:bg-error/15 transition-colors cursor-pointer"
                          title="Dissolve Challenge (Host Only)"
                        >
                          <span className="material-symbols-outlined text-[17px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold leading-snug group-hover:text-primary transition-colors">
                    {challenge.title}
                  </h3>

                  {challenge.description && (
                    <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                      {challenge.description}
                    </p>
                  )}

                  {/* Dates banner */}
                  <div className="flex items-center gap-1.5 text-[11px] text-outline font-body-sm mt-1">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    <span>
                      {formatDate(challenge.startDate)} — {formatDate(challenge.endDate)}
                    </span>
                  </div>
                </div>

                {/* Progress Indicators Container */}
                <div className="flex flex-col gap-3 bg-surface-container p-3.5 rounded-xl border border-outline-variant/15">
                  {/* Member's Individual Progress */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-primary">person</span>
                        <span>Your Progress</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-primary">
                          {challenge.myProgress} / {challenge.targetGoal} {challenge.goalType}
                        </span>
                        <span className="font-mono text-[10px] text-outline">({myPercent}%)</span>
                        {isCompleted && (
                          <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            <span>Done</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-400' : 'bg-primary'
                        }`}
                        style={{ width: `${myPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Overall Club Summary */}
                  <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-outline">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-secondary">groups</span>
                      <span>
                        Club Total: <strong className="text-on-surface font-mono">{clubTotal}</strong> {challenge.goalType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-emerald-400">check_circle</span>
                      <span>
                        <strong className="text-on-surface font-mono">{challenge.completedCount}</strong> finished
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-outline-variant/15">
                  <button
                    onClick={() => toggleParticipants(challenge._id)}
                    className="text-xs text-outline hover:text-primary transition-colors flex items-center gap-1 font-label-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isExpanded ? 'expand_less' : 'groups'}
                    </span>
                    <span>
                      {participants.length} {participants.length === 1 ? 'Participant' : 'Participants'}
                    </span>
                  </button>

                  <button
                    onClick={() => setProgressModalChallenge(challenge)}
                    className="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary font-label-sm text-xs font-semibold flex items-center gap-1.5 border border-primary/20 shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    <span>Log Progress</span>
                  </button>
                </div>

                {/* Expanded Participants Drawer */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-outline-variant/15 flex flex-col gap-1.5 animate-fadeIn">
                    <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline font-semibold mb-1">
                      Member Reading Progress
                    </span>
                    {participants.length === 0 ? (
                      <p className="text-[11px] text-outline italic">No progress logs recorded yet.</p>
                    ) : (
                      participants.map((p) => {
                        const u = p.user;
                        const uName = u?.username || u?.name || 'Reader';
                        const isSelf = u?._id?.toString() === currentUserId?.toString();
                        return (
                          <div
                            key={p._id || u?._id}
                            className="flex items-center justify-between text-xs p-1.5 rounded bg-surface-container"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <UserAvatar user={u} size="sm" className="w-5 h-5 text-[9px]" />
                              <span className="text-on-surface truncate">
                                {uName} {isSelf && <span className="text-primary font-normal">(You)</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-primary">
                                {p.currentProgress} {challenge.goalType}
                              </span>
                              {p.completed && (
                                <span className="text-emerald-400 text-xs" title="Completed">
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateChallengeModal
          clubId={clubId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchChallenges();
          }}
        />
      )}

      {progressModalChallenge && (
        <UpdateProgressModal
          challenge={progressModalChallenge}
          onClose={() => setProgressModalChallenge(null)}
          onSuccess={() => {
            setProgressModalChallenge(null);
            fetchChallenges();
          }}
        />
      )}
    </div>
  );
}
