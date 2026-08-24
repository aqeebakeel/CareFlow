import { env } from '../config/env.js';

export type PreVisitAnalysis = {
  urgencyLevel: 'Low' | 'Medium' | 'High';
  chiefComplaint: string;
  suggestedQuestions: [string, string, string];
};

export type PostVisitSummary = {
  summary: string;
  medicationSchedule: string[];
  followUpSteps: string[];
};

export type LlmResult<T> = { success: true; data: T } | { success: false; data: null };

export async function analysePreVisitSymptoms(symptoms: string): Promise<LlmResult<PreVisitAnalysis>> {
  const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${symptoms}`;
  return requestGemini(prompt, {
    type: 'OBJECT',
    properties: {
      urgencyLevel: { type: 'STRING', enum: ['Low', 'Medium', 'High'] },
      chiefComplaint: { type: 'STRING' },
      suggestedQuestions: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 3, maxItems: 3 }
    },
    required: ['urgencyLevel', 'chiefComplaint', 'suggestedQuestions']
  });
}

export async function summarisePostVisitNotes(notes: string): Promise<LlmResult<PostVisitSummary>> {
  const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${notes}`;
  return requestGemini(prompt, {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      medicationSchedule: { type: 'ARRAY', items: { type: 'STRING' } },
      followUpSteps: { type: 'ARRAY', items: { type: 'STRING' } }
    },
    required: ['summary', 'medicationSchedule', 'followUpSteps']
  });
}

async function requestGemini<T>(prompt: string, responseSchema: object): Promise<LlmResult<T>> {
  if (!env.geminiApiKey) return { success: false, data: null };

  try {
    const response = await fetch(`${env.geminiApiBaseUrl}/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema }
      }),
      signal: AbortSignal.timeout(env.llmTimeoutMs)
    });
    if (!response.ok) return { success: false, data: null };

    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { success: false, data: null };
    return { success: true, data: JSON.parse(text) as T };
  } catch {
    return { success: false, data: null };
  }
}