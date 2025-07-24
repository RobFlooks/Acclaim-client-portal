import nodemailer from 'nodemailer';

interface EmailNotificationData {
  userEmail: string;
  userName: string;
  messageSubject?: string;
  messageContent: string;
  caseReference?: string;
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
  organisationName: string;
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
          this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          });
          this.initialized = true;
        } else {
          // No SMTP configured - use console logging instead
          this.initialized = false;
          console.log('Email service: No SMTP credentials provided, using console logging for notifications');
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
      console.log(`📝 Subject: ${data.messageSubject || 'New Message'}`);
      console.log(`💬 Message: ${data.messageContent}`);
      console.log(`⏰ Time: ${new Date().toLocaleString('en-GB')}`);
      console.log('===========================================================\n');
      
      // Log to show this was handled by fallback system
      console.log('ℹ️  Note: SMTP not configured, notification logged to console');
      return true;
    }

    try {
      const subject = `New Message: ${data.messageSubject || 'User Enquiry'} - Acclaim Portal`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0891b2 0%, #164e63 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">New Message Received</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Acclaim Credit Management Portal</p>
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
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.messageSubject || 'New Message'}</td>
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
                Please log in to the Acclaim Portal to respond to this message.
              </p>
            </div>
          </div>
          
          <div style="background: #1e293b; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management Portal</p>
          </div>
        </div>
      `;

      const textContent = `
NEW MESSAGE RECEIVED - Acclaim Portal

From: ${data.userName} (${data.userEmail})
Organisation: ${data.organisationName}
${data.caseReference ? `Case Reference: ${data.caseReference}` : ''}
Subject: ${data.messageSubject || 'New Message'}

Message:
${data.messageContent}

Please log in to the Acclaim Portal to respond to this message.
      `;

      const info = await this.transporter.sendMail({
        from: '"Acclaim Portal" <noreply@acclaim-portal.com>',
        to: adminEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
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
      const subject = `${data.messageSubject || 'New Message'} - Acclaim Portal`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #0891b2 0%, #1e293b 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Acclaim Portal</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">New message from administrator</p>
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
            <p style="margin: 0;">This is an automated notification from Acclaim Credit Management Portal</p>
          </div>
        </div>
      `;

      const textContent = `
NEW MESSAGE FROM ADMIN - Acclaim Portal

From: ${data.adminName}
Organisation: ${data.organisationName}
${data.caseReference ? `Case Reference: ${data.caseReference}` : ''}
Subject: ${data.messageSubject || 'New Message from Admin'}

Message:
${data.messageContent}

Please log in to the Acclaim Portal to view and respond to this message.
      `;

      const info = await this.transporter.sendMail({
        from: '"Acclaim Portal" <noreply@acclaim-portal.com>',
        to: data.userEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
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
}

export const emailService = new EmailService();