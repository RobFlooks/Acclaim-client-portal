import fetch from 'node-fetch';

async function checkRecentSosAttempt() {
  console.log('🔍 Checking what went wrong with your recent SOS message attempt...');
  
  // Test the exact case reference that SOS would be trying to use
  const externalRef = 'Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028';
  
  try {
    console.log(`📤 Testing case reference: ${externalRef}`);
    
    const response = await fetch(`http://localhost:5000/api/external/cases/${externalRef}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        subject: 'Test to replicate SOS issue',
        message: 'Replicating your recent SOS attempt',
        senderName: 'Matthew Perry',
        messageType: 'case_update',
        sendNotifications: 'true'
      }).toString()
    });
    
    console.log(`📨 Response Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Message sent successfully');
      console.log(`📧 Notifications: ${data.notificationInfo?.requested ? 'Requested' : 'Not requested'}`);
      console.log(`📧 Sent: ${data.notificationInfo?.sent || 0}`);
      
      if (data.notificationInfo?.requested && data.notificationInfo?.sent > 0) {
        console.log('🎯 EMAIL SYSTEM IS WORKING - Your message should have triggered emails');
        console.log('💡 If SOS message failed, likely causes:');
        console.log('   1. Wrong case reference format');
        console.log('   2. Missing sendNotifications parameter');
        console.log('   3. SOS workflow condition not met');
      }
    } else {
      const errorData = await response.text();
      console.log('❌ Message failed:');
      console.log(`Error: ${errorData}`);
      
      if (response.status === 404) {
        console.log('🔍 This suggests case reference mismatch!');
        console.log('SOS might be using a different case reference format');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing SOS attempt:', error);
  }
}

checkRecentSosAttempt().catch(console.error);