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
  workKey: text('work_key').notNull().default('umnik-main'),
  payload: text('payload').notNull(), changes: text('changes').notNull(), createdAt: text('created_at').notNull(),
}, t=>[uniqueIndex('revision_work_version').on(t.userId,t.workKey,t.version), index('revision_owner').on(t.userId)]);
export const evaluations = sqliteTable('evaluations', {
  id:text('id').primaryKey(), userId:text('user_id').notNull().references(()=>users.id), version:integer('version').notNull(),
  workKey:text('work_key').notNull().default('umnik-main'),
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
  workKey:text('work_key').notNull().default('umnik-main'),
  version:integer('version').notNull(), status:text('status').notNull(), comment:text('comment').notNull(), createdAt:text('created_at').notNull(),
});
export const courses=sqliteTable('courses',{
 id:text('id').primaryKey(),slug:text('slug').notNull().unique(),title:text('title').notNull(),description:text('description').notNull(),category:text('category').notNull(),semester:text('semester').notNull(),status:text('status').notNull().default('published'),createdAt:text('created_at').notNull(),
});
export const courseTeachers=sqliteTable('course_teachers',{
 courseId:text('course_id').notNull().references(()=>courses.id),userId:text('user_id').notNull().references(()=>users.id),
},t=>[uniqueIndex('course_teacher').on(t.courseId,t.userId)]);
export const enrollments=sqliteTable('enrollments',{
 id:text('id').primaryKey(),courseId:text('course_id').notNull().references(()=>courses.id),userId:text('user_id').notNull().references(()=>users.id),status:text('status').notNull().default('active'),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('course_enrollment').on(t.courseId,t.userId)]);
export const learningModules=sqliteTable('learning_modules',{
 id:text('id').primaryKey(),title:text('title').notNull(),version:text('version').notNull(),description:text('description').notNull(),
});
export const competencies=sqliteTable('competencies',{
 id:text('id').primaryKey(),title:text('title').notNull(),description:text('description').notNull(),rubricVersion:text('rubric_version').notNull(),
});
export const assignments=sqliteTable('assignments',{
 id:text('id').primaryKey(),courseId:text('course_id').notNull().references(()=>courses.id),moduleId:text('module_id').notNull().references(()=>learningModules.id),title:text('title').notNull(),instruction:text('instruction').notNull(),deadline:text('deadline'),rubricVersion:text('rubric_version').notNull(),active:integer('active').notNull().default(1),createdAt:text('created_at').notNull(),
});
export const assignmentCompetencies=sqliteTable('assignment_competencies',{
 assignmentId:text('assignment_id').notNull().references(()=>assignments.id),competencyId:text('competency_id').notNull().references(()=>competencies.id),
},t=>[uniqueIndex('assignment_competency').on(t.assignmentId,t.competencyId)]);
export const learningWorks=sqliteTable('learning_works',{
 id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),assignmentId:text('assignment_id').notNull().references(()=>assignments.id),version:integer('version').notNull().default(0),submittedVersion:integer('submitted_version'),sourceWork:text('source_work'),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('learning_work_owner').on(t.userId,t.assignmentId)]);
export const learningRevisions=sqliteTable('learning_revisions',{
 id:text('id').primaryKey(),workId:text('work_id').notNull().references(()=>learningWorks.id),version:integer('version').notNull(),payload:text('payload').notNull(),changes:text('changes').notNull(),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('learning_revision_version').on(t.workId,t.version)]);
export const learningEvents=sqliteTable('learning_events',{
 id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),assignmentId:text('assignment_id').notNull().references(()=>assignments.id),workId:text('work_id').references(()=>learningWorks.id),event:text('event').notNull(),version:integer('version'),moduleVersion:text('module_version').notNull(),source:text('source').notNull(),seconds:integer('seconds').notNull().default(0),detail:text('detail').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('learning_event_owner_time').on(t.userId,t.createdAt)]);
export const competencyEvidence=sqliteTable('competency_evidence',{
 moduleVersion:text('module_version').notNull().default('unrecorded'),
 id:text('id').primaryKey(),workId:text('work_id').notNull().references(()=>learningWorks.id),actorId:text('actor_id').notNull().references(()=>users.id),competencyId:text('competency_id').notNull().references(()=>competencies.id),phase:text('phase').notNull(),score:integer('score').notNull(),version:integer('version').notNull(),rubricVersion:text('rubric_version').notNull(),comment:text('comment').notNull(),transferSource:text('transfer_source').references(()=>learningWorks.id),sourceVersion:integer('source_version'),createdAt:text('created_at').notNull(),
},t=>[index('competency_evidence_work').on(t.workId,t.createdAt)]);
