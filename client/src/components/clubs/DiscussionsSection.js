import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../utils/api';
import socket from '../../socket';
import toast from 'react-hot-toast';
import UserAvatar from '../UserAvatar';

// ── CREATE TOPIC MODAL ────────────────────────────────────────
function CreateTopicModal({ clubId, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Please enter a discussion title');
    if (!content.trim()) return toast.error('Please provide topic context or question');

    setSubmitting(true);
    try {
      await api.post(`/api/topics/club/${clubId}`, {
        title: title.trim(),
        content: content.trim(),
      });
      toast.success('Discussion topic posted! 💬');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start topic');
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
        <div className="flex items-center justify-between mb-4 border-b border-outline-variant/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-surface-container-lowest border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">forum</span>
            </div>
            <div>
              <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold">
                Start Discussion Topic
              </h3>
              <p className="font-body-sm text-[11px] text-outline">
                Open a dedicated discussion topic beyond fast-paced live chat.
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
              Topic Subject / Question <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4: Was the narrator truly unreliable or misled?"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs sm:text-sm px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant mb-1">
              Context or Opening Thoughts <span className="text-primary">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share passage citations, character motivations, and questions for fellow members..."
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs sm:text-sm px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-primary transition-all resize-y"
            />
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
                {submitting ? 'hourglass_empty' : 'post_add'}
              </span>
              <span>{submitting ? 'Publishing...' : 'Publish Topic'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── TOPIC DETAIL & COMMENTS THREAD VIEW ───────────────────────
function TopicDetailView({
  topicId,
  onBack,
  isHost,
  currentUserId,
  onTopicDeleted,
  onTopicPinToggled,
}) {
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const commentsBottomRef = useRef(null);

  const fetchTopicDetails = useCallback(async () => {
    try {
      const res = await api.get(`/api/topics/${topicId}`);
      setTopic(res.data);
    } catch {
      toast.error('Failed to load topic thread');
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    fetchTopicDetails();
  }, [fetchTopicDetails]);

  // Real-time socket comment listener
  useEffect(() => {
    const handleNewComment = (payload) => {
      if (payload?.topicId === topicId && payload.comment) {
        setTopic((prev) => {
          if (!prev) return prev;
          if (prev.comments.some((c) => c._id === payload.comment._id)) return prev;
          return {
            ...prev,
            comments: [...prev.comments, payload.comment],
          };
        });
      }
    };

    socket.on('newTopicComment', handleNewComment);
    return () => {
      socket.off('newTopicComment', handleNewComment);
    };
  }, [topicId]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    const clean = commentText.trim();
    if (!clean) return;

    setPostingComment(true);
    try {
      const res = await api.post(`/api/topics/${topicId}/comments`, { content: clean });
      setTopic((prev) => {
        if (!prev) return prev;
        const newComments = [...(prev.comments || []), res.data];
        return { ...prev, comments: newComments };
      });
      setCommentText('');
      toast.success('Reply posted! ✍️');
      setTimeout(() => {
        commentsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Remove this reflection comment?')) return;
    try {
      await api.delete(`/api/topics/${topicId}/comments/${commentId}`);
      setTopic((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c._id !== commentId),
      }));
      toast.success('Comment removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete comment');
    }
  };

  const handleTogglePin = async () => {
    try {
      const res = await api.put(`/api/topics/${topicId}/pin`);
      setTopic((prev) => ({ ...prev, pinned: res.data?.topic?.pinned }));
      toast.success(res.data?.topic?.pinned ? 'Topic pinned to top' : 'Topic unpinned');
      onTopicPinToggled();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to toggle pin');
    }
  };

  const handleDeleteTopic = async () => {
    if (!window.confirm('Delete this entire discussion topic and its comments? This cannot be undone.')) return;
    try {
      await api.delete(`/api/topics/${topicId}`);
      toast.success('Topic removed');
      onTopicDeleted(topicId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete topic');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
        <p className="font-body-sm text-xs">Opening discussion thread...</p>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="w-full bg-surface-container-low rounded-2xl p-8 border border-outline-variant/15 text-center">
        <p className="text-outline text-xs">Discussion topic not found or has been removed.</p>
        <button
          onClick={onBack}
          className="mt-3 px-3 py-1.5 rounded-lg bg-surface-container text-primary font-label-sm text-xs cursor-pointer"
        >
          ← Return to Topics
        </button>
      </div>
    );
  }

  const isAuthor =
    topic.author?._id?.toString() === currentUserId?.toString() ||
    topic.author?.toString() === currentUserId?.toString();
  const authorName = topic.author?.username || topic.author?.name || 'Reader';

  return (
    <div className="w-full flex flex-col gap-space-md animate-fadeIn">
      {/* Top Nav Row */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-xs border border-outline-variant/20 transition-all cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to All Topics</span>
        </button>

        <div className="flex items-center gap-1.5">
          {isHost && (
            <button
              onClick={handleTogglePin}
              className={`p-2 rounded-xl text-xs font-label-sm transition-colors cursor-pointer border ${
                topic.pinned
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-surface-container text-outline hover:text-amber-400 border-outline-variant/20'
              }`}
              title={topic.pinned ? 'Unpin Topic' : 'Pin Topic to Top (Host Only)'}
            >
              <span className="material-symbols-outlined text-base">push_pin</span>
            </button>
          )}

          {(isAuthor || isHost) && (
            <button
              onClick={handleDeleteTopic}
              className="p-2 rounded-xl bg-surface-container hover:bg-error/15 text-outline hover:text-error border border-outline-variant/20 transition-colors cursor-pointer"
              title="Delete Topic (Author or Host)"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Topic Card */}
      <article className="w-full bg-surface-container-low rounded-2xl p-6 sm:p-7 border border-outline-variant/20 shadow-xl flex flex-col gap-4">
        {/* Header strip */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserAvatar user={topic.author} size="md" />
            <div className="flex flex-col">
              <span className="font-label-lg text-sm text-on-surface font-semibold">
                {authorName}
              </span>
              <span className="font-body-sm text-[11px] text-outline">
                {formatDate(topic.createdAt)}
              </span>
            </div>
          </div>

          {topic.pinned && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-label-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">push_pin</span>
              <span>Pinned</span>
            </span>
          )}
        </div>

        {/* Title & Body */}
        <div className="border-t border-outline-variant/15 pt-3.5 flex flex-col gap-2.5">
          <h1 className="font-headline-lg font-garamond text-2xl text-on-surface font-semibold leading-tight">
            {topic.title}
          </h1>
          <div className="font-body-md text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
            {topic.content}
          </div>
        </div>
      </article>

      {/* Comments Thread Section */}
      <section className="w-full bg-surface-container-low rounded-2xl p-5 sm:p-6 border border-outline-variant/20 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">comment</span>
            <h3 className="font-headline-sm font-garamond text-base text-on-surface font-semibold">
              Discussions & Replies
            </h3>
            <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-mono text-xs font-semibold">
              {topic.comments?.length || 0}
            </span>
          </div>
          <span className="text-[11px] text-outline font-label-sm">
            Club Discussions
          </span>
        </div>

        {/* Comments List */}
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
          {(!topic.comments || topic.comments.length === 0) ? (
            <div className="py-8 text-center text-outline">
              <span className="material-symbols-outlined text-2xl text-primary/60 mb-1">
                edit_note
              </span>
              <p className="text-xs">No replies shared on this topic yet.</p>
              <p className="text-[11px] text-outline/70 mt-0.5">
                Be the first member to share your thoughts below.
              </p>
            </div>
          ) : (
            topic.comments.map((comment) => {
              const isCommentAuthor =
                comment.author?._id?.toString() === currentUserId?.toString() ||
                comment.author?.toString() === currentUserId?.toString();
              const cName = comment.author?.username || comment.author?.name || 'Reader';

              return (
                <div
                  key={comment._id}
                  className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/15 flex flex-col gap-2 hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar user={comment.author} size="sm" className="w-6 h-6 text-[10px]" />
                      <span className="font-label-sm text-xs text-on-surface font-semibold">
                        {cName}
                        {isCommentAuthor && (
                          <span className="text-primary font-normal text-[10px] ml-1">(You)</span>
                        )}
                      </span>
                      <span className="text-[10px] text-outline">
                        • {formatDate(comment.createdAt)}
                      </span>
                    </div>

                    {(isCommentAuthor || isHost) && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-outline hover:text-error hover:bg-error/15 transition-all cursor-pointer"
                        title="Delete reflection"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    )}
                  </div>

                  <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap pl-8">
                    {comment.content}
                  </p>
                </div>
              );
            })
          )}
          <div ref={commentsBottomRef} />
        </div>

        {/* Comment Composition Box */}
        <form onSubmit={handlePostComment} className="flex flex-col gap-2.5 pt-3 border-t border-outline-variant/15">
          <label className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
            Add a Reply
          </label>
          <textarea
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts or cite a relevant excerpt..."
            className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs sm:text-sm p-3 rounded-xl focus:outline-none focus:border-primary transition-all resize-none shadow-inner"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={postingComment || !commentText.trim()}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-on-primary font-label-lg text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {postingComment ? 'hourglass_empty' : 'send'}
              </span>
              <span>{postingComment ? 'Posting...' : 'Post Reply'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

// ── MAIN DISCUSSIONS SECTION COMPONENT ────────────────────────
export default function DiscussionsSection({ clubId, isHost, currentUserId }) {
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchTopics = useCallback(async () => {
    try {
      const res = await api.get(`/api/topics/club/${clubId}`);
      setTopics(res.data || []);
    } catch {
      toast.error('Failed to load discussion topics');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // Real-time socket listener for new topics
  useEffect(() => {
    const handleNewTopic = (topic) => {
      if (topic) {
        setTopics((prev) => {
          if (prev.some((t) => t._id === topic._id)) return prev;
          return [topic, ...prev];
        });
      }
    };

    socket.on('newTopic', handleNewTopic);
    return () => {
      socket.off('newTopic', handleNewTopic);
    };
  }, []);

  const handleTogglePin = async (topicId) => {
    try {
      const res = await api.put(`/api/topics/${topicId}/pin`);
      setTopics((prev) =>
        prev
          .map((t) => (t._id === topicId ? { ...t, pinned: res.data?.topic?.pinned } : t))
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
      );
      toast.success(res.data?.topic?.pinned ? 'Topic pinned to top' : 'Topic unpinned');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to toggle pin');
    }
  };

  const handleDelete = async (topicId, topicTitle) => {
    if (!window.confirm(`Dissolve discussion topic "${topicTitle}"? All comments will be erased.`)) return;
    try {
      await api.delete(`/api/topics/${topicId}`);
      toast.success('Topic removed');
      setTopics((prev) => prev.filter((t) => t._id !== topicId));
      if (selectedTopicId === topicId) setSelectedTopicId(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete topic');
    }
  };

  const filteredTopics = topics.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.content?.toLowerCase().includes(q) ||
      t.author?.username?.toLowerCase().includes(q)
    );
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

  // If a topic is actively selected, show its full thread view
  if (selectedTopicId) {
    return (
      <TopicDetailView
        topicId={selectedTopicId}
        onBack={() => {
          setSelectedTopicId(null);
          fetchTopics();
        }}
        isHost={isHost}
        currentUserId={currentUserId}
        onTopicDeleted={() => {
          setSelectedTopicId(null);
          fetchTopics();
        }}
        onTopicPinToggled={fetchTopics}
      />
    );
  }

  if (loading) {
    return (
      <div className="w-full bg-surface-container-low rounded-2xl p-8 border border-outline-variant/15 flex flex-col items-center justify-center text-outline">
        <span className="material-symbols-outlined text-3xl text-primary animate-spin mb-2">
          progress_activity
        </span>
        <p className="font-body-sm text-xs">Loading club discussions...</p>
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
              <span className="material-symbols-outlined text-base">forum</span>
            </div>
            <h2 className="font-headline-sm font-garamond text-xl text-on-surface font-semibold">
              Discussion Topics
            </h2>
            <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-mono text-xs font-semibold">
              {topics.length}
            </span>
          </div>
          <p className="font-body-sm text-xs text-outline mt-0.5">
            Structured, in-depth threads for chapter analysis, thematic debates, and book reflections.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search topics input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics..."
              className="w-44 sm:w-56 bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-outline/50 font-body-sm text-xs px-3 py-1.5 pl-8 rounded-xl focus:outline-none focus:border-primary transition-all"
            />
            <span className="material-symbols-outlined text-outline text-sm absolute left-2.5 top-2 pointer-events-none">
              search
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>

          {/* Member Action: Start Discussion (All members can start topics!) */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Start Topic</span>
          </button>
        </div>
      </div>

      {/* Topics Directory */}
      {filteredTopics.length === 0 ? (
        <div className="w-full bg-surface-container-low rounded-2xl p-10 border border-outline-variant/15 flex flex-col items-center justify-center text-center text-outline">
          <div className="w-14 h-14 rounded-2xl bg-surface-container border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner">
            <span className="material-symbols-outlined text-2xl">forum</span>
          </div>
          <h3 className="font-headline-sm font-garamond text-lg text-on-surface font-semibold mb-1">
            {searchQuery ? 'No matching discussion topics found' : 'No Discussion Topics Yet'}
          </h3>
          <p className="font-body-sm text-xs text-outline max-w-md leading-relaxed mb-4">
            {searchQuery
              ? 'Try modifying your search keywords or clear the filter.'
              : 'Open a dedicated thread to debate a specific chapter, question the ending, or reflect on literary themes.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-secondary text-on-primary font-label-sm text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">post_add</span>
            <span>Start First Topic</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredTopics.map((topic) => {
            const author = topic.author;
            const authorName = author?.username || author?.name || 'Reader';
            const isAuthor =
              author?._id?.toString() === currentUserId?.toString() ||
              author?.toString() === currentUserId?.toString();

            return (
              <div
                key={topic._id}
                onClick={() => setSelectedTopicId(topic._id)}
                className={`w-full bg-surface-container-low rounded-2xl p-4 sm:p-5 border shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-all cursor-pointer group ${
                  topic.pinned
                    ? 'border-amber-500/30 bg-surface-container-low/90 relative overflow-hidden'
                    : 'border-outline-variant/20'
                }`}
              >
                {/* Pinned left accent bar */}
                {topic.pinned && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                )}

                {/* Left Content Area */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <UserAvatar user={author} size="sm" className="mt-0.5 shrink-0" />

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {topic.pinned && (
                        <span className="px-2 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-label-sm text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">push_pin</span>
                          <span>Pinned</span>
                        </span>
                      )}
                      <span className="font-label-sm text-xs text-on-surface font-semibold">
                        {authorName}
                      </span>
                      <span className="text-outline text-xs">•</span>
                      <span className="font-body-sm text-[11px] text-outline">
                        {formatDate(topic.createdAt)}
                      </span>
                    </div>

                    <h3 className="font-headline-sm font-garamond text-base sm:text-lg text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                      {topic.title}
                    </h3>

                    <p className="font-body-sm text-xs text-on-surface-variant line-clamp-1 leading-relaxed mt-0.5">
                      {topic.content}
                    </p>
                  </div>
                </div>

                {/* Right Meta & Actions */}
                <div
                  className="flex items-center gap-2 self-end sm:self-center shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Comments Count Pill */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-outline group-hover:text-primary group-hover:border-primary/30 transition-all"
                    title="Discussion reflections"
                  >
                    <span className="material-symbols-outlined text-sm">comment</span>
                    <span className="font-mono font-semibold">{topic.commentCount || 0}</span>
                  </div>

                  {/* Host Pin/Unpin */}
                  {isHost && (
                    <button
                      onClick={() => handleTogglePin(topic._id)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        topic.pinned
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'text-outline hover:text-amber-400 border-transparent hover:bg-surface-container'
                      }`}
                      title={topic.pinned ? 'Unpin Topic' : 'Pin to Top'}
                    >
                      <span className="material-symbols-outlined text-base">push_pin</span>
                    </button>
                  )}

                  {/* Author or Host Delete */}
                  {(isAuthor || isHost) && (
                    <button
                      onClick={() => handleDelete(topic._id, topic.title)}
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/15 transition-colors cursor-pointer"
                      title="Delete Topic"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  )}

                  <span className="material-symbols-outlined text-outline group-hover:text-primary text-base transition-colors hidden sm:inline">
                    chevron_right
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showCreateModal && (
        <CreateTopicModal
          clubId={clubId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTopics();
          }}
        />
      )}
    </div>
  );
}
