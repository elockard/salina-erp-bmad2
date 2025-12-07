import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message too long"),
  // Honeypot field for spam prevention - should be empty
  website: z.string().max(0, "Bot detected").optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
