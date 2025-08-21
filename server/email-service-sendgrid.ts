import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

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
              <img src="cid:logo" alt="Acclaim Credit Management" style="height: 40px; width: auto;" />
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
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management</p>
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
        from: '"Acclaim Credit Management" <email@acclaim.law>',
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
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management" style="height: 40px; width: auto;" />
            </div>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">New message received</p>
            ${data.caseReference ? `<p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Case: ${data.caseReference}</p>` : ''}
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
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management</p>
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
        from: '"Acclaim Credit Management" <email@acclaim.law>',
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
              <img src="cid:logo" alt="Acclaim Credit Management" style="height: 40px; width: auto;" />
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
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management</p>
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
        from: '"Acclaim Credit Management" <email@acclaim.law>',
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
}

// Export singleton instance
export const sendGridEmailService = new SendGridEmailService();