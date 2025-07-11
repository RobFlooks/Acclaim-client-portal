# Acclaim Credit Management System - Deployment Guide

## Overview
This is a complete full-stack web application for debt recovery and credit management built with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)

## Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Domain name for production deployment

## Environment Variables Required
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# PostgreSQL Connection (usually provided by DATABASE_URL)
PGHOST=your-pg-host
PGPORT=5432
PGDATABASE=your-database
PGUSER=your-username
PGPASSWORD=your-password

# Session Security
SESSION_SECRET=your-very-long-random-secret-key

# Replit Auth (you'll need to set up your own OAuth app)
REPL_ID=your-oauth-client-id
ISSUER_URL=https://replit.com/oidc
REPLIT_DOMAINS=your-domain.com,www.your-domain.com

# Node Environment
NODE_ENV=production
```

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
```bash
# Push database schema
npm run db:push
```

### 3. Build Application
```bash
npm run build
```

### 4. Start Production Server
```bash
npm start
```

## File Structure
```
/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities
│   └── index.html
├── server/                 # Express backend
│   ├── db.ts              # Database connection
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   ├── replitAuth.ts      # Authentication
│   └── index.ts           # Server entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema
├── uploads/               # File uploads directory
└── package.json
```

## Authentication Setup
You'll need to set up your own OAuth application since this uses Replit Auth. Alternative authentication methods you could implement:
- Auth0
- Firebase Auth
- Custom JWT authentication
- OAuth with Google/Microsoft

## Database Schema
The application uses these main tables:
- `users` - User accounts
- `organisations` - Multi-tenant structure
- `cases` - Debt recovery cases
- `case_activities` - Case timeline
- `messages` - Communication system
- `documents` - File attachments
- `payments` - Payment tracking
- `sessions` - Session storage

## Key Features Implemented
- Multi-tenant organisation system
- Case management with status tracking
- File upload and document management
- Secure messaging system
- Payment tracking
- Admin user management
- Excel export functionality
- Responsive design with dark/light themes
- Comprehensive reporting

## Security Considerations
- All routes are protected with authentication
- Session-based authentication with PostgreSQL storage
- File upload validation and security
- SQL injection protection via Drizzle ORM
- XSS protection via React
- CSRF protection via secure sessions

## Performance Optimizations
- Database connection pooling
- React Query for efficient data fetching
- Optimized bundle sizes with Vite
- Lazy loading for components
- Efficient SQL queries with proper indexing

## Scaling Considerations
- Use a CDN for static assets
- Implement Redis for session storage in high-traffic scenarios
- Use cloud storage (AWS S3, Google Cloud Storage) for file uploads
- Consider read replicas for database scaling
- Implement proper logging and monitoring

## Support
The application is fully functional and production-ready. All core features are implemented and tested.