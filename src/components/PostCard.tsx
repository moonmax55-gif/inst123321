import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Flag,
  Heart,
  ImageOff,
  Lock,
  MessageCircle,
  Pin,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { fetchJson } from '../lib/api';
import { checkInternetEthics } from '../shared/ethics';
import { ClassUser, FeedPost } from '../types';
import { Avatar } from './Avatar';

interface PostCardProps {
  post: FeedPost;
  currentUser: ClassUser | null;
  isTeacherMode: boolean;
  getAuthHeaders: () => Promise<Record<string, string>>;
  onRefresh: () => Promise<void>;
  onRequireLogin: () => void;
}

const NOTE_THEMES: Record<string, string> = {
  cobalt: 'from-blue-600 via-blue-700 to-blue-800',
  sky: 'from-sky-500 via-blue-600 to-blue-700',
  ocean: 'from-cyan-600 via-blue-700 to-blue-900',
  indigo: 'from-blue-800 via-indigo-800 to-slate-900',
};

function formatKoreanTime(iso: string) {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

export function PostCard({
  post,
  currentUser,
  isTeacherMode,
  getAuthHeaders,
  onRefresh,
  onRequireLogin,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(post.comments.length > 0);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const [imgBroken, setImgBroken] = useState(false);
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const [showTeacherBox, setShowTeacherBox] = useState(false);
  const [teacherNoteInput, setTeacherNoteInput] = useState(post.teacherNote || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const commentEthics = useMemo(() => checkInternetEthics(commentText), [commentText]);
  const isOwner = currentUser?.id === post.authorId;
  const canDelete = isOwner || isTeacherMode;

  const handleToggleLike = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        await onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    setCommentError(null);
    if (!commentEthics.passed) {
      setCommentError(commentEthics.issues[0]?.guidance || '인터넷 윤리 기준을 확인해 주세요.');
      return;
    }

    setSubmittingComment(true);
    try {
      const headers = await getAuthHeaders();
      await fetchJson(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: commentText.trim() }),
      });
      setCommentText('');
      setShowComments(true);
      await onRefresh();
    } catch (err: unknown) {
      setCommentError(err instanceof Error ? err.message : '댓글을 올리지 못했습니다.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) await onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (!reportReason.trim()) return;
    setBusy(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/posts/${post.id}/report`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      if (res.ok) {
        setReportReason('');
        setReportSuccess(true);
        setTimeout(() => {
          setShowReportBox(false);
          setReportSuccess(false);
        }, 1600);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleTeacherModerate = async (updates: {
    status?: 'active' | 'hidden';
    isPinned?: boolean;
    teacherNote?: string | null;
  }) => {
    setBusy(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/posts/${post.id}/moderate`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setShowTeacherBox(false);
        await onRefresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePost = async () => {
    setBusy(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        await onRefresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const themeGradient = NOTE_THEMES[post.cardTheme] || NOTE_THEMES.cobalt;

  return (
    <article
      className={`bg-white rounded-2xl shadow-lg shadow-blue-950/15 overflow-hidden border ${
        post.visibility === 'secret'
          ? 'border-blue-300 ring-1 ring-blue-300/60'
          : 'border-blue-100/80'
      }`}
    >
      {/* Card Header */}
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            name={post.authorName}
            color={post.authorAvatarColor}
            role={post.authorRole}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 truncate">
              <span className="truncate">{post.authorName}</span>
              {post.authorRole === 'teacher' && (
                <span className="text-xs font-semibold text-blue-700 shrink-0">· 담임선생님</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              {post.authorRole === 'student' && post.authorStudentNumber && (
                <>
                  <span className="tabular-nums">{post.authorStudentNumber}번</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>{formatKoreanTime(post.createdAt)}</span>
              {post.visibility === 'secret' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                    <Lock className="w-3 h-3" />
                    비밀글 (나와 선생님만)
                  </span>
                </>
              )}
              {post.isPinned && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                    <Pin className="w-3 h-3" />
                    상단 고정
                  </span>
                </>
              )}
              {post.status === 'hidden' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                    <EyeOff className="w-3 h-3" />
                    선생님이 숨김 처리함
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isTeacherMode && (
            <button
              type="button"
              onClick={() => setShowTeacherBox((v) => !v)}
              className="min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              교사 관리
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete((v) => !v)}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              aria-label="게시글 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Inline Delete Confirm */}
      {confirmDelete && (
        <div className="mx-5 mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-rose-900">이 게시글을 정말 삭제할까요?</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleDeletePost}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700"
            >
              삭제
            </button>
          </div>
        </div>
      )}

      {/* Teacher Moderation Drawer */}
      {isTeacherMode && showTeacherBox && (
        <div className="mx-5 mb-4 p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-blue-900">선생님 게시물 관리</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleTeacherModerate({ isPinned: !post.isPinned })}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-blue-200 text-blue-800 hover:bg-blue-100"
              >
                <Pin className="w-3.5 h-3.5" />
                {post.isPinned ? '고정 해제' : '상단 고정'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  handleTeacherModerate({
                    status: post.status === 'active' ? 'hidden' : 'active',
                    teacherNote: teacherNoteInput.trim() || null,
                  })
                }
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                  post.status === 'active'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {post.status === 'active' ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    숨기기
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    다시 공개
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={teacherNoteInput}
              onChange={(e) => setTeacherNoteInput(e.target.value)}
              placeholder="학생에게 전할 선생님 말씀 / 숨김 안내 사유"
              className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                handleTeacherModerate({ teacherNote: teacherNoteInput.trim() || null })
              }
              className="px-3 py-2 rounded-xl bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 whitespace-nowrap"
            >
              안내 저장
            </button>
          </div>
        </div>
      )}

      {/* Photo Stage OR Blue Editorial Text Card */}
      {post.imageUrl ? (
        !imgBroken ? (
          <div className="bg-blue-950/5 border-y border-slate-100">
            <img
              src={post.imageUrl}
              alt={`${post.authorName}님의 학급 사진`}
              className="w-full max-h-[520px] object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImgBroken(true)}
            />
          </div>
        ) : (
          <div className="h-56 bg-gradient-to-br from-blue-50 to-sky-100 border-y border-blue-100 flex flex-col items-center justify-center gap-2 text-blue-700 p-6">
            <ImageOff className="w-8 h-8 opacity-60" />
            <p className="text-xs font-medium">사진을 불러오지 못했어요</p>
          </div>
        )
      ) : (
        <div
          className={`bg-gradient-to-br ${themeGradient} px-7 py-10 text-white flex flex-col justify-center min-h-[190px]`}
        >
          {post.visibility === 'secret' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-200 mb-3">
              <Lock className="w-3.5 h-3.5" />
              <span>선생님에게만 전하는 비밀 이야기</span>
            </div>
          )}
          <p className="text-lg sm:text-xl font-semibold leading-relaxed whitespace-pre-wrap break-words">
            {post.caption}
          </p>
        </div>
      )}

      {/* Interaction Row */}
      <div className="px-5 pt-3.5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleToggleLike}
            className={`min-h-[40px] inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
              post.likedByMe ? 'text-rose-600' : 'text-slate-700 hover:text-blue-700'
            }`}
            aria-label="좋아요"
          >
            <Heart className={`w-5 h-5 ${post.likedByMe ? 'fill-rose-600' : ''}`} />
            <span className="tabular-nums">{post.likeCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="min-h-[40px] inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-blue-700 transition-colors"
            aria-label="댓글 보기"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="tabular-nums">{post.comments.length}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            윤리 확인됨
          </span>
          {post.visibility === 'public' && !isOwner && (
            <button
              type="button"
              onClick={() => setShowReportBox((v) => !v)}
              className="min-h-[36px] inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-amber-700 transition-colors"
              title="인터넷 윤리 확인 요청"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>도움 요청</span>
            </button>
          )}
        </div>
      </div>

      {/* Caption (shown below image when imageUrl exists) */}
      {post.imageUrl && (
        <div className="px-5 pb-3">
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
            <span className="font-bold text-slate-900 mr-2">{post.authorName}</span>
            {post.caption}
          </p>
        </div>
      )}

      {/* Teacher Note / Guidance Box */}
      {post.teacherNote && (
        <div className="mx-5 mb-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
          <p className="text-xs font-bold text-blue-800 mb-0.5">선생님 말씀</p>
          <p className="text-xs text-slate-700 leading-relaxed">{post.teacherNote}</p>
        </div>
      )}

      {/* Report Drawer */}
      {showReportBox && (
        <form
          onSubmit={handleReportSubmit}
          className="mx-5 mb-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2"
        >
          <p className="text-xs font-semibold text-amber-950">
            불편하거나 인터넷 윤리에 어긋나는 내용이 있나요? 선생님께 조용히 알려드릴게요.
          </p>
          {reportSuccess ? (
            <p className="text-xs font-semibold text-blue-700">
              선생님께 확인 요청이 안전하게 전달되었습니다.
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="예: 친구 동의 없이 찍힌 사진 같아요"
                className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 whitespace-nowrap"
              >
                전달하기
              </button>
            </div>
          )}
        </form>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="px-5 pb-4 pt-2 border-t border-slate-100 bg-slate-50/60 space-y-3">
          {post.comments.length === 0 ? (
            <p className="text-xs text-slate-400 py-1">
              아직 댓글이 없어요. 친구를 응원하는 고운 댓글을 남겨보세요!
            </p>
          ) : (
            <ul className="space-y-2">
              {post.comments.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <Avatar
                      name={c.authorName}
                      color={c.authorAvatarColor}
                      role={c.authorRole}
                      size="sm"
                    />
                    <div className="min-w-0 pt-0.5">
                      <span className="font-bold text-slate-900 mr-1.5">{c.authorName}</span>
                      <span className="text-slate-700 break-words">{c.content}</span>
                      <span className="text-[11px] text-slate-400 ml-2">
                        {formatKoreanTime(c.createdAt)}
                      </span>
                    </div>
                  </div>
                  {(currentUser?.id === c.authorId || isTeacherMode) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 shrink-0"
                      aria-label="댓글 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleCommentSubmit} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={400}
                value={commentText}
                onChange={(e) => {
                  setCommentText(e.target.value);
                  setCommentError(null);
                }}
                placeholder={
                  currentUser
                    ? '고운 말로 댓글을 남겨보세요...'
                    : '로그인 후 따뜻한 댓글을 남길 수 있어요'
                }
                onFocus={() => {
                  if (!currentUser) onRequireLogin();
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="min-h-[36px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>등록</span>
              </button>
            </div>
            {commentText.trim().length > 0 && !commentEthics.passed && (
              <p className="text-xs text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{commentEthics.issues[0]?.guidance}</span>
              </p>
            )}
            {commentError && (
              <p className="text-xs text-rose-700 font-medium">{commentError}</p>
            )}
          </form>
        </div>
      )}
    </article>
  );
}
