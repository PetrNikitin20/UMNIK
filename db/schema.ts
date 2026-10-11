import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), name: text('name').notNull(), login: text('login').notNull().unique(),
  passwordHash: text('password_hash').notNull(), role: text('role').notNull().default('student'),
  mustChange: integer('must_change').notNull().default(1), active: integer('active').notNull().default(1),
  createdAt: text('created_at').notNull(), lastLogin: text('last_login'),
});
export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(), userId: text('user_id').notNull().references(()=>users.id), expiresAt: text('expires_at').notNull(),
});
export const revisions = sqliteTable('revisions', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(()=>users.id), version: integer('version').notNull(),
  payload: text('payload').notNull(), changes: text('changes').notNull(), createdAt: text('created_at').notNull(),
}, t=>[uniqueIndex('revision_version').on(t.userId,t.version), index('revision_owner').on(t.userId)]);
export const evaluations = sqliteTable('evaluations', {
  id:text('id').primaryKey(), userId:text('user_id').notNull().references(()=>users.id), version:integer('version').notNull(),
  result:text('result').notNull(), createdAt:text('created_at').notNull(),
});
export const audit = sqliteTable('audit', {
  id:text('id').primaryKey(), actorId:text('actor_id'), event:text('event').notNull(), targetId:text('target_id'),
  detail:text('detail').notNull(), createdAt:text('created_at').notNull(),
},t=>[index('audit_time').on(t.createdAt)]);
export const news = sqliteTable('news', {
  id:text('id').primaryKey(), title:text('title').notNull(), body:text('body').notNull(), source:text('source').notNull(),
  eventDate:text('event_date'), status:text('status').notNull().default('draft'), sourceHash:text('source_hash'),
  checkedAt:text('checked_at').notNull(), createdAt:text('created_at').notNull(),
});
export const settings = sqliteTable('settings', { key:text('key').primaryKey(), value:text('value').notNull() });
export const limits = sqliteTable('limits', { key:text('key').primaryKey(), count:integer('count').notNull(), expires:integer('expires').notNull() });
export const reviews = sqliteTable('reviews', {
  id:text('id').primaryKey(), userId:text('user_id').notNull().references(()=>users.id), actorId:text('actor_id').notNull(),
  version:integer('version').notNull(), status:text('status').notNull(), comment:text('comment').notNull(), createdAt:text('created_at').notNull(),
});
