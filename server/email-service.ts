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
    caseHandler?: string;
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
    caseHandler?: string;
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
    caseHandler?: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private initialized = false;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // For development, use Ethereal Email (test account)
      if (process.env.NODE_ENV === 'development') {
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.initialized = true;
      } else {
        // Production: Only initialize if SMTP credentials are provided
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
          this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          });
          this.initialized = true;
        } else if (process.env.SENDGRID_API_KEY) {
          // Production: Use SendGrid for email sending
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
        } else {
          // No email service configured - use console logging instead
          this.initialized = false;
          console.log('Email service: No email credentials provided, using console logging for notifications');
        }
      }
      
      if (this.initialized) {
        console.log('Email service initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.initialized = false;
    }
  }

  async sendMessageNotification(data: EmailNotificationData, adminEmail: string): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
      // Enhanced console logging for production monitoring
      console.log('\n================== NEW MESSAGE NOTIFICATION ==================');
      console.log(`📧 Email would be sent to: ${adminEmail}`);
      console.log(`👤 From: ${data.userName} (${data.userEmail})`);
      console.log(`🏢 Organisation: ${data.organisationName}`);
      if (data.caseReference) {
        console.log(`📋 Case: ${data.caseReference}`);
      }
      if (data.caseDetails) {
        console.log(`📁 Case Details:`);
        console.log(`   └─ Name: ${data.caseDetails.caseName}`);
        console.log(`   └─ Type: ${data.caseDetails.debtorType.charAt(0).toUpperCase() + data.caseDetails.debtorType.slice(1).replace('_', ' ')}`);
        console.log(`   └─ Original: £${data.caseDetails.originalAmount}`);
        console.log(`   └─ Outstanding: £${data.caseDetails.outstandingAmount}`);
        console.log(`   └─ Status: ${data.caseDetails.status.toUpperCase()}`);
        console.log(`   └─ Stage: ${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
      }
      console.log(`📝 Subject: ${data.messageSubject || 'New Message'}`);
      console.log(`💬 Message: ${data.messageContent}`);
      console.log(`⏰ Time: ${new Date().toLocaleString('en-GB')}`);
      console.log('===========================================================\n');
      
      // Log to show this was handled by fallback system
      console.log('ℹ️  Note: SMTP not configured, notification logged to console');
      return true;
    }

    try {
      const subject = data.caseReference 
        ? `New Message: ${data.messageSubject || 'User Enquiry'} [${data.caseReference}] - Acclaim Portal`
        : `New Message: ${data.messageSubject || 'User Enquiry'} - Acclaim Portal`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); background-color: #14b8a6; color: #ffffff; padding: 20px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management & Recovery" style="height: 32px; width: auto;" />
            </div>
            <h2 style="margin: 0; font-size: 18px; color: #ffffff; font-weight: 600;">New Message Received</h2>
            ${data.caseReference ? `<p style="margin: 5px 0 0 0; color: #ffffff; font-size: 14px;">Case: ${data.caseReference}</p>` : ''}
          </div>
          
          <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Message Details</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 120px;">From:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.userName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Email:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.userEmail}</td>
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
                ${data.caseDetails.caseHandler ? `
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Case Handler:</td>
                  <td style="padding: 4px 0; color: #1e293b;">${data.caseDetails.caseHandler}</td>
                </tr>
                ` : ''}
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.messageSubject || 'New Message'}</td>
                </tr>
                ${data.attachment ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Attachment:</td>
                  <td style="padding: 8px 0; color: #1e293b;">
                    📎 ${data.attachment.fileName} 
                    <span style="color: #64748b; font-size: 14px;">(${(data.attachment.fileSize / 1024).toFixed(1)}KB)</span>
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #1e293b; margin-top: 0;">Message Content</h3>
              <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #0891b2;">
                <p style="margin: 0; color: #334155; line-height: 1.6;">${data.messageContent.replace(/\n/g, '<br>')}</p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #64748b; font-size: 14px;">
                Please log in to the Acclaim Portal to respond to this message.
              </p>
            </div>
          </div>
          
          <div style="background: #1e293b; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management & Recovery Portal</p>
          </div>
        </div>
      `;

      const textContent = `
NEW MESSAGE RECEIVED - Acclaim Portal

From: ${data.userName} (${data.userEmail})
Organisation: ${data.organisationName}
${data.caseReference ? `Case Reference: ${data.caseReference}` : ''}
${data.caseDetails ? `
CASE DETAILS:
- Case Name: ${data.caseDetails.caseName}
- Debtor Type: ${data.caseDetails.debtorType.charAt(0).toUpperCase() + data.caseDetails.debtorType.slice(1).replace('_', ' ')}
- Original Amount: £${data.caseDetails.originalAmount}
- Outstanding Amount: £${data.caseDetails.outstandingAmount}
- Status: ${data.caseDetails.status.toUpperCase()}
- Current Stage: ${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}${data.caseDetails.caseHandler ? `
- Case Handler: ${data.caseDetails.caseHandler}` : ''}
` : ''}
Subject: ${data.messageSubject || 'New Message'}

Message:
${data.messageContent}

Please log in to the Acclaim Portal to respond to this message.
      `;

      const info = await this.transporter.sendMail({
        from: '"Acclaim Credit Management & Recovery" <email@acclaim.law>',
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

      if (process.env.NODE_ENV === 'development') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }

      console.log('Message notification email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  async sendAdminToUserNotification(data: AdminToUserNotificationData): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
      // Enhanced console logging for admin-to-user notifications
      console.log('\n================ ADMIN TO USER NOTIFICATION ================');
      console.log(`👤 Admin: ${data.adminName} (${data.adminEmail})`);
      console.log(`📧 User to notify: ${data.userName} (${data.userEmail})`);
      console.log(`🏢 Organisation: ${data.organisationName}`);
      if (data.caseReference) {
        console.log(`📋 Case: ${data.caseReference}`);
      }
      if (data.caseDetails) {
        console.log(`📁 Case Details:`);
        console.log(`   └─ Name: ${data.caseDetails.caseName}`);
        console.log(`   └─ Type: ${data.caseDetails.debtorType.charAt(0).toUpperCase() + data.caseDetails.debtorType.slice(1).replace('_', ' ')}`);
        console.log(`   └─ Original: £${data.caseDetails.originalAmount}`);
        console.log(`   └─ Outstanding: £${data.caseDetails.outstandingAmount}`);
        console.log(`   └─ Status: ${data.caseDetails.status.toUpperCase()}`);
        console.log(`   └─ Stage: ${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
      }
      console.log(`📝 Subject: ${data.messageSubject || 'New Message from Admin'}`);
      console.log(`💬 Message: ${data.messageContent}`);
      console.log(`⏰ Time: ${new Date().toLocaleString('en-GB')}`);
      console.log('===========================================================\n');
      
      // In-app notification fallback
      console.log('ℹ️  Note: SMTP not configured, notification logged to console');
      console.log('💡 Recommendation: User will see message in portal when they next log in');
      return true;
    }

    try {
      const subject = data.caseReference 
        ? `${data.messageSubject || 'New Message'} [${data.caseReference}] - Acclaim Portal`
        : `${data.messageSubject || 'New Message'} - Acclaim Portal`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
            <div style="margin-bottom: 10px;">
              <img src="cid:logo" alt="Acclaim Credit Management & Recovery" style="height: 40px; width: auto;" />
            </div>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">New message from administrator</p>
            ${data.caseReference ? `<p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Case: ${data.caseReference}</p>` : ''}
          </div>
          
          <div style="padding: 30px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Message Details</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">From:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.adminName}</td>
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
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.messageSubject || 'New Message from Admin'}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #1e293b; margin-top: 0;">Message Content</h3>
              <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #0891b2;">
                <p style="margin: 0; color: #334155; line-height: 1.6;">${data.messageContent.replace(/\n/g, '<br>')}</p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #64748b; font-size: 14px;">
                Please log in to the Acclaim Portal to view and respond to this message.
              </p>
            </div>
          </div>
          
          <div style="background: #1e293b; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management & Recovery Portal</p>
            <p style="margin: 8px 0 0 0; opacity: 0.7;">To manage your notification preferences, visit your Profile settings in the portal.</p>
          </div>
        </div>
      `;

      const textContent = `
NEW MESSAGE FROM ADMIN - Acclaim Portal

From: ${data.adminName}
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
Subject: ${data.messageSubject || 'New Message from Admin'}

Message:
${data.messageContent}

Please log in to the Acclaim Portal to view and respond to this message.

To manage your notification preferences, visit your Profile settings in the portal.
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

      if (process.env.NODE_ENV === 'development') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }

      console.log('Admin-to-user notification email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send admin-to-user email notification:', error);
      return false;
    }
  }

  async sendExternalMessageNotification(data: ExternalMessageNotificationData): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
      // Enhanced console logging for external API messages
      console.log('\n============== EXTERNAL API EMAIL NOTIFICATION ==============');
      console.log(`📧 Email would be sent to: ${data.userEmail}`);
      console.log(`👤 User: ${data.userName}`);
      console.log(`🏢 Organisation: ${data.organisationName}`);
      console.log(`📤 From: ${data.senderName} (External System)`);
      console.log(`📋 Case: ${data.caseReference || 'No case reference'}`);
      if (data.caseDetails) {
        console.log(`📁 Case Details:`);
        console.log(`   └─ Name: ${data.caseDetails.caseName}`);
        console.log(`   └─ Type: ${data.caseDetails.debtorType.charAt(0).toUpperCase() + data.caseDetails.debtorType.slice(1).replace('_', ' ')}`);
        console.log(`   └─ Original: £${data.caseDetails.originalAmount}`);
        console.log(`   └─ Outstanding: £${data.caseDetails.outstandingAmount}`);
        console.log(`   └─ Status: ${data.caseDetails.status.toUpperCase()}`);
        console.log(`   └─ Stage: ${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
      }
      console.log(`🔖 Type: ${data.messageType}`);
      console.log(`📝 Subject: ${data.messageSubject}`);
      console.log(`💬 Message: ${data.messageContent}`);
      console.log(`⏰ Time: ${new Date().toLocaleString('en-GB')}`);
      console.log('=============================================================\n');
      
      console.log('ℹ️  Note: Email service not configured, notification logged to console');
      return true;
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
                ${data.caseDetails.caseHandler ? `
                <tr>
                  <td style="padding: 4px 0; font-weight: bold; color: #475569;">Case Handler:</td>
                  <td style="padding: 4px 0; color: #1e293b;">${data.caseDetails.caseHandler}</td>
                </tr>
                ` : ''}
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
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #1e293b; margin-top: 0;">Update Details</h3>
              <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #0891b2;">
                <p style="margin: 0; color: #334155; line-height: 1.6;">${data.messageContent.replace(/\n/g, '<br>')}</p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: #e7f3ff; border-radius: 8px; border: 1px solid #b3d9ff;">
              <p style="color: #0277bd; font-weight: 500; margin: 0 0 8px 0;">Important Notice</p>
              <p style="color: #01579b; font-size: 14px; margin: 0;">
                This is an automated update from your external case management system. 
                Please log in to the Acclaim Portal to view full case details and respond if needed.
              </p>
            </div>
          </div>
          
          <div style="background: #1e293b; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management & Recovery Portal</p>
            <p style="margin: 8px 0 0 0; opacity: 0.7;">To manage your notification preferences, visit your Profile settings in the portal.</p>
          </div>
        </div>
      `;

      const textContent = `
CASE UPDATE NOTIFICATION - Acclaim Portal

From: ${data.senderName} (External System)
Organisation: ${data.organisationName}
${data.caseReference ? `Case Reference: ${data.caseReference}` : ''}
${data.caseDetails ? `
CASE DETAILS:
- Case Name: ${data.caseDetails.caseName}
- Debtor Type: ${data.caseDetails.debtorType.charAt(0).toUpperCase() + data.caseDetails.debtorType.slice(1).replace('_', ' ')}
- Original Amount: £${data.caseDetails.originalAmount}
- Outstanding Amount: £${data.caseDetails.outstandingAmount}
- Status: ${data.caseDetails.status.toUpperCase()}
- Current Stage: ${data.caseDetails.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}${data.caseDetails.caseHandler ? `
- Case Handler: ${data.caseDetails.caseHandler}` : ''}
` : ''}
Update Type: ${data.messageType.toUpperCase()}
Subject: ${data.messageSubject}

Update Details:
${data.messageContent}

This is an automated update from your external case management system.
Please log in to the Acclaim Portal to view full case details and respond if needed.

To manage your notification preferences, visit your Profile settings in the portal.
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

      if (process.env.NODE_ENV === 'development') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }

      console.log('External message notification email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send external message email notification:', error);
      return false;
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
      // Enhanced console logging for welcome emails
      console.log('\n================= WELCOME EMAIL NOTIFICATION =================');
      console.log(`📧 Welcome email would be sent to: ${data.userEmail}`);
      console.log(`👤 New User: ${data.firstName} ${data.lastName}`);
      console.log(`🔑 Username: ${data.userEmail}`);
      console.log(`🔐 Temporary Password: ${data.temporaryPassword}`);
      console.log(`⏰ Time: ${new Date().toLocaleString('en-GB')}`);
      console.log('===========================================================\n');
      
      console.log('ℹ️  Note: SMTP not configured, welcome email logged to console');
      return true;
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
          
          <div style="background: #1e293b; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management & Recovery Portal</p>
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

      if (process.env.NODE_ENV === 'development') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }

      console.log('Welcome email sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();