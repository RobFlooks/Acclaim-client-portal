import * as msal from "@azure/msal-node";
import { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { sendGridEmailService } from "./email-service-sendgrid";

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_REDIRECT_URI = process.env.AZURE_REDIRECT_URI || "/auth/azure/callback";

let msalClient: msal.ConfidentialClientApplication | null = null;

export function isAzureAuthEnabled(): boolean {
  return !!(AZURE_CLIENT_ID && AZURE_TENANT_ID && AZURE_CLIENT_SECRET);
}

function getMsalClient(): msal.ConfidentialClientApplication {
  if (!msalClient) {
    if (!AZURE_CLIENT_ID || !AZURE_TENANT_ID || !AZURE_CLIENT_SECRET) {
      throw new Error("Azure Entra External ID is not configured. Set AZURE_CLIENT_ID, AZURE_TENANT_ID, and AZURE_CLIENT_SECRET.");
    }

    const msalConfig: msal.Configuration = {
      auth: {
        clientId: AZURE_CLIENT_ID,
        authority: `https://${AZURE_TENANT_ID}.ciamlogin.com/`,
        clientSecret: AZURE_CLIENT_SECRET,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (containsPii) return;
            if (level === msal.LogLevel.Error) {
              console.error("[Azure Auth]", message);
            }
          },
          piiLoggingEnabled: false,
          logLevel: msal.LogLevel.Error,
        },
      },
    };

    msalClient = new msal.ConfidentialClientApplication(msalConfig);
  }
  return msalClient;
}

export function setupAzureAuth(app: Express): void {
  // Status endpoint is always available so frontend can check if Azure auth is enabled
  app.get("/api/auth/azure/status", (req, res) => {
    res.json({
      enabled: isAzureAuthEnabled(),
      configured: !!(AZURE_CLIENT_ID && AZURE_TENANT_ID),
    });
  });

  if (!isAzureAuthEnabled()) {
    console.log("[Azure Auth] Azure Entra External ID not configured - skipping setup");
    return;
  }

  console.log("[Azure Auth] Setting up Azure Entra External ID authentication");

  app.get("/auth/azure/login", async (req, res) => {
    try {
      const client = getMsalClient();
      const redirectUri = getFullRedirectUri(req);
      
      console.log("[Azure Auth] Starting login flow");
      console.log("[Azure Auth] Redirect URI:", redirectUri);
      console.log("[Azure Auth] Tenant ID:", AZURE_TENANT_ID);

      const authCodeUrlParameters: msal.AuthorizationUrlRequest = {
        scopes: ["openid", "profile", "email", "offline_access"],
        redirectUri,
        prompt: "select_account",
      };

      const authUrl = await client.getAuthCodeUrl(authCodeUrlParameters);
      console.log("[Azure Auth] Generated auth URL, redirecting...");
      res.redirect(authUrl);
    } catch (error: any) {
      console.error("[Azure Auth] Login error:", error);
      console.error("[Azure Auth] Error details:", {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack?.substring(0, 500)
      });
      res.redirect("/auth?error=azure_login_failed");
    }
  });

  app.get("/auth/azure/callback", async (req, res) => {
    try {
      const { code, error, error_description } = req.query;

      if (error) {
        console.error("[Azure Auth] Callback error:", error, error_description);
        return res.redirect(`/auth?error=${encodeURIComponent(error as string)}`);
      }

      if (!code) {
        return res.redirect("/auth?error=no_code");
      }

      const client = getMsalClient();
      const redirectUri = getFullRedirectUri(req);

      const tokenRequest: msal.AuthorizationCodeRequest = {
        code: code as string,
        scopes: ["openid", "profile", "email", "offline_access"],
        redirectUri,
      };

      const response = await client.acquireTokenByCode(tokenRequest);

      if (!response || !response.account) {
        return res.redirect("/auth?error=no_account");
      }

      const email = response.account.username || (response.idTokenClaims as any)?.email;
      const firstName = (response.idTokenClaims as any)?.given_name || "";
      const lastName = (response.idTokenClaims as any)?.family_name || "";
      const azureId = response.account.homeAccountId;

      if (!email) {
        return res.redirect("/auth?error=no_email");
      }

      let user = await storage.getUserByEmail(email);

      if (!user) {
        user = await storage.getUserByAzureId(azureId);
      }

      if (!user) {
        console.log(`[Azure Auth] No user found for email: ${email} - access denied`);
        return res.redirect("/auth?error=user_not_found");
      }

      if (user.azureId !== azureId) {
        await storage.linkAzureAccount(user.id, azureId);
      }

      (req.session as any).passport = { user: user.id };

      req.session.save(async (err) => {
        if (err) {
          console.error("[Azure Auth] Session save error:", err);
          return res.redirect("/auth?error=session_error");
        }
        
        // Send login notification if user has it enabled and it's a new IP
        const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        
        try {
          const fullUser = await storage.getUser(user!.id);
          if (fullUser && fullUser.email && (fullUser as any).loginNotifications !== false) {
            const isNewLocation = await storage.isNewLoginLocation(fullUser.email, ipAddress, userAgent);
            if (isNewLocation) {
              sendGridEmailService.sendLoginNotification({
                userEmail: fullUser.email,
                userName: `${fullUser.firstName || ''} ${fullUser.lastName || ''}`.trim() || 'User',
                loginTime: new Date(),
                ipAddress: ipAddress,
                userAgent: userAgent,
                loginMethod: 'azure_sso'
              }).catch(err => {
                console.error('[Azure Auth] Failed to send login notification:', err);
              });
            }
          }
        } catch (notifyErr) {
          console.error('[Azure Auth] Failed to send login notification:', notifyErr);
        }
        
        res.redirect("/");
      });
    } catch (error) {
      console.error("[Azure Auth] Callback processing error:", error);
      res.redirect("/auth?error=callback_failed");
    }
  });

  app.get("/auth/azure/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("[Azure Auth] Logout error:", err);
      }
      const logoutUri = `https://${AZURE_TENANT_ID}.ciamlogin.com/${AZURE_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(getBaseUrl(req) + "/auth")}`;
      res.redirect(logoutUri);
    });
  });
}

function getBaseUrl(req: any): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

function getFullRedirectUri(req: any): string {
  const baseUrl = getBaseUrl(req);
  const path = AZURE_REDIRECT_URI?.startsWith("/") ? AZURE_REDIRECT_URI : `/${AZURE_REDIRECT_URI}`;
  return `${baseUrl}${path}`;
}
