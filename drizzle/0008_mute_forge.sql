CREATE TABLE "contract_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"format" text NOT NULL,
	"min_quantity" integer NOT NULL,
	"max_quantity" integer,
	"rate" numeric(5, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_tiers_min_quantity_nonnegative" CHECK (min_quantity >= 0),
	CONSTRAINT "contract_tiers_max_quantity_valid" CHECK (max_quantity IS NULL OR max_quantity > min_quantity),
	CONSTRAINT "contract_tiers_rate_valid" CHECK (rate >= 0 AND rate <= 1)
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"advance_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"advance_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"advance_recouped" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_tenant_author_title_unique" UNIQUE("tenant_id","author_id","title_id"),
	CONSTRAINT "contracts_advance_amount_nonnegative" CHECK (advance_amount >= 0),
	CONSTRAINT "contracts_advance_paid_nonnegative" CHECK (advance_paid >= 0),
	CONSTRAINT "contracts_advance_recouped_nonnegative" CHECK (advance_recouped >= 0)
);
--> statement-breakpoint
ALTER TABLE "contract_tiers" ADD CONSTRAINT "contract_tiers_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_tiers_contract_id_idx" ON "contract_tiers" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "contracts_tenant_id_idx" ON "contracts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contracts_author_id_idx" ON "contracts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "contracts_title_id_idx" ON "contracts" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contracts_tenant_id_author_id_idx" ON "contracts" USING btree ("tenant_id","author_id");