# Case Management System Configuration Guide

## Overview

This guide explains how to configure your case management system to work with the new activity-only approach, where case activities are exclusively managed through external API calls.

## Key Variables and Configuration

### 1. Case Identification Variables

To identify which case to update, your system needs these variables:

```
CASE_EXTERNAL_REF = "Ref_Chadwick_Lawrence:MA:12345"
PORTAL_BASE_URL = "https://your-acclaim-portal.replit.app"
ORGANISATION_ID = "119"
USERNAME = "acclaimdebt.orgadmin@lavatech.ltd.uk"
PASSWORD = "Your_Organisation_Password"
```

### 2. Case Activities Data Structure

Your case management system should track these activity fields:

```
ACTIVITY_TYPE = "payment_received" | "payment_reversed" | "status_change" | "document_uploaded" | "contact_made" | "legal_action" | "custom"
ACTIVITY_DESCRIPTION = "Detailed description of what happened"
PERFORMED_BY = "Username or system name that performed the action"
ACTIVITY_DATE = "2025-01-18T12:00:00Z" (ISO format, optional - defaults to current time)
```

### 3. Common Activity Types

Use these standard activity types for consistency:

- `payment_received` - When a payment is made
- `payment_reversed` - When a payment is reversed/refunded
- `status_change` - When case status changes
- `document_uploaded` - When documents are added
- `contact_made` - When debtor contact is made
- `legal_action` - When legal proceedings begin
- `settlement_agreed` - When settlement is reached
- `case_closed` - When case is resolved
- `note_added` - For general notes/comments

## Implementation Examples

### Example 1: Single Activity Creation

When something happens in your case management system:

```http
POST https://your-acclaim-portal.replit.app/api/external/cases/Ref_Chadwick_Lawrence:MA:12345/activities
Content-Type: application/json

{
  "activityType": "payment_received",
  "description": "Payment of £250.00 received via bank transfer",
  "performedBy": "SYSTEM_AUTO",
  "activityDate": "2025-01-18T14:30:00Z"
}
```

### Example 2: Bulk Activity Creation

For multiple activities at once:

```http
POST https://your-acclaim-portal.replit.app/api/external/activities/bulk
Content-Type: application/json

{
  "activities": [
    {
      "caseExternalRef": "Ref_Chadwick_Lawrence:MA:12345",
      "activityType": "contact_made",
      "description": "Phone call made to debtor - no answer",
      "performedBy": "AGENT_SMITH",
      "activityDate": "2025-01-18T10:00:00Z"
    },
    {
      "caseExternalRef": "Ref_Chadwick_Lawrence:MA:12345",
      "activityType": "document_uploaded",
      "description": "Demand letter sent via post",
      "performedBy": "SYSTEM_AUTO",
      "activityDate": "2025-01-18T11:00:00Z"
    }
  ]
}
```

## SOS Workflow Integration

### Option 1: Modify Existing Workflow

Add these components to your existing SOS workflow:

```
# Activity Push Component
HttpWebRequest ActivityPush
    Initializations
        url="https://your-acclaim-portal.replit.app/api/external/cases/{CASE_EXTERNAL_REF}/activities"
        method='POST'
        ContentType='application/json'
        body='{
            "activityType": "{ACTIVITY_TYPE}",
            "description": "{ACTIVITY_DESCRIPTION}",
            "performedBy": "{PERFORMED_BY}",
            "activityDate": "{ACTIVITY_DATE}"
        }'
    CardPosX 530
    CardPosY 450
    GOTO Success WHEN html.contains("activity created")
```

### Option 2: Create Dedicated Activity Workflow

Create a separate workflow specifically for pushing activities:

```
# Variables needed:
CASE_EXTERNAL_REF = "Ref_Chadwick_Lawrence:MA:12345"
ACTIVITY_TYPE = "payment_received"
ACTIVITY_DESCRIPTION = "Payment of £{AMOUNT} received"
PERFORMED_BY = "SYSTEM_AUTO"
ACTIVITY_DATE = "{CURRENT_DATETIME}"

# HTTP Request
HttpWebRequest PushActivity
    Initializations
        url="https://your-acclaim-portal.replit.app/api/external/cases/{CASE_EXTERNAL_REF}/activities"
        method='POST'
        ContentType='application/json'
        body='{
            "activityType": "{ACTIVITY_TYPE}",
            "description": "{ACTIVITY_DESCRIPTION}",
            "performedBy": "{PERFORMED_BY}",
            "activityDate": "{ACTIVITY_DATE}"
        }'
```

## Database Query Examples

### To Get Case Activities Data

If you want to read case activities from your database to push to the portal:

```sql
SELECT 
    case_external_ref,
    activity_type,
    activity_description,
    performed_by,
    activity_date
FROM case_activities 
WHERE case_external_ref = 'Ref_Chadwick_Lawrence:MA:12345'
AND sync_status = 'pending'
ORDER BY activity_date ASC
```

### To Track Sync Status

Add a sync tracking column to your activities table:

```sql
ALTER TABLE case_activities 
ADD COLUMN sync_status VARCHAR(20) DEFAULT 'pending';

-- After successful sync:
UPDATE case_activities 
SET sync_status = 'synced' 
WHERE case_external_ref = 'Ref_Chadwick_Lawrence:MA:12345'
AND sync_status = 'pending';
```

## Automation Triggers

### When to Push Activities

Set up triggers in your case management system to push activities when:

1. **Payment Events**: Payment received, reversed, or failed
2. **Status Changes**: Case status or stage changes
3. **Document Events**: Documents uploaded or generated
4. **Contact Events**: Phone calls, emails, or meetings logged
5. **Legal Events**: Legal actions initiated or completed
6. **Manual Notes**: When staff add notes or comments

### Example Trigger Logic

```sql
-- Trigger after payment insert
CREATE TRIGGER after_payment_insert
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    INSERT INTO case_activities (
        case_external_ref,
        activity_type,
        activity_description,
        performed_by,
        activity_date,
        sync_status
    ) VALUES (
        NEW.case_external_ref,
        'payment_received',
        CONCAT('Payment of £', NEW.amount, ' received via ', NEW.payment_method),
        NEW.recorded_by,
        NEW.payment_date,
        'pending'
    );
END;
```

## Testing Your Configuration

### 1. Test Single Activity

Use this curl command to test:

```bash
curl -X POST "https://your-acclaim-portal.replit.app/api/external/cases/Ref_Chadwick_Lawrence:MA:12345/activities" \
-H "Content-Type: application/json" \
-d '{
    "activityType": "test_activity",
    "description": "Test activity from case management system",
    "performedBy": "TEST_USER",
    "activityDate": "2025-01-18T12:00:00Z"
}'
```

### 2. Check Response

Successful response should look like:

```json
{
    "message": "Case activity created successfully",
    "activity": {
        "id": 123,
        "caseId": 456,
        "activityType": "test_activity",
        "description": "Test activity from case management system",
        "performedBy": "TEST_USER",
        "activityDate": "2025-01-18T12:00:00Z"
    },
    "timestamp": "2025-01-18T12:00:00Z",
    "refreshRequired": true
}
```

## Troubleshooting

### Common Issues

1. **"Case not found"**: Check that `CASE_EXTERNAL_REF` matches exactly
2. **"Required fields missing"**: Ensure `activityType`, `description`, and `performedBy` are provided
3. **Network errors**: Check URL and network connectivity
4. **Authentication errors**: Verify API endpoints don't require authentication (they currently don't)

### Debugging Steps

1. Check case exists in portal with correct external reference
2. Verify JSON format is correct
3. Test with simple curl command first
4. Check server logs for detailed error messages

This configuration ensures your case management system can properly push activities to the portal while maintaining the case identification through external references.