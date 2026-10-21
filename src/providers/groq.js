const Groq = require('groq-sdk');
const config = require('../config');

function createClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is missing. Add it to your .env file and restart the app.'
    );
  }
  return new Groq({ apiKey });
}

/**
 * Chat completion using Groq.
 * @param {{ system: string, user: string, temperature?: number }} opts
 * @returns {Promise<string>}
 */
async function chat({ system, user, temperature = 0.2 }) {
  const client = createClient();
  const completion = await client.chat.completions.create({
    model: config.GROQ_MODEL,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq returned an empty response.');
  }
  return content.trim();
}

module.exports = { chat, name: 'groq' };
