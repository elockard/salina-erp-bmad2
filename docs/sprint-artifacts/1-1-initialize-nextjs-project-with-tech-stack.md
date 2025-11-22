# Story 1.1: Initialize Next.js Project with Tech Stack

Status: ready-for-dev

## Story

As a development team,
I want to initialize the Next.js 16 project with all core dependencies and configuration,
so that we have a working foundation for all subsequent development.

## Acceptance Criteria

1. Next.js 16 with App Router is initialized via `npx create-next-app@latest salina-erp --typescript --tailwind --biome --app --src-dir --import-alias "@/*"`
2. TypeScript 5.x is configured with strict mode enabled
3. Tailwind CSS 4.1.17 is installed with Editorial Navy theme colors configured:
   - Primary: `#1e3a5f` (Editorial Navy)
   - Secondary: `#5b7c99` (Slate Blue)
   - Accent: `#c17d4a` (Warm Bronze)
   - Semantic colors (success, warning, error) per UX spec
4. Biome is configured for linting and formatting (replaces ESLint + Prettier)
5. shadcn/ui is initialized via `npx shadcn@latest init` with:
   - Base components: Button, Card, Input, Label, Form
   - Editorial Navy theme applied
   - Inter font configured as primary typeface
6. Drizzle ORM is installed with @neondatabase/serverless driver
7. Project structure follows Architecture pattern:
   ```
   src/
   ├── app/          # Next.js App Router
   ├── components/   # Shared components
   ├── modules/      # Feature modules
   ├── db/           # Database schemas
   └── lib/          # Shared utilities
   ```
8. Environment variables template (.env.example) is created with placeholders for:
   - DATABASE_URL
   - CLERK_SECRET_KEY
   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
9. Development server runs successfully on `npm run dev`
10. Build succeeds with `npm run build`

## Tasks / Subtasks

- [ ] Initialize Next.js 16 project with create-next-app (AC: #1)
  - [ ] Run create-next-app command with all required flags
  - [ ] Verify TypeScript, Tailwind, Biome, App Router, src/ directory are configured
  - [ ] Verify import alias @/\* is working
- [ ] Configure TypeScript strict mode (AC: #2)
  - [ ] Update tsconfig.json with strict: true
  - [ ] Verify no compilation errors
- [ ] Configure Tailwind CSS with Editorial Navy theme (AC: #3)
  - [ ] Update tailwind.config.ts with custom colors from UX spec
  - [ ] Add primary (#1e3a5f), secondary (#5b7c99), accent (#c17d4a) colors
  - [ ] Configure semantic colors (success, warning, error, info)
  - [ ] Test theme colors render correctly
- [ ] Initialize shadcn/ui (AC: #5)
  - [ ] Run `npx shadcn@latest init`
  - [ ] Configure Editorial Navy theme during init
  - [ ] Set Inter font as primary typeface
  - [ ] Install base components: Button, Card, Input, Label, Form
  - [ ] Verify components render with Editorial Navy theme
- [ ] Install core dependencies (AC: #6)
  - [ ] Install drizzle-orm and @neondatabase/serverless
  - [ ] Install react-hook-form, zod, @hookform/resolvers
  - [ ] Install date-fns and @date-fns/tz
  - [ ] Install decimal.js for financial calculations
  - [ ] Verify all dependencies are in package.json
- [ ] Create project structure directories (AC: #7)
  - [ ] Create src/app/, src/components/, src/modules/, src/db/, src/lib/
  - [ ] Verify directory structure matches Architecture pattern
- [ ] Create environment variables template (AC: #8)
  - [ ] Create .env.example with placeholders
  - [ ] Add DATABASE_URL, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  - [ ] Add .env.local to .gitignore
- [ ] Test development and production builds (AC: #9, #10)
  - [ ] Run `npm run dev` and verify server starts on localhost:3000
  - [ ] Run `npm run build` and verify build succeeds
  - [ ] Run `npm run start` and verify production server works

## Dev Notes

- Use exact command from architecture.md Section "Project Initialization"
- Follow architecture.md "Project Structure" for directory layout
- Configure tailwind.config.ts with UX color system from ux-design-specification.md
- Install dependencies per architecture.md "Technology Stack Details"

### Relevant Architecture Patterns and Constraints

**Tech Stack:**

- Next.js 16 with App Router, React Server Components, Server Actions, Turbopack bundler
- TypeScript 5.x with strict mode
- Tailwind CSS 3.x utility-first styling
- shadcn/ui component library (accessible, customizable, Radix UI primitives)
- Biome for linting and formatting (faster than ESLint + Prettier)

**Dependencies to Install:**

- drizzle-orm + @neondatabase/serverless (database)
- react-hook-form, zod, @hookform/resolvers (forms)
- date-fns, @date-fns/tz (date handling)
- decimal.js (financial calculations)

**Project Organization:**

- Feature-based module organization (src/modules/)
- Shared components in src/components/ui/
- Database schemas in src/db/schema/
- Utilities in src/lib/

**Testing Standards:**

- Verify development server runs (`npm run dev`)
- Verify production build succeeds (`npm run build`)
- No compilation errors
- All TypeScript strict checks pass

### Project Structure Notes

This story establishes the foundation for the entire application. The structure follows a feature-based organization pattern with clear separation between:

- **App Router** (src/app/): Next.js routing and pages
- **Components** (src/components/): Shared UI components, shadcn/ui components
- **Modules** (src/modules/): Feature modules (tenant, users, authors, titles, etc.)
- **Database** (src/db/): Drizzle schemas and migrations
- **Library** (src/lib/): Shared utilities and helpers

**Alignment with unified project structure:** This follows the modular monolith pattern specified in the architecture, using feature-based organization for maintainability and scalability.

**No conflicts detected:** This is the foundational story - no existing code to conflict with.

### References

- [Source: docs/architecture.md#Project-Initialization]
- [Source: docs/architecture.md#Project-Structure]
- [Source: docs/architecture.md#Technology-Stack-Details]
- [Source: docs/architecture.md#Decision-Summary]
- [Source: docs/ux-design-specification.md#Visual-Identity]
- [Source: docs/prd.md#Technology-Foundation]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/1-1-initialize-nextjs-project-with-tech-stack.context.xml

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

### Completion Notes List

### File List
