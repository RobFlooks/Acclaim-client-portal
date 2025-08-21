import { sendGridEmailService } from './server/email-service-sendgrid.js';

async function testUserMessage() {
  console.log('🔍 Testing user-to-admin message notification...');
  
  // Simulate the exact notification that should be sent when a user sends a message
  const result = await sendGridEmailService.sendMessageNotification(
    {
      userEmail: 'perry367@gmail.com',
      userName: 'Matt Perry (Test User)',
      messageSubject: 'Test Message for Email Verification',
      messageContent: 'This is a test message to verify that user-to-admin email notifications are working correctly. If you receive this email, the notification system is functioning properly.',
      caseReference: 'CLS00003-028',
      caseName: 'Test matter only',
      organisationName: 'Acclaim Credit Management',
    },
    'pez474@yahoo.com'
  );
  
  console.log(`📧 User-to-admin notification result: ${result ? 'SUCCESS' : 'FAILED'}`);
  
  if (result) {
    console.log('✅ Test message notification sent successfully!');
    console.log('📧 Check your email at pez474@yahoo.com for the notification');
  } else {
    console.log('❌ Test message notification failed');
  }
}

testUserMessage().catch(console.error);