# One Assess Integration API

Version: 1.0  
Base URL: `https://us-central1-<your-project-id>.cloudfunctions.net`

## Overview

One Assess provides a webhook-based integration API that allows you to:
- Create prefilled assessments from your CRM or external system
- Receive notifications when assessments are completed

All API requests must be authenticated with an API key and signed with HMAC-SHA256.

## Authentication

### API Key

Generate an API key in the One Assess organization settings. Include it in the `Authorization` header:

```
Authorization: Bearer oa_your_api_key_here
```

### Request Signing

All requests must include HMAC-SHA256 signatures to prevent tampering and replay attacks.

**Required Headers:**
- `X-OneAssess-Signature`: HMAC-SHA256 hex digest of `{timestamp}.{body}`
- `X-OneAssess-Timestamp`: Unix timestamp in milliseconds

**Signing Process:**

```javascript
const crypto = require('crypto');

const timestamp = Date.now().toString();
const body = JSON.stringify(payload);
const secret = apiKey.substring(0, 32); // First 32 chars of API key

const hmac = crypto.createHmac('sha256', secret);
hmac.update(`${timestamp}.${body}`);
const signature = hmac.digest('hex');
```

**Replay Protection:**

Requests with timestamps older than 5 minutes are rejected.

## Endpoints

### Create or Update Prefilled Assessment

Create a new assessment with prefilled data, or update an existing one by external ID.

**Endpoint:** `POST /inboundAssessment`

**Request Body:**

```json
{
  "externalId": "crm-client-12345",
  "clientName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "parqAnswers": {
    "chestPain": false,
    "dizziness": false,
    "boneJointProblem": false,
    "bloodPressureMedication": false,
    "heartCondition": false,
    "physicalActivityAdvised": false,
    "otherReason": false
  },
  "lifestyle": {
    "sleepHours": 7,
    "stressLevel": "moderate",
    "activityLevel": "moderately-active",
    "trainingFrequency": 3
  },
  "goals": ["lose-weight", "build-muscle"],
  "medications": "None",
  "height": 180,
  "weight": 85
}
```

**Required Fields:**
- `externalId` (string): Your unique identifier for this client
- `clientName` (string): Client's full name

**Optional Fields:**
- `email` (string): Client email
- `phone` (string): Client phone number
- `dateOfBirth` (string): Format: YYYY-MM-DD
- `gender` (string): `male`, `female`, `other`, or `prefer-not-to-say`
- `parqAnswers` (object): PAR-Q questionnaire responses (boolean values)
- `lifestyle` (object): Lifestyle data
  - `sleepHours` (number): Average hours of sleep per night
  - `stressLevel` (string): `low`, `moderate`, or `high`
  - `activityLevel` (string): `sedentary`, `lightly-active`, `moderately-active`, `very-active`, or `extremely-active`
  - `trainingFrequency` (number): Training sessions per week
- `goals` (array): Array of goal strings (`lose-weight`, `build-muscle`, `improve-fitness`, `improve-posture`, `reduce-pain`)
- `medications` (string): Current medications or "None"
- `height` (number): Height in centimeters
- `weight` (number): Weight in kilograms

**Response (201 Created or 200 OK):**

```json
{
  "success": true,
  "assessmentId": "abc123",
  "message": "Assessment created"
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields or invalid data
- `401 Unauthorized`: Invalid API key or signature
- `500 Internal Server Error`: Server error

### Example: Create Assessment (JavaScript)

```javascript
const crypto = require('crypto');

async function createAssessment(apiKey, data) {
  const timestamp = Date.now().toString();
  const body = JSON.stringify(data);
  const secret = apiKey.substring(0, 32);
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${timestamp}.${body}`);
  const signature = hmac.digest('hex');
  
  const response = await fetch(
    'https://us-central1-your-project.cloudfunctions.net/inboundAssessment',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-OneAssess-Signature': signature,
        'X-OneAssess-Timestamp': timestamp,
      },
      body: body,
    }
  );
  
  return await response.json();
}

// Usage
const result = await createAssessment('oa_your_key_here', {
  externalId: 'crm-12345',
  clientName: 'John Doe',
  email: 'john@example.com',
  goals: ['lose-weight'],
});
```

## Webhooks

### Webhook Events

One Assess can send webhook notifications to your endpoint when certain events occur.

#### assessment.completed

Triggered when a coach completes an assessment for a client.

**Payload:**

```json
{
  "assessmentId": "client-abc123",
  "externalId": "crm-client-12345",
  "clientName": "John Doe",
  "completedAt": "2026-10-31T15:30:00.000Z",
  "axis": {
    "overall": 67,
    "pillars": {
      "bodyComp": 72,
      "posture": 65,
      "fitness": 58,
      "strength": 70,
      "lifestyle": 68
    }
  },
  "findings": {
    "movement": {
      "overheadSquat": { "score": 3, "findings": [...] },
      "hinge": { "score": 2, "findings": [...] },
      "lunge": { "score": 3, "findings": [...] }
    },
    "strength": {
      "gripStrengthKg": 45,
      "pushups": 25,
      "plankSeconds": 90
    },
    "fitness": {
      "restingHeartRate": 65,
      "recoveryHeartRate": 85
    },
    "posture": {
      "front": { ... },
      "back": { ... },
      "side-left": { ... },
      "side-right": { ... }
    },
    "bodyComp": {
      "heightCm": 180,
      "weightKg": 85,
      "bodyFatPct": 18.5,
      "skeletalMuscleMassKg": 38.2
    }
  },
  "reportUrl": "https://one-assess.com/r/abc123xyz"
}
```

### Webhook Signature Verification

All webhook requests include HMAC signatures that you should verify to ensure authenticity.

**Headers:**
- `X-OneAssess-Signature`: HMAC-SHA256 hex digest
- `X-OneAssess-Timestamp`: Unix timestamp in milliseconds

**Verification Example (Node.js):**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, timestamp, secret) {
  // Check timestamp to prevent replay attacks (5 minute window)
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (Math.abs(now - requestTime) > 300000) {
    return false;
  }
  
  // Verify HMAC
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${timestamp}.${payload}`);
  const expectedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Express.js example
app.post('/webhooks/oneassess', (req, res) => {
  const signature = req.headers['x-oneassess-signature'];
  const timestamp = req.headers['x-oneassess-timestamp'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, timestamp, YOUR_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process the webhook
  const event = req.body;
  console.log('Assessment completed:', event.clientName, event.axis.overall);
  
  res.status(200).send('OK');
});
```

### Webhook Retry Logic

If your endpoint returns a non-2xx status code, One Assess will retry the webhook up to 3 times with exponential backoff (2s, 4s, 8s).

After 10 consecutive failures, the webhook endpoint will be automatically disabled. You can re-enable it in the integration settings.

## Rate Limits

- Inbound assessment API: 25 requests per minute per API key
- Maximum payload size: 1MB

## Support

For questions or issues with the Integration API:
- Email: support@one-assess.com
- Documentation: https://one-assess.com/docs/integrations

## Changelog

### Version 1.0 (2026-10-31)
- Initial release
- Inbound assessment creation endpoint
- Outbound assessment.completed webhook
