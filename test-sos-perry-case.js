import fetch from 'node-fetch';

async function testSOSStyleMessageToPerry() {
  console.log('🔍 Testing SOS-style message to perry367@gmail.com case...');
  
  // perry367@gmail.com's case details:
  const externalRef = 'Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028';
  const caseAccountNumber = 'CLS00003-028';
  const caseName = 'Test matter only';
  
  console.log(`📋 Case: ${caseName}`);
  console.log(`📋 Account: ${caseAccountNumber}`);
  console.log(`📋 External Ref: ${externalRef}`);
  console.log(`📧 Target User: perry367@gmail.com`);
  
  // Create form data exactly as SOS workflow sends it
  const formData = new URLSearchParams();
  formData.append('subject', 'Instructions Required'); // Same as your recent attempts
  formData.append('message', 'This is a test message from SOS workflow to check email delivery to perry367@gmail.com');
  formData.append('senderName', 'Matthew Perry');
  formData.append('messageType', 'case_update');
  formData.append('sendNotifications', 'true'); // This is the critical parameter
  
  try {
    console.log('\n📤 Sending SOS-style message with email notifications...');
    console.log('Form data being sent:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    const response = await fetch(`http://localhost:5000/api/external/cases/${externalRef}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });
    
    const responseData = await response.json();
    
    console.log('\n📨 Response Status:', response.status);
    console.log('📨 Response Data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SOS-style message sent successfully');
      console.log(`📧 Notifications requested: ${responseData.notificationInfo?.requested}`);
      console.log(`📧 Notifications sent: ${responseData.notificationInfo?.sent}`);
      
      if (responseData.notificationInfo?.requested && responseData.notificationInfo?.sent > 0) {
        console.log('\n🎯 SUCCESS! Email notifications should be delivered to:');
        console.log('   - perry367@gmail.com (case user)');
        console.log('   - seanthornhill@chadlaw.co.uk (organisation user)');
        console.log('\n💡 This proves SOS can send email notifications when sendNotifications=true');
      } else {
        console.log('\n⚠️ No email notifications sent - parameter missing or disabled');
      }
    } else {
      console.log('\n❌ SOS-style message test failed');
      console.log('Error:', responseData);
    }
    
  } catch (error) {
    console.error('\n❌ Error testing SOS-style message:', error);
  }
}

testSOSStyleMessageToPerry().catch(console.error);