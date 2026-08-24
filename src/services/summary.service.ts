import { env } from '../config/env.js';

export async function generateSummary(instruction: string, source: string): Promise<string> {
  if (!env.geminiApiKey) throw new Error('Gemini is not configured');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `${instruction}\n\n${source}` }] }] }),
      signal: AbortSignal.timeout(env.llmTimeoutMs)
    }
  );
  if (!response.ok) throw new Error(`Gemini request failed with ${response.status}`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const summary = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!summary) throw new Error('Gemini returned no summary');
  return summary;
}
