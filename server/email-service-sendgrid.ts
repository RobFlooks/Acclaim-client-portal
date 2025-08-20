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
  caseName?: string;
  organisationName: string;
}

interface AdminToUserNotificationData {
  adminName: string;
  adminEmail: string;
  userEmail: string;
  userName: string;
  messageSubject?: string;
  messageContent: string;
  caseReference?: string;
  caseName?: string;
  organisationName: string;
}

interface ExternalMessageNotificationData {
  userEmail: string;
  userName: string;
  messageSubject: string;
  messageContent: string;
  caseReference?: string;
  caseName?: string;
  organisationName: string;
  senderName: string;
  messageType: string;
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
      const subject = `${data.messageType}: ${data.messageSubject} - Acclaim Portal`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management" style="height: 40px; width: auto;" />
            </div>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">New case update received</p>
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
                ${data.caseName ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Case Name:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseName}</td>
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
              <p style="margin: 0; color: #64748b;">
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
New case update from ${data.senderName}

Organisation: ${data.organisationName}
${data.caseReference ? `Case Reference: ${data.caseReference}` : ''}
${data.caseName ? `Case Name: ${data.caseName}` : ''}
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
      const subject = data.messageSubject 
        ? `New Message: ${data.messageSubject} - Acclaim Portal`
        : 'New Message Received - Acclaim Portal';

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management" style="height: 40px; width: auto;" />
            </div>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">New message received</p>
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
                ${data.caseName ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Case Name:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.caseName}</td>
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
${data.caseName ? `Case Name: ${data.caseName}` : ''}
${data.messageSubject ? `Subject: ${data.messageSubject}` : ''}

Message:
${data.messageContent}

Please log in to the Acclaim Portal to view and respond to this message.
      `;

      const info = await this.transporter.sendMail({
        from: '"Acclaim Credit Management" <email@acclaim.law>',
        to: adminEmail,
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
      const subject = data.messageSubject 
        ? `Message from Admin: ${data.messageSubject} - Acclaim Portal`
        : 'New Message from Administrator - Acclaim Portal';

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management" style="height: 40px; width: auto;" />
            </div>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">Message from Administrator</p>
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
${data.caseName ? `Case Name: ${data.caseName}` : ''}
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