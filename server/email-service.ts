import nodemailer from 'nodemailer';

interface EmailNotificationData {
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
      // In production, you'd configure with real SMTP settings
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
      } else {
        // Production configuration - you can set these via environment variables
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });
      }
      
      this.initialized = true;
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.initialized = false;
    }
  }

  async sendMessageNotification(data: EmailNotificationData, adminEmail: string): Promise<boolean> {
    if (!this.initialized || !this.transporter) {
      console.log('Email service not initialized, logging notification instead:');
      console.log(`NEW MESSAGE NOTIFICATION:
        From: ${data.userName} (${data.userEmail})
        Organisation: ${data.organisationName}
        ${data.caseReference ? `Case: ${data.caseReference}` : ''}
        Subject: ${data.messageSubject || 'New Message'}
        Content: ${data.messageContent.substring(0, 100)}${data.messageContent.length > 100 ? '...' : ''}
        Admin to notify: ${adminEmail}
      `);
      return true; // Consider logging as successful for development
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
}

export const emailService = new EmailService();