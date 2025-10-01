# Filing Systems Field Mapping

This document describes how IPGenie's internal `filings` table maps to various international patent and trademark filing formats.

## Supported Filing Formats

- **PCT ST.96**: WIPO Patent Cooperation Treaty XML format
- **EP OF2.0**: European Patent Office Online Filing 2.0 envelope format
- **CN ST.96**: China National Intellectual Property Administration XML format
- **EUIPO JSON**: European Union Intellectual Property Office JSON format for trademarks

## Field Mapping Table

| IPGenie `filings` Column | PCT ST.96 | EP OF2.0 | CN ST.96 | EUIPO JSON |
|--------------------------|-----------|----------|----------|------------|
| `title` | `<InventionTitleBag>/<Text>` | `content.title.en` | `<TitleBag>/<Text[@languageCode='en']>` and `<Text[@languageCode='zh-CN']>` | `application.mark.text` (if word mark) |
| `abstract` | `<AbstractBag>/<Text>` | `content.abstract.en` | `<AbstractBag>/<Text zh-CN>` | n/a |
| `detailed_description` | `<DescriptionBag>/<Text>` | `content.description[0].text` | `<DescriptionBag>/<Text>` | n/a |
| `claims` (multiline) | `<ClaimBag>/<Claim>` | `content.claims[0].text` | `<ClaimBag>/<Claim>` | n/a |
| `country_code` | `<ReceivingOffice>` (RO) or designated states | `envelope.office='EPO'` + EP form | n/a | `application.language`, office implied (EUIPO) |
| `route` | `<FilingRoute>` PCT/Paris/National | n/a | n/a | `application.type='EUTM'` |
| `priority_number/date/country` | `<PriorityClaimBag>` | `priorities[]` | `<PriorityClaim...>` | `priorityClaims[]` |
| `tm_mark_text` (if TM) | n/a | n/a | n/a | `application.mark.text` |
| `tm_classes` | n/a | n/a | n/a | `application.goodsAndServices[].class` |
| `translations (zh)` | `<Text lang='zh-CN'>` duplicates | optional content.zh | required for CN | often EN only |

## EUIPO EUTM JSON Schema

```json
{
  "$id": "https://ipgenie.app/schemas/euipo-eutm.json",
  "type": "object",
  "properties": {
    "application": {
      "type": "object",
      "required": ["type", "language", "mark", "applicants", "goodsAndServices"],
      "properties": {
        "type": { "type": "string", "enum": ["EUTM"] },
        "language": { "type": "string" },
        "mark": {
          "type": "object",
          "properties": { 
            "kind": { "type": "string" }, 
            "text": { "type": "string" } 
          },
          "required": ["kind"]
        },
        "applicants": { "type": "array", "minItems": 1 },
        "goodsAndServices": { "type": "array", "minItems": 1 }
      }
    }
  },
  "required": ["application"]
}
```

## Implementation Notes

### Patents (US/EP/CN/PCT)

1. **Create Filing**: Fill in title, abstract, description, claims, route (national/Paris/PCT), jurisdiction
2. **Generate Documents**: Patent PDF and Drawings Pack (FIG.1..N)
3. **Translation** (Optional): Translate to Chinese for CN or bilingual PCT filings
4. **Download Pack**: Ready-to-file pack includes spec.pdf, drawings-pack.pdf, cover sheet

#### Filing Destinations

- **EPO**: If you have Online Filing 2.0 access, submit via "EPO Submit" action; otherwise use EPO portal and upload pack
- **PCT**: Use ePCT to file internationally (requires strong authentication)
- **CN**: Use CNIPA portal or local agent
- **US**: Use USPTO Patent Center

5. **Track**: Deadlines auto-calculate; attach office actions; receive reminders 7 days before due dates

### Trademarks (US/EU/CN)

1. **Create Filing**: Enter mark text (or upload figurative mark), goods & services (Nice classes)
2. **Clearance**: Check Trademark Status (US) via TSDR and perform clearance search
3. **File**:
   - **EUIPO**: Use submit action if you have sandbox/prod credentials
   - **US**: File via TEAS portal (IPGenie prepares the specification)
   - **CN**: File via CNIPA or agent
4. **Track**: Save serial/registration number; app syncs status daily (US)

### Copyright (US)

1. **Create Entry**: Enter title, authors, work type
2. **Upload Deposit**: Store in documents
3. **File**: Via USCO portal (IPGenie maintains pack and reminders)

## Best Practices

### API Integration

- **Live APIs** (EUIPO, EPO OF2.0, IP Australia): Complete OAuth, map to official payloads, switch stub endpoints to real base URLs
- **Other Offices**: Maintain "ready-to-file" as first-class; manage experience, documents, deadlines, and notifications

### Documentation

- Keep OpenAPI files in `/openapi/` directory
- Generate typed clients using tools like `openapi-typescript` or `orval`

### Export Options

- Provide ZIP export of each filing's pack (PDFs + XML + JSON payload)
- Enable power users and agents to file anywhere with complete documentation

## Translation Requirements

### Chinese Filings (CN)

- **Required**: All patent sections must include Chinese translations
- **Storage**: Use `*_zh` columns (e.g., `title_zh`, `abstract_zh`, `claims_zh`)
- **Format**: Use `<Text[@languageCode='zh-CN']>` in XML outputs

### Bilingual PCT

- Include both English and Chinese text elements
- Use appropriate language attributes in XML
- Ensure proper encoding (UTF-8)

## Validation

All filing data should be validated using the schemas defined in `src/lib/validation.ts`:

- `PatentFilingSchema`: For patent applications
- `TrademarkFilingSchema`: For trademark applications  
- `CopyrightFilingSchema`: For copyright registrations
- `EUIPOFilingSchema`: For European Union trademark applications

## Related Documentation

- See `docs/INTEGRATION_GUIDE.md` for API integration details
- See `src/lib/validation.ts` for validation schema implementations
