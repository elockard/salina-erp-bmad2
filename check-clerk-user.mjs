import "dotenv/config";
import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Get user by ID
const userId = "user_35uJFCmLhXTS0AhZRgm5uLr3G0D";

try {
  const user = await clerk.users.getUser(userId);
  console.log("User ID:", user.id);
  console.log("Email:", user.emailAddresses[0].emailAddress);
  console.log("Public Metadata:", JSON.stringify(user.publicMetadata, null, 2));
} catch (error) {
  console.log("Error fetching user:", error.message);
}
