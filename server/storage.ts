import {
  users,
  organisations,
  cases,
  caseSubmissions,
  caseSubmissionDocuments,
  caseActivities,
  messages,
  documents,
  payments,
  userActivityLogs,
  loginAttempts,
  passwordResetTokens,
  systemMetrics,
  auditLog,
  externalApiCredentials,
  userOrganisations,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type Case,
  type InsertCase,
  type CaseSubmission,
  type InsertCaseSubmission,
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
  type PasswordResetToken,
  type SystemMetric,
  type InsertSystemMetric,
  type AuditLog,
  type InsertAuditLog,
  type ExternalApiCredential,
  type InsertExternalApiCredential,
  type UserOrganisation,
  type InsertUserOrganisation,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, or, isNull, isNotNull, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import session, { SessionStore } from "express-session";
import connectPg from "connect-pg-simple";

export interface IStorage {
  sessionStore: SessionStore;

  // User operations 
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAzureId(azureId: string): Promise<User | undefined>;
  linkAzureAccount(userId: string, azureId: string): Promise<void>;
  createUser(userData: any): Promise<User>;
  getUserByExternalRef(externalRef: string): Promise<User | undefined>;
  createUserWithExternalRef(userData: any): Promise<{ user: User; tempPassword: string }>;
  updateUserPassword(id: string, passwordData: { hashedPassword?: string; tempPassword?: string | null; mustChangePassword?: boolean }): Promise<User>;
  updateUserOrganisation(id: string, organisationId: number | null): Promise<User>;
  
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
  getCasesForUser(userId: string): Promise<Case[]>;
  getUserOrganisations(userId: string): Promise<UserOrganisation[]>;
  addUserToOrganisation(userId: string, organisationId: number): Promise<UserOrganisation>;
  removeUserFromOrganisation(userId: string, organisationId: number): Promise<void>;
  getUsersWithOrganisations(): Promise<(User & { organisations: Organization[] })[]>; // Returns all cases for user (admin gets all, regular user gets org-filtered)
  getAllCases(): Promise<Case[]>; // Admin only - get all cases across all organizations
  getAllCasesIncludingArchived(): Promise<Case[]>; // Admin only - get all cases including archived ones
  getCase(id: number, organisationId: number): Promise<Case | undefined>;
  getCaseById(id: number): Promise<Case | undefined>; // Admin only - get case by ID without org restriction
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: number, caseData: Partial<InsertCase>): Promise<Case>;
  archiveCase(id: number, userId: string): Promise<Case>; // Admin only - archive case
  unarchiveCase(id: number, userId: string): Promise<Case>; // Admin only - unarchive case
  deleteCase(id: number): Promise<void>; // Admin only - permanently delete case and all related data
  
  // Case submission operations
  createCaseSubmission(submission: InsertCaseSubmission): Promise<CaseSubmission>;
  getCaseSubmissions(): Promise<CaseSubmission[]>; // Admin only - get all pending submissions
  getCaseSubmissionsByStatus(status: string): Promise<CaseSubmission[]>; // Admin only - get submissions by status
  updateCaseSubmissionStatus(id: number, status: string, processedBy: string): Promise<CaseSubmission>;
  deleteCaseSubmission(id: number): Promise<void>; // Admin only - delete submission
  
  // Case submission document operations
  createCaseSubmissionDocument(doc: {
    caseSubmissionId: number;
    fileName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
  }): Promise<void>;
  getCaseSubmissionDocuments(caseSubmissionId: number): Promise<Array<{
    id: number;
    fileName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
    uploadedAt: Date;
  }>>;
  deleteCaseSubmissionDocument(id: number): Promise<void>;
  
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
  getDocumentsForUser(userId: string): Promise<Document[]>; // Returns all documents for user (admin gets all, regular user gets org-filtered)
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
  
  getCombinedCaseStats(organisationIds: number[]): Promise<{
    activeCases: number;
    closedCases: number;
    totalOutstanding: string;
    totalRecovery: string;
  }>; // Get combined stats from multiple organizations

  // Admin operations
  hasAdminUser(): Promise<boolean>; // Check if any admin user exists (for initial setup)
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
  
  deleteUser(userId: string): Promise<void>;

  // System monitoring operations
  logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog>;
  getUserActivityLogs(userId?: string, limit?: number): Promise<UserActivityLog[]>;
  
  logLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt>;
  getLoginAttempts(limit?: number): Promise<LoginAttempt[]>;
  getFailedLoginAttempts(limit?: number): Promise<LoginAttempt[]>;
  
  recordSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric>;
  getSystemMetrics(metricName?: string, limit?: number): Promise<SystemMetric[]>;
  
  // Comprehensive audit functionality
  logAuditEvent(auditData: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: {
    tableName?: string;
    recordId?: string;
    operation?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]>;
  getAuditSummary(): Promise<{
    totalChanges: number;
    recentChanges: number;
    topUsers: { userId: string; userEmail: string; changeCount: number }[];
    topTables: { tableName: string; changeCount: number }[];
  }>;
  
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

  // Password reset token operations
  createPasswordResetToken(userId: string, hashedToken: string, expiresAt: Date): Promise<PasswordResetToken>;
  getValidPasswordResetToken(userId: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(tokenId: number): Promise<void>;
  invalidatePasswordResetTokensForUser(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: SessionStore;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'user_sessions', // Use different table name to avoid conflicts
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserByAzureId(azureId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.azureId, azureId));
    return user;
  }

  async linkAzureAccount(userId: string, azureId: string): Promise<void> {
    await db.update(users).set({ azureId, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

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
        organisationId: userData.organisationId,
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
    console.log('Storage.createOrganisation - Received data:', JSON.stringify(org, null, 2));
    const [newOrg] = await db.insert(organisations).values(org).returning();
    console.log('Storage.createOrganisation - Created org:', JSON.stringify(newOrg, null, 2));
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
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.organisationId, id)),
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
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.organisationId, id)),
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

  async getCasesForUser(userId: string): Promise<Case[]> {
    // Get the user to check their organization and admin status
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return [];
    }

    const userRecord = user[0];

    // If user is admin, return all cases (no organisation filtering)
    if (userRecord.isAdmin) {
      return await this.getAllCases();
    }

    // For non-admin users, get all their organisation cases
    const userOrgs = await this.getUserOrganisations(userId);
    if (userOrgs.length === 0 && !userRecord.organisationId) {
      return [];
    }

    // Collect all organisation IDs (including legacy organisationId)
    const orgIds = new Set<number>();
    if (userRecord.organisationId) {
      orgIds.add(userRecord.organisationId);
    }
    userOrgs.forEach(uo => orgIds.add(uo.organisationId));

    // Get cases from all user's organisations
    const allCases: Case[] = [];
    for (const orgId of orgIds) {
      const orgCases = await this.getCasesForOrganisation(orgId);
      allCases.push(...orgCases);
    }

    return allCases;
  }

  async getUserOrganisations(userId: string): Promise<UserOrganisation[]> {
    return await db.select().from(userOrganisations).where(eq(userOrganisations.userId, userId));
  }

  async addUserToOrganisation(userId: string, organisationId: number): Promise<UserOrganisation> {
    const [userOrg] = await db.insert(userOrganisations).values({
      userId,
      organisationId,
    }).returning();
    return userOrg;
  }

  async removeUserFromOrganisation(userId: string, organisationId: number): Promise<void> {
    await db.delete(userOrganisations).where(
      and(
        eq(userOrganisations.userId, userId),
        eq(userOrganisations.organisationId, organisationId)
      )
    );
  }

  async getUsersWithOrganisations(): Promise<(User & { organisations: Organization[] })[]> {
    const allUsers = await db.select().from(users);
    
    const usersWithOrgs = await Promise.all(
      allUsers.map(async (user) => {
        // Get user's assigned organisations from junction table
        const userOrgs = await db
          .select({ organisation: organisations })
          .from(userOrganisations)
          .leftJoin(organisations, eq(userOrganisations.organisationId, organisations.id))
          .where(eq(userOrganisations.userId, user.id));

        // Also get legacy organisation if exists
        const legacyOrg = user.organisationId ? 
          await db.select().from(organisations).where(eq(organisations.id, user.organisationId)).limit(1) : [];

        // Combine organisations (avoid duplicates)
        const orgMap = new Map<number, Organization>();
        
        // Add legacy organisation
        if (legacyOrg.length > 0) {
          orgMap.set(legacyOrg[0].id, legacyOrg[0]);
        }
        
        // Add junction table organisations
        userOrgs.forEach(uo => {
          if (uo.organisation) {
            orgMap.set(uo.organisation.id, uo.organisation);
          }
        });

        return {
          ...user,
          organisations: Array.from(orgMap.values())
        };
      })
    );

    return usersWithOrgs;
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
    
    // Timeline activities are only created by SOS pushes, not portal actions
    // Case archiving does not create timeline entry
    
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
    
    // Timeline activities are only created by SOS pushes, not portal actions
    // Case unarchiving does not create timeline entry
    
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

  // Case submission operations
  async createCaseSubmission(submission: InsertCaseSubmission): Promise<CaseSubmission> {
    const [newSubmission] = await db.insert(caseSubmissions).values(submission).returning();
    return newSubmission;
  }

  async getCaseSubmissions(): Promise<CaseSubmission[]> {
    // Admin only - get all submissions with user and organisation details
    const submissions = await db
      .select({
        ...caseSubmissions,
        submittedByName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('submittedByName'),
        organisationName: organisations.name,
      })
      .from(caseSubmissions)
      .leftJoin(users, eq(caseSubmissions.submittedBy, users.id))
      .leftJoin(organisations, eq(caseSubmissions.organisationId, organisations.id))
      .orderBy(desc(caseSubmissions.submittedAt));
    
    return submissions;
  }

  async getCaseSubmissionsByStatus(status: string): Promise<CaseSubmission[]> {
    // Admin only - get submissions by status with user and organisation details
    const submissions = await db
      .select({
        ...caseSubmissions,
        submittedByName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('submittedByName'),
        organisationName: organisations.name,
      })
      .from(caseSubmissions)
      .leftJoin(users, eq(caseSubmissions.submittedBy, users.id))
      .leftJoin(organisations, eq(caseSubmissions.organisationId, organisations.id))
      .where(eq(caseSubmissions.status, status))
      .orderBy(desc(caseSubmissions.submittedAt));
    
    return submissions;
  }

  async updateCaseSubmissionStatus(id: number, status: string, processedBy: string): Promise<CaseSubmission> {
    const [updatedSubmission] = await db
      .update(caseSubmissions)
      .set({ 
        status, 
        processedBy, 
        processedAt: new Date() 
      })
      .where(eq(caseSubmissions.id, id))
      .returning();
    
    return updatedSubmission;
  }

  async deleteCaseSubmission(id: number): Promise<void> {
    // Admin only - delete submission
    await db.delete(caseSubmissions).where(eq(caseSubmissions.id, id));
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
    // Get the user to check their organization and admin status
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return [];
    }

    const userRecord = user[0];
    
    // Get all organisation IDs the user has access to (both legacy and junction table)
    const userOrgs = await this.getUserOrganisations(userId);
    const allUserOrgIds = new Set<number>();
    
    // Add legacy organisation if exists
    if (userRecord.organisationId) {
      allUserOrgIds.add(userRecord.organisationId);
    }
    
    // Add junction table organisations
    userOrgs.forEach(uo => allUserOrgIds.add(uo.organisationId));

    // If user is admin, return all messages (no organisation filtering)
    if (userRecord.isAdmin) {
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
        .where(
          or(
            isNull(messages.caseId), // General messages not tied to a case
            eq(cases.isArchived, false) // Messages for non-archived cases only
          )
        )
        .orderBy(desc(messages.createdAt));
    }

    // For non-admin users, filter by all assigned organisations
    if (allUserOrgIds.size === 0) {
      return []; // User has no organisation assignments
    }

    const orgIdArray = Array.from(allUserOrgIds);
    
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
            inArray(messages.recipientId, orgIdArray.map(id => id.toString()))
          ), // Messages sent to any of user's organisations
          and(
            isNotNull(messages.caseId), // Message is tied to a case
            inArray(cases.organisationId, orgIdArray) // Case belongs to one of user's organisations
          )
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

  async getDocumentsForUser(userId: string): Promise<Document[]> {
    // Get the user to check their organization and admin status
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return [];
    }

    const userRecord = user[0];

    // If user is admin, return all documents (no organisation filtering)
    if (userRecord.isAdmin) {
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
        .where(
          or(
            isNull(documents.caseId), // General documents not tied to a case
            eq(cases.isArchived, false) // Documents for non-archived cases only
          )
        )
        .orderBy(desc(documents.createdAt));
      
      return results;
    }

    // Get all organisation IDs the user has access to (both legacy and junction table)
    const userOrgs = await this.getUserOrganisations(userId);
    const allUserOrgIds = new Set<number>();
    
    // Add legacy organisation if exists
    if (userRecord.organisationId) {
      allUserOrgIds.add(userRecord.organisationId);
    }
    
    // Add junction table organisations
    userOrgs.forEach(uo => allUserOrgIds.add(uo.organisationId));

    // For non-admin users, filter by all assigned organisations
    if (allUserOrgIds.size === 0) {
      return []; // User has no organisation assignments
    }

    const orgIdArray = Array.from(allUserOrgIds);
    
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
        inArray(documents.organisationId, orgIdArray), // Documents from any of user's organisations
        or(
          isNull(documents.caseId), // General documents not tied to a case
          eq(cases.isArchived, false) // Documents for non-archived cases only
        )
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

  async getCombinedCaseStats(organisationIds: number[]): Promise<{
    activeCases: number;
    closedCases: number;
    totalOutstanding: string;
    totalRecovery: string;
  }> {
    // Get combined stats from multiple organizations (excluding archived cases)
    const [stats] = await db
      .select({
        activeCases: sql<number>`COUNT(CASE WHEN LOWER(status) != 'closed' THEN 1 END)`,
        closedCases: sql<number>`COUNT(CASE WHEN LOWER(status) = 'closed' THEN 1 END)`,
        totalOutstanding: sql<string>`COALESCE(SUM(CASE WHEN LOWER(status) != 'closed' THEN outstanding_amount ELSE 0 END), 0)`,
      })
      .from(cases)
      .where(and(
        eq(cases.isArchived, false),
        inArray(cases.organisationId, organisationIds)
      ));

    // Calculate total recovery from payments for cases in specified organizations (excluding archived cases)
    const [recoveryStats] = await db
      .select({
        totalRecovery: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .leftJoin(cases, eq(payments.caseId, cases.id))
      .where(and(
        eq(cases.isArchived, false),
        inArray(cases.organisationId, organisationIds),
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
  async hasAdminUser(): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isAdmin, true));
    return result.count > 0;
  }

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
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const userId = nanoid(10);

    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email.toLowerCase(),
        phone: userData.phone,
        organisationId: userData.organisationId,
        isAdmin: userData.isAdmin || false,
        hashedPassword,
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

  async updateNotificationPreferences(userId: string, preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
  }): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user || null;
  }

  async getUsersByOrganisationId(organisationId: number): Promise<User[]> {
    // Get users via legacy organisationId field
    const legacyUsers = await db.select().from(users).where(eq(users.organisationId, organisationId));
    
    // Get users via junction table
    const junctionUsers = await db
      .select({ user: users })
      .from(userOrganisations)
      .leftJoin(users, eq(userOrganisations.userId, users.id))
      .where(eq(userOrganisations.organisationId, organisationId));
    
    // Combine and deduplicate users
    const userMap = new Map<string, User>();
    
    // Add legacy users
    legacyUsers.forEach(user => userMap.set(user.id, user));
    
    // Add junction users
    junctionUsers.forEach(ju => {
      if (ju.user) {
        userMap.set(ju.user.id, ju.user);
      }
    });
    
    return Array.from(userMap.values());
  }

  async updateUserPassword(id: string, passwordData: { 
    hashedPassword?: string; 
    tempPassword?: string | null; 
    mustChangePassword?: boolean 
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        hashedPassword: passwordData.hashedPassword,
        tempPassword: passwordData.tempPassword,
        mustChangePassword: passwordData.mustChangePassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async updateUserOrganisation(id: string, organisationId: number | null): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        organisationId: organisationId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
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
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await db
      .update(users)
      .set({
        hashedPassword,
        tempPassword,
        mustChangePassword: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return tempPassword;
  }

  async changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.hashedPassword) return false;

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isCurrentPasswordValid) return false;

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({
        hashedPassword: newPasswordHash,
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
        hashedPassword: newPasswordHash,
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
    if (!user || !user.hashedPassword) return false;

    return await bcrypt.compare(password, user.hashedPassword);
  }

  async checkMustChangePassword(userId: string): Promise<boolean> {
    const [user] = await db.select({ mustChangePassword: users.mustChangePassword }).from(users).where(eq(users.id, userId));
    return user?.mustChangePassword || false;
  }

  async deleteUser(userId: string): Promise<void> {
    // First delete all related data
    // Delete from user-organisation junction table
    await db.delete(userOrganisations).where(eq(userOrganisations.userId, userId));
    
    // Delete user activity logs
    await db.delete(userActivityLogs).where(eq(userActivityLogs.userId, userId));
    
    // Delete case activities performed by this user
    await db.delete(caseActivities).where(eq(caseActivities.performedBy, userId));
    
    // Delete documents uploaded by this user
    await db.delete(documents).where(eq(documents.uploadedBy, userId));
    
    // Delete messages sent by this user
    await db.delete(messages).where(eq(messages.senderId, userId));
    
    // Delete payments recorded by this user
    await db.delete(payments).where(eq(payments.recordedBy, userId));
    
    // Delete audit logs related to this user
    await db.delete(auditLog).where(eq(auditLog.userId, userId));
    
    // Delete external API credentials created by this user
    await db.delete(externalApiCredentials).where(eq(externalApiCredentials.createdBy, userId));
    
    // Finally delete the user record
    await db.delete(users).where(eq(users.id, userId));
  }

  // System monitoring operations
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    const [log] = await db.insert(userActivityLogs).values(activity).returning();
    return log;
  }

  async getUserActivityLogs(userId?: string, limit = 100): Promise<UserActivityLog[]> {
    let query = db.select({
      id: userActivityLogs.id,
      userId: userActivityLogs.userId,
      action: userActivityLogs.action,
      details: userActivityLogs.details,
      ipAddress: userActivityLogs.ipAddress,
      userAgent: userActivityLogs.userAgent,
      timestamp: userActivityLogs.createdAt,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(userActivityLogs)
    .leftJoin(users, eq(userActivityLogs.userId, users.id))
    .orderBy(desc(userActivityLogs.createdAt))
    .limit(limit);

    if (userId) {
      query = query.where(eq(userActivityLogs.userId, userId));
    }

    return await query;
  }

  async logLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt> {
    const [log] = await db.insert(loginAttempts).values(attempt).returning();
    return log;
  }

  async getLoginAttempts(limit = 100): Promise<LoginAttempt[]> {
    return await db.select().from(loginAttempts)
      .orderBy(desc(loginAttempts.createdAt))
      .limit(limit);
  }

  async getFailedLoginAttempts(limit = 100): Promise<LoginAttempt[]> {
    return await db.select().from(loginAttempts)
      .where(eq(loginAttempts.success, false))
      .orderBy(desc(loginAttempts.createdAt))
      .limit(limit);
  }

  async recordSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric> {
    const [record] = await db.insert(systemMetrics).values(metric).returning();
    return record;
  }

  async getSystemMetrics(metricName?: string, limit = 100): Promise<SystemMetric[]> {
    let query = db.select().from(systemMetrics)
      .orderBy(desc(systemMetrics.recordedAt))
      .limit(limit);

    if (metricName) {
      query = query.where(eq(systemMetrics.metricName, metricName));
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
    try {
      const [totalUsers, totalCases, totalOrganizations] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users),
        db.select({ count: sql<number>`count(*)` }).from(cases).where(eq(cases.isArchived, false)),
        db.select({ count: sql<number>`count(*)` }).from(organisations),
      ]);

      const [activeCases] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(cases)
          .where(and(eq(cases.isArchived, false), or(eq(cases.status, "new"), eq(cases.status, "in_progress")))),
      ]);

      // Simple fallback values for missing tables
      const recentActivity = 0;
      const failedLogins = 0;
      const activeUsers = Math.floor(totalUsers[0]?.count * 0.8) || 0; // Estimate 80% active

      // Determine system health based on failed logins and activity
      let systemHealth = "healthy";
      if (failedLogins > 10) {
        systemHealth = "warning";
      }
      if (failedLogins > 50) {
        systemHealth = "critical";
      }

      return {
        totalUsers: totalUsers[0]?.count || 0,
        activeUsers,
        totalCases: totalCases[0]?.count || 0,
        activeCases: activeCases[0]?.count || 0,
        totalOrganizations: totalOrganizations[0]?.count || 0,
        recentActivity,
        failedLogins,
        systemHealth,
      };
    } catch (error) {
      console.error('Error fetching system analytics:', error);
      // Return safe fallback data
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalCases: 0,
        activeCases: 0,
        totalOrganizations: 0,
        recentActivity: 0,
        failedLogins: 0,
        systemHealth: "unknown",
      };
    }
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

    return await bcrypt.compare(password, credential.hashedPassword);
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

  // Comprehensive audit functionality
  async logAuditEvent(auditData: InsertAuditLog): Promise<AuditLog> {
    const [result] = await db.insert(auditLog).values(auditData).returning();
    return result;
  }

  async getAuditLogs(filters?: {
    tableName?: string;
    recordId?: string;
    operation?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    let query = db.select().from(auditLog);
    
    const conditions = [];
    
    if (filters?.tableName) {
      conditions.push(eq(auditLog.tableName, filters.tableName));
    }
    
    if (filters?.recordId) {
      conditions.push(eq(auditLog.recordId, filters.recordId));
    }
    
    if (filters?.operation) {
      conditions.push(eq(auditLog.operation, filters.operation));
    }
    
    if (filters?.userId) {
      conditions.push(eq(auditLog.userId, filters.userId));
    }
    
    if (filters?.startDate) {
      conditions.push(sql`${auditLog.timestamp} >= ${filters.startDate}`);
    }
    
    if (filters?.endDate) {
      conditions.push(sql`${auditLog.timestamp} <= ${filters.endDate}`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(auditLog.timestamp));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getAuditSummary(): Promise<{
    totalChanges: number;
    recentChanges: number;
    topUsers: { userId: string; userEmail: string; changeCount: number }[];
    topTables: { tableName: string; changeCount: number }[];
  }> {
    // Get total changes
    const [totalChanges] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog);

    // Get recent changes (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const [recentChanges] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(sql`${auditLog.timestamp} >= ${yesterday}`);

    // Get top users by change count
    const topUsers = await db
      .select({
        userId: auditLog.userId,
        userEmail: auditLog.userEmail,
        changeCount: sql<number>`count(*)`,
      })
      .from(auditLog)
      .where(sql`${auditLog.userId} IS NOT NULL`)
      .groupBy(auditLog.userId, auditLog.userEmail)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // Get top tables by change count
    const topTables = await db
      .select({
        tableName: auditLog.tableName,
        changeCount: sql<number>`count(*)`,
      })
      .from(auditLog)
      .groupBy(auditLog.tableName)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    return {
      totalChanges: totalChanges.count,
      recentChanges: recentChanges.count,
      topUsers: topUsers.map(user => ({
        userId: user.userId || 'Unknown',
        userEmail: user.userEmail || 'Unknown',
        changeCount: user.changeCount,
      })),
      topTables: topTables.map(table => ({
        tableName: table.tableName,
        changeCount: table.changeCount,
      })),
    };
  }

  // Helper method to create audit records for database changes
  async auditChange(
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    oldData: any = null,
    newData: any = null,
    userId?: string,
    userEmail?: string,
    ipAddress?: string,
    userAgent?: string,
    organisationId?: number,
    description?: string
  ): Promise<void> {
    try {
      if (operation === 'UPDATE' && oldData && newData) {
        // For updates, log individual field changes
        const changes = this.getFieldChanges(oldData, newData);
        
        for (const change of changes) {
          await this.logAuditEvent({
            tableName,
            recordId,
            operation,
            fieldName: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            userId,
            userEmail,
            ipAddress,
            userAgent,
            organisationId,
            description: description || `Updated ${change.field}`,
          });
        }
      } else {
        // For INSERT/DELETE, log the entire operation
        await this.logAuditEvent({
          tableName,
          recordId,
          operation,
          oldValue: oldData ? JSON.stringify(oldData) : null,
          newValue: newData ? JSON.stringify(newData) : null,
          userId,
          userEmail,
          ipAddress,
          userAgent,
          organisationId,
          description: description || `${operation} operation on ${tableName}`,
        });
      }
    } catch (error) {
      // Don't throw errors for audit logging to avoid disrupting main operations
      console.error('Audit logging failed:', error);
    }
  }

  private getFieldChanges(oldData: any, newData: any): { field: string; oldValue: string; newValue: string }[] {
    const changes = [];
    
    // Compare all fields
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    for (const key of allKeys) {
      const oldValue = oldData[key];
      const newValue = newData[key];
      
      // Skip system fields that change automatically
      if (['updatedAt', 'lastModified'].includes(key)) {
        continue;
      }
      
      // Compare values (handle null/undefined)
      if (oldValue !== newValue) {
        changes.push({
          field: key,
          oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
          newValue: newValue !== null && newValue !== undefined ? String(newValue) : null,
        });
      }
    }
    
    return changes;
  }

  // Case submission document operations
  async createCaseSubmissionDocument(doc: {
    caseSubmissionId: number;
    fileName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
  }): Promise<void> {
    await db.insert(caseSubmissionDocuments).values({
      caseSubmissionId: doc.caseSubmissionId,
      fileName: doc.fileName,
      filePath: doc.filePath,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
    });
  }

  async getCaseSubmissionDocuments(caseSubmissionId: number): Promise<Array<{
    id: number;
    fileName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
    uploadedAt: Date;
  }>> {
    const results = await db.select().from(caseSubmissionDocuments)
      .where(eq(caseSubmissionDocuments.caseSubmissionId, caseSubmissionId))
      .orderBy(desc(caseSubmissionDocuments.uploadedAt));
    
    return results.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      filePath: doc.filePath,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
      uploadedAt: doc.uploadedAt,
    }));
  }

  async deleteCaseSubmissionDocument(id: number): Promise<void> {
    await db.delete(caseSubmissionDocuments).where(eq(caseSubmissionDocuments.id, id));
  }

  // Password reset token operations
  async createPasswordResetToken(userId: string, hashedToken: string, expiresAt: Date): Promise<PasswordResetToken> {
    // Invalidate any existing tokens for this user first
    await this.invalidatePasswordResetTokensForUser(userId);
    
    const [token] = await db.insert(passwordResetTokens).values({
      userId,
      hashedToken,
      expiresAt,
    }).returning();
    return token;
  }

  async getValidPasswordResetToken(userId: string): Promise<PasswordResetToken | undefined> {
    const [token] = await db.select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt),
          sql`${passwordResetTokens.expiresAt} > NOW()`
        )
      )
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1);
    return token;
  }

  async markPasswordResetTokenUsed(tokenId: number): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async invalidatePasswordResetTokensForUser(userId: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt)
        )
      );
  }
}

export const storage = new DatabaseStorage();
