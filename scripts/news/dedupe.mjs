import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RELEVANCE_KEYWORDS } from './sources.mjs';

const TRACKING_PARAMS = /^(utm_|ref$|ref_src$|fbclid$|gclid$|mc_cid$|mc_eid$)/;
const PRERELEASE_PATTERN = /[-.](canary|rc|alpha|beta|nightly|experimental)/i;
const SIMILARITY_THRESHOLD = 0.6;
const SEEN_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return rawUrl;
  }
}

function toId(url) {
  return crypto.createHash('sha1').update(normalizeUrl(url)).digest('hex').slice(0, 12);
}

function tokenize(title) {
  return new Set(
    title
      .toLowerCase()
      .split(/[^\p{L}\p{N}.]+/u)
      .filter((token) => token.length > 1)
  );
}

function jaccard(a, b) {
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function countKeywords(text) {
  const lowerText = text.toLowerCase();
  return RELEVANCE_KEYWORDS.filter((keyword) => lowerText.includes(keyword)).length;
}

export function loadState(stateFile) {
  if (!fs.existsSync(stateFile)) return { lastRunAt: null, seen: {} };
  return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
}

export function saveState(stateFile, state, newIds, now) {
  const cutoff = now.getTime() - SEEN_RETENTION_DAYS * DAY_MS;
  const seen = Object.fromEntries(
    Object.entries(state.seen).filter(([, seenAt]) => new Date(seenAt).getTime() >= cutoff)
  );
  for (const id of newIds) seen[id] ??= now.toISOString();

  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify({ lastRunAt: now.toISOString(), seen }, null, 2)}\n`);
}

export function selectEntries(entries, { seen, since, maxItems }) {
  const candidates = entries
    .filter((entry) => entry.url && entry.title && entry.publishedAt)
    .filter((entry) => new Date(entry.publishedAt) >= since)
    .filter((entry) => !(entry.source.isRelease && PRERELEASE_PATTERN.test(entry.title)))
    .map((entry) => ({
      ...entry,
      id: toId(entry.url),
      keywordCount: countKeywords(`${entry.title} ${entry.excerpt}`),
    }))
    .filter((entry) => !seen[entry.id])
    .filter((entry) => !entry.source.requiresKeyword || countKeywords(entry.title) > 0);

  const uniqueById = [...new Map(candidates.map((entry) => [entry.id, entry])).values()];
  const byPriority = uniqueById.sort((a, b) => b.source.priority - a.source.priority);

  const merged = [];
  const keptTokens = [];
  for (const entry of byPriority) {
    const tokens = tokenize(entry.title);
    const isDuplicate = keptTokens.some((kept) => jaccard(kept, tokens) >= SIMILARITY_THRESHOLD);
    if (isDuplicate) continue;
    merged.push(entry);
    keptTokens.push(tokens);
  }

  const ranked = merged
    .map((entry) => ({
      ...entry,
      score: entry.source.priority * 10 + entry.keywordCount,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    selected: ranked.slice(0, maxItems),
    seenIds: candidates.map((entry) => entry.id),
  };
}
