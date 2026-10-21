/**
 * Factory for switchable LLM providers (Groq | Gemini).
 */
function createLLM(name) {
  const key = String(name || '').toLowerCase();
  if (key === 'groq') {
    return require('./groq');
  }
  if (key === 'gemini') {
    return require('./gemini');
  }
  throw new Error(`Unknown provider: ${name}. Use "groq" or "gemini".`);
}

module.exports = { createLLM };
