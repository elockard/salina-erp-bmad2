import { redirect } from "next/navigation";

/**
 * Root page redirect
 *
 * Redirects all traffic from / to /dashboard.
 * Clerk middleware handles authentication - unauthenticated users
 * will be redirected to /sign-in automatically.
 */
export default function Home() {
  redirect("/dashboard");
}
