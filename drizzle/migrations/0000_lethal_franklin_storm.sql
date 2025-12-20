CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action_type" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"changes" jsonb,
	"metadata" jsonb,
	"status" text DEFAULT 'success' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"tax_id" text,
	"payment_method" text,
	"portal_user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_portal_user_id_unique" UNIQUE("portal_user_id")
);
--> statement-breakpoint
CREATE TABLE "channel_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"credentials" text NOT NULL,
	"metadata" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"last_connection_test" timestamp with time zone,
	"last_connection_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_credentials_tenant_id_channel_unique" UNIQUE("tenant_id","channel")
);
--> statement-breakpoint
CREATE TABLE "channel_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"product_count" integer,
	"file_size" integer,
	"file_name" text,
	"feed_type" text NOT NULL,
	"triggered_by" text NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"feed_content" text,
	"retry_of" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "codelist_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_number" integer NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"notes" text,
	"deprecated" boolean DEFAULT false,
	"added_in_issue" integer
);
--> statement-breakpoint
CREATE TABLE "codelists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_number" integer NOT NULL,
	"issue_number" integer NOT NULL,
	"list_name" text NOT NULL,
	"value_count" integer NOT NULL,
	"loaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "codelists_list_number_unique" UNIQUE("list_number")
);
--> statement-breakpoint
CREATE TABLE "contact_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"role" text NOT NULL,
	"role_specific_data" jsonb,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	CONSTRAINT "contact_roles_contact_role_unique" UNIQUE("contact_id","role"),
	CONSTRAINT "contact_roles_role_valid" CHECK (role IN ('author', 'customer', 'vendor', 'distributor'))
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text DEFAULT 'USA',
	"tax_id" text,
	"tin_encrypted" text,
	"tin_type" text,
	"tin_last_four" text,
	"is_us_based" boolean DEFAULT true,
	"w9_received" boolean DEFAULT false,
	"w9_received_date" timestamp with time zone,
	"payment_info" jsonb,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"portal_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "contacts_tenant_email_unique" UNIQUE("tenant_id","email"),
	CONSTRAINT "contacts_portal_user_unique" UNIQUE("portal_user_id"),
	CONSTRAINT "contacts_status_valid" CHECK (status IN ('active', 'inactive'))
);
--> statement-breakpoint
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
	"author_id" uuid,
	"contact_id" uuid,
	"title_id" uuid NOT NULL,
	"advance_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"advance_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"advance_recouped" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"tier_calculation_mode" text DEFAULT 'period' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_tenant_author_title_unique" UNIQUE("tenant_id","author_id","title_id"),
	CONSTRAINT "contracts_advance_amount_nonnegative" CHECK (advance_amount >= 0),
	CONSTRAINT "contracts_advance_paid_nonnegative" CHECK (advance_paid >= 0),
	CONSTRAINT "contracts_advance_recouped_nonnegative" CHECK (advance_recouped >= 0)
);
--> statement-breakpoint
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
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"item_code" text,
	"description" text NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"tax_rate" numeric(5, 4),
	"amount" numeric(10, 2) NOT NULL,
	"title_id" uuid,
	CONSTRAINT "invoice_line_items_invoice_line_number_unique" UNIQUE("invoice_id","line_number"),
	CONSTRAINT "invoice_line_items_quantity_positive" CHECK (quantity > 0),
	CONSTRAINT "invoice_line_items_unit_price_positive" CHECK (unit_price > 0),
	CONSTRAINT "invoice_line_items_amount_positive" CHECK (amount > 0)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"bill_to_address" jsonb NOT NULL,
	"ship_to_address" jsonb,
	"po_number" text,
	"payment_terms" text DEFAULT 'net_30' NOT NULL,
	"custom_terms_days" integer,
	"shipping_method" text,
	"shipping_cost" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax_rate" numeric(5, 4) DEFAULT '0.0000' NOT NULL,
	"tax_amount" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"amount_paid" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"balance_due" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"pdf_s3_key" text,
	"sent_at" timestamp with time zone,
	CONSTRAINT "invoices_tenant_invoice_number_unique" UNIQUE("tenant_id","invoice_number"),
	CONSTRAINT "invoices_shipping_cost_non_negative" CHECK (shipping_cost >= 0),
	CONSTRAINT "invoices_subtotal_non_negative" CHECK (subtotal >= 0),
	CONSTRAINT "invoices_tax_rate_non_negative" CHECK (tax_rate >= 0),
	CONSTRAINT "invoices_tax_amount_non_negative" CHECK (tax_amount >= 0),
	CONSTRAINT "invoices_total_non_negative" CHECK (total >= 0),
	CONSTRAINT "invoices_amount_paid_non_negative" CHECK (amount_paid >= 0),
	CONSTRAINT "invoices_status_valid" CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'void')),
	CONSTRAINT "invoices_payment_terms_valid" CHECK (payment_terms IN ('net_30', 'net_60', 'due_on_receipt', 'custom'))
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"payment_date" date NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"reference_number" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "payments_amount_positive" CHECK (amount > 0),
	CONSTRAINT "payments_payment_method_valid" CHECK (payment_method IN ('check', 'wire', 'credit_card', 'ach', 'other'))
);
--> statement-breakpoint
CREATE TABLE "isbn_prefixes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prefix" text NOT NULL,
	"block_size" integer NOT NULL,
	"type" text,
	"description" text,
	"total_isbns" integer NOT NULL,
	"available_count" integer NOT NULL,
	"assigned_count" integer DEFAULT 0 NOT NULL,
	"generation_status" text DEFAULT 'pending' NOT NULL,
	"generation_error" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "isbn_prefixes_tenant_prefix_unique" UNIQUE("tenant_id","prefix")
);
--> statement-breakpoint
CREATE TABLE "isbns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"isbn_13" text NOT NULL,
	"type" text,
	"status" text DEFAULT 'available' NOT NULL,
	"assigned_to_title_id" uuid,
	"assigned_at" timestamp with time zone,
	"assigned_by_user_id" uuid,
	"prefix_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "isbns_isbn_13_unique" UNIQUE("isbn_13")
);
--> statement-breakpoint
CREATE TABLE "onix_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title_ids" uuid[] NOT NULL,
	"export_date" timestamp with time zone DEFAULT now() NOT NULL,
	"xml_content" text NOT NULL,
	"product_count" integer NOT NULL,
	"onix_version" text DEFAULT '3.1' NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onix_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"onix_version" text NOT NULL,
	"total_products" integer NOT NULL,
	"imported_count" integer NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"created_title_ids" uuid[],
	"created_contact_ids" uuid[],
	"result_details" jsonb,
	"imported_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"type" varchar(20) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"target_roles" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_admin_email" varchar(255) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_admin_email" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "platform_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_email" text NOT NULL,
	"admin_clerk_id" text NOT NULL,
	"action" text NOT NULL,
	"route" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"original_sale_id" uuid,
	"format" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"return_date" date NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"internal_note" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "returns_quantity_positive" CHECK (quantity > 0),
	CONSTRAINT "returns_unit_price_positive" CHECK (unit_price > 0),
	CONSTRAINT "returns_total_amount_positive" CHECK (total_amount > 0)
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"format" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"sale_date" date NOT NULL,
	"channel" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_quantity_positive" CHECK (quantity > 0),
	CONSTRAINT "sales_unit_price_positive" CHECK (unit_price > 0),
	CONSTRAINT "sales_total_amount_positive" CHECK (total_amount > 0)
);
--> statement-breakpoint
CREATE TABLE "statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"author_id" uuid,
	"contact_id" uuid,
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
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subdomain" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"fiscal_year_start" date,
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"statement_frequency" text DEFAULT 'quarterly' NOT NULL,
	"royalty_period_type" text DEFAULT 'fiscal_year' NOT NULL,
	"royalty_period_start_month" integer,
	"royalty_period_start_day" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspended_reason" text,
	"suspended_by_admin_email" text,
	"payer_ein_encrypted" text,
	"payer_ein_last_four" text,
	"payer_name" text,
	"payer_address_line1" text,
	"payer_address_line2" text,
	"payer_city" text,
	"payer_state" text,
	"payer_zip" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "title_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"ownership_percentage" numeric(5, 2) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "title_authors_title_contact_unique" UNIQUE("title_id","contact_id"),
	CONSTRAINT "title_authors_ownership_percentage_valid" CHECK (ownership_percentage >= 1 AND ownership_percentage <= 100)
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"author_id" uuid,
	"contact_id" uuid,
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
	"epub_accessibility_conformance" text,
	"accessibility_features" text[],
	"accessibility_hazards" text[],
	"accessibility_summary" text,
	CONSTRAINT "titles_isbn_unique" UNIQUE("isbn"),
	CONSTRAINT "titles_eisbn_unique" UNIQUE("eisbn")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clerk_user_id" text,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authors" ADD CONSTRAINT "authors_portal_user_id_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_credentials" ADD CONSTRAINT "channel_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_feeds" ADD CONSTRAINT "channel_feeds_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_portal_user_id_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_tiers" ADD CONSTRAINT "contract_tiers_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_1099" ADD CONSTRAINT "form_1099_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_1099" ADD CONSTRAINT "form_1099_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_1099" ADD CONSTRAINT "form_1099_generated_by_user_id_users_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_contacts_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isbn_prefixes" ADD CONSTRAINT "isbn_prefixes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isbn_prefixes" ADD CONSTRAINT "isbn_prefixes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isbns" ADD CONSTRAINT "isbns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isbns" ADD CONSTRAINT "isbns_assigned_to_title_id_titles_id_fk" FOREIGN KEY ("assigned_to_title_id") REFERENCES "public"."titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isbns" ADD CONSTRAINT "isbns_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "isbns" ADD CONSTRAINT "isbns_prefix_id_isbn_prefixes_id_fk" FOREIGN KEY ("prefix_id") REFERENCES "public"."isbn_prefixes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onix_exports" ADD CONSTRAINT "onix_exports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onix_exports" ADD CONSTRAINT "onix_exports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onix_imports" ADD CONSTRAINT "onix_imports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onix_imports" ADD CONSTRAINT "onix_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_original_sale_id_sales_id_fk" FOREIGN KEY ("original_sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_generated_by_user_id_users_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_authors" ADD CONSTRAINT "title_authors_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_authors" ADD CONSTRAINT "title_authors_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_authors" ADD CONSTRAINT "title_authors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "authors_tenant_id_idx" ON "authors" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "authors_email_idx" ON "authors" USING btree ("email");--> statement-breakpoint
CREATE INDEX "authors_is_active_idx" ON "authors" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "authors_tenant_id_is_active_idx" ON "authors" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "codelist_values_list_code_idx" ON "codelist_values" USING btree ("list_number","code");--> statement-breakpoint
CREATE INDEX "codelist_values_list_number_idx" ON "codelist_values" USING btree ("list_number");--> statement-breakpoint
CREATE INDEX "codelists_list_number_idx" ON "codelists" USING btree ("list_number");--> statement-breakpoint
CREATE INDEX "contact_roles_contact_id_idx" ON "contact_roles" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_roles_role_idx" ON "contact_roles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "contacts_tenant_id_idx" ON "contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contacts_tenant_status_idx" ON "contacts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "contacts_name_idx" ON "contacts" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "contract_tiers_contract_id_idx" ON "contract_tiers" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "contracts_tenant_id_idx" ON "contracts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contracts_author_id_idx" ON "contracts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "contracts_title_id_idx" ON "contracts" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contracts_tenant_id_author_id_idx" ON "contracts" USING btree ("tenant_id","author_id");--> statement-breakpoint
CREATE INDEX "form_1099_tenant_id_idx" ON "form_1099" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "form_1099_tenant_year_idx" ON "form_1099" USING btree ("tenant_id","tax_year");--> statement-breakpoint
CREATE INDEX "form_1099_contact_id_idx" ON "form_1099" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_line_items_title_id_idx" ON "invoice_line_items" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "invoices_tenant_id_idx" ON "invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invoices_customer_id_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_due_date_idx" ON "invoices" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "invoices_invoice_date_idx" ON "invoices" USING btree ("invoice_date");--> statement-breakpoint
CREATE INDEX "invoices_invoice_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_tenant_status_due_date_idx" ON "invoices" USING btree ("tenant_id","status","due_date");--> statement-breakpoint
CREATE INDEX "payments_tenant_id_idx" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_payment_date_idx" ON "payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "isbn_prefixes_tenant_id_idx" ON "isbn_prefixes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "isbn_prefixes_generation_status_idx" ON "isbn_prefixes" USING btree ("generation_status");--> statement-breakpoint
CREATE INDEX "isbns_tenant_id_idx" ON "isbns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "isbns_status_idx" ON "isbns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "isbns_assigned_to_title_id_idx" ON "isbns" USING btree ("assigned_to_title_id");--> statement-breakpoint
CREATE INDEX "isbns_prefix_id_idx" ON "isbns" USING btree ("prefix_id");--> statement-breakpoint
CREATE INDEX "onix_exports_tenant_id_idx" ON "onix_exports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "onix_exports_export_date_idx" ON "onix_exports" USING btree ("export_date");--> statement-breakpoint
CREATE INDEX "onix_exports_status_idx" ON "onix_exports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "onix_imports_tenant_id_idx" ON "onix_imports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "onix_imports_created_at_idx" ON "onix_imports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "onix_imports_status_idx" ON "onix_imports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "onix_imports_tenant_created_idx" ON "onix_imports" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_announcements_active_starts_at_idx" ON "platform_announcements" USING btree ("is_active","starts_at");--> statement-breakpoint
CREATE INDEX "platform_announcements_type_idx" ON "platform_announcements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "platform_announcements_created_at_idx" ON "platform_announcements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_admin_email_created_at_idx" ON "platform_audit_logs" USING btree ("admin_email","created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_action_idx" ON "platform_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_created_at_idx" ON "platform_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "returns_tenant_id_idx" ON "returns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "returns_title_id_idx" ON "returns" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "returns_status_idx" ON "returns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "returns_return_date_idx" ON "returns" USING btree ("return_date");--> statement-breakpoint
CREATE INDEX "returns_tenant_return_date_idx" ON "returns" USING btree ("tenant_id","return_date");--> statement-breakpoint
CREATE INDEX "returns_tenant_status_idx" ON "returns" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "sales_tenant_id_idx" ON "sales" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sales_title_id_idx" ON "sales" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "sales_sale_date_idx" ON "sales" USING btree ("sale_date");--> statement-breakpoint
CREATE INDEX "sales_channel_idx" ON "sales" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "sales_format_idx" ON "sales" USING btree ("format");--> statement-breakpoint
CREATE INDEX "sales_tenant_sale_date_idx" ON "sales" USING btree ("tenant_id","sale_date");--> statement-breakpoint
CREATE INDEX "statements_tenant_id_idx" ON "statements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "statements_author_id_idx" ON "statements" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "statements_period_idx" ON "statements" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "statements_status_idx" ON "statements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "title_authors_title_id_idx" ON "title_authors" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "title_authors_contact_id_idx" ON "title_authors" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "titles_tenant_id_idx" ON "titles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "titles_publication_status_idx" ON "titles" USING btree ("publication_status");--> statement-breakpoint
CREATE INDEX "titles_author_id_idx" ON "titles" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "users_tenant_id_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");