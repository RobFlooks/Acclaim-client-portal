# External API Integration Guide

## Overview

This document outlines how your external case management system can integrate with the Acclaim Portal to handle data synchronization, particularly for payment deletion and reversal operations.

## Important Note: Case Activities Management

**Case activities are now exclusively managed through the external API.** The system no longer automatically generates case activities for internal operations. All case activities must be pushed from your external system using the dedicated activity endpoints described below.

## Integration Approaches

### 1. External API Endpoints (Recommended)

The portal provides comprehensive endpoints for your case management system to push data changes:

#### Data Creation Endpoints

##### Create/Update Organization
```
POST /api/external/organizations
Body: {
  name: string,
  contactEmail?: string,
  contactPhone?: string,
  address?: string,
  externalRef: string
}
```
- Creates new organization or updates existing one by external reference
- Returns: `{ message: "Organization created/updated successfully", organization: object }`

##### Create/Update User
```
POST /api/external/users
Body: {
  firstName: string,
  lastName: string,
  email: string,
  phone?: string,
  organisationExternalRef?: string,
  isAdmin?: boolean,
  externalRef: string
}
```
- Creates new user or updates existing one by external reference
- Returns: `{ message: "User created/updated successfully", user: object, tempPassword?: string }`

##### Create/Update Case
```
POST /api/external/cases
Body: {
  accountNumber: string,
  caseName: string,
  debtorEmail?: string,
  debtorPhone?: string,
  debtorAddress?: string,
  debtorType?: string,
  originalAmount: string,
  outstandingAmount: string,
  costsAdded?: string,
  interestAdded?: string,
  feesAdded?: string,
  status?: string,
  stage?: string,
  organisationExternalRef: string,
  assignedTo?: string,
  externalRef: string
}
```
- Creates new case or updates existing one by external reference
- Returns: `{ message: "Case created/updated successfully", case: object }`

##### Create Case Activity
```
POST /api/external/cases/:externalRef/activities
Body: {
  activityType: string,
  description: string,
  performedBy: string,
  activityDate?: string (ISO format)
}
```
- Creates a new case activity for the specified case
- Returns: `{ message: "Case activity created successfully", activity: object }`

##### Create Case Message
```
POST /api/external/cases/:externalRef/messages
Body: {
  message: string,
  senderName: string,
  messageType?: string (defaults to 'case_update'),
  subject?: string (optional custom subject)
}
```
- Creates a new message linked to the specified case
- If `subject` is provided, uses custom subject; otherwise generates automatic subject
- Returns: `{ message: "Case message created successfully", messageData: object }`

##### Bulk Create Case Activities
```
POST /api/external/activities/bulk
Body: {
  activities: [
    {
      caseExternalRef: string,
      activityType: string,
      description: string,
      performedBy: string,
      activityDate?: string (ISO format)
    }
  ]
}
```
- Creates multiple case activities in one request
- Returns: `{ message: "Bulk activity creation completed", results: object }`

##### Create Payment
```
POST /api/external/payments
Body: {
  caseExternalRef: string,
  amount: string,
  paymentDate: string,
  paymentMethod?: string,
  reference?: string,
  notes?: string,
  externalRef: string
}
```
- Creates new payment for a case
- Returns: `{ message: "Payment created successfully", payment: object }`

##### Update Case Status/Stage
```
PUT /api/external/cases/{externalRef}/status
Body: {
  status?: string,
  stage?: string,
  notes?: string
}
```
- Updates case status and/or stage
- Returns: `{ message: "Case status updated successfully", case: object }`

##### Upload Document to Case
```
POST /api/external/cases/{externalRef}/documents
Content-Type: multipart/form-data
Body: {
  document: file (required),
  fileName?: string,
  documentType?: string,
  description?: string
}
```
- Uploads a document to the specified case
- Supports all common file types (PDF, DOC, DOCX, TXT, JPG, PNG, etc.)
- Maximum file size: 10MB
- Returns: `{ message: "Document uploaded successfully", documentData: object }`

##### Bulk Data Synchronization
```
POST /api/external/sync
Body: {
  organizations?: Array<OrganizationData>,
  users?: Array<UserData>,
  cases?: Array<CaseData>,
  payments?: Array<PaymentData>
}
```
- Bulk create/update multiple entities in one request
- Returns: `{ message: "Bulk sync completed", results: { created: number, updated: number, errors: Array } }`

#### Data Deletion/Reversal Endpoints

##### Payment Deletion
```
DELETE /api/external/payments/{externalRef}
```
- Deletes a specific payment by external reference
- Adds audit trail activity to the case
- Returns: `{ message: "Payment deleted successfully", paymentId: number }`

##### Bulk Payment Deletion
```
DELETE /api/external/cases/{externalRef}/payments
```
- Deletes all payments for a specific case
- Adds audit trail activity to the case
- Returns: `{ message: "All payments deleted successfully", deletedCount: number }`

##### Payment Reversal
```
POST /api/external/payments/{externalRef}/reverse
Body: { reason: string, reversalRef?: string }
```
- Creates a reversal payment (negative amount)
- Maintains original payment record
- Adds audit trail activity to the case
- Returns: `{ message: "Payment reversed successfully", originalPayment: object, reversalPayment: object }`

### 2. Database Schema Updates

Added `externalRef` fields to support external system integration:

#### Cases Table
- `externalRef` (varchar, unique): External case management system reference

#### Payments Table
- `externalRef` (varchar, unique): External payment system reference

### 3. Implementation Examples

#### Data Creation Examples

##### Node.js/JavaScript - Create Organization
```javascript
// Create new organization
const response = await fetch('https://your-portal.com/api/external/organizations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY', // TODO: Add authentication
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Acme Corporation',
    contactEmail: 'contact@acme.com',
    contactPhone: '01234567890',
    address: '123 Business St, City, County, AB1 2CD',
    externalRef: 'ACME-ORG-001'
  })
});

const result = await response.json();
console.log(result.message); // "Organization created successfully"
```

##### Node.js/JavaScript - Create User
```javascript
// Create new user
const response = await fetch('https://your-portal.com/api/external/users', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY', // TODO: Add authentication
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@acme.com',
    phone: '07123456789',
    organisationExternalRef: 'ACME-ORG-001',
    isAdmin: false,
    externalRef: 'USER-001'
  })
});

const result = await response.json();
console.log(result.message); // "User created successfully"
console.log(result.tempPassword); // Temporary password for first login
```

##### Node.js/JavaScript - Create Case
```javascript
// Create new case
const response = await fetch('https://your-portal.com/api/external/cases', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY', // TODO: Add authentication
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    accountNumber: 'ACC-2024-001',
    caseName: 'John Doe Debt Recovery',
    debtorEmail: 'john.doe@example.com',
    debtorPhone: '01234567890',
    debtorAddress: '456 Debtor St, City, County, CD3 4EF',
    debtorType: 'individual',
    originalAmount: '5000.00',
    outstandingAmount: '3500.00',
    costsAdded: '150.00',
    interestAdded: '75.00',
    feesAdded: '50.00',
    status: 'active',
    stage: 'initial_contact',
    organisationExternalRef: 'ACME-ORG-001',
    assignedTo: 'Recovery Team',
    externalRef: 'CASE-001'
  })
});

const result = await response.json();
console.log(result.message); // "Case created successfully"
```

##### Node.js/JavaScript - Create Payment
```javascript
// Create new payment
const response = await fetch('https://your-portal.com/api/external/payments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY', // TODO: Add authentication
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    caseExternalRef: 'CASE-001',
    amount: '500.00',
    paymentDate: '2024-01-15T10:30:00Z',
    paymentMethod: 'BANK_TRANSFER',
    reference: 'TXN-123456',
    notes: 'First payment installment',
    externalRef: 'PAYMENT-001'
  })
});

const result = await response.json();
console.log(result.message); // "Payment created successfully"
```

##### Python - Bulk Data Sync
```python
import requests

# Bulk sync data
response = requests.post(
    "https://your-portal.com/api/external/sync",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",  # TODO: Add authentication
        "Content-Type": "application/json"
    },
    json={
        "organizations": [
            {
                "name": "Tech Corp",
                "contactEmail": "info@techcorp.com",
                "externalRef": "TECH-ORG-001"
            }
        ],
        "users": [
            {
                "firstName": "Jane",
                "lastName": "Doe",
                "email": "jane.doe@techcorp.com",
                "organisationExternalRef": "TECH-ORG-001",
                "externalRef": "USER-002"
            }
        ],
        "cases": [
            {
                "accountNumber": "ACC-2024-002",
                "caseName": "ABC Ltd Recovery",
                "originalAmount": "10000.00",
                "outstandingAmount": "8000.00",
                "organisationExternalRef": "TECH-ORG-001",
                "externalRef": "CASE-002"
            }
        ]
    }
)

result = response.json()
print(f"Organizations created: {result['results']['organizations']['created']}")
print(f"Users created: {result['results']['users']['created']}")
print(f"Cases created: {result['results']['cases']['created']}")
```

#### Data Deletion/Reversal Examples

##### Node.js/JavaScript - Delete Payment
```javascript
// Delete payment by external reference
const response = await fetch(`https://your-portal.com/api/external/payments/${externalRef}`, {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY', // TODO: Add authentication
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log(result.message);
```

##### Python - Reverse Payment
```python
import requests

# Reverse payment
response = requests.post(
    f"https://your-portal.com/api/external/payments/{external_ref}/reverse",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",  # TODO: Add authentication
        "Content-Type": "application/json"
    },
    json={
        "reason": "Chargeback received",
        "reversalRef": "CHB-2024-001"
    }
)

result = response.json()
print(result["message"])
```

##### cURL - Update Case Status
```bash
# Update case status and stage
curl -X PUT \
  "https://your-portal.com/api/external/cases/CASE-001/status" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed",
    "stage": "resolved",
    "notes": "Payment plan completed successfully"
  }'
```

## Security Considerations

### Authentication (TODO)
Currently, the external API endpoints are marked with `TODO: Add API key authentication`. You'll need to:

1. Generate API keys for your case management system
2. Add API key validation middleware
3. Implement rate limiting
4. Add IP whitelisting if needed

### Recommended Security Implementation
```javascript
// Example middleware for API key authentication
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== process.env.EXTERNAL_API_KEY) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  
  next();
};

// Apply to external endpoints
app.delete('/api/external/payments/:externalRef', validateApiKey, async (req, res) => {
  // ... existing code
});
```

## Data Flow

### Payment Deletion Flow
1. External system determines payment needs to be deleted
2. System calls `DELETE /api/external/payments/{externalRef}`
3. Portal finds payment by external reference
4. Portal deletes payment from database
5. Portal adds audit trail activity
6. Portal returns success confirmation

### Payment Reversal Flow
1. External system determines payment needs to be reversed
2. System calls `POST /api/external/payments/{externalRef}/reverse`
3. Portal finds original payment
4. Portal creates reversal payment (negative amount)
5. Portal adds audit trail activity
6. Portal returns both original and reversal payment details

## Error Handling

### Common Error Responses
- `404`: Payment or case not found
- `401`: Invalid API key (when authentication is implemented)
- `500`: Server error

### Best Practices
1. Always check response status codes
2. Handle network timeouts gracefully
3. Implement retry logic for transient failures
4. Log all API calls for audit purposes

## Testing

### Test Scenarios
1. Delete existing payment by external reference
2. Delete non-existent payment (should return 404)
3. Reverse existing payment
4. Bulk delete all payments for a case
5. Handle authentication failures

### Test Data Setup
Ensure your test data includes:
- Cases with `externalRef` populated
- Payments with `externalRef` populated
- Valid API keys configured

## Monitoring and Logging

The portal automatically logs all external API operations:
- Payment deletions create `payment_deleted` case activities
- Payment reversals create `payment_reversed` case activities
- Bulk operations create `payments_bulk_deleted` case activities

Monitor these activities in the case timeline for audit purposes.

## Next Steps

1. **Add Authentication**: Implement API key validation for security
2. **Set Up Monitoring**: Add logging and alerting for external API calls
3. **Test Integration**: Validate all endpoints with your case management system
4. **Documentation**: Update this guide with your specific implementation details
5. **Rate Limiting**: Add rate limiting to prevent abuse

## Support

For technical support or questions about the integration, contact the development team.