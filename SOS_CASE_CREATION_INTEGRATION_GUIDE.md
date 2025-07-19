# SOS Case Creation Integration Guide

## Overview

This guide explains how to create new debt recovery cases in the Acclaim portal directly from your SOS case management system using automated workflows.

## How It Works

The case creation integration uses the `/api/external/cases` endpoint to automatically create cases in the portal when new matters are opened in SOS. This ensures your portal always has up-to-date case information.

## SOS Workflow Setup

### Required Variables in SetVariables

These variables will be automatically extracted from your SOS matter:

```
# Portal Configuration
organisation_id = 3
username = 'acclaim.orgadmin@acclaim.law'
password = 'Chadw1ck816!!'

# API Configuration
url = 'https://your-portal-domain.replit.dev/api/external/cases'
organisation_external_ref = 'CHADLAW-ORG-001'

# Case Data (extracted from SOS matter)
external_case_ref = 'Ref ' + ConnectApp.System.Firmsname + ":" + matter.entitytype + ":" + matter.entityref
account_number = matter.entityref
case_name = matter.mattername
debtor_email = matter.email1
debtor_phone = matter.phone1
debtor_address = matter.address1 + ", " + matter.address2 + ", " + matter.address3 + ", " + matter.postcode
debtor_type = 'individual'  # or 'company'
original_amount = matter.debtvalue
outstanding_amount = matter.balance
costs_added = '0.00'
interest_added = '0.00'
fees_added = '0.00'
status = 'active'
stage = 'pre_legal'
assigned_to = 'Recovery Team'
```

### Input Variables for Python Script

```
url,external_case_ref,organisation_external_ref,account_number,case_name,debtor_email,debtor_phone,debtor_address,debtor_type,original_amount,outstanding_amount,costs_added,interest_added,fees_added,status,stage,assigned_to
```

### Output Variables

```
response
```

## API Endpoint Details

**Endpoint:** `POST /api/external/cases`

**Purpose:** Creates a new case or updates an existing one if the external reference already exists.

**Request Format:** JSON

**Required Fields:**
- `accountNumber`: The SOS matter reference
- `caseName`: Name of the case/matter
- `originalAmount`: Original debt amount
- `outstandingAmount`: Current outstanding balance
- `organisationExternalRef`: Your organisation reference in the portal
- `externalRef`: Unique external reference for the case

**Optional Fields:**
- `debtorEmail`: Debtor's email address
- `debtorPhone`: Debtor's phone number
- `debtorAddress`: Debtor's full address
- `debtorType`: Type of debtor ('individual' or 'company')
- `costsAdded`: Additional costs added to the debt
- `interestAdded`: Interest added to the debt
- `feesAdded`: Fees added to the debt
- `status`: Case status ('active', 'closed', etc.)
- `stage`: Current stage of recovery process
- `assignedTo`: Team or person assigned to the case

## Sample Request

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
  "costsAdded": "150.00",
  "interestAdded": "75.00",
  "feesAdded": "50.00",
  "status": "active",
  "stage": "pre_legal",
  "organisationExternalRef": "CHADLAW-ORG-001",
  "assignedTo": "Recovery Team",
  "externalRef": "Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028"
}
```

## Configuration Steps

1. **Update Portal URL**: Replace `your-portal-domain.replit.dev` with your actual portal domain
2. **Set Organisation Reference**: Update `organisation_external_ref` to match your organisation's external reference in the portal
3. **Configure Debtor Type**: Set `debtor_type` based on your case requirements ('individual' or 'company')
4. **Adjust Stage**: Set the initial `stage` according to your workflow ('pre_legal', 'legal_action', 'judgment', etc.)

## Case Stages Available

- `pre_legal`: Initial contact and pre-legal recovery
- `legal_action`: Legal proceedings initiated
- `judgment`: Judgment obtained
- `enforcement`: Enforcement action
- `payment_plan`: Payment plan agreed
- `paid`: Case fully paid
- `closed`: Case closed

## Case Statuses Available

- `active`: Case is actively being worked
- `on_hold`: Case is temporarily on hold
- `closed`: Case is closed

## Error Handling

The workflow will return detailed error messages if:
- Required fields are missing
- Organisation is not found
- Invalid data formats are provided
- Network connectivity issues occur

## Best Practices

1. **Unique External References**: Ensure each case has a unique external reference
2. **Data Validation**: Validate email addresses and phone numbers before sending
3. **Amount Formatting**: Use decimal format for all monetary amounts (e.g., "1234.56")
4. **Address Formatting**: Provide complete address information for better case management

## Testing

Before implementing in production:

1. Test with a sample case to ensure the integration works
2. Verify that cases appear correctly in the portal
3. Check that all data fields are populated as expected
4. Confirm that duplicate external references update existing cases rather than creating duplicates

## Support

If you encounter any issues with the case creation integration, contact your system administrator or check the portal's API documentation for the latest endpoint specifications.