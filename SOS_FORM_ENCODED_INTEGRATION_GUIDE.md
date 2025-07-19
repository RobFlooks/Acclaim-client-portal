# SOS Form-Encoded Case Creation Guide

## Overview

This guide shows how to create cases using `application/x-www-form-urlencoded` format, which is often more compatible with SOS HTTPPost functionality than JSON.

## Simple Implementation

### Complete Workflow (3 Steps)

```
SetVariables SetVariables1
	Initializations
		url = 'https://your-portal-domain.replit.dev/api/external/cases'
		external_ref = replace('Ref ' + ConnectApp.System.Firmsname + ':' + matter.entitytype + ':' + matter.entityref,' ','_')
		
		form_data = 'accountNumber=' + matter.entityref + '&caseName=' + matter.mattername + '&debtorEmail=' + matter.email1 + '&debtorPhone=' + matter.phone1 + '&debtorAddress=' + matter.address1 + '&debtorType=individual&originalAmount=' + matter.debtvalue + '&outstandingAmount=' + matter.balance + '&costsAdded=0.00&interestAdded=0.00&feesAdded=0.00&status=active&stage=pre_legal&organisationExternalRef=CHADLAW-ORG-001&assignedTo=Recovery Team&externalRef=' + external_ref
		
	GOTO HTTPPost1

HTTPPost HTTPPost1
	URL url
	ContentType application/x-www-form-urlencoded
	PostData form_data
	ResponseVariable response
	StatusCodeVariable status
	GOTO Message1

Message Message1
	Message Case: HTTP {status} - {response}
```

## Form Data Format

### URL-Encoded String Format
```
accountNumber=CLS00003-028&caseName=John Smith Debt Recovery&debtorEmail=john@email.com&debtorPhone=01234567890&debtorAddress=123 High Street&debtorType=individual&originalAmount=5000.00&outstandingAmount=4500.00&costsAdded=0.00&interestAdded=0.00&feesAdded=0.00&status=active&stage=pre_legal&organisationExternalRef=CHADLAW-ORG-001&assignedTo=Recovery Team&externalRef=Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028
```

### Field Mapping
| Parameter | SOS Field | Description |
|-----------|-----------|-------------|
| `accountNumber` | `matter.entityref` | Case reference |
| `caseName` | `matter.mattername` | Case name |
| `debtorEmail` | `matter.email1` | Email address |
| `debtorPhone` | `matter.phone1` | Phone number |
| `debtorAddress` | `matter.address1` | Address |
| `originalAmount` | `matter.debtvalue` | Original debt |
| `outstandingAmount` | `matter.balance` | Current balance |
| `externalRef` | Generated | Unique reference |

### Static Parameters
- `debtorType`: `individual` or `company`
- `costsAdded`: `0.00` (or actual costs)
- `interestAdded`: `0.00` (or actual interest)
- `feesAdded`: `0.00` (or actual fees)
- `status`: `active`
- `stage`: `pre_legal`
- `organisationExternalRef`: `CHADLAW-ORG-001`
- `assignedTo`: `Recovery Team`

## HTTPPost Configuration

### Required Settings
- **URL**: Your portal domain + `/api/external/cases`
- **ContentType**: `application/x-www-form-urlencoded`
- **PostData**: The form_data variable
- **ResponseVariable**: `response` (stores server response)
- **StatusCodeVariable**: `status` (stores HTTP status)

## Advantages of Form-Encoded

✅ **Better SOS Compatibility**: Native HTTPPost support
✅ **No JSON Escaping**: Simpler string handling
✅ **Standard Format**: Web forms standard
✅ **Robust**: Less prone to formatting errors
✅ **Debugging**: Easier to read in logs

## Response Handling

### Success Responses
- **HTTP 200**: Existing case updated
- **HTTP 201**: New case created

### Error Responses
- **HTTP 400**: Missing required fields
- **HTTP 404**: Organisation not found
- **HTTP 500**: Server error

## Configuration

### 1. Update Portal URL
Replace `your-portal-domain.replit.dev` with your actual domain.

### 2. Set Organisation Reference
Update `organisationExternalRef=CHADLAW-ORG-001` to your organisation's reference.

### 3. Adjust Debtor Type
Change `debtorType=individual` to `debtorType=company` for business debtors.

### 4. Customise Stages
Available stages:
- `pre_legal`
- `legal_action`
- `judgment`
- `enforcement`
- `payment_plan`
- `paid`
- `closed`

## Testing

1. Run the workflow with a test matter
2. Check HTTP status code (200/201 = success)
3. Verify case appears in portal
4. Confirm all data populated correctly

## Troubleshooting

### Common Issues
- **HTTP 400**: Check required fields have values
- **HTTP 404**: Verify organisation reference exists
- **Connection errors**: Confirm portal URL is accessible

### Debugging Tips
- Check the `response` variable for error details
- Verify `status` variable shows expected HTTP codes
- Test with simple data first

This form-encoded approach provides maximum compatibility with SOS HTTPPost functionality while maintaining the same API capabilities as JSON.