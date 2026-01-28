import express, { type Express, type RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin as authIsAdmin } from "./auth";
import { 
  insertCaseSchema,
  insertCaseSubmissionSchema,
  insertMessageSchema, 
  insertDocumentSchema,
  createUserSchema,
  updateUserSchema,
  adminUpdateUserSchema,
  updateNotificationPreferencesSchema,
  changePasswordSchema,
  resetPasswordSchema,
  createOrganisationSchema,
  updateOrganisationSchema,
  insertScheduledReportSchema
} from "@shared/schema";
import { z } from "zod";

// Schema for org-level scheduled report creation with custom recipient
const orgScheduledReportSchema = z.object({
  recipientEmail: z.string().email("Invalid email format"),
  recipientName: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  timeOfDay: z.number().int().min(0).max(23).default(9),
  includeCaseSummary: z.boolean().default(true),
  includeActivityReport: z.boolean().default(true),
  caseStatusFilter: z.enum(["active", "all", "closed"]).default("active"),
});
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import officegen from "officegen";
import bcrypt from "bcrypt";
import { emailService } from "./email-service";
import { getAutoMuteNewCases, setAutoMuteNewCases } from "./user-preferences";
import { sendGridEmailService } from "./email-service-sendgrid";
import { setupAzureAuth } from "./azure-auth";
import ExcelJS from "exceljs";
import { loginRateLimiter } from "./rate-limiter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_ADMIN_EMAIL = "email@acclaim.law";

async function getAdminEmailForCase(caseAssignedTo: string | null | undefined): Promise<string> {
  if (!caseAssignedTo) {
    return DEFAULT_ADMIN_EMAIL;
  }
  
  try {
    const admin = await storage.getAdminByName(caseAssignedTo);
    if (admin && admin.email) {
      console.log(`[Email Routing] Found admin "${admin.firstName} ${admin.lastName}" (${admin.email}) for case handler "${caseAssignedTo}"`);
      return admin.email;
    }
    console.log(`[Email Routing] No admin found matching case handler "${caseAssignedTo}", using default email`);
  } catch (error) {
    console.error(`[Email Routing] Error finding admin for case handler "${caseAssignedTo}":`, error);
  }
  
  return DEFAULT_ADMIN_EMAIL;
}

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// Admin middleware - checks if user is an admin
const isAdmin: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Super Admin middleware - checks if user is a super admin (for destructive operations)
const isSuperAdmin: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.isSuperAdmin) {
      return res.status(403).json({ message: "Super admin access required for this action" });
    }

    next();
  } catch (error) {
    console.error("Super admin check error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to log admin actions to audit trail
async function logAdminAction(params: {
  adminUser: { id: string; email?: string | null; firstName?: string | null; lastName?: string | null };
  tableName: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  description: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  organisationId?: number;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const adminName = [params.adminUser.firstName, params.adminUser.lastName].filter(Boolean).join(' ') || params.adminUser.email || 'Unknown Admin';
    
    await storage.logAuditEvent({
      tableName: params.tableName,
      recordId: params.recordId,
      operation: params.operation,
      fieldName: params.fieldName,
      oldValue: params.oldValue,
      newValue: params.newValue,
      userId: params.adminUser.id,
      userEmail: params.adminUser.email || undefined,
      organisationId: params.organisationId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      description: `[Admin: ${adminName}] ${params.description}`,
    });
  } catch (error) {
    console.error('Failed to log admin action to audit trail:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Azure Entra External ID authentication (optional - only if configured)
  setupAzureAuth(app);
  
  // Initial setup routes (only available when no admin exists)
  app.get('/api/setup/status', async (req, res) => {
    try {
      const hasAdmin = await storage.hasAdminUser();
      res.json({ 
        setupRequired: !hasAdmin,
        message: hasAdmin ? 'System is already configured' : 'Initial admin setup required'
      });
    } catch (error) {
      console.error("Error checking setup status:", error);
      res.status(500).json({ message: "Failed to check setup status" });
    }
  });

  app.post('/api/setup/admin', async (req, res) => {
    try {
      // Check if any admin already exists
      const hasAdmin = await storage.hasAdminUser();
      if (hasAdmin) {
        return res.status(403).json({ 
          message: "Initial setup has already been completed. Admin users already exist." 
        });
      }

      const { firstName, lastName, email, password } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ 
          message: "All fields are required: firstName, lastName, email, password" 
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ 
          message: "Password must be at least 8 characters long" 
        });
      }

      // Check password complexity
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);
      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return res.status(400).json({ 
          message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
        });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }

      // Create the admin user with the provided password (not temporary)
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = `admin-${Date.now()}`;

      // Use db directly to create user with custom password
      const { db } = await import('./db');
      const { users } = await import('@shared/schema');
      
      const [user] = await db
        .insert(users)
        .values({
          id: userId,
          firstName,
          lastName,
          email: email.toLowerCase(),
          isAdmin: true,
          hashedPassword,
          mustChangePassword: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log(`[Setup] Initial admin user created: ${email}`);

      res.status(201).json({ 
        message: "Initial admin account created successfully",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin
        }
      });
    } catch (error: any) {
      console.error("Error creating initial admin:", error);
      const errorMessage = error?.message || "Unknown error";
      res.status(500).json({ 
        message: "Failed to create initial admin account",
        error: process.env.NODE_ENV !== 'production' ? errorMessage : undefined
      });
    }
  });

  // Password reset routes
  app.post('/api/auth/password-reset/request', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Always return success to prevent email enumeration
      const genericResponse = { 
        message: "If an account with this email exists, a password reset code has been sent." 
      };

      // Find user by email
      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        console.log(`[Password Reset] Request for unknown email: ${email}`);
        return res.json(genericResponse);
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Hash the OTP before storing
      const hashedOtp = await bcrypt.hash(otp, 10);
      
      // Set expiry to 15 minutes from now
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      
      // Store the token
      await storage.createPasswordResetToken(user.id, hashedOtp, expiresAt);
      
      // Send email with OTP
      const { sendGridEmailService } = await import('./email-service-sendgrid');
      const emailSent = await sendGridEmailService.sendPasswordResetOTP({
        userEmail: user.email!,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
        otp,
        expiresInMinutes: 15
      });

      if (!emailSent) {
        console.error(`[Password Reset] Failed to send email to ${email}`);
        // Still return generic response to prevent enumeration
      } else {
        console.log(`[Password Reset] OTP sent to ${email}`);
      }

      res.json(genericResponse);
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post('/api/auth/login/otp', async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ message: "Invalid email or code" });
      }

      // Get valid token for user
      const token = await storage.getValidPasswordResetToken(user.id);
      if (!token) {
        return res.status(401).json({ message: "No valid reset code found. Please request a new one." });
      }

      // Verify OTP
      const otpValid = await bcrypt.compare(otp, token.hashedToken);
      if (!otpValid) {
        return res.status(401).json({ message: "Invalid code. Please check and try again." });
      }

      // Mark token as used
      await storage.markPasswordResetTokenUsed(token.id);

      // Update user to require password change
      await storage.updateUserPassword(user.id, {
        mustChangePassword: true
      });

      // Log the user in
      const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';
      
      (req as any).login(user, async (err: any) => {
        if (err) {
          console.error("Login error after OTP verification:", err);
          return res.status(500).json({ message: "Login failed" });
        }

        console.log(`[Password Reset] User ${email} logged in with OTP, must change password`);
        
        // Send login notification if user has it enabled and it's a new IP
        try {
          const fullUser = await storage.getUser(user.id);
          if (fullUser && fullUser.email && (fullUser as any).loginNotifications !== false) {
            const isNewLocation = await storage.isNewLoginLocation(fullUser.email, ipAddress, userAgent);
            if (isNewLocation) {
              const { sendGridEmailService } = await import('./email-service-sendgrid');
              sendGridEmailService.sendLoginNotification({
                userEmail: fullUser.email,
                userName: `${fullUser.firstName || ''} ${fullUser.lastName || ''}`.trim() || 'User',
                loginTime: new Date(),
                ipAddress: ipAddress,
                userAgent: userAgent,
                loginMethod: 'otp'
              }).catch(err => {
                console.error('Failed to send login notification:', err);
              });
            }
          }
        } catch (notifyErr) {
          console.error('Failed to send login notification:', notifyErr);
        }
        
        res.json({
          message: "Login successful. Please change your password.",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin,
            mustChangePassword: true
          }
        });
      });
    } catch (error) {
      console.error("Error during OTP login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  // Serve screenshots for user guide
  app.use("/screenshots", express.static(path.join(__dirname, "../screenshots")));

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get organisation name if user has one
      let organisationName = null;
      if (user.organisationId) {
        const organisation = await storage.getOrganisation(user.organisationId);
        if (organisation) {
          organisationName = organisation.name;
        }
      }
      
      res.json({ ...user, organisationName });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard/Statistics routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const accessibleOnly = req.query.accessibleOnly === 'true';
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let stats;
      if (user.isAdmin) {
        // Admin sees global stats across all organisations
        stats = await storage.getGlobalCaseStats();
      } else {
        // Regular users see stats from all their assigned organisations
        const userOrgs = await storage.getUserOrganisations(userId);
        const orgIds = new Set<number>();
        
        // Add legacy organisation if exists
        if (user.organisationId) {
          orgIds.add(user.organisationId);
        }
        
        // Add junction table organisations
        userOrgs.forEach(uo => orgIds.add(uo.organisationId));
        
        if (orgIds.size === 0) {
          return res.status(404).json({ message: "User organisation not found" });
        }
        
        // Get combined stats from all user's organisations
        // If accessibleOnly is true, exclude blocked cases from stats
        const blockedCaseIds = accessibleOnly ? await storage.getBlockedCasesForUser(userId) : [];
        stats = await storage.getCombinedCaseStats(Array.from(orgIds), blockedCaseIds);
      }

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });
  
  // Check if user has any case restrictions
  app.get('/api/user/has-case-restrictions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const blockedCaseIds = await storage.getBlockedCasesForUser(userId);
      res.json({ hasRestrictions: blockedCaseIds.length > 0, count: blockedCaseIds.length });
    } catch (error) {
      console.error("Error checking case restrictions:", error);
      res.status(500).json({ message: "Failed to check case restrictions" });
    }
  });

  // Cases routes
  app.get('/api/cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      let cases = await storage.getCasesForUser(userId);
      
      // Filter out cases the user is blocked from (unless admin)
      if (!user?.isAdmin) {
        const blockedCaseIds = await storage.getBlockedCasesForUser(userId);
        if (blockedCaseIds.length > 0) {
          cases = cases.filter(c => !blockedCaseIds.includes(c.id));
        }
      }
      
      res.json(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.get('/api/cases/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const caseId = parseInt(req.params.id);
      
      // Check if user is blocked from this case (unless admin)
      if (!user.isAdmin) {
        const isBlocked = await storage.isUserBlockedFromCase(userId, caseId);
        if (isBlocked) {
          return res.status(404).json({ message: "Case not found" });
        }
      }
      
      let case_;
      
      if (user.isAdmin) {
        // Admin can access any case across all organisations
        case_ = await storage.getCaseById(caseId);
      } else {
        // Regular users can access cases from any of their assigned organisations
        const userCases = await storage.getCasesForUser(userId);
        case_ = userCases.find(c => c.id === caseId);
      }
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }

      res.json(case_);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  app.post('/api/cases', isAuthenticated, upload.array('files'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.organisationId) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      // Parse the case data from JSON
      const caseDataJson = req.body.caseData;
      let parsedCaseData;
      
      try {
        parsedCaseData = JSON.parse(caseDataJson);
      } catch (error) {
        return res.status(400).json({ message: "Invalid case data format" });
      }

      // Generate account number
      const accountNumber = `ACC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const caseData = {
        accountNumber,
        caseName: parsedCaseData.caseName,
        debtorEmail: parsedCaseData.debtorEmail,
        debtorPhone: parsedCaseData.debtorPhone,
        debtorAddress: parsedCaseData.debtorAddress,
        originalAmount: parsedCaseData.originalAmount,
        outstandingAmount: parsedCaseData.outstandingAmount,
        status: parsedCaseData.status || 'active',
        stage: parsedCaseData.stage || 'new',
        organisationId: user.organisationId,
        assignedTo: 'System',
      };

      const newCase = await storage.createCase(caseData);
      
      // Auto-mute the case if user has auto-mute preference enabled
      if (getAutoMuteNewCases(userId)) {
        await storage.muteCase(userId, newCase.id);
      }
      
      // Handle file uploads
      const uploadedFiles = req.files as Express.Multer.File[];
      
      if (uploadedFiles && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          // Create document record
          await storage.createDocument({
            fileName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            fileType: file.mimetype,
            caseId: newCase.id,
            organisationId: user.organisationId || 0,
            uploadedBy: userId,
          });
        }
      }
      
      // Note: Case activities are now only created via external API
      // No automatic activity generation for internal operations

      res.status(201).json(newCase);
    } catch (error) {
      console.error("Error creating case:", error);
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  // Case mute/unmute endpoints
  app.get('/api/cases/:id/muted', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const caseId = parseInt(req.params.id);
      const isMuted = await storage.isCaseMuted(userId, caseId);
      res.json({ muted: isMuted });
    } catch (error) {
      console.error("Error checking case mute status:", error);
      res.status(500).json({ message: "Failed to check mute status" });
    }
  });

  app.post('/api/cases/:id/mute', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const caseId = parseInt(req.params.id);
      await storage.muteCase(userId, caseId);
      res.json({ success: true, muted: true });
    } catch (error) {
      console.error("Error muting case:", error);
      res.status(500).json({ message: "Failed to mute case" });
    }
  });

  app.post('/api/cases/:id/unmute', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const caseId = parseInt(req.params.id);
      await storage.unmuteCase(userId, caseId);
      res.json({ success: true, muted: false });
    } catch (error) {
      console.error("Error unmuting case:", error);
      res.status(500).json({ message: "Failed to unmute case" });
    }
  });

  app.get('/api/user/muted-cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const mutedCaseIds = await storage.getMutedCasesForUser(userId);
      res.json({ mutedCaseIds });
    } catch (error) {
      console.error("Error fetching muted cases:", error);
      res.status(500).json({ message: "Failed to fetch muted cases" });
    }
  });

  // Bulk mute all cases for user
  app.post('/api/user/mute-all-cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get all cases for user's organisations
      const allCases = await storage.getCasesForUser(userId);
      let mutedCount = 0;
      
      for (const caseItem of allCases) {
        const alreadyMuted = await storage.isCaseMuted(userId, caseItem.id);
        if (!alreadyMuted) {
          await storage.muteCase(userId, caseItem.id);
          mutedCount++;
        }
      }
      
      res.json({ success: true, mutedCount });
    } catch (error) {
      console.error("Error muting all cases:", error);
      res.status(500).json({ message: "Failed to mute all cases" });
    }
  });

  // Bulk unmute all cases for user
  app.post('/api/user/unmute-all-cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const mutedCaseIds = await storage.getMutedCasesForUser(userId);
      
      for (const caseId of mutedCaseIds) {
        await storage.unmuteCase(userId, caseId);
      }
      
      res.json({ success: true, unmutedCount: mutedCaseIds.length });
    } catch (error) {
      console.error("Error unmuting all cases:", error);
      res.status(500).json({ message: "Failed to unmute all cases" });
    }
  });

  // Get auto-mute new cases preference
  app.get('/api/user/auto-mute-preference', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const autoMuteEnabled = getAutoMuteNewCases(userId);
      res.json({ autoMuteNewCases: autoMuteEnabled });
    } catch (error) {
      console.error("Error getting auto-mute preference:", error);
      res.status(500).json({ message: "Failed to get auto-mute preference" });
    }
  });

  // Set auto-mute new cases preference
  app.post('/api/user/auto-mute-preference', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { enabled } = req.body;
      setAutoMuteNewCases(userId, enabled === true);
      res.json({ success: true, autoMuteNewCases: enabled === true });
    } catch (error) {
      console.error("Error setting auto-mute preference:", error);
      res.status(500).json({ message: "Failed to set auto-mute preference" });
    }
  });

  // Scheduled reports endpoints - read-only for users (admin configures reports)
  app.get('/api/user/scheduled-reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const reports = await storage.getScheduledReportsForUser(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching scheduled report settings:", error);
      res.status(500).json({ message: "Failed to fetch scheduled report settings" });
    }
  });

  // Check if user is allowed to use scheduled reports (based on org settings)
  app.get('/api/user/scheduled-reports-allowed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userOrgs = await storage.getUserOrganisations(userId);
      
      if (userOrgs.length === 0) {
        return res.json({ allowed: false, reason: "No organisation assigned" });
      }
      
      // Check if ALL user's organisations have scheduled reports disabled
      const disabledOrgIds = await storage.getOrganisationsWithScheduledReportsDisabled();
      const allOrgsDisabled = userOrgs.every(org => disabledOrgIds.includes(org.id));
      
      if (allOrgsDisabled) {
        return res.json({ allowed: false, reason: "Scheduled reports disabled by admin for your organisation" });
      }
      
      res.json({ allowed: true });
    } catch (error) {
      console.error("Error checking scheduled reports allowed:", error);
      res.status(500).json({ message: "Failed to check scheduled reports status" });
    }
  });

  // Case submission routes
  app.post('/api/case-submissions', isAuthenticated, upload.array('documents'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's organisation IDs for validation
      const userOrgs = await storage.getUserOrganisations(userId);
      const allUserOrgIds = new Set<number>();
      
      // Add legacy organisation if exists
      if (user.organisationId) {
        allUserOrgIds.add(user.organisationId);
      }
      
      // Add junction table organisations
      userOrgs.forEach(uo => allUserOrgIds.add(uo.organisationId));

      // Parse numeric fields that come as strings from FormData
      const parsedBody = {
        ...req.body,
        organisationId: parseInt(req.body.organisationId),
        totalDebtAmount: req.body.totalDebtAmount, // Keep as string for schema
        paymentTermsDays: req.body.paymentTermsDays ? parseInt(req.body.paymentTermsDays) : undefined,
      };

      const validatedData = insertCaseSubmissionSchema.parse({
        ...parsedBody,
        submittedBy: userId,
      });

      // Ensure user can submit to the specified organisation
      if (!allUserOrgIds.has(validatedData.organisationId)) {
        return res.status(403).json({ message: "You don't have access to this organisation" });
      }

      const submission = await storage.createCaseSubmission(validatedData);

      // Handle uploaded documents
      const uploadedFiles = req.files as Express.Multer.File[];
      const documentFiles: Array<{ fileName: string; filePath: string; fileSize: number; fileType: string }> = [];
      
      if (uploadedFiles && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          // Store document info in case submission documents table
          await storage.createCaseSubmissionDocument({
            caseSubmissionId: submission.id,
            fileName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            fileType: file.mimetype,
          });
          
          // Add to documents array for email notification
          documentFiles.push({
            fileName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            fileType: file.mimetype,
          });
        }
      }

      // Get organisation details for email notification
      const organisation = await storage.getOrganisation(validatedData.organisationId);
      
      // Send email notification to email@acclaim.law
      try {
        const { sendGridEmailService } = await import('./email-service-sendgrid.js');
        await sendGridEmailService.sendCaseSubmissionNotification({
          userEmail: user.email || '',
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          organisationName: organisation?.name || 'Unknown Organisation',
          submissionId: submission.id,
          caseSubmission: {
            caseName: validatedData.caseName,
            debtorType: validatedData.debtorType,
            clientName: validatedData.clientName,
            clientEmail: validatedData.clientEmail,
            clientPhone: validatedData.clientPhone,
            creditorName: validatedData.creditorName,
            
            // Organisation specific fields
            organisationName: validatedData.organisationName,
            organisationTradingName: validatedData.organisationTradingName,
            companyNumber: validatedData.companyNumber,
            
            // Individual/Sole Trader specific fields
            individualType: validatedData.individualType,
            tradingName: validatedData.tradingName,
            principalSalutation: validatedData.principalSalutation,
            principalFirstName: validatedData.principalFirstName,
            principalLastName: validatedData.principalLastName,
            
            // Address
            addressLine1: validatedData.addressLine1,
            addressLine2: validatedData.addressLine2,
            city: validatedData.city,
            county: validatedData.county,
            postcode: validatedData.postcode,
            
            // Contact details
            mainPhone: validatedData.mainPhone,
            altPhone: validatedData.altPhone,
            mainEmail: validatedData.mainEmail,
            altEmail: validatedData.altEmail,
            
            // Debt details
            totalDebtAmount: validatedData.totalDebtAmount.toString(),
            currency: validatedData.currency || 'GBP',
            debtDetails: validatedData.debtDetails,
            
            // Payment terms
            paymentTermsType: validatedData.paymentTermsType,
            paymentTermsDays: validatedData.paymentTermsDays,
            paymentTermsOther: validatedData.paymentTermsOther,
            
            // Invoice details
            singleInvoice: validatedData.singleInvoice,
            firstOverdueDate: validatedData.firstOverdueDate,
            lastOverdueDate: validatedData.lastOverdueDate,
            
            additionalInfo: validatedData.additionalInfo,
            submittedAt: submission.submittedAt || new Date(),
          },
          uploadedFiles: documentFiles.length > 0 ? documentFiles : undefined,
        });
        console.log('✅ Case submission notification email sent to email@acclaim.law');
      } catch (emailError) {
        console.error('❌ Failed to send case submission notification email:', emailError);
        // Don't fail the submission if email fails
      }

      res.status(201).json(submission);
    } catch (error: any) {
      console.error("Error creating case submission:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create case submission" });
    }
  });

  // Admin-only case submission routes
  app.get('/api/admin/case-submissions', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const submissions = await storage.getCaseSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching case submissions:", error);
      res.status(500).json({ message: "Failed to fetch case submissions" });
    }
  });

  app.get('/api/admin/case-submissions/:status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const status = req.params.status;
      const submissions = await storage.getCaseSubmissionsByStatus(status);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching case submissions by status:", error);
      res.status(500).json({ message: "Failed to fetch case submissions" });
    }
  });

  // Get documents for a case submission
  app.get('/api/admin/case-submissions/:id/documents', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const submissionId = parseInt(req.params.id);
      const documents = await storage.getCaseSubmissionDocuments(submissionId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching case submission documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Serve case submission document files
  app.get('/api/admin/case-submissions/documents/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const submissions = await storage.getCaseSubmissions();
      
      // Find the document across all submissions
      let documentInfo = null;
      for (const submission of submissions) {
        const docs = await storage.getCaseSubmissionDocuments(submission.id);
        documentInfo = docs.find(doc => doc.id === documentId);
        if (documentInfo) break;
      }
      
      if (!documentInfo) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Serve the file
      res.download(documentInfo.filePath, documentInfo.fileName);
    } catch (error) {
      console.error("Error serving document:", error);
      res.status(500).json({ message: "Failed to serve document" });
    }
  });

  app.patch('/api/admin/case-submissions/:id/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const submissionId = parseInt(req.params.id);
      const { status } = req.body;
      const userId = req.user.id;

      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      if (!['pending', 'processed', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be pending, processed, or rejected" });
      }

      const updatedSubmission = await storage.updateCaseSubmissionStatus(submissionId, status, userId);
      res.json(updatedSubmission);
    } catch (error) {
      console.error("Error updating case submission status:", error);
      res.status(500).json({ message: "Failed to update case submission status" });
    }
  });

  app.delete('/api/admin/case-submissions/:id', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const submissionId = parseInt(req.params.id);

      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      await storage.deleteCaseSubmission(submissionId);
      res.json({ message: "Case submission deleted successfully" });
    } catch (error) {
      console.error("Error deleting case submission:", error);
      res.status(500).json({ message: "Failed to delete case submission" });
    }
  });

  // Case activities routes
  app.get('/api/cases/:id/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const caseId = parseInt(req.params.id);
      let case_;
      
      if (user.isAdmin) {
        // Admin can access any case across all organisations
        case_ = await storage.getCaseById(caseId);
      } else {
        // Regular users can access cases from any of their assigned organisations
        const userCases = await storage.getCasesForUser(userId);
        case_ = userCases.find(c => c.id === caseId);
      }
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }

      const activities = await storage.getCaseActivities(caseId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching case activities:", error);
      res.status(500).json({ message: "Failed to fetch case activities" });
    }
  });

  // Delete case activity (admin only)
  app.delete('/api/activities/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.id);
      
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      await storage.deleteCaseActivity(activityId);
      res.json({ message: "Activity deleted successfully" });
    } catch (error) {
      console.error("Error deleting case activity:", error);
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // Messages routes
  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const messages = await storage.getMessagesForUser(userId);
      
      // Filter out messages for cases the user is blocked from
      const blockedCaseIds = await storage.getBlockedCasesForUser(userId);
      const filteredMessages = messages.filter((m: any) => {
        // If message has no caseId, it's a general message - always show
        if (!m.caseId) return true;
        // If user is blocked from this case, hide the message
        return !blockedCaseIds.includes(m.caseId);
      });
      
      res.json(filteredMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Export messages to Excel with date range filtering
  app.get('/api/messages/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { from, to } = req.query;

      // Validate at least one date is provided
      if (!from && !to) {
        return res.status(400).json({ message: "Please provide at least a 'from' or 'to' date parameter" });
      }

      // Get all messages for the user
      const allMessagesRaw = await storage.getMessagesForUser(userId);
      
      // Filter out messages for cases the user is blocked from
      const blockedCaseIds = await storage.getBlockedCasesForUser(userId);
      const allMessages = allMessagesRaw.filter((m: any) => {
        if (!m.caseId) return true;
        return !blockedCaseIds.includes(m.caseId);
      });

      // Filter by date range
      let filteredMessages = allMessages;
      
      if (from) {
        const fromDate = new Date(from as string);
        if (!isNaN(fromDate.getTime())) {
          filteredMessages = filteredMessages.filter((m: any) => new Date(m.createdAt) >= fromDate);
        }
      }
      
      if (to) {
        const toDate = new Date(to as string);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999); // End of day
          filteredMessages = filteredMessages.filter((m: any) => new Date(m.createdAt) <= toDate);
        }
      }

      if (filteredMessages.length === 0) {
        return res.status(404).json({ message: "No messages found in the specified date range" });
      }

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Acclaim Credit Management';
      workbook.created = new Date();
      
      const worksheet = workbook.addWorksheet('Messages');

      // Define columns - reordered: Date, Time, Sender, Case, Subject, Message
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 18 },
        { header: 'Time', key: 'time', width: 10 },
        { header: 'Sender', key: 'sender', width: 25 },
        { header: 'Case', key: 'caseName', width: 30 },
        { header: 'Subject', key: 'subject', width: 35 },
        { header: 'Message', key: 'content', width: 60 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF008080' } // Teal colour
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Fetch case names for messages that have caseId
      const caseIds = [...new Set(filteredMessages.filter((m: any) => m.caseId).map((m: any) => m.caseId))];
      const caseNameMap: Record<number, string> = {};
      
      for (const caseId of caseIds) {
        try {
          const caseData = await storage.getCaseById(caseId);
          if (caseData) {
            caseNameMap[caseId] = caseData.caseName || `Case #${caseId}`;
          }
        } catch (e) {
          // Case may not exist or user may not have access
        }
      }

      // Add data rows
      for (const message of filteredMessages) {
        const createdAt = new Date(message.createdAt);
        const caseName = message.caseId ? (caseNameMap[message.caseId] || `Case #${message.caseId}`) : 'General';
        
        worksheet.addRow({
          date: createdAt.toLocaleDateString('en-GB'),
          time: createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          sender: message.senderName || message.senderId,
          caseName: caseName,
          subject: message.subject || '(No subject)',
          content: message.content,
        });
      }

      // Enable column filtering (autoFilter)
      worksheet.autoFilter = {
        from: 'A1',
        to: 'F1'
      };

      // Generate filename with date range
      const fromStr = from ? new Date(from as string).toLocaleDateString('en-GB').replace(/\//g, '-') : 'start';
      const toStr = to ? new Date(to as string).toLocaleDateString('en-GB').replace(/\//g, '-') : 'end';
      const filename = `Messages_${fromStr}_to_${toStr}.xlsx`;

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting messages:", error);
      res.status(500).json({ message: "Failed to export messages" });
    }
  });

  app.get('/api/cases/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const caseId = parseInt(req.params.id);
      let case_;
      
      if (user.isAdmin) {
        // Admin can access any case across all organisations
        case_ = await storage.getCaseById(caseId);
      } else {
        // Regular users can access cases from any of their assigned organisations
        const userCases = await storage.getCasesForUser(userId);
        case_ = userCases.find(c => c.id === caseId);
      }
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }

      const messages = await storage.getMessagesForCase(caseId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching case messages:", error);
      res.status(500).json({ message: "Failed to fetch case messages" });
    }
  });

  app.post('/api/messages', isAuthenticated, upload.single('attachment'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let recipientType = req.body.recipientType || 'user';
      let recipientId = req.body.recipientId;
      
      // Check if this is a case-specific message
      if (req.body.caseId) {
        const caseId = parseInt(req.body.caseId);
        let case_;
        
        if (user.isAdmin) {
          // Admin can access any case across all organisations
          case_ = await storage.getCaseById(caseId);
        } else {
          // Regular users - check organisation access via junction table or direct field
          const userOrgs = await storage.getUserOrganisations(userId);
          const allUserOrgIds = new Set<number>();
          
          if (user.organisationId) {
            allUserOrgIds.add(user.organisationId);
          }
          userOrgs.forEach(uo => allUserOrgIds.add(uo.organisationId));
          
          if (allUserOrgIds.size === 0) {
            return res.status(404).json({ message: "User organisation not found" });
          }
          
          // Check if user has access to the case via any of their organisations
          const potentialCase = await storage.getCaseById(caseId);
          if (potentialCase && allUserOrgIds.has(potentialCase.organisationId)) {
            case_ = potentialCase;
          }
        }
        
        if (!case_) {
          return res.status(404).json({ message: "Case not found" });
        }

        // For case messages, determine the recipient based on sender
        if (user.isAdmin) {
          // Admin sending to organisation (case client)
          recipientType = 'organisation';
          recipientId = case_.organisationId.toString();
        } else {
          // User sending to admin - find an admin user
          const adminUsers = await storage.getAllUsers();
          const adminUser = adminUsers.find(u => u.isAdmin);
          if (adminUser) {
            recipientType = 'user';
            recipientId = adminUser.id;
          } else {
            // Fallback - send to organisation if no admin found
            recipientType = 'organisation';
            recipientId = case_.organisationId.toString();
          }
        }
      } else {
        // General message (not case-specific)
        if (user.isAdmin) {
          // Admin sending general message to all organisations or specific recipient
          // If no recipient specified, send to the user's own organisation as fallback
          if (!recipientId && user.organisationId) {
            recipientType = 'organisation';
            recipientId = user.organisationId.toString();
          }
        } else {
          // User sending general message to admin - find an admin user
          const adminUsers = await storage.getAllUsers();
          const adminUser = adminUsers.find(u => u.isAdmin);
          if (adminUser) {
            recipientType = 'user';
            recipientId = adminUser.id;
          } else {
            // Fallback - send to user's organisation if no admin found
            if (user.organisationId) {
              recipientType = 'organisation';
              recipientId = user.organisationId.toString();
            } else {
              return res.status(400).json({ message: "No valid recipient found" });
            }
          }
        }
      }
      
      // Handle custom filename for attachment
      let attachmentFinalFileName = req.file?.originalname;
      if (req.file && req.body.customFileName) {
        const originalExtension = req.file.originalname.split('.').pop();
        attachmentFinalFileName = `${req.body.customFileName}.${originalExtension}`;
      }

      const messageData = insertMessageSchema.parse({
        ...req.body,
        caseId: req.body.caseId ? parseInt(req.body.caseId) : undefined,
        senderId: userId,
        recipientType,
        recipientId,
        attachmentFileName: attachmentFinalFileName,
        attachmentFilePath: req.file?.path,
        attachmentFileSize: req.file?.size,
        attachmentFileType: req.file?.mimetype,
      });

      const newMessage = await storage.createMessage(messageData);
      
      // Save attachment as document if present
      if (req.file) {
        try {
          // Determine the organisation ID for the document
          let documentOrgId: number | undefined;
          
          if (messageData.caseId) {
            // Case-specific message - always use the case's organisation
            const messageCase = await storage.getCaseById(messageData.caseId);
            if (messageCase) {
              documentOrgId = messageCase.organisationId;
            }
          } else if (user.organisationId) {
            // Regular user or admin with organisation - general message
            documentOrgId = user.organisationId;
          } else if (recipientType === 'organisation' && recipientId) {
            // Admin sending to an organisation - use that organisation
            documentOrgId = parseInt(recipientId);
          } else if (recipientType === 'user' && recipientId) {
            // Admin sending to a specific user - use the recipient's organisation
            const recipientUser = await storage.getUser(recipientId);
            if (recipientUser && recipientUser.organisationId) {
              documentOrgId = recipientUser.organisationId;
            }
          }
          
          if (documentOrgId) {
            await storage.createDocument({
              caseId: messageData.caseId || null,
              fileName: attachmentFinalFileName || req.file.originalname,
              fileSize: req.file.size,
              fileType: req.file.mimetype,
              filePath: req.file.path,
              uploadedBy: userId,
              organisationId: documentOrgId,
            });
          } else {
            console.warn("Could not determine organisation for document, attachment not saved as document");
          }
        } catch (docError) {
          console.error("Failed to save message attachment as document:", docError);
          // Don't fail the message creation if document save fails
        }
      }
      
      // Send email notifications
      if (!user.isAdmin) {
        // User-to-admin notification - route to case handler's email if available
        // Do NOT notify other users associated with the case - only admin receives user messages
        try {
          // Get case reference and details if this is a case-specific message
          let caseReference = undefined;
          let caseDetails = undefined;
          let caseHandler: string | null = null;
          let organisationName = "Unknown Organisation";
          
          if (messageData.caseId) {
            const messageCase = await storage.getCaseById(messageData.caseId);
            if (messageCase) {
              caseReference = messageCase.accountNumber;
              caseHandler = messageCase.assignedTo;
              
              // Get organisation name from the case's organisation
              const caseOrg = await storage.getOrganisation(messageCase.organisationId);
              if (caseOrg) {
                organisationName = caseOrg.name;
              }
              
              caseDetails = {
                caseName: messageCase.caseName,
                debtorType: messageCase.debtorType,
                originalAmount: messageCase.originalAmount.toString(),
                outstandingAmount: messageCase.outstandingAmount.toString(),
                status: messageCase.status,
                stage: messageCase.stage,
                assignedTo: messageCase.assignedTo || 'Not assigned',
              };
            }
          } else {
            // Non-case message - try to get org from user
            if (user.organisationId) {
              const userOrg = await storage.getOrganisation(user.organisationId);
              if (userOrg) {
                organisationName = userOrg.name;
              }
            } else {
              // Check junction table
              const userOrgs = await storage.getUserOrganisations(userId);
              if (userOrgs.length > 0) {
                const firstOrg = await storage.getOrganisation(userOrgs[0].organisationId);
                if (firstOrg) {
                  organisationName = firstOrg.name;
                }
              }
            }
          }
          
          // Route to case handler's email if available, otherwise default
          const adminEmail = await getAdminEmailForCase(caseHandler);

          // Prepare attachment data if present
          let attachmentData = undefined;
          if (messageData.attachmentFileName && messageData.attachmentFilePath) {
            attachmentData = {
              fileName: messageData.attachmentFileName,
              filePath: messageData.attachmentFilePath,
              fileSize: messageData.attachmentFileSize || 0,
              fileType: messageData.attachmentFileType || 'application/octet-stream',
            };
          }

          // Send email notification only to admin email - no other users
          await sendGridEmailService.sendMessageNotification(
            {
              userEmail: user.email || '',
              userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '',
              messageSubject: messageData.subject || '',
              messageContent: messageData.content,
              caseReference,
              caseDetails,
              organisationName,
              attachment: attachmentData,
            },
            adminEmail
          );
        } catch (emailError) {
          // Log email error but don't fail the message creation
          console.error("Failed to send user-to-admin email notification:", emailError);
        }
      } else {
        // Admin-to-user notification (new functionality)
        try {
          // If admin is sending to a specific user, notify them
          if (recipientType === 'user') {
            const recipientUser = await storage.getUser(recipientId);
            // Only send emails to users who have logged in (mustChangePassword = false) and have notifications enabled
            // Also check if this case is muted by the user or if user is blocked from the case
            const isCaseMuted = messageData.caseId ? await storage.isCaseMuted(recipientId, messageData.caseId) : false;
            const isBlockedFromCase = messageData.caseId ? await storage.isUserBlockedFromCase(recipientId, messageData.caseId) : false;
            if (recipientUser && recipientUser.email && !recipientUser.isAdmin && recipientUser.emailNotifications !== false && !recipientUser.mustChangePassword && !isCaseMuted && !isBlockedFromCase) {
              // Get organisation name
              let organisationName = "Unknown Organisation";
              if (recipientUser.organisationId) {
                const organisation = await storage.getOrganisation(recipientUser.organisationId);
                if (organisation) {
                  organisationName = organisation.name;
                }
              }

              // Get case reference and details if this is a case-specific message
              let caseReference = undefined;
              let caseDetails = undefined;
              if (messageData.caseId) {
                const messageCase = await storage.getCaseById(messageData.caseId);
                if (messageCase) {
                  caseReference = messageCase.accountNumber;
                  caseDetails = {
                    caseName: messageCase.caseName,
                    debtorType: messageCase.debtorType,
                    originalAmount: messageCase.originalAmount,
                    outstandingAmount: messageCase.outstandingAmount,
                    status: messageCase.status,
                    stage: messageCase.stage,
                    caseHandler: messageCase.assignedTo || undefined,
                  };
                }
              }

              // Prepare attachment data if present
              let adminAttachmentData = undefined;
              if (messageData.attachmentFileName && messageData.attachmentFilePath) {
                adminAttachmentData = {
                  fileName: messageData.attachmentFileName,
                  filePath: messageData.attachmentFilePath,
                  fileSize: messageData.attachmentFileSize || 0,
                  fileType: messageData.attachmentFileType || 'application/octet-stream',
                };
              }

              // Send admin-to-user notification
              await sendGridEmailService.sendAdminToUserNotification({
                adminName: `${user.firstName} ${user.lastName}`.trim() || user.email,
                adminEmail: user.email,
                userEmail: recipientUser.email!,
                userName: `${recipientUser.firstName} ${recipientUser.lastName}`.trim() || recipientUser.email!,
                messageSubject: messageData.subject,
                messageContent: messageData.content,
                caseReference,
                caseDetails,
                organisationName,
                attachment: adminAttachmentData,
              });
            }
          } else if (recipientType === 'organisation') {
            // Admin sending to organisation - notify all non-admin users in that organisation
            // Use getUsersByOrganisationId which properly checks both legacy organisationId and junction table
            const orgUsers = await storage.getUsersByOrganisationId(parseInt(recipientId));
            // Only send emails to users who have logged in (mustChangePassword = false) and have notifications enabled
            const organisationUsers = orgUsers.filter(u => 
              !u.isAdmin && u.email && u.emailNotifications !== false && !u.mustChangePassword
            );

            if (organisationUsers.length > 0) {
              // Get organisation name
              let organisationName = "Unknown Organisation";
              const organisation = await storage.getOrganisation(parseInt(recipientId));
              if (organisation) {
                organisationName = organisation.name;
              }

              // Get case reference and details if this is a case-specific message
              let caseReference = undefined;
              let caseDetails = undefined;
              if (messageData.caseId) {
                const messageCase = await storage.getCaseById(messageData.caseId);
                if (messageCase) {
                  caseReference = messageCase.accountNumber;
                  caseDetails = {
                    caseName: messageCase.caseName,
                    debtorType: messageCase.debtorType,
                    originalAmount: messageCase.originalAmount,
                    outstandingAmount: messageCase.outstandingAmount,
                    status: messageCase.status,
                    stage: messageCase.stage,
                    caseHandler: messageCase.assignedTo || undefined,
                  };
                }
              }

              // Prepare attachment data if present
              let orgAttachmentData = undefined;
              if (messageData.attachmentFileName && messageData.attachmentFilePath) {
                orgAttachmentData = {
                  fileName: messageData.attachmentFileName,
                  filePath: messageData.attachmentFilePath,
                  fileSize: messageData.attachmentFileSize || 0,
                  fileType: messageData.attachmentFileType || 'application/octet-stream',
                };
              }

              // Send notification to each user in the organisation (skip if case is muted or user is blocked)
              for (const orgUser of organisationUsers) {
                // Check if this case is muted by the user or if user is blocked from the case
                const isCaseMuted = messageData.caseId ? await storage.isCaseMuted(orgUser.id, messageData.caseId) : false;
                const isBlockedFromCase = messageData.caseId ? await storage.isUserBlockedFromCase(orgUser.id, messageData.caseId) : false;
                if (isCaseMuted) {
                  console.log(`Skipping notification for user ${orgUser.id} - case ${messageData.caseId} is muted`);
                  continue;
                }
                if (isBlockedFromCase) {
                  console.log(`Skipping notification for user ${orgUser.id} - user is blocked from case ${messageData.caseId}`);
                  continue;
                }
                await sendGridEmailService.sendAdminToUserNotification({
                  adminName: `${user.firstName} ${user.lastName}`.trim() || user.email,
                  adminEmail: user.email,
                  userEmail: orgUser.email!,
                  userName: `${orgUser.firstName} ${orgUser.lastName}`.trim() || orgUser.email!,
                  messageSubject: messageData.subject,
                  messageContent: messageData.content,
                  caseReference,
                  caseDetails,
                  organisationName,
                  attachment: orgAttachmentData,
                });
              }
            }
          }
        } catch (emailError) {
          // Log email error but don't fail the message creation
          console.error("Failed to send admin-to-user email notification:", emailError);
        }
      }
      
      // Log user activity for sending message
      try {
        await storage.logUserActivity({
          userId,
          action: 'MESSAGE_SENT',
          details: `Sent message: ${messageData.subject || 'No subject'}${messageData.caseId ? ` (Case ID: ${messageData.caseId})` : ''}`,
          ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
        });
      } catch (logErr) {
        console.error('Failed to log message activity:', logErr);
      }
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.put('/api/messages/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Verify the user has access to this message before marking as read
      const userMessages = await storage.getMessagesForUser(userId);
      const hasAccess = userMessages.some(m => m.id === messageId);
      
      if (!hasAccess) {
        return res.status(404).json({ message: "Message not found or access denied" });
      }
      
      await storage.markMessageAsRead(messageId);
      res.json({ message: "Message marked as read" });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.get('/api/messages/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Use the secure getMessagesForUser function which already includes proper organisation access control
      const userMessages = await storage.getMessagesForUser(userId);
      const message = userMessages.find(m => m.id === messageId);
      
      if (!message || !message.attachmentFilePath) {
        return res.status(404).json({ message: "File not found or access denied" });
      }

      const filePath = path.join(__dirname, '..', message.attachmentFilePath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.download(filePath, message.attachmentFileName);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Documents routes
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const documents = await storage.getDocumentsForUser(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/documents/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all organisation IDs the user has access to (both legacy and junction table)
      const userOrgs = await storage.getUserOrganisations(userId);
      const allUserOrgIds = new Set<number>();
      
      // Add legacy organisation if exists
      if (user.organisationId) {
        allUserOrgIds.add(user.organisationId);
      }
      
      // Add junction table organisations
      userOrgs.forEach(uo => allUserOrgIds.add(uo.organisationId));
      
      // Only require organisations for non-admin users
      if (!user.isAdmin && allUserOrgIds.size === 0) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const caseId = parseInt(req.body.caseId);
      
      if (!caseId || isNaN(caseId)) {
        return res.status(400).json({ message: "Case ID is required" });
      }

      // For admins, find the case in any organisation
      // For regular users, verify case belongs to one of their organisations
      let case_ = null;
      let caseOrgId = null;
      
      if (user.isAdmin) {
        // Admins can upload to any case - search all organisations
        const allOrgs = await storage.getAllOrganisations();
        for (const org of allOrgs) {
          case_ = await storage.getCase(caseId, org.id);
          if (case_) {
            caseOrgId = org.id;
            break;
          }
        }
      } else {
        // Regular users - check their assigned organisations
        for (const orgId of allUserOrgIds) {
          case_ = await storage.getCase(caseId, orgId);
          if (case_) {
            caseOrgId = orgId;
            break;
          }
        }
      }
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Use custom filename if provided, otherwise use original
      const finalFileName = req.body.customFileName || req.file.originalname;

      const document = await storage.createDocument({
        caseId,
        fileName: finalFileName,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        uploadedBy: userId,
        organisationId: caseOrgId!,
      });

      // Handle email notifications
      const notifyAdmin = req.body.notifyAdmin === 'true' || req.body.notifyAdmin === true;
      const notifyUsers = req.body.notifyUsers === 'true' || req.body.notifyUsers === true;
      
      // Get organisation name for email
      const org = await storage.getOrganisation(caseOrgId!);
      const organisationName = org?.name || 'Unknown Organisation';
      
      if (!user.isAdmin && notifyAdmin) {
        // User uploaded - notify case handler or default admin
        try {
          const adminEmail = await getAdminEmailForCase(case_.assignedTo);
          await sendGridEmailService.sendDocumentUploadNotificationToAdmin({
            uploaderName: `${user.firstName} ${user.lastName}`,
            uploaderEmail: user.email,
            organisationName,
            fileName: finalFileName,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            filePath: req.file.path,
            caseReference: case_.accountNumber,
            caseName: case_.caseName,
            uploadedAt: new Date(),
          }, adminEmail);
          console.log(`[Documents] Sent document upload notification to ${adminEmail}`);
        } catch (emailError) {
          console.error('[Documents] Failed to send admin notification:', emailError);
        }
      } else if (user.isAdmin && notifyUsers) {
        // Admin uploaded - notify users in the organisation who have notifications enabled
        try {
          const orgUsers = await storage.getUsersByOrganisationId(caseOrgId!);
          for (const orgUser of orgUsers) {
            // Check if this case is muted by the user or if user is blocked from the case
            const isCaseMuted = case_.id ? await storage.isCaseMuted(orgUser.id, case_.id) : false;
            const isBlockedFromCase = case_.id ? await storage.isUserBlockedFromCase(orgUser.id, case_.id) : false;
            if (isCaseMuted) {
              console.log(`[Documents] Skipping notification for user ${orgUser.id} - case ${case_.id} is muted`);
              continue;
            }
            if (isBlockedFromCase) {
              console.log(`[Documents] Skipping notification for user ${orgUser.id} - user is blocked from case ${case_.id}`);
              continue;
            }
            if (!orgUser.isAdmin && orgUser.documentNotifications !== false) {
              await sendGridEmailService.sendDocumentUploadNotificationToUser({
                uploaderName: 'Acclaim Credit Management',
                uploaderEmail: 'email@acclaim.law',
                organisationName,
                fileName: finalFileName,
                fileSize: req.file.size,
                fileType: req.file.mimetype,
                filePath: req.file.path,
                caseReference: case_.accountNumber,
                caseName: case_.caseName,
                uploadedAt: new Date(),
              }, orgUser.email);
              console.log(`[Documents] Sent document upload notification to user: ${orgUser.email}`);
            }
          }
        } catch (emailError) {
          console.error('[Documents] Failed to send user notifications:', emailError);
        }
      }

      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Organisation-level documents (not linked to any case)
  app.get('/api/organisation/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all organisation IDs the user has access to (deduplicated)
      const userOrgs = await storage.getUserOrganisations(userId);
      const orgIdSet = new Set<number>();
      
      if (user.organisationId) {
        orgIdSet.add(user.organisationId);
      }
      userOrgs.forEach(uo => orgIdSet.add(uo.organisationId));
      const allUserOrgIds = Array.from(orgIdSet);
      
      if (allUserOrgIds.length === 0 && !user.isAdmin) {
        return res.json([]);
      }

      // For admins, get all org documents; for regular users, get from their orgs
      let allDocs: any[] = [];
      
      if (user.isAdmin) {
        const allOrgs = await storage.getAllOrganisations();
        for (const org of allOrgs) {
          const docs = await storage.getOrganisationOnlyDocuments(org.id);
          allDocs = allDocs.concat(docs.map(d => ({ ...d, organisationName: org.name })));
        }
      } else {
        for (const orgId of allUserOrgIds) {
          const org = await storage.getOrganisation(orgId);
          const docs = await storage.getOrganisationOnlyDocuments(orgId);
          allDocs = allDocs.concat(docs.map(d => ({ ...d, organisationName: org?.name || 'Unknown' })));
        }
      }
      
      // Sort by creation date
      allDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(allDocs);
    } catch (error) {
      console.error("Error fetching organisation documents:", error);
      res.status(500).json({ message: "Failed to fetch organisation documents" });
    }
  });

  app.post('/api/organisation/documents/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all organisation IDs the user has access to (deduplicated)
      const userOrgs = await storage.getUserOrganisations(userId);
      const orgIdSet = new Set<number>();
      
      if (user.organisationId) {
        orgIdSet.add(user.organisationId);
      }
      userOrgs.forEach(uo => orgIdSet.add(uo.organisationId));
      const allUserOrgIds = Array.from(orgIdSet);
      
      if (allUserOrgIds.length === 0 && !user.isAdmin) {
        return res.status(400).json({ message: "No organisation assigned to user" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Determine which organisation to upload to
      let targetOrgId: number;
      const requestedOrgId = req.body.organisationId ? parseInt(req.body.organisationId) : null;
      
      if (requestedOrgId) {
        // User specified an org - verify they have access
        if (user.isAdmin || allUserOrgIds.includes(requestedOrgId)) {
          targetOrgId = requestedOrgId;
        } else {
          return res.status(403).json({ message: "You don't have access to this organisation" });
        }
      } else {
        // Use the first available org
        targetOrgId = allUserOrgIds[0];
      }

      // Use custom filename if provided, otherwise use original
      const orgDocFileName = req.body.customFileName || req.file.originalname;

      const document = await storage.createDocument({
        caseId: null, // No case - organisation-level document
        fileName: orgDocFileName,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        uploadedBy: userId,
        organisationId: targetOrgId,
      });

      // Handle email notifications
      const notifyAdmin = req.body.notifyAdmin === 'true' || req.body.notifyAdmin === true;
      const notifyUsers = req.body.notifyUsers === 'true' || req.body.notifyUsers === true;
      
      // Get organisation name for email
      const org = await storage.getOrganisation(targetOrgId);
      const organisationName = org?.name || 'Unknown Organisation';
      
      if (!user.isAdmin && notifyAdmin) {
        // User uploaded - notify admins
        try {
          await sendGridEmailService.sendDocumentUploadNotificationToAdmin({
            uploaderName: `${user.firstName} ${user.lastName}`,
            uploaderEmail: user.email,
            organisationName,
            fileName: orgDocFileName,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            filePath: req.file.path,
            uploadedAt: new Date(),
          }, 'email@acclaim.law');
          console.log('[OrgDocuments] Sent document upload notification to admin');
        } catch (emailError) {
          console.error('[OrgDocuments] Failed to send admin notification:', emailError);
        }
      } else if (user.isAdmin && notifyUsers) {
        // Admin uploaded - notify users in the organisation who have notifications enabled
        try {
          const orgUsers = await storage.getUsersByOrganisationId(targetOrgId);
          for (const orgUser of orgUsers) {
            if (!orgUser.isAdmin && orgUser.documentNotifications !== false) {
              await sendGridEmailService.sendDocumentUploadNotificationToUser({
                uploaderName: 'Acclaim Credit Management',
                uploaderEmail: 'email@acclaim.law',
                organisationName,
                fileName: orgDocFileName,
                fileSize: req.file.size,
                fileType: req.file.mimetype,
                filePath: req.file.path,
                uploadedAt: new Date(),
              }, orgUser.email);
              console.log(`[OrgDocuments] Sent document upload notification to user: ${orgUser.email}`);
            }
          }
        } catch (emailError) {
          console.error('[OrgDocuments] Failed to send user notifications:', emailError);
        }
      }

      res.json(document);
    } catch (error) {
      console.error("Error uploading organisation document:", error);
      res.status(500).json({ message: "Failed to upload organisation document" });
    }
  });

  app.get('/api/documents/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const documentId = parseInt(req.params.id);
      
      // Get all user's organisation IDs (both legacy and junction table)
      const userOrgs = await storage.getUserOrganisations(userId);
      const allUserOrgIds = new Set<number>();
      if (user.organisationId) {
        allUserOrgIds.add(user.organisationId);
      }
      userOrgs.forEach(uo => allUserOrgIds.add(uo.organisationId));

      // Get the document directly
      const document = await storage.getDocumentById(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check access: admin can access all, regular users need org match
      if (!user.isAdmin) {
        if (document.organisationId && !allUserOrgIds.has(document.organisationId)) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Check if file exists
      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }

      // Log the download to audit log for tracking
      try {
        await storage.logAuditEvent({
          tableName: 'documents',
          recordId: documentId.toString(),
          operation: 'DOWNLOAD',
          fieldName: 'file',
          oldValue: null,
          newValue: document.fileName,
          userId: userId,
          userEmail: user.email,
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          organisationId: document.organisationId,
          description: `Document "${document.fileName}" downloaded by ${user.firstName} ${user.lastName} (${user.isAdmin ? 'admin' : 'user'})`
        });
      } catch (auditError) {
        console.error("Failed to log document download:", auditError);
        // Continue with download even if audit logging fails
      }

      res.download(document.filePath, document.fileName);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Delete document (with permission check)
  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const documentId = parseInt(req.params.id);
      
      // Get all user's organisation IDs (both legacy and junction table)
      const userOrgs = await storage.getUserOrganisations(userId);
      const allUserOrgIds = new Set<number>();
      if (user.organisationId) {
        allUserOrgIds.add(user.organisationId);
      }
      userOrgs.forEach(uo => allUserOrgIds.add(uo.organisationId));

      // Get the document directly
      const document = await storage.getDocumentById(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check access: admin can delete all, regular users need org match
      if (!user.isAdmin) {
        if (document.organisationId && !allUserOrgIds.has(document.organisationId)) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Delete the file from disk if it exists
      if (document.filePath && fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }

      // Delete from database
      await storage.deleteDocumentById(documentId);

      res.status(200).json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.get('/api/cases/:id/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const caseId = parseInt(req.params.id);
      let case_;
      
      if (user.isAdmin) {
        // Admin can access any case across all organisations
        case_ = await storage.getCaseById(caseId);
      } else {
        // Regular users can access cases from any of their assigned organisations
        const userCases = await storage.getCasesForUser(userId);
        case_ = userCases.find(c => c.id === caseId);
      }
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }

      const documents = await storage.getDocumentsForCase(caseId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching case documents:", error);
      res.status(500).json({ message: "Failed to fetch case documents" });
    }
  });

  app.post('/api/cases/:id/documents', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const caseId = parseInt(req.params.id);
      let case_;
      let caseOrgId: number | null = null;
      
      if (user.isAdmin) {
        // Admin can access any case across all organisations
        case_ = await storage.getCaseById(caseId);
        if (case_) {
          caseOrgId = case_.organisationId;
        }
      } else {
        // Regular users - check their assigned organisations
        if (!user.organisationId) {
          return res.status(404).json({ message: "User organisation not found" });
        }
        case_ = await storage.getCase(caseId, user.organisationId);
        caseOrgId = user.organisationId;
      }
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Use custom filename if provided, otherwise use original
      const caseDocFileName = req.body.customFileName || req.file.originalname;

      const document = await storage.createDocument({
        caseId,
        fileName: caseDocFileName,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        uploadedBy: userId,
        organisationId: caseOrgId!,
      });

      // Handle email notifications
      const notifyAdmin = req.body.notifyAdmin === 'true' || req.body.notifyAdmin === true;
      const notifyUsers = req.body.notifyUsers === 'true' || req.body.notifyUsers === true;
      
      // Get organisation name for email
      const org = await storage.getOrganisation(caseOrgId!);
      const organisationName = org?.name || 'Unknown Organisation';
      
      if (!user.isAdmin && notifyAdmin) {
        // User uploaded - notify case handler or default admin
        try {
          const adminEmail = await getAdminEmailForCase(case_.assignedTo);
          await sendGridEmailService.sendDocumentUploadNotificationToAdmin({
            uploaderName: `${user.firstName} ${user.lastName}`,
            uploaderEmail: user.email,
            organisationName,
            fileName: caseDocFileName,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            filePath: req.file.path,
            caseReference: case_.accountNumber,
            caseName: case_.caseName,
            uploadedAt: new Date(),
          }, adminEmail);
          console.log(`[Case Documents] Sent document upload notification to ${adminEmail}`);
        } catch (emailError) {
          console.error('[Case Documents] Failed to send admin notification:', emailError);
        }
      } else if (user.isAdmin && notifyUsers) {
        // Admin uploaded - notify users in the organisation who have notifications enabled
        try {
          const orgUsers = await storage.getUsersByOrganisationId(caseOrgId!);
          for (const orgUser of orgUsers) {
            // Check if this case is muted by the user or if user is blocked from the case
            const isCaseMuted = case_.id ? await storage.isCaseMuted(orgUser.id, case_.id) : false;
            const isBlockedFromCase = case_.id ? await storage.isUserBlockedFromCase(orgUser.id, case_.id) : false;
            if (isCaseMuted) {
              console.log(`[Case Documents] Skipping notification for user ${orgUser.id} - case ${case_.id} is muted`);
              continue;
            }
            if (isBlockedFromCase) {
              console.log(`[Case Documents] Skipping notification for user ${orgUser.id} - user is blocked from case ${case_.id}`);
              continue;
            }
            if (!orgUser.isAdmin && orgUser.documentNotifications !== false) {
              await sendGridEmailService.sendDocumentUploadNotificationToUser({
                uploaderName: 'Acclaim Credit Management',
                uploaderEmail: 'email@acclaim.law',
                organisationName,
                fileName: caseDocFileName,
                fileSize: req.file.size,
                fileType: req.file.mimetype,
                filePath: req.file.path,
                caseReference: case_.accountNumber,
                caseName: case_.caseName,
                uploadedAt: new Date(),
              }, orgUser.email);
              console.log(`[Case Documents] Sent document upload notification to user: ${orgUser.email}`);
            }
          }
        } catch (emailError) {
          console.error('[Case Documents] Failed to send user notifications:', emailError);
        }
      }

      // Timeline activities are only created by SOS pushes, not portal actions
      // Document upload does not create timeline entry

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Payment routes
  app.get('/api/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let payments: any[] = [];
      
      if (user.isAdmin) {
        // Admin can access all payments across all organisations
        const allCases = await storage.getAllCases();
        for (const case_ of allCases) {
          const casePayments = await storage.getPaymentsForCase(case_.id);
          payments.push(...casePayments);
        }
      } else {
        // Regular users can access payments from cases across all their assigned organisations
        const userCases = await storage.getCasesForUser(userId);
        for (const case_ of userCases) {
          const casePayments = await storage.getPaymentsForCase(case_.id);
          payments.push(...casePayments);
        }
      }

      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.get('/api/cases/:id/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const caseId = parseInt(req.params.id);
      let case_;
      
      if (user.isAdmin) {
        // Admin can access any case across all organisations
        case_ = await storage.getCaseById(caseId);
      } else {
        // Regular users can access cases from any of their assigned organisations
        const userCases = await storage.getCasesForUser(userId);
        case_ = userCases.find(c => c.id === caseId);
      }
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }

      const payments = await storage.getPaymentsForCase(caseId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching case payments:", error);
      res.status(500).json({ message: "Failed to fetch case payments" });
    }
  });

  app.post('/api/cases/:id/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.organisationId) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      const caseId = parseInt(req.params.id);
      const case_ = await storage.getCase(caseId, user.organisationId);
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }

      const payment = await storage.createPayment({
        ...req.body,
        caseId,
        organisationId: user.organisationId,
        recordedBy: userId,
      });

      // Timeline activities are only created by SOS pushes, not portal actions
      // Payment recording does not create timeline entry

      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Admin-only delete routes
  app.delete('/api/admin/messages/:id', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const adminUser = await storage.getUser(req.user.id);
      
      // Get message details for audit log before deletion
      const message = await storage.getMessage(messageId);
      
      await storage.deleteMessage(messageId);
      
      // Log admin action
      if (adminUser && message) {
        const messagePreview = message.content ? message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '') : '';
        await logAdminAction({
          adminUser,
          tableName: 'messages',
          recordId: String(messageId),
          operation: 'DELETE',
          description: `Deleted message: "${messagePreview}"`,
          oldValue: JSON.stringify({ 
            content: message.content?.substring(0, 200), 
            caseId: message.caseId,
            createdAt: message.createdAt 
          }),
          organisationId: message.organisationId || undefined,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  app.delete('/api/admin/documents/:id', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const adminUser = await storage.getUser(req.user.id);
      
      // Get document details for audit log before deletion
      const document = await storage.getDocumentById(documentId);
      
      await storage.deleteDocumentById(documentId);
      
      // Log admin action
      if (adminUser && document) {
        await logAdminAction({
          adminUser,
          tableName: 'documents',
          recordId: String(documentId),
          operation: 'DELETE',
          description: `Deleted document: "${document.name}"`,
          oldValue: JSON.stringify({ 
            name: document.name, 
            caseId: document.caseId,
            uploadedAt: document.uploadedAt 
          }),
          organisationId: document.organisationId || undefined,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      
      // For now, allow any authenticated user to access admin
      // In production, you'd want to check for admin role
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/organisations', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const organisations = await storage.getAllOrganisations();
      res.json(organisations);
    } catch (error) {
      console.error("Error fetching organisations:", error);
      res.status(500).json({ message: "Failed to fetch organisations" });
    }
  });



  app.put('/api/admin/users/:userId/assign', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { userId } = req.params;
      const { organisationId } = req.body;

      if (!organisationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      const user = await storage.assignUserToOrganisation(userId, organisationId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error assigning user to organisation:", error);
      res.status(500).json({ message: "Failed to assign user to organisation" });
    }
  });

  // Enhanced admin user management routes
  
  // Create new user
  app.post('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      
      // Check if email can be assigned admin status (only @chadlaw.co.uk emails)
      if (userData.isAdmin && !userData.email.endsWith('@chadlaw.co.uk')) {
        return res.status(400).json({ 
          message: "Admin privileges can only be assigned to @chadlaw.co.uk email addresses" 
        });
      }

      const result = await storage.createUser(userData);
      
      // Return user info and temporary password (in production, this would be sent via email)
      res.status(201).json({
        user: result,
        tempPassword: result.tempPassword,
        message: "User created successfully. Please provide the temporary password to the user.",
      });
    } catch (error) {
      console.error("Error creating user:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user details
  app.put('/api/admin/users/:userId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const userData = adminUpdateUserSchema.parse(req.body);
      
      // Check if target user is an admin
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only super admins can change admin users' first/last names
      if (targetUser.isAdmin && !req.user.isSuperAdmin) {
        // Non-super admin trying to edit an admin user's name - strip firstName and lastName
        delete userData.firstName;
        delete userData.lastName;
      }
      
      // Only super admins can change email addresses (for any user)
      if (userData.email && !req.user.isSuperAdmin) {
        return res.status(403).json({ message: "Only super admins can change email addresses" });
      }
      
      // Check email uniqueness if email is being changed
      if (userData.email && userData.email !== targetUser.email) {
        const existingUser = await storage.getUserByEmail(userData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email address is already in use by another user" });
        }
      }

      const user = await storage.updateUser(userId, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Make user admin (only for @chadlaw.co.uk emails)
  app.put('/api/admin/users/:userId/make-admin', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const adminUser = await storage.getUser(req.user.id);
      
      // Check if user has @chadlaw.co.uk email
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!existingUser.email?.endsWith('@chadlaw.co.uk')) {
        return res.status(400).json({ 
          message: "Admin privileges can only be assigned to @chadlaw.co.uk email addresses" 
        });
      }

      const user = await storage.makeUserAdmin(userId);
      
      // Log admin action
      if (adminUser) {
        const userName = [existingUser.firstName, existingUser.lastName].filter(Boolean).join(' ') || existingUser.email;
        await logAdminAction({
          adminUser,
          tableName: 'users',
          recordId: userId,
          operation: 'UPDATE',
          fieldName: 'isAdmin',
          description: `Granted admin privileges to user "${userName}"`,
          oldValue: 'false',
          newValue: 'true',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ user, message: "User granted admin privileges" });
    } catch (error) {
      console.error("Error making user admin:", error);
      res.status(500).json({ message: "Failed to grant admin privileges" });
    }
  });

  // Remove admin privileges
  app.put('/api/admin/users/:userId/remove-admin', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const adminUser = await storage.getUser(req.user.id);
      const existingUser = await storage.getUser(userId);
      
      const user = await storage.removeUserAdmin(userId);
      
      // Log admin action
      if (adminUser && existingUser) {
        const userName = [existingUser.firstName, existingUser.lastName].filter(Boolean).join(' ') || existingUser.email;
        await logAdminAction({
          adminUser,
          tableName: 'users',
          recordId: userId,
          operation: 'UPDATE',
          fieldName: 'isAdmin',
          description: `Removed admin privileges from user "${userName}"`,
          oldValue: 'true',
          newValue: 'false',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ user, message: "Admin privileges removed" });
    } catch (error) {
      console.error("Error removing admin privileges:", error);
      res.status(500).json({ message: "Failed to remove admin privileges" });
    }
  });

  // Toggle super admin status (super admin only)
  app.put('/api/admin/users/:userId/super-admin', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { isSuperAdmin: newSuperAdminStatus } = req.body;
      const adminUser = await storage.getUser(req.user.id);
      
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Cannot demote yourself as super admin
      if (userId === req.user.id && !newSuperAdminStatus) {
        return res.status(400).json({ message: "You cannot remove your own super admin privileges" });
      }

      // Ensure at least one super admin remains when removing super admin status
      if (!newSuperAdminStatus && existingUser.isSuperAdmin) {
        const allUsers = await storage.getAllUsers();
        const superAdminCount = allUsers.filter(u => u.isSuperAdmin).length;
        if (superAdminCount <= 1) {
          return res.status(400).json({ 
            message: "Cannot remove the last super admin. Please assign another super admin first." 
          });
        }
      }

      // Only @chadlaw.co.uk emails can be super admins
      if (newSuperAdminStatus && !existingUser.email?.endsWith('@chadlaw.co.uk')) {
        return res.status(400).json({ 
          message: "Super admin privileges can only be assigned to @chadlaw.co.uk email addresses" 
        });
      }

      const user = await storage.updateSuperAdminStatus(userId, newSuperAdminStatus);
      
      // Log admin action
      if (adminUser) {
        const userName = [existingUser.firstName, existingUser.lastName].filter(Boolean).join(' ') || existingUser.email;
        await logAdminAction({
          adminUser,
          tableName: 'users',
          recordId: userId,
          operation: 'UPDATE',
          fieldName: 'isSuperAdmin',
          description: newSuperAdminStatus 
            ? `Granted super admin privileges to user "${userName}"`
            : `Removed super admin privileges from user "${userName}"`,
          oldValue: String(existingUser.isSuperAdmin || false),
          newValue: String(newSuperAdminStatus),
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ 
        user, 
        message: newSuperAdminStatus ? "Super admin privileges granted" : "Super admin privileges removed" 
      });
    } catch (error) {
      console.error("Error updating super admin status:", error);
      res.status(500).json({ message: "Failed to update super admin privileges" });
    }
  });

  // Toggle case submission permission
  app.put('/api/admin/users/:userId/case-submission', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { canSubmitCases } = req.body;
      
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = await storage.updateUserCaseSubmission(userId, canSubmitCases);
      const action = canSubmitCases ? 'enabled' : 'disabled';
      res.json({ user, message: `Case submission ${action} for user` });
    } catch (error) {
      console.error("Error updating case submission permission:", error);
      res.status(500).json({ message: "Failed to update case submission permission" });
    }
  });

  // Reset user password (admin function)
  app.post('/api/admin/users/:userId/reset-password', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const adminUser = await storage.getUser(req.user.id);
      const targetUser = await storage.getUser(userId);
      
      const tempPassword = await storage.resetUserPassword(userId);
      
      // Log admin action
      if (adminUser && targetUser) {
        const userName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || targetUser.email;
        await logAdminAction({
          adminUser,
          tableName: 'users',
          recordId: userId,
          operation: 'UPDATE',
          fieldName: 'password',
          description: `Reset password for user "${userName}"`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ 
        tempPassword, 
        message: "Password reset successfully. Please provide the temporary password to the user." 
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Send welcome emails to a user (welcome email + separate temporary password email)
  app.post('/api/admin/users/:userId/send-welcome-email', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { temporaryPassword } = req.body; // Optional: passed from the create user flow
      const currentUser = req.user;

      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's organisation - check both junction table and legacy organisationId field
      const userOrgs = await storage.getUserOrganisations(userId);
      let organisation = null;
      
      if (userOrgs && userOrgs.length > 0) {
        // Use first organisation from junction table
        organisation = userOrgs[0];
      } else if (user.organisationId) {
        // Fall back to legacy organisationId on user record
        organisation = await storage.getOrganisation(user.organisationId);
      }
      
      if (!organisation) {
        return res.status(400).json({ message: "User must be assigned to an organisation before sending welcome email" });
      }

      // Get admin details
      const admin = await storage.getUser(currentUser.id);
      if (!admin) {
        return res.status(500).json({ message: "Admin user not found" });
      }

      // Determine password to use: passed from request, or stored temporary password
      const passwordToSend = temporaryPassword || user.temporaryPassword;
      if (!passwordToSend) {
        return res.status(400).json({ message: "No temporary password available. Please reset the user's password first." });
      }

      const welcomeEmailData = {
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        temporaryPassword: passwordToSend,
        organisationName: organisation.name,
        adminName: `${admin.firstName} ${admin.lastName}`,
        portalUrl: 'https://acclaim-api.azurewebsites.net/auth'
      };

      const passwordEmailData = {
        userEmail: user.email,
        firstName: user.firstName,
        temporaryPassword: passwordToSend
      };

      // Send both emails
      let welcomeEmailSent = false;
      let passwordEmailSent = false;

      // Send welcome email first
      try {
        welcomeEmailSent = await sendGridEmailService.sendWelcomeEmail(welcomeEmailData);
      } catch (error) {
        console.error("SendGrid welcome email failed:", error);
      }

      if (!welcomeEmailSent) {
        welcomeEmailSent = await emailService.sendWelcomeEmail(welcomeEmailData);
      }

      // Send temporary password email
      try {
        passwordEmailSent = await sendGridEmailService.sendTemporaryPasswordEmail(passwordEmailData);
      } catch (error) {
        console.error("SendGrid temporary password email failed:", error);
      }

      if (!passwordEmailSent) {
        // Fallback to console logging for password email
        console.log(`[Email] Temporary password email would be sent to ${user.email} with password: ${passwordToSend}`);
        passwordEmailSent = true; // Consider console logging as success for fallback
      }

      if (welcomeEmailSent && passwordEmailSent) {
        res.json({ 
          message: `Welcome emails sent successfully to ${user.email}`,
          recipient: {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            organisation: organisation.name
          },
          emailsSent: {
            welcome: true,
            temporaryPassword: true
          }
        });
      } else if (welcomeEmailSent) {
        res.json({ 
          message: `Welcome email sent but temporary password email failed`,
          partial: true,
          emailsSent: {
            welcome: true,
            temporaryPassword: false
          }
        });
      } else {
        res.status(500).json({ message: "Failed to send welcome emails" });
      }

    } catch (error) {
      console.error("Error sending welcome emails:", error);
      res.status(500).json({ message: "Failed to send welcome emails" });
    }
  });

  // Send just the temporary password email (for password resets)
  app.post('/api/admin/users/:userId/send-password-email', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { temporaryPassword } = req.body;

      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Determine password to use: passed from request, or stored temporary password
      const passwordToSend = temporaryPassword || user.temporaryPassword;
      if (!passwordToSend) {
        return res.status(400).json({ message: "No temporary password available." });
      }

      const passwordEmailData = {
        userEmail: user.email,
        firstName: user.firstName,
        temporaryPassword: passwordToSend
      };

      // Send temporary password email
      let passwordEmailSent = false;
      try {
        passwordEmailSent = await sendGridEmailService.sendTemporaryPasswordEmail(passwordEmailData);
      } catch (error) {
        console.error("SendGrid temporary password email failed:", error);
      }

      if (!passwordEmailSent) {
        console.log(`[Email] Temporary password email would be sent to ${user.email} with password: ${passwordToSend}`);
        passwordEmailSent = true;
      }

      if (passwordEmailSent) {
        res.json({ 
          message: `Password email sent successfully to ${user.email}`,
          recipient: {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email
          }
        });
      } else {
        res.status(500).json({ message: "Failed to send password email" });
      }

    } catch (error) {
      console.error("Error sending password email:", error);
      res.status(500).json({ message: "Failed to send password email" });
    }
  });

  // Delete user
  app.delete('/api/admin/users/:userId', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.user;
      const adminUser = await storage.getUser(req.user.id);

      if (currentUser.id === userId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete the user
      await storage.deleteUser(userId);
      
      // Log admin action
      if (adminUser) {
        const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
        await logAdminAction({
          adminUser,
          tableName: 'users',
          recordId: userId,
          operation: 'DELETE',
          description: `Deleted user "${userName}" (${user.email})`,
          oldValue: JSON.stringify({ 
            email: user.email, 
            firstName: user.firstName, 
            lastName: user.lastName,
            isAdmin: user.isAdmin 
          }),
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }

      res.json({ message: `User ${user.firstName} ${user.lastName} has been permanently deleted` });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Organization Management Routes (Admin only)
  
  // Create organisation
  app.post('/api/admin/organisations', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      console.log('Creating organisation with data:', JSON.stringify(req.body, null, 2));
      const validatedData = createOrganisationSchema.parse(req.body);
      console.log('Parsed organisation data:', JSON.stringify(validatedData, null, 2));
      
      // Map the data to match database field names
      const orgData = {
        name: validatedData.name,
        externalRef: validatedData.externalRef || null
      };
      console.log('Mapped organisation data for storage:', JSON.stringify(orgData, null, 2));
      
      const organisation = await storage.createOrganisation(orgData);
      console.log('Created organisation:', JSON.stringify(organisation, null, 2));
      
      // Log admin action
      if (adminUser) {
        await logAdminAction({
          adminUser,
          tableName: 'organisations',
          recordId: String(organisation.id),
          operation: 'INSERT',
          description: `Created organisation "${organisation.name}"`,
          newValue: JSON.stringify({ name: organisation.name, externalRef: organisation.externalRef }),
          organisationId: organisation.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.status(201).json(organisation);
    } catch (error) {
      console.error("Error creating organisation:", error);
      res.status(500).json({ message: "Failed to create organisation" });
    }
  });

  // Update organisation
  app.put('/api/admin/organisations/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = parseInt(req.params.id);
      const adminUser = await storage.getUser(req.user.id);
      const existingOrg = await storage.getOrganisation(orgId);
      
      const orgData = updateOrganisationSchema.parse(req.body);
      const organisation = await storage.updateOrganisation(orgId, orgData);
      
      // Log admin action
      if (adminUser && existingOrg) {
        await logAdminAction({
          adminUser,
          tableName: 'organisations',
          recordId: String(orgId),
          operation: 'UPDATE',
          description: `Updated organisation "${existingOrg.name}"`,
          oldValue: JSON.stringify({ name: existingOrg.name, externalRef: existingOrg.externalRef }),
          newValue: JSON.stringify({ name: organisation?.name, externalRef: organisation?.externalRef }),
          organisationId: orgId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json(organisation);
    } catch (error) {
      console.error("Error updating organisation:", error);
      res.status(500).json({ message: "Failed to update organisation" });
    }
  });

  // Delete organisation
  app.delete('/api/admin/organisations/:id', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const orgId = parseInt(req.params.id);
      const adminUser = await storage.getUser(req.user.id);
      const existingOrg = await storage.getOrganisation(orgId);
      
      await storage.deleteOrganisation(orgId);
      
      // Log admin action
      if (adminUser && existingOrg) {
        await logAdminAction({
          adminUser,
          tableName: 'organisations',
          recordId: String(orgId),
          operation: 'DELETE',
          description: `Deleted organisation "${existingOrg.name}"`,
          oldValue: JSON.stringify({ name: existingOrg.name, externalRef: existingOrg.externalRef }),
          organisationId: orgId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting organisation:", error);
      if (error instanceof Error && error.message === "Cannot delete organisation with associated users or cases") {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to delete organisation" });
      }
    }
  });

  // Get organisation stats
  app.get('/api/admin/organisations/:id/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = parseInt(req.params.id);
      const stats = await storage.getOrganisationStats(orgId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching organisation stats:", error);
      res.status(500).json({ message: "Failed to fetch organisation stats" });
    }
  });

  // Get users for a specific organisation (includes both legacy and junction table assignments)
  app.get('/api/admin/organisations/:id/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = parseInt(req.params.id);
      const users = await storage.getUsersByOrganisationId(orgId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching organisation users:", error);
      res.status(500).json({ message: "Failed to fetch organisation users" });
    }
  });

  // Admin: Create org-level scheduled report with custom email recipient
  app.post('/api/admin/organisations/:id/scheduled-reports', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const orgId = parseInt(req.params.id);
      const adminUserId = req.user.id;
      const adminUser = await storage.getUser(adminUserId);
      
      // Validate request body using Zod schema
      const validationResult = orgScheduledReportSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationResult.error.errors 
        });
      }
      
      const validated = validationResult.data;
      const organisation = await storage.getOrganisation(orgId);
      
      // Create the scheduled report with the admin as owner but custom recipient
      const report = await storage.createScheduledReport({
        userId: adminUserId,
        organisationId: orgId,
        enabled: true,
        frequency: validated.frequency,
        dayOfWeek: validated.frequency === 'weekly' ? (validated.dayOfWeek ?? 1) : null,
        dayOfMonth: validated.frequency === 'monthly' ? (validated.dayOfMonth ?? 1) : null,
        timeOfDay: validated.timeOfDay,
        includeCaseSummary: validated.includeCaseSummary,
        includeActivityReport: validated.includeActivityReport,
        caseStatusFilter: validated.caseStatusFilter,
        recipientEmail: validated.recipientEmail,
        recipientName: validated.recipientName || null,
      });
      
      // Log admin action
      if (adminUser && organisation) {
        await logAdminAction({
          adminUser,
          tableName: 'scheduled_reports',
          recordId: String(report.id),
          operation: 'INSERT',
          description: `Created ${validated.frequency} scheduled report for organisation "${organisation.name}" with recipient "${validated.recipientEmail}"`,
          newValue: JSON.stringify({ 
            frequency: validated.frequency, 
            recipientEmail: validated.recipientEmail, 
            recipientName: validated.recipientName,
            organisationName: organisation.name 
          }),
          organisationId: orgId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating org-level scheduled report:", error);
      res.status(500).json({ message: "Failed to create scheduled report" });
    }
  });

  // Admin: Get scheduled reports for a specific organisation
  app.get('/api/admin/organisations/:id/scheduled-reports', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = parseInt(req.params.id);
      const allReports = await storage.getAllScheduledReports();
      
      // Filter reports for this organisation
      const orgReports = allReports.filter(report => report.organisationId === orgId);
      
      // Get user info for each report
      const reportsWithUsers = await Promise.all(
        orgReports.map(async (report) => {
          const user = await storage.getUser(report.userId);
          return {
            ...report,
            userEmail: user?.email,
            userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
          };
        })
      );
      res.json(reportsWithUsers);
    } catch (error) {
      console.error("Error fetching organisation scheduled reports:", error);
      res.status(500).json({ message: "Failed to fetch organisation scheduled reports" });
    }
  });

  // Admin: Get all users with their scheduled report settings
  app.get('/api/admin/scheduled-reports', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allReports = await storage.getAllScheduledReports();
      // Get user info for each report
      const reportsWithUsers = await Promise.all(
        allReports.map(async (report) => {
          const user = await storage.getUser(report.userId);
          return {
            ...report,
            userEmail: user?.email,
            userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown',
          };
        })
      );
      res.json(reportsWithUsers);
    } catch (error) {
      console.error("Error fetching all scheduled reports:", error);
      res.status(500).json({ message: "Failed to fetch scheduled reports" });
    }
  });

  // Admin: Get all scheduled reports for a specific user
  app.get('/api/admin/users/:userId/scheduled-reports', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const reports = await storage.getScheduledReportsForUser(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching user scheduled reports:", error);
      res.status(500).json({ message: "Failed to fetch user scheduled reports" });
    }
  });

  // Admin: Create a new scheduled report for a user
  app.post('/api/admin/users/:userId/scheduled-reports', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { organisationId, enabled, frequency, dayOfWeek, dayOfMonth, timeOfDay, includeCaseSummary, includeActivityReport, organisationIds, caseStatusFilter } = req.body;
      
      // Validate the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const report = await storage.createScheduledReport({
        userId,
        organisationId: organisationId || null, // null = combined report
        enabled: enabled ?? false,
        frequency: frequency || 'weekly',
        dayOfWeek: dayOfWeek ?? 1,
        dayOfMonth: dayOfMonth ?? 1,
        timeOfDay: timeOfDay ?? 9,
        includeCaseSummary: includeCaseSummary ?? true,
        includeActivityReport: includeActivityReport ?? true,
        organisationIds: organisationIds || null, // For combined reports: which orgs to include
        caseStatusFilter: caseStatusFilter || 'active',
      });
      
      res.json(report);
    } catch (error) {
      console.error("Error creating user scheduled report:", error);
      res.status(500).json({ message: "Failed to create user scheduled report" });
    }
  });

  // Admin: Get a specific scheduled report by ID
  app.get('/api/admin/scheduled-reports/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const report = await storage.getScheduledReportById(id);
      if (!report) {
        return res.status(404).json({ message: "Scheduled report not found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error fetching scheduled report:", error);
      res.status(500).json({ message: "Failed to fetch scheduled report" });
    }
  });

  // Admin: Update a specific scheduled report
  app.put('/api/admin/scheduled-reports/:id', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const adminUser = await storage.getUser(req.user.id);
      const { organisationId, enabled, frequency, dayOfWeek, dayOfMonth, timeOfDay, includeCaseSummary, includeActivityReport, organisationIds, caseStatusFilter, recipientEmail, recipientName } = req.body;
      
      const existing = await storage.getScheduledReportById(id);
      if (!existing) {
        return res.status(404).json({ message: "Scheduled report not found" });
      }
      
      // Get organisation name for audit log
      const organisation = existing.organisationId ? await storage.getOrganisation(existing.organisationId) : null;
      const recipientUser = await storage.getUser(existing.userId);
      
      const report = await storage.updateScheduledReport(id, {
        organisationId: organisationId !== undefined ? organisationId : existing.organisationId,
        enabled: enabled ?? existing.enabled,
        frequency: frequency || existing.frequency,
        dayOfWeek: dayOfWeek ?? existing.dayOfWeek,
        dayOfMonth: dayOfMonth ?? existing.dayOfMonth,
        timeOfDay: timeOfDay ?? existing.timeOfDay,
        includeCaseSummary: includeCaseSummary ?? existing.includeCaseSummary,
        includeActivityReport: includeActivityReport ?? existing.includeActivityReport,
        organisationIds: organisationIds !== undefined ? organisationIds : existing.organisationIds,
        caseStatusFilter: caseStatusFilter || existing.caseStatusFilter,
        recipientEmail: recipientEmail !== undefined ? recipientEmail : existing.recipientEmail,
        recipientName: recipientName !== undefined ? recipientName : existing.recipientName,
      });
      
      // Log admin action
      if (adminUser) {
        const recipient = existing.recipientEmail || recipientUser?.email || 'Unknown';
        const orgName = organisation?.name || 'All Organisations';
        await logAdminAction({
          adminUser,
          tableName: 'scheduled_reports',
          recordId: String(id),
          operation: 'UPDATE',
          description: `Updated scheduled report for "${orgName}" (recipient: ${recipient})`,
          oldValue: JSON.stringify({ 
            frequency: existing.frequency, 
            enabled: existing.enabled,
            recipientEmail: existing.recipientEmail 
          }),
          newValue: JSON.stringify({ 
            frequency: frequency || existing.frequency, 
            enabled: enabled ?? existing.enabled,
            recipientEmail: recipientEmail || existing.recipientEmail 
          }),
          organisationId: existing.organisationId || undefined,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error updating scheduled report:", error);
      res.status(500).json({ message: "Failed to update scheduled report" });
    }
  });

  // Admin: Delete a specific scheduled report
  app.delete('/api/admin/scheduled-reports/:id', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const adminUser = await storage.getUser(req.user.id);
      
      const existing = await storage.getScheduledReportById(id);
      if (!existing) {
        return res.status(404).json({ message: "Scheduled report not found" });
      }
      
      // Get details for audit log before deletion
      const organisation = existing.organisationId ? await storage.getOrganisation(existing.organisationId) : null;
      const recipientUser = await storage.getUser(existing.userId);
      
      await storage.deleteScheduledReport(id);
      
      // Log admin action
      if (adminUser) {
        const recipient = existing.recipientEmail || recipientUser?.email || 'Unknown';
        const orgName = organisation?.name || 'All Organisations';
        await logAdminAction({
          adminUser,
          tableName: 'scheduled_reports',
          recordId: String(id),
          operation: 'DELETE',
          description: `Deleted ${existing.frequency} scheduled report for "${orgName}" (recipient: ${recipient})`,
          oldValue: JSON.stringify({ 
            frequency: existing.frequency, 
            recipientEmail: existing.recipientEmail,
            recipientName: existing.recipientName,
            organisationName: orgName
          }),
          organisationId: existing.organisationId || undefined,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting scheduled report:", error);
      res.status(500).json({ message: "Failed to delete scheduled report" });
    }
  });

  // Admin: Send test scheduled report for a specific report
  app.post('/api/admin/scheduled-reports/:id/test-send', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const report = await storage.getScheduledReportById(id);
      if (!report) {
        return res.status(404).json({ message: "Scheduled report not found" });
      }
      
      const user = await storage.getUser(report.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { generateScheduledReportForId } = await import("./scheduled-reports");
      await generateScheduledReportForId(id);
      
      // Show actual recipient email (recipientEmail for org-level, user email for user-level)
      const actualRecipient = report.recipientEmail || user.email;
      res.json({ success: true, message: `Test report sent to ${actualRecipient}` });
    } catch (error) {
      console.error("Error sending test report:", error);
      res.status(500).json({ message: "Failed to send test report" });
    }
  });

  // Admin: Get audit logs for a specific scheduled report
  app.get('/api/admin/scheduled-reports/:id/audit-logs', isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const id = req.params.id;
      const auditLogs = await storage.getAuditLogs({ tableName: 'scheduled_reports', recordId: id });
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching report audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Admin endpoint to set user role in organisation
  app.put('/api/admin/users/:userId/organisations/:orgId/role', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId, orgId } = req.params;
      const { role } = req.body;
      const adminUser = await storage.getUser(req.user.id);
      
      if (!role || !['member', 'owner'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'member' or 'owner'" });
      }
      
      // Get current role for audit log
      const targetUser = await storage.getUser(userId);
      const organisation = await storage.getOrganisation(parseInt(orgId));
      const currentUserOrgs = await storage.getUserOrganisations(userId);
      const currentOrgAssignment = currentUserOrgs.find(uo => uo.organisationId === parseInt(orgId));
      const oldRole = currentOrgAssignment?.role || 'member';
      
      const userOrg = await storage.setUserOrgRole(userId, parseInt(orgId), role);
      if (!userOrg) {
        return res.status(404).json({ message: "User-organisation assignment not found" });
      }
      
      // Log admin action
      if (adminUser && targetUser && organisation) {
        const userName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || targetUser.email;
        const action = role === 'owner' ? 'Assigned owner role to' : 'Removed owner role from';
        await logAdminAction({
          adminUser,
          tableName: 'user_organisations',
          recordId: `${userId}-${orgId}`,
          operation: 'UPDATE',
          fieldName: 'role',
          description: `${action} user "${userName}" in organisation "${organisation.name}"`,
          oldValue: oldRole,
          newValue: role,
          organisationId: parseInt(orgId),
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json(userOrg);
    } catch (error) {
      console.error("Error setting user org role:", error);
      res.status(500).json({ message: "Failed to set user role" });
    }
  });

  // Get current user's org ownerships
  app.get('/api/user/org-ownerships', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const ownedOrgIds = await storage.getOrgOwnerships(userId);
      res.json({ ownedOrganisations: ownedOrgIds });
    } catch (error) {
      console.error("Error fetching org ownerships:", error);
      res.status(500).json({ message: "Failed to fetch org ownerships" });
    }
  });

  // Org owner: Get cases in their organisation
  app.get('/api/org-owner/organisations/:orgId/cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orgId = parseInt(req.params.orgId);
      
      // Check if user is owner of this org or is admin
      const user = await storage.getUser(userId);
      const isOwner = await storage.isUserOrgOwner(userId, orgId);
      
      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied. You must be an organisation owner." });
      }
      
      const cases = await storage.getCasesForOrganisation(orgId);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching org cases:", error);
      res.status(500).json({ message: "Failed to fetch organisation cases" });
    }
  });

  // Org owner: Get users in their organisation (excludes admins)
  app.get('/api/org-owner/organisations/:orgId/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orgId = parseInt(req.params.orgId);
      
      // Check if user is owner of this org or is admin
      const user = await storage.getUser(userId);
      const isOwner = await storage.isUserOrgOwner(userId, orgId);
      
      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied. You must be an organisation owner." });
      }
      
      const orgUsers = await storage.getUsersInOrganisation(orgId);
      // Filter out admins - org owners can only manage non-admin users
      const nonAdminUsers = orgUsers.filter(u => !u.isAdmin && u.id !== userId);
      res.json(nonAdminUsers);
    } catch (error) {
      console.error("Error fetching org users:", error);
      res.status(500).json({ message: "Failed to fetch organisation users" });
    }
  });

  // Org owner: Get case access restrictions for a case
  app.get('/api/org-owner/cases/:caseId/access-restrictions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const caseId = parseInt(req.params.caseId);
      
      // Get the case to check organisation
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Check if user is owner of this case's org or is admin
      const user = await storage.getUser(userId);
      const isOwner = await storage.isUserOrgOwner(userId, caseData.organisationId);
      
      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied. You must be an organisation owner." });
      }
      
      const blockedUserIds = await storage.getCaseAccessRestrictions(caseId);
      res.json({ caseId, blockedUserIds });
    } catch (error) {
      console.error("Error fetching case access restrictions:", error);
      res.status(500).json({ message: "Failed to fetch case access restrictions" });
    }
  });

  // Org owner: Update case access restrictions
  app.post('/api/org-owner/cases/:caseId/access-restrictions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const caseId = parseInt(req.params.caseId);
      const { blockedUserIds } = req.body;
      
      if (!Array.isArray(blockedUserIds)) {
        return res.status(400).json({ message: "blockedUserIds must be an array" });
      }
      
      // Get the case to check organisation
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Check if user is owner of this case's org or is admin
      const user = await storage.getUser(userId);
      const isOwner = await storage.isUserOrgOwner(userId, caseData.organisationId);
      
      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied. You must be an organisation owner." });
      }
      
      // Verify that all blocked users are in this organisation and not admins
      const orgUsers = await storage.getUsersInOrganisation(caseData.organisationId);
      const validUserIds = orgUsers.filter(u => !u.isAdmin).map(u => u.id);
      
      for (const blockedId of blockedUserIds) {
        if (!validUserIds.includes(blockedId)) {
          return res.status(400).json({ 
            message: "Can only restrict users who are members of this organisation and are not admins" 
          });
        }
      }
      
      // Get current restrictions
      const currentRestrictions = await storage.getCaseAccessRestrictions(caseId);
      
      // Remove restrictions that are no longer in the list
      for (const currentId of currentRestrictions) {
        if (!blockedUserIds.includes(currentId)) {
          await storage.removeCaseAccessRestriction(caseId, currentId);
        }
      }
      
      // Add new restrictions
      for (const blockedId of blockedUserIds) {
        if (!currentRestrictions.includes(blockedId)) {
          await storage.addCaseAccessRestriction(caseId, blockedId, userId);
        }
      }
      
      res.json({ message: "Access restrictions updated", caseId, blockedUserIds });
    } catch (error) {
      console.error("Error updating case access restrictions:", error);
      res.status(500).json({ message: "Failed to update case access restrictions" });
    }
  });

  // Org owner: Get owned organisations (for OrgSettings page)
  app.get('/api/org-owner/ownerships', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const ownedOrgIds = await storage.getOrgOwnerships(userId);
      res.json(ownedOrgIds);
    } catch (error) {
      console.error("Error fetching org ownerships:", error);
      res.status(500).json({ message: "Failed to fetch org ownerships" });
    }
  });

  // Org owner: Get users in organisation (simplified URL for OrgSettings page)
  app.get('/api/org-owner/:orgId/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orgId = parseInt(req.params.orgId);
      
      const user = await storage.getUser(userId);
      const isOwner = await storage.isUserOrgOwner(userId, orgId);
      
      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied. You must be an organisation owner." });
      }
      
      const users = await storage.getUsersInOrganisation(orgId);
      
      // Add isOrgOwner flag to each user
      const usersWithOwnerStatus = await Promise.all(users.map(async (u) => {
        const userIsOwner = await storage.isUserOrgOwner(u.id, orgId);
        return { ...u, isOrgOwner: userIsOwner };
      }));
      
      res.json(usersWithOwnerStatus);
    } catch (error) {
      console.error("Error fetching org users:", error);
      res.status(500).json({ message: "Failed to fetch org users" });
    }
  });

  // Org owner: Get cases in organisation (simplified URL for OrgSettings page)
  app.get('/api/org-owner/:orgId/cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orgId = parseInt(req.params.orgId);
      
      const user = await storage.getUser(userId);
      const isOwner = await storage.isUserOrgOwner(userId, orgId);
      
      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied. You must be an organisation owner." });
      }
      
      const cases = await storage.getCasesForOrganisation(orgId);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching org cases:", error);
      res.status(500).json({ message: "Failed to fetch org cases" });
    }
  });

  // Org owner: Get all case access restrictions in organisation
  app.get('/api/org-owner/:orgId/restrictions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orgId = parseInt(req.params.orgId);
      
      const user = await storage.getUser(userId);
      const isOwner = await storage.isUserOrgOwner(userId, orgId);
      
      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied. You must be an organisation owner." });
      }
      
      // Get all restrictions for cases in this organisation
      const cases = await storage.getCasesForOrganisation(orgId);
      const caseIds = cases.map(c => c.id);
      
      const allRestrictions: Array<{id: number, userId: string, caseId: number, createdAt: string}> = [];
      for (const caseId of caseIds) {
        const restrictions = await storage.getCaseAccessRestrictions(caseId);
        for (const restrictedUserId of restrictions) {
          allRestrictions.push({
            id: caseId * 10000 + allRestrictions.length, // Generate a unique ID
            userId: restrictedUserId,
            caseId: caseId,
            createdAt: new Date().toISOString()
          });
        }
      }
      
      res.json(allRestrictions);
    } catch (error) {
      console.error("Error fetching org restrictions:", error);
      res.status(500).json({ message: "Failed to fetch org restrictions" });
    }
  });

  // Org owner: Toggle case access restriction
  app.post('/api/org-owner/:orgId/toggle-restriction', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const orgId = parseInt(req.params.orgId);
      const { userId, caseId } = req.body;
      
      if (!userId || !caseId) {
        return res.status(400).json({ message: "userId and caseId are required" });
      }
      
      const user = await storage.getUser(adminUserId);
      const isOwner = await storage.isUserOrgOwner(adminUserId, orgId);
      
      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied. You must be an organisation owner." });
      }
      
      // Verify case belongs to this organisation
      const caseData = await storage.getCaseById(caseId);
      if (!caseData || caseData.organisationId !== orgId) {
        return res.status(400).json({ message: "Case does not belong to this organisation" });
      }
      
      // Verify user is in this organisation and not admin
      const targetUser = await storage.getUser(userId);
      if (!targetUser || targetUser.isAdmin) {
        return res.status(400).json({ message: "Cannot restrict admin users" });
      }
      
      // Check current restriction status
      const currentRestrictions = await storage.getCaseAccessRestrictions(caseId);
      const isCurrentlyRestricted = currentRestrictions.includes(userId);
      
      if (isCurrentlyRestricted) {
        await storage.removeCaseAccessRestriction(caseId, userId);
        res.json({ 
          message: `Access restored for ${targetUser.firstName} ${targetUser.lastName}`,
          restricted: false 
        });
      } else {
        await storage.addCaseAccessRestriction(caseId, userId, adminUserId);
        res.json({ 
          message: `Access restricted for ${targetUser.firstName} ${targetUser.lastName}`,
          restricted: true 
        });
      }
    } catch (error) {
      console.error("Error toggling case restriction:", error);
      res.status(500).json({ message: "Failed to toggle case restriction" });
    }
  });

  // Org owner member request (sends email to admin@acclaim.law)
  app.post('/api/org-owner/member-request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { orgId, firstName, lastName, email, phone, memberType } = req.body;

      // Validate required fields
      if (!orgId || !firstName || !lastName || !email || !memberType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate orgId is a number
      const parsedOrgId = parseInt(orgId);
      if (isNaN(parsedOrgId)) {
        return res.status(400).json({ message: "Invalid organisation ID" });
      }

      // Validate memberType
      if (memberType !== 'member' && memberType !== 'owner') {
        return res.status(400).json({ message: "Invalid member type" });
      }

      // Verify user is org owner
      const isOwner = await storage.isUserOrgOwner(userId, parsedOrgId);
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied. You must be an organisation owner." });
      }

      // Get org name from database (don't trust client-provided value)
      const org = await storage.getOrganisation(parsedOrgId);
      if (!org) {
        return res.status(400).json({ message: "Organisation not found" });
      }

      // Use server-side user info (don't trust client-provided values)
      const requestedBy = `${user!.firstName} ${user!.lastName}`;
      const requestedByEmail = user!.email;

      // Send email using email service
      const emailSent = await sendGridEmailService.sendMemberRequestNotification({
        orgId: parsedOrgId,
        orgName: org.name,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        memberType,
        requestedBy,
        requestedByEmail,
      });

      if (emailSent) {
        console.log(`Member request email sent for ${firstName} ${lastName} to ${org.name}`);
        res.json({ success: true, message: "Member request sent successfully" });
      } else {
        throw new Error("Email service failed to send");
      }
    } catch (error) {
      console.error("Error sending member request:", error);
      res.status(500).json({ message: "Failed to send member request" });
    }
  });

  // Bulk restrict/allow member from all cases in organisation
  app.post('/api/org-owner/:orgId/bulk-member-restriction', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const orgId = parseInt(req.params.orgId);
      const { userId, action } = req.body; // action: 'restrict-all' | 'allow-all'

      if (!userId || !action) {
        return res.status(400).json({ message: "userId and action are required" });
      }

      const user = await storage.getUser(adminUserId);
      const isOwner = await storage.isUserOrgOwner(adminUserId, orgId);

      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all cases for this organisation
      const cases = await storage.getCasesForOrganisation(orgId);
      const targetUser = await storage.getUser(userId);

      if (!targetUser || targetUser.isAdmin) {
        return res.status(400).json({ message: "Cannot modify restrictions for admin users" });
      }

      let count = 0;
      for (const c of cases) {
        const currentRestrictions = await storage.getCaseAccessRestrictions(c.id);
        const isCurrentlyRestricted = currentRestrictions.includes(userId);

        if (action === 'restrict-all' && !isCurrentlyRestricted) {
          await storage.addCaseAccessRestriction(c.id, userId, adminUserId);
          count++;
        } else if (action === 'allow-all' && isCurrentlyRestricted) {
          await storage.removeCaseAccessRestriction(c.id, userId);
          count++;
        }
      }

      res.json({
        success: true,
        message: action === 'restrict-all'
          ? `Blocked ${targetUser.firstName} ${targetUser.lastName} from ${count} cases`
          : `Restored access for ${targetUser.firstName} ${targetUser.lastName} to ${count} cases`,
        count
      });
    } catch (error) {
      console.error("Error in bulk member restriction:", error);
      res.status(500).json({ message: "Failed to update restrictions" });
    }
  });

  // Bulk restrict/allow all members from a specific case
  app.post('/api/org-owner/:orgId/bulk-case-restriction', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const orgId = parseInt(req.params.orgId);
      const { caseId, action } = req.body; // action: 'restrict-all' | 'allow-all'

      if (!caseId || !action) {
        return res.status(400).json({ message: "caseId and action are required" });
      }

      const user = await storage.getUser(adminUserId);
      const isOwner = await storage.isUserOrgOwner(adminUserId, orgId);

      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get case and verify it belongs to this org
      const caseData = await storage.getCaseById(caseId);
      if (!caseData || caseData.organisationId !== orgId) {
        return res.status(400).json({ message: "Case not found in this organisation" });
      }

      // Get non-admin users in this organisation
      const orgUsers = await storage.getUsersInOrganisation(orgId);
      const nonAdminUsers = orgUsers.filter(u => !u.isAdmin);

      let count = 0;
      for (const u of nonAdminUsers) {
        const currentRestrictions = await storage.getCaseAccessRestrictions(caseId);
        const isCurrentlyRestricted = currentRestrictions.includes(u.id);

        if (action === 'restrict-all' && !isCurrentlyRestricted) {
          await storage.addCaseAccessRestriction(caseId, u.id, adminUserId);
          count++;
        } else if (action === 'allow-all' && isCurrentlyRestricted) {
          await storage.removeCaseAccessRestriction(caseId, u.id);
          count++;
        }
      }

      res.json({
        success: true,
        message: action === 'restrict-all'
          ? `Blocked ${count} members from "${caseData.caseName}"`
          : `Restored access for ${count} members to "${caseData.caseName}"`,
        count
      });
    } catch (error) {
      console.error("Error in bulk case restriction:", error);
      res.status(500).json({ message: "Failed to update restrictions" });
    }
  });

  // Member removal request (sends email to admin@acclaim.law)
  app.post('/api/org-owner/member-removal-request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { orgId, targetUserId, reason } = req.body;

      if (!orgId || !targetUserId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const parsedOrgId = parseInt(orgId);
      const isOwner = await storage.isUserOrgOwner(userId, parsedOrgId);
      const user = await storage.getUser(userId);

      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied" });
      }

      const org = await storage.getOrganisation(parsedOrgId);
      const targetUser = await storage.getUser(targetUserId);

      if (!org || !targetUser) {
        return res.status(400).json({ message: "Organisation or user not found" });
      }

      const requestedBy = `${user!.firstName} ${user!.lastName}`;
      const requestedByEmail = user!.email;

      const emailSent = await sendGridEmailService.sendOrgOwnerRequest({
        type: 'member-removal',
        orgName: org.name,
        targetUserName: `${targetUser.firstName} ${targetUser.lastName}`,
        targetUserEmail: targetUser.email,
        reason: reason || 'No reason provided',
        requestedBy,
        requestedByEmail,
      });

      if (emailSent) {
        res.json({ success: true, message: "Removal request sent successfully" });
      } else {
        throw new Error("Email service failed");
      }
    } catch (error) {
      console.error("Error sending member removal request:", error);
      res.status(500).json({ message: "Failed to send request" });
    }
  });

  // Owner delegation request (sends email to admin@acclaim.law)
  app.post('/api/org-owner/owner-delegation-request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { orgId, targetUserId, reason } = req.body;

      if (!orgId || !targetUserId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const parsedOrgId = parseInt(orgId);
      const isOwner = await storage.isUserOrgOwner(userId, parsedOrgId);
      const user = await storage.getUser(userId);

      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied" });
      }

      const org = await storage.getOrganisation(parsedOrgId);
      const targetUser = await storage.getUser(targetUserId);

      if (!org || !targetUser) {
        return res.status(400).json({ message: "Organisation or user not found" });
      }

      // Check target user is in this org
      const targetUserOrgs = await storage.getUserOrganisations(targetUserId);
      const isInOrg = targetUserOrgs.some(uo => uo.organisationId === parsedOrgId);
      if (!isInOrg) {
        return res.status(400).json({ message: "User is not in this organisation" });
      }

      const requestedBy = `${user!.firstName} ${user!.lastName}`;
      const requestedByEmail = user!.email;

      const emailSent = await sendGridEmailService.sendOrgOwnerRequest({
        type: 'owner-delegation',
        orgName: org.name,
        targetUserName: `${targetUser.firstName} ${targetUser.lastName}`,
        targetUserEmail: targetUser.email,
        reason: reason || 'No reason provided',
        requestedBy,
        requestedByEmail,
      });

      if (emailSent) {
        res.json({ success: true, message: "Owner delegation request sent successfully" });
      } else {
        throw new Error("Email service failed");
      }
    } catch (error) {
      console.error("Error sending owner delegation request:", error);
      res.status(500).json({ message: "Failed to send request" });
    }
  });

  // Remove ownership request (sends email to email@acclaim.law)
  app.post('/api/org-owner/remove-ownership-request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { orgId, targetUserId, reason } = req.body;

      if (!orgId || !targetUserId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const parsedOrgId = parseInt(orgId);
      const isOwner = await storage.isUserOrgOwner(userId, parsedOrgId);
      const user = await storage.getUser(userId);

      if (!user?.isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied" });
      }

      const org = await storage.getOrganisation(parsedOrgId);
      const targetUser = await storage.getUser(targetUserId);

      if (!org || !targetUser) {
        return res.status(400).json({ message: "Organisation or user not found" });
      }

      // Check target user is in this org
      const targetUserOrgs = await storage.getUserOrganisations(targetUserId);
      const isInOrg = targetUserOrgs.some(uo => uo.organisationId === parsedOrgId);
      if (!isInOrg) {
        return res.status(400).json({ message: "User is not in this organisation" });
      }

      // Check target user is actually an owner
      const targetIsOwner = await storage.isUserOrgOwner(targetUserId, parsedOrgId);
      if (!targetIsOwner) {
        return res.status(400).json({ message: "User is not an owner of this organisation" });
      }

      const requestedBy = `${user!.firstName} ${user!.lastName}`;
      const requestedByEmail = user!.email;

      const emailSent = await sendGridEmailService.sendOrgOwnerRequest({
        type: 'ownership-removal',
        orgName: org.name,
        targetUserName: `${targetUser.firstName} ${targetUser.lastName}`,
        targetUserEmail: targetUser.email,
        reason: reason || 'No reason provided',
        requestedBy,
        requestedByEmail,
      });

      if (emailSent) {
        res.json({ success: true, message: "Ownership removal request sent successfully" });
      } else {
        throw new Error("Email service failed");
      }
    } catch (error) {
      console.error("Error sending ownership removal request:", error);
      res.status(500).json({ message: "Failed to send request" });
    }
  });

  // Admin cases endpoint  
  app.get('/api/admin/cases', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const cases = await storage.getAllCases();
      res.json(cases);
    } catch (error) {
      console.error("Error fetching admin cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  // User self-management routes
  
  // Update own profile
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userData = updateUserSchema.parse(req.body);

      // Admins cannot change their first or last name (unless they are super admins)
      if (req.user.isAdmin && !req.user.isSuperAdmin) {
        delete userData.firstName;
        delete userData.lastName;
      }

      const user = await storage.updateUser(userId, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update notification preferences
  app.put('/api/user/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const preferencesData = updateNotificationPreferencesSchema.parse(req.body);

      const user = await storage.updateNotificationPreferences(userId, preferencesData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Change own password
  app.post('/api/user/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const passwordData = changePasswordSchema.parse(req.body);

      const success = await storage.changeUserPassword(
        userId, 
        passwordData.currentPassword, 
        passwordData.newPassword
      );

      if (!success) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Set new password (for first-time login or after reset)
  app.post('/api/user/set-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const passwordData = resetPasswordSchema.parse(req.body);

      // Check if user must change password
      const mustChange = await storage.checkMustChangePassword(userId);
      if (!mustChange) {
        return res.status(400).json({ message: "Password change not required" });
      }

      const user = await storage.setUserPassword(userId, passwordData.newPassword);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Password set successfully" });
    } catch (error) {
      console.error("Error setting password:", error);
      res.status(500).json({ message: "Failed to set password" });
    }
  });

  // Check if password change is required
  app.get('/api/user/password-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const mustChange = await storage.checkMustChangePassword(userId);
      res.json({ mustChangePassword: mustChange });
    } catch (error) {
      console.error("Error checking password status:", error);
      res.status(500).json({ message: "Failed to check password status" });
    }
  });

  // Get user's accessible organisations
  app.get('/api/user/organisations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const organisations = [];
      const orgIds = new Set<number>();
      
      // Add legacy organisation if exists
      if (user.organisationId) {
        orgIds.add(user.organisationId);
      }
      
      // Add junction table organisations
      const userOrgs = await storage.getUserOrganisations(userId);
      userOrgs.forEach(uo => orgIds.add(uo.organisationId));
      
      // Fetch organisation details
      for (const orgId of orgIds) {
        const org = await storage.getOrganisation(orgId);
        if (org) {
          organisations.push(org);
        }
      }

      res.json(organisations);
    } catch (error) {
      console.error("Error fetching user organisations:", error);
      res.status(500).json({ message: "Failed to fetch user organisations" });
    }
  });

  // System monitoring endpoints
  app.get("/api/admin/system/analytics", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const analytics = await storage.getSystemAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching system analytics:", error);
      res.status(500).json({ message: "Failed to fetch system analytics" });
    }
  });

  app.get("/api/admin/system/activity-logs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId, limit } = req.query;
      const logs = await storage.getUserActivityLogs(
        userId as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.get("/api/admin/system/login-attempts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { limit } = req.query;
      const attempts = await storage.getLoginAttempts(
        limit ? parseInt(limit as string) : undefined
      );
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching login attempts:", error);
      res.status(500).json({ message: "Failed to fetch login attempts" });
    }
  });

  app.get("/api/admin/system/failed-logins", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { limit } = req.query;
      const attempts = await storage.getFailedLoginAttempts(
        limit ? parseInt(limit as string) : undefined
      );
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching failed login attempts:", error);
      res.status(500).json({ message: "Failed to fetch failed login attempts" });
    }
  });

  // Rate limiting / lockout management endpoints
  app.get("/api/admin/system/rate-limit/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = loginRateLimiter.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching rate limit stats:", error);
      res.status(500).json({ message: "Failed to fetch rate limit statistics" });
    }
  });

  app.get("/api/admin/system/rate-limit/locked", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const locked = loginRateLimiter.getLockedAccounts();
      res.json(locked);
    } catch (error) {
      console.error("Error fetching locked accounts:", error);
      res.status(500).json({ message: "Failed to fetch locked accounts" });
    }
  });

  app.get("/api/admin/system/rate-limit/attempts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const attempts = loginRateLimiter.getAllAttempts();
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching rate limit attempts:", error);
      res.status(500).json({ message: "Failed to fetch rate limit attempts" });
    }
  });

  app.post("/api/admin/system/rate-limit/unlock", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { identifier } = req.body;
      
      if (!identifier) {
        return res.status(400).json({ message: "Identifier (IP address) is required" });
      }
      
      const unlocked = loginRateLimiter.unlockAccount(identifier);
      
      if (unlocked) {
        // Log the admin action
        const adminUser = await storage.getUser(req.user.id);
        if (adminUser) {
          await storage.logAuditEvent({
            tableName: 'security',
            recordId: identifier,
            operation: 'UPDATE',
            description: `Admin "${adminUser.email}" manually unlocked IP address ${identifier}`,
            userId: req.user.id,
            userEmail: adminUser.email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
        }
        
        res.json({ success: true, message: `Successfully unlocked ${identifier}` });
      } else {
        res.status(404).json({ message: "IP address not found in lockout list" });
      }
    } catch (error) {
      console.error("Error unlocking account:", error);
      res.status(500).json({ message: "Failed to unlock account" });
    }
  });

  // Session invalidation (force logout) endpoints
  app.get("/api/admin/users/:userId/sessions", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const sessions = await storage.getUserActiveSessions(userId);
      res.json({ sessions, count: sessions.length });
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      res.status(500).json({ message: "Failed to fetch user sessions" });
    }
  });

  app.post("/api/admin/users/:userId/force-logout", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      
      // Get the target user info for audit logging
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Invalidate all sessions for the user
      const deletedCount = await storage.invalidateUserSessions(userId);
      
      // Log the admin action
      const adminUser = await storage.getUser(req.user.id);
      if (adminUser) {
        await storage.logAuditEvent({
          tableName: 'sessions',
          recordId: userId,
          operation: 'DELETE',
          description: `Admin "${adminUser.email}" force logged out user "${targetUser.email}"${reason ? ` - Reason: ${reason}` : ''}`,
          userId: req.user.id,
          userEmail: adminUser.email,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ 
        success: true, 
        message: `Successfully invalidated ${deletedCount} session(s) for ${targetUser.email}`,
        sessionsInvalidated: deletedCount
      });
    } catch (error) {
      console.error("Error forcing user logout:", error);
      res.status(500).json({ message: "Failed to force user logout" });
    }
  });

  app.get("/api/admin/system/metrics", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { metricName, limit } = req.query;
      const metrics = await storage.getSystemMetrics(
        metricName as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching system metrics:", error);
      res.status(500).json({ message: "Failed to fetch system metrics" });
    }
  });

  // Comprehensive audit endpoints
  app.get("/api/admin/audit/logs", isAuthenticated, isAdmin, isSuperAdmin, async (req, res) => {
    try {
      const { tableName, recordId, operation, userId, startDate, endDate, limit } = req.query;
      
      const filters: any = {};
      if (tableName) filters.tableName = tableName as string;
      if (recordId) filters.recordId = recordId as string;
      if (operation) filters.operation = operation as string;
      if (userId) filters.userId = userId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (limit) filters.limit = parseInt(limit as string);
      
      const logs = await storage.getAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/admin/audit/summary", isAuthenticated, isAdmin, isSuperAdmin, async (req, res) => {
    try {
      const summary = await storage.getAuditSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching audit summary:", error);
      res.status(500).json({ message: "Failed to fetch audit summary" });
    }
  });

  // Audit log retention endpoints
  app.get("/api/admin/audit/stats", isAuthenticated, isAdmin, isSuperAdmin, async (req, res) => {
    try {
      const stats = await storage.getAuditLogStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching audit log stats:", error);
      res.status(500).json({ message: "Failed to fetch audit log statistics" });
    }
  });

  app.post("/api/admin/audit/cleanup", isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const { retentionDays } = req.body;
      
      if (!retentionDays || typeof retentionDays !== 'number' || retentionDays < 30) {
        return res.status(400).json({ message: "Retention days must be at least 30 days" });
      }
      
      const adminUser = await storage.getUser(req.user.id);
      const deletedCount = await storage.deleteOldAuditLogs(retentionDays);
      
      // Log this admin action
      if (adminUser) {
        await storage.logAuditEvent({
          tableName: 'audit_log',
          recordId: 'cleanup',
          operation: 'DELETE',
          description: `Admin "${adminUser.email}" cleaned up ${deletedCount} audit logs older than ${retentionDays} days`,
          userId: req.user.id,
          userEmail: adminUser.email,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ 
        success: true, 
        deletedCount, 
        message: `Successfully deleted ${deletedCount} audit logs older than ${retentionDays} days` 
      });
    } catch (error) {
      console.error("Error cleaning up audit logs:", error);
      res.status(500).json({ message: "Failed to clean up audit logs" });
    }
  });

  // Get users with organisation assignments for broadcast feature
  app.get("/api/admin/users/with-organisations", isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allOrgs = await storage.getAllOrganisations();
      
      // Get all user-organisation assignments in one query for efficiency
      const allUserOrgs = await storage.getAllUserOrganisations();
      
      // Group org IDs by user (userId is a string)
      const userOrgMap = new Map<string, number[]>();
      for (const uo of allUserOrgs) {
        const userId = uo.userId;
        if (!userOrgMap.has(userId)) {
          userOrgMap.set(userId, []);
        }
        userOrgMap.get(userId)!.push(uo.organisationId);
      }
      
      const usersWithOrgs = allUsers.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isSuperAdmin: (user as any).isSuperAdmin || false,
        mustChangePassword: user.mustChangePassword,
        organisationIds: userOrgMap.get(user.id) || [],
      }));
      
      res.json({ users: usersWithOrgs, organisations: allOrgs });
    } catch (error) {
      console.error("Error fetching users with organisations:", error);
      res.status(500).json({ message: "Failed to fetch users with organisations" });
    }
  });

  // Email Broadcast - Super Admin Only
  app.post("/api/admin/email-broadcast", isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const { subject, body, recipientIds } = req.body;
      
      if (!subject || !body) {
        return res.status(400).json({ message: "Subject and body are required" });
      }
      
      if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
        return res.status(400).json({ message: "At least one recipient is required" });
      }
      
      const adminUser = await storage.getUser(req.user.id);
      if (!adminUser) {
        return res.status(401).json({ message: "Admin user not found" });
      }
      
      // Get all recipient users
      const allUsers = await storage.getAllUsers();
      const recipients = allUsers.filter(u => recipientIds.includes(u.id) && u.email && !u.mustChangePassword);
      
      if (recipients.length === 0) {
        return res.status(400).json({ message: "No valid recipients found" });
      }
      
      // Send emails via SendGrid with BCC for data protection
      const { sendGridEmailService } = await import('./email-service-sendgrid');
      
      let sentCount = 0;
      let failedCount = 0;
      
      // Send to all recipients using BCC - send in batches of 100
      const batchSize = 100;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const bccEmails = batch.map(u => u.email!);
        
        try {
          await sendGridEmailService.sendBroadcastEmail({
            toEmail: 'email@acclaim.law', // Primary recipient (sender)
            bccEmails: bccEmails,
            subject: subject,
            body: body,
            senderName: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Acclaim Portal'
          });
          sentCount += batch.length;
        } catch (err) {
          console.error(`Failed to send batch ${i / batchSize + 1}:`, err);
          failedCount += batch.length;
        }
      }
      
      // Log the broadcast action
      await storage.logAuditEvent({
        tableName: 'email_broadcast',
        recordId: new Date().toISOString(),
        operation: 'CREATE',
        description: `Admin "${adminUser.email}" sent email broadcast "${subject}" to ${sentCount} recipient(s)${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
        userId: req.user.id,
        userEmail: adminUser.email,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        newValues: { subject, recipientCount: sentCount, failedCount },
      });
      
      res.json({ 
        success: true, 
        sentCount,
        failedCount,
        message: `Email broadcast sent to ${sentCount} recipient(s)${failedCount > 0 ? `. ${failedCount} failed.` : ''}` 
      });
    } catch (error) {
      console.error("Error sending email broadcast:", error);
      res.status(500).json({ message: "Failed to send email broadcast" });
    }
  });

  // Track message/document first view for read receipts
  app.post("/api/track/view", isAuthenticated, async (req: any, res) => {
    try {
      const { type, id } = req.body;
      
      if (!type || !id) {
        return res.status(400).json({ message: "Type and ID are required" });
      }
      
      if (!['message', 'document'].includes(type)) {
        return res.status(400).json({ message: "Type must be 'message' or 'document'" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Check if this user has already viewed this item
      const existingView = await storage.getAuditLogs({
        tableName: type === 'message' ? 'messages' : 'documents',
        recordId: String(id),
        operation: 'VIEW',
        userId: req.user.id,
        limit: 1
      });
      
      // Only log if this is the first view by this user
      if (existingView.length === 0) {
        const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';
        
        await storage.logAuditEvent({
          tableName: type === 'message' ? 'messages' : 'documents',
          recordId: String(id),
          operation: 'VIEW',
          description: `${userName} viewed this ${type} for the first time`,
          userId: req.user.id,
          userEmail: user.email || undefined,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ success: true, firstView: existingView.length === 0 });
    } catch (error) {
      console.error("Error tracking view:", error);
      res.status(500).json({ message: "Failed to track view" });
    }
  });

  // Get audit history for a specific message or document (all admins can view)
  app.get("/api/admin/audit/item/:type/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { type, id } = req.params;
      
      if (!['message', 'document'].includes(type)) {
        return res.status(400).json({ message: "Type must be 'message' or 'document'" });
      }
      
      const tableName = type === 'message' ? 'messages' : 'documents';
      
      const logs = await storage.getAuditLogs({
        tableName,
        recordId: id,
        operation: 'VIEW'
      });
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching item audit history:", error);
      res.status(500).json({ message: "Failed to fetch audit history" });
    }
  });

  // Get all video files with download status for audit management
  app.get("/api/admin/audit/videos", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Video file extensions to look for
      const videoExtensions = [
        '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', 
        '.m4v', '.mpg', '.mpeg', '.3gp', '.3g2', '.ogv', '.ts', 
        '.mts', '.m2ts', '.vob', '.divx', '.xvid', '.rm', '.rmvb',
        '.asf', '.swf', '.f4v'
      ];
      
      // Get all documents
      const allDocuments = await storage.getAllDocuments();
      
      // Filter to only video files
      const videoDocuments = allDocuments.filter(doc => {
        const lowerFileName = doc.fileName.toLowerCase();
        return videoExtensions.some(ext => lowerFileName.endsWith(ext)) ||
               (doc.fileType && doc.fileType.startsWith('video/'));
      });
      
      // Get download audit logs for these documents
      const downloadLogs = await storage.getAuditLogs({
        tableName: 'documents',
        operation: 'DOWNLOAD'
      });
      
      // Get all users to determine uploader role
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      
      // Build response with download status
      const videosWithStatus = await Promise.all(videoDocuments.map(async (doc) => {
        const uploader = doc.uploadedBy ? userMap.get(doc.uploadedBy) : null;
        const uploaderIsAdmin = uploader?.isAdmin || false;
        
        // Find downloads for this document
        const docDownloads = downloadLogs.filter(log => log.recordId === doc.id.toString());
        
        // Determine if "correct" receiver has downloaded
        // If admin uploaded -> user must download
        // If user uploaded -> admin must download
        let downloadedByReceiver = false;
        let receiverDownloadInfo: { downloadedAt: string; downloadedBy: string; downloadedByEmail: string } | null = null;
        
        for (const download of docDownloads) {
          if (!download.userId) continue;
          const downloader = userMap.get(download.userId);
          if (!downloader) continue;
          
          if (uploaderIsAdmin) {
            // Admin uploaded, need a non-admin (user) to download
            if (!downloader.isAdmin) {
              downloadedByReceiver = true;
              receiverDownloadInfo = {
                downloadedAt: download.timestamp?.toISOString() || '',
                downloadedBy: `${downloader.firstName} ${downloader.lastName}`,
                downloadedByEmail: downloader.email
              };
              break;
            }
          } else {
            // User uploaded, need an admin to download
            if (downloader.isAdmin) {
              downloadedByReceiver = true;
              receiverDownloadInfo = {
                downloadedAt: download.timestamp?.toISOString() || '',
                downloadedBy: `${downloader.firstName} ${downloader.lastName}`,
                downloadedByEmail: downloader.email
              };
              break;
            }
          }
        }
        
        // Get organisation name
        const org = doc.organisationId ? await storage.getOrganisation(doc.organisationId) : null;
        
        // Get case name if linked to a case
        let caseName = null;
        if (doc.caseId) {
          const caseInfo = await storage.getCase(doc.caseId);
          caseName = caseInfo?.caseName || null;
        }
        
        return {
          id: doc.id,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          fileType: doc.fileType,
          caseId: doc.caseId,
          caseName,
          organisationId: doc.organisationId,
          organisationName: org?.name || 'Unknown',
          uploadedBy: doc.uploadedBy,
          uploaderName: uploader ? `${uploader.firstName} ${uploader.lastName}` : 'Unknown',
          uploaderEmail: uploader?.email || 'Unknown',
          uploaderIsAdmin,
          createdAt: doc.createdAt,
          downloaded: downloadedByReceiver,
          downloadInfo: receiverDownloadInfo,
          totalDownloads: docDownloads.length
        };
      }));
      
      // Sort by upload date, newest first
      videosWithStatus.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      res.json(videosWithStatus);
    } catch (error) {
      console.error("Error fetching video files:", error);
      res.status(500).json({ message: "Failed to fetch video files" });
    }
  });

  // Advanced reporting endpoints
  app.get("/api/admin/reports/cross-organisation", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Prevent browser caching for fresh data
      res.set('Cache-Control', 'no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const performance = await storage.getCrossOrganizationPerformance();
      res.json(performance);
    } catch (error) {
      console.error("Error fetching cross-organisation performance:", error);
      res.status(500).json({ message: "Failed to fetch cross-organisation performance" });
    }
  });

  app.get("/api/admin/reports/user-activity", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const report = await storage.getUserActivityReport(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(report);
    } catch (error) {
      console.error("Error fetching user activity report:", error);
      res.status(500).json({ message: "Failed to fetch user activity report" });
    }
  });

  app.get("/api/admin/reports/system-health", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const metrics = await storage.getSystemHealthMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching system health metrics:", error);
      res.status(500).json({ message: "Failed to fetch system health metrics" });
    }
  });

  app.post("/api/admin/reports/custom", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const reportConfig = req.body;
      const data = await storage.getCustomReportData(reportConfig);
      res.json(data);
    } catch (error) {
      console.error("Error generating custom report:", error);
      res.status(500).json({ message: "Failed to generate custom report" });
    }
  });

  // External API endpoints for case management system integration
  
  // Create case activity (for external system to push activities)
  app.post('/api/external/cases/:externalRef/activities', async (req: any, res) => {
    try {
      // Debug logging
      console.log('Activity API Request:', {
        method: req.method,
        url: req.url,
        contentType: req.headers['content-type'],
        body: req.body,
        rawBody: req.rawBody || 'not available'
      });
      
      // TODO: Add API key authentication here
      const { externalRef } = req.params;
      
      // Support both JSON and form data
      let activityType, description, performedBy, activityDate;
      
      if (req.headers['content-type']?.includes('application/json')) {
        // JSON format
        ({ activityType, description, performedBy, activityDate } = req.body);
      } else {
        // Form data format (for SOS systems)
        activityType = req.body.activityType;
        description = req.body.description;
        performedBy = req.body.performedBy;
        activityDate = req.body.activityDate;
      }
      
      if (!activityType || !description || !performedBy) {
        return res.status(400).json({ 
          message: "activityType, description, and performedBy are required" 
        });
      }
      
      // Find case by external reference
      const case_ = await storage.getCaseByExternalRef(externalRef);
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Create case activity - use provided date or default to now
      const activity = await storage.addCaseActivity({
        caseId: case_.id,
        activityType,
        description,
        performedBy,
        createdAt: activityDate ? new Date(activityDate) : new Date(),
      });
      
      res.status(201).json({ 
        message: "Case activity created successfully", 
        activity,
        timestamp: new Date().toISOString(),
        refreshRequired: true 
      });
    } catch (error) {
      console.error("Error creating case activity via external API:", error);
      res.status(500).json({ message: "Failed to create case activity" });
    }
  });

  // Create case message (for external system to send messages to specific cases)
  app.post('/api/external/cases/:externalRef/messages', async (req: any, res) => {
    try {
      // Debug logging
      console.log('Message API Request:', {
        method: req.method,
        url: req.url,
        contentType: req.headers['content-type'],
        body: req.body
      });
      
      const { externalRef } = req.params;
      
      // Support both JSON and form data
      let message, senderName, messageType, subject, sendNotifications;
      
      if (req.headers['content-type']?.includes('application/json')) {
        ({ message, senderName, messageType, subject, sendNotifications } = req.body);
      } else {
        message = req.body.message;
        senderName = req.body.senderName;
        messageType = req.body.messageType || 'case_update';
        subject = req.body.subject;
        sendNotifications = req.body.sendNotifications === 'true' || req.body.sendNotifications === true;
      }
      
      if (!message || !senderName) {
        return res.status(400).json({ 
          message: "message and senderName are required" 
        });
      }
      
      // Find case by external reference
      const case_ = await storage.getCaseByExternalRef(externalRef);
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Use a system admin user as sender (from the database)
      const systemUserId = 'jZJVUVcC3I'; // Admin user: mattperry@chadlaw.co.uk
      
      // Use custom subject if provided, otherwise generate automatically
      const messageSubject = subject || `${messageType}: ${case_.caseName}`;
      
      // Create message linked to the case
      const newMessage = await storage.createMessage({
        senderId: systemUserId,
        senderName: senderName, // Use the sender name from the API request
        recipientType: 'case',
        recipientId: case_.id.toString(),
        caseId: case_.id, // Set the caseId for proper filtering
        subject: messageSubject,
        content: message,
        isRead: false,
        createdAt: new Date(),
      });

      // Handle email notifications if requested
      let notificationsSent = 0;
      if (sendNotifications) {
        try {
          // Get all users linked to the case's organisation
          const organisationUsers = await storage.getUsersByOrganisationId(case_.organisationId);
          const organisation = await storage.getOrganisation(case_.organisationId);
          
          for (const user of organisationUsers) {
            // Check if this case is muted by the user or if user is blocked from the case
            const isCaseMuted = await storage.isCaseMuted(user.id, case_.id);
            const isBlockedFromCase = await storage.isUserBlockedFromCase(user.id, case_.id);
            
            if (isCaseMuted) {
              console.log(`[External API] Skipping notification for user ${user.id} - case ${case_.id} is muted`);
              continue;
            }
            if (isBlockedFromCase) {
              console.log(`[External API] Skipping notification for user ${user.id} - user is blocked from case ${case_.id}`);
              continue;
            }
            
            // Check user's email notification preferences and that they have logged in at least once
            if (user.emailNotifications && user.email && !user.mustChangePassword) {
              try {
                // Send email notification to user via SendGrid (for real delivery)
                const emailSent = await sendGridEmailService.sendExternalMessageNotification({
                  userEmail: user.email,
                  userName: `${user.firstName} ${user.lastName}`,
                  messageSubject: messageSubject,
                  messageContent: message,
                  caseReference: case_.accountNumber,
                  organisationName: organisation?.name || 'Unknown Organisation',
                  senderName: senderName,
                  messageType: messageType
                });
                
                if (emailSent) {
                  notificationsSent++;
                  console.log(`Email notification sent to ${user.email} for case ${case_.caseName}`);
                } else {
                  console.log(`Failed to send email notification to ${user.email}`);
                }
              } catch (emailError) {
                console.error(`Error sending email to ${user.email}:`, emailError);
              }
            }
          }
        } catch (notificationError) {
          console.error("Error sending email notifications:", notificationError);
        }
      }
      
      res.status(201).json({ 
        message: "Case message created successfully", 
        messageData: newMessage,
        caseInfo: {
          id: case_.id,
          accountNumber: case_.accountNumber,
          caseName: case_.caseName
        },
        notificationInfo: {
          requested: !!sendNotifications,
          sent: notificationsSent
        },
        timestamp: new Date().toISOString(),
        refreshRequired: true 
      });
    } catch (error) {
      console.error("Error creating case message via external API:", error);
      res.status(500).json({ message: "Failed to create case message" });
    }
  });

  // External Document Upload API - Upload documents to cases from external system
  app.post('/api/external/cases/:externalRef/documents', upload.single('document'), async (req: any, res) => {
    try {
      // Extract form data
      const externalRef = req.params.externalRef;
      const { fileName, documentType, description } = req.body;
      
      if (!externalRef) {
        return res.status(400).json({ message: "External reference is required" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Find case by external reference
      const case_ = await storage.getCaseByExternalRef(externalRef);
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Get the system user for file attribution
      const systemUserId = 'jZJVUVcC3I';
      
      // Use provided fileName or fall back to original filename
      const finalFileName = fileName || req.file.originalname;
      
      // Create document record
      const document = await storage.createDocument({
        caseId: case_.id,
        fileName: finalFileName,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        uploadedBy: systemUserId,
        organisationId: case_.organisationId,
        createdAt: new Date(),
      });
      
      res.status(201).json({
        message: "Document uploaded successfully",
        documentData: document,
        caseInfo: {
          id: case_.id,
          accountNumber: case_.accountNumber,
          caseName: case_.caseName
        },
        timestamp: new Date().toISOString(),
        refreshRequired: true
      });
    } catch (error) {
      console.error("Error uploading document via external API:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Bulk create case activities (for external system to push multiple activities at once)
  app.post('/api/external/activities/bulk', async (req: any, res) => {
    try {
      // TODO: Add API key authentication here
      const { activities } = req.body;
      
      if (!activities || !Array.isArray(activities)) {
        return res.status(400).json({ 
          message: "activities array is required" 
        });
      }
      
      const results = {
        created: 0,
        errors: [] as any[]
      };
      
      for (const activity of activities) {
        try {
          const { caseExternalRef, activityType, description, performedBy, activityDate } = activity;
          
          if (!caseExternalRef || !activityType || !description || !performedBy) {
            results.errors.push({ 
              activity, 
              error: "caseExternalRef, activityType, description, and performedBy are required" 
            });
            continue;
          }
          
          // Find case by external reference
          const case_ = await storage.getCaseByExternalRef(caseExternalRef);
          if (!case_) {
            results.errors.push({ 
              activity, 
              error: "Case not found" 
            });
            continue;
          }
          
          // Create case activity
          await storage.addCaseActivity({
            caseId: case_.id,
            activityType,
            description,
            performedBy,
            // activityDate: activityDate ? new Date(activityDate) : new Date(), // Remove non-existent field
          });
          
          results.created++;
        } catch (error) {
          results.errors.push({ 
            activity, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      res.status(201).json({ 
        message: "Bulk activity creation completed", 
        results,
        timestamp: new Date().toISOString(),
        refreshRequired: true 
      });
    } catch (error) {
      console.error("Error creating bulk case activities via external API:", error);
      res.status(500).json({ message: "Failed to create bulk case activities" });
    }
  });
  
  // Create or update organisation
  app.post('/api/external/organisations', async (req: any, res) => {
    try {
      // TODO: Add API key authentication here
      const { name, contactEmail, contactPhone, address, externalRef } = req.body;
      
      if (!name || !externalRef) {
        return res.status(400).json({ message: "Name and externalRef are required" });
      }
      
      // Check if organisation already exists
      const existing = await storage.getOrganisationByExternalRef(externalRef);
      if (existing) {
        // Update existing organisation
        const updated = await storage.updateOrganisation(existing.id, {
          name,
          contactEmail,
          contactPhone,
          address,
        });
        return res.json({ message: "Organization updated successfully", organisation: updated });
      }
      
      // Create new organisation
      const organisation = await storage.createOrganisation({
        name,
        contactEmail,
        contactPhone,
        address,
        externalRef,
      });
      
      res.status(201).json({ message: "Organization created successfully", organisation });
    } catch (error) {
      console.error("Error creating/updating organisation via external API:", error);
      res.status(500).json({ message: "Failed to create/update organisation" });
    }
  });

  // Create or update user
  app.post('/api/external/users', async (req: any, res) => {
    try {
      // TODO: Add API key authentication here
      const { firstName, lastName, email, phone, organisationExternalRef, isAdmin, externalRef } = req.body;
      
      if (!firstName || !lastName || !email || !externalRef) {
        return res.status(400).json({ message: "firstName, lastName, email, and externalRef are required" });
      }
      
      // Find organisation by external reference
      let organisationId = null;
      if (organisationExternalRef) {
        const organisation = await storage.getOrganisationByExternalRef(organisationExternalRef);
        if (!organisation) {
          return res.status(404).json({ message: "Organization not found" });
        }
        organisationId = organisation.id;
      }
      
      // Check if user already exists
      const existing = await storage.getUserByExternalRef(externalRef);
      if (existing) {
        // Update existing user
        const updated = await storage.updateUser(existing.id, {
          firstName,
          lastName,
          phone,
        });
        
        // Update organisation assignment if provided
        if (organisationId) {
          await storage.assignUserToOrganisation(existing.id, organisationId);
        }
        
        return res.json({ message: "User updated successfully", user: updated });
      }
      
      // Create new user with external reference
      const result = await storage.createUserWithExternalRef({
        firstName,
        lastName,
        email,
        phone,
        organisationId,
        isAdmin: isAdmin || false,
        externalRef,
      });
      
      res.status(201).json({ 
        message: "User created successfully", 
        user: result.user,
        tempPassword: result.tempPassword 
      });
    } catch (error) {
      console.error("Error creating/updating user via external API:", error);
      res.status(500).json({ message: "Failed to create/update user" });
    }
  });

  // Create or update case
  app.post('/api/external/cases', async (req: any, res) => {
    try {
      // TODO: Add API key authentication here
      const {
        accountNumber,
        caseName,
        debtorEmail,
        debtorPhone,
        debtorAddress,
        debtorType,
        originalAmount,
        outstandingAmount,
        costsAdded,
        interestAdded,
        feesAdded,
        status,
        stage,
        organisationExternalRef,
        assignedTo,
        externalRef
      } = req.body;
      
      if (!accountNumber || !caseName || !organisationExternalRef || !externalRef) {
        return res.status(400).json({ 
          message: "accountNumber, caseName, organisationExternalRef, and externalRef are required" 
        });
      }
      
      // Find organisation by external reference
      const organisation = await storage.getOrganisationByExternalRef(organisationExternalRef);
      if (!organisation) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Check if case already exists by external reference
      let existing = await storage.getCaseByExternalRef(externalRef);
      
      // If not found by external reference, also check by account number to prevent duplicates
      if (!existing) {
        const casesByAccount = await storage.getCasesByAccountNumber(accountNumber);
        if (casesByAccount && casesByAccount.length > 0) {
          // Update the existing case with the new external reference
          existing = casesByAccount[0];
        }
      }
      
      if (existing) {
        // Update existing case
        const updated = await storage.updateCase(existing.id, {
          accountNumber,
          caseName,
          // debtorEmail, // Remove non-schema field
          debtorPhone,
          debtorAddress,
          debtorType: debtorType || 'individual',
          originalAmount: originalAmount || '0.00',
          outstandingAmount: outstandingAmount || '0.00',
          costsAdded: costsAdded || '0.00',
          interestAdded: interestAdded || '0.00',
          feesAdded: feesAdded || '0.00',
          status: status || 'active',
          stage: stage || 'initial_contact',
          assignedTo: assignedTo || 'System',
          externalRef, // Ensure external ref is updated
        });
        
        // Case activities are now only created via dedicated API endpoint
        // No automatic activity generation
        
        // Send immediate response to trigger frontend refresh
        return res.json({ 
          message: "Case updated successfully", 
          case: updated,
          timestamp: new Date().toISOString(),
          refreshRequired: true 
        });
      }
      
      // Create new case
      const newCase = await storage.createCase({
        accountNumber,
        caseName,
        // debtorEmail, // Remove non-schema field
        debtorPhone,
        debtorAddress,
        debtorType: debtorType || 'individual',
        originalAmount: originalAmount || '0.00',
        outstandingAmount: outstandingAmount || '0.00',
        costsAdded: costsAdded || '0.00',
        interestAdded: interestAdded || '0.00',
        feesAdded: feesAdded || '0.00',
        status: status || 'active',
        stage: stage || 'initial_contact',
        organisationId: organisation.id,
        assignedTo: assignedTo || 'System',
        externalRef,
      });
      
      // Case activities are now only created via dedicated API endpoint
      // No automatic activity generation
      
      // Auto-mute for users in this organisation who have auto-mute preference enabled
      try {
        const orgUsers = await storage.getUsersInOrganisation(organisation.id);
        for (const user of orgUsers) {
          if (getAutoMuteNewCases(user.id)) {
            await storage.muteCase(user.id, newCase.id);
          }
        }
      } catch (autoMuteError) {
        console.error("Error applying auto-mute for new case:", autoMuteError);
      }
      
      return res.status(201).json({ 
        message: "Case created successfully", 
        case: newCase,
        timestamp: new Date().toISOString(),
        refreshRequired: true 
      });
    } catch (error) {
      console.error("Error creating/updating case via external API:", error);
      
      // Check if response was already sent
      if (!res.headersSent) {
        return res.status(500).json({ message: "Failed to create/update case" });
      }
    }
  });

  // Create payment
  app.post('/api/external/payments', async (req: any, res) => {
    try {
      // TODO: Add API key authentication here
      
      // Support both JSON and form data
      let caseExternalRef, amount, paymentDate, paymentMethod, reference, notes, externalRef;
      
      if (req.headers['content-type']?.includes('application/json')) {
        // JSON format
        ({ caseExternalRef, amount, paymentDate, paymentMethod, reference, notes, externalRef } = req.body);
      } else {
        // Form data format (for SOS systems)
        caseExternalRef = req.body.caseExternalRef;
        amount = req.body.amount;
        paymentDate = req.body.paymentDate;
        paymentMethod = req.body.paymentMethod;
        reference = req.body.reference;
        notes = req.body.notes;
        externalRef = req.body.externalRef;
      }
      
      if (!caseExternalRef || !amount || !paymentDate || !externalRef) {
        return res.status(400).json({ 
          message: "caseExternalRef, amount, paymentDate, and externalRef are required" 
        });
      }
      
      // Parse and validate payment date  
      let parsedPaymentDate;
      try {
        // Handle DD/MM/YYYY format specifically
        if (paymentDate && paymentDate.includes('/')) {
          const parts = paymentDate.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-based  
            const year = parseInt(parts[2], 10);
            
            // Create date object and validate
            parsedPaymentDate = new Date(year, month, day, 12, 0, 0, 0); // Set to noon to avoid timezone issues
            
            // Double check by comparing parts
            if (parsedPaymentDate.getDate() !== day || 
                parsedPaymentDate.getMonth() !== month || 
                parsedPaymentDate.getFullYear() !== year) {
              throw new Error('Date validation failed - invalid day/month/year combination');
            }
          } else {
            throw new Error('Invalid DD/MM/YYYY format - expected 3 parts');
          }
        } else if (paymentDate && (paymentDate.includes('T') || paymentDate.includes('Z'))) {
          // ISO format
          parsedPaymentDate = new Date(paymentDate);
        } else if (paymentDate && paymentDate.includes('-')) {
          // YYYY-MM-DD format
          parsedPaymentDate = new Date(paymentDate + 'T12:00:00Z');
        } else {
          // Default to current date if format is unrecognised
          parsedPaymentDate = new Date();
        }
        
        // Final validation
        if (!parsedPaymentDate || isNaN(parsedPaymentDate.getTime())) {
          throw new Error('Invalid date format - could not create valid date object');
        }
      } catch (dateError) {
        return res.status(400).json({ 
          message: `Invalid paymentDate format: ${dateError.message}. Use DD/MM/YYYY format (e.g., 21/01/2025)` 
        });
      }
      
      // Find case by external reference
      const case_ = await storage.getCaseByExternalRef(caseExternalRef);
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Create payment
      const paymentData = {
        caseId: case_.id,
        amount,
        paymentDate: parsedPaymentDate,
        paymentMethod: paymentMethod || 'UNKNOWN',
        reference,
        notes,
        organisationId: case_.organisationId,
        recordedBy: null, // Use null for external payments
        externalRef,
      };
      
      const payment = await storage.createPayment(paymentData);
      
      // Case activities are now only created via dedicated API endpoint
      // No automatic activity generation
      
      // Check if plain text response is requested via query parameter
      console.log('Query parameters:', req.query);
      if (req.query.format === 'text') {
        // Plain text response for SOS compatibility
        console.log('Sending plain text response');
        res.status(201).send('Payment created successfully');
      } else {
        console.log('Sending JSON response');
        // JSON response for other clients
        res.status(201).json({ 
          message: "Payment created successfully", 
          payment,
          timestamp: new Date().toISOString(),
          refreshRequired: true 
        });
      }
    } catch (error) {
      console.error("Error creating payment via external API:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Update existing payment
  app.put('/api/external/payments/update', async (req: any, res) => {
    try {
      // Support both JSON and form data
      let paymentExternalRef, amount, paymentDate, paymentMethod, reference, notes;
      
      if (req.headers['content-type']?.includes('application/json')) {
        // JSON format
        ({ paymentExternalRef, amount, paymentDate, paymentMethod, reference, notes } = req.body);
      } else {
        // Form data format (for SOS systems)
        paymentExternalRef = req.body.paymentExternalRef;
        amount = req.body.amount;
        paymentDate = req.body.paymentDate;
        paymentMethod = req.body.paymentMethod;
        reference = req.body.reference;
        notes = req.body.notes;
      }
      
      if (!paymentExternalRef) {
        return res.status(400).json({ 
          message: "paymentExternalRef is required" 
        });
      }
      
      // Find payment by external reference
      const payment = await storage.getPaymentByExternalRef(paymentExternalRef);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Parse and validate payment date if provided
      let parsedPaymentDate;
      if (paymentDate) {
        try {
          // Handle DD/MM/YYYY format specifically
          if (paymentDate.includes('/')) {
            const parts = paymentDate.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-based  
              const year = parseInt(parts[2], 10);
              
              // Create date object and validate
              parsedPaymentDate = new Date(year, month, day, 12, 0, 0, 0); // Set to noon to avoid timezone issues
              
              // Double check by comparing parts
              if (parsedPaymentDate.getDate() !== day || 
                  parsedPaymentDate.getMonth() !== month || 
                  parsedPaymentDate.getFullYear() !== year) {
                throw new Error('Date validation failed - invalid day/month/year combination');
              }
            } else {
              throw new Error('Invalid DD/MM/YYYY format - expected 3 parts');
            }
          } else if (paymentDate.includes('T') || paymentDate.includes('Z')) {
            // ISO format
            parsedPaymentDate = new Date(paymentDate);
          } else if (paymentDate.includes('-')) {
            // YYYY-MM-DD format
            parsedPaymentDate = new Date(paymentDate + 'T12:00:00Z');
          } else {
            throw new Error('Unrecognised date format');
          }
          
          // Final validation
          if (!parsedPaymentDate || isNaN(parsedPaymentDate.getTime())) {
            throw new Error('Invalid date format - could not create valid date object');
          }
        } catch (dateError) {
          return res.status(400).json({ 
            message: `Invalid paymentDate format: ${dateError.message}. Use DD/MM/YYYY format (e.g., 21/01/2025)` 
          });
        }
      }
      
      // Build update object with only provided fields
      const updateData: any = {};
      if (amount !== undefined) updateData.amount = amount;
      if (parsedPaymentDate) updateData.paymentDate = parsedPaymentDate;
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod || 'UNKNOWN';
      if (reference !== undefined) updateData.reference = reference;
      if (notes !== undefined) updateData.notes = notes;
      
      // Update payment
      const updatedPayment = await storage.updatePayment(payment.id, updateData);
      
      // Case activities are now only created via dedicated API endpoint
      // No automatic activity generation
      
      // Check if plain text response is requested via query parameter
      if (req.query.format === 'text') {
        // Plain text response for SOS compatibility
        res.status(200).send('Payment updated successfully');
      } else {
        // JSON response for other clients
        res.status(200).json({ 
          message: "Payment updated successfully", 
          payment: updatedPayment,
          timestamp: new Date().toISOString(),
          refreshRequired: true 
        });
      }
    } catch (error) {
      console.error("Error updating payment via external API:", error);
      res.status(500).json({ message: "Failed to update payment" });
    }
  });

  // SOS-friendly payment endpoints with plain text responses
  app.post('/api/sos/payments', async (req: any, res) => {
    try {
      // Same logic as external payments but with plain text response
      let caseExternalRef, amount, paymentDate, paymentMethod, reference, notes, externalRef;
      
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
        ({ caseExternalRef, amount, paymentDate, paymentMethod, reference, notes, externalRef } = req.body);
      } else {
        ({ caseExternalRef, amount, paymentDate, paymentMethod, reference, notes, externalRef } = req.body);
      }
      
      if (!caseExternalRef || !amount || !externalRef) {
        res.status(400).send('Missing required fields: caseExternalRef, amount, externalRef');
        return;
      }
      
      // Parse date
      let parsedPaymentDate;
      try {
        if (paymentDate && paymentDate.includes('/')) {
          const parts = paymentDate.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            parsedPaymentDate = new Date(year, month, day, 12, 0, 0, 0);
            
            if (parsedPaymentDate.getDate() !== day || 
                parsedPaymentDate.getMonth() !== month || 
                parsedPaymentDate.getFullYear() !== year) {
              throw new Error('Invalid date');
            }
          } else {
            throw new Error('Invalid DD/MM/YYYY format');
          }
        } else {
          parsedPaymentDate = new Date();
        }
        
        if (!parsedPaymentDate || isNaN(parsedPaymentDate.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (dateError) {
        res.status(400).send('Invalid date format. Use DD/MM/YYYY');
        return;
      }
      
      // Find case
      const case_ = await storage.getCaseByExternalRef(caseExternalRef);
      if (!case_) {
        res.status(404).send('Case not found');
        return;
      }
      
      // Create payment
      const paymentData = {
        caseId: case_.id,
        amount,
        paymentDate: parsedPaymentDate,
        paymentMethod: paymentMethod || 'UNKNOWN',
        reference,
        notes,
        organisationId: case_.organisationId,
        recordedBy: null,
        externalRef,
      };
      
      await storage.createPayment(paymentData);
      
      // Simple plain text response
      res.status(201).send('Payment created successfully');
    } catch (error) {
      console.error("Error creating payment via SOS API:", error);
      if (error.message && error.message.includes('duplicate key')) {
        res.status(400).send('Payment with this reference already exists');
      } else {
        res.status(500).send('Failed to create payment');
      }
    }
  });

  app.delete('/api/sos/payments/:externalRef', async (req: any, res) => {
    try {
      const { externalRef } = req.params;
      
      if (!externalRef) {
        res.status(400).send('External reference is required');
        return;
      }
      
      const payment = await storage.getPaymentByExternalRef(externalRef);
      if (!payment) {
        res.status(404).send('Payment not found');
        return;
      }
      
      await storage.deletePayment(payment.id);
      
      // Simple plain text response
      res.send('Payment deleted successfully');
    } catch (error) {
      console.error("Error deleting payment via SOS API:", error);
      res.status(500).send('Failed to delete payment');
    }
  });

  // Delete payment
  app.delete('/api/external/payments/:externalRef', async (req: any, res) => {
    try {
      // TODO: Add API key authentication here
      const { externalRef } = req.params;
      
      if (!externalRef) {
        return res.status(400).json({ message: "External reference is required" });
      }
      
      // Find payment by external reference
      const payment = await storage.getPaymentByExternalRef(externalRef);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Delete payment
      await storage.deletePayment(payment.id);
      
      // Case activities are now only created via dedicated API endpoint
      // No automatic activity generation
      
      // Check if plain text response is requested via query parameter
      if (req.query.format === 'text') {
        // Plain text response for SOS compatibility  
        res.send('Payment deleted successfully');
      } else {
        // JSON response for other clients
        res.json({ 
          message: "Payment deleted successfully", 
          deletedPayment: {
            id: payment.id,
            externalRef: payment.externalRef,
            amount: payment.amount
          },
          timestamp: new Date().toISOString(),
          refreshRequired: true 
        });
      }
    } catch (error) {
      console.error("Error deleting payment via external API:", error);
      res.status(500).json({ message: "Failed to delete payment" });
    }
  });

  // Update case status/stage
  app.put('/api/external/cases/:externalRef/status', async (req: any, res) => {
    try {
      // TODO: Add API key authentication here
      const { externalRef } = req.params;
      const { status, stage, notes } = req.body;
      
      if (!status && !stage) {
        return res.status(400).json({ message: "Status or stage is required" });
      }
      
      // Find case by external reference
      const case_ = await storage.getCaseByExternalRef(externalRef);
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Update case
      const updates: any = {};
      if (status) updates.status = status;
      if (stage) updates.stage = stage;
      
      const updatedCase = await storage.updateCase(case_.id, updates);
      
      // Case activities are now only created via dedicated API endpoint
      // No automatic activity generation
      
      res.json({ 
        message: "Case status updated successfully", 
        case: updatedCase,
        timestamp: new Date().toISOString(),
        refreshRequired: true 
      });
    } catch (error) {
      console.error("Error updating case status via external API:", error);
      res.status(500).json({ message: "Failed to update case status" });
    }
  });



  // Case balance update endpoint (matching your case management system format)
  app.post('/api/external/case/update', async (req: any, res) => {
    try {
      console.log('External API request received:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        contentType: req.get('Content-Type')
      });
      
      const { organisation_id, username, password, external_case_ref, balance, original_amount, outstanding_amount, status, stage, notes, costs_added, interest_added, fees_added, assigned_to } = req.body;
      
      if (!organisation_id || !username || !password || !external_case_ref) {
        return res.status(400).json({ 
          message: "organisation_id, username, password, and external_case_ref are required" 
        });
      }
      
      // Validate credentials against organisation
      const organisationIdInt = parseInt(organisation_id);
      const isValidCredentials = await storage.verifyExternalApiCredential(organisationIdInt, username, password);
      if (!isValidCredentials) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Get organisation
      const organisation = await storage.getOrganisation(organisationIdInt);
      if (!organisation) {
        return res.status(404).json({ message: "Organisation not found" });
      }
      
      // Find case by external reference
      const case_ = await storage.getCaseByExternalRef(external_case_ref);
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Prepare updates
      const updates: any = {};
      const activities: string[] = [];
      
      if (balance !== undefined || original_amount !== undefined) {
        const amount = balance || original_amount;
        updates.originalAmount = parseFloat(amount.toString());
        activities.push(`original amount updated to £${amount}`);
      }
      
      if (outstanding_amount !== undefined) {
        updates.outstandingAmount = parseFloat(outstanding_amount.toString());
        activities.push(`outstanding amount updated to £${outstanding_amount}`);
      }
      
      if (costs_added !== undefined) {
        updates.costsAdded = parseFloat(costs_added.toString());
        activities.push(`costs added updated to £${costs_added}`);
      }
      
      if (interest_added !== undefined) {
        updates.interestAdded = parseFloat(interest_added.toString());
        activities.push(`interest added updated to £${interest_added}`);
      }
      
      if (fees_added !== undefined) {
        updates.feesAdded = parseFloat(fees_added.toString());
        activities.push(`fees added updated to £${fees_added}`);
      }
      
      if (status) {
        updates.status = status;
        activities.push(`status changed to ${status}`);
      }
      
      if (stage) {
        updates.stage = stage;
        activities.push(`stage changed to ${stage}`);
      }
      
      if (assigned_to !== undefined) {
        updates.assignedTo = assigned_to;
        activities.push(`matter handler updated to ${assigned_to}`);
      }
      
      // Update case if there are changes
      let updatedCase = case_;
      if (Object.keys(updates).length > 0) {
        updatedCase = await storage.updateCase(case_.id, updates);
        
        // Audit the case update from external system
        await storage.auditChange(
          'cases',
          case_.id.toString(),
          'UPDATE',
          case_,
          updatedCase,
          undefined, // External system update
          'External System',
          req.ip,
          req.get('User-Agent'),
          case_.organisationId,
          `Case updated via external API by ${username}`
        );
        
        // Case activities are now only created via dedicated API endpoint
        // No automatic activity generation - handled manually via PAI push
      }
      
      // Return success response with case ID (matching your workflow expectation)
      res.json({ 
        message: Object.keys(updates).length > 0 ? "Case updated successfully" : "Case found", 
        id: case_.id,
        case: updatedCase,
        updates: activities
      });
    } catch (error) {
      console.error("Error updating case via external API:", error);
      res.status(500).json({ message: "Failed to update case" });
    }
  });

  // Bulk data sync endpoint
  app.post('/api/external/sync', async (req: any, res) => {
    try {
      // TODO: Add API key authentication here
      const { organisations, users, cases, payments } = req.body;
      
      const results = {
        organisations: { created: 0, updated: 0, errors: [] },
        users: { created: 0, updated: 0, errors: [] },
        cases: { created: 0, updated: 0, errors: [] },
        payments: { created: 0, updated: 0, errors: [] },
      };
      
      // Process organisations first
      if (organisations && Array.isArray(organisations)) {
        for (const org of organisations) {
          try {
            const existing = await storage.getOrganisationByExternalRef(org.externalRef);
            if (existing) {
              await storage.updateOrganisation(existing.id, org);
              results.organisations.updated++;
            } else {
              await storage.createOrganisation(org);
              results.organisations.created++;
            }
          } catch (error) {
            results.organisations.errors.push({ externalRef: org.externalRef, error: error.message });
          }
        }
      }
      
      // Process users
      if (users && Array.isArray(users)) {
        for (const user of users) {
          try {
            const existing = await storage.getUserByExternalRef(user.externalRef);
            if (existing) {
              await storage.updateUser(existing.id, user);
              results.users.updated++;
            } else {
              await storage.createUserWithExternalRef(user);
              results.users.created++;
            }
          } catch (error) {
            results.users.errors.push({ externalRef: user.externalRef, error: error.message });
          }
        }
      }
      
      // Process cases
      if (cases && Array.isArray(cases)) {
        for (const case_ of cases) {
          try {
            const existing = await storage.getCaseByExternalRef(case_.externalRef);
            if (existing) {
              await storage.updateCase(existing.id, case_);
              results.cases.updated++;
            } else {
              const newCase = await storage.createCase(case_);
              results.cases.created++;
              
              // Auto-mute for users in organisation who have auto-mute preference enabled
              if (case_.organisationId) {
                try {
                  const orgUsers = await storage.getUsersInOrganisation(case_.organisationId);
                  for (const user of orgUsers) {
                    if (getAutoMuteNewCases(user.id)) {
                      await storage.muteCase(user.id, newCase.id);
                    }
                  }
                } catch (autoMuteError) {
                  console.error("Error applying auto-mute for bulk case:", autoMuteError);
                }
              }
            }
          } catch (error) {
            results.cases.errors.push({ externalRef: case_.externalRef, error: error.message });
          }
        }
      }
      
      // Process payments
      if (payments && Array.isArray(payments)) {
        for (const payment of payments) {
          try {
            await storage.createPayment(payment);
            results.payments.created++;
          } catch (error) {
            results.payments.errors.push({ externalRef: payment.externalRef, error: error.message });
          }
        }
      }
      
      res.json({ message: "Bulk sync completed", results });
    } catch (error) {
      console.error("Error in bulk sync via external API:", error);
      res.status(500).json({ message: "Failed to complete bulk sync" });
    }
  });

  // Delete payment by external reference (for case management system)
  app.delete('/api/external/payments/:externalRef', async (req: any, res) => {
    try {
      // TODO: Add API key authentication here
      const externalRef = req.params.externalRef;
      
      // Find payment by external reference
      const payment = await storage.getPaymentByExternalRef(externalRef);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Delete payment
      await storage.deletePayment(payment.id, payment.organisationId);
      
      // Case activities are now only created via dedicated API endpoint
      // No automatic activity generation
      
      res.json({ message: "Payment deleted successfully", paymentId: payment.id });
    } catch (error) {
      console.error("Error deleting payment via external API:", error);
      res.status(500).json({ message: "Failed to delete payment" });
    }
  });

  // Bulk delete payments by case external reference
  app.delete('/api/external/cases/:externalRef/payments', async (req: any, res) => {
    try {
      // TODO: Add API key authentication here
      const externalRef = req.params.externalRef;
      
      // Find case by external reference
      const case_ = await storage.getCaseByExternalRef(externalRef);
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Get all payments for the case
      const payments = await storage.getPaymentsForCase(case_.id);
      
      // Delete all payments
      for (const payment of payments) {
        await storage.deletePayment(payment.id, case_.organisationId);
      }
      
      // Case activities are now only created via dedicated API endpoint
      // No automatic activity generation
      
      res.json({ 
        message: "All payments deleted successfully", 
        deletedCount: payments.length 
      });
    } catch (error) {
      console.error("Error bulk deleting payments via external API:", error);
      res.status(500).json({ message: "Failed to delete payments" });
    }
  });

  // Reverse specific payment by external reference
  app.post('/api/external/payments/:externalRef/reverse', async (req: any, res) => {
    try {
      // TODO: Add API key authentication here
      const externalRef = req.params.externalRef;
      const { reason, reversalRef } = req.body;
      
      // Find payment by external reference
      const payment = await storage.getPaymentByExternalRef(externalRef);
      
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // Create reversal payment (negative amount)
      const reversal = await storage.createPayment({
        caseId: payment.caseId,
        amount: `-${payment.amount}`,
        paymentDate: new Date(),
        paymentMethod: 'REVERSAL',
        reference: reversalRef || `REV-${payment.reference}`,
        notes: `Reversal of payment ${payment.reference}. Reason: ${reason}`,
        organisationId: payment.organisationId,
        recordedBy: 'SYSTEM',
        externalRef: `${externalRef}-REVERSAL`,
      });
      
      // Case activities are now only created via dedicated API endpoint
      // No automatic activity generation
      
      res.json({ 
        message: "Payment reversed successfully", 
        originalPayment: payment,
        reversalPayment: reversal
      });
    } catch (error) {
      console.error("Error reversing payment via external API:", error);
      res.status(500).json({ message: "Failed to reverse payment" });
    }
  });

  // Admin case management routes
  app.get("/api/admin/cases/all", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const cases = await storage.getAllCasesIncludingArchived();
      res.json(cases);
    } catch (error) {
      console.error("Error fetching all cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.put("/api/admin/cases/:id/archive", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const caseId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const archivedCase = await storage.archiveCase(caseId, userId);
      
      res.json({
        message: "Case archived successfully",
        case: archivedCase,
      });
    } catch (error) {
      console.error("Error archiving case:", error);
      res.status(500).json({ message: "Failed to archive case" });
    }
  });

  app.put("/api/admin/cases/:id/unarchive", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const caseId = parseInt(req.params.id);
      const userId = req.user.id;
      
      const unarchivedCase = await storage.unarchiveCase(caseId, userId);
      
      res.json({
        message: "Case unarchived successfully",
        case: unarchivedCase,
      });
    } catch (error) {
      console.error("Error unarchiving case:", error);
      res.status(500).json({ message: "Failed to unarchive case" });
    }
  });

  app.delete("/api/admin/cases/:id", isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const caseId = parseInt(req.params.id);
      
      // Get case details before deletion for logging
      const caseDetails = await storage.getCaseById(caseId);
      if (!caseDetails) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      await storage.deleteCase(caseId);
      
      res.json({
        message: "Case and all associated data permanently deleted",
        deletedCase: {
          id: caseDetails.id,
          accountNumber: caseDetails.accountNumber,
          caseName: caseDetails.caseName,
        },
      });
    } catch (error) {
      console.error("Error deleting case:", error);
      res.status(500).json({ message: "Failed to delete case" });
    }
  });

  // Case access restrictions - admin can hide cases from specific users
  app.get("/api/admin/cases/:id/access-restrictions", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const caseId = parseInt(req.params.id);
      const blockedUserIds = await storage.getCaseAccessRestrictions(caseId);
      res.json({ caseId, blockedUserIds });
    } catch (error) {
      console.error("Error getting case access restrictions:", error);
      res.status(500).json({ message: "Failed to get access restrictions" });
    }
  });

  app.post("/api/admin/cases/:id/access-restrictions", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const caseId = parseInt(req.params.id);
      const { blockedUserIds } = req.body;
      const adminId = req.user.id;

      if (!Array.isArray(blockedUserIds)) {
        return res.status(400).json({ message: "blockedUserIds must be an array" });
      }

      // Get current restrictions
      const currentRestrictions = await storage.getCaseAccessRestrictions(caseId);

      // Remove restrictions that are no longer in the list
      for (const userId of currentRestrictions) {
        if (!blockedUserIds.includes(userId)) {
          await storage.removeCaseAccessRestriction(caseId, userId);
        }
      }

      // Add new restrictions
      for (const userId of blockedUserIds) {
        if (!currentRestrictions.includes(userId)) {
          await storage.addCaseAccessRestriction(caseId, userId, adminId);
        }
      }

      res.json({ message: "Access restrictions updated", caseId, blockedUserIds });
    } catch (error) {
      console.error("Error updating case access restrictions:", error);
      res.status(500).json({ message: "Failed to update access restrictions" });
    }
  });

  // Closed case management - get closed cases with date range filter
  app.get("/api/admin/closed-cases", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const cases = await storage.getClosedCasesWithDateFilter(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(cases);
    } catch (error) {
      console.error("Error fetching closed cases:", error);
      res.status(500).json({ message: "Failed to fetch closed cases" });
    }
  });

  // Bulk archive cases
  app.post("/api/admin/cases/bulk-archive", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { caseIds } = req.body;
      const userId = req.user.id;
      const adminUser = await storage.getUser(userId);
      
      if (!Array.isArray(caseIds) || caseIds.length === 0) {
        return res.status(400).json({ message: "caseIds must be a non-empty array" });
      }
      
      const results = [];
      for (const caseId of caseIds) {
        try {
          const caseDetails = await storage.getCaseById(caseId);
          const archivedCase = await storage.archiveCase(caseId, userId);
          results.push({ caseId, success: true, case: archivedCase });
          
          // Log admin action
          if (adminUser && caseDetails) {
            await logAdminAction({
              adminUser,
              tableName: 'cases',
              recordId: String(caseId),
              operation: 'UPDATE',
              fieldName: 'isArchived',
              description: `Bulk archived case "${caseDetails.caseName}" (${caseDetails.accountNumber})`,
              oldValue: 'false',
              newValue: 'true',
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
            });
          }
        } catch (err) {
          results.push({ caseId, success: false, error: 'Failed to archive' });
        }
      }
      
      res.json({
        message: `Archived ${results.filter(r => r.success).length} of ${caseIds.length} cases`,
        results,
      });
    } catch (error) {
      console.error("Error bulk archiving cases:", error);
      res.status(500).json({ message: "Failed to bulk archive cases" });
    }
  });

  // Bulk delete cases
  app.post("/api/admin/cases/bulk-delete", isAuthenticated, isAdmin, isSuperAdmin, async (req: any, res) => {
    try {
      const { caseIds } = req.body;
      const adminUser = await storage.getUser(req.user.id);
      
      if (!Array.isArray(caseIds) || caseIds.length === 0) {
        return res.status(400).json({ message: "caseIds must be a non-empty array" });
      }
      
      const results = [];
      for (const caseId of caseIds) {
        try {
          const caseDetails = await storage.getCaseById(caseId);
          if (!caseDetails) {
            results.push({ caseId, success: false, error: 'Case not found' });
            continue;
          }
          
          await storage.deleteCase(caseId);
          results.push({ 
            caseId, 
            success: true, 
            deletedCase: { 
              id: caseDetails.id, 
              accountNumber: caseDetails.accountNumber, 
              caseName: caseDetails.caseName 
            } 
          });
          
          // Log admin action
          if (adminUser) {
            await logAdminAction({
              adminUser,
              tableName: 'cases',
              recordId: String(caseId),
              operation: 'DELETE',
              description: `Bulk deleted case "${caseDetails.caseName}" (${caseDetails.accountNumber}) and all associated data`,
              oldValue: JSON.stringify({ id: caseDetails.id, accountNumber: caseDetails.accountNumber, caseName: caseDetails.caseName }),
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
            });
          }
        } catch (err) {
          results.push({ caseId, success: false, error: 'Failed to delete' });
        }
      }
      
      res.json({
        message: `Deleted ${results.filter(r => r.success).length} of ${caseIds.length} cases`,
        results,
      });
    } catch (error) {
      console.error("Error bulk deleting cases:", error);
      res.status(500).json({ message: "Failed to bulk delete cases" });
    }
  });

  // Download API Integration Guide as PDF
  app.get('/api/download/api-guide', async (req, res) => {
    try {
      // Check if the HTML file exists
      const htmlPath = path.join(process.cwd(), 'API_INTEGRATION_GUIDE.html');
      if (!fs.existsSync(htmlPath)) {
        return res.status(404).json({ message: 'API guide not found' });
      }
      
      // Read the HTML content
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Set headers for HTML display
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'inline; filename="Acclaim_API_Integration_Guide.html"');
      
      res.send(htmlContent);
      
    } catch (error) {
      console.error('Error serving API guide:', error);
      res.status(500).json({ message: 'Failed to serve API guide' });
    }
  });

  // Download Case Management Integration Guide
  app.get('/api/download/case-management-guide', async (req, res) => {
    try {
      // Check if the HTML file exists
      const htmlPath = path.join(process.cwd(), 'CASE_MANAGEMENT_INTEGRATION_GUIDE.html');
      if (!fs.existsSync(htmlPath)) {
        return res.status(404).json({ message: 'Case management integration guide not found' });
      }
      
      // Read the HTML content
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Set headers for HTML display
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'inline; filename="Acclaim_Case_Management_Integration_Guide.html"');
      
      res.send(htmlContent);
      
    } catch (error) {
      console.error('Error serving case management integration guide:', error);
      res.status(500).json({ message: 'Failed to serve case management integration guide' });
    }
  });

  // External API credentials management
  app.post('/api/admin/external-credentials', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { organisationId, username, password, description } = req.body;
      
      if (!organisationId || !username || !password) {
        return res.status(400).json({ 
          message: "organisationId, username, and password are required" 
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      const credential = await storage.createExternalApiCredential({
        organisationId: parseInt(organisationId),
        username,
        hashedPassword,
        description,
        createdBy: userId,
      });

      res.status(201).json({ 
        message: "External API credentials created successfully", 
        credential: { ...credential, hashedPassword: undefined } // Don't return the hash
      });
    } catch (error) {
      console.error("Error creating external API credentials:", error);
      res.status(500).json({ message: "Failed to create external API credentials" });
    }
  });

  app.get('/api/admin/external-credentials', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const organisations = await storage.getAllOrganisations();
      const credentialsWithOrgs = [];

      for (const org of organisations) {
        const credentials = await storage.getExternalApiCredentials(org.id);
        credentialsWithOrgs.push({
          organisationId: org.id,
          organisationName: org.name,
          credentials: credentials.map(cred => ({
            ...cred,
            hashedPassword: undefined // Don't return the hash
          }))
        });
      }

      res.json(credentialsWithOrgs);
    } catch (error) {
      console.error("Error fetching external API credentials:", error);
      res.status(500).json({ message: "Failed to fetch external API credentials" });
    }
  });

  app.delete('/api/admin/external-credentials/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const credentialId = parseInt(req.params.id);
      await storage.deleteExternalApiCredential(credentialId);
      
      res.json({ message: "External API credentials deleted successfully" });
    } catch (error) {
      console.error("Error deleting external API credentials:", error);
      res.status(500).json({ message: "Failed to delete external API credentials" });
    }
  });

  app.patch('/api/admin/external-credentials/:id/reset-password', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const credentialId = parseInt(req.params.id);
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await storage.updateExternalApiCredential(credentialId, {
        hashedPassword
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting external API credential password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Download User Guide
  app.get('/api/download/user-guide', async (req, res) => {
    try {
      // Check if the HTML file exists
      const htmlPath = path.join(process.cwd(), 'USER_GUIDE.html');
      if (!fs.existsSync(htmlPath)) {
        return res.status(404).json({ message: 'User guide not found' });
      }
      
      // Read the HTML content
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Set headers for HTML display
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', 'inline; filename="Acclaim_User_Guide.html"');
      
      res.send(htmlContent);
      
    } catch (error) {
      console.error('Error serving user guide:', error);
      res.status(500).json({ message: 'Failed to serve user guide' });
    }
  });

  // Download User Guide as Word Document
  app.get('/api/download/user-guide-word', async (req, res) => {
    try {
      // Create a new Word document
      const docx = officegen('docx');
      
      // Set document properties
      docx.creator = 'Acclaim Credit Management & Recovery';
      docx.title = 'Acclaim Portal User Guide';
      docx.subject = 'Complete guide to using your debt recovery case management system';
      
      // Add header
      const headerParagraph = docx.createP();
      headerParagraph.addText('Acclaim Portal User Guide', { 
        font_size: 24, 
        bold: true, 
        color: '006B5B' 
      });
      headerParagraph.addLineBreak();
      headerParagraph.addText('Complete guide to using your debt recovery case management system', { 
        font_size: 14, 
        color: '666666' 
      });
      
      // Add some space
      docx.createP().addLineBreak();
      
      // Table of Contents
      const tocParagraph = docx.createP();
      tocParagraph.addText('Table of Contents', { 
        font_size: 18, 
        bold: true, 
        color: '006B5B' 
      });
      docx.createP().addLineBreak();
      
      const tocList = [
        '1. Getting Started',
        '2. Dashboard Overview',
        '3. Case Management',
        '4. Messaging System',
        '5. Document Management',
        '6. Reports & Analytics',
        '7. User Profile & Settings',
        '8. Troubleshooting'
      ];
      
      tocList.forEach(item => {
        const tocItem = docx.createP();
        tocItem.addText(item, { font_size: 12 });
      });
      
      docx.createP().addLineBreak();
      
      // Getting Started Section
      const gettingStartedHeader = docx.createP();
      gettingStartedHeader.addText('1. Getting Started', { 
        font_size: 18, 
        bold: true, 
        color: '006B5B' 
      });
      
      const loginHeader = docx.createP();
      loginHeader.addText('Logging In', { 
        font_size: 14, 
        bold: true 
      });
      
      const loginSteps = [
        'Navigate to the portal: Go to your Acclaim Portal URL provided by your administrator',
        'Click "Log In": Click the login button to access the authentication system',
        'Enter credentials: Use your email and password provided by your administrator'
      ];
      
      loginSteps.forEach((step, index) => {
        const stepP = docx.createP();
        stepP.addText(`${index + 1}. ${step}`, { font_size: 12 });
      });
      
      const firstTimeNote = docx.createP();
      firstTimeNote.addText('First-time users: You may be required to change your password on first login for security purposes.', { 
        font_size: 12, 
        italic: true,
        color: '0066CC'
      });
      
      docx.createP().addLineBreak();
      
      // Navigation Overview
      const navHeader = docx.createP();
      navHeader.addText('Navigation Overview', { 
        font_size: 14, 
        bold: true 
      });
      
      const navText = docx.createP();
      navText.addText('Once logged in, you\'ll see the main navigation with the following sections:', { font_size: 12 });
      
      const navItems = [
        'Dashboard - Overview of your cases and statistics',
        'Cases - Manage your debt recovery cases',
        'Messages - Communication with your recovery team',
        'Documents - File management and uploads',
        'Reports - Analytics and performance tracking',
        'Submit Case - Create new recovery cases'
      ];
      
      navItems.forEach(item => {
        const navItem = docx.createP();
        navItem.addText(`• ${item}`, { font_size: 12 });
      });
      
      docx.createP().addLineBreak();
      
      // Dashboard Overview Section
      const dashboardHeader = docx.createP();
      dashboardHeader.addText('2. Dashboard Overview', { 
        font_size: 18, 
        bold: true, 
        color: '006B5B' 
      });
      
      const dashboardText = docx.createP();
      dashboardText.addText('The dashboard provides a comprehensive overview of your case management activities and key performance metrics.', { font_size: 12 });
      
      // Screenshot placeholder
      const screenshotNote = docx.createP();
      screenshotNote.addText('[INSERT SCREENSHOT: Dashboard showing case statistics, recent activity, and navigation options]', { 
        font_size: 12, 
        italic: true,
        color: '0066CC'
      });
      
      docx.createP().addLineBreak();
      
      const keyStatsHeader = docx.createP();
      keyStatsHeader.addText('Key Statistics', { 
        font_size: 14, 
        bold: true 
      });
      
      const statsItems = [
        'Active Cases - Number of cases currently in progress',
        'Closed Cases - Successfully resolved cases',
        'Outstanding Amount - Total amount to be recovered',
        'Recovery Amount - Total amount recovered so far'
      ];
      
      statsItems.forEach(item => {
        const statsItem = docx.createP();
        statsItem.addText(`• ${item}`, { font_size: 12 });
      });
      
      docx.createP().addLineBreak();
      
      // Case Management Section
      const caseHeader = docx.createP();
      caseHeader.addText('3. Case Management', { 
        font_size: 18, 
        bold: true, 
        color: '006B5B' 
      });
      
      const caseViewHeader = docx.createP();
      caseViewHeader.addText('Viewing Your Cases', { 
        font_size: 14, 
        bold: true 
      });
      
      const caseSteps = [
        'Navigate to Cases: Click on "Cases" in the main navigation',
        'Review case list: You\'ll see all your cases with key information including account number, case name, outstanding amount, current status, and recovery stage'
      ];
      
      caseSteps.forEach((step, index) => {
        const stepP = docx.createP();
        stepP.addText(`${index + 1}. ${step}`, { font_size: 12 });
      });
      
      const visualRef = docx.createP();
      visualRef.addText('Visual Reference: The screenshots in this guide show the actual interface you\'ll see when using the portal. All features and layouts are current as of the latest system update.', { 
        font_size: 12, 
        italic: true,
        color: '0066CC'
      });
      
      docx.createP().addLineBreak();
      
      // Case Status Indicators
      const statusHeader = docx.createP();
      statusHeader.addText('Case Status Indicators', { 
        font_size: 14, 
        bold: true 
      });
      
      const statusItems = [
        'Pre-Legal - Initial contact and negotiation phase',
        'Claim - Legal claim has been filed',
        'Judgment - Court judgment obtained',
        'Enforcement - Enforcement action being taken',
        'Paid/Payment Plan - Payment received or plan in place'
      ];
      
      statusItems.forEach(item => {
        const statusItem = docx.createP();
        statusItem.addText(`• ${item}`, { font_size: 12 });
      });
      
      docx.createP().addLineBreak();
      
      // Case Filtering and Search
      const filteringHeader = docx.createP();
      filteringHeader.addText('Case Filtering and Search', { 
        font_size: 14, 
        bold: true 
      });
      
      const filteringText = docx.createP();
      filteringText.addText('Use the filtering options at the top of the Cases page:', { font_size: 12 });
      
      const filterOptions = [
        'Active - Shows only active cases currently being worked on',
        'Closed - Shows only resolved cases',
        'All - Shows all cases regardless of status',
        'Search - Type keywords to find specific cases by name or account number'
      ];
      
      filterOptions.forEach(option => {
        const optionP = docx.createP();
        optionP.addText(`• ${option}`, { font_size: 12 });
      });
      
      const smartSearchNote = docx.createP();
      smartSearchNote.addText('Smart Search: The search automatically expands to search all cases, even when viewing filtered results.', { 
        font_size: 12, 
        italic: true,
        color: '0066CC'
      });
      
      docx.createP().addLineBreak();
      
      // Case Details
      const detailsHeader = docx.createP();
      detailsHeader.addText('Viewing Case Details', { 
        font_size: 14, 
        bold: true 
      });
      
      const detailsText = docx.createP();
      detailsText.addText('Click on any case to view comprehensive details in an expanded dialog:', { font_size: 12 });
      
      const detailsTabs = [
        'Timeline - Complete history of case activities and progress',
        'Documents - All files and attachments related to the case',
        'Messages - Communication history specific to this case',
        'Payments - Payment history and outstanding amounts'
      ];
      
      detailsTabs.forEach(tab => {
        const tabP = docx.createP();
        tabP.addText(`• ${tab}`, { font_size: 12 });
      });
      
      const screenshotPlaceholder1 = docx.createP();
      screenshotPlaceholder1.addText('[INSERT SCREENSHOT: Case detail dialog showing timeline tab with case activities]', { 
        font_size: 12, 
        italic: true,
        color: '0066CC'
      });
      
      docx.createP().addLineBreak();
      
      // Messaging System Section
      const messagingHeader = docx.createP();
      messagingHeader.addText('4. Messaging System', { 
        font_size: 18, 
        bold: true, 
        color: '006B5B' 
      });
      
      const messagingIntro = docx.createP();
      messagingIntro.addText('The messaging system allows you to communicate directly with your recovery team about cases and general enquiries.', { font_size: 12 });
      
      const sendingHeader = docx.createP();
      sendingHeader.addText('Sending Messages', { 
        font_size: 14, 
        bold: true 
      });
      
      const sendingSteps = [
        'Navigate to Messages: Click "Messages" in the main navigation',
        'Click "New Message": Use the green "New Message" button',
        'Select recipient: Choose "Recovery Team" from the dropdown',
        'Link to case (optional): Select a case to associate the message with',
        'Write your message: Include all relevant details',
        'Attach files (optional): Use the "Attach File" button if needed',
        'Send: Click the "Send" button to deliver your message'
      ];
      
      sendingSteps.forEach((step, index) => {
        const stepP = docx.createP();
        stepP.addText(`${index + 1}. ${step}`, { font_size: 12 });
      });
      
      const messagingTip = docx.createP();
      messagingTip.addText('Communication tip: Be specific about your case when sending messages. Include account numbers or case names for faster responses.', { 
        font_size: 12, 
        italic: true,
        color: '0066CC'
      });
      
      const screenshotPlaceholder2 = docx.createP();
      screenshotPlaceholder2.addText('[INSERT SCREENSHOT: New message composition form showing case selection and file attachment options]', { 
        font_size: 12, 
        italic: true,
        color: '0066CC'
      });
      
      docx.createP().addLineBreak();
      
      // Reading Messages
      const readingHeader = docx.createP();
      readingHeader.addText('Reading Messages', { 
        font_size: 14, 
        bold: true 
      });
      
      const readingText = docx.createP();
      readingText.addText('Your inbox shows all messages with status indicators:', { font_size: 12 });
      
      const statusIndicators = [
        'New - Unread messages (highlighted in blue)',
        'Read - Previously opened messages',
        'Sent - Messages you have sent to the team'
      ];
      
      statusIndicators.forEach(indicator => {
        const indicatorP = docx.createP();
        indicatorP.addText(`• ${indicator}`, { font_size: 12 });
      });
      
      docx.createP().addLineBreak();
      
      // Document Management Section
      const documentsHeader = docx.createP();
      documentsHeader.addText('5. Document Management', { 
        font_size: 18, 
        bold: true, 
        color: '006B5B' 
      });
      
      const documentsIntro = docx.createP();
      documentsIntro.addText('The document management system allows you to upload, organise, and download files related to your cases.', { font_size: 12 });
      
      const uploadingHeader = docx.createP();
      uploadingHeader.addText('Uploading Documents', { 
        font_size: 14, 
        bold: true 
      });
      
      const uploadingSteps = [
        'Navigate to Documents: Click "Documents" in the main navigation',
        'Click "Upload File": Use the green "Upload File" button',
        'Select case: Choose which case this document relates to',
        'Choose file: Browse and select your file (max 10MB)',
        'Add description: Provide a brief description of the document'
      ];
      
      uploadingSteps.forEach((step, index) => {
        const stepP = docx.createP();
        stepP.addText(`${index + 1}. ${step}`, { font_size: 12 });
      });
      
      const supportedFormats = docx.createP();
      supportedFormats.addText('Supported file formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Maximum file size: 10MB)', { 
        font_size: 12, 
        italic: true,
        color: '666666'
      });
      
      const screenshotPlaceholder3 = docx.createP();
      screenshotPlaceholder3.addText('[INSERT SCREENSHOT: Document upload form showing case selection and file picker]', { 
        font_size: 12, 
        italic: true,
        color: '0066CC'
      });
      
      docx.createP().addLineBreak();
      
      // Document Organisation
      const organisationHeader = docx.createP();
      organisationHeader.addText('Document Organisation & Pagination', { 
        font_size: 14, 
        bold: true 
      });
      
      const organisationText = docx.createP();
      organisationText.addText('Documents are automatically organised and displayed with pagination for optimal performance:', { font_size: 12 });
      
      const organisationFeatures = [
        'Chronological order - Most recent uploads first',
        'Case association - Documents are linked to specific cases',
        'Pagination - 20 documents per page for fast loading',
        'Search functionality - Find documents quickly by name or description',
        'File type indicators - Visual icons show document types'
      ];
      
      organisationFeatures.forEach(feature => {
        const featureP = docx.createP();
        featureP.addText(`• ${feature}`, { font_size: 12 });
      });
      
      const paginationNote = docx.createP();
      paginationNote.addText('Pagination Benefits: Limiting to 20 items per page ensures fast loading even with thousands of documents. Use the Previous/Next buttons to navigate between pages.', { 
        font_size: 12, 
        italic: true,
        color: '0066CC'
      });
      
      docx.createP().addLineBreak();
      
      // Downloading Documents
      const downloadingHeader = docx.createP();
      downloadingHeader.addText('Downloading Documents', { 
        font_size: 14, 
        bold: true 
      });
      
      const downloadingText = docx.createP();
      downloadingText.addText('You can download documents at any time by:', { font_size: 12 });
      
      const downloadingSteps = [
        'Finding the document in your document list',
        'Clicking the "Download" button next to the file',
        'The file will be saved to your device\'s Downloads folder'
      ];
      
      downloadingSteps.forEach((step, index) => {
        const stepP = docx.createP();
        stepP.addText(`${index + 1}. ${step}`, { font_size: 12 });
      });
      
      docx.createP().addLineBreak();
      
      // Reports & Analytics Section
      const reportsHeader = docx.createP();
      reportsHeader.addText('6. Reports & Analytics', { 
        font_size: 18, 
        bold: true, 
        color: '006B5B' 
      });
      
      const reportsIntro = docx.createP();
      reportsIntro.addText('The Reports section provides detailed analytics and insights into your debt recovery performance.', { font_size: 12 });
      
      const availableReports = [
        'Case Summary Report - Overview of all cases with current status and amounts',
        'Recovery Analysis Report - Detailed analysis of recovery performance and trends', 
        'Activity Report - Timeline of all case activities and progress',
        'Payment Report - Comprehensive payment history and analysis'
      ];
      
      const reportsListHeader = docx.createP();
      reportsListHeader.addText('Available Reports', { 
        font_size: 14, 
        bold: true 
      });
      
      availableReports.forEach(report => {
        const reportP = docx.createP();
        reportP.addText(`• ${report}`, { font_size: 12 });
      });
      
      const exportNote = docx.createP();
      exportNote.addText('Export Options: All reports can be exported to Excel format for further analysis and record-keeping.', { 
        font_size: 12, 
        italic: true,
        color: '0066CC'
      });
      
      docx.createP().addLineBreak();
      
      // User Profile & Settings Section
      const profileHeader = docx.createP();
      profileHeader.addText('7. User Profile & Settings', { 
        font_size: 18, 
        bold: true, 
        color: '006B5B' 
      });
      
      const profileIntro = docx.createP();
      profileIntro.addText('Access your user profile and account settings through the user menu in the top-right corner.', { font_size: 12 });
      
      const profileFeatures = [
        'View profile information - See your name, email, and organisation details',
        'Change password - Update your login password for security',
        'Account settings - Manage your account preferences',
        'Logout - Securely sign out of the system'
      ];
      
      const profileFeaturesHeader = docx.createP();
      profileFeaturesHeader.addText('Profile Features', { 
        font_size: 14, 
        bold: true 
      });
      
      profileFeatures.forEach(feature => {
        const featureP = docx.createP();
        featureP.addText(`• ${feature}`, { font_size: 12 });
      });
      
      const securityNote = docx.createP();
      securityNote.addText('Security: Always log out when using shared computers and change your password regularly for account security.', { 
        font_size: 12, 
        italic: true,
        color: '0066CC'
      });
      
      docx.createP().addLineBreak();
      
      // Troubleshooting Section
      const troubleshootingHeader = docx.createP();
      troubleshootingHeader.addText('8. Troubleshooting & FAQ', { 
        font_size: 18, 
        bold: true, 
        color: '006B5B' 
      });
      
      const faqHeader = docx.createP();
      faqHeader.addText('Frequently Asked Questions', { 
        font_size: 14, 
        bold: true 
      });
      
      // FAQ items
      const faqItems = [
        {
          question: 'Why can I only see 20 items per page?',
          answer: 'Pagination improves system performance by loading pages quickly, even with thousands of records. Use the navigation controls to browse through pages.'
        },
        {
          question: 'How do I search across all cases when I have a filter applied?',
          answer: 'The search function automatically expands to search all cases regardless of your current filter selection.'
        },
        {
          question: 'What file types can I upload?',
          answer: 'Supported formats include PDF, DOC, DOCX, XLS, XLSX, JPG, and PNG files up to 10MB in size.'
        },
        {
          question: 'Why can\'t I see certain menu options?',
          answer: 'Menu visibility depends on your user permissions. Contact your administrator if you need access to additional features.'
        },
        {
          question: 'How do I reset my password?',
          answer: 'Contact your system administrator to reset your password. They can provide you with temporary credentials.'
        }
      ];
      
      faqItems.forEach(item => {
        const questionP = docx.createP();
        questionP.addText(`Q: ${item.question}`, { 
          font_size: 12, 
          bold: true 
        });
        
        const answerP = docx.createP();
        answerP.addText(`A: ${item.answer}`, { font_size: 12 });
        
        docx.createP().addLineBreak();
      });
      
      // Browser Compatibility
      const browserHeader = docx.createP();
      browserHeader.addText('Browser Compatibility', { 
        font_size: 14, 
        bold: true 
      });
      
      const browserText = docx.createP();
      browserText.addText('For the best experience, use:', { font_size: 12 });
      
      const browsers = [
        'Google Chrome (recommended)',
        'Mozilla Firefox',
        'Microsoft Edge',
        'Safari (Mac users)'
      ];
      
      browsers.forEach(browser => {
        const browserP = docx.createP();
        browserP.addText(`• ${browser}`, { font_size: 12 });
      });
      
      docx.createP().addLineBreak();
      
      // Getting Help
      const helpHeader = docx.createP();
      helpHeader.addText('Getting Help', { 
        font_size: 14, 
        bold: true 
      });
      
      const helpText = docx.createP();
      helpText.addText('If you need assistance:', { font_size: 12 });
      
      const helpOptions = [
        'Use the messaging system to contact your recovery team',
        'Contact your system administrator for technical issues',
        'Refer to this user guide for step-by-step instructions',
        'Check the FAQ section for common questions'
      ];
      
      helpOptions.forEach((option, index) => {
        const optionP = docx.createP();
        optionP.addText(`${index + 1}. ${option}`, { font_size: 12 });
      });
      
      docx.createP().addLineBreak();
      
      // Footer
      const footerP = docx.createP();
      footerP.addText('Acclaim Credit Management & Recovery Portal - User Guide', { 
        font_size: 10, 
        italic: true,
        color: '666666'
      });
      
      const dateP = docx.createP();
      dateP.addText(`Document generated: ${new Date().toLocaleDateString('en-GB')}`, { 
        font_size: 10, 
        italic: true,
        color: '666666'
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="Acclaim_User_Guide.docx"');
      
      // Generate and send the document
      docx.generate(res);
      
    } catch (error) {
      console.error('Error generating Word document:', error);
      res.status(500).json({ message: 'Failed to generate Word document' });
    }
  });

  // Multi-organisation management endpoints
  
  // Get users with their organisations (enhanced admin endpoint)
  app.get('/api/admin/users-with-orgs', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getUsersWithOrganisations();
      // Prevent caching to ensure fresh data after organisation changes
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(users);
    } catch (error) {
      console.error("Error fetching users with organisations:", error);
      res.status(500).json({ message: "Failed to fetch users with organisations" });
    }
  });

  // Add user to organisation
  app.post('/api/admin/users/:userId/organisations', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { organisationId } = req.body;
      const adminUser = await storage.getUser(req.user.id);

      if (!organisationId) {
        return res.status(400).json({ message: "Organisation ID is required" });
      }

      // Get user and org details for audit log
      const targetUser = await storage.getUser(userId);
      const organisation = await storage.getOrganisation(organisationId);
      
      const userOrg = await storage.addUserToOrganisation(userId, organisationId);
      
      // Log admin action
      if (adminUser && targetUser && organisation) {
        const userName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || targetUser.email;
        await logAdminAction({
          adminUser,
          tableName: 'user_organisations',
          recordId: `${userId}-${organisationId}`,
          operation: 'INSERT',
          description: `Assigned user "${userName}" to organisation "${organisation.name}"`,
          newValue: JSON.stringify({ userId, organisationId, organisationName: organisation.name }),
          organisationId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.status(201).json(userOrg);
    } catch (error) {
      console.error("Error adding user to organisation:", error);
      res.status(500).json({ message: "Failed to add user to organisation" });
    }
  });

  // Remove user from organisation
  app.delete('/api/admin/users/:userId/organisations/:organisationId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId, organisationId } = req.params;
      const currentUserId = req.user.id;
      const adminUser = await storage.getUser(currentUserId);
      
      // Get user and org details for audit log before removal
      const targetUser = await storage.getUser(userId);
      const organisation = await storage.getOrganisation(parseInt(organisationId));
      
      console.log(`Admin ${currentUserId} attempting to remove user ${userId} from organisation ${organisationId}`);
      
      // Additional security check: prevent non-admin users from removing themselves from their last organisation
      // Admins can remove themselves from all organisations since they have system-wide access
      if (userId === currentUserId) {
        const user = await storage.getUser(userId);
        
        // Only apply this restriction to non-admin users
        if (!user?.isAdmin) {
          // Check if this is the user's last organisation assignment
          const userOrgs = await storage.getUserOrganisations(userId);
          
          // Count total organisation assignments
          const junctionOrgCount = userOrgs.length;
          const hasLegacyOrg = user?.organisationId ? 1 : 0;
          const totalOrgAssignments = junctionOrgCount + hasLegacyOrg;
          
          // Check if removing this would leave user with no organisations
          const isRemovingFromJunction = userOrgs.some(uo => uo.organisationId === parseInt(organisationId));
          
          let remainingOrgs = totalOrgAssignments;
          if (isRemovingFromJunction) remainingOrgs -= 1;
          // Note: we can't remove legacy org through this endpoint, only junction table entries
          
          const wouldHaveNoOrgs = remainingOrgs <= 0;
          
          if (wouldHaveNoOrgs) {
            return res.status(403).json({ 
              message: "Cannot remove yourself from your last organisation. Assign yourself to another organisation first." 
            });
          }
        }
      }
      
      // Check if we need to remove from legacy organisation field or junction table
      const user = await storage.getUser(userId);
      const userOrgs = await storage.getUserOrganisations(userId);
      const isLegacyOrg = user?.organisationId === parseInt(organisationId);
      const isJunctionOrg = userOrgs.some(uo => uo.organisationId === parseInt(organisationId));
      
      if (isLegacyOrg && !isJunctionOrg) {
        // This is only a legacy organisation - need to change the user's primary organisation
        // Clear it (set to null) or set to another org if they have one
        const otherOrgs = userOrgs.filter(uo => uo.organisationId !== parseInt(organisationId));
        const newPrimaryOrgId = otherOrgs.length > 0 ? otherOrgs[0].organisationId : null;
        
        await storage.updateUserOrganisation(userId, newPrimaryOrgId);
        
        // Log admin action
        if (adminUser && targetUser && organisation) {
          const userName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || targetUser.email;
          await logAdminAction({
            adminUser,
            tableName: 'user_organisations',
            recordId: `${userId}-${organisationId}`,
            operation: 'DELETE',
            description: `Removed user "${userName}" from organisation "${organisation.name}"`,
            oldValue: JSON.stringify({ userId, organisationId: parseInt(organisationId), organisationName: organisation.name }),
            organisationId: parseInt(organisationId),
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
        }
        
        res.status(200).json({ message: "User removed from organisation successfully" });
      } else if (isJunctionOrg) {
        // Remove from junction table
        await storage.removeUserFromOrganisation(userId, parseInt(organisationId));
        
        // Also clear the legacy organisationId if it matches this organisation
        if (isLegacyOrg) {
          const remainingOrgs = userOrgs.filter(uo => uo.organisationId !== parseInt(organisationId));
          const newPrimaryOrgId = remainingOrgs.length > 0 ? remainingOrgs[0].organisationId : null;
          await storage.updateUserOrganisation(userId, newPrimaryOrgId);
        }
        
        // Log admin action
        if (adminUser && targetUser && organisation) {
          const userName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || targetUser.email;
          await logAdminAction({
            adminUser,
            tableName: 'user_organisations',
            recordId: `${userId}-${organisationId}`,
            operation: 'DELETE',
            description: `Removed user "${userName}" from organisation "${organisation.name}"`,
            oldValue: JSON.stringify({ userId, organisationId: parseInt(organisationId), organisationName: organisation.name }),
            organisationId: parseInt(organisationId),
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
        }
        
        res.status(200).json({ message: "User removed from organisation successfully" });
      } else {
        res.status(404).json({ message: "User is not assigned to this organisation" });
      }
    } catch (error) {
      console.error("Error removing user from organisation:", error);
      if (error.message?.includes('duplicate key') || error.message?.includes('already exists')) {
        res.status(400).json({ message: "Operation failed: relationship may not exist" });
      } else {
        res.status(500).json({ message: "Failed to remove user from organisation" });
      }
    }
  });

  // Get user's organisations
  app.get('/api/admin/users/:userId/organisations', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const userOrgs = await storage.getUserOrganisations(userId);
      res.json(userOrgs);
    } catch (error) {
      console.error("Error fetching user organisations:", error);
      res.status(500).json({ message: "Failed to fetch user organisations" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
