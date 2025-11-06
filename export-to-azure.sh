#!/bin/bash

# Database Export Script for Azure PostgreSQL Import
# This script exports the current Neon database to a SQL file compatible with Azure PostgreSQL

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Starting database export for Azure PostgreSQL...${NC}"

# Create exports directory
mkdir -p exports

# Generate timestamp for filename
TIMESTAMP=$(date +%Y-%m-%d-%H-%M-%S)
EXPORT_FILE="exports/acclaim-database-${TIMESTAMP}.sql"

echo -e "${BLUE}📁 Export file: ${EXPORT_FILE}${NC}"

# Check if DATABASE_URL exists
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL environment variable not found${NC}"
    exit 1
fi

# Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
DB_URL=$DATABASE_URL

echo -e "${BLUE}📊 Exporting database...${NC}"
echo -e "${YELLOW}   This may take a few moments depending on database size${NC}"

# Run pg_dump with Azure-compatible options
# --clean: Add DROP commands before CREATE
# --if-exists: Use IF EXISTS with DROP commands
# --no-owner: Skip setting object ownership
# --no-privileges: Skip dumping access privileges
# --no-comments: Skip comments
pg_dump "$DB_URL" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --format=plain \
    --file="$EXPORT_FILE" 2>&1

# Check if export was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database export completed successfully!${NC}"
    echo ""
    echo -e "${GREEN}📄 Export file location:${NC}"
    echo -e "   ${EXPORT_FILE}"
    echo ""
    echo -e "${BLUE}🚀 To import into Azure PostgreSQL:${NC}"
    echo ""
    echo -e "${YELLOW}1. Download the export file from Replit:${NC}"
    echo -e "   - Click on the 'exports' folder in the file tree"
    echo -e "   - Right-click the SQL file and select 'Download'"
    echo ""
    echo -e "${YELLOW}2. Import into Azure PostgreSQL:${NC}"
    echo -e "   ${GREEN}psql -h <your-server>.postgres.database.azure.com \\"
    echo -e "        -U <admin-username> \\"
    echo -e "        -d <database-name> \\"
    echo -e "        -f acclaim-database-${TIMESTAMP}.sql${NC}"
    echo ""
    echo -e "${YELLOW}3. Or use Azure Data Studio:${NC}"
    echo -e "   - Connect to your Azure PostgreSQL database"
    echo -e "   - Open the SQL file and execute it"
    echo ""
    echo -e "${BLUE}💡 Important Notes:${NC}"
    echo -e "   • Make sure your Azure database is empty for a clean import"
    echo -e "   • The export includes schema and all data"
    echo -e "   • Sessions table may not import if structure differs"
    echo -e "   • You may need to recreate database users in Azure"
    echo ""
    
    # Show file size
    FILE_SIZE=$(du -h "$EXPORT_FILE" | cut -f1)
    echo -e "${GREEN}📦 Export file size: ${FILE_SIZE}${NC}"
else
    echo -e "${RED}❌ Error: Database export failed${NC}"
    echo -e "${YELLOW}💡 Check that PostgreSQL client tools are installed${NC}"
    exit 1
fi
