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
- **Provider**: Replit Auth using OpenID Connect
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
- **Case Management Integration**: Implemented HTTP API endpoint `/api/external/case/update` that matches existing SOS workflow patterns for seamless integration with current case management systems, including balance updates, status synchronisation, and comprehensive integration documentation
- **Case Activities Management**: Modified system to exclusively manage case activities through external API endpoints. Removed all automatic activity generation from internal operations. Added dedicated endpoints `/api/external/cases/:externalRef/activities` and `/api/external/activities/bulk` for pushing activities from external systems
- **Case Messages Integration**: Implemented `/api/external/cases/:externalRef/messages` endpoint to allow external systems to send messages linked to specific cases. Messages appear in the portal's Messages section and case-specific message tabs with proper user attribution. Added support for custom subject lines - when sent from case management system, custom subjects can be provided; when sent from the portal, automatic subject generation is used
- **Document Upload Integration**: Implemented `/api/external/cases/:externalRef/documents` endpoint to allow external systems to upload documents to specific cases. Supports multipart/form-data for SOS compatibility, with configurable file names, document types, and descriptions. Documents are automatically linked to cases and appear in the portal's document management system with proper organisation access control
- **SOS Case Creation Integration**: Successfully implemented form-encoded case creation using native SOS HTTPPost functionality. API endpoint `/api/external/cases` confirmed working with `application/x-www-form-urlencoded` content type, using organisation external reference `CLS00003` for Chadwick Lawrence LLP. Resolved SOS formula parsing issues through strategic character replacement and step-by-step form data construction

### Scaling Considerations
- Database uses connection pooling for efficiency
- File storage is currently local (should migrate to cloud storage)
- Session store is PostgreSQL-backed for horizontal scaling
- Frontend is static and can be CDN-distributed