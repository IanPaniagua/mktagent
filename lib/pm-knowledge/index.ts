import fs from 'fs';
import path from 'path';
import { PMKnowledgeStore } from '../types';

const STORE_PATH = path.join(process.cwd(), 'lib/pm-knowledge/pm-knowledge-store.json');

const DEFAULT_STORE: PMKnowledgeStore = { entries: [] };

export function loadPMKnowledgeStore(): PMKnowledgeStore {
  try {
    if (!fs.existsSync(STORE_PATH)) return DEFAULT_STORE;
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as PMKnowledgeStore;
  } catch {
    return DEFAULT_STORE;
  }
}

export function savePMKnowledgeStore(store: PMKnowledgeStore): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function buildPMKnowledgeContext(): string {
  const store = loadPMKnowledgeStore();
  const enabled = store.entries.filter((e) => e.enabled);
  if (enabled.length === 0) return '';

  const sections = enabled
    .map((entry) => {
      const categoryLabel = entry.category.charAt(0).toUpperCase() + entry.category.slice(1);
      return `### ${categoryLabel}: ${entry.title}\n\n${entry.content}`;
    })
    .join('\n\n---\n\n');

  return `## PROPRIETARY PM KNOWLEDGE BASE

The following is your specialized product management knowledge and methodology. Apply it in every analysis.

${sections}`;
}
