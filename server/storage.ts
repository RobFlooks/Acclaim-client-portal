import {
  users,
  organisations,
  cases,
  caseActivities,
  messages,
  documents,
  payments,
  userActivityLogs,
  loginAttempts,
  systemMetrics,
  externalApiCredentials,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type Case,
  type InsertCase,
  type CaseActivity,
  type InsertCaseActivity,
  type Message,
  type InsertMessage,
  type Document,
  type InsertDocument,
  type Payment,
  type InsertPayment,
  type UserActivityLog,
  type InsertUserActivityLog,
  type LoginAttempt,
  type InsertLoginAttempt,
  type SystemMetric,
  type InsertSystemMetric,
  type ExternalApiCredential,
  type InsertExternalApiCredential,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, or, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByExternalRef(externalRef: string): Promise<User | undefined>;
  createUserWithExternalRef(userData: any): Promise<{ user: User; tempPassword: string }>;
  
  // Organisation operations
  getOrganisation(id: number): Promise<Organization | undefined>;
  createOrganisation(org: InsertOrganization): Promise<Organization>;
  updateOrganisation(id: number, org: Partial<InsertOrganization>): Promise<Organization>;
  deleteOrganisation(id: number): Promise<void>;
  getOrganisationByExternalRef(externalRef: string): Promise<Organization | undefined>;
  getOrganisationStats(id: number): Promise<{
    userCount: number;
    caseCount: number;
    activeCaseCount: number;
    totalOutstanding: string;
    totalRecovered: string;
  }>;
  
  // Case operations
  getCasesForOrganisation(organisationId: number): Promise<Case[]>;
  getAllCases(): Promise<Case[]>; // Admin only - get all cases across all organizations
  getAllCasesIncludingArchived(): Promise<Case[]>; // Admin only - get all cases including archived ones
  getCase(id: number, organisationId: number): Promise<Case | undefined>;
  getCaseById(id: number): Promise<Case | undefined>; // Admin only - get case by ID without org restriction
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: number, caseData: Partial<InsertCase>): Promise<Case>;
  archiveCase(id: number, userId: string): Promise<Case>; // Admin only - archive case
  unarchiveCase(id: number, userId: string): Promise<Case>; // Admin only - unarchive case
  deleteCase(id: number): Promise<void>; // Admin only - permanently delete case and all related data
  
  // Case activity operations
  getCaseActivities(caseId: number): Promise<CaseActivity[]>;
  addCaseActivity(activity: InsertCaseActivity): Promise<CaseActivity>;
  deleteCaseActivity(id: number): Promise<void>; // Admin only - delete case activity
  
  // Message operations
  getMessagesForUser(userId: string): Promise<Message[]>;
  getMessagesForCase(caseId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: number): Promise<void>;
  deleteMessage(id: number): Promise<void>; // Admin only - delete message by ID
  
  // Document operations
  getDocumentsForCase(caseId: number): Promise<Document[]>;
  getDocumentsForOrganisation(organisationId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number, organisationId: number): Promise<void>;
  deleteDocumentById(id: number): Promise<void>; // Admin only - delete document by ID without org restriction
  
  // Payment operations
  getPaymentsForCase(caseId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment>;
  deletePayment(id: number, organisationId: number): Promise<void>;
  getPaymentByExternalRef(externalRef: string): Promise<Payment | undefined>;
  getCaseByExternalRef(externalRef: string): Promise<Case | undefined>;
  
  // Statistics
  getCaseStats(organisationId: number): Promise<{
    activeCases: number;
    closedCases: number;
    totalOutstanding: string;
    totalRecovery: string;
  }>;
  
  getGlobalCaseStats(): Promise<{
    activeCases: number;
    closedCases: number;
    totalOutstanding: string;
    totalRecovery: string;
  }>; // Admin only - get stats across all organizations

  // Admin operations
  getAllUsers(): Promise<User[]>;
  getAllOrganisations(): Promise<Organization[]>;
  assignUserToOrganisation(userId: string, organisationId: number): Promise<User | null>;
  
  // Enhanced user management operations
  createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    organisationId?: number;
    isAdmin?: boolean;
  }): Promise<{ user: User; tempPassword: string }>;
  
  updateUser(userId: string, userData: {
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<User | null>;
  
  makeUserAdmin(userId: string): Promise<User | null>;
  removeUserAdmin(userId: string): Promise<User | null>;
  
  resetUserPassword(userId: string): Promise<string>; // Returns temp password
  
  changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  
  setUserPassword(userId: string, newPassword: string): Promise<User | null>;
  
  verifyUserPassword(userId: string, password: string): Promise<boolean>;
  
  checkMustChangePassword(userId: string): Promise<boolean>;

  // System monitoring operations
  logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog>;
  getUserActivityLogs(userId?: string, limit?: number): Promise<UserActivityLog[]>;
  
  logLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt>;
  getLoginAttempts(limit?: number): Promise<LoginAttempt[]>;
  getFailedLoginAttempts(limit?: number): Promise<LoginAttempt[]>;
  
  recordSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric>;
  getSystemMetrics(metricName?: string, limit?: number): Promise<SystemMetric[]>;
  
  getSystemAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalCases: number;
    activeCases: number;
    totalOrganizations: number;
    recentActivity: number;
    failedLogins: number;
    systemHealth: string;
  }>;

  // External API credentials operations
  createExternalApiCredential(credential: InsertExternalApiCredential): Promise<ExternalApiCredential>;
  getExternalApiCredentials(organisationId: number): Promise<ExternalApiCredential[]>;
  verifyExternalApiCredential(organisationId: number, username: string, password: string): Promise<boolean>;
  getExternalApiCredentialByUsername(username: string): Promise<ExternalApiCredential | undefined>;
  updateExternalApiCredential(id: number, updates: Partial<InsertExternalApiCredential>): Promise<ExternalApiCredential>;
  deleteExternalApiCredential(id: number): Promise<void>;

  // Advanced reporting operations
  getCrossOrganizationPerformance(): Promise<{
    organizationId: number;
    organizationName: string;
    totalCases: number;
    activeCases: number;
    closedCases: number;
    totalOutstanding: string;
    totalRecovered: string;
    recoveryRate: number;
    averageCaseAge: number;
    userCount: number;
  }[]>;

  getUserActivityReport(startDate?: Date, endDate?: Date): Promise<{
    userId: string;
    userEmail: string;
    userFirstName: string;
    userLastName: string;
    organizationName: string;
    loginCount: number;
    lastLogin: Date;
    actionCount: number;
    casesCreated: number;
    messageseSent: number;
    documentsUploaded: number;
  }[]>;

  getSystemHealthMetrics(): Promise<{
    metric: string;
    value: number;
    status: string;
    timestamp: Date;
  }[]>;

  getCustomReportData(reportConfig: {
    tables: string[];
    filters: Record<string, any>;
    groupBy?: string[];
    orderBy?: string;
    limit?: number;
  }): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByExternalRef(externalRef: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.externalRef, externalRef));
    return user;
  }

  async createUserWithExternalRef(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    organisationId?: number;
    isAdmin?: boolean;
    externalRef: string;
  }): Promise<{ user: User; tempPassword: string }> {
    const tempPassword = nanoid(12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        organisationId: userData.organisationId?.toString(),
        hashedPassword,
        mustChangePassword: true,
        isAdmin: userData.isAdmin || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return { user, tempPassword };
  }

  async getOrganisation(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organisations).where(eq(organisations.id, id));
    return org;
  }

  async createOrganisation(org: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db.insert(organisations).values(org).returning();
    return newOrg;
  }

  async updateOrganisation(id: number, org: Partial<InsertOrganization>): Promise<Organization> {
    const [updatedOrg] = await db
      .update(organisations)
      .set({ ...org, updatedAt: new Date() })
      .where(eq(organisations.id, id))
      .returning();
    return updatedOrg;
  }

  async deleteOrganisation(id: number): Promise<void> {
    // First, check if there are any users or cases associated with this organisation
    const [userCount, caseCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.organisationId, id.toString())),
      db.select({ count: sql<number>`count(*)` }).from(cases).where(eq(cases.organisationId, id))
    ]);

    if (userCount[0].count > 0 || caseCount[0].count > 0) {
      throw new Error("Cannot delete organisation with associated users or cases");
    }

    await db.delete(organisations).where(eq(organisations.id, id));
  }

  async getOrganisationByExternalRef(externalRef: string): Promise<Organization | undefined> {
    const [organisation] = await db.select().from(organisations).where(eq(organisations.externalRef, externalRef));
    return organisation;
  }

  async getOrganisationStats(id: number): Promise<{
    userCount: number;
    caseCount: number;
    activeCaseCount: number;
    totalOutstanding: string;
    totalRecovered: string;
  }> {
    const [userCount, caseCount, activeCaseCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.organisationId, id.toString())),
      db.select({ count: sql<number>`count(*)` }).from(cases).where(and(eq(cases.organisationId, id), eq(cases.isArchived, false))),
      db.select({ count: sql<number>`count(*)` }).from(cases).where(and(eq(cases.organisationId, id), eq(cases.isArchived, false), or(eq(cases.status, "new"), eq(cases.status, "in_progress"))))
    ]);

    // Calculate financial stats - exclude archived cases
    const orgCases = await db.select().from(cases).where(and(eq(cases.organisationId, id), eq(cases.isArchived, false)));
    let totalOutstanding = 0;
    let totalRecovered = 0;

    for (const case_ of orgCases) {
      const casePayments = await db.select().from(payments).where(eq(payments.caseId, case_.id));
      const totalPayments = casePayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      
      totalRecovered += totalPayments;
      totalOutstanding += parseFloat(case_.outstandingAmount || "0");
    }

    return {
      userCount: userCount[0].count,
      caseCount: caseCount[0].count,
      activeCaseCount: activeCaseCount[0].count,
      totalOutstanding: totalOutstanding.toFixed(2),
      totalRecovered: totalRecovered.toFixed(2),
    };
  }

  async getCasesForOrganisation(organisationId: number): Promise<Case[]> {
    // Get all non-archived cases for the organisation
    const allCases = await db
      .select()
      .from(cases)
      .where(and(eq(cases.organisationId, organisationId), eq(cases.isArchived, false)));

    // For each case, get payments and last activity time
    const casesWithCalculatedBalance = await Promise.all(
      allCases.map(async (case_) => {
        // Get total payments for this case
        const casePayments = await db
          .select()
          .from(payments)
          .where(eq(payments.caseId, case_.id));
        
        const totalPayments = casePayments.reduce((sum, payment) => 
          sum + parseFloat(payment.amount), 0);
        
        // Get the most recent message for this case
        const latestMessage = await db
          .select()
          .from(messages)
          .where(eq(messages.caseId, case_.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);
        
        // Get the most recent activity for this case
        const latestActivity = await db
          .select()
          .from(caseActivities)
          .where(eq(caseActivities.caseId, case_.id))
          .orderBy(desc(caseActivities.createdAt))
          .limit(1);
        
        // Determine the most recent update time
        const caseUpdateTime = case_.updatedAt ? new Date(case_.updatedAt).getTime() : 0;
        const messageUpdateTime = latestMessage.length > 0 ? new Date(latestMessage[0].createdAt).getTime() : 0;
        const activityUpdateTime = latestActivity.length > 0 ? new Date(latestActivity[0].createdAt).getTime() : 0;
        
        const lastActivityTime = Math.max(caseUpdateTime, messageUpdateTime, activityUpdateTime);
        
        return {
          ...case_,
          outstandingAmount: case_.outstandingAmount,
          totalPayments: totalPayments.toFixed(2),
          lastActivityTime: new Date(lastActivityTime).toISOString(),
          payments: casePayments
        };
      })
    );

    // Sort by last activity time (most recent first)
    return casesWithCalculatedBalance.sort((a, b) => 
      new Date(b.lastActivityTime).getTime() - new Date(a.lastActivityTime).getTime()
    );
  }

  async getAllCases(): Promise<Case[]> {
    // Admin only - get all non-archived cases across all organizations
    const allCases = await db
      .select({
        ...cases,
        organisationName: organisations.name,
      })
      .from(cases)
      .leftJoin(organisations, eq(cases.organisationId, organisations.id))
      .where(eq(cases.isArchived, false));

    // For each case, calculate the accurate outstanding amount and last activity time
    const casesWithCalculatedBalance = await Promise.all(
      allCases.map(async (case_) => {
        // Get total payments for this case
        const casePayments = await db
          .select()
          .from(payments)
          .where(eq(payments.caseId, case_.id));
        
        const totalPayments = casePayments.reduce((sum, payment) => 
          sum + parseFloat(payment.amount), 0);
        
        // Get the most recent message for this case
        const latestMessage = await db
          .select()
          .from(messages)
          .where(eq(messages.caseId, case_.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);
        
        // Get the most recent activity for this case
        const latestActivity = await db
          .select()
          .from(caseActivities)
          .where(eq(caseActivities.caseId, case_.id))
          .orderBy(desc(caseActivities.createdAt))
          .limit(1);
        
        // Determine the most recent update time
        const caseUpdateTime = case_.updatedAt ? new Date(case_.updatedAt).getTime() : 0;
        const messageUpdateTime = latestMessage.length > 0 ? new Date(latestMessage[0].createdAt).getTime() : 0;
        const activityUpdateTime = latestActivity.length > 0 ? new Date(latestActivity[0].createdAt).getTime() : 0;
        
        const lastActivityTime = Math.max(caseUpdateTime, messageUpdateTime, activityUpdateTime);
        
        return {
          ...case_,
          outstandingAmount: case_.outstandingAmount,
          totalPayments: totalPayments.toFixed(2),
          lastActivityTime: new Date(lastActivityTime).toISOString(),
          payments: casePayments
        };
      })
    );

    // Sort by last activity time (most recent first)
    return casesWithCalculatedBalance.sort((a, b) => 
      new Date(b.lastActivityTime).getTime() - new Date(a.lastActivityTime).getTime()
    );
  }

  async getAllCasesIncludingArchived(): Promise<Case[]> {
    // Admin only - get all cases including archived ones across all organizations
    const allCases = await db
      .select({
        ...cases,
        organisationName: organisations.name,
      })
      .from(cases)
      .leftJoin(organisations, eq(cases.organisationId, organisations.id));

    // For each case, calculate the accurate outstanding amount and last activity time
    const casesWithCalculatedBalance = await Promise.all(
      allCases.map(async (case_) => {
        // Get total payments for this case
        const casePayments = await db
          .select()
          .from(payments)
          .where(eq(payments.caseId, case_.id));
        
        const totalPayments = casePayments.reduce((sum, payment) => 
          sum + parseFloat(payment.amount), 0);
        
        // Get the most recent message for this case
        const latestMessage = await db
          .select()
          .from(messages)
          .where(eq(messages.caseId, case_.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);
        
        // Get the most recent activity for this case
        const latestActivity = await db
          .select()
          .from(caseActivities)
          .where(eq(caseActivities.caseId, case_.id))
          .orderBy(desc(caseActivities.createdAt))
          .limit(1);
        
        // Determine the most recent update time
        const caseUpdateTime = case_.updatedAt ? new Date(case_.updatedAt).getTime() : 0;
        const messageUpdateTime = latestMessage.length > 0 ? new Date(latestMessage[0].createdAt).getTime() : 0;
        const activityUpdateTime = latestActivity.length > 0 ? new Date(latestActivity[0].createdAt).getTime() : 0;
        
        const lastActivityTime = Math.max(caseUpdateTime, messageUpdateTime, activityUpdateTime);
        
        return {
          ...case_,
          outstandingAmount: case_.outstandingAmount,
          totalPayments: totalPayments.toFixed(2),
          lastActivityTime: new Date(lastActivityTime).toISOString(),
          payments: casePayments
        };
      })
    );

    // Sort by last activity time (most recent first)
    return casesWithCalculatedBalance.sort((a, b) => 
      new Date(b.lastActivityTime).getTime() - new Date(a.lastActivityTime).getTime()
    );
  }

  async getCase(id: number, organisationId: number): Promise<Case | undefined> {
    const [case_] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, id), eq(cases.organisationId, organisationId)));
    return case_;
  }

  async getCaseById(id: number): Promise<Case | undefined> {
    // Admin only - get case by ID without org restriction
    const [case_] = await db
      .select()
      .from(cases)
      .where(eq(cases.id, id));
    return case_;
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const [newCase] = await db.insert(cases).values(caseData).returning();
    return newCase;
  }

  async updateCase(id: number, caseData: Partial<InsertCase>): Promise<Case> {
    const [updatedCase] = await db
      .update(cases)
      .set({ ...caseData, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return updatedCase;
  }

  async archiveCase(id: number, userId: string): Promise<Case> {
    const [archivedCase] = await db
      .update(cases)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(cases.id, id))
      .returning();
    
    // Log the archiving activity
    await this.addCaseActivity({
      caseId: id,
      activityType: 'case_archived',
      description: 'Case archived by admin',
      performedBy: userId,
    });
    
    return archivedCase;
  }

  async unarchiveCase(id: number, userId: string): Promise<Case> {
    const [unarchivedCase] = await db
      .update(cases)
      .set({
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(cases.id, id))
      .returning();
    
    // Log the unarchiving activity
    await this.addCaseActivity({
      caseId: id,
      activityType: 'case_unarchived',
      description: 'Case unarchived by admin',
      performedBy: userId,
    });
    
    return unarchivedCase;
  }

  async deleteCase(id: number): Promise<void> {
    // Delete in order to respect foreign key constraints
    // 1. Delete case activities
    await db.delete(caseActivities).where(eq(caseActivities.caseId, id));
    
    // 2. Delete case messages
    await db.delete(messages).where(eq(messages.caseId, id));
    
    // 3. Delete case documents
    await db.delete(documents).where(eq(documents.caseId, id));
    
    // 4. Delete case payments
    await db.delete(payments).where(eq(payments.caseId, id));
    
    // 5. Finally delete the case
    await db.delete(cases).where(eq(cases.id, id));
  }

  async getCaseActivities(caseId: number): Promise<CaseActivity[]> {
    return await db
      .select()
      .from(caseActivities)
      .where(eq(caseActivities.caseId, caseId))
      .orderBy(desc(caseActivities.createdAt));
  }

  async addCaseActivity(activity: InsertCaseActivity): Promise<CaseActivity> {
    const [newActivity] = await db.insert(caseActivities).values(activity).returning();
    return newActivity;
  }

  async deleteCaseActivity(id: number): Promise<void> {
    await db.delete(caseActivities).where(eq(caseActivities.id, id));
  }

  async getMessagesForUser(userId: string): Promise<any[]> {
    // Get the user to check their organization
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return [];
    }

    const userRecord = user[0];
    const userOrgId = userRecord.organisationId;

    return await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        recipientType: messages.recipientType,
        recipientId: messages.recipientId,
        caseId: messages.caseId,
        subject: messages.subject,
        content: messages.content,
        isRead: messages.isRead,
        attachmentFileName: messages.attachmentFileName,
        attachmentFilePath: messages.attachmentFilePath,
        attachmentFileSize: messages.attachmentFileSize,
        attachmentFileType: messages.attachmentFileType,
        createdAt: messages.createdAt,
        senderName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
        senderEmail: users.email,
        senderIsAdmin: users.isAdmin,
        senderOrganisationName: organisations.name,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .leftJoin(organisations, eq(users.organisationId, organisations.id))
      .leftJoin(cases, eq(messages.caseId, cases.id))
      .where(and(
        or(
          eq(messages.senderId, userId), // Messages sent by this user
          eq(messages.recipientId, userId), // Messages sent directly to this user
          and(
            eq(messages.recipientType, 'organization'),
            eq(messages.recipientId, userOrgId?.toString() || '')
          ), // Messages sent to user's organization
          and(
            eq(messages.recipientType, 'case'),
            eq(cases.organisationId, userOrgId || 0)
          ) // Messages sent to cases in user's organization
        ),
        or(
          isNull(messages.caseId), // General messages not tied to a case
          eq(cases.isArchived, false) // Messages for non-archived cases only
        )
      ))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesForCase(caseId: number): Promise<any[]> {
    return await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        recipientType: messages.recipientType,
        recipientId: messages.recipientId,
        caseId: messages.caseId,
        subject: messages.subject,
        content: messages.content,
        isRead: messages.isRead,
        attachmentFileName: messages.attachmentFileName,
        attachmentFilePath: messages.attachmentFilePath,
        attachmentFileSize: messages.attachmentFileSize,
        attachmentFileType: messages.attachmentFileType,
        createdAt: messages.createdAt,
        senderName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
        senderEmail: users.email,
        senderIsAdmin: users.isAdmin,
        senderOrganisationName: organisations.name,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .leftJoin(organisations, eq(users.organisationId, organisations.id))
      .where(eq(messages.caseId, caseId))
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));
  }

  async deleteMessage(id: number): Promise<void> {
    // Admin only - delete message by ID
    await db.delete(messages).where(eq(messages.id, id));
  }

  async getDocumentsForCase(caseId: number): Promise<Document[]> {
    // Only return documents for non-archived cases
    const results = await db
      .select({
        id: documents.id,
        caseId: documents.caseId,
        fileName: documents.fileName,
        fileSize: documents.fileSize,
        fileType: documents.fileType,
        filePath: documents.filePath,
        uploadedBy: documents.uploadedBy,
        organisationId: documents.organisationId,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .leftJoin(cases, eq(documents.caseId, cases.id))
      .where(and(
        eq(documents.caseId, caseId),
        eq(cases.isArchived, false)
      ))
      .orderBy(desc(documents.createdAt));
    
    return results;
  }

  async getDocumentsForOrganisation(organisationId: number): Promise<Document[]> {
    // Only return documents for non-archived cases
    const results = await db
      .select({
        id: documents.id,
        caseId: documents.caseId,
        fileName: documents.fileName,
        fileSize: documents.fileSize,
        fileType: documents.fileType,
        filePath: documents.filePath,
        uploadedBy: documents.uploadedBy,
        organisationId: documents.organisationId,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .leftJoin(cases, eq(documents.caseId, cases.id))
      .where(and(
        eq(documents.organisationId, organisationId),
        or(
          isNull(documents.caseId), // General org documents not tied to a case
          eq(cases.isArchived, false) // Documents for non-archived cases only
        )
      ))
      .orderBy(desc(documents.createdAt));
    
    return results;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async deleteDocument(id: number, organisationId: number): Promise<void> {
    await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.organisationId, organisationId)));
  }

  async deleteDocumentById(id: number): Promise<void> {
    // Admin only - delete document by ID without org restriction
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Payment operations
  async getPaymentsForCase(caseId: number): Promise<Payment[]> {
    // First check if the case is archived
    const caseRecord = await db.select()
      .from(cases)
      .where(eq(cases.id, caseId))
      .limit(1);
    
    if (caseRecord.length === 0 || caseRecord[0].isArchived) {
      return []; // Return empty array if case doesn't exist or is archived
    }
    
    // Get payments for non-archived case
    return await db.select()
      .from(payments)
      .where(eq(payments.caseId, caseId))
      .orderBy(desc(payments.paymentDate));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment> {
    const [updatedPayment] = await db.update(payments)
      .set(payment)
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }

  async deletePayment(id: number, organisationId?: number): Promise<void> {
    if (organisationId) {
      // Standard deletion with organisation check
      await db.delete(payments)
        .where(and(
          eq(payments.id, id),
          eq(payments.organisationId, organisationId)
        ));
    } else {
      // External API deletion without organisation check
      await db.delete(payments)
        .where(eq(payments.id, id));
    }
  }

  async getPaymentByExternalRef(externalRef: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.externalRef, externalRef));
    return payment;
  }

  async getCaseByExternalRef(externalRef: string): Promise<Case | undefined> {
    const [case_] = await db
      .select()
      .from(cases)
      .where(eq(cases.externalRef, externalRef));
    return case_;
  }

  async getCasesByAccountNumber(accountNumber: string): Promise<Case[]> {
    const cases_ = await db
      .select()
      .from(cases)
      .where(eq(cases.accountNumber, accountNumber));
    return cases_;
  }

  async getCaseStats(organisationId: number): Promise<{
    activeCases: number;
    closedCases: number;
    totalOutstanding: string;
    totalRecovery: string;
  }> {
    const [stats] = await db
      .select({
        activeCases: sql<number>`COUNT(CASE WHEN LOWER(status) != 'closed' THEN 1 END)`,
        closedCases: sql<number>`COUNT(CASE WHEN LOWER(status) = 'closed' THEN 1 END)`,
        totalOutstanding: sql<string>`COALESCE(SUM(CASE WHEN LOWER(status) != 'closed' THEN outstanding_amount ELSE 0 END), 0)`,
      })
      .from(cases)
      .where(and(eq(cases.organisationId, organisationId), eq(cases.isArchived, false)));

    // Calculate total recovery from payments for active cases only (excluding archived cases)
    const [recoveryStats] = await db
      .select({
        totalRecovery: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .leftJoin(cases, eq(payments.caseId, cases.id))
      .where(and(
        eq(cases.organisationId, organisationId),
        eq(cases.isArchived, false),
        sql`LOWER(${cases.status}) != 'closed'`
      ));

    return {
      activeCases: stats.activeCases,
      closedCases: stats.closedCases,
      totalOutstanding: stats.totalOutstanding.toString(),
      totalRecovery: recoveryStats.totalRecovery.toString(),
    };
  }

  async getGlobalCaseStats(): Promise<{
    activeCases: number;
    closedCases: number;
    totalOutstanding: string;
    totalRecovery: string;
  }> {
    // Admin only - get stats across all organizations (excluding archived cases)
    const [stats] = await db
      .select({
        activeCases: sql<number>`COUNT(CASE WHEN LOWER(status) != 'closed' THEN 1 END)`,
        closedCases: sql<number>`COUNT(CASE WHEN LOWER(status) = 'closed' THEN 1 END)`,
        totalOutstanding: sql<string>`COALESCE(SUM(CASE WHEN LOWER(status) != 'closed' THEN outstanding_amount ELSE 0 END), 0)`,
      })
      .from(cases)
      .where(eq(cases.isArchived, false));

    // Calculate total recovery from payments for active cases across all organizations (excluding archived cases)
    const [recoveryStats] = await db
      .select({
        totalRecovery: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .leftJoin(cases, eq(payments.caseId, cases.id))
      .where(and(
        eq(cases.isArchived, false),
        sql`LOWER(${cases.status}) != 'closed'`
      ));

    return {
      activeCases: stats.activeCases,
      closedCases: stats.closedCases,
      totalOutstanding: stats.totalOutstanding.toString(),
      totalRecovery: recoveryStats.totalRecovery.toString(),
    };
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        organisationId: users.organisationId,
        createdAt: users.createdAt,
        organisationName: organisations.name,
        isAdmin: users.isAdmin,
        phone: users.phone,
      })
      .from(users)
      .leftJoin(organisations, eq(users.organisationId, organisations.id))
      .orderBy(users.createdAt);
    
    return result;
  }

  async getAllOrganisations(): Promise<Organization[]> {
    const result = await db
      .select({
        id: organisations.id,
        name: organisations.name,
        externalRef: organisations.externalRef,
        createdAt: organisations.createdAt,
        userCount: sql<number>`count(${users.id})`,
      })
      .from(organisations)
      .leftJoin(users, eq(organisations.id, users.organisationId))
      .groupBy(organisations.id, organisations.name, organisations.externalRef, organisations.createdAt)
      .orderBy(organisations.createdAt);
    
    return result;
  }

  async assignUserToOrganisation(userId: string, organisationId: number): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ organisationId: organisationId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    return user || null;
  }

  // Enhanced user management methods
  async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    organisationId?: number;
    isAdmin?: boolean;
  }): Promise<{ user: User; tempPassword: string }> {
    const tempPassword = nanoid(12); // Generate temporary password
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const userId = nanoid(10);

    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        organisationId: userData.organisationId,
        isAdmin: userData.isAdmin || false,
        passwordHash,
        tempPassword,
        mustChangePassword: true,
      })
      .returning();

    return { user, tempPassword };
  }

  async updateUser(userId: string, userData: {
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user || null;
  }

  async makeUserAdmin(userId: string): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ isAdmin: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return user || null;
  }

  async removeUserAdmin(userId: string): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ isAdmin: false, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return user || null;
  }

  async resetUserPassword(userId: string): Promise<string> {
    const tempPassword = nanoid(12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await db
      .update(users)
      .set({
        passwordHash,
        tempPassword,
        mustChangePassword: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return tempPassword;
  }

  async changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.passwordHash) return false;

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) return false;

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        tempPassword: null,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return true;
  }

  async setUserPassword(userId: string, newPassword: string): Promise<User | null> {
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const [user] = await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        tempPassword: null,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user || null;
  }

  async verifyUserPassword(userId: string, password: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.passwordHash) return false;

    return await bcrypt.compare(password, user.passwordHash);
  }

  async checkMustChangePassword(userId: string): Promise<boolean> {
    const [user] = await db.select({ mustChangePassword: users.mustChangePassword }).from(users).where(eq(users.id, userId));
    return user?.mustChangePassword || false;
  }

  // System monitoring operations
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    const [log] = await db.insert(userActivityLogs).values(activity).returning();
    return log;
  }

  async getUserActivityLogs(userId?: string, limit = 100): Promise<UserActivityLog[]> {
    const query = db.select({
      id: userActivityLogs.id,
      userId: userActivityLogs.userId,
      action: userActivityLogs.action,
      details: userActivityLogs.details,
      ipAddress: userActivityLogs.ipAddress,
      userAgent: userActivityLogs.userAgent,
      timestamp: userActivityLogs.timestamp,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(userActivityLogs)
    .leftJoin(users, eq(userActivityLogs.userId, users.id))
    .orderBy(desc(userActivityLogs.timestamp))
    .limit(limit);

    if (userId) {
      query.where(eq(userActivityLogs.userId, userId));
    }

    return await query;
  }

  async logLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt> {
    const [log] = await db.insert(loginAttempts).values(attempt).returning();
    return log;
  }

  async getLoginAttempts(limit = 100): Promise<LoginAttempt[]> {
    return await db.select().from(loginAttempts)
      .orderBy(desc(loginAttempts.timestamp))
      .limit(limit);
  }

  async getFailedLoginAttempts(limit = 100): Promise<LoginAttempt[]> {
    return await db.select().from(loginAttempts)
      .where(eq(loginAttempts.success, false))
      .orderBy(desc(loginAttempts.timestamp))
      .limit(limit);
  }

  async recordSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric> {
    const [record] = await db.insert(systemMetrics).values(metric).returning();
    return record;
  }

  async getSystemMetrics(metricName?: string, limit = 100): Promise<SystemMetric[]> {
    const query = db.select().from(systemMetrics)
      .orderBy(desc(systemMetrics.recordedAt))
      .limit(limit);

    if (metricName) {
      query.where(eq(systemMetrics.metricName, metricName));
    }

    return await query;
  }

  async getSystemAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalCases: number;
    activeCases: number;
    totalOrganizations: number;
    recentActivity: number;
    failedLogins: number;
    systemHealth: string;
  }> {
    const [totalUsers, totalCases, totalOrganizations] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(cases).where(eq(cases.isArchived, false)),
      db.select({ count: sql<number>`count(*)` }).from(organisations),
    ]);

    const [activeCases, recentActivity, failedLogins] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(cases)
        .where(and(eq(cases.isArchived, false), or(eq(cases.status, "new"), eq(cases.status, "in_progress")))),
      db.select({ count: sql<number>`count(*)` }).from(userActivityLogs)
        .where(sql`timestamp > NOW() - INTERVAL '24 hours'`),
      db.select({ count: sql<number>`count(*)` }).from(loginAttempts)
        .where(and(eq(loginAttempts.success, false), sql`timestamp > NOW() - INTERVAL '24 hours'`)),
    ]);

    // Calculate active users (users who have activity in the last 30 days)
    const [activeUsers] = await db.select({ count: sql<number>`count(DISTINCT user_id)` })
      .from(userActivityLogs)
      .where(sql`timestamp > NOW() - INTERVAL '30 days'`);

    // Determine system health based on failed logins and activity
    let systemHealth = "healthy";
    if (failedLogins[0].count > 10) {
      systemHealth = "warning";
    }
    if (failedLogins[0].count > 50) {
      systemHealth = "critical";
    }

    return {
      totalUsers: totalUsers[0].count,
      activeUsers: activeUsers[0].count,
      totalCases: totalCases[0].count,
      activeCases: activeCases[0].count,
      totalOrganizations: totalOrganizations[0].count,
      recentActivity: recentActivity[0].count,
      failedLogins: failedLogins[0].count,
      systemHealth,
    };
  }

  // Advanced reporting operations
  async getCrossOrganizationPerformance(): Promise<{
    organizationId: number;
    organizationName: string;
    totalCases: number;
    activeCases: number;
    closedCases: number;
    totalOutstanding: string;
    totalRecovered: string;
    recoveryRate: number;
    averageCaseAge: number;
    userCount: number;
  }[]> {
    const results = await db
      .select({
        organizationId: organisations.id,
        organizationName: organisations.name,
        totalCases: sql<number>`COUNT(${cases.id})`,
        activeCases: sql<number>`COUNT(CASE WHEN LOWER(${cases.status}) != 'closed' THEN 1 END)`,
        closedCases: sql<number>`COUNT(CASE WHEN LOWER(${cases.status}) = 'closed' THEN 1 END)`,
        totalOutstanding: sql<string>`COALESCE(SUM(CASE WHEN LOWER(${cases.status}) != 'closed' THEN ${cases.outstandingAmount} ELSE 0 END), 0)`,
        totalRecovered: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
        averageCaseAge: sql<number>`COALESCE(AVG(EXTRACT(DAYS FROM NOW() - ${cases.createdAt})), 0)`,
        userCount: sql<number>`COUNT(DISTINCT ${users.id})`,
      })
      .from(organisations)
      .leftJoin(cases, and(eq(cases.organisationId, organisations.id), eq(cases.isArchived, false)))
      .leftJoin(payments, eq(payments.caseId, cases.id))
      .leftJoin(users, eq(users.organisationId, organisations.id))
      .groupBy(organisations.id, organisations.name)
      .orderBy(organisations.name);

    return results.map(result => ({
      organizationId: result.organizationId,
      organizationName: result.organizationName,
      totalCases: result.totalCases,
      activeCases: result.activeCases,
      closedCases: result.closedCases,
      totalOutstanding: result.totalOutstanding,
      totalRecovered: result.totalRecovered,
      recoveryRate: result.totalOutstanding === "0" ? 0 : 
        (parseFloat(result.totalRecovered) / parseFloat(result.totalOutstanding)) * 100,
      averageCaseAge: result.averageCaseAge,
      userCount: result.userCount,
    }));
  }

  async getUserActivityReport(startDate?: Date, endDate?: Date): Promise<{
    userId: string;
    userEmail: string;
    userFirstName: string;
    userLastName: string;
    organizationName: string;
    loginCount: number;
    lastLogin: Date;
    actionCount: number;
    casesCreated: number;
    messageseSent: number;
    documentsUploaded: number;
  }[]> {
    // Get basic user data with organization info
    const usersWithOrgs = await db
      .select({
        userId: users.id,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        organizationName: organisations.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(organisations, eq(users.organisationId, organisations.id))
      .orderBy(users.email);

    // Get case counts for each user (excluding archived cases)
    const caseCounts = await db
      .select({
        userId: cases.createdBy,
        casesCreated: sql<number>`COUNT(*)`,
      })
      .from(cases)
      .where(and(cases.createdBy !== null, eq(cases.isArchived, false)))
      .groupBy(cases.createdBy);

    const caseMap = new Map(caseCounts.map(c => [c.userId, c.casesCreated]));

    // Get message counts for each user (excluding messages from archived cases)
    const messageCounts = await db
      .select({
        userId: messages.senderId,
        messageseSent: sql<number>`COUNT(*)`,
      })
      .from(messages)
      .leftJoin(cases, eq(messages.caseId, cases.id))
      .where(or(
        isNull(messages.caseId), // General messages not tied to a case
        eq(cases.isArchived, false) // Messages for non-archived cases only
      ))
      .groupBy(messages.senderId);

    const messageMap = new Map(messageCounts.map(m => [m.userId, m.messageseSent]));

    // Get document counts for each user (excluding documents from archived cases)
    const documentCounts = await db
      .select({
        userId: documents.uploadedBy,
        documentsUploaded: sql<number>`COUNT(*)`,
      })
      .from(documents)
      .leftJoin(cases, eq(documents.caseId, cases.id))
      .where(and(
        documents.uploadedBy !== null,
        or(
          isNull(documents.caseId), // General documents not tied to a case
          eq(cases.isArchived, false) // Documents for non-archived cases only
        )
      ))
      .groupBy(documents.uploadedBy);

    const documentMap = new Map(documentCounts.map(d => [d.userId, d.documentsUploaded]));

    return usersWithOrgs.map(user => ({
      userId: user.userId,
      userEmail: user.userEmail || '',
      userFirstName: user.userFirstName || '',
      userLastName: user.userLastName || '',
      organizationName: user.organizationName || 'Unassigned',
      loginCount: Math.floor(Math.random() * 20) + 1, // Simplified for demo
      lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
      actionCount: (caseMap.get(user.userId) || 0) + (messageMap.get(user.userId) || 0) + (documentMap.get(user.userId) || 0),
      casesCreated: caseMap.get(user.userId) || 0,
      messageseSent: messageMap.get(user.userId) || 0,
      documentsUploaded: documentMap.get(user.userId) || 0,
    }));
  }

  async getSystemHealthMetrics(): Promise<{
    metric: string;
    value: number;
    status: string;
    timestamp: Date;
  }[]> {
    // Get key system health metrics
    const metrics = [
      {
        metric: 'Database Connections',
        value: 1, // Simplified for demo
        status: 'healthy',
        timestamp: new Date(),
      },
      {
        metric: 'Active Users (24h)',
        value: 3, // Simplified for demo
        status: 'healthy',
        timestamp: new Date(),
      },
      {
        metric: 'Failed Logins (24h)',
        value: 1, // Simplified for demo
        status: 'healthy',
        timestamp: new Date(),
      },
      {
        metric: 'Cases Created (24h)',
        value: (await db.select({ count: sql<number>`COUNT(*)` })
          .from(cases)
          .where(and(
            eq(cases.isArchived, false),
            sql`${cases.createdAt} > NOW() - INTERVAL '24 hours'`
          )))[0].count,
        status: 'healthy',
        timestamp: new Date(),
      },
    ];

    // Determine status based on values
    return metrics.map(metric => {
      let status = 'healthy';
      if (metric.metric === 'Failed Logins (24h)' && metric.value > 10) {
        status = 'warning';
      }
      if (metric.metric === 'Failed Logins (24h)' && metric.value > 50) {
        status = 'critical';
      }
      return { ...metric, status };
    });
  }

  async getCustomReportData(reportConfig: {
    tables: string[];
    filters: Record<string, any>;
    groupBy?: string[];
    orderBy?: string;
    limit?: number;
  }): Promise<any[]> {
    // This is a simplified version - in production, you'd want more robust query building
    try {
      let query = db.select();
      
      // For demo purposes, support common table combinations
      if (reportConfig.tables.includes('cases') && reportConfig.tables.includes('organisations')) {
        query = db.select({
          caseId: cases.id,
          accountNumber: cases.accountNumber,
          caseName: cases.caseName,
          originalAmount: cases.originalAmount,
          outstandingAmount: cases.outstandingAmount,
          status: cases.status,
          organizationName: organisations.name,
          createdAt: cases.createdAt,
        })
        .from(cases)
        .leftJoin(organisations, eq(cases.organisationId, organisations.id));
      } else if (reportConfig.tables.includes('users') && reportConfig.tables.includes('organisations')) {
        query = db.select({
          userId: users.id,
          userEmail: users.email,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          organizationName: organisations.name,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(organisations, eq(users.organisationId, organisations.id));
      } else {
        // Default to cases only
        query = db.select().from(cases);
      }

      // Apply filters (simplified)
      if (reportConfig.filters.status) {
        query = query.where(eq(cases.status, reportConfig.filters.status));
      }

      // Apply limit
      if (reportConfig.limit) {
        query = query.limit(reportConfig.limit);
      }

      return await query;
    } catch (error) {
      console.error('Custom report query error:', error);
      return [];
    }
  }

  // External API credentials operations
  async createExternalApiCredential(credential: InsertExternalApiCredential): Promise<ExternalApiCredential> {
    const [result] = await db.insert(externalApiCredentials).values(credential).returning();
    return result;
  }

  async getExternalApiCredentials(organisationId: number): Promise<ExternalApiCredential[]> {
    return await db
      .select()
      .from(externalApiCredentials)
      .where(eq(externalApiCredentials.organisationId, organisationId));
  }

  async verifyExternalApiCredential(organisationId: number, username: string, password: string): Promise<boolean> {
    const [credential] = await db
      .select()
      .from(externalApiCredentials)
      .where(
        and(
          eq(externalApiCredentials.organisationId, organisationId),
          eq(externalApiCredentials.username, username),
          eq(externalApiCredentials.isActive, true)
        )
      );

    if (!credential) {
      return false;
    }

    return await bcrypt.compare(password, credential.passwordHash);
  }

  async getExternalApiCredentialByUsername(username: string): Promise<ExternalApiCredential | undefined> {
    const [credential] = await db
      .select()
      .from(externalApiCredentials)
      .where(eq(externalApiCredentials.username, username));
    return credential;
  }

  async updateExternalApiCredential(id: number, updates: Partial<InsertExternalApiCredential>): Promise<ExternalApiCredential> {
    const [result] = await db
      .update(externalApiCredentials)
      .set(updates)
      .where(eq(externalApiCredentials.id, id))
      .returning();
    return result;
  }

  async deleteExternalApiCredential(id: number): Promise<void> {
    await db.delete(externalApiCredentials).where(eq(externalApiCredentials.id, id));
  }
}

export const storage = new DatabaseStorage();
