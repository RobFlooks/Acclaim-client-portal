# Debt Recovery & Credit Management Portal - Design Guidelines

## Design Approach
**Design System**: shadcn/ui components with professional financial services aesthetic
**Inspiration**: Linear (clean data density) + Stripe Dashboard (professional restraint) + Modern banking interfaces

## Layout Architecture

**Application Structure**: Full-height dashboard layout with persistent navigation
- Left sidebar: 240px fixed width, full height, contains primary navigation
- Top header: 64px height, spans remaining width, contains user profile, notifications, search
- Main content area: Fills remaining space with max-w-7xl container and px-6 py-8 padding
- No hero sections - this is a working application, not marketing

**Spacing System**: Tailwind units of 2, 4, 6, 8, 12, 16
- Card padding: p-6
- Section gaps: space-y-8
- Grid gaps: gap-6
- Button/input spacing: px-4 py-2

## Typography Hierarchy

**Font Stack**: 
- Primary: Inter (400, 500, 600, 700)
- Monospace: JetBrains Mono for case IDs, amounts

**Scale**:
- Page titles: text-2xl font-semibold
- Section headings: text-lg font-semibold
- Card titles: text-base font-medium
- Body text: text-sm
- Labels/metadata: text-xs text-muted-foreground
- Numbers/amounts: font-mono tracking-tight

## Core Components

**Navigation Sidebar**:
- Logo/brand at top (h-16 flex items-center)
- Navigation items grouped by function: Cases, Messages, Documents, Reports, Admin
- Active state with subtle left border accent
- Icon + label layout with icons from Lucide React
- Collapse button at bottom

**Dashboard Cards**: 
- White background with subtle border
- Rounded corners (rounded-lg)
- Shadow on hover (transition-shadow)
- Consistent p-6 padding
- Headers with action buttons aligned right

**Data Tables**:
- Compact row height with alternating subtle backgrounds
- Sortable column headers
- Sticky header on scroll
- Row actions via dropdown menu (right-aligned)
- Status badges with appropriate semantic styling
- Pagination controls at bottom

**Case Management Interface**:
- Split view: List (40%) + Detail (60%)
- Case list: Scrollable with search/filter bar at top
- Each case card shows: ID, debtor name, amount owed, status, last activity
- Detail panel: Tabbed interface (Overview, Timeline, Documents, Messages, Notes)
- Action bar with primary CTAs (Contact Debtor, Add Payment, Generate Report)

**Messaging Component**:
- Inbox-style list with thread preview
- Unread indicators (dot + bold text)
- Message detail with conversation thread
- Reply composer at bottom with file attachment support
- Template quick-insert dropdown

**Document Handling**:
- Grid view of document cards with preview thumbnails
- File type icons for non-previewable formats
- Upload dropzone with drag-and-drop
- Bulk actions toolbar when items selected
- Document metadata sidebar on selection

**Reports Dashboard**:
- KPI cards in 4-column grid showing: Total Outstanding, Recovery Rate, Active Cases, Avg Days to Resolution
- Large numbers with trend indicators (↑↓ with percentage)
- Interactive charts using Recharts: Line chart for recovery trends, Bar chart for case status breakdown
- Date range selector in top-right
- Export button for data downloads

**Admin Panel**:
- User management table with role assignment
- System settings organized in accordions
- Audit log with filterable timeline
- Permission matrix displayed as grid

## Forms & Inputs

**Form Layout**:
- Labels above inputs (not floating)
- Two-column layout for efficiency where appropriate
- Required field indicators
- Inline validation with clear error messages
- Submit actions in footer with Cancel secondary button

**Input Styling**:
- Consistent height (h-10 for standard inputs)
- Focus rings match system theme
- Disabled state clearly distinguished
- Dropdowns with search for long lists (Combobox component)

## Modal & Dialog Patterns

**Standard Modals**: 
- Max width: max-w-2xl for forms, max-w-4xl for data views
- Header with title + close button
- Content area with scrolling if needed
- Footer with action buttons (primary right, secondary left)

**Confirmation Dialogs**: Centered, smaller (max-w-md), clear warning for destructive actions

## Notifications & Feedback

**Toast Notifications**: 
- Top-right positioning
- Auto-dismiss after 5s (persist for errors)
- Success, Error, Warning, Info variants
- Include relevant action buttons when applicable

**Loading States**: 
- Skeleton screens for data tables
- Spinner for async actions
- Progress bars for file uploads

## Professional Constraints

- No decorative animations (functional transitions only)
- Maintain high information density without clutter
- Every click should accomplish work
- Consistent padding prevents UI fatigue
- Professional typography never playful
- Clear visual hierarchy supports rapid scanning

## Images

**No images required** - This is a data-intensive application where interface clarity and information density take priority over visual imagery. All visual interest comes from clean typography, well-organized layouts, and subtle use of accent colors in status indicators and charts.