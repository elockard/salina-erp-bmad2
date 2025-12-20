CREATE TABLE "form_1099" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"tax_year" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"pdf_s3_key" text,
	"generated_at" timestamp with time zone NOT NULL,
	"generated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_1099_tenant_contact_year_unique" UNIQUE("tenant_id","contact_id","tax_year")
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "payer_ein_encrypted" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "payer_ein_last_four" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "payer_name" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "payer_address_line1" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "payer_address_line2" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "payer_city" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "payer_state" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "payer_zip" text;--> statement-breakpoint
ALTER TABLE "form_1099" ADD CONSTRAINT "form_1099_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_1099" ADD CONSTRAINT "form_1099_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_1099" ADD CONSTRAINT "form_1099_generated_by_user_id_users_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_1099_tenant_id_idx" ON "form_1099" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "form_1099_tenant_year_idx" ON "form_1099" USING btree ("tenant_id","tax_year");--> statement-breakpoint
CREATE INDEX "form_1099_contact_id_idx" ON "form_1099" USING btree ("contact_id");