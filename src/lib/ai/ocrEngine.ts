import { getAI, VertexAIBackend, getGenerativeModel } from "firebase/ai";
import { getApp } from "firebase/app";
import { FormData } from '../../contexts/FormContext';
import { CONFIG } from '@/config';
import { logAIUsage } from '@/services/aiUsage';
import { auth } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import { isFeatureEnabled } from '@/services/platform/platformConfig';
import { FeatureDisabledError } from './postureAnalysis';
import { checkAndDecrementAICredit, AICreditExhaustedError } from '@/lib/ai/creditGate';
import { downscaleBodyCompImage } from './ocrImagePrep';

export interface OcrResult {
  fields: Partial<FormData>;
  rawText: string;
  confidence: number;
  provider: 'local' | 'gemini' | 'pattern';
}

export const REQUIRED_SCAN_FIELDS: (keyof FormData)[] = [
  'inbodyWeightKg',
  'skeletalMuscleMassKg',
  'inbodyBodyFatPct',
  'visceralFatLevel',
  'inbodyScore'
];

/**
 * Fast Gemini-only OCR.
 */
async function runGeminiOcr(imageSrc: string): Promise<OcrResult> {
  const coachUid = auth.currentUser?.uid || 'anonymous';

  const firebaseApp = getApp();
  const ai = getAI(firebaseApp, { 
    backend: new VertexAIBackend() 
  });

  const model = getGenerativeModel(ai, { 
    model: CONFIG.AI.GEMINI.MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = `
    You are an expert medical data extractor specialized in body composition analysis reports.
    Analyze the provided image and extract all relevant data points into a JSON object.
    
    FIELD GUIDANCE (use these exact JSON keys — they match our assessment form):
    - heightCm: Height in CM
    - inbodyScore: Total body composition score from the report (0-100)
    - inbodyWeightKg: Weight in KG
    - skeletalMuscleMassKg: SMM in KG
    - bodyFatMassKg: BFM in KG
    - inbodyBodyFatPct: PBF %
    - inbodyBmi: BMI
    - totalBodyWaterL: Total Body Water (TBW) in Liters
    - waistHipRatio: Waist-Hip Ratio (WHR)
    - visceralFatLevel: Visceral Fat Level (VFL)
    - bmrKcal: Basal Metabolic Rate (BMR)
    - segmentalTrunkKg, segmentalArmLeftKg, segmentalArmRightKg, segmentalLegLeftKg, segmentalLegRightKg: Segmental Lean Analysis in KG
    RULES:
    1. Return ONLY the JSON object.
    2. If a value is not found, use null.
    3. Numbers only for numeric fields (no units like "kg").
  `;

  const base64Data = imageSrc.split(',')[1] || imageSrc;

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    },
  ]);

  const response = await result.response;
  const aiText = response.text();
  
  const startIdx = aiText.indexOf('{');
  const endIdx = aiText.lastIndexOf('}');
  if (startIdx === -1) throw new Error('No JSON found in AI response');
  
  const data = JSON.parse(aiText.substring(startIdx, endIdx + 1)) as Record<string, unknown>;
  const cleanFields: Partial<FormData> = {};
  
  const validBodyCompFields = [
    'heightCm', 'inbodyScore', 'inbodyWeightKg', 'skeletalMuscleMassKg',
    'bodyFatMassKg', 'inbodyBodyFatPct', 'inbodyBmi', 'totalBodyWaterL',
    'waistHipRatio', 'visceralFatLevel', 'bmrKcal', 'segmentalTrunkKg',
    'segmentalArmLeftKg', 'segmentalArmRightKg', 'segmentalLegLeftKg', 'segmentalLegRightKg'
  ];
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && validBodyCompFields.includes(key)) {
      (cleanFields as Record<string, string>)[key] = String(value);
    }
  }

  await logAIUsage(coachUid, 'ocr_body_comp', 'ai_success', 'gemini');

  return {
    fields: cleanFields,
    rawText: '',
    confidence: 1.0,
    provider: 'gemini',
  };
}

/**
 * Main OCR entry point - Gemini-first for speed, with robust error handling
 * 
 * Strategy: Go straight to Gemini for reliability. Tesseract was too slow
 * to load and often failed. We can revisit local OCR later with a pre-loaded
 * web worker if needed.
 * 
 * Downscale only — never crop, never reuse another client’s cached numbers.
 */
export async function processBodyCompScan(imageSrc: string, organizationId?: string): Promise<OcrResult> {
  const coachUid = auth.currentUser?.uid || 'anonymous';

  const ocrEnabled = await isFeatureEnabled('ocr_enabled');
  if (!ocrEnabled) {
    logger.warn('[OCR] Body composition OCR feature is disabled via kill switch');
    throw new FeatureDisabledError('Report Photo Import');
  }

  try {
    const preparedImage = await downscaleBodyCompImage(imageSrc);

    if (organizationId) {
      await checkAndDecrementAICredit(organizationId);
    }

    const geminiResult = await runGeminiOcr(preparedImage);

    return {
      fields: geminiResult.fields,
      rawText: geminiResult.rawText,
      confidence: geminiResult.confidence,
      provider: geminiResult.provider,
    };
    
  } catch (err: unknown) {
    // Config gates must surface to the coach as-is — a swallowed credit error
    // otherwise looks identical to a bad photo ("scan failed").
    if (err instanceof AICreditExhaustedError || err instanceof FeatureDisabledError) {
      throw err;
    }
    logger.error('[OCR] Gemini failed:', 'OCR', err);
    await logAIUsage(coachUid, 'ocr_body_comp', 'error', 'gemini');
    return { fields: {}, rawText: '', confidence: 0, provider: 'gemini' };
  }
}
