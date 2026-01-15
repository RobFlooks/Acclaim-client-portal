import ExcelJS from "exceljs";
import puppeteer from "puppeteer";
import { storage } from "./storage";
import { sendScheduledReportEmailWithAttachments } from "./email-service-sendgrid";

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

export interface ReportBuffers {
  excel: Buffer;
  pdf: Buffer;
}

export async function generateScheduledReport(
  userId: string,
  settings: ScheduledReportSettings
): Promise<ReportBuffers> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Acclaim Credit Management";
  workbook.created = new Date();

  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");

  // Get user's admin-restricted case IDs to filter them out
  // Note: User-muted cases should STILL appear in reports (they only mute notifications)
  const restrictedCaseIds = await storage.getAdminRestrictedCasesForUser(userId);

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

  // Get messages for reports
  let messages: any[] = [];
  if (settings.includeActivityReport) {
    messages = await getRecentMessages(userId, settings.frequency);
  }

  // Generate Excel
  if (settings.includeCaseSummary) {
    addCaseSummarySheet(workbook, cases);
  }

  if (settings.includeActivityReport) {
    addMessagesSheet(workbook, messages, settings.frequency);
  }

  const excelBuffer = await workbook.xlsx.writeBuffer();

  // Generate PDF
  const pdfBuffer = await generatePdfReport(cases, messages, settings, user);

  return {
    excel: Buffer.from(excelBuffer),
    pdf: pdfBuffer
  };
}

async function generatePdfReport(
  cases: any[],
  messages: any[],
  settings: ScheduledReportSettings,
  user: any
): Promise<Buffer> {
  const currentDate = new Date().toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  const frequencyText = settings.frequency === "daily" ? "Daily" : 
                        settings.frequency === "weekly" ? "Weekly" : "Monthly";

  // Build case summary rows
  let caseSummaryRows = '';
  let totalOriginal = 0, totalPayments = 0, totalOutstanding = 0;
  
  cases.forEach((c: any) => {
    const original = parseFloat(c.originalAmount || "0");
    const payments = parseFloat(c.totalPayments || "0");
    const outstanding = parseFloat(c.outstandingAmount || "0");
    totalOriginal += original;
    totalPayments += payments;
    totalOutstanding += outstanding;
    
    caseSummaryRows += `
      <tr>
        <td>${c.accountNumber || ''}</td>
        <td>${c.caseName || ''}</td>
        <td><span class="status-${c.status}">${formatStatus(c.status)}</span></td>
        <td>${formatStage(c.stage)}</td>
        <td class="currency">${formatCurrency(c.originalAmount)}</td>
        <td class="currency">${formatCurrency(c.totalPayments)}</td>
        <td class="currency">${formatCurrency(c.outstandingAmount)}</td>
      </tr>
    `;
  });

  // Build messages rows
  let messagesRows = '';
  messages.forEach((m: any) => {
    messagesRows += `
      <tr>
        <td>${formatDate(m.createdAt)}</td>
        <td>${m.caseName || 'General'}</td>
        <td>${m.senderName || ''}</td>
        <td>${m.subject || ''}</td>
        <td>${truncateMessage(m.content, 100)}</td>
      </tr>
    `;
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 10px; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); color: white; border-radius: 8px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 8px 0 0 0; opacity: 0.9; }
        .section { margin-bottom: 30px; }
        .section h2 { font-size: 16px; margin-bottom: 15px; color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 5px; }
        .stats-grid { display: flex; gap: 15px; margin-bottom: 20px; }
        .stat-card { flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #f9fafb; }
        .stat-label { font-size: 11px; color: #666; margin-bottom: 5px; }
        .stat-value { font-size: 18px; font-weight: bold; color: #0d9488; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 9px; }
        th { background-color: #0d9488; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .currency { text-align: right; }
        .status-active, .status-open, .status-in_progress { background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 8px; }
        .status-closed, .status-resolved { background-color: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 3px; font-size: 8px; }
        .status-new { background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 3px; font-size: 8px; }
        .totals-row { font-weight: bold; background-color: #e5e7eb !important; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 9px; }
        .no-data { color: #666; font-style: italic; padding: 20px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${frequencyText} Report</h1>
        <p>${currentDate}</p>
      </div>
      
      ${settings.includeCaseSummary ? `
        <div class="section">
          <h2>Case Summary</h2>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Cases</div>
              <div class="stat-value">${cases.length}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Original Amount</div>
              <div class="stat-value">${formatCurrency(totalOriginal.toString())}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Total Payments</div>
              <div class="stat-value">${formatCurrency(totalPayments.toString())}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Outstanding</div>
              <div class="stat-value">${formatCurrency(totalOutstanding.toString())}</div>
            </div>
          </div>
          
          ${cases.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Account No.</th>
                  <th>Case Name</th>
                  <th>Status</th>
                  <th>Stage</th>
                  <th class="currency">Original</th>
                  <th class="currency">Payments</th>
                  <th class="currency">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                ${caseSummaryRows}
                <tr class="totals-row">
                  <td colspan="4">TOTALS</td>
                  <td class="currency">${formatCurrency(totalOriginal.toString())}</td>
                  <td class="currency">${formatCurrency(totalPayments.toString())}</td>
                  <td class="currency">${formatCurrency(totalOutstanding.toString())}</td>
                </tr>
              </tbody>
            </table>
          ` : '<div class="no-data">No cases found matching the selected filter</div>'}
        </div>
      ` : ''}
      
      ${settings.includeActivityReport ? `
        <div class="section">
          <h2>Messages Report</h2>
          ${messages.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Case</th>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                ${messagesRows}
              </tbody>
            </table>
          ` : `<div class="no-data">No messages in the ${settings.frequency === "daily" ? "last 24 hours" : settings.frequency === "weekly" ? "last 7 days" : "last month"}</div>`}
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Generated by Acclaim Credit Management Portal</p>
      </div>
    </body>
    </html>
  `;

  // Generate PDF using puppeteer with system chromium
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

function addCaseSummarySheet(workbook: ExcelJS.Workbook, cases: any[]) {
  const sheet = workbook.addWorksheet("Case Summary");

  // Match columns from manual Case Summary Report export
  sheet.columns = [
    { header: "Account Number", key: "accountNumber", width: 15 },
    { header: "Case Name", key: "caseName", width: 25 },
    { header: "Status", key: "status", width: 12 },
    { header: "Stage", key: "stage", width: 15 },
    { header: "Original Amount", key: "originalAmount", width: 15 },
    { header: "Costs Added", key: "costsAdded", width: 12 },
    { header: "Interest Added", key: "interestAdded", width: 12 },
    { header: "Fees Added", key: "feesAdded", width: 12 },
    { header: "Total Additional Charges", key: "totalAdditionalCharges", width: 18 },
    { header: "Total Debt", key: "totalDebt", width: 15 },
    { header: "Total Payments", key: "totalPayments", width: 15 },
    { header: "Outstanding Amount", key: "outstandingAmount", width: 18 },
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
      accountNumber: "No cases found matching the selected filter",
      caseName: "",
      status: "",
      stage: "",
      originalAmount: "",
      costsAdded: "",
      interestAdded: "",
      feesAdded: "",
      totalAdditionalCharges: "",
      totalDebt: "",
      totalPayments: "",
      outstandingAmount: "",
    });
    emptyRow.font = { italic: true, color: { argb: "FF666666" } };
  } else {
    cases.forEach((c, index) => {
      const originalAmount = parseFloat(c.originalAmount || "0");
      const costsAdded = parseFloat(c.costsAdded || "0");
      const interestAdded = parseFloat(c.interestAdded || "0");
      const feesAdded = parseFloat(c.feesAdded || "0");
      const totalAdditionalCharges = costsAdded + interestAdded + feesAdded;
      const totalDebt = originalAmount + totalAdditionalCharges;
      const totalPayments = parseFloat(c.totalPayments || "0");
      const outstandingAmount = parseFloat(c.outstandingAmount || "0");

      const row = sheet.addRow({
        accountNumber: c.accountNumber || "",
        caseName: c.organisationName ? `${c.caseName} (${c.organisationName})` : c.caseName || "",
        status: formatStatus(c.status),
        stage: formatStage(c.stage),
        originalAmount: formatCurrency(c.originalAmount),
        costsAdded: formatCurrency(c.costsAdded),
        interestAdded: formatCurrency(c.interestAdded),
        feesAdded: formatCurrency(c.feesAdded),
        totalAdditionalCharges: formatCurrency(totalAdditionalCharges.toString()),
        totalDebt: formatCurrency(totalDebt.toString()),
        totalPayments: formatCurrency(c.totalPayments),
        outstandingAmount: formatCurrency(c.outstandingAmount),
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
    to: "L1",
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
    // If sender is admin, show "Acclaim" instead of their name
    const displayName = message.senderIsAdmin ? "Acclaim" : (message.senderName || "Unknown");
    
    // Include organisation in case name if available
    let caseNameDisplay = message.caseName || (message.caseId ? "Unknown Case" : "General Message");
    if (message.organisationName && message.caseId) {
      caseNameDisplay = `${message.caseName} (${message.organisationName})`;
    }
    
    messages.push({
      caseId: message.caseId,
      caseName: caseNameDisplay,
      accountNumber: message.accountNumber || "",
      subject: message.subject || "",
      senderName: displayName,
      content: message.content,
      createdAt: message.createdAt,
      hasAttachment: !!message.attachmentFileName,
      attachmentFileName: message.attachmentFileName || "",
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

      const reportBuffers = await generateScheduledReport(settings.userId, settings as ScheduledReportSettings);
      
      const frequencyText = settings.frequency === "daily" ? "Daily" : settings.frequency === "weekly" ? "Weekly" : "Monthly";
      const baseFileName = `Acclaim_${frequencyText}_Report_${now.toISOString().split("T")[0]}`;

      await sendScheduledReportEmailWithAttachments(
        user.email,
        `${user.firstName} ${user.lastName}`,
        frequencyText,
        reportBuffers.excel,
        reportBuffers.pdf,
        baseFileName
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
