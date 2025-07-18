# Case Message Integration Guide

## Overview
This guide shows how to send messages from your case management system to specific cases in the Acclaim portal.

## Message Endpoint

### POST /api/external/cases/{externalRef}/messages

**Purpose**: Send a message linked to a specific case from your external system

**URL Format**:
```
https://your-portal.replit.app/api/external/cases/{EXTERNAL_CASE_REF}/messages
```

**Required Parameters**:
- `message` (required): The message content
- `senderName` (required): Name of the person sending the message
- `messageType` (optional): Type of message (defaults to 'case_update')
- `subject` (optional): Custom subject line for the message

**Message Types**:
- `case_update` - General case update
- `payment_received` - Payment notification
- `document_uploaded` - Document notification
- `contact_made` - Contact attempt notification
- `status_change` - Status change notification
- `urgent` - Urgent message
- `reminder` - Reminder message

## Custom Subject Support

You can now provide your own custom subject line when sending messages from the case management system:

### With Custom Subject
```
# Variables
subject = 'Payment Reminder - Account ' + matter.entityref
message = 'This is a payment reminder for the outstanding balance'
senderName = 'Collections Team'
messageType = 'reminder'
```

### Without Custom Subject (Automatic)
```
# Variables (no subject provided)
message = 'This is a payment reminder for the outstanding balance'
senderName = 'Collections Team'
messageType = 'reminder'
# System will generate: "reminder: [Case Name]"
```

## SOS Workflow Implementation

### Form Data Format (Recommended for SOS)
```
HttpWebRequest SendMessage
    Initializations
        url = url
        method = 'POST'
        ContentType = 'application/x-www-form-urlencoded'
        Postvariables = 'message,senderName,messageType,subject'
        IgnoreCertificateErrors = TRUE
    CardPosX 230
    CardPosY 10
    GOTO Success WHEN html.contains("message created")
    GOTO Error
```

**Note**: Include `subject` in the `Postvariables` list if you want to send a custom subject. If you omit it, the system will generate one automatically.

### Variables Setup
```
# Build external case reference (use underscores as stored in database)
external_case_ref = 'Ref_' + ConnectApp.System.Firmsname + "_" + matter.entitytype + "_" + matter.entityref

# Build the URL
url = 'https://cb46d52f-84a8-405f-910d-210c6969a262-00-3p04s4dzuvkyp.spock.replit.dev/api/external/cases/' + external_case_ref + '/messages'

# Message data
message = 'This is an automated message from the case management system'
senderName = 'Matthew Perry'
messageType = 'case_update'
subject = 'Custom Subject From CMS' # Optional: Use custom subject instead of automatic generation
```

## Example Messages

### Payment Received
```
message = 'Payment of £250.00 received via bank transfer on ' + today
senderName = 'Payments Team'
messageType = 'payment_received'
```

### Document Uploaded
```
message = 'New document uploaded: ' + document_name
senderName = 'Document System'
messageType = 'document_uploaded'
```

### Status Change
```
message = 'Case status changed from ' + old_status + ' to ' + new_status
senderName = 'Case Management System'
messageType = 'status_change'
```

### Contact Made
```
message = 'Phone call made to debtor at ' + phone_number + ' - ' + call_outcome
senderName = 'Collections Team'
messageType = 'contact_made'
```

## Testing

### Test with Curl
```bash
curl -X POST "https://your-portal.replit.app/api/external/cases/Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028/messages" \
-H "Content-Type: application/x-www-form-urlencoded" \
-d "message=Test%20message%20from%20external%20system&senderName=Test%20User&messageType=case_update"
```

### Expected Response
```json
{
  "message": "Case message created successfully",
  "messageData": {
    "id": 32,
    "senderId": "jZJVUVcC3I",
    "recipientType": "case",
    "recipientId": "1",
    "subject": "case_update: TechNova Solutions Ltd",
    "content": "Test message from external system",
    "isRead": false,
    "createdAt": "2025-01-18T14:11:47.633Z"
  },
  "caseInfo": {
    "id": 1,
    "accountNumber": "ACC-2024-001",
    "caseName": "TechNova Solutions Ltd"
  },
  "timestamp": "2025-01-18T14:11:47.706Z",
  "refreshRequired": true
}
```

## Integration Points

### When to Send Messages
1. **Payment Events**: When payments are received, reversed, or failed
2. **Document Events**: When documents are uploaded or generated
3. **Status Changes**: When case status or stage changes
4. **Contact Events**: When debtor contact is made
5. **Legal Events**: When legal actions are initiated
6. **System Events**: When automated processes complete

### Message Visibility
- Messages appear in the portal's Messages section
- They are linked to the specific case
- Users can view them in both the general Messages area and the case-specific Messages tab
- Messages are marked as unread initially

## Important Notes

### External Reference Format
- Use underscores in the external reference: `Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028`
- This matches the format stored in the database
- The system automatically URL-encodes the reference

### Message Content Guidelines
- Keep messages concise but informative
- Include relevant details like amounts, dates, and outcomes
- Use clear language that users will understand
- Avoid technical jargon where possible

### Error Handling
- **"Case not found"**: Check your external reference format
- **"Required fields missing"**: Ensure message and senderName are provided
- **Network errors**: Check URL and connectivity

## Complete SOS Workflow Example

```
SetVariables MessageSetup
    Initializations
        # Build case reference
        external_case_ref = 'Ref_' + ConnectApp.System.Firmsname + "_" + matter.entitytype + "_" + matter.entityref
        
        # Build URL
        url = 'https://cb46d52f-84a8-405f-910d-210c6969a262-00-3p04s4dzuvkyp.spock.replit.dev/api/external/cases/' + external_case_ref + '/messages'
        
        # Message content
        message = 'Payment of £' + payment_amount + ' received via ' + payment_method
        senderName = 'Payments Team'
        messageType = 'payment_received'
    
    CardPosX 0
    CardPosY 0
    GOTO SendMessage

HttpWebRequest SendMessage
    Initializations
        url = url
        method = 'POST'
        ContentType = 'application/x-www-form-urlencoded'
        Postvariables = 'message,senderName,messageType'
        IgnoreCertificateErrors = TRUE
    CardPosX 230
    CardPosY 10
    GOTO Success WHEN html.contains("message created")
    GOTO Error

Message Success
    Message Message sent successfully to case: %[external_case_ref]
    Centred True
    Location system_tray
    MessageType Information
    CardPosX 510
    CardPosY 70

Message Error
    Message Error sending message: %[html]
    Centred False
    Location main_area
    MessageType Information
    CardPosX 90
    CardPosY 110
```

The message system provides an easy way to keep case stakeholders informed about important events and updates directly from your case management system.