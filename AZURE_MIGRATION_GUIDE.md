# Azure Migration Guide for Acclaim Credit Management System

## Overview
This guide will help you migrate your Acclaim Credit Management System from Replit to Microsoft Azure. The system consists of a React frontend, Express.js backend, PostgreSQL database, and file upload functionality.

## Prerequisites
- Azure subscription
- Azure CLI installed locally
- Node.js 18+ installed locally
- Git repository for your code

## Architecture on Azure
- **Frontend**: Azure Static Web Apps
- **Backend**: Azure App Service
- **Database**: Azure Database for PostgreSQL
- **File Storage**: Azure Blob Storage
- **Email**: SendGrid (already configured)

## Step 1: Prepare Your Code Repository

### 1.1 Create a Git Repository
```bash
# If not already done, initialize git in your project
git init
git add .
git commit -m "Initial commit"

# Push to GitHub, GitLab, or Azure DevOps
git remote add origin <your-repository-url>
git push -u origin main
```

### 1.2 Update Configuration Files

Create a production configuration file:

**azure-deploy.json**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/client/dist/$1"
    }
  ]
}
```

**package.json** (update scripts):
```json
{
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "cd client && npm run build",
    "build:server": "cd server && tsc",
    "start": "node server/dist/index.js",
    "start:dev": "npm run dev"
  }
}
```

## Step 2: Set Up Azure Database for PostgreSQL

### 2.1 Create PostgreSQL Server
```bash
# Login to Azure
az login

# Create resource group
az group create --name acclaim-rg --location "UK South"

# Create PostgreSQL server
az postgres server create \
  --resource-group acclaim-rg \
  --name acclaim-db-server \
  --location "UK South" \
  --admin-user acclaim_admin \
  --admin-password <secure-password> \
  --sku-name GP_Gen5_2 \
  --version 13
```

### 2.2 Configure Firewall Rules
```bash
# Allow Azure services
az postgres server firewall-rule create \
  --resource-group acclaim-rg \
  --server acclaim-db-server \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow your IP (for setup)
az postgres server firewall-rule create \
  --resource-group acclaim-rg \
  --server acclaim-db-server \
  --name AllowMyIP \
  --start-ip-address <your-ip> \
  --end-ip-address <your-ip>
```

### 2.3 Create Database
```bash
# Create the database
az postgres db create \
  --resource-group acclaim-rg \
  --server-name acclaim-db-server \
  --name acclaim_db
```

### 2.4 Migration Script
Create a migration script to transfer your data:

**migrate-to-azure.sql**
```sql
-- Export from your current database and import to Azure
-- Use pg_dump to export your current database
-- Then import using psql to Azure PostgreSQL
```

## Step 3: Set Up Azure App Service (Backend)

### 3.1 Create App Service Plan
```bash
az appservice plan create \
  --name acclaim-plan \
  --resource-group acclaim-rg \
  --location "UK South" \
  --sku B1 \
  --is-linux
```

### 3.2 Create Web App
```bash
az webapp create \
  --resource-group acclaim-rg \
  --plan acclaim-plan \
  --name acclaim-api \
  --runtime "NODE|18-lts" \
  --deployment-local-git
```

### 3.3 Configure Environment Variables
```bash
# Set environment variables
az webapp config appsettings set \
  --resource-group acclaim-rg \
  --name acclaim-api \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="postgresql://acclaim_admin:<password>@acclaim-db-server.postgres.database.azure.com:5432/acclaim_db?sslmode=require" \
    SESSION_SECRET="<generate-secure-secret>" \
    SENDGRID_API_KEY="<your-sendgrid-key>" \
    PORT=8000
```

## Step 4: Set Up Azure Static Web Apps (Frontend)

### 4.1 Create Static Web App
```bash
az staticwebapp create \
  --name acclaim-frontend \
  --resource-group acclaim-rg \
  --source <your-github-repo-url> \
  --location "West Europe" \
  --branch main \
  --app-location "client" \
  --api-location "server" \
  --output-location "dist"
```

### 4.2 Configure Build Settings
Create **.github/workflows/azure-static-web-apps.yml**:
```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "client"
          api_location: "server"
          output_location: "dist"
```

## Step 5: Set Up Azure Blob Storage (File Uploads)

### 5.1 Create Storage Account
```bash
az storage account create \
  --name acclaimstorage \
  --resource-group acclaim-rg \
  --location "UK South" \
  --sku Standard_LRS
```

### 5.2 Create Container
```bash
az storage container create \
  --name uploads \
  --account-name acclaimstorage \
  --public-access off
```

### 5.3 Update File Upload Code
You'll need to modify your file upload functionality to use Azure Blob Storage instead of local storage.

**server/azure-storage.ts**
```typescript
import { BlobServiceClient } from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

export async function uploadToBlob(fileName: string, fileBuffer: Buffer) {
  const containerClient = blobServiceClient.getContainerClient('uploads');
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  
  await blockBlobClient.upload(fileBuffer, fileBuffer.length);
  return blockBlobClient.url;
}
```

## Step 6: Configure Domain and SSL

### 6.1 Custom Domain (Optional)
```bash
# Add custom domain to Static Web App
az staticwebapp hostname set \
  --name acclaim-frontend \
  --resource-group acclaim-rg \
  --hostname yourdomain.co.uk
```

### 6.2 SSL Certificate
Azure automatically provides SSL certificates for custom domains.

## Step 7: Environment Variables Setup

### Frontend Environment Variables
Create **client/.env.production**:
```
VITE_API_URL=https://acclaim-api.azurewebsites.net
```

### Backend Environment Variables
Set in Azure App Service:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secure random string
- `SENDGRID_API_KEY`: Your SendGrid API key
- `AZURE_STORAGE_CONNECTION_STRING`: Blob storage connection string
- `NODE_ENV`: production

## Step 8: Database Migration

### 8.1 Export Current Database
```bash
# On your current system
pg_dump $DATABASE_URL > acclaim_backup.sql
```

### 8.2 Import to Azure PostgreSQL
```bash
# Connect to Azure PostgreSQL and import
psql "postgresql://acclaim_admin:<password>@acclaim-db-server.postgres.database.azure.com:5432/acclaim_db?sslmode=require" < acclaim_backup.sql
```

## Step 9: Deploy and Test

### 9.1 Deploy Backend
```bash
# Add Azure as remote
git remote add azure <deployment-url-from-app-service>

# Deploy
git push azure main
```

### 9.2 Deploy Frontend
The frontend will automatically deploy via GitHub Actions when you push to main.

### 9.3 Test Application
1. Visit your Static Web App URL
2. Test all functionality:
   - User authentication
   - Case management
   - File uploads
   - Email notifications
   - Admin panel

## Step 10: Monitoring and Maintenance

### 10.1 Set Up Application Insights
```bash
az monitor app-insights component create \
  --app acclaim-insights \
  --location "UK South" \
  --resource-group acclaim-rg
```

### 10.2 Configure Backup
```bash
# Enable automated backups for PostgreSQL
az postgres server configuration set \
  --name log_statement \
  --resource-group acclaim-rg \
  --server acclaim-db-server \
  --value all
```

## Cost Considerations

### Estimated Monthly Costs (UK South):
- **App Service B1**: ~£40/month
- **PostgreSQL GP_Gen5_2**: ~£120/month
- **Storage Account**: ~£5/month
- **Static Web Apps**: Free tier available
- **Application Insights**: ~£10/month

**Total**: ~£175/month

### Cost Optimization:
- Use Azure Reserved Instances for 1-3 year commitments (30-60% savings)
- Consider Azure SQL Database instead of PostgreSQL for better integration
- Use Azure DevTest pricing if applicable

## Security Checklist

- [ ] Enable Azure AD authentication
- [ ] Configure network security groups
- [ ] Enable Azure Security Center
- [ ] Set up Azure Key Vault for secrets
- [ ] Configure backup and disaster recovery
- [ ] Enable monitoring and alerting
- [ ] Review and configure CORS settings
- [ ] Enable Azure DDoS protection

## Troubleshooting

### Common Issues:
1. **Database Connection**: Check firewall rules and connection string
2. **File Uploads**: Verify Azure Storage configuration
3. **Environment Variables**: Ensure all required variables are set
4. **CORS Issues**: Configure CORS in App Service
5. **Build Failures**: Check Node.js version compatibility

### Support Resources:
- Azure Documentation: https://docs.microsoft.com/azure
- Azure Support: Create support ticket in Azure Portal
- Community Forums: Microsoft Q&A

This migration will provide you with a production-ready, scalable infrastructure on Microsoft Azure with proper monitoring, security, and backup capabilities.