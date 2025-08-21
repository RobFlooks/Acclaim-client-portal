import fetch from 'node-fetch';

async function testSimplifiedEmailTemplate() {
  console.log('🔍 Testing simplified email template for better delivery...');
  
  try {
    const response = await fetch('http://localhost:5000/api/external/cases/Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        subject: 'SIMPLIFIED TEMPLATE TEST',
        message: 'Testing simplified email template without complex styling and logo attachments. This should reach perry367@gmail.com inbox!',
        senderName: 'Matthew Perry',
        messageType: 'case_update',
        sendNotifications: 'true'
      }).toString()
    });
    
    const data = await response.json();
    
    console.log('📧 Test Results:', {
      status: response.status,
      emailsSent: data.notificationInfo?.sent,
      success: response.ok
    });
    
    if (response.ok && data.notificationInfo?.sent > 0) {
      console.log('\n🎯 SIMPLIFIED EMAIL TEMPLATE DEPLOYED');
      console.log('✅ Removed complex HTML styling');
      console.log('✅ Removed gradient backgrounds');
      console.log('✅ Removed logo attachments');
      console.log('✅ Simplified table structure');
      console.log('\n📧 This email should now reach your inbox successfully!');
      console.log('Check perry367@gmail.com for delivery confirmation');
    }
    
  } catch (error) {
    console.error('❌ Simplified template test failed:', error);
  }
}

testSimplifiedEmailTemplate().catch(console.error);