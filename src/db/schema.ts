import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('student'), // 'teacher' | 'student'
  studentNumber: integer('student_number'),
  bio: text('bio').notNull().default(''),
  avatarColor: text('avatar_color').notNull().default('#2563EB'),
  isMuted: boolean('is_muted').notNull().default(false),
  ethicsAgreed: boolean('ethics_agreed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  authorId: integer('author_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  caption: text('caption').notNull(),
  imageUrl: text('image_url'),
  cardTheme: text('card_theme').notNull().default('cobalt'),
  visibility: text('visibility').notNull().default('public'), // 'public' | 'secret'
  status: text('status').notNull().default('active'), // 'active' | 'hidden'
  teacherNote: text('teacher_note'),
  isPinned: boolean('is_pinned').notNull().default(false),
  ethicsChecked: boolean('ethics_checked').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  authorId: integer('author_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  isHidden: boolean('is_hidden').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const likes = pgTable(
  'likes',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .references(() => posts.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('likes_post_user_unique').on(table.postId, table.userId)]
);

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  reporterId: integer('reporter_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('open'), // 'open' | 'resolved'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notices = pgTable('notices', {
  id: serial('id').primaryKey(),
  authorId: integer('author_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  likes: many(likes),
  reports: many(reports),
  notices: many(notices),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  likes: many(likes),
  reports: many(reports),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  post: one(posts, {
    fields: [reports.postId],
    references: [posts.id],
  }),
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
  }),
}));

export const noticesRelations = relations(notices, ({ one }) => ({
  author: one(users, {
    fields: [notices.authorId],
    references: [users.id],
  }),
}));
