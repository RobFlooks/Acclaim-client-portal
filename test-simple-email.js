import nodemailer from 'nodemailer';

async function testSimpleEmail() {
  try {
    // Create a basic SendGrid transporter
    const transporter = nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });

    console.log('Testing simple email delivery...');
    
    const result = await transporter.sendMail({
      from: '"Test System" <email@acclaim.law>',
      to: 'pez474@yahoo.com',
      subject: 'Simple Email Test - No Templates',
      text: 'This is a very simple test email with no HTML templates or attachments. Just plain text to test basic delivery.',
      html: '<p>This is a very simple test email with no HTML templates or attachments. Just plain text to test basic delivery.</p>'
    });

    console.log('✅ Simple email sent successfully:');
    console.log('Message ID:', result.messageId);
    console.log('Response:', result.response);
    console.log('Accepted:', result.accepted);
    console.log('Rejected:', result.rejected);
    
  } catch (error) {
    console.error('❌ Simple email test failed:', error);
  }
}

testSimpleEmail();