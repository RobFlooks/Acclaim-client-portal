# HttpWebRequest Configuration Issues Fixed

## Problems in Your Original Configuration:

### 1. **Missing URL Parameter**
```
❌ Original: No URL specified
✅ Fixed: URL url
```

### 2. **Incorrect Method Declaration**
```
❌ Original: method='POST' (in Initializations)
✅ Fixed: Method POST (as main parameter)
```

### 3. **Wrong PostVariables Usage**
```
❌ Original: postvariables="organisation_id,username,password,..."
✅ Fixed: PostData post_data (with actual form-encoded string)
```

### 4. **Missing Required Variables**
```
❌ Original: Missing ResponseVariable and StatusCodeVariable
✅ Fixed: ResponseVariable response_text, StatusCodeVariable status_code
```

### 5. **Missing Required API Fields**
Your original didn't include all required fields for the API:
- `originalAmount` (required)
- `outstandingAmount` (required) 
- `organisationExternalRef` (required)
- Proper field mapping

## Key Corrections Made:

### ✅ **Proper HttpWebRequest Structure:**
```
HttpWebRequest HttpWebRequest1
	URL url
	Method POST
	PostData post_data
	ContentType application/x-www-form-urlencoded
	ResponseVariable response_text
	StatusCodeVariable status_code
	IgnoreCertificateErrors TRUE
```

### ✅ **Complete Form Data String:**
```
post_data = 'accountNumber=' + account_number + '&caseName=' + case_name + '&debtorEmail=' + debtor_email + '&debtorPhone=' + debtor_phone + '&debtorAddress=' + debtor_address + '&debtorType=' + debtor_type + '&originalAmount=' + original_amount + '&outstandingAmount=' + outstanding_amount + '&costsAdded=' + costs_added + '&interestAdded=' + interest_added + '&feesAdded=' + fees_added + '&status=' + status + '&stage=' + stage + '&organisationExternalRef=' + organisation_external_ref + '&assignedTo=' + assigned_to + '&externalRef=' + external_case_ref_encoded
```

### ✅ **All Required API Fields:**
- `accountNumber`: matter.entityref
- `caseName`: matter.mattername  
- `originalAmount`: matter.debtvalue
- `outstandingAmount`: matter.balance
- `organisationExternalRef`: client.cl_code
- `externalRef`: Unique reference

### ✅ **Removed Unnecessary Fields:**
- `organisation_id`, `username`, `password` (not needed for this API)
- These were authentication fields but this API doesn't use basic auth

## Expected Response:

### Success (HTTP 201):
```json
{
  "message": "Case created successfully",
  "case": {...case data...},
  "timestamp": "2025-07-19T18:54:09.000Z",
  "refreshRequired": true
}
```

### Success (HTTP 200) - Case Updated:
```json
{
  "message": "Case updated successfully", 
  "case": {...updated case data...}
}
```

### Error (HTTP 400):
```json
{
  "message": "accountNumber, caseName, originalAmount, outstandingAmount, organisationExternalRef, and externalRef are required"
}
```

## Testing Tips:

1. **Check Status Code**: 200/201 = success, 400/404/500 = error
2. **Check Response**: Contains success message and case data
3. **Verify in Portal**: New case should appear in the cases list
4. **Check External Reference**: Should match your generated format

The corrected version should work properly with the API endpoint!