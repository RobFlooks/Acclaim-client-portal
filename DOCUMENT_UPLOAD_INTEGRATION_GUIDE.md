# Document Upload Integration Guide

## Overview
This guide explains how to upload documents to cases from your external case management system using the Acclaim Credit Management portal API.

## API Endpoint
**POST** `/api/external/cases/{externalRef}/documents`

## Authentication
Currently, no authentication is required for this endpoint. However, for production use, you should implement API key authentication.

## Request Format
The endpoint accepts multipart/form-data requests (compatible with SOS HttpWebRequest).

### Required Parameters
- `document` (file): The document file to upload
- `externalRef` (URL parameter): The external reference of the case

### Optional Parameters
- `fileName` (string): Custom filename for the document (defaults to original filename)
- `documentType` (string): Type of document (correspondence, invoice, statement, etc.)
- `description` (string): Description of the document

## SOS Integration Example

### Using SOS HttpWebRequest
```vb
Dim request As New HttpWebRequest("https://your-portal-domain.com/api/external/cases/Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028/documents")
request.Method = "POST"
request.ContentType = "multipart/form-data"

' Add form data
request.PostVariables.Add("fileName", "Client_Statement_2025.pdf")
request.PostVariables.Add("documentType", "statement")
request.PostVariables.Add("description", "Monthly statement from client")

' Add file
request.PostFiles.Add("document", "C:\path\to\document.pdf")

' Execute request
Dim response As HttpWebResponse = request.GetResponse()
Dim responseText As String = response.GetResponseText()
```

### Using curl (for testing)
```bash
curl -X POST "https://your-portal-domain.com/api/external/cases/Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028/documents" \
  -F "document=@/path/to/document.pdf" \
  -F "fileName=Client_Statement_2025.pdf" \
  -F "documentType=statement" \
  -F "description=Monthly statement from client"
```

## Response Format

### Success Response (201 Created)
```json
{
  "message": "Document uploaded successfully",
  "documentData": {
    "id": 13,
    "caseId": 1,
    "fileName": "Client_Statement_2025.pdf",
    "fileSize": 1048576,
    "fileType": "application/pdf",
    "filePath": "uploads/abc123...",
    "uploadedBy": "jZJVUVcC3I",
    "organisationId": 1,
    "createdAt": "2025-07-18T14:59:18.075Z"
  },
  "caseInfo": {
    "id": 1,
    "accountNumber": "ACC-2024-001",
    "caseName": "TechNova Solutions Ltd"
  },
  "timestamp": "2025-07-18T14:59:18.139Z",
  "refreshRequired": true
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "message": "No file uploaded"
}
```

#### 404 Not Found
```json
{
  "message": "Case not found"
}
```

#### 500 Internal Server Error
```json
{
  "message": "Failed to upload document"
}
```

## File Constraints
- Maximum file size: 10MB
- Supported file types: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF, XLS, XLSX, CSV
- Files are stored in the `uploads/` directory with secure random filenames

## External Reference Format
The external reference should follow the format: `Ref_Organisation_Name:Entity_Type:Case_Reference`

Example: `Ref_Chadwick_Lawrence_LLP:MA:CLS00003-028`

## Integration Notes
1. The system automatically assigns documents to the correct case based on the external reference
2. Documents are linked to the case's organisation for proper access control
3. The portal will automatically refresh to show new documents
4. Files are stored securely with randomised filenames to prevent direct access

## Security Considerations
For production deployment, consider implementing:
- API key authentication
- Rate limiting
- File type validation
- Virus scanning
- IP whitelisting

## Testing
You can test the integration using the provided curl examples or by creating a test script in your case management system.

## Support
For technical support with the integration, please contact your system administrator.