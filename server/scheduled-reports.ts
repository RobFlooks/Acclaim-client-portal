import ExcelJS from "exceljs";
import { storage } from "./storage";
import { sendScheduledReportEmailWithAttachments } from "./email-service-sendgrid";
import type { InsertAuditLog } from "@shared/schema";

export interface ScheduledReportSettings {
  id: number;
  userId: string;
  organisationId: number | null; // For per-org schedules. null = combined report
  enabled: boolean | null;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: number | null;
  includeCaseSummary: boolean | null;
  includeActivityReport: boolean | null;
  organisationIds: number[] | null; // For combined reports: which orgs to include
  caseStatusFilter: string | null;
  recipientEmail: string | null; // Custom recipient email for org-level reports
  recipientName: string | null; // Custom recipient name for email greeting
  lastSentAt: Date | null;
}

export interface ReportBuffers {
  excel: Buffer;
  html: Buffer;
  messagesCount: number;
}

// Generate a report by report ID (for test send and processing)
export async function generateScheduledReportForId(reportId: number): Promise<void> {
  const report = await storage.getScheduledReportById(reportId);
  if (!report) throw new Error("Report not found");

  const user = await storage.getUser(report.userId);
  if (!user || !user.email) throw new Error("User not found or has no email");

  const reportBuffers = await generateScheduledReport(report.userId, report as ScheduledReportSettings);
  
  const now = new Date();
  const frequencyText = report.frequency === "daily" ? "Daily" : report.frequency === "weekly" ? "Weekly" : "Monthly";
  
  // Add organisation name to filename if this is a per-org report
  let baseFileName = `Acclaim_${frequencyText}_Report_${now.toISOString().split("T")[0]}`;
  if (report.organisationId) {
    const org = await storage.getOrganisation(report.organisationId);
    if (org) {
      const orgName = org.name.replace(/[^a-zA-Z0-9]/g, '_');
      baseFileName = `Acclaim_${orgName}_${frequencyText}_Report_${now.toISOString().split("T")[0]}`;
    }
  }

  // Use custom recipient email if available, otherwise use user's email
  const emailTo = report.recipientEmail || user.email;
  const recipientName = report.recipientName || `${user.firstName} ${user.lastName}`;

  await sendScheduledReportEmailWithAttachments(
    emailTo,
    recipientName,
    frequencyText,
    reportBuffers.excel,
    reportBuffers.html,
    baseFileName
  );
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

  // Get list of organisations with scheduled reports disabled
  const disabledOrgIds = await storage.getOrganisationsWithScheduledReportsDisabled();

  let cases = await storage.getCasesForUser(userId);
  
  // Filter out restricted cases
  if (restrictedCaseIds.length > 0) {
    cases = cases.filter((c: any) => !restrictedCaseIds.includes(c.id));
  }
  
  // Filter out cases from organisations with scheduled reports disabled
  if (disabledOrgIds.length > 0) {
    cases = cases.filter((c: any) => !disabledOrgIds.includes(c.organisationId));
  }

  // Filter by specific organisation if this is a per-org report
  if (settings.organisationId) {
    cases = cases.filter((c: any) => c.organisationId === settings.organisationId);
  } else if (settings.organisationIds && settings.organisationIds.length > 0) {
    // For combined reports with specific org selection
    cases = cases.filter((c: any) => settings.organisationIds!.includes(c.organisationId));
  }
  
  // Apply status filter
  if (settings.caseStatusFilter === "active") {
    cases = cases.filter((c: any) => c.status !== "closed" && c.status !== "resolved");
  } else if (settings.caseStatusFilter === "closed") {
    cases = cases.filter((c: any) => c.status === "closed" || c.status === "resolved");
  }

  // Get messages for reports, filtered by organisation if needed
  let messages: any[] = [];
  if (settings.includeActivityReport) {
    messages = await getRecentMessages(userId, settings.frequency, settings.organisationId, settings.organisationIds);
  }

  // Generate Excel
  if (settings.includeCaseSummary) {
    addCaseSummarySheet(workbook, cases);
  }

  if (settings.includeActivityReport) {
    addMessagesSheet(workbook, messages, settings.frequency);
  }

  const excelBuffer = await workbook.xlsx.writeBuffer();

  // Generate HTML report (replaces PDF for better compatibility)
  const htmlBuffer = generateHtmlReport(cases, messages, settings, user);

  return {
    excel: Buffer.from(excelBuffer),
    html: htmlBuffer,
    messagesCount: messages.length
  };
}

function generateHtmlReport(
  cases: any[],
  messages: any[],
  settings: ScheduledReportSettings,
  user: any
): Buffer {
  const currentDate = new Date().toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  const frequencyText = settings.frequency === "daily" ? "Daily" : 
                        settings.frequency === "weekly" ? "Weekly" : "Monthly";

  // Build case summary rows - match Excel columns exactly
  let caseSummaryRows = '';
  let totalOriginal = 0, totalCosts = 0, totalInterest = 0, totalFees = 0, totalAdditional = 0, totalDebt = 0, totalPayments = 0, totalOutstanding = 0;
  
  cases.forEach((c: any) => {
    const original = parseFloat(c.originalAmount || "0");
    const costs = parseFloat(c.costsAdded || "0");
    const interest = parseFloat(c.interestAdded || "0");
    const fees = parseFloat(c.feesAdded || "0");
    const additional = costs + interest + fees;
    const debt = original + additional;
    const payments = parseFloat(c.totalPayments || "0");
    const outstanding = parseFloat(c.outstandingAmount || "0");
    
    totalOriginal += original;
    totalCosts += costs;
    totalInterest += interest;
    totalFees += fees;
    totalAdditional += additional;
    totalDebt += debt;
    totalPayments += payments;
    totalOutstanding += outstanding;
    
    const caseNameHtml = c.organisationName 
      ? `${c.caseName || ''} <span class="org-name">(${c.organisationName})</span>` 
      : (c.caseName || '');
    
    caseSummaryRows += `
      <tr>
        <td>${c.accountNumber || ''}</td>
        <td>${caseNameHtml}</td>
        <td><span class="status-${c.status}">${formatStatus(c.status)}</span></td>
        <td>${formatStage(c.stage)}</td>
        <td class="currency">${formatCurrency(c.originalAmount)}</td>
        <td class="currency">${formatCurrency(c.costsAdded)}</td>
        <td class="currency">${formatCurrency(c.interestAdded)}</td>
        <td class="currency">${formatCurrency(c.feesAdded)}</td>
        <td class="currency">${formatCurrency(additional.toString())}</td>
        <td class="currency">${formatCurrency(debt.toString())}</td>
        <td class="currency">${formatCurrency(c.totalPayments)}</td>
        <td class="currency">${formatCurrency(c.outstandingAmount)}</td>
      </tr>
    `;
  });

  // Group messages by case for PDF
  const messagesByCase = new Map<string, { caseName: string; accountNumber: string; messages: any[] }>();
  messages.forEach((m: any) => {
    const caseKey = m.caseId ? String(m.caseId) : 'general';
    if (!messagesByCase.has(caseKey)) {
      messagesByCase.set(caseKey, {
        caseName: m.caseName || 'General Messages',
        accountNumber: m.accountNumber || '',
        messages: []
      });
    }
    messagesByCase.get(caseKey)!.messages.push(m);
  });

  // Build messages sections grouped by case
  let messagesSections = '';
  messagesByCase.forEach((caseData, caseKey) => {
    const caseHeader = caseData.accountNumber 
      ? `${caseData.caseName} (${caseData.accountNumber})`
      : caseData.caseName;
    
    let caseMessagesRows = '';
    caseData.messages.forEach((m: any) => {
      const sender = m.isAdminSender ? 'Acclaim' : (m.senderName || 'Unknown');
      caseMessagesRows += `
        <tr>
          <td>${formatDate(m.createdAt)}</td>
          <td>${m.subject || ''}</td>
          <td>${sender}</td>
          <td class="message-content">${m.content || ''}</td>
        </tr>
      `;
    });
    
    messagesSections += `
      <div class="case-messages">
        <h3 class="case-header">${caseHeader}</h3>
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Subject</th>
              <th>From</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            ${caseMessagesRows}
          </tbody>
        </table>
      </div>
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
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; color: #333; }
        .header p { margin: 5px 0 0 0; color: #666; }
        .section { margin-bottom: 30px; }
        .section h2 { font-size: 18px; margin-bottom: 15px; color: #333; }
        .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px; margin-bottom: 20px; }
        .stat-card { padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .stat-label { font-size: 12px; color: #666; margin-bottom: 5px; }
        .stat-value { font-size: 18px; font-weight: bold; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; font-size: 9px; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .currency { text-align: right; }
        .org-name { color: #0d9488; font-size: 9px; }
        .status-active, .status-open, .status-in_progress { background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 8px; }
        .status-closed, .status-resolved, .status-Closed { background-color: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 3px; font-size: 8px; }
        .status-new { background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 3px; font-size: 8px; }
        .totals-row { font-weight: bold; background-color: #e5e7eb !important; }
        .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
        .no-data { color: #666; font-style: italic; padding: 20px; text-align: center; }
        .message-content { white-space: pre-wrap; word-wrap: break-word; max-width: 400px; }
        .case-messages { margin-bottom: 20px; }
        .case-header { font-size: 14px; color: #0d9488; margin: 15px 0 8px 0; padding-bottom: 5px; border-bottom: 2px solid #0d9488; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${frequencyText} Report</h1>
        <p>Generated on: ${currentDate}</p>
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
                  <th>Account Number</th>
                  <th>Case Name</th>
                  <th>Status</th>
                  <th>Stage</th>
                  <th class="currency">Original Amount</th>
                  <th class="currency">Costs Added</th>
                  <th class="currency">Interest Added</th>
                  <th class="currency">Fees Added</th>
                  <th class="currency">Total Additional</th>
                  <th class="currency">Total Debt</th>
                  <th class="currency">Total Payments</th>
                  <th class="currency">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                ${caseSummaryRows}
                <tr class="totals-row">
                  <td colspan="4">TOTALS</td>
                  <td class="currency">${formatCurrency(totalOriginal.toString())}</td>
                  <td class="currency">${formatCurrency(totalCosts.toString())}</td>
                  <td class="currency">${formatCurrency(totalInterest.toString())}</td>
                  <td class="currency">${formatCurrency(totalFees.toString())}</td>
                  <td class="currency">${formatCurrency(totalAdditional.toString())}</td>
                  <td class="currency">${formatCurrency(totalDebt.toString())}</td>
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
          ${messages.length > 0 ? messagesSections : `<div class="no-data">No messages in the ${settings.frequency === "daily" ? "last 24 hours" : settings.frequency === "weekly" ? "last 7 days" : "last month"}</div>`}
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Generated by Acclaim Credit Management Portal</p>
      </div>
    </body>
    </html>
  `;

  // Return HTML content as Buffer (works on all environments without browser dependencies)
  return Buffer.from(htmlContent, 'utf-8');
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

async function getRecentMessages(
  userId: string, 
  frequency: string, 
  organisationId?: number | null, 
  organisationIds?: number[] | null
): Promise<any[]> {
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

  // Get list of organisations with scheduled reports disabled
  const disabledOrgIds = await storage.getOrganisationsWithScheduledReportsDisabled();

  // Get all messages for the user's organisations (already filters by case restrictions)
  const allMessages = await storage.getMessagesForUser(userId);
  
  const filteredMessages = allMessages.filter((m: any) => {
    // Only include admin messages linked to cases (exclude user messages and messages not linked to a case)
    if (!m.senderIsAdmin) return false;
    if (!m.caseId) return false;
    
    const messageDate = new Date(m.createdAt);
    // Filter by date and exclude messages from disabled organisations
    if (messageDate < cutoffDate) return false;
    // Note: caseOrganisationId is the field returned by getMessagesForUser
    const msgOrgId = m.caseOrganisationId || m.organisationId;
    if (disabledOrgIds.length > 0 && msgOrgId && disabledOrgIds.includes(msgOrgId)) return false;
    
    // Filter by specific organisation if this is a per-org report
    if (organisationId && msgOrgId !== organisationId) return false;
    
    // Filter by selected organisations if this is a combined report with specific orgs
    if (organisationIds && organisationIds.length > 0 && msgOrgId && !organisationIds.includes(msgOrgId)) return false;
    
    return true;
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
    to: "F1",
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
      
      const frequencyLabel = settings.frequency === "daily" ? "Daily" : settings.frequency === "weekly" ? "Weekly" : "Monthly";
      
      // Skip users who haven't logged in for the first time (still have temporary password)
      if (user.mustChangePassword) {
        console.log(`  Skipping - user ${user.email} has not completed first login`);
        await storage.logAuditEvent({
          tableName: 'scheduled_reports',
          recordId: String(settings.id),
          operation: 'SKIP',
          userId: settings.userId,
          userEmail: user.email,
          description: `${frequencyLabel} report skipped - user has not completed first login`,
          newValue: JSON.stringify({ reason: 'user_not_activated', recipient: user.email }),
        });
        continue;
      }

      // Check if user's organisations have scheduled reports enabled
      const userOrgs = await storage.getUserOrganisations(settings.userId);
      const disabledOrgIds = await storage.getOrganisationsWithScheduledReportsDisabled();
      const allOrgsDisabled = userOrgs.every(org => disabledOrgIds.includes(org.id));
      
      if (allOrgsDisabled) {
        console.log(`  Skipping - scheduled reports disabled for all user's organisations`);
        await storage.logAuditEvent({
          tableName: 'scheduled_reports',
          recordId: String(settings.id),
          operation: 'SKIP',
          userId: settings.userId,
          userEmail: user.email,
          description: `${frequencyLabel} report skipped - scheduled reports disabled for all user's organisations`,
          newValue: JSON.stringify({ reason: 'organisations_disabled', recipient: user.email }),
        });
        continue;
      }

      const reportBuffers = await generateScheduledReport(settings.userId, settings as ScheduledReportSettings);
      
      // Skip daily reports that include messages if there are no messages to report
      if (settings.frequency === "daily" && settings.includeActivityReport && reportBuffers.messagesCount === 0) {
        console.log(`  Skipping daily report - no messages to include`);
        await storage.logAuditEvent({
          tableName: 'scheduled_reports',
          recordId: String(settings.id),
          operation: 'SKIP',
          userId: settings.userId,
          userEmail: user.email,
          description: `${frequencyLabel} report skipped - no new messages to include`,
          newValue: JSON.stringify({ reason: 'no_messages', recipient: user.email }),
        });
        continue;
      }
      
      const frequencyText = settings.frequency === "daily" ? "Daily" : settings.frequency === "weekly" ? "Weekly" : "Monthly";
      
      // Add organisation name to filename if this is a per-org report
      let baseFileName = `Acclaim_${frequencyText}_Report_${now.toISOString().split("T")[0]}`;
      if (settings.organisationId) {
        const org = await storage.getOrganisation(settings.organisationId);
        if (org) {
          const orgName = org.name.replace(/[^a-zA-Z0-9]/g, '_');
          baseFileName = `Acclaim_${orgName}_${frequencyText}_Report_${now.toISOString().split("T")[0]}`;
        }
      }

      // Use custom recipient email if available (for org-level reports), otherwise use user's email
      const emailTo = (settings as any).recipientEmail || user.email;
      const recipientName = (settings as any).recipientName || `${user.firstName} ${user.lastName}`;

      const emailSuccess = await sendScheduledReportEmailWithAttachments(
        emailTo,
        recipientName,
        frequencyText,
        reportBuffers.excel,
        reportBuffers.html,
        baseFileName
      );

      if (emailSuccess) {
        await storage.updateScheduledReportLastSent(settings.id);
        console.log(`Sent scheduled report #${settings.id} to ${emailTo}`);
        
        // Log success to audit
        const auditEntry: InsertAuditLog = {
          tableName: 'scheduled_reports',
          recordId: String(settings.id),
          operation: 'SEND',
          userId: settings.userId,
          userEmail: user.email,
          description: `Scheduled ${frequencyText.toLowerCase()} report sent successfully to ${emailTo}`,
          newValue: JSON.stringify({ recipient: emailTo, frequency: frequencyText, organisationId: settings.organisationId || 'combined' }),
        };
        await storage.logAuditEvent(auditEntry);
      } else {
        console.error(`Failed to send scheduled report #${settings.id} - email delivery failed`);
        
        // Log failure to audit
        const auditEntry: InsertAuditLog = {
          tableName: 'scheduled_reports',
          recordId: String(settings.id),
          operation: 'SEND_FAILED',
          userId: settings.userId,
          userEmail: user.email,
          description: `Scheduled ${frequencyText.toLowerCase()} report failed to send to ${emailTo}`,
          newValue: JSON.stringify({ recipient: emailTo, frequency: frequencyText, error: 'Email delivery failed' }),
        };
        await storage.logAuditEvent(auditEntry);
      }
    } catch (error) {
      console.error(`Failed to send scheduled report for user ${settings.userId}:`, error);
      
      // Log error to audit
      try {
        const user = await storage.getUser(settings.userId);
        const auditEntry: InsertAuditLog = {
          tableName: 'scheduled_reports',
          recordId: String(settings.id),
          operation: 'SEND_ERROR',
          userId: settings.userId,
          userEmail: user?.email || 'unknown',
          description: `Scheduled report error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          newValue: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        };
        await storage.logAuditEvent(auditEntry);
      } catch (auditError) {
        console.error('Failed to log audit entry for report error:', auditError);
      }
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
