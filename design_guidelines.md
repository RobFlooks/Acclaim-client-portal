# Design Guidelines: Acclaim Credit Management Portal

## Design Approach
**System-Based Approach**: Drawing from Linear's professional efficiency, Stripe's data-dense elegance, and Shadcn/ui's minimal component patterns. This is a utility-focused business application prioritizing clarity, speed, and data density over visual flair.

## Typography
- **Primary Font**: Inter (Google Fonts) - excellent for data-dense interfaces
- **Mono Font**: JetBrains Mono for account numbers, reference codes
- **Hierarchy**:
  - Page titles: text-2xl/text-3xl, font-semibold
  - Section headers: text-lg, font-medium
  - Body/tables: text-sm, font-normal
  - Labels/metadata: text-xs, text-muted-foreground

## Layout System
**Spacing**: Use Tailwind units of 1, 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4 to p-6
- Section gaps: gap-6 to gap-8
- Page margins: px-6 lg:px-8
- Card spacing: space-y-6

## Core Components

**Dashboard Layout**:
- Fixed sidebar (240px) with collapsible menu
- Top bar with search, notifications, theme toggle, user menu
- Main content area with max-w-screen-2xl
- Breadcrumb navigation below top bar

**Data Tables**:
- Alternating row backgrounds (subtle)
- Fixed header on scroll
- Row actions on hover (right-aligned)
- Sortable columns with indicators
- Pagination controls bottom-right

**Cards**:
- Rounded corners (rounded-lg)
- Subtle border or elevated shadow (theme-dependent)
- Header with title + actions
- Dense content layout with clear sections

**Forms**:
- Labels above inputs
- Input fields with focus ring in teal
- Error states with inline messages
- Multi-column layouts (grid-cols-2) for efficiency
- Action buttons right-aligned

**Navigation**:
- Sidebar: Icons + labels, active state with teal accent background
- Top tabs for sub-sections (underline indicator)
- Contextual action buttons (top-right of content areas)

**Messaging Interface**:
- Three-column layout: Thread list | Message view | Details panel
- Thread list with preview text, timestamps, unread indicators
- Message bubbles with sender metadata
- Attachment previews inline

**Document Management**:
- List/grid view toggle
- File type icons, file size, upload date
- Quick actions (download, share, delete)
- Drag-and-drop upload zones

**Reporting Dashboard**:
- KPI cards grid (grid-cols-4)
- Chart containers with filters
- Export buttons per section
- Date range selectors (top-right)

## Theme Implementation
**Light Theme**:
- Background: white/gray-50
- Cards: white with border
- Text: gray-900/gray-600
- Accents: teal-600 (#0d9488)

**Dark Theme**:
- Background: gray-950/gray-900
- Cards: gray-800 with subtle border
- Text: gray-50/gray-400
- Accents: teal-400 (lighter for contrast)

Toggle positioned in top bar, smooth transition on theme change.

## Interaction Patterns
- Hover states: Subtle background change, no color shifts
- Loading states: Skeleton screens for data tables
- Empty states: Centered icon + text + primary action
- Confirmation modals for destructive actions
- Toast notifications (top-right) for feedback
- No animations except smooth transitions (150-200ms)

## Responsive Approach
- Desktop-first (primary use case)
- Tablet: Collapsible sidebar, single-column forms
- Mobile: Hidden sidebar (hamburger menu), stacked layouts

## Images
**No hero image** - this is a business application dashboard, not a marketing site. Focus on efficient data presentation and workflow tools.