import { NextResponse } from 'next/server';
// @ts-ignore - plain-JS module shared with node --test
import { interpretWithRules, clampParams, DEFAULT_PARAMS } from '@/lib/interpret.mjs';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 6000);

const SYSTEM = `You translate a description of the sea into ocean simulation parameters.
Respond with ONLY a JSON object using these keys (all optional, numbers unless noted):
amplitude (wave height meters 0.02-3), choppiness (0-1), waveLength (8-120), speed (0.2-3),
windDir (0-360), foam (0-1), deepColor (hex string), surfaceColor (hex string),
sunColor (hex string), sunElevation (-15 to 88, negative = night), sunAzimuth (0-360), turbidity (1-12).
Defaults: ${JSON.stringify(DEFAULT_PARAMS)}. Only include keys the description implies.`;

async function interpretWithOllama(prompt: string) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      system: SYSTEM,
      prompt,
      format: 'json',
      stream: false,
      options: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = await res.json();
  const raw = JSON.parse(data.response);
  return { params: clampParams(raw), matched: Object.keys(raw), source: 'ollama' as const };
}

export async function POST(req: Request) {
  const { prompt } = await req.json().catch(() => ({ prompt: '' }));
  if (typeof prompt !== 'string' || prompt.length > 500) {
    return NextResponse.json({ error: 'prompt must be a string under 500 chars' }, { status: 400 });
  }
  try {
    return NextResponse.json(await interpretWithOllama(prompt));
  } catch {
    // No local LLM running (or it timed out) — the rules engine always works.
    return NextResponse.json(interpretWithRules(prompt));
  }
}
