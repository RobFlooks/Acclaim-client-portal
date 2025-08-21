import fetch from 'node-fetch';

async function testExternalMessageApi() {
  console.log('🔍 Testing external message API with email notifications...');
  
  const testData = {
    message: "Test message from debug script - checking email notification delivery",
    senderName: "Debug Test System",
    messageType: "case_update",
    subject: "Debug Email Notification Test",
    sendNotifications: true // This is critical!
  };
  
  try {
    console.log('📤 Sending test message to external API...');
    console.log('Data being sent:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:5000/api/external/cases/Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const responseData = await response.json();
    
    console.log('📨 Response Status:', response.status);
    console.log('📨 Response Data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('✅ External message API test successful');
      console.log(`📧 Notifications requested: ${responseData.notificationInfo?.requested}`);
      console.log(`📧 Notifications sent: ${responseData.notificationInfo?.sent}`);
      
      if (responseData.notificationInfo?.requested && responseData.notificationInfo?.sent > 0) {
        console.log('🎯 Email notification should have been sent to users with email preferences enabled');
      } else if (responseData.notificationInfo?.requested && responseData.notificationInfo?.sent === 0) {
        console.log('⚠️ Email notifications were requested but none were sent - check user preferences');
      } else {
        console.log('ℹ️ Email notifications were not requested');
      }
    } else {
      console.log('❌ External message API test failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing external message API:', error);
  }
}

testExternalMessageApi().catch(console.error);