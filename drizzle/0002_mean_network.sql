ALTER TABLE "authors" ADD COLUMN "portal_user_id" uuid;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_portal_user_id_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_portal_user_id_unique" UNIQUE("portal_user_id");