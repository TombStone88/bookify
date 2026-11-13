import React, { useState, useEffect } from 'react';
import api, { resolveFileUrl } from '../../utils/api';
import BookCover from '../BookCover';
import UserAvatar from '../UserAvatar';

export default function ClubOverviewTab({
  clubId,
  isHost,
  userId,
  adminId,
  club,
  books,
  members,
  inviteCode,
  copyInviteCode,
  setShowUploadModal,
  handleRemoveMember,
  onNavigateTab,
}) {
  const [challenges, setChallenges] = useState([]);
  const [polls, setPolls] = useState([]);
  const [topics, setTopics] = useState([]);
  const [events, setEvents] = useState([]);

  // Active book is most recent book
  const activeBook = books.length > 0 ? books[books.length - 1] : null;
  const activeBookProgress = Math.round(activeBook?.progress || 0);

  // Fetch quick snapshots for the 4 features
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.get(`/api/challenges/club/${clubId}`).catch(() => ({ data: [] })),
      api.get(`/api/polls/club/${clubId}`).catch(() => ({ data: [] })),
      api.get(`/api/topics/club/${clubId}`).catch(() => ({ data: [] })),
      api.get(`/api/events/club/${clubId}`).catch(() => ({ data: [] })),
    ]).then(([chRes, pollRes, topRes, evtRes]) => {
      if (!isMounted) return;
      setChallenges(chRes.data || []);
      setPolls(pollRes.data || []);
      setTopics(topRes.data || []);
      setEvents(evtRes.data || []);
    });

    return () => {
      isMounted = false;
    };
  }, [clubId]);

  // Derived snapshot items
  const activeChallenge = challenges.find((c) => c.status === 'active') || challenges[0] || null;
  const activePoll = polls.find((p) => !p.isClosed) || polls[0] || null;
  const nextEvent = events.find((e) => !e.isPast && e.status !== 'cancelled') || events[0] || null;
  const recentTopics = topics.slice(0, 3);

  const activeChallengesCount = challenges.filter((c) => c.status === 'active').length;
  const openPollsCount = polls.filter((p) => !p.isClosed).length;
  const upcomingEventsCount = events.filter((e) => !e.isPast && e.status !== 'cancelled').length;

  return (
    <div className="w-full flex flex-col gap-space-lg animate-fadeIn">
      {/* ── QUICK STATS ROW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => onNavigateTab('tome')}
          className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-md flex items-center gap-3 text-left hover:border-primary/40 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">menu_book</span>
          </div>
          <div className="min-w-0">
            <span className="font-headline-lg font-garamond text-xl font-bold text-on-surface block leading-none">
              {books.length}
            </span>
            <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider">
              {books.length === 1 ? 'Book' : 'Books'}
            </span>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('members')}
          className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-md flex items-center gap-3 text-left hover:border-primary/40 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">group</span>
          </div>
          <div className="min-w-0">
            <span className="font-headline-lg font-garamond text-xl font-bold text-on-surface block leading-none">
              {members.length}
            </span>
            <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider">
              {members.length === 1 ? 'Reader' : 'Readers'}
            </span>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('challenges')}
          className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-md flex items-center gap-3 text-left hover:border-primary/40 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">flag</span>
          </div>
          <div className="min-w-0">
            <span className="font-headline-lg font-garamond text-xl font-bold text-on-surface block leading-none">
              {activeChallengesCount}
            </span>
            <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider">
              Challenges
            </span>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('chat')}
          className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-md flex items-center gap-3 text-left hover:border-primary/40 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">how_to_vote</span>
          </div>
          <div className="min-w-0">
            <span className="font-headline-lg font-garamond text-xl font-bold text-on-surface block leading-none">
              {openPollsCount}
            </span>
            <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider">
              Open Polls
            </span>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('events')}
          className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-md flex items-center gap-3 text-left hover:border-primary/40 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">event</span>
          </div>
          <div className="min-w-0">
            <span className="font-headline-lg font-garamond text-xl font-bold text-on-surface block leading-none">
              {upcomingEventsCount}
            </span>
            <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider">
              Upcoming Events
            </span>
          </div>
        </button>
      </div>

      {/* ── TWO-COLUMN MAIN CANVAS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* ════ LEFT COLUMN: FEATURE SNAPSHOTS (8 COLS) ════ */}
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {/* Current Book Reading Folio Banner */}
          <div className="w-full bg-surface-container-low rounded-2xl p-5 sm:p-6 border border-outline-variant/20 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">menu_book</span>
                <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold">
                  Active Club Reading Selection
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-label-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Upload New Book</span>
              </button>
            </div>

            {activeBook ? (
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <BookCover
                  coverImage={activeBook.coverImage}
                  title={activeBook.title}
                  author={activeBook.author}
                  variant="thumb"
                  className="w-24 sm:w-28 shadow-xl shrink-0"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[10px] uppercase tracking-wider font-bold">
                      Current Tome
                    </span>
                    <h2 className="font-headline-lg font-garamond text-xl sm:text-2xl text-on-surface font-semibold mt-1">
                      {activeBook.title}
                    </h2>
                    <p className="font-body-sm text-xs text-outline mt-0.5">
                      by {activeBook.author || 'Unknown Author'}
                    </p>
                    {activeBook.description && (
                      <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 mt-2 leading-relaxed">
                        {activeBook.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-outline-variant/15 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-outline">Club Reading Pacing</span>
                      <span className="font-mono font-bold text-primary">{activeBookProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${activeBookProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <a
                        href={`/viewer?file=${encodeURIComponent(resolveFileUrl(activeBook.fileUrl))}&bookId=${activeBook._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all no-underline cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">menu_book</span>
                        <span>Read Book</span>
                      </a>
                      <a
                        href={resolveFileUrl(activeBook.fileUrl)}
                        download
                        className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-xs font-semibold flex items-center gap-1.5 transition-colors no-underline cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-outline flex flex-col items-center">
                <span className="material-symbols-outlined text-3xl text-primary/60 mb-2">
                  auto_stories
                </span>
                <p className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                  No book selected yet for this club
                </p>
                <p className="font-body-sm text-xs text-outline mt-1 mb-4 max-w-sm">
                  Upload a PDF document to begin collaborative reading, chapter discussions, and reading challenges.
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  <span>Upload First Book</span>
                </button>
              </div>
            )}
          </div>

          {/* ── 2x2 GRID OF NEW FEATURE SNAPSHOT WIDGETS ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* Widget 1: Active Reading Challenge */}
            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 shadow-lg flex flex-col justify-between gap-3 group hover:border-primary/30 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-label-sm text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Challenge</span>
                  </span>
                  <span className="text-[11px] text-outline font-mono">
                    {challenges.length} total
                  </span>
                </div>

                {activeChallenge ? (
                  <>
                    <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold group-hover:text-primary transition-colors truncate">
                      {activeChallenge.title}
                    </h4>
                    <p className="font-body-sm text-xs text-outline line-clamp-2">
                      Goal: {activeChallenge.targetGoal} {activeChallenge.goalType} • Your progress:{' '}
                      <strong className="text-primary font-mono">{activeChallenge.myProgress || 0}</strong>
                    </p>

                    <div className="mt-1">
                      <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, activeChallenge.myPercent || 0)}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="font-body-sm text-xs text-outline italic py-2">
                    No active reading challenges at this moment.
                  </p>
                )}
              </div>

              <button
                onClick={() => onNavigateTab('challenges')}
                className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-primary/20 cursor-pointer"
              >
                <span>View Challenges</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {/* Widget 2: Active Poll */}
            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 shadow-lg flex flex-col justify-between gap-3 group hover:border-primary/30 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-label-sm text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Club Poll</span>
                  </span>
                  <span className="text-[11px] text-outline font-mono">
                    {polls.length} total
                  </span>
                </div>

                {activePoll ? (
                  <>
                    <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold group-hover:text-primary transition-colors truncate">
                      {activePoll.question}
                    </h4>
                    <p className="font-body-sm text-xs text-outline line-clamp-2">
                      {activePoll.totalVotes} {activePoll.totalVotes === 1 ? 'vote cast' : 'votes cast'} •{' '}
                      {activePoll.hasVoted ? '✓ You voted' : 'Voting is open'}
                    </p>
                  </>
                ) : (
                  <p className="font-body-sm text-xs text-outline italic py-2">
                    No open polls currently taking votes.
                  </p>
                )}
              </div>

              <button
                onClick={() => onNavigateTab('chat')}
                className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-primary/20 cursor-pointer"
              >
                <span>View Polls & Vote</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {/* Widget 3: Next Event */}
            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 shadow-lg flex flex-col justify-between gap-3 group hover:border-primary/30 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 font-label-sm text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">event</span>
                    <span>Next Gathering</span>
                  </span>
                  <span className="text-[11px] text-outline font-mono">
                    {events.length} total
                  </span>
                </div>

                {nextEvent ? (
                  <>
                    <h4 className="font-headline-sm font-garamond text-base text-on-surface font-semibold group-hover:text-primary transition-colors truncate">
                      {nextEvent.title}
                    </h4>
                    <p className="font-body-sm text-xs text-outline line-clamp-2">
                      {new Date(nextEvent.eventDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {nextEvent.location && ` • ${nextEvent.location}`}
                    </p>
                  </>
                ) : (
                  <p className="font-body-sm text-xs text-outline italic py-2">
                    No upcoming gatherings scheduled yet.
                  </p>
                )}
              </div>

              <button
                onClick={() => onNavigateTab('events')}
                className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-primary/20 cursor-pointer"
              >
                <span>View Events & Calendar</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {/* Widget 4: Discussion Topics */}
            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 shadow-lg flex flex-col justify-between gap-3 group hover:border-primary/30 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">forum</span>
                    <span>Discussions</span>
                  </span>
                  <span className="text-[11px] text-outline font-mono">
                    {topics.length} topics
                  </span>
                </div>

                {recentTopics.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {recentTopics.slice(0, 2).map((t) => (
                      <div key={t._id} className="flex items-center justify-between text-xs gap-2">
                        <span className="truncate text-on-surface font-medium hover:text-primary transition-colors">
                          {t.title}
                        </span>
                        <span className="text-outline text-[11px] shrink-0 font-mono">
                          {t.commentCount || 0}💬
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-body-sm text-xs text-outline italic py-2">
                    No discussion topics started yet.
                  </p>
                )}
              </div>

              <button
                onClick={() => onNavigateTab('discussions')}
                className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-primary/20 cursor-pointer"
              >
                <span>Join Discussions</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* ════ RIGHT COLUMN: MEMBERS & GUIDELINES (4 COLS) ════ */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          {/* Members Register */}
          <div className="w-full bg-surface-container-low rounded-2xl p-5 shadow-xl border border-outline-variant/20 flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-base">group</span>
                <h3 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
                  Club Members
                </h3>
                <span className="text-outline text-xs">({members.length})</span>
              </div>
              <span className="font-label-sm text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Active</span>
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {members.map((member) => {
                const isMemberAdmin = member._id?.toString() === adminId?.toString();
                const isSelf = member._id?.toString() === userId?.toString();
                const memberName = member.username || member.name || 'Reader';

                return (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar user={member} size="sm" className="w-7 h-7 text-[11px]" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-sm text-xs text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                          {memberName} {isSelf && <span className="text-primary font-normal">(You)</span>}
                        </span>
                        <span className="font-body-sm text-[10px] text-outline truncate">
                          {isMemberAdmin ? 'Club Host' : 'Club Member'}
                        </span>
                      </div>
                    </div>

                    {adminId === userId && !isMemberAdmin && (
                      <button
                        onClick={() => handleRemoveMember(member._id, memberName)}
                        className="p-1 rounded text-outline hover:text-error hover:bg-error/15 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={copyInviteCode}
              className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-primary/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">person_add</span>
              <span>Invite Reader with Code</span>
            </button>
          </div>

          {/* Privacy & Guidelines */}
          <div className="w-full bg-surface-container-low rounded-2xl p-5 shadow-xl border border-outline-variant/20 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 border-b border-outline-variant/15 pb-2">
              <span className="material-symbols-outlined text-outline text-base">verified_user</span>
              <h4 className="font-headline-sm font-garamond text-sm text-on-surface font-semibold">
                Club Privacy & Invite Code
              </h4>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
              This book club is private and member-governed. Share your unique code with readers you wish to invite.
            </p>
            <div className="p-2.5 rounded-lg bg-surface-container text-xs text-outline flex items-center justify-between font-mono">
              <span>Invite Code:</span>
              <span className="text-primary font-bold tracking-wider">{inviteCode || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
