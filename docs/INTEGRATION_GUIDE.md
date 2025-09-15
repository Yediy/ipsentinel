# IPGenie International API Integration Guide

This guide explains how to integrate your external IPGenie International API server with your Lovable project.

## Overview

The IPGenie International API provides comprehensive patent and trademark filing services including:

- **Patent Generation**: AI-powered patent drafting with PDF output
- **Drawing Processing**: Automated vectorization and patent-compliant drawing generation
- **International Filing**: Multi-jurisdiction support (US, CN, EP, etc.)
- **Document Management**: Webhook-based document delivery and storage
- **Translation Services**: Multi-language support for international filings

## Quick Setup

### 1. Environment Variables

Set these environment variables in your external API server:

```env
# Server Configuration
PORT=8080
FILE_BASE_URL=https://your-api-server.com

# Storage Options (local | s3 | s3-dual)
STORAGE=local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=your-bucket
S3_PREFIX=ipgenie

# Translation Provider (openai | anthropic | stub)
TRANSLATE_PROVIDER=openai
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Webhook Integration
LOVABLE_DOC_WEBHOOK_URL=https://your-lovable-app.lovable.app/api/webhook/documents
LOVABLE_DOC_WEBHOOK_SECRET=your-secret-key
```

### 2. Lovable Environment Variables

Configure these in your Lovable project settings:

```env
DRAWINGS_UPLOAD_URL=https://your-api-server.com/api/drawings/upload
DRAWINGS_GENERATE_URL=https://your-api-server.com/api/drawings/generate
DRAWINGS_GENERATE_PACK_URL=https://your-api-server.com/api/drawings/generate-pack
```

### 3. Webhook Secret Setup

Generate a secure webhook secret:

```bash
# Generate a random 64-character hex string
openssl rand -hex 32
```

Use this same secret in both:
- Your API server's `LOVABLE_DOC_WEBHOOK_SECRET`
- Your Lovable project's webhook configuration

## API Endpoints

### Drawing APIs

#### Upload Image
```bash
POST /api/drawings/upload
Content-Type: multipart/form-data

# Form data:
image: [PNG/JPG/SVG file]
```

Response:
```json
{
  "asset_url": "https://api-server.com/files/assets/uuid.png",
  "sha256": "abc123...",
  "mime": "image/png",
  "size": 12345
}
```

#### Generate Single Drawing
```bash
POST /api/drawings/generate
Content-Type: application/json

{
  "asset_url": "https://api-server.com/files/assets/uuid.png",
  "figure": "FIG. 1",
  "jurisdiction": "US",
  "sheet": "LETTER",
  "strokeWidth": 1,
  "overlays": [
    {"x": 0.6, "y": 0.3, "text": "10"},
    {"x": 0.4, "y": 0.7, "text": "20"}
  ],
  "filing_id": "uuid-optional"
}
```

Response:
```json
{
  "pdf_url": "https://api-server.com/files/drawings/uuid.pdf",
  "svg_url": "https://api-server.com/files/drawings/uuid.svg",
  "sha256": "def456..."
}
```

#### Generate Multi-Page Pack
```bash
POST /api/drawings/generate-pack
Content-Type: application/json

{
  "jurisdiction": "US",
  "sheet": "LETTER", 
  "strokeWidth": 1,
  "pages": [
    {
      "asset_url": "https://api-server.com/files/assets/fig1.png",
      "figure": "FIG. 1",
      "overlays": [{"x": 0.6, "y": 0.3, "text": "10"}]
    },
    {
      "asset_url": "https://api-server.com/files/assets/fig2.png", 
      "figure": "FIG. 2",
      "overlays": [{"x": 0.4, "y": 0.7, "text": "20"}]
    }
  ],
  "filing_id": "uuid-optional"
}
```

Response:
```json
{
  "pdf_url": "https://api-server.com/files/drawings/uuid-pack.pdf",
  "page_svg_urls": ["url1.svg", "url2.svg"],
  "sha256": "ghi789...",
  "pages": 2
}
```

### Patent Generation APIs

#### Generate Patent PDF
```bash
POST /api/patent/generate
Content-Type: application/json

{
  "title": "Innovative Widget Device",
  "abstract": "A novel device for...",
  "description": "The invention relates to...",
  "features": "Key features include...",
  "claims": "1. A device comprising...\n2. The device of claim 1...",
  "prior_art": "Prior art includes...",
  "filing_id": "uuid-optional"
}
```

#### National/Regional Package
```bash
POST /api/patent/national-package
Content-Type: application/json

{
  "priority_date": "2024-01-15",
  "country_code": "CN",
  "route": "pct",
  "filing_id": "uuid-optional"
}
```

#### CN Filing Options
```bash
POST /api/patent/cn-options
Content-Type: application/json

{
  "cn_type": "invention",
  "filing_id": "uuid-optional"
}
```

## Drawing Features

### Automatic Vectorization
- Converts raster images (PNG/JPG) to clean vector line art
- Applies patent office requirements (monochrome, specific line weights)
- Optimizes SVG output for printing and reproduction

### Reference Numeral Auto-Snapping
- Automatically aligns reference numerals to drawing elements
- Uses smart snapping algorithm to find nearest black pixels
- Maintains professional appearance with leader lines

### Multi-Jurisdiction Support
- **US**: Letter size (8.5" × 11") with USPTO margins
- **EP/CN**: A4 size with EPO/CNIPA margins  
- **PCT**: International standard formatting
- Automatic sheet size selection based on jurisdiction

### Drawing Compliance
- Meets USPTO, EPO, CNIPA drawing requirements
- Consistent line weights and styling
- Proper figure labeling and reference numeral placement
- High-resolution output suitable for patent applications

## Webhook Integration

### Document Delivery Webhook

When documents are generated, they're automatically delivered to your Lovable app via webhook:

```bash
POST /api/webhook/documents
Content-Type: application/json
X-Webhook-Secret: your-secret-key

{
  "filing_id": "uuid",
  "kind": "pdf",
  "url": "https://api-server.com/files/drawings/uuid.pdf",
  "sha256": "abc123..."
}
```

### Webhook Security

- Uses HMAC-SHA256 signature verification
- Requires matching secret keys on both ends
- Automatic duplicate detection via SHA256 hashing
- Stores documents in Lovable's Supabase database

## Usage Examples

### Basic Drawing Generation Workflow

1. **Upload Source Image**
   ```typescript
   const formData = new FormData();
   formData.append('image', file);
   const upload = await fetch('/api/drawings/upload', {
     method: 'POST',
     body: formData
   });
   const { asset_url } = await upload.json();
   ```

2. **Generate Patent Drawing**
   ```typescript
   const response = await fetch('/api/drawings/generate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       asset_url,
       figure: 'FIG. 1',
       overlays: [
         { x: 0.6, y: 0.3, text: '10' },
         { x: 0.4, y: 0.7, text: '20' }
       ]
     })
   });
   const { pdf_url, svg_url } = await response.json();
   ```

### Multi-Page Drawing Pack

```typescript
const response = await fetch('/api/drawings/generate-pack', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jurisdiction: 'US',
    strokeWidth: 1,
    pages: [
      {
        asset_url: 'https://api-server.com/assets/fig1.png',
        figure: 'FIG. 1', 
        overlays: [{ x: 0.6, y: 0.3, text: '10' }]
      },
      {
        asset_url: 'https://api-server.com/assets/fig2.png',
        figure: 'FIG. 2',
        overlays: [{ x: 0.4, y: 0.7, text: '20' }]
      }
    ]
  })
});
```

## Error Handling

All API endpoints return consistent error formats:

```json
{
  "error": "Description of the error",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

Common error codes:
- `UPLOAD_FAILED`: Image upload failed
- `INVALID_ASSET_URL`: Asset URL not accessible  
- `GENERATION_FAILED`: Drawing generation failed
- `WEBHOOK_DELIVERY_FAILED`: Document webhook delivery failed

## Performance Considerations

### Image Processing
- Maximum file size: 20MB per image
- Supports PNG, JPG, SVG formats
- Processing time: 2-10 seconds per image depending on complexity

### Storage Options
- **Local**: Fast for development, single server deployment
- **S3**: Scalable cloud storage with CDN support
- **S3-Dual**: Primary + replica buckets for high availability

### Caching
- Generated SVGs are cached and reusable
- SHA256 hashing prevents duplicate processing
- CDN-friendly URLs for fast delivery

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Documents**
   - Verify webhook URL is accessible
   - Check webhook secret matches on both ends
   - Ensure CORS headers are properly configured

2. **Drawing Generation Fails**
   - Verify asset URL is accessible from API server
   - Check image format is supported (PNG/JPG/SVG)
   - Ensure sufficient server resources for image processing

3. **Upload Errors**
   - Check file size limits (20MB max)
   - Verify multipart form encoding
   - Ensure proper file permissions

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=ipgenie:*
LOG_LEVEL=debug
```

This provides detailed logging for troubleshooting integration issues.

## Production Deployment

### API Server Deployment
1. Deploy your Node.js server to your preferred hosting platform
2. Configure environment variables for production
3. Set up SSL/HTTPS for secure webhook delivery
4. Configure storage (S3 recommended for production)

### Lovable Configuration
1. Update environment variables with production API URLs
2. Test webhook delivery in staging environment
3. Monitor document generation and delivery

### Security Checklist
- ✅ Use HTTPS for all API communications
- ✅ Generate strong webhook secrets (32+ characters)
- ✅ Configure proper CORS headers
- ✅ Implement rate limiting for API endpoints
- ✅ Use signed URLs for file access
- ✅ Enable request logging for monitoring

## Support

For integration support or questions:
1. Check the API server logs for detailed error messages
2. Verify all environment variables are properly configured
3. Test individual endpoints using the provided curl examples
4. Monitor webhook delivery in your Lovable app's document management system