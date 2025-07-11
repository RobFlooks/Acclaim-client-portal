# Acclaim Credit Management System

## Overview

This is a full-stack web application for debt recovery and credit management. It's built as a client portal where users can manage their debt recovery cases, track progress, and communicate with the recovery team. The system uses a modern tech stack with TypeScript, React, Express, and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

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

### Authentication & Authorization
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with 1-week TTL
- **Security**: HTTP-only cookies, secure flags, CSRF protection

## Key Components

### Database Schema
- **Users**: User profiles linked to organizations
- **Organizations**: Multi-tenant structure for different clients
- **Cases**: Debt recovery cases with status tracking
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

### Frontend Components
- **Dashboard**: Overview with statistics and recent activity
- **Cases**: List view with search, filtering, and detailed case management
- **Messages**: Communication interface with read/unread status
- **Documents**: File management with upload/download capabilities
- **Reports**: Analytics and reporting interface

## Data Flow

1. **Authentication**: Users authenticate via Replit Auth, creating/updating user records
2. **Organization Context**: All operations are scoped to user's organization
3. **Case Management**: Cases flow through stages (new → in_progress → resolved)
4. **Activity Tracking**: All case changes are logged as activities
5. **Communication**: Messages can be case-specific or general
6. **File Management**: Documents are uploaded to local storage with metadata in database
7. **Case Submission**: Complete form with file upload support, organization name field isolation

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

### Scaling Considerations
- Database uses connection pooling for efficiency
- File storage is currently local (should migrate to cloud storage)
- Session store is PostgreSQL-backed for horizontal scaling
- Frontend is static and can be CDN-distributed