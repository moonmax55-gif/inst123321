import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Camera,
  Eye,
  Home,
  Lock,
  LogIn,
  LogOut,
  Megaphone,
  Plus,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Avatar } from './components/Avatar';
import { CreatePostModal } from './components/CreatePostModal';
import { EthicsModal } from './components/EthicsModal';
import { PostCard } from './components/PostCard';
import { ProfileModal } from './components/ProfileModal';
import { TeacherDashboard } from './components/TeacherDashboard';
import { useAuth } from './contexts/AuthContext';
import { INTERNET_ETHICS_PRINCIPLES } from './shared/ethics';
import { ClassNotice, ClassUser, FeedPost } from './types';

type MainView = 'feed' | 'secrets' | 'roster' | 'teacher';
type MediaFilter = 'all' | 'photo' | 'text';

export default function App() {
  const {
    dbUser,
    loading: authLoading,
    authError,
    signInWithGoogle,
    logout,
    getAuthHeaders,
    setDbUser,
  } = useAuth();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [notices, setNotices] = useState<ClassNotice[]>([]);
  const [roster, setRoster] = useState<ClassUser[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<MainView>('feed');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [studentPreviewMode, setStudentPreviewMode] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultVisibility, setCreateDefaultVisibility] = useState<'public' | 'secret'>('public');
  const [ethicsOpen, setEthicsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isEffectiveTeacher = dbUser?.role === 'teacher' && !studentPreviewMode;

  const loadFeedData = useCallback(async () => {
    setDataError(null);
    try {
      if (dbUser) {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/posts', { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '피드를 불러오지 못했습니다.');
        setPosts(data.posts || []);
        setNotices(data.notices || []);
        setRoster(data.roster || []);
      } else {
        const res = await fetch('/api/public-feed');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '피드를 불러오지 못했습니다.');
        setPosts(data.posts || []);
        setNotices(data.notices || []);
        setRoster(data.roster || []);
      }
    } catch (err: unknown) {
      setDataError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
    } finally {
      setDataLoading(false);
    }
  }, [dbUser, getAuthHeaders]);

  useEffect(() => {
    if (!authLoading) {
      loadFeedData();
    }
  }, [authLoading, loadFeedData]);

  const visiblePosts = useMemo(() => {
    return posts.filter((post) => {
      if (studentPreviewMode && dbUser?.role === 'teacher') {
        if (post.visibility === 'secret' && post.authorId !== dbUser.id) return false;
        if (post.status === 'hidden' && post.authorId !== dbUser.id) return false;
      }

      if (activeView === 'secrets') {
        if (post.visibility !== 'secret') return false;
      } else if (activeView === 'feed') {
        if (post.visibility === 'secret') return false;
      }

      if (mediaFilter === 'photo' && !post.imageUrl) return false;
      if (mediaFilter === 'text' && post.imageUrl) return false;
      if (selectedAuthorId !== null && post.authorId !== selectedAuthorId) return false;

      return true;
    });
  }, [posts, activeView, mediaFilter, selectedAuthorId, studentPreviewMode, dbUser]);

  const secretCount = useMemo(
    () =>
      posts.filter((p) => {
        if (p.visibility !== 'secret') return false;
        if (studentPreviewMode && dbUser) return p.authorId === dbUser.id;
        return true;
      }).length,
    [posts, studentPreviewMode, dbUser]
  );

  const openCreateModal = (visibility: 'public' | 'secret' = 'public') => {
    if (!dbUser) {
      signInWithGoogle();
      return;
    }
    setCreateDefaultVisibility(visibility);
    setCreateOpen(true);
  };

  const handleAgreeEthics = async () => {
    if (!dbUser) return;
    const headers = await getAuthHeaders();
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ethicsAgreed: true }),
    });
    if (res.ok) {
      const data = await res.json();
      setDbUser(data.user);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-40 bg-blue-950/45 backdrop-blur-md border-b border-white/15 text-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setActiveView('feed');
              setSelectedAuthorId(null);
            }}
            className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
          >
            푸른별 학급그램
          </button>

          {/* Zone 2: 4 Single-line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-blue-100">
            <button
              type="button"
              onClick={() => setActiveView('feed')}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                activeView === 'feed'
                  ? 'text-white border-white font-semibold'
                  : 'border-transparent hover:text-white hover:border-white/50'
              }`}
            >
              우리 반 피드
            </button>
            <button
              type="button"
              onClick={() => setActiveView('secrets')}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                activeView === 'secrets'
                  ? 'text-white border-white font-semibold'
                  : 'border-transparent hover:text-white hover:border-white/50'
              }`}
            >
              비밀글함
            </button>
            <button
              type="button"
              onClick={() => setEthicsOpen(true)}
              className="py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 border-transparent hover:text-white hover:border-white/50"
            >
              윤리 약속
            </button>
            {isEffectiveTeacher ? (
              <button
                type="button"
                onClick={() => setActiveView('teacher')}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                  activeView === 'teacher'
                    ? 'text-white border-white font-semibold'
                    : 'border-transparent hover:text-white hover:border-white/50'
                }`}
              >
                선생님 관리
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveView('roster')}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                  activeView === 'roster'
                    ? 'text-white border-white font-semibold'
                    : 'border-transparent hover:text-white hover:border-white/50'
                }`}
              >
                학급 친구들
              </button>
            )}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            {dbUser ? (
              <button
                type="button"
                onClick={() => openCreateModal(activeView === 'secrets' ? 'secret' : 'public')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-blue-800 hover:bg-blue-50 text-xs font-bold shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>새 글 올리기</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-blue-800 hover:bg-blue-50 text-xs font-bold shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>Google 로그인</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Canvas (Blue Overall Background) */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-12">
        {authError && (
          <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 px-5 py-3 text-xs font-medium text-rose-800">
            {authError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Rail: Identity, Role Switcher, Feed Filters */}
          <aside className="lg:col-span-3 space-y-5">
            {/* Profile / Sign-In Card */}
            <div className="bg-white rounded-2xl shadow-lg shadow-blue-950/15 border border-blue-100 p-5 space-y-4">
              {dbUser ? (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={dbUser.displayName}
                      color={dbUser.avatarColor}
                      role={dbUser.role}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900 truncate">
                        {dbUser.displayName}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {dbUser.role === 'teacher' ? '담임 선생님' : '학급 학생'}
                        {dbUser.studentNumber ? ` · ${dbUser.studentNumber}번` : ''}
                      </p>
                    </div>
                  </div>

                  {dbUser.bio && (
                    <p className="text-xs text-slate-600 leading-relaxed">{dbUser.bio}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-center tabular-nums">
                    <div>
                      <p className="text-base font-bold text-blue-700">
                        {posts.filter((p) => p.authorId === dbUser.id && p.visibility === 'public').length}
                      </p>
                      <p className="text-[11px] text-slate-500">내 공개 글</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-blue-900">
                        {posts.filter((p) => p.authorId === dbUser.id && p.visibility === 'secret').length}
                      </p>
                      <p className="text-[11px] text-slate-500">내 비밀글</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setProfileOpen(true)}
                      className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>프로필 · 번호 설정</span>
                    </button>

                    {dbUser.role === 'teacher' && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = !studentPreviewMode;
                          setStudentPreviewMode(next);
                          if (next && activeView === 'teacher') {
                            setActiveView('feed');
                          }
                        }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                          studentPreviewMode
                            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{studentPreviewMode ? '선생님 모드로 복귀' : '학생 시점 미리보기'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={logout}
                      className="w-full py-2 px-3 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>로그아웃</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-slate-900">우리 반 푸른별 공간</h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Google 계정으로 로그인하면 사진과 글을 올리고, 선생님과 둘만 보는 비밀글도 작성할 수 있어요.
                  </p>
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Google로 시작하기</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Navigation & Filters */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-lg shadow-blue-950/15 border border-blue-100 p-4 space-y-1.5">
              <p className="px-2 pb-1 text-xs font-bold text-slate-500">이야기 모아보기</p>
              <button
                type="button"
                onClick={() => {
                  setActiveView('feed');
                  setMediaFilter('all');
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeView === 'feed' && mediaFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-blue-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  전체 우리 반 피드
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('feed');
                  setMediaFilter('photo');
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeView === 'feed' && mediaFilter === 'photo'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-blue-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  사진 이야기만 보기
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('feed');
                  setMediaFilter('text');
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeView === 'feed' && mediaFilter === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-blue-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  파랑 글 카드 보기
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('secrets')}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  activeView === 'secrets'
                    ? 'bg-blue-900 text-white'
                    : 'text-slate-700 hover:bg-blue-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  비밀글함 (선생님과 나)
                </span>
                {dbUser && <span className="tabular-nums text-[11px] opacity-80">{secretCount}</span>}
              </button>
            </div>
          </aside>

          {/* Center Column: Feed / Secret Inbox / Teacher Console */}
          <section className="lg:col-span-6 space-y-5">
            {activeView === 'teacher' && isEffectiveTeacher && dbUser ? (
              <TeacherDashboard
                posts={posts}
                roster={roster}
                notices={notices}
                currentUser={dbUser}
                getAuthHeaders={getAuthHeaders}
                onRefresh={loadFeedData}
              />
            ) : activeView === 'roster' ? (
              <div className="bg-white rounded-2xl shadow-lg shadow-blue-950/15 border border-blue-100 divide-y divide-slate-100 overflow-hidden">
                <div className="px-6 py-4 bg-blue-50/70 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">우리 반 구성원</h2>
                  <span className="text-xs font-semibold text-blue-700 tabular-nums">
                    총 {roster.length}명
                  </span>
                </div>
                {roster.map((member) => (
                  <div key={member.id} className="px-6 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={member.displayName}
                        color={member.avatarColor}
                        role={member.role}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {member.displayName}
                          {member.role === 'teacher' ? ' · 담임선생님' : ''}
                          {member.studentNumber ? ` · ${member.studentNumber}번` : ''}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {member.bio || '반가워요! 고운 말로 함께 소통해요.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAuthorId(member.id);
                        setActiveView('feed');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold whitespace-nowrap"
                    >
                      게시글 보기
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Classmates Instagram-style Story Ribbon */}
                <div className="bg-white rounded-2xl shadow-lg shadow-blue-950/15 border border-blue-100 px-4 py-3.5">
                  <div className="flex items-center gap-4 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedAuthorId(null)}
                      className="flex flex-col items-center gap-1.5 shrink-0 group"
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          selectedAuthorId === null
                            ? 'bg-blue-600 text-white ring-2 ring-offset-2 ring-blue-600'
                            : 'bg-blue-100 text-blue-800 group-hover:bg-blue-200'
                        }`}
                      >
                        전체
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                        모두 보기
                      </span>
                    </button>

                    {roster.map((member) => {
                      const active = selectedAuthorId === member.id;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() =>
                            setSelectedAuthorId(active ? null : member.id)
                          }
                          className="flex flex-col items-center gap-1.5 shrink-0"
                        >
                          <div
                            className={`p-0.5 rounded-full transition-all ${
                              active
                                ? 'ring-2 ring-blue-600 ring-offset-2'
                                : 'ring-2 ring-sky-300/70'
                            }`}
                          >
                            <Avatar
                              name={member.displayName}
                              color={member.avatarColor}
                              role={member.role}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-slate-700 max-w-[56px] truncate">
                            {member.displayName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Secret Post Mode Banner */}
                {activeView === 'secrets' && (
                  <div className="bg-blue-950/75 backdrop-blur border border-white/20 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <Lock className="w-4 h-4 text-sky-300" />
                        <span>학생 비밀글함</span>
                      </div>
                      <p className="text-xs text-blue-100 leading-relaxed">
                        {isEffectiveTeacher
                          ? '학생들이 선생님에게만 조용히 보낸 비밀글을 확인하고 따뜻한 답글을 남길 수 있어요.'
                          : '다른 친구에게는 절대 보이지 않고, 작성한 나와 담임선생님만 볼 수 있는 안전한 공간이에요.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreateModal('secret')}
                      className="px-4 py-2.5 rounded-xl bg-white text-blue-800 hover:bg-blue-50 text-xs font-bold whitespace-nowrap shrink-0"
                    >
                      비밀글 쓰기
                    </button>
                  </div>
                )}

                {/* Feed State: Loading / Error / Empty / Posts */}
                {dataLoading ? (
                  <div className="bg-white rounded-2xl p-10 text-center text-sm text-slate-500 shadow-lg">
                    우리 반 이야기를 불러오고 있어요...
                  </div>
                ) : dataError ? (
                  <div className="bg-white rounded-2xl p-8 text-center space-y-3 shadow-lg">
                    <p className="text-sm font-semibold text-rose-700">{dataError}</p>
                    <button
                      type="button"
                      onClick={loadFeedData}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                    >
                      다시 불러오기
                    </button>
                  </div>
                ) : activeView === 'secrets' && !dbUser ? (
                  <div className="bg-white rounded-2xl p-8 text-center space-y-3 shadow-lg">
                    <Lock className="w-8 h-8 text-blue-600 mx-auto" />
                    <h3 className="text-base font-bold text-slate-900">
                      비밀글함은 로그인 후 이용할 수 있어요
                    </h3>
                    <p className="text-xs text-slate-500">
                      본인과 선생님만 확인할 수 있도록 안전한 로그인 확인이 필요해요.
                    </p>
                    <button
                      type="button"
                      onClick={signInWithGoogle}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                    >
                      Google 로그인하기
                    </button>
                  </div>
                ) : visiblePosts.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center space-y-3 shadow-lg">
                    <p className="text-sm font-semibold text-slate-800">
                      {activeView === 'secrets'
                        ? '아직 작성된 비밀글이 없어요.'
                        : '아직 올라온 게시물이 없어요.'}
                    </p>
                    <p className="text-xs text-slate-500">
                      첫 번째 사진이나 따뜻한 학급 이야기를 올려볼까요?
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        openCreateModal(activeView === 'secrets' ? 'secret' : 'public')
                      }
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                      새 글 올리기
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {visiblePosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUser={dbUser}
                        isTeacherMode={Boolean(isEffectiveTeacher)}
                        getAuthHeaders={getAuthHeaders}
                        onRefresh={loadFeedData}
                        onRequireLogin={signInWithGoogle}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Right Rail: Teacher Notices + Internet Ethics Card */}
          <aside className="lg:col-span-3 space-y-5">
            {/* Classroom Notices */}
            <div className="bg-white rounded-2xl shadow-lg shadow-blue-950/15 border border-blue-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-3.5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Megaphone className="w-4 h-4 text-sky-200" />
                  <span>선생님 알림장</span>
                </div>
                {isEffectiveTeacher && (
                  <button
                    type="button"
                    onClick={() => setActiveView('teacher')}
                    className="text-[11px] font-semibold text-blue-100 hover:text-white underline"
                  >
                    작성
                  </button>
                )}
              </div>
              <div className="p-5 space-y-3.5">
                {notices.length === 0 ? (
                  <p className="text-xs text-slate-500">등록된 알림장이 없습니다.</p>
                ) : (
                  notices.slice(0, 2).map((notice) => (
                    <div key={notice.id} className="space-y-1 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                      <h3 className="text-xs font-bold text-slate-900">{notice.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{notice.content}</p>
                      <p className="text-[11px] text-slate-400">
                        {notice.authorName} · {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Internet Ethics Pledge Card */}
            <div className="bg-white rounded-2xl shadow-lg shadow-blue-950/15 border border-blue-100 p-5 space-y-3.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>인터넷 윤리 4대 약속</span>
              </div>
              <ol className="space-y-2.5">
                {INTERNET_ETHICS_PRINCIPLES.map((item, idx) => (
                  <li key={item.id} className="flex items-start gap-2 text-xs">
                    <span className="font-bold text-blue-700 tabular-nums shrink-0">
                      0{idx + 1}.
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => setEthicsOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition-colors"
              >
                윤리 수칙 자세히 보기
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (<= 15% sticky height cap) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-blue-950/95 backdrop-blur-md border-t border-white/15 text-white grid grid-cols-4 items-center">
        <button
          type="button"
          onClick={() => setActiveView('feed')}
          className={`flex flex-col items-center justify-center h-full text-[11px] font-medium ${
            activeView === 'feed' ? 'text-white font-bold' : 'text-blue-200'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>피드</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('secrets')}
          className={`flex flex-col items-center justify-center h-full text-[11px] font-medium ${
            activeView === 'secrets' ? 'text-white font-bold' : 'text-blue-200'
          }`}
        >
          <Lock className="w-5 h-5 mb-0.5" />
          <span>비밀글</span>
        </button>

        <button
          type="button"
          onClick={() => openCreateModal(activeView === 'secrets' ? 'secret' : 'public')}
          className="flex flex-col items-center justify-center h-full text-[11px] font-semibold text-sky-200"
        >
          <Plus className="w-5 h-5 mb-0.5" />
          <span>새 글</span>
        </button>

        {isEffectiveTeacher ? (
          <button
            type="button"
            onClick={() => setActiveView('teacher')}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-medium ${
              activeView === 'teacher' ? 'text-white font-bold' : 'text-blue-200'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span>교사관리</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveView('roster')}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-medium ${
              activeView === 'roster' ? 'text-white font-bold' : 'text-blue-200'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>학급친구</span>
          </button>
        )}
      </nav>

      {/* Modals */}
      <CreatePostModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={loadFeedData}
        getAuthHeaders={getAuthHeaders}
        defaultVisibility={createDefaultVisibility}
        alreadyAgreedEthics={Boolean(dbUser?.ethicsAgreed)}
      />

      <EthicsModal
        isOpen={ethicsOpen}
        onClose={() => setEthicsOpen(false)}
        ethicsAgreed={dbUser?.ethicsAgreed}
        onAgree={dbUser ? handleAgreeEthics : undefined}
      />

      {dbUser && (
        <ProfileModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          user={dbUser}
          getAuthHeaders={getAuthHeaders}
          onUpdated={(updated) => {
            setDbUser(updated);
            loadFeedData();
          }}
        />
      )}
    </div>
  );
}
