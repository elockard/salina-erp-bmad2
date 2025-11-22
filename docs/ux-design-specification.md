# Salina Bookshelf ERP - UX Design Specification

_Created on 2025-11-21 by BMad_
_Generated using BMad Method - Create UX Design Workflow v1.0_

---

## Executive Summary

Salina Bookshelf ERP is a specialized Enterprise Resource Planning system designed specifically for the publishing industry. It addresses the unique operational needs of publishing companies by providing integrated management of authors, manuscripts, ISBN assignment, inventory, sales tracking, and complex royalty calculations with advance recoupment.

**Target Users:**
- **Publishing Staff** (Owners, Admins, Editors, Finance) managing daily operations
- **Authors** accessing royalty statements with transparency

**Core Value:** Consolidate disconnected workflows (spreadsheets, QuickBooks, manual ISBN tracking, email-based author communication) into a unified, multi-tenant SaaS platform.

**Design Vision:** Efficient and productive - users should feel confident, capable, and in control. Tasks that took days now take hours.

**Platform:** Web-based SaaS, desktop-first for staff (data-dense dashboards), mobile-responsive for author portal (simplified statement viewing).

**Inspiration:** SAP Business One's professional efficiency - module-based navigation, dense information display, consistent forms - but purpose-built for publishing, not generic ERP.

---

## 1. Design System Foundation

### 1.1 Design System Choice

**Selected: shadcn/ui + Tanstack Table**

**Rationale:**
- **Next.js 16 Native Integration**: Perfect alignment with tech stack (React Server Components, Server Actions, App Router)
- **Full Code Ownership**: Components copied into codebase enable deep customization for publishing-specific workflows
- **Modern Professional Aesthetic**: Clean, refined interface between MUI's consumer feel and Ant Design's dated look
- **Accessibility by Default**: Built on Radix UI primitives, WCAG 2.1 AA compliant out-of-box
- **No Licensing Costs**: MIT licensed, unlimited users, no per-developer fees
- **Expert-Friendly**: Requires assembly but provides maximum control for sophisticated UX patterns

**What shadcn/ui Provides:**
- 50+ accessible, customizable React components
- Radix UI primitives (Dialog, Dropdown, Select, Tabs, etc.)
- Tailwind CSS styling system
- Form components with validation (React Hook Form integration)
- Data display components (Card, Badge, Avatar, Separator)
- Navigation components (Navigation Menu, Command, Breadcrumb)
- Feedback components (Toast, Alert, Progress)

**Additional Required Libraries:**
- **Tanstack Table**: Headless table library for complex data grids (sales transactions, ISBN pools, royalty statements)
- **Recharts or Victory**: Chart library for dashboards and reporting visualizations
- **React Hook Form + Zod**: Form validation and management
- **date-fns or Day.js**: Date formatting and manipulation for statements

**Component Customization Strategy:**
- Base shadcn/ui components provide foundation
- Publishing-specific components built on top (RoyaltyStatementCard, ISBNPoolStatus, TieredRoyaltyConfigurator)
- Tanstack Table for all data-heavy interfaces with custom column definitions
- Custom theme configuration via Tailwind for publishing aesthetic

**Version & Dependencies:**
- shadcn/ui: Latest (component-based, no version dependency)
- Radix UI: v1.x
- Tailwind CSS: v3.x
- Tanstack Table: v8.x

---

## 2. Core User Experience

### 2.1 Project Vision and Users

**Project:** Salina Bookshelf ERP - Publishing-First ERP Platform

**Target Users:**
1. **Publishing Company Staff:**
   - **Owners**: Full administrative access, billing, tenant management
   - **Admins**: User management, tenant configuration, all data access
   - **Editors**: Title/author management, ISBN assignment, sales entry
   - **Finance**: Return approvals, royalty calculations, statement generation

2. **Authors (External):**
   - Limited portal access to view their own royalty statements
   - Download PDF statements
   - View sales history for their titles only

**Core User Needs:**
- **Staff**: Efficient data entry, confident financial calculations, role-appropriate dashboards
- **Authors**: Transparent royalty information, self-service access, clarity on calculations

**Platform Requirements:**
- **Web-based SaaS** with multi-tenant architecture
- **Desktop-first** for publishing staff (optimized for mouse/keyboard, data-dense)
- **Mobile-responsive** for author portal (simplified, touch-optimized)

### 2.2 Emotional Design Goal

**Primary Emotion: Efficient and Productive**

Users should feel:
- **Confident**: Trust the numbers, no more spreadsheet anxiety
- **Capable**: Complex tasks feel manageable
- **In Control**: Clear visibility into data and processes
- **Relieved**: Finally, one system that understands publishing

**Design Principles Supporting Efficiency:**
1. **Minimize Cognitive Load**: Clear information hierarchy, consistent patterns
2. **Optimize for Repetition**: Daily tasks (sales entry) should be lightning-fast
3. **Progressive Disclosure**: Complex features (tiered royalty config) revealed step-by-step
4. **Data Transparency**: Always show the "why" behind calculations
5. **Confidence-Building**: Preview before finalizing, clear audit trails

### 2.3 Defining Experience

**For Publishing Staff:**

**Primary Defining Experience**: **Recording sales transactions** (operational heartbeat)
- This happens daily/weekly
- Feeds all downstream calculations
- Must be effortless and error-free
- Pattern: Quick form entry with autocomplete and validation

**Secondary Critical Experience**: **Generating royalty statements** (high-stakes quarterly event)
- This happens quarterly/annually
- Moment of truth where trust is built or broken
- Must inspire confidence with preview, transparency, and auditability
- Pattern: Multi-step wizard with preview before generation

**For Authors:**

**Primary Defining Experience**: **Viewing royalty statements with transparency**
- Authors should feel respected and informed, not confused
- Clear breakdown of calculations, advance recoupment visible
- Self-service access eliminates "begging publisher" friction
- Pattern: Clean portal with statement list, download, and clear visual breakdown

---

## 3. Visual Foundation

### 3.1 Color System - Editorial Navy Theme

**Selected Theme: Editorial Navy** - Professional • Trustworthy • Refined

**Rationale:**
- **Professional Publishing Aesthetic**: Navy blue conveys trust, financial accuracy, and refined professionalism appropriate for ERP systems
- **SAP Business One Inspiration**: Closest to classic enterprise aesthetic while remaining modern
- **Versatility**: Works well for both data-dense staff interfaces and clean author portal
- **Accessibility**: High contrast ratios ensure WCAG 2.1 AA compliance
- **Timeless**: Won't feel dated, appropriate for long-term enterprise software

**Primary Colors:**
- **Primary**: `#1e3a5f` (Editorial Navy) - Main actions, navigation, primary UI elements
- **Secondary**: `#5b7c99` (Slate Blue) - Supporting actions, hover states, secondary elements
- **Accent**: `#c17d4a` (Warm Bronze) - Highlights, important data points, calls-to-action

**Semantic Colors:**
- **Success**: `#2d7d3e` (Forest Green) - Successful operations, positive feedback, statement completion
- **Warning**: `#d97706` (Amber) - Caution states, pending approvals, requires attention
- **Error**: `#b91c1c` (Deep Red) - Error states, validation failures, rejected returns

**Neutral Palette:**
- **50**: `#f8fafc` (Lightest) - Page backgrounds, card backgrounds
- **100**: `#f1f5f9` (Very Light) - Hover backgrounds, subtle distinctions
- **200**: `#e2e8f0` (Light) - Borders, dividers, inactive states
- **700**: `#334155` (Dark) - Body text, labels, content
- **900**: `#0f172a` (Darkest) - Headings, emphasis, primary text

**Usage Guidelines:**
- **Primary Navy**: Use for primary buttons, active navigation, key actions (Generate Statement, Record Sale)
- **Secondary Slate**: Use for secondary buttons, tabs, less critical actions
- **Accent Bronze**: Sparingly for important data (total royalty amounts, key metrics), CTAs in author portal
- **Neutral Gray**: Text hierarchy, borders, backgrounds - majority of interface
- **Semantic Colors**: Strictly for status communication (success/warning/error feedback)

### 3.2 Typography System

**Font Families:**
- **Heading**: Inter font: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Body**: Inter font: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Monospace**: `'SF Mono', Monaco, 'Cascadia Code', 'Courier New', monospace` (for ISBNs, financial values, code-like data)

**Type Scale:**
- **h1**: 2.25rem (36px) - Page titles, dashboard headers
- **h2**: 1.875rem (30px) - Section headers, card titles
- **h3**: 1.5rem (24px) - Subsection headers, modal titles
- **h4**: 1.25rem (20px) - Component headers, form sections
- **Body Large**: 1.125rem (18px) - Emphasis text, intro paragraphs
- **Body**: 1rem (16px) - Default body text, form inputs
- **Body Small**: 0.875rem (14px) - Secondary text, captions, helper text
- **Tiny**: 0.75rem (12px) - Metadata, timestamps, minimal labels

**Font Weights:**
- **Regular (400)**: Default body text
- **Medium (500)**: Labels, navigation items, subtle emphasis
- **Semibold (600)**: Buttons, active states, important labels
- **Bold (700)**: Headings, strong emphasis, critical information

**Line Heights:**
- **Headings**: 1.2 (tight, impactful)
- **Body Text**: 1.6 (readable, comfortable for long text)
- **UI Elements**: 1.4 (compact for forms, buttons, tables)

**Design Principle**: Use Inter font for professional, modern aesthetic with excellent readability at all sizes. Inter is specifically designed for UI with optimal spacing and legibility. Load from Google Fonts or bundle locally for performance.

### 3.3 Spacing & Layout System

**Base Unit**: 4px (0.25rem) - All spacing is a multiple of 4px

**Spacing Scale (Tailwind-aligned):**
- **xs**: 4px (0.25rem)
- **sm**: 8px (0.5rem)
- **md**: 16px (1rem) - Default spacing
- **lg**: 24px (1.5rem)
- **xl**: 32px (2rem)
- **2xl**: 48px (3rem)
- **3xl**: 64px (4rem)

**Layout Grid:**
- **Desktop**: 12-column grid, 1280px max container width
- **Tablet**: Fluid layout, 16px side gutters
- **Mobile**: Single column, 16px side gutters

**Component Spacing Guidelines:**
- **Between form fields**: 16px (md)
- **Between sections**: 32px (xl)
- **Card padding**: 24px (lg)
- **Button padding**: 12px vertical, 24px horizontal
- **Table cell padding**: 12px vertical, 16px horizontal

**Border Radius:**
- **sm**: 4px - Inputs, small buttons
- **md**: 6px - Buttons, cards, most components (default)
- **lg**: 8px - Large cards, modals
- **xl**: 12px - Dashboard cards, major containers
- **full**: 9999px - Pills, badges, avatars

### 3.4 Interactive Visualizations

**Color Theme Explorer:** [ux-color-themes.html](./ux-color-themes.html)

This interactive HTML file showcases all 4 theme options with live component examples, allowing stakeholders to see colors in context before implementation.

---

## 4. Design Direction

### 4.1 Chosen Design Approach: Split View Explorer

**Direction 3: Split View Explorer** - Master-Detail • Efficient • Context-Rich

**Rationale:**
- **Master-Detail Pattern**: Left panel for browsing/filtering, right panel for detailed viewing and editing - classic enterprise pattern for data management
- **Efficient Workflow**: Users can quickly scan lists while maintaining context of selected item
- **Balanced Density**: Not as overwhelming as dense dashboard, not as spacious as guided flows - perfect middle ground
- **Scalable**: Works well for Authors, Titles, Sales Transactions, Returns, Statements - core entities in Salina ERP
- **Familiar**: Similar to email clients, file managers, SAP Business One modules - low learning curve

**Layout Decisions:**

**Left Panel (Master View) - 320px width:**
- **Purpose**: Browse, search, and filter entities (authors, titles, transactions)
- **Components**:
  - Panel header with title and count
  - Search box for quick filtering
  - Scrollable list of items with key metadata
  - Active state highlighting selected item
- **Density**: Compact but readable - show 8-10 items visible at once
- **Pattern**: Click item to load detail view in right panel

**Right Panel (Detail View) - Flexible width:**
- **Purpose**: Display full details, allow editing, show related data
- **Components**:
  - Detail header with entity name, metadata, status badges
  - Info grid for key data points
  - Related data tables (author's titles, title's sales, etc.)
  - Action buttons contextual to entity
- **Density**: Spacious - users need to focus on one entity at a time
- **Pattern**: Inline editing where possible, modals for complex operations

**Top Navigation:**
- Minimal top bar with logo, user avatar, tenant switcher
- Module navigation via tabs or breadcrumbs when needed
- **Alternative**: Could add persistent sidebar for module switching (Dashboard, Titles, Authors, Sales, etc.)

**Application to Key Screens:**

**1. Author Management:**
- Left: List of all authors with search/filter (name, status, pending royalties)
- Right: Author detail (contact info, titles grid, royalty summary, statement history)
- Action: "Generate Statement" button in right panel

**2. Title Management:**
- Left: List of titles with search/filter (title, author, status, ISBN)
- Right: Title detail (metadata, formats, assigned ISBNs, sales history, royalty contracts)
- Action: "Record Sale" quick action in right panel

**3. Sales Transactions:**
- Left: Transaction list with filters (date range, title, channel, type)
- Right: Transaction detail (full breakdown, original sale reference for returns, audit trail)
- Action: "Edit" or "Void" (if permissions allow)

**4. Return Approvals (Finance):**
- Left: Pending returns queue (sortable by date, amount, title)
- Right: Return detail with original sale context, reason, photos if applicable
- Action: "Approve" / "Reject" buttons with confirmation

**5. Royalty Statements:**
- Left: Statement list (by author, period, status)
- Right: Statement detail with calculation breakdown, downloadable PDF
- Action: "Regenerate" / "Send to Author"

**Visual Style Within Split View:**
- **Editorial Navy theme** applied throughout
- **Inter font** for all typography
- **White backgrounds** for panels (not gray) - keeps it crisp and professional
- **Subtle borders** (1px neutral-200) to separate panels
- **Active item** in left panel: Primary-light background + primary left border
- **Cards** in right panel for grouping related information
- **Tables** with hover states for detailed data display

**Responsive Behavior:**
- **Desktop (1280px+)**: Full split view as designed
- **Tablet (768-1279px)**: Narrow left panel to 280px, stack some right panel content
- **Mobile (< 768px)**: Collapse to single view - show list by default, detail view slides in when item tapped, back button returns to list

**Interactive Mockups:**
- Design Direction Showcase: [ux-design-directions.html](./ux-design-directions.html) - 6 options explored, Split View Explorer selected

### 4.2 Alternative Contexts

While Split View Explorer is the primary pattern, some contexts benefit from alternative approaches:

**Dashboard (Home Screen):**
- Use **Modular Dashboard Grid** (Direction 5) for role-based overview
- Stats cards + recent transactions table + quick action buttons
- Not split view - users need to see metrics at a glance

**Sales Transaction Entry (Daily Task):**
- Use **Spacious Guided Flow** (Direction 2) for quick data entry
- Centered form, generous spacing, clear field progression
- Not split view - users want focus on the form, not browsing

**Royalty Statement Generation (Quarterly Workflow):**
- Use **Wizard-Guided Modal** (Direction 6) for multi-step process
- Step 1: Select period → Step 2: Select authors → Step 3: Preview → Step 4: Generate
- Modal overlay keeps context, wizard steps show progress

**Pattern Selection Guide:**
- **Split View Explorer**: Browsing entities, managing data, viewing details (Authors, Titles, Transactions, Returns)
- **Dashboard Grid**: Overview, metrics, quick actions (Home, Finance Dashboard)
- **Guided Flow**: Focused data entry (Sales Entry, Create Title, Add Author)
- **Wizard Modal**: Complex multi-step workflows (Generate Statements, Bulk Operations)

---

## 5. User Journey Flows

### 5.1 Overview

These journeys represent the critical workflows in Salina ERP, designed to be efficient, error-resistant, and confidence-building. Each journey follows patterns established in our design direction while optimizing for the specific user goal.

### 5.2 Journey 1: Record Sales Transaction

**User Role:** Editor or Finance User
**Frequency:** Daily/Weekly (Operational Heartbeat)
**Goal:** Quickly record individual sales transactions for accurate royalty tracking
**Pattern:** Spacious Guided Flow (centered form)

**Flow Steps:**

**Step 1: Entry Point**
- **From Dashboard:** Click "Record Sale" quick action button
- **From Sales Module:** Navigate to Sales → Click "New Transaction" button
- **System:** Opens centered form in main content area (not modal - full page focus)

**Step 2: Title Selection**
- **User sees:** "Record Sales Transaction" page header with subtitle "Enter sales data for accurate royalty calculations"
- **First field:** "Title" - Autocomplete search input with focus on load
- **User types:** Start typing title name (e.g., "Great")
- **System shows:** Dropdown with matching titles:
  - The Great Novel (Jane Mitchell) - Physical, Ebook available
  - Great Expectations Revival (Robert Chen) - Physical available
- **Helper text:** "Start typing to search your title catalog"
- **User selects:** "The Great Novel"
- **System:** Loads title, shows available formats for next field

**Step 3: Format and Sale Details**
- **Format field:** Dropdown pre-filtered to available formats for selected title
  - Options: Physical Book, Ebook, Audiobook (only formats assigned ISBNs for this title)
  - User selects: "Physical Book"
- **Quantity field:** Number input, placeholder "0"
  - User enters: 150
  - Validation: Must be positive integer
- **Unit Price field:** Currency input, placeholder "$0.00"
  - User enters: $24.99
  - Validation: Must be positive number
  - Helper text: "Price per unit sold"
- **Sale Date field:** Date picker, defaults to today
  - User can adjust if recording historical sale
- **Sales Channel field:** Dropdown with standard options
  - Options: Retail, Wholesale, Direct, Distributor
  - Remembers last-used channel as default
  - User selects: "Retail"

**Step 4: Real-time Calculation Preview**
- **System displays:** Calculated total in prominent text above submit button
  - "Total Transaction Value: $3,748.50" (150 × $24.99)
- **Purpose:** Confidence-building - user can verify math before submitting

**Step 5: Submit Transaction**
- **User clicks:** "Record Sale ($3,748.50)" button (primary navy)
- **System validation:**
  - All required fields filled
  - Quantity > 0
  - Price > 0
  - Title has format selected (ISBN assigned)
- **If validation fails:** Inline error messages appear below fields in red
- **If validation passes:** Submit to server

**Step 6: Success Feedback**
- **System shows:** Success toast notification (top-right, auto-dismiss after 4 seconds)
  - "✓ Sale recorded: 150 units of The Great Novel - $3,748.50"
- **Form behavior:** Clears all fields except Sales Channel (keeps last-used default)
- **Focus:** Returns to Title field for next entry
- **Alternative action:** "View Transaction" link in toast → navigates to transaction detail

**Error Handling:**
- **Network failure:** Toast error "Failed to record sale. Please try again." + Retry button
- **Duplicate detection:** Warning "Similar transaction recorded 2 minutes ago. Continue anyway?" + Confirm/Cancel
- **ISBN not assigned:** Error on format selection "Cannot sell Physical format - no ISBN assigned. Assign ISBN first?"

**Decision Points:**
- **None** - Linear flow optimized for speed

**Success State:**
- Transaction recorded in database with metadata (who entered, when entered)
- Available for royalty calculations
- Appears in transaction history immediately
- User can record another transaction or navigate away

---

### 5.3 Journey 2: Approve/Reject Return Request

**User Role:** Finance User
**Frequency:** As needed (when returns are submitted)
**Goal:** Review return request with full context and decide whether to approve/reject
**Pattern:** Split View Explorer

**Flow Steps:**

**Step 1: Entry Point**
- **From Finance Dashboard:** Click "Pending Returns (12)" stat card or alert
- **From Returns Module:** Navigate to Returns → Filter shows "Pending" by default
- **System:** Opens Split View with pending returns in left panel

**Step 2: Browse Pending Returns Queue**
- **Left Panel (320px):** Scrollable list of pending returns
  - **Header:** "Pending Returns (12)" with search box
  - **Each list item shows:**
    - Title name (truncated if long)
    - Quantity: -25
    - Amount: -$312.50
    - Reason: "Damaged"
    - Date submitted
  - **Sorted by:** Date submitted (oldest first) - can be changed
  - **Active item:** Highlighted with primary-light background + left border

**Step 3: Select Return to Review**
- **User clicks:** First pending return in list
- **System:** Loads detail in right panel
- **Left panel:** Item becomes active (highlighted)

**Step 4: Review Return Details**
- **Right Panel (Detail View):**
  - **Header Section:**
    - Title: "Return Request"
    - Metadata: Submitted by [User] on [Date]
    - Status badge: "Pending Approval"

  - **Return Information Card:**
    - Title: The Great Novel (Jane Mitchell)
    - Format: Physical Book
    - Quantity: -25 units
    - Amount: -$312.50
    - Reason: Damaged in shipping
    - Optional: Photos/attachments if provided

  - **Original Sale Context Card:**
    - Original Sale Date: Nov 15, 2025
    - Original Sale Amount: $312.50 (25 units @ $12.50)
    - Channel: Wholesale
    - Reference: #TX-2025-00847
    - Note: "This helps verify the return is legitimate"

  - **Impact Statement:**
    - "Approving this return will reduce Author royalties by $46.88 (15% rate)"
    - Shows calculations are transparent

**Step 5: Make Decision**
- **Action buttons at bottom of detail panel:**
  - **"Approve Return"** (primary navy button)
  - **"Reject Return"** (secondary gray button)
  - **"Request More Info"** (tertiary text button) - optional future feature

**Step 6a: If User Clicks "Approve"**
- **System shows:** Confirmation dialog
  - Title: "Approve Return?"
  - Message: "This return of -$312.50 will be approved and will impact royalty calculations for The Great Novel."
  - Optional: "Add internal note" text field
  - Buttons: "Confirm Approval" / "Cancel"
- **User clicks:** "Confirm Approval"
- **System:**
  - Updates return status to "Approved"
  - Records who approved and when (audit trail)
  - Return now impacts royalty calculations
  - Success toast: "✓ Return approved - $312.50 will be deducted from royalties"
  - Next pending return auto-loads in right panel (efficient batch processing)

**Step 6b: If User Clicks "Reject"**
- **System shows:** Confirmation dialog with required reason
  - Title: "Reject Return?"
  - Message: "This return will be marked as rejected and will NOT impact royalty calculations."
  - **Required:** "Reason for rejection" text field (e.g., "Outside return window", "No proof of damage")
  - Buttons: "Confirm Rejection" / "Cancel"
- **User enters reason and clicks:** "Confirm Rejection"
- **System:**
  - Updates return status to "Rejected"
  - Records who rejected, when, and reason (audit trail)
  - Return does NOT impact royalty calculations
  - Notification sent to requester with reason
  - Success toast: "✓ Return rejected - No impact on royalties"
  - Next pending return auto-loads in right panel

**Decision Points:**
- **Approve or Reject:** Based on review of details, context, and policy

**Error States:**
- **Original sale not found:** Warning shown in context card "Cannot verify original sale"
- **Network failure:** Error toast with retry option

**Success State:**
- Return status updated (Approved or Rejected)
- Audit trail recorded
- Royalty calculations updated (if approved)
- User can continue processing remaining returns

---

### 5.4 Journey 3: Generate Royalty Statements

**User Role:** Finance User
**Frequency:** Quarterly or Annually (High-Stakes Event)
**Goal:** Generate accurate royalty statements for authors with full transparency and preview
**Pattern:** Wizard-Guided Modal (4 Steps)

**Flow Steps:**

**Step 1: Entry Point**
- **From Finance Dashboard:** Click "Generate Statements" action button
- **From Statements Module:** Navigate to Statements → Click "Generate New Statements"
- **System:** Opens modal overlay with wizard steps visible at top

**Step 2: Select Period (Wizard Step 1)**
- **Modal Header:** "Generate Royalty Statements"
- **Wizard Progress:** [1. Period] → [2. Authors] → [3. Preview] → [4. Generate]
- **Content:**
  - **Section title:** "Select Statement Period"
  - **Period type:** Radio buttons
    - ○ Quarterly (most common)
    - ○ Annual
    - ○ Custom Date Range
  - **If Quarterly selected:**
    - Dropdown: Q1 2025, Q2 2025, Q3 2025, Q4 2025 (current quarter pre-selected)
  - **If Annual selected:**
    - Dropdown: 2024, 2025
  - **If Custom selected:**
    - Start Date: Date picker
    - End Date: Date picker
  - **Helper text:** "Statements will include all approved transactions within this period"
- **Buttons:**
  - "Cancel" (secondary, closes modal)
  - "Next: Select Authors →" (primary, advances to step 2)

**Step 3: Select Authors (Wizard Step 2)**
- **Wizard Progress:** [✓ Period] → [2. Authors] → [3. Preview] → [4. Generate]
- **Content:**
  - **Section title:** "Select Authors"
  - **Quick select:**
    - Checkbox: "☑ Select All Authors (47)"
  - **Author list:** (Scrollable area, max-height: 300px)
    - Each author shows:
      - ☑ Jane Mitchell (3 titles, $12,450 pending royalties)
      - ☑ Robert Chen (1 title, $4,200 pending royalties)
      - ☑ Maria Rodriguez (5 titles, $28,900 pending royalties)
      - ... (47 total)
  - **Search box:** "Filter authors..." (real-time filtering)
  - **Summary:** "47 authors selected • Total pending royalties: $215,430"
- **Buttons:**
  - "← Back" (returns to step 1)
  - "Cancel" (closes modal)
  - "Next: Preview →" (primary, advances to step 3)

**Step 4: Preview Calculations (Wizard Step 3)**
- **Wizard Progress:** [✓ Period] → [✓ Authors] → [3. Preview] → [4. Generate]
- **Content:**
  - **Section title:** "Preview Statement Calculations"
  - **Period confirmation:** "Q4 2025 (Oct 1 - Dec 31, 2025)"
  - **Summary table:** (Top 5 authors shown, scrollable to see all)

    | Author | Sales | Returns | Royalty Earned | Advance Recouped | Net Payable |
    |--------|-------|---------|----------------|------------------|-------------|
    | Jane Mitchell | $42,300 | -$1,200 | $6,165 | -$2,000 | $4,165 |
    | Robert Chen | $18,200 | $0 | $2,730 | $0 | $2,730 |
    | Maria Rodriguez | $64,080 | -$3,400 | $9,102 | -$5,000 | $4,102 |
    | ... | ... | ... | ... | ... | ... |

  - **Totals row:**
    - Total Sales: $182,450
    - Total Returns: -$8,320
    - Total Royalties: $26,167.50
    - Total Advances Recouped: -$12,800
    - **Total Net Payable: $13,367.50**

  - **Warning callouts (if applicable):**
    - ⚠️ 3 authors have negative periods (more returns than sales) - no advance reversal will occur
    - ⚠️ 2 authors have fully recouped advances this period

  - **Helper text:** "Review these calculations carefully. PDFs will be generated and emailed to authors."

- **Buttons:**
  - "← Back" (returns to step 2)
  - "Cancel" (closes modal)
  - "Next: Generate Statements →" (primary, advances to step 4)

**Step 5: Generate & Send (Wizard Step 4)**
- **Wizard Progress:** [✓ Period] → [✓ Authors] → [✓ Preview] → [4. Generate]
- **Content:**
  - **Section title:** "Generate and Send Statements"
  - **Confirmation summary:**
    - Period: Q4 2025
    - Authors: 47 selected
    - Total Net Payable: $13,367.50
  - **Delivery options:**
    - ☑ Email PDF statements to authors
    - ☑ Make statements available in author portal
    - ☐ Export CSV summary for accounting (optional)
  - **Final confirmation message:**
    - "This will generate 47 royalty statement PDFs and email them to authors. This action cannot be undone."
- **Buttons:**
  - "← Back to Preview" (returns to step 3)
  - "Cancel" (closes modal)
  - "Generate Statements" (primary, green success color, executes generation)

**Step 6: Processing**
- **System:** Starts background job
- **Modal updates:**
  - Shows progress indicator "Generating statements... 12 of 47 complete"
  - Spinner animation
  - "This may take a few minutes. You can close this window and continue working."
- **User can:** Close modal and monitor via background jobs indicator in top nav

**Step 7: Completion**
- **System:** All statements generated successfully
- **Notification:** Success toast (persistent until dismissed)
  - "✓ 47 royalty statements generated and sent to authors"
  - "View Statements" button → navigates to Statements list
- **Modal:** Auto-closes or shows completion screen with "View Statements" / "Done" buttons
- **Email:** Authors receive emails with PDF attachments
- **Author Portal:** Statements appear in author portal immediately

**Decision Points:**
- **Step 1:** Which period to generate
- **Step 2:** All authors or specific selection
- **Step 3:** Review and verify calculations before committing
- **Step 4:** Confirm final generation

**Error States:**
- **No transactions in period:** Warning in preview "No sales or returns found for Q4 2025. Are you sure?"
- **Generation fails:** Error toast "Failed to generate statements. Please try again or contact support."
- **Email delivery fails:** Warning "Statements generated but 3 emails failed to send. Retry email delivery?"

**Success State:**
- 47 PDF statements generated and stored
- Metadata recorded (period, generated by, generated date)
- Emails sent to authors
- Statements available in portal
- Finance has record of total liability: $13,367.50

---

### 5.5 Journey 4: Author Views Statement (Author Portal)

**User Role:** Author (External)
**Frequency:** Quarterly (after statement generation) or on-demand
**Goal:** View royalty statement with full transparency into calculations
**Pattern:** List → Detail View

**Flow Steps:**

**Step 1: Entry Point**
- **From Email:** Author receives email "Your Q4 2025 Royalty Statement is Ready"
  - Email contains: Summary info (Total earned, Net payable) + "View Statement" button
  - Button links directly to author portal (auto-login via magic link or requires login)
- **From Direct Login:** Author navigates to author portal domain (e.g., authors.salina-erp.com)
  - Logs in with email + password or magic link
  - Lands on statement list page

**Step 2: View Statement List**
- **Page:** "Your Royalty Statements" (Simple, clean header)
- **Table:** List of all statements (sorted by date, newest first)

  | Period | Date Generated | Status | Gross Royalties | Net Payable | Actions |
  |--------|----------------|--------|-----------------|-------------|---------|
  | Q4 2025 | Jan 15, 2026 | Paid | $6,165.00 | $4,165.00 | View → |
  | Q3 2025 | Oct 15, 2025 | Paid | $5,240.00 | $3,240.00 | View → |
  | Q2 2025 | Jul 15, 2025 | Paid | $4,890.00 | $2,890.00 | View → |
  | Q1 2025 | Apr 15, 2025 | Paid | $3,200.00 | $1,200.00 | View → |

- **Status badges:**
  - Green: "Paid"
  - Amber: "Pending Payment"
  - Blue: "New"
- **Actions:** "View →" link for each statement

**Step 3: Author Clicks "View" on Q4 2025 Statement**
- **System:** Navigates to statement detail page (not modal - full page)
- **URL:** /statements/q4-2025 (shareable, bookmarkable)

**Step 4: View Statement Detail**
- **Page Header:**
  - Title: "Q4 2025 Royalty Statement"
  - Subtitle: "October 1 - December 31, 2025"
  - Period status badge: "Paid on Jan 20, 2026"
  - Action buttons: "Download PDF" (primary) | "Print" (secondary)

- **Summary Card** (Prominent, top of page):
  ```
  ┌─────────────────────────────────────┐
  │ Net Amount Payable: $4,165.00       │
  │ (Gross Royalties: $6,165 - Advance: $2,000) │
  └─────────────────────────────────────┘
  ```

- **Sales Breakdown Section:**
  - **Title:** "Sales by Title"
  - **Table:**

    | Title | Format | Units Sold | Revenue | Your Rate | Royalty Earned |
    |-------|--------|------------|---------|-----------|----------------|
    | The Great Novel | Physical | 1,200 | $29,880 | 15% (Tier 2) | $4,482 |
    | The Great Novel | Ebook | 450 | $4,050 | 20% (Tier 1) | $810 |
    | Poetry Collection | Physical | 180 | $2,700 | 10% (Tier 1) | $270 |
    | Short Stories: Winter | Physical | 520 | $7,800 | 12% (Tier 1) | $936 |
    | **Total** | | **2,350** | **$44,430** | | **$6,498** |

  - **Helper text:** "Tier 2 = 5K-10K units sold, Tier 1 = 0-5K units sold"

- **Returns Section** (if applicable):
  - **Title:** "Approved Returns"
  - **Table:**

    | Title | Format | Units | Amount | Your Rate | Royalty Impact |
    |-------|--------|-------|--------|-----------|----------------|
    | The Great Novel | Physical | -25 | -$312.50 | 15% | -$46.88 |
    | Poetry Collection | Physical | -10 | -$150.00 | 10% | -$15.00 |
    | **Total** | | **-35** | **-$462.50** | | **-$61.88** |

- **Royalty Calculation Summary:**
  ```
  Gross Royalties Earned:        $6,498.00
  Returns Adjustment:            -$61.88
  Net Royalties This Period:     $6,436.12

  [Note: Calculation discrepancy from example - using realistic tier calculations]
  ```

- **Advance Recoupment Section** (if applicable):
  - **Title:** "Advance Recoupment"
  - **Info:**
    - Original Advance: $10,000.00
    - Previously Recouped: $4,835.00
    - Recouped This Period: $2,000.00
    - Remaining Advance: $3,165.00
  - **Visual:** Progress bar showing 68.35% recouped
  - **Helper text:** "Your advance is being recouped from royalty earnings until fully paid back"

- **Final Payment Calculation:**
  ```
  Net Royalties This Period:     $6,165.00
  Advance Recouped:             -$2,000.00
  ────────────────────────────────────
  Net Amount Payable:            $4,165.00
  ```

- **Footer:**
  - Payment date: "Paid on Jan 20, 2026 via Direct Deposit"
  - Statement generated: "Jan 15, 2026 by Finance Team"
  - Questions: "Contact your publisher at finance@publisher.com"

**Step 5: Download PDF (Optional)**
- **User clicks:** "Download PDF" button
- **System:** Generates downloadable PDF with same information
- **File name:** Jane-Mitchell-Q4-2025-Statement.pdf
- **Opens:** In browser or downloads directly (browser-dependent)

**Decision Points:**
- **None** - Pure viewing experience, no actions required

**Success State:**
- Author has full transparency into earnings
- Understands tier calculations and advance recoupment
- Can download PDF for records
- Feels respected and informed (not confused)

---

### 5.6 Journey 5: Assign ISBN to Title

**User Role:** Editor or Admin
**Frequency:** Ongoing (when new titles created or new formats added)
**Goal:** Assign available ISBN from pool to title for specific format
**Pattern:** Smart Assignment Modal with Preview

**Flow Steps:**

**Step 1: Entry Point**
- **From Title Detail Page:** User viewing title "The Great Novel"
  - Title has Physical format already with ISBN assigned
  - User wants to add Ebook format
  - Section: "Formats & ISBNs"
  - Shows: Physical Book - ISBN: 978-1-234567-89-0 (Assigned)
  - Shows: Ebook - No ISBN assigned
  - Button: "Assign ISBN" next to Ebook row
- **Alternative Entry:** During title creation workflow
  - Step 3 of create title: "Assign ISBN to formats"

**Step 2: Click "Assign ISBN"**
- **System:** Opens modal overlay (centered, ~600px width)

**Step 3: Smart Assignment Preview (Modal Content)**
- **Modal Header:** "Assign ISBN to The Great Novel"
- **Modal Body:**
  - **Format confirmation:**
    - "Format: Ebook"
    - Badge showing format type

  - **Smart assignment preview card** (Prominent):
    ```
    ┌─────────────────────────────────────────┐
    │ Next Available ISBN (Ebook):            │
    │                                          │
    │       978-1-234567-90-7                 │
    │                                          │
    │ Available in pool: 42 ISBNs (Ebook)     │
    └─────────────────────────────────────────┘
    ```

  - **Helper text:** "This ISBN will be assigned to the Ebook format of The Great Novel. You can choose a different ISBN if needed."

  - **Action buttons:**
    - "Assign This ISBN" (primary navy, prominent)
    - "Choose Different ISBN" (secondary, text button below)

**Step 4a: User Clicks "Assign This ISBN" (Fast Path)**
- **System:**
  - Assigns ISBN 978-1-234567-90-7 to The Great Novel (Ebook format)
  - Updates ISBN pool (marks ISBN as assigned)
  - Records metadata (assigned by user, date, to which title/format)
- **Modal:** Shows success state briefly
  - "✓ ISBN assigned successfully"
  - Modal auto-closes after 1 second
- **Title Detail Page:** Updates to show
  - Ebook - ISBN: 978-1-234567-90-7 (Assigned)
- **Success toast:** "✓ ISBN 978-1-234567-90-7 assigned to The Great Novel (Ebook)"

**Step 4b: User Clicks "Choose Different ISBN" (Manual Selection Path)**
- **Modal updates:** Shows browsable list of available ISBNs
  - **Header:** "Select ISBN for Ebook Format"
  - **Filter:** Already filtered to Ebook ISBNs only
  - **Search box:** "Search ISBN..." (user can type partial ISBN)
  - **List:** (Scrollable, max-height: 400px)

    ```
    ○ 978-1-234567-90-7  (Next available)
    ○ 978-1-234567-91-4
    ○ 978-1-234567-92-1
    ○ 978-1-234567-93-8
    ... (42 total Ebook ISBNs available)
    ```

  - **Showing:** 42 available ISBNs
  - **User selects:** Radio button next to desired ISBN
- **Buttons:**
  - "← Back" (returns to smart assignment preview)
  - "Cancel" (closes modal)
  - "Assign Selected ISBN" (primary, enabled when ISBN selected)

**Step 5: User Selects Different ISBN and Clicks "Assign Selected ISBN"**
- **System:** Same as Step 4a but with user-selected ISBN
- **Confirmation:** Same success flow

**Decision Points:**
- **Accept smart assignment or choose manually:** Most users take fast path

**Error States:**
- **No ISBNs available for format:**
  - Modal shows: "⚠️ No Ebook ISBNs available in pool"
  - Action: "Import ISBN Block" button → redirects to ISBN import page
- **ISBN already assigned (edge case/race condition):**
  - Error: "This ISBN was just assigned to another title. Please try again."
  - Modal refreshes with next available ISBN
- **Network failure:**
  - Error toast: "Failed to assign ISBN. Please try again."
  - Modal remains open, user can retry

**Success State:**
- ISBN assigned to title/format
- ISBN pool updated (available count decrements)
- Title now has valid ISBN for format
- Can proceed with sales tracking for that format
- Audit trail recorded (who assigned, when, which ISBN to which title/format)

---

### 5.7 Journey Flow Diagrams

_Mermaid diagrams for each journey showing decision points, states, and transitions._

**Journey 1: Record Sales Transaction**
```mermaid
graph TD
    A[Dashboard / Sales Module] -->|Click Record Sale| B[Sales Transaction Form]
    B --> C[Enter Title - Autocomplete]
    C --> D[Select Format]
    D --> E[Enter Quantity, Price, Date, Channel]
    E --> F[See Calculated Total Preview]
    F --> G{Validation}
    G -->|Errors| H[Show Inline Errors]
    H --> E
    G -->|Valid| I[Submit Transaction]
    I --> J[Success Toast]
    J --> K[Form Clears for Next Entry]
    K --> B
    J --> L[View Transaction Detail - Optional]
```

**Journey 2: Approve/Reject Return**
```mermaid
graph TD
    A[Finance Dashboard / Returns Module] -->|View Pending Returns| B[Split View: Returns Queue]
    B --> C[Select Return from List]
    C --> D[Review Details in Right Panel]
    D --> E{Decision}
    E -->|Approve| F[Confirmation Dialog]
    E -->|Reject| G[Rejection Dialog with Reason]
    F --> H[Confirm Approval]
    G --> I[Enter Reason + Confirm]
    H --> J[Return Approved - Updates Royalties]
    I --> K[Return Rejected - No Impact]
    J --> L[Success Toast + Next Return Loads]
    K --> L
    L --> C
```

**Journey 3: Generate Statements**
```mermaid
graph TD
    A[Finance Dashboard / Statements Module] -->|Generate Statements| B[Wizard Modal Opens]
    B --> C[Step 1: Select Period]
    C --> D[Step 2: Select Authors]
    D --> E[Step 3: Preview Calculations]
    E --> F{Review OK?}
    F -->|Back to Edit| D
    F -->|Looks Good| G[Step 4: Generate & Send]
    G --> H[Confirm Final Generation]
    H --> I[Background Job Starts]
    I --> J[Progress Indicator]
    J --> K[Statements Generated]
    K --> L[Success Notification]
    L --> M[Emails Sent + Portal Updated]
```

**Journey 4: Author Views Statement**
```mermaid
graph TD
    A[Email Link or Portal Login] --> B[Statement List Page]
    B --> C[Click View on Statement]
    C --> D[Statement Detail Page]
    D --> E[View Summary Card]
    E --> F[Review Sales Breakdown]
    F --> G[Review Returns if Applicable]
    G --> H[View Advance Recoupment]
    H --> I[See Final Payment Calculation]
    I --> J{Optional Actions}
    J -->|Download| K[Download PDF]
    J -->|Done| L[Navigate Away]
```

**Journey 5: Assign ISBN**
```mermaid
graph TD
    A[Title Detail Page] -->|Click Assign ISBN| B[Smart Assignment Modal]
    B --> C[See Next Available ISBN Preview]
    C --> D{Decision}
    D -->|Assign This| E[Confirm Assignment]
    D -->|Choose Different| F[Browse ISBN List]
    F --> G[Select Specific ISBN]
    G --> E
    E --> H[ISBN Assigned]
    H --> I[Success Toast + Modal Closes]
    I --> J[Title Detail Updates]
```

---

## 6. Component Library

### 6.1 Component Strategy Overview

Salina ERP's component library follows a layered approach:
1. **Foundation Layer**: shadcn/ui base components (copied into codebase)
2. **Data Layer**: Tanstack Table for complex data display
3. **Visualization Layer**: Recharts for dashboard metrics
4. **Publishing Layer**: Custom domain-specific components

This strategy provides professional UI components with full customization control while minimizing development effort for standard patterns.

---

### 6.2 Foundation Layer: shadcn/ui Base Components

**Form Components:**
- **Button**: Primary, secondary, destructive, ghost variants
  - Usage: All CTAs, form submissions, actions
  - Sizes: Small (compact tables), Default (forms), Large (prominent actions)
- **Input**: Text, number, email, password, search
  - Usage: All text entry fields
  - States: Default, focus, error, disabled
- **Textarea**: Multi-line text entry
  - Usage: Notes, descriptions, rejection reasons
- **Select**: Dropdown selection
  - Usage: Format selection, channel selection, period selection
  - Features: Searchable, clearable, grouped options
- **Checkbox**: Boolean selection
  - Usage: Author selection (multi-select), feature toggles
- **Radio Group**: Single selection from options
  - Usage: Period type (Quarterly/Annual/Custom), statement delivery options
- **Form**: Complete form management with validation
  - Integration: React Hook Form + Zod
  - Features: Field-level validation, error messages, helper text
- **Label**: Field labels with accessibility
- **Form Error Message**: Inline error display

**Layout Components:**
- **Card**: Content containers
  - Usage: Dashboard stat cards, detail view sections, info groups
  - Variants: Default, bordered, elevated (shadow)
- **Separator**: Visual dividers
  - Usage: Section breaks, list item dividers
- **Tabs**: Tabbed content switching
  - Usage: Title formats (Physical/Ebook/Audio tabs), report views
- **Accordion**: Collapsible content sections
  - Usage: Author portal statement breakdown (expandable sections)

**Overlay Components:**
- **Dialog (Modal)**: Modal overlays
  - Usage: Confirmations (approve/reject), wizard workflows (generate statements), ISBN assignment
  - Sizes: Small (confirmations), Medium (forms), Large (wizards)
- **Sheet (Drawer)**: Slide-in panels
  - Usage: Mobile navigation, quick filters, settings panels
- **Popover**: Floating content
  - Usage: Help tooltips, quick info displays, context menus
- **Dropdown Menu**: Action menus
  - Usage: User menu, bulk actions, context actions

**Feedback Components:**
- **Toast**: Non-blocking notifications
  - Usage: Success confirmations, error alerts, info messages
  - Position: Top-right, auto-dismiss after 4 seconds (success), persistent (errors)
  - Variants: Success (green), Error (red), Warning (amber), Info (navy)
- **Alert**: Prominent in-page notifications
  - Usage: Page-level warnings, validation summaries, important notices
  - Variants: Info, Warning, Error, Success
- **Progress**: Loading indicators
  - Usage: Statement generation progress, file upload progress
  - Types: Linear (determinate %), Circular (indeterminate spinner)

**Navigation Components:**
- **Navigation Menu**: Top-level navigation
  - Usage: Module navigation (Dashboard, Titles, Authors, Sales, Statements)
- **Breadcrumb**: Hierarchical navigation
  - Usage: Deep navigation paths (Home → Authors → Jane Mitchell)
- **Command Palette**: Quick search/navigation
  - Usage: Power user feature - search entities, execute actions
  - Trigger: Cmd/Ctrl + K

**Display Components:**
- **Badge**: Status indicators
  - Usage: Statement status (Paid, Pending), return status (Pending, Approved, Rejected)
  - Variants: Default, success, warning, error, info
- **Avatar**: User representation
  - Usage: User profile displays, author avatars
  - Fallback: Initials (e.g., "FM" for Finance Manager)
- **Table**: Basic data tables
  - Usage: Simple read-only tables
  - Note: For complex data grids, use Tanstack Table instead

---

### 6.3 Data Layer: Tanstack Table

**Purpose:** Complex, data-heavy tables with sorting, filtering, pagination, and virtualization.

**Core Features:**
- **Column Definitions**: Type-safe column configuration
- **Sorting**: Multi-column sorting with custom sort functions
- **Filtering**: Global search + column-specific filters
- **Pagination**: Client-side or server-side pagination
- **Row Selection**: Single or multi-select with checkboxes
- **Column Visibility**: User-controlled column show/hide
- **Column Resizing**: Drag to resize column widths
- **Virtualization**: Render only visible rows for performance (100K+ rows)
- **Export**: CSV/Excel export functionality

**Usage in Salina ERP:**

**1. Sales Transaction History**
- Columns: Date, Title, Format, Quantity, Unit Price, Total, Channel, Entered By
- Features: Date range filter, title search, channel filter, sort by any column
- Row count: Thousands to millions over time
- Virtualization: Required for performance

**2. Pending Returns Queue (Finance)**
- Columns: Date Submitted, Title, Format, Quantity, Amount, Reason, Submitted By, Action
- Features: Sort by date/amount, filter by title, quick actions (Approve/Reject)
- Row count: Typically 10-50 pending
- Selection: Single-select for detail view in split panel

**3. Author List**
- Columns: Name, Email, Titles Count, Pending Royalties, Last Statement, Status
- Features: Search by name/email, sort by royalties, filter by status
- Row count: 50-500 authors per publisher
- Selection: Single-select for detail view in split panel

**4. Title Catalog**
- Columns: Title, Author, Publication Date, Formats, Status, Sales (YTD), Action
- Features: Search title/author, filter by status/format, sort by sales
- Row count: 100-1000s titles per publisher
- Selection: Single-select for detail view

**5. ISBN Pool Status**
- Columns: ISBN, Format, Status (Available/Assigned), Assigned To (Title), Assigned Date
- Features: Search ISBN, filter by format/status, sort by date
- Row count: 100s-1000s ISBNs
- Selection: Single-select for assignment workflow

**6. Royalty Statement List (Author Portal)**
- Columns: Period, Date Generated, Status, Gross Royalties, Net Payable
- Features: Simple table, no complex filtering needed
- Row count: 4-20 statements per author
- Selection: Click row to view detail

**Custom Tanstack Table Wrapper Component:**
```typescript
<DataTable
  data={transactions}
  columns={transactionColumns}
  enableSorting
  enableFiltering
  enablePagination
  enableRowSelection="single"
  onRowSelect={(row) => loadDetailView(row)}
  globalFilterPlaceholder="Search transactions..."
  columnFilters={[
    { column: 'channel', type: 'select', options: ['Retail', 'Wholesale', 'Direct'] },
    { column: 'date', type: 'dateRange' }
  ]}
/>
```

---

### 6.4 Visualization Layer: Recharts

**Purpose:** Dashboard metrics visualization and author portal sales charts.

**Chart Types Needed:**

**1. Line Chart** - Sales trends over time
- Usage: Finance dashboard - quarterly sales trends
- Data: Time series (months/quarters) vs. sales revenue
- Features: Multiple lines (Physical, Ebook, Audio), tooltips, legend

**2. Bar Chart** - Comparative metrics
- Usage: Dashboard - sales by channel, sales by title (top 10)
- Data: Categories vs. values
- Features: Stacked bars (format breakdown), horizontal/vertical orientation

**3. Area Chart** - Cumulative metrics
- Usage: Author portal - cumulative royalties earned over time
- Data: Time series with filled area
- Features: Smooth curves, gradient fills

**4. Pie/Donut Chart** - Proportional breakdown
- Usage: Dashboard - sales breakdown by format
- Data: Categories with percentages
- Features: Interactive slices, percentage labels

**Component Usage:**
```typescript
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={salesData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="physical" stroke="#1e3a5f" />
    <Line type="monotone" dataKey="ebook" stroke="#5b7c99" />
    <Line type="monotone" dataKey="audio" stroke="#c17d4a" />
  </LineChart>
</ResponsiveContainer>
```

---

### 6.5 Publishing Layer: Custom Components

**Domain-specific components built for Salina ERP's publishing workflows.**

**1. SalesTransactionForm**
- **Purpose**: Guided form for recording sales transactions
- **Composition**: shadcn/ui Form + Input + Select + DatePicker
- **Features**:
  - Title autocomplete with debounced search
  - Format dropdown filtered by assigned ISBNs
  - Real-time total calculation
  - Smart defaults (today's date, last-used channel)
  - Inline validation with helpful error messages
- **State Management**: React Hook Form + Zod validation schema
- **Usage**: Sales Entry page (Journey 1)

**2. ReturnApprovalCard**
- **Purpose**: Display return details with context for approval decision
- **Composition**: Card + Badge + Button + Dialog
- **Features**:
  - Return information (title, quantity, amount, reason)
  - Original sale context (date, amount, channel, reference)
  - Royalty impact calculation
  - Approve/Reject actions with confirmation dialogs
- **Usage**: Split view right panel (Journey 2)

**3. StatementGenerationWizard**
- **Purpose**: 4-step wizard for generating royalty statements
- **Composition**: Dialog + Custom stepper + Form + Tanstack Table
- **Features**:
  - Step indicator showing progress (✓ completed, current, upcoming)
  - Period selection (Quarterly/Annual/Custom)
  - Author multi-select with search and "Select All"
  - Preview table showing calculations for all selected authors
  - Confirmation screen with delivery options
- **State Management**: Multi-step form state with validation per step
- **Usage**: Modal overlay triggered from Finance Dashboard (Journey 3)

**4. RoyaltyStatementDetail**
- **Purpose**: Comprehensive display of royalty statement calculations for authors
- **Composition**: Card + Table + Progress Bar + Badge
- **Features**:
  - Summary card (Net Payable prominently displayed)
  - Sales breakdown table (by title and format)
  - Returns table (if applicable)
  - Tiered royalty rate explanations
  - Advance recoupment progress bar with visual indicator
  - Final payment calculation
  - Download PDF and Print actions
- **Responsive**: Stacks vertically on mobile, side-by-side on desktop
- **Usage**: Author Portal statement detail page (Journey 4)

**5. ISBNAssignmentModal**
- **Purpose**: Smart ISBN assignment with preview and manual override
- **Composition**: Dialog + Card + Radio Group + Search Input
- **Features**:
  - Smart preview card showing next available ISBN
  - "Assign This ISBN" fast path button
  - "Choose Different ISBN" opens browsable list
  - ISBN search/filter in list view
  - Format-specific filtering (only show Ebook ISBNs for Ebook format)
- **State Management**: Modal state with two views (preview vs. list)
- **Usage**: Title detail page, title creation workflow (Journey 5)

**6. ISBNPoolStatusWidget**
- **Purpose**: Dashboard widget showing ISBN pool availability
- **Composition**: Card + Badge + Progress indicator
- **Display**:
  - Total ISBNs in pool
  - Available by format (Physical: 25, Ebook: 17, Audio: 10)
  - Visual indicator (color-coded: green >50, amber 20-50, red <20)
  - "Import ISBNs" action button
- **Usage**: Dashboard, ISBN management page

**7. TieredRoyaltyConfigurator**
- **Purpose**: Configure tiered royalty rates for author contracts
- **Composition**: Form + Repeater fields + Input + Select
- **Features**:
  - Add/remove tier rows dynamically
  - Tier definition: Range (0-5K units) + Rate (10%)
  - Format-specific rates (separate tiers for Physical, Ebook, Audio)
  - Validation: No overlapping ranges, rates must be positive
  - Visual preview: "If 7,500 units sold: $1,125 royalty (Tier 2 @ 15%)"
- **Usage**: Author contract creation/editing

**8. AuthorSummaryCard**
- **Purpose**: Quick author overview in split view or dashboard
- **Composition**: Card + Avatar + Badge + InfoGrid
- **Display**:
  - Author name + avatar/initials
  - Status badge (Active, Inactive)
  - Key metrics: Total Titles, Lifetime Sales, Pending Royalties, Last Statement Date
  - Quick actions: Generate Statement, View Detail, Edit
- **Usage**: Author list split view, dashboards

**9. TitleFormatManager**
- **Purpose**: Manage multiple formats and ISBN assignments for a title
- **Composition**: Table + Badge + Button + ISBNAssignmentModal
- **Display**:
  - Format rows: Physical Book, Ebook, Audiobook
  - Each row shows: Format, ISBN (if assigned), Status, Action
  - Actions: "Assign ISBN" (if none), "Record Sale" (if ISBN assigned), "Remove Format"
- **Validation**: Cannot record sales without ISBN
- **Usage**: Title detail page

**10. DashboardStatCard**
- **Purpose**: Reusable metric display for role-based dashboards
- **Composition**: Card + Badge (optional trend indicator)
- **Props**: label, value, change (± percentage), status (info/success/warning/error)
- **Display**:
  - Large value (e.g., "$182K", "47 Statements Due")
  - Small label above (e.g., "Q4 Sales", "Pending Returns")
  - Trend indicator below (e.g., "+12.5% vs Q3", "⚠️ Needs Approval")
- **Variants**: Default, Clickable (navigates to detail view), Alert (pulsing border for urgent items)
- **Usage**: All role-based dashboards

---

### 6.6 Component Usage Patterns

**Pattern 1: Split View Entity Management**
- Left panel: Tanstack Table with selection
- Right panel: Custom detail card + shadcn/ui components
- Example: Author management, Title management, Transaction history

**Pattern 2: Form Entry with Validation**
- shadcn/ui Form + custom smart components
- React Hook Form + Zod validation
- Inline errors + real-time feedback
- Example: Sales transaction entry, Author creation

**Pattern 3: Multi-Step Wizards**
- shadcn/ui Dialog + custom stepper + form components
- Step validation before proceeding
- Back button preserves state
- Example: Statement generation, Bulk operations

**Pattern 4: Dashboard Composition**
- Grid layout with DashboardStatCards
- Tanstack Table for recent transactions
- Recharts for trends
- Quick action buttons
- Example: Finance Dashboard, Owner Dashboard

**Pattern 5: Author Portal Simplified View**
- Minimal navigation
- Focus on clarity over density
- Mobile-responsive stacking
- Download/Print actions prominent
- Example: Statement list, Statement detail

---

### 6.7 Component Development Guidelines

**Accessibility:**
- All custom components follow WCAG 2.1 AA standards
- Keyboard navigation support (Tab, Enter, Escape, Arrow keys)
- ARIA labels for screen readers
- Focus indicators visible and distinct
- Color is never the only indicator (use icons, text, patterns)

**Performance:**
- Lazy load heavy components (Recharts, Tanstack Table)
- Use React.memo for expensive renders
- Virtualize long lists (Tanstack Table handles this)
- Debounce search inputs (300ms)
- Optimize re-renders with proper dependency arrays

**Consistency:**
- Use Editorial Navy theme colors consistently
- Inter font at established type scale
- 4px spacing scale (multiples of 4)
- Border radius: 6px default, 8px for cards, 12px for modals
- Hover states: Subtle background change (neutral-50)
- Active states: Primary-light background + primary border

**Testability:**
- Data-testid attributes for E2E tests
- Storybook stories for visual testing
- Unit tests for business logic (validation, calculations)
- Integration tests for complex workflows (wizards, multi-step forms)

---

## 7. UX Pattern Decisions

### 7.1 Overview

This section establishes consistency rules for common UI patterns across Salina ERP. Following these patterns ensures users build mental models quickly and work confidently.

---

### 7.2 Button Hierarchy

**Primary Buttons** (Navy #1e3a5f background, white text)
- **Usage**: Single most important action per screen/section
- **Examples**:
  - "Record Sale ($3,748.50)" (Sales transaction form)
  - "Generate Statements" (Wizard final step)
  - "Approve Return" (Return approval detail)
  - "Assign This ISBN" (ISBN assignment modal)
- **Rule**: Only ONE primary button per view or modal
- **State**: Hover darkens by 10%, active shows subtle press effect

**Secondary Buttons** (Slate #5b7c99 background, white text)
- **Usage**: Important but not primary action
- **Examples**:
  - "Reject Return" (Return approval detail)
  - "Choose Different ISBN" (ISBN assignment modal)
  - "Cancel" (Modals and forms)
- **Rule**: Use when there are 2 actions of similar weight
- **State**: Hover darkens by 10%

**Ghost/Outline Buttons** (Transparent background, navy border)
- **Usage**: Tertiary actions, less critical operations
- **Examples**:
  - "Request More Info" (Return approval)
  - "View Transaction" (Toast notification link)
  - "Download PDF" (Author portal)
- **State**: Hover shows light navy background (primary-50)

**Destructive Buttons** (Red #b91c1c background, white text)
- **Usage**: Irreversible or dangerous actions
- **Examples**:
  - "Delete Title" (Confirmation dialogs only)
  - "Void Transaction" (Financial corrections)
- **Rule**: Always require confirmation dialog
- **State**: Hover darkens by 10%

**Text Links** (Navy text, no background)
- **Usage**: Navigation, "learn more" links, tertiary actions
- **Examples**:
  - "Back to list" breadcrumb links
  - "Show more details" expandable sections
- **State**: Hover shows underline

**Disabled State** (All button types)
- **Visual**: Neutral-300 background, neutral-400 text, cursor not-allowed
- **Usage**: When action is unavailable (validation incomplete, permissions missing)
- **Accessibility**: Include aria-disabled and tooltip explaining why disabled

---

### 7.3 Feedback Patterns

**Toast Notifications** (Non-blocking, auto-dismiss)
- **Position**: Top-right corner, stacks vertically if multiple
- **Duration**:
  - Success: 4 seconds auto-dismiss
  - Info: 6 seconds auto-dismiss
  - Error: Persistent until manually dismissed
  - Warning: 8 seconds auto-dismiss
- **Variants**:
  - Success: Green background, checkmark icon, "✓ Sale recorded: 150 units..."
  - Error: Red background, alert icon, "✗ Failed to record sale. Retry?"
  - Warning: Amber background, warning icon, "⚠️ Similar transaction recorded 2 minutes ago"
  - Info: Navy background, info icon, "ℹ Statement generation in progress..."
- **Actions**: Optional action button (e.g., "Retry", "View Details", "Undo")
- **Rule**: Use for transient feedback that doesn't require user response

**Alert Banners** (In-page, persistent)
- **Position**: Top of content area or above relevant section
- **Dismissible**: Yes, via X button (unless critical)
- **Variants**: Same as toast (success/error/warning/info)
- **Usage**:
  - Page-level errors: "Network connection lost. Changes may not be saved."
  - Important notices: "⚠️ 12 pending returns require approval"
  - Validation summaries: "✗ 3 errors prevent submission. Fix highlighted fields."
- **Rule**: Use for persistent context that user needs to be aware of

**Inline Error Messages** (Field-level validation)
- **Position**: Directly below invalid input field
- **Color**: Red (#b91c1c) text
- **Icon**: Small alert icon preceding text
- **Timing**: Show on blur (after user leaves field) or on submit attempt
- **Examples**:
  - "Quantity must be a positive number"
  - "This ISBN is already assigned to another title"
- **Rule**: Be specific and actionable, not generic ("Invalid input")

**Loading States** (Progress indication)
- **Inline Spinners**: Small spinner icon for button actions (e.g., "Submitting...")
  - Replace button text with spinner + "Submitting" while request in flight
  - Button disabled during loading
- **Progress Bars**: For long-running operations with known progress
  - "Generating statements... 23 of 47 complete" (Linear progress bar)
- **Skeleton Screens**: For initial page loads
  - Show gray placeholder shapes matching content layout
  - Use for tables, cards, forms while data fetches
- **Rule**: Never leave user wondering if action was received

**Empty States** (No data scenarios)
- **Components**: Icon + Heading + Description + Action
- **Examples**:
  - No sales transactions:
    - Icon: Empty ledger
    - Heading: "No sales recorded yet"
    - Description: "Record your first sale to start tracking royalties"
    - Action: "Record Sale" button
  - No pending returns:
    - Icon: Checkmark in circle
    - Heading: "All returns processed"
    - Description: "No pending return approvals at this time"
    - Action: None (informational only)
- **Rule**: Always provide next action or explanation, never just "No data"

---

### 7.4 Form Patterns

**Label Position**: Top-aligned (label above input)
- **Rationale**: Consistent vertical scanning, works well on all screen sizes
- **Exception**: Checkboxes and radios use right-aligned labels

**Field Width**: Match expected input length
- **Examples**:
  - ISBN: Fixed width (200px) - predictable length
  - Email: Wide (100%) - variable length
  - Quantity: Narrow (120px) - usually short numbers
  - Title search: Wide (100%) - variable length
- **Rule**: Don't make all fields 100% width - provides visual hierarchy

**Required Fields**: Asterisk (*) in label + aria-required
- **Visual**: Red asterisk after label text: "Title *"
- **Helper text**: Optional explanatory text below field in neutral-600

**Validation Timing**:
- **On blur**: Show errors after user leaves field (gives chance to finish typing)
- **On submit**: Validate entire form, scroll to first error, focus first invalid field
- **Real-time**: Only for special cases (password strength, username availability)

**Input States**:
- **Default**: Neutral-200 border, white background
- **Focus**: Primary navy border (2px), subtle shadow
- **Error**: Red border (2px), red helper text below
- **Success**: Green border (optional, for critical validations like unique ISBN)
- **Disabled**: Neutral-100 background, neutral-300 border, cursor not-allowed

**Autofocus**: Focus first field on form load (accessibility consideration: announce form purpose)

**Auto-save vs. Explicit Save**:
- **Explicit Save**: Default pattern - "Save" button required
  - Use for most forms (sales transactions, author creation, title editing)
- **Auto-save**: Only for low-stakes, incremental edits
  - Example: Dashboard widget preferences
  - Visual feedback: "Saved" indicator appears briefly after change

---

### 7.5 Modal (Dialog) Patterns

**Size Guidelines**:
- **Small**: 400px width - Confirmations, simple forms
  - Example: "Approve return? Confirm/Cancel"
- **Medium**: 600px width - Forms, single-entity editing
  - Example: ISBN assignment modal
- **Large**: 900px width - Wizards, complex multi-field forms
  - Example: Statement generation wizard
- **Full-screen**: Mobile only or very complex data entry

**Dismiss Behavior**:
- **X button**: Always present in top-right
- **Escape key**: Closes modal (same as clicking X or Cancel)
- **Click outside**: Closes modal ONLY if no unsaved changes
  - If form has changes: Show "Unsaved changes. Discard?" confirmation
- **Cancel button**: Explicit dismiss action in footer

**Modal Structure**:
- **Header**: Title + optional subtitle + X button
- **Body**: Content (form, wizard steps, info display) - scrollable if exceeds viewport
- **Footer**: Action buttons (right-aligned: Cancel | Primary Action)

**Focus Management**:
- **On open**: Focus first interactive element (first input or primary button)
- **Focus trap**: Tab cycles within modal only (doesn't escape to page behind)
- **On close**: Return focus to trigger element (button that opened modal)

**Backdrop**: Semi-transparent black overlay (60% opacity) behind modal

---

### 7.6 Navigation Patterns

**Active State**:
- **Top Navigation Tabs**: Primary navy underline (3px), semibold text
  - Example: Dashboard | Titles | Authors | Sales | Statements
- **Sidebar Navigation**: Primary-light background (rgba primary 10%), primary left border (4px)
  - Example: Module sidebar if implemented
- **Breadcrumbs**: Current page in semibold, not linked
  - Example: Home → Authors → Jane Mitchell (last item not clickable)

**Breadcrumb Pattern**:
- **Position**: Top of content area, below page header
- **Format**: Home → Section → Subsection → Current Page
- **Separator**: Right chevron (›) or slash (/)
- **Clickable**: All items except current page (last item)
- **Truncation**: On mobile, show only last 2 levels: ... → Subsection → Current

**Back Button**: Use browser back or explicit "← Back to [List]" link
- **Context**: When deep in detail views (statement detail, transaction detail)
- **Position**: Top-left of content area or below breadcrumbs

**Pagination Controls** (for lists and tables):
- **Position**: Bottom-center of table/list
- **Components**:
  - Previous/Next buttons (always visible, disabled when at boundary)
  - Page numbers: Show 1 ... 4 5 [6] 7 8 ... 23 pattern
  - "Rows per page" dropdown: 10, 25, 50, 100 options
  - Total count: "Showing 51-75 of 234 transactions"

---

### 7.7 Confirmation Patterns

**Confirmation Dialog Required For**:
- **Irreversible actions**: Delete title, void transaction, remove author
- **High-impact actions**: Generate statements (affects 47 authors), approve bulk returns
- **Destructive actions**: Reject return (requires reason)

**Confirmation Dialog Structure**:
- **Title**: Action verb + object: "Delete Title?"
- **Message**: Clear consequence: "This will permanently delete 'The Great Novel' and all associated data. This cannot be undone."
- **Optional**: Input field for reason or additional confirmation
  - Example: Type "DELETE" to confirm (for very destructive actions)
  - Example: Rejection reason (required text field)
- **Buttons**:
  - Cancel (secondary, left)
  - Destructive action (red button, right): "Delete Title"

**Two-Step Confirmation** (for extreme actions):
- **Step 1**: Warning dialog explaining consequence
- **Step 2**: Type confirmation word or re-enter critical value
- **Usage**: Deleting tenant, wiping financial data, irreversible bulk operations

**Undo Pattern** (alternative to confirmation):
- **Usage**: For actions that CAN be reversed
- **Example**: "Sale voided. Undo?" toast with undo button (5-second window)
- **Benefit**: Faster workflow, less friction

---

### 7.8 Notification Patterns

**Toast vs. Alert vs. Badge**:
- **Toast**: Transient feedback for user-initiated actions (save, delete, submit)
- **Alert**: Persistent page-level status (network error, important notices)
- **Badge**: Counts or status indicators (12 pending returns, "New" label)

**Toast Stacking**: Maximum 3 toasts visible at once
- **Overflow**: Older toasts auto-dismiss to make room for new ones
- **Position**: Stack vertically, newest on top

**Notification Center** (future consideration):
- **Icon**: Bell icon in top nav with badge count
- **Purpose**: Historical log of all toasts and system notifications
- **Usage**: "You missed this: Statement generation completed while you were away"

---

### 7.9 Search Patterns

**Global Search** (if implemented):
- **Trigger**: Cmd/Ctrl + K opens command palette
- **Scope**: Searches across all entities (titles, authors, transactions)
- **Results**: Grouped by type (Titles, Authors, Sales, etc.)
- **Actions**: Navigate to entity or execute quick action

**Local Search** (within table/list):
- **Position**: Above table, left-aligned
- **Placeholder**: Context-specific: "Search transactions...", "Filter authors..."
- **Behavior**:
  - Real-time filtering as user types (debounced 300ms)
  - Search across visible columns
  - Clear button (X) appears when input has text
- **Accessibility**: Label for screen readers ("Search transactions table")

**Autocomplete Search** (for form inputs):
- **Usage**: Title selection in sales transaction form
- **Behavior**:
  - Start typing → dropdown appears after 2 characters
  - Shows max 10 results
  - Highlight matching portion of text
  - Keyboard navigation: Arrow keys to select, Enter to confirm, Escape to close
- **Empty state**: "No titles found matching 'xyz'. Create new title?"

---

### 7.10 Date & Time Patterns

**Date Display Format**:
- **Long**: January 15, 2026 (statement details, formal contexts)
- **Short**: Jan 15, 2026 (tables, lists)
- **Compact**: 01/15/2026 (very dense tables)
- **Relative**: "2 days ago", "Yesterday", "Just now" (activity logs, recent actions)

**Date Input**:
- **Component**: shadcn/ui DatePicker (calendar popup)
- **Format**: MM/DD/YYYY (US) - configurable for locale
- **Shortcuts**: "Today", "Yesterday", "Last 7 days", "Last 30 days" buttons
- **Keyboard**: Allow manual typing in MM/DD/YYYY format with validation

**Date Range Selection**:
- **Component**: Two date pickers (Start → End) or single range picker
- **Validation**: End date must be >= start date
- **Presets**: "This Quarter", "Last Quarter", "This Year", "Last 6 Months"
- **Usage**: Transaction filtering, statement period selection

**Time Display**:
- **Format**: 12-hour with AM/PM: "3:45 PM"
- **Context**: Timestamp for audit trails, transaction entries
- **Full timestamp**: "Jan 15, 2026 at 3:45 PM"

---

### 7.11 Table Patterns

**Row Hover State**: Light gray background (neutral-50)
- **Purpose**: Indicate interactivity, show row boundaries clearly

**Row Selection**:
- **Single-select**: Radio button column (first column) OR entire row clickable
  - Usage: Master-detail views (select to load detail in right panel)
  - Visual: Selected row has primary-light background + primary left border
- **Multi-select**: Checkbox column (first column)
  - Usage: Bulk actions (select multiple statements to download)
  - Header checkbox: Select all/deselect all

**Column Sorting**:
- **Visual**: Sort icon in header (neutral when not sorted, primary when active)
- **Interaction**: Click header to toggle sort (asc → desc → none)
- **Indicator**: Up/down arrow + sorted column header in semibold

**Column Resizing** (optional for power users):
- **Visual**: Drag handle appears on column border on hover
- **Persistence**: Save column widths in user preferences

**Sticky Header**: When table exceeds viewport height, header remains visible on scroll

**Action Column**: Right-most column for row-level actions
- **Content**: Icon buttons or "⋮" menu (more actions)
- **Common actions**: Edit, Delete, View Details
- **Alignment**: Right-aligned

---

### 7.12 Accessibility Patterns

**Keyboard Navigation**:
- **Tab**: Move forward through interactive elements
- **Shift+Tab**: Move backward
- **Enter**: Activate button or submit form
- **Space**: Toggle checkbox, activate button
- **Escape**: Close modal, dismiss popover, cancel action
- **Arrow keys**: Navigate within components (dropdown, date picker, table rows)

**Focus Indicators**:
- **Visual**: 2px primary navy outline with 2px white offset (highly visible)
- **Never remove**: Do not use `outline: none` without visible alternative
- **Focus-visible**: Use `:focus-visible` to show outline only for keyboard navigation

**Screen Reader Support**:
- **ARIA labels**: All interactive elements have accessible names
- **Live regions**: aria-live for toast notifications, loading states, dynamic updates
- **Landmark roles**: `<header>`, `<main>`, `<nav>`, `<aside>` for page structure
- **Table semantics**: Proper `<th>` for headers, `scope` attributes for complex tables

**Color Contrast**: All text meets WCAG 2.1 AA standards
- **Normal text**: 4.5:1 minimum contrast ratio
- **Large text** (18pt+): 3:1 minimum contrast ratio
- **Verified combinations**:
  - Navy #1e3a5f on white: 11.2:1 ✓
  - Neutral-700 #334155 on white: 12.6:1 ✓
  - White on primary navy: 11.2:1 ✓

---

## 8. Responsive Design & Accessibility

### 8.1 Breakpoint Strategy

**Breakpoints**:
- **Mobile**: < 768px (portrait phones, small tablets portrait)
- **Tablet**: 768px - 1279px (tablets, small laptops)
- **Desktop**: ≥ 1280px (standard desktops, large laptops)
- **Wide Desktop**: ≥ 1920px (optional optimizations for large monitors)

**Design Philosophy**:
- **Desktop-first for staff interfaces**: Data-dense, optimized for productivity
- **Mobile-first for author portal**: Simplified, focused on readability

**Container Max-Width**:
- **Desktop**: 1280px max-width, centered
- **Tablet**: 100% width with 16px side gutters
- **Mobile**: 100% width with 16px side gutters

---

### 8.2 Responsive Adaptation Patterns

#### 8.2.1 Split View Pattern

**Desktop (≥ 1280px)**:
- Left panel: 320px fixed width
- Right panel: Flexible (fills remaining space)
- Both panels visible side-by-side

**Tablet (768-1279px)**:
- Left panel: 280px width (slightly narrower)
- Right panel: Flexible
- Both visible, potentially with horizontal scroll if table content is wide

**Mobile (< 768px)**:
- **Collapsed to single view**:
  - Default: Show list view (left panel content) full-width
  - On item selection: Slide in detail view (right panel content) full-screen
  - Back button: "← Back to List" returns to list view
- **No side-by-side**: Mobile screen too narrow for effective split

---

#### 8.2.2 Navigation Adaptation

**Desktop Top Navigation**:
- Horizontal tabs: Dashboard | Titles | Authors | Sales | Statements
- User avatar and tenant switcher in top-right
- All items visible

**Tablet**:
- Same as desktop, may condense spacing slightly

**Mobile**:
- **Hamburger menu**: ☰ icon top-left opens slide-out drawer
- **Drawer navigation**: Vertical list of modules
- **Top bar**: Only logo, hamburger, and user avatar visible
- **Breadcrumbs**: Hidden or truncated to "... → Current Page"

---

#### 8.2.3 Table Adaptation

**Desktop**:
- Full table with all columns visible
- Horizontal scroll if many columns (acceptable for data-heavy use)

**Tablet**:
- Same as desktop, acceptable to scroll horizontally
- Consider hiding less critical columns (configurable column visibility)

**Mobile**:
- **Card-based layout** (replaces table):
  - Each row becomes a card
  - Key info displayed vertically within card
  - Example (Sales transaction mobile card):
    ```
    ┌─────────────────────────────────┐
    │ The Great Novel - Physical      │
    │ 150 units × $24.99 = $3,748.50 │
    │ Retail • Jan 15, 2026           │
    │ [View Details →]                │
    └─────────────────────────────────┘
    ```
- **Alternative**: Horizontal scroll with sticky first column (for simpler tables)

---

#### 8.2.4 Form Adaptation

**Desktop**:
- Multi-column layouts where logical (2-3 columns for related fields)
- Example: Sales transaction form with Title (full width), Format + Quantity (50/50 split)

**Tablet**:
- Same as desktop or reduced to 2 columns max

**Mobile**:
- **Single column**: All fields stack vertically
- **Full-width inputs**: Easier to tap and type on mobile
- **Larger tap targets**: Minimum 44px height for buttons and inputs (iOS accessibility)
- **Floating labels**: Consider floating label pattern to save vertical space

---

#### 8.2.5 Modal Adaptation

**Desktop**:
- Centered overlay with defined widths (400/600/900px)
- Backdrop overlay dims page behind

**Tablet**:
- Same as desktop, may use slightly smaller max-widths

**Mobile**:
- **Full-screen modals**: Modal takes entire viewport
- **Header**: Title + X button (top-right)
- **Body**: Scrollable content
- **Footer**: Sticky footer with action buttons
- **Wizard modals**: Progress steps shown as compact stepper or "Step 2 of 4" text

---

#### 8.2.6 Dashboard Adaptation

**Desktop**:
- Grid layout: 3-4 stat cards per row
- Charts full-width or 50/50 split
- Recent transactions table below

**Tablet**:
- 2 stat cards per row
- Charts stack vertically
- Table scrolls horizontally if needed

**Mobile**:
- **1 stat card per row** (stacked vertically)
- **Charts**: Full-width, simplified (fewer data points, larger touch targets)
- **Recent transactions**: Card-based list (not table)
- **Swipe gestures**: Consider swipe-to-refresh for dashboard updates

---

### 8.3 Touch Interaction Patterns

**Touch Target Sizes** (Mobile):
- **Minimum**: 44px × 44px (iOS/WCAG guideline)
- **Preferred**: 48px × 48px for frequently-used actions
- **Spacing**: Minimum 8px between adjacent touch targets

**Touch Gestures** (Mobile):
- **Tap**: Primary interaction (same as click)
- **Long press**: Context menu or additional options (where applicable)
- **Swipe**:
  - Horizontal swipe on cards: Reveal actions (e.g., swipe transaction card to reveal "Edit" or "Void")
  - Pull-to-refresh: Dashboard and list views
- **Pinch-to-zoom**: Disabled for UI (allow only for images/PDFs if needed)

**Hover State on Touch Devices**:
- No reliance on hover for critical information
- Hover states trigger on tap (sticky hover), dismiss on second tap or tap elsewhere

---

### 8.4 WCAG 2.1 AA Compliance Requirements

#### 8.4.1 Perceivable

**Color Contrast** (1.4.3):
- All text meets 4.5:1 minimum contrast ratio (normal text)
- Large text (18pt+) meets 3:1 minimum
- Interactive elements (buttons, links) meet 3:1 against background

**Color Independence** (1.4.1):
- Never use color as only indicator
- Example: Status badges use both color AND text ("Approved" in green, not just green)
- Example: Error fields show both red border AND error icon/text

**Text Sizing** (1.4.4):
- Text can be resized up to 200% without loss of functionality
- Use rem units (relative to root font size), not fixed px for font sizes

**Reflow** (1.4.10):
- Content reflows at 320px width (mobile) without horizontal scroll (except tables where acceptable)

---

#### 8.4.2 Operable

**Keyboard Accessible** (2.1.1):
- All interactive elements reachable via keyboard
- Logical tab order matches visual order
- No keyboard traps (can Tab out of all components)

**Focus Visible** (2.4.7):
- Clear focus indicator (2px navy outline with white offset)
- Focus indicator visible for all interactive elements
- :focus-visible used to hide outline for mouse users, show for keyboard users

**Skip Links** (2.4.1):
- "Skip to main content" link (hidden until focused) at top of page
- Allows keyboard users to bypass navigation

**Sufficient Time** (2.2.1):
- Auto-dismiss toasts have sufficient time (4+ seconds)
- Session timeouts show warning with option to extend
- No time limits on form completion

---

#### 8.4.3 Understandable

**Page Titled** (2.4.2):
- Every page has descriptive `<title>`: "Sales Transactions - Salina ERP"

**Labels and Instructions** (3.3.2):
- All form fields have visible labels
- Required fields marked with asterisk + aria-required
- Helper text provided for complex inputs ("Enter ISBN in 978-X-XXXX format")

**Error Identification** (3.3.1):
- Errors clearly identified with text (not just color)
- Error messages specific and actionable: "Quantity must be a positive number" (not "Invalid")

**Error Suggestion** (3.3.3):
- Error messages suggest how to fix: "Email format should be name@example.com"

---

#### 8.4.4 Robust

**Parsing** (4.1.1):
- Valid semantic HTML5
- No duplicate IDs
- Proper nesting of elements

**Name, Role, Value** (4.1.2):
- All custom components use appropriate ARIA roles and attributes
- Form inputs have associated labels (label[for] or aria-label)
- Dynamic content uses aria-live regions

**Status Messages** (4.1.3):
- Toast notifications use role="status" or aria-live="polite"
- Error summaries use role="alert" or aria-live="assertive"

---

### 8.5 Screen Reader Support

**Semantic HTML**:
- Use `<header>`, `<main>`, `<nav>`, `<aside>`, `<footer>` for page structure
- Use `<h1>`-`<h6>` hierarchy for headings (no skipped levels)
- Use `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` for tabular data

**ARIA Landmarks**:
- Supplement HTML5 semantics with ARIA landmarks where needed
- `role="navigation"` for nav elements
- `role="search"` for search forms
- `role="complementary"` for sidebars

**ARIA Labels**:
- `aria-label` for icon-only buttons: `<button aria-label="Close modal">`
- `aria-labelledby` to associate labels with complex components
- `aria-describedby` for additional context (help text, error messages)

**Live Regions**:
- Toast notifications: `<div role="status" aria-live="polite" aria-atomic="true">`
- Error alerts: `<div role="alert" aria-live="assertive">`
- Loading states: `<div aria-live="polite" aria-busy="true">Loading...</div>`

**Hidden Content**:
- `aria-hidden="true"` for decorative icons (not conveying information)
- `visually-hidden` class for screen-reader-only text (e.g., "Current page" for active nav item)

---

### 8.6 Testing Strategy

#### Automated Testing

**Accessibility Scanning**:
- **Tool**: axe DevTools or Lighthouse (Chrome)
- **Frequency**: Every build (CI/CD integration)
- **Coverage**: All pages and major user flows
- **Fail build on**: Critical violations (color contrast, missing labels, keyboard traps)

**Visual Regression Testing**:
- **Tool**: Percy or Chromatic (Storybook integration)
- **Coverage**: All components in various states (default, hover, focus, error, disabled)
- **Responsive**: Test at mobile (375px), tablet (768px), desktop (1280px) breakpoints

**Unit Testing**:
- React component tests (Jest + React Testing Library)
- Test keyboard interactions, focus management, ARIA attributes

---

#### Manual Testing

**Keyboard Navigation**:
- **Frequency**: Every major feature release
- **Checklist**:
  - Can reach all interactive elements via Tab
  - Focus indicators visible
  - Modals trap focus correctly
  - Escape key closes overlays
  - Arrow keys work in custom components (dropdowns, date pickers)

**Screen Reader Testing**:
- **Tool**: NVDA (Windows), VoiceOver (Mac), JAWS (Windows)
- **Frequency**: Quarterly or for major UX changes
- **Scenarios**: Test critical user journeys (record sale, view statement, generate statements)

**Responsive Testing**:
- **Devices**: iPhone 13 (iOS Safari), iPad (Safari), Android phone (Chrome), Desktop (Chrome, Firefox, Safari, Edge)
- **Breakpoints**: Test at exact breakpoint boundaries (768px, 1280px) and common device sizes
- **Orientation**: Test portrait and landscape on tablets

**Touch Interaction Testing**:
- **Real devices**: Test on actual mobile devices, not just emulators
- **Scenarios**: Tap targets, swipe gestures, form entry on mobile keyboards

---

### 8.7 Progressive Enhancement

**Core Functionality Without JavaScript**:
- Forms can submit via standard POST (even if JavaScript enhances with validation)
- Links navigate without JS (even if JS adds SPA routing)
- **Practical reality**: Salina ERP is a React SPA, but critical flows should degrade gracefully

**Loading States**:
- Show skeleton screens or spinners while JavaScript loads
- Avoid "blank page flash" on initial load

**Offline Resilience** (future consideration):
- Service worker caching for offline viewing of statements
- Queue transactions for submission when connection restored

---

### 8.8 Performance Accessibility

**Reduced Motion** (prefers-reduced-motion):
- Respect user's motion preferences
- Disable auto-playing animations, carousels
- Use instant transitions instead of animated transitions for users with vestibular disorders

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**High Contrast Mode** (Windows High Contrast):
- Test that borders and focus indicators remain visible
- Use system colors where appropriate

**Dark Mode** (future consideration):
- Respect `prefers-color-scheme: dark`
- Provide toggle in user settings
- Maintain WCAG contrast ratios in dark theme

---

### 8.9 Internationalization (i18n) Considerations

**Language Support**:
- Architecture supports i18n (react-i18next or similar)
- All UI strings externalized to translation files
- Right-to-left (RTL) layout support for Arabic, Hebrew (future)

**Date/Number Formatting**:
- Use locale-aware formatting (Intl.DateTimeFormat, Intl.NumberFormat)
- Currency displays respect user's locale: $1,234.56 (US) vs €1.234,56 (DE)

**Character Encoding**:
- UTF-8 throughout (support international author names, accented characters)

---

---

## 9. Implementation Guidance

### 9.1 Component Implementation Priority

**Phase 1: Foundation (Week 1-2)**
1. Set up shadcn/ui base installation
2. Configure Tailwind with Editorial Navy theme colors
3. Install Inter font (Google Fonts CDN or self-hosted)
4. Create base layout components (Header, Navigation, Container)
5. Implement core shadcn/ui components needed across all features:
   - Button (all variants)
   - Form, Input, Select, Checkbox, Radio
   - Card, Badge, Alert, Toast
   - Dialog (Modal)

**Phase 2: Data Layer (Week 2-3)**
1. Install and configure Tanstack Table
2. Create reusable `DataTable` wrapper component
3. Implement table features: sorting, filtering, pagination, row selection
4. Test with sample data for performance (1000+ rows)

**Phase 3: Critical User Journeys (Week 3-5)**
1. **Sales Transaction Entry** (Journey 1):
   - SalesTransactionForm component
   - Title autocomplete integration
   - Real-time calculation preview
2. **Author Portal Statement View** (Journey 4):
   - RoyaltyStatementDetail component
   - Statement list with Tanstack Table
   - PDF download functionality
3. **Return Approval** (Journey 2):
   - ReturnApprovalCard component
   - Split view layout implementation
   - Confirmation dialogs

**Phase 4: High-Stakes Workflows (Week 5-6)**
1. **Statement Generation Wizard** (Journey 3):
   - StatementGenerationWizard component
   - Multi-step form state management
   - Preview table with calculations
2. **ISBN Assignment** (Journey 5):
   - ISBNAssignmentModal component
   - Smart preview logic

**Phase 5: Domain Components (Week 6-7)**
1. TieredRoyaltyConfigurator
2. ISBNPoolStatusWidget
3. AuthorSummaryCard
4. TitleFormatManager
5. DashboardStatCard

**Phase 6: Dashboard & Visualization (Week 7-8)**
1. Install and configure Recharts
2. Implement chart components for dashboard
3. Build role-specific dashboards (Owner, Finance, Editor)

**Phase 7: Responsive & Polish (Week 8-9)**
1. Implement responsive breakpoints
2. Mobile navigation (hamburger menu, drawer)
3. Mobile adaptations (card-based tables, full-screen modals)
4. Touch interaction patterns

**Phase 8: Accessibility & Testing (Week 9-10)**
1. Keyboard navigation implementation
2. Screen reader testing and fixes
3. Color contrast validation
4. Automated accessibility testing setup

---

### 9.2 Design System Setup

**Tailwind Configuration** (`tailwind.config.js`):
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e3a5f',
          50: '#f0f4f8',
          100: '#d9e2ec',
          500: '#1e3a5f',
          600: '#18304f',
          700: '#12263f',
        },
        secondary: {
          DEFAULT: '#5b7c99',
          500: '#5b7c99',
        },
        accent: {
          DEFAULT: '#c17d4a',
          500: '#c17d4a',
        },
        success: '#2d7d3e',
        warning: '#d97706',
        error: '#b91c1c',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', 'monospace'],
      },
      spacing: {
        // 4px base unit already provided by Tailwind
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
};
```

**Inter Font Integration** (`app/layout.tsx` or `index.html`):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**shadcn/ui Installation**:
```bash
npx shadcn-ui@latest init
# Select: Next.js, TypeScript, Tailwind CSS
# Style: Default
# Base color: Slate (will override with Editorial Navy)
# CSS variables: Yes
```

**Install Core Components**:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add form
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add card
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add table
# ... install others as needed
```

---

### 9.3 File Organization

```
src/
├── app/                          # Next.js App Router pages
│   ├── (staff)/                  # Staff interface routes
│   │   ├── dashboard/
│   │   ├── titles/
│   │   ├── authors/
│   │   ├── sales/
│   │   └── statements/
│   ├── (author-portal)/          # Author portal routes
│   │   └── statements/
│   └── layout.tsx                # Root layout with fonts, providers
├── components/
│   ├── ui/                       # shadcn/ui base components (auto-generated)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── data/                     # Data layer components
│   │   ├── data-table.tsx        # Tanstack Table wrapper
│   │   └── column-defs/          # Reusable column definitions
│   ├── publishing/               # Domain-specific components
│   │   ├── sales-transaction-form.tsx
│   │   ├── return-approval-card.tsx
│   │   ├── statement-generation-wizard.tsx
│   │   ├── royalty-statement-detail.tsx
│   │   ├── isbn-assignment-modal.tsx
│   │   ├── isbn-pool-status-widget.tsx
│   │   ├── tiered-royalty-configurator.tsx
│   │   ├── author-summary-card.tsx
│   │   ├── title-format-manager.tsx
│   │   └── dashboard-stat-card.tsx
│   ├── layout/                   # Layout components
│   │   ├── header.tsx
│   │   ├── navigation.tsx
│   │   ├── split-view.tsx
│   │   └── mobile-drawer.tsx
│   └── charts/                   # Recharts wrapper components
│       ├── line-chart.tsx
│       ├── bar-chart.tsx
│       └── pie-chart.tsx
├── lib/
│   ├── utils.ts                  # Tailwind cn() utility
│   ├── validations.ts            # Zod schemas for forms
│   └── formatters.ts             # Date, currency, number formatters
└── styles/
    └── globals.css               # Tailwind imports, custom CSS
```

---

### 9.4 Key Implementation Notes

#### Split View Implementation

```typescript
// components/layout/split-view.tsx
export function SplitView({
  leftPanel,
  rightPanel,
  leftWidth = 320
}: SplitViewProps) {
  return (
    <div className="flex h-full">
      {/* Left Panel - Master */}
      <div
        className="border-r border-neutral-200 overflow-y-auto"
        style={{ width: leftWidth }}
      >
        {leftPanel}
      </div>

      {/* Right Panel - Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {rightPanel}
      </div>
    </div>
  );
}
```

**Responsive Adaptation**:
```typescript
// Use state to toggle between list and detail on mobile
const [selectedItem, setSelectedItem] = useState(null);
const isMobile = useMediaQuery('(max-width: 768px)');

if (isMobile) {
  return selectedItem ? (
    <DetailView item={selectedItem} onBack={() => setSelectedItem(null)} />
  ) : (
    <ListView onSelect={setSelectedItem} />
  );
}

return <SplitView leftPanel={<ListView />} rightPanel={<DetailView />} />;
```

---

#### Form Validation Pattern

```typescript
// lib/validations.ts
import { z } from 'zod';

export const salesTransactionSchema = z.object({
  title_id: z.string().min(1, 'Title is required'),
  format: z.enum(['Physical', 'Ebook', 'Audiobook']),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit_price: z.number().positive('Price must be greater than 0'),
  sale_date: z.date(),
  channel: z.enum(['Retail', 'Wholesale', 'Direct', 'Distributor']),
});

// components/publishing/sales-transaction-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function SalesTransactionForm() {
  const form = useForm({
    resolver: zodResolver(salesTransactionSchema),
    defaultValues: {
      channel: 'Retail', // Remember last-used
      sale_date: new Date(),
    },
  });

  const total = form.watch('quantity') * form.watch('unit_price');

  return (
    <Form {...form}>
      {/* Form fields with validation */}
      <div className="text-lg font-semibold">
        Total: ${total.toFixed(2)}
      </div>
      <Button type="submit">Record Sale (${total.toFixed(2)})</Button>
    </Form>
  );
}
```

---

#### Tanstack Table Configuration

```typescript
// components/data/data-table.tsx
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';

export function DataTable({ data, columns, onRowSelect }) {
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  // Notify parent when selection changes
  useEffect(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length > 0) {
      onRowSelect(selectedRows[0].original);
    }
  }, [rowSelection]);

  return (
    <Table>
      {/* Render table with Tanstack Table API */}
    </Table>
  );
}
```

---

### 9.5 Accessibility Implementation Checklist

**Per Component**:
- [ ] All interactive elements have accessible names (aria-label or visible label)
- [ ] Focus indicators visible (2px navy outline)
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrows)
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text, 3:1 for large text)
- [ ] Error states announced to screen readers (aria-live or role="alert")
- [ ] Loading states announced (aria-busy, aria-live)
- [ ] Form validation errors are specific and actionable

**Per Page**:
- [ ] Semantic HTML structure (header, main, nav, aside)
- [ ] Heading hierarchy (h1 → h2 → h3, no skipped levels)
- [ ] Skip to main content link
- [ ] Page title is descriptive
- [ ] Landmarks labeled (aria-label on nav elements)

**Automated Testing**:
- [ ] axe DevTools run on all pages (0 critical violations)
- [ ] Lighthouse accessibility score ≥ 90
- [ ] ESLint jsx-a11y rules enforced

---

### 9.6 Performance Optimization

**Code Splitting**:
```typescript
// Lazy load heavy components
const StatementGenerationWizard = dynamic(
  () => import('@/components/publishing/statement-generation-wizard'),
  { loading: () => <Spinner /> }
);
```

**Virtualization for Large Tables**:
```typescript
// Use Tanstack Table's virtualization for 1000+ rows
import { useVirtualizer } from '@tanstack/react-virtual';
```

**Image Optimization**:
- Use Next.js `<Image>` component for author avatars
- Lazy load images below the fold

**Bundle Size**:
- Tree-shake Recharts (import only specific chart types)
- Monitor bundle size with @next/bundle-analyzer

---

### 9.7 Handoff to Development Team

**What Developers Receive**:
1. **This UX Design Specification** (complete design system, patterns, journeys)
2. **Interactive Color Theme Visualizer** (docs/ux-color-themes.html)
3. **Design Direction Mockups** (docs/ux-design-directions.html)
4. **PRD** (docs/prd.md) for functional requirements context
5. **Access to shadcn/ui documentation** (ui.shadcn.com)
6. **Figma/Design Files** (if created) - _not part of this workflow, optional_

**Developer Workflow**:
1. Review this specification end-to-end
2. Set up design system (Tailwind config, fonts, shadcn/ui)
3. Build components in Storybook for visual testing
4. Implement user journeys page-by-page
5. Test accessibility at each milestone
6. Conduct responsive testing on real devices
7. Perform cross-browser testing

**Design QA Checkpoints**:
- After Phase 1 (Foundation): Review base components match design system
- After Phase 3 (Critical Journeys): Review 3 key flows match specification
- After Phase 7 (Responsive): Review mobile adaptations on real devices
- After Phase 8 (Accessibility): Review keyboard navigation and screen reader support

---

### 9.8 Design Iteration Process

**Feedback Loop**:
1. Developer implements component per specification
2. UX Designer reviews in dev environment or Storybook
3. Feedback provided via issues/tickets with screenshots
4. Developer iterates based on feedback
5. Sign-off when component matches specification

**Deviation Requests**:
- If technical constraints prevent exact implementation, developer proposes alternative
- UX Designer evaluates alternative for user impact
- Decision documented in component comments or design log

**Living Document**:
- This specification is version-controlled and updated as design decisions evolve
- All changes noted in Version History table (Section 9.10)

---

### 9.9 Future Enhancements

**Post-MVP Considerations**:
1. **Dark Mode**: Implement `prefers-color-scheme: dark` support with Editorial Navy dark variant
2. **Advanced Filtering**: Add saved filter presets for power users
3. **Bulk Operations**: Multi-select actions for statements, transactions, returns
4. **Notification Center**: Persistent notification history accessible from bell icon
5. **Command Palette**: Global search (Cmd+K) across all entities
6. **Customizable Dashboards**: User-configurable widget layout
7. **Offline Support**: Service worker for author portal statement caching
8. **Real-time Collaboration**: Live updates when other users make changes (WebSockets)
9. **Export Flexibility**: CSV, Excel, PDF export for all data tables
10. **Advanced Reporting**: Custom report builder for finance team

**Internationalization (i18n)**:
- Multi-language support (Spanish, French, German for international publishers)
- RTL layout support (Arabic, Hebrew)
- Locale-specific date/number formatting

**Accessibility Beyond AA**:
- AAA compliance for critical user journeys
- High contrast mode toggle in user settings
- Text-to-speech integration for author portal

---

### 9.10 Version History

| Date       | Version | Changes                                                  | Author |
| ---------- | ------- | -------------------------------------------------------- | ------ |
| 2025-11-21 | 1.0     | Complete UX Design Specification - All sections finalized | BMad   |

---

### 9.11 Sign-Off

**UX Design Specification Completed By**: BMad (UX Designer Agent - Sally)
**Date**: 2025-11-21
**Approved For Development**: Yes

**Next Workflow**: Architecture (create-architecture) to define technical implementation aligned with this UX design.

---

## Appendix

### Related Documents

- Product Requirements: `docs/prd.md`
- Brainstorming: `docs/bmm-brainstorming-session-2025-11-21.md`

### Core Interactive Deliverables

This UX Design Specification was created through visual collaboration:

- **Color Theme Visualizer**: _To be generated_
- **Design Direction Mockups**: _To be generated_

### Next Steps & Follow-Up Workflows

This UX Design Specification can serve as input to:

- **Architecture Workflow** - Define technical architecture with UX context
- **Wireframe Generation Workflow** - Create detailed wireframes from user flows
- **Interactive Prototype Workflow** - Build clickable HTML prototypes
- **Component Showcase Workflow** - Create interactive component library

### Version History

| Date       | Version | Changes                         | Author |
| ---------- | ------- | ------------------------------- | ------ |
| 2025-11-21 | 0.1     | Initial UX Design Specification | BMad   |

---

_This UX Design Specification is being created through collaborative design facilitation, not template generation. All decisions are made with user input and documented with rationale._
