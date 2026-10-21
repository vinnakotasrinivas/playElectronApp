const { createLLM } = require('../providers/llm');
const { retrieve } = require('../rag/retrieve');
const { plan } = require('./planner');
const { reason } = require('./reasoner');
const { validate } = require('./validator');

/**
 * Full agentic RAG pipeline:
 * Planner → Retriever → Reasoner → Validator
 */
async function runAgentPipeline({ question, provider, topK = 5 }) {
  const steps = [];
  const llm = createLLM(provider);

  steps.push({
    agent: 'router',
    status: 'ok',
    detail: `Using provider: ${provider}`,
  });

  // 1. Planner
  steps.push({ agent: 'planner', status: 'running', detail: 'Creating retrieval plan…' });
  const planResult = await plan(llm, question);
  steps[steps.length - 1] = {
    agent: 'planner',
    status: 'ok',
    detail: `searchQuery="${planResult.searchQuery}"`,
    data: {
      searchQuery: planResult.searchQuery,
      keywords: planResult.keywords,
      subQuestions: planResult.subQuestions,
    },
  };

  // 2. Retriever (semantic search; optionally enrich with keywords)
  const searchParts = [planResult.searchQuery, ...(planResult.keywords || [])];
  const searchText = searchParts.filter(Boolean).join(' ');

  steps.push({
    agent: 'retriever',
    status: 'running',
    detail: 'Running similarity search…',
  });
  const hits = await retrieve(searchText, topK);
  steps[steps.length - 1] = {
    agent: 'retriever',
    status: hits.length ? 'ok' : 'warn',
    detail: hits.length
      ? `Retrieved ${hits.length} chunk(s)`
      : 'No chunks in vector store. Upload documents first.',
    data: hits.map((h) => ({
      id: h.id,
      score: h.score,
      source: h.metadata?.source,
      preview: h.text.slice(0, 160),
    })),
  };

  if (!hits.length) {
    return {
      provider,
      answer:
        'I could not find any indexed document content. Please upload and ingest documents first, then ask again.',
      sources: [],
      steps,
      validation: null,
    };
  }

  // 3. Reasoner
  steps.push({
    agent: 'reasoner',
    status: 'running',
    detail: 'Drafting grounded answer…',
  });
  const { answer: draft } = await reason(llm, question, hits);
  steps[steps.length - 1] = {
    agent: 'reasoner',
    status: 'ok',
    detail: 'Draft answer ready',
    data: { draftPreview: draft.slice(0, 240) },
  };

  // 4. Validator
  steps.push({
    agent: 'validator',
    status: 'running',
    detail: 'Validating answer against context…',
  });
  const validation = await validate(llm, question, draft, hits);
  steps[steps.length - 1] = {
    agent: 'validator',
    status: validation.supported ? 'ok' : 'warn',
    detail: validation.supported
      ? `Supported (confidence ${validation.confidence})`
      : `Issues found: ${(validation.issues || []).join('; ') || 'unsupported claims'}`,
    data: {
      supported: validation.supported,
      confidence: validation.confidence,
      issues: validation.issues,
    },
  };

  const finalAnswer = validation.revisedAnswer || draft;

  return {
    provider,
    answer: finalAnswer,
    sources: hits.map((h, i) => ({
      index: i + 1,
      id: h.id,
      score: h.score,
      source: h.metadata?.source,
      text: h.text,
    })),
    steps,
    validation: {
      supported: validation.supported,
      confidence: validation.confidence,
      issues: validation.issues,
    },
  };
}

module.exports = { runAgentPipeline };
