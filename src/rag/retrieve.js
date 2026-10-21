const { embedText, embedTexts } = require('./embed');
const { upsertItems, similaritySearch, getStats } = require('./vectorStore');

/**
 * Embed chunks and write them into the vector index.
 */
async function ingestChunks(chunks) {
  if (!chunks.length) {
    return { count: getStats().count };
  }

  console.log(`[rag] Embedding ${chunks.length} chunks...`);
  const vectors = await embedTexts(
    chunks.map((c) => c.text),
    (done, total) => {
      if (done === total || done % 5 === 0) {
        console.log(`[rag] Embedded ${done}/${total}`);
      }
    }
  );

  const items = chunks.map((chunk, i) => ({
    id: chunk.id,
    text: chunk.text,
    embedding: vectors[i],
    metadata: chunk.metadata || {},
  }));

  const result = upsertItems(items);
  console.log(`[rag] Vector store now has ${result.count} items`);
  return result;
}

/**
 * Retrieve top-k chunks for a natural language query.
 */
async function retrieve(query, topK = 5) {
  const queryEmbedding = await embedText(query);
  return similaritySearch(queryEmbedding, topK);
}

module.exports = { ingestChunks, retrieve };
