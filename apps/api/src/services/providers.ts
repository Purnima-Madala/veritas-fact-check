import OpenAI from 'openai';
import type { ModelResult, Provider } from '../types.js';

const system = `You are Veritas, an evidence-first fact-checking analyst. Analyze the claim carefully. Return strict JSON only with verdict (Likely true, Likely false, or Uncertain), response (a concise explanation), confidence (0-100), correctness (0-100), relevance (0-100), and sources (array of up to 3 objects with title and url). Never invent sources; if you cannot verify, return an empty sources array and say so.`;
const names: Record<Provider, string> = { openai: 'OpenAI', gemini: 'Google Gemini', claude: 'Anthropic Claude', groq: 'Groq Llama', openrouter: 'OpenRouter Free', demo: 'Evidence baseline' };

function demo(claim: string, provider: Provider): ModelResult {
  const score = provider === 'demo' ? 74 : 68;
  return { id: provider, name: names[provider], verdict: 'Uncertain', response: `No live ${names[provider]} key is configured. This is a transparent demo assessment: “${claim}” needs corroboration from primary, dated sources before it can be rated true or false.`, confidence: score, correctness: score - 3, relevance: 91, latency: 310, tokens: 126, sources: [{ title: 'How to evaluate sources', url: 'https://www.factcheck.org/our-process/' }] };
}

function parse(text: string, provider: Provider, latency: number): ModelResult {
  const clean = text.replace(/^```json\s*|```$/g, '').trim();
  try {
    const data = JSON.parse(clean);
    return { id: provider, name: names[provider], verdict: data.verdict || 'Uncertain', response: data.response || text, confidence: Number(data.confidence) || 50, correctness: Number(data.correctness) || 50, relevance: Number(data.relevance) || 50, latency, tokens: Math.ceil(text.length / 4), sources: Array.isArray(data.sources) ? data.sources.slice(0, 3) : [] };
  } catch { return { ...demo('', provider), response: text, latency, tokens: Math.ceil(text.length / 4) }; }
}

export async function askProvider(provider: Provider, claim: string): Promise<ModelResult> {
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const started = Date.now(); const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({ model: process.env.OPENAI_MODEL || 'gpt-5.4', instructions: system, input: claim, store: false });
    return parse(response.output_text, provider, Date.now() - started);
  }
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    const started = Date.now(); const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: claim }] }], generationConfig: { responseMimeType: 'application/json' } }) });
    if (!response.ok) throw new Error(`Gemini request failed (${response.status}): ${(await response.text()).slice(0, 280)}`);
    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '', provider, Date.now() - started);
  }
  if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
    const started = Date.now();
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514', max_tokens: 900, system, messages: [{ role: 'user', content: claim }] }) });
    if (!response.ok) throw new Error(`Claude request failed (${response.status}): ${(await response.text()).slice(0, 280)}`);
    const data = await response.json() as { content?: { type: string; text?: string }[] };
    return parse(data.content?.find(c => c.type === 'text')?.text || '', provider, Date.now() - started);
  }
  if (provider === 'groq' && process.env.GROQ_API_KEY) {
    const started = Date.now(); const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: system }, { role: 'user', content: claim }], response_format: { type: 'json_object' } }) });
    if (!response.ok) throw new Error(`Groq request failed (${response.status}): ${(await response.text()).slice(0, 280)}`);
    const data = await response.json() as { choices?: { message?: { content?: string } }[] }; return parse(data.choices?.[0]?.message?.content || '', provider, Date.now() - started);
  }
  if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
    const started = Date.now(); const response = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'HTTP-Referer': process.env.CLIENT_ORIGIN || 'http://localhost:5173', 'X-OpenRouter-Title': 'Veritas Fact Check' }, body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'openrouter/free', messages: [{ role: 'system', content: system }, { role: 'user', content: claim }], response_format: { type: 'json_object' } }) });
    if (!response.ok) throw new Error(`OpenRouter request failed (${response.status}): ${(await response.text()).slice(0, 280)}`);
    const data = await response.json() as { choices?: { message?: { content?: string } }[] }; return parse(data.choices?.[0]?.message?.content || '', provider, Date.now() - started);
  }
  return demo(claim, provider);
}
