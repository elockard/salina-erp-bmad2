import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["owner", "admin", "editor", "finance", "author"], {
    message: "Role is required",
  }),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["owner", "admin", "editor", "finance", "author"]),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
