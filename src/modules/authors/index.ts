/**
 * @deprecated This module is deprecated. Use `@/modules/contacts` instead.
 *
 * Author Module
 *
 * Story 0.5: Consolidate Authors into Contacts
 *
 * Authors are now managed through the unified Contacts system.
 * All new code should import from the contacts module:
 *   - import { ContactsSplitView } from "@/modules/contacts/components/contacts-split-view"
 *   - import { createContact, getContacts } from "@/modules/contacts"
 *   - Filter by role='author' when querying contacts
 *
 * This module is maintained for backward compatibility only.
 * Navigation has been updated to redirect /authors → /contacts?role=author
 */

// Actions (Server Actions)
export * from "./actions";
export { AuthorDetail } from "./components/author-detail";
export { AuthorForm } from "./components/author-form";
export { AuthorList } from "./components/author-list";

// Components
export { AuthorsSplitView } from "./components/authors-split-view";
// Queries
export * from "./queries";
// Schema
export * from "./schema";
// Types
export * from "./types";
