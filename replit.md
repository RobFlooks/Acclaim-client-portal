# Acclaim Credit Management System

## Overview

This is a full-stack web application for debt recovery and credit management. It's built as a client portal where users can manage their debt recovery cases, track progress, and communicate with the recovery team. The system uses a modern tech stack with TypeScript, React, Express, and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.
Language preference: British English (organisation not organization, colour not color, etc.)

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Tailwind CSS with shadcn/ui components for consistent, accessible design
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Custom CSS variables with light/dark theme support

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: Express sessions with PostgreSQL storage
- **File Handling**: Multer for file uploads with 10MB limit
- **Password Security**: bcrypt for password hashing with salt rounds

### Authentication & Authorization
- **Provider**: Local username/password authentication with Passport.js
- **Session Storage**: PostgreSQL-backed sessions with 1-week TTL
- **Security**: HTTP-only cookies, secure flags, CSRF protection
- **Enhanced Security**: Password management with temporary passwords, force password change on first login
- **Admin Controls**: Email domain restrictions for admin privileges (@chadlaw.co.uk only)

## Key Components

### Database Schema
- **Users**: User profiles linked to organizations
- **Organizations**: Multi-tenant structure for different clients
- **Cases**: Debt recovery cases with status tracking and debtor type classification
- **Case Activities**: Timeline of actions taken on cases
- **Messages**: Communication system between users and recovery team
- **Documents**: File attachments related to cases
- **Sessions**: Authentication session storage

### API Structure
- **Authentication**: `/api/auth/*` - User authentication and profile management
- **Dashboard**: `/api/dashboard/*` - Statistics and overview data
- **Cases**: `/api/cases/*` - Case management CRUD operations
- **Messages**: `/api/messages/*` - Communication system
- **Documents**: `/api/documents/*` - File upload and download
- **Admin Management**: `/api/admin/*` - Enhanced admin user and organisation management
- **User Self-Service**: `/api/user/*` - User profile and password management

### Frontend Components
- **Dashboard**: Overview with statistics and recent activity
- **Cases**: List view with search, filtering, and detailed case management
- **Messages**: Communication interface with read/unread status
- **Documents**: File management with upload/download capabilities
- **Reports**: Analytics and reporting interface
- **Enhanced Admin Panel**: Comprehensive user and organisation management with:
  - User creation with temporary passwords
  - Email domain restrictions for admin privileges
  - Password reset functionality
  - Organisation assignment
  - Admin privilege management
- **User Profile Management**: Self-service account management with:
  - Profile information updates
  - Password change functionality
  - Account security settings

## Data Flow

1. **Authentication**: Users authenticate via Replit Auth, creating/updating user records
2. **Organization Context**: All operations are scoped to user's organization
3. **Case Management**: Cases flow through stages (new → in_progress → resolved)
4. **Activity Tracking**: All case changes are logged as activities
5. **Communication**: Messages can be case-specific or general
6. **File Management**: Documents are uploaded to local storage with metadata in database
7. **Case Submission**: Complete form with file upload support, organization name field isolation
8. **Debtor Classification**: Cases are automatically categorized by debtor type (individual, company, sole trader, company and individual) for internal tracking

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **multer**: File upload handling
- **connect-pg-simple**: PostgreSQL session store

### Development Dependencies
- **Vite**: Build tool with hot reload
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **@replit/vite-plugin-***: Replit-specific development tools

## Deployment Strategy

### Development
- **Hot Reload**: Vite development server with Express API
- **Database**: Neon serverless PostgreSQL
- **File Storage**: Local filesystem (`uploads/` directory)
- **Environment**: Development mode with debug logging

### Production
- **Build Process**: Vite builds frontend, esbuild bundles backend
- **Static Assets**: Served from `dist/public`
- **Database**: Same Neon PostgreSQL instance
- **Session Security**: Secure cookies with proper flags
- **File Storage**: Local filesystem (consider cloud storage for scaling)

### Configuration
- **Environment Variables**: 
  - `DATABASE_URL`: PostgreSQL connection string
  - `SESSION_SECRET`: Session encryption key
  - `REPL_ID`: Replit authentication
  - `ISSUER_URL`: OpenID Connect issuer

### Recent Changes (January 2025)
- **Advanced Admin Features**: Complete admin panel with user/organisation management
- **System Monitoring**: Comprehensive activity tracking and system health monitoring
- **Advanced Reporting**: Cross-organisation performance, user activity reports, system health dashboards, custom report builders
- **Enhanced Security**: Password management, admin domain restrictions, temporary passwords
- **Multi-Route Support**: Admin panel accessible at both `/admin` and `/admin-enhanced`
- **Report Focus Updates**: Case Summary Report now defaults to active cases only, Recovery Analysis Report includes comprehensive analysis of all active and closed cases
- **Payment Display Fix**: Resolved £NaN display issue in payment amounts across all components
- **Report Navigation Enhancement**: All report pages now have consistent "Back to Reports" navigation that properly returns to the Reports tab instead of Dashboard
- **Stage Badge Implementation**: Added color-coded stage badges across Case Summary and Recovery Analysis reports (Blue: Pre-Legal, Green: Payment Plan/Paid, Yellow: Claim, Orange: Judgment, Red: Enforcement)
- **Comprehensive User Guide System**: Created detailed user guide with placeholder screenshots and step-by-step instructions accessible from admin panel, available in both HTML and editable Word formats
- **Language Standardisation**: Updated all text to use British English spelling (organisation instead of organization, colour instead of color, etc.) across all components, documentation, and user interfaces
- **Case Management Integration**: Implemented HTTP API endpoint `/api/external/case/update` that matches existing SOS workflow patterns for seamless integration with current case management systems. Supports both `balance` and `original_amount` parameters for maximum compatibility, including balance updates, status synchronisation, and comprehensive integration documentation. Payment methods implemented as flexible free-text field allowing any custom payment method descriptions from case management systems
- **Case Activities Management**: Modified system to exclusively manage case activities through external API endpoints. Removed all automatic activity generation from internal operations including case update endpoint. Added dedicated endpoints `/api/external/cases/:externalRef/activities` and `/api/external/activities/bulk` for pushing activities from external systems. System no longer creates automatic 'SYSTEM' timeline entries - all activities managed manually via PAI push
- **Case Messages Integration**: Implemented `/api/external/cases/:externalRef/messages` endpoint to allow external systems to send messages linked to specific cases. Messages appear in the portal's Messages section and case-specific message tabs with proper user attribution. Added support for custom subject lines - when sent from case management system, custom subjects can be provided; when sent from the portal, automatic subject generation is used
- **Document Upload Integration**: Implemented `/api/external/cases/:externalRef/documents` endpoint to allow external systems to upload documents to specific cases. Supports multipart/form-data for SOS compatibility, with configurable file names, document types, and descriptions. Documents are automatically linked to cases and appear in the portal's document management system with proper organisation access control
- **SOS Case Creation Integration**: Successfully implemented form-encoded case creation using native SOS HTTPPost functionality. API endpoint `/api/external/cases` confirmed working with `application/x-www-form-urlencoded` content type, using organisation external reference `CLS00003` for Chadwick Lawrence LLP. Resolved SOS formula parsing issues through strategic character replacement and step-by-step form data construction
- **Admin Timeline Management**: Implemented admin-only deletion of case timeline entries via DELETE `/api/activities/:id` endpoint. Admin users can now delete timeline activities through the web interface with confirmation prompts and proper authentication controls. Regular users cannot access or see delete functionality
- **Documents Pagination Implementation**: Added comprehensive pagination to Documents page with 20 documents per page to handle thousands of documents efficiently. Features include page navigation controls, pagination info display, search-triggered pagination reset, and larger case detail dialogs (max-w-7xl) for better viewing experience
- **Enhanced User Guide with Visual References**: Completely updated USER_GUIDE.html with comprehensive screenshot placeholders, detailed FAQ section covering pagination and navigation features, enhanced troubleshooting with visual callouts, and step-by-step instructions with visual context. Added explanations for all recent system enhancements including pagination, filtering, and enhanced case detail dialogs
- **Complete Word Document User Guide**: Enhanced the Word document download with comprehensive content covering all 8 sections (Getting Started, Dashboard, Case Management, Messaging, Documents, Reports, User Profile, Troubleshooting) with detailed step-by-step instructions, FAQ section, browser compatibility guide, and professional Acclaim branding. Document includes screenshot placeholders for customisation and covers all recent system features including pagination, filtering, and enhanced navigation
- **Payment Update API Endpoint**: Implemented `/api/external/payments/update` endpoint for updating existing payment records from case management systems. Supports partial updates of amount, payment date, payment method, reference, and notes using payment external reference as identifier. Maintains compatibility with both JSON and form-encoded data formats, includes DD/MM/YYYY date parsing, and offers both JSON and plain text response options for SOS workflow integration. Successfully tested with comprehensive validation and error handling
- **Enhanced Access Control Security**: Strengthened security for messages and documents with proper admin privilege handling. Admin users now have unrestricted access to all cases, messages, and documents across all organisations, while regular users remain strictly filtered by their assigned organisation. Implemented new getCasesForUser, getMessagesForUser, and getDocumentsForUser functions that automatically apply admin bypass logic or organisation filtering based on user privileges
- **Local Authentication Migration**: Successfully migrated from Replit Auth to local username/password authentication system using Passport.js and bcrypt. Users no longer need Replit accounts. Registration is disabled for security - all user accounts must be created by administrators through the admin panel. System includes secure session management with PostgreSQL storage, password hashing, and a streamlined login form with proper validation and responsive design
- **Email Notification System**: Successfully implemented automatic email notifications using nodemailer to alert the main admin (admin_1753292574.014698) when non-admin users send messages through the portal. The system generates professional HTML email notifications with message details, user information, organisation context, and case references when applicable. In development mode, uses Ethereal email for testing with preview URLs logged to console. Email failures are gracefully handled without affecting message creation functionality. System confirmed working via API testing (July 23, 2025)
- **Message Creation Bug Fix**: Fixed critical issue where general messages (non-case-specific) weren't setting recipientId properly, causing message creation to fail. System now correctly routes non-admin user messages to admin users with proper recipient assignment
- **Frontend Session Authentication Issue**: Identified ongoing issue where frontend sessions aren't persisting properly, causing 401 Unauthorized errors despite backend authentication working correctly via API. Backend session management confirmed working with PostgreSQL session store
- **Server Stability Fix**: Fixed React navigation bug in ChangePasswordPage that was causing "setState during render" errors and server crashes. Navigation calls now use setTimeout to avoid render-time state updates, preventing system instability
- **Email System Validation**: Confirmed email notification system works perfectly - server crashes were preventing emails from being sent after message creation. Fixed crashes now allow emails to complete successfully (July 23, 2025)
- **Azure Migration Readiness**: Application is fully prepared for Azure cloud deployment with comprehensive migration guide created. System architecture is perfectly compatible with Azure App Service, Azure Database for PostgreSQL, and Azure Storage. No code modifications required for cloud migration (July 23, 2025)
- **Enhanced Email Notification System**: Implemented comprehensive bidirectional email notifications supporting both user-to-admin and admin-to-user messaging. System works without SMTP configuration using detailed console logging fallback for production monitoring. Supports organisation-wide notifications and case-specific messaging with professional HTML email templates (July 24, 2025)
- **Database Schema Cleanup**: Removed unused debtor contact fields (debtorEmail, debtorPhone, debtorAddress) from cases table as they're no longer needed. Database now focuses on essential case management data with cleaner schema structure (July 24, 2025)
- **Mobile Responsive Admin Panel**: Completely redesigned admin panel for mobile devices to eliminate horizontal scrolling. Implemented responsive navigation with abbreviated labels, mobile-friendly card layouts for tables, flexible header navigation, responsive forms with stacked layouts, and optimised button arrangements. Admin panel now provides excellent user experience on all device sizes (July 24, 2025)
- **Multi-Organisation User Support**: Implemented many-to-many relationship between users and organisations to support directors of multiple businesses. Users can now be assigned to multiple organisations and see cases from all their assigned organisations while maintaining security restrictions. Added user_organisations junction table, updated access control logic, and enhanced admin functionality for organisation assignment management. Successfully tested with Sean Thornhill-Adey accessing cases from both Chadwick Lawrence LLP and Acme Corporation (July 29, 2025)
- **Enhanced Multi-Organisation Admin Interface**: Completely redesigned admin user management to display all organisation assignments per user with badge indicators and removal controls. Added comprehensive multi-organisation management mutations for adding/removing assignments, updated assignment dialog to full management interface, enhanced both desktop and mobile views. Implemented security controls preventing users from removing themselves from their last organisation assignment. System now fully supports managing complex multi-organisation user relationships through intuitive admin interface (July 29, 2025)
- **Complete Multi-Organisation Access Control**: Implemented comprehensive real-time access control system where users can access cases, messages, and documents from all their assigned organisations. Fixed case detail route access (resolving Jordan's case 7 access), enhanced getMessagesForUser with proper JOIN logic for case messages across organisations, added comprehensive cache invalidation to all organisation assignment mutations ensuring immediate access updates across dashboard, messages, documents, and cases. System now provides seamless multi-organisation experience with dynamic access control that instantly reflects organisation assignment changes (July 29, 2025)

### Scaling Considerations
- Database uses connection pooling for efficiency
- File storage is currently local (should migrate to cloud storage)
- Session store is PostgreSQL-backed for horizontal scaling
- Frontend is static and can be CDN-distributed