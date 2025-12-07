# Story 9.2: Add Contact and Legal Pages

Status: done

## Story

As a **potential customer**,
I want **to access contact information and legal pages**,
so that **I can reach out with questions and understand terms**.

## Acceptance Criteria

1. **Given** I am viewing the public site **when** I click the "Privacy Policy" link in the footer **then** I am navigated to `/privacy` and see the privacy policy page

2. **Given** I am viewing the public site **when** I click the "Terms of Service" link in the footer **then** I am navigated to `/terms` and see the terms of service page

3. **Given** I am viewing the `/contact` page **then** I see:
   - A contact form with fields: Name, Email, Company (optional), Message
   - Company contact information
   - Support email address
   - Form validation for required fields

4. **Given** I am viewing the `/contact` page **when** I submit the contact form with valid data **then** the form is submitted via server action and I see a success message

5. **Given** I am viewing the `/privacy` page **then** I see:
   - Standard privacy policy content
   - Data collection practices section
   - Cookie usage section
   - Contact information for privacy questions

6. **Given** I am viewing the `/terms` page **then** I see:
   - Standard terms of service content
   - Subscription terms section
   - Acceptable use policy section
   - Liability limitations section

7. **Given** I am viewing any of the contact/legal pages **then**:
   - I see the same header/navigation as the landing page
   - I see the same footer as the landing page
   - The page is responsive (mobile, tablet, desktop)
   - I can navigate back to home via logo or navigation

8. **Given** I am viewing any of these pages on mobile **then** the layout adapts properly and is usable

## Tasks / Subtasks

- [x] Task 1: Create shared page layout for public pages (AC: #7)
  - [x] Create `src/app/(public)/layout.tsx` with PublicNav and Footer
  - [x] Import and use existing components from `src/components/marketing/`
  - [x] Ensure layout wraps all public pages consistently

- [x] Task 2: Create Contact page (AC: #3, #4)
  - [x] Create `src/app/(public)/contact/page.tsx`
  - [x] Add SEO metadata (title, description, Open Graph)
  - [x] Create contact form component `src/components/marketing/contact-form.tsx`
  - [x] Use React Hook Form + Zod for validation
  - [x] Add fields: name (required), email (required), company (optional), message (required)
  - [x] Add company contact information section

- [x] Task 3: Create contact form server action (AC: #4)
  - [x] Create `src/app/(public)/contact/actions.ts`
  - [x] Implement `submitContactForm` server action
  - [x] Validate input with Zod schema
  - [x] For MVP: Log submission (can add email via Resend in future)
  - [x] Return success/error response
  - [x] Handle form state with useActionState

- [x] Task 4: Create Privacy Policy page (AC: #1, #5)
  - [x] Create `src/app/(public)/privacy/page.tsx`
  - [x] Add SEO metadata
  - [x] Add privacy policy content sections:
    - Information We Collect
    - How We Use Your Information
    - Cookies and Tracking
    - Data Security
    - Your Rights
    - Contact for Privacy Questions

- [x] Task 5: Create Terms of Service page (AC: #2, #6)
  - [x] Create `src/app/(public)/terms/page.tsx`
  - [x] Add SEO metadata
  - [x] Add terms of service content sections:
    - Agreement to Terms
    - Use of Service
    - Subscription Terms
    - Acceptable Use Policy
    - Intellectual Property
    - Limitation of Liability
    - Termination
    - Contact Information

- [x] Task 6: Ensure responsive design (AC: #7, #8)
  - [x] Test all pages at mobile viewport (320px-480px)
  - [x] Test all pages at tablet viewport (768px)
  - [x] Test all pages at desktop viewport (1024px+)
  - [x] Verify touch targets are appropriately sized (min 44px)

- [x] Task 7: Update navigation links (AC: #7)
  - [x] Update footer.tsx to add `/contact` link if not present
  - [x] Verify `/privacy` and `/terms` links work correctly
  - [x] Ensure "Contact" nav link scrolls to contact section on homepage OR links to /contact page

- [x] Task 8: Write unit tests
  - [x] Create `tests/unit/contact-page.test.tsx`
  - [x] Test contact form renders all fields
  - [x] Test form validation (empty fields, invalid email)
  - [x] Test privacy policy page renders key sections
  - [x] Test terms page renders key sections

- [x] Task 9: Write E2E tests
  - [x] Create `tests/e2e/contact-legal-pages.spec.ts`
  - [x] Test navigation to /contact, /privacy, /terms from footer
  - [x] Test contact form submission with success message
  - [x] Test form validation error display
  - [x] Test responsive layout on mobile viewport
  - [x] Use "public" project (no auth required)

## Dev Notes

### Functional Requirements

This story does not directly implement specific FRs from the PRD - it is a supporting story for the Public Presence epic that enhances FR107-FR110 (public landing page). The contact and legal pages are standard requirements for any SaaS product.

### Architecture Compliance

**Route Structure:**
```
src/app/
├── (public)/              # Public route group (no auth required)
│   ├── layout.tsx         # Shared layout with PublicNav + Footer
│   ├── contact/
│   │   ├── page.tsx       # Contact page
│   │   ├── actions.ts     # Server action for form submission
│   │   └── schema.ts      # Zod validation schema
│   ├── privacy/
│   │   └── page.tsx       # Privacy policy page
│   └── terms/
│       └── page.tsx       # Terms of service page
└── page.tsx               # Landing page (keeps inline nav/footer)
```

**CRITICAL: Route Group vs Root Page**
- The `(public)` route group provides shared layout for `/contact`, `/privacy`, `/terms`
- The root `page.tsx` (landing page) is NOT in the route group - it already includes PublicNav and Footer inline
- This is intentional: landing page has unique structure (no top padding, full-bleed hero)
- Do NOT move root page.tsx into (public) group

**Route Group Behavior:**
- `(public)` does NOT add `/public` to URL - routes remain `/contact`, `/privacy`, `/terms`
- Layout.tsx in `(public)` wraps only pages inside that folder

**Public Layout (Copy-Paste Ready):**
```typescript
// src/app/(public)/layout.tsx
import { PublicNav } from "@/components/marketing/public-nav";
import { Footer } from "@/components/marketing/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
```

### Component Reuse (from Story 9-1)

**Existing components to import:**
```typescript
import { PublicNav } from "@/components/marketing/public-nav";
import { Footer } from "@/components/marketing/footer";
```

**CSS Variable Usage (CRITICAL):**
- Use `bg-primary text-primary-foreground` NOT `bg-[#1E3A5F]`
- Use `text-muted-foreground` for secondary text
- Use `bg-muted` for subtle backgrounds
- CSS variables defined in `globals.css`

### Contact Form Implementation

**Component Location:** `src/components/marketing/contact-form.tsx`
- Lives in marketing folder alongside other public-facing components
- Imported by the contact page: `import { ContactForm } from "@/components/marketing/contact-form"`

**Form Schema (Zod) - `src/app/(public)/contact/schema.ts`:**
```typescript
import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000, "Message too long"),
  // Honeypot field for spam prevention - should be empty
  website: z.string().max(0, "Bot detected").optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
```

**Server Action Pattern - `src/app/(public)/contact/actions.ts`:**
```typescript
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
```

**Form State Management (CRITICAL):**
- Use React Hook Form for client-side validation (immediate feedback)
- Use useActionState for server action integration (form submission)
- These work TOGETHER, not as alternatives

**Form Component Pattern - `src/components/marketing/contact-form.tsx`:**
```typescript
"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitContactForm } from "@/app/(public)/contact/actions";
import { contactFormSchema, type ContactFormData } from "@/app/(public)/contact/schema";

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactForm, null);

  const { register, formState: { errors }, watch } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const messageLength = watch("message")?.length || 0;

  if (state?.success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg" role="status">
        <p className="text-green-800 font-medium">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Honeypot field - hidden from users, catches bots */}
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
        <Input
          id="name"
          {...register("name")}
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company (optional)</Label>
        <Input id="company" {...register("company")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message <span className="text-destructive">*</span></Label>
        <Textarea
          id="message"
          rows={5}
          {...register("message")}
          aria-required="true"
          aria-invalid={!!errors.message}
          aria-describedby="message-hint message-error"
        />
        <div className="flex justify-between text-sm">
          <span id="message-hint" className="text-muted-foreground">
            {messageLength}/1000 characters
          </span>
          {errors.message && (
            <p id="message-error" className="text-destructive" role="alert">
              {errors.message.message}
            </p>
          )}
        </div>
      </div>

      {state && !state.success && (
        <p className="text-sm text-destructive" role="alert">{state.message}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
```

**Accessibility Requirements:**
- All form fields have associated `<Label>` with `htmlFor`
- Required fields use `aria-required="true"`
- Error states use `aria-invalid` and `aria-describedby`
- Error messages use `role="alert"` for screen reader announcements
- Success message uses `role="status"`
- Honeypot field uses `aria-hidden="true"` and `tabIndex={-1}`

### SEO Metadata Pattern

```typescript
// src/app/(public)/contact/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us - Salina ERP",
  description: "Get in touch with the Salina ERP team. We'd love to hear from you.",
  openGraph: {
    title: "Contact Us - Salina ERP",
    description: "Get in touch with the Salina ERP team.",
    type: "website",
  },
};
```

### Legal Content Guidelines

**Privacy Policy sections:**
1. Information We Collect (account data, usage data, cookies)
2. How We Use Your Information (provide service, communicate, improve)
3. Cookies and Tracking (what cookies we use)
4. Data Security (how we protect data)
5. Your Rights (access, correction, deletion)
6. Contact Us (privacy@salina-erp.com)

**Terms of Service sections:**
1. Agreement to Terms (by using service you agree)
2. Use of Service (what service provides)
3. Subscription Terms (payment, billing, cancellation)
4. Acceptable Use Policy (no abuse, no illegal activity)
5. Intellectual Property (we own the platform, you own your data)
6. Limitation of Liability (standard disclaimers)
7. Termination (when we can terminate)
8. Changes to Terms (we may update)
9. Contact Information (legal@salina-erp.com)

**IMPORTANT:** Legal pages should have placeholder content marked clearly. Production deployment requires legal review.

### Design Tokens (consistent with landing page)

- **Section padding:** `py-16 lg:py-24`
- **Container:** `max-w-4xl mx-auto px-4 sm:px-6 lg:px-8` (narrower for text-heavy pages)
- **Headings:** `text-3xl font-bold tracking-tight text-foreground`
- **Subheadings:** `text-xl font-semibold text-foreground`
- **Body text:** `text-muted-foreground leading-relaxed`
- **Section spacing:** `space-y-8`

### Test Patterns

**Unit Test (Contact Form):**
```typescript
// tests/unit/contact-page.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ContactForm } from "@/components/marketing/contact-form";

describe("ContactForm", () => {
  it("renders all required fields", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it("renders optional company field", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
  });

  it("shows validation errors for empty submission", async () => {
    render(<ContactForm />);
    const submitButton = screen.getByRole("button", { name: /send/i });
    await userEvent.click(submitButton);
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });

  it("shows character count for message field", () => {
    render(<ContactForm />);
    expect(screen.getByText(/0\/1000 characters/i)).toBeInTheDocument();
  });

  it("has honeypot field hidden from view", () => {
    render(<ContactForm />);
    const honeypot = screen.getByLabelText(/website/i);
    expect(honeypot.closest("div")).toHaveClass("hidden");
  });

  it("has proper accessibility attributes on required fields", () => {
    render(<ContactForm />);
    const nameInput = screen.getByLabelText(/name/i);
    expect(nameInput).toHaveAttribute("aria-required", "true");
  });
});
```

**E2E Test (Public Project):**
```typescript
// tests/e2e/contact-legal-pages.spec.ts
import { expect, test } from "@playwright/test";

// Uses "public" project - no auth required
test.describe("Contact and Legal Pages", () => {
  test("navigates to contact page from footer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /contact/i }).first().click();
    await expect(page).toHaveURL(/contact/);
  });

  test("contact form shows success on valid submission", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel(/name/i).fill("Test User");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/message/i).fill("This is a test message for the contact form.");
    await page.getByRole("button", { name: /send/i }).click();
    await expect(page.getByText(/thank you/i)).toBeVisible();
  });
});
```

### Previous Story Learnings (Story 9-1)

From the marketing landing page implementation:
- Components live in `src/components/marketing/`
- E2E tests use "public" project in `playwright.config.ts` (no auth fixtures)
- Smooth scroll enabled in `globals.css`
- Footer already has links to `/privacy` and `/terms` - these just need the pages created
- The "Contact" link in nav scrolls to `#contact` section on homepage - consider whether this should also link to `/contact` page

### File References

| File | Purpose |
|------|---------|
| `src/components/marketing/public-nav.tsx` | Existing navigation component |
| `src/components/marketing/footer.tsx` | Existing footer with legal links |
| `src/app/globals.css` | CSS variables and smooth scroll |
| `playwright.config.ts` | "public" project configuration |

### References

- [Source: docs/epics.md#Story 9.2: Add Contact and Legal Pages]
- [Source: docs/prd.md#Public Landing Page (Epic 9)]
- [Source: docs/architecture.md#Project Structure]
- [Source: docs/sprint-artifacts/9-1-build-marketing-landing-page.md]

## Dev Agent Record

### Context Reference

<!-- Story context created by SM agent -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- All 9 tasks completed
- Domain updated from salina-erp.com to salina.media across all files
- 32 unit tests passing (contact-page, privacy-page, terms-page)
- 20 E2E tests passing (contact-legal-pages.spec.ts)
- Updated playwright.config.ts to include contact-legal-pages.spec.ts in public project
- All pages responsive and accessible
- Code review fixes applied: added maxLength to textarea, added loading state test, added maxLength test

### File List

- src/app/(public)/layout.tsx
- src/app/(public)/contact/page.tsx
- src/app/(public)/contact/actions.ts
- src/app/(public)/contact/schema.ts
- src/app/(public)/privacy/page.tsx
- src/app/(public)/terms/page.tsx
- src/components/marketing/contact-form.tsx (updated: added maxLength)
- src/components/marketing/footer.tsx (updated: verified /contact link)
- tests/unit/contact-page.test.tsx (updated: added loading state and maxLength tests)
- tests/unit/privacy-page.test.tsx
- tests/unit/terms-page.test.tsx
- tests/e2e/contact-legal-pages.spec.ts
- playwright.config.ts (updated)

