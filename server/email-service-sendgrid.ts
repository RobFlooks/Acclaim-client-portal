import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// APIM endpoint for SendGrid
const APIM_ENDPOINT = 'https://acclaim-api-apim.azure-api.net/sendgrid/v3/mail/send';

function getLogoAttachment(): { filename: string; path: string; cid: string } | null {
  const possiblePaths = [
    path.join(__dirname, '../attached_assets/Acclaim rose.Cur_1752271300769.png'),
    path.join(__dirname, '../../attached_assets/Acclaim rose.Cur_1752271300769.png'),
    path.join(process.cwd(), 'attached_assets/Acclaim rose.Cur_1752271300769.png'),
  ];
  
  for (const logoPath of possiblePaths) {
    if (fs.existsSync(logoPath)) {
      return {
        filename: 'logo.png',
        path: logoPath,
        cid: 'logo'
      };
    }
  }
  
  console.log('[Email] Logo file not found, sending email without logo attachment');
  return null;
}

// Get logo as base64 for HTTP API
function getLogoBase64(): { content: string; filename: string; type: string; content_id: string; disposition: string } | null {
  const possiblePaths = [
    path.join(__dirname, '../attached_assets/Acclaim rose.Cur_1752271300769.png'),
    path.join(__dirname, '../../attached_assets/Acclaim rose.Cur_1752271300769.png'),
    path.join(process.cwd(), 'attached_assets/Acclaim rose.Cur_1752271300769.png'),
  ];
  
  for (const logoPath of possiblePaths) {
    if (fs.existsSync(logoPath)) {
      try {
        const fileContent = fs.readFileSync(logoPath);
        return {
          content: fileContent.toString('base64'),
          filename: 'logo.png',
          type: 'image/png',
          content_id: 'logo',
          disposition: 'inline'
        };
      } catch (error) {
        console.log('[Email] Failed to read logo file:', error);
      }
    }
  }
  
  console.log('[Email] Logo file not found for base64 encoding');
  return null;
}

interface EmailNotificationData {
  userEmail: string;
  userName: string;
  messageSubject?: string;
  messageContent: string;
  caseReference?: string;
  organisationName: string;
  caseDetails?: {
    caseName: string;
    debtorType: string;
    originalAmount: string;
    outstandingAmount: string;
    status: string;
    stage: string;
  };
  attachment?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
  };
}

interface AdminToUserNotificationData {
  adminName: string;
  adminEmail: string;
  userEmail: string;
  userName: string;
  messageSubject?: string;
  messageContent: string;
  caseReference?: string;
  organisationName: string;
  caseDetails?: {
    caseName: string;
    debtorType: string;
    originalAmount: string;
    outstandingAmount: string;
    status: string;
    stage: string;
  };
  attachment?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
  };
}

interface WelcomeEmailData {
  userEmail: string;
  userName: string;
  firstName: string;
  lastName: string;
  username: string;
  temporaryPassword: string;
  organisationName: string;
  adminName: string;
}

interface ExternalMessageNotificationData {
  userEmail: string;
  userName: string;
  messageSubject: string;
  messageContent: string;
  caseReference?: string;
  organisationName: string;
  senderName: string;
  messageType: string;
  caseDetails?: {
    caseName: string;
    debtorType: string;
    originalAmount: string;
    outstandingAmount: string;
    status: string;
    stage: string;
  };
}

interface CaseSubmissionNotificationData {
  userEmail: string;
  userName: string;
  firstName: string;
  lastName: string;
  organisationName: string;
  submissionId: number;
  caseSubmission: {
    caseName: string;
    debtorType: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    creditorName?: string;
    
    // Organisation specific fields
    organisationName?: string;
    organisationTradingName?: string;
    companyNumber?: string;
    
    // Individual/Sole Trader specific fields
    individualType?: string;
    tradingName?: string;
    principalSalutation?: string;
    principalFirstName?: string;
    principalLastName?: string;
    
    // Address
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    
    // Contact details
    mainPhone?: string;
    altPhone?: string;
    mainEmail?: string;
    altEmail?: string;
    
    // Debt details
    totalDebtAmount: string;
    currency: string;
    debtDetails?: string;
    
    // Payment terms
    paymentTermsType?: string;
    paymentTermsDays?: number;
    paymentTermsOther?: string;
    
    // Invoice details
    singleInvoice?: string;
    firstOverdueDate?: string;
    lastOverdueDate?: string;
    
    additionalInfo?: string;
    submittedAt: Date;
  };
  uploadedFiles?: Array<{
    fileName: string;
    filePath: string;
    fileSize: number;
    fileType: string;
  }>;
}

class SendGridEmailService {
  private initialized = false;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    // Check for APIM subscription key (required for Azure APIM)
    if (process.env.APIM_SUBSCRIPTION_KEY) {
      this.initialized = true;
      console.log('✅ SendGrid Email Service: REAL email delivery enabled via Azure APIM');
      console.log('📧 Emails will be delivered to actual inboxes through APIM');
    } else {
      this.initialized = false;
      console.log('❌ APIM_SUBSCRIPTION_KEY not found - emails will not be sent');
    }
  }

  // Send email via Azure APIM to SendGrid HTTP API
  private async sendViaAPIM(payload: {
    to: string;
    subject: string;
    textContent: string;
    htmlContent: string;
    attachments?: Array<{
      content: string;
      filename: string;
      type: string;
      disposition?: string;
      content_id?: string;
    }>;
  }): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - email not sent');
      return false;
    }

    try {
         // 🔎 DEBUG (add these)
    console.log("APIM key present:", !!process.env.APIM_SUBSCRIPTION_KEY);
    console.log("APIM endpoint:", APIM_ENDPOINT);
    console.log("fetch exists:", typeof fetch);

      
      const emailPayload: any = {
        personalizations: [
          {
            to: [{ email: payload.to }]
          }
        ],
        from: {
          email: 'email@acclaim.law',
          name: 'Acclaim Credit Management & Recovery'
        },
        subject: payload.subject,
        content: [
          { type: 'text/plain', value: payload.textContent },
          { type: 'text/html', value: payload.htmlContent }
        ]
      };

      // Add attachments if present
      if (payload.attachments && payload.attachments.length > 0) {
        emailPayload.attachments = payload.attachments;
      }

      const response = await fetch(APIM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': process.env.APIM_SUBSCRIPTION_KEY!
        },
        body: JSON.stringify(emailPayload)
      });

      if (response.ok || response.status === 202) {
        console.log(`✅ REAL EMAIL SENT via Azure APIM to: ${payload.to}`);
        console.log(`📧 Subject: ${payload.subject}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ APIM email failed with status ${response.status}:`, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ APIM email sending failed:', error);
      return false;
    }
  }

  async sendExternalMessageNotification(data: ExternalMessageNotificationData): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - email not sent');
      return false;
    }

    try {
      const subject = data.caseReference 
        ? `${data.messageType}: ${data.messageSubject} [${data.caseReference}] - Acclaim Portal`
        : `${data.messageType}: ${data.messageSubject} - Acclaim Portal`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management & Recovery" style="height: 40px; width: auto;" />
            </div>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">New case update received</p>
            ${data.caseReference ? `<p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Case: ${data.caseReference}</p>` : ''}
          </div>
          
          <div style="padding: 30px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Case Update Details</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 140px;">From:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.senderName} (External System)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Organisation:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.organisationName}</td>
                </tr>
                ${data.caseReference ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Case Reference:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseReference}</td>
                </tr>
                ` : ''}
                ${data.caseDetails ? `
                <tr>
                  <td colspan="2" style="padding: 15px 0 8px 0;">
                    <h3 style="color: #0f172a; margin: 0; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Case Details</h3>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Case Name:</td>
                  <td style="padding: 4px 0; color: #1e293b;">${data.caseDetails.caseName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Debtor Type:</td>
                  <td style="padding: 4px 0; color: #1e293b;">${data.caseDetails.debtorType.charAt(0).toUpperCase() + data.caseDetails.debtorType.slice(1).replace('_', ' ')}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Original Amount:</td>
                  <td style="padding: 4px 0; color: #1e293b;">£${data.caseDetails.originalAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Outstanding Amount:</td>
                  <td style="padding: 4px 0; color: #1e293b; font-weight: bold;">£${data.caseDetails.outstandingAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Status:</td>
                  <td style="padding: 4px 0; color: #1e293b;">
                    <span style="background: ${data.caseDetails.status === 'active' ? '#dcfce7' : '#fef3c7'}; color: ${data.caseDetails.status === 'active' ? '#166534' : '#a16207'}; padding: 2px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase; font-weight: bold;">
                      ${data.caseDetails.status}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Current Stage:</td>
                  <td style="padding: 4px 0; color: #1e293b;">${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Update Type:</td>
                  <td style="padding: 8px 0; color: #1e293b;">
                    <span style="background: #e0f2fe; color: #0277bd; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                      ${data.messageType.toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.messageSubject}</td>
                </tr>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1e293b; margin-top: 0;">Message Content</h3>
              <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">${data.messageContent}</div>
            </div>

            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #64748b;">
                Please log in to the Acclaim Portal to view and respond to this message.
              </p>
              <a href="#" style="background: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View in Portal
              </a>
            </div>
          </div>

          <div style="background: #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 14px;">
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management & Recovery</p>
          </div>
        </div>
      `;

      const textContent = `
New case update from ${data.senderName}

Organisation: ${data.organisationName}
${data.caseReference ? `Case Reference: ${data.caseReference}` : ''}
${data.caseDetails ? `
CASE DETAILS:
- Case Name: ${data.caseDetails.caseName}
- Debtor Type: ${data.caseDetails.debtorType.charAt(0).toUpperCase() + data.caseDetails.debtorType.slice(1).replace('_', ' ')}
- Original Amount: £${data.caseDetails.originalAmount}
- Outstanding Amount: £${data.caseDetails.outstandingAmount}
- Status: ${data.caseDetails.status.toUpperCase()}
- Current Stage: ${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
` : ''}
Update Type: ${data.messageType.toUpperCase()}
Subject: ${data.messageSubject}

Message:
${data.messageContent}

Please log in to the Acclaim Portal to view and respond to this message.
      `;

      // Prepare attachments for APIM
      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }

      return await this.sendViaAPIM({
        to: data.userEmail,
        subject: subject,
        textContent: textContent,
        htmlContent: htmlContent,
        attachments: attachments
      });
    } catch (error) {
      console.error('❌ SendGrid email sending failed:', error);
      return false;
    }
  }

  async sendMessageNotification(data: EmailNotificationData, adminEmail: string): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - email not sent');
      return false;
    }

    try {
      const subject = data.caseReference 
        ? data.messageSubject 
          ? `New Message: ${data.messageSubject} [${data.caseReference}] - Acclaim Portal`
          : `New Message Received [${data.caseReference}] - Acclaim Portal`
        : data.messageSubject 
          ? `New Message: ${data.messageSubject} - Acclaim Portal`
          : 'New Message Received - Acclaim Portal';

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); background-color: #14b8a6; color: #ffffff; padding: 30px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management & Recovery" style="height: 40px; width: auto;" />
            </div>
            <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 500;">New message received</p>
            ${data.caseReference ? `<p style="margin: 5px 0 0 0; color: #ffffff; font-size: 14px;">Case: ${data.caseReference}</p>` : ''}
          </div>
          
          <div style="padding: 30px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Message Details</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 140px;">From:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.userName} (${data.userEmail})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Organisation:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.organisationName}</td>
                </tr>
                ${data.caseReference ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Case Reference:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseReference}</td>
                </tr>
                ` : ''}
                ${data.caseDetails ? `
                <tr>
                  <td colspan="2" style="padding: 15px 0 8px 0;">
                    <h3 style="color: #0f172a; margin: 0; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Case Details</h3>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Case Name:</td>
                  <td style="padding: 4px 0; color: #1e293b;">${data.caseDetails.caseName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Debtor Type:</td>
                  <td style="padding: 4px 0; color: #1e293b;">${data.caseDetails.debtorType.charAt(0).toUpperCase() + data.caseDetails.debtorType.slice(1).replace('_', ' ')}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Original Amount:</td>
                  <td style="padding: 4px 0; color: #1e293b;">£${data.caseDetails.originalAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Outstanding Amount:</td>
                  <td style="padding: 4px 0; color: #1e293b; font-weight: bold;">£${data.caseDetails.outstandingAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Status:</td>
                  <td style="padding: 4px 0; color: #1e293b;">
                    <span style="background: ${data.caseDetails.status === 'active' ? '#dcfce7' : '#fef3c7'}; color: ${data.caseDetails.status === 'active' ? '#166534' : '#a16207'}; padding: 2px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase; font-weight: bold;">
                      ${data.caseDetails.status}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Current Stage:</td>
                  <td style="padding: 4px 0; color: #1e293b;">${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                </tr>
                ` : ''}
                ${data.messageSubject ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.messageSubject}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1e293b; margin-top: 0;">Message Content</h3>
              <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">${data.messageContent}</div>
            </div>

            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #64748b;">
                Please log in to the Acclaim Portal to view and respond to this message.
              </p>
            </div>
          </div>

          <div style="background: #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 14px;">
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management & Recovery</p>
          </div>
        </div>
      `;

      const textContent = `
New message from ${data.userName} (${data.userEmail})
Organisation: ${data.organisationName}
${data.caseReference ? `Case Reference: ${data.caseReference}` : ''}
${data.caseDetails ? `
CASE DETAILS:
- Case Name: ${data.caseDetails.caseName}
- Debtor Type: ${data.caseDetails.debtorType.charAt(0).toUpperCase() + data.caseDetails.debtorType.slice(1).replace('_', ' ')}
- Original Amount: £${data.caseDetails.originalAmount}
- Outstanding Amount: £${data.caseDetails.outstandingAmount}
- Status: ${data.caseDetails.status.toUpperCase()}
- Current Stage: ${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
` : ''}
${data.messageSubject ? `Subject: ${data.messageSubject}` : ''}

Message:
${data.messageContent}

Please log in to the Acclaim Portal to view and respond to this message.
      `;

      // Prepare attachments for APIM
      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }

      // Add user attachment if present (convert to base64)
      if (data.attachment && data.attachment.filePath) {
        try {
          const fileContent = fs.readFileSync(data.attachment.filePath);
          attachments.push({
            content: fileContent.toString('base64'),
            filename: data.attachment.fileName,
            type: data.attachment.fileType || 'application/octet-stream',
            disposition: 'attachment'
          });
        } catch (error) {
          console.error('Failed to read attachment file:', error);
        }
      }

      return await this.sendViaAPIM({
        to: adminEmail,
        subject: subject,
        textContent: textContent,
        htmlContent: htmlContent,
        attachments: attachments
      });
    } catch (error) {
      console.error('❌ Failed to send user-to-admin email via SendGrid:', error);
      return false;
    }
  }

  async sendAdminToUserNotification(data: AdminToUserNotificationData): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - email not sent');
      return false;
    }

    try {
      const subject = data.caseReference 
        ? data.messageSubject 
          ? `Message from Admin: ${data.messageSubject} [${data.caseReference}] - Acclaim Portal`
          : `New Message from Administrator [${data.caseReference}] - Acclaim Portal`
        : data.messageSubject 
          ? `Message from Admin: ${data.messageSubject} - Acclaim Portal`
          : 'New Message from Administrator - Acclaim Portal';

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management & Recovery" style="height: 40px; width: auto;" />
            </div>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">Message from Acclaim</p>
            ${data.caseReference ? `<p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Case: ${data.caseReference}</p>` : ''}
          </div>
          
          <div style="padding: 30px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Message Details</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 140px;">From:</td>
                  <td style="padding: 8px 0; color: #1e293b;">Acclaim</td>
                </tr>
                ${data.caseReference ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Case Reference:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseReference}</td>
                </tr>
                ` : ''}
                ${data.caseDetails ? `
                <tr>
                  <td colspan="2" style="padding: 15px 0 8px 0;">
                    <h3 style="color: #0f172a; margin: 0; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Case Details</h3>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Case Name:</td>
                  <td style="padding: 4px 0; color: #1e293b;">${data.caseDetails.caseName}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Outstanding Amount:</td>
                  <td style="padding: 4px 0; color: #1e293b; font-weight: bold;">£${data.caseDetails.outstandingAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Status:</td>
                  <td style="padding: 4px 0; color: #1e293b;">
                    <span style="background: ${data.caseDetails.status === 'active' ? '#dcfce7' : '#fef3c7'}; color: ${data.caseDetails.status === 'active' ? '#166534' : '#a16207'}; padding: 2px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase; font-weight: bold;">
                      ${data.caseDetails.status}
                    </span>
                  </td>
                </tr>
                ` : ''}
                ${data.messageSubject ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.messageSubject}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1e293b; margin-top: 0;">Message Content</h3>
              <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">${data.messageContent}</div>
            </div>

            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #64748b;">
                Please log in to the Acclaim Portal to view this message and respond if needed.
              </p>
            </div>
          </div>

          <div style="background: #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 14px;">
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management & Recovery</p>
          </div>
        </div>
      `;

      const textContent = `
Message from Acclaim
${data.caseReference ? `Case Reference: ${data.caseReference}` : ''}
${data.messageSubject ? `Subject: ${data.messageSubject}` : ''}

Message:
${data.messageContent}

Please log in to the Acclaim Portal to view this message and respond if needed.
      `;

      // Prepare attachments for APIM
      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }

      // Add user attachment if present (convert to base64)
      if (data.attachment && data.attachment.filePath) {
        try {
          const fileContent = fs.readFileSync(data.attachment.filePath);
          attachments.push({
            content: fileContent.toString('base64'),
            filename: data.attachment.fileName,
            type: data.attachment.fileType || 'application/octet-stream',
            disposition: 'attachment'
          });
          console.log(`📎 Including attachment in admin-to-user email: ${data.attachment.fileName}`);
        } catch (error) {
          console.error('Failed to read attachment file for admin-to-user email:', error);
        }
      }

      return await this.sendViaAPIM({
        to: data.userEmail,
        subject: subject,
        textContent: textContent,
        htmlContent: htmlContent,
        attachments: attachments
      });
    } catch (error) {
      console.error('❌ Failed to send admin-to-user email via SendGrid:', error);
      return false;
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - welcome email not sent');
      return false;
    }

    try {
      const subject = `Welcome to the Acclaim Credit Management & Recovery Portal!`;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management & Recovery" style="height: 40px; width: auto;" />
            </div>
            <h1 style="margin: 0; font-size: 24px;">Welcome to the Acclaim Credit Management & Recovery Portal!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Your account is ready</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Account Details</h2>
              <p style="color: #475569; margin-bottom: 20px;">Hello ${data.firstName},</p>
              <p style="color: #475569; margin-bottom: 20px;">Welcome to the Acclaim Credit Management & Recovery Portal! Your account has been created and you can now access the system.</p>
              
              <table style="width: 100%; border-spacing: 0; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 140px;">Username:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${data.userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Temporary Password:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${data.temporaryPassword}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">⚠️ Important Security Notice</h3>
              <p style="color: #92400e; margin: 0; font-size: 14px;">This is a temporary password. You will be required to change it when you first log in for security purposes.</p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1e293b; margin-top: 0;">Getting Started</h3>
              <ol style="color: #475569; line-height: 1.6; padding-left: 20px;">
                <li>Visit the Acclaim Portal login page</li>
                <li>Enter your username and temporary password</li>
                <li>Create a new secure password when prompted</li>
                <li>Explore your dashboard and case management tools</li>
              </ol>
            </div>

            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="color: #64748b; margin: 0; font-size: 12px;">
                If you have any questions, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      `;

      const textContent = `
Welcome to the Acclaim Credit Management & Recovery Portal!

Hello ${data.firstName},

Your account has been created and you can now access the system.

Account Details:
Username: ${data.userEmail}
Temporary Password: ${data.temporaryPassword}

IMPORTANT: This is a temporary password. You will be required to change it when you first log in.

Getting Started:
1. Visit the Acclaim Portal login page
2. Enter your username and temporary password
3. Create a new secure password when prompted
4. Explore your dashboard and case management tools

If you have any questions, please contact our support team.
      `;

      // Prepare attachments for APIM
      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }

      return await this.sendViaAPIM({
        to: data.userEmail,
        subject: subject,
        textContent: textContent,
        htmlContent: htmlContent,
        attachments: attachments
      });
    } catch (error) {
      console.error('❌ Failed to send welcome email via SendGrid:', error);
      return false;
    }
  }

  async sendPasswordResetOTP(data: { userEmail: string; userName: string; otp: string; expiresInMinutes: number }): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - password reset email not sent');
      return false;
    }

    try {
      const subject = `Your Password Reset Code - Acclaim Portal`;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management & Recovery" style="height: 40px; width: auto;" />
            </div>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">Password Reset Request</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Hello ${data.userName},</h2>
              <p style="color: #475569; margin-bottom: 20px;">
                We received a request to reset your password for the Acclaim Credit Management & Recovery Portal.
              </p>
              
              <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                <p style="color: #475569; margin: 0 0 10px 0; font-size: 14px;">Your one-time password is:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0d9488; font-family: monospace;">
                  ${data.otp}
                </div>
                <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 12px;">
                  This code expires in ${data.expiresInMinutes} minutes
                </p>
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
                </p>
              </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #1e293b; margin-top: 0;">How to Reset Your Password</h3>
              <ol style="color: #475569; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Go to the login page</li>
                <li style="margin-bottom: 10px;">Click "Forgot Password"</li>
                <li style="margin-bottom: 10px;">Enter your email and click "Send Code" (already done)</li>
                <li style="margin-bottom: 10px;">Enter this one-time code and click "Login with Code"</li>
                <li style="margin-bottom: 10px;">You'll be prompted to create a new password</li>
              </ol>
            </div>
          </div>

          <div style="background: #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 14px;">
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management & Recovery</p>
            <p style="margin: 5px 0 0 0;">Need help? Contact us at <a href="mailto:email@acclaim.law" style="color: #0d9488;">email@acclaim.law</a></p>
          </div>
        </div>
      `;

      const textContent = `
Password Reset Request - Acclaim Portal

Hello ${data.userName},

We received a request to reset your password for the Acclaim Credit Management & Recovery Portal.

Your one-time password is: ${data.otp}

This code expires in ${data.expiresInMinutes} minutes.

How to Reset Your Password:
1. Go to the login page
2. Click "Forgot Password"
3. Enter your email and click "Send Code" (already done)
4. Enter this one-time code and click "Login with Code"
5. You'll be prompted to create a new password

Security Notice: If you didn't request this password reset, please ignore this email. Your account remains secure.

Need help? Contact us at email@acclaim.law
      `;

      // Prepare attachments for APIM
      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }

      return await this.sendViaAPIM({
        to: data.userEmail,
        subject: subject,
        textContent: textContent,
        htmlContent: htmlContent,
        attachments: attachments
      });
    } catch (error) {
      console.error('❌ Failed to send password reset OTP email via SendGrid:', error);
      return false;
    }
  }

  private async generateCaseSubmissionExcel(data: CaseSubmissionNotificationData): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Case Submission Details');

    // Set up headers with styling
    worksheet.columns = [
      { header: 'Field', key: 'field', width: 30 },
      { header: 'Value', key: 'value', width: 50 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF14b8a6' }
    };

    // Build submission data array with all populated fields
    const submissionData: Array<{ field: string; value: string }> = [];
    
    // Basic Information
    submissionData.push(
      { field: 'Submission ID', value: data.submissionId.toString() },
      { field: 'Submitted At', value: data.caseSubmission.submittedAt.toLocaleString('en-GB') }
    );
    
    // Submitter Information
    submissionData.push(
      { field: '', value: '' },
      { field: '=== SUBMITTER INFORMATION ===', value: '' }
    );
    if (data.userName) submissionData.push({ field: 'Submitted By', value: data.userName });
    if (data.userEmail) submissionData.push({ field: 'Submitted By Email', value: data.userEmail });
    if (data.organisationName) submissionData.push({ field: 'Organisation', value: data.organisationName });
    
    // Client Details
    submissionData.push(
      { field: '', value: '' },
      { field: '=== CLIENT DETAILS ===', value: '' }
    );
    if (data.caseSubmission.clientName) submissionData.push({ field: 'Client Name', value: data.caseSubmission.clientName });
    if (data.caseSubmission.clientEmail) submissionData.push({ field: 'Client Email', value: data.caseSubmission.clientEmail });
    if (data.caseSubmission.clientPhone) submissionData.push({ field: 'Client Phone', value: data.caseSubmission.clientPhone });
    if (data.caseSubmission.creditorName) submissionData.push({ field: 'Creditor Name', value: data.caseSubmission.creditorName });
    
    // Debtor Information
    submissionData.push(
      { field: '', value: '' },
      { field: '=== DEBTOR INFORMATION ===', value: '' }
    );
    submissionData.push({ field: 'Case Name', value: data.caseSubmission.caseName });
    submissionData.push({ field: 'Debtor Type', value: data.caseSubmission.debtorType });
    
    if (data.caseSubmission.debtorType === 'organisation') {
      if (data.caseSubmission.organisationName) submissionData.push({ field: 'Organisation Name', value: data.caseSubmission.organisationName });
      if (data.caseSubmission.organisationTradingName) submissionData.push({ field: 'Trading Name', value: data.caseSubmission.organisationTradingName });
      if (data.caseSubmission.companyNumber) submissionData.push({ field: 'Company Number', value: data.caseSubmission.companyNumber });
    } else {
      if (data.caseSubmission.individualType) submissionData.push({ field: 'Individual Type', value: data.caseSubmission.individualType });
      if (data.caseSubmission.tradingName) submissionData.push({ field: 'Trading Name', value: data.caseSubmission.tradingName });
      if (data.caseSubmission.principalSalutation) submissionData.push({ field: 'Principal Salutation', value: data.caseSubmission.principalSalutation });
      if (data.caseSubmission.principalFirstName) submissionData.push({ field: 'Principal First Name', value: data.caseSubmission.principalFirstName });
      if (data.caseSubmission.principalLastName) submissionData.push({ field: 'Principal Last Name', value: data.caseSubmission.principalLastName });
    }
    
    // Address
    if (data.caseSubmission.addressLine1) {
      submissionData.push(
        { field: '', value: '' },
        { field: '=== ADDRESS ===', value: '' }
      );
      if (data.caseSubmission.addressLine1) submissionData.push({ field: 'Address Line 1', value: data.caseSubmission.addressLine1 });
      if (data.caseSubmission.addressLine2) submissionData.push({ field: 'Address Line 2', value: data.caseSubmission.addressLine2 });
      if (data.caseSubmission.city) submissionData.push({ field: 'City', value: data.caseSubmission.city });
      if (data.caseSubmission.county) submissionData.push({ field: 'County', value: data.caseSubmission.county });
      if (data.caseSubmission.postcode) submissionData.push({ field: 'Postcode', value: data.caseSubmission.postcode });
    }
    
    // Contact Details
    const hasContact = data.caseSubmission.mainPhone || data.caseSubmission.altPhone || 
                      data.caseSubmission.mainEmail || data.caseSubmission.altEmail;
    if (hasContact) {
      submissionData.push(
        { field: '', value: '' },
        { field: '=== CONTACT DETAILS ===', value: '' }
      );
      if (data.caseSubmission.mainPhone) submissionData.push({ field: 'Main Phone', value: data.caseSubmission.mainPhone });
      if (data.caseSubmission.altPhone) submissionData.push({ field: 'Alternative Phone', value: data.caseSubmission.altPhone });
      if (data.caseSubmission.mainEmail) submissionData.push({ field: 'Main Email', value: data.caseSubmission.mainEmail });
      if (data.caseSubmission.altEmail) submissionData.push({ field: 'Alternative Email', value: data.caseSubmission.altEmail });
    }
    
    // Debt Details
    submissionData.push(
      { field: '', value: '' },
      { field: '=== DEBT DETAILS ===', value: '' }
    );
    submissionData.push({ field: 'Total Debt Amount', value: `${data.caseSubmission.currency || 'GBP'} ${data.caseSubmission.totalDebtAmount}` });
    if (data.caseSubmission.debtDetails) submissionData.push({ field: 'Debt Description', value: data.caseSubmission.debtDetails });
    
    // Payment Terms
    if (data.caseSubmission.paymentTermsType) {
      submissionData.push(
        { field: '', value: '' },
        { field: '=== PAYMENT TERMS ===', value: '' }
      );
      submissionData.push({ field: 'Payment Terms Type', value: data.caseSubmission.paymentTermsType });
      if (data.caseSubmission.paymentTermsDays) submissionData.push({ field: 'Payment Terms Days', value: data.caseSubmission.paymentTermsDays.toString() });
      if (data.caseSubmission.paymentTermsOther) submissionData.push({ field: 'Other Payment Terms', value: data.caseSubmission.paymentTermsOther });
    }
    
    // Invoice Details
    if (data.caseSubmission.singleInvoice || data.caseSubmission.firstOverdueDate || data.caseSubmission.lastOverdueDate) {
      submissionData.push(
        { field: '', value: '' },
        { field: '=== INVOICE DETAILS ===', value: '' }
      );
      if (data.caseSubmission.singleInvoice) submissionData.push({ field: 'Single Invoice', value: data.caseSubmission.singleInvoice === 'yes' ? 'Yes' : 'No' });
      if (data.caseSubmission.firstOverdueDate) submissionData.push({ field: 'First Overdue Date', value: data.caseSubmission.firstOverdueDate });
      if (data.caseSubmission.lastOverdueDate) submissionData.push({ field: 'Last Overdue Date', value: data.caseSubmission.lastOverdueDate });
    }
    
    // Additional Information
    if (data.caseSubmission.additionalInfo) {
      submissionData.push(
        { field: '', value: '' },
        { field: '=== ADDITIONAL INFORMATION ===', value: '' }
      );
      submissionData.push({ field: 'Additional Notes', value: data.caseSubmission.additionalInfo });
    }

    worksheet.addRows(submissionData);

    // Add uploaded files section if there are any
    if (data.uploadedFiles && data.uploadedFiles.length > 0) {
      worksheet.addRow({ field: '', value: '' });
      worksheet.addRow({ field: '=== UPLOADED FILES ===', value: '' });
      worksheet.getRow(worksheet.rowCount).font = { bold: true };
      
      data.uploadedFiles.forEach((file, index) => {
        worksheet.addRow({ field: `File ${index + 1}`, value: file.fileName });
        worksheet.addRow({ field: `  Size`, value: `${(file.fileSize / 1024).toFixed(2)} KB` });
        worksheet.addRow({ field: `  Type`, value: file.fileType });
      });
    }

    // Save to temporary file
    const fileName = `case-submission-${data.submissionId}-${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../uploads', fileName);
    
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  async sendCaseSubmissionNotification(data: CaseSubmissionNotificationData): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - case submission email not sent');
      return false;
    }

    try {
      const subject = `New Case Submission #${data.submissionId} - ${data.caseSubmission.caseName}`;

      // Generate Excel file
      const excelFilePath = await this.generateCaseSubmissionExcel(data);

      // Build dynamic HTML sections based on populated fields
      let debtorDetailsHtml = '';
      if (data.caseSubmission.debtorType === 'organisation') {
        debtorDetailsHtml = `
          ${data.caseSubmission.organisationName ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 180px;">Organisation Name:</td>
            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.organisationName}</td>
          </tr>` : ''}
          ${data.caseSubmission.organisationTradingName ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Trading Name:</td>
            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.organisationTradingName}</td>
          </tr>` : ''}
          ${data.caseSubmission.companyNumber ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Company Number:</td>
            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.companyNumber}</td>
          </tr>` : ''}
        `;
      } else {
        debtorDetailsHtml = `
          ${data.caseSubmission.individualType ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 180px;">Individual Type:</td>
            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.individualType === 'individual' ? 'Individual' : 'Sole Trader/Business'}</td>
          </tr>` : ''}
          ${data.caseSubmission.tradingName ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Trading Name:</td>
            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.tradingName}</td>
          </tr>` : ''}
          ${data.caseSubmission.principalSalutation || data.caseSubmission.principalFirstName || data.caseSubmission.principalLastName ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Principal Name:</td>
            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.principalSalutation || ''} ${data.caseSubmission.principalFirstName || ''} ${data.caseSubmission.principalLastName || ''}`.trim() + `</td>
          </tr>` : ''}
        `;
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management & Recovery" style="height: 40px; width: auto;" />
            </div>
            <h1 style="margin: 0; font-size: 24px; color: #000000 !important;">New Case Submission Received</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: #000000 !important;">Submission ID: #${data.submissionId}</p>
          </div>
          
          <div style="padding: 30px;">
            <!-- Client Details -->
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Client Details</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 180px;">Client Name:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.clientName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Client Email:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.clientEmail}</td>
                </tr>
                ${data.caseSubmission.clientPhone ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Client Phone:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.clientPhone}</td>
                </tr>` : ''}
                ${data.caseSubmission.creditorName ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Creditor Name:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.creditorName}</td>
                </tr>` : ''}
              </table>
            </div>

            <!-- Debtor Information -->
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Debtor Information</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 180px;">Case Name:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.caseName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Debtor Type:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.debtorType === 'individual' ? 'Individual/Sole Trader' : 'Organisation'}</td>
                </tr>
                ${debtorDetailsHtml}
              </table>
            </div>

            <!-- Address -->
            ${data.caseSubmission.addressLine1 ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Address</h2>
              <table style="width: 100%; border-spacing: 0;">
                ${data.caseSubmission.addressLine1 ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 180px;">Address Line 1:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.addressLine1}</td>
                </tr>` : ''}
                ${data.caseSubmission.addressLine2 ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Address Line 2:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.addressLine2}</td>
                </tr>` : ''}
                ${data.caseSubmission.city ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">City:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.city}</td>
                </tr>` : ''}
                ${data.caseSubmission.county ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">County:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.county}</td>
                </tr>` : ''}
                ${data.caseSubmission.postcode ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Postcode:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.postcode}</td>
                </tr>` : ''}
              </table>
            </div>` : ''}

            <!-- Contact Details -->
            ${data.caseSubmission.mainPhone || data.caseSubmission.altPhone || data.caseSubmission.mainEmail || data.caseSubmission.altEmail ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Contact Details</h2>
              <table style="width: 100%; border-spacing: 0;">
                ${data.caseSubmission.mainPhone ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 180px;">Main Phone:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.mainPhone}</td>
                </tr>` : ''}
                ${data.caseSubmission.altPhone ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Alternative Phone:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.altPhone}</td>
                </tr>` : ''}
                ${data.caseSubmission.mainEmail ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Main Email:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.mainEmail}</td>
                </tr>` : ''}
                ${data.caseSubmission.altEmail ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Alternative Email:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.altEmail}</td>
                </tr>` : ''}
              </table>
            </div>` : ''}

            <!-- Debt Details -->
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Debt Details</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 180px;">Total Amount:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: bold; font-size: 18px;">${data.caseSubmission.currency || 'GBP'} ${data.caseSubmission.totalDebtAmount}</td>
                </tr>
              </table>
              ${data.caseSubmission.debtDetails ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                <h3 style="color: #475569; margin: 0 0 10px 0; font-size: 14px;">Debt Description:</h3>
                <p style="color: #1e293b; margin: 0; white-space: pre-wrap;">${data.caseSubmission.debtDetails}</p>
              </div>` : ''}
            </div>

            <!-- Payment Terms -->
            ${data.caseSubmission.paymentTermsType ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Payment Terms</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 180px;">Payment Terms Type:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.paymentTermsType.replace(/_/g, ' ')}</td>
                </tr>
                ${data.caseSubmission.paymentTermsDays ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Payment Terms Days:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.paymentTermsDays}</td>
                </tr>` : ''}
                ${data.caseSubmission.paymentTermsOther ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Other Terms:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.paymentTermsOther}</td>
                </tr>` : ''}
              </table>
            </div>` : ''}

            <!-- Invoice Details -->
            ${data.caseSubmission.singleInvoice || data.caseSubmission.firstOverdueDate || data.caseSubmission.lastOverdueDate ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Invoice Details</h2>
              <table style="width: 100%; border-spacing: 0;">
                ${data.caseSubmission.singleInvoice ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 180px;">Single Invoice:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.singleInvoice === 'yes' ? 'Yes' : 'No'}</td>
                </tr>` : ''}
                ${data.caseSubmission.firstOverdueDate ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">First Overdue Date:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.firstOverdueDate}</td>
                </tr>` : ''}
                ${data.caseSubmission.lastOverdueDate ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Last Overdue Date:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.lastOverdueDate}</td>
                </tr>` : ''}
              </table>
            </div>` : ''}

            <!-- Additional Information -->
            ${data.caseSubmission.additionalInfo ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Additional Information</h2>
              <p style="color: #475569; margin: 0; white-space: pre-wrap;">${data.caseSubmission.additionalInfo}</p>
            </div>` : ''}

            <!-- Submitted By -->
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Submitted By</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 180px;">Name:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.firstName} ${data.lastName} (${data.userName})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Email:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Organisation:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.organisationName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Submitted:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.submittedAt.toLocaleString('en-GB')}</td>
                </tr>
              </table>
            </div>

            <!-- Uploaded Files -->
            ${data.uploadedFiles && data.uploadedFiles.length > 0 ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Uploaded Files (${data.uploadedFiles.length})</h2>
              <ul style="color: #475569; margin: 0; padding-left: 20px;">
                ${data.uploadedFiles.map(file => `
                  <li style="margin-bottom: 5px;">
                    <strong>${file.fileName}</strong> 
                    <span style="color: #64748b; font-size: 14px;">(${(file.fileSize / 1024).toFixed(2)} KB)</span>
                  </li>
                `).join('')}
              </ul>
              <p style="color: #64748b; font-size: 14px; margin: 10px 0 0 0;">All uploaded files are attached to this email.</p>
            </div>` : ''}

            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="color: #475569; margin: 0; font-size: 14px;">
                📊 <strong>Excel Summary:</strong> A detailed Excel spreadsheet with all case submission information is attached for your records.
              </p>
            </div>
          </div>

          <div style="background: #e2e8f0; padding: 20px; text-align: center; color: #64748b; font-size: 14px;">
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management & Recovery</p>
          </div>
        </div>
      `;

      const textContent = `
New Case Submission #${data.submissionId}

Case Details:
- Case Name: ${data.caseSubmission.caseName}
- Debtor Type: ${data.caseSubmission.debtorType}
- Total Amount: ${data.caseSubmission.currency || 'GBP'} ${data.caseSubmission.totalDebtAmount}
- Client Name: ${data.caseSubmission.clientName}
- Client Email: ${data.caseSubmission.clientEmail}
${data.caseSubmission.clientPhone ? `- Client Phone: ${data.caseSubmission.clientPhone}` : ''}

Submitted By:
- Name: ${data.firstName} ${data.lastName} (${data.userName})
- Email: ${data.userEmail}
- Organisation: ${data.organisationName}
- Submitted: ${data.caseSubmission.submittedAt.toLocaleString('en-GB')}

${data.caseSubmission.debtDetails ? `Debt Details:\n${data.caseSubmission.debtDetails}\n\n` : ''}
${data.caseSubmission.additionalInfo ? `Additional Information:\n${data.caseSubmission.additionalInfo}\n\n` : ''}
${data.uploadedFiles && data.uploadedFiles.length > 0 ? `Uploaded Files:\n${data.uploadedFiles.map(f => `- ${f.fileName} (${(f.fileSize / 1024).toFixed(2)} KB)`).join('\n')}\n\n` : ''}

A detailed Excel spreadsheet and all uploaded files are attached to this email.
      `;

      // Prepare attachments for APIM (convert to base64)
      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      
      // Add logo
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }
      
      // Add Excel file
      try {
        const excelContent = fs.readFileSync(excelFilePath);
        attachments.push({
          content: excelContent.toString('base64'),
          filename: `case-submission-${data.submissionId}.xlsx`,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          disposition: 'attachment'
        });
      } catch (error) {
        console.error('Failed to read Excel file:', error);
      }

      // Add uploaded files to attachments
      if (data.uploadedFiles && data.uploadedFiles.length > 0) {
        data.uploadedFiles.forEach(file => {
          try {
            const fileContent = fs.readFileSync(file.filePath);
            attachments.push({
              content: fileContent.toString('base64'),
              filename: file.fileName,
              type: file.fileType || 'application/octet-stream',
              disposition: 'attachment'
            });
          } catch (error) {
            console.error(`Failed to read attachment file ${file.fileName}:`, error);
          }
        });
      }

      const result = await this.sendViaAPIM({
        to: 'email@acclaim.law',
        subject: subject,
        textContent: textContent,
        htmlContent: htmlContent,
        attachments: attachments
      });
      
      // Clean up the temporary Excel file
      try {
        fs.unlinkSync(excelFilePath);
      } catch (error) {
        console.error('Warning: Failed to delete temporary Excel file:', error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Failed to send case submission notification via SendGrid:', error);
      return false;
    }
  }
}

// Export singleton instance
export const sendGridEmailService = new SendGridEmailService();
