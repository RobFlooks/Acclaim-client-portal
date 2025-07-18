# Quick Setup Guide: Case Activities Integration

## What Changed

Your system now works with **activity-only management**:
- ✅ No automatic activities created by the portal
- ✅ All activities must come from your case management system
- ✅ Two new API endpoints available for pushing activities

## Essential Information

### Your Portal URLs
- **Production**: `https://your-acclaim-portal.replit.app`
- **Activity API**: `https://your-acclaim-portal.replit.app/api/external/cases/{CASE_REF}/activities`

### Your Current Case Format
Based on your data, your external case references follow this format:
```
"Ref Chadwick Lawrence LLP:MA:CLS00003-028"
```

### Required Variables for Your System

```bash
# Case Identification
CASE_EXTERNAL_REF="Ref Chadwick Lawrence LLP:MA:CLS00003-028"

# Activity Details
ACTIVITY_TYPE="payment_received"         # See types below
ACTIVITY_DESCRIPTION="Payment of £250.00 received via bank transfer"
PERFORMED_BY="SYSTEM_AUTO"              # Or username
ACTIVITY_DATE="2025-01-18T13:00:00Z"    # ISO format (optional)
```

### Standard Activity Types
Use these in your `ACTIVITY_TYPE` variable:
- `payment_received` - Payment made
- `payment_reversed` - Payment refunded/reversed
- `status_change` - Case status changed
- `document_uploaded` - Document added
- `contact_made` - Debtor contacted
- `legal_action` - Legal proceedings
- `settlement_agreed` - Settlement reached
- `case_closed` - Case resolved
- `note_added` - General note/comment

## Quick Test

**Test the API with your actual case:**
```bash
curl -X POST "https://your-acclaim-portal.replit.app/api/external/cases/Ref%20Chadwick%20Lawrence%20LLP:MA:CLS00003-028/activities" \
-H "Content-Type: application/json" \
-d '{
  "activityType": "test_activity",
  "description": "Test from case management system",
  "performedBy": "TEST_USER"
}'
```

**Expected Response:**
```json
{
  "message": "Case activity created successfully",
  "activity": {...},
  "timestamp": "2025-01-18T13:00:00Z",
  "refreshRequired": true
}
```

## SOS Workflow Integration

### Simple Addition to Existing Workflow
Add this component to your current workflow:

```
HttpWebRequest PushActivity
    Initializations
        url="https://your-acclaim-portal.replit.app/api/external/cases/{CASE_EXTERNAL_REF}/activities"
        method='POST'
        ContentType='application/json'
        body='{
            "activityType": "{ACTIVITY_TYPE}",
            "description": "{ACTIVITY_DESCRIPTION}",
            "performedBy": "{PERFORMED_BY}"
        }'
    CardPosX 530
    CardPosY 500
    GOTO Success WHEN html.contains("activity created")
```

### Variables to Set in Your Workflow
Make sure these variables are populated:
- `CASE_EXTERNAL_REF` - Your case reference (e.g., "Ref Chadwick Lawrence LLP:MA:CLS00003-028")
- `ACTIVITY_TYPE` - What happened (e.g., "payment_received")
- `ACTIVITY_DESCRIPTION` - Details (e.g., "Payment of £250.00 received")
- `PERFORMED_BY` - Who did it (e.g., "SYSTEM_AUTO")

## Common Scenarios

### 1. Payment Received
```json
{
  "activityType": "payment_received",
  "description": "Payment of £250.00 received via bank transfer",
  "performedBy": "SYSTEM_AUTO"
}
```

### 2. Contact Made
```json
{
  "activityType": "contact_made",
  "description": "Phone call made to debtor - left voicemail",
  "performedBy": "AGENT_SMITH"
}
```

### 3. Status Change
```json
{
  "activityType": "status_change",
  "description": "Case status changed from new to in_progress",
  "performedBy": "SYSTEM_AUTO"
}
```

## Troubleshooting

### "Case not found"
- Check your `CASE_EXTERNAL_REF` matches exactly
- Use URL encoding for spaces: `%20` instead of space
- Example: `Ref%20Chadwick%20Lawrence%20LLP:MA:CLS00003-028`

### "Required fields missing"
- Ensure you include: `activityType`, `description`, `performedBy`
- Check JSON format is correct

### Network Issues
- Verify URL is accessible
- Check for any firewall restrictions
- Test with simple curl command first

## Next Steps

1. **Test the API** with your actual case reference
2. **Identify trigger points** in your system where activities should be created
3. **Configure your workflow** to call the API endpoint
4. **Test with real scenarios** like payments and status changes
5. **Monitor the portal** to see activities appearing in real-time

The portal refreshes every 10 seconds, so you'll see your activities appear automatically!