CREATE INDEX "platform_audit_logs_admin_email_created_at_idx" ON "platform_audit_logs" USING btree ("admin_email","created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_action_idx" ON "platform_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_created_at_idx" ON "platform_audit_logs" USING btree ("created_at");