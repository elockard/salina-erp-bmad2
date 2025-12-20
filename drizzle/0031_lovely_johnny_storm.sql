ALTER TABLE "channel_feeds" ADD COLUMN "feed_content" text;--> statement-breakpoint
ALTER TABLE "channel_feeds" ADD COLUMN "retry_of" uuid;