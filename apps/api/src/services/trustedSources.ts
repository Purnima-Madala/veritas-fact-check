import type { ModelResult } from '../types.js';

export type TrustedSource = { title: string; url: string };

// This is an allow-list, not a claim that every page on these domains is correct.
// It deliberately excludes general wikis, blogs, social media, and unknown sites.
const trustedDomains = [
  'gov', 'edu', 'who.int', 'un.org', 'worldbank.org', 'imf.org', 'oecd.org',
  'ourworldindata.org', 'reuters.com', 'apnews.com', 'bbc.com', 'factcheck.org',
  'fullfact.org', 'politifact.com', 'snopes.com', 'nature.com', 'science.org',
  'nejm.org', 'thelancet.com', 'cochranelibrary.com',
];

function approvedHost(hostname: string) {
  return trustedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function filterProviderSources(sources: unknown): TrustedSource[] {
  if (!Array.isArray(sources)) return [];
  const seen = new Set<string>();
  return sources.flatMap((source): TrustedSource[] => {
    if (!source || typeof source !== 'object') return [];
    const { title, url } = source as { title?: unknown; url?: unknown };
    if (typeof title !== 'string' || typeof url !== 'string') return [];
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol) || seen.has(parsed.href)) return [];
      seen.add(parsed.href);
      return [{ title: title.trim().slice(0, 140) || parsed.hostname, url: parsed.href }];
    } catch { return []; }
  }).slice(0, 3);
}

export function filterTrustedSources(sources: unknown): TrustedSource[] {
  return filterProviderSources(sources).filter(source => approvedHost(new URL(source.url).hostname.toLowerCase()));
}

export function collectTrustedSources(models: ModelResult[]): TrustedSource[] {
  return filterTrustedSources(models.flatMap(model => model.sources)).slice(0, 6);
}
