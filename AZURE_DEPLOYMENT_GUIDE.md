# How to Deploy Acclaim Portal to Azure

A simple, step-by-step guide to get your Acclaim Credit Management Portal running on Microsoft Azure.

---

## What You'll Need

Before you start, make sure you have:

- ✅ A Microsoft Azure account ([Sign up free](https://azure.microsoft.com/free/))
- ✅ A credit/debit card (Azure needs this, but you get free credits to start)
- ✅ Your SendGrid API key (for emails)
- ✅ About 30-60 minutes of time

---

## Overview: What We're Setting Up

```
┌─────────────────────────────────────────────────────────┐
│                    AZURE CLOUD                          │
│                                                         │
│   ┌──────────────────┐      ┌──────────────────┐       │
│   │   Azure App      │      │ Azure PostgreSQL │       │
│   │   Service        │ ───► │   Database       │       │
│   │   (Your Website) │      │   (Your Data)    │       │
│   └──────────────────┘      └──────────────────┘       │
│            │                                            │
│            ▼                                            │
│   ┌──────────────────┐                                 │
│   │    SendGrid      │                                 │
│   │   (Emails)       │                                 │
│   └──────────────────┘                                 │
└─────────────────────────────────────────────────────────┘
```

We need to set up:
1. **A database** (to store your cases, users, messages)
2. **A web app** (to run your portal)
3. **Settings** (passwords, API keys)

---

## Step 1: Create the Database

### 1.1 Go to Azure Portal

1. Open [portal.azure.com](https://portal.azure.com)
2. Sign in with your Microsoft account

### 1.2 Create a PostgreSQL Database

1. Click **"Create a resource"** (the + button)
2. Search for **"Azure Database for PostgreSQL"**
3. Click **"Create"**
4. Choose **"Flexible server"** (recommended)
5. Click **"Create"**

### 1.3 Fill in the Details

**Basics Tab:**

| Setting | What to Enter |
|---------|---------------|
| Subscription | Your Azure subscription |
| Resource group | Click "Create new" → Name it `acclaim-resources` |
| Server name | `acclaim-database` (must be unique) |
| Region | Choose one close to you (e.g., UK South) |
| PostgreSQL version | 15 (or latest) |
| Workload type | Development (cheaper for testing) |
| Compute + storage | Click "Configure server" → Choose Basic tier |
| Admin username | `acclaimadmin` (write this down!) |
| Password | Create a strong password (write this down!) |

**Networking Tab:**
- Select **"Allow public access"**
- Tick **"Allow access from any Azure service"**
- Add your current IP address (click "Add current client IP")

6. Click **"Review + create"**
7. Click **"Create"**
8. Wait 5-10 minutes for it to deploy

### 1.4 Create the Database

Once deployed:

1. Go to your new PostgreSQL server
2. Click **"Databases"** in the left menu
3. Click **"+ Add"**
4. Name it `acclaim_portal`
5. Click **"Save"**

### 1.5 Get Your Connection String

1. Click **"Connection strings"** in the left menu
2. Copy the **ADO.NET** connection string
3. It looks like this:
   ```
   Server=acclaim-database.postgres.database.azure.com;Database=acclaim_portal;Port=5432;User Id=acclaimadmin;Password={your_password};Ssl Mode=Require;
   ```
4. Convert it to this format (for your app):
   ```
   postgresql://acclaimadmin:YOUR_PASSWORD@acclaim-database.postgres.database.azure.com:5432/acclaim_portal?sslmode=require
   ```

**Write this down - you'll need it later!**

---

## Step 2: Export Your Current Database

We need to copy your data from Replit to Azure.

### 2.1 Export from Replit

1. In Replit, open the **Shell** (bottom of screen)
2. Type this command and press Enter:
   ```bash
   bash export-to-azure.sh
   ```
3. Wait for it to finish
4. Look for a file in the `exports` folder (e.g., `acclaim-database-2025-11-19.sql`)
5. **Right-click** on this file → **Download** to your computer

### 2.2 Import to Azure

**Option A: Using Azure Cloud Shell (Easiest)**

1. In Azure Portal, click the **Cloud Shell** icon (top right, looks like `>_`)
2. Choose **Bash**
3. Upload your SQL file (click the upload icon)
4. Run this command:
   ```bash
   psql "host=acclaim-database.postgres.database.azure.com port=5432 dbname=acclaim_portal user=acclaimadmin password=YOUR_PASSWORD sslmode=require" -f acclaim-database-2025-11-19.sql
   ```

**Option B: Using pgAdmin (Visual Tool)**

1. Download [pgAdmin](https://www.pgadmin.org/download/) on your computer
2. Add a new server connection:
   - Host: `acclaim-database.postgres.database.azure.com`
   - Port: `5432`
   - Database: `acclaim_portal`
   - Username: `acclaimadmin`
   - Password: Your password
   - SSL Mode: Require
3. Connect to the database
4. Right-click database → **Query Tool**
5. Open your downloaded SQL file
6. Click **Execute** (play button)

---

## Step 3: Create the Web App

### 3.1 Create App Service

1. In Azure Portal, click **"Create a resource"**
2. Search for **"Web App"**
3. Click **"Create"**

### 3.2 Fill in the Details

**Basics Tab:**

| Setting | What to Enter |
|---------|---------------|
| Subscription | Your Azure subscription |
| Resource group | Select `acclaim-resources` (same as database) |
| Name | `acclaim-portal` (this becomes your URL) |
| Publish | Code |
| Runtime stack | Node 20 LTS |
| Operating System | Linux |
| Region | Same as your database |
| Pricing plan | Choose "Basic B1" to start |

4. Click **"Review + create"**
5. Click **"Create"**
6. Wait 2-3 minutes for it to deploy

---

## Step 4: Configure Your App Settings

### 4.1 Add Environment Variables

1. Go to your new Web App in Azure Portal
2. Click **"Configuration"** in the left menu
3. Click **"+ New application setting"** for each of these:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Your PostgreSQL connection string (from Step 1.5) |
| `SENDGRID_API_KEY` | Your SendGrid API key |
| `SESSION_SECRET` | Create a random string (e.g., `acclaim-session-2024-secure-key-xyz`) |
| `NODE_ENV` | `production` |

4. Click **"Save"** at the top
5. Click **"Continue"** to confirm

### 4.2 Configure Startup Command

1. Still in Configuration, click **"General settings"** tab
2. Find **"Startup Command"**
3. Enter: `npm run start`
4. Click **"Save"**

---

## Step 5: Deploy Your Code

### Option A: Deploy from GitHub (Recommended)

If you pushed your code to GitHub:

1. In your Web App, click **"Deployment Center"** in the left menu
2. Choose **"GitHub"** as the source
3. Click **"Authorize"** and sign in to GitHub
4. Select:
   - Organization: `RobFlooks`
   - Repository: `Acclaim-portal`
   - Branch: `main`
5. Click **"Save"**

Azure will now automatically deploy your code! This takes about 5-10 minutes.

### Option B: Deploy from Replit using ZIP

1. In Replit, download your project as a ZIP file
2. In Azure Portal, go to your Web App
3. Click **"Advanced Tools"** → **"Go"** (opens Kudu)
4. Go to **Debug console** → **CMD**
5. Navigate to `site/wwwroot`
6. Drag and drop your ZIP file to upload

---

## Step 6: Set Up the Database Tables

If you imported your database in Step 2, skip this. Otherwise:

1. In your Web App, click **"SSH"** in the left menu
2. Click **"Go"**
3. Run these commands:
   ```bash
   cd /home/site/wwwroot
   npm run db:push
   ```

This creates all the database tables your app needs.

---

## Step 7: Test Your Portal

### 7.1 Find Your URL

Your portal is now live at:
```
https://acclaim-portal.azurewebsites.net
```

(Replace `acclaim-portal` with whatever name you chose)

### 7.2 Check Everything Works

- [ ] Can you see the login page?
- [ ] Can you log in with your admin account?
- [ ] Do cases display correctly?
- [ ] Can you send messages?
- [ ] Do emails arrive?

---

## Step 8: Set Up a Custom Domain (Optional)

Want to use your own domain like `portal.acclaim.law`?

### 8.1 Add Custom Domain

1. Go to your Web App
2. Click **"Custom domains"** in the left menu
3. Click **"+ Add custom domain"**
4. Enter your domain: `portal.acclaim.law`
5. Click **"Validate"**

### 8.2 Update Your DNS

Azure will show you DNS records to add. Go to your domain provider and add:

| Type | Name | Value |
|------|------|-------|
| CNAME | portal | acclaim-portal.azurewebsites.net |
| TXT | asuid.portal | (Azure provides this) |

Wait 10-30 minutes for DNS to update.

### 8.3 Add SSL Certificate

1. Click **"Certificates"** in the left menu
2. Click **"+ Add certificate"**
3. Choose **"App Service Managed Certificate"** (free!)
4. Select your custom domain
5. Click **"Create"**
6. Go back to Custom domains → Click your domain → Enable HTTPS

---

## Costs (Approximate)

| Service | Monthly Cost |
|---------|--------------|
| Azure App Service (Basic B1) | ~£10-15 |
| Azure PostgreSQL (Basic) | ~£15-25 |
| **Total** | **~£25-40/month** |

**Tips to save money:**
- Use "Development" tier for database during testing
- Use "Free" or "Shared" App Service for testing
- Scale up only when you have real users

---

## Troubleshooting

### "Application Error" when visiting site

1. Go to Web App → **"Log stream"** in left menu
2. Look for error messages
3. Common fixes:
   - Check DATABASE_URL is correct
   - Make sure all environment variables are set
   - Check startup command is correct

### "Connection refused" to database

1. Go to your PostgreSQL server
2. Click **"Networking"** in left menu
3. Make sure "Allow access to Azure services" is ON
4. Add your Web App's outbound IP addresses

### Emails not sending

1. Check SENDGRID_API_KEY is set correctly
2. Verify your SendGrid account is active
3. Check SendGrid activity log for errors

### Login not working

1. Make sure SESSION_SECRET is set
2. Check DATABASE_URL is correct
3. Verify database tables exist (run `npm run db:push`)

---

## Quick Reference

### Your Azure Resources

| Resource | Name | Purpose |
|----------|------|---------|
| Resource Group | acclaim-resources | Container for all resources |
| PostgreSQL Server | acclaim-database | Your database server |
| Database | acclaim_portal | Your actual database |
| Web App | acclaim-portal | Your website/portal |

### Important URLs

- **Azure Portal**: [portal.azure.com](https://portal.azure.com)
- **Your Portal**: https://acclaim-portal.azurewebsites.net
- **Database Admin**: Use pgAdmin or Azure Data Studio

### Connection String Format

```
postgresql://USERNAME:PASSWORD@SERVER.postgres.database.azure.com:5432/DATABASE?sslmode=require
```

---

## Getting Help

If you get stuck:

1. **Azure Documentation**: [docs.microsoft.com/azure](https://docs.microsoft.com/azure)
2. **Azure Support**: Available through Azure Portal
3. **Common issues**: Check the Troubleshooting section above

---

## Summary Checklist

- [ ] Created Azure account
- [ ] Created PostgreSQL database
- [ ] Exported data from Replit
- [ ] Imported data to Azure database
- [ ] Created Web App
- [ ] Set environment variables
- [ ] Deployed code
- [ ] Tested the portal
- [ ] (Optional) Set up custom domain
- [ ] (Optional) Added SSL certificate

---

**Congratulations!** 🎉 Your Acclaim Portal is now running on Azure!

---

*Guide created for Acclaim Credit Management & Recovery*  
*Last updated: November 2024*
