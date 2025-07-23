# Azure Migration Guide for Acclaim Credit Management System

## Overview

Your application is well-architected for cloud deployment and will work excellently on Azure. The system is already production-ready with proper database connectivity, session management, and static file serving.

## ✅ What Works Out of the Box

- **Modern Node.js Architecture**: Uses Express with TypeScript - fully compatible with Azure App Service
- **PostgreSQL Database**: Works perfectly with Azure Database for PostgreSQL
- **Static File Serving**: Built-in production static file serving for React frontend
- **Environment Variable Configuration**: Already uses environment variables for all configuration
- **Session Management**: PostgreSQL-backed sessions will work seamlessly
- **File Uploads**: Local file storage works on Azure App Service (with considerations below)

## Azure Services Required

### 1. Azure App Service (Web App)
- **Service**: App Service with Node.js runtime
- **SKU**: B1 Basic or higher (supports custom domains, SSL)
- **Configuration**: 
  - Runtime: Node.js 20 LTS
  - Startup Command: `npm start`

### 2. Azure Database for PostgreSQL
- **Service**: Azure Database for PostgreSQL - Flexible Server
- **SKU**: B1ms (1 vCore, 2GB RAM) minimum for production
- **Configuration**: 
  - PostgreSQL version 14 or higher
  - SSL enforcement enabled

### 3. Azure Storage Account (Optional but Recommended)
- **Service**: Azure Blob Storage
- **Purpose**: Store uploaded documents instead of local filesystem
- **Benefits**: Better scalability, backup, and CDN integration

## Migration Steps

### Phase 1: Database Migration

1. **Export Current Database**
   ```bash
   # Export from current Neon database
   pg_dump $DATABASE_URL > acclaim_backup.sql
   ```

2. **Create Azure PostgreSQL Database**
   - Create Azure Database for PostgreSQL Flexible Server
   - Configure firewall rules to allow your IP
   - Create database: `acclaim_credit_management`

3. **Import Data**
   ```bash
   # Import to Azure PostgreSQL
   psql "host=your-server.postgres.database.azure.com port=5432 dbname=acclaim_credit_management user=your-admin@your-server password=your-password sslmode=require" < acclaim_backup.sql
   ```

### Phase 2: Application Deployment

1. **Prepare Application**
   - Your build process is already configured: `npm run build`
   - Production serving is handled by Express: `npm start`

2. **Deploy to Azure App Service**
   
   **Option A: GitHub Actions (Recommended)**
   ```yaml
   # .github/workflows/azure-deploy.yml
   name: Deploy to Azure
   on:
     push:
       branches: [main]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
         - run: npm ci
         - run: npm run build
         - uses: azure/webapps-deploy@v2
           with:
             app-name: 'acclaim-credit-management'
             publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
   ```

   **Option B: Azure CLI**
   ```bash
   # Build the application
   npm run build
   
   # Deploy to Azure
   az webapp deployment source config-zip \
     --resource-group acclaim-rg \
     --name acclaim-credit-management \
     --src acclaim-app.zip
   ```

3. **Configure Environment Variables in Azure**
   ```bash
   az webapp config appsettings set \
     --resource-group acclaim-rg \
     --name acclaim-credit-management \
     --settings \
     DATABASE_URL="postgresql://user:password@your-server.postgres.database.azure.com:5432/acclaim_credit_management?sslmode=require" \
     SESSION_SECRET="your-secure-session-secret" \
     NODE_ENV="production" \
     SMTP_HOST="smtp.sendgrid.net" \
     SMTP_PORT="587" \
     SMTP_USER="apikey" \
     SMTP_PASSWORD="your-sendgrid-api-key"
   ```

## Environment Variables for Azure

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Azure PostgreSQL connection string | `postgresql://user:pass@server.postgres.database.azure.com:5432/dbname?sslmode=require` |
| `SESSION_SECRET` | Session encryption key | `your-secure-random-string` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port (Azure sets automatically) | `8080` |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.xxxxx` |
| `SMTP_HOST` | SMTP server | `smtp.sendgrid.net` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `apikey` |
| `SMTP_PASSWORD` | SMTP password | Your SendGrid API key |

## File Storage Considerations

### Current Setup (Local Filesystem)
- Files stored in `/uploads` directory
- Works on Azure App Service but files are ephemeral
- Files lost during app restarts/deployments

### Recommended: Azure Blob Storage
```typescript
// Add to package.json dependencies
"@azure/storage-blob": "^12.17.0"

// Example blob storage integration
import { BlobServiceClient } from '@azure/storage-blob';

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!
);
```

## Database Schema Migration

Your current schema will work perfectly. Run the schema push after connecting to Azure PostgreSQL:

```bash
# Set the DATABASE_URL to your Azure PostgreSQL
export DATABASE_URL="postgresql://user:pass@server.postgres.database.azure.com:5432/dbname?sslmode=require"

# Push schema to Azure database
npm run db:push
```

## Production Optimisations

### 1. Enable Application Insights
```bash
az webapp config appsettings set \
  --resource-group acclaim-rg \
  --name acclaim-credit-management \
  --settings \
  APPINSIGHTS_INSTRUMENTATIONKEY="your-instrumentation-key"
```

### 2. Configure Custom Domain
```bash
# Add custom domain
az webapp config hostname add \
  --resource-group acclaim-rg \
  --webapp-name acclaim-credit-management \
  --hostname acclaim.yourdomain.com

# Enable SSL
az webapp config ssl bind \
  --resource-group acclaim-rg \
  --name acclaim-credit-management \
  --certificate-thumbprint your-cert-thumbprint \
  --ssl-type SNI
```

### 3. Scale Configuration
```bash
# Scale up to production tier
az appservice plan update \
  --resource-group acclaim-rg \
  --name acclaim-service-plan \
  --sku P1V2

# Enable auto-scaling
az monitor autoscale create \
  --resource-group acclaim-rg \
  --name acclaim-autoscale \
  --resource acclaim-credit-management \
  --resource-type Microsoft.Web/sites \
  --min-count 1 \
  --max-count 3 \
  --count 1
```

## Security Considerations

### 1. Network Security
- Enable Azure App Service virtual network integration
- Configure Azure Database for PostgreSQL to only allow connections from your App Service

### 2. Managed Identity
- Use Azure Managed Identity for database connections
- Eliminate password-based authentication

### 3. Key Vault Integration
- Store sensitive configuration in Azure Key Vault
- Reference secrets from App Service configuration

## Monitoring and Backup

### 1. Database Backup
- Azure Database for PostgreSQL provides automatic backups
- Configure point-in-time restore
- Set up cross-region backup for disaster recovery

### 2. Application Monitoring
- Enable Application Insights for performance monitoring
- Set up alerts for high error rates or slow response times
- Monitor database connection health

## Cost Estimation (Monthly)

| Service | SKU | Estimated Cost |
|---------|-----|----------------|
| App Service | B1 Basic | £40 |
| PostgreSQL | B1ms | £45 |
| Storage Account | Standard | £5 |
| Application Insights | Basic | £15 |
| **Total** | | **£105/month** |

## Migration Checklist

- [ ] Export current database
- [ ] Create Azure resource group
- [ ] Create Azure Database for PostgreSQL
- [ ] Import database to Azure
- [ ] Create Azure App Service
- [ ] Configure environment variables
- [ ] Deploy application code
- [ ] Test database connectivity
- [ ] Test file uploads
- [ ] Configure custom domain
- [ ] Enable SSL certificate
- [ ] Set up monitoring
- [ ] Configure backup strategy
- [ ] Update DNS records

## Support and Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure SSL mode is enabled in connection string
   - Check firewall rules in Azure PostgreSQL

2. **File Upload Issues**
   - Verify `/tmp` directory permissions
   - Consider migrating to Azure Blob Storage

3. **Session Issues**
   - Ensure SESSION_SECRET is consistent across deployments
   - Verify PostgreSQL session store connectivity

Your application is excellently structured for Azure deployment. The main considerations are configuring the Azure services and updating the database connection string. Everything else should work seamlessly!