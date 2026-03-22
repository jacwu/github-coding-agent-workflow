CREATE TABLE `destinations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`country` text NOT NULL,
	`region` text,
	`category` text NOT NULL,
	`price_level` integer NOT NULL,
	`rating` real DEFAULT 0 NOT NULL,
	`best_season` text,
	`latitude` real,
	`longitude` real,
	`image` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "destinations_price_level_check" CHECK("destinations"."price_level" >= 1 AND "destinations"."price_level" <= 5),
	CONSTRAINT "destinations_rating_check" CHECK("destinations"."rating" >= 0 AND "destinations"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE `trip_stops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trip_id` integer NOT NULL,
	`destination_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`arrival_date` text,
	`departure_date` text,
	`notes` text,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `trip_stops_trip_id_idx` ON `trip_stops` (`trip_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `trip_stops_trip_id_sort_order_idx` ON `trip_stops` (`trip_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `trips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "trips_status_check" CHECK("trips"."status" IN ('draft', 'planned', 'completed'))
);
--> statement-breakpoint
CREATE INDEX `trips_user_id_idx` ON `trips` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);