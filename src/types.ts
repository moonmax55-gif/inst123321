export type UserRole = 'teacher' | 'student';

export interface ClassUser {
  id: number;
  uid?: string;
  email?: string;
  displayName: string;
  role: UserRole;
  studentNumber: number | null;
  bio: string;
  avatarColor: string;
  isMuted: boolean;
  ethicsAgreed: boolean;
}

export interface PostComment {
  id: number;
  postId: number;
  authorId: number;
  content: string;
  isHidden: boolean;
  createdAt: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatarColor: string;
}

export interface FeedPost {
  id: number;
  authorId: number;
  caption: string;
  imageUrl: string | null;
  cardTheme: string;
  visibility: 'public' | 'secret';
  status: 'active' | 'hidden';
  teacherNote: string | null;
  isPinned: boolean;
  ethicsChecked: boolean;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorRole: UserRole;
  authorStudentNumber: number | null;
  authorAvatarColor: string;
  likeCount: number;
  likedByMe: boolean;
  comments: PostComment[];
}

export interface ClassNotice {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  authorName: string;
}

export interface PostReport {
  id: number;
  postId: number;
  reason: string;
  status: 'open' | 'resolved';
  createdAt: string;
  reporterName: string;
  postCaption: string;
  postStatus: 'active' | 'hidden';
  postVisibility: 'public' | 'secret';
}
