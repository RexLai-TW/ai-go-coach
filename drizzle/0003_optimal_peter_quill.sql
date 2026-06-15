CREATE TABLE `fullGameAnalysisProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` int NOT NULL,
	`userId` int NOT NULL,
	`totalMoves` int NOT NULL,
	`analyzedMoves` int NOT NULL DEFAULT 0,
	`status` enum('pending','analyzing','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fullGameAnalysisProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `fullGameAnalysisProgress_gameId_unique` UNIQUE(`gameId`)
);
--> statement-breakpoint
ALTER TABLE `games` ADD `scheduleCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `games` ADD CONSTRAINT `games_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`);