/**
 * Platform Admin Impersonation Service
 *
 * Story 13.6: Implement Tenant Impersonation for Support (AC: 1, 3-5)
 *
 * Provides Clerk actor token creation for user impersonation.
 * CRITICAL: Requires Clerk's paid plan for production (free in development).
 */

const CLERK_API_URL = "https://api.clerk.com/v1";
const IMPERSONATION_EXPIRY_SECONDS = 1800; // 30 minutes

/**
 * Create an actor token for user impersonation via Clerk Backend API
 *
 * @param subjectClerkId - CLERK user ID of user being impersonated
 * @param actorClerkId - CLERK user ID of platform admin doing the impersonation
 * @returns Sign-in URL and token ID, or null on failure
 */
export async function createActorToken(
  subjectClerkId: string,
  actorClerkId: string,
): Promise<{ url: string; tokenId: string } | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("createActorToken: CLERK_SECRET_KEY is not configured");
    return null;
  }

  try {
    const response = await fetch(`${CLERK_API_URL}/actor_tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: subjectClerkId,
        expires_in_seconds: IMPERSONATION_EXPIRY_SECONDS,
        actor: { sub: actorClerkId },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Failed to create actor token:",
        response.status,
        errorText,
      );
      return null;
    }

    const data = await response.json();
    return { url: data.url, tokenId: data.id };
  } catch (error) {
    console.error("createActorToken error:", error);
    return null;
  }
}
