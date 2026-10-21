/**
 * Reasoner agent: draft a grounded answer from retrieved context.
 */
function formatContext(hits) {
  return hits
    .map((hit, i) => {
      const source = hit.metadata?.source || 'unknown';
      const score = typeof hit.score === 'number' ? hit.score.toFixed(3) : '?';
      return `[${i + 1}] (source: ${source}, score: ${score})\n${hit.text}`;
    })
    .join('\n\n');
}

async function reason(llm, question, hits) {
  const system = `You are an enterprise knowledge assistant.
Answer the user's question using ONLY the provided context excerpts.
Rules:
- If the context is insufficient, say you do not have enough information.
- Do not invent facts not present in the context.
- Be concise and clear.
- Cite sources using [1], [2], etc. matching the context numbers.`;

  const context = formatContext(hits);
  const user = `Context:\n${context}\n\nQuestion:\n${question}`;

  const answer = await llm.chat({ system, user, temperature: 0.2 });
  return { answer, context };
}

module.exports = { reason, formatContext };
