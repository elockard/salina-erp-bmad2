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
CREATE INDEX "codelist_values_list_code_idx" ON "codelist_values" USING btree ("list_number","code");--> statement-breakpoint
CREATE INDEX "codelist_values_list_number_idx" ON "codelist_values" USING btree ("list_number");--> statement-breakpoint
CREATE INDEX "codelists_list_number_idx" ON "codelists" USING btree ("list_number");