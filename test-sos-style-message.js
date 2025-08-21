import fetch from 'node-fetch';

async function testSosStyleMessage() {
  console.log('🔍 Testing SOS-style message without email notifications...');
  
  // Test what happens when SOS sends a message WITHOUT sendNotifications
  const testDataWithoutNotifications = {
    message: "Test message from SOS-style call - NO EMAIL NOTIFICATIONS",
    senderName: "SOS System Test",
    messageType: "case_update",
    subject: "SOS Message Without Email Notifications"
    // Note: sendNotifications is NOT included - this defaults to false
  };
  
  try {
    console.log('📤 Sending SOS-style message WITHOUT email notifications...');
    console.log('Data being sent:', JSON.stringify(testDataWithoutNotifications, null, 2));
    
    const response = await fetch('http://localhost:5000/api/external/cases/Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDataWithoutNotifications)
    });
    
    const responseData = await response.json();
    
    console.log('📨 Response Status:', response.status);
    console.log('📨 Response Data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('✅ SOS-style message without notifications sent successfully');
      console.log(`📧 Notifications requested: ${responseData.notificationInfo?.requested}`);
      console.log(`📧 Notifications sent: ${responseData.notificationInfo?.sent}`);
      
      if (!responseData.notificationInfo?.requested) {
        console.log('🎯 THIS EXPLAINS THE ISSUE: SOS is not requesting email notifications!');
        console.log('💡 SOS needs to include "sendNotifications": true in their API calls');
      }
    } else {
      console.log('❌ SOS-style message test failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing SOS-style message:', error);
  }
  
  // Small delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n=== NOW TESTING WITH EMAIL NOTIFICATIONS ===');
  
  // Test what happens when SOS includes sendNotifications: true
  const testDataWithNotifications = {
    message: "Test message from SOS-style call - WITH EMAIL NOTIFICATIONS",
    senderName: "SOS System Test",
    messageType: "case_update", 
    subject: "SOS Message With Email Notifications",
    sendNotifications: true // This time include it
  };
  
  try {
    console.log('📤 Sending SOS-style message WITH email notifications...');
    console.log('Data being sent:', JSON.stringify(testDataWithNotifications, null, 2));
    
    const response = await fetch('http://localhost:5000/api/external/cases/Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testDataWithNotifications)
    });
    
    const responseData = await response.json();
    
    console.log('📨 Response Status:', response.status);
    console.log('📨 Response Data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('✅ SOS-style message with notifications sent successfully');
      console.log(`📧 Notifications requested: ${responseData.notificationInfo?.requested}`);
      console.log(`📧 Notifications sent: ${responseData.notificationInfo?.sent}`);
      
      if (responseData.notificationInfo?.requested && responseData.notificationInfo?.sent > 0) {
        console.log('🎯 EMAIL NOTIFICATIONS WORK when sendNotifications: true is included!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing SOS-style message with notifications:', error);
  }
}

testSosStyleMessage().catch(console.error);