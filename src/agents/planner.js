/**
 * Planner agent: turn a user question into a short retrieval plan.
 */
async function plan(llm, question) {
  const system = `You are a retrieval planner for an enterprise document Q&A system.
Given a user question, output a compact JSON object with:
- "searchQuery": a single refined search string for semantic retrieval
- "keywords": an array of 3-8 important keywords
- "subQuestions": an array of 0-3 clarifying sub-questions (optional)

Return ONLY valid JSON. No markdown.`;

  const user = `User question:\n${question}`;

  const raw = await llm.chat({ system, user, temperature: 0.1 });

  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      searchQuery: parsed.searchQuery || question,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      subQuestions: Array.isArray(parsed.subQuestions) ? parsed.subQuestions : [],
      raw,
    };
  } catch {
    return {
      searchQuery: question,
      keywords: [],
      subQuestions: [],
      raw,
      parseError: true,
    };
  }
}

module.exports = { plan };
