"use server";

import { contactFormSchema } from "./schema";

export async function submitContactForm(
  prevState: { success: boolean; message: string } | null,
  formData: FormData
) {
  // Honeypot check - if filled, silently reject (looks like success to bots)
  const honeypot = formData.get("website");
  if (honeypot) {
    return { success: true, message: "Thank you! We'll be in touch soon." };
  }

  const parsed = contactFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { success: false, message: "Invalid form data" };
  }

  // For MVP: Log the submission
  console.log("Contact form submission:", parsed.data);

  // Future: Send email via Resend
  // await resend.emails.send({...});

  return { success: true, message: "Thank you! We'll be in touch soon." };
}
