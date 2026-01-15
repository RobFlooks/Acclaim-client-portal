# Acclaim Credit Management System

## Overview
This is a full-stack web application designed as a client portal for debt recovery and credit management. Its main purpose is to allow users to manage debt recovery cases, track their progress, and communicate with the recovery team. The system aims to streamline debt recovery processes, improve client communication, and provide a comprehensive platform for credit management, offering significant market potential for legal firms and debt collection agencies.

## User Preferences
Preferred communication style: Simple, everyday language.
Language preference: British English (organisation not organization, colour not color, etc.)

## System Architecture

### Frontend
- **Framework**: React with TypeScript, using Vite for building.
- **UI/UX**: Tailwind CSS with shadcn/ui components for consistent and accessible design, including custom CSS variables and light/dark theme support.
- **State Management**: TanStack Query for server state.
- **Routing**: Wouter for lightweight client-side routing.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database**: PostgreSQL with Drizzle ORM, hosted on Neon serverless PostgreSQL.
- **Session Management**: Express sessions with PostgreSQL storage.
- **File Handling**: Multer for file uploads (10MB limit).
- **Security**: bcrypt for password hashing.

### Authentication & Authorization
- **Provider**: Local username/password authentication via Passport.js, with optional Azure Entra External ID (Microsoft) single sign-on. Registration is disabled; user accounts are created by administrators.
- **Azure Entra External ID**: Optional SSO integration allowing users to sign in with their Microsoft accounts. Requires AZURE_CLIENT_ID, AZURE_TENANT_ID, and AZURE_CLIENT_SECRET environment variables. Users must have existing portal accounts (matched by email). See `AZURE_ENTRA_SETUP_GUIDE.md` for configuration instructions.
- **Initial Admin Setup**: First-time system deployment includes a "Create Initial Admin Account" button on the login page that only appears when no admin users exist in the database. This allows secure bootstrapping of the system without requiring database access. Password complexity requirements: 8+ characters with uppercase, lowercase, and number.
- **Session Storage**: PostgreSQL-backed sessions with 1-week TTL, secured with HTTP-only cookies and CSRF protection.
- **Security Features**: Temporary passwords with forced change on first login. **PASSWORD RESET VIA EMAIL** - Users can reset forgotten passwords through a secure two-step process: request a 6-digit one-time code via email, then enter the code to log in with forced password change. OTP tokens are bcrypt-hashed, expire in 15 minutes, are single-use, and responses are generic to prevent email enumeration.
- **Admin Controls**: Email domain restrictions for admin privileges.
- **Access Control**: Comprehensive real-time access control for multi-organisation users, ensuring users can access cases, messages, and documents from all assigned organisations while maintaining security restrictions.

### Key Features
- **Database Schema**: Includes Users, Organizations (multi-tenant), Cases (with status and debtor type), Case Activities, Messages, Documents, and Sessions.
- **API Structure**: Organized by domain (e.g., `/api/auth`, `/api/cases`, `/api/admin`, `/api/external/*` for integrations).
- **Frontend Components**: Dashboard, Case management (list, search, filter, details), Messaging, Document management, Reporting, Enhanced Admin Panel (user/organisation management, password reset, admin privilege management), and User Profile Management.
- **Data Flow**: Authentication scopes operations to the user's organization(s). Cases progress through stages, all changes are logged as activities, and communication is integrated.
- **Integration Capabilities**: HTTP API endpoints for external case creation, updates, activity management, message sending, document uploads, and payment updates, designed for compatibility with existing case management systems like SOS. Includes complete email notification system for external API messages.
- **Email Notifications**: Complete bidirectional email notification system using SendGrid for production with user-to-admin messaging, admin-to-user messaging, and external case management API notifications with user-controlled preferences. **ENHANCED CASE DETAILS** - When users send messages from within a case, admin emails now include comprehensive case information (case name, debtor type, amounts, status, stage). **FILE ATTACHMENT SUPPORT** - Messages with file attachments automatically include the files in admin email notifications with clear indication of filename and size. **COMPREHENSIVE CASE SUBMISSION NOTIFICATIONS** - Automatic email notifications to email@acclaim.law when users submit new cases, including Excel spreadsheet and email body with ALL populated form fields (client details, creditor, debtor information, address, contact details, debt details, payment terms, invoice details, additional information) and all uploaded documents as attachments. Only populated fields are included for clean, relevant notifications. **PRODUCTION READY** - Real email delivery confirmed with verified sender (email@acclaim.law), teal gradient header design, and Acclaim rose logo branding. **PER-CASE NOTIFICATION MUTING** - Users can mute individual cases to stop receiving notifications for that specific case while still receiving notifications for other cases. Mute/unmute button available in case detail header with Bell/BellOff icons. **ADMIN CASE ACCESS RESTRICTIONS** - Admins can restrict specific users from accessing specific cases within their organisation. Restricted users cannot see the case in lists, access case details, or receive any notifications (messages or documents) for that case until the restriction is removed.
- **Message Attachment Document Saving**: When messages are sent with attachments, the files are automatically saved to the Documents section. Case-specific message attachments are linked to that case; general message attachments are saved as organisation documents without case association. Admin panel shows notification preference icons (green bell = enabled, grey bell-off = disabled) next to each user's email.
- **Mobile Responsiveness**: Admin panel redesigned for full mobile responsiveness.
- **Multi-Organisation Support**: Users can be assigned to multiple organisations, accessing relevant data across all assigned entities.
- **Organisation Owner Role System**: Designated users can be assigned as "Owners" of their organisation by admins. Organisation owners can manage case access restrictions for non-admin members within their organisation without needing full admin privileges. Features include: Crown icon toggle in admin panel to assign/remove owner role, Owner badge (amber with Crown icon) displayed next to organisations, dedicated Organisation Settings page accessible from the sidebar for owners to view users/cases and toggle case access restrictions via a matrix interface.
- **Database Export**: Automated database export tool for Azure PostgreSQL migration. Run `bash export-to-azure.sh` to generate timestamped SQL export files compatible with Azure PostgreSQL. Exports include all schema, data, indexes, and constraints with Azure-compatible options (no ownership, no privileges). See `DATABASE_EXPORT_GUIDE.md` for detailed instructions.
- **Scheduled Reports**: Users can configure automatic email reports in their Profile > Notifications tab. Features include: daily, weekly or monthly frequency selection, time of day selection (any hour from 12:00 AM to 11:00 PM), day of week (for weekly) or day of month (for monthly) scheduling, Case Summary tab (case name, account number, debtor, status, amounts - excludes date submitted/last activity), Activity Report tab (messages received, documents uploaded - excludes status changes), case status filter (active only, all cases, or closed only). Reports are sent as Excel attachments via email. The scheduler runs hourly to process due reports.

## External Dependencies

### Core
- **@neondatabase/serverless**: PostgreSQL database connection.
- **drizzle-orm**: Type-safe database operations.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/*** Accessible UI primitives.
- **multer**: File upload handling.
- **connect-pg-simple**: PostgreSQL session store.
- **nodemailer**: Email notifications.

### Development
- **Vite**: Build tool.
- **TypeScript**: Type safety.
- **Tailwind CSS**: Utility-first styling.
- **@replit/vite-plugin-***: Replit-specific development tools.
```