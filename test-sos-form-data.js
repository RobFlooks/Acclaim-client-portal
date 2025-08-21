import fetch from 'node-fetch';

async function testSosFormData() {
  console.log('🔍 Testing SOS-style form data exactly as SOS sends it...');
  
  // Create form data exactly as SOS workflow sends it
  const formData = new URLSearchParams();
  formData.append('subject', 'Test Subject From SOS');
  formData.append('message', 'Test message from SOS form data simulation');
  formData.append('senderName', 'Matthew Perry');
  formData.append('messageType', 'case_update');
  formData.append('sendNotifications', 'true'); // This is the key parameter
  
  try {
    console.log('📤 Sending form data as SOS would...');
    console.log('Form data being sent:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    const response = await fetch('http://localhost:5000/api/external/cases/Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });
    
    const responseData = await response.json();
    
    console.log('📨 Response Status:', response.status);
    console.log('📨 Response Data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('✅ SOS-style form data sent successfully');
      console.log(`📧 Notifications requested: ${responseData.notificationInfo?.requested}`);
      console.log(`📧 Notifications sent: ${responseData.notificationInfo?.sent}`);
      
      if (responseData.notificationInfo?.requested && responseData.notificationInfo?.sent > 0) {
        console.log('🎯 EMAIL NOTIFICATIONS WORK with SOS form data format!');
      } else if (responseData.notificationInfo?.requested === false) {
        console.log('⚠️ sendNotifications parameter not being parsed correctly from form data');
      }
    } else {
      console.log('❌ SOS-style form data test failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing SOS-style form data:', error);
  }
}

testSosFormData().catch(console.error);