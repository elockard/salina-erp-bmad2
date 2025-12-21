CREATE TYPE "public"."asset_type" AS ENUM('cover_thumbnail', 'cover_web', 'cover_print', 'back_cover_copy', 'author_bio', 'press_release');--> statement-breakpoint
CREATE TABLE "marketing_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"file_name" varchar(255),
	"s3_key" varchar(500),
	"content_type" varchar(100),
	"file_size" integer,
	"text_content" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "marketing_assets_tenant_title_idx" ON "marketing_assets" USING btree ("tenant_id","title_id");--> statement-breakpoint
CREATE INDEX "marketing_assets_tenant_deleted_idx" ON "marketing_assets" USING btree ("tenant_id","deleted_at");