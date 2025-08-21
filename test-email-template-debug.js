import fetch from 'node-fetch';

async function debugEmailTemplate() {
  console.log('🔍 Debugging email template and delivery issues...');
  
  // Test with a simple message to see if emails actually get delivered
  const formData = new URLSearchParams();
  formData.append('subject', 'Email Template Debug Test');
  formData.append('message', 'Simple test to check if emails are actually delivered to perry367@gmail.com');
  formData.append('senderName', 'Email Debug System');
  formData.append('messageType', 'case_update');
  formData.append('sendNotifications', 'true');
  
  try {
    console.log('📤 Sending simple test message...');
    
    const response = await fetch('http://localhost:5000/api/external/cases/Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });
    
    const responseData = await response.json();
    
    console.log(`📨 Response Status: ${response.status}`);
    console.log('📧 Email delivery details:', {
      requested: responseData.notificationInfo?.requested,
      sent: responseData.notificationInfo?.sent
    });
    
    if (response.ok && responseData.notificationInfo?.sent > 0) {
      console.log('\n📧 EMAIL SYSTEM STATUS:');
      console.log('✅ SendGrid integration: Working');
      console.log('✅ Message creation: Successful');  
      console.log('✅ Email notifications: Sent');
      console.log('\n🔍 Possible delivery issues:');
      console.log('1. Email template HTML/CSS causing spam filters');
      console.log('2. Case details section breaking email rendering');
      console.log('3. Logo attachment causing delivery problems');
      console.log('4. Email ending up in spam/junk folder');
      console.log('5. Gmail blocking due to template complexity');
      
      console.log('\n💡 RECOMMENDATION:');
      console.log('Check spam/junk folder in perry367@gmail.com');
      console.log('Email may be delivered but filtered by Gmail');
    }
    
  } catch (error) {
    console.error('❌ Error in email template debug:', error);
  }
}

debugEmailTemplate().catch(console.error);