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

  let cases = await storage.getCasesForUser(userId);
  if (settings.caseStatusFilter === "active") {
    cases = cases.filter((c: any) => c.status !== "closed" && c.status !== "resolved");
  } else if (settings.caseStatusFilter === "closed") {
    cases = cases.filter((c: any) => c.status === "closed" || c.status === "resolved");
  }

  if (settings.includeCaseSummary) {
    addCaseSummarySheet(workbook, cases);
  }

  if (settings.includeActivityReport) {
    const activities = await getRecentActivities(cases, settings.frequency);
    addActivitySheet(workbook, activities);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function addCaseSummarySheet(workbook: ExcelJS.Workbook, cases: any[]) {
  const sheet = workbook.addWorksheet("Case Summary");

  sheet.columns = [
    { header: "Case Name", key: "caseName", width: 30 },
    { header: "Account Number", key: "accountNumber", width: 20 },
    { header: "Debtor Type", key: "debtorType", width: 15 },
    { header: "Debtor Name", key: "debtorName", width: 25 },
    { header: "Status", key: "status", width: 15 },
    { header: "Stage", key: "stage", width: 15 },
    { header: "Original Amount", key: "originalAmount", width: 18 },
    { header: "Current Balance", key: "currentBalance", width: 18 },
    { header: "Organisation", key: "organisationName", width: 25 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0D9488" },
  };

  cases.forEach((c) => {
    sheet.addRow({
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
  });

  sheet.autoFilter = {
    from: "A1",
    to: "I1",
  };
}

async function getRecentActivities(cases: any[], frequency: string): Promise<any[]> {
  const activities: any[] = [];
  const now = new Date();
  const cutoffDate = new Date();
  
  if (frequency === "weekly") {
    cutoffDate.setDate(now.getDate() - 7);
  } else {
    cutoffDate.setMonth(now.getMonth() - 1);
  }

  for (const caseItem of cases) {
    const caseActivities = await storage.getCaseActivities(caseItem.id);
    const filteredActivities = caseActivities.filter((a: any) => {
      const activityDate = new Date(a.createdAt);
      const isRecent = activityDate >= cutoffDate;
      const isNotStatusChange = a.type !== "status_change";
      return isRecent && isNotStatusChange;
    });

    filteredActivities.forEach((a: any) => {
      activities.push({
        caseId: caseItem.id,
        caseName: caseItem.caseName,
        accountNumber: caseItem.accountNumber,
        type: a.type,
        description: a.description,
        createdAt: a.createdAt,
      });
    });
  }

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return activities;
}

function addActivitySheet(workbook: ExcelJS.Workbook, activities: any[]) {
  const sheet = workbook.addWorksheet("Activity Report");

  sheet.columns = [
    { header: "Date", key: "date", width: 18 },
    { header: "Case Name", key: "caseName", width: 30 },
    { header: "Account Number", key: "accountNumber", width: 20 },
    { header: "Activity Type", key: "type", width: 18 },
    { header: "Description", key: "description", width: 50 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0D9488" },
  };

  activities.forEach((a) => {
    sheet.addRow({
      date: formatDate(a.createdAt),
      caseName: a.caseName || "",
      accountNumber: a.accountNumber || "",
      type: formatActivityType(a.type),
      description: a.description || "",
    });
  });

  sheet.autoFilter = {
    from: "A1",
    to: "E1",
  };
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
  const allSettings = await storage.getScheduledReportsDue();
  
  for (const settings of allSettings) {
    if (!settings.enabled) continue;

    try {
      const user = await storage.getUser(settings.userId);
      if (!user || !user.email) continue;

      const reportBuffer = await generateScheduledReport(settings.userId, settings as ScheduledReportSettings);
      
      const frequencyText = settings.frequency === "weekly" ? "Weekly" : "Monthly";
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
  setInterval(async () => {
    try {
      await processScheduledReports();
    } catch (error) {
      console.error("Error processing scheduled reports:", error);
    }
  }, 60 * 60 * 1000);

  console.log("Scheduled report processor started (runs hourly)");
}
