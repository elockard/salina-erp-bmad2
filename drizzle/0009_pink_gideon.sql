CREATE TABLE "statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"total_royalty_earned" numeric(10, 2) NOT NULL,
	"recoupment" numeric(10, 2) NOT NULL,
	"net_payable" numeric(10, 2) NOT NULL,
	"calculations" jsonb NOT NULL,
	"pdf_s3_key" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"email_sent_at" timestamp with time zone,
	"generated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_generated_by_user_id_users_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "statements_tenant_id_idx" ON "statements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "statements_author_id_idx" ON "statements" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "statements_period_idx" ON "statements" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "statements_status_idx" ON "statements" USING btree ("status");