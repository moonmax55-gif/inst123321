import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  Lock,
  Megaphone,
  MessageSquareHeart,
  Pin,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { ClassNotice, ClassUser, FeedPost, PostReport } from '../types';
import { Avatar } from './Avatar';

interface TeacherDashboardProps {
  posts: FeedPost[];
  roster: ClassUser[];
  notices: ClassNotice[];
  currentUser: ClassUser;
  getAuthHeaders: () => Promise<Record<string, string>>;
  onRefresh: () => Promise<void>;
}

type AdminTab = 'secrets' | 'posts' | 'reports' | 'roster';

export function TeacherDashboard({
  posts,
  roster,
  notices,
  currentUser,
  getAuthHeaders,
  onRefresh,
}: TeacherDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('secrets');
  const [reports, setReports] = useState<PostReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const secretPosts = posts.filter((p) => p.visibility === 'secret');
  const hiddenPosts = posts.filter((p) => p.status === 'hidden');
  const openReports = reports.filter((r) => r.status === 'open');

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/reports', { headers });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } finally {
      setLoadingReports(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const showFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 3000);
  };

  const handleSaveTeacherReply = async (postId: number) => {
    const note = (replyDrafts[postId] || '').trim();
    if (!note) return;
    setBusyId(postId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/posts/${postId}/moderate`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ teacherNote: note }),
      });
      if (res.ok) {
        await onRefresh();
        showFeedback('학생에게 선생님 답글을 남겼습니다.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePostStatus = async (post: FeedPost) => {
    setBusyId(post.id);
    try {
      const headers = await getAuthHeaders();
      const nextStatus = post.status === 'active' ? 'hidden' : 'active';
      const res = await fetch(`/api/posts/${post.id}/moderate`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: nextStatus,
          teacherNote:
            nextStatus === 'hidden' && !post.teacherNote
              ? '인터넷 윤리 안내를 위해 선생님이 잠시 비공개로 전환했어요.'
              : post.teacherNote,
        }),
      });
      if (res.ok) {
        await onRefresh();
        await fetchReports();
        showFeedback(nextStatus === 'hidden' ? '게시물을 숨김 처리했습니다.' : '게시물을 다시 공개했습니다.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePin = async (post: FeedPost) => {
    setBusyId(post.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/posts/${post.id}/moderate`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isPinned: !post.isPinned }),
      });
      if (res.ok) {
        await onRefresh();
        showFeedback(!post.isPinned ? '게시물을 상단에 고정했습니다.' : '고정을 해제했습니다.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDeletePost = async (postId: number) => {
    setBusyId(postId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        await onRefresh();
        await fetchReports();
        showFeedback('게시물을 삭제했습니다.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleResolveReport = async (reportId: number, status: 'open' | 'resolved') => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchReports();
        showFeedback('확인 요청 상태를 변경했습니다.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleMute = async (member: ClassUser) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/users/${member.id}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isMuted: !member.isMuted }),
      });
      if (res.ok) {
        await onRefresh();
        showFeedback(
          !member.isMuted
            ? `${member.displayName} 학생의 글쓰기를 잠시 제한했습니다.`
            : `${member.displayName} 학생의 글쓰기 제한을 해제했습니다.`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: noticeTitle.trim(),
          content: noticeContent.trim(),
        }),
      });
      if (res.ok) {
        setNoticeTitle('');
        setNoticeContent('');
        await onRefresh();
        showFeedback('새 학급 알림장을 등록했습니다.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotice = async (id: number) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/notices/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        await onRefresh();
        showFeedback('알림장을 삭제했습니다.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="space-y-5">
      {/* Teacher Header Summary */}
      <div className="bg-white rounded-2xl shadow-lg shadow-blue-950/15 border border-blue-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">선생님 학급 관리실</h2>
            <p className="text-xs text-slate-500 mt-1">
              학생들의 비밀글을 확인하고, 게시물 공개 상태와 인터넷 윤리 신고를 관리할 수 있어요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 tabular-nums">
            <span>
              전체 글 <strong className="text-blue-700">{posts.length}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              비밀글 <strong className="text-blue-700">{secretPosts.length}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              숨김 <strong className="text-amber-700">{hiddenPosts.length}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              미처리 신고 <strong className="text-rose-700">{openReports.length}</strong>
            </span>
          </div>
        </div>

        {/* Segmented Tab Controls */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-blue-50 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('secrets')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
              tab === 'secrets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/70'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>비밀글함 ({secretPosts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('posts')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
              tab === 'posts'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/70'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>게시물 관리 ({posts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('reports')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
              tab === 'reports'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/70'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>윤리 신고 ({openReports.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('roster')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
              tab === 'roster'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/70'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>학생 · 알림장</span>
          </button>
        </div>

        {feedbackBanner && (
          <div className="mt-4 rounded-xl bg-sky-50 border border-sky-200 px-4 py-2.5 text-xs font-semibold text-blue-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
        )}
      </div>

      {/* Tab 1: Secret Posts Inbox */}
      {tab === 'secrets' && (
        <div className="space-y-4">
          {secretPosts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-slate-500 border border-blue-100">
              아직 도착한 학생 비밀글이 없습니다.
            </div>
          ) : (
            secretPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-2xl shadow-md border border-blue-200 p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={post.authorName}
                      color={post.authorAvatarColor}
                      role={post.authorRole}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {post.authorName}
                        {post.authorStudentNumber ? ` · ${post.authorStudentNumber}번` : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(post.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                    <Lock className="w-3.5 h-3.5" />
                    비밀글
                  </span>
                </div>

                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-blue-50/70 rounded-xl p-4">
                  {post.caption}
                </p>

                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="비밀글 첨부 사진"
                    className="max-h-56 rounded-xl object-cover border border-blue-100"
                    referrerPolicy="no-referrer"
                  />
                )}

                {post.teacherNote && (
                  <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-2.5 text-xs text-slate-800">
                    <strong className="text-blue-800 mr-1.5">보낸 답글:</strong>
                    {post.teacherNote}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={replyDrafts[post.id] ?? post.teacherNote ?? ''}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    placeholder="학생에게 따뜻하고 비밀스러운 선생님 답글 남기기..."
                    className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    disabled={busyId === post.id}
                    onClick={() => handleSaveTeacherReply(post.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold whitespace-nowrap"
                  >
                    <MessageSquareHeart className="w-3.5 h-3.5" />
                    답글 저장
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: All Posts Moderation */}
      {tab === 'posts' && (
        <div className="bg-white rounded-2xl shadow-md border border-blue-100 divide-y divide-slate-100 overflow-hidden">
          {posts.map((post) => (
            <div key={post.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900">{post.authorName}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">
                    {post.visibility === 'secret' ? '비밀글' : '전체 공개'}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className={post.status === 'hidden' ? 'font-semibold text-amber-700' : 'text-blue-700 font-medium'}>
                    {post.status === 'hidden' ? '숨김 상태' : '정상 게시'}
                  </span>
                  {post.isPinned && (
                    <>
                      <span className="text-slate-400">·</span>
                      <span className="text-sky-700 font-semibold">고정됨</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">{post.caption}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busyId === post.id}
                  onClick={() => handleTogglePin(post)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <Pin className="w-3.5 h-3.5" />
                  {post.isPinned ? '고정해제' : '고정'}
                </button>
                <button
                  type="button"
                  disabled={busyId === post.id}
                  onClick={() => handleTogglePostStatus(post)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap ${
                    post.status === 'active'
                      ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
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
                      공개
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={busyId === post.id}
                  onClick={() => handleDeletePost(post.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  aria-label="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Ethics Reports */}
      {tab === 'reports' && (
        <div className="bg-white rounded-2xl shadow-md border border-blue-100 divide-y divide-slate-100">
          {loadingReports ? (
            <div className="p-8 text-center text-sm text-slate-500">신고 내역을 불러오는 중...</div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              접수된 인터넷 윤리 확인 요청이 없습니다. 우리 반이 평화롭네요!
            </div>
          ) : (
            reports.map((rep) => (
              <div key={rep.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <ShieldAlert className={`w-4 h-4 ${rep.status === 'open' ? 'text-amber-600' : 'text-blue-600'}`} />
                    <span className="font-bold text-slate-900">요청자: {rep.reporterName}</span>
                    <span className="text-slate-400">·</span>
                    <span className={rep.status === 'open' ? 'font-semibold text-amber-700' : 'text-slate-500'}>
                      {rep.status === 'open' ? '확인 필요' : '처리 완료'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">사유: {rep.reason}</p>
                  <p className="text-xs text-slate-500 truncate">대상 글: {rep.postCaption}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleResolveReport(rep.id, rep.status === 'open' ? 'resolved' : 'open')
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
                      rep.status === 'open'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {rep.status === 'open' ? '처리 완료 표시' : '다시 열기'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Roster & Class Notice */}
      {tab === 'roster' && (
        <div className="grid grid-cols-1 gap-5">
          {/* Publish Class Notice */}
          <form
            onSubmit={handleCreateNotice}
            className="bg-white rounded-2xl shadow-md border border-blue-100 p-5 space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Megaphone className="w-4 h-4 text-blue-600" />
              <span>새 학급 알림장 작성</span>
            </div>
            <input
              type="text"
              required
              maxLength={80}
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.target.value)}
              placeholder="알림장 제목 (예: 이번 주 현장체험학습 안내)"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <textarea
              required
              rows={3}
              maxLength={600}
              value={noticeContent}
              onChange={(e) => setNoticeContent(e.target.value)}
              placeholder="학급 공지 내용을 입력해 주세요..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                알림장 올리기
              </button>
            </div>

            {notices.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-500">등록된 알림장</p>
                {notices.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-blue-50/70 px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{n.title}</p>
                      <p className="text-slate-600 truncate">{n.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNotice(n.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 shrink-0"
                      aria-label="공지 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* Class Roster */}
          <div className="bg-white rounded-2xl shadow-md border border-blue-100 divide-y divide-slate-100 overflow-hidden">
            <div className="px-5 py-3.5 bg-blue-50/60 text-xs font-bold text-blue-900">
              우리 반 구성원 ({roster.length}명)
            </div>
            {roster.map((member) => (
              <div key={member.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={member.displayName}
                    color={member.avatarColor}
                    role={member.role}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {member.displayName}
                      {member.role === 'teacher' ? ' · 선생님' : ''}
                      {member.studentNumber ? ` · ${member.studentNumber}번` : ''}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {member.isMuted ? '글쓰기 잠시 제한됨' : '활동 가능'}
                      {member.ethicsAgreed ? ' · 윤리 약속 서약 완료' : ''}
                    </p>
                  </div>
                </div>

                {member.id !== currentUser.id && member.role === 'student' && (
                  <button
                    type="button"
                    onClick={() => handleToggleMute(member)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap ${
                      member.isMuted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900'
                    }`}
                  >
                    {member.isMuted ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        제한 해제
                      </>
                    ) : (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        글쓰기 제한
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
