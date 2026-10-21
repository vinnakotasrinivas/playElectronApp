/**
 * Validator agent: check that the answer is supported by retrieved context.
 */
async function validate(llm, question, answer, hits) {
  const snippets = hits
    .map((hit, i) => `[${i + 1}] ${hit.text}`)
    .join('\n\n');

  const system = `You are a strict factual validator for RAG answers.
Decide whether the answer is fully supported by the context.
Return ONLY valid JSON with:
- "supported": boolean
- "confidence": number between 0 and 1
- "issues": array of short strings (unsupported claims or problems)
- "revisedAnswer": string — same as answer if supported, otherwise a safer corrected version using only the context

No markdown.`;

  const user = `Question:\n${question}\n\nAnswer:\n${answer}\n\nContext:\n${snippets}`;

  const raw = await llm.chat({ system, user, temperature: 0.1 });

  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      supported: Boolean(parsed.supported),
      confidence:
        typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      revisedAnswer: parsed.revisedAnswer || answer,
      raw,
    };
  } catch {
    return {
      supported: true,
      confidence: 0.4,
      issues: ['Validator response was not valid JSON; accepting draft answer.'],
      revisedAnswer: answer,
      raw,
      parseError: true,
    };
  }
}

module.exports = { validate };
