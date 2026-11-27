import express from 'express';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  addComment,
  createNotice,
  createPost,
  createReport,
  deleteCommentById,
  deleteNoticeById,
  deletePostById,
  getCommentById,
  getFeedPosts,
  getPostById,
  getUserByUid,
  listClassUsers,
  listNotices,
  listReports,
  moderateComment,
  moderatePost,
  resolveReport,
  setUserRole,
  syncFirebaseUser,
  toggleLike,
  updateMyProfile,
  updatePostContent,
} from './src/db/repository.ts';
import { checkInternetEthics } from './src/shared/ethics.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const TEACHER_INVITE_CODE = process.env.TEACHER_INVITE_CODE || 'BLUE2026';

app.use(express.json({ limit: '5mb' }));

async function getCurrentDbUser(req: AuthRequest) {
  if (!req.user) return null;
  const existing = await getUserByUid(req.user.uid);
  if (existing) return existing;
  return await syncFirebaseUser({
    uid: req.user.uid,
    email: req.user.email || '',
    displayName: req.user.name || req.user.email?.split('@')[0] || '학급 친구',
  });
}

// Public preview feed (only public + active posts, no PII)
app.get('/api/public-feed', async (_req, res) => {
  try {
    const [feed, noticesList, classRoster] = await Promise.all([
      getFeedPosts(null),
      listNotices(),
      listClassUsers(false),
    ]);
    res.json({ posts: feed, notices: noticesList, roster: classRoster });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '피드를 불러오지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Sync authenticated Firebase user
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await syncFirebaseUser({
      uid: req.user!.uid,
      email: req.user!.email || '',
      displayName: req.user!.name || req.user!.email?.split('@')[0] || '학급 친구',
    });
    res.json({ user });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '사용자 인증에 실패했습니다.';
    res.status(500).json({ error: message });
  }
});

// Update my profile / ethics agreement
app.patch('/api/users/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });

    const { displayName, studentNumber, bio, avatarColor, ethicsAgreed } = req.body ?? {};
    if (typeof displayName === 'string') {
      const check = checkInternetEthics(displayName);
      if (!check.passed) {
        return res.status(400).json({
          error: check.issues[0]?.guidance || '이름에 부적절한 표현이 있습니다.',
          ethicsIssues: check.issues,
        });
      }
    }
    if (typeof bio === 'string' && bio.trim().length > 0) {
      const check = checkInternetEthics(bio);
      if (!check.passed) {
        return res.status(400).json({
          error: check.issues[0]?.guidance || '소개글에 부적절한 표현이 있습니다.',
          ethicsIssues: check.issues,
        });
      }
    }

    const updated = await updateMyProfile(me.id, {
      displayName: typeof displayName === 'string' ? displayName.trim().slice(0, 30) : undefined,
      studentNumber:
        studentNumber === null
          ? null
          : typeof studentNumber === 'number' && studentNumber > 0 && studentNumber <= 99
          ? studentNumber
          : undefined,
      bio: typeof bio === 'string' ? bio.trim().slice(0, 120) : undefined,
      avatarColor: typeof avatarColor === 'string' ? avatarColor.slice(0, 20) : undefined,
      ethicsAgreed: typeof ethicsAgreed === 'boolean' ? ethicsAgreed : undefined,
    });
    res.json({ user: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '프로필을 수정하지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Claim teacher role with classroom invite code
app.post('/api/users/claim-teacher', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });

    const code = String(req.body?.code || '').trim();
    if (code !== TEACHER_INVITE_CODE) {
      return res.status(403).json({ error: '교사 인증 코드가 일치하지 않습니다.' });
    }

    const updated = await setUserRole(me.id, { role: 'teacher' });
    res.json({ user: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '교사 권한 인증에 실패했습니다.';
    res.status(500).json({ error: message });
  }
});

// Class roster
app.get('/api/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });

    const roster = await listClassUsers(me.role === 'teacher');
    res.json({ users: roster });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '학급 명단을 불러오지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Teacher manages student role or mute status
app.patch('/api/users/:id/role', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me || me.role !== 'teacher') {
      return res.status(403).json({ error: '선생님만 학생 권한을 관리할 수 있습니다.' });
    }

    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId)) {
      return res.status(400).json({ error: '잘못된 사용자 ID입니다.' });
    }

    const { role, isMuted, studentNumber } = req.body ?? {};
    const updated = await setUserRole(targetId, {
      role: role === 'teacher' || role === 'student' ? role : undefined,
      isMuted: typeof isMuted === 'boolean' ? isMuted : undefined,
      studentNumber:
        studentNumber === null
          ? null
          : typeof studentNumber === 'number'
          ? studentNumber
          : undefined,
    });
    res.json({ user: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '권한 변경에 실패했습니다.';
    res.status(500).json({ error: message });
  }
});

// Authenticated feed (respects secret post visibility & teacher moderation)
app.get('/api/posts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });

    const [feed, noticesList, roster] = await Promise.all([
      getFeedPosts({ id: me.id, role: me.role }),
      listNotices(),
      listClassUsers(me.role === 'teacher'),
    ]);
    res.json({ posts: feed, notices: noticesList, roster });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '게시글 목록을 불러오지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Create post (with Internet Ethics verification)
app.post('/api/posts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });

    if (me.isMuted) {
      return res.status(403).json({
        error: '선생님에 의해 현재 글쓰기가 잠시 제한되어 있습니다. 선생님께 문의해 주세요.',
      });
    }

    const { caption, imageUrl, cardTheme, visibility, ethicsAgreed } = req.body ?? {};
    if (!ethicsAgreed && !me.ethicsAgreed) {
      return res.status(400).json({
        error: '인터넷 윤리 4대 약속에 동의한 후 게시물을 올릴 수 있어요.',
      });
    }

    const cleanCaption = String(caption || '').trim();
    const ethicsResult = checkInternetEthics(cleanCaption);
    if (!ethicsResult.passed) {
      return res.status(400).json({
        error: ethicsResult.issues[0]?.guidance || '인터넷 윤리 기준을 확인해 주세요.',
        ethicsIssues: ethicsResult.issues,
      });
    }

    if (cleanCaption.length > 1000) {
      return res.status(400).json({ error: '글은 1,000자 이내로 작성해 주세요.' });
    }

    if (typeof imageUrl === 'string' && imageUrl.length > 3_500_000) {
      return res.status(400).json({ error: '이미지 용량이 너무 큽니다. 더 작은 사진을 선택해 주세요.' });
    }

    if (ethicsAgreed && !me.ethicsAgreed) {
      await updateMyProfile(me.id, { ethicsAgreed: true });
    }

    const safeVisibility = visibility === 'secret' ? 'secret' : 'public';
    const created = await createPost({
      authorId: me.id,
      caption: cleanCaption,
      imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
      cardTheme: typeof cardTheme === 'string' ? cardTheme : 'cobalt',
      visibility: safeVisibility,
      ethicsChecked: true,
    });

    res.status(201).json({ post: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '게시글을 올리지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Author edits own post
app.patch('/api/posts/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });

    const postId = Number(req.params.id);
    const existing = await getPostById(postId);
    if (!existing) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });

    if (existing.authorId !== me.id && me.role !== 'teacher') {
      return res.status(403).json({ error: '본인 또는 선생님만 수정할 수 있습니다.' });
    }

    const { caption, visibility } = req.body ?? {};
    if (typeof caption === 'string') {
      const check = checkInternetEthics(caption);
      if (!check.passed) {
        return res.status(400).json({
          error: check.issues[0]?.guidance || '인터넷 윤리 기준을 확인해 주세요.',
          ethicsIssues: check.issues,
        });
      }
    }

    const updated = await updatePostContent(postId, {
      caption: typeof caption === 'string' ? caption.trim().slice(0, 1000) : undefined,
      visibility: visibility === 'secret' || visibility === 'public' ? visibility : undefined,
    });
    res.json({ post: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '게시글을 수정하지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Teacher moderates post (hide/show, pin, teacher note)
app.patch('/api/posts/:id/moderate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me || me.role !== 'teacher') {
      return res.status(403).json({ error: '선생님만 게시물을 관리할 수 있습니다.' });
    }

    const postId = Number(req.params.id);
    const existing = await getPostById(postId);
    if (!existing) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });

    const { status, teacherNote, isPinned } = req.body ?? {};
    const updated = await moderatePost(postId, {
      status: status === 'active' || status === 'hidden' ? status : undefined,
      teacherNote:
        teacherNote === null
          ? null
          : typeof teacherNote === 'string'
          ? teacherNote.trim().slice(0, 300)
          : undefined,
      isPinned: typeof isPinned === 'boolean' ? isPinned : undefined,
    });
    res.json({ post: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '게시물 관리에 실패했습니다.';
    res.status(500).json({ error: message });
  }
});

// Delete post (author or teacher)
app.delete('/api/posts/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });

    const postId = Number(req.params.id);
    const existing = await getPostById(postId);
    if (!existing) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });

    if (existing.authorId !== me.id && me.role !== 'teacher') {
      return res.status(403).json({ error: '본인 또는 선생님만 삭제할 수 있습니다.' });
    }

    await deletePostById(postId);
    res.json({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '게시글을 삭제하지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Toggle like
app.post('/api/posts/:id/like', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });

    const postId = Number(req.params.id);
    const post = await getPostById(postId);
    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });

    if (post.visibility === 'secret' && post.authorId !== me.id && me.role !== 'teacher') {
      return res.status(403).json({ error: '비밀글에는 접근할 수 없습니다.' });
    }

    const result = await toggleLike(postId, me.id);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '좋아요를 반영하지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Add comment (with Internet Ethics check + secret post guard)
app.post('/api/posts/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });

    if (me.isMuted) {
      return res.status(403).json({
        error: '선생님에 의해 현재 댓글 작성이 잠시 제한되어 있습니다.',
      });
    }

    const postId = Number(req.params.id);
    const post = await getPostById(postId);
    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });

    if (post.visibility === 'secret' && post.authorId !== me.id && me.role !== 'teacher') {
      return res.status(403).json({ error: '비밀글에는 작성자와 선생님만 댓글을 달 수 있습니다.' });
    }

    const cleanContent = String(req.body?.content || '').trim();
    const ethicsResult = checkInternetEthics(cleanContent);
    if (!ethicsResult.passed) {
      return res.status(400).json({
        error: ethicsResult.issues[0]?.guidance || '고운 말을 사용해 주세요.',
        ethicsIssues: ethicsResult.issues,
      });
    }

    const created = await addComment({
      postId,
      authorId: me.id,
      content: cleanContent.slice(0, 400),
    });
    res.status(201).json({ comment: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '댓글을 등록하지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Teacher moderates comment
app.patch('/api/comments/:id/moderate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me || me.role !== 'teacher') {
      return res.status(403).json({ error: '선생님만 댓글을 관리할 수 있습니다.' });
    }

    const commentId = Number(req.params.id);
    const updated = await moderateComment(commentId, Boolean(req.body?.isHidden));
    res.json({ comment: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '댓글 상태를 변경하지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Delete comment (author or teacher)
app.delete('/api/comments/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });

    const commentId = Number(req.params.id);
    const existing = await getCommentById(commentId);
    if (!existing) return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });

    if (existing.authorId !== me.id && me.role !== 'teacher') {
      return res.status(403).json({ error: '본인 또는 선생님만 삭제할 수 있습니다.' });
    }

    await deleteCommentById(commentId);
    res.json({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '댓글을 삭제하지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Report post for internet ethics review
app.post('/api/posts/:id/report', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });

    const postId = Number(req.params.id);
    const post = await getPostById(postId);
    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });

    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ error: '신고 사유를 입력해 주세요.' });
    }

    const created = await createReport({
      postId,
      reporterId: me.id,
      reason: reason.slice(0, 300),
    });
    res.status(201).json({ report: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '도움 요청을 접수하지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Teacher lists reports
app.get('/api/reports', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me || me.role !== 'teacher') {
      return res.status(403).json({ error: '선생님만 신고 내역을 확인할 수 있습니다.' });
    }

    const items = await listReports();
    res.json({ reports: items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '신고 목록을 불러오지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Teacher resolves report
app.patch('/api/reports/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me || me.role !== 'teacher') {
      return res.status(403).json({ error: '선생님만 처리할 수 있습니다.' });
    }

    const reportId = Number(req.params.id);
    const status = req.body?.status === 'open' ? 'open' : 'resolved';
    const updated = await resolveReport(reportId, status);
    res.json({ report: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '신고 상태를 변경하지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

// Class notices
app.get('/api/notices', async (_req, res) => {
  try {
    const items = await listNotices();
    res.json({ notices: items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '학급 공지를 불러오지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/notices', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me || me.role !== 'teacher') {
      return res.status(403).json({ error: '선생님만 학급 공지를 작성할 수 있습니다.' });
    }

    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    if (!title || !content) {
      return res.status(400).json({ error: '공지 제목과 내용을 모두 입력해 주세요.' });
    }

    const created = await createNotice({
      authorId: me.id,
      title: title.slice(0, 80),
      content: content.slice(0, 600),
    });
    res.status(201).json({ notice: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '공지를 등록하지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/notices/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const me = await getCurrentDbUser(req);
    if (!me || me.role !== 'teacher') {
      return res.status(403).json({ error: '선생님만 공지를 삭제할 수 있습니다.' });
    }

    await deleteNoticeById(Number(req.params.id));
    res.json({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '공지를 삭제하지 못했습니다.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
