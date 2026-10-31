/**
 * Integration API Functions
 * 
 * Generic webhook-based integration system for One Assess.
 * Supports inbound (create/update prefilled assessments) and outbound
 * (assessment.completed webhooks) for any CRM or external system.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from 'firebase-functions/v1';
import type { FormData } from './types';

const HMAC_ALGORITHM = 'sha256';
const SIGNATURE_HEADER = 'x-oneassess-signature';
const TIMESTAMP_HEADER = 'x-oneassess-timestamp';
const WEBHOOK_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const REPLAY_WINDOW_MS = 300000; // 5 minutes

interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  keyHash: string;
  createdAt: admin.firestore.Timestamp;
  createdBy: string;
  lastUsedAt?: admin.firestore.Timestamp;
  revokedAt?: admin.firestore.Timestamp;
}

interface WebhookEndpoint {
  id: string;
  organizationId: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  createdAt: admin.firestore.Timestamp;
  lastTriggeredAt?: admin.firestore.Timestamp;
  failureCount: number;
}

// Accepted enum values for multiple-choice fields (from One Assess UI)
const VALID_ENUMS = {
  gender: ['male', 'female'] as const,
  activityLevel: ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'] as const,
  sleepArchetype: ['excellent', 'good', 'fair', 'poor'] as const,
  stressLevel: ['very-low', 'low', 'moderate', 'high'] as const,
  nutritionHabits: ['excellent', 'good', 'fair', 'poor'] as const,
  hydrationHabits: ['excellent', 'good', 'fair', 'poor'] as const,
  alcoholFrequency: ['never', 'occasionally', 'weekly', 'multiple-weekly', 'frequent', 'daily'] as const,
  medicationsFlag: ['no', 'yes'] as const,
  trainingHistory: ['beginner', 'intermediate', 'advanced'] as const,
  recentActivity: ['currently-training', 'stopped-3-months', 'stopped-6-months'] as const,
  clientGoals: ['build-muscle', 'weight-loss', 'body-recomposition', 'build-strength', 'improve-fitness', 'general-health'] as const,
};

type Gender = typeof VALID_ENUMS.gender[number];
type ActivityLevel = typeof VALID_ENUMS.activityLevel[number];
type SleepArchetype = typeof VALID_ENUMS.sleepArchetype[number];
type StressLevel = typeof VALID_ENUMS.stressLevel[number];
type NutritionHabits = typeof VALID_ENUMS.nutritionHabits[number];
type HydrationHabits = typeof VALID_ENUMS.hydrationHabits[number];
type AlcoholFrequency = typeof VALID_ENUMS.alcoholFrequency[number];
type MedicationsFlag = typeof VALID_ENUMS.medicationsFlag[number];
type TrainingHistory = typeof VALID_ENUMS.trainingHistory[number];
type RecentActivity = typeof VALID_ENUMS.recentActivity[number];
type ClientGoal = typeof VALID_ENUMS.clientGoals[number];

interface InboundAssessmentPayload {
  externalId: string;
  clientName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  trainingHistory?: TrainingHistory;
  recentActivity?: RecentActivity;
  parqAnswers?: {
    chestPain?: boolean;
    dizziness?: boolean;
    boneJointProblem?: boolean;
    bloodPressureMedication?: boolean;
    heartCondition?: boolean;
    physicalActivityAdvised?: boolean;
    otherReason?: boolean;
  };
  lifestyle?: {
    activityLevel?: ActivityLevel;
    stepsPerDay?: number;
    sleepArchetype?: SleepArchetype;
    stressLevel?: StressLevel;
    nutritionHabits?: NutritionHabits;
    hydrationHabits?: HydrationHabits;
    caffeineCupsPerDay?: number;
    lastCaffeineIntake?: string;
    alcoholFrequency?: AlcoholFrequency;
    medicationsFlag?: MedicationsFlag;
    medicationsNotes?: string;
  };
  goals?: ClientGoal[];
  trainingFrequency?: number;
  height?: number;
  weight?: number;
}

interface AssessmentCompletedPayload {
  assessmentId: string;
  externalId?: string;
  clientName: string;
  completedAt: string;
  axis: {
    overall: number;
    pillars: {
      bodyComp?: number;
      posture?: number;
      fitness?: number;
      strength?: number;
      lifestyle?: number;
    };
  };
  findings: {
    movement?: Record<string, unknown>;
    strength?: Record<string, unknown>;
    fitness?: Record<string, unknown>;
    posture?: Record<string, unknown>;
    bodyComp?: Record<string, unknown>;
  };
  reportUrl: string;
}

/**
 * Verify HMAC signature on inbound requests
 */
function verifyHmacSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // Prevent replay attacks
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime) || Math.abs(now - requestTime) > REPLAY_WINDOW_MS) {
    logger.warn('Request timestamp outside replay window', { timestamp, now });
    return false;
  }

  // Verify HMAC
  const hmac = createHmac(HMAC_ALGORITHM, secret);
  hmac.update(`${timestamp}.${payload}`);
  const expectedSignature = hmac.digest('hex');

  try {
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    return sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generate HMAC signature for outbound webhooks
 */
function generateHmacSignature(payload: string, timestamp: string, secret: string): string {
  const hmac = createHmac(HMAC_ALGORITHM, secret);
  hmac.update(`${timestamp}.${payload}`);
  return hmac.digest('hex');
}

/**
 * Hash API key for storage (never store plain keys)
 */
function hashApiKey(key: string): string {
  return createHmac('sha256', process.env.API_KEY_SALT || 'default-salt-change-in-production')
    .update(key)
    .digest('hex');
}

/**
 * Inbound HTTPS endpoint: create or update a prefilled assessment
 * 
 * POST /integrations/inbound/assessments
 * Headers:
 *   Authorization: Bearer <api-key>
 *   X-OneAssess-Signature: <hmac-sha256>
 *   X-OneAssess-Timestamp: <unix-ms>
 * Body: InboundAssessmentPayload
 */
export const inboundAssessment = functions.https.onRequest(async (req, res) => {
  // CORS for browser-based integrations
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-OneAssess-Signature, X-OneAssess-Timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract auth header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const apiKey = authHeader.substring(7);
    const keyHash = hashApiKey(apiKey);

    // Look up API key
    const keysSnapshot = await admin.firestore()
      .collectionGroup('integration-api-keys')
      .where('keyHash', '==', keyHash)
      .where('revokedAt', '==', null)
      .limit(1)
      .get();

    if (keysSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const keyDoc = keysSnapshot.docs[0];
    const keyData = keyDoc.data() as ApiKey;
    const orgId = keyData.organizationId;

    // Verify HMAC signature
    const signature = req.headers[SIGNATURE_HEADER] as string;
    const timestamp = req.headers[TIMESTAMP_HEADER] as string;
    const payload = JSON.stringify(req.body);

    if (!signature || !timestamp) {
      return res.status(400).json({ error: 'Missing signature or timestamp headers' });
    }

    // Use the first 32 chars of the API key as the HMAC secret
    if (!verifyHmacSignature(payload, signature, timestamp, apiKey.substring(0, 32))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Update last used timestamp
    await keyDoc.ref.update({ lastUsedAt: admin.firestore.FieldValue.serverTimestamp() });

    // Parse and validate payload
    const data = req.body as InboundAssessmentPayload;
    
    if (!data.externalId || !data.clientName) {
      return res.status(400).json({ error: 'Missing required fields: externalId, clientName' });
    }

    // Validate enum values
    const validationErrors: string[] = [];

    if (data.gender && !VALID_ENUMS.gender.includes(data.gender as Gender)) {
      validationErrors.push(`Invalid gender: "${data.gender}". Accepted values: ${VALID_ENUMS.gender.join(', ')}`);
    }

    if (data.trainingHistory && !VALID_ENUMS.trainingHistory.includes(data.trainingHistory as TrainingHistory)) {
      validationErrors.push(`Invalid trainingHistory: "${data.trainingHistory}". Accepted values: ${VALID_ENUMS.trainingHistory.join(', ')}`);
    }

    if (data.recentActivity && !VALID_ENUMS.recentActivity.includes(data.recentActivity as RecentActivity)) {
      validationErrors.push(`Invalid recentActivity: "${data.recentActivity}". Accepted values: ${VALID_ENUMS.recentActivity.join(', ')}`);
    }

    if (data.goals && Array.isArray(data.goals)) {
      const invalidGoals = data.goals.filter(g => !VALID_ENUMS.clientGoals.includes(g as ClientGoal));
      if (invalidGoals.length > 0) {
        validationErrors.push(`Invalid goals: ${invalidGoals.join(', ')}. Accepted values: ${VALID_ENUMS.clientGoals.join(', ')}`);
      }
    }

    if (data.lifestyle) {
      const { activityLevel, sleepArchetype, stressLevel, nutritionHabits, hydrationHabits, alcoholFrequency, medicationsFlag } = data.lifestyle;

      if (activityLevel && !VALID_ENUMS.activityLevel.includes(activityLevel as ActivityLevel)) {
        validationErrors.push(`Invalid lifestyle.activityLevel: "${activityLevel}". Accepted values: ${VALID_ENUMS.activityLevel.join(', ')}`);
      }

      if (sleepArchetype && !VALID_ENUMS.sleepArchetype.includes(sleepArchetype as SleepArchetype)) {
        validationErrors.push(`Invalid lifestyle.sleepArchetype: "${sleepArchetype}". Accepted values: ${VALID_ENUMS.sleepArchetype.join(', ')}`);
      }

      if (stressLevel && !VALID_ENUMS.stressLevel.includes(stressLevel as StressLevel)) {
        validationErrors.push(`Invalid lifestyle.stressLevel: "${stressLevel}". Accepted values: ${VALID_ENUMS.stressLevel.join(', ')}`);
      }

      if (nutritionHabits && !VALID_ENUMS.nutritionHabits.includes(nutritionHabits as NutritionHabits)) {
        validationErrors.push(`Invalid lifestyle.nutritionHabits: "${nutritionHabits}". Accepted values: ${VALID_ENUMS.nutritionHabits.join(', ')}`);
      }

      if (hydrationHabits && !VALID_ENUMS.hydrationHabits.includes(hydrationHabits as HydrationHabits)) {
        validationErrors.push(`Invalid lifestyle.hydrationHabits: "${hydrationHabits}". Accepted values: ${VALID_ENUMS.hydrationHabits.join(', ')}`);
      }

      if (alcoholFrequency && !VALID_ENUMS.alcoholFrequency.includes(alcoholFrequency as AlcoholFrequency)) {
        validationErrors.push(`Invalid lifestyle.alcoholFrequency: "${alcoholFrequency}". Accepted values: ${VALID_ENUMS.alcoholFrequency.join(', ')}`);
      }

      if (medicationsFlag && !VALID_ENUMS.medicationsFlag.includes(medicationsFlag as MedicationsFlag)) {
        validationErrors.push(`Invalid lifestyle.medicationsFlag: "${medicationsFlag}". Accepted values: ${VALID_ENUMS.medicationsFlag.join(', ')}`);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    // Check for existing assessment with this external ID
    const existingSnapshot = await admin.firestore()
      .collection(`organizations/${orgId}/integration-assessments`)
      .where('externalId', '==', data.externalId)
      .limit(1)
      .get();

    const assessmentRef = existingSnapshot.empty
      ? admin.firestore().collection(`organizations/${orgId}/integration-assessments`).doc()
      : existingSnapshot.docs[0].ref;

    // Build FormData from payload
    const formData: Partial<FormData> = {
      fullName: data.clientName,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      heightCm: data.height,
      inbodyWeightKg: data.weight,
      trainingHistory: data.trainingHistory,
      recentActivity: data.recentActivity,
      trainingFrequency: data.trainingFrequency,
    };

    // PAR-Q answers (map directly to FormData boolean fields)
    if (data.parqAnswers) {
      if (data.parqAnswers.chestPain !== undefined) formData.chestPain = data.parqAnswers.chestPain;
      if (data.parqAnswers.dizziness !== undefined) formData.dizziness = data.parqAnswers.dizziness;
      if (data.parqAnswers.boneJointProblem !== undefined) formData.boneJointProblem = data.parqAnswers.boneJointProblem;
      if (data.parqAnswers.bloodPressureMedication !== undefined) formData.bloodPressureMedication = data.parqAnswers.bloodPressureMedication;
      if (data.parqAnswers.heartCondition !== undefined) formData.heartCondition = data.parqAnswers.heartCondition;
      if (data.parqAnswers.physicalActivityAdvised !== undefined) formData.physicalActivityAdvised = data.parqAnswers.physicalActivityAdvised;
      if (data.parqAnswers.otherReason !== undefined) formData.otherReason = data.parqAnswers.otherReason;
    }

    // Lifestyle
    if (data.lifestyle) {
      if (data.lifestyle.activityLevel) formData.activityLevel = data.lifestyle.activityLevel;
      if (data.lifestyle.stepsPerDay) formData.stepsPerDay = data.lifestyle.stepsPerDay;
      if (data.lifestyle.sleepArchetype) formData.sleepArchetype = data.lifestyle.sleepArchetype;
      if (data.lifestyle.stressLevel) formData.stressLevel = data.lifestyle.stressLevel;
      if (data.lifestyle.nutritionHabits) formData.nutritionHabits = data.lifestyle.nutritionHabits;
      if (data.lifestyle.hydrationHabits) formData.hydrationHabits = data.lifestyle.hydrationHabits;
      if (data.lifestyle.caffeineCupsPerDay) formData.caffeineCupsPerDay = data.lifestyle.caffeineCupsPerDay;
      if (data.lifestyle.lastCaffeineIntake) formData.lastCaffeineIntake = data.lifestyle.lastCaffeineIntake;
      if (data.lifestyle.alcoholFrequency) formData.alcoholFrequency = data.lifestyle.alcoholFrequency;
      if (data.lifestyle.medicationsFlag) formData.medicationsFlag = data.lifestyle.medicationsFlag;
      if (data.lifestyle.medicationsNotes) formData.medicationsNotes = data.lifestyle.medicationsNotes;
    }

    // Goals
    if (data.goals && Array.isArray(data.goals)) {
      formData.clientGoals = data.goals;
    }

    const docData = {
      externalId: data.externalId,
      organizationId: orgId,
      formData,
      status: 'prefilled' as const,
      createdAt: existingSnapshot.empty ? admin.firestore.FieldValue.serverTimestamp() : existingSnapshot.docs[0].data().createdAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await assessmentRef.set(docData, { merge: true });

    return res.status(existingSnapshot.empty ? 201 : 200).json({
      success: true,
      assessmentId: assessmentRef.id,
      message: existingSnapshot.empty ? 'Assessment created' : 'Assessment updated',
    });

  } catch (error) {
    logger.error('Inbound assessment error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Trigger outbound webhooks when an assessment is completed
 * Firestore trigger on organizations/{orgId}/clients/{clientId}/current/state
 */
export const onAssessmentCompleted = functions.firestore
  .document('organizations/{orgId}/clients/{clientId}/current/state')
  .onWrite(async (change, context) => {
    const { orgId, clientId } = context.params;

    // Only trigger on updates where assessment becomes complete
    if (!change.after.exists) return;

    const afterData = change.after.data();
    const beforeData = change.before.exists ? change.before.data() : null;

    // Check if this is a new completion (not already complete)
    const wasComplete = beforeData?.overallScore && beforeData.overallScore > 0;
    const isComplete = afterData?.overallScore && afterData.overallScore > 0;

    if (wasComplete || !isComplete) {
      return; // Skip if already was complete or not complete yet
    }

    try {
      // Fetch webhook endpoints for this org
      const webhooksSnapshot = await admin.firestore()
        .collection(`organizations/${orgId}/integration-webhooks`)
        .where('enabled', '==', true)
        .where('events', 'array-contains', 'assessment.completed')
        .get();

      if (webhooksSnapshot.empty) {
        return; // No webhooks configured
      }

      // Check if this assessment has an external ID
      const integrationSnapshot = await admin.firestore()
        .collection(`organizations/${orgId}/integration-assessments`)
        .where('formData.fullName', '==', afterData.clientName)
        .limit(1)
        .get();

      const externalId = integrationSnapshot.empty ? undefined : integrationSnapshot.docs[0].data().externalId;

      // Build webhook payload
      const formData = afterData.formData || {};
      const scoresSummary = afterData.scoresSummary || {};
      
      const payload: AssessmentCompletedPayload = {
        assessmentId: clientId,
        externalId,
        clientName: afterData.clientName || '',
        completedAt: new Date().toISOString(),
        axis: {
          overall: afterData.overallScore || 0,
          pillars: {
            bodyComp: scoresSummary.categories?.find((c: { id: string }) => c.id === 'bodycomp')?.score,
            posture: scoresSummary.categories?.find((c: { id: string }) => c.id === 'posture')?.score,
            fitness: scoresSummary.categories?.find((c: { id: string }) => c.id === 'fitness')?.score,
            strength: scoresSummary.categories?.find((c: { id: string }) => c.id === 'strength')?.score,
            lifestyle: scoresSummary.categories?.find((c: { id: string }) => c.id === 'lifestyle')?.score,
          },
        },
        findings: {
          movement: formData.movementPatterns,
          strength: {
            gripStrengthKg: formData.gripStrengthKg,
            pushups: formData.pushups,
            plankSeconds: formData.plankSeconds,
          },
          fitness: {
            restingHeartRate: formData.restingHeartRate,
            recoveryHeartRate: formData.recoveryHeartRate,
          },
          posture: formData.postureAiResults,
          bodyComp: {
            heightCm: formData.heightCm,
            weightKg: formData.inbodyWeightKg,
            bodyFatPct: formData.inbodyBodyFatPct,
            skeletalMuscleMassKg: formData.skeletalMuscleMassKg,
          },
        },
        reportUrl: `https://one-assess.com/r/${afterData.shareToken || clientId}`,
      };

      // Send webhook to each endpoint
      const webhookPromises = webhooksSnapshot.docs.map(async (doc) => {
        const webhook = doc.data() as WebhookEndpoint;
        const timestamp = Date.now().toString();
        const payloadString = JSON.stringify(payload);
        const signature = generateHmacSignature(payloadString, timestamp, webhook.secret);

        return sendWebhookWithRetry(webhook, payloadString, signature, timestamp, doc.ref);
      });

      await Promise.allSettled(webhookPromises);

    } catch (error) {
      logger.error('Webhook trigger error', { orgId, clientId, error });
    }
  });

/**
 * Send webhook with exponential backoff retry
 */
async function sendWebhookWithRetry(
  webhook: WebhookEndpoint,
  payload: string,
  signature: string,
  timestamp: string,
  webhookRef: admin.firestore.DocumentReference,
  attempt = 1
): Promise<void> {
  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [SIGNATURE_HEADER]: signature,
        [TIMESTAMP_HEADER]: timestamp,
      },
      body: payload,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Success - reset failure count and update last triggered
    await webhookRef.update({
      lastTriggeredAt: admin.firestore.FieldValue.serverTimestamp(),
      failureCount: 0,
    });

    logger.info('Webhook delivered', { url: webhook.url, attempt });

  } catch (error) {
    logger.error('Webhook delivery failed', { url: webhook.url, attempt, error });

    // Increment failure count
    await webhookRef.update({
      failureCount: admin.firestore.FieldValue.increment(1),
    });

    // Retry with exponential backoff
    if (attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendWebhookWithRetry(webhook, payload, signature, timestamp, webhookRef, attempt + 1);
    } else {
      logger.error('Webhook max retries exceeded', { url: webhook.url });
      
      // Disable webhook after persistent failures
      if (webhook.failureCount + 1 >= 10) {
        await webhookRef.update({ enabled: false });
        logger.warn('Webhook disabled due to persistent failures', { url: webhook.url });
      }
    }
  }
}
