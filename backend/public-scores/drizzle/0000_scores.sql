CREATE TABLE players (name_key TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE runs (id TEXT PRIMARY KEY NOT NULL, name_key TEXT NOT NULL, name TEXT NOT NULL, level INTEGER NOT NULL, payload TEXT NOT NULL, fingerprint TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL, steps INTEGER NOT NULL DEFAULT 0, assisted INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE INDEX runs_queue ON runs(status,created_at);
--> statement-breakpoint
CREATE INDEX runs_best ON runs(status,level,assisted,name_key,steps);
--> statement-breakpoint
CREATE INDEX runs_daily ON runs(name_key,created_at);
--> statement-breakpoint
CREATE TABLE limits (id TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, day INTEGER NOT NULL);
