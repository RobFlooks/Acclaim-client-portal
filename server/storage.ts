import {
  users,
  organizations,
  cases,
  caseActivities,
  messages,
  documents,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  
  // Case operations
  getCasesForOrganization(organizationId: number): Promise<Case[]>;
  getCase(id: number, organizationId: number): Promise<Case | undefined>;
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
  
  // Document operations
  getDocumentsForCase(caseId: number): Promise<Document[]>;
  getDocumentsForOrganization(organizationId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number, organizationId: number): Promise<void>;
  
  // Statistics
  getCaseStats(organizationId: number): Promise<{
    activeCases: number;
    resolvedCases: number;
    totalOutstanding: string;
    recoveryRate: number;
  }>;
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

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values(org).returning();
    return newOrg;
  }

  async getCasesForOrganization(organizationId: number): Promise<Case[]> {
    return await db
      .select()
      .from(cases)
      .where(eq(cases.organizationId, organizationId))
      .orderBy(desc(cases.updatedAt));
  }

  async getCase(id: number, organizationId: number): Promise<Case | undefined> {
    const [case_] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, id), eq(cases.organizationId, organizationId)));
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

  async getMessagesForUser(userId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.recipientId, userId))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesForCase(caseId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
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

  async getDocumentsForCase(caseId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.caseId, caseId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentsForOrganization(organizationId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.organizationId, organizationId))
      .orderBy(desc(documents.createdAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async deleteDocument(id: number, organizationId: number): Promise<void> {
    await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.organizationId, organizationId)));
  }

  async getCaseStats(organizationId: number): Promise<{
    activeCases: number;
    resolvedCases: number;
    totalOutstanding: string;
    recoveryRate: number;
  }> {
    const [stats] = await db
      .select({
        activeCases: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
        resolvedCases: sql<number>`COUNT(CASE WHEN status = 'resolved' THEN 1 END)`,
        totalOutstanding: sql<string>`COALESCE(SUM(CASE WHEN status = 'active' THEN outstanding_amount ELSE 0 END), 0)`,
        totalCases: sql<number>`COUNT(*)`,
      })
      .from(cases)
      .where(eq(cases.organizationId, organizationId));

    const recoveryRate = stats.totalCases > 0 ? (stats.resolvedCases / stats.totalCases) * 100 : 0;

    return {
      activeCases: stats.activeCases,
      resolvedCases: stats.resolvedCases,
      totalOutstanding: stats.totalOutstanding.toString(),
      recoveryRate: Math.round(recoveryRate),
    };
  }
}

export const storage = new DatabaseStorage();
