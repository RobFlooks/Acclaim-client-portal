import fetch from 'node-fetch';

async function testSimpleEmail() {
  console.log('🔍 Testing with simplified email template to isolate delivery issues...');
  
  // Let's create a much simpler email to test if the template complexity is the issue
  console.log('📧 Sending basic notification without complex HTML...');
  
  try {
    const response = await fetch('http://localhost:5000/api/external/cases/Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        subject: 'SIMPLE EMAIL TEST',
        message: 'This is a very simple test message to check if emails reach perry367@gmail.com without complex templates',
        senderName: 'Simple Email Test',
        messageType: 'case_update',
        sendNotifications: 'true'
      }).toString()
    });
    
    const data = await response.json();
    
    console.log('📧 Response:', {
      status: response.status,
      emailsSent: data.notificationInfo?.sent,
      success: response.ok
    });
    
    if (response.ok && data.notificationInfo?.sent > 0) {
      console.log('\n🎯 DIAGNOSIS:');
      console.log('✅ SendGrid accepting emails');
      console.log('✅ Email service functional');
      console.log('❓ Emails not reaching inbox');
      console.log('\n💡 LIKELY CAUSES:');
      console.log('1. Complex HTML template causing spam filtering');
      console.log('2. Logo attachment being flagged as suspicious');
      console.log('3. Case details table structure triggering filters');
      console.log('4. Gmail categorizing as promotional/spam');
      console.log('\n🔧 SOLUTION:');
      console.log('Simplify email template and remove complex styling');
    }
    
  } catch (error) {
    console.error('❌ Simple email test failed:', error);
  }
}

testSimpleEmail().catch(console.error);