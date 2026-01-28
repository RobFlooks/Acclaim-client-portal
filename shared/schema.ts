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
  isSuperAdmin: boolean("is_super_admin").default(false),
  phone: varchar("phone"),
  hashedPassword: varchar("hashed_password"),
  tempPassword: varchar("temp_password"),
  mustChangePassword: boolean("must_change_password").default(false),
  externalRef: varchar("external_ref", { length: 100 }).unique(), // For external system integration
  azureId: varchar("azure_id", { length: 255 }).unique(), // Azure Entra External ID
  emailNotifications: boolean("email_notifications").default(true), // User preference for email notifications (messages)
  documentNotifications: boolean("document_notifications").default(true), // User preference for document upload notifications
  pushNotifications: boolean("push_notifications").default(true), // User preference for push notifications
  loginNotifications: boolean("login_notifications").default(true), // User preference for login alert emails
  canSubmitCases: boolean("can_submit_cases").default(true), // Admin-controlled permission to submit new cases
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
  scheduledReportsEnabled: boolean("scheduled_reports_enabled").notNull().default(true), // Admin can disable scheduled reports for this organisation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Organisation junction table for many-to-many relationships
export const userOrganisations = pgTable("user_organisations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  organisationId: integer("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull().default("member"), // 'member' or 'owner'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_organisations_user_id").on(table.userId),
  index("idx_user_organisations_org_id").on(table.organisationId),
]);

// Muted cases - allows users to mute notifications for specific cases
export const mutedCases = pgTable("muted_cases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  caseId: integer("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_muted_cases_user_id").on(table.userId),
  index("idx_muted_cases_case_id").on(table.caseId),
]);

// Scheduled reports preferences - allows users to receive periodic email reports
// Supports multiple schedules per user: per-org schedules (organisationId set) or combined reports (organisationId null)
// Also supports org-level reports with custom recipient email (for sending to external contacts)
export const scheduledReports = pgTable("scheduled_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  organisationId: integer("organisation_id").references(() => organisations.id, { onDelete: "cascade" }), // For per-org schedules. null = combined report
  enabled: boolean("enabled").default(false),
  frequency: varchar("frequency", { length: 20 }).notNull().default("weekly"), // 'daily', 'weekly' or 'monthly'
  dayOfWeek: integer("day_of_week"), // 0-6 for weekly (0 = Sunday)
  dayOfMonth: integer("day_of_month"), // 1-28 for monthly
  timeOfDay: integer("time_of_day").default(9), // Hour of day to send (0-23), default 9am
  includeCaseSummary: boolean("include_case_summary").default(true),
  includeActivityReport: boolean("include_activity_report").default(true),
  organisationIds: jsonb("organisation_ids").$type<number[]>(), // For combined reports: array of org IDs to include, null = all user's orgs
  caseStatusFilter: varchar("case_status_filter", { length: 20 }).default("active"), // 'active', 'all', 'closed'
  recipientEmail: varchar("recipient_email", { length: 255 }), // Optional: send to this email instead of user's email (for org-level reports)
  recipientName: varchar("recipient_name", { length: 255 }), // Optional: name for email greeting when using recipientEmail
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_scheduled_reports_user_id").on(table.userId),
  index("idx_scheduled_reports_org_id").on(table.organisationId),
]);

// Case access restrictions - allows admins to hide cases from specific users
export const caseAccessRestrictions = pgTable("case_access_restrictions", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  blockedUserId: varchar("blocked_user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id), // Admin who created the restriction
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_case_access_restrictions_case_id").on(table.caseId),
  index("idx_case_access_restrictions_user_id").on(table.blockedUserId),
]);

// Case submissions table (for capturing submissions before they become actual cases)
export const caseSubmissions = pgTable("case_submissions", {
  id: serial("id").primaryKey(),
  submittedBy: varchar("submitted_by", { length: 255 }).notNull().references(() => users.id),
  
  // Client details (person who submitted)
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 50 }),
  
  // Case identification
  caseName: varchar("case_name", { length: 255 }).notNull(),
  
  // Debtor type and details
  debtorType: varchar("debtor_type", { length: 50 }).notNull().default("individual"), // 'individual', 'organisation'
  
  // Individual/Sole Trader specific fields
  individualType: varchar("individual_type", { length: 50 }), // 'individual', 'business'
  tradingName: varchar("trading_name", { length: 255 }),
  
  // Organisation specific fields
  organisationName: varchar("organisation_name", { length: 255 }),
  organisationTradingName: varchar("organisation_trading_name", { length: 255 }),
  companyNumber: varchar("company_number", { length: 50 }),
  
  // Principal of Business details (for Individual/Sole Trader)
  principalSalutation: varchar("principal_salutation", { length: 20 }),
  principalFirstName: varchar("principal_first_name", { length: 100 }),
  principalLastName: varchar("principal_last_name", { length: 100 }),
  
  // Address details
  addressLine1: varchar("address_line_1", { length: 255 }),
  addressLine2: varchar("address_line_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  county: varchar("county", { length: 100 }),
  postcode: varchar("postcode", { length: 20 }),
  
  // Contact details
  mainPhone: varchar("main_phone", { length: 50 }),
  altPhone: varchar("alt_phone", { length: 50 }),
  mainEmail: varchar("main_email", { length: 255 }),
  altEmail: varchar("alt_email", { length: 255 }),
  
  // Debt details
  debtDetails: text("debt_details"),
  totalDebtAmount: decimal("total_debt_amount", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("GBP"),
  
  // Payment terms
  paymentTermsType: varchar("payment_terms_type", { length: 50 }), // 'days_from_invoice', 'days_from_month_end', 'other'
  paymentTermsDays: integer("payment_terms_days"),
  paymentTermsOther: text("payment_terms_other"),
  
  // Invoice details
  singleInvoice: varchar("single_invoice", { length: 10 }), // 'yes', 'no'
  firstOverdueDate: varchar("first_overdue_date", { length: 20 }),
  lastOverdueDate: varchar("last_overdue_date", { length: 20 }),
  
  // Additional information
  additionalInfo: text("additional_info"),
  
  // System fields
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending', 'processed', 'rejected'
  organisationId: integer("organisation_id").notNull().references(() => organisations.id),
  submittedAt: timestamp("submitted_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by", { length: 255 }).references(() => users.id),
});

// Case submission documents table
export const caseSubmissionDocuments = pgTable("case_submission_documents", {
  id: serial("id").primaryKey(),
  caseSubmissionId: integer("case_submission_id").notNull().references(() => caseSubmissions.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
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

// Documents table (caseId is optional - documents can be general or case-specific)
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => cases.id),
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

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  hashedToken: varchar("hashed_token", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_password_reset_tokens_user_id").on(table.userId),
  index("idx_password_reset_tokens_expires_at").on(table.expiresAt),
]);

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
  hashedPassword: varchar("password_hash", { length: 255 }).notNull(),
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

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// Schemas
export const insertOrganisationSchema = createInsertSchema(organisations);
export const insertCaseSubmissionSchema = createInsertSchema(caseSubmissions).extend({
  debtorType: z.enum(['individual', 'organisation']).default('individual'),
  individualType: z.enum(['individual', 'business']).optional(),
  paymentTermsType: z.enum(['days_from_invoice', 'days_from_month_end', 'other']).optional(),
  singleInvoice: z.enum(['yes', 'no']).optional(),
  totalDebtAmount: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  paymentTermsDays: z.union([z.string(), z.number()]).transform((val) => Number(val)).optional(),
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

export const adminUpdateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phone: z.string().optional(),
  email: z.string().email("Valid email is required").optional(),
});

export const updateNotificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  documentNotifications: z.boolean().optional(),
  loginNotifications: z.boolean().optional(),
  pushNotifications: z.boolean(),
});

// Password complexity validation - must include uppercase, lowercase, numeric, and special character
const passwordComplexitySchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .refine((password) => /[A-Z]/.test(password), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((password) => /[a-z]/.test(password), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((password) => /[0-9]/.test(password), {
    message: "Password must contain at least one number",
  })
  .refine((password) => /[^A-Za-z0-9]/.test(password), {
    message: "Password must contain at least one special character",
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordComplexitySchema,
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  newPassword: passwordComplexitySchema,
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Organization management schemas
export const createOrganisationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  externalRef: z.string().optional(),
});

export const updateOrganisationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  externalRef: z.string().optional(),
});

// Scheduled reports schemas
export const insertScheduledReportSchema = createInsertSchema(scheduledReports).omit({ id: true, createdAt: true, updatedAt: true, lastSentAt: true });
export type InsertScheduledReport = z.infer<typeof insertScheduledReportSchema>;
export type ScheduledReport = typeof scheduledReports.$inferSelect;
