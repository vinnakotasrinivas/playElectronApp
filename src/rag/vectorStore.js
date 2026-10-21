const fs = require('fs');
const path = require('path');
const config = require('../config');

function ensureStoreFile() {
  const dir = path.dirname(config.VECTOR_INDEX_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(config.VECTOR_INDEX_FILE)) {
    fs.writeFileSync(
      config.VECTOR_INDEX_FILE,
      JSON.stringify({ items: [] }, null, 2),
      'utf8'
    );
  }
}

function loadStore() {
  ensureStoreFile();
  const raw = fs.readFileSync(config.VECTOR_INDEX_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.items || !Array.isArray(parsed.items)) {
      return { items: [] };
    }
    return parsed;
  } catch {
    return { items: [] };
  }
}

function saveStore(store) {
  ensureStoreFile();
  fs.writeFileSync(
    config.VECTOR_INDEX_FILE,
    JSON.stringify(store, null, 2),
    'utf8'
  );
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Upsert chunk records that already include embeddings.
 * Replaces existing items with the same id.
 */
function upsertItems(newItems) {
  const store = loadStore();
  const byId = new Map(store.items.map((item) => [item.id, item]));

  for (const item of newItems) {
    byId.set(item.id, item);
  }

  const next = { items: Array.from(byId.values()) };
  saveStore(next);
  return { count: next.items.length };
}

/**
 * Similarity search against stored embeddings.
 */
function similaritySearch(queryEmbedding, topK = 5) {
  const store = loadStore();
  const scored = store.items.map((item) => ({
    id: item.id,
    text: item.text,
    metadata: item.metadata,
    score: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function getStats() {
  const store = loadStore();
  return { count: store.items.length };
}

function clearStore() {
  saveStore({ items: [] });
}

module.exports = {
  upsertItems,
  similaritySearch,
  getStats,
  clearStore,
  cosineSimilarity,
};
