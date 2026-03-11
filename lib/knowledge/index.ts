import fs from 'fs';
import path from 'path';
import { KnowledgeStore } from '../types';

const STORE_PATH = path.join(process.cwd(), 'lib/knowledge/knowledge-store.json');

const DEFAULT_STORE: KnowledgeStore = {
  entries: [],
};

export function loadKnowledgeStore(): KnowledgeStore {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return DEFAULT_STORE;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as KnowledgeStore;
  } catch {
    return DEFAULT_STORE;
  }
}

export function saveKnowledgeStore(store: KnowledgeStore): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function buildKnowledgeContext(): string {
  const store = loadKnowledgeStore();
  const enabled = store.entries.filter((e) => e.enabled);

  if (enabled.length === 0) {
    return '';
  }

  const sections = enabled
    .map((entry) => {
      const categoryLabel =
        entry.category.charAt(0).toUpperCase() + entry.category.slice(1);
      return `### ${categoryLabel}: ${entry.title}\n\n${entry.content}`;
    })
    .join('\n\n---\n\n');

  return `## PROPRIETARY KNOWLEDGE BASE

The following is your specialized knowledge and methodology. Apply it in every analysis.

${sections}`;
}
