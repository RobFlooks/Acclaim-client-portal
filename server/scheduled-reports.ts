import ExcelJS from "exceljs";
import { storage } from "./storage";
import { sendScheduledReportEmailWithAttachment } from "./email-service-sendgrid";

export interface ScheduledReportSettings {
  id: number;
  userId: string;
  enabled: boolean | null;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: number | null;
  includeCaseSummary: boolean | null;
  includeActivityReport: boolean | null;
  caseStatusFilter: string | null;
  lastSentAt: Date | null;
}

export async function generateScheduledReport(
  userId: string,
  settings: ScheduledReportSettings
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Acclaim Credit Management";
  workbook.created = new Date();

  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");

  // Get user's restricted case IDs to filter them out
  const restrictedCaseIds = await storage.getBlockedCasesForUser(userId);

  let cases = await storage.getCasesForUser(userId);
  
  // Filter out restricted cases
  if (restrictedCaseIds.length > 0) {
    cases = cases.filter((c: any) => !restrictedCaseIds.includes(c.id));
  }
  
  // Apply status filter
  if (settings.caseStatusFilter === "active") {
    cases = cases.filter((c: any) => c.status !== "closed" && c.status !== "resolved");
  } else if (settings.caseStatusFilter === "closed") {
    cases = cases.filter((c: any) => c.status === "closed" || c.status === "resolved");
  }

  if (settings.includeCaseSummary) {
    addCaseSummarySheet(workbook, cases);
  }

  if (settings.includeActivityReport) {
    const messages = await getRecentMessages(userId, settings.frequency);
    addMessagesSheet(workbook, messages, settings.frequency);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function addCaseSummarySheet(workbook: ExcelJS.Workbook, cases: any[]) {
  const sheet = workbook.addWorksheet("Case Summary");

  sheet.columns = [
    { header: "Case Name", key: "caseName", width: 28 },
    { header: "Account Number", key: "accountNumber", width: 18 },
    { header: "Debtor Type", key: "debtorType", width: 14 },
    { header: "Debtor Name", key: "debtorName", width: 24 },
    { header: "Status", key: "status", width: 14 },
    { header: "Stage", key: "stage", width: 18 },
    { header: "Original Amount", key: "originalAmount", width: 16 },
    { header: "Current Balance", key: "currentBalance", width: 16 },
    { header: "Organisation", key: "organisationName", width: 22 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0D9488" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 22;

  if (cases.length === 0) {
    const emptyRow = sheet.addRow({
      caseName: "No cases found matching the selected filter",
      accountNumber: "",
      debtorType: "",
      debtorName: "",
      status: "",
      stage: "",
      originalAmount: "",
      currentBalance: "",
      organisationName: "",
    });
    emptyRow.font = { italic: true, color: { argb: "FF666666" } };
  } else {
    cases.forEach((c, index) => {
      const row = sheet.addRow({
        caseName: c.caseName || "",
        accountNumber: c.accountNumber || "",
        debtorType: c.debtorType || "",
        debtorName: c.debtorName || "",
        status: formatStatus(c.status),
        stage: formatStage(c.stage),
        originalAmount: formatCurrency(c.originalAmount),
        currentBalance: formatCurrency(c.currentBalance),
        organisationName: c.organisationName || "",
      });
      
      // Alternate row colours for readability
      if (index % 2 === 1) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F5F5" },
        };
      }
    });
  }

  // Enable autofilter for all columns
  sheet.autoFilter = {
    from: "A1",
    to: "I1",
  };
  
  // Freeze the header row
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

async function getRecentMessages(userId: string, frequency: string): Promise<any[]> {
  const messages: any[] = [];
  const now = new Date();
  const cutoffDate = new Date();
  
  if (frequency === "daily") {
    // For daily reports, get messages from the last 24 hours
    cutoffDate.setDate(now.getDate() - 1);
  } else if (frequency === "weekly") {
    cutoffDate.setDate(now.getDate() - 7);
  } else {
    // Monthly
    cutoffDate.setMonth(now.getMonth() - 1);
  }

  // Get all messages for the user's organisations (already filters by case restrictions)
  const allMessages = await storage.getMessagesForUser(userId);
  
  const filteredMessages = allMessages.filter((m: any) => {
    const messageDate = new Date(m.createdAt);
    return messageDate >= cutoffDate;
  });

  for (const message of filteredMessages) {
    messages.push({
      caseId: message.caseId,
      caseName: message.caseName || (message.caseId ? "Unknown Case" : "General Message"),
      accountNumber: message.accountNumber || "",
      subject: message.subject || "",
      senderName: message.senderName || "Unknown",
      content: message.content,
      createdAt: message.createdAt,
      hasAttachment: !!message.attachmentFileName,
    });
  }

  messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return messages;
}

function addMessagesSheet(workbook: ExcelJS.Workbook, messages: any[], frequency: string) {
  const sheet = workbook.addWorksheet("Messages Report");

  sheet.columns = [
    { header: "Date & Time", key: "date", width: 20 },
    { header: "Case Name", key: "caseName", width: 28 },
    { header: "Account Number", key: "accountNumber", width: 18 },
    { header: "Subject", key: "subject", width: 35 },
    { header: "From", key: "senderName", width: 18 },
    { header: "Message", key: "content", width: 50 },
    { header: "Attachment", key: "hasAttachment", width: 12 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0D9488" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 22;

  if (messages.length === 0) {
    const periodText = frequency === "daily" ? "the last 24 hours" : frequency === "weekly" ? "the last 7 days" : "the last month";
    const emptyRow = sheet.addRow({
      date: "",
      caseName: `No messages received in ${periodText}`,
      accountNumber: "",
      subject: "",
      senderName: "",
      content: "",
      hasAttachment: "",
    });
    emptyRow.font = { italic: true, color: { argb: "FF666666" } };
  } else {
    messages.forEach((m, index) => {
      const row = sheet.addRow({
        date: formatDate(m.createdAt),
        caseName: m.caseName || "",
        accountNumber: m.accountNumber || "",
        subject: m.subject || "",
        senderName: m.senderName || "",
        content: truncateMessage(m.content, 200),
        hasAttachment: m.hasAttachment ? "Yes" : "",
      });
      
      // Alternate row colours for readability
      if (index % 2 === 1) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F5F5" },
        };
      }
      row.alignment = { vertical: "top", wrapText: true };
    });
  }

  // Enable autofilter for all columns
  sheet.autoFilter = {
    from: "A1",
    to: "G1",
  };
  
  // Freeze the header row
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function truncateMessage(content: string, maxLength: number): string {
  if (!content) return "";
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "...";
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    new: "New",
    open: "Open",
    in_progress: "In Progress",
    pending: "Pending",
    closed: "Closed",
    resolved: "Resolved",
  };
  return statusMap[status] || status;
}

function formatStage(stage: string): string {
  const stageMap: Record<string, string> = {
    pre_legal: "Pre-Legal",
    letter_before_action: "Letter Before Action",
    legal_proceedings: "Legal Proceedings",
    enforcement: "Enforcement",
    payment_plan: "Payment Plan",
    settled: "Settled",
    written_off: "Written Off",
  };
  return stageMap[stage] || stage;
}

function formatCurrency(amount: string | null): string {
  if (!amount) return "";
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(num);
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActivityType(type: string): string {
  const typeMap: Record<string, string> = {
    message_sent: "Message Sent",
    message_received: "Message Received",
    document_uploaded: "Document Uploaded",
    payment_received: "Payment Received",
    note_added: "Note Added",
    case_updated: "Case Updated",
  };
  return typeMap[type] || type;
}

export async function processScheduledReports(): Promise<void> {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  const currentDayOfMonth = now.getDate();
  
  console.log(`Processing scheduled reports at ${now.toISOString()} - Hour: ${currentHour}, Day: ${currentDay}, DayOfMonth: ${currentDayOfMonth}`);
  
  const allSettings = await storage.getScheduledReportsDue();
  console.log(`Found ${allSettings.length} scheduled report settings to check`);
  
  for (const settings of allSettings) {
    console.log(`Checking report for user ${settings.userId}: enabled=${settings.enabled}, frequency=${settings.frequency}, timeOfDay=${settings.timeOfDay}, lastSent=${settings.lastSentAt}`);
    
    if (!settings.enabled) {
      console.log(`  Skipping - not enabled`);
      continue;
    }

    const targetHour = settings.timeOfDay ?? 9;
    if (currentHour !== targetHour) {
      console.log(`  Skipping - wrong hour (current: ${currentHour}, target: ${targetHour})`);
      continue;
    }

    if (settings.frequency === "weekly" && currentDay !== (settings.dayOfWeek ?? 1)) continue;
    if (settings.frequency === "monthly" && currentDayOfMonth !== (settings.dayOfMonth ?? 1)) continue;

    const lastSent = settings.lastSentAt ? new Date(settings.lastSentAt) : null;
    if (lastSent) {
      const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
      if (settings.frequency === "daily" && hoursSinceLastSent < 20) continue;
      if (settings.frequency === "weekly" && hoursSinceLastSent < 160) continue;
      if (settings.frequency === "monthly" && hoursSinceLastSent < 600) continue;
    }

    try {
      const user = await storage.getUser(settings.userId);
      if (!user || !user.email) continue;

      const reportBuffer = await generateScheduledReport(settings.userId, settings as ScheduledReportSettings);
      
      const frequencyText = settings.frequency === "daily" ? "Daily" : settings.frequency === "weekly" ? "Weekly" : "Monthly";
      const fileName = `Acclaim_${frequencyText}_Report_${now.toISOString().split("T")[0]}.xlsx`;

      await sendScheduledReportEmailWithAttachment(
        user.email,
        `${user.firstName} ${user.lastName}`,
        frequencyText,
        reportBuffer,
        fileName
      );

      await storage.updateScheduledReportLastSent(settings.userId);

      console.log(`Sent scheduled report to ${user.email}`);
    } catch (error) {
      console.error(`Failed to send scheduled report for user ${settings.userId}:`, error);
    }
  }
}

function calculateNextSendDate(settings: any): Date {
  const now = new Date();
  const next = new Date();

  if (settings.frequency === "weekly") {
    const daysUntilNext = (settings.dayOfWeek - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + daysUntilNext);
  } else {
    next.setMonth(now.getMonth() + 1);
    next.setDate(settings.dayOfMonth || 1);
  }

  next.setHours(9, 0, 0, 0);
  return next;
}

export function scheduleReportProcessor(): void {
  // Run immediately on startup
  setTimeout(async () => {
    console.log("Running initial scheduled report check...");
    try {
      await processScheduledReports();
    } catch (error) {
      console.error("Error processing scheduled reports on startup:", error);
    }
  }, 5000); // Wait 5 seconds for server to fully initialize

  // Then run every hour
  setInterval(async () => {
    console.log("Running hourly scheduled report check...");
    try {
      await processScheduledReports();
    } catch (error) {
      console.error("Error processing scheduled reports:", error);
    }
  }, 60 * 60 * 1000);

  console.log("Scheduled report processor started (runs hourly)");
}
