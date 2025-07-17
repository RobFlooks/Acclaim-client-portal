# External API Integration Guide

## Overview

This document outlines how your external case management system can integrate with the Acclaim Portal to handle data synchronization, particularly for payment deletion and reversal operations.

## Integration Approaches

### 1. External API Endpoints (Recommended)

The portal provides dedicated endpoints for your case management system to push data changes:

#### Payment Deletion
```
DELETE /api/external/payments/{externalRef}
```
- Deletes a specific payment by external reference
- Adds audit trail activity to the case
- Returns: `{ message: "Payment deleted successfully", paymentId: number }`

#### Bulk Payment Deletion
```
DELETE /api/external/cases/{externalRef}/payments
```
- Deletes all payments for a specific case
- Adds audit trail activity to the case
- Returns: `{ message: "All payments deleted successfully", deletedCount: number }`

#### Payment Reversal
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

#### Node.js/JavaScript Example
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

#### Python Example
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

#### cURL Example
```bash
# Delete all payments for a case
curl -X DELETE \
  "https://your-portal.com/api/external/cases/CASE-EXT-123/payments" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
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