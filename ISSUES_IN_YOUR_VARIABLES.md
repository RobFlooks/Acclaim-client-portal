# Issues Found in Your SetVariables Card

## Problems Identified:

### 1. **Unnecessary Variables**
```
❌ organisation_id = 3
❌ username = 'acclaim.orgadmin@acclaim.law'  
❌ password = 'Chadw1ck816!!'
```
**Issue:** This API doesn't use basic authentication - these aren't needed.

### 2. **Field Name Mismatch**
```
❌ caseName = matter.description
✅ caseName = matter.mattername
```
**Issue:** You used `matter.description` instead of `matter.mattername` for the case name.

### 3. **Variable Naming Inconsistency**
```
❌ You defined: accountNumber, caseName, etc.
❌ But used different names in post_data
```
**Issue:** Your variable names don't match what you're using in the form data string.

### 4. **Missing Form Data String**
**Issue:** You didn't build the `post_data` variable that HttpWebRequest needs.

## Corrected Version:

### ✅ **Clean Variables:**
```
# Only what's needed for the API
url = 'https://...'
external_case_ref_encoded = replace('Ref ' + ConnectApp.System.Firmsname + ":" + matter.entitytype + ":" + matter.entityref," ","_")
organisation_external_ref = client.cl_code
account_number = matter.entityref
case_name = matter.mattername  # Fixed: was matter.description
debtor_type = 'individual'
status = 'active'
stage = 'pre_legal'
assigned_to = matter.feeearner
```

### ✅ **Form Data String:**
```
post_data = 'externalRef=' + external_case_ref_encoded + '&organisationExternalRef=' + organisation_external_ref + '&accountNumber=' + account_number + '&caseName=' + case_name + '&debtorType=' + debtor_type + '&status=' + status + '&stage=' + stage + '&assignedTo=' + assigned_to
```

## Why You Got HTTP 400:

The server was returning an old error message because the changes hadn't taken effect. After the workflow restart, your corrected variables should work.

## Key Changes Made:
1. Removed unnecessary authentication variables
2. Fixed `matter.description` → `matter.mattername`
3. Added proper `post_data` string construction
4. Consistent variable naming

Use the corrected version above and it should work after the server restart!