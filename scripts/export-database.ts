#!/usr/bin/env tsx
/**
 * Database Export Script for Azure PostgreSQL Import
 * 
 * This script exports the current database to a SQL file that can be imported into Azure PostgreSQL.
 * 
 * Usage:
 *   npm run db:export
 *   
 * Output:
 *   Creates a file: database-export-YYYY-MM-DD-HH-mm-ss.sql
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function exportDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('-').slice(0, -5);
  const exportDir = path.join(process.cwd(), 'exports');
  const exportFile = path.join(exportDir, `database-export-${timestamp}.sql`);

  // Create exports directory if it doesn't exist
  if (!existsSync(exportDir)) {
    mkdirSync(exportDir, { recursive: true });
  }

  console.log('🔄 Starting database export...');
  console.log(`📁 Export file: ${exportFile}`);

  try {
    // Get database connection details from DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable not found');
    }

    // Parse DATABASE_URL
    const url = new URL(databaseUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;

    console.log(`📊 Database: ${database}`);
    console.log(`🖥️  Host: ${host}`);
    console.log(`🔌 Port: ${port}`);

    // Build pg_dump command
    // Using --clean to drop objects before recreating (for clean import)
    // Using --if-exists to prevent errors if objects don't exist
    // Using --no-owner to not set ownership (Azure will use its own)
    // Using --no-privileges to not dump privileges (Azure manages these)
    const pgDumpCommand = `PGPASSWORD="${password}" pg_dump \
      --host="${host}" \
      --port="${port}" \
      --username="${username}" \
      --dbname="${database}" \
      --clean \
      --if-exists \
      --no-owner \
      --no-privileges \
      --format=plain \
      --file="${exportFile}"`;

    console.log('⏳ Exporting database (this may take a moment)...');
    
    const { stdout, stderr } = await execAsync(pgDumpCommand);
    
    if (stderr && !stderr.includes('WARNING')) {
      console.error('⚠️  Warnings during export:', stderr);
    }

    console.log('✅ Database export completed successfully!');
    console.log(`\n📄 Export file location:`);
    console.log(`   ${exportFile}`);
    console.log(`\n🚀 To import into Azure PostgreSQL:`);
    console.log(`   1. Download the export file from the Replit workspace`);
    console.log(`   2. Use Azure's psql client or Azure Data Studio`);
    console.log(`   3. Run: psql -h <azure-server>.postgres.database.azure.com -U <username> -d <database> -f ${path.basename(exportFile)}`);
    console.log(`\n💡 Note: Make sure your Azure PostgreSQL database is empty or use --clean to replace existing data`);

  } catch (error: any) {
    console.error('❌ Error exporting database:', error.message);
    
    if (error.message.includes('pg_dump: command not found')) {
      console.error('\n💡 pg_dump is not installed. Installing PostgreSQL client tools...');
      console.error('   Run: nix-env -iA nixpkgs.postgresql');
    }
    
    throw error;
  }
}

// Run the export
exportDatabase()
  .then(() => {
    console.log('\n✨ Export process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Export process failed:', error);
    process.exit(1);
  });
