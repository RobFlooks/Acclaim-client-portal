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
- **Provider**: Local username/password authentication via Passport.js. Registration is disabled; user accounts are created by administrators.
- **Session Storage**: PostgreSQL-backed sessions with 1-week TTL, secured with HTTP-only cookies and CSRF protection.
- **Security Features**: Temporary passwords with forced change on first login.
- **Admin Controls**: Email domain restrictions for admin privileges.
- **Access Control**: Comprehensive real-time access control for multi-organisation users, ensuring users can access cases, messages, and documents from all assigned organisations while maintaining security restrictions.

### Key Features
- **Database Schema**: Includes Users, Organizations (multi-tenant), Cases (with status and debtor type), Case Activities, Messages, Documents, and Sessions.
- **API Structure**: Organized by domain (e.g., `/api/auth`, `/api/cases`, `/api/admin`, `/api/external/*` for integrations).
- **Frontend Components**: Dashboard, Case management (list, search, filter, details), Messaging, Document management, Reporting, Enhanced Admin Panel (user/organisation management, password reset, admin privilege management), and User Profile Management.
- **Data Flow**: Authentication scopes operations to the user's organization(s). Cases progress through stages, all changes are logged as activities, and communication is integrated.
- **Integration Capabilities**: HTTP API endpoints for external case creation, updates, activity management, message sending, document uploads, and payment updates, designed for compatibility with existing case management systems like SOS. Includes complete email notification system for external API messages.
- **Email Notifications**: Complete bidirectional email notification system using SendGrid for production with user-to-admin messaging (to email@acclaim.law only), admin-to-user messaging, and external case management API notifications with user-controlled preferences. **PRODUCTION READY** - Real email delivery confirmed with verified sender (email@acclaim.law), teal gradient header design, Acclaim rose logo branding, and case names displayed in Case Details section without prefixes.
- **Mobile Responsiveness**: Admin panel redesigned for full mobile responsiveness.
- **Multi-Organisation Support**: Users can be assigned to multiple organisations, accessing relevant data across all assigned entities.

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