import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testExactMethodComparison() {
  console.log('🔍 Testing exact method comparison...');
  
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
  
  // Test 1: Send using sendMessageNotification method structure (user-to-admin)
  console.log('\n=== TEST 1: User-to-Admin Method Structure ===');
  try {
    const subject1 = 'New Message: Test User-to-Admin Method - Acclaim Portal';
    
    const htmlContent1 = `
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
                <td style="padding: 8px 0; color: #1e293b;">Test User (test@example.com)</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Organisation:</td>
                <td style="padding: 8px 0; color: #1e293b;">Acclaim Credit Management</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
                <td style="padding: 8px 0; color: #1e293b;">Test User-to-Admin Method</td>
              </tr>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1e293b; margin-top: 0;">Message Content</h3>
            <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">This email tests the user-to-admin notification method structure to identify delivery differences.</div>
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

    const textContent1 = `
New message from Test User (test@example.com)
Organisation: Acclaim Credit Management
Subject: Test User-to-Admin Method

Message:
This email tests the user-to-admin notification method structure to identify delivery differences.

Please log in to the Acclaim Portal to view and respond to this message.
    `;

    const info1 = await transporter.sendMail({
      from: '"Acclaim Credit Management" <email@acclaim.law>',
      to: 'mattperrylawyer@gmail.com',
      subject: subject1,
      text: textContent1,
      html: htmlContent1,
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(__dirname, 'attached_assets/Acclaim rose.Cur_1752271300769.png'),
          cid: 'logo'
        }
      ]
    });

    console.log('✅ User-to-admin email sent successfully via SendGrid:', info1.messageId);
    console.log(`📧 Email details: From: "Acclaim Credit Management" <email@acclaim.law>, To: mattperrylawyer@gmail.com, Subject: ${subject1}`);
    console.log(`📧 Response details:`, {
      messageId: info1.messageId,
      response: info1.response,
      accepted: info1.accepted,
      rejected: info1.rejected,
      pending: info1.pending
    });

  } catch (error) {
    console.error('❌ Failed to send user-to-admin email via SendGrid:', error);
  }

  // Small delay between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Send using sendAdminToUserNotification method structure (admin-to-user)
  console.log('\n=== TEST 2: Admin-to-User Method Structure ===');
  try {
    const subject2 = 'Message from Admin: Test Admin-to-User Method - Acclaim Portal';
    
    const htmlContent2 = `
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
                <td style="padding: 8px 0; color: #1e293b;">Test Admin (Administrator)</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Organisation:</td>
                <td style="padding: 8px 0; color: #1e293b;">Acclaim Credit Management</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Subject:</td>
                <td style="padding: 8px 0; color: #1e293b;">Test Admin-to-User Method</td>
              </tr>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1e293b; margin-top: 0;">Message Content</h3>
            <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">This email tests the admin-to-user notification method structure to compare with user-to-admin delivery.</div>
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

    const textContent2 = `
Message from Administrator: Test Admin
Organisation: Acclaim Credit Management
Subject: Test Admin-to-User Method

Message:
This email tests the admin-to-user notification method structure to compare with user-to-admin delivery.

Please log in to the Acclaim Portal to view this message and respond if needed.
    `;

    const info2 = await transporter.sendMail({
      from: '"Acclaim Credit Management" <email@acclaim.law>',
      to: 'mattperrylawyer@gmail.com',
      subject: subject2,
      text: textContent2,
      html: htmlContent2,
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(__dirname, 'attached_assets/Acclaim rose.Cur_1752271300769.png'),
          cid: 'logo'
        }
      ]
    });

    console.log('✅ REAL EMAIL SENT via SendGrid to: mattperrylawyer@gmail.com');
    console.log(`📧 Subject: ${subject2}`);
    console.log(`📋 Message ID: ${info2.messageId}`);
    
  } catch (error) {
    console.error('❌ SendGrid email sending failed:', error);
  }

  console.log('\n🔍 Method comparison complete. Check mattperrylawyer@gmail.com for delivery differences.');
}

testExactMethodComparison().catch(console.error);