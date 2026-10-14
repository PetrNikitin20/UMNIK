CREATE TABLE `assignment_competencies` (
	`assignment_id` text NOT NULL,
	`competency_id` text NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`competency_id`) REFERENCES `competencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assignment_competency` ON `assignment_competencies` (`assignment_id`,`competency_id`);--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`module_id` text NOT NULL,
	`title` text NOT NULL,
	`instruction` text NOT NULL,
	`deadline` text,
	`rubric_version` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`module_id`) REFERENCES `learning_modules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `competencies` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`rubric_version` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `competency_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`competency_id` text NOT NULL,
	`phase` text NOT NULL,
	`score` integer NOT NULL,
	`version` integer NOT NULL,
	`rubric_version` text NOT NULL,
	`comment` text NOT NULL,
	`transfer_source` text,
	`source_version` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `learning_works`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`competency_id`) REFERENCES `competencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_source`) REFERENCES `learning_works`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `competency_evidence_work` ON `competency_evidence` (`work_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `course_teachers` (
	`course_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_teacher` ON `course_teachers` (`course_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`semester` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_slug_unique` ON `courses` (`slug`);--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_enrollment` ON `enrollments` (`course_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `learning_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`assignment_id` text NOT NULL,
	`work_id` text,
	`event` text NOT NULL,
	`version` integer,
	`module_version` text NOT NULL,
	`source` text NOT NULL,
	`seconds` integer DEFAULT 0 NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`work_id`) REFERENCES `learning_works`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `learning_event_owner_time` ON `learning_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `learning_modules` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`version` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learning_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`version` integer NOT NULL,
	`payload` text NOT NULL,
	`changes` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `learning_works`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_revision_version` ON `learning_revisions` (`work_id`,`version`);--> statement-breakpoint
CREATE TABLE `learning_works` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`assignment_id` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`submitted_version` integer,
	`source_work` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_work_owner` ON `learning_works` (`user_id`,`assignment_id`);--> statement-breakpoint
DROP INDEX `revision_version`;--> statement-breakpoint
ALTER TABLE `revisions` ADD `work_key` text DEFAULT 'umnik-main' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `revision_work_version` ON `revisions` (`user_id`,`work_key`,`version`);--> statement-breakpoint
ALTER TABLE `evaluations` ADD `work_key` text DEFAULT 'umnik-main' NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `work_key` text DEFAULT 'umnik-main' NOT NULL;