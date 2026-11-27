import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { comments, likes, notices, posts, reports, users } from './schema.ts';

const TEACHER_BOOTSTRAP_EMAIL = 'moonmax55@gmail.com';
let seedPromise: Promise<void> | null = null;

export async function ensureSeedData(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeedIfNeeded().catch((err) => {
      seedPromise = null;
      console.error('Seed initialization warning:', err);
    });
  }
  await seedPromise;
}

async function runSeedIfNeeded(): Promise<void> {
  const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
  if (existingUsers.length > 0) {
    return;
  }

  const [teacher] = await db
    .insert(users)
    .values({
      uid: 'seed-teacher-sky',
      email: 'sky.teacher@classroom.local',
      displayName: '김하늘 선생님',
      role: 'teacher',
      bio: '5학년 2반 담임선생님입니다. 따뜻하고 바른 온라인 소통을 함께 만들어요.',
      avatarColor: '#1E40AF',
      ethicsAgreed: true,
    })
    .returning();

  const [student1, student2, student3] = await db
    .insert(users)
    .values([
      {
        uid: 'seed-student-1',
        email: 'seojun@classroom.local',
        displayName: '이서준',
        role: 'student',
        studentNumber: 7,
        bio: '미술이랑 종이접기를 좋아해요!',
        avatarColor: '#2563EB',
        ethicsAgreed: true,
      },
      {
        uid: 'seed-student-2',
        email: 'jiwoo@classroom.local',
        displayName: '박지우',
        role: 'student',
        studentNumber: 14,
        bio: '우리 학교 화단 지킴이',
        avatarColor: '#0284C7',
        ethicsAgreed: true,
      },
      {
        uid: 'seed-student-3',
        email: 'doyoon@classroom.local',
        displayName: '최도윤',
        role: 'student',
        studentNumber: 21,
        bio: '과학 실험과 독서를 즐겨요',
        avatarColor: '#0369A1',
        ethicsAgreed: true,
      },
    ])
    .returning();

  await db.insert(notices).values({
    authorId: teacher.id,
    title: '푸른별 학급그램 오픈 & 인터넷 윤리 약속',
    content:
      '우리 반만의 파란색 소통 공간이 열렸어요! 사진을 올리기 전에 친구의 허락을 꼭 받고, 고운 말과 개인정보 보호 약속을 지켜 주세요. 선생님에게만 하고 싶은 이야기는 "비밀글"로 올릴 수 있어요.',
  });

  const seededPosts = await db
    .insert(posts)
    .values([
      {
        authorId: teacher.id,
        caption:
          '새롭게 단장한 우리 반 독서 코너예요! 파란 쿠션에 앉아 이번 주 추천 도서를 읽고 짧은 감상평을 사진과 함께 공유해 볼까요?',
        imageUrl: '/src/assets/images/classroom_reading_corner_1795761888808.jpg',
        cardTheme: 'cobalt',
        visibility: 'public',
        status: 'active',
        isPinned: true,
        ethicsChecked: true,
      },
      {
        authorId: student1.id,
        caption:
          '오늘 미술 시간에 그린 수채화 풍경이랑 종이학이에요! 햇빛이 잘 들어와서 색감이 예쁘게 나왔어요. 다들 오늘 작품 멋졌어요!',
        imageUrl: '/src/assets/images/classroom_art_project_1795761889086.jpg',
        cardTheme: 'sky',
        visibility: 'public',
        status: 'active',
        isPinned: false,
        ethicsChecked: true,
      },
      {
        authorId: student2.id,
        caption:
          '점심시간에 학교 화단에 나가 봤더니 파란 수국이 활짝 피었어요! 우리 모둠이 만든 나무 팻말도 잘 서 있네요.',
        imageUrl: '/src/assets/images/school_garden_flowers_1795761888583.jpg',
        cardTheme: 'ocean',
        visibility: 'public',
        status: 'active',
        isPinned: false,
        ethicsChecked: true,
      },
      {
        authorId: student3.id,
        caption:
          '과학 실험 시간에 파란 용액의 농도 변화를 관찰하고 노트에 꼼꼼히 정리했어요. 돋보기로 보니 신기했어요!',
        imageUrl: '/src/assets/images/science_experiment_table_1795761888591.jpg',
        cardTheme: 'indigo',
        visibility: 'public',
        status: 'active',
        isPinned: false,
        ethicsChecked: true,
      },
      {
        authorId: student2.id,
        caption:
          '선생님, 다음 주 모둠 발표 때 제가 떨려서 실수할까 봐 조금 걱정돼요. 발표 순서를 조금 뒤로 조정할 수 있을까요?',
        imageUrl: null,
        cardTheme: 'cobalt',
        visibility: 'secret',
        status: 'active',
        teacherNote: '지우야, 솔직하게 이야기해 줘서 고마워! 내일 쉬는 시간에 같이 연습해 보자.',
        isPinned: false,
        ethicsChecked: true,
      },
    ])
    .returning();

  await db.insert(comments).values([
    {
      postId: seededPosts[1].id,
      authorId: student2.id,
      content: '수채화 하늘 색깔이 진짜 예쁘다! 종이학도 너무 잘 접었네.',
    },
    {
      postId: seededPosts[1].id,
      authorId: teacher.id,
      content: '서준이의 정성이 느껴지는 멋진 작품이에요! 친구를 칭찬하는 지우의 댓글도 최고예요.',
    },
    {
      postId: seededPosts[2].id,
      authorId: student3.id,
      content: '화단 물주기 당번 수고 많았어! 수국이 파래서 우리 반 테마랑 딱 어울린다.',
    },
    {
      postId: seededPosts[4].id,
      authorId: teacher.id,
      content: '지우야 걱정하지 마. 선생님이 발표 전에 미리 연습할 시간을 줄게! 잘할 수 있어.',
    },
  ]);

  await db.insert(likes).values([
    { postId: seededPosts[0].id, userId: student1.id },
    { postId: seededPosts[0].id, userId: student2.id },
    { postId: seededPosts[1].id, userId: teacher.id },
    { postId: seededPosts[1].id, userId: student2.id },
    { postId: seededPosts[1].id, userId: student3.id },
    { postId: seededPosts[2].id, userId: teacher.id },
    { postId: seededPosts[3].id, userId: student1.id },
  ]);
}

export async function syncFirebaseUser(params: {
  uid: string;
  email: string;
  displayName: string;
}) {
  try {
    await ensureSeedData();
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, params.uid))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(users)
        .set({
          email: params.email,
        })
        .where(eq(users.uid, params.uid))
        .returning();
      return updated;
    }

    const realTeachers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'teacher'), sql`${users.uid} NOT LIKE 'seed-%'`))
      .limit(1);

    const isBootstrapTeacher =
      params.email.toLowerCase() === TEACHER_BOOTSTRAP_EMAIL || realTeachers.length === 0;

    const palette = ['#1D4ED8', '#2563EB', '#0284C7', '#0369A1', '#1E40AF'];
    const avatarColor = palette[Math.floor(Math.random() * palette.length)];

    const [created] = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
        displayName: params.displayName || params.email.split('@')[0] || '학급 친구',
        role: isBootstrapTeacher ? 'teacher' : 'student',
        avatarColor,
        ethicsAgreed: isBootstrapTeacher,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: params.email },
      })
      .returning();

    return created;
  } catch (error) {
    console.error('Database error in syncFirebaseUser:', error);
    throw new Error('사용자 정보를 동기화하지 못했습니다.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const [user] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return user || null;
  } catch (error) {
    console.error('Database error in getUserByUid:', error);
    throw new Error('사용자 정보를 조회하지 못했습니다.', { cause: error });
  }
}

export async function updateMyProfile(
  userId: number,
  data: {
    displayName?: string;
    studentNumber?: number | null;
    bio?: string;
    avatarColor?: string;
    ethicsAgreed?: boolean;
  }
) {
  try {
    const updateValues: Partial<typeof users.$inferInsert> = {};
    if (data.displayName !== undefined) updateValues.displayName = data.displayName;
    if (data.studentNumber !== undefined) updateValues.studentNumber = data.studentNumber;
    if (data.bio !== undefined) updateValues.bio = data.bio;
    if (data.avatarColor !== undefined) updateValues.avatarColor = data.avatarColor;
    if (data.ethicsAgreed !== undefined) updateValues.ethicsAgreed = data.ethicsAgreed;

    const [updated] = await db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, userId))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database error in updateMyProfile:', error);
    throw new Error('프로필을 수정하지 못했습니다.', { cause: error });
  }
}

export async function setUserRole(
  targetUserId: number,
  data: { role?: 'teacher' | 'student'; isMuted?: boolean; studentNumber?: number | null }
) {
  try {
    const updateValues: Partial<typeof users.$inferInsert> = {};
    if (data.role !== undefined) updateValues.role = data.role;
    if (data.isMuted !== undefined) updateValues.isMuted = data.isMuted;
    if (data.studentNumber !== undefined) updateValues.studentNumber = data.studentNumber;

    const [updated] = await db
      .update(users)
      .set(updateValues)
      .where(eq(users.id, targetUserId))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database error in setUserRole:', error);
    throw new Error('학생 권한 정보를 변경하지 못했습니다.', { cause: error });
  }
}

export async function listClassUsers(includeEmail: boolean) {
  try {
    await ensureSeedData();
    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        studentNumber: users.studentNumber,
        bio: users.bio,
        avatarColor: users.avatarColor,
        isMuted: users.isMuted,
        ethicsAgreed: users.ethicsAgreed,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.role), users.studentNumber, users.displayName);

    return rows.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      role: row.role,
      studentNumber: row.studentNumber,
      bio: row.bio,
      avatarColor: row.avatarColor,
      isMuted: row.isMuted,
      ethicsAgreed: row.ethicsAgreed,
      ...(includeEmail ? { email: row.email, uid: row.uid } : {}),
    }));
  } catch (error) {
    console.error('Database error in listClassUsers:', error);
    throw new Error('학급 구성원 목록을 불러오지 못했습니다.', { cause: error });
  }
}

export async function getFeedPosts(viewer: { id: number; role: string } | null) {
  try {
    await ensureSeedData();

    const isTeacher = viewer?.role === 'teacher';
    const postRows = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        caption: posts.caption,
        imageUrl: posts.imageUrl,
        cardTheme: posts.cardTheme,
        visibility: posts.visibility,
        status: posts.status,
        teacherNote: posts.teacherNote,
        isPinned: posts.isPinned,
        ethicsChecked: posts.ethicsChecked,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        authorName: users.displayName,
        authorRole: users.role,
        authorStudentNumber: users.studentNumber,
        authorAvatarColor: users.avatarColor,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        isTeacher
          ? undefined
          : viewer
          ? or(
              and(eq(posts.visibility, 'public'), eq(posts.status, 'active')),
              eq(posts.authorId, viewer.id)
            )
          : and(eq(posts.visibility, 'public'), eq(posts.status, 'active'))
      )
      .orderBy(desc(posts.isPinned), desc(posts.createdAt));

    if (postRows.length === 0) return [];

    const allComments = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        authorId: comments.authorId,
        content: comments.content,
        isHidden: comments.isHidden,
        createdAt: comments.createdAt,
        authorName: users.displayName,
        authorRole: users.role,
        authorAvatarColor: users.avatarColor,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .orderBy(comments.createdAt);

    const allLikes = await db
      .select({
        postId: likes.postId,
        userId: likes.userId,
      })
      .from(likes);

    const commentsByPost = new Map<number, typeof allComments>();
    for (const c of allComments) {
      if (c.isHidden && !isTeacher && c.authorId !== viewer?.id) continue;
      const list = commentsByPost.get(c.postId) ?? [];
      list.push(c);
      commentsByPost.set(c.postId, list);
    }

    const likesByPost = new Map<number, number[]>();
    for (const l of allLikes) {
      const list = likesByPost.get(l.postId) ?? [];
      list.push(l.userId);
      likesByPost.set(l.postId, list);
    }

    return postRows.map((p) => {
      const likeUserIds = likesByPost.get(p.id) ?? [];
      return {
        ...p,
        likeCount: likeUserIds.length,
        likedByMe: viewer ? likeUserIds.includes(viewer.id) : false,
        comments: commentsByPost.get(p.id) ?? [],
      };
    });
  } catch (error) {
    console.error('Database error in getFeedPosts:', error);
    throw new Error('게시글 피드를 불러오지 못했습니다.', { cause: error });
  }
}

export async function createPost(params: {
  authorId: number;
  caption: string;
  imageUrl?: string | null;
  cardTheme?: string;
  visibility: 'public' | 'secret';
  ethicsChecked: boolean;
}) {
  try {
    const [created] = await db
      .insert(posts)
      .values({
        authorId: params.authorId,
        caption: params.caption,
        imageUrl: params.imageUrl || null,
        cardTheme: params.cardTheme || 'cobalt',
        visibility: params.visibility,
        status: 'active',
        ethicsChecked: params.ethicsChecked,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database error in createPost:', error);
    throw new Error('게시글을 저장하지 못했습니다.', { cause: error });
  }
}

export async function getPostById(postId: number) {
  try {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    return post || null;
  } catch (error) {
    console.error('Database error in getPostById:', error);
    throw new Error('게시글을 조회하지 못했습니다.', { cause: error });
  }
}

export async function updatePostContent(
  postId: number,
  data: { caption?: string; visibility?: 'public' | 'secret' }
) {
  try {
    const updateValues: Partial<typeof posts.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.caption !== undefined) updateValues.caption = data.caption;
    if (data.visibility !== undefined) updateValues.visibility = data.visibility;

    const [updated] = await db
      .update(posts)
      .set(updateValues)
      .where(eq(posts.id, postId))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database error in updatePostContent:', error);
    throw new Error('게시글을 수정하지 못했습니다.', { cause: error });
  }
}

export async function moderatePost(
  postId: number,
  data: {
    status?: 'active' | 'hidden';
    teacherNote?: string | null;
    isPinned?: boolean;
  }
) {
  try {
    const updateValues: Partial<typeof posts.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.status !== undefined) updateValues.status = data.status;
    if (data.teacherNote !== undefined) updateValues.teacherNote = data.teacherNote;
    if (data.isPinned !== undefined) updateValues.isPinned = data.isPinned;

    const [updated] = await db
      .update(posts)
      .set(updateValues)
      .where(eq(posts.id, postId))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database error in moderatePost:', error);
    throw new Error('게시글 관리 상태를 변경하지 못했습니다.', { cause: error });
  }
}

export async function deletePostById(postId: number) {
  try {
    await db.delete(posts).where(eq(posts.id, postId));
  } catch (error) {
    console.error('Database error in deletePostById:', error);
    throw new Error('게시글을 삭제하지 못했습니다.', { cause: error });
  }
}

export async function toggleLike(postId: number, userId: number) {
  try {
    const existing = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(likes).where(eq(likes.id, existing[0].id));
      return { liked: false };
    }

    await db.insert(likes).values({ postId, userId });
    return { liked: true };
  } catch (error) {
    console.error('Database error in toggleLike:', error);
    throw new Error('좋아요를 처리하지 못했습니다.', { cause: error });
  }
}

export async function addComment(params: { postId: number; authorId: number; content: string }) {
  try {
    const [created] = await db
      .insert(comments)
      .values({
        postId: params.postId,
        authorId: params.authorId,
        content: params.content,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database error in addComment:', error);
    throw new Error('댓글을 등록하지 못했습니다.', { cause: error });
  }
}

export async function getCommentById(commentId: number) {
  try {
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);
    return comment || null;
  } catch (error) {
    console.error('Database error in getCommentById:', error);
    throw new Error('댓글을 조회하지 못했습니다.', { cause: error });
  }
}

export async function moderateComment(commentId: number, isHidden: boolean) {
  try {
    const [updated] = await db
      .update(comments)
      .set({ isHidden })
      .where(eq(comments.id, commentId))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database error in moderateComment:', error);
    throw new Error('댓글 상태를 변경하지 못했습니다.', { cause: error });
  }
}

export async function deleteCommentById(commentId: number) {
  try {
    await db.delete(comments).where(eq(comments.id, commentId));
  } catch (error) {
    console.error('Database error in deleteCommentById:', error);
    throw new Error('댓글을 삭제하지 못했습니다.', { cause: error });
  }
}

export async function createReport(params: { postId: number; reporterId: number; reason: string }) {
  try {
    const [created] = await db
      .insert(reports)
      .values({
        postId: params.postId,
        reporterId: params.reporterId,
        reason: params.reason,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database error in createReport:', error);
    throw new Error('신고를 접수하지 못했습니다.', { cause: error });
  }
}

export async function listReports() {
  try {
    const rows = await db
      .select({
        id: reports.id,
        postId: reports.postId,
        reason: reports.reason,
        status: reports.status,
        createdAt: reports.createdAt,
        reporterName: users.displayName,
        postCaption: posts.caption,
        postStatus: posts.status,
        postVisibility: posts.visibility,
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .innerJoin(posts, eq(reports.postId, posts.id))
      .orderBy(desc(reports.createdAt));

    return rows;
  } catch (error) {
    console.error('Database error in listReports:', error);
    throw new Error('신고 목록을 불러오지 못했습니다.', { cause: error });
  }
}

export async function resolveReport(reportId: number, status: 'open' | 'resolved') {
  try {
    const [updated] = await db
      .update(reports)
      .set({ status })
      .where(eq(reports.id, reportId))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database error in resolveReport:', error);
    throw new Error('신고 상태를 업데이트하지 못했습니다.', { cause: error });
  }
}

export async function listNotices() {
  try {
    await ensureSeedData();
    return await db
      .select({
        id: notices.id,
        title: notices.title,
        content: notices.content,
        createdAt: notices.createdAt,
        authorName: users.displayName,
      })
      .from(notices)
      .innerJoin(users, eq(notices.authorId, users.id))
      .orderBy(desc(notices.createdAt))
      .limit(5);
  } catch (error) {
    console.error('Database error in listNotices:', error);
    throw new Error('학급 공지를 불러오지 못했습니다.', { cause: error });
  }
}

export async function createNotice(params: { authorId: number; title: string; content: string }) {
  try {
    const [created] = await db
      .insert(notices)
      .values({
        authorId: params.authorId,
        title: params.title,
        content: params.content,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database error in createNotice:', error);
    throw new Error('학급 공지를 등록하지 못했습니다.', { cause: error });
  }
}

export async function deleteNoticeById(noticeId: number) {
  try {
    await db.delete(notices).where(eq(notices.id, noticeId));
  } catch (error) {
    console.error('Database error in deleteNoticeById:', error);
    throw new Error('학급 공지를 삭제하지 못했습니다.', { cause: error });
  }
}
