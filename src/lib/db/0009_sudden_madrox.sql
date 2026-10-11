    ALTER TABLE "feeds" ADD COLUMN "last_fetched_at" timestamp DEFAULT now();--> statement-breakpoint
    ALTER TABLE "feeds" DROP COLUMN "last_fetch_at";