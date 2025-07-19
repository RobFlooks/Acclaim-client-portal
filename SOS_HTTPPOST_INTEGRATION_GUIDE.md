# SOS HTTPPost Case Creation Integration Guide

## Overview

This guide explains how to create new cases in the Acclaim portal using SOS's native HTTPPost functionality. No Python coding required - just pure SOS workflow components.

## Workflow Components Used

- **SetVariables**: Prepares the JSON payload and configuration
- **HTTPPost**: Sends the API request to create the case
- **Message**: Displays the result

## Simple Implementation

### SetVariables Configuration

```
url = 'https://your-portal-domain.replit.dev/api/external/cases'
organisation_external_ref = 'CHADLAW-ORG-001'

# Build unique case reference
external_case_ref = replace('Ref ' + ConnectApp.System.Firmsname + ":" + matter.entitytype + ":" + matter.entityref," ","_")

# Create JSON payload in one line
json_payload = '{"accountNumber":"' + matter.entityref + '","caseName":"' + matter.mattername + '","debtorEmail":"' + matter.email1 + '","debtorPhone":"' + matter.phone1 + '","debtorAddress":"' + matter.address1 + ', ' + matter.address2 + ', ' + matter.address3 + ', ' + matter.postcode + '","debtorType":"individual","originalAmount":"' + matter.debtvalue + '","outstandingAmount":"' + matter.balance + '","costsAdded":"0.00","interestAdded":"0.00","feesAdded":"0.00","status":"active","stage":"pre_legal","organisationExternalRef":"' + organisation_external_ref + '","assignedTo":"Recovery Team","externalRef":"' + external_case_ref + '"}'
```

### HTTPPost Configuration

```
URL: url
ContentType: application/json
PostData: json_payload
ResponseVariable: api_response
StatusCodeVariable: http_status
```

### Message Display

```
Message: Case creation: HTTP {http_status} - {api_response}
```

## Field Mapping

| SOS Field | API Field | Description |
|-----------|-----------|-------------|
| `matter.entityref` | `accountNumber` | Case reference number |
| `matter.mattername` | `caseName` | Name of the case |
| `matter.email1` | `debtorEmail` | Debtor's email address |
| `matter.phone1` | `debtorPhone` | Debtor's phone number |
| `matter.address1-3 + postcode` | `debtorAddress` | Full address |
| `matter.debtvalue` | `originalAmount` | Original debt amount |
| `matter.balance` | `outstandingAmount` | Current balance |

## Configuration Options

### Debtor Type
Set `debtorType` to:
- `"individual"` for personal debtors
- `"company"` for business debtors

### Case Stage
Set `stage` to:
- `"pre_legal"` - Initial contact phase
- `"legal_action"` - Legal proceedings
- `"judgment"` - Judgment obtained
- `"enforcement"` - Enforcement action
- `"payment_plan"` - Payment arrangement
- `"paid"` - Fully paid
- `"closed"` - Case closed

### Case Status
Set `status` to:
- `"active"` - Case is being worked
- `"on_hold"` - Temporarily paused
- `"closed"` - Case is closed

## Response Handling

### Success Responses
- **HTTP 200**: Case updated successfully
- **HTTP 201**: New case created successfully

### Error Responses
- **HTTP 400**: Missing required fields or invalid data
- **HTTP 404**: Organisation not found
- **HTTP 500**: Server error

## Sample JSON Payload

```json
{
  "accountNumber": "CLS00003-028",
  "caseName": "John Smith Debt Recovery",
  "debtorEmail": "john.smith@email.com",
  "debtorPhone": "01234567890",
  "debtorAddress": "123 High Street, Town, County, AB1 2CD",
  "debtorType": "individual",
  "originalAmount": "5000.00",
  "outstandingAmount": "4500.00",
  "costsAdded": "0.00",
  "interestAdded": "0.00",
  "feesAdded": "0.00",
  "status": "active",
  "stage": "pre_legal",
  "organisationExternalRef": "CHADLAW-ORG-001",
  "assignedTo": "Recovery Team",
  "externalRef": "Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028"
}
```

## Advantages of HTTPPost Method

✅ **No Python Required**: Uses native SOS components only
✅ **Simpler Setup**: Fewer workflow steps
✅ **Better Error Handling**: Direct access to HTTP status codes
✅ **Easier Debugging**: Clear response messages
✅ **More Reliable**: Native SOS functionality is more stable

## Configuration Steps

1. **Update Portal URL**: Replace `your-portal-domain.replit.dev` with your actual domain
2. **Set Organisation Reference**: Update `organisation_external_ref` to match your portal organisation
3. **Configure Field Mapping**: Adjust SOS field names if your system uses different ones
4. **Set Default Values**: Configure default `debtorType`, `stage`, and `status` as needed

## Testing

1. Create a test matter in SOS with sample data
2. Run the workflow and check the response
3. Verify the case appears in the portal
4. Confirm all data fields are populated correctly

## Troubleshooting

- **HTTP 400**: Check that all required fields have values
- **HTTP 404**: Verify organisation reference exists in portal
- **HTTP 500**: Check portal logs for server errors
- **Connection errors**: Verify portal URL is accessible

This HTTPPost method provides the cleanest integration without requiring any Python scripting knowledge.