import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAdminToUserStyle() {
  console.log('🔍 Testing email using admin-to-user method style...');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ No SENDGRID_API_KEY found');
    return;
  }
  
  console.log('✅ SendGrid API key found');
  
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
    console.log('📧 Sending test email using admin-to-user style...');
    
    const subject = 'Test Email: Admin-to-User Style - Acclaim Portal';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center;">
          <div style="margin-bottom: 10px;">
            <img src="cid:logo" alt="Acclaim Credit Management" style="height: 40px; width: auto;" />
          </div>
          <p style="margin: 0; opacity: 0.9; font-size: 16px;">Test Message using Admin-to-User Style</p>
        </div>
        
        <div style="padding: 30px;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">Test Message Details</h2>
            <table style="width: 100%; border-spacing: 0;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 140px;">From:</td>
                <td style="padding: 8px 0; color: #1e293b;">Test Admin (Administrator)</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Organisation:</td>
                <td style="padding: 8px 0; color: #1e293b;">Acclaim Credit Management</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
                <td style="padding: 8px 0; color: #1e293b;">Admin-to-User Style Test</td>
              </tr>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1e293b; margin-top: 0;">Message Content</h3>
            <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">This is a test email using the exact same format and structure as the admin-to-user notification method. If this email is delivered, it suggests the format difference might be the issue.</div>
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
Test Message from Administrator
Organisation: Acclaim Credit Management
Subject: Admin-to-User Style Test

Message:
This is a test email using the exact same format and structure as the admin-to-user notification method. If this email is delivered, it suggests the format difference might be the issue.

Please log in to the Acclaim Portal to view this message and respond if needed.
    `;

    const info = await transporter.sendMail({
      from: '"Acclaim Credit Management" <email@acclaim.law>',
      to: 'mattperrylawyer@gmail.com',
      subject: subject,
      text: textContent,
      html: htmlContent,
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(__dirname, 'attached_assets/Acclaim rose.Cur_1752271300769.png'),
          cid: 'logo'
        }
      ]
    });
    
    console.log('✅ Admin-to-User style email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    console.log(`📧 Email details: From: "Acclaim Credit Management" <email@acclaim.law>, To: mattperrylawyer@gmail.com, Subject: ${subject}`);
    console.log(`📧 Response details:`, {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending
    });
    
  } catch (error) {
    console.error('❌ Admin-to-User style email failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode
    });
  }
}

testAdminToUserStyle().catch(console.error);