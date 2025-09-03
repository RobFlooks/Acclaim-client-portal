import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    totalDebtAmount: string;
    currency: string;
    debtDetails?: string;
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
  private transporter: nodemailer.Transporter | null = null;
  private initialized = false;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // ALWAYS prioritize SendGrid if available
      if (process.env.SENDGRID_API_KEY) {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });
        this.initialized = true;
        console.log('✅ SendGrid Email Service: REAL email delivery enabled');
        console.log('📧 Emails will be delivered to actual inboxes');
      } else {
        this.initialized = false;
        console.log('❌ SendGrid API key not found - emails will not be sent');
      }
    } catch (error) {
      console.error('Failed to initialize SendGrid email service:', error);
      this.initialized = false;
    }
  }

  async sendExternalMessageNotification(data: ExternalMessageNotificationData): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
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

      const info = await this.transporter.sendMail({
        from: '"Acclaim Credit Management & Recovery" <email@acclaim.law>',
        to: data.userEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, '../attached_assets/Acclaim rose.Cur_1752271300769.png'),
            cid: 'logo'
          }
        ]
      });

      console.log(`✅ REAL EMAIL SENT via SendGrid to: ${data.userEmail}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📋 Message ID: ${info.messageId}`);
      
      // Log full response details for bounce detection
      if (info.response) {
        console.log(`📦 SMTP Response: ${info.response}`);
      }
      if (info.rejected && info.rejected.length > 0) {
        console.log(`❌ REJECTED ADDRESSES: ${info.rejected.join(', ')}`);
      }
      if (info.pending && info.pending.length > 0) {
        console.log(`⏳ PENDING ADDRESSES: ${info.pending.join(', ')}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ SendGrid email sending failed:', error);
      return false;
    }
  }

  async sendMessageNotification(data: EmailNotificationData, adminEmail: string): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
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

      // Prepare attachments array - always include logo, add user attachment if present
      const attachments: any[] = [
        {
          filename: 'logo.png',
          path: path.join(__dirname, '../attached_assets/Acclaim rose.Cur_1752271300769.png'),
          cid: 'logo'
        }
      ];

      // Add user attachment if present
      if (data.attachment && data.attachment.filePath) {
        attachments.push({
          filename: data.attachment.fileName,
          path: data.attachment.filePath
        });
      }

      const info = await this.transporter.sendMail({
        from: '"Acclaim Credit Management & Recovery" <email@acclaim.law>',
        to: adminEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
        attachments: attachments
      });

      console.log('✅ User-to-admin email sent successfully via SendGrid:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send user-to-admin email via SendGrid:', error);
      return false;
    }
  }

  async sendAdminToUserNotification(data: AdminToUserNotificationData): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
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
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">Message from Administrator</p>
            ${data.caseReference ? `<p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Case: ${data.caseReference}</p>` : ''}
          </div>
          
          <div style="padding: 30px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Message Details</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 140px;">From:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.adminName} (Administrator)</td>
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
Message from Administrator: ${data.adminName}
Organisation: ${data.organisationName}
${data.caseReference ? `Case Reference: ${data.caseReference}` : ''}
${data.messageSubject ? `Subject: ${data.messageSubject}` : ''}

Message:
${data.messageContent}

Please log in to the Acclaim Portal to view this message and respond if needed.
      `;

      const info = await this.transporter.sendMail({
        from: '"Acclaim Credit Management & Recovery" <email@acclaim.law>',
        to: data.userEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, '../attached_assets/Acclaim rose.Cur_1752271300769.png'),
            cid: 'logo'
          }
        ]
      });

      console.log('✅ Admin-to-user email sent successfully via SendGrid:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send admin-to-user email via SendGrid:', error);
      return false;
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
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

            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #14b8a6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">
                Access Portal
              </div>
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

      const info = await this.transporter.sendMail({
        from: '"Acclaim Credit Management & Recovery" <email@acclaim.law>',
        to: data.userEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, '../attached_assets/Acclaim rose.Cur_1752271300769.png'),
            cid: 'logo'
          }
        ]
      });

      console.log('✅ Welcome email sent successfully via SendGrid:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email via SendGrid:', error);
      return false;
    }
  }

  private async generateCaseSubmissionExcel(data: CaseSubmissionNotificationData): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Case Submission Details');

    // Set up headers with styling
    worksheet.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Value', key: 'value', width: 50 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF14b8a6' }
    };

    // Add case submission data
    const submissionData = [
      { field: 'Submission ID', value: data.submissionId.toString() },
      { field: 'Case Name', value: data.caseSubmission.caseName },
      { field: 'Debtor Type', value: data.caseSubmission.debtorType },
      { field: 'Client Name', value: data.caseSubmission.clientName },
      { field: 'Client Email', value: data.caseSubmission.clientEmail },
      { field: 'Client Phone', value: data.caseSubmission.clientPhone || 'Not provided' },
      { field: 'Total Debt Amount', value: `${data.caseSubmission.currency || 'GBP'} ${data.caseSubmission.totalDebtAmount}` },
      { field: 'Debt Details', value: data.caseSubmission.debtDetails || 'Not provided' },
      { field: 'Additional Information', value: data.caseSubmission.additionalInfo || 'Not provided' },
      { field: 'Submitted By', value: data.userName },
      { field: 'Submitted By Email', value: data.userEmail },
      { field: 'Organisation', value: data.organisationName },
      { field: 'Submitted At', value: data.caseSubmission.submittedAt.toISOString() }
    ];

    worksheet.addRows(submissionData);

    // Add uploaded files section if there are any
    if (data.uploadedFiles && data.uploadedFiles.length > 0) {
      worksheet.addRow({ field: '', value: '' }); // Empty row
      worksheet.addRow({ field: 'UPLOADED FILES', value: '' });
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
    if (!this.initialized || !this.transporter) {
      console.log('❌ SendGrid not configured - case submission email not sent');
      return false;
    }

    try {
      const subject = `New Case Submission #${data.submissionId} - ${data.caseSubmission.caseName}`;

      // Generate Excel file
      const excelFilePath = await this.generateCaseSubmissionExcel(data);

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
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Case Details</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 140px;">Case Name:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.caseName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Debtor Type:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseSubmission.debtorType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Total Amount:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">${data.caseSubmission.currency || 'GBP'} ${data.caseSubmission.totalDebtAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Client Name:</td>
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
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1e293b; margin-top: 0;">Submitted By</h3>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 140px;">Name:</td>
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

            ${data.caseSubmission.debtDetails ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1e293b; margin-top: 0;">Debt Details</h3>
              <p style="color: #475569; margin: 0; white-space: pre-wrap;">${data.caseSubmission.debtDetails}</p>
            </div>
            ` : ''}

            ${data.caseSubmission.additionalInfo ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1e293b; margin-top: 0;">Additional Information</h3>
              <p style="color: #475569; margin: 0; white-space: pre-wrap;">${data.caseSubmission.additionalInfo}</p>
            </div>
            ` : ''}

            ${data.uploadedFiles && data.uploadedFiles.length > 0 ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1e293b; margin-top: 0;">Uploaded Files (${data.uploadedFiles.length})</h3>
              <ul style="color: #475569; margin: 0; padding-left: 20px;">
                ${data.uploadedFiles.map(file => `
                  <li style="margin-bottom: 5px;">
                    <strong>${file.fileName}</strong> 
                    <span style="color: #64748b; font-size: 14px;">(${(file.fileSize / 1024).toFixed(2)} KB)</span>
                  </li>
                `).join('')}
              </ul>
              <p style="color: #64748b; font-size: 14px; margin: 10px 0 0 0;">All uploaded files are attached to this email.</p>
            </div>
            ` : ''}

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

      // Prepare attachments
      const attachments = [
        {
          filename: 'logo.png',
          path: path.join(__dirname, '../attached_assets/Acclaim rose.Cur_1752271300769.png'),
          cid: 'logo'
        },
        {
          filename: `case-submission-${data.submissionId}.xlsx`,
          path: excelFilePath
        }
      ];

      // Add uploaded files to attachments
      if (data.uploadedFiles && data.uploadedFiles.length > 0) {
        data.uploadedFiles.forEach(file => {
          attachments.push({
            filename: file.fileName,
            path: file.filePath
          });
        });
      }

      const info = await this.transporter.sendMail({
        from: '"Acclaim Credit Management & Recovery" <email@acclaim.law>',
        to: 'email@acclaim.law',
        subject: subject,
        text: textContent,
        html: htmlContent,
        attachments: attachments
      });

      console.log('✅ Case submission notification sent successfully via SendGrid:', info.messageId);
      
      // Clean up the temporary Excel file
      try {
        fs.unlinkSync(excelFilePath);
      } catch (error) {
        console.error('Warning: Failed to delete temporary Excel file:', error);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send case submission notification via SendGrid:', error);
      return false;
    }
  }
}

// Export singleton instance
export const sendGridEmailService = new SendGridEmailService();