import nodemailer from 'nodemailer';

async function testDirectEmail() {
  console.log('🔍 Testing direct SendGrid email delivery...');
  
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
    console.log('📧 Attempting to send test email...');
    
    const info = await transporter.sendMail({
      from: '"Acclaim Credit Management" <email@acclaim.law>',
      to: 'pez474@yahoo.com',
      subject: 'Direct SendGrid Test - Email Delivery Verification',
      text: 'This is a direct test of SendGrid email delivery. If you receive this email, the SendGrid configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #14b8a6;">Direct SendGrid Test</h2>
          <p>This is a direct test of SendGrid email delivery.</p>
          <p>If you receive this email, the SendGrid configuration is working correctly.</p>
          <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>From:</strong> Acclaim Credit Management System</p>
          <p><strong>To:</strong> pez474@yahoo.com</p>
        </div>
      `
    });
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    console.log('📧 Accepted:', info.accepted);
    console.log('📧 Rejected:', info.rejected);
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode
    });
  }
}

testDirectEmail().catch(console.error);