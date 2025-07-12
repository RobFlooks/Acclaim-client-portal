import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertCaseSchema, 
  insertMessageSchema, 
  insertDocumentSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Admin middleware - checks if user is an admin
const isAdmin: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req as any).user?.claims?.sub;
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard/Statistics routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let stats;
      if (user.isAdmin) {
        // Admin sees global stats across all organizations
        stats = await storage.getGlobalCaseStats();
      } else {
        // Regular users see only their organization's stats
        if (!user.organisationId) {
          return res.status(404).json({ message: "User organisation not found" });
        }
        stats = await storage.getCaseStats(user.organisationId);
      }

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Cases routes
  app.get('/api/cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let cases;
      if (user.isAdmin) {
        // Admin sees all cases across all organizations
        cases = await storage.getAllCases();
      } else {
        // Regular users see only their organization's cases
        if (!user.organisationId) {
          return res.status(404).json({ message: "User organisation not found" });
        }
        cases = await storage.getCasesForOrganisation(user.organisationId);
      }

      res.json(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.get('/api/cases/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const caseId = parseInt(req.params.id);
      let case_;
      
      if (user.isAdmin) {
        // Admin can access any case across all organizations
        case_ = await storage.getCaseById(caseId);
      } else {
        // Regular users can only access cases from their organization
        if (!user.organisationId) {
          return res.status(404).json({ message: "User organisation not found" });
        }
        case_ = await storage.getCase(caseId, user.organisationId);
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
      const userId = req.user.claims.sub;
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
        debtorName: parsedCaseData.debtorName,
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
      
      // Handle file uploads
      const uploadedFiles = req.files as Express.Multer.File[];
      
      if (uploadedFiles && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          // Create document record
          await storage.createDocument({
            fileName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
            caseId: newCase.id,
            organisationId: user.organisationId,
            uploadedBy: userId,
          });
        }
      }
      
      // Add initial activity
      const fileInfo = uploadedFiles && uploadedFiles.length > 0 
        ? ` Files uploaded: ${uploadedFiles.map(f => f.originalname).join(', ')}.`
        : '';
      
      await storage.addCaseActivity({
        caseId: newCase.id,
        activityType: "case_created",
        description: `Case created by ${user.firstName || 'User'} ${user.lastName || ''}. Debt details: ${parsedCaseData.debtDetails || 'N/A'}${fileInfo}`,
        performedBy: userId,
      });

      res.status(201).json(newCase);
    } catch (error) {
      console.error("Error creating case:", error);
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  // Case activities routes
  app.get('/api/cases/:id/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.organisationId) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      const caseId = parseInt(req.params.id);
      const case_ = await storage.getCase(caseId, user.organisationId);
      
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

  // Messages routes
  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getMessagesForUser(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get('/api/cases/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.organisationId) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      const caseId = parseInt(req.params.id);
      const case_ = await storage.getCase(caseId, user.organisationId);
      
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
      const userId = req.user.claims.sub;
      
      // Check if this is a case-specific message
      if (req.body.caseId) {
        const user = await storage.getUser(userId);
        
        if (!user || !user.organisationId) {
          return res.status(404).json({ message: "User organisation not found" });
        }

        const caseId = parseInt(req.body.caseId);
        const case_ = await storage.getCase(caseId, user.organisationId);
        
        if (!case_) {
          return res.status(404).json({ message: "Case not found" });
        }
      }
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        caseId: req.body.caseId ? parseInt(req.body.caseId) : undefined,
        senderId: userId,
        attachmentFileName: req.file?.originalname,
        attachmentFilePath: req.file?.path,
        attachmentFileSize: req.file?.size,
        attachmentFileType: req.file?.mimetype,
      });

      const newMessage = await storage.createMessage(messageData);
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.put('/api/messages/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Get the message to check if user should be able to mark it as read
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's messages to verify access
      const userMessages = await storage.getMessagesForUser(userId);
      const message = userMessages.find(m => m.id === messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Only mark as read if:
      // 1. The user is the intended recipient (not the sender)
      // 2. OR if the user is admin and the message is from a non-admin user
      if (message.senderId !== userId) {
        await storage.markMessageAsRead(messageId);
        res.json({ message: "Message marked as read" });
      } else {
        // User is trying to mark their own message as read - don't allow this
        res.json({ message: "Cannot mark own message as read" });
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.get('/api/messages/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Get all messages for the user (including case-specific ones)
      const userMessages = await storage.getMessagesForUser(userId);
      let message = userMessages.find(m => m.id === messageId);
      
      // If not found in user messages, check case-specific messages
      if (!message) {
        const user = await storage.getUser(userId);
        if (user && user.organisationId) {
          // Get all cases for the user's organisation
          const cases = await storage.getCasesForOrganisation(user.organisationId);
          
          // Check each case's messages
          for (const case_ of cases) {
            const caseMessages = await storage.getMessagesForCase(case_.id);
            message = caseMessages.find(m => m.id === messageId);
            if (message) break;
          }
        }
      }
      
      if (!message || !message.attachmentFilePath) {
        return res.status(404).json({ message: "File not found" });
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.organisationId) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      const documents = await storage.getDocumentsForOrganisation(user.organisationId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching organisation documents:", error);
      res.status(500).json({ message: "Failed to fetch organisation documents" });
    }
  });

  app.post('/api/documents/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.organisationId) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const caseId = parseInt(req.body.caseId);
      if (!caseId) {
        return res.status(400).json({ message: "Case ID is required" });
      }

      // Verify case belongs to user's organisation
      const case_ = await storage.getCase(caseId, user.organisationId);
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }

      const document = await storage.createDocument({
        caseId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        uploadedBy: userId,
        organisationId: user.organisationId,
      });

      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.get('/api/documents/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.organisationId) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      const documentId = parseInt(req.params.id);
      const documents = await storage.getDocumentsForOrganisation(user.organisationId);
      const document = documents.find(doc => doc.id === documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if file exists
      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }

      res.download(document.filePath, document.fileName);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  app.get('/api/cases/:id/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.organisationId) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      const caseId = parseInt(req.params.id);
      const case_ = await storage.getCase(caseId, user.organisationId);
      
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.organisationId) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      const caseId = parseInt(req.params.id);
      const case_ = await storage.getCase(caseId, user.organisationId);
      
      if (!case_) {
        return res.status(404).json({ message: "Case not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const document = await storage.createDocument({
        caseId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        uploadedBy: userId,
        organisationId: user.organisationId,
      });

      // Add case activity
      await storage.addCaseActivity({
        caseId,
        activityType: "document_uploaded",
        description: `Document uploaded: ${req.file.originalname}`,
        performedBy: userId,
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Payment routes
  app.get('/api/cases/:id/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.organisationId) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      const caseId = parseInt(req.params.id);
      const case_ = await storage.getCase(caseId, user.organisationId);
      
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
      const userId = req.user.claims.sub;
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

      // Add case activity
      await storage.addCaseActivity({
        caseId,
        activityType: "payment_received",
        description: `Payment received: £${req.body.amount}`,
        performedBy: userId,
      });

      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.get('/api/documents/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.organisationId) {
        return res.status(404).json({ message: "User organisation not found" });
      }

      const documentId = parseInt(req.params.id);
      const documents = await storage.getDocumentsForOrganisation(user.organisationId);
      const document = documents.find(d => d.id === documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.download(document.filePath, document.fileName);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Admin-only delete routes
  app.delete('/api/admin/messages/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      await storage.deleteMessage(messageId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  app.delete('/api/admin/documents/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const documentId = parseInt(req.params.id);
      await storage.deleteDocumentById(documentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  app.post('/api/admin/organisations', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Organisation name is required" });
      }

      const organisation = await storage.createOrganisation({
        name: name.trim(),
      });

      res.status(201).json(organisation);
    } catch (error) {
      console.error("Error creating organisation:", error);
      res.status(500).json({ message: "Failed to create organisation" });
    }
  });

  app.put('/api/admin/users/:userId/assign', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
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
        user: result.user,
        tempPassword: result.tempPassword,
        message: "User created successfully. Please provide the temporary password to the user.",
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user details
  app.put('/api/admin/users/:userId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const userData = updateUserSchema.parse(req.body);

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
      const user = await storage.removeUserAdmin(userId);
      res.json({ user, message: "Admin privileges removed" });
    } catch (error) {
      console.error("Error removing admin privileges:", error);
      res.status(500).json({ message: "Failed to remove admin privileges" });
    }
  });

  // Reset user password (admin function)
  app.post('/api/admin/users/:userId/reset-password', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const tempPassword = await storage.resetUserPassword(userId);
      
      res.json({ 
        tempPassword, 
        message: "Password reset successfully. Please provide the temporary password to the user." 
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // User self-management routes
  
  // Update own profile
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userData = updateUserSchema.parse(req.body);

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

  // Change own password
  app.post('/api/user/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const mustChange = await storage.checkMustChangePassword(userId);
      res.json({ mustChangePassword: mustChange });
    } catch (error) {
      console.error("Error checking password status:", error);
      res.status(500).json({ message: "Failed to check password status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
