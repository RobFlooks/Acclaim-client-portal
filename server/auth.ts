import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { loginRateLimiter } from "./rate-limiter";
import { sendGridEmailService } from "./email-service-sendgrid";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if it's a bcrypt hash (starts with $2b$)
  if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
    const bcrypt = await import('bcrypt');
    return await bcrypt.compare(supplied, stored);
  }
  
  // Otherwise use scrypt format
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false;
  }
  
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      secure: false, // Disable secure for development
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 4, // 4 hours
      sameSite: 'lax'
    },
    rolling: true, // Reset expiry on each request
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          // Convert email to lowercase for case-insensitive lookup
          const user = await storage.getUserByEmail(email.toLowerCase());
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          let isValid = false;
          
          // Check temporary password first
          if (user.tempPassword && password === user.tempPassword) {
            isValid = true;
          }
          // Then check hashed password if no temp password match
          else if (user.hashedPassword) {
            isValid = await comparePasswords(password, user.hashedPassword);
          }
          
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint disabled - users are created by administrators only
  app.post("/api/register", (req, res) => {
    res.status(403).json({ 
      message: "Registration is disabled. Please contact your administrator to create an account." 
    });
  });

  app.post("/api/login", (req, res, next) => {
    const email = req.body.email || '';
    const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // Check if IP is locked out due to too many failed attempts
    const lockStatus = loginRateLimiter.isLocked(ipAddress);
    if (lockStatus.locked) {
      const remainingMinutes = Math.ceil((lockStatus.remainingSeconds || 0) / 60);
      return res.status(429).json({
        message: `Too many failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`,
        lockedOut: true,
        remainingSeconds: lockStatus.remainingSeconds,
      });
    }

    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) {
        // Record failed login attempt due to error
        loginRateLimiter.recordFailedAttempt(ipAddress, email.toLowerCase());
        try {
          await storage.logLoginAttempt({
            email: email.toLowerCase(),
            success: false,
            ipAddress,
            userAgent,
            failureReason: 'Server error',
          });
        } catch (logErr) {
          console.error('Failed to record login attempt:', logErr);
        }
        return next(err);
      }
      if (!user) {
        // Record failed login attempt with rate limiting
        const result = loginRateLimiter.recordFailedAttempt(ipAddress, email.toLowerCase());
        try {
          await storage.logLoginAttempt({
            email: email.toLowerCase(),
            success: false,
            ipAddress,
            userAgent,
            failureReason: info?.message || 'Invalid credentials',
          });
          
          // Log lockout event if account is now locked
          if (result.locked) {
            await storage.logAuditEvent({
              tableName: 'security',
              recordId: ipAddress,
              operation: 'UPDATE',
              description: `IP address ${ipAddress} locked out after 5 failed login attempts (attempted email: ${email.toLowerCase()})`,
              ipAddress,
              userAgent,
            });
          }
        } catch (logErr) {
          console.error('Failed to record login attempt:', logErr);
        }
        
        if (result.locked) {
          return res.status(429).json({
            message: "Too many failed login attempts. Your account has been temporarily locked for 15 minutes.",
            lockedOut: true,
            remainingSeconds: 15 * 60,
          });
        }
        
        return res.status(401).json({ 
          message: info?.message || "Invalid email or password",
          attemptsRemaining: result.attemptsRemaining,
        });
      }

      req.login(user, async (err) => {
        if (err) {
          // Record failed login due to session error
          loginRateLimiter.recordFailedAttempt(ipAddress, email.toLowerCase());
          try {
            await storage.logLoginAttempt({
              email: email.toLowerCase(),
              success: false,
              ipAddress,
              userAgent,
              failureReason: 'Session error',
            });
          } catch (logErr) {
            console.error('Failed to record login attempt:', logErr);
          }
          return next(err);
        }
        
        // Clear rate limiting on successful login
        loginRateLimiter.recordSuccessfulLogin(ipAddress);
        
        // Record successful login
        try {
          await storage.logLoginAttempt({
            email: user.email,
            success: true,
            ipAddress,
            userAgent,
          });
          
          // Log user activity for successful login
          await storage.logUserActivity({
            userId: user.id,
            action: 'LOGIN',
            details: 'User logged in successfully',
            ipAddress,
            userAgent,
          });
          
          // Send login notification email if user has it enabled and it's a new IP
          const fullUser = await storage.getUser(user.id);
          if (fullUser && fullUser.email && (fullUser as any).loginNotifications !== false) {
            const isNewLocation = await storage.isNewLoginLocation(fullUser.email, ipAddress, userAgent);
            if (isNewLocation) {
              sendGridEmailService.sendLoginNotification({
                userEmail: fullUser.email,
                userName: `${fullUser.firstName || ''} ${fullUser.lastName || ''}`.trim() || 'User',
                loginTime: new Date(),
                ipAddress: ipAddress,
                userAgent: userAgent,
                loginMethod: 'password'
              }).catch(err => {
                console.error('Failed to send login notification:', err);
              });
            }
          }
        } catch (logErr) {
          console.error('Failed to record login attempt:', logErr);
        }
        
        res.json({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          organisationId: user.organisationId,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          mustChangePassword: user.mustChangePassword,
          canSubmitCases: user.canSubmitCases,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", async (req, res, next) => {
    const user = req.user as SelectUser | undefined;
    const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    
    // Log logout activity before destroying session
    if (user) {
      try {
        await storage.logUserActivity({
          userId: user.id,
          action: 'LOGOUT',
          details: 'User logged out',
          ipAddress,
          userAgent,
        });
      } catch (logErr) {
        console.error('Failed to log logout activity:', logErr);
      }
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = req.user as SelectUser;
    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      organisationId: user.organisationId,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      mustChangePassword: user.mustChangePassword,
      canSubmitCases: user.canSubmitCases,
    });
  });

  // Password change endpoint for users with temporary passwords
  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.user as SelectUser;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    try {
      // Verify current password (could be temp password or hashed password)
      let isCurrentValid = false;
      if (user.tempPassword && currentPassword === user.tempPassword) {
        isCurrentValid = true;
      } else if (user.hashedPassword) {
        isCurrentValid = await comparePasswords(currentPassword, user.hashedPassword);
      }

      if (!isCurrentValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update user
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, {
        hashedPassword: hashedNewPassword,
        tempPassword: null, // Clear temporary password
        mustChangePassword: false,
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
};

export { hashPassword, comparePasswords };