import {
  users,
  organisations,
  cases,
  caseActivities,
  messages,
  documents,
  payments,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organisation operations
  getOrganisation(id: number): Promise<Organization | undefined>;
  createOrganisation(org: InsertOrganization): Promise<Organization>;
  
  // Case operations
  getCasesForOrganisation(organisationId: number): Promise<Case[]>;
  getAllCases(): Promise<Case[]>; // Admin only - get all cases across all organizations
  getCase(id: number, organisationId: number): Promise<Case | undefined>;
  getCaseById(id: number): Promise<Case | undefined>; // Admin only - get case by ID without org restriction
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: number, caseData: Partial<InsertCase>): Promise<Case>;
  
  // Case activity operations
  getCaseActivities(caseId: number): Promise<CaseActivity[]>;
  addCaseActivity(activity: InsertCaseActivity): Promise<CaseActivity>;
  
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

  async getOrganisation(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organisations).where(eq(organisations.id, id));
    return org;
  }

  async createOrganisation(org: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db.insert(organisations).values(org).returning();
    return newOrg;
  }

  async getCasesForOrganisation(organisationId: number): Promise<Case[]> {
    // Get all cases for the organisation
    const allCases = await db
      .select()
      .from(cases)
      .where(eq(cases.organisationId, organisationId));

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
        
        // Calculate outstanding amount: original amount minus total payments
        const calculatedOutstanding = parseFloat(case_.originalAmount) - totalPayments;
        
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
          outstandingAmount: calculatedOutstanding.toFixed(2),
          totalPayments: totalPayments.toFixed(2),
          lastActivityTime: new Date(lastActivityTime).toISOString()
        };
      })
    );

    // Sort by last activity time (most recent first)
    return casesWithCalculatedBalance.sort((a, b) => 
      new Date(b.lastActivityTime).getTime() - new Date(a.lastActivityTime).getTime()
    );
  }

  async getAllCases(): Promise<Case[]> {
    // Admin only - get all cases across all organizations
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
        
        // Calculate outstanding amount: original amount minus total payments
        const calculatedOutstanding = parseFloat(case_.originalAmount) - totalPayments;
        
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
          outstandingAmount: calculatedOutstanding.toFixed(2),
          totalPayments: totalPayments.toFixed(2),
          lastActivityTime: new Date(lastActivityTime).toISOString()
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

  async getMessagesForUser(userId: string): Promise<any[]> {
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
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId)))
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
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
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
    return await db
      .select()
      .from(documents)
      .where(eq(documents.caseId, caseId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentsForOrganisation(organisationId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.organisationId, organisationId))
      .orderBy(desc(documents.createdAt));
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
    return await db.select().from(payments)
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

  async deletePayment(id: number, organisationId: number): Promise<void> {
    await db.delete(payments)
      .where(and(
        eq(payments.id, id),
        eq(payments.organisationId, organisationId)
      ));
  }

  async getCaseStats(organisationId: number): Promise<{
    activeCases: number;
    closedCases: number;
    totalOutstanding: string;
    totalRecovery: string;
  }> {
    const [stats] = await db
      .select({
        activeCases: sql<number>`COUNT(CASE WHEN status != 'closed' THEN 1 END)`,
        closedCases: sql<number>`COUNT(CASE WHEN status = 'closed' THEN 1 END)`,
        totalOutstanding: sql<string>`COALESCE(SUM(CASE WHEN status != 'closed' THEN outstanding_amount ELSE 0 END), 0)`,
      })
      .from(cases)
      .where(eq(cases.organisationId, organisationId));

    // Calculate total recovery from payments
    const [recoveryStats] = await db
      .select({
        totalRecovery: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .leftJoin(cases, eq(payments.caseId, cases.id))
      .where(eq(cases.organisationId, organisationId));

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
    // Admin only - get stats across all organizations
    const [stats] = await db
      .select({
        activeCases: sql<number>`COUNT(CASE WHEN status != 'closed' THEN 1 END)`,
        closedCases: sql<number>`COUNT(CASE WHEN status = 'closed' THEN 1 END)`,
        totalOutstanding: sql<string>`COALESCE(SUM(CASE WHEN status != 'closed' THEN outstanding_amount ELSE 0 END), 0)`,
      })
      .from(cases);

    // Calculate total recovery from payments across all organizations
    const [recoveryStats] = await db
      .select({
        totalRecovery: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments);

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
        createdAt: organisations.createdAt,
        userCount: sql<number>`count(${users.id})`,
      })
      .from(organisations)
      .leftJoin(users, eq(organisations.id, users.organisationId))
      .groupBy(organisations.id, organisations.name, organisations.createdAt)
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
}

export const storage = new DatabaseStorage();
