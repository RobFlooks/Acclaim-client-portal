import express, { type Express, type RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin as authIsAdmin } from "./auth";
import { 
  insertCaseSchema, 
  insertMessageSchema, 
  insertDocumentSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema,
  createOrganisationSchema,
  updateOrganisationSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import officegen from "officegen";
import bcrypt from "bcrypt";
import { emailService } from "./email-service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Serve screenshots for user guide
  app.use("/screenshots", express.static(path.join(__dirname, "../screenshots")));

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let stats;
      if (user.isAdmin) {
        // Admin sees global stats across all organisations
        stats = await storage.getGlobalCaseStats();
      } else {
        // Regular users see only their organisation's stats
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
      const userId = req.user.id;
      const cases = await storage.getCasesForUser(userId);
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
      let case_;
      
      if (user.isAdmin) {
        // Admin can access any case across all organisations
        case_ = await storage.getCaseById(caseId);
      } else {
        // Regular users can only access cases from their organisation
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
      
      // Note: Case activities are now only created via external API
      // No automatic activity generation for internal operations

      res.status(201).json(newCase);
    } catch (error) {
      console.error("Error creating case:", error);
      res.status(500).json({ message: "Failed to create case" });
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
        // Regular users can only access cases from their organisation
        if (!user.organisationId) {
          return res.status(404).json({ message: "User organisation not found" });
        }
        case_ = await storage.getCase(caseId, user.organisationId);
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
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
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
        // Regular users can only access cases from their organisation
        if (!user.organisationId) {
          return res.status(404).json({ message: "User organisation not found" });
        }
        case_ = await storage.getCase(caseId, user.organisationId);
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
          // Regular users can only access cases from their organisation
          if (!user.organisationId) {
            return res.status(404).json({ message: "User organisation not found" });
          }
          case_ = await storage.getCase(caseId, user.organisationId);
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
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        caseId: req.body.caseId ? parseInt(req.body.caseId) : undefined,
        senderId: userId,
        recipientType,
        recipientId,
        attachmentFileName: req.file?.originalname,
        attachmentFilePath: req.file?.path,
        attachmentFileSize: req.file?.size,
        attachmentFileType: req.file?.mimetype,
      });

      const newMessage = await storage.createMessage(messageData);
      
      // Send email notifications
      if (!user.isAdmin) {
        // User-to-admin notification (existing functionality)
        try {
          // Get the main admin user
          const adminUser = await storage.getUser("admin_1753292574.014698");
          
          if (adminUser && adminUser.email) {
            // Get organisation name
            let organisationName = "Unknown Organisation";
            if (user.organisationId) {
              const organisation = await storage.getOrganisation(user.organisationId);
              if (organisation) {
                organisationName = organisation.name;
              }
            }

            // Get case reference if this is a case-specific message
            let caseReference = undefined;
            if (messageData.caseId) {
              const messageCase = await storage.getCaseById(messageData.caseId);
              if (messageCase) {
                caseReference = messageCase.accountNumber;
              }
            }

            // Send email notification
            await emailService.sendMessageNotification(
              {
                userEmail: user.email,
                userName: `${user.firstName} ${user.lastName}`.trim() || user.email,
                messageSubject: messageData.subject,
                messageContent: messageData.content,
                caseReference,
                organisationName,
              },
              adminUser.email
            );
          }
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
            if (recipientUser && recipientUser.email && !recipientUser.isAdmin) {
              // Get organisation name
              let organisationName = "Unknown Organisation";
              if (recipientUser.organisationId) {
                const organisation = await storage.getOrganisation(recipientUser.organisationId);
                if (organisation) {
                  organisationName = organisation.name;
                }
              }

              // Get case reference if this is a case-specific message
              let caseReference = undefined;
              if (messageData.caseId) {
                const messageCase = await storage.getCaseById(messageData.caseId);
                if (messageCase) {
                  caseReference = messageCase.accountNumber;
                }
              }

              // Send admin-to-user notification
              await emailService.sendAdminToUserNotification({
                adminName: `${user.firstName} ${user.lastName}`.trim() || user.email,
                adminEmail: user.email,
                userEmail: recipientUser.email,
                userName: `${recipientUser.firstName} ${recipientUser.lastName}`.trim() || recipientUser.email,
                messageSubject: messageData.subject,
                messageContent: messageData.content,
                caseReference,
                organisationName,
              });
            }
          } else if (recipientType === 'organisation') {
            // Admin sending to organisation - notify all non-admin users in that organisation
            const orgUsers = await storage.getAllUsers();
            const organisationUsers = orgUsers.filter(u => 
              u.organisationId?.toString() === recipientId && !u.isAdmin && u.email
            );

            if (organisationUsers.length > 0) {
              // Get organisation name
              let organisationName = "Unknown Organisation";
              const organisation = await storage.getOrganisation(parseInt(recipientId));
              if (organisation) {
                organisationName = organisation.name;
              }

              // Get case reference if this is a case-specific message
              let caseReference = undefined;
              if (messageData.caseId) {
                const messageCase = await storage.getCaseById(messageData.caseId);
                if (messageCase) {
                  caseReference = messageCase.accountNumber;
                }
              }

              // Send notification to each user in the organisation
              for (const orgUser of organisationUsers) {
                await emailService.sendAdminToUserNotification({
                  adminName: `${user.firstName} ${user.lastName}`.trim() || user.email,
                  adminEmail: user.email,
                  userEmail: orgUser.email,
                  userName: `${orgUser.firstName} ${orgUser.lastName}`.trim() || orgUser.email,
                  messageSubject: messageData.subject,
                  messageContent: messageData.content,
                  caseReference,
                  organisationName,
                });
              }
            }
          }
        } catch (emailError) {
          // Log email error but don't fail the message creation
          console.error("Failed to send admin-to-user email notification:", emailError);
        }
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
      const userId = req.user.id;
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
        // Regular users can only access cases from their organisation
        if (!user.organisationId) {
          return res.status(404).json({ message: "User organisation not found" });
        }
        case_ = await storage.getCase(caseId, user.organisationId);
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
        // Regular users can only access payments from their organisation's cases
        if (!user.organisationId) {
          return res.status(404).json({ message: "User organisation not found" });
        }
        
        const cases = await storage.getCasesForOrganisation(user.organisationId);
        for (const case_ of cases) {
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
        // Regular users can only access cases from their organisation
        if (!user.organisationId) {
          return res.status(404).json({ message: "User organisation not found" });
        }
        case_ = await storage.getCase(caseId, user.organisationId);
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
      const userId = req.user.id;
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

  app.post('/api/admin/organisations', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  // Organization Management Routes (Admin only)
  
  // Create organisation
  app.post('/api/admin/organisations', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgData = createOrganisationSchema.parse(req.body);
      const organisation = await storage.createOrganisation(orgData);
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
      const orgData = updateOrganisationSchema.parse(req.body);
      const organisation = await storage.updateOrganisation(orgId, orgData);
      res.json(organisation);
    } catch (error) {
      console.error("Error updating organisation:", error);
      res.status(500).json({ message: "Failed to update organisation" });
    }
  });

  // Delete organisation
  app.delete('/api/admin/organisations/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orgId = parseInt(req.params.id);
      await storage.deleteOrganisation(orgId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting organisation:", error);
      if (error.message === "Cannot delete organisation with associated users or cases") {
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
  app.get("/api/admin/audit/logs", isAuthenticated, isAdmin, async (req, res) => {
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

  app.get("/api/admin/audit/summary", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const summary = await storage.getAuditSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching audit summary:", error);
      res.status(500).json({ message: "Failed to fetch audit summary" });
    }
  });

  // Advanced reporting endpoints
  app.get("/api/admin/reports/cross-organisation", isAuthenticated, isAdmin, async (req, res) => {
    try {
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
      
      // Create case activity
      const activity = await storage.addCaseActivity({
        caseId: case_.id,
        activityType,
        description,
        performedBy,
        activityDate: activityDate ? new Date(activityDate) : new Date(),
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
      let message, senderName, messageType, subject;
      
      if (req.headers['content-type']?.includes('application/json')) {
        ({ message, senderName, messageType, subject } = req.body);
      } else {
        message = req.body.message;
        senderName = req.body.senderName;
        messageType = req.body.messageType || 'case_update';
        subject = req.body.subject;
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
        recipientType: 'case',
        recipientId: case_.id.toString(),
        caseId: case_.id, // Set the caseId for proper filtering
        subject: messageSubject,
        content: message,
        isRead: false,
        createdAt: new Date(),
      });
      
      res.status(201).json({ 
        message: "Case message created successfully", 
        messageData: newMessage,
        caseInfo: {
          id: case_.id,
          accountNumber: case_.accountNumber,
          caseName: case_.caseName
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
            activityDate: activityDate ? new Date(activityDate) : new Date(),
          });
          
          results.created++;
        } catch (error) {
          results.errors.push({ 
            activity, 
            error: error.message 
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
          debtorEmail,
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
        debtorEmail,
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
      
      const { organisation_id, username, password, external_case_ref, balance, original_amount, outstanding_amount, status, stage, notes, costs_added, interest_added, fees_added } = req.body;
      
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
              await storage.createCase(case_);
              results.cases.created++;
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

  app.delete("/api/admin/cases/:id", isAuthenticated, isAdmin, async (req: any, res) => {
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
      const passwordHash = await bcrypt.hash(password, 10);

      const credential = await storage.createExternalApiCredential({
        organisationId: parseInt(organisationId),
        username,
        passwordHash,
        description,
        createdBy: userId,
      });

      res.status(201).json({ 
        message: "External API credentials created successfully", 
        credential: { ...credential, passwordHash: undefined } // Don't return the hash
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
            passwordHash: undefined // Don't return the hash
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

      if (!organisationId) {
        return res.status(400).json({ message: "Organisation ID is required" });
      }

      const userOrg = await storage.addUserToOrganisation(userId, organisationId);
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
      
      console.log(`Admin ${currentUserId} attempting to remove user ${userId} from organisation ${organisationId}`);
      
      // Additional security check: prevent removing yourself from your primary organisation if it's your only one
      if (userId === currentUserId) {
        // Check if this is the user's last organisation assignment
        const userOrgs = await storage.getUserOrganisations(userId);
        const user = await storage.getUser(userId);
        
        // Count total organisation assignments
        const junctionOrgCount = userOrgs.length;
        const hasLegacyOrg = user?.organisationId ? 1 : 0;
        const totalOrgAssignments = junctionOrgCount + hasLegacyOrg;
        
        // Check if removing this would leave user with no organisations
        const isRemovingFromJunction = userOrgs.some(uo => uo.organisationId === parseInt(organisationId));
        const isRemovingLegacyOrg = user?.organisationId === parseInt(organisationId);
        
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
      
      await storage.removeUserFromOrganisation(userId, parseInt(organisationId));
      res.status(200).json({ message: "User removed from organisation successfully" });
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
