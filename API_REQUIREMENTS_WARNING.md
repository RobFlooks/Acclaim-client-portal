# ⚠️ API Requirements Issue

## Problem: Missing Required Fields

The `/api/external/cases` endpoint **requires** these fields:
- `accountNumber` ✅ (you have this)
- `caseName` ✅ (you have this) 
- `originalAmount` ❌ **MISSING - REQUIRED**
- `outstandingAmount` ❌ **MISSING - REQUIRED**
- `organisationExternalRef` ✅ (you have this)
- `externalRef` ✅ (you have this)

## What Will Happen:

With only your specified fields, the API will return:
```
HTTP 400 Bad Request
{
  "message": "accountNumber, caseName, originalAmount, outstandingAmount, organisationExternalRef, and externalRef are required"
}
```

## Solutions:

### Option 1: Add Missing Required Fields
```
# Add these to your SetVariables:
original_amount = matter.debtvalue
outstanding_amount = matter.balance

# Add to post_data:
post_data = 'externalRef=' + external_case_ref_encoded + '&organisationExternalRef=' + organisation_external_ref + '&accountNumber=' + account_number + '&caseName=' + case_name + '&originalAmount=' + original_amount + '&outstandingAmount=' + outstanding_amount + '&debtorType=' + debtor_type + '&status=' + status + '&stage=' + stage + '&assignedTo=' + assigned_to
```

### Option 2: Modify API to Accept Fewer Fields
I could modify the API endpoint to make `originalAmount` and `outstandingAmount` optional with default values.

### Option 3: Use Default Values
```
# Add these defaults:
original_amount = '0.00'
outstanding_amount = '0.00'
```

## Recommendation:
**Option 1** is best - include the debt amounts from SOS (`matter.debtvalue` and `matter.balance`) since this is debt recovery software and these amounts are critical case data.

Which approach would you prefer?