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
  "trainingHistory": "intermediate",
  "recentActivity": "currently-training",
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
    "activityLevel": "moderately-active",
    "stepsPerDay": 8000,
    "sleepArchetype": "good",
    "stressLevel": "low",
    "nutritionHabits": "good",
    "hydrationHabits": "excellent",
    "caffeineCupsPerDay": 2,
    "lastCaffeineIntake": "14:00",
    "alcoholFrequency": "occasionally",
    "medicationsFlag": "no",
    "medicationsNotes": ""
  },
  "goals": ["weight-loss", "build-muscle"],
  "trainingFrequency": 3,
  "height": 180,
  "weight": 85
}
```

**Required Fields:**
- `externalId` (string): Your unique identifier for this client (used for idempotency)
- `clientName` (string): Client's full name

**Optional Fields:**

All optional fields use One Assess's stored option values. **Unknown enum values will be rejected** with a 400 error listing accepted values.

### Basic Info (Phase P0)

- `email` (string): Client email address
- `phone` (string): Client phone number
- `dateOfBirth` (string): Format: YYYY-MM-DD
- `gender` (enum): 
  - `male`
  - `female`
- `trainingHistory` (enum):
  - `beginner` — None / Beginner (< 6 months)
  - `intermediate` — Intermediate (6 months – 2 years)
  - `advanced` — Advanced (> 2 years consistent training)
- `recentActivity` (enum):
  - `currently-training` — Currently Training
  - `stopped-3-months` — Stopped < 3 months ago
  - `stopped-6-months` — Stopped > 6 months ago

### PAR-Q Questionnaire (Phase P0)

- `parqAnswers` (object): Physical Activity Readiness Questionnaire responses
  - `chestPain` (boolean): Chest pain during physical activity
  - `dizziness` (boolean): Loss of balance or consciousness
  - `boneJointProblem` (boolean): Bone or joint problem
  - `bloodPressureMedication` (boolean): Currently taking blood pressure medication
  - `heartCondition` (boolean): Heart condition diagnosis
  - `physicalActivityAdvised` (boolean): Doctor advised against physical activity
  - `otherReason` (boolean): Other medical reason preventing exercise

### Lifestyle (Phase P1)

- `lifestyle` (object): Daily habits and health factors
  - `activityLevel` (enum):
    - `sedentary` — Desk job, minimal walking
    - `lightly-active` — Light activity or walking
    - `moderately-active` — Moderately active throughout day
    - `very-active` — Very active, standing job or 10k+ steps
    - `extremely-active` — Extremely active lifestyle
  - `stepsPerDay` (number): Average daily steps
  - `sleepArchetype` (enum):
    - `excellent` — Consistent 7-9 hours with minimal disruptions
    - `good` — Enough sleep but schedule/quality varies
    - `fair` — Often insufficient sleep or wake frequently
    - `poor` — Major challenge with irregular schedule and poor quality
  - `stressLevel` (enum):
    - `very-low` — Manage stress well, feel balanced
    - `low` — Some stress but cope reasonably
    - `moderate` — Stress affects regularly, impacts energy
    - `high` — Frequently stressed, significantly affects life
  - `nutritionHabits` (enum):
    - `excellent` — Mostly whole foods, balanced meals, consistent timing
    - `good` — Try to eat healthy but struggle with consistency
    - `fair` — Diet varies a lot
    - `poor` — Not in control, mostly takeout/processed
  - `hydrationHabits` (enum):
    - `excellent` — Drink plenty of water consistently
    - `good` — Try to stay hydrated but often forget
    - `fair` — Water intake varies
    - `poor` — Rarely drink enough water
  - `caffeineCupsPerDay` (number): Average caffeinated drinks per day
  - `lastCaffeineIntake` (string): Time of last caffeine (HH:MM format, e.g. "14:00")
  - `alcoholFrequency` (enum):
    - `never` — Rarely or never
    - `occasionally` — Few times a month
    - `weekly` — About once a week
    - `multiple-weekly` — Several times a week
    - `frequent` — Most days
    - `daily` — Daily
  - `medicationsFlag` (enum):
    - `no` — No regular medications
    - `yes` — Takes medication(s)
  - `medicationsNotes` (string): Medication details (optional, relevant when medicationsFlag is "yes")

### Goals & Training (Phase P1)

- `goals` (array of enums): Client's primary and secondary goals
  - `build-muscle` — Build muscle
  - `weight-loss` — Weight loss
  - `body-recomposition` — Body recomposition
  - `build-strength` — Build strength
  - `improve-fitness` — Improve fitness
  - `general-health` — General health
- `trainingFrequency` (number): Training sessions per week (0-7)

### Body Composition (Phase P2)

- `height` (number): Height in centimeters
- `weight` (number): Weight in kilograms

**Note:** Coach continues assessment from Phase P2 (Metabolic) onwards after prefilled data.

**Response (201 Created or 200 OK):**

```json
{
  "success": true,
  "assessmentId": "abc123",
  "message": "Assessment created"
}
```

**Error Responses:**

**400 Bad Request** - Invalid or missing data:

```json
{
  "error": "Missing required fields: externalId, clientName"
}
```

**400 Bad Request** - Enum validation failed:

```json
{
  "error": "Validation failed",
  "details": [
    "Invalid gender: \"unknown\". Accepted values: male, female",
    "Invalid lifestyle.activityLevel: \"super-active\". Accepted values: sedentary, lightly-active, moderately-active, very-active, extremely-active"
  ]
}
```

**401 Unauthorized** - Invalid API key or signature:

```json
{
  "error": "Invalid API key"
}
```

**401 Unauthorized** - Signature verification failed:

```json
{
  "error": "Invalid signature"
}
```

**500 Internal Server Error** - Server error:

```json
{
  "error": "Internal server error"
}
```

### Enum Validation

All multiple-choice fields are validated against One Assess's stored option values. If you provide an invalid enum value, the API will:

1. **Reject the entire request** with a 400 error
2. **List all validation errors** in the `details` array
3. **Show accepted values** for each invalid field

This ensures prefilled assessments display correctly in the UI with the proper options already selected.

**Example:**

If you send `"gender": "other"`, you'll get:
```json
{
  "error": "Validation failed",
  "details": [
    "Invalid gender: \"other\". Accepted values: male, female"
  ]
}
```

### Prefilled Assessment Flow

When an assessment is prefilled via the API:

1. **Assessment created** in `integration-assessments` collection with `status: 'prefilled'`
2. **Coach opens the assessment** - automatically loads prefilled data
3. **Prefilled steps remain editable** - Coach can review and modify any field
4. **Direct navigation to P2** - If P0 and P1 are fully prefilled, coach can skip directly to Metabolic (P2) phase
5. **Coach continues from P2** - Analyzer, tape measurements, fitness tests, movement, strength, posture
6. **Generate AXIS Report** - Complete assessment and webhook fires

**Navigation Behavior:**

- Fully prefilled steps show as "complete" in sidebar
- Coach can click any step to review/edit prefilled data
- No data is locked - everything remains editable
- Incomplete steps still require completion before generating report

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
