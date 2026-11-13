import React, { useState } from 'react';
import api from '../../utils/api';
import socket from '../../socket';
import toast from 'react-hot-toast';
import UserAvatar from '../UserAvatar';

/**
 * Convert a Date object or timestamp to a valid YYYY-MM-DDTHH:mm string
 * for native datetime-local inputs in the user's local timezone.
 */
export function formatToDatetimeLocal(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/**
 * Format date for display in a normal, human-readable format.
 */
export function formatPollDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── CREATE POLL MODAL ─────────────────────────────────────────
export function CreatePollModal({ clubId, onClose, onSuccess }) {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  // Default closing date: 7 days from now at 20:00 (8:00 PM) local time
  const [closesAt, setClosesAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(20, 0, 0, 0);
    return formatToDatetimeLocal(d);
  });
  const [submitting, setSubmitting] = useState(false);

  // Minimum allowed date is right now
  const minDatetime = formatToDatetimeLocal(new Date());
  // Maximum allowed date is year 2099 to avoid runaway year entry (e.g. 54222)
  const maxDatetime = '2099-12-31T23:59';

  const handleOptionChange = (idx, value) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
  };

  const addOptionField = () => {
    if (options.length >= 8) return toast.error('Maximum 8 options permitted per poll');
    setOptions((prev) => [...prev, '']);
  };

  const removeOptionField = (idx) => {
    if (options.length <= 2) return toast.error('Polls require at least 2 options');
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return toast.error('Please enter a poll question');
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      return toast.error('Please provide at least 2 distinct options');
    }

    if (closesAt) {
      const d = new Date(closesAt);
      if (isNaN(d.getTime())) {
        return toast.error('Please select a valid closing date and time');
      }
      if (d <= new Date()) {
        return toast.error('Poll closing date must be set in the future');
      }
      if (d.getFullYear() > 2099 || d.getFullYear() < 2024) {
        return toast.error('Please select a valid year between 2024 and 2099');
      }
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/api/polls/club/${clubId}`, {
        question: question.trim(),
        description: description.trim(),
        options: validOptions,
        closesAt: closesAt || null,
      });
      toast.success('Poll created! 🗳️');
      onSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create poll');
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
              <span className="material-symbols-outlined text-[20px]">how_to_vote</span>
            </div>
            <div>
              <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold">
                Create a Club Poll
              </h3>
              <p className="font-body-sm text-[11px] text-outline">
                Gather member votes for next book selection or club decisions.
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
              Poll Question <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which book shall we read next?"
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
              placeholder="Add details, notes, or voting guidelines..."
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs sm:text-sm px-3.5 py-2 rounded-lg focus:outline-none focus:border-primary transition-all resize-y"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                Options (Minimum 2) <span className="text-primary">*</span>
              </label>
              <button
                type="button"
                onClick={addOptionField}
                disabled={options.length >= 8}
                className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-label-sm cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Add Option</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-outline w-5 text-right">{idx + 1}.</span>
                  <input
                    type="text"
                    required
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs sm:text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-primary transition-all"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOptionField(idx)}
                      className="p-1.5 text-outline hover:text-error rounded-lg hover:bg-error/15 transition-colors cursor-pointer"
                      title="Remove option"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
              Closing Date & Time (Optional)
            </label>
            <input
              type="datetime-local"
              min={minDatetime}
              max={maxDatetime}
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-sm text-xs sm:text-sm px-3.5 py-2 rounded-lg focus:outline-none focus:border-primary transition-all"
            />
            <p className="text-[11px] text-outline mt-1">
              Voting will automatically close at this date and time.
            </p>
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
                {submitting ? 'hourglass_empty' : 'how_to_vote'}
              </span>
              <span>{submitting ? 'Creating...' : 'Create Poll'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── INTERACTIVE POLL CARD (Inside Live Chat) ─────────────────
export default function PollCard({
  poll,
  clubId,
  isHost,
  currentUserId,
  onPollUpdated,
  onPollDeleted,
}) {
  const [selectedOption, setSelectedOption] = useState('');
  const [voting, setVoting] = useState(false);

  const isClosed = poll.isClosed;
  const hasVoted = poll.hasVoted;
  const votedOptionId = poll.votedOptionId?.toString();
  const totalVotes = poll.totalVotes || 0;
  const creator = poll.creator;
  const creatorName = creator?.username || creator?.name || 'Club Host';

  const handleVote = async () => {
    if (!selectedOption) return toast.error('Please select an option before voting');
    setVoting(true);
    try {
      const res = await api.post(`/api/polls/${poll._id}/vote`, { optionId: selectedOption });
      toast.success('Vote submitted! 🗳️');
      if (res.data?.poll) {
        onPollUpdated(res.data.poll);
        socket.emit('pollUpdated', { clubId, poll: res.data.poll });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  const handleToggleClose = async () => {
    try {
      const res = await api.put(`/api/polls/${poll._id}/close`);
      toast.success(res.data?.poll?.isClosed ? 'Poll closed to voting' : 'Poll reopened!');
      if (res.data?.poll) {
        onPollUpdated(res.data.poll);
        socket.emit('pollUpdated', { clubId, poll: res.data.poll });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update poll status');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete poll "${poll.question}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/polls/${poll._id}`);
      toast.success('Poll deleted');
      onPollDeleted(poll._id);
      socket.emit('pollDeleted', { clubId, pollId: poll._id });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete poll');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto my-3 bg-surface-container rounded-2xl p-4 sm:p-5 border border-primary/30 shadow-lg flex flex-col gap-3.5 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <UserAvatar user={creator} size="sm" className="w-8 h-8 text-xs shrink-0" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-label-sm text-xs font-semibold text-on-surface truncate">
                {creatorName}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-label-sm text-[9px] uppercase tracking-wider font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]">how_to_vote</span>
                <span>Club Poll</span>
              </span>
            </div>
            <span className="text-[10px] text-outline">
              {formatPollDate(poll.createdAt)}
            </span>
          </div>
        </div>

        {/* Status Pill & Host Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-label-sm uppercase tracking-wider font-bold border flex items-center gap-1 ${
              isClosed
                ? 'bg-surface-container-high text-outline border-outline-variant/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isClosed ? 'bg-outline' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span>{isClosed ? 'Poll Closed' : 'Active'}</span>
          </span>

          {isHost && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleToggleClose}
                className="p-1 rounded text-outline hover:text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                title={isClosed ? 'Reopen Poll' : 'Close Poll'}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isClosed ? 'lock_open' : 'lock'}
                </span>
              </button>
              <button
                onClick={handleDelete}
                className="p-1 rounded text-outline hover:text-error hover:bg-error/15 transition-colors cursor-pointer"
                title="Delete Poll"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Question & Description */}
      <div className="flex flex-col gap-1">
        <h4 className="font-headline-sm font-garamond text-base sm:text-lg text-on-surface font-semibold leading-snug">
          {poll.question}
        </h4>
        {poll.description && (
          <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
            {poll.description}
          </p>
        )}
        {poll.closesAt && (
          <div className="flex items-center gap-1 text-[11px] text-outline font-body-sm mt-0.5">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            <span>
              {isClosed ? 'Closed:' : 'Closes:'} {formatPollDate(poll.closesAt)}
            </span>
          </div>
        )}
      </div>

      {/* Options & Voting */}
      <div className="flex flex-col gap-2">
        {hasVoted || isClosed ? (
          // Results view (voted or closed)
          poll.options?.map((opt) => {
            const isMyVote = opt._id.toString() === votedOptionId || opt.isMyVote;
            const pct = opt.percentage !== undefined ? opt.percentage : (opt.percent || 0);

            return (
              <div
                key={opt._id}
                className={`p-2.5 sm:p-3 rounded-xl border relative overflow-hidden transition-all ${
                  isMyVote
                    ? 'bg-primary/15 border-primary/50 shadow-sm'
                    : 'bg-surface-container-high border-outline-variant/20'
                }`}
              >
                {/* Visual Progress Fill */}
                <div
                  className={`absolute left-0 top-0 bottom-0 opacity-25 pointer-events-none transition-all duration-500 ${
                    isMyVote ? 'bg-primary' : 'bg-secondary'
                  }`}
                  style={{ width: `${pct}%` }}
                />

                <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {isMyVote && (
                      <span
                        className="material-symbols-outlined text-primary text-sm shrink-0"
                        title="Your vote"
                      >
                        check_circle
                      </span>
                    )}
                    <span className={`truncate ${isMyVote ? 'font-semibold text-primary' : 'text-on-surface'}`}>
                      {opt.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11px] text-outline">
                      {opt.voteCount || 0} {opt.voteCount === 1 ? 'vote' : 'votes'}
                    </span>
                    <span className="font-mono text-xs font-bold text-on-surface">
                      {pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          // Voting view (not yet voted and poll is active)
          <div className="flex flex-col gap-2">
            {poll.options?.map((opt) => {
              const isSelected = selectedOption === opt._id;
              return (
                <button
                  key={opt._id}
                  type="button"
                  onClick={() => setSelectedOption(opt._id)}
                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-left text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-primary/20 border-primary shadow-sm text-on-surface font-medium'
                      : 'bg-surface-container-high border-outline-variant/25 text-on-surface-variant hover:border-primary/40 hover:bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-primary bg-primary' : 'border-outline/50'
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-on-primary" />}
                  </span>
                  <span className="truncate">{opt.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between pt-1 border-t border-outline-variant/15 text-xs text-outline">
        <span className="font-mono text-[11px]">
          {totalVotes} {totalVotes === 1 ? 'vote cast' : 'votes cast'}
        </span>

        {!hasVoted && !isClosed ? (
          <button
            onClick={handleVote}
            disabled={!selectedOption || voting}
            className="px-4 py-1.5 rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">
              {voting ? 'hourglass_empty' : 'how_to_vote'}
            </span>
            <span>{voting ? 'Submitting...' : 'Submit Vote'}</span>
          </button>
        ) : hasVoted ? (
          <span className="text-primary font-label-sm text-[11px] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">verified</span>
            <span>Vote submitted</span>
          </span>
        ) : (
          <span className="italic text-[11px]">Poll closed</span>
        )}
      </div>
    </div>
  );
}
