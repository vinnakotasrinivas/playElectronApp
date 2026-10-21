const path = require('path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  ROOT,
  UPLOADS_DIR: path.join(ROOT, 'data', 'uploads'),
  VECTORS_DIR: path.join(ROOT, 'data', 'vectors'),
  VECTOR_INDEX_FILE: path.join(ROOT, 'data', 'vectors', 'index.json'),
  CHUNK_SIZE: 800,
  CHUNK_OVERLAP: 150,
  TOP_K: 5,
  EMBEDDING_MODEL: 'Xenova/all-MiniLM-L6-v2',
  DEFAULT_PROVIDER: 'groq',
  GROQ_MODEL: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
};
