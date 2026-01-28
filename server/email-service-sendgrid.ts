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

// Helper function to detect video/movie files that should not be attached to emails
function isVideoFile(fileName: string, mimeType?: string): boolean {
  // Check MIME type first if available
  if (mimeType) {
    if (mimeType.startsWith('video/')) {
      return true;
    }
  }
  
  // Check file extension
  const videoExtensions = [
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', 
    '.m4v', '.mpg', '.mpeg', '.3gp', '.3g2', '.ogv', '.ts', 
    '.mts', '.m2ts', '.vob', '.divx', '.xvid', '.rm', '.rmvb',
    '.asf', '.swf', '.f4v'
  ];
  
  const lowerFileName = fileName.toLowerCase();
  return videoExtensions.some(ext => lowerFileName.endsWith(ext));
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
    assignedTo?: string | null;
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
  portalUrl?: string;
}

interface TemporaryPasswordEmailData {
  userEmail: string;
  firstName: string;
  temporaryPassword: string;
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

interface DocumentUploadNotificationData {
  uploaderName: string;
  uploaderEmail: string;
  organisationName: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath?: string;
  caseReference?: string;
  caseName?: string;
  uploadedAt: Date;
}

interface LoginNotificationData {
  userEmail: string;
  userName: string;
  loginTime: Date;
  ipAddress: string;
  userAgent: string;
  loginMethod: 'password' | 'azure_sso' | 'otp';
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
    bcc?: string[];
    subject: string;
    textContent?: string;
    htmlContent?: string;
    text?: string;
    html?: string;
    attachLogo?: boolean;
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
      const textContent = payload.textContent || payload.text || '';
      const htmlContent = payload.htmlContent || payload.html || '';
      
      const personalization: any = {
        to: [{ email: payload.to }]
      };
      
      // Add BCC recipients if provided
      if (payload.bcc && payload.bcc.length > 0) {
        personalization.bcc = payload.bcc.map(email => ({ email }));
      }
      
      const emailPayload: any = {
        personalizations: [personalization],
        from: {
          email: 'email@acclaim.law',
          name: 'Acclaim Credit Management & Recovery'
        },
        subject: payload.subject,
        content: [
          { type: 'text/plain', value: textContent },
          { type: 'text/html', value: htmlContent }
        ]
      };

      // Add attachments if present
      const attachments = [...(payload.attachments || [])];
      
      // Add logo if requested
      if (payload.attachLogo) {
        const logoBase64 = getLogoBase64();
        if (logoBase64) {
          attachments.push(logoBase64);
        }
      }
      
      if (attachments.length > 0) {
        emailPayload.attachments = attachments;
      }
      
      // Log BCC info for debugging
      if (payload.bcc && payload.bcc.length > 0) {
        console.log(`📧 Sending email with ${payload.bcc.length} BCC recipient(s)`);
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
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 36px; width: auto; margin-bottom: 16px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Case Update</h1>
                      ${data.caseReference ? `<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Reference: ${data.caseReference}</p>` : ''}
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Update Type Badge -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <span style="display: inline-block; background-color: #e0f2f1; background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%); color: #00695c; padding: 8px 20px; border-radius: 50px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          ${data.messageType}
                        </span>
                      </div>
                      
                      <!-- Info Card -->
                      <div style="background: #f8fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #008b8b;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 120px;">Organisation</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.organisationName}</td>
                          </tr>
                          ${data.caseReference ? `
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Case Ref</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.caseReference}</td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Subject</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.messageSubject}</td>
                          </tr>
                        </table>
                      </div>
                      
                      ${data.caseDetails ? `
                      <!-- Case Details Card -->
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600; display: flex; align-items: center;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px;"></span>
                          Case Details
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 140px;">Case Name</td>
                            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${data.caseDetails.caseName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Debtor Type</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseDetails.debtorType.charAt(0).toUpperCase() + data.caseDetails.debtorType.slice(1).replace('_', ' ')}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Original Amount</td>
                            <td style="padding: 8px 0; color: #1e293b;">£${data.caseDetails.originalAmount}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Outstanding</td>
                            <td style="padding: 8px 0; color: #008b8b; font-weight: 700; font-size: 16px;">£${data.caseDetails.outstandingAmount}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Status</td>
                            <td style="padding: 8px 0;">
                              <span style="display: inline-block; background: ${data.caseDetails.status === 'active' ? '#dcfce7' : '#fef3c7'}; color: ${data.caseDetails.status === 'active' ? '#166534' : '#a16207'}; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 600;">
                                ${data.caseDetails.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Stage</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                          </tr>
                        </table>
                      </div>
                      ` : ''}
                      
                      <!-- Message Content -->
                      <div style="background: #fafbfc; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                        <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px; font-weight: 600;">Message</h3>
                        <div style="color: #475569; line-height: 1.7; font-size: 14px; white-space: pre-wrap;">${data.messageContent}</div>
                      </div>
                      
                      <!-- CTA Button -->
                      <div style="text-align: center;">
                        <a href="https://acclaim-api.azurewebsites.net/auth" style="display: inline-block; background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(0,139,139,0.3);">
                          View in Portal →
                        </a>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated notification from the Acclaim Client Portal</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `
New case update from Acclaim

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
Portal: https://acclaim-api.azurewebsites.net/auth
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
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 36px; width: auto; margin-bottom: 16px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">New Message</h1>
                      ${data.caseReference ? `<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Case: ${data.caseReference}</p>` : ''}
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Email Type Badge -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <span style="display: inline-block; background-color: #e0f2f1; background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%); color: #00695c; padding: 8px 20px; border-radius: 50px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          User Message
                        </span>
                      </div>
                      
                      <!-- Sender Info Card -->
                      <div style="background: #f8fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #008b8b;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 120px;">From</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.userName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Email</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${data.userEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Organisation</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.organisationName}</td>
                          </tr>
                          ${data.caseReference ? `
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Case Ref</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.caseReference}</td>
                          </tr>
                          ` : ''}
                          ${data.messageSubject ? `
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Subject</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.messageSubject}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </div>
                      
                      ${data.caseDetails ? `
                      <!-- Case Details Card -->
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Case Details
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 140px;">Case Name</td>
                            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${data.caseDetails.caseName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Debtor Type</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseDetails.debtorType.charAt(0).toUpperCase() + data.caseDetails.debtorType.slice(1).replace('_', ' ')}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Original Amount</td>
                            <td style="padding: 8px 0; color: #1e293b;">£${data.caseDetails.originalAmount}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Outstanding</td>
                            <td style="padding: 8px 0; color: #008b8b; font-weight: 700; font-size: 16px;">£${data.caseDetails.outstandingAmount}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Status</td>
                            <td style="padding: 8px 0;">
                              <span style="display: inline-block; background: ${data.caseDetails.status === 'active' ? '#dcfce7' : '#fef3c7'}; color: ${data.caseDetails.status === 'active' ? '#166534' : '#a16207'}; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 600;">
                                ${data.caseDetails.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Stage</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                          </tr>
                          ${data.caseDetails.assignedTo ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Case Handler</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseDetails.assignedTo}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </div>
                      ` : ''}
                      
                      <!-- Message Content -->
                      <div style="background: #fafbfc; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                        <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px; font-weight: 600;">Message</h3>
                        <div style="color: #475569; line-height: 1.7; font-size: 14px; white-space: pre-wrap;">${data.messageContent}</div>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated notification from the Acclaim Client Portal</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
- Current Stage: ${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}${data.caseDetails.assignedTo ? `
- Case Handler: ${data.caseDetails.assignedTo}` : ''}
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

      // Add user attachment if present (convert to base64) - skip video files
      if (data.attachment && data.attachment.filePath) {
        if (isVideoFile(data.attachment.fileName, data.attachment.fileType)) {
          console.log(`📎 Skipping video attachment in email (too large): ${data.attachment.fileName}`);
        } else {
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
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 36px; width: auto; margin-bottom: 16px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Message from Acclaim</h1>
                      ${data.caseReference && data.caseDetails?.caseName ? `<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">${data.caseDetails.caseName} (${data.caseReference})</p>` : data.caseReference ? `<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Case: ${data.caseReference}</p>` : ''}
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Email Type Badge -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <span style="display: inline-block; background-color: #e0f2f1; background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%); color: #00695c; padding: 8px 20px; border-radius: 50px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          Admin Message
                        </span>
                      </div>
                      
                      <!-- Info Card -->
                      <div style="background: #f8fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #008b8b;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          ${data.caseReference ? `
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 120px;">Case</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.caseDetails?.caseName ? `${data.caseDetails.caseName} (${data.caseReference})` : data.caseReference}</td>
                          </tr>
                          ` : ''}
                          ${data.messageSubject ? `
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Subject</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.messageSubject}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </div>
                      
                      ${data.caseDetails ? `
                      <!-- Case Details Card -->
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Case Details
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 140px;">Case Name</td>
                            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${data.caseDetails.caseName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Outstanding</td>
                            <td style="padding: 8px 0; color: #008b8b; font-weight: 700; font-size: 16px;">£${data.caseDetails.outstandingAmount}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Status</td>
                            <td style="padding: 8px 0;">
                              <span style="display: inline-block; background: ${data.caseDetails.status === 'active' ? '#dcfce7' : '#fef3c7'}; color: ${data.caseDetails.status === 'active' ? '#166534' : '#a16207'}; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 600;">
                                ${data.caseDetails.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        </table>
                      </div>
                      ` : ''}
                      
                      <!-- Message Content -->
                      <div style="background: #fafbfc; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                        <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px; font-weight: 600;">Message</h3>
                        <div style="color: #475569; line-height: 1.7; font-size: 14px; white-space: pre-wrap;">${data.messageContent}</div>
                      </div>
                      
                      <!-- CTA Button -->
                      <div style="text-align: center;">
                        <a href="https://acclaim-api.azurewebsites.net/auth" style="display: inline-block; background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(0,139,139,0.3);">
                          View in Portal →
                        </a>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated notification from the Acclaim Client Portal</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `
Message from Acclaim
${data.caseReference ? `Case: ${data.caseDetails?.caseName ? `${data.caseDetails.caseName} (${data.caseReference})` : data.caseReference}` : ''}
${data.messageSubject ? `Subject: ${data.messageSubject}` : ''}

Message:
${data.messageContent}

Please log in to the Acclaim Portal to view this message and respond if needed.
Portal: https://acclaim-api.azurewebsites.net/auth
      `;

      // Prepare attachments for APIM
      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }

      // Add user attachment if present (convert to base64) - skip video files
      if (data.attachment && data.attachment.filePath) {
        if (isVideoFile(data.attachment.fileName, data.attachment.fileType)) {
          console.log(`📎 Skipping video attachment in admin-to-user email (too large): ${data.attachment.fileName}`);
        } else {
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
      const portalUrl = data.portalUrl || 'https://acclaim-api.azurewebsites.net/auth';
      const subject = `Welcome to the Acclaim Credit Management & Recovery Portal!`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 36px; width: auto; margin-bottom: 16px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Welcome to Acclaim</h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Your account is ready</p>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Email Type Badge -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <span style="display: inline-block; background-color: #e0f2f1; background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%); color: #00695c; padding: 8px 20px; border-radius: 50px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          New Account
                        </span>
                      </div>
                      
                      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">Hello ${data.firstName},</p>
                      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">Welcome to the Acclaim Credit Management & Recovery Portal! Your account has been created and you can now access the system to view and manage your cases.</p>
                      
                      <!-- Username Card -->
                      <div style="background: #f8fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #008b8b;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 100px;">Username</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500; font-family: monospace;">${data.userEmail}</td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- CTA Button -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${portalUrl}" style="display: inline-block; background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(0,139,139,0.3);">
                          Access the Portal →
                        </a>
                      </div>
                      
                      <!-- Features Card -->
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          What you can do
                        </h3>
                        <ul style="color: #475569; line-height: 2; padding-left: 20px; margin: 0; font-size: 14px;">
                          <li>View and track your cases</li>
                          <li>Send and receive messages with our team</li>
                          <li>Access and download case documents</li>
                          <li>Track payment history</li>
                        </ul>
                      </div>

                      <!-- Note Card -->
                      <div style="background: #e0f7f6; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                        <p style="color: #00695c; margin: 0; font-size: 14px; line-height: 1.6;">
                          <strong>Note:</strong> Your temporary password will be sent in a separate email for security purposes. If you don't receive it within 5 minutes, please check your spam or junk folder.
                        </p>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated notification from the Acclaim Client Portal</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `
Welcome to the Acclaim Credit Management & Recovery Portal!

Hello ${data.firstName},

Welcome to the Acclaim Credit Management & Recovery Portal! Your account has been created and you can now access the system to view and manage your cases.

Username: ${data.userEmail}

Access the portal here: ${portalUrl}

What you can do in the portal:
- View and track your cases
- Send and receive messages with our team
- Access and download case documents
- Track payment history

Note: Your temporary password will be sent in a separate email for security purposes.

Important: If you don't receive the password email within 5 minutes, please check your spam or junk folder.

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

  async sendTemporaryPasswordEmail(data: TemporaryPasswordEmailData): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - temporary password email not sent');
      return false;
    }

    try {
      const subject = `Your Temporary Password - Acclaim Portal`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 36px; width: auto; margin-bottom: 16px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Your Temporary Password</h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Email Type Badge -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <span style="display: inline-block; background-color: #e0f2f1; background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%); color: #00695c; padding: 8px 20px; border-radius: 50px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          Account Setup
                        </span>
                      </div>
                      
                      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">Hello ${data.firstName},</p>
                      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">Here is your temporary password to access the Acclaim Portal:</p>
                      
                      <!-- Password Display -->
                      <div style="background: #f8fafb; border-radius: 12px; padding: 30px; margin-bottom: 24px; text-align: center;">
                        <p style="color: #64748b; margin: 0 0 12px 0; font-size: 13px;">Your temporary password:</p>
                        <div style="font-size: 28px; font-weight: bold; color: #008b8b; font-family: monospace; letter-spacing: 3px; background: white; padding: 20px; border-radius: 8px; border: 2px solid #008b8b;">${data.temporaryPassword}</div>
                      </div>

                      <!-- Warning Card -->
                      <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                          <strong>Important:</strong> This is a temporary password. You will be required to change it when you first log in.
                        </p>
                      </div>
                      
                      <!-- Steps Card -->
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Getting Started
                        </h3>
                        <ol style="color: #475569; line-height: 2; padding-left: 20px; margin: 0; font-size: 14px;">
                          <li>Go to the Acclaim Portal login page</li>
                          <li>Enter your email address as your username</li>
                          <li>Enter this temporary password</li>
                          <li>You will be prompted to create a new secure password</li>
                        </ol>
                      </div>

                      <!-- Security Tip -->
                      <div style="background: #fef2f2; border-radius: 12px; padding: 20px;">
                        <p style="color: #dc2626; margin: 0; font-size: 14px; line-height: 1.6;">
                          <strong>Security Tip:</strong> Please delete this email after you have logged in and changed your password.
                        </p>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated notification from the Acclaim Client Portal</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `
Your Temporary Password - Acclaim Portal

Hello ${data.firstName},

Here is your temporary password to access the Acclaim Credit Management & Recovery Portal:

Temporary Password: ${data.temporaryPassword}

IMPORTANT SECURITY NOTICE:
This is a temporary password. You will be required to change it when you first log in for security purposes.

Getting Started:
1. Go to the Acclaim Portal login page
2. Enter your email address as your username
3. Enter this temporary password
4. You will be prompted to create a new secure password

Security Tip: Please delete this email after you have logged in and changed your password.

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
      console.error('❌ Failed to send temporary password email via SendGrid:', error);
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
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 36px; width: auto; margin-bottom: 16px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Password Reset</h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Email Type Badge -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <span style="display: inline-block; background-color: #e0f2f1; background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%); color: #00695c; padding: 8px 20px; border-radius: 50px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          Security
                        </span>
                      </div>
                      
                      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">Hello ${data.userName},</p>
                      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">We received a request to reset your password. Use the code below to complete the process:</p>
                      
                      <!-- OTP Code Display -->
                      <div style="background: #f8fafb; border-radius: 12px; padding: 30px; margin-bottom: 24px; text-align: center;">
                        <p style="color: #64748b; margin: 0 0 12px 0; font-size: 13px;">Your one-time code:</p>
                        <div style="font-size: 36px; font-weight: bold; color: #008b8b; font-family: monospace; letter-spacing: 8px; background: white; padding: 20px; border-radius: 8px; border: 2px solid #008b8b;">${data.otp}</div>
                        <p style="color: #94a3b8; margin: 16px 0 0 0; font-size: 13px;">
                          Expires in ${data.expiresInMinutes} minutes
                        </p>
                      </div>

                      <!-- Warning Card -->
                      <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                          <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
                        </p>
                      </div>
                      
                      <!-- Steps Card -->
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          How to Reset
                        </h3>
                        <ol style="color: #475569; line-height: 2; padding-left: 20px; margin: 0; font-size: 14px;">
                          <li>Enter this one-time code on the reset page</li>
                          <li>Click "Login with Code"</li>
                          <li>Create your new password</li>
                        </ol>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated notification from the Acclaim Client Portal</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 36px; width: auto; margin-bottom: 16px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">New Case Submission</h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Submission ID: #${data.submissionId}</p>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Email Type Badge -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <span style="display: inline-block; background-color: #e0f2f1; background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%); color: #00695c; padding: 8px 20px; border-radius: 50px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          New Case
                        </span>
                      </div>
                      
                      <!-- Submitter Info Card -->
                      <div style="background: #f8fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #008b8b;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 120px;">Submitted By</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.firstName} ${data.lastName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Email</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${data.userEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Organisation</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.organisationName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Submitted</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${data.caseSubmission.submittedAt.toLocaleString('en-GB')}</td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- Client Details Card -->
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Client Details
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 140px;">Client Name</td>
                            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${data.caseSubmission.clientName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Client Email</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.clientEmail}</td>
                          </tr>
                          ${data.caseSubmission.clientPhone ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Client Phone</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.clientPhone}</td>
                          </tr>` : ''}
                          ${data.caseSubmission.creditorName ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Creditor Name</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.creditorName}</td>
                          </tr>` : ''}
                        </table>
                      </div>

                      <!-- Debtor Information Card -->
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Debtor Information
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 140px;">Case Name</td>
                            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${data.caseSubmission.caseName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Debtor Type</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.debtorType === 'individual' ? 'Individual/Sole Trader' : 'Organisation'}</td>
                          </tr>
                          ${debtorDetailsHtml}
                        </table>
                      </div>

                      <!-- Address Card -->
                      ${data.caseSubmission.addressLine1 ? `
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Address
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          ${data.caseSubmission.addressLine1 ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 140px;">Address Line 1</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.addressLine1}</td>
                          </tr>` : ''}
                          ${data.caseSubmission.addressLine2 ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Address Line 2</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.addressLine2}</td>
                          </tr>` : ''}
                          ${data.caseSubmission.city ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">City</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.city}</td>
                          </tr>` : ''}
                          ${data.caseSubmission.county ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">County</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.county}</td>
                          </tr>` : ''}
                          ${data.caseSubmission.postcode ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Postcode</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.postcode}</td>
                          </tr>` : ''}
                        </table>
                      </div>` : ''}

                      <!-- Contact Details Card -->
                      ${data.caseSubmission.mainPhone || data.caseSubmission.altPhone || data.caseSubmission.mainEmail || data.caseSubmission.altEmail ? `
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Contact Details
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          ${data.caseSubmission.mainPhone ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 140px;">Main Phone</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.mainPhone}</td>
                          </tr>` : ''}
                          ${data.caseSubmission.altPhone ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Alt Phone</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.altPhone}</td>
                          </tr>` : ''}
                          ${data.caseSubmission.mainEmail ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Main Email</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.mainEmail}</td>
                          </tr>` : ''}
                          ${data.caseSubmission.altEmail ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Alt Email</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.altEmail}</td>
                          </tr>` : ''}
                        </table>
                      </div>` : ''}

                      <!-- Debt Details Card -->
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Debt Details
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 140px;">Total Amount</td>
                            <td style="padding: 8px 0; color: #008b8b; font-weight: 700; font-size: 18px;">${data.caseSubmission.currency || 'GBP'} ${data.caseSubmission.totalDebtAmount}</td>
                          </tr>
                        </table>
                        ${data.caseSubmission.debtDetails ? `
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                          <p style="color: #64748b; margin: 0 0 8px 0; font-size: 13px;">Debt Description:</p>
                          <p style="color: #1e293b; margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${data.caseSubmission.debtDetails}</p>
                        </div>` : ''}
                      </div>

                      <!-- Payment Terms Card -->
                      ${data.caseSubmission.paymentTermsType ? `
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Payment Terms
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 140px;">Terms Type</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.paymentTermsType.replace(/_/g, ' ')}</td>
                          </tr>
                          ${data.caseSubmission.paymentTermsDays ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Terms Days</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.paymentTermsDays}</td>
                          </tr>` : ''}
                          ${data.caseSubmission.paymentTermsOther ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Other Terms</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.paymentTermsOther}</td>
                          </tr>` : ''}
                        </table>
                      </div>` : ''}

                      <!-- Invoice Details Card -->
                      ${data.caseSubmission.singleInvoice || data.caseSubmission.firstOverdueDate || data.caseSubmission.lastOverdueDate ? `
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Invoice Details
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          ${data.caseSubmission.singleInvoice ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 140px;">Single Invoice</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.singleInvoice === 'yes' ? 'Yes' : 'No'}</td>
                          </tr>` : ''}
                          ${data.caseSubmission.firstOverdueDate ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">First Overdue</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.firstOverdueDate}</td>
                          </tr>` : ''}
                          ${data.caseSubmission.lastOverdueDate ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Last Overdue</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.lastOverdueDate}</td>
                          </tr>` : ''}
                        </table>
                      </div>` : ''}

                      <!-- Additional Information Card -->
                      ${data.caseSubmission.additionalInfo ? `
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Additional Information
                        </h3>
                        <p style="color: #475569; margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${data.caseSubmission.additionalInfo}</p>
                      </div>` : ''}

                      <!-- Uploaded Files Card -->
                      ${data.uploadedFiles && data.uploadedFiles.length > 0 ? `
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Uploaded Files (${data.uploadedFiles.length})
                        </h3>
                        <ul style="color: #475569; margin: 0; padding-left: 20px; font-size: 14px;">
                          ${data.uploadedFiles.map(file => `
                            <li style="margin-bottom: 8px;">
                              <strong style="color: #1e293b;">${file.fileName}</strong> 
                              <span style="color: #64748b;">(${(file.fileSize / 1024).toFixed(2)} KB)</span>
                            </li>
                          `).join('')}
                        </ul>
                        <p style="color: #64748b; font-size: 13px; margin: 16px 0 0 0;">All uploaded files are attached to this email.</p>
                      </div>` : ''}

                      <!-- Excel Note -->
                      <div style="background: #e0f7f6; border-radius: 12px; padding: 20px;">
                        <p style="color: #00695c; margin: 0; font-size: 14px; line-height: 1.6;">
                          <strong>Excel Summary:</strong> A detailed spreadsheet with all case submission information is attached for your records.
                        </p>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated notification from the Acclaim Client Portal</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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

      // Add uploaded files to attachments - skip video files
      if (data.uploadedFiles && data.uploadedFiles.length > 0) {
        data.uploadedFiles.forEach(file => {
          if (isVideoFile(file.fileName, file.fileType)) {
            console.log(`📎 Skipping video attachment in case submission email (too large): ${file.fileName}`);
          } else {
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

  // Send document upload notification to admin (when user uploads)
  async sendDocumentUploadNotificationToAdmin(data: DocumentUploadNotificationData, adminEmail: string): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - document upload notification not sent');
      return false;
    }

    try {
      const subject = data.caseReference 
        ? `New Document Uploaded [${data.caseReference}] - Acclaim Portal`
        : `New Document Uploaded - ${data.organisationName} - Acclaim Portal`;

      const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 36px; width: auto; margin-bottom: 16px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Document Uploaded</h1>
                      ${data.caseReference ? `<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Case: ${data.caseReference}</p>` : ''}
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Email Type Badge -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <span style="display: inline-block; background-color: #e0f2f1; background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%); color: #00695c; padding: 8px 20px; border-radius: 50px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          Document
                        </span>
                      </div>
                      
                      <!-- Uploader Info Card -->
                      <div style="background: #f8fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #008b8b;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 120px;">Uploaded By</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.uploaderName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Email</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px;">${data.uploaderEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Organisation</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.organisationName}</td>
                          </tr>
                          ${data.caseName ? `
                          <tr>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Case Name</td>
                            <td style="padding: 6px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${data.caseName}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </div>
                      
                      <!-- Document Details Card -->
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Document Details
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 100px;">File Name</td>
                            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${data.fileName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">File Size</td>
                            <td style="padding: 8px 0; color: #1e293b;">${formatFileSize(data.fileSize)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">File Type</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.fileType}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Uploaded</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.uploadedAt.toLocaleString('en-GB')}</td>
                          </tr>
                        </table>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated notification from the Acclaim Client Portal</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `
New Document Uploaded

Uploaded By: ${data.uploaderName} (${data.uploaderEmail})
Organisation: ${data.organisationName}
${data.caseReference ? `Case Reference: ${data.caseReference}` : ''}
${data.caseName ? `Case Name: ${data.caseName}` : ''}
File Name: ${data.fileName}
File Size: ${formatFileSize(data.fileSize)}
File Type: ${data.fileType}
Uploaded: ${data.uploadedAt.toLocaleString('en-GB')}

Please log in to the Acclaim Portal to view this document.
      `;

      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }

      // Attach the uploaded document if file path is provided - skip video files
      if (data.filePath && fs.existsSync(data.filePath)) {
        if (isVideoFile(data.fileName, data.fileType)) {
          console.log(`[Email] Skipping video attachment (too large): ${data.fileName}`);
        } else {
          try {
            const fileContent = fs.readFileSync(data.filePath);
            const base64Content = fileContent.toString('base64');
            attachments.push({
              content: base64Content,
              filename: data.fileName,
              type: data.fileType || 'application/octet-stream',
              disposition: 'attachment'
            });
            console.log(`[Email] Attached document: ${data.fileName}`);
          } catch (attachError) {
            console.error(`[Email] Failed to attach document: ${attachError}`);
          }
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
      console.error('❌ Failed to send document upload notification to admin:', error);
      return false;
    }
  }

  // Send document upload notification to user (when admin uploads)
  async sendDocumentUploadNotificationToUser(data: DocumentUploadNotificationData, userEmail: string): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - document upload notification not sent');
      return false;
    }

    try {
      const subject = data.caseReference 
        ? `New Document Available [${data.caseReference}] - Acclaim Portal`
        : `New Document Available - Acclaim Portal`;

      const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 36px; width: auto; margin-bottom: 16px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">New Document Available</h1>
                      ${data.caseReference && data.caseName ? `<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">${data.caseName} (${data.caseReference})</p>` : data.caseReference ? `<p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Case: ${data.caseReference}</p>` : ''}
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      
                      <!-- Email Type Badge -->
                      <div style="text-align: center; margin-bottom: 30px;">
                        <span style="display: inline-block; background-color: #e0f2f1; background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%); color: #00695c; padding: 8px 20px; border-radius: 50px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          Document
                        </span>
                      </div>
                      
                      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">A new document has been added to your portal and is ready for you to view.</p>
                      
                      <!-- Document Details Card -->
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; font-weight: 600;">
                          <span style="display: inline-block; width: 4px; height: 16px; background: #008b8b; border-radius: 2px; margin-right: 10px; vertical-align: middle;"></span>
                          Document Details
                        </h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                          ${data.caseName ? `
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 100px;">Case Name</td>
                            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${data.caseName}</td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 100px;">File Name</td>
                            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${data.fileName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">File Size</td>
                            <td style="padding: 8px 0; color: #1e293b;">${formatFileSize(data.fileSize)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b;">Uploaded</td>
                            <td style="padding: 8px 0; color: #1e293b;">${data.uploadedAt.toLocaleString('en-GB')}</td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- CTA Button -->
                      <div style="text-align: center;">
                        <a href="https://acclaim-api.azurewebsites.net/auth" style="display: inline-block; background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(0,139,139,0.3);">
                          View in Portal →
                        </a>
                      </div>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px 40px; text-align: center; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated notification from the Acclaim Client Portal</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `
New Document Available

A new document has been uploaded to your portal.

${data.caseReference ? `Case: ${data.caseName ? `${data.caseName} (${data.caseReference})` : data.caseReference}` : ''}
File Name: ${data.fileName}
File Size: ${formatFileSize(data.fileSize)}
Uploaded: ${data.uploadedAt.toLocaleString('en-GB')}

Please log in to the Acclaim Portal to view and download this document.
Portal: https://acclaim-api.azurewebsites.net/auth
      `;

      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }

      // Attach the uploaded document if file path is provided - skip video files
      if (data.filePath && fs.existsSync(data.filePath)) {
        if (isVideoFile(data.fileName, data.fileType)) {
          console.log(`[Email] Skipping video attachment for user (too large): ${data.fileName}`);
        } else {
          try {
            const fileContent = fs.readFileSync(data.filePath);
            const base64Content = fileContent.toString('base64');
            attachments.push({
              content: base64Content,
              filename: data.fileName,
              type: data.fileType || 'application/octet-stream',
              disposition: 'attachment'
            });
            console.log(`[Email] Attached document for user: ${data.fileName}`);
          } catch (attachError) {
            console.error(`[Email] Failed to attach document for user: ${attachError}`);
          }
        }
      }

      return await this.sendViaAPIM({
        to: userEmail,
        subject: subject,
        textContent: textContent,
        htmlContent: htmlContent,
        attachments: attachments
      });
    } catch (error) {
      console.error('❌ Failed to send document upload notification to user:', error);
      return false;
    }
  }

  // Send member request notification to admin
  async sendMemberRequestNotification(data: {
    orgId: number;
    orgName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    memberType: 'member' | 'owner';
    requestedBy: string;
    requestedByEmail: string;
  }): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - member request email not sent');
      return false;
    }

    try {
      const subject = `New Member Request: ${data.firstName} ${data.lastName} for ${data.orgName}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 36px; width: auto; margin-bottom: 16px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">New Member Request</h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Organisation: ${data.orgName}</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">First Name</span>
                            <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 16px;">${data.firstName}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Surname</span>
                            <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 16px;">${data.lastName}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Email</span>
                            <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 16px;"><a href="mailto:${data.email}" style="color: #008b8b;">${data.email}</a></p>
                          </td>
                        </tr>
                        ${data.phone ? `
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Phone</span>
                            <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 16px;">${data.phone}</p>
                          </td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Member Type</span>
                            <p style="margin: 4px 0 0 0;">
                              <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500; ${data.memberType === 'owner' ? 'background-color: #fef3c7; color: #92400e;' : 'background-color: #d1fae5; color: #065f46;'}">
                                ${data.memberType === 'owner' ? 'Owner' : 'Member'}
                              </span>
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Requested By -->
                      <div style="margin-top: 24px; padding: 16px; background-color: #e0f2f1; border-radius: 8px;">
                        <p style="margin: 0; color: #008b8b; font-size: 14px;">
                          <strong>Requested by:</strong> ${data.requestedBy} (${data.requestedByEmail})
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px; text-align: center;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This request was submitted via the Acclaim Client Portal</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `
New Member Request

Organisation: ${data.orgName}

Member Details:
- First Name: ${data.firstName}
- Surname: ${data.lastName}
- Email: ${data.email}
${data.phone ? `- Phone: ${data.phone}` : ''}
- Member Type: ${data.memberType === 'owner' ? 'Owner' : 'Member'}

Requested by: ${data.requestedBy} (${data.requestedByEmail})

This request was submitted via the Acclaim Client Portal.
      `;

      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }

      return await this.sendViaAPIM({
        to: 'email@acclaim.law',
        subject: subject,
        textContent: textContent,
        htmlContent: htmlContent,
        attachments: attachments
      });
    } catch (error) {
      console.error('❌ Failed to send member request notification:', error);
      return false;
    }
  }

  // Send org owner request (member removal, owner delegation, or ownership removal)
  async sendOrgOwnerRequest(data: {
    type: 'member-removal' | 'owner-delegation' | 'ownership-removal';
    orgName: string;
    targetUserName: string;
    targetUserEmail: string;
    reason: string;
    requestedBy: string;
    requestedByEmail: string;
  }): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - org owner request email not sent');
      return false;
    }

    try {
      const isRemoval = data.type === 'member-removal';
      const isOwnershipRemoval = data.type === 'ownership-removal';
      
      let subject: string;
      let headerTitle: string;
      let actionDescription: string;
      
      if (isRemoval) {
        subject = `Member Removal Request: ${data.targetUserName} from ${data.orgName}`;
        headerTitle = 'Member Removal Request';
        actionDescription = 'has requested to remove the following member from their organisation';
      } else if (isOwnershipRemoval) {
        subject = `Ownership Removal Request: ${data.targetUserName} from ${data.orgName}`;
        headerTitle = 'Ownership Removal Request';
        actionDescription = 'has requested to remove Owner status from the following member';
      } else {
        subject = `Owner Delegation Request: ${data.targetUserName} for ${data.orgName}`;
        headerTitle = 'Owner Delegation Request';
        actionDescription = 'has requested to grant Owner status to the following member';
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: ${isRemoval ? '#dc2626' : isOwnershipRemoval ? '#ea580c' : '#f59e0b'}; background: linear-gradient(135deg, ${isRemoval ? '#dc2626' : isOwnershipRemoval ? '#ea580c' : '#f59e0b'} 0%, ${isRemoval ? '#b91c1c' : isOwnershipRemoval ? '#c2410c' : '#d97706'} 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 36px; width: auto; margin-bottom: 16px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">${headerTitle}</h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Organisation: ${data.orgName}</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 14px;">
                        <strong>${data.requestedBy}</strong> (${data.requestedByEmail}) ${actionDescription}:
                      </p>
                      
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Name</span>
                            <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 16px;">${data.targetUserName}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Email</span>
                            <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 16px;"><a href="mailto:${data.targetUserEmail}" style="color: #008b8b;">${data.targetUserEmail}</a></p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Request Type</span>
                            <p style="margin: 4px 0 0 0;">
                              <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500; ${isRemoval ? 'background-color: #fef2f2; color: #dc2626;' : isOwnershipRemoval ? 'background-color: #fff7ed; color: #c2410c;' : 'background-color: #fef3c7; color: #92400e;'}">
                                ${isRemoval ? 'Remove from Organisation' : isOwnershipRemoval ? 'Remove Owner Status' : 'Grant Owner Status'}
                              </span>
                            </p>
                          </td>
                        </tr>
                        ${data.reason && data.reason !== 'No reason provided' ? `
                        <tr>
                          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                            <span style="color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Reason</span>
                            <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 14px;">${data.reason}</p>
                          </td>
                        </tr>
                        ` : ''}
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px; text-align: center;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This request was submitted via the Acclaim Client Portal</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `
${headerTitle}

Organisation: ${data.orgName}

${data.requestedBy} (${data.requestedByEmail}) ${actionDescription}:

Member Details:
- Name: ${data.targetUserName}
- Email: ${data.targetUserEmail}
- Request Type: ${isRemoval ? 'Remove from Organisation' : 'Grant Owner Status'}
${data.reason && data.reason !== 'No reason provided' ? `- Reason: ${data.reason}` : ''}

This request was submitted via the Acclaim Client Portal.
      `;

      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }

      return await this.sendViaAPIM({
        to: 'email@acclaim.law',
        subject: subject,
        textContent: textContent,
        htmlContent: htmlContent,
        attachments: attachments
      });
    } catch (error) {
      console.error('❌ Failed to send org owner request:', error);
      return false;
    }
  }

  async sendLoginNotification(data: LoginNotificationData): Promise<boolean> {
    if (!this.initialized) {
      console.log('[Email] Login notification not sent - service not initialized');
      return false;
    }

    try {
      const loginTime = new Date(data.loginTime).toLocaleString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });

      // Parse user agent for friendly display
      const browserInfo = this.parseUserAgent(data.userAgent);
      
      const loginMethodDisplay = {
        'password': 'Password',
        'azure_sso': 'Microsoft Account (Azure SSO)',
        'otp': 'One-Time Password'
      }[data.loginMethod] || data.loginMethod;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #0d9488; background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
                      <img src="cid:logo" alt="Acclaim" style="height: 50px; margin-bottom: 16px;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">New Login to Your Account</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 24px;">
                        Dear ${data.userName},
                      </p>
                      
                      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 24px;">
                        We detected a new login to your Acclaim Portal account. If this was you, no action is required.
                      </p>
                      
                      <!-- Login Details Box -->
                      <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 20px;">
                            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Login Details</h3>
                            <table width="100%" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px; vertical-align: top;">Time:</td>
                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${loginTime}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Method:</td>
                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${loginMethodDisplay}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Browser:</td>
                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${browserInfo}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">IP Address:</td>
                                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${data.ipAddress}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Warning Box -->
                      <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 16px;">
                            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 20px;">
                              <strong>Wasn't you?</strong><br>
                              If you didn't log in at this time, please contact Acclaim immediately to secure your account.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        Kind regards,<br>
                        The Acclaim Team
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px; text-align: center; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">
                        This is a security notification from the Acclaim Client Portal.
                      </p>
                      <p style="margin: 0; color: #6b7280; font-size: 11px;">
                        You can disable these login notifications in your Profile Settings.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const textContent = `
Dear ${data.userName},

We detected a new login to your Acclaim Portal account.

Login Details:
- Time: ${loginTime}
- Method: ${loginMethodDisplay}
- Browser: ${browserInfo}
- IP Address: ${data.ipAddress}

If this was you, no action is required.

Wasn't you?
If you didn't log in at this time, please contact Acclaim immediately to secure your account.

Kind regards,
The Acclaim Team

---
This is a security notification from the Acclaim Client Portal.
You can disable these login notifications in your Profile Settings.
      `;

      const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
      const logoBase64 = getLogoBase64();
      if (logoBase64) {
        attachments.push(logoBase64);
      }

      const result = await this.sendViaAPIM({
        to: data.userEmail,
        subject: 'New Login to Your Acclaim Portal Account',
        textContent: textContent,
        htmlContent: htmlContent,
        attachments: attachments
      });

      if (result) {
        console.log(`[Email] Login notification sent to ${data.userEmail}`);
      }
      return result;
    } catch (error) {
      console.error('❌ Failed to send login notification:', error);
      return false;
    }
  }

  private parseUserAgent(userAgent: string): string {
    if (!userAgent || userAgent === 'unknown') {
      return 'Unknown browser';
    }
    
    // Extract browser and OS info
    let browser = 'Unknown browser';
    let os = '';
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      const match = userAgent.match(/Chrome\/(\d+)/);
      browser = match ? `Chrome ${match[1]}` : 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/(\d+)/);
      browser = match ? `Firefox ${match[1]}` : 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      const match = userAgent.match(/Version\/(\d+)/);
      browser = match ? `Safari ${match[1]}` : 'Safari';
    } else if (userAgent.includes('Edg')) {
      const match = userAgent.match(/Edg\/(\d+)/);
      browser = match ? `Microsoft Edge ${match[1]}` : 'Microsoft Edge';
    }
    
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    }
    
    return os ? `${browser} on ${os}` : browser;
  }

  async sendBroadcastEmail(data: {
    toEmail: string;
    bccEmails: string[];
    subject: string;
    body: string;
    senderName: string;
  }): Promise<boolean> {
    if (!this.initialized) {
      console.log('❌ SendGrid not configured - broadcast email not sent');
      return false;
    }

    try {
      const plainTextBody = data.body;
      const htmlBody = data.body.split('\n').map(line => {
        if (line.trim() === '') return '<br/>';
        if (line.startsWith('•')) return `<li style="margin-left: 20px;">${line.substring(1).trim()}</li>`;
        return `<p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px; line-height: 1.6;">${line}</p>`;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #008b8b; background: linear-gradient(135deg, #008b8b 0%, #006666 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <img src="cid:logo" alt="Acclaim" style="height: 48px; width: auto; margin-bottom: 12px;" />
                      <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600; letter-spacing: -0.5px;">Acclaim Portal</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #008b8b; font-size: 20px; font-weight: 600;">${data.subject}</h2>
                      <div style="margin-top: 16px;">
                        ${htmlBody}
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 24px; text-align: center;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        Chadwick Lawrence LLP | &copy; ${new Date().getFullYear()}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const success = await this.sendViaAPIM({
        to: data.toEmail,
        bcc: data.bccEmails,
        subject: data.subject,
        html: htmlContent,
        text: plainTextBody,
        attachLogo: true
      });

      if (success) {
        console.log(`✅ Broadcast email sent to ${data.bccEmails.length} recipients (via BCC)`);
      }

      return success;
    } catch (error) {
      console.error('Error sending broadcast email:', error);
      return false;
    }
  }
}

// Export singleton instance
export const sendGridEmailService = new SendGridEmailService();

// Standalone function for sending scheduled reports with Excel and HTML attachments
export async function sendScheduledReportEmailWithAttachments(
  recipientEmail: string,
  recipientName: string,
  frequencyText: string,
  excelBuffer: Buffer,
  htmlBuffer: Buffer,
  baseFileName: string
): Promise<boolean> {
  try {
    const APIM_KEY = process.env.APIM_SUBSCRIPTION_KEY;
    if (!APIM_KEY) {
      console.error('[ScheduledReport] APIM subscription key not configured');
      return false;
    }

    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #0d9488; background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
                    <img src="cid:logo" alt="Acclaim" style="height: 50px; margin-bottom: 16px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${frequencyText} Report - ${today}</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 24px;">
                      Dear ${recipientName},
                    </p>
                    <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 24px;">
                      Please find attached your ${frequencyText.toLowerCase()} report from the Acclaim Client Portal. This report contains:
                    </p>
                    
                    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #374151; font-size: 16px; line-height: 28px;">
                      <li><strong>Case Summary</strong> - Overview of your cases including status and amounts</li>
                      <li><strong>Messages Report</strong> - Recent messages and document activity</li>
                    </ul>
                    
                    <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 24px;">
                      <strong>Two files are attached:</strong><br>
                      - <strong>HTML</strong> for quick viewing in any browser<br>
                      - <strong>Excel</strong> for detailed analysis with separate tabs
                    </p>
                    
                    <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 24px;">
                      You can adjust your report preferences in your Profile settings.
                    </p>
                    
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      Kind regards,<br>
                      The Acclaim Team
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1f2937; padding: 24px; text-align: center; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      This is an automated message from the Acclaim Client Portal
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const textContent = `
Dear ${recipientName},

Please find attached your ${frequencyText.toLowerCase()} report from the Acclaim Client Portal.

This report contains:
- Case Summary: Overview of your cases including status and amounts
- Messages Report: Recent messages and document activity

Two files are attached:
- HTML for quick viewing in any browser
- Excel for detailed analysis with separate tabs

Kind regards,
The Acclaim Team
    `;

    const attachments: Array<{ content: string; filename: string; type: string; disposition?: string; content_id?: string }> = [];
    
    // Add logo
    const logoBase64 = getLogoBase64();
    if (logoBase64) {
      attachments.push(logoBase64);
    }

    // Add HTML report first (easy to view in any browser)
    attachments.push({
      content: htmlBuffer.toString('base64'),
      filename: baseFileName + '.html',
      type: 'text/html',
      disposition: 'attachment'
    });

    // Add Excel report
    attachments.push({
      content: excelBuffer.toString('base64'),
      filename: baseFileName + '.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment'
    });

    const emailPayload = {
      personalizations: [{
        to: [{ email: recipientEmail }]
      }],
      from: { email: 'email@acclaim.law', name: 'Acclaim Credit Management' },
      subject: `Your ${frequencyText} Report from Acclaim`,
      content: [
        { type: 'text/plain', value: textContent },
        { type: 'text/html', value: htmlContent }
      ],
      attachments: attachments
    };

    const response = await fetch(APIM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': APIM_KEY
      },
      body: JSON.stringify(emailPayload)
    });

    if (response.ok || response.status === 202) {
      console.log(`[ScheduledReport] Successfully sent ${frequencyText} report to ${recipientEmail}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`[ScheduledReport] Failed to send report: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('[ScheduledReport] Error sending scheduled report email:', error);
    return false;
  }
}
