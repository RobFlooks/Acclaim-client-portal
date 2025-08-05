import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  organisationId: integer("organisation_id").references(() => organisations.id),
  isAdmin: boolean("is_admin").default(false),
  phone: varchar("phone"),
  hashedPassword: varchar("hashed_password"),
  tempPassword: varchar("temp_password"),
  mustChangePassword: boolean("must_change_password").default(false),
  externalRef: varchar("external_ref", { length: 100 }).unique(), // For external system integration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations table
export const organisations = pgTable("organisations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  address: text("address"),
  externalRef: varchar("external_ref", { length: 100 }).unique(), // For external system integration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Organisation junction table for many-to-many relationships
export const userOrganisations = pgTable("user_organisations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_organisations_user_id").on(table.userId),
  index("idx_user_organisations_org_id").on(table.organisationId),
]);

// Case submissions table (for capturing submissions before they become actual cases)
export const caseSubmissions = pgTable("case_submissions", {
  id: serial("id").primaryKey(),
  submittedBy: varchar("submitted_by", { length: 255 }).notNull().references(() => users.id),
  accountNumber: varchar("account_number", { length: 50 }).notNull(),
  caseName: varchar("case_name", { length: 255 }).notNull(),
  debtorType: varchar("debtor_type", { length: 50 }).notNull().default("individual"),
  debtorEmail: varchar("debtor_email", { length: 255 }),
  debtorPhone: varchar("debtor_phone", { length: 50 }),
  debtorAddress: text("debtor_address"),
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }),
  outstandingAmount: decimal("outstanding_amount", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending', 'processed', 'rejected'
  stage: varchar("stage", { length: 50 }).notNull().default("initial_contact"),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  externalRef: varchar("external_ref", { length: 100 }),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by", { length: 255 }).references(() => users.id),
});

// Cases table  
export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  accountNumber: varchar("account_number", { length: 50 }).notNull().unique(),
  caseName: varchar("case_name", { length: 255 }).notNull(),
  debtorType: varchar("debtor_type", { length: 50 }).notNull().default("individual"), // 'individual', 'company', 'sole_trader', 'company_and_individual'
  originalAmount: decimal("original_amount", { precision: 10, scale: 2 }).notNull(),
  outstandingAmount: decimal("outstanding_amount", { precision: 10, scale: 2 }).notNull(),
  costsAdded: decimal("costs_added", { precision: 10, scale: 2 }).default("0.00"),
  interestAdded: decimal("interest_added", { precision: 10, scale: 2 }).default("0.00"),
  feesAdded: decimal("fees_added", { precision: 10, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  stage: varchar("stage", { length: 100 }).notNull().default("initial_contact"),
  organisationId: integer("organisation_id").references(() => organisations.id).notNull(),
  assignedTo: varchar("assigned_to"),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"),
  externalRef: varchar("external_ref", { length: 100 }).unique(), // For external system integration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Case timeline/activity table
export const caseActivities = pgTable("case_activities", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => cases.id).notNull(),
  activityType: varchar("activity_type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  performedBy: varchar("performed_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  recipientType: varchar("recipient_type", { length: 20 }).notNull(), // 'user' or 'organisation'
  recipientId: varchar("recipient_id").notNull(),
  caseId: integer("case_id").references(() => cases.id),
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  attachmentFileName: varchar("attachment_file_name"),
  attachmentFilePath: varchar("attachment_file_path"),
  attachmentFileSize: integer("attachment_file_size"),
  attachmentFileType: varchar("attachment_file_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => cases.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 100 }),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  organisationId: integer("organisation_id").references(() => organisations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => cases.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  reference: varchar("reference", { length: 100 }),
  notes: text("notes"),
  recordedBy: varchar("recorded_by").references(() => users.id),
  externalRef: varchar("external_ref", { length: 100 }).unique(), // For external system integration
  createdAt: timestamp("created_at").defaultNow(),
  organisationId: integer("organisation_id").references(() => organisations.id).notNull(),
});

// System monitoring tables
export const userActivityLogs = pgTable("user_activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }),
  success: boolean("success").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  failureReason: varchar("failure_reason", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  metricName: varchar("metric_name", { length: 100 }).notNull(),
  metricValue: decimal("metric_value", { precision: 15, scale: 2 }).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Comprehensive audit trail table
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: varchar("record_id", { length: 100 }).notNull(),
  operation: varchar("operation", { length: 20 }).notNull(), // 'INSERT', 'UPDATE', 'DELETE'
  fieldName: varchar("field_name", { length: 100 }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  userId: varchar("user_id").references(() => users.id),
  userEmail: varchar("user_email"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  organisationId: integer("organisation_id").references(() => organisations.id),
  timestamp: timestamp("timestamp").defaultNow(),
  description: text("description"),
});

// External API credentials table for case management integration
export const externalApiCredentials = pgTable("external_api_credentials", {
  id: serial("id").primaryKey(),
  organisationId: integer("organisation_id").references(() => organisations.id).notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [users.organisationId],
    references: [organisations.id],
  }),
  sentMessages: many(messages),
  uploadedDocuments: many(documents),
}));

export const organisationsRelations = relations(organisations, ({ many }) => ({
  users: many(users),
  cases: many(cases),
  documents: many(documents),
}));

export const caseSubmissionsRelations = relations(caseSubmissions, ({ one }) => ({
  submittedByUser: one(users, {
    fields: [caseSubmissions.submittedBy],
    references: [users.id],
  }),
  processedByUser: one(users, {
    fields: [caseSubmissions.processedBy],
    references: [users.id],
  }),
  organisation: one(organisations, {
    fields: [caseSubmissions.organisationId],
    references: [organisations.id],
  }),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [cases.organisationId],
    references: [organisations.id],
  }),
  activities: many(caseActivities),
  messages: many(messages),
  documents: many(documents),
  payments: many(payments),
}));

export const caseActivitiesRelations = relations(caseActivities, ({ one }) => ({
  case: one(cases, {
    fields: [caseActivities.caseId],
    references: [cases.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  case: one(cases, {
    fields: [messages.caseId],
    references: [cases.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  case: one(cases, {
    fields: [documents.caseId],
    references: [cases.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  organisation: one(organisations, {
    fields: [documents.organisationId],
    references: [organisations.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  case: one(cases, {
    fields: [payments.caseId],
    references: [cases.id],
  }),
  recorder: one(users, {
    fields: [payments.recordedBy],
    references: [users.id],
  }),
  organisation: one(organisations, {
    fields: [payments.organisationId],
    references: [organisations.id],
  }),
}));

export const userActivityLogsRelations = relations(userActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [userActivityLogs.userId],
    references: [users.id],
  }),
}));

export const externalApiCredentialsRelations = relations(externalApiCredentials, ({ one }) => ({
  organisation: one(organisations, {
    fields: [externalApiCredentials.organisationId],
    references: [organisations.id],
  }),
  createdBy: one(users, {
    fields: [externalApiCredentials.createdBy],
    references: [users.id],
  }),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Organization = typeof organisations.$inferSelect;
export type InsertOrganization = typeof organisations.$inferInsert;

export type CaseSubmission = typeof caseSubmissions.$inferSelect;
export type InsertCaseSubmission = typeof caseSubmissions.$inferInsert;

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

export type CaseActivity = typeof caseActivities.$inferSelect;
export type InsertCaseActivity = typeof caseActivities.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type InsertUserActivityLog = typeof userActivityLogs.$inferInsert;

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = typeof systemMetrics.$inferInsert;

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

export type ExternalApiCredential = typeof externalApiCredentials.$inferSelect;
export type InsertExternalApiCredential = typeof externalApiCredentials.$inferInsert;

export type UserOrganisation = typeof userOrganisations.$inferSelect;
export type InsertUserOrganisation = typeof userOrganisations.$inferInsert;

// Schemas
export const insertOrganisationSchema = createInsertSchema(organisations);
export const insertCaseSubmissionSchema = createInsertSchema(caseSubmissions).extend({
  debtorType: z.enum(['individual', 'company', 'sole_trader', 'company_and_individual']).default('individual'),
}).omit({ 
  id: true, 
  submittedAt: true, 
  processedAt: true, 
  processedBy: true 
});
export const insertCaseSchema = createInsertSchema(cases).extend({
  debtorType: z.enum(['individual', 'company', 'sole_trader', 'company_and_individual']).default('individual'),
});
export const insertCaseActivitySchema = createInsertSchema(caseActivities);
export const insertMessageSchema = createInsertSchema(messages);
export const insertDocumentSchema = createInsertSchema(documents);
export const insertPaymentSchema = createInsertSchema(payments);
export const insertExternalApiCredentialSchema = createInsertSchema(externalApiCredentials);

// User management schemas
export const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  organisationId: z.number().optional(),
  isAdmin: z.boolean().default(false),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Organization management schemas
export const createOrganisationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
});

export const updateOrganisationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
});
