# Database Export for Azure PostgreSQL

## Export Details

- **Export Date**: November 6, 2025 at 15:05:32
- **Export File**: `acclaim-database-2025-11-06-15-05-32.sql`
- **File Size**: 104 KB
- **Source Database**: Neon PostgreSQL 16.9
- **Compatible With**: Azure PostgreSQL 14+, PostgreSQL 15+, PostgreSQL 16+

## What's Included

This export contains the complete Acclaim Credit Management System database:

### Tables (16 total)
1. **audit_log** - System audit trail
2. **case_activities** - Case activity history
3. **case_submission_documents** - Documents attached to case submissions
4. **case_submissions** - New case submission forms
5. **cases** - Main cases table
6. **documents** - Document storage metadata
7. **external_api_credentials** - API credentials for integrations
8. **login_attempts** - Login attempt tracking
9. **messages** - User-admin messaging
10. **organisations** - Multi-tenant organisations
11. **payments** - Payment tracking
12. **system_metrics** - System performance metrics
13. **user_activity_logs** - User activity tracking
14. **user_organisations** - User-organisation relationships
15. **user_sessions** - Session management
16. **users** - User accounts

### What's Also Included
- ✅ All table data (rows)
- ✅ Indexes and constraints
- ✅ Foreign key relationships
- ✅ Sequences (auto-increment IDs)
- ✅ DROP IF EXISTS commands (safe re-import)

### What's NOT Included (Azure Managed)
- ❌ User roles and permissions
- ❌ Tablespace assignments
- ❌ Database ownership

## How to Import into Azure PostgreSQL

### Step 1: Download this file
1. Right-click on `acclaim-database-2025-11-06-15-05-32.sql`
2. Select "Download"

### Step 2: Import using one of these methods

#### Method A: Command Line (psql)
```bash
psql -h your-server.postgres.database.azure.com \
     -U your-admin-username \
     -d your-database-name \
     -f acclaim-database-2025-11-06-15-05-32.sql
```

#### Method B: Azure Data Studio
1. Connect to Azure PostgreSQL
2. Open Query (Ctrl+N)
3. File → Open → Select the SQL file
4. Execute (F5)

#### Method C: pgAdmin
1. Connect to Azure PostgreSQL server
2. Right-click database → Query Tool
3. File → Open → Select the SQL file
4. Execute/Run

### Step 3: Verify Import
```sql
-- Count tables (should be 16)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check a sample table
SELECT COUNT(*) FROM users;
```

## Connection String for Azure

After import, update your application's `DATABASE_URL`:

```
postgresql://username:password@server-name.postgres.database.azure.com:5432/database-name?sslmode=require
```

**Important**: Azure requires `?sslmode=require` in the connection string.

## Post-Import Optimization

Run these commands after import for best performance:

```sql
-- Update table statistics
ANALYZE;

-- Rebuild indexes
REINDEX DATABASE your_database_name;

-- Clean up
VACUUM FULL;
```

## Troubleshooting

### "role does not exist"
This is normal. The export doesn't include role ownership (Azure manages this).
Just ignore these warnings or create the role first.

### "SSL connection required"
Add `?sslmode=require` to your connection string.

### Permission errors
Grant permissions to your Azure user:
```sql
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_username;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_username;
```

## Need Help?

See the full guides:
- `DATABASE_EXPORT_GUIDE.md` - Detailed export/import instructions
- `AZURE_MIGRATION_GUIDE.md` - Complete Azure migration guide

## Re-export Database

To create a new export (e.g., after data changes):

```bash
bash export-to-azure.sh
```

This will create a new timestamped SQL file.
