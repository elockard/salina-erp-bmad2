import { redirect } from "next/navigation";

/**
 * @deprecated Authors are now part of the unified Contacts system.
 * This page redirects to /contacts?role=author for backward compatibility.
 * See Story 0.5: Consolidate Authors into Contacts
 */
export default function AuthorsPage() {
  redirect("/contacts?role=author");
}
