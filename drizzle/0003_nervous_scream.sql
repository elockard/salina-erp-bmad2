CREATE TABLE "titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"genre" text,
	"word_count" integer,
	"publication_status" text DEFAULT 'draft' NOT NULL,
	"isbn" text,
	"eisbn" text,
	"publication_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "titles_isbn_unique" UNIQUE("isbn"),
	CONSTRAINT "titles_eisbn_unique" UNIQUE("eisbn")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "clerk_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "titles_tenant_id_idx" ON "titles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "titles_publication_status_idx" ON "titles" USING btree ("publication_status");--> statement-breakpoint
CREATE INDEX "titles_author_id_idx" ON "titles" USING btree ("author_id");