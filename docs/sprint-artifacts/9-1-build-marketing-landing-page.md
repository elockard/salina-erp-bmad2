# Story 9.1: Build Marketing Landing Page

Status: done

## Story

As a **potential customer**,
I want **to view a professional landing page for Salina ERP**,
so that **I can understand the product and sign up**.

## Acceptance Criteria

1. **Given** I visit the root domain (salina-erp.com or localhost:3000/) **when** not logged in **then** I see the marketing landing page instead of the dashboard

2. **Given** I am viewing the landing page **then** I see a Hero section with:
   - Headline: "Publishing ERP Built for Publishers"
   - Subheadline with value proposition (royalties, ISBN, authors)
   - CTA button: "Start Free Trial" or "Get Started"
   - Hero image or illustration

3. **Given** I am viewing the landing page **then** I see a Features section with:
   - 4-6 feature cards highlighting key capabilities
   - Tiered Royalty Calculations
   - ISBN Pool Management
   - Author Portal
   - Financial Reporting
   - Multi-tenant SaaS
   - Returns Approval Workflow
   - Icons and brief descriptions for each feature

4. **Given** I am viewing the landing page **then** I see a "How It Works" section with:
   - 3-4 step process illustration
   - Simple explanation of user journey

5. **Given** I am viewing the landing page **then** I see a Pricing section (if applicable) with:
   - Tier cards (Starter, Professional, Enterprise)
   - Feature comparison table
   - CTA buttons per tier

6. **Given** I am viewing the landing page **then** I see a Social proof section with:
   - Testimonial placeholders
   - "Trusted by X publishers" placeholder

7. **Given** I am viewing the landing page **then** I see a Footer with:
   - Navigation links
   - Contact information
   - Legal links (Privacy, Terms)
   - Copyright

8. **Given** I am viewing on any device **then** the page is responsive (mobile-first design)
   - Mobile: 320px-480px viewport
   - Tablet: 768px viewport
   - Desktop: 1024px+ viewport

9. **Given** I am already authenticated **when** I visit the root domain **then** I am redirected to /dashboard

10. **Given** I am viewing the landing page **then** I see Navigation with:
    - Logo (links to home)
    - Features, Pricing, Contact links (anchor smooth scroll)
    - Login button (links to /sign-in)
    - Get Started button (links to /sign-up or tenant registration)

11. **Given** a search engine crawls the page **then** proper SEO elements are present:
    - Meta title and description
    - Open Graph tags
    - Semantic HTML structure

## Tasks / Subtasks

- [x] Task 1: Replace existing root page with landing page (AC: #1, #9, #11)
  - [x] **CRITICAL**: Modify existing `src/app/page.tsx` - currently redirects to /dashboard
  - [x] Remove the redirect and render landing page content directly
  - [x] Add metadata export with SEO tags (copy-paste ready code in Dev Notes)
  - [x] Import and compose all section components
  - [x] Note: Page metadata will override layout.tsx metadata per Next.js convention

- [x] Task 2: Build public Navigation component (AC: #10)
  - [x] Create `src/components/marketing/public-nav.tsx`
  - [x] Add logo using `next/link` → href="/"
  - [x] Add anchor links: `<a href="#features">`, `<a href="#pricing">`
  - [x] Add Login button: `<Link href="/sign-in">`
  - [x] Add Get Started CTA: `<Link href="/sign-up">`
  - [x] Implement mobile hamburger menu with state
  - [x] Use `bg-primary text-primary-foreground` for buttons (NOT hardcoded hex)

- [x] Task 3: Build Hero section component (AC: #2)
  - [x] Create `src/components/marketing/hero-section.tsx`
  - [x] Add headline and subheadline with compelling copy
  - [x] Add primary CTA button using `<Link href="/sign-up">`
  - [x] Add hero illustration or placeholder image
  - [x] Use CSS variables: `bg-primary` for Editorial Navy, NOT `bg-[#1E3A5F]`

- [x] Task 4: Build Features section component (AC: #3)
  - [x] Create `src/components/marketing/features-section.tsx`
  - [x] Add `id="features"` for anchor navigation
  - [x] Create feature card with icon, title, description
  - [x] Add 6 feature cards (see content table in Dev Notes)
  - [x] Use Lucide icons: Calculator, BookOpen, Users, BarChart3, Building2, RotateCcw
  - [x] Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

- [x] Task 5: Build How It Works section component (AC: #4)
  - [x] Create `src/components/marketing/how-it-works-section.tsx`
  - [x] Design 3-4 step visual process with numbers
  - [x] Add step titles and descriptions
  - [x] Connect steps visually (flex with dividers)

- [x] Task 6: Build Pricing section component (AC: #5)
  - [x] Create `src/components/marketing/pricing-section.tsx`
  - [x] Add `id="pricing"` for anchor navigation
  - [x] Create pricing tier card using shadcn/ui Card
  - [x] Add 3 tiers with features (see content table in Dev Notes)
  - [x] Add CTA buttons using `<Link href="/sign-up">`

- [x] Task 7: Build Social Proof section component (AC: #6)
  - [x] Create `src/components/marketing/testimonials-section.tsx`
  - [x] Add testimonial card component with avatar, quote, name
  - [x] Include 2-3 placeholder testimonials
  - [x] Add "Trusted by" badge area

- [x] Task 8: Build Footer component (AC: #7)
  - [x] Create `src/components/marketing/footer.tsx`
  - [x] Add nav links using anchor and `<Link>`
  - [x] Add legal links (Privacy, Terms - placeholder routes)
  - [x] Add contact email
  - [x] Add copyright with `{new Date().getFullYear()}`

- [x] Task 9: Add smooth scroll behavior (AC: #10)
  - [x] Add `scroll-behavior: smooth` to `html` in globals.css (after `@layer base {}` block)
  - [x] Verify anchor links scroll smoothly to sections

- [x] Task 10: Ensure responsive design (AC: #8)
  - [x] Test mobile viewport (320px-480px)
  - [x] Test tablet viewport (768px)
  - [x] Test desktop viewport (1024px+)
  - [x] Verify touch targets are appropriately sized (min 44px)

- [x] Task 11: Write unit tests
  - [x] Create `tests/unit/landing-page.test.tsx`
  - [x] Test hero section renders headline and CTA
  - [x] Test features section renders 6 feature cards
  - [x] Test navigation links have correct href values
  - [x] Use vitest + testing-library pattern (see Dev Notes)

- [x] Task 12: Write E2E tests
  - [x] Create `tests/e2e/landing-page.spec.ts`
  - [x] Test landing page loads for unauthenticated users at /
  - [x] Test CTA buttons navigate to /sign-up
  - [x] Test anchor navigation scrolls to sections
  - [x] Test mobile nav menu opens/closes
  - [x] Note: No auth fixture needed - landing page is public

## Dev Notes

### Functional Requirements
- **FR107**: Public landing page accessible without authentication
- **FR108**: Displays product features and benefits
- **FR109**: Call-to-action for tenant registration
- **FR110**: Design consistent with application branding

### Critical: Existing Root Page

**Current `src/app/page.tsx` redirects to /dashboard:**
```typescript
// CURRENT - MUST REPLACE
export default function Home() {
  redirect("/dashboard");
}
```

**Replace with landing page that imports section components.**

### Architecture Compliance

**Component Location:** `src/components/marketing/` for all landing page components

**Required Imports:**
```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
```

**CSS Variable Usage (CRITICAL):**
- Use `bg-primary text-primary-foreground` NOT `bg-[#1E3A5F]`
- Use `text-muted-foreground` for secondary text
- CSS variables defined in `globals.css:44-78`

**Navigation Pattern:** Use `next/link` for all internal links:
```typescript
import Link from "next/link";
<Link href="/sign-up">Get Started</Link>
```

### SEO Metadata (Copy-Paste Ready)

```typescript
// src/app/page.tsx
import type { Metadata } from "next";

// This metadata will override layout.tsx metadata per Next.js convention
export const metadata: Metadata = {
  title: 'Salina ERP - Publishing ERP Built for Publishers',
  description: 'Streamline your publishing operations with tiered royalty calculations, ISBN management, author portals, and financial reporting.',
  openGraph: {
    title: 'Salina ERP - Publishing ERP Built for Publishers',
    description: 'The complete ERP solution for modern publishers.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Salina ERP - Publishing ERP Built for Publishers',
  },
};
```

### Smooth Scroll CSS

Add to `src/app/globals.css` **after the `@layer base { }` block** (line 122):
```css
html {
  scroll-behavior: smooth;
}
```

### Feature Card Content

| Feature | Lucide Icon | Description |
|---------|-------------|-------------|
| Tiered Royalty Calculations | Calculator | Automatic tiered rate calculations with advance recoupment |
| ISBN Pool Management | BookOpen | Import, track, and assign ISBNs with ease |
| Author Portal | Users | Self-service statement access for authors |
| Financial Reporting | BarChart3 | Comprehensive sales and liability reports |
| Multi-tenant SaaS | Building2 | Secure, isolated data for each publisher |
| Returns Workflow | RotateCcw | Approval process ensures accurate royalties |

### Pricing Tier Content

| Tier | Price | Key Features |
|------|-------|--------------|
| Starter | $99/mo | 50 titles, 5 users, Quarterly statements |
| Professional | $249/mo | 200 titles, 15 users, All reports |
| Enterprise | Custom | Unlimited, API access, Priority support |

### Design Tokens

- **Primary:** `bg-primary` (Editorial Navy via CSS variable)
- **Accent:** `bg-amber-500` for CTAs
- **Background:** `bg-background` / `bg-muted`
- **Section padding:** `py-16 lg:py-24`
- **Container:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (standard pattern)

### Unit Test Pattern

```typescript
// tests/unit/landing-page.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroSection } from "@/components/marketing/hero-section";

describe("HeroSection", () => {
  it("renders headline", () => {
    render(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /publishing erp/i
    );
  });

  it("renders CTA button with correct href", () => {
    render(<HeroSection />);
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      "/sign-up"
    );
  });
});
```

### E2E Test Pattern (Unauthenticated)

```typescript
// tests/e2e/landing-page.spec.ts
import { expect, test } from "@playwright/test";

// No auth fixture - landing page is public
test.describe("Landing Page", () => {
  test("loads for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /publishing erp/i })
    ).toBeVisible();
  });

  test("CTA navigates to sign-up", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /get started/i }).click();
    await expect(page).toHaveURL(/sign-up/);
  });
});
```

### Test File Locations

- Unit tests: `tests/unit/landing-page.test.tsx`
- E2E tests: `tests/e2e/landing-page.spec.ts`

### References

- [Source: docs/prd.md#Public Landing Page (Epic 9)]
- [Source: docs/epics.md#Story 9.1: Build Marketing Landing Page]
- [Source: docs/architecture.md#Project Structure]

## Dev Agent Record

### Context Reference

<!-- Story context created by SM agent -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- All 12 tasks completed successfully
- 24 unit tests passing in `tests/unit/landing-page.test.tsx`
- 25 E2E tests in `tests/e2e/landing-page.spec.ts` (uses "public" project, no auth required)
- Added "public" project to `playwright.config.ts` for unauthenticated page tests
- Landing page properly redirects authenticated users to /dashboard
- All ACs verified through unit tests

### File List

**New Files:**
- `src/components/marketing/public-nav.tsx` - Navigation component with mobile menu
- `src/components/marketing/hero-section.tsx` - Hero section with headline and CTA
- `src/components/marketing/features-section.tsx` - 6 feature cards with icons
- `src/components/marketing/how-it-works-section.tsx` - 4-step process section
- `src/components/marketing/pricing-section.tsx` - 3 pricing tiers
- `src/components/marketing/testimonials-section.tsx` - Testimonials with trust badge
- `src/components/marketing/footer.tsx` - Footer with links and copyright
- `src/components/marketing/index.ts` - Barrel export file
- `tests/unit/landing-page.test.tsx` - 24 unit tests for all components
- `tests/e2e/landing-page.spec.ts` - E2E tests for public landing page

**Modified Files:**
- `src/app/page.tsx` - Complete rewrite from redirect to landing page
- `src/app/globals.css` - Added smooth scroll behavior
- `playwright.config.ts` - Added "public" project for unauthenticated tests

