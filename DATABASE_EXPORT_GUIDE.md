# Database Export Guide for Azure PostgreSQL

This guide explains how to export your Acclaim database and import it into Azure PostgreSQL.

## Quick Export (Recommended)

### Step 1: Run the Export Script

In the Replit Shell, run:

```bash
bash export-to-azure.sh
```

This will:
- Create an `exports` folder
- Generate a timestamped SQL file (e.g., `acclaim-database-2025-11-06-10-30-45.sql`)
- Display the file location and import instructions

### Step 2: Download the Export File

1. Look for the `exports` folder in your Replit file tree
2. Find the SQL file with the timestamp
3. Right-click on it and select "Download"

### Step 3: Import into Azure PostgreSQL

Choose one of these methods:

#### Method A: Command Line (psql)

```bash
psql -h your-server.postgres.database.azure.com \
     -U your-admin-username \
     -d your-database-name \
     -f acclaim-database-2025-11-06-10-30-45.sql
```

You'll be prompted for the password. Azure PostgreSQL requires SSL by default, which psql handles automatically.

#### Method B: Azure Data Studio (GUI)

1. Open Azure Data Studio
2. Connect to your Azure PostgreSQL server
3. Create a database if needed:
   ```sql
   CREATE DATABASE acclaim_db;
   ```
4. Open the downloaded SQL file
5. Execute the script (F5)

#### Method C: pgAdmin (GUI)

1. Add your Azure PostgreSQL server
2. Right-click on the database → Query Tool
3. Open the SQL file (File → Open)
4. Execute the script

## Manual Export (Advanced)

If you prefer to export manually:

```bash
pg_dump $DATABASE_URL \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --format=plain \
  --file=my-export.sql
```

## What's Included in the Export?

The export includes:
- ✅ All database tables and schemas
- ✅ All data (users, cases, messages, documents, etc.)
- ✅ Indexes and constraints
- ✅ Sequences (for auto-incrementing IDs)
- ❌ User roles (Azure manages these)
- ❌ Permissions (Azure manages these)
- ❌ Tablespace assignments

## Azure PostgreSQL Connection String

After successful import, update your application's `DATABASE_URL`:

```
postgresql://username:password@server-name.postgres.database.azure.com:5432/database-name?sslmode=require
```

**Important**: Include `?sslmode=require` - Azure requires SSL connections.

## Post-Import Optimization

After importing, run these commands in Azure PostgreSQL:

```sql
-- Update table statistics
ANALYZE;

-- Rebuild indexes
REINDEX DATABASE acclaim_db;

-- Vacuum for cleanup
VACUUM FULL;
```

## Troubleshooting

### "role does not exist" Error

The export doesn't include role ownership. This is normal. Either:
- Create the role first: `CREATE ROLE rolename;`
- Ignore the warnings (Azure will use the importing user)

### "SSL connection required" Error

Add `?sslmode=require` to your connection string:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

### Import Takes Too Long

For large databases:
1. Import schema first (schema-only dump)
2. Then import data (data-only dump)
3. Or use Azure's import tools

### Permission Denied Errors

Ensure your Azure user has proper permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE acclaim_db TO your_username;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_username;
```

## Verification Checklist

After import, verify:
- [ ] All tables exist: `\dt` in psql
- [ ] Row counts match source database
- [ ] Application connects successfully
- [ ] Users can log in
- [ ] Cases display correctly
- [ ] File uploads work
- [ ] Emails send properly

## Database Size Information

Before exporting, check your database size:

```sql
SELECT pg_size_pretty(pg_database_size('your_database_name'));
```

This helps you estimate:
- Export file size (roughly 50% of database size)
- Import time (roughly 1 minute per 100MB)
- Required Azure storage

## Automated Backups

To set up regular automated exports:

1. Create a cron job or scheduled task
2. Run the export script daily/weekly
3. Upload to cloud storage (Azure Blob, S3, etc.)
4. Set retention policies (keep last 7 days, etc.)

Example daily backup at 2 AM:
```bash
0 2 * * * cd /path/to/acclaim && bash export-to-azure.sh && mv exports/*.sql /backup/location/
```

## Support

If you need help:
1. Check Azure PostgreSQL documentation
2. Verify firewall rules in Azure Portal
3. Test connection with simple SELECT query
4. Check Azure PostgreSQL logs for errors

## Security Notes

- Never commit SQL exports to version control
- Store exports securely with encryption
- Use strong passwords for Azure PostgreSQL
- Enable Azure firewall rules (whitelist IPs only)
- Regularly rotate database credentials
- Monitor access logs in Azure Portal
