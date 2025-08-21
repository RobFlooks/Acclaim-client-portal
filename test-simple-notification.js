import nodemailer from 'nodemailer';

async function testSimpleNotification() {
  console.log('🔍 Sending simple test notification...');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ No SENDGRID_API_KEY found');
    return;
  }
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY,
    },
  });
  
  try {
    console.log('📧 Sending user-to-admin notification test...');
    
    const info = await transporter.sendMail({
      from: '"Acclaim Credit Management" <email@acclaim.law>',
      to: 'pez474@yahoo.com',
      subject: 'New Message: Test Email Notification System - Acclaim Portal',
      text: `
New message from Matt Perry (Test User) (perry367@gmail.com)
Organisation: Acclaim Credit Management
Case Reference: CLS00003-028
Case Name: Test matter only
Subject: Test Email Notification System

Message:
This is a test message to verify that user-to-admin email notifications are working correctly. If you receive this email, the notification system is functioning properly.

Please log in to the Acclaim Portal to view and respond to this message.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">New message received</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-top: 0;">Message Details</h2>
              <table style="width: 100%; border-spacing: 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 140px;">From:</td>
                  <td style="padding: 8px 0; color: #1e293b;">Matt Perry (Test User) (perry367@gmail.com)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Organisation:</td>
                  <td style="padding: 8px 0; color: #1e293b;">Acclaim Credit Management</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Case Reference:</td>
                  <td style="padding: 8px 0; color: #1e293b;">CLS00003-028</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Case Name:</td>
                  <td style="padding: 8px 0; color: #1e293b;">Test matter only</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
                  <td style="padding: 8px 0; color: #1e293b;">Test Email Notification System</td>
                </tr>
              </table>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #1e293b; margin-top: 0;">Message Content</h3>
              <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">This is a test message to verify that user-to-admin email notifications are working correctly. If you receive this email, the notification system is functioning properly.</div>
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
      `
    });
    
    console.log('✅ User notification email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    console.log('📧 Status: Email queued for delivery to pez474@yahoo.com');
    
  } catch (error) {
    console.error('❌ User notification email failed:', error);
  }
}

testSimpleNotification().catch(console.error);