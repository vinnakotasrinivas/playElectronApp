const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

function createModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is missing. Add it to your .env file and restart the app.'
    );
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: config.GEMINI_MODEL });
}

/**
 * Chat completion using Gemini.
 * @param {{ system: string, user: string, temperature?: number }} opts
 * @returns {Promise<string>}
 */
async function chat({ system, user, temperature = 0.2 }) {
  const model = createModel();
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${system}\n\n---\n\n${user}` }],
      },
    ],
    generationConfig: { temperature },
  });

  const content = result.response?.text?.();
  if (!content) {
    throw new Error('Gemini returned an empty response.');
  }
  return content.trim();
}

module.exports = { chat, name: 'gemini' };
