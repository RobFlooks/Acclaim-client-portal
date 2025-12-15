# Azure Entra External ID Setup Guide

This guide explains how to configure Azure Entra External ID authentication for the Acclaim Credit Management portal.

## Overview

Azure Entra External ID (formerly Azure AD B2C) allows users to sign in using their Microsoft accounts. This integration enables single sign-on (SSO) for portal users.

**Important:** Users must already have an account in the Acclaim portal before they can use Microsoft sign-in. The Azure authentication links to existing accounts by matching email addresses.

## Prerequisites

1. An Azure subscription
2. Access to the Azure Portal
3. Administrator access to configure the Acclaim portal environment variables

## Step 1: Create an Azure Entra External ID Tenant

1. Sign in to the [Azure Portal](https://portal.azure.com)
2. Search for "Azure AD External Identities" or "External ID"
3. Create a new External ID tenant:
   - Choose "Customer identity and access management (CIAM)"
   - Enter your tenant name (this becomes your `AZURE_TENANT_ID`)
   - Select your region
   - Complete the creation process

## Step 2: Register an Application

1. In your External ID tenant, go to **App registrations**
2. Click **New registration**
3. Configure the application:
   - **Name**: "Acclaim Portal" (or your preferred name)
   - **Supported account types**: Select "Accounts in this organizational directory only"
   - **Redirect URI**: 
     - Platform: Web
     - URI: `https://your-domain.com/auth/azure/callback`
4. Click **Register**

After registration, note down:
- **Application (client) ID** - This is your `AZURE_CLIENT_ID`
- **Directory (tenant) ID** - This is your `AZURE_TENANT_ID`

## Step 3: Create a Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and select an expiry period
4. Click **Add**
5. **Important**: Copy the secret value immediately - it won't be shown again
   - This is your `AZURE_CLIENT_SECRET`

## Step 4: Configure API Permissions

1. Go to **API permissions**
2. Ensure the following permissions are granted:
   - `openid` (Sign in and read user profile)
   - `profile` (View users' basic profile)
   - `email` (View users' email address)
   - `offline_access` (Maintain access to data you have given it access to)
3. If required, grant admin consent for your organisation

## Step 5: Configure User Flows (Optional)

1. Go to **User flows** in your External ID tenant
2. Create a sign-up and sign-in flow if you want customised branding
3. Configure the attributes to collect (ensure email is included)

## Step 6: Set Environment Variables

Add the following environment variables to your Acclaim portal:

```
AZURE_CLIENT_ID=your-application-client-id
AZURE_TENANT_ID=your-tenant-name
AZURE_CLIENT_SECRET=your-client-secret
AZURE_REDIRECT_URI=/auth/azure/callback
```

**Notes:**
- `AZURE_TENANT_ID` should be just the tenant name (e.g., `acclaimexternal`), not the full domain
- `AZURE_REDIRECT_URI` defaults to `/auth/azure/callback` if not specified
- For production, ensure your redirect URI uses HTTPS

## Step 7: Verify Configuration

1. Restart the application after setting environment variables
2. Navigate to the login page
3. You should see a "Sign in with Microsoft" button
4. Test the authentication flow

## How It Works

1. User clicks "Sign in with Microsoft" on the login page
2. User is redirected to Microsoft's authentication page
3. After successful authentication, Microsoft redirects back to the callback URL
4. The portal matches the Microsoft email to an existing user account
5. If found, the user is logged in; if not, they receive an error

## User Account Linking

- Users must have an existing account in the portal (created by an administrator)
- The first time a user signs in with Microsoft, their Azure ID is linked to their portal account
- Subsequent logins will recognise them by either email or Azure ID
- Users cannot self-register through Microsoft sign-in

## Troubleshooting

### "User not found" Error
- The Microsoft account email doesn't match any existing portal user
- Solution: Ensure the user's account is created in the admin panel with the same email

### "Authentication cancelled" Error
- User cancelled the Microsoft sign-in process
- Solution: Try again and complete the authentication

### "Callback failed" Error
- Check that the redirect URI in Azure matches exactly
- Verify all environment variables are set correctly
- Check server logs for detailed error messages

### Button Not Appearing
- Azure authentication is only shown when configured
- Verify `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_CLIENT_SECRET` are all set
- Check the `/api/auth/azure/status` endpoint to verify configuration

## Security Considerations

1. Store the client secret securely - never commit it to version control
2. Use HTTPS in production for all redirect URIs
3. Regularly rotate the client secret
4. Review and audit user access periodically
5. Consider enabling MFA in Azure for additional security

## Support

For issues with Azure configuration, consult the [Azure Entra External ID documentation](https://learn.microsoft.com/en-us/azure/active-directory/external-identities/).

For portal-specific issues, contact the development team.
