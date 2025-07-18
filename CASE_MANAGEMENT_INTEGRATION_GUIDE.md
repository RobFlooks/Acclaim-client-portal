# Case Management System Integration Guide

## Overview
This guide shows how to integrate your existing case management system with the Acclaim portal using HTTP requests, similar to your current workflow.

## Authentication
All API endpoints require authentication via organisation credentials:
- `organisation_id`: Your organisation ID in the system
- `username`: Your organisation admin username
- `password`: Your organisation admin password

## Base URL
```
https://your-acclaim-portal.replit.app/api/external
```

## Case Balance Update Endpoint
This endpoint matches your existing workflow pattern for updating case balances.

### POST /api/external/case/update

**Purpose**: Update case balance information from your case management system

**Request Format**:
```
POST /api/external/case/update
Content-Type: application/x-www-form-urlencoded

organisation_id=119&username=acclaimdebt.orgadmin@lavatech.ltd.uk&password=Your_Password&external_case_ref=Ref_Chadwick_Lawrence:MA:12345&balance=456.78
```

**Request Parameters**:
- `organisation_id` (required): Your organisation ID
- `username` (required): Your organisation admin username  
- `password` (required): Your organisation admin password
- `external_case_ref` (required): The external case reference
- `balance` (optional): New case balance amount

**Success Response**:
```json
{
  "message": "Case balance updated successfully",
  "id": 123,
  "case": {
    "id": 123,
    "accountNumber": "ACC-2024-123",
    "caseName": "Example Case",
    "totalOwed": 456.78,
    "status": "active",
    "stage": "pre_legal"
  }
}
```

**Error Responses**:
- `400`: Missing required parameters
- `404`: Organisation or case not found
- `500`: Server error

## Integration with Your Workflow

### Updating Your SOS Script
Replace the HttpWebRequest section in your workflow with:

```
HttpWebRequest HttpWebRequest14
	Initializations
		url="https://your-acclaim-portal.replit.app/api/external/case/update"
		method='POST'
		postvariables="organisation_id,username,password,external_case_ref,balance"
		ContentType='application/x-www-form-urlencoded'
		IgnoreCertificateErrors=TRUE
	CardPosX 530
	CardPosY 350
	GOTO DoNothing15 WHEN html.contains("id")
	GOTO Message14
```

### Success Detection
The endpoint returns a JSON response with an "id" field when successful, which matches your existing workflow's success detection logic.

## Additional Endpoints

### Case Status Updates
**POST /api/external/cases/{external_case_ref}/status**

Update case status and stage:
```json
{
  "status": "active",
  "stage": "claim",
  "notes": "Case progressed to claim stage"
}
```

### Payment Recording
**POST /api/external/payments**

Record a payment against a case:
```json
{
  "caseExternalRef": "Ref_Chadwick_Lawrence:MA:12345",
  "amount": 100.00,
  "paymentDate": "2025-01-17",
  "paymentMethod": "BANK_TRANSFER",
  "reference": "Payment ref 123",
  "notes": "Partial payment received",
  "externalRef": "PAY-12345"
}
```

## Testing

### Test with curl
```bash
curl -X POST https://your-acclaim-portal.replit.app/api/external/case/update \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "organisation_id=119&username=test@example.com&password=testpass&external_case_ref=TEST-123&balance=500.00"
```

### Expected Response
```json
{
  "message": "Case balance updated successfully",
  "id": 123,
  "case": {
    "id": 123,
    "accountNumber": "ACC-2024-123",
    "totalOwed": 500.00
  }
}
```

## Error Handling
Your workflow should check for:
1. HTTP response contains "id" field (success)
2. HTTP error codes (400, 404, 500)
3. Network connectivity issues

## Security Notes
- All requests should use HTTPS
- Store credentials securely in your system
- Consider implementing IP whitelisting for additional security
- The password should be encrypted in transit

## Next Steps
1. Update your organisation credentials in the system
2. Test the endpoint with a sample case
3. Update your SOS workflow scripts
4. Monitor the integration for any issues

For technical support, please contact your system administrator.