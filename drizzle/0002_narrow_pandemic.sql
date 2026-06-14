CREATE TABLE `llm_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(50) NOT NULL,
	`apiBaseUrl` varchar(500),
	`apiKey` text,
	`modelName` varchar(255),
	`isEnabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `llm_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `llm_settings_userId_unique` UNIQUE(`userId`)
);
